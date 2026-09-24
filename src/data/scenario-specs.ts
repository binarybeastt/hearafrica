// Situational Conversation Learning Scenario Specifications
// Supports Yoruba, Hausa, and Igbo with authentic cultural rules & Gemini Live personas

export interface ScaffoldingPrompt {
  id: string;
  intent: string; // What the learner wants to achieve
  fullYo: string; // Native target language text with phonetic tones
  phonetic: string; // Pronunciation helper
  en: string; // English meaning
  clueWord: string; // Level 2: First word or stem
  targetStep: 'greet' | 'ask' | 'counter' | 'deal';
  expectedRapportDelta: number;
}

export interface RepairPhrase {
  id: string;
  yo: string; // Native target language phrase
  en: string; // English translation
  phonetic: string; // Pronunciation
  intent: 'repeat' | 'slow' | 'english';
  rapportPenalty: number;
}

export interface ScenarioSpec {
  id: string;
  languageId: 'yoruba' | 'hausa' | 'igbo' | 'akan' | 'swahili';
  languageName: string; // e.g., 'Èdè Yorùbá', 'Harshen Hausa', 'Asụsụ Igbo'
  languageCode: string; // 'yo', 'ha', 'ig', 'ak', 'sw'
  title: string;
  location: string;
  traderName: string;
  traderRole: string;
  traderHonorific: string; // e.g., "Ìyá", "Alhaji", "Mama"
  traderAgeGroup: 'elder' | 'peer';
  /** Pronouns for UI copy about this trader ("What did she say?"). */
  traderPronouns: { subject: string; object: string };
  commodity: string;
  /**
   * How this scenario writes money. `symbol` carries its own spacing ("KSh "
   * but "₦"), and `step` is the increment prices are actually quoted in: Lagos
   * market prices move in hundreds, matatu fares in tens, so rounding a fare
   * to the nearest hundred would erase the whole negotiation.
   */
  currency: { symbol: string; step: number };
  initialAskingPrice: number;
  targetFairPrice: number;
  startingRapport: number;
  culturalBrief: {
    who: string;
    culturalRule: string;
    goal: string;
    targetPriceText: string;
  };
  allowedVocabulary: string[];
  repairPhrases: RepairPhrase[];
  scaffoldingPrompts: ScaffoldingPrompt[];
  systemPrompt: string;
  avatarColors: {
    bg: string;
    cloth: string;
    wrap?: string | null;
  };
}

