// The TTS API returns WAV; the cache and the players work in raw 24kHz mono
// PCM16, the format Live already produced. This unwraps one into the other.

export const PCM_SAMPLE_RATE = 24000;

function tag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

/** The PCM samples of a WAV file, or an error if it is not 24kHz mono PCM16. */
export function pcmFromWav(wav: Uint8Array): Uint8Array {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  if (wav.byteLength < 12 || tag(view, 0) !== 'RIFF' || tag(view, 8) !== 'WAVE') {
    throw new Error('Not a WAV file.');
  }

  let format: { pcm: boolean; channels: number; rate: number; bits: number } | null = null;
  let offset = 12;
  while (offset + 8 <= wav.byteLength) {
    const id = tag(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = {
        pcm: view.getUint16(body, true) === 1,
        channels: view.getUint16(body + 2, true),
        rate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      if (!format || !format.pcm || format.channels !== 1 || format.rate !== PCM_SAMPLE_RATE || format.bits !== 16) {
        throw new Error('Expected 24kHz mono 16-bit PCM audio.');
      }
      // A streamed WAV can declare an unknown (maximal) length; take what is there.
      return wav.slice(body, Math.min(body + size, wav.byteLength));
    }
    // Chunks are word-aligned.
    offset = body + size + (size % 2);
  }
  throw new Error('WAV file has no audio data.');
}
