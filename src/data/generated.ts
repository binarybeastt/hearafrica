// Turns a model's draft of a situation into a lesson the app can run: a scene
// layout, a ScenarioSpec and an Encounter in exactly the shapes the
// hand-written ones use.
//
// The model writes the content — who you meet, what is said, how they react.
// Everything structural comes from here: ids, limits, the free-practice
// instructions (which carry the tool contract the Live client relies on), and
// whatever the chosen language's own spec already defines, such as its
// currency and repair phrases.
//
// Nothing a model returns is trusted: every field is checked, clipped or
// defaulted, and a draft with nothing to say comes back null.

import type { Encounter, Line, Step } from './encounters';
import type { Chunk, ChunkRole, LearningContent } from './learning-content';
import { ALL_SCENARIOS, type ScenarioSpec } from './scenario-specs';
import { normalizeLayout, type SceneLayout } from './scene-layout';

/** Languages a situation can be generated in: those with a full lesson pipeline. */
export const GENERATABLE_LANGUAGES = ['yoruba', 'hausa', 'akan', 'swahili'] as const;
export type GeneratableLanguage = (typeof GENERATABLE_LANGUAGES)[number];

export interface GeneratedLesson {
  id: string;
  /** What the learner asked for, in their words. */
  description: string;
  language: GeneratableLanguage;
  layout: SceneLayout;
  spec: ScenarioSpec;
  encounter: Encounter;
  content: LearningContent;
  /** Always true: no fluent speaker has reviewed it. */
  draft: true;
}

const CHUNK_ROLES: ChunkRole[] = ['respect', 'greeting', 'honorific', 'question', 'price', 'politeness', 'closing', 'noun'];
const MAX_STEPS = 6;

