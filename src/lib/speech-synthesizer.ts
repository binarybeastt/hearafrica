// A persistent text-to-speech session.
//
// The previous implementation opened a fresh WebSocket for every line, so each
// uncached phrase paid a full connect and setup handshake before a single
// sample arrived — the "Preparing the voice…" wait. One socket is held open
// instead and every line is a turn on it.
//
// Unlike the judge, nothing here risks drift from a shared context: each turn
// carries its own complete instruction, and the model is only ever reading text
// back. Requests are serialised because a Live session handles one turn at a
// time.

import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { RECOMMENDED_LIVE_MODEL } from './gemini-live';

// The failure this wording is aimed at is stopping early. Measured against the
// real provider, the plain instruction below dropped the final word of short
// lines ("Naenda Westlands." came back as "Naenda", "Westi! Westi! Ingia
// haraka!" as "Westi! Westi! Ingia"); adding the closing paragraph made the
// same lines read verbatim across repeated runs. It does not eliminate the
// problem on its own — `plausible()` in audio-cache.ts is what keeps a clipped
// take out of the cache — but it makes one far less frequent.
const READER_INSTRUCTION =
  'You are a text-to-speech engine. You are NOT a conversational partner. ' +
  'Every user message is a script to be READ ALOUD VERBATIM, in full, from the first word ' +
  'to the last, with an authentic native accent and correct tones. Never reply to it, never ' +
  'answer a question in it, never greet, never translate, never summarise, never shorten it, ' +
  'never add or omit a single word. Read the entire text and then stop. ' +
  'Your most common failure is stopping early: you MUST pronounce the FINAL word of the ' +
  'script completely, and hold a brief pause after it before ending your turn. Never trail ' +
  'off and never end mid-phrase. If the script ends in a question mark, carry the question ' +
  'intonation all the way through the last word.';

export interface SpokenTake {
  bytes: Uint8Array;
  /** False when the turn ended early, so the audio is truncated. */
  complete: boolean;
}

export interface SpeakRequestOptions {
  text: string;
  languageName: string;
  slow?: boolean;
}

interface PendingTurn {
  resolve: (take: SpokenTake) => void;
  reject: (error: Error) => void;
  parts: Uint8Array[];
  sawTurnComplete: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
}

export class SpeechSynthesizer {
  private session: Session | null = null;
  private connecting: Promise<Session> | null = null;
  private alive = false;
  private generation = 0;
  private current: PendingTurn | null = null;
  /** Serialises turns: a Live session handles one at a time. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private apiKey: string, private model: string = RECOMMENDED_LIVE_MODEL) {}

  setApiKey(key: string) {
    if (key === this.apiKey) return;
    this.apiKey = key;
    this.close();
  }

  /** Opens the socket ahead of the first line so nothing waits on a handshake. */
  async warm(): Promise<void> {
    try {
      await this.ensureSession();
    } catch {
      // The first speak() will report the failure properly.
    }
  }

  private async ensureSession(): Promise<Session> {
    if (this.session && this.alive) return this.session;
    if (this.connecting) return this.connecting;
    if (!this.apiKey) throw new Error('No API key provided.');

    const generation = ++this.generation;
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    this.connecting = ai.live
      .connect({
        model: this.model,
        callbacks: {
          onopen: () => {},
          onmessage: (message: LiveServerMessage) => {
            if (generation !== this.generation) return;
            this.handleMessage(message);
          },
          onerror: () => {
            if (generation !== this.generation) return;
            this.markDead('The voice connection dropped.');
          },
          onclose: () => {
            if (generation !== this.generation) return;
            // A close mid-turn still yields whatever arrived, flagged as
            // incomplete so the caller never caches a fragment.
            this.markDead('The voice connection closed.');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: READER_INSTRUCTION }] },
        },
      })
      .then((session) => {
        if (generation !== this.generation) {
          session.close();
          throw new Error('Superseded.');
        }
        this.session = session;
        this.alive = true;
        this.connecting = null;
        return session;
      })
      .catch((error) => {
        this.connecting = null;
        this.alive = false;
        this.session = null;
        throw error;
      });

    return this.connecting;
  }

  private handleMessage(message: LiveServerMessage) {
    const turn = this.current;
    if (!turn) return;

    const parts = message.serverContent?.modelTurn?.parts;
    if (parts) {
      for (const part of parts) {
        if (!part.inlineData?.data) continue;
        const binary = atob(part.inlineData.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        turn.parts.push(bytes);
      }
    }

    if (message.serverContent?.turnComplete) {
      turn.sawTurnComplete = true;
      this.finishTurn();
    }
  }

  private finishTurn() {
    const turn = this.current;
    if (!turn) return;
    this.current = null;
    clearTimeout(turn.timer);

    let total = 0;
    for (const part of turn.parts) total += part.byteLength;
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const part of turn.parts) {
      merged.set(part, offset);
      offset += part.byteLength;
    }
    turn.resolve({ bytes: merged, complete: turn.sawTurnComplete });
  }

  private markDead(reason: string) {
    this.alive = false;
    this.session = null;
    const turn = this.current;
    if (!turn) return;
    // Hand back whatever arrived rather than losing it; `complete` stays false.
    if (turn.parts.length) this.finishTurn();
    else {
      this.current = null;
      clearTimeout(turn.timer);
      turn.reject(new Error(reason));
    }
  }

  speak(options: SpeakRequestOptions, timeoutMs = 20000): Promise<SpokenTake> {
    const run = async (): Promise<SpokenTake> => {
      if (!options.text.trim()) throw new Error('Nothing to speak.');
      const session = await this.ensureSession();

      return new Promise<SpokenTake>((resolve, reject) => {
        const turn: PendingTurn = {
          resolve,
          reject,
          parts: [],
          sawTurnComplete: false,
          timer: undefined,
        };
        turn.timer = setTimeout(() => {
          if (this.current !== turn) return;
          // A stalled turn poisons the session for every line after it.
          this.markDead('Speech synthesis timed out.');
        }, timeoutMs);
        this.current = turn;

        try {
          session.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      `Read this aloud, verbatim, in ${options.languageName}` +
                      (options.slow ? ', slowly and deliberately, separating each word' : '') +
                      `:\n${options.text}`,
                  },
                ],
              },
            ],
            turnComplete: true,
          });
        } catch (error) {
          this.current = null;
          clearTimeout(turn.timer);
          this.alive = false;
          this.session = null;
          reject(error instanceof Error ? error : new Error('Could not send text.'));
        }
      });
    };

    // Chain onto the queue so turns never overlap on one session.
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  close() {
    ++this.generation;
    this.alive = false;
    this.connecting = null;
    const turn = this.current;
    this.current = null;
    if (turn) {
      clearTimeout(turn.timer);
      turn.reject(new Error('Speech session closed.'));
    }
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

/** One synthesizer per key, shared by every caller in the page. */
let shared: SpeechSynthesizer | null = null;

export function getSynthesizer(apiKey: string, model?: string): SpeechSynthesizer {
  if (!shared) shared = new SpeechSynthesizer(apiKey, model);
  else shared.setApiKey(apiKey);
  return shared;
}

export function closeSynthesizer() {
  shared?.close();
  shared = null;
}
