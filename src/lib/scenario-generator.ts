// Asks Gemini to draft a practice situation from a learner's description.
// The model returns choices and lines against a JSON schema; buildGeneratedLesson
// then checks every field before anything reaches the scene or the lesson.

import { GoogleGenAI } from '@google/genai';
import { ALL_SCENARIOS } from '@/data/scenario-specs';
import { COUNTER_KINDS, DRESSING, GOODS, HEAD_STYLES, SCENE_TEMPLATES, STANDS, VEHICLE_KINDS } from '@/data/scene-layout';
import type { GeneratableLanguage } from '@/data/generated';

export const GENERATOR_MODEL = 'gemini-3.8-flash';

const line = {
  type: 'object',
  properties: {
    native: {
      type: 'string',
      description: 'In the target language as a local would actually say it (not a textbook translation), with correct diacritics and tone marks.',
    },
    phonetic: { type: 'string', description: 'A rough English-reader pronunciation guide.' },
    en: { type: 'string', description: 'What it means in English.' },
  },
  required: ['native', 'phonetic', 'en'],
};

export const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A short English title for the situation.' },
    place: { type: 'string', description: 'Where it happens, e.g. "A compound gate in Surulere".' },
    who: { type: 'string', description: 'One English sentence about the person the learner talks to.' },
    character: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        role: { type: 'string' },
        honorific: { type: 'string', description: 'How the learner should address them.' },
        age: { type: 'string', enum: ['young', 'adult', 'elder'] },
        gender: { type: 'string', enum: ['man', 'woman'] },
        head: { type: 'string', enum: [...HEAD_STYLES] },
        cloth: { type: 'string', description: 'Main clothing colour as #rrggbb.' },
        accent: { type: 'string', description: 'Trim, wrapper or head-tie colour as #rrggbb.' },
        stands: { type: 'string', enum: [...STANDS], description: 'What they stand at when the learner arrives.' },
        goods: { type: 'string', enum: [...GOODS], description: 'Only matters if they stand at a stall.' },
      },
      required: ['name', 'role', 'honorific', 'age', 'gender', 'head', 'cloth', 'accent', 'stands'],
    },
    layout: {
      type: 'object',
      properties: {
        template: { type: 'string', enum: [...SCENE_TEMPLATES] },
        dressing: { type: 'array', items: { type: 'string', enum: [...DRESSING] } },
        vehicles: { type: 'array', items: { type: 'string', enum: [...VEHICLE_KINDS] } },
        density: { type: 'string', enum: ['quiet', 'busy'] },
        extras: { type: 'integer', description: 'Indoors: how many other people are present (0-4).' },
        counterKind: { type: 'string', enum: [...COUNTER_KINDS], description: 'For the "counter" template.' },
      },
      required: ['template', 'dressing', 'vehicles', 'density'],
    },
    money: {
      type: 'object',
      properties: {
        involved: { type: 'boolean' },
        item: { type: 'string', description: 'What is being paid for, one or two words.' },
        askingPrice: { type: 'integer' },
        fairPrice: { type: 'integer' },
      },
      required: ['involved'],
    },
    culture: {
      type: 'object',
      properties: {
        rule: { type: 'string', description: 'The etiquette point this situation turns on, in English.' },
        goal: {
          type: 'string',
          description: 'What the learner wants, as a verb phrase with no pronouns for either person: "get the tap fixed this week".',
        },
      },
      required: ['rule', 'goal'],
    },
    steps: {
      type: 'array',
      description: '4 to 6 steps. The first is the learner greeting them.',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['say', 'choose', 'trader'] },
          nudge: { type: 'string', description: 'The English coach: what to do next and why. For "trader", a scene note.' },
          line: { ...line, description: 'For "say": what the learner says. For "trader": what they say to the learner.' },
          chunks: {
            type: 'array',
            description: 'For "say": the line split into 2-5 meaningful pieces.',
            items: {
              type: 'object',
              properties: {
                native: { type: 'string' },
                phonetic: { type: 'string' },
                gloss: { type: 'string' },
                role: {
                  type: 'string',
                  enum: ['respect', 'greeting', 'honorific', 'question', 'price', 'politeness', 'closing', 'noun'],
                  description: 'Use "respect" or "honorific" only for words that are mandatory for politeness.',
                },
              },
              required: ['native', 'gloss', 'role'],
            },
          },
          reactions: {
            type: 'object',
            description: 'For "say": how they answer each kind of attempt.',
            properties: {
              firstTry: { ...line, description: 'Said well. Warm.' },
              retry: { ...line, description: 'Got there after a correction.' },
              missedCritical: { ...line, description: 'Understood, but a respect word was missing. Cooler.' },
              skipped: { ...line, description: 'The learner skipped. Neutral, never punishing.' },
            },
            required: ['firstTry'],
          },
          rapportDelta: { type: 'integer' },
          options: {
            type: 'array',
            description: 'For "choose": 2-4 real alternatives, each with what the learner says and how they react.',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'English, e.g. "Ask politely for Saturday".' },
                line,
                reaction: line,
                rapportDelta: { type: 'integer' },
                price: { type: 'integer' },
              },
              required: ['label', 'line', 'reaction', 'rapportDelta'],
            },
          },
        },
        required: ['kind', 'nudge'],
      },
    },
  },
  required: ['title', 'place', 'who', 'character', 'layout', 'money', 'culture', 'steps'],
};

