// Cached speech for the drill phases.
//
// Each authored line is synthesized once and then replayed from cache, which
// makes replays instant and free, keeps the pronunciation identical across
// repetitions (the whole point of a drill), and lets a lesson keep working if
// the network drops mid-session.
//
// Memory cache -> IndexedDB -> synthesize. IndexedDB failures are non-fatal
// everywhere: a private window with blocked storage degrades to memory only.

import { getSynthesizer, type SpokenTake } from './speech-synthesizer';
import { AudioPlayer } from './audio-worklet';
import { usesTts } from './speech-engines';

const DB_NAME = 'hearafrica_audio';
const DB_VERSION = 1;
const STORE = 'lines';

const memory = new Map<string, Uint8Array>();
const inflight = new Map<string, Promise<Uint8Array>>();

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readDb(key: string): Promise<Uint8Array | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => {
        const value = request.result;
        resolve(value instanceof ArrayBuffer ? new Uint8Array(value) : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeDb(key: string, bytes: Uint8Array): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const copy = bytes.slice().buffer;
    tx.objectStore(STORE).put(copy, key);
  } catch {
    // Storage unavailable; memory cache still serves this session.
  }
}

/** 24kHz mono PCM16: two bytes per sample. */
const BYTES_PER_SECOND = 24000 * 2;

/**
 * A floor on how long a take should be for the text it reads. Anything under it
 * is a fragment rather than a reading, and must not reach the cache — a clipped
 * take cached once is wrong forever.
 *
 * Calibrated against real takes rather than guessed: measured readings run
 * 0.10–0.16 seconds per character across Kiswahili, Yorùbá and Twi. The floor is
 * 1/16 (0.0625 s/char), roughly 40% below the fastest genuine reading observed,
 * so a real take clears it comfortably.
 *
 * The previous 1/25 was about three times too permissive. It let through the
 * failure this is really guarding: the model intermittently returns ~0.8s of
 * audio whatever the line, and for "Naenda Westlands." 0.8s cleared the old
 * floor, so the learner heard a stub of their target phrase and the cache kept
 * it. A rejected take costs one retry; an accepted fragment costs the lesson.
 */
export function plausible(bytes: Uint8Array, text: string): boolean {
  const seconds = bytes.byteLength / BYTES_PER_SECOND;
  return seconds >= Math.max(0.7, text.trim().length / 16);
}

export interface SpeakRequest {
  /** Stable id for this exact line + delivery, e.g. 'yo_beat_greet:trader'. */
  key: string;
  text: string;
  languageName: string;
  model?: string;
  slow?: boolean;
}

/** A short, stable fingerprint of a line's text (FNV-1a). */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * The text is part of the key, so rewording a line replaces its audio instead
 * of replaying the old reading from a slot id that did not change. TTS takes
 * are kept apart from Live ones, so moving a language to TTS replaces them too.
 */
function cacheKeyOf(request: SpeakRequest): string {
  const key = `${request.key}:${fingerprint(request.text)}${request.slow ? ':slow' : ''}`;
  return usesTts(request.languageName) ? `tts:${key}` : key;
}

/** One take of a scripted line from /api/speech, which only speaks lesson lines. */
async function ttsTake(request: SpeakRequest): Promise<SpokenTake> {
  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: request.text, languageName: request.languageName, slow: !!request.slow }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Could not get that line (HTTP ${response.status}).`);
  }
  // A unary TTS response is the whole take or an error, never a partial turn.
  return { bytes: new Uint8Array(await response.arrayBuffer()), complete: true };
}

/** Returns cached audio if present, otherwise synthesizes and caches it. */
export async function getLineAudio(request: SpeakRequest): Promise<Uint8Array> {
  const cacheKey = cacheKeyOf(request);

  const cached = memory.get(cacheKey);
  if (cached) return cached;

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    const stored = await readDb(cacheKey);
    if (stored && stored.byteLength > 0) {
      memory.set(cacheKey, stored);
      return stored;
    }
    const attempt = usesTts(request.languageName)
      ? () => ttsTake(request)
      : // One long-lived socket for every line, rather than a connect per phrase.
        () =>
          getSynthesizer(request.model).speak({
            text: request.text,
            languageName: request.languageName,
            slow: request.slow,
          });

    let take = await attempt();
    const good = (t: { bytes: Uint8Array; complete: boolean }) =>
      t.bytes.byteLength > 0 && t.complete && plausible(t.bytes, request.text);

    // Synthesis occasionally returns a clipped take. One retry costs a second
    // and is far better than caching a fragment, which would be wrong forever.
    if (!good(take)) {
      const retry = await attempt().catch(() => take);
      if (good(retry) || retry.bytes.byteLength > take.bytes.byteLength) take = retry;
    }

    if (good(take)) {
      memory.set(cacheKey, take.bytes);
      void writeDb(cacheKey, take.bytes);
    }
    return take.bytes;
  })();

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}

/**
 * A player dedicated to drill audio, kept separate from the live conversation's
 * player so that stopping one never cuts the other off.
 */
export class DrillPlayer {
  private player = new AudioPlayer();
  /** The line currently playing or being fetched, to collapse duplicate plays. */
  private currentKey: string | null = null;

  /**
   * Plays a line, and is safe to call twice for the same line: React double
   * invokes effects in development, and two overlapping calls used to have the
   * second one stop the audio the first had just started, leaving silence.
   */
  async play(request: SpeakRequest): Promise<void> {
    const cacheKey = cacheKeyOf(request);
    if (this.currentKey === cacheKey) return;
    this.currentKey = cacheKey;

    const bytes = await getLineAudio(request);
    // Bail only if a DIFFERENT line has taken over. A null means the player was
    // torn down and rebuilt (React does this on every mount in development),
    // which must not silently swallow the line we were asked to play.
    if (this.currentKey !== null && this.currentKey !== cacheKey) return;
    if (!bytes.byteLength) {
      this.currentKey = null;
      throw new Error('No audio was returned for this phrase. Tap Hear it to try again.');
    }
    await this.player.resume();
    if (this.currentKey !== null && this.currentKey !== cacheKey) return;
    this.player.stopPlayback();
    try {
      await this.player.playBuffer(bytes);
    } finally {
      if (this.currentKey === cacheKey) this.currentKey = null;
    }
  }

  /** Plays a line again even if it is the one that just played. */
  async replay(request: SpeakRequest): Promise<void> {
    this.currentKey = null;
    await this.play(request);
  }

  /** Warms the cache without playing, so the first tap is not a cold wait. */
  async prefetch(requests: SpeakRequest[]): Promise<void> {
    await Promise.allSettled(requests.map((r) => getLineAudio(r)));
  }

  stop() {
    this.currentKey = null;
    this.player.stopPlayback();
  }

  destroy() {
    this.currentKey = null;
    this.player.destroy();
  }

  get playing(): boolean {
    return this.player.playing;
  }
}
