const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => imports[name] ?? {},
    console,
  });
  return module.exports;
}

const { start, reduce, MAX_ATTEMPTS, criticalWordsFor } = load('src/lib/encounter-engine.ts');

// Verdicts come from the model's score_attempt tool call, not from transcription.
const verdict = (over = {}) => ({
  correct: true,
  missedRespect: false,
  note: 'Clear.',
  heard: 'n-greeting',
  ...over,
});
const ok = () => ({ type: 'ATTEMPT', verdict: verdict() });
const wrong = (note = 'Not quite.') =>
  ({ type: 'ATTEMPT', verdict: verdict({ correct: false, note }) });
const disrespectful = () =>
  ({ type: 'ATTEMPT', verdict: verdict({ correct: false, missedRespect: true, note: 'You left out Ẹ.' }) });

const line = (en) => ({ native: `n-${en}`, phonetic: `p-${en}`, en });

// A miniature encounter with one of each step kind.
const encounter = {
  id: 'test',
  scenarioId: 's',
  languageId: 'yoruba',
  title: 't',
  goal: 'g',
  startingRapport: 40,
  startingPrice: 2500,
  outro: 'o',
  steps: [
    {
      kind: 'say',
      id: 'b',
      nudge: 'greet her',
      line: line('greeting'),
      chunks: ['resp', 'greet'],
      rapportDelta: 10,
      reactions: {
        firstTry: line('warm'),
        retry: line('thats it'),
        missedCritical: line('cool'),
        skipped: line('neutral'),
      },
    },
    {
      kind: 'choose',
      id: 'c',
      nudge: 'how hard?',
      options: [
        { id: 'low', label: 'low', line: line('lowball'), rapportDelta: -5, price: 2200, reaction: line('ha!') },
        { id: 'fair', label: 'fair', line: line('fair'), rapportDelta: 10, price: 1800, reaction: line('ok') },
      ],
    },
  ],
};

test('an encounter opens on the line the learner has to say', () => {
  const state = start(encounter);
  assert.equal(state.stage, 'say', 'the learner is told what to do, not quizzed');
  assert.equal(state.stepIndex, 0);
  assert.equal(state.rapport, 40);
  assert.equal(state.price, 2500);
});

function atSayStep() {
  return start(encounter);
}

test('saying it correctly first time earns the full rapport and the warm reaction', () => {
  let state = atSayStep();
  state = reduce(state, ok(), encounter);
  assert.equal(state.stage, 'reaction');
  assert.equal(state.lastPerformance, 'firstTry');
  assert.equal(state.reaction.en, 'warm');
  assert.equal(state.rapport, 50);
});

test('a missed attempt re-models the line and lets the learner try again', () => {
  let state = atSayStep();
  state = reduce(
    state,
    wrong('try again'),
    encounter
  );
  assert.equal(state.stage, 'correcting');
  assert.equal(state.attempts, 1);
  assert.equal(state.stepIndex, 0, 'must not advance past a line that was not said');
  assert.equal(state.feedback, 'try again');

  // Continuing from the correction returns to the microphone, same step.
  state = reduce(state, { type: 'CONTINUE' }, encounter);
  assert.equal(state.stage, 'say');
  assert.equal(state.attempts, 1);
});

test('the retry shown during correction is accepted without a hidden continue action', () => {
  let state = atSayStep();
  state = reduce(state, wrong('Listen once more.'), encounter);
  assert.equal(state.stage, 'correcting');
  state = reduce(state, ok(), encounter);
  assert.equal(state.stage, 'reaction');
  assert.equal(state.lastPerformance, 'retry');
});

test('getting it right after a correction earns half rapport and the retry reaction', () => {
  let state = atSayStep();
  state = reduce(state, wrong('x'), encounter);
  state = reduce(state, { type: 'CONTINUE' }, encounter);
  state = reduce(state, ok(), encounter);
  assert.equal(state.lastPerformance, 'retry');
  assert.equal(state.reaction.en, 'thats it');
  assert.equal(state.rapport, 45);
});

test('dropping a respect marker is corrected rather than accepted', () => {
  let state = atSayStep();
  // High ratio, but the critical word is missing: this must not pass.
  state = reduce(state, disrespectful(), encounter);
  assert.equal(state.stage, 'correcting');
  assert.equal(state.rapport, 40, 'no rapport for a disrespectful delivery');
});

test('a learner who never lands the respect marker gets the cool reaction and loses rapport', () => {
  let state = atSayStep();
  const bad = disrespectful();
  for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
    state = reduce(state, bad, encounter);
    state = reduce(state, { type: 'CONTINUE' }, encounter);
  }
  state = reduce(state, bad, encounter);
  assert.equal(state.stage, 'reaction');
  assert.equal(state.lastPerformance, 'missedCritical');
  assert.equal(state.reaction.en, 'cool');
  assert.equal(state.rapport, 35);
});

test('the loop always terminates: repeated failure ends in the skipped reaction', () => {
  let state = atSayStep();
  const bad = wrong('no');
  for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
    state = reduce(state, bad, encounter);
    state = reduce(state, { type: 'CONTINUE' }, encounter);
  }
  state = reduce(state, bad, encounter);
  assert.equal(state.stage, 'reaction');
  assert.equal(state.lastPerformance, 'skipped');
  assert.equal(state.rapport, 40, 'skipping is neutral, never punitive');
});