// ---------------------------------------------------------------------------
// 1. YORÙBÁ SCENARIO: Iya Bisi (Balogun Market, Lagos)
// ---------------------------------------------------------------------------
export const BALOGUN_IYA_BISI_SPEC: ScenarioSpec = {
  id: 'balogun_tomatoes',
  languageId: 'yoruba',
  languageName: 'Èdè Yorùbá',
  languageCode: 'yo',
  title: 'Bargaining for Fresh Tomatoes at Balogun Market',
  location: 'Balogun Market, Lagos Island',
  traderName: 'Iya Bisi',
  traderRole: 'Elder Tomato Trader',
  traderHonorific: 'Ìyá',
  traderAgeGroup: 'elder',
  traderPronouns: { subject: 'she', object: 'her' },
  commodity: 'Basket of ripe tomatoes (Tòmátì)',
  currency: { symbol: '₦', step: 100 },
  initialAskingPrice: 2500,
  targetFairPrice: 1800,
  startingRapport: 40,
  avatarColors: {
    bg: '#F2A1CB',
    cloth: '#F6B82C',
    wrap: '#E0609F',
  },
  culturalBrief: {
    who: 'Iya Bisi is an established, respected Yoruba trader selling fresh tomatoes in Balogun Market.',
    culturalRule:
      'She is an elder woman (Ìyá / Ẹ̀gbọ́n). Respect markers ("Ẹ", "Ẹ káàárọ̀ ma") are non-negotiable before mentioning prices. In Lagos markets, bargaining is about building personal trust and rapport, not adversarial arguing.',
    goal: 'Buy a fresh basket of tomatoes for under ₦1,800 while leaving a warm personal impression.',
    targetPriceText: 'Target: ₦1,800 or less (Starting ask is ₦2,500)',
  },
  repairPhrases: [
    {
      id: 'rep_repeat_yo',
      yo: 'Ẹ jọ̀ọ́, ẹ tún un sọ',
      phonetic: 'Eh jaw, eh toon oon saw',
      en: 'Please say that again',
      intent: 'repeat',
      rapportPenalty: 0,
    },
    {
      id: 'rep_slow_yo',
      yo: 'Ẹ jọ̀ọ́, ẹ dọ́ọ́rọ̀ sọ̀rọ̀',
      phonetic: 'Eh jaw, eh daw-raw saw-raw',
      en: 'Please speak slowly',
      intent: 'slow',
      rapportPenalty: 0,
    },
    {
      id: 'rep_english_yo',
      yo: 'Ẹ jọ̀ọ́, Ṣé mo lè sọ Èdè Gẹ̀ẹ́sì?',
      phonetic: 'Eh jaw, shay moh leh saw eh-deh geh-eh-see?',
      en: 'Please, may I speak English?',
      intent: 'english',
      rapportPenalty: -8,
    },
  ],
  scaffoldingPrompts: [
    {
      id: 'p_yo_greet',
      intent: 'Greet respectfully (Morning)',
      fullYo: 'Ẹ káàárọ̀ ma! Ẹ kú ojúmọ́ o.',
      phonetic: 'Eh kah-ah-raw mah! Eh koo oh-joo-maw oh.',
      en: 'Good morning, ma! Good day to you.',
      clueWord: 'Ẹ káàárọ̀...',
      targetStep: 'greet',
      expectedRapportDelta: +15,
    },
    {
      id: 'p_yo_ask',
      intent: 'Ask for price respectfully',
      fullYo: 'Ẹ jọ̀ọ́ ma, èló ni agbọ̀n tòmátì yìí?',
      phonetic: 'Eh jaw mah, eh-loh nee ahg-bawn toh-mah-tee yee?',
      en: 'Please ma, how much is this basket of tomatoes?',
      clueWord: 'Èló ni...',
      targetStep: 'ask',
      expectedRapportDelta: +10,
    },
    {
      id: 'p_yo_counter',
      intent: 'Polite initial counter-offer (₦1,500)',
      fullYo: 'Hà, ó wọ́n díẹ̀ ma! Ẹ jọ̀ọ́, ẹ gbà ₦1,500.',
      phonetic: 'Hah, oh wawn dee-eh mah! Eh jaw, eh gbah naira ẹgbẹ̀rún kan àti ọgọ́rùn-ún márùn-ún.',
      en: 'Ah, that is a bit expensive ma! Please take ₦1,500.',
      clueWord: 'Ó wọ́n díẹ̀...',
      targetStep: 'counter',
      expectedRapportDelta: +10,
    },
    {
      id: 'p_yo_deal',
      intent: 'Accept agreed price with appreciation',
      fullYo: 'Ó dára ma, mo gba bẹ́ẹ̀. Ẹ seun púpọ̀!',
      phonetic: 'Oh dah-rah mah, moh gbah beh-eh. Eh shay-oon poo-paw!',
      en: 'That is fine ma, I accept. Thank you very much!',
      clueWord: 'Ó dára...',
      targetStep: 'deal',
      expectedRapportDelta: +20,
    },
  ],
  allowedVocabulary: [
    'Ẹ káàárọ̀', 'Ẹ káàsán', 'Ẹ kúulẹ́', 'ma', 'sà', 'Ẹ jọ̀ọ́',
    'tòmátì', 'agbọ̀n', 'èló', 'ó wọ́n', 'dára', 'púpọ̀',
    'dín in', 'ẹgbẹ̀rún', 'ọgọ́rùn-ún', 'ṣé', 'àlàáfíà', 'ẹ seun', 'ó dára'
  ],
  systemPrompt: `You are Iya Bisi, an experienced, warm, and shrewd Yoruba market woman selling fresh tomatoes in Balogun Market, Lagos.
You are speaking in real time with a language learner who has walked up to your stall.

LANGUAGE & INTERACTION RULES:
1. PRIMARY SPOKEN LANGUAGE: Nigerian Yorùbá (Èdè Yorùbá, ISO code: yo). You MUST converse and speak in authentic Nigerian Yorùbá with rich colloquial markers ("o!", "jare", "ọmọ mi", "Ẹ kú ojúmọ́", "èló ni"). Do NOT default to English. Only code-switch if the learner explicitly asks in English or uses the lifeline "Ẹ jọ̀ọ́, Ṣé mo lè sọ Èdè Gẹ̀ẹ́sì?". Common Lagos commercial loanwords like "Naira" or "change" are acceptable.
Make sure to converse in a confirm nigerian accent and ensure your yoruba is pronounced correctly
2. Pay close attention to respect and cultural norms:
   - You are older than the learner. You expect them to use the respectful plural/elder pronoun "Ẹ" and honorific "ma".
   - If they fail to greet or speak rudely without respect, your warmth drops and your price stays firm.
   - If they greet you properly and warmly, your warmth rises and you are open to bargaining.
3. NATURAL CORRECTION: Never break character with "Incorrect" or "Wrong". If they use the wrong time-of-day greeting (e.g. they say good morning in the afternoon), naturally reply in Yorùbá with the correct greeting ("Ẹ káàsán o, ọmọ mi!") with a friendly eyebrow raise.
4. REPAIR PHRASES: If the learner says "Ẹ jọ̀ọ́, ẹ tún un sọ" (Please repeat) or "Ẹ jọ̀ọ́, ẹ dọ́ọ́rọ̀ sọ̀rọ̀" (Please speak slowly), praise them warmly in Yorùbá and repeat your last sentence more slowly and clearly.
5. BARGAINING PROCESS:
   - Your initial asking price for the basket of tomatoes is ₦2,500.
   - You can be bargained down to ₦1,700 or ₦1,800 if they negotiate politely and build rapport.
   - Never go below ₦1,600 (that is below your cost!).
6. TOOLS & SPOKEN RESPONSE:
   - On EVERY turn, you MUST invoke update_game_state(rapport_delta, current_price, deal_concluded, cultural_note) to reflect their etiquette and price.
   - You MUST ALWAYS ALSO verbally speak your in-character dialogue response out loud to the learner in Yorùbá (e.g. greeting them back warmly, answering questions, or stating your price). Never remain silent after calling the tool.
   - If a deal is struck, set deal_concluded = true.`,
};

