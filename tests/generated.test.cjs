const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ROOT } = require('../scripts/ts-register.cjs');

const { buildGeneratedLesson } = require(path.join(ROOT, 'src/data/generated.ts'));
const { registerLesson } = require(path.join(ROOT, 'src/data/generated-registry.ts'));
const { getEncounter, spokenLines } = require(path.join(ROOT, 'src/data/encounters.ts'));
const { getLearningContent, composeLine } = require(path.join(ROOT, 'src/data/learning-content.ts'));
const { start, reduce, criticalWordsFor } = require(path.join(ROOT, 'src/lib/encounter-engine.ts'));

const meta = { id: 'gen_test', description: 'asking my landlord to fix the tap', language: 'yoruba', seed: 5 };
const L = (native, en = native) => ({ native, phonetic: '', en });

const DRAFT = {
  title: 'Asking the landlord about the tap',
  place: 'A compound in Yaba',
  who: 'Bàbá Adéoyè owns the building.',
  character: { name: 'Bàbá Adéoyè', role: 'Landlord', honorific: 'Bàbá', age: 'elder', gender: 'man', head: 'cap', cloth: '#2b3d52', accent: '#c5a059', stands: 'doorway' },
  layout: { template: 'street', dressing: ['lock-up-shops'], vehicles: ['keke'], density: 'quiet' },
  money: { involved: false },
  culture: { rule: 'Greet an elder with Ẹ before any complaint.', goal: 'get the tap fixed this week' },
  steps: [
    {
      kind: 'say',
      nudge: 'Greet him first.',
      line: L('Ẹ káàárọ̀ sà'),
      chunks: [{ native: 'Ẹ', gloss: 'you (respect)', role: 'respect' }, { native: 'káàárọ̀', gloss: 'good morning', role: 'greeting' }, { native: 'sà', gloss: 'sir', role: 'honorific' }],
      reactions: { firstTry: L('Káàárọ̀ ọmọ mi') },
    },
    { kind: 'choose', nudge: 'How direct?', options: [
      { label: 'Gently', line: L('Ẹ jọ̀ọ́ sà'), reaction: L('Ó dáa'), rapportDelta: 99 },
      { label: 'Bluntly', line: L('Ẹ tún un ṣe!'), reaction: L('Hmm'), rapportDelta: -3, price: 500 },
    ] },
    { kind: 'choose', nudge: 'Only one option is not a choice', options: [{ label: 'x', line: L('a'), reaction: L('b'), rapportDelta: 0 }] },
    { kind: 'say', nudge: 'No reply written', line: L('Ẹ ṣeun') },
    { kind: 'trader', nudge: 'He points at the tap.', line: L('Tẹ́ẹ̀pù yẹn ni?') },
  ],
};

test('a draft becomes a lesson in the hand-written shapes', () => {
  const lesson = buildGeneratedLesson(DRAFT, meta);
  assert.equal(lesson.draft, true);
  assert.deepEqual(lesson.encounter.steps.map((s) => s.kind), ['say', 'choose', 'trader']);
  assert.equal(lesson.spec.traderAgeGroup, 'elder');
  assert.deepEqual(lesson.spec.traderPronouns, { subject: 'he', object: 'him' });
  assert.equal(lesson.layout.character.stands, 'doorway');
  assert.equal(lesson.layout.priceTitle, null, 'no money, no price card');
  assert.equal(lesson.encounter.startingPrice, null);
  // Limits the model does not get to set.
  assert.equal(lesson.encounter.steps[1].options[0].rapportDelta, 15);
  assert.equal(lesson.encounter.steps[1].options[1].price, undefined, 'no prices when no money is involved');
});

test('the free-practice persona always carries the tool contract', () => {
  const { spec } = buildGeneratedLesson(DRAFT, meta);
  assert.match(spec.systemPrompt, /update_game_state\(rapport_delta, current_price, deal_concluded, cultural_note\)/);
  assert.match(spec.systemPrompt, /Èdè Yorùbá/);
  assert.match(spec.systemPrompt, /No money changes hands/);
  // The language's own spec still supplies what the model never writes.
  assert.equal(spec.languageCode, 'yo');
  assert.ok(spec.repairPhrases.length > 0);
});

test('money, when involved, sets the price card and the fair price', () => {
  const lesson = buildGeneratedLesson({ ...DRAFT, money: { involved: true, item: 'repair', askingPrice: 20000, fairPrice: 90000 } }, meta);
  assert.equal(lesson.layout.priceTitle, 'REPAIR');
  assert.equal(lesson.encounter.startingPrice, 20000);
  assert.equal(lesson.spec.targetFairPrice, 20000, 'a fair price above the asking price is clamped');
  assert.equal(lesson.encounter.steps[1].options[1].price, 500);
});

test('a draft with nothing to say is refused', () => {
  for (const junk of [null, {}, { steps: 'lots' }, { steps: [{ kind: 'say', line: L('x') }] }]) {
    assert.equal(buildGeneratedLesson(junk, meta), null);
  }
});

test('a registered lesson runs through the real lookups and engine', () => {
  const lesson = buildGeneratedLesson(DRAFT, meta);
  registerLesson(lesson);
  const encounter = getEncounter('gen_test');
  const content = getLearningContent('gen_test');
  assert.equal(encounter, lesson.encounter);
  const greet = encounter.steps[0];
  assert.equal(composeLine(content, greet.chunks), 'Ẹ káàárọ̀ sà');
  assert.deepEqual(criticalWordsFor(greet, content.chunks), ['Ẹ', 'sà']);
  let state = start(encounter);
  state = reduce(state, { type: 'ATTEMPT', verdict: { correct: true, missedRespect: false, note: '', heard: '' } }, encounter);
  assert.equal(state.stage, 'reaction');
  assert.equal(state.reaction.native, 'Káàárọ̀ ọmọ mi');
  assert.ok(spokenLines(encounter).includes('Ẹ jọ̀ọ́ sà'));
});
