// Pure state machine for a guided encounter.
//
// Kept free of React and of the audio/network layers so the whole lesson flow
// can be unit tested: the correction loop, the reaction chosen for a given
// performance, rapport and price movement, and the end of the scenario.
//
// The loop this implements, per the design:
//   coach nudges -> line is shown and spoken -> learner says it back ->
//   the model judges the audio -> if it missed, it is said again and repeated
//   until it lands or is skipped -> trader reacts to how they actually did.
//
// The verdict comes from the model via a tool call (see pronunciation-judge),
// not from transcription, which is unreliable for these languages.

import { Encounter, Line, Step } from '@/data/encounters';
import { Verdict } from '@/lib/pronunciation-judge';

/** Attempts at one line before the learner is offered a way past it. */
export const MAX_ATTEMPTS = 3;

export type Stage =
  | 'trader' // trader line on screen, waiting to continue
  | 'say' // waiting for a spoken attempt
  | 'correcting' // attempt missed; the line is re-modelled, try again
  | 'choose' // waiting for a decision
  | 'reaction' // trader is responding to what the learner just did
  | 'done';

export type Performance = 'firstTry' | 'retry' | 'missedCritical' | 'skipped';

export interface LogEntry {
  id: string;
  who: 'trader' | 'you' | 'coach';
  line?: Line;
  text?: string;
}

export interface EncounterState {
  stepIndex: number;
  stage: Stage;
  attempts: number;
  rapport: number;
  price: number | null;
  /** Set while stage === 'reaction'. */
  reaction: Line | null;
  /** Feedback text for the last attempt, if any. */
  feedback: string | null;
  /** How the learner did on the step just completed. */
  lastPerformance: Performance | null;
  log: LogEntry[];
  /** Every spoken step's outcome, so the summary can tell the truth. */
  performances: Performance[];
}

export interface EncounterSummary {
  spoken: number;
  firstTry: number;
  skipped: number;
  missedCritical: number;
  total: number;
}

export type EncounterEvent =
  | { type: 'CONTINUE' }
  | { type: 'ATTEMPT'; verdict: Verdict }
  | { type: 'SKIP' }
  | { type: 'CHOOSE'; optionId: string };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stageFor(step: Step | undefined): Stage {
  if (!step) return 'done';
  if (step.kind === 'trader') return 'trader';
  if (step.kind === 'say') return 'say';
  return 'choose';
}

export function start(encounter: Encounter): EncounterState {
  const first = encounter.steps[0];
  const log: LogEntry[] = [];
  if (first && first.kind === 'trader') {
    log.push({ id: `${first.id}-line`, who: 'trader', line: first.line });
  }
  return {
    stepIndex: 0,
    stage: stageFor(first),
    attempts: 0,
    rapport: encounter.startingRapport,
    price: encounter.startingPrice,
    reaction: null,
    feedback: null,
    lastPerformance: null,
    log,
    performances: [],
  };
}

/** Moves to the next step, logging its opening line if it has one. */
function advance(state: EncounterState, encounter: Encounter): EncounterState {
  const nextIndex = state.stepIndex + 1;
  const next = encounter.steps[nextIndex];
  const log = [...state.log];
  if (next && next.kind === 'trader') {
    log.push({ id: `${next.id}-line`, who: 'trader', line: next.line });
  }
  return {
    ...state,
    stepIndex: nextIndex,
    stage: stageFor(next),
    attempts: 0,
    reaction: null,
    feedback: null,
    log,
  };
}