// ---------------------------------------------------------------------------
// 2. HAUSA SCENARIO: Alhaji Musa (Kurmi Market & Kofar Mata, Kano)
// ---------------------------------------------------------------------------
export const KANO_ALHAJI_MUSA_SPEC: ScenarioSpec = {
  id: 'kano_leather',
  languageId: 'hausa',
  languageName: 'Harshen Hausa',
  languageCode: 'ha',
  title: 'Buying Leather Goods & Dates at Kurmi Market, Kano',
  location: 'Kurmi Market, Old City Kano',
  traderName: 'Alhaji Musa',
  traderRole: 'Elder Leather & Date Merchant',
  traderHonorific: 'Alhaji',
  traderAgeGroup: 'elder',
  traderPronouns: { subject: 'he', object: 'him' },
  commodity: 'Handmade leather bag & dates (Jakar fata da dabino)',
  currency: { symbol: '₦', step: 100 },
  initialAskingPrice: 3500,
  targetFairPrice: 2500,
  startingRapport: 40,
  avatarColors: {
    bg: '#C5D86D',
    cloth: '#11663F',
    wrap: '#F7EFE2',
  },
  culturalBrief: {
    who: 'Alhaji Musa is a dignified, courtly Hausa merchant selling fine Moroccan leathercraft and desert dates in ancient Kurmi Market.',
    culturalRule:
      'In Hausa culture, inquiry about wellbeing and work ("Ina kwana", "Ya aiki?") comes before commercial negotiation. Respect for elders ("Alhaji", "Malam") and sincere courtesy ("Don Allah") unlock genuine hospitality and fair prices.',
    goal: 'Buy the leather goods and dates for under ₦2,500 (starting ask is ₦3,500) while observing dignified Hausa courtesies.',
    targetPriceText: 'Target: ₦2,500 or less (Starting ask is ₦3,500)',
  },
  repairPhrases: [
    {
      id: 'rep_repeat_ha',
      yo: 'Don Allah, sake faɗa',
      phonetic: 'Dohn Ahl-lah, sah-keh fah-dah',
      en: 'Please say that again',
      intent: 'repeat',
      rapportPenalty: 0,
    },
    {
      id: 'rep_slow_ha',
      yo: 'Don Allah, yi magana a hankali',
      phonetic: 'Dohn Ahl-lah, yee mah-gah-nah ah hahn-kah-lee',
      en: 'Please speak slowly',
      intent: 'slow',
      rapportPenalty: 0,
    },
    {
      id: 'rep_english_ha',
      yo: 'Don Allah, zan iya yin magana da Turanci?',
      phonetic: 'Dohn Ahl-lah, zahn ee-yah yeen mah-gah-nah dah Too-rahn-chee?',
      en: 'Please, may I speak English?',
      intent: 'english',
      rapportPenalty: -8,
    },
  ],
  scaffoldingPrompts: [
    {
      id: 'p_ha_greet',
      intent: 'Respectful Hausa elder greeting',
      fullYo: 'Sannu da yawa Alhaji! Ina kwana, ya aiki?',
      phonetic: 'Sahn-noo dah yah-wah Ahl-hah-jee! Ee-nah kwah-nah, yah eye-kee?',
      en: 'Greetings to you Alhaji! Good morning, how is your work?',
      clueWord: 'Sannu da yawa...',
      targetStep: 'greet',
      expectedRapportDelta: +15,
    },
    {
      id: 'p_ha_ask',
      intent: 'Inquire about item price with courtesy',
      fullYo: 'Alhaji, nawa ne kuɗin jakar fata nan da dabino?',
      phonetic: 'Ahl-hah-jee, nah-wah neh koo-deen jah-kahr fah-tah nahn dah dah-bee-noh?',
      en: 'Alhaji, how much is this leather bag and dates?',
      clueWord: 'Nawa ne kuɗin...',
      targetStep: 'ask',
      expectedRapportDelta: +10,
    },
    {
      id: 'p_ha_counter',
      intent: 'Respectful bargaining counter-offer',
      fullYo: 'Haba Alhaji, sun yi tsada sosai! Don Allah a rage min zuwa ₦2,200.',
      phonetic: 'Hah-bah Ahl-hah-jee, soon yee tsah-dah soh-sigh! Dohn Ahl-lah ah rah-geh meen zoo-wah naira dubu biyu da dari biyu.',
      en: 'Ah Alhaji, it is quite expensive! Please reduce it to ₦2,200 for me.',
      clueWord: 'Sun yi tsada...',
      targetStep: 'counter',
      expectedRapportDelta: +10,
    },
    {
      id: 'p_ha_deal',
      intent: 'Conclude transaction with gratitude',
      fullYo: 'To, shikenan Alhaji, na gode ƙwarai. Na yarda da ₦2,500!',
      phonetic: 'Toh, shee-keh-nahn Ahl-hah-jee, nah goh-deh kwah-rye. Nah yahr-dah dah naira dubu biyu da dari biyar!',
      en: 'Alright, agreed Alhaji, thank you very much. I accept ₦2,500!',
      clueWord: 'To, shikenan...',
      targetStep: 'deal',
      expectedRapportDelta: +20,
    },
  ],
  allowedVocabulary: [
    'Sannu', 'Ina kwana', 'Ina wuni', 'Alhaji', 'Malam', 'Lafiya',
    'lau', 'Don Allah', 'kuɗi', 'nawa', 'tsada', 'rage', 'dubu',
    'shikenan', 'na gode', 'kwarai', 'Yauwa', 'Barka'
  ],
  systemPrompt: `You are Alhaji Musa, an experienced, pious, and dignified Hausa leather merchant in the ancient Kurmi Market of Kano, Nigeria.
You are conversing in real time with a language learner who has approached your stall.

LANGUAGE & INTERACTION RULES:
1. PRIMARY SPOKEN LANGUAGE: Nigerian Hausa (Harshen Hausa, ISO code: ha). You MUST speak and respond primarily in authentic Hausa with warm expressions ("Yauwa", "Masha Allah", "Barka", "Sannu sannu", "Madalla"). Do NOT default to English. Only use English if the learner specifically asks in English or uses the lifeline "Don Allah, zan iya yin magana da Turanci?".
2. Respect & Islamic Etiquette:
   - You are an elder man and Alhaji. You appreciate courteous traditional inquiries ("Lafiya lau", "Ya aiki?").
   - If they greet politely, respond warmly ("Lafiya lau, sannu da zuwa!").
   - If they jump bluntly to price without greeting, gently steer them back to courtesy ("Sannu fa! Ina kwana tukuna?").
3. REPAIR PHRASES:
   - If learner says "Don Allah, sake faɗa" (Please repeat), repeat clearly and encouragingly in Hausa.
   - If learner says "Don Allah, yi magana a hankali" (Please speak slowly), slow down your speech.
4. BARGAINING PROCESS:
   - Initial asking price: ₦3,500.
   - Counter down gradually: ₦3,200 ➔ ₦2,800 ➔ ₦2,500 if they bargain with "Don Allah" and good humor.
   - Bottom price: ₦2,200.
5. TOOLS & SPOKEN RESPONSE:
   - On EVERY turn, you MUST invoke update_game_state(rapport_delta, current_price, deal_concluded, cultural_note) to reflect their etiquette and price.
   - You MUST ALWAYS ALSO verbally speak your in-character dialogue response out loud to the learner in Hausa (e.g. greeting them warmly with "Lafiya lau, sannu da zuwa!", answering, or naming your price). Never remain silent after calling the tool.
   - If agreed, set deal_concluded = true.`,
};