test('skipping leaves no false record of the learner having said the line', () => {
  let state = atSayStep();
  const before = state.log.length;
  state = reduce(state, { type: 'SKIP' }, encounter);
  assert.equal(state.lastPerformance, 'skipped');
  const added = state.log.slice(before);
  assert.equal(added.filter((e) => e.who === 'you').length, 0);
});

test('a choice moves the price, moves rapport, and logs both sides', () => {
  let state = atSayStep();
  state = reduce(state, ok(), encounter);
  state = reduce(state, { type: 'CONTINUE' }, encounter);
  assert.equal(state.stage, 'choose');

  state = reduce(state, { type: 'CHOOSE', optionId: 'fair' }, encounter);
  assert.equal(state.price, 1800);
  assert.equal(state.rapport, 60);
  assert.equal(state.reaction.en, 'ok');
  const tail = state.log.slice(-2);
  assert.equal(tail[0].who, 'you');
  assert.equal(tail[1].who, 'trader');
});

test('an unknown choice id is ignored rather than advancing the scene', () => {
  let state = atSayStep();
  state = reduce(state, ok(), encounter);
  state = reduce(state, { type: 'CONTINUE' }, encounter);
  const same = reduce(state, { type: 'CHOOSE', optionId: 'nope' }, encounter);
  assert.equal(same.stage, 'choose');
  assert.equal(same.stepIndex, state.stepIndex);
});

test('the encounter reaches done after the last step and then ignores events', () => {
  let state = atSayStep();
  state = reduce(state, ok(), encounter);
  state = reduce(state, { type: 'CONTINUE' }, encounter);
  state = reduce(state, { type: 'CHOOSE', optionId: 'fair' }, encounter);
  state = reduce(state, { type: 'CONTINUE' }, encounter);
  assert.equal(state.stage, 'done');

  const after = reduce(state, { type: 'CONTINUE' }, encounter);
  assert.equal(after.stage, 'done');
  assert.equal(after.stepIndex, state.stepIndex);
});

test('rapport is clamped to 0..100', () => {
  const harsh = JSON.parse(JSON.stringify(encounter));
  harsh.startingRapport = 98;
  harsh.steps[1].rapportDelta = 30;
  let state = start(harsh);
  state = reduce(state, ok(), harsh);
  assert.equal(state.rapport, 100);
});

test('critical words are taken from respect and honorific chunks only', () => {
  const chunks = {
    resp: { native: 'Ẹ', role: 'respect' },
    greet: { native: 'káàárọ̀', role: 'greeting' },
  };
  const words = criticalWordsFor(encounter.steps[0], chunks);
  assert.deepEqual(Array.from(words), ['Ẹ']);
  assert.deepEqual(Array.from(criticalWordsFor(encounter.steps[1], chunks)), []);
});

const { summarize } = load('src/lib/encounter-engine.ts');

test('the summary counts what the learner actually did, not what the script hoped', () => {
  let state = start(encounter);
  state = reduce(state, { type: 'SKIP' }, encounter);
  const skippedAll = summarize(state, encounter);
  assert.equal(skippedAll.total, 1);
  assert.equal(skippedAll.spoken, 0);
  assert.equal(skippedAll.skipped, 1);
  assert.equal(skippedAll.firstTry, 0);

  let clean = start(encounter);
  clean = reduce(clean, ok(), encounter);
  const said = summarize(clean, encounter);
  assert.equal(said.spoken, 1);
  assert.equal(said.firstTry, 1);
  assert.equal(said.skipped, 0);
});

test('a respect-marker failure is counted for the summary', () => {
  let state = start(encounter);
  const bad = disrespectful();
  for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
    state = reduce(state, bad, encounter);
    state = reduce(state, { type: 'CONTINUE' }, encounter);
  }
  state = reduce(state, bad, encounter);
  assert.equal(summarize(state, encounter).missedCritical, 1);
});

test('an inconclusive verdict costs the learner nothing', () => {
  // No audio, a dropped socket, or no tool call is OUR failure, not theirs: it
  // must not burn an attempt, move rapport, or push them toward the skip.
  let state = atSayStep();
  const before = state.attempts;
  state = reduce(
    state,
    { type: 'ATTEMPT', verdict: { correct: false, missedRespect: false, note: 'I could not tell.', heard: '', inconclusive: true } },
    encounter
  );
  assert.equal(state.stage, 'correcting');
  assert.equal(state.attempts, before, 'an inconclusive attempt is not an attempt');
  assert.equal(state.rapport, 40);
  assert.equal(state.performances.length, 0);
});

test('repeated inconclusive verdicts never force the learner past the line', () => {
  let state = atSayStep();
  const unclear = {
    type: 'ATTEMPT',
    verdict: { correct: false, missedRespect: false, note: '', heard: '', inconclusive: true },
  };
  for (let i = 0; i < MAX_ATTEMPTS + 3; i++) {
    state = reduce(state, unclear, encounter);
    state = reduce(state, { type: 'CONTINUE' }, encounter);
  }
  assert.equal(state.stepIndex, 0);
  assert.notEqual(state.stage, 'reaction');
});

test("the model's coaching note is what the learner is shown", () => {
  let state = atSayStep();
  state = reduce(state, wrong('The second syllable rises.'), encounter);
  assert.equal(state.feedback, 'The second syllable rises.');
});
