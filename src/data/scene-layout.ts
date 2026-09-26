// A scene described as choices, not geometry: which template, which props dress
// it, which vehicles pass, and who you are talking to. The composer turns one
// of these into a 3D world; a model can write one without knowing anything
// about coordinates.
//
// Kept free of three.js so the server can validate model output with it.

export const SCENE_TEMPLATES = ['street', 'market-lane', 'bus-stop', 'parlour', 'counter'] as const;
/** Rooms rather than open air: cutaway walls, furniture, no traffic. */
export const INDOOR_TEMPLATES: readonly SceneTemplate[] = ['parlour', 'counter'];
export type SceneTemplate = (typeof SCENE_TEMPLATES)[number];

export const DRESSING = [
  'umbrella-stalls',
  'lock-up-shops',
  'kiosks',
  'palms',
  'broad-trees',
  'jacarandas',
  'towers',
  'shelter',
  // Indoors.
  'sofas',
  'tv',
  'fan',
  'pictures',
  'centre-table',
  'waiting-chairs',
  'shelves',
  'partition',
  'water-dispenser',
] as const;
export type Dressing = (typeof DRESSING)[number];

export const VEHICLE_KINDS = ['danfo', 'keke', 'taxi', 'okada', 'trotro', 'ghanataxi', 'matatu'] as const;
export type SceneVehicle = (typeof VEHICLE_KINDS)[number];

export const HEAD_STYLES = ['bare', 'gele', 'cap', 'hijab', 'scarf'] as const;
export const STANDS = ['stall', 'kiosk', 'doorway', 'open', 'seated', 'counter'] as const;
/** Where a person can be in each kind of scene. */
const OUTDOOR_STANDS = ['stall', 'kiosk', 'doorway', 'open'] as const;
export const GOODS = ['tomatoes', 'peppers', 'plantain', 'grain', 'fabric'] as const;
export const AGES = ['young', 'adult', 'elder'] as const;
export const GENDERS = ['man', 'woman'] as const;
export const DENSITIES = ['quiet', 'busy'] as const;

/** The person the learner walks up to and talks with. */
export interface SceneCharacter {
  age: (typeof AGES)[number];
  gender: (typeof GENDERS)[number];
  head: (typeof HEAD_STYLES)[number];
  /** Main clothing colour, #rrggbb. */
  cloth: string;
  /** Wrapper, gele or trim colour, #rrggbb. */
  accent: string;
  /** What they stand at. */
  stands: (typeof STANDS)[number];
  /** What is on their counter, if they have one. */
  goods: (typeof GOODS)[number];
}

/** Things a room can be for, which decides what is on its shelves. */
export const COUNTER_KINDS = ['office', 'pharmacy', 'bank', 'clinic'] as const;

export interface SceneLayout {
  template: SceneTemplate;
  dressing: Dressing[];
  vehicles: SceneVehicle[];
  density: (typeof DENSITIES)[number];
  character: SceneCharacter;
  /** Heading on the price card, e.g. "TÒMÁTÌ"; null for no card. */
  priceTitle: string | null;
  /** Other people present indoors: a spouse on the sofa, someone waiting. */
  extras: number;
  /** For a counter: what kind of place it is. */
  counterKind: (typeof COUNTER_KINDS)[number];
  seed: number;
}

/** What each template looks like when the model asks for nothing in particular. */
export const TEMPLATE_DEFAULTS: Record<SceneTemplate, { dressing: Dressing[]; vehicles: SceneVehicle[] }> = {
  street: { dressing: ['lock-up-shops', 'palms'], vehicles: ['danfo', 'keke', 'okada', 'taxi'] },
  'market-lane': { dressing: ['umbrella-stalls', 'palms'], vehicles: ['danfo', 'okada', 'keke'] },
  'bus-stop': { dressing: ['shelter', 'lock-up-shops', 'broad-trees'], vehicles: ['danfo', 'danfo', 'okada'] },
  parlour: { dressing: ['sofas', 'tv', 'fan', 'pictures', 'centre-table'], vehicles: [] },
  counter: { dressing: ['waiting-chairs', 'shelves', 'fan', 'water-dispenser'], vehicles: [] },
};

const INDOOR_DRESSING = new Set<Dressing>(['sofas', 'tv', 'fan', 'pictures', 'centre-table', 'waiting-chairs', 'shelves', 'partition', 'water-dispenser']);

const CLOTH_FALLBACKS = ['#11663F', '#F6B82C', '#E0609F', '#2E5C9A', '#9A5A38', '#F28A2E'];

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;

const whole = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : null;

const hex = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

/**
 * Turns anything — model output included — into a layout the composer can
 * build. Unknown props and vehicles are dropped, not guessed at; a missing
 * template becomes a street. Never throws.
 */
export function normalizeLayout(raw: unknown): SceneLayout {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const template = oneOf(SCENE_TEMPLATES, input.template, 'street');
  const defaults = TEMPLATE_DEFAULTS[template];

  const listOf = <T extends string>(options: readonly T[], value: unknown, max: number) =>
    Array.isArray(value)
      ? value.filter((v): v is T => typeof v === 'string' && (options as readonly string[]).includes(v)).slice(0, max)
      : [];
  const indoor = INDOOR_TEMPLATES.includes(template);
  // Palms in a parlour and sofas on a street are dropped, not built.
  const dressing = [...new Set(listOf(DRESSING, input.dressing, 8))].filter((d) => INDOOR_DRESSING.has(d) === indoor);
  const vehicles = indoor ? [] : listOf(VEHICLE_KINDS, input.vehicles, 12);

  const seed =
    typeof input.seed === 'number' && Number.isFinite(input.seed) ? Math.abs(Math.floor(input.seed)) % 2 ** 31 : 1;
  const c = (input.character && typeof input.character === 'object' ? input.character : {}) as Record<string, unknown>;
  const gender = oneOf(GENDERS, c.gender, 'woman');

  const title = typeof input.priceTitle === 'string' ? input.priceTitle.trim().slice(0, 14) : '';

  return {
    template,
    dressing: dressing.length ? dressing : defaults.dressing,
    vehicles: vehicles.length || indoor ? vehicles : defaults.vehicles,
    density: oneOf(DENSITIES, input.density, 'busy'),
    character: {
      age: oneOf(AGES, c.age, 'adult'),
      gender,
      head: oneOf(HEAD_STYLES, c.head, gender === 'woman' ? 'gele' : 'cap'),
      cloth: hex(c.cloth, CLOTH_FALLBACKS[seed % CLOTH_FALLBACKS.length]),
      accent: hex(c.accent, CLOTH_FALLBACKS[(seed + 2) % CLOTH_FALLBACKS.length]),
      // Indoors a person is seated or at the counter; outdoors, never either.
      stands:
        template === 'parlour'
          ? 'seated'
          : template === 'counter'
          ? 'counter'
          : oneOf(OUTDOOR_STANDS, c.stands, 'stall'),
      goods: oneOf(GOODS, c.goods, 'tomatoes'),
    },
    priceTitle: title || null,
    extras: whole(input.extras, 0, 4) ?? (indoor ? 2 : 0),
    counterKind: oneOf(COUNTER_KINDS, input.counterKind, 'office'),
    seed,
  };
}
