// Judges a spoken attempt by asking the model directly, via a tool call.
//
// This deliberately does NOT use input transcription. Transcription of Yoruba
// and Hausa drops tone marks and mangles words, so string-comparing it against
// a target fails correct speech and passes wrong speech. Instead the model
// hears the audio, knows the exact target phrase, and reports a verdict through
// `score_attempt` — the same pattern the conversation already uses for rapport.

import { GoogleGenAI, Modality, Type, type Session, type LiveServerMessage } from '@google/genai';
import { liveToken } from './live-credentials';
import { RECOMMENDED_LIVE_MODEL } from './gemini-live';
import { AudioRecorder } from './audio-worklet';

export interface Verdict {
  correct: boolean;
  /** True when a required respect marker or honorific was left out. */
  missedRespect: boolean;
  /** Short coaching note in English, from the model. */
  note: string;
  /** What the model believes it heard, for display only. */
  heard: string;
  /** Set when no verdict could be obtained (no audio, no tool call, error). */
  inconclusive?: boolean;
}

export interface JudgeTarget {
  /** The exact phrase the learner is attempting. */
  native: string;
  /** Its English meaning, so the model can judge intent as well as form. */
  en: string;
  languageName: string;
  /** Words that must be present, e.g. the elder-respect marker. */
  criticalWords: string[];
}

/**
 * The instruction is deliberately target-free so a single session can serve a
 * whole encounter. The phrase under test is sent as a TARGET turn immediately
 * before each attempt instead.
 */
export function buildInstruction(languageName: string): string {
  return (
    `You are a patient ${languageName} pronunciation examiner listening to a beginner.\n\n` +
    `Before each attempt you are given a line beginning "TARGET:". The audio that follows is ` +
    `the learner trying to say THAT line. Judge ONLY against the most recent TARGET. Ignore every ` +
    `earlier TARGET and every earlier attempt completely — each attempt is judged fresh, and how ` +
    `they did before must never soften or harden your verdict.\n\n` +
    `Listen to their audio and call score_attempt exactly once. Never reply with speech or text.\n\n` +
    // Measured: a correct "Ẹ jọ̀ọ́ ma, báwo lẹ ṣe lé tòmátì yín?" passed 1 time in 6
    // under the old wording, because the judge listened for "ma" as a separate
    // word. It is not one in speech.
    `LISTEN THE WAY A LOCAL LISTENS:\n` +
    `- People run words together. Short words fuse with their neighbours: a one-syllable respect ` +
    `word at the start of a phrase merges into the next word (in Yorùbá, "Ẹ káàárọ̀" sounds like one ` +
    `word, "ẹkáàárọ̀"), and a short honorific attaches to the word before it ("jọ̀ọ́ ma" sounds like ` +
    `"jọ̀ọ́ma"). A fused word is still said. Listen for its sound, not for a gap around it.\n` +
    `- Ask yourself: would a local listener accept this as the TARGET line? If yes, it is correct, ` +
    `even with a heavy accent, imperfect tones, hesitation, or a natural extra particle such as "o".\n\n` +
    `HOW TO JUDGE:\n` +
    `- Mark it incorrect if they said something different, clearly left a word out, or were unintelligible.\n` +
    `- Mark it incorrect if they said nothing, or only breathed or coughed.\n` +
    `- MANDATORY WORDS: for each one, report in mandatory_words_heard whether you heard it anywhere, ` +
    `fused or not. Set missed_respect_marker=true (and correct=false) ONLY when you are confident a ` +
    `mandatory word is absent. If you are unsure, give the learner the benefit of the doubt: a false ` +
    `accusation of rudeness is worse than a missed one.\n\n` +
    `Your note must be one short, warm sentence of English coaching addressed to the learner ` +
    `("Almost — the second syllable rises"). Never scold.`
  );
}

/** The per-attempt brief, restated right before the audio. */
export function buildTargetTurn(target: JudgeTarget): string {
  const critical = target.criticalWords.length
    ? ` MANDATORY WORDS: ${target.criticalWords.join(', ')} — these carry respect. They may be fused with neighbouring words.`
    : '';
  return `TARGET: "${target.native}" (meaning: ${target.en}).${critical} The next audio is their attempt at this line.`;
}

/** How many extra listens a failing attempt gets before the learner is told. */
const MAX_RECHECKS = 2;
const RECHECK_TIMEOUT_MS = 10000;

export class PronunciationJudge {
  private session: Session | null = null;
  private recorder = new AudioRecorder();
  private model: string;
  private currentKey = '';
  private generation = 0;
  private pending: ((verdict: Verdict) => void) | null = null;
  private gotVerdict = false;
  /** False once the socket has closed or errored. A dead session must never be reused. */
  private alive = false;
  /** Audio chunks the socket refused. Non-zero means it did not hear you. */
  private sendFailures = 0;
  /** The attempt under judgement, kept so a failing verdict can be re-checked. */
  private attempt: { target: JudgeTarget; audio: string[] } | null = null;

