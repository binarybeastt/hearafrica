// Drafts a practice situation from a learner's description: a scene layout and
// a guided lesson, both checked before they are returned. The result is always
// a draft — no fluent speaker has reviewed it.

import { createHash } from 'node:crypto';
import { buildGeneratedLesson, GENERATABLE_LANGUAGES, type GeneratableLanguage } from '@/data/generated';
import { saveGenerated } from '@/lib/generated-store';
import { isCrossSite, rateLimiter } from '@/lib/request-guard';
import { draftScenario } from '@/lib/scenario-generator';

export const dynamic = 'force-dynamic';

// Each draft is one model call; a learner trying a few situations stays well under.
const tooMany = rateLimiter(10, 10 * 60 * 1000);

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Generation is unavailable: the server has no GEMINI_API_KEY.' }, { status: 503 });
  }
  if (isCrossSite(request)) {
    return Response.json({ error: 'Cross-site requests are refused.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const language: GeneratableLanguage = (GENERATABLE_LANGUAGES as readonly string[]).includes(body?.language)
    ? body.language
    : 'yoruba';
  const part = ['m', 'a', 'e'].includes(body?.part) ? (body.part as 'm' | 'a' | 'e') : 'm';
  if (description.length < 8 || description.length > 400) {
    return Response.json({ error: 'Describe the situation in a sentence or two.' }, { status: 400 });
  }
  if (tooMany(request)) {
    return Response.json({ error: 'Too many situations requested. Wait a few minutes and try again.' }, { status: 429 });
  }

  try {
    const raw = await draftScenario(apiKey, description, language, part);
    const seed = (Math.random() * 2 ** 31) | 0;
    const id = `gen_${createHash('sha256').update(`${language}:${description}:${seed}`).digest('hex').slice(0, 12)}`;
    const lesson = buildGeneratedLesson(raw, { id, description, language, seed });
    if (!lesson) {
      return Response.json({ error: 'The draft had nothing to practise. Try describing it differently.' }, { status: 502 });
    }
    saveGenerated(lesson);
    return Response.json(lesson, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('generate-scenario:', err?.message || err);
    return Response.json({ error: 'Could not draft that situation. Try again.' }, { status: 502 });
  }
}
