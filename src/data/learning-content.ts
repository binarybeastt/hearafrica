// Learning content model for the Hear -> Build -> Do lesson arc.
//
// The unit of learning is the Chunk: a meaningful piece the learner can
// recombine, rather than a whole sentence to memorise. Chunks back the tiles
// under each line and mark which words are load-bearing — a missing respect
// marker fails an attempt however good the rest was. The scripted steps
// themselves live in src/data/encounters.ts.
//
// TRANSLATION STATUS: the glosses, tone hints and trader lines below are
// first-pass and NOT yet reviewed by native speakers. Chunk glosses make
// specific claims about individual morphemes, which is a stronger claim than a
// whole-sentence translation. Treat every string here as provisional until a
// fluent speaker signs it off.

export type ChunkRole =
  | 'respect'
  | 'greeting'
  | 'honorific'
  | 'question'
  | 'price'
  | 'politeness'
  | 'closing'
  | 'noun';

export interface Chunk {
  id: string;
  native: string;
  phonetic: string;
  gloss: string;
  role: ChunkRole;
  toneHint?: string;
}

export interface LearningContent {
  chunks: Record<string, Chunk>;
}

// ---------------------------------------------------------------------------
// YORÙBÁ — Iya Bisi, Balogun Market
// ---------------------------------------------------------------------------

const YORUBA_CHUNKS: Record<string, Chunk> = {
  yo_e: {
    id: 'yo_e',
    native: 'Ẹ',
    phonetic: 'eh',
    gloss: 'you (respectful — used for elders)',
    role: 'respect',
    toneHint: 'Mid tone, short. Dropping this is the single most common sign of disrespect.',
  },
  yo_kaaro: {
    id: 'yo_kaaro',
    native: 'káàárọ̀',
    phonetic: 'kah-ah-raw',
    gloss: 'good morning',
    role: 'greeting',
    toneHint: 'High–low–low. The final ọ̀ falls.',
  },
  yo_kaasan: {
    id: 'yo_kaasan',
    native: 'káàsán',
    phonetic: 'kah-ah-sahn',
    gloss: 'good afternoon',
    role: 'greeting',
  },
  yo_kuule: {
    id: 'yo_kuule',
    native: 'kúulẹ́',
    phonetic: 'koo-leh',
    gloss: 'good evening',
    role: 'greeting',
  },
  yo_ma: {
    id: 'yo_ma',
    native: 'ma',
    phonetic: 'mah',
    gloss: "ma'am (to an elder woman)",
    role: 'honorific',
    toneHint: 'Said to an older woman. Use "sà" for an older man.',
  },
  yo_sa: {
    id: 'yo_sa',
    native: 'sà',
    phonetic: 'sah',
    gloss: 'sir (to an elder man)',
    role: 'honorific',
  },
  yo_ejoo: {
    id: 'yo_ejoo',
    native: 'Ẹ jọ̀ọ́',
    phonetic: 'eh jaw-aw',
    gloss: 'please',
    role: 'politeness',
  },
  yo_eloni: {
    id: 'yo_eloni',
    native: 'èló ni',
    phonetic: 'eh-loh nee',
    gloss: 'how much is',
    role: 'question',
  },
  yo_agbon_tomati: {
    id: 'yo_agbon_tomati',
    native: 'agbọ̀n tòmátì',
    phonetic: 'ahg-bawn toh-mah-tee',
    gloss: 'basket of tomatoes',
    role: 'noun',
  },
  yo_yii: {
    id: 'yo_yii',
    native: 'yìí',
    phonetic: 'yee',
    gloss: 'this',
    role: 'noun',
  },
  yo_o_won_die: {
    id: 'yo_o_won_die',
    native: 'ó wọ́n díẹ̀',
    phonetic: 'oh wawn dee-eh',
    gloss: 'it is a little expensive',
    role: 'price',
    toneHint: 'Softening with díẹ̀ ("a little") is what keeps this polite rather than rude.',
  },
  yo_e_gba: {
    id: 'yo_e_gba',
    native: 'ẹ gbà',
    phonetic: 'eh gbah',
    gloss: 'please accept / take',
    role: 'price',
  },
  yo_egberun_kan_aabo: {
    id: 'yo_egberun_kan_aabo',
    native: 'ẹgbẹ̀rún kan ààbọ̀',
    phonetic: 'eh-gbeh-roon kahn ah-baw',
    gloss: 'one thousand five hundred (₦1,500)',
    role: 'price',
  },
  yo_o_dara: {
    id: 'yo_o_dara',
    native: 'Ó dára',
    phonetic: 'oh dah-rah',
    gloss: 'it is good / alright',
    role: 'closing',
  },
  yo_mo_gba_bee: {
    id: 'yo_mo_gba_bee',
    native: 'mo gba bẹ́ẹ̀',
    phonetic: 'moh gbah beh-eh',
    gloss: 'I accept that',
    role: 'closing',
  },
  yo_e_seun_pupo: {
    id: 'yo_e_seun_pupo',
    native: 'Ẹ ṣeun púpọ̀',
    phonetic: 'eh sheh-oon poo-paw',
    gloss: 'thank you very much',
    role: 'closing',
  },
  // Distractor-only chunks: real words, wrong register or wrong slot.
  yo_bawo: {
    id: 'yo_bawo',
    native: 'Báwo ni',
    phonetic: 'bah-woh nee',
    gloss: 'how are you (casual — for peers, not elders)',
    role: 'greeting',
    toneHint: 'Grammatical, but too familiar for an elder trader.',
  },
  yo_o_kaaro: {
    id: 'yo_o_kaaro',
    native: 'O káàárọ̀',
    phonetic: 'oh kah-ah-raw',
    gloss: 'good morning (casual "you" — for a peer or child)',
    role: 'greeting',
    toneHint: 'The O instead of Ẹ marks the listener as younger or equal.',
  },
};

