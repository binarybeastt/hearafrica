// Voices every scripted lesson line once with TTS and saves it as an MP3 under
// public/audio, listed in public/audio/manifest.json. The app plays these files
// instead of synthesizing at runtime (see src/lib/baked-audio.ts).
//
// TTS allows 100 requests a day on the current tier, so a full bake takes more
// than one run. Each run skips what is already baked, goes in priority order
// (Yorùbá first), and stops cleanly when the day's quota is spent.
//
//   node scripts/bake-audio.cjs              bake what is missing
//   node scripts/bake-audio.cjs --dry-run    list what is missing, spend nothing
//   node scripts/bake-audio.cjs --only=Twi   one language (matches languageName)
//   node scripts/bake-audio.cjs --redo=KEY   re-voice one line after review
//
// Needs GEMINI_API_KEY (from .env.local) and ffmpeg.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT } = require('./ts-register.cjs');
require('@next/env').loadEnvConfig(ROOT);

const { allEncounters, spokenLines } = require(path.join(ROOT, 'src/data/encounters.ts'));
const { ALL_SCENARIOS } = require(path.join(ROOT, 'src/data/scenario-specs.ts'));
const { voiceFor } = require(path.join(ROOT, 'src/lib/speech-engines.ts'));
const { bakedKey, fingerprint } = require(path.join(ROOT, 'src/lib/baked-audio.ts'));
const { pcmFromWav } = require(path.join(ROOT, 'src/lib/wav.ts'));

const OUT = path.join(ROOT, 'public', 'audio');
const MANIFEST = path.join(OUT, 'manifest.json');
const TTS_MODEL = 'gemini-3.8-flash-tts';
/** Same wording as /api/speech uses for the slow replay. */
const SLOW_STYLE = 'speaking slowly and deliberately, with a clear pause between each word';
/** The tier allows 10 a minute. */
const MIN_GAP_MS = 6500;
/** Order of work: the demo language first. */
const PRIORITY = ['yoruba', 'hausa', 'akan', 'swahili'];

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const key = process.env.GEMINI_API_KEY;
if (!key && !args['dry-run']) {
  console.error('No GEMINI_API_KEY (put it in .env.local).');
  process.exit(1);
}

// --- What to bake ----------------------------------------------------------------

function jobs() {
  const list = [];
  for (const languageId of PRIORITY) {
    const spec = ALL_SCENARIOS[languageId];
    if (args.only && !spec.languageName.includes(args.only)) continue;
    const encounters = allEncounters().filter((e) => e.scenarioId === spec.id);
    const normal = new Set();
    const slow = new Set();
    for (const encounter of encounters) {
      for (const line of spokenLines(encounter)) normal.add(line);
      // Slow takes for the lines a learner practises, and for replies she
      // gives slowly on purpose; any other slow replay synthesizes at runtime.
      for (const step of encounter.steps) {
        if (step.kind === 'say') {
          slow.add(step.line.native);
          if (step.slowReply) for (const r of Object.values(step.reactions)) if (r) slow.add(r.native);
        }
        if (step.kind === 'choose') for (const option of step.options) slow.add(option.line.native);
      }
    }
    const voice = voiceFor(spec);
    const folder = spec.languageCode;
    for (const text of normal) list.push({ languageName: spec.languageName, folder, voice, text, slow: false });
    for (const text of slow) list.push({ languageName: spec.languageName, folder, voice, text, slow: true });
  }
  return list;
}

// --- Synthesis ----------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

class DailyQuotaSpent extends Error {}

async function synthesize(job) {
  const content = { type: 'text', text: job.text };
  if (job.slow) content.annotations = [{ type: 'speech_metadata', style: SLOW_STYLE }];
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const call = fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: [{ type: 'user_input', content: [content] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: job.voice }] },
      }),
      signal: AbortSignal.timeout(45000),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
    // A hard limit on the whole call, reply included: a stalled reply once hung
    // a run for twenty minutes.
    let result;
    try {
      result = await Promise.race([call, sleep(60000).then(() => ({ status: 0, body: {} }))]);
    } catch {
      result = { status: 0, body: {} };
    }
    if (result.status === 429) {
      const message = result.body?.error?.message || '';
      if (/per day/i.test(message)) throw new DailyQuotaSpent(message);
      await sleep(10000);
      continue;
    }
    if (result.status !== 200) {
      await sleep(3000);
      continue;
    }
    const audio = (result.body.steps || [])
      .flatMap((s) => s.content || [])
      .filter((c) => c.type === 'audio')
      .pop()?.data;
    if (audio) return Buffer.from(audio, 'base64');
  }
  return null;
}