export function reduce(
  state: EncounterState,
  event: EncounterEvent,
  encounter: Encounter
): EncounterState {
  const step = encounter.steps[state.stepIndex];
  if (!step || state.stage === 'done') return state;

  switch (event.type) {
    case 'CONTINUE': {
      // Leaving a reaction, a plain trader line, or a re-modelled correction.
      if (state.stage === 'reaction' || state.stage === 'trader') {
        return advance(state, encounter);
      }
      if (state.stage === 'correcting') {
        return { ...state, stage: 'say' };
      }
      return state;
    }

    case 'ATTEMPT': {
      // `correcting` already displays and replays the same target, so the
      // retry button submits directly from that stage as well.
      if ((state.stage !== 'say' && state.stage !== 'correcting') || step.kind !== 'say') return state;
      const { verdict } = event;

      // An inconclusive attempt (no audio, dropped connection, no verdict) is
      // not the learner's failure, so it must not consume an attempt or count
      // against them.
      if (verdict.inconclusive) {
        return { ...state, stage: 'correcting', feedback: verdict.note };
      }

      const attempts = state.attempts + 1;
      const note = verdict.note;

      if (verdict.correct) {
        const performance: Performance = attempts > 1 ? 'retry' : 'firstTry';
        return withReaction(state, encounter, step, performance, attempts, note);
      }

      // Dropping a respect marker is a different failure from mispronouncing:
      // the trader hears you, but the warmth does not follow.
      if (attempts >= MAX_ATTEMPTS) {
        return withReaction(
          state,
          encounter,
          step,
          verdict.missedRespect ? 'missedCritical' : 'skipped',
          attempts,
          note
        );
      }
      return { ...state, stage: 'correcting', attempts, feedback: note };
    }

    case 'SKIP': {
      if (step.kind !== 'say') return state;
      if (state.stage !== 'say' && state.stage !== 'correcting') return state;
      return withReaction(state, encounter, step, 'skipped', state.attempts, null);
    }

    case 'CHOOSE': {
      if (state.stage !== 'choose' || step.kind !== 'choose') return state;
      const option = step.options.find((o) => o.id === event.optionId);
      if (!option) return state;
      return {
        ...state,
        stage: 'reaction',
        reaction: option.reaction,
        rapport: clamp(state.rapport + option.rapportDelta, 0, 100),
        price: option.price ?? state.price,
        feedback: null,
        lastPerformance: null,
        log: [
          ...state.log,
          { id: `${step.id}-you`, who: 'you', line: option.line },
          { id: `${step.id}-reaction`, who: 'trader', line: option.reaction },
        ],
      };
    }

    default:
      return state;
  }
}

function withReaction(
  state: EncounterState,
  encounter: Encounter,
  step: Extract<Step, { kind: 'say' }>,
  performance: Performance,
  attempts: number,
  feedback: string | null
): EncounterState {
  const reaction =
    step.reactions[performance] ?? step.reactions.firstTry;

  // Only a clean or corrected delivery earns the full rapport for the step.
  const earned =
    performance === 'firstTry'
      ? (step.rapportDelta ?? 0)
      : performance === 'retry'
      ? Math.round((step.rapportDelta ?? 0) / 2)
      : performance === 'missedCritical'
      ? -5
      : 0;

  return {
    ...state,
    stage: 'reaction',
    attempts,
    reaction,
    feedback,
    lastPerformance: performance,
    performances: [...state.performances, performance],
    rapport: clamp(state.rapport + earned, 0, 100),
    log: [
      ...state.log,
      ...(performance === 'skipped'
        ? []
        : [{ id: `${step.id}-you-${attempts}`, who: 'you' as const, line: step.line }]),
      { id: `${step.id}-reaction-${attempts}`, who: 'trader' as const, line: reaction },
    ],
  };
}

export function isFinished(state: EncounterState): boolean {
  return state.stage === 'done';
}

/** Words that must be spoken for an attempt to count, by chunk role. */
export function criticalWordsFor(
  step: Step,
  chunks: Record<string, { native: string; role: string }>
): string[] {
  if (step.kind !== 'say' || !step.chunks) return [];
  return step.chunks
    .map((id) => chunks[id])
    .filter((c) => c && (c.role === 'respect' || c.role === 'honorific'))
    .map((c) => c.native);
}


/** What actually happened, for an honest closing summary. */
export function summarize(state: EncounterState, encounter: Encounter): EncounterSummary {
  const total = encounter.steps.filter((s) => s.kind === 'say').length;
  return {
    total,
    spoken: state.performances.filter((p) => p !== 'skipped').length,
    firstTry: state.performances.filter((p) => p === 'firstTry').length,
    skipped: state.performances.filter((p) => p === 'skipped').length,
    missedCritical: state.performances.filter((p) => p === 'missedCritical').length,
  };
}
