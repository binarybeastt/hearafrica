// Guided encounters: the scripted, coached walk through a market exchange.
//
// The loop is: the coach tells you what to do next -> the line is shown and
// spoken for you -> you say it back -> the model judges it -> if it missed, it
// is said for you again and you repeat -> the trader reacts to how you did.
//
// The learner is never asked to interpret a phrase they have not been taught.
// Everything the trader says is shown with its English meaning.
//
// Nothing here is improvised at runtime. Every line is authored, so it can be
// reviewed by a fluent speaker before anyone hears it, and its audio can be
// vetted once and cached forever. See src/lib/audio-cache.ts.
//
// TRANSLATION STATUS: first-pass, not yet reviewed by native speakers.

export interface Line {
  native: string;
  phonetic: string;
  en: string;
}

/** How the trader reacts to how the learner actually performed. */
export interface Reactions {
  /** Said it correctly without needing a correction. */
  firstTry: Line;
  /** Got there, but needed to be corrected first. */
  retry?: Line;
  /** Said most of it but dropped a respect marker. Warmth does not follow. */
  missedCritical?: Line;
  /** Gave up or skipped the microphone. Neutral, never punitive. */
  skipped?: Line;
}

export interface ChoiceOption {
  id: string;
  /** English framing of the decision, e.g. "Offer ₦1,200 — cheeky". */
  label: string;
  /** What the learner actually says if they pick this. */
  line: Line;
  rapportDelta: number;
  /** Sets the working price when this option lands. */
  price?: number;
  reaction: Line;
}

export type Step =
  | {
      kind: 'trader';
      id: string;
      line: Line;
      /** Scene-setting shown with its meaning, never a quiz. */
      note?: string;
    }
  | {
      kind: 'say';
      id: string;
      /** The coach's nudge, in English: what to do and why. */
      nudge: string;
      line: Line;
      /** Chunk ids from learning-content, for tiles and critical-word detection. */
      chunks?: string[];
      reactions: Reactions;
      rapportDelta?: number;
    }
  | {
      kind: 'choose';
      id: string;
      nudge: string;
      options: ChoiceOption[];
    };

export interface Encounter {
  id: string;
  scenarioId: string;
  languageId: 'yoruba' | 'hausa' | 'akan' | 'swahili';
  title: string;
  /** Plain-English statement of what counts as finishing. */
  goal: string;
  startingRapport: number;
  startingPrice: number | null;
  steps: Step[];
  /** Shown on completion. */
  outro: string;
}

// ---------------------------------------------------------------------------
// YORÙBÁ — Iya Bisi, Balogun Market
// ---------------------------------------------------------------------------