const text = (value: unknown, max: number, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const whole = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : null;

function line(value: unknown): Line | null {
  const v = record(value);
  const native = text(v.native, 160);
  if (!native) return null;
  return { native, phonetic: text(v.phonetic, 200), en: text(v.en, 200, native) };
}

function moneyRule(money: { asking: number; fair: number; symbol: string } | null): string {
  if (!money) return 'MONEY: No money changes hands here; current_price stays unset.';
  const asking = `${money.symbol}${money.asking.toLocaleString('en')}`;
  if (money.fair >= money.asking) return `MONEY: The amount is ${asking}. It is not up for negotiation.`;
  return `MONEY: You start at ${asking}. You can come down to about ${money.symbol}${money.fair.toLocaleString('en')} if they negotiate politely.`;
}

/**
 * The free-practice persona. Built here rather than written by the model, so
 * the tool contract and the rules about staying in character are always intact.
 */
function systemPrompt(p: {
  name: string;
  role: string;
  place: string;
  who: string;
  rule: string;
  goal: string;
  elder: boolean;
  spec: ScenarioSpec;
  money: { asking: number; fair: number; symbol: string } | null;
}): string {
  const { spec } = p;
  return `You are ${p.name} (${p.role}). Where: ${p.place}. ${p.who}
You are speaking in real time with a language learner who has just walked up to you.

RULES:
1. LANGUAGE: Speak ${spec.languageName} (ISO code: ${spec.languageCode}) the way people in that place really speak it, with its everyday loanwords, not textbook forms. Keep each turn short. Only switch to English if the learner explicitly asks.
2. RESPECT: ${p.rule} ${p.elder ? 'You are older than the learner and expect to be addressed respectfully.' : 'You are about the learner’s age; stiff, over-formal speech amuses you.'}
3. THE SITUATION: What the learner came to do, in their words: "${p.goal}". Let them get there, but react honestly: warmer when they are polite and clear, cooler when they are rude.
4. NATURAL CORRECTION: Never say "wrong" or break character. If they use a wrong form, use the right one naturally in your reply.
5. ${moneyRule(p.money)}
6. TOOLS & SPOKEN RESPONSE:
   - On EVERY turn, you MUST invoke update_game_state(rapport_delta, current_price, deal_concluded, cultural_note) to reflect their etiquette${p.money ? ' and the price' : ''}.
   - You MUST ALWAYS ALSO speak your in-character reply out loud in ${spec.languageName}. Never remain silent after calling the tool.
   - When the learner has achieved what they came for, set deal_concluded = true.`;
}

/**
 * Builds a lesson from a model's draft, or returns null if the draft has no
 * line for the learner to say.
 */
export function buildGeneratedLesson(
  raw: unknown,
  meta: { id: string; description: string; language: GeneratableLanguage; seed: number }
): GeneratedLesson | null {
  const draft = record(raw);
  const base = ALL_SCENARIOS[meta.language];
  const c = record(draft.character);

  const layout = normalizeLayout({
    ...record(draft.layout),
    character: c,
    seed: meta.seed,
    priceTitle: null,
  });

  const money = record(draft.money);
  const asking = money.involved === true ? whole(money.askingPrice, 1, 10_000_000) : null;
  const fair = asking ? Math.min(asking, whole(money.fairPrice, 1, 10_000_000) ?? asking) : null;
  const moneyTerms = asking && fair ? { asking, fair, symbol: base.currency.symbol } : null;
  if (moneyTerms) layout.priceTitle = text(money.item, 14, 'PRICE').toUpperCase();

  const name = text(c.name, 40, 'your host');
  const role = text(c.role, 80, 'someone you need to talk to');
  const place = text(draft.place, 80, base.location);
  const title = text(draft.title, 80, 'A situation you described');
  const rule = text(record(draft.culture).rule, 300, base.culturalBrief.culturalRule);
  const goal = text(record(draft.culture).goal, 300, 'get what you came for, politely');
  const elder = layout.character.age === 'elder';
  const woman = layout.character.gender === 'woman';

  // --- Steps ------------------------------------------------------------------
  const chunks: Record<string, Chunk> = {};
  const steps: Step[] = [];
  const rawSteps = Array.isArray(draft.steps) ? draft.steps.slice(0, MAX_STEPS) : [];

  rawSteps.forEach((value, index) => {
    const s = record(value);
    const id = `g${index + 1}`;
    const nudge = text(s.nudge, 300, 'Say this.');

    if (s.kind === 'choose') {
      const options = (Array.isArray(s.options) ? s.options.slice(0, 4) : [])
        .map((o, i) => {
          const opt = record(o);
          const optionLine = line(opt.line);
          const reaction = line(opt.reaction);
          if (!optionLine || !reaction) return null;
          const price = moneyTerms ? whole(opt.price, 1, 10_000_000) : null;
          return {
            id: `${id}_o${i + 1}`,
            label: text(opt.label, 60, optionLine.en),
            line: optionLine,
            rapportDelta: whole(opt.rapportDelta, -10, 15) ?? 0,
            ...(price ? { price } : {}),
            reaction,
          };
        })
        .filter((o): o is NonNullable<typeof o> => o !== null);
      if (options.length >= 2) steps.push({ kind: 'choose', id, nudge, options });
      return;
    }

    const say = line(s.line);
    if (!say) return;
    if (s.kind === 'trader') {
      steps.push({ kind: 'trader', id, line: say, note: text(s.nudge, 300) || undefined });
      return;
    }

    const r = record(s.reactions);
    const firstTry = line(r.firstTry);
    if (!firstTry) return;
    const chunkIds: string[] = [];
    (Array.isArray(s.chunks) ? s.chunks.slice(0, 6) : []).forEach((ch, i) => {
      const chunk = record(ch);
      const native = text(chunk.native, 60);
      if (!native) return;
      const chunkId = `${id}_c${i + 1}`;
      const chunkRole = CHUNK_ROLES.includes(chunk.role as ChunkRole) ? (chunk.role as ChunkRole) : 'noun';
      chunks[chunkId] = { id: chunkId, native, phonetic: text(chunk.phonetic, 80), gloss: text(chunk.gloss, 80, native), role: chunkRole };
      chunkIds.push(chunkId);
    });
    steps.push({
      kind: 'say',
      id,
      nudge,
      line: say,
      chunks: chunkIds.length ? chunkIds : undefined,
      rapportDelta: whole(s.rapportDelta, 0, 25) ?? 10,
      reactions: {
        firstTry,
        retry: line(r.retry) ?? undefined,
        missedCritical: line(r.missedCritical) ?? undefined,
        skipped: line(r.skipped) ?? undefined,
      },
    });
  });

  if (!steps.some((s) => s.kind === 'say')) return null;

  const spec: ScenarioSpec = {
    ...base,
    id: meta.id,
    title,
    location: place,
    traderName: name,
    traderRole: role,
    traderHonorific: text(c.honorific, 20, name),
    traderAgeGroup: elder ? 'elder' : 'peer',
    traderPronouns: woman ? { subject: 'she', object: 'her' } : { subject: 'he', object: 'him' },
    commodity: text(money.item, 60, title),
    initialAskingPrice: moneyTerms?.asking ?? 0,
    targetFairPrice: moneyTerms?.fair ?? 0,
    startingRapport: 40,
    culturalBrief: {
      who: text(draft.who, 300, `${name}, ${role}.`),
      culturalRule: rule,
      goal: `You want to ${goal}.`,
      targetPriceText: moneyTerms
        ? `Target: ${base.currency.symbol}${moneyTerms.fair.toLocaleString('en')} or less`
        : 'No money involved',
    },
    allowedVocabulary: Object.values(chunks).map((ch) => ch.native),
    scaffoldingPrompts: [],
    systemPrompt: systemPrompt({
      name,
      role,
      place,
      who: text(draft.who, 300),
      rule,
      goal,
      elder,
      spec: base,
      money: moneyTerms,
    }),
    avatarColors: { bg: layout.character.accent, cloth: layout.character.cloth, wrap: layout.character.accent },
  };

  const encounter: Encounter = {
    id: `enc_${meta.id}`,
    scenarioId: meta.id,
    languageId: meta.language,
    title,
    goal: `You want to ${goal}.`,
    startingRapport: 40,
    startingPrice: moneyTerms?.asking ?? null,
    steps,
    outro: `You got through “${title}” in ${base.languageName}. This lesson is a draft: have a fluent speaker check it before you rely on it.`,
  };

  return {
    id: meta.id,
    description: meta.description,
    language: meta.language,
    layout,
    spec,
    encounter,
    content: { chunks },
    draft: true,
  };
}
