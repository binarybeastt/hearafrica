// The 3D worlds the map hands off to, and what each one implies.
//
// Every one of these fields used to be a ternary on `market === 'kejetia'`,
// repeated in the page, the breadcrumb and the clock. A third world made that
// untenable: the point of failure was adding a world and forgetting one of
// them, so they are described once here instead.

import { GREET, GREET_SW, GREET_TWI } from './dialogue';

export type WorldId = 'balogun' | 'kejetia' | 'nairobi';

/**
 * The simulated clock runs on Lagos time everywhere. Kumasi shares it; Nairobi
 * is two hours ahead. The offset lives here rather than in the clock card
 * because it is not only a display concern — whether the traders are out is a
 * question about local time, and reading it off Lagos hours had the Nairobi
 * stage calling itself closed at 08:00, in the middle of the morning rush.
 */
export const CLOCK_CITIES = {
  lagos: { label: 'Lagos', offset: 0, greetings: GREET },
  kumasi: { label: 'Kumasi', offset: 0, greetings: GREET_TWI },
  nairobi: { label: 'Nairobi', offset: 2, greetings: GREET_SW },
} as const;

export type ClockCity = keyof typeof CLOCK_CITIES;

export interface World {
  id: WorldId;
  /** The NPC whose lesson this world opens, keyed into NPCS. */
  traderId: string;
  /** Key into ALL_SCENARIOS. */
  scenario: string;
  /** Which city the clock names, and whose greetings it suggests. */
  clock: ClockCity;
  /** Breadcrumb rungs: [label, navigation key]. */
  country: [string, string];
  city: [string, string];
  place: [string, string];
  /** Where the map flies to reach this world's country. */
  countryView: string;
  /**
   * What the trader stands at, for the HUD copy. Kevo has no stall — he has a
   * matatu — and "Walk to Kevo's stall" is the kind of line that quietly tells
   * a learner the world was written for somewhere else.
   */
  pitchNoun: string;
  /** Shown on arrival, telling the learner what to walk to. */
  arrivalToast: string;
}

export const WORLDS: Record<WorldId, World> = {
  balogun: {
    id: 'balogun',
    traderId: 'bisi',
    scenario: 'yoruba',
    clock: 'lagos',
    country: ['Nigeria', 'nigeria'],
    city: ['Lagos', 'lagos'],
    place: ['Balogun Market', 'market'],
    countryView: 'nigeria',
    pitchNoun: 'stall',
    arrivalToast: 'Walk up to Iya Bisi’s stall, or tap the pin above it.',
  },
  kejetia: {
    id: 'kejetia',
    traderId: 'akosua',
    scenario: 'akan',
    clock: 'kumasi',
    country: ['Ghana', 'ghana'],
    city: ['Kumasi', 'kumasi'],
    place: ['Kejetia Market', 'kejetia'],
    countryView: 'ghana',
    pitchNoun: 'stall',
    arrivalToast: 'Walk up to Auntie Akosua’s stall, or tap the pin above it.',
  },
  nairobi: {
    id: 'nairobi',
    traderId: 'kevo',
    scenario: 'swahili',
    clock: 'nairobi',
    country: ['Kenya', 'kenya'],
    city: ['Nairobi', 'nairobi-city'],
    place: ['Kencom Stage', 'nairobi'],
    countryView: 'kenya',
    pitchNoun: 'matatu',
    arrivalToast: 'Walk up to Kevo’s matatu, or tap the pin above it.',
  },
};

/** Which world a language's practice button should drop the learner into. */
export const WORLD_BY_LANGUAGE: Record<string, WorldId> = {
  yoruba: 'balogun',
  akan: 'kejetia',
  swahili: 'nairobi',
};