export const YORUBA_CONTENT: LearningContent = {
  chunks: YORUBA_CHUNKS,
};

// ---------------------------------------------------------------------------
// HAUSA — Alhaji Musa, Kurmi Market, Kano
//
// The load-bearing lesson here is not the respect PRONOUN (as in Yoruba) but
// the greeting SEQUENCE: in Hausa commerce you ask after a person's night and
// their work before you ask after their prices. Going straight to "how much"
// is the error this scenario is built to catch.
// ---------------------------------------------------------------------------

const HAUSA_CHUNKS: Record<string, Chunk> = {
  ha_sannu_da_yawa: {
    id: 'ha_sannu_da_yawa',
    native: 'Sannu da yawa',
    phonetic: 'sahn-noo dah yah-wah',
    gloss: 'greetings to you (warm, respectful)',
    role: 'greeting',
  },
  ha_alhaji: {
    id: 'ha_alhaji',
    native: 'Alhaji',
    phonetic: 'ahl-hah-jee',
    gloss: 'Alhaji (a man who has made the pilgrimage)',
    role: 'honorific',
    toneHint: 'An earned title. Using it, rather than a generic address, is the courtesy.',
  },
  ha_malam: {
    id: 'ha_malam',
    native: 'Malam',
    phonetic: 'mah-lahm',
    gloss: 'Malam (respectful "mister" — but under-honours an Alhaji)',
    role: 'honorific',
    toneHint: 'Polite in general, yet it withholds a title he has earned.',
  },
  ha_ina_kwana: {
    id: 'ha_ina_kwana',
    native: 'Ina kwana',
    phonetic: 'ee-nah kwah-nah',
    gloss: 'good morning (literally: how did you sleep?)',
    role: 'greeting',
  },
  ha_ina_wuni: {
    id: 'ha_ina_wuni',
    native: 'Ina wuni',
    phonetic: 'ee-nah woo-nee',
    gloss: 'good afternoon (literally: how has your day been?)',
    role: 'greeting',
  },
  ha_ya_aiki: {
    id: 'ha_ya_aiki',
    native: 'ya aiki?',
    phonetic: 'yah eye-kee',
    gloss: 'how is your work?',
    role: 'question',
    toneHint: 'Asking after his trade before his prices is the whole courtesy.',
  },
  ha_don_allah: {
    id: 'ha_don_allah',
    native: 'Don Allah',
    phonetic: 'dohn ahl-lah',
    gloss: 'please (literally: for God\u2019s sake)',
    role: 'respect',
    toneHint: 'The courtesy that opens a real negotiation. Bargaining without it stays stiff.',
  },
  ha_nawa_ne: {
    id: 'ha_nawa_ne',
    native: 'nawa ne',
    phonetic: 'nah-wah neh',
    gloss: 'how much is',
    role: 'question',
  },
  ha_kudin: {
    id: 'ha_kudin',
    native: 'kuɗin',
    phonetic: 'koo-deen',
    gloss: 'the price of',
    role: 'price',
  },
  ha_jakar_fata: {
    id: 'ha_jakar_fata',
    native: 'jakar fata',
    phonetic: 'jah-kahr fah-tah',
    gloss: 'leather bag',
    role: 'noun',
  },
  ha_dabino: {
    id: 'ha_dabino',
    native: 'dabino',
    phonetic: 'dah-bee-noh',
    gloss: 'dates (the fruit)',
    role: 'noun',
  },
  ha_nan: {
    id: 'ha_nan',
    native: 'nan',
    phonetic: 'nahn',
    gloss: 'this / here',
    role: 'noun',
  },
  ha_sun_yi_tsada: {
    id: 'ha_sun_yi_tsada',
    native: 'sun yi tsada',
    phonetic: 'soon yee tsah-dah',
    gloss: 'they are expensive',
    role: 'price',
  },
  ha_sosai: {
    id: 'ha_sosai',
    native: 'sosai',
    phonetic: 'soh-sigh',
    gloss: 'very / quite',
    role: 'price',
  },
  ha_a_rage_min: {
    id: 'ha_a_rage_min',
    native: 'a rage min',
    phonetic: 'ah rah-geh meen',
    gloss: 'reduce it for me',
    role: 'price',
  },
  ha_to_shikenan: {
    id: 'ha_to_shikenan',
    native: 'To, shikenan',
    phonetic: 'toh shee-keh-nahn',
    gloss: 'alright, that settles it',
    role: 'closing',
  },
  ha_na_gode: {
    id: 'ha_na_gode',
    native: 'na gode',
    phonetic: 'nah goh-deh',
    gloss: 'thank you',
    role: 'closing',
  },
  ha_kwarai: {
    id: 'ha_kwarai',
    native: 'ƙwarai',
    phonetic: 'kwah-rye',
    gloss: 'very much / greatly',
    role: 'closing',
  },
  ha_na_yarda: {
    id: 'ha_na_yarda',
    native: 'na yarda',
    phonetic: 'nah yahr-dah',
    gloss: 'I agree / I accept',
    role: 'closing',
  },
  // Distractor-only: blunt or mistimed, the errors this scenario teaches against.
  ha_kai: {
    id: 'ha_kai',
    native: 'Kai!',
    phonetic: 'kigh',
    gloss: 'hey, you! (blunt — rude to an elder)',
    role: 'greeting',
    toneHint: 'Grammatical, and badly out of place with an elder merchant.',
  },
  ha_ba_dadi: {
    id: 'ha_ba_dadi',
    native: 'ba shi da daɗi',
    phonetic: 'bah shee dah dah-dee',
    gloss: 'it is not nice / not pleasant',
    role: 'price',
    toneHint: 'Insults the goods rather than negotiating the price.',
  },
};

