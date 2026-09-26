// Speaks a scripted lesson line with standalone TTS, for the languages in
// TTS_LANGUAGES. Ephemeral tokens only work with the Live API, so unlike Live
// this has to run here, with the key.
//
// It only speaks lines from the encounter scripts, hand-written or generated
// on this server: anything else is refused, so the route cannot be used as a
// free general-purpose TTS service.
// https://ai.google.dev/gemini-api/docs/speech-generation

import { ttsScript } from '@/lib/speech-script';
import { isGeneratedLine } from '@/lib/generated-store';
import { usesTts } from '@/lib/speech-engines';
import { isCrossSite, rateLimiter } from '@/lib/request-guard';
import { pcmFromWav } from '@/lib/wav';

export const dynamic = 'force-dynamic';

const TTS_MODEL = 'gemini-3.8-flash-tts';
const VOICE = 'Kore';

const SCRIPT = ttsScript();

// A fresh browser prefetches the whole lesson, twice over for the slow
// replays; a line is cached after that, so this is only ever hit in a burst.
const tooMany = rateLimiter(150, 10 * 60 * 1000);

function findAudio(interaction: any): string | null {
  let data: string | null = null;
  // The last audio block is the take, as the SDK's `output_audio` reads it.
  for (const step of interaction?.steps ?? []) {
    for (const block of step?.content ?? []) {
      if (block?.type === 'audio' && typeof block.data === 'string') data = block.data;
    }
  }
  return data;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Voice is unavailable: the server has no GEMINI_API_KEY.' }, { status: 503 });
  }
  if (isCrossSite(request)) {
    return Response.json({ error: 'Cross-site speech requests are refused.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text : '';
  const languageName = typeof body?.languageName === 'string' ? body.languageName : '';
  const scripted = SCRIPT.get(languageName)?.has(text) || (usesTts(languageName) && isGeneratedLine(languageName, text));
  if (!scripted) {
    return Response.json({ error: 'Only lesson lines can be spoken.' }, { status: 400 });
  }
  if (tooMany(request)) {
    return Response.json({ error: 'Too many lines requested. Wait a few minutes and try again.' }, { status: 429 });
  }

  const content: Record<string, unknown> = { type: 'text', text };
  if (body.slow === true) {
    content.annotations = [
      { type: 'speech_metadata', style: 'speaking slowly and deliberately, with a clear pause between each word' },
    ];
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: [{ type: 'user_input', content: [content] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: VOICE }] },
      }),
    });
    const interaction = await response.json().catch(() => null);
    if (!response.ok) throw new Error(interaction?.error?.message || `HTTP ${response.status}`);
    const audio = findAudio(interaction);
    if (!audio) throw new Error('No audio in the response.');

    const pcm = pcmFromWav(new Uint8Array(Buffer.from(audio, 'base64')));
    return new Response(Buffer.from(pcm), {
      headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('speech:', err?.message || err);
    return Response.json({ error: 'Could not synthesize that line.' }, { status: 502 });
  }
}