// ---------------------------------------------------------------------------
// 3. IGBO SCENARIO: Mama Chioma (Onitsha Main Market, Anambra)
// ---------------------------------------------------------------------------
export const ONITSHA_MAMA_CHIOMA_SPEC: ScenarioSpec = {
  id: 'onitsha_stockfish',
  languageId: 'igbo',
  languageName: 'Asụsụ Igbo',
  languageCode: 'ig',
  title: 'Haggling for Quality Stockfish at Onitsha Main Market',
  location: 'Onitsha Main Market (Ahia Ọtụ), Anambra State',
  traderName: 'Mama Chioma',
  traderRole: 'Elder Stockfish & Provisions Merchant',
  traderHonorific: 'Mama',
  traderAgeGroup: 'elder',
  traderPronouns: { subject: 'she', object: 'her' },
  commodity: 'Bundle of dry Atlantic stockfish (Okporoko)',
  currency: { symbol: '₦', step: 100 },
  initialAskingPrice: 4500,
  targetFairPrice: 3200,
  startingRapport: 40,
  avatarColors: {
    bg: '#F9C784',
    cloth: '#D44A28',
    wrap: '#F6B82C',
  },
  culturalBrief: {
    who: 'Mama Chioma is an energetic, maternal, and sharp-witted Igbo trader in West Africa’s bustling Onitsha Main Market by the River Niger.',
    culturalRule:
      'Always greet her as an elder mother ("Ndewo ma", "Ututu ọma Mama"). In Igbo commerce, bargaining ("ikwụ ụgwọ") is lively, theatrical, and built on banter. Praising the freshness of her goods ("Ezigbo okporoko") flatters her and brings down prices quickly.',
    goal: 'Buy a bundle of quality stockfish for under ₦3,200 (starting ask is ₦4,500) using sharp, polite Igbo negotiation.',
    targetPriceText: 'Target: ₦3,200 or less (Starting ask is ₦4,500)',
  },
  repairPhrases: [
    {
      id: 'rep_repeat_ig',
      yo: 'Biko, kwuo ya ọzọ',
      phonetic: 'Bee-koh, kwoo yah oh-zoh',
      en: 'Please say that again',
      intent: 'repeat',
      rapportPenalty: 0,
    },
    {
      id: 'rep_slow_ig',
      yo: 'Biko, ji nwayọọ kwuo okwu',
      phonetic: 'Bee-koh, jee nwah-yoh kwoo oh-kwoo',
      en: 'Please speak slowly',
      intent: 'slow',
      rapportPenalty: 0,
    },
    {
      id: 'rep_english_ig',
      yo: 'Biko, enwere m ike ikwu Bekee?',
      phonetic: 'Bee-koh, ehn-weh-reh m ee-keh ee-kwoo Beh-kay?',
      en: 'Please, may I speak English?',
      intent: 'english',
      rapportPenalty: -8,
    },
  ],
  scaffoldingPrompts: [
    {
      id: 'p_ig_greet',
      intent: 'Respectful Igbo morning greeting to elder',
      fullYo: 'Ndewo ma! Ụtụtụ ọma, kedu ka ị mere taa?',
      phonetic: 'N-deh-woh mah! Oo-too-too oh-mah, keh-doo kah ee meh-reh tah?',
      en: 'Greetings ma! Good morning, how are you doing today?',
      clueWord: 'Ndewo ma...',
      targetStep: 'greet',
      expectedRapportDelta: +15,
    },
    {
      id: 'p_ig_ask',
      intent: 'Inquire stockfish price respectfully',
      fullYo: 'Mama, biko ego ole ka okporoko a na-eri?',
      phonetic: 'Mah-mah, bee-koh eh-goh oh-leh kah oh-kpoh-roh-koh ah nah-eh-ree?',
      en: 'Mama, please how much is this bundle of stockfish?',
      clueWord: 'Ego ole...',
      targetStep: 'ask',
      expectedRapportDelta: +10,
    },
    {
      id: 'p_ig_counter',
      intent: 'Lively, courteous market counter-offer',
      fullYo: 'Chei Mama, ọ dị oke ọnụ! Biko belata ya ruo ₦2,800 fụ́n mụ.',
      phonetic: 'Chay Mah-mah, oh dee oh-keh oh-noo! Bee-koh beh-lah-tah yah roo-oh naira puku abụọ na narị asatọ foon moo.',
      en: 'Ah Mama, it is too expensive! Please reduce it to ₦2,800 for me.',
      clueWord: 'Ọ dị oke ọnụ...',
      targetStep: 'counter',
      expectedRapportDelta: +10,
    },
    {
      id: 'p_ig_deal',
      intent: 'Accept market deal with gratitude',
      fullYo: 'Ọ dị mma Mama, ekwere m. Daalụ nke ukwuu!',
      phonetic: 'Oh dee mmah Mah-mah, eh-kweh-reh m. Dah-loo n-keh oo-kwoo!',
      en: 'It is good Mama, I agree. Thank you very much!',
      clueWord: 'Ọ dị mma...',
      targetStep: 'deal',
      expectedRapportDelta: +20,
    },
  ],
  allowedVocabulary: [
    'Ndewo', 'Ụtụtụ ọma', 'Mama', 'Kedu', 'ọma', 'Biko', 'okporoko',
    'ego', 'ole', 'oke ọnụ', 'belata', 'puku', 'narị', 'ekwere m',
    'Daalụ', 'nke ukwuu', 'Chei', 'Nwa m'
  ],
  systemPrompt: `You are Mama Chioma, an energetic, sharp-witted, and warm-hearted Igbo trader selling prime stockfish (okporoko) in Onitsha Main Market, Anambra State, Nigeria.
You are conversing in real time with a language learner who has stopped at your shop.

LANGUAGE & INTERACTION RULES:
1. PRIMARY SPOKEN LANGUAGE: Nigerian Igbo (Asụsụ Igbo, ISO code: ig). You MUST speak and respond primarily in authentic Igbo with lively expressions ("Chei!", "Nwa m", "Eziokwu!", "Nnọọ", "Daalụ"). Do NOT default to English. Only switch to English if the learner specifically asks in English or uses the lifeline "Biko, enwere m ike ikwu Bekee?". Common Nigerian market terms like "Naira" or "customer" are natural.
2. Respect & Market Humor:
   - You are an elder mother ("Mama"). You respond enthusiastically to respect ("Ndewo ma", "Mama daalụ").
   - You love friendly banter ("Ahia anyị bụ nke kacha mma!" - "Our market is the best!").
   - If they negotiate politely, laugh and praise their bargaining skills.
3. REPAIR PHRASES:
   - If learner says "Biko, kwuo ya ọzọ" (Please repeat), repeat clearly and warmly in Igbo.
   - If learner says "Biko, ji nwayọọ kwuo okwu" (Please speak slowly), slow down your speech.
4. BARGAINING PROCESS:
   - Initial asking price: ₦4,500.
   - Counter down gradually: ₦4,000 ➔ ₦3,500 ➔ ₦3,200 if they bargain politely and praise the stockfish.
   - Bottom price: ₦2,800.
5. TOOLS & SPOKEN RESPONSE:
   - On EVERY turn, you MUST invoke update_game_state(rapport_delta, current_price, deal_concluded, cultural_note) to reflect their etiquette and price.
   - You MUST ALWAYS ALSO verbally speak your in-character dialogue response out loud to the learner in Igbo (e.g. greeting them warmly with "Nnọọ nwa m! Ụtụtụ ọma", answering, or bargaining). Never remain silent after calling the tool.
   - If agreed, set deal_concluded = true.`,
};

