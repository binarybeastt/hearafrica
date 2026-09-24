// Issues single-use Gemini Live tokens so the real key never reaches the browser.
// https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens

import { GoogleGenAI } from '@google/genai';
import { isCrossSite, rateLimiter } from '@/lib/request-guard';

export const dynamic = 'force-dynamic';

/**
 * A lesson opens a voice socket, a judge socket per language and the free
 * practice socket, and reopens each after the 15-minute cap, so a learner
 * needs a handful of tokens an hour. This leaves room for that and little else.
 */
const tooMany = rateLimiter(30, 10 * 60 * 1000);

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Voice is unavailable: the server has no GEMINI_API_KEY.' },
      { status: 503 }
    );
  }
  if (isCrossSite(request)) {
    return Response.json({ error: 'Cross-site token requests are refused.' }, { status: 403 });
  }
  if (tooMany(request)) {
    return Response.json({ error: 'Too many voice connections. Wait a few minutes and try again.' }, { status: 429 });
  }

  try {
    const now = Date.now();
    const token = await new GoogleGenAI({ apiKey }).authTokens.create({
      config: {
        // One token opens one socket; every reconnect asks for a fresh one.
        uses: 1,
        // Audio-only sessions cap at 15 minutes, so this never cuts one short.
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
      },
    });
    if (!token.name) throw new Error('Gemini returned no token.');
    return Response.json({ token: token.name }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('live-token:', err?.message || err);
    return Response.json({ error: 'Could not get a voice token from Gemini.' }, { status: 502 });
  }
}
