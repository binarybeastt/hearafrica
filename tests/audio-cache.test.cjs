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
    Uint8Array,
    Map,
    indexedDB: undefined,
  });
  return module.exports;
}

const { plausible } = load('src/lib/audio-cache.ts', {
  './gemini-live': { synthesizeSpeech: async () => ({ bytes: new Uint8Array(), complete: false }) },
  './audio-worklet': { AudioPlayer: function () { return {}; } },
});

/** 24kHz mono PCM16. */
const takeOf = (seconds) => new Uint8Array(Math.round(seconds * 24000 * 2));

const LINE = 'Ẹ káàbọ̀ o! Kí ni ẹ fẹ́ rà lónìí?'; // 33 chars, ~3s spoken

test('a truncated take of a long line is rejected', () => {
  // The bug this guards: a 0.78s fragment of this line was accepted and cached,
  // so the learner heard a clipped blip forever with no way to tell why.
  assert.equal(plausible(takeOf(0.78), LINE), false);
  assert.equal(plausible(takeOf(1.0), LINE), false);
});

test('a full-length take of the same line is accepted', () => {
  // Real readings of a line this length run 3-5s. 2.5s is already fast.
  assert.equal(plausible(takeOf(3.0), LINE), true);
  assert.equal(plausible(takeOf(2.5), LINE), true);
});

test('the ~0.8s stub the model intermittently returns is rejected', () => {
  // Measured against the real provider: synthesis sometimes yields about 0.8s
  // of audio whatever the line. For these it is a fragment of the target
  // phrase, and the old 1/25 floor let the shorter ones through.
  assert.equal(plausible(takeOf(0.8), 'Naenda Westlands.'), false);
  assert.equal(plausible(takeOf(0.8), 'Sawa. Nauli mia moja.'), false);
  assert.equal(plausible(takeOf(0.8), 'Poa, poa. Unaenda wapi?'), false);
  // ...while genuine readings of the same lines clear it.
  assert.equal(plausible(takeOf(2.0), 'Naenda Westlands.'), true);
  assert.equal(plausible(takeOf(3.4), 'Sawa. Nauli mia moja.'), true);
  assert.equal(plausible(takeOf(1.8), 'Poa! Unaenda wapi?'), true);
});

test('short lines are held to a fixed floor rather than a vanishing one', () => {
  assert.equal(plausible(takeOf(0.2), 'ma'), false);
  assert.equal(plausible(takeOf(0.8), 'ma'), true);
});

test('an empty take is never plausible', () => {
  assert.equal(plausible(new Uint8Array(0), LINE), false);
  assert.equal(plausible(new Uint8Array(0), 'ma'), false);
});

test('the requirement scales with text length', () => {
  // 200 characters is 20-30s of real speech, so 9s is still a fragment of it.
  const long = 'a'.repeat(200);
  assert.equal(plausible(takeOf(4), long), false);
  assert.equal(plausible(takeOf(9), long), false);
  assert.equal(plausible(takeOf(14), long), true);
});
