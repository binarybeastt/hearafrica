'use client';

// The guided encounter: nudge -> show and speak the line -> learner says it
// back -> the model judges it -> correct and repeat -> the trader reacts.
// Repeats until the scenario is over.
//
// All trader and learner lines are authored (src/data/encounters.ts) and played
// from cache, so the scene is identical every run and can be vetted before a
// demo. Attempts are judged by the model through a tool call, never by
// transcription.

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Encounter, Line, Step } from '@/data/encounters';
import { ScenarioSpec, money } from '@/data/scenario-specs';
import { getLearningContent } from '@/data/learning-content';
import { DrillPlayer, SpeakRequest, getLineAudio } from '@/lib/audio-cache';
import { getSynthesizer } from '@/lib/speech-synthesizer';
import { PronunciationJudge, Verdict } from '@/lib/pronunciation-judge';
import {
  EncounterState,
  EncounterEvent,
  MAX_ATTEMPTS,
  criticalWordsFor,
  reduce as reduceEncounter,
  start as startEncounter,
  summarize,
} from '@/lib/encounter-engine';

interface GuidedEncounterProps {
  spec: ScenarioSpec;
  encounter: Encounter;
  apiKey: string;
  model?: string;
  onToast: (message: string) => void;
  onRapportChange?: (rapport: number) => void;
  onPriceChange?: (price: number | null) => void;
  onFinished?: () => void;
  /**
   * Publishes the encounter's state so the 3D market can show it: her posture,
   * her spoken line, and the price on the chalk card. Purely an output — the
   * encounter does not depend on anyone listening.
   */
  onStateChange?: (snapshot: EncounterSnapshot) => void;
  /**
   * In the 3D market the trader's reply appears in a speech bubble over her
   * head, so the bar must not print it a second time.
   */
  worldMode?: boolean;
}

export interface EncounterSnapshot {
  stage: string;
  rapport: number;
  price: number | null;
  lastPerformance: string | null;
  /** What the trader is saying right now, if anything. */
  traderLine: { native: string; en: string } | null;
  /** True while the learner's microphone is open. */
  listening: boolean;
}