function instructions(language: GeneratableLanguage): string {
  const spec = ALL_SCENARIOS[language];
  return `You design short spoken-language practice situations for learners of ${spec.languageName} (${spec.languageCode}).
The learner describes a situation they will face in real life. Write a guided exchange for it.

WHAT "CORRECT" MEANS
Correct means what a local in that place would actually say in that moment, not a correct translation of the English. A line can be grammatical and still wrong because nobody says it that way. Always choose the phrasing people really use:
- The everyday phrase over the literal translation, even when the literal one is grammatical.
- The English loanwords, English numbers and code-switching locals really use, over "pure" forms nobody uses in speech.
- The idiom for the situation (how people actually ask a price, greet a trader, get off a bus) over a word-for-word rendering of the learner's English.
If you are unsure how a local would say something, choose the simpler, more common phrasing.

CONTENT
- Use correct diacritics and tone marks.
- Each learner line is short (under 12 words) and useful beyond this one situation.
- The first step is the learner greeting them for the given time of day, in the register their age and role demand. Mark mandatory respect words and honorifics with the "respect" or "honorific" chunk role.
- 4 to 6 steps. Use one "choose" step where the learner has a real decision (how directly to ask, how hard to push), with consequences in the reactions.
- Reactions answer what the learner said, in character, and stay short.
- If money is involved, use realistic local prices in ${spec.currency.symbol.trim()}.

SCENE
- Pick the template that fits: "parlour" for a visit inside someone's home; "counter" for an office, bank, clinic or pharmacy (set counterKind); "street" for other outdoor errands; "market-lane" for markets; "bus-stop" for transport.
- Indoors, "extras" is who else is there: a spouse on the sofa, people waiting their turn. Vehicles are ignored.
- Choose dressing and vehicles that fit the place. "stands" is where the person is when the learner arrives: "stall" or "kiosk" for sellers, "doorway" for someone at their home or shop, "open" for anyone else (a conductor, a passer-by, someone waiting).

If the description is not a real-life situation someone could practise, still produce a polite everyday exchange in the same place.`;
}

const PART_OF_DAY = { m: 'morning', a: 'afternoon', e: 'evening' } as const;

export async function draftScenario(
  apiKey: string,
  description: string,
  language: GeneratableLanguage,
  /** The world clock's part of the day, so greetings match it. */
  part: keyof typeof PART_OF_DAY = 'm'
): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GENERATOR_MODEL,
    contents: `Situation: ${description}\nTime of day: ${PART_OF_DAY[part]}.`,
    config: {
      systemInstruction: instructions(language),
      responseMimeType: 'application/json',
      responseJsonSchema: DRAFT_SCHEMA,
      temperature: 0.8,
    },
  });
  return JSON.parse(response.text ?? '{}');
}
