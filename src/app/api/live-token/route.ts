// Issues single-use Gemini Live tokens so the real key never reaches the browser.
// https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens

import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

/**
 * A lesson opens a voice socket, a judge socket per language and the free
 * practice socket, and reopens each after the 15-minute cap, so a learner
 * needs a handful of tokens an hour. This leaves room for that and little else.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TOKENS_PER_WINDOW = 30;

// Per server instance, so it is a speed bump rather than a quota: several
// instances each keep their own count, and a restart forgets it.
const issued = new Map<string, number[]>();

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (issued.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_TOKENS_PER_WINDOW) {
    issued.set(ip, recent);
    return true;
  }
  recent.push(now);
  issued.set(ip, recent);
  return false;
}

/** Browsers mark cross-site requests; refusing them stops other sites spending the quota. */
function crossSite(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return true;
  const origin = request.headers.get('origin');
  return !!origin && new URL(origin).host !== request.headers.get('host');
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'This server has no Gemini key. Paste your own key in connection settings.' },
      { status: 503 }
    );
  }
  if (crossSite(request)) {
    return Response.json({ error: 'Cross-site token requests are refused.' }, { status: 403 });
  }
  if (rateLimited(clientIp(request))) {
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