export const HAUSA_CONTENT: LearningContent = {
  chunks: HAUSA_CHUNKS,
};

// ---------------------------------------------------------------------------
// AKAN (Twi) — Auntie Akosua, Kejetia Market, Kumasi
//
// The load-bearing lesson is the REPLY to a greeting. Akan marks it for who you
// are answering — "Yaa ɛna" to an older woman, "Yaa agya" to an older man,
// "Yaa nua" to a peer. All three are perfectly correct Twi; only one is correct
// *here*. That makes the distractors unusually sharp: the learner cannot pick
// by recognising a word, only by noticing who is in front of them.
// ---------------------------------------------------------------------------

const AKAN_CHUNKS: Record<string, Chunk> = {
  ak_yaa_ena: {
    id: 'ak_yaa_ena',
    native: 'Yaa ɛna',
    phonetic: 'yah eh-nah',
    gloss: 'reply to an older woman’s greeting (literally “yes, mother”)',
    role: 'respect',
    toneHint: 'The only correct answer to Auntie Akosua. The other two are good Twi to the wrong person.',
  },
  ak_yaa_agya: {
    id: 'ak_yaa_agya',
    native: 'Yaa agya',
    phonetic: 'yah ah-jah',
    gloss: 'reply to an older man’s greeting (“yes, father”)',
    role: 'respect',
    toneHint: 'Correct Twi — but she is not a man.',
  },
  ak_yaa_nua: {
    id: 'ak_yaa_nua',
    native: 'Yaa nua',
    phonetic: 'yah noo-ah',
    gloss: 'reply to a peer’s greeting (“yes, sibling”)',
    role: 'respect',
    toneHint: 'Correct Twi — but it makes an elder your equal.',
  },
  ak_auntie: {
    id: 'ak_auntie',
    native: 'Auntie',
    phonetic: 'ahn-tee',
    gloss: 'Auntie — the ordinary respectful address for an older woman',
    role: 'honorific',
  },
  ak_maakye: {
    id: 'ak_maakye',
    native: 'Maakye',
    phonetic: 'mah-cheh',
    gloss: 'good morning',
    role: 'greeting',
  },
  ak_maaha: {
    id: 'ak_maaha',
    native: 'Maaha',
    phonetic: 'mah-hah',
    gloss: 'good afternoon',
    role: 'greeting',
  },
  ak_maadwo: {
    id: 'ak_maadwo',
    native: 'Maadwo',
    phonetic: 'mah-jwoh',
    gloss: 'good evening',
    role: 'greeting',
  },
  ak_mepa_wo_kyew: {
    id: 'ak_mepa_wo_kyew',
    native: 'Mepa wo kyɛw',
    phonetic: 'meh-pah woh chow',
    gloss: 'please',
    role: 'politeness',
  },
  ak_eye_sen: {
    id: 'ak_eye_sen',
    native: 'ɛyɛ sɛn',
    phonetic: 'eh-yeh sen',
    gloss: 'how much is it',
    role: 'question',
  },
  ak_kente: {
    id: 'ak_kente',
    native: 'kente ntoma',
    phonetic: 'ken-teh n-toh-mah',
    gloss: 'kente cloth',
    role: 'noun',
  },
  ak_yi: {
    id: 'ak_yi',
    native: 'yi',
    phonetic: 'yee',
    gloss: 'this',
    role: 'noun',
  },
  ak_eye_den: {
    id: 'ak_eye_den',
    native: 'Ɛyɛ den',
    phonetic: 'eh-yeh den',
    gloss: 'it is expensive / that is steep',
    role: 'price',
  },
  ak_te_so_kakra: {
    id: 'ak_te_so_kakra',
    native: 'te so kakra',
    phonetic: 'teh soh kah-krah',
    gloss: 'bring it down a little',
    role: 'price',
  },
  ak_eye: {
    id: 'ak_eye',
    native: 'Ɛyɛ',
    phonetic: 'eh-yeh',
    gloss: 'it is good / alright',
    role: 'closing',
  },
  ak_medaase: {
    id: 'ak_medaase',
    native: 'Medaase',
    phonetic: 'meh-dah-seh',
    gloss: 'thank you',
    role: 'closing',
  },
  ak_paa: {
    id: 'ak_paa',
    native: 'paa',
    phonetic: 'pah',
    gloss: 'very much (intensifier)',
    role: 'closing',
  },
};