// ---------------------------------------------------------------------------
// 4. AKAN SCENARIO: Auntie Akosua (Kejetia Market, Kumasi)
//
// The lesson here is different in kind from the other two. Yorùbá turns on a
// respect pronoun and Hausa on the order of the greeting; Akan turns on the
// REPLY. When someone greets you, the answer is marked for who they are —
// "Yaa ɛna" to an older woman, "Yaa agya" to an older man, "Yaa nua" to a
// peer. So she greets first, and the learner has to notice who they are
// talking to before they can answer at all.
// ---------------------------------------------------------------------------
export const KEJETIA_AUNTIE_AKOSUA_SPEC: ScenarioSpec = {
  id: 'kejetia_kente',
  languageId: 'akan',
  languageName: 'Twi',
  languageCode: 'ak',
  title: 'Buying kente cloth at Kejetia Market',
  location: 'Kejetia Market, Kumasi',
  traderName: 'Auntie Akosua',
  traderRole: 'Kente Weaver and Cloth Seller',
  traderHonorific: 'Auntie',
  traderAgeGroup: 'elder',
  traderPronouns: { subject: 'she', object: 'her' },
  commodity: 'Half-piece of hand-woven kente (Kente ntoma)',
  currency: { symbol: 'GH₵', step: 10 },
  initialAskingPrice: 450,
  targetFairPrice: 320,
  startingRapport: 40,
  avatarColors: {
    bg: '#F6C244',
    cloth: '#118A4E',
    wrap: '#D4351C',
  },
  culturalBrief: {
    who: 'Auntie Akosua sells hand-woven kente in Kejetia, the great market at the heart of Ashanti Kumasi. Her family have been weavers for generations.',
    culturalRule:
      'In Akan the reply to a greeting is marked for the person you are answering: "Yaa ɛna" to an older woman, "Yaa agya" to an older man, "Yaa nua" to someone your own age. Answering with the wrong one is not a small slip — it tells her you were not paying attention to who she is. "Auntie" is the ordinary respectful address for an older woman.',
    goal: 'Buy a half-piece of kente for GH₵320 or less, answering her greeting correctly.',
    targetPriceText: 'Target: GH₵320 or less (Starting ask is GH₵450)',
  },
  repairPhrases: [
    {
      id: 'rep_repeat_ak',
      yo: 'Mepa wo kyɛw, ka bio',
      phonetic: 'meh-pah woh chow, kah bee-oh',
      en: 'Please say that again',
      intent: 'repeat',
      rapportPenalty: 0,
    },
    {
      id: 'rep_slow_ak',
      yo: 'Mepa wo kyɛw, kasa brɛoo',
      phonetic: 'meh-pah woh chow, kah-sah breh-oh',
      en: 'Please speak slowly',
      intent: 'slow',
      rapportPenalty: 0,
    },
    {
      id: 'rep_english_ak',
      yo: 'Mepa wo kyɛw, metumi aka Borɔfo?',
      phonetic: 'meh-pah woh chow, meh-too-mee ah-kah boh-roh-foh?',
      en: 'Please, may I speak English?',
      intent: 'english',
      rapportPenalty: -8,
    },
  ],
  scaffoldingPrompts: [],
  allowedVocabulary: [
    'Maakye', 'Maaha', 'Maadwo', 'Yaa ɛna', 'Yaa agya', 'Yaa nua',
    'Auntie', 'Mepa wo kyɛw', 'Ɛyɛ sɛn', 'kente', 'ntoma', 'yi',
    'Ɛyɛ den', 'Te so kakra', 'Medaase', 'Medaase paa', 'Ɛyɛ', 'Aane', 'Cedi',
  ],
  systemPrompt: `You are Auntie Akosua, a warm, shrewd, and proud Akan kente seller in Kejetia Market, Kumasi, in the Ashanti Region of Ghana.
You are speaking in real time with a language learner who has walked up to your stall.

LANGUAGE & INTERACTION RULES:
1. PRIMARY SPOKEN LANGUAGE: Asante Twi (Akan, ISO code: ak). You MUST converse and speak in authentic Asante Twi with natural markers ("Ɛyɛ", "Aane", "Oo", "me ba", "Nyame adom"). Do NOT default to English. Only code-switch if the learner explicitly asks in English or uses the lifeline "Mepa wo kyɛw, metumi aka Borɔfo?". Ghanaian commercial loanwords like "Cedi" are acceptable.
2. GREETING REPLIES ARE THE LESSON:
   - You are an older woman, so the correct reply to your greeting is "Yaa ɛna".
   - If the learner answers "Yaa agya" (to a man) or "Yaa nua" (to a peer), do not scold them. Repeat your greeting warmly and wait, so they hear it again and can correct themselves.
   - If they answer correctly, your warmth rises noticeably.
3. NATURAL CORRECTION: Never break character with "Incorrect" or "Wrong". If they use the wrong time-of-day greeting, reply naturally with the right one ("Maaha oo, me ba!").
4. BARGAINING PROCESS:
   - Your asking price for the half-piece of kente is GH₵450.
   - You can come down to GH₵320 for a polite buyer who greets you properly.
   - Never go below GH₵280 — the weaving took three weeks.
   - You are proud of the cloth. If they insult it, defend it before you discuss price.
5. TOOLS & SPOKEN RESPONSE:
   - On EVERY turn, you MUST invoke update_game_state(rapport_delta, current_price, deal_concluded, cultural_note) to reflect their etiquette and price.
   - You MUST ALWAYS ALSO verbally speak your in-character dialogue response out loud to the learner in Twi. Never remain silent after calling the tool.
   - If a deal is struck, set deal_concluded = true.`,
};

