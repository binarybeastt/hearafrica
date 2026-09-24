const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => imports[name],
    console, process, setTimeout, clearTimeout, Uint8Array, Int16Array, Float32Array, btoa, atob, ...globals });
  return module.exports;
}
function deferred() { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; }
function fixture() {
  const pending = [], events = [];
  const recorder = { init: async () => true, start: async () => new Uint8Array([1, 0]),
    stop: async () => recorder.chunk(new Uint8Array([2, 0])), destroy() {},
    setCallbacks(chunk) { recorder.chunk = chunk; } };
  const player = { resume: async () => {}, stopPlayback() {}, destroy() {}, playChunk() {} };
  const sdk = { GoogleGenAI: class { live = { connect: config => {
    const wait = deferred(); pending.push({ ...wait, config }); return wait.promise;
  } }; }, Modality: { AUDIO: 'AUDIO' }, Type: { OBJECT: 'OBJECT', INTEGER: 'INTEGER', BOOLEAN: 'BOOLEAN', STRING: 'STRING' } };
  const { GeminiLiveClient } = load('src/lib/gemini-live.ts', {
    '@google/genai': sdk,
    '@/data/scenario-specs': { BALOGUN_IYA_BISI_SPEC: { systemPrompt: 'test', languageName: 'Yoruba' } },
    './audio-worklet': { AudioRecorder: function() { return recorder; }, AudioPlayer: function() { return player; } },
    './live-credentials': { liveToken: async () => 'auth_tokens/test' },
  });
  const client = new GeminiLiveClient();
  client.setCallbacks({ onConnectionChange: (...args) => events.push(args) });
  const session = () => ({ closed: false, sent: [], close() { this.closed = true; },
    sendRealtimeInput(message) { this.sent.push(message); }, sendClientContent(message) { this.sent.push(message); } });
  return { client, recorder, pending, events, session };
}
// connect() awaits a credential before opening the socket.
const settle = () => new Promise(r => setTimeout(r));
async function connected(f) { const result = f.client.connect(); await settle(); const session = f.session(); f.pending[0].resolve(session); assert.equal(await result, true); return session; }

test('waits for setup and ignores closed superseded connections', async () => {
  const f = fixture(); const first = f.client.connect(); await settle();
  f.pending[0].config.callbacks.onopen(); assert.equal(f.client.isLive, false);
  const second = f.client.connect(); await settle(); const fresh = f.session(); f.pending[1].resolve(fresh);
  assert.equal(await second, true);
  const stale = f.session(); f.pending[0].resolve(stale); assert.equal(await first, false); assert.equal(stale.closed, true);
  f.pending[0].config.callbacks.onclose({ code: 1000 }); assert.equal(f.client.isLive, true);
  f.client.disconnect(); assert.equal(fresh.closed, true);
});
test('a connection superseded while fetching its credential never opens a socket', async () => {
  const f = fixture(); const first = f.client.connect(); f.client.disconnect();
  assert.equal(await first, false); assert.equal(f.pending.length, 0);
});
test('manual speech includes the final audio before activityEnd', async () => {
  const f = fixture(); const s = await connected(f);
  assert.equal(f.pending[0].config.config.realtimeInputConfig.automaticActivityDetection.disabled, true);
  await f.client.startSpeechTurn(); await f.client.endSpeechTurn();
  assert.deepEqual(s.sent.map(x => Object.keys(x)[0]), ['activityStart', 'audio', 'audio', 'activityEnd']);
});
test('release during microphone permission waits for startup, then ends the turn', async () => {
  const f = fixture(); const s = await connected(f); const gate = deferred(); f.recorder.init = () => gate.promise;
  const start = f.client.startSpeechTurn(); const end = f.client.endSpeechTurn(); gate.resolve(true);
  await Promise.all([start, end]); assert.equal(Object.keys(s.sent.at(-1))[0], 'activityEnd');
});
test('denied microphone fails visibly and sends no fake speech', async () => {
  const f = fixture(); const s = await connected(f); f.recorder.init = async () => false;
  await assert.rejects(f.client.startSpeechTurn(), /Microphone unavailable/); assert.equal(s.sent.length, 0);
});
test('disconnect while permission is pending cannot send to the old session', async () => {
  const f = fixture(); const s = await connected(f); const gate = deferred(); f.recorder.init = () => gate.promise;
  const start = f.client.startSpeechTurn(); f.client.disconnect(); gate.resolve(true); await start;
  assert.equal(s.sent.length, 0);
});
test('recorder closes a microphone granted after teardown', async () => {
  const gate = deferred(); let stopped = false;
  const { AudioRecorder } = load('src/lib/audio-worklet.ts', {}, { navigator: { mediaDevices: { getUserMedia: () => gate.promise } } });
  const recorder = new AudioRecorder(); const init = recorder.init(); recorder.destroy();
  gate.resolve({ getTracks: () => [{ stop() { stopped = true; } }] });
  assert.equal(await init, false); assert.equal(stopped, true);
});