export const AKAN_CONTENT: LearningContent = {
  chunks: AKAN_CHUNKS,
};

// ---------------------------------------------------------------------------
// KISWAHILI — Kevo, a matatu conductor, Nairobi
//
// The other scenarios all teach deference to an elder. This one teaches the
// opposite half of the same rule: register runs both ways, and being too
// formal is also a mistake. "Shikamoo" is the first Swahili greeting most
// learners are taught and it is wrong here — Kevo is a young man, and it
// lands like calling him sir.
//
// Nothing in this encounter is a mandatory respect marker, which is why no
// chunk used by a step carries the 'respect' role: a makanga requires speed
// and clarity, not honorifics. The distractors below are glossary entries so
// the learner can see what they did not say.
// ---------------------------------------------------------------------------

const SWAHILI_CHUNKS: Record<string, Chunk> = {
  sw_sasa: {
    id: 'sw_sasa',
    native: 'Sasa',
    phonetic: 'sah-sah',
    gloss: 'how’s it? — greeting for someone your own age',
    role: 'greeting',
    toneHint: 'Literally “now”. Short and level. The expected answer is “Poa”.',
  },
  sw_niaje: {
    id: 'sw_niaje',
    native: 'Niaje',
    phonetic: 'nee-ah-jeh',
    gloss: 'what’s up? — Nairobi greeting between peers',
    role: 'greeting',
    toneHint: 'Interchangeable with “Sasa” here. Street Swahili rather than textbook.',
  },
  sw_shikamoo: {
    id: 'sw_shikamoo',
    native: 'Shikamoo',
    phonetic: 'shee-kah-moh',
    gloss: 'respectful greeting to an elder (answered “Marahaba”)',
    role: 'respect',
    toneHint: 'Correct Swahili — to an elder. To a young conductor it is over-formal, and it marks you as a stranger.',
  },
  sw_marahaba: {
    id: 'sw_marahaba',
    native: 'Marahaba',
    phonetic: 'mah-rah-hah-bah',
    gloss: 'the reply an elder gives to “Shikamoo”',
    role: 'respect',
    toneHint: 'Only an elder says this. You will hear it, not say it.',
  },
  sw_habari_yako: {
    id: 'sw_habari_yako',
    native: 'Habari yako?',
    phonetic: 'hah-bah-ree yah-koh?',
    gloss: 'how are you? — the ordinary follow-up to a greeting',
    role: 'greeting',
  },
  sw_poa: {
    id: 'sw_poa',
    native: 'Poa',
    phonetic: 'poh-ah',
    gloss: 'cool / fine — the answer to “Sasa”',
    role: 'greeting',
  },
  sw_kondakta: {
    id: 'sw_kondakta',
    native: 'kondakta',
    phonetic: 'kon-dahk-tah',
    gloss: 'conductor — the neutral way to address him',
    role: 'noun',
    toneHint: '“Makanga” is what he is called; “kondakta” is what you call him.',
  },
  sw_naenda: {
    id: 'sw_naenda',
    native: 'Naenda',
    phonetic: 'nah-en-dah',
    gloss: 'I am going (to)',
    role: 'noun',
    toneHint: 'The destination follows straight after, with no preposition.',
  },
  sw_unaenda_wapi: {
    id: 'sw_unaenda_wapi',
    native: 'Unaenda wapi?',
    phonetic: 'oo-nah-en-dah wah-pee?',
    gloss: 'where are you going?',
    role: 'question',
  },
  sw_nauli: {
    id: 'sw_nauli',
    native: 'nauli',
    phonetic: 'nah-oo-lee',
    gloss: 'the fare',
    role: 'price',
  },
  sw_hamsini: {
    id: 'sw_hamsini',
    native: 'hamsini',
    phonetic: 'hahm-see-nee',
    gloss: 'fifty',
    role: 'price',
  },
  sw_mia_moja: {
    id: 'sw_mia_moja',
    native: 'mia moja',
    phonetic: 'mee-ah moh-jah',
    gloss: 'one hundred',
    role: 'price',
  },
  sw_kawaida: {
    id: 'sw_kawaida',
    native: 'kawaida',
    phonetic: 'kah-wah-ee-dah',
    gloss: 'usually / normally',
    role: 'price',
    toneHint: 'The word that does the work: it says you know the route, without accusing him of anything.',
  },
  sw_nishushe: {
    id: 'sw_nishushe',
    native: 'Nishushe',
    phonetic: 'nee-shoo-sheh',
    gloss: 'let me down / drop me',
    role: 'noun',
    toneHint: 'ni- (me) + -shush- (lower) + -e. The single most useful word here.',
  },
  sw_hapa: {
    id: 'sw_hapa',
    native: 'hapa',
    phonetic: 'hah-pah',
    gloss: 'here',
    role: 'noun',
  },
  sw_tafadhali: {
    id: 'sw_tafadhali',
    native: 'tafadhali',
    phonetic: 'tah-fah-dah-lee',
    gloss: 'please',
    role: 'politeness',
    toneHint: 'Often dropped in fast matatu speech. Keeping it is warm, not required.',
  },
  sw_asante: {
    id: 'sw_asante',
    native: 'Asante',
    phonetic: 'ah-sahn-teh',
    gloss: 'thank you',
    role: 'closing',
  },
  sw_sawa: {
    id: 'sw_sawa',
    native: 'Sawa',
    phonetic: 'sah-wah',
    gloss: 'okay / fine — agreement, and the end of most exchanges',
    role: 'closing',
  },
};

export const SWAHILI_CONTENT: LearningContent = {
  chunks: SWAHILI_CHUNKS,
};

// ---------------------------------------------------------------------------
// Registry. Scenarios absent from this map have no Hear/Build content yet and
// fall straight through to the live conversation (DO) phase.
// ---------------------------------------------------------------------------

export const LEARNING_CONTENT: Record<string, LearningContent> = {
  balogun_tomatoes: YORUBA_CONTENT,
  kano_leather: HAUSA_CONTENT,
  kejetia_kente: AKAN_CONTENT,
  nairobi_matatu: SWAHILI_CONTENT,
};

export function getLearningContent(scenarioId: string): LearningContent | null {
  return LEARNING_CONTENT[scenarioId] ?? null;
}

/** Joins a beat's target chunks into the full target line. */
export function composeLine(content: LearningContent, chunkIds: string[]): string {
  return chunkIds
    .map((id) => content.chunks[id]?.native ?? '')
    .filter(Boolean)
    .join(' ');
}