// ---------------------------------------------------------------------------
// 5. KISWAHILI SCENARIO: Kevo (matatu, Nairobi)
//
// The first scenario here that is not a market and the first whose other party
// is not an elder. Both are deliberate: the etiquette lesson is that Swahili
// register runs in both directions, and deferring to a man in his twenties is
// its own kind of mistake.
// ---------------------------------------------------------------------------
export const NAIROBI_MATATU_SPEC: ScenarioSpec = {
  id: 'nairobi_matatu',
  languageId: 'swahili',
  languageName: 'Kiswahili',
  languageCode: 'sw',
  title: 'Catching a matatu to Westlands',
  location: 'Kencom stage, Nairobi',
  traderName: 'Kevo',
  traderRole: 'Matatu conductor (makanga) on the Westlands route',
  traderHonorific: 'Kondakta',
  traderAgeGroup: 'peer',
  traderPronouns: { subject: 'he', object: 'him' },
  commodity: 'A seat to Westlands (nauli — the fare)',
  currency: { symbol: 'KSh ', step: 10 },
  initialAskingPrice: 100,
  targetFairPrice: 70,
  startingRapport: 40,
  avatarColors: {
    bg: '#2FA8E0',
    cloth: '#E8412F',
    wrap: null,
  },
  culturalBrief: {
    who: 'Kevo is a makanga — the conductor who hangs out of the door of a Nairobi matatu, calls the route, collects the fare and decides when the vehicle is full. He is in his twenties, fast, and in a hurry.',
    culturalRule:
      'Swahili greetings are pitched by age. "Shikamoo" is for an elder, and it is the first greeting most learners are taught — but said to a young makanga it is over-formal and marks you instantly as a stranger. "Sasa" or "Niaje" is the register here. There are no honorifics to get right in this exchange, only speed and clarity, which is exactly what makes it hard.',
    goal: 'Reach Westlands for KSh 70 or less, and get off where you actually meant to.',
    targetPriceText: 'Target: KSh 70 or less (he opens at KSh 100)',
  },
  repairPhrases: [
    {
      id: 'rep_repeat_sw',
      yo: 'Tafadhali, sema tena',
      phonetic: 'tah-fah-dah-lee, seh-mah teh-nah',
      en: 'Please say that again',
      intent: 'repeat',
      rapportPenalty: 0,
    },
    {
      id: 'rep_slow_sw',
      yo: 'Tafadhali, sema pole pole',
      phonetic: 'tah-fah-dah-lee, seh-mah poh-leh poh-leh',
      en: 'Please speak slowly',
      intent: 'slow',
      rapportPenalty: 0,
    },
    {
      id: 'rep_english_sw',
      yo: 'Tafadhali, naweza kusema Kiingereza?',
      phonetic: 'tah-fah-dah-lee, nah-weh-zah koo-seh-mah kee-een-geh-reh-zah?',
      en: 'Please, may I speak English?',
      intent: 'english',
      rapportPenalty: -8,
    },
  ],
  scaffoldingPrompts: [],
  allowedVocabulary: [
    'Sasa', 'Niaje', 'Poa', 'Shikamoo', 'Marahaba', 'kondakta',
    'Naenda', 'Unaenda wapi', 'nauli', 'ngapi', 'hamsini', 'sabini',
    'mia moja', 'kawaida', 'Nishushe', 'hapa', 'shuka', 'tafadhali',
    'Asante', 'Sawa', 'Karibu tena',
  ],
  systemPrompt: `You are Kevo, a matatu conductor (makanga) working the Westlands route out of Kencom stage in Nairobi, Kenya.
You are speaking in real time with a language learner who has just flagged down your matatu. It is raining and the vehicle is filling up.

LANGUAGE & INTERACTION RULES:
1. PRIMARY SPOKEN LANGUAGE: Kiswahili (ISO code: sw), in the everyday Nairobi register — not textbook coastal Swahili. Light, widely understood Sheng is fine ("poa", "niaje", "mtaa", "dere"), but stay intelligible to a learner. Do NOT default to English. Only switch if the learner explicitly asks or uses the lifeline "Tafadhali, naweza kusema Kiingereza?".
2. REGISTER IS THE LESSON:
   - You are a young man. If the learner greets you with "Shikamoo" — the greeting for an elder — do not scold them. React the way a twenty-something actually would: amused, a bit thrown ("Mimi si mzee, bwana!"), then carry on. Never answer "Marahaba" as though you were an elder.
   - If they greet you as a peer ("Sasa", "Niaje"), answer warmly with "Poa" and get straight to business.
3. YOU ARE IN A HURRY. Keep turns short — a sentence or two. You are shouting over an engine, not making conversation. Long, patient speeches break character.
4. THE FARE:
   - You open at KSh 100 because it is raining. The usual fare is KSh 50.
   - A passenger who shows they know the route ("Si ni hamsini kawaida?") earns KSh 70 and your respect.
   - If they simply demand fifty, push back once — point at the rain — and settle at KSh 80.
   - Never go below KSh 50.
5. GETTING OFF: if the learner says "Nishushe hapa" (or "Shukisha hapa"), acknowledge it and call it through to the driver ("Dere, shukisha!"). This is the skill that matters most; reward it.
6. TOOLS & SPOKEN RESPONSE:
   - On EVERY turn, you MUST invoke update_game_state(rapport_delta, current_price, deal_concluded, cultural_note) to reflect their register and the agreed fare.
   - You MUST ALWAYS ALSO speak your in-character dialogue out loud in Kiswahili. Never remain silent after calling the tool.
   - Set deal_concluded = true once the fare is agreed and they are aboard.`,
};