/**
 * Seconds of audio in a 24kHz mono PCM16 WAV. Read from the data chunk: TTS
 * files carry a metadata chunk after it, and counting the whole file overstated
 * every take by about 0.13s.
 */
function secondsOf(wav) {
  return pcmFromWav(new Uint8Array(wav)).byteLength / 48000;
}
function plausible(wav, text) {
  return secondsOf(wav) >= Math.max(0.7, text.trim().length / 16);
}

function encodeMp3(wav, out) {
  const tmp = path.join(os.tmpdir(), `bake-${process.pid}.wav`);
  fs.writeFileSync(tmp, wav);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k', out]);
  fs.unlinkSync(tmp);
}

/** The encoded file's length, which is what learners actually hear. */
function mp3Seconds(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return +Number(out.toString().trim()).toFixed(2);
}

// --- Run --------------------------------------------------------------------------------

function loadManifest() {
  try {
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    return { files: m.files || {}, lines: m.lines || {} };
  } catch {
    return { files: {}, lines: {} };
  }
}

function saveManifest(manifest) {
  const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, JSON.stringify({ files: sorted(manifest.files), lines: sorted(manifest.lines) }, null, 1) + '\n');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = loadManifest();
  const all = jobs();
  const todo = all.filter((job) => {
    const k = bakedKey(job.languageName, job.text, job.slow);
    if (args.redo === k) return true;
    const file = manifest.files[k];
    return !file || !fs.existsSync(path.join(OUT, file));
  });

  console.log(`${all.length} lines in the scripts, ${all.length - todo.length} baked, ${todo.length} to do.`);
  if (args['dry-run']) {
    for (const job of todo) console.log(`  ${job.languageName}${job.slow ? ' (slow)' : ''}: ${job.text}`);
    return;
  }

  let done = 0;
  const rejected = [];
  try {
    for (const job of todo) {
      const k = bakedKey(job.languageName, job.text, job.slow);
      let wav = await synthesize(job);
      // The model sometimes stops early; one retry before giving up on a line.
      if (wav && !plausible(wav, job.text)) wav = (await synthesize(job)) || wav;
      if (!wav || !plausible(wav, job.text)) {
        rejected.push(`${job.languageName}${job.slow ? ' (slow)' : ''}: ${job.text}`);
        console.log(`  ✗ ${job.languageName}: ${job.text} — ${wav ? `too short (${secondsOf(wav).toFixed(2)}s)` : 'no audio'}`);
        continue;
      }
      const file = `${job.folder}/${fingerprint(job.text)}${job.slow ? '-slow' : ''}.mp3`;
      fs.mkdirSync(path.join(OUT, job.folder), { recursive: true });
      encodeMp3(wav, path.join(OUT, file));
      manifest.files[k] = file;
      manifest.lines[k] = { text: job.text, voice: job.voice, slow: job.slow, seconds: mp3Seconds(path.join(OUT, file)) };
      saveManifest(manifest); // after every line, so a stopped run loses nothing
      done++;
      console.log(`  ✓ ${job.languageName}${job.slow ? ' (slow)' : ''} ${secondsOf(wav).toFixed(1)}s: ${job.text}`);
    }
  } catch (err) {
    if (!(err instanceof DailyQuotaSpent)) throw err;
    console.log(`\nToday's TTS quota is spent: ${err.message}`);
  }
  const left = todo.length - done - rejected.length;
  console.log(`\nBaked ${done} this run. ${left} left${rejected.length ? `, ${rejected.length} rejected` : ''}.`);
  if (left > 0) console.log('Run it again when the quota resets; it picks up where it stopped.');
  if (rejected.length) console.log('Rejected (too short twice; runtime synthesis covers them):\n  ' + rejected.join('\n  '));
})();
