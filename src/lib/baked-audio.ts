// Pre-generated lesson audio, served as files from /public/audio.
//
// TTS allows 100 requests a day on the current tier, and one fresh browser's
// lesson uses 25–45. So every scripted line is voiced once, ahead of time, by
// scripts/bake-audio.cjs, and the app plays the file. Runtime synthesis is left
// for lines that have no file yet (and for generated lessons).
//
// Baked files are also what a fluent speaker reviews: the same take every
// learner hears, rather than a new one per browser.

/** A short, stable fingerprint of a line's text (FNV-1a). Shared with the bake script. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** How a line is looked up in the manifest: language, text, and pace. */
export function bakedKey(languageName: string, text: string, slow = false): string {
  return `${languageName}|${fingerprint(text)}${slow ? '|slow' : ''}`;
}

export interface BakedManifest {
  /** bakedKey -> path under /audio, e.g. "yo/1x2y3z.mp3". */
  files: Record<string, string>;
}

let manifest: Promise<BakedManifest | null> | null = null;

/** The manifest, fetched once per page. A missing one just means nothing is baked. */
export function loadManifest(): Promise<BakedManifest | null> {
  manifest ??= fetch('/audio/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<BakedManifest>) : null))
    .catch(() => null);
  return manifest;
}

/**
 * Decodes an MP3 to the 24kHz mono PCM16 every player and cache in the app
 * uses. An OfflineAudioContext at 24kHz resamples as it decodes.
 */
export async function decodeToPcm16(bytes: ArrayBuffer): Promise<Uint8Array> {
  const context = new OfflineAudioContext(1, 1, 24000);
  const buffer = await context.decodeAudioData(bytes);
  const samples = buffer.getChannelData(0);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return new Uint8Array(pcm.buffer);
}

/** The baked take of a line as PCM16, or null if it has none. */
export async function bakedAudio(languageName: string, text: string, slow = false): Promise<Uint8Array | null> {
  const files = (await loadManifest())?.files;
  const file = files?.[bakedKey(languageName, text, slow)];
  if (!file) return null;
  try {
    const response = await fetch(`/audio/${file}`);
    if (!response.ok) return null;
    return await decodeToPcm16(await response.arrayBuffer());
  } catch {
    return null;
  }
}
