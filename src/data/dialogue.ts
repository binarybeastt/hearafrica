export interface GreetingInfo {
  resp: string;
  cas: string;
  en: string;
  corr: string;
  corrEn: string;
  part: string;
}

/** Yorùbá greetings, used while the map is over Nigeria. */
export const GREET: Record<'m' | 'a' | 'e', GreetingInfo> = {
  m: {
    resp: 'Ẹ káàárọ̀',
    cas: 'Káàárọ̀',
    en: 'Good morning',
    corr: 'Àárọ̀ ni o!',
    corrEn: "It's morning!",
    part: 'morning',
  },
  a: {
    resp: 'Ẹ káàsán',
    cas: 'Káàsán',
    en: 'Good afternoon',
    corr: 'Ó ti di ọ̀sán o!',
    corrEn: "It's already afternoon!",
    part: 'afternoon',
  },
  e: {
    resp: 'Ẹ káalẹ́',
    cas: 'Káalẹ́',
    en: 'Good evening',
    corr: 'Ó ti di ìrọ̀lẹ́ o!',
    corrEn: "It's already evening!",
    part: 'evening',
  },
};

export const words = (n: number): string => {
  n = Math.round(n / 100) * 100;
  const o = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ];
  const th = Math.floor(n / 1000),
    hu = Math.floor((n % 1000) / 100);
  let s = '';
  if (th) s += (th < 10 ? o[th] : th) + ' thousand';
  if (hu) s += (s ? ' ' : '') + o[hu] + ' hundred';
  return s;
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


/** Twi greetings, used while the map is over Ghana. */
export const GREET_TWI: Record<'m' | 'a' | 'e', GreetingInfo> = {
  m: {
    resp: 'Maakye',
    cas: 'Maakye',
    en: 'Good morning',
    corr: 'Anɔpa ne ɛ!',
    corrEn: "It's morning!",
    part: 'morning',
  },
  a: {
    resp: 'Maaha',
    cas: 'Maaha',
    en: 'Good afternoon',
    corr: 'Awia ne ɛ!',
    corrEn: "It's afternoon!",
    part: 'afternoon',
  },
  e: {
    resp: 'Maadwo',
    cas: 'Maadwo',
    en: 'Good evening',
    corr: 'Anwummerɛ ne ɛ!',
    corrEn: "It's evening!",
    part: 'evening',
  },
};

/**
 * Kiswahili greetings, used while the learner is in Nairobi. The `cas` forms
 * are the Nairobi peer register — the one the matatu encounter teaches — and
 * they are what you would actually use on a stage, not the textbook `resp`.
 */
export const GREET_SW: Record<'m' | 'a' | 'e', GreetingInfo> = {
  m: {
    resp: 'Habari za asubuhi',
    cas: 'Mambo',
    en: 'Good morning',
    corr: 'Ni asubuhi!',
    corrEn: "It's morning!",
    part: 'morning',
  },
  a: {
    resp: 'Habari za mchana',
    cas: 'Sasa',
    en: 'Good afternoon',
    corr: 'Ni mchana!',
    corrEn: "It's afternoon!",
    part: 'afternoon',
  },
  e: {
    resp: 'Habari za jioni',
    cas: 'Niaje',
    en: 'Good evening',
    corr: 'Ni jioni!',
    corrEn: "It's evening!",
    part: 'evening',
  },
};