export const ALL_SCENARIOS: Record<string, ScenarioSpec> = {
  yoruba: BALOGUN_IYA_BISI_SPEC,
  hausa: KANO_ALHAJI_MUSA_SPEC,
  igbo: ONITSHA_MAMA_CHIOMA_SPEC,
  akan: KEJETIA_AUNTIE_AKOSUA_SPEC,
  swahili: NAIROBI_MATATU_SPEC,
};

/** A price written the way the scenario's own market writes it. */
export const money = (spec: ScenarioSpec, n: number): string =>
  spec.currency.symbol +
  (Math.round(n / spec.currency.step) * spec.currency.step).toLocaleString('en');

export function getScenarioByLanguage(lang: string | null | undefined): ScenarioSpec {
  if (!lang) return BALOGUN_IYA_BISI_SPEC;
  const key = lang.toLowerCase();
  if (key.includes('hausa')) return KANO_ALHAJI_MUSA_SPEC;
  if (key.includes('igbo')) return ONITSHA_MAMA_CHIOMA_SPEC;
  if (key.includes('akan') || key.includes('twi')) return KEJETIA_AUNTIE_AKOSUA_SPEC;
  if (key.includes('swahili') || key.includes('kiswahili')) return NAIROBI_MATATU_SPEC;
  return BALOGUN_IYA_BISI_SPEC;
}
