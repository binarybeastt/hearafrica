const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, require: (name) => imports[name] ?? {},
    console, setTimeout, clearTimeout, Uint8Array, btoa, Promise, Error,
  });
  return module.exports;
}

/**
 * A judge wired to a fake Live session that answers each attempt, and each
 * re-check of it, with the next verdict from `verdicts`.
 */
function judgeAnswering(verdicts) {
  const sent = { attempts: 0, audio: [] };
  let callbacks;
  const session = {
    sendClientContent() {},
    sendToolResponse() {},
    close() {},
    sendRealtimeInput(message) {
      if (message.audio) sent.audio.push(message.audio.data);
      if (message.activityEnd) {
        sent.attempts++;
        const args = verdicts.shift();
        setTimeout(() => callbacks.onmessage({ toolCall: { functionCalls: [{ id: 'v', name: 'score_attempt', args }] } }));
      }
    },
  };
  const recorder = {
    init: async () => true,
    setCallbacks(chunk) { recorder.chunk = chunk; },
    // Like the real recorder: start hands back what it buffered before the
    // stream opened, and live chunks follow.
    start: async () => { setTimeout(() => recorder.chunk(new Uint8Array([1, 2]))); return new Uint8Array([9]); },
    stop: () => new Promise((resolve) => setTimeout(resolve, 5)),
    destroy() {},
  };
  const { PronunciationJudge } = load('src/lib/pronunciation-judge.ts', {
    '@google/genai': {
      GoogleGenAI: class { live = { connect: async (config) => { callbacks = config.callbacks; return session; } }; },
      Modality: { AUDIO: 'AUDIO' },
      Type: { OBJECT: 'OBJECT', BOOLEAN: 'BOOLEAN', STRING: 'STRING', ARRAY: 'ARRAY' },
    },
    './live-credentials': { liveToken: async () => 'auth_tokens/test' },
    './gemini-live': { RECOMMENDED_LIVE_MODEL: 'test-model' },
    './audio-worklet': { AudioRecorder: function () { return recorder; } },
  });
  const judge = new PronunciationJudge();
  const target = { native: 'Ẹ jọ̀ọ́ ma, báwo lẹ ṣe lé tòmátì yín?', en: 'Please ma…', languageName: 'Èdè Yorùbá', criticalWords: ['ma'] };
  const attempt = async () => {
    await judge.listen(target);
    return judge.judge(2000);
  };
  return { attempt, sent };
}

const pass = { correct: true, missed_respect_marker: false, note: 'Good.' };
const missed = { correct: false, missed_respect_marker: true, note: 'You left out ma.' };
const wrong = { correct: false, missed_respect_marker: false, note: 'Not quite.' };

test('a correct first listen is final', async () => {
  const { attempt, sent } = judgeAnswering([pass]);
  const verdict = await attempt();
  assert.equal(verdict.correct, true);
  assert.equal(sent.attempts, 1);
});

test('a failing listen is re-checked, and a pass on re-check wins', async () => {
  const { attempt, sent } = judgeAnswering([missed, pass]);
  const verdict = await attempt();
  assert.equal(verdict.correct, true);
  assert.equal(sent.attempts, 2);
});

test('the re-check hears the same audio as the attempt', async () => {
  const { attempt, sent } = judgeAnswering([missed, missed, missed]);
  await attempt();
  const perListen = sent.audio.length / 3;
  assert.ok(perListen >= 1);
  assert.deepEqual(sent.audio.slice(perListen, perListen * 2), sent.audio.slice(0, perListen));
});

test('missing respect is reported only when every check agrees', async () => {
  const all = await judgeAnswering([missed, missed, missed]).attempt();
  assert.equal(all.correct, false);
  assert.equal(all.missedRespect, true);

  const mixed = await judgeAnswering([missed, wrong, missed]).attempt();
  assert.equal(mixed.correct, false);
  assert.equal(mixed.missedRespect, false, 'one check heard the respect word: no accusation');
});

test('a real miss still fails after every re-check', async () => {
  const { attempt, sent } = judgeAnswering([wrong, wrong, wrong]);
  const verdict = await attempt();
  assert.equal(verdict.correct, false);
  assert.equal(sent.attempts, 3, 'one attempt and two re-checks, then stop');
});
