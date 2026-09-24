const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}, globals = {}) {
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
    DataView,
    Map,
    Set,
    JSON,
    Error,
    Promise,
    String,
    Math,
    indexedDB: undefined,
    ...globals,
  });
  return module.exports;
}

// ---------------------------------------------------------------------------
// WAV -> PCM
// ---------------------------------------------------------------------------

const { pcmFromWav } = load('src/lib/wav.ts');

function wav({ rate = 24000, channels = 1, bits = 16, extra = null, samples = [1, 2, 3, 4] } = {}) {
  const data = Buffer.from(samples);
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(channels, 2);
  fmt.writeUInt32LE(rate, 4);
  fmt.writeUInt32LE(rate * channels * (bits / 8), 8);
  fmt.writeUInt16LE(channels * (bits / 8), 12);
  fmt.writeUInt16LE(bits, 14);
  const chunk = (id, body) => {
    const head = Buffer.alloc(8);
    head.write(id, 0, 'ascii');
    head.writeUInt32LE(body.length, 4);
    return Buffer.concat([head, body, body.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  };
  const chunks = [chunk('fmt ', fmt), ...(extra ? [chunk('LIST', extra)] : []), chunk('data', data)];
  const body = Buffer.concat([Buffer.from('WAVE'), ...chunks]);
  const head = Buffer.alloc(8);
  head.write('RIFF', 0, 'ascii');
  head.writeUInt32LE(body.length, 4);
  return new Uint8Array(Buffer.concat([head, body]));
}

test('unwraps the PCM samples from a 24kHz mono WAV', () => {
  assert.deepEqual([...pcmFromWav(wav())], [1, 2, 3, 4]);
});

test('skips chunks before the audio, including odd-sized ones', () => {
  assert.deepEqual([...pcmFromWav(wav({ extra: Buffer.from('abc') }))], [1, 2, 3, 4]);
});

test('refuses audio the players cannot play as-is', () => {
  // Played at the wrong rate it would come out at the wrong pitch and speed.
  assert.throws(() => pcmFromWav(wav({ rate: 16000 })), /24kHz mono/);
  assert.throws(() => pcmFromWav(wav({ channels: 2 })), /24kHz mono/);
  assert.throws(() => pcmFromWav(new Uint8Array([1, 2, 3])), /Not a WAV/);
});

// ---------------------------------------------------------------------------
// What the speech route will agree to say
// ---------------------------------------------------------------------------

const { spokenLines, YORUBA_ENCOUNTER } = load('src/data/encounters.ts');

test('the allowed script covers every line the lesson plays', () => {
  const lines = new Set(spokenLines(YORUBA_ENCOUNTER));
  // Mirrors what GuidedEncounter prefetches and plays; a line missing here
  // would be refused by /api/speech and play as silence.
  for (const s of YORUBA_ENCOUNTER.steps) {
    if (s.kind === 'trader' || s.kind === 'say') assert.ok(lines.has(s.line.native), s.id);
    if (s.kind === 'say') for (const r of Object.values(s.reactions)) if (r) assert.ok(lines.has(r.native), s.id);
    if (s.kind === 'choose') {
      for (const o of s.options) {
        assert.ok(lines.has(o.line.native), o.id);
        assert.ok(lines.has(o.reaction.native), o.id);
      }
    }
  }
});

test('the route accepts Yorùbá lesson lines and nothing for Live languages', () => {
  const encounters = load('src/data/encounters.ts');
  const { ttsScript } = load('src/lib/speech-script.ts', {
    '@/data/encounters': encounters,
    '@/data/scenario-specs': load('src/data/scenario-specs.ts'),
    './speech-engines': load('src/lib/speech-engines.ts'),
  });
  const script = ttsScript();
  // The bug this guards: the map was keyed wrongly and came out empty, so
  // every Yorùbá line was refused and the lesson fell silent.
  assert.equal(script.get('Èdè Yorùbá')?.size, new Set(encounters.spokenLines(YORUBA_ENCOUNTER)).size);
  assert.ok(script.get('Èdè Yorùbá').has('Ẹ jọ̀ọ́ ma, báwo lẹ ṣe lé tòmátì yín?'));
  assert.equal(script.has('Kiswahili'), false);
});

// ---------------------------------------------------------------------------
// Routing a line to its engine
// ---------------------------------------------------------------------------

function cacheWith({ ttsBytes = 48000 * 3 } = {}) {
  const calls = { fetch: [], live: 0 };
  const cache = load(
    'src/lib/audio-cache.ts',
    {
      './speech-synthesizer': {
        getSynthesizer: () => ({
          speak: async () => {
            calls.live++;
            return { bytes: new Uint8Array(48000 * 3), complete: true };
          },
        }),
      },
      './speech-engines': load('src/lib/speech-engines.ts'),
      './audio-worklet': { AudioPlayer: function () { return {}; } },
    },
    {
      fetch: async (url, init) => {
        calls.fetch.push({ url, body: JSON.parse(init.body) });
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(ttsBytes) };
      },
    }
  );
  return { cache, calls };
}

const LINE = 'Ẹ jọ̀ọ́ ma, báwo lẹ ṣe lé tòmátì yín?';

test('a Yorùbá line is spoken by TTS and never opens a Live socket', async () => {
  const { cache, calls } = cacheWith();
  const bytes = await cache.getLineAudio({ key: 'yo_ask:target', text: LINE, languageName: 'Èdè Yorùbá', slow: true });
  assert.equal(bytes.byteLength, 48000 * 3);
  assert.equal(calls.live, 0);
  assert.equal(calls.fetch.length, 1);
  assert.equal(calls.fetch[0].url, '/api/speech');
  assert.deepEqual(calls.fetch[0].body, { text: LINE, languageName: 'Èdè Yorùbá', slow: true });
});

test('rewording a line replaces its cached audio', async () => {
  const { cache, calls } = cacheWith();
  const request = { key: 'yo_s3:target', languageName: 'Èdè Yorùbá' };
  await cache.getLineAudio({ ...request, text: LINE });
  await cache.getLineAudio({ ...request, text: LINE });
  assert.equal(calls.fetch.length, 1);
  // Same slot, new wording: the old reading must not be replayed.
  await cache.getLineAudio({ ...request, text: 'Ẹ jọ̀ọ́ ma, báwo lẹ ṣe ń ta tòmátì yín?' });
  assert.equal(calls.fetch.length, 2);
});

test('other languages stay on the Live reader', async () => {
  const { cache, calls } = cacheWith();
  await cache.getLineAudio({ key: 'sw_dest:target', text: 'Naenda Westlands.', languageName: 'Kiswahili' });
  assert.equal(calls.live, 1);
  assert.equal(calls.fetch.length, 0);
});

test('a TTS take that is too short is retried and not cached', async () => {
  const { cache, calls } = cacheWith({ ttsBytes: 48000 * 0.5 });
  await cache.getLineAudio({ key: 'yo_ask:target', text: LINE, languageName: 'Èdè Yorùbá' });
  await cache.getLineAudio({ key: 'yo_ask:target', text: LINE, languageName: 'Èdè Yorùbá' });
  // Two requests, each with one retry: the stub was never served from cache.
  assert.equal(calls.fetch.length, 4);
});