export const GuidedEncounter: React.FC<GuidedEncounterProps> = ({
  spec,
  encounter,
  apiKey,
  model,
  onToast,
  onRapportChange,
  onPriceChange,
  onFinished,
  onStateChange,
  worldMode = false,
}) => {
  const [state, dispatch] = useReducer(
    (s: EncounterState, e: EncounterEvent) => reduceEncounter(s, e, encounter),
    encounter,
    startEncounter
  );

  const [recording, setRecording] = useState(false);
  const [checking, setChecking] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  /** The practice prompt that has finished playing and is safe to repeat. */
  const [modelReadyKey, setModelReadyKey] = useState<string | null>(null);
  /** A choice picked but not yet spoken; the learner still has to say it. */
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [choiceAttempts, setChoiceAttempts] = useState(0);
  const [choiceFeedback, setChoiceFeedback] = useState<string | null>(null);

  const playerRef = useRef<DrillPlayer | null>(null);
  if (!playerRef.current) playerRef.current = new DrillPlayer();
  const judgeRef = useRef<PronunciationJudge | null>(null);
  const recordingRef = useRef(false);
  const startingRef = useRef(false);
  const pendingReleaseRef = useRef(false);
  const [lastVerdict, setLastVerdict] = useState<Verdict | null>(null);
  /** The last line auto-played, so a repeated effect run does not play it twice. */
  const autoPlayedRef = useRef<string | null>(null);

  const step: Step | undefined = encounter.steps[state.stepIndex];
  const content = getLearningContent(encounter.scenarioId);

  useEffect(() => {
    onRapportChange?.(state.rapport);
  }, [state.rapport, onRapportChange]);

  useEffect(() => {
    onPriceChange?.(state.price);
  }, [state.price, onPriceChange]);

  useEffect(() => {
    if (state.stage === 'done') onFinished?.();
  }, [state.stage, onFinished]);

  // Mirror the encounter out to the world.
  const spokenLine =
    state.stage === 'reaction' && state.reaction
      ? { native: state.reaction.native, en: state.reaction.en }
      : null;
  const spokenKey = spokenLine ? spokenLine.native : '';

  useEffect(() => {
    onStateChange?.({
      stage: state.stage,
      rapport: state.rapport,
      price: state.price,
      lastPerformance: state.lastPerformance,
      traderLine: spokenLine,
      listening: recording,
    });
    // spokenKey stands in for spokenLine, which is rebuilt each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.rapport, state.price, state.lastPerformance, spokenKey, recording]);

  useEffect(() => {
    const player = playerRef.current;
    return () => {
      player?.destroy();
      judgeRef.current?.close();
      judgeRef.current = null;
    };
  }, []);

  /**
   * `force` is for the replay buttons. The automatic play on a new line must
   * NOT force, so that a duplicate effect run is collapsed rather than having
   * the second call stop the audio the first just started.
   */
  const speak = useCallback(
    async (key: string, line: Line, slow = false, force = false) => {
      if (!apiKey) {
        onToast('Add your Gemini API key in settings to hear the phrases.');
        return false;
      }
      setAudioBusy(true);
      const player = playerRef.current;
      try {
        await (force ? player?.replay.bind(player) : player?.play.bind(player))?.({
          key,
          text: line.native,
          languageName: spec.languageName,
          apiKey,
          model,
          slow,
        });
        return true;
      } catch (err: any) {
        onToast(err?.message || 'Could not play that line.');
        return false;
      } finally {
        setAudioBusy(false);
      }
    },
    [apiKey, spec.languageName, model, onToast]
  );

  // The current line to hear: the trader's, the reaction, or the one to copy.
  const activeLine: { key: string; presentationKey: string; line: Line; practice: boolean } | null = useMemo(() => {
    if (state.stage === 'reaction' && state.reaction) {
      const key = `${step?.id}:reaction:${state.lastPerformance ?? 'x'}`;
      return { key, presentationKey: key, line: state.reaction, practice: false };
    }
    if (!step) return null;
    if (step.kind === 'trader') {
      const key = `${step.id}:trader`;
      return { key, presentationKey: key, line: step.line, practice: false };
    }
    if (step.kind === 'say') {
      const key = `${step.id}:target`;
      // Each correction is a fresh listen-first presentation, while `key`
      // stays stable so the synthesized audio remains cached.
      return {
        key,
        presentationKey: `${key}:${state.stage}:${state.attempts}`,
        line: step.line,
        practice: true,
      };
    }
    if (step.kind === 'choose' && pendingChoice) {
      const option = step.options.find((o) => o.id === pendingChoice);
      if (option) {
        const key = `${step.id}:${option.id}`;
        return {
          key,
          presentationKey: `${key}:attempt:${choiceAttempts}`,
          line: option.line,
          practice: true,
        };
      }
    }
    return null;
  }, [state.stage, state.attempts, state.reaction, state.lastPerformance, step, pendingChoice, choiceAttempts]);

  // Play each new line once as it appears. Guarded by a ref rather than by the
  // player, because the cleanup below runs between a duplicated effect's two
  // invocations and would otherwise clear any guard held inside the player.
  useEffect(() => {
    if (!activeLine) return;
    if (autoPlayedRef.current === activeLine.presentationKey) return;
    autoPlayedRef.current = activeLine.presentationKey;
    // Practice lines are presented visually first. The learner explicitly
    // chooses "Hear it" before push-to-talk is unlocked; entering a market
    // must never make the greeting start talking over the scene-setting nudge.
    if (activeLine.practice) {
      setModelReadyKey(null);
      return;
    }
    void speak(activeLine.key, activeLine.line, false, activeLine.practice).then((played) => {
      // A failed/missing model must never silently unlock a "repeat" task.
      // The learner can replay it or explicitly skip instead.
      if (activeLine.practice && played) setModelReadyKey(activeLine.presentationKey);
    });
    // Intentionally keyed on the line itself, not on speak's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLine?.presentationKey]);

  const modelReady = Boolean(
    activeLine?.practice && modelReadyKey === activeLine.presentationKey
  );

  // --- Microphone -----------------------------------------------------------
  // The attempt is judged by the model itself, via the score_attempt tool call.
  // Transcription is not used: it drops tone marks and mangles these languages,
  // so comparing its text to a target fails correct speech and passes wrong.

  const target = useMemo(() => {
    if (step?.kind === 'say') return step.line;
    if (step?.kind === 'choose' && pendingChoice) {
      return step.options.find((o) => o.id === pendingChoice)?.line ?? null;
    }
    return null;
  }, [step, pendingChoice]);

  const criticalWords = useMemo(() => {
    if (!step || !content) return [];
    return criticalWordsFor(step, content.chunks);
  }, [step, content]);

  // Warm the voice socket and pull every line of the encounter into the cache
  // as soon as it opens. The learner is reading the first nudge while this
  // runs, so by the time they reach step two nothing has to be synthesized.
  useEffect(() => {
    if (!apiKey) return;
    const synth = getSynthesizer(apiKey, model);
    void synth.warm();

    const requests: SpeakRequest[] = [];
    for (const s of encounter.steps) {
      if (s.kind === 'trader') {
        requests.push({ key: `${s.id}:trader`, text: s.line.native, languageName: spec.languageName, apiKey, model });
      } else if (s.kind === 'say') {
        requests.push({ key: `${s.id}:target`, text: s.line.native, languageName: spec.languageName, apiKey, model });
        for (const [performance, line] of Object.entries(s.reactions)) {
          if (!line) continue;
          requests.push({
            key: `${s.id}:reaction:${performance}`,
            text: line.native,
            languageName: spec.languageName,
            apiKey,
            model,
          });
        }
      } else {
        for (const option of s.options) {
          requests.push({ key: `${s.id}:${option.id}`, text: option.line.native, languageName: spec.languageName, apiKey, model });
          requests.push({
            key: `${s.id}:reaction:x`,
            text: option.reaction.native,
            languageName: spec.languageName,
            apiKey,
            model,
          });
        }
      }
    }

    let cancelled = false;
    void (async () => {
      // Sequential on purpose: they share one socket, and the line being shown
      // now must not queue behind twenty others.
      for (const request of requests) {
        if (cancelled) return;
        await getLineAudio(request).catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounter.id, apiKey, model, spec.languageName]);

  // Open the judging socket as soon as a line becomes the one to say, so the
  // connection handshake is not happening while the learner is already talking.
  useEffect(() => {
    if (!apiKey || !target) return;
    if (!judgeRef.current) judgeRef.current = new PronunciationJudge(apiKey, model);
    void judgeRef.current.prepare({
      native: target.native,
      en: target.en,
      languageName: spec.languageName,
      criticalWords,
    });
    // Keyed on the line itself: re-preparing on every render would reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.native, apiKey, model, spec.languageName]);

  const stopListening = async () => {
    if (!recordingRef.current) {
      if (startingRef.current) pendingReleaseRef.current = true;
      return;
    }
    recordingRef.current = false;
    setRecording(false);
    setChecking(true);
    try {
      const verdict = await judgeRef.current!.judge();
      setLastVerdict(verdict);
      if (step?.kind === 'choose' && pendingChoice) {
        if (verdict.correct) {
          dispatch({ type: 'CHOOSE', optionId: pendingChoice });
          setPendingChoice(null);
          setChoiceAttempts(0);
          setChoiceFeedback(null);
        } else {
          // Advance the presentation round even when judging was inconclusive,
          // so the model phrase is played again before another recording.
          const attempts = choiceAttempts + 1;
          setChoiceAttempts(attempts);
          setChoiceFeedback(verdict.note || 'Listen once more, then say the line back.');
          setModelReadyKey(null);
        }
        return;
      }
      dispatch({ type: 'ATTEMPT', verdict });
    } catch (err: any) {
      onToast(err?.message || 'Could not judge that attempt.');
    } finally {
      setChecking(false);
    }
  };

  const startListening = async () => {
    if (startingRef.current || recordingRef.current || checking || !modelReady) return;
    if (!apiKey) {
      onToast('Add your Gemini API key in settings to use the microphone.');
      return;
    }
    if (!target) return;
    setLastVerdict(null);
    startingRef.current = true;
    pendingReleaseRef.current = false;

    if (!judgeRef.current) {
      judgeRef.current = new PronunciationJudge(apiKey, model);
    }
    try {
      await judgeRef.current.listen({
        native: target.native,
        en: target.en,
        languageName: spec.languageName,
        criticalWords,
      });
      recordingRef.current = true;
      setRecording(true);
      if (pendingReleaseRef.current) void stopListening();
    } catch (err: any) {
      onToast(err?.message || 'Microphone unavailable. You can skip this line.');
    } finally {
      startingRef.current = false;
    }
  };

  useEffect(() => {
    const editable = (target: EventTarget | null) => {
      // A key event's target is not always an Element — it is `document` or
      // `window` when nothing is focused, and calling closest() on those threw.
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    };
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || editable(event.target)) return;
      event.preventDefault();
      void startListening();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || editable(event.target)) return;
      event.preventDefault();
      void stopListening();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

  if (!step && state.stage !== 'done') return null;

  const coachStyle: React.CSSProperties = {
    display: 'flex',
    gap: '7px',
    padding: '9px 10px',
    background: '#E8EFDC',
    border: '1.5px solid var(--ink)',
    borderRadius: '12px',
    fontSize: '12px',
    lineHeight: 1.45,
  };

  const lineCard = (line: Line, opts: { big?: boolean } = {}) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        padding: '10px',
        background: 'var(--paper2)',
        border: '1.5px solid var(--ink)',
        borderRadius: '12px',
      }}
    >
      <div
        className="yo"
        lang={spec.languageCode}
        style={{ fontSize: opts.big ? '17px' : '14px', fontWeight: 700, lineHeight: 1.3 }}
      >
        {line.native}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--ink3)', fontStyle: 'italic' }}>
        {line.phonetic}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--ink2)' }}>{line.en}</div>
    </div>
  );

  const replayRow = (key: string, line: Line, readyKey?: string) => (
    <div style={{ display: 'flex', gap: '6px' }}>
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (readyKey) setModelReadyKey(null);
          void speak(key, line, false, true).then((played) => {
            if (readyKey && played) setModelReadyKey(readyKey);
          });
        }}
        disabled={audioBusy}
        style={{ flex: 1, minHeight: '38px', fontSize: '12px' }}
      >
        {audioBusy
          ? '⏳ Preparing the voice…'
          : readyKey && modelReadyKey !== readyKey
          ? '① 🔊 Hear what to say'
          : '🔊 Hear it again'}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (readyKey) setModelReadyKey(null);
          void speak(key, line, true, true).then((played) => {
            if (readyKey && played) setModelReadyKey(readyKey);
          });
        }}
        disabled={audioBusy}
        title="Slower"
        style={{ minHeight: '38px', padding: '0 12px' }}
      >
        🐢
      </button>
    </div>
  );

  const micButton = (label: string) => (
    <button
      type="button"
      className="btn primary"
      // Sticky so the way to answer is always reachable, however tall the
      // nudge and chunk tiles above it happen to be.
      data-mic="1"
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        void startListening();
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        void stopListening();
      }}
      onPointerCancel={() => void stopListening()}
      disabled={checking || audioBusy || !modelReady}
      style={{
        minHeight: '46px',
        fontSize: '13px',
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
      }}
    >
      {checking
        ? 'Checking what you said…'
        : recording
        ? '↑ Release Space to submit'
        : !modelReady
        ? '🔊 Listen first…'
        : label}
    </button>
  );

  const progress = `${Math.min(state.stepIndex + 1, encounter.steps.length)} of ${encounter.steps.length}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--ink2)',
          }}
        >
          {state.stage === 'done' ? 'Finished' : `Step ${progress}`}
        </span>
        {state.attempts > 0 && state.stage !== 'done' && (
          <span style={{ fontSize: '10px', color: 'var(--ink3)' }}>
            attempt {state.attempts} of {MAX_ATTEMPTS}
          </span>
        )}
      </div>

      {state.stage === 'trader' && step?.kind === 'trader' && (
        <>
          {lineCard(step.line)}
          {replayRow(`${step.id}:trader`, step.line)}
          <button
            type="button"
            className="btn primary"
            onClick={() => dispatch({ type: 'CONTINUE' })}
            style={{ minHeight: '40px' }}
          >
            Continue →
          </button>
        </>
      )}

      {/* --- Nudge, model, say --- */}
      {(state.stage === 'say' || state.stage === 'correcting') && step?.kind === 'say' && (
        <>
          <div style={coachStyle}>
            <span aria-hidden="true">💬</span>
            <span>{step.nudge}</span>
          </div>

          {state.stage === 'correcting' && (
            <div
              className="note"
              style={{
                fontSize: '12px',
                background: lastVerdict?.inconclusive ? undefined : '#FBD0B4',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <span>
                {state.feedback || 'Not quite yet.'}{' '}
                {lastVerdict?.inconclusive ? '' : 'Here it is again — listen, then say it.'}
              </span>
            </div>
          )}

          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink2)' }}>
            Say this:
          </div>
          {lineCard(step.line, { big: true })}

          {step.chunks && content && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {step.chunks
                .map((id) => content.chunks[id])
                .filter(Boolean)
                .map((chunk) => (
                  <span
                    key={chunk.id}
                    title={chunk.toneHint || chunk.gloss}
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      padding: '3px 7px',
                      background:
                        chunk.role === 'respect' || chunk.role === 'honorific'
                          ? 'var(--marigold)'
                          : 'var(--paper2)',
                      border: '1.5px solid var(--ink)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      lineHeight: 1.3,
                    }}
                  >
                    <b className="yo" lang={spec.languageCode}>
                      {chunk.native}
                    </b>
                    <span style={{ fontSize: '9px', color: 'var(--ink2)' }}>{chunk.gloss}</span>
                  </span>
                ))}
            </div>
          )}

          {replayRow(`${step.id}:target`, step.line, activeLine?.presentationKey)}
          {micButton('② Hold Space to say it back')}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--ink3)', fontStyle: 'italic' }}>
              {spec.traderName} listens to how you say it.
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SKIP' })}
              style={{
                fontSize: '11px',
                background: 'none',
                border: 'none',
                color: 'var(--ink3)',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              skip this line
            </button>
          </div>
        </>
      )}

      {/* --- A real decision --- */}
      {state.stage === 'choose' && step?.kind === 'choose' && (
        <>
          <div style={coachStyle}>
            <span aria-hidden="true">⚖️</span>
            <span>{step.nudge}</span>
          </div>

          {!pendingChoice ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {step.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="choice"
                  onClick={() => setPendingChoice(option.id)}
                  style={{ textAlign: 'left' }}
                >
                  <span className="en" style={{ fontSize: '13px' }}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            (() => {
              const option = step.options.find((o) => o.id === pendingChoice);
              if (!option) return null;
              return (
                <>
                  {choiceFeedback && (
                    <div className="note" style={{ fontSize: '12px', background: '#FBD0B4' }}>
                      {choiceFeedback} Here it is again—listen, then say it.
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink2)' }}>
                    Then say this:
                  </div>
                  {lineCard(option.line, { big: true })}
                  {replayRow(`${step.id}:${option.id}`, option.line, activeLine?.presentationKey)}
                  {micButton('② Hold Space to say it')}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingChoice(null);
                        setChoiceAttempts(0);
                        setChoiceFeedback(null);
                      }}
                      style={{
                        fontSize: '11px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink3)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      ← choose differently
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'CHOOSE', optionId: option.id });
                        setPendingChoice(null);
                      }}
                      style={{
                        fontSize: '11px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink3)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      skip saying it →
                    </button>
                  </div>
                </>
              );
            })()
          )}
        </>
      )}

      {/* --- She reacts to how you actually did --- */}
      {state.stage === 'reaction' && state.reaction && (
        <>
          {state.lastPerformance && (
            <div
              className="note"
              style={{
                fontSize: '11px',
                background:
                  state.lastPerformance === 'firstTry'
                    ? '#D4E8D6'
                    : state.lastPerformance === 'missedCritical'
                    ? '#FBD0B4'
                    : undefined,
              }}
            >
              {state.lastPerformance === 'firstTry'
                ? 'Clean — she heard you.'
                : state.lastPerformance === 'retry'
                ? 'Got there. That is how it goes.'
                : state.lastPerformance === 'missedCritical'
                ? `You were understood, but the respect marker was missing — notice ${spec.traderPronouns.subject} cools off.`
                : 'Moving on — you can come back to this line.'}
            </div>
          )}
          {!worldMode && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink2)' }}>
                {spec.traderName} replies:
              </div>
              {lineCard(state.reaction)}
            </>
          )}
          {replayRow(
            `${step?.id}:reaction:${state.lastPerformance ?? 'x'}`,
            state.reaction
          )}
          <button
            type="button"
            className="btn primary"
            onClick={() => dispatch({ type: 'CONTINUE' })}
            style={{ minHeight: '42px' }}
          >
            Continue →
          </button>
        </>
      )}

      {/* --- Done. The summary reports what actually happened. --- */}
      {state.stage === 'done' && (() => {
        const done = summarize(state, encounter);
        const saidAll = done.spoken === done.total && done.total > 0;
        return (
        <div className="sum" style={{ gap: '8px' }}>
          <h3>{saidAll ? 'Encounter complete' : 'Encounter finished'}</h3>
          <div style={{ fontSize: '13px', color: 'var(--ink2)' }}>
            {saidAll
              ? encounter.outro
              : `You said ${done.spoken} of ${done.total} lines yourself and skipped ${done.skipped}. The skipped lines are the ones worth coming back for.`}
          </div>
          {done.missedCritical > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--brown)' }}>
              {done.missedCritical === 1
                ? 'One line went out without its respect marker.'
                : `${done.missedCritical} lines went out without their respect markers.`}{' '}
              That is what kept {spec.traderPronouns.object} cool with you.
            </div>
          )}
          <div
            style={{
              fontSize: '12px',
              background: '#D4E8D6',
              padding: '8px 10px',
              borderRadius: '10px',
              border: '1.5px solid var(--ink)',
            }}
          >
            Rapport <b>{state.rapport}%</b>
            {state.price !== null && (
              <>
                {' · '}Price settled at <b>{money(spec, state.price)}</b>
              </>
            )}
            {done.firstTry > 0 && (
              <>
                {' · '}
                <b>{done.firstTry}</b> said cleanly first time
              </>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
};
