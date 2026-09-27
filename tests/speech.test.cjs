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

const loadEncounters = () =>
  load('src/data/encounters.ts', {
    './dialogue': load('src/data/dialogue.ts'),
    './generated-registry': load('src/data/generated-registry.ts'),
  });
const { spokenLines, YORUBA_ENCOUNTER } = loadEncounters();

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
  const encounters = loadEncounters();
  const { ttsScript } = load('src/lib/speech-script.ts', {
    '@/data/encounters': encounters,
    '@/data/scenario-specs': load('src/data/scenario-specs.ts'),
    './speech-engines': load('src/lib/speech-engines.ts'),
  });
  const script = ttsScript();
  // The bug this guards: the map was keyed wrongly and came out empty, so
  // every Yorùbá line was refused and the lesson fell silent.
  const everyVariant = new Set(
    ['m', 'a', 'e'].flatMap((part) => encounters.spokenLines(encounters.getEncounter('balogun_tomatoes', part)))
  );
  assert.equal(script.get('Èdè Yorùbá')?.size, everyVariant.size);
  // The greeting follows the clock, so the evening one must be speakable too.
  assert.ok(script.get('Èdè Yorùbá').has('Ẹ káalẹ́ ma'));
  assert.ok(script.get('Èdè Yorùbá').has('Ẹ jọ̀ọ́ ma, báwo lẹ ṣe lé tòmátì yín?'));
  assert.equal(script.has('Kiswahili'), false);
});

test('the greeting follows the part of the day, as the clock names it', () => {
  const encounters = loadEncounters();
  const greetingOf = (part) => encounters.getEncounter('balogun_tomatoes', part).steps[0].line.native;
  assert.equal(greetingOf('m'), 'Ẹ káàárọ̀ ma');
  assert.equal(greetingOf('a'), 'Ẹ káàsán ma');
  assert.equal(greetingOf('e'), 'Ẹ káalẹ́ ma');
  // The same object each time, so a lesson in progress is never rebuilt.
  assert.equal(encounters.getEncounter('balogun_tomatoes', 'a'), encounters.getEncounter('balogun_tomatoes', 'a'));
});

// ---------------------------------------------------------------------------
// Routing a line to its engine
// ---------------------------------------------------------------------------

/** The real fingerprint, and no pre-generated files, unless a test says otherwise. */
const { fingerprint } = load('src/lib/baked-audio.ts');
const noneBaked = { fingerprint, bakedAudio: async () => null };

function cacheWith({ ttsBytes = 48000 * 3, baked = noneBaked } = {}) {
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
      './baked-audio': baked,
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

test('Auntie Akosua greets for the time of day, and the reply stays Yaa ɛna', () => {
  const encounters = load('src/data/encounters.ts', {
    './dialogue': load('src/data/dialogue.ts'),
    './generated-registry': load('src/data/generated-registry.ts'),
  });
  const at = (part) => encounters.getEncounter('kejetia_kente', part);
  assert.match(at('m').steps[0].line.native, /^Maakye, me ba!/);
  assert.match(at('a').steps[0].line.native, /^Maaha, me ba!/);
  assert.match(at('e').steps[0].line.native, /^Maadwo, me ba!/);
  assert.match(at('e').steps[0].line.en, /^Good evening/);
  // Her cool reply follows the clock too; the learner's answer does not.
  assert.equal(at('a').steps[1].reactions.missedCritical.native, 'Hmm. Maaha.');
  assert.equal(at('e').steps[1].line.native, 'Yaa ɛna, Auntie');
  assert.equal(at('a'), at('a'), 'the same object each time');
});

test('lines are voiced by whoever speaks them', () => {
  const { voiceFor } = load('src/lib/speech-engines.ts');
  const speaker = (subject, traderAgeGroup) => ({ traderPronouns: { subject }, traderAgeGroup });
  assert.equal(voiceFor(speaker('she', 'elder')), 'Kore'); // Iya Bisi, Auntie Akosua
  assert.equal(voiceFor(speaker('he', 'elder')), 'Charon'); // Alhaji Musa
  assert.equal(voiceFor(speaker('he', 'peer')), 'Puck'); // Kevo
});

test('when TTS is out, the Live voice reads the line and it is not stored', async () => {
  const baked = noneBaked;
  const calls = { fetch: 0, live: 0 };
  const cache = load(
    'src/lib/audio-cache.ts',
    {
      './speech-synthesizer': {
        getSynthesizer: () => ({ speak: async () => { calls.live++; return { bytes: new Uint8Array(48000 * 3), complete: true }; } }),
      },
      './speech-engines': load('src/lib/speech-engines.ts'),
      './audio-worklet': { AudioPlayer: function () { return {}; } },
      './baked-audio': baked,
    },
    {
      // The daily TTS quota is spent: every request is refused.
      fetch: async () => { calls.fetch++; return { ok: false, status: 502, json: async () => ({ error: 'quota' }) }; },
    }
  );
  const line = (key) => ({ key, text: LINE, languageName: 'Èdè Yorùbá' });
  const bytes = await cache.getLineAudio(line('yo_s3:target'));
  assert.equal(bytes.byteLength, 48000 * 3, 'the lesson still speaks');
  assert.equal(calls.live, 1);
  // Replays in the same session come from memory.
  await cache.getLineAudio(line('yo_s3:target'));
  assert.equal(calls.live, 1);
  // And TTS is not asked again for the next line while it is down.
  await cache.getLineAudio({ ...line('yo_s4:target'), text: 'Ẹ jọ̀ọ́ ma, ẹ tún un sọ.' });
  assert.equal(calls.fetch, 1);
  assert.equal(calls.live, 2);
});

test('a line with a pre-generated file plays the file, with no synthesis', async () => {
  const file = new Uint8Array(48000 * 2);
  const asked = [];
  const baked = { fingerprint, bakedAudio: async (languageName, text, slow) => { asked.push([languageName, text, slow]); return file; } };
  const { cache, calls } = cacheWith({ baked });
  const bytes = await cache.getLineAudio({ key: 'yo_s3:target', text: LINE, languageName: 'Èdè Yorùbá', slow: true });
  assert.equal(bytes, file);
  assert.deepEqual(asked, [['Èdè Yorùbá', LINE, true]]);
  assert.equal(calls.fetch.length, 0, 'no TTS request');
  assert.equal(calls.live, 0, 'no Live socket');
});

test('baked files are keyed by language, text and pace', () => {
  const { bakedKey } = load('src/lib/baked-audio.ts');
  assert.equal(bakedKey('Twi', 'Maakye'), `Twi|${fingerprint('Maakye')}`);
  assert.equal(bakedKey('Twi', 'Maakye', true), `Twi|${fingerprint('Maakye')}|slow`);
  assert.notEqual(bakedKey('Twi', 'Maakye'), bakedKey('Twi', 'Maaha'));
});