export const YORUBA_ENCOUNTER: Encounter = {
  id: 'enc_balogun_tomatoes',
  scenarioId: 'balogun_tomatoes',
  languageId: 'yoruba',
  title: 'Buying tomatoes from Iya Bisi',
  goal: 'Greet her properly, ask her price, bargain politely, and close warmly.',
  startingRapport: 40,
  startingPrice: 2500,
  outro:
    'You greeted an elder correctly, asked a price, bargained without giving offence, and closed warmly — in Yorùbá.',
  steps: [
    {
      kind: 'say',
      id: 'yo_s2',
      nudge:
        'You have walked up to Iya Bisi\u2019s stall. Greet her before anything else — going straight to business would be rude. She is an elder woman, so the respect marker "Ẹ" and the honorific "ma" are not optional.',
      line: {
        native: 'Ẹ káàárọ̀ ma',
        phonetic: 'eh kah-ah-raw mah',
        en: 'Good morning, ma.',
      },
      chunks: ['yo_e', 'yo_kaaro', 'yo_ma'],
      rapportDelta: 15,
      reactions: {
        firstTry: {
          native: 'Ẹ káàárọ̀ ọmọ mi! Ẹ kú ojúmọ́ o.',
          phonetic: 'eh kah-ah-raw aw-maw mee! eh koo oh-joo-maw oh.',
          en: 'Good morning, my child! Good day to you.',
        },
        retry: {
          native: 'Yẹn ni! Ẹ káàárọ̀ ọmọ mi.',
          phonetic: 'yen nee! eh kah-ah-raw aw-maw mee.',
          en: "That's it! Good morning, my child.",
        },
        missedCritical: {
          native: 'Mm. Ẹ káàárọ̀.',
          phonetic: 'mm. eh kah-ah-raw.',
          en: 'Mm. Good morning.',
        },
        skipped: {
          native: 'Ẹ káàárọ̀.',
          phonetic: 'eh kah-ah-raw.',
          en: 'Good morning.',
        },
      },
    },
    {
      kind: 'say',
      id: 'yo_s3',
      nudge: 'Now ask what the basket of tomatoes costs. Keep "Ẹ jọ̀ọ́" — please — in front of it.',
      line: {
        native: 'Ẹ jọ̀ọ́ ma, èló ni agbọ̀n tòmátì yìí?',
        phonetic: 'eh jaw-aw mah, eh-loh nee ahg-bawn toh-mah-tee yee?',
        en: 'Please ma, how much is this basket of tomatoes?',
      },
      chunks: ['yo_ejoo', 'yo_ma', 'yo_eloni', 'yo_agbon_tomati', 'yo_yii'],
      rapportDelta: 10,
      reactions: {
        firstTry: {
          native: 'Agbọ̀n tòmátì yìí jẹ́ ẹgbẹ̀rún méjì ààbọ̀.',
          phonetic: 'ahg-bawn toh-mah-tee yee jeh eh-gbeh-roon meh-jee ah-baw.',
          en: 'This basket of tomatoes is ₦2,500.',
        },
        retry: {
          native: 'Bẹ́ẹ̀ ni. Ẹgbẹ̀rún méjì ààbọ̀ ni.',
          phonetic: 'beh-eh nee. eh-gbeh-roon meh-jee ah-baw nee.',
          en: 'That is right. It is ₦2,500.',
        },
        missedCritical: {
          native: 'Ẹgbẹ̀rún méjì ààbọ̀.',
          phonetic: 'eh-gbeh-roon meh-jee ah-baw.',
          en: '₦2,500.',
        },
        skipped: {
          native: 'Ẹgbẹ̀rún méjì ààbọ̀ ni.',
          phonetic: 'eh-gbeh-roon meh-jee ah-baw nee.',
          en: 'It is ₦2,500.',
        },
      },
    },
    {
      kind: 'choose',
      id: 'yo_s4',
      nudge:
        'Her asking price is ₦2,500. How hard do you push? In Lagos markets the counter-offer is expected — but how far you go changes how she takes it.',
      options: [
        {
          id: 'yo_c_low',
          label: 'Offer ₦1,200 — cheeky',
          line: {
            native: 'Hà! Ẹ gbà ẹgbẹ̀rún kan ó lé igba.',
            phonetic: 'hah! eh gbah eh-gbeh-roon kahn oh leh ee-gbah.',
            en: 'Ah! Take ₦1,200.',
          },
          rapportDelta: -5,
          price: 2200,
          reaction: {
            native: 'Hà hà! Ọmọ mi, ṣé o fẹ́ kí n pa gbèsè? Ẹgbẹ̀rún méjì ó lé igba.',
            phonetic: 'hah hah! aw-maw mee, sheh oh feh kee n pah gbeh-seh? eh-gbeh-roon meh-jee oh leh ee-gbah.',
            en: 'Ha ha! My child, do you want me to run at a loss? ₦2,200.',
          },
        },
        {
          id: 'yo_c_fair',
          label: 'Offer ₦1,500 — the usual counter',
          line: {
            native: 'Ó wọ́n díẹ̀ ma. Ẹ jọ̀ọ́, ẹ gbà ẹgbẹ̀rún kan ààbọ̀.',
            phonetic: 'oh wawn dee-eh mah. eh jaw-aw, eh gbah eh-gbeh-roon kahn ah-baw.',
            en: 'It is a little expensive, ma. Please take ₦1,500.',
          },
          rapportDelta: 10,
          price: 1800,
          reaction: {
            native: 'Ọmọ mi, o mọ ọjà! Ẹgbẹ̀rún kan ẹgbẹ̀rin.',
            phonetic: 'aw-maw mee, oh maw aw-jah! eh-gbeh-roon kahn eh-gbeh-reen.',
            en: 'My child, you know the market! ₦1,800.',
          },
        },
        {
          id: 'yo_c_high',
          label: 'Offer ₦2,200 — barely a bargain',
          line: {
            native: 'Ẹ jọ̀ọ́ ma, ẹ gbà ẹgbẹ̀rún méjì ó lé igba.',
            phonetic: 'eh jaw-aw mah, eh gbah eh-gbeh-roon meh-jee oh leh ee-gbah.',
            en: 'Please ma, take ₦2,200.',
          },
          rapportDelta: 5,
          price: 2200,
          reaction: {
            native: 'Ó dára ọmọ mi, mo gbà. Ẹgbẹ̀rún méjì ó lé igba.',
            phonetic: 'oh dah-rah aw-maw mee, moh gbah. eh-gbeh-roon meh-jee oh leh ee-gbah.',
            en: 'Alright my child, I accept. ₦2,200.',
          },
        },
      ],
    },
    {
      kind: 'say',
      id: 'yo_s5',
      nudge: 'Close it. Accept her price and thank her properly — the thanks is what she remembers.',
      line: {
        native: 'Ó dára ma, mo gba bẹ́ẹ̀. Ẹ ṣeun púpọ̀!',
        phonetic: 'oh dah-rah mah, moh gbah beh-eh. eh sheh-oon poo-paw!',
        en: 'That is fine ma, I accept. Thank you very much!',
      },
      chunks: ['yo_o_dara', 'yo_ma', 'yo_mo_gba_bee', 'yo_e_seun_pupo'],
      rapportDelta: 20,
      reactions: {
        firstTry: {
          native: 'Ẹ ṣeun ọmọ mi! Ẹ máa bọ̀ o, mo wà níbí ni gbogbo ọjọ́.',
          phonetic: 'eh sheh-oon aw-maw mee! eh mah baw oh, moh wah nee-bee nee gbo-gbo aw-jaw.',
          en: 'Thank you my child! Do come again — I am here every day.',
        },
        retry: {
          native: 'Ẹ ṣeun ọmọ mi. Ẹ máa bọ̀ o.',
          phonetic: 'eh sheh-oon aw-maw mee. eh mah baw oh.',
          en: 'Thank you my child. Do come again.',
        },
        missedCritical: {
          native: 'Ó dára. Ẹ ṣeun.',
          phonetic: 'oh dah-rah. eh sheh-oon.',
          en: 'Alright. Thank you.',
        },
        skipped: {
          native: 'Ẹ ṣeun.',
          phonetic: 'eh sheh-oon.',
          en: 'Thank you.',
        },
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// HAUSA — Alhaji Musa, Kurmi Market, Kano
// ---------------------------------------------------------------------------

export const HAUSA_ENCOUNTER: Encounter = {
  id: 'enc_kano_leather',
  scenarioId: 'kano_leather',
  languageId: 'hausa',
  title: 'Buying leather and dates from Alhaji Musa',
  goal: 'Greet him and ask after his night, ask his price, bargain courteously, and close.',
  startingRapport: 40,
  startingPrice: 3500,
  outro:
    'You opened with the greeting sequence before the price, bargained with "Don Allah", and closed well — in Hausa.',
  steps: [
    {
      kind: 'say',
      id: 'ha_s2',
      nudge:
        'You have walked up to Alhaji Musa\u2019s stall. In Hausa you ask after the person before the goods. Greet him, use his title Alhaji — he earned it — and ask how he slept.',
      line: {
        native: 'Sannu da yawa Alhaji! Ina kwana?',
        phonetic: 'sahn-noo dah yah-wah ahl-hah-jee! ee-nah kwah-nah?',
        en: 'Greetings to you Alhaji! Good morning.',
      },
      chunks: ['ha_sannu_da_yawa', 'ha_alhaji', 'ha_ina_kwana'],
      rapportDelta: 15,
      reactions: {
        firstTry: {
          native: 'Lafiya lau! Sannu da zuwa, barka da warhaka.',
          phonetic: 'lah-fee-yah lau! sahn-noo dah zoo-wah, bahr-kah dah wahr-hah-kah.',
          en: 'I slept well! Welcome, and peace upon you.',
        },
        retry: {
          native: 'To, madalla! Lafiya lau.',
          phonetic: 'toh, mah-dahl-lah! lah-fee-yah lau.',
          en: 'There, wonderful! I am well.',
        },
        missedCritical: {
          native: 'Lafiya lau.',
          phonetic: 'lah-fee-yah lau.',
          en: 'I am well.',
        },
        skipped: {
          native: 'Lafiya lau. Sannu.',
          phonetic: 'lah-fee-yah lau. sahn-noo.',
          en: 'I am well. Greetings.',
        },
      },
    },
    {
      kind: 'say',
      id: 'ha_s3',
      nudge: 'Now you may ask the price — the courtesy came first, so this is not blunt.',
      line: {
        native: 'Alhaji, nawa ne kuɗin jakar fata da dabino?',
        phonetic: 'ahl-hah-jee, nah-wah neh koo-deen jah-kahr fah-tah dah dah-bee-noh?',
        en: 'Alhaji, how much is the leather bag and the dates?',
      },
      chunks: ['ha_alhaji', 'ha_nawa_ne', 'ha_kudin', 'ha_jakar_fata', 'ha_dabino'],
      rapportDelta: 10,
      reactions: {
        firstTry: {
          native: 'Jakar nan da dabino, naira dubu uku da ɗari biyar.',
          phonetic: 'jah-kahr nahn dah dah-bee-noh, nigh-rah doo-boo oo-koo dah dah-ree bee-yar.',
          en: 'This bag and the dates: ₦3,500.',
        },
        retry: {
          native: 'Eh, dubu uku da ɗari biyar ne.',
          phonetic: 'eh, doo-boo oo-koo dah dah-ree bee-yar neh.',
          en: 'Yes, it is ₦3,500.',
        },
        missedCritical: {
          native: 'Dubu uku da ɗari biyar.',
          phonetic: 'doo-boo oo-koo dah dah-ree bee-yar.',
          en: '₦3,500.',
        },
        skipped: {
          native: 'Dubu uku da ɗari biyar ne.',
          phonetic: 'doo-boo oo-koo dah dah-ree bee-yar neh.',
          en: 'It is ₦3,500.',
        },
      },
    },
    {
      kind: 'choose',
      id: 'ha_s4',
      nudge:
        'He is asking ₦3,500. "Don Allah" — please, literally "for God’s sake" — is what turns a demand into a request here.',
      options: [
        {
          id: 'ha_c_low',
          label: 'Offer ₦1,800 — steep',
          line: {
            native: 'Haba Alhaji! Dubu ɗaya da ɗari takwas.',
            phonetic: 'hah-bah ahl-hah-jee! doo-boo dah-yah dah dah-ree tahk-wahs.',
            en: 'Come now Alhaji! One thousand eight hundred.',
          },
          rapportDelta: -5,
          price: 3000,
          reaction: {
            native: 'Haba! Wannan ba kuɗi ba ne. Dubu uku, ba ƙasa ba.',
            phonetic: 'hah-bah! wahn-nahn bah koo-dee bah neh. doo-boo oo-koo, bah kah-sah bah.',
            en: 'Come now! That is not money. Three thousand, no less.',
          },
        },
        {
          id: 'ha_c_fair',
          label: 'Offer ₦2,500 with "Don Allah"',
          line: {
            native: 'Alhaji, sun yi tsada sosai. Don Allah a rage min zuwa dubu biyu da ɗari biyar.',
            phonetic: 'ahl-hah-jee, soon yee tsah-dah soh-sigh. dohn ahl-lah ah rah-geh meen zoo-wah doo-boo bee-yoo dah dah-ree bee-yar.',
            en: 'Alhaji, they are quite expensive. Please reduce it for me to ₦2,500.',
          },
          rapportDelta: 10,
          price: 2500,
          reaction: {
            native: 'To, don Allah na yarda. Dubu biyu da ɗari biyar.',
            phonetic: 'toh, dohn ahl-lah nah yahr-dah. doo-boo bee-yoo dah dah-ree bee-yar.',
            en: 'Well, for God’s sake I agree. ₦2,500.',
          },
        },
        {
          id: 'ha_c_high',
          label: 'Offer ₦3,000 — barely a bargain',
          line: {
            native: 'Don Allah Alhaji, a rage min zuwa dubu uku.',
            phonetic: 'dohn ahl-lah ahl-hah-jee, ah rah-geh meen zoo-wah doo-boo oo-koo.',
            en: 'Please Alhaji, reduce it for me to ₦3,000.',
          },
          rapportDelta: 5,
          price: 3000,
          reaction: {
            native: 'Madalla. Dubu uku, shikenan.',
            phonetic: 'mah-dahl-lah. doo-boo oo-koo, shee-keh-nahn.',
            en: 'Wonderful. Three thousand, that settles it.',
          },
        },
      ],
    },
    {
      kind: 'say',
      id: 'ha_s5',
      nudge: 'Close it and thank him warmly.',
      line: {
        native: 'To, shikenan Alhaji. Na gode ƙwarai!',
        phonetic: 'toh, shee-keh-nahn ahl-hah-jee. nah goh-deh kwah-rye!',
        en: 'Alright, that settles it Alhaji. Thank you very much!',
      },
      chunks: ['ha_to_shikenan', 'ha_alhaji', 'ha_na_gode', 'ha_kwarai'],
      rapportDelta: 20,
      reactions: {
        firstTry: {
          native: 'Madalla! Allah ya albarkace ka. Sai an jima!',
          phonetic: 'mah-dahl-lah! ahl-lah yah ahl-bahr-kah-cheh kah. sigh ahn jee-mah!',
          en: 'Wonderful! May God bless you. Until next time!',
        },
        retry: {
          native: 'Madalla. Allah ya kiyaye.',
          phonetic: 'mah-dahl-lah. ahl-lah yah kee-yah-yeh.',
          en: 'Wonderful. May God protect you.',
        },
        missedCritical: {
          native: 'To. Na gode.',
          phonetic: 'toh. nah goh-deh.',
          en: 'Alright. Thank you.',
        },
        skipped: {
          native: 'To, sai an jima.',
          phonetic: 'toh, sigh ahn jee-mah.',
          en: 'Alright, until next time.',
        },
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// AKAN (Twi) — Auntie Akosua, Kejetia Market, Kumasi
//
// This encounter opens on HER, not on the coach: in Akan the lesson is the
// reply, so she has to greet before the learner has anything to do.
// ---------------------------------------------------------------------------

export const AKAN_ENCOUNTER: Encounter = {
  id: 'enc_kejetia_kente',
  scenarioId: 'kejetia_kente',
  languageId: 'akan',
  title: 'Buying kente from Auntie Akosua',
  goal: 'Answer her greeting the way you answer an elder woman, ask her price, bargain, and close.',
  startingRapport: 40,
  startingPrice: 450,
  outro:
    'You answered an elder woman’s greeting the way Akan requires, bargained for kente, and closed warmly — in Twi.',
  steps: [
    {
      kind: 'trader',
      id: 'ak_s1',
      line: {
        native: 'Maakye, me ba! Bra bɛhwɛ me kente.',
        phonetic: 'mah-cheh, meh bah! brah beh-shweh meh ken-teh.',
        en: 'Good morning, my child! Come and look at my kente.',
      },
      note: 'She greets you first. In Akan, how you answer depends on who she is.',
    },
    {
      kind: 'say',
      id: 'ak_s2',
      nudge:
        'Answer her greeting. Akan marks the reply for the person: “Yaa ɛna” to an older woman, “Yaa agya” to an older man, “Yaa nua” to someone your own age. All three are good Twi — only one is right for Auntie Akosua.',
      line: {
        native: 'Yaa ɛna, Auntie',
        phonetic: 'yah eh-nah, ahn-tee',
        en: 'Yes, mother — Auntie.',
      },
      chunks: ['ak_yaa_ena', 'ak_auntie'],
      rapportDelta: 15,
      reactions: {
        firstTry: {
          native: 'Ɛyɛ! Wo nim kasa. Bra, bɛhwɛ.',
          phonetic: 'eh-yeh! woh neem kah-sah. brah, beh-shweh.',
          en: 'Good! You know how to speak. Come, take a look.',
        },
        retry: {
          native: 'Aane, saa ara. Yaa ɛna. Ɛyɛ, me ba.',
          phonetic: 'ah-neh, sah ah-rah. yah eh-nah. eh-yeh, meh bah.',
          en: 'Yes, just so — “Yaa ɛna”. Good, my child.',
        },
        missedCritical: {
          native: 'Hmm. Maakye.',
          phonetic: 'hmm. mah-cheh.',
          en: 'Hmm. Good morning.',
        },
        skipped: {
          native: 'Maakye oo.',
          phonetic: 'mah-cheh oh.',
          en: 'Good morning, then.',
        },
      },
    },
    {
      kind: 'say',
      id: 'ak_s3',
      nudge: 'Now ask what the kente costs. Keep “Mepa wo kyɛw” — please — in front of it.',
      line: {
        native: 'Mepa wo kyɛw, kente ntoma yi ɛyɛ sɛn?',
        phonetic: 'meh-pah woh chow, ken-teh n-toh-mah yee eh-yeh sen?',
        en: 'Please, how much is this kente cloth?',
      },
      chunks: ['ak_mepa_wo_kyew', 'ak_kente', 'ak_yi', 'ak_eye_sen'],
      rapportDelta: 10,
      reactions: {
        firstTry: {
          native: 'Ɛyɛ Cedi ahanan ne aduonum. Me nsa na ɛnwenee.',
          phonetic: 'eh-yeh seh-dee ah-hah-nahn neh ah-dwoh-noom. meh n-sah nah en-weh-neh.',
          en: 'It is four hundred and fifty cedis. I wove it with my own hands.',
        },
        retry: {
          native: 'Aane. Cedi ahanan ne aduonum.',
          phonetic: 'ah-neh. seh-dee ah-hah-nahn neh ah-dwoh-noom.',
          en: 'Yes. Four hundred and fifty cedis.',
        },
        missedCritical: {
          native: 'Cedi ahanan ne aduonum.',
          phonetic: 'seh-dee ah-hah-nahn neh ah-dwoh-noom.',
          en: 'Four hundred and fifty cedis.',
        },
        skipped: {
          native: 'Cedi ahanan ne aduonum na ɛyɛ.',
          phonetic: 'seh-dee ah-hah-nahn neh ah-dwoh-noom nah eh-yeh.',
          en: 'It is four hundred and fifty cedis.',
        },
      },
    },
    {
      kind: 'choose',
      id: 'ak_s4',
      nudge:
        'She is asking GH₵450, and she wove it herself over three weeks. How you open matters: insult the cloth and she will defend it before she talks money.',
      options: [
        {
          id: 'ak_c_insult',
          label: 'Say the cloth is nothing special — GH₵200',
          line: {
            native: 'Ntoma yi nyɛ fɛ saa. Cedi ahanu.',
            phonetic: 'n-toh-mah yee n-yeh feh sah. seh-dee ah-hah-noo.',
            en: 'This cloth is not that fine. Two hundred cedis.',
          },
          rapportDelta: -10,
          price: 420,
          reaction: {
            native: 'Hwɛ yiye! Me nsa na ɛnwenee, dapɛn mmiɛnsa. Cedi ahanan ne aduonu.',
            phonetic: 'shweh yee-yeh! meh n-sah nah en-weh-neh, dah-pen m-mee-en-sah. seh-dee ah-hah-nahn neh ah-dwoh-noo.',
            en: 'Look properly! I wove it by hand, three weeks. Four hundred and twenty.',
          },
        },
        {
          id: 'ak_c_fair',
          label: 'Praise the weaving, then ask her to come down',
          line: {
            native: 'Ɛyɛ fɛ paa, Auntie. Nanso ɛyɛ den — mepa wo kyɛw, te so kakra.',
            phonetic: 'eh-yeh feh pah, ahn-tee. nahn-soh eh-yeh den — meh-pah woh chow, teh soh kah-krah.',
            en: 'It is very beautiful, Auntie. But it is steep — please bring it down a little.',
          },
          rapportDelta: 12,
          price: 320,
          reaction: {
            native: 'Wo ani tew! Ɛnna wo ne me kasa yie. Cedi ahasa ne aduonu.',
            phonetic: 'woh ah-nee tew! en-nah woh neh meh kah-sah yee-eh. seh-dee ah-hah-sah neh ah-dwoh-noo.',
            en: 'You have a good eye! And you spoke to me well. Three hundred and twenty.',
          },
        },
        {
          id: 'ak_c_high',
          label: 'Offer GH₵400 — barely a bargain',
          line: {
            native: 'Mepa wo kyɛw, gye Cedi ahanan.',
            phonetic: 'meh-pah woh chow, jeh seh-dee ah-hah-nahn.',
            en: 'Please, take four hundred cedis.',
          },
          rapportDelta: 5,
          price: 400,
          reaction: {
            native: 'Ɛyɛ, me ba. Cedi ahanan. Medaase.',
            phonetic: 'eh-yeh, meh bah. seh-dee ah-hah-nahn. meh-dah-seh.',
            en: 'Alright, my child. Four hundred. Thank you.',
          },
        },
      ],
    },
    {
      kind: 'say',
      id: 'ak_s5',
      nudge: 'Close it and thank her. “paa” after “Medaase” is what makes it warm rather than brisk.',
      line: {
        native: 'Ɛyɛ, Auntie. Medaase paa!',
        phonetic: 'eh-yeh, ahn-tee. meh-dah-seh pah!',
        en: 'Alright, Auntie. Thank you very much!',
      },
      chunks: ['ak_eye', 'ak_auntie', 'ak_medaase', 'ak_paa'],
      rapportDelta: 20,
      reactions: {
        firstTry: {
          native: 'Nyame nhyira wo, me ba. Bra bio oo!',
          phonetic: 'n-yah-meh n-shee-rah woh, meh bah. brah bee-oh oh!',
          en: 'God bless you, my child. Do come again!',
        },
        retry: {
          native: 'Medaase, me ba. Bra bio.',
          phonetic: 'meh-dah-seh, meh bah. brah bee-oh.',
          en: 'Thank you, my child. Come again.',
        },
        missedCritical: {
          native: 'Ɛyɛ. Medaase.',
          phonetic: 'eh-yeh. meh-dah-seh.',
          en: 'Alright. Thank you.',
        },
        skipped: {
          native: 'Ɛyɛ oo.',
          phonetic: 'eh-yeh oh.',
          en: 'Alright then.',
        },
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// KISWAHILI — Kevo, a matatu conductor, Kencom stage, Nairobi
//
// Not a market. There is no haggling ritual to work through and no elder to
// defer to: the whole exchange happens through a doorway while the vehicle is
// already rolling. The lesson is register in the other direction — "Shikamoo",
// the greeting every beginner learns first, is wrong for a man in his
// twenties — and the practical spine is the four things a passenger actually
// has to do: greet, name the destination, settle the fare, get off in time.
// ---------------------------------------------------------------------------

export const SWAHILI_ENCOUNTER: Encounter = {
  id: 'enc_nairobi_matatu',
  scenarioId: 'nairobi_matatu',
  languageId: 'swahili',
  title: 'Catching a matatu to Westlands',
  goal: 'Greet the conductor as a peer rather than an elder, say where you are going, settle the fare, and get off where you meant to.',
  startingRapport: 40,
  startingPrice: 100,
  outro:
    'You flagged a matatu, pitched the greeting at a young conductor instead of an elder, knew what the fare should be, and got off where you meant to — in Kiswahili.',
  steps: [
    {
      kind: 'trader',
      id: 'sw_s1',
      line: {
        native: 'Westi! Westi! Ingia haraka!',
        phonetic: 'wes-tee! wes-tee! in-gee-ah hah-rah-kah!',
        en: 'Westlands! Westlands! Get in, quickly!',
      },
      note: 'He is hanging out of the doorway calling the route. He is a young man, about your age — which decides how you greet him.',
    },
    {
      kind: 'say',
      id: 'sw_s2',
      nudge:
        'Greet him. Swahili pitches this by age: “Shikamoo” to an elder, “Sasa” or “Niaje” to someone your own age. “Shikamoo” is the first greeting most learners are taught, and here it is the wrong one — it lands like calling a twenty-year-old sir.',
      // The tail is not decoration. Synthesis clips the last word of a short
      // line, and "Sasa, kondakta?" came back as "Sasa," — losing the word the
      // step teaches. "Habari yako?" is natural here and gives the clip
      // something expendable to take.
      line: {
        native: 'Sasa, kondakta? Habari yako leo?',
        phonetic: 'sah-sah, kon-dahk-tah? hah-bah-ree yah-koh leh-oh?',
        en: 'How’s it, conductor? How are you today?',
      },
      chunks: ['sw_sasa', 'sw_kondakta', 'sw_habari_yako'],
      rapportDelta: 12,
      reactions: {
        firstTry: {
          native: 'Poa! Unaenda wapi?',
          phonetic: 'poh-ah! oo-nah-en-dah wah-pee?',
          en: 'Cool! Where are you going?',
        },
        retry: {
          native: 'Poa sana. Sasa niambie, unaenda wapi?',
          phonetic: 'poh-ah sah-nah. sah-sah nee-ahm-bee-eh, oo-nah-en-dah wah-pee?',
          en: 'Very cool. Now tell me, where are you going?',
        },
        missedCritical: {
          native: 'Mimi si mzee, bwana! Sasa niambie, unaenda wapi?',
          phonetic: 'mee-mee see m-zeh, bwah-nah! sah-sah nee-ahm-bee-eh, oo-nah-en-dah wah-pee?',
          en: 'I’m not an old man, my friend! Now tell me, where are you going?',
        },
        skipped: {
          native: 'Unaenda wapi?',
          phonetic: 'oo-nah-en-dah wah-pee?',
          en: 'Where are you going?',
        },
      },
    },
    {
      kind: 'say',
      id: 'sw_s3',
      nudge:
        'Tell him where you are going. “Naenda” is “I am going” and the destination follows it directly — no preposition, nothing in between.',
      line: {
        native: 'Naenda Westlands, tafadhali.',
        phonetic: 'nah-en-dah west-lahndz, tah-fah-dah-lee.',
        en: 'I’m going to Westlands, please.',
      },
      chunks: ['sw_naenda', 'sw_tafadhali'],
      rapportDelta: 10,
      reactions: {
        firstTry: {
          native: 'Sawa, ingia. Nauli ni mia moja.',
          phonetic: 'sah-wah, in-gee-ah. nah-oo-lee nee mee-ah moh-jah.',
          en: 'Okay, get in. The fare is one hundred.',
        },
        retry: {
          native: 'Sawa kabisa. Nauli ni mia moja, bwana.',
          phonetic: 'sah-wah kah-bee-sah. nah-oo-lee nee mee-ah moh-jah, bwah-nah.',
          en: 'Alright then. The fare is one hundred, my friend.',
        },
        missedCritical: {
          native: 'Mia moja.',
          phonetic: 'mee-ah moh-jah.',
          en: 'One hundred.',
        },
        skipped: {
          native: 'Ingia. Mia moja.',
          phonetic: 'in-gee-ah. mee-ah moh-jah.',
          en: 'Get in. One hundred.',
        },
      },
    },
    {
      kind: 'choose',
      id: 'sw_s4',
      nudge:
        'He has said a hundred. The usual fare on this route is fifty — but it is raining, and matatu fares climb in the rain. This is not a market: the vehicle is already moving and you have about two seconds.',
      options: [
        {
          id: 'sw_c_pay',
          label: 'Just pay the hundred',
          line: {
            native: 'Sawa, mia moja.',
            phonetic: 'sah-wah, mee-ah moh-jah.',
            en: 'Okay, one hundred.',
          },
          rapportDelta: 0,
          price: 100,
          reaction: {
            native: 'Sawa. Kaa hapo.',
            phonetic: 'sah-wah. kah hah-poh.',
            en: 'Fine. Sit there.',
          },
        },
        {
          id: 'sw_c_know',
          label: 'Point out what it normally costs',
          line: {
            native: 'Si ni hamsini kawaida, bwana?',
            phonetic: 'see nee hahm-see-nee kah-wah-ee-dah, bwah-nah?',
            en: 'Isn’t it fifty normally, my friend?',
          },
          rapportDelta: 12,
          price: 70,
          reaction: {
            native: 'Haha! Unajua mtaa. Sabini, ni mvua.',
            phonetic: 'hah-hah! oo-nah-joo-ah m-tah. sah-bee-nee, nee m-voo-ah.',
            en: 'Haha! You know the area. Seventy — it’s the rain.',
          },
        },
        {
          id: 'sw_c_argue',
          label: 'Refuse and demand fifty',
          line: {
            native: 'Hapana! Hamsini tu!',
            phonetic: 'hah-pah-nah! hahm-see-nee too!',
            en: 'No! Fifty only!',
          },
          rapportDelta: -8,
          price: 80,
          reaction: {
            native: 'Unaona mvua? Themanini, au shuka.',
            phonetic: 'oo-nah-oh-nah m-voo-ah? theh-mah-nee-nee, ow shoo-kah.',
            en: 'Do you see the rain? Eighty, or get off.',
          },
        },
      ],
    },
    {
      kind: 'say',
      id: 'sw_s5',
      nudge:
        'This is the sentence worth owning. “Nishushe hapa” — drop me here. Say it a stop early: by the time he has heard you and banged the roof, you have passed it.',
      line: {
        native: 'Nishushe hapa, tafadhali.',
        phonetic: 'nee-shoo-sheh hah-pah, tah-fah-dah-lee.',
        en: 'Drop me here, please.',
      },
      chunks: ['sw_nishushe', 'sw_hapa', 'sw_tafadhali'],
      rapportDelta: 18,
      reactions: {
        firstTry: {
          native: 'Sawa! Dere, shukisha! Karibu tena.',
          phonetic: 'sah-wah! deh-reh, shoo-kee-shah! kah-ree-boo teh-nah.',
          en: 'Okay! Driver, let them down! Come again.',
        },
        retry: {
          native: 'Dere, shukisha! Sawa, shuka.',
          phonetic: 'deh-reh, shoo-kee-shah! sah-wah, shoo-kah.',
          en: 'Driver, let them down! Okay, get off.',
        },
        missedCritical: {
          native: 'Shuka.',
          phonetic: 'shoo-kah.',
          en: 'Get off.',
        },
        skipped: {
          native: 'Wapi? Sawa, shuka hapa.',
          phonetic: 'wah-pee? sah-wah, shoo-kah hah-pah.',
          en: 'Where? Fine, get off here.',
        },
      },
    },
  ],
};

export const ENCOUNTERS: Record<string, Encounter> = {
  balogun_tomatoes: YORUBA_ENCOUNTER,
  kano_leather: HAUSA_ENCOUNTER,
  kejetia_kente: AKAN_ENCOUNTER,
  nairobi_matatu: SWAHILI_ENCOUNTER,
};

export function getEncounter(scenarioId: string): Encounter | null {
  return ENCOUNTERS[scenarioId] ?? null;
}