  constructor(model?: string) {
    this.model = model || RECOMMENDED_LIVE_MODEL;
  }

  /**
   * Opens a session bound to one target phrase. Re-targeting reconnects,
   * because the target lives in the system instruction.
   */
  private async ensureSession(target: JudgeTarget): Promise<Session> {
    const key = target.languageName;
    // `alive` matters: a closed socket left assigned here was being handed back
    // and streamed into, so every chunk was silently dropped and the attempt
    // timed out looking like a failure to hear the learner.
    if (this.session && this.alive && this.currentKey === key) return this.session;

    this.close();
    const generation = ++this.generation;
    const token = await liveToken();
    if (generation !== this.generation) throw new Error('Superseded.');
    const ai = new GoogleGenAI({ apiKey: token });

    const session = await ai.live.connect({
      model: this.model,
      callbacks: {
        onopen: () => {},
        onmessage: (message: LiveServerMessage) => {
          if (generation !== this.generation) return;
          this.handleMessage(message);
        },
        onerror: () => {
          if (generation !== this.generation) return;
          this.alive = false;
          this.session = null;
          this.settle({
            correct: false,
            missedRespect: false,
            note: 'The connection dropped while listening.',
            heard: '',
            inconclusive: true,
          });
        },
        onclose: () => {
          if (generation !== this.generation) return;
          this.alive = false;
          this.session = null;
          this.settle({
            correct: false,
            missedRespect: false,
            note: 'The connection closed while listening.',
            heard: '',
            inconclusive: true,
          });
        },
      },
      config: {
        // Current Live models expose AUDIO as their response modality. The
        // system instruction constrains the response to the tool call, so no
        // generated audio is played or needed here.
        responseModalities: [Modality.AUDIO],
        realtimeInputConfig: { automaticActivityDetection: { disabled: true } },
        systemInstruction: { parts: [{ text: buildInstruction(target.languageName) }] },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'score_attempt',
                description: "Report whether the learner's spoken attempt matched the target phrase.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    correct: {
                      type: Type.BOOLEAN,
                      description: 'True if the attempt is acceptable for a beginner.',
                    },
                    missed_respect_marker: {
                      type: Type.BOOLEAN,
                      description: 'True if a mandatory respect word or honorific was omitted.',
                    },
                    heard: {
                      type: Type.STRING,
                      description: 'What you actually heard them say.',
                    },
                    mandatory_words_heard: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Each mandatory word you heard in the attempt, fused or not.',
                    },
                    note: {
                      type: Type.STRING,
                      description: 'One short, warm sentence of English coaching.',
                    },
                  },
                  required: ['correct'],
                },
              },
            ],
          },
        ],
      },
    });

    if (generation !== this.generation) {
      session.close();
      throw new Error('Superseded.');
    }
    this.session = session;
    this.currentKey = key;
    this.alive = true;
    return session;
  }

  private handleMessage(message: LiveServerMessage) {
    const calls = message.toolCall?.functionCalls;
    if (!calls?.length) return;
    for (const call of calls) {
      if (call.name !== 'score_attempt') continue;
      const args = (call.args as Record<string, unknown>) || {};
      this.settle({
        correct: args.correct === true,
        missedRespect: args.missed_respect_marker === true,
        note: typeof args.note === 'string' ? args.note : '',
        heard: typeof args.heard === 'string' ? args.heard : '',
      });
    }
    try {
      this.session?.sendToolResponse({
        functionResponses: calls.map((call) => ({
          id: call.id || 'score',
          name: call.name || 'score_attempt',
          response: { output: { status: 'ok' } },
        })),
      });
    } catch {
      // The verdict is already delivered; a failed ack is not worth surfacing.
    }
  }

  private settle(verdict: Verdict) {
    if (this.gotVerdict) return;
    this.gotVerdict = true;
    const resolve = this.pending;
    this.pending = null;
    resolve?.(verdict);
  }

  /**
   * Opens the socket ahead of time. Connecting takes a second or two, and doing
   * it on the mic press meant the first words of an attempt were spoken before
   * anything was listening.
   */
  async prepare(target: JudgeTarget): Promise<void> {
    try {
      await this.ensureSession(target);
    } catch {
      // Pressing the microphone will try again and report properly.
    }
  }

  /** Opens the microphone and starts streaming the attempt. */
  async listen(target: JudgeTarget): Promise<void> {
    const session = await this.ensureSession(target);
    this.sendFailures = 0;

    // Restate the target immediately before the audio, so the most recent
    // instruction in context is always the line actually being attempted.
    try {
      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: buildTargetTurn(target) }] }],
        turnComplete: false,
      });
    } catch {
      this.alive = false;
      this.session = null;
      throw new Error('The connection dropped before listening. Try again.');
    }
    if (!(await this.recorder.init())) {
      throw new Error('Microphone unavailable. Allow access, or skip this line.');
    }
    this.gotVerdict = false;
    const attempt = { target, audio: [] as string[] };
    this.attempt = attempt;
    this.recorder.setCallbacks((chunk) => {
      let binary = '';
      for (let i = 0; i < chunk.byteLength; i++) binary += String.fromCharCode(chunk[i]);
      const data = btoa(binary);
      attempt.audio.push(data);
      try {
        session.sendRealtimeInput({
          audio: { data, mimeType: 'audio/pcm;rate=16000' },
        });
      } catch {
        // Counted rather than ignored: if the socket is gone, every chunk fails
        // and the learner deserves to be told, not left waiting for a timeout.
        this.sendFailures++;
      }
    });
    session.sendRealtimeInput({ activityStart: {} });
    const preBuffer = await this.recorder.start();
    if (preBuffer.length) {
      let binary = '';
      for (let i = 0; i < preBuffer.byteLength; i++) binary += String.fromCharCode(preBuffer[i]);
      const data = btoa(binary);
      // The pre-buffer comes first in time, so it leads the kept audio too.
      attempt.audio.unshift(data);
      session.sendRealtimeInput({
        audio: { data, mimeType: 'audio/pcm;rate=16000' },
      });
    }
  }

  /**
   * Ends the attempt and returns the verdict. A failing verdict is checked
   * again against the same audio before the learner is told: the judge is
   * noisy on short, fused words, and a correct "Ẹ jọ̀ọ́ ma, …" passed about half
   * the time on a single listen but 7 times in 8 with up to three. Real
   * omissions failed every check in the same measurement, so they still fail.
   * Missing respect is only reported when every check agrees.
   */
  async judge(timeoutMs = 15000): Promise<Verdict> {
    const first = await this.firstVerdict(timeoutMs);
    if (first.correct || first.inconclusive) return first;

    let last = first;
    let everyCheckMissedRespect = first.missedRespect;
    for (let check = 0; check < MAX_RECHECKS; check++) {
      const again = await this.recheck(RECHECK_TIMEOUT_MS);
      if (!again || again.inconclusive) break;
      if (again.correct) return again;
      everyCheckMissedRespect = everyCheckMissedRespect && again.missedRespect;
      last = again;
    }
    return { ...last, missedRespect: everyCheckMissedRespect };
  }

  /** Sends the kept audio again for a second listen; null if it cannot. */
  private async recheck(timeoutMs: number): Promise<Verdict | null> {
    const session = this.session;
    const attempt = this.attempt;
    if (!session || !this.alive || !attempt || !attempt.audio.length) return null;
    this.gotVerdict = false;
    const verdict = new Promise<Verdict>((resolve) => {
      this.pending = resolve;
    });
    try {
      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: buildTargetTurn(attempt.target) }] }],
        turnComplete: false,
      });
      session.sendRealtimeInput({ activityStart: {} });
      for (const data of attempt.audio) {
        session.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } });
      }
      session.sendRealtimeInput({ activityEnd: {} });
    } catch {
      this.pending = null;
      return null;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        verdict,
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      this.pending = null;
    }
  }

  /** Ends the attempt and waits for the model's first verdict. */
  private async firstVerdict(timeoutMs: number): Promise<Verdict> {
    // Keep sending until the trailing syllables are captured.
    await this.recorder.stop(300);
    const session = this.session;
    if (!session || !this.alive) {
      return {
        correct: false,
        missedRespect: false,
        note: 'The connection dropped, so nothing reached the listener. Try again.',
        heard: '',
        inconclusive: true,
      };
    }
    if (this.sendFailures > 0) {
      return {
        correct: false,
        missedRespect: false,
        note: 'Your audio did not get through. Try that line again.',
        heard: '',
        inconclusive: true,
      };
    }

    const verdict = new Promise<Verdict>((resolve) => {
      this.pending = resolve;
    });
    try {
      session.sendRealtimeInput({ activityEnd: {} });
    } catch {
      // Fall through to the timeout, which reports an inconclusive attempt.
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<Verdict>((resolve) => {
      timer = setTimeout(
        () =>
          resolve({
            correct: false,
            missedRespect: false,
            note: 'I could not tell — try once more, or skip this line.',
            heard: '',
            inconclusive: true,
          }),
        timeoutMs
      );
    });

    try {
      return await Promise.race([verdict, timeout]);
    } finally {
      clearTimeout(timer);
      this.pending = null;
    }
  }

  /** Stops recording without asking for a verdict. */
  async cancel() {
    try {
      await this.recorder.stop(0);
    } catch {
      // Nothing to stop.
    }
    this.settle({
      correct: false,
      missedRespect: false,
      note: '',
      heard: '',
      inconclusive: true,
    });
  }

  close() {
    ++this.generation;
    this.pending = null;
    this.gotVerdict = false;
    this.alive = false;
    this.sendFailures = 0;
    this.attempt = null;
    this.currentKey = '';
    this.recorder.destroy();
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Already closed.
      }
      this.session = null;
    }
  }
}
