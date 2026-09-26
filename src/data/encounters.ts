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

import { GREET } from './dialogue';

/** Part of the day, as the world clock buckets it: morning, afternoon, evening. */
export type DayPart = 'm' | 'a' | 'e';

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
      /** A coach note shown with her reply: something worth noticing in it. */
      afterNote?: string;
      /** She answers slowly, e.g. when the learner has asked her to repeat. */
      slowReply?: boolean;
      /**
       * Said from memory: the line stays hidden until the learner asks for it,
       * and only these chunks (the new words) are shown as tiles meanwhile.
       */
      recall?: { hintChunks: string[] };
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

/**
 * The greeting follows the world clock, so it is built for the part of the day
 * the learner walks up in, from the same table the clock card reads.
 */
const YORUBA_GREETING_CHUNK: Record<DayPart, string> = { m: 'yo_kaaro', a: 'yo_kaasan', e: 'yo_kaale' };

function yorubaEncounter(part: DayPart): Encounter {
  const greet = GREET[part];
  return {
    id: 'enc_balogun_tomatoes',
    scenarioId: 'balogun_tomatoes',
    languageId: 'yoruba',
    title: 'Buying a basket of tomatoes from Iya Bisi',
    goal: 'Greet her properly, ask how she sells, bargain for a basket, and close with your jàra.',
    startingRapport: 40,
    startingPrice: 60000,
    outro:
      'You greeted an elder and her trade, asked how she sells, got her to repeat herself, bargained for a basket, asked for peppers on your own, and got your jàra — in Yorùbá.',
    // Revised with a Lagos Yorùbá speaker: prices are said in English inside
    // Yorùbá, as they are at Balogun, and she speaks to the learner as the elder
    // ("o", not "Ẹ"). The prices themselves are estimates, not quotes.
    steps: [
      {
        kind: 'say',
        id: 'yo_s2',
        nudge: `You have walked up to Iya Bisi’s stall, and it is ${greet.part}. Greet her before anything else — going straight to business would be rude. She is an elder woman, so the respect marker "Ẹ" and the honorific "ma" are not optional.`,
        line: {
          native: `${greet.resp} ma`,
          phonetic: `eh ${GREETING_PHONETIC[part]} mah`,
          en: `${greet.en}, ma.`,
        },
        chunks: ['yo_e', YORUBA_GREETING_CHUNK[part], 'yo_ma'],
        rapportDelta: 15,
        // True of every reply she can give, including the curt ones.
        afterNote: `Notice what she said back: "${greet.cas}", with no "Ẹ". The elder drops the respect marker for the younger person — and when she is pleased with you, she calls you "ọmọ mi", my child. You never drop it for her.`,
        reactions: {
          firstTry: {
            native: `${greet.cas} ọmọ mi, ṣé dáadáa ni?`,
            phonetic: `${GREETING_PHONETIC[part]} aw-maw mee, sheh dah-ah-dah-ah nee?`,
            en: `${greet.en}, my child. Are you well?`,
          },
          retry: {
            native: `Yẹn ni! ${greet.cas} ọmọ mi. Ṣé dáadáa ni?`,
            phonetic: `yen nee! ${GREETING_PHONETIC[part]} aw-maw mee. sheh dah-ah-dah-ah nee?`,
            en: `That's it! ${greet.en}, my child. Are you well?`,
          },
          missedCritical: {
            native: `Mm. ${greet.cas}.`,
            phonetic: `mm. ${GREETING_PHONETIC[part]}.`,
            en: `Mm. ${greet.en}.`,
          },
          skipped: {
            native: `${greet.cas}. Ṣé dáadáa ni?`,
            phonetic: `${GREETING_PHONETIC[part]}. sheh dah-ah-dah-ah nee?`,
            en: `${greet.en}. Are you well?`,
          },
        },
      },
      {
        kind: 'say',
        id: 'yo_s2b',
        nudge:
          'She asked if you are well. Answer her — and greet her trade too. At the market you wish a trader well with "Ẹ kú ọjà", roughly "well done with the trading".',
        line: {
          native: 'Dáadáa ni ma. Ẹ kú ọjà o!',
          phonetic: 'dah-ah-dah-ah nee mah. eh koo aw-jah oh!',
          en: 'I am well, ma. Well done with the trading!',
        },
        chunks: ['yo_daadaa_ni', 'yo_ma', 'yo_e', 'yo_ku_oja'],
        rapportDelta: 10,
        reactions: {
          firstTry: {
            native: 'O ṣé o, ọmọ mi! Kí lo fẹ́ rà?',
            phonetic: 'oh sheh oh, aw-maw mee! kee loh feh rah?',
            en: 'Thank you, my child! What would you like to buy?',
          },
          retry: {
            native: 'O ṣé o. Kí lo fẹ́ rà?',
            phonetic: 'oh sheh oh. kee loh feh rah?',
            en: 'Thank you. What would you like to buy?',
          },
          missedCritical: {
            native: 'Mm. Kí lo fẹ́ rà?',
            phonetic: 'mm. kee loh feh rah?',
            en: 'Mm. What do you want?',
          },
          skipped: {
            native: 'Kí lo fẹ́ rà?',
            phonetic: 'kee loh feh rah?',
            en: 'What would you like to buy?',
          },
        },
      },
      {
        kind: 'say',
        id: 'yo_s3',
        nudge:
          'Now ask how she sells her tomatoes. She sells several measures at different prices, so ask how she sells them rather than the price of one thing. Keep "Ẹ jọ̀ọ́" — please — in front.',
        line: {
          native: 'Ẹ jọ̀ọ́ ma, báwo lẹ ṣe lé tòmátì yín?',
          phonetic: 'eh jaw-aw mah, bah-woh leh sheh leh toh-mah-tee yeen?',
          en: 'Please ma, how are you selling your tomatoes?',
        },
        chunks: ['yo_ejoo', 'yo_ma', 'yo_bawo_le_se_le', 'yo_tomati_yin'],
        rapportDelta: 10,
        reactions: {
          firstTry: {
            native:
              'Eléyìí jẹ́ five hundred, paint kan jẹ́ four thousand, agbọ̀n kan jẹ́ sixty thousand. Tòmátì tí a ṣẹ̀ṣẹ̀ kó dé láàárọ̀ yìí ni o!',
            phonetic:
              'eh-leh-yee jeh five hundred, paint kahn jeh four thousand, ahg-bawn kahn jeh sixty thousand. toh-mah-tee tee ah sheh-sheh koh deh lah-ah-raw yee nee oh!',
            en: 'This one is ₦500, a paint is ₦4,000, a basket is ₦60,000. These just came in from the farm this morning!',
          },
          retry: {
            native: 'Bẹ́ẹ̀ ni. Eléyìí jẹ́ five hundred, paint kan jẹ́ four thousand, agbọ̀n kan jẹ́ sixty thousand.',
            phonetic: 'beh-eh nee. eh-leh-yee jeh five hundred, paint kahn jeh four thousand, ahg-bawn kahn jeh sixty thousand.',
            en: 'That is right. This one is ₦500, a paint is ₦4,000, a basket is ₦60,000.',
          },
          missedCritical: {
            native: 'Agbọ̀n kan jẹ́ sixty thousand.',
            phonetic: 'ahg-bawn kahn jeh sixty thousand.',
            en: 'A basket is ₦60,000.',
          },
          skipped: {
            native: 'Paint kan jẹ́ four thousand, agbọ̀n kan jẹ́ sixty thousand.',
            phonetic: 'paint kahn jeh four thousand, ahg-bawn kahn jeh sixty thousand.',
            en: 'A paint is ₦4,000, a basket is ₦60,000.',
          },
        },
      },
      {
        kind: 'say',
        id: 'yo_s3b',
        nudge:
          'She rattled that off fast. Whether or not you caught it all, this is the phrase to have ready: ask her to say it again. It is polite, not a failure.',
        line: {
          native: 'Ẹ jọ̀ọ́ ma, ẹ tún un sọ.',
          phonetic: 'eh jaw-aw mah, eh toon oon saw.',
          en: 'Please ma, say it again.',
        },
        chunks: ['yo_ejoo', 'yo_ma', 'yo_tun_un_so'],
        rapportDelta: 5,
        slowReply: true,
        reactions: {
          firstTry: {
            native: 'Ó dáa. Eléyìí, five hundred. Paint kan, four thousand. Agbọ̀n kan, sixty thousand.',
            phonetic: 'oh dah. eh-leh-yee, five hundred. paint kahn, four thousand. ahg-bawn kahn, sixty thousand.',
            en: 'Alright. This one, ₦500. A paint, ₦4,000. A basket, ₦60,000.',
          },
          retry: {
            native: 'Ó dáa. Eléyìí, five hundred. Paint kan, four thousand. Agbọ̀n kan, sixty thousand.',
            phonetic: 'oh dah. eh-leh-yee, five hundred. paint kahn, four thousand. ahg-bawn kahn, sixty thousand.',
            en: 'Alright. This one, ₦500. A paint, ₦4,000. A basket, ₦60,000.',
          },
          missedCritical: {
            native: 'Eléyìí, five hundred. Paint kan, four thousand. Agbọ̀n kan, sixty thousand.',
            phonetic: 'eh-leh-yee, five hundred. paint kahn, four thousand. ahg-bawn kahn, sixty thousand.',
            en: 'This one, ₦500. A paint, ₦4,000. A basket, ₦60,000.',
          },
          skipped: {
            native: 'Eléyìí, five hundred. Paint kan, four thousand. Agbọ̀n kan, sixty thousand.',
            phonetic: 'eh-leh-yee, five hundred. paint kahn, four thousand. ahg-bawn kahn, sixty thousand.',
            en: 'This one, ₦500. A paint, ₦4,000. A basket, ₦60,000.',
          },
        },
      },
      {
        kind: 'choose',
        id: 'yo_s4',
        nudge:
          'You came to Balogun to buy in bulk, so you want the basket — ₦60,000. How do you bargain? It is expected, but how you go about it changes how she takes it.',
        options: [
          {
            id: 'yo_c_low',
            label: 'Offer ₦40,000 — cheeky',
            line: {
              native: 'Hà, ẹ dín in kù ma! Ẹ ṣe é ní forty thousand.',
              phonetic: 'hah, eh deen een koo mah! eh sheh eh nee forty thousand.',
              en: 'Ah, bring it down, ma! Do it for ₦40,000.',
            },
            rapportDelta: -5,
            price: 55000,
            reaction: {
              native: 'Hà hà! Ọmọ mi, ṣé o fẹ́ kí n pàdánù ni? Fifty-five thousand.',
              phonetic: 'hah hah! aw-maw mee, sheh oh feh kee n pah-dah-noo nee? fifty-five thousand.',
              en: 'Ha ha! My child, do you want me to make a loss? ₦55,000.',
            },
          },
          {
            id: 'yo_c_fair',
            label: 'Ask for her last price — the usual move',
            line: {
              native: 'Ó wọ́n díẹ̀ ma. Kí ni last price yín?',
              phonetic: 'oh wawn dee-eh mah. kee nee last price yeen?',
              en: 'It is a bit expensive, ma. What is your last price?',
            },
            rapportDelta: 10,
            price: 50000,
            reaction: {
              native: 'Ọmọ mi, o mọ ọjà! Fifty thousand, last price nìyẹn.',
              phonetic: 'aw-maw mee, oh maw aw-jah! fifty thousand, last price nee-yen.',
              en: 'My child, you know the market! ₦50,000 — that is my last price.',
            },
          },
          {
            id: 'yo_c_high',
            label: 'Offer ₦58,000 — barely a bargain',
            line: {
              native: 'Ẹ jọ̀ọ́ ma, ẹ ṣe é fún mi ní fifty-eight thousand.',
              phonetic: 'eh jaw-aw mah, eh sheh eh foon mee nee fifty-eight thousand.',
              en: 'Please ma, do it for me at ₦58,000.',
            },
            rapportDelta: 5,
            price: 58000,
            reaction: {
              native: 'Ó dáa ọmọ mi, mo gbà. Fifty-eight thousand.',
              phonetic: 'oh dah aw-maw mee, moh gbah. fifty-eight thousand.',
              en: 'Alright my child, I accept. ₦58,000.',
            },
          },
          {
            id: 'yo_c_walk',
            label: 'Walk away — see if she calls you back',
            line: {
              native: 'Ó dáa ma, mo ń lọ.',
              phonetic: 'oh dah mah, moh n law.',
              en: 'Alright ma, I am going.',
            },
            // She does call you back, but asking her last price would have
            // done better: walking away is a gamble, not a trick.
            rapportDelta: 0,
            price: 52000,
            reaction: {
              native: 'Wá, wá! Ọmọ mi, mú u ní fifty-two thousand.',
              phonetic: 'wah, wah! aw-maw mee, moo oo nee fifty-two thousand.',
              en: 'Come, come! My child, take it for ₦52,000.',
            },
          },
        ],
      },
      {
        kind: 'say',
        id: 'yo_s4b',
        nudge:
          'You need peppers for the stew too. You already know how to ask — say it yourself this time. The only new word is "ata", pepper.',
        line: {
          native: 'Ẹ jọ̀ọ́ ma, báwo lẹ ṣe lé ata yín?',
          phonetic: 'eh jaw-aw mah, bah-woh leh sheh leh ah-tah yeen?',
          en: 'Please ma, how are you selling your peppers?',
        },
        chunks: ['yo_ejoo', 'yo_ma', 'yo_bawo_le_se_le', 'yo_ata_yin'],
        recall: { hintChunks: ['yo_ata_yin'] },
        rapportDelta: 10,
        reactions: {
          firstTry: {
            native: 'Ata rodo? Paint kan jẹ́ three thousand. Kí n fi kún un?',
            phonetic: 'ah-tah roh-doh? paint kahn jeh three thousand. kee n fee koon oon?',
            en: 'Scotch bonnets? A paint is ₦3,000. Shall I add it?',
          },
          retry: {
            native: 'Bẹ́ẹ̀ ni. Paint ata kan jẹ́ three thousand. Kí n fi kún un?',
            phonetic: 'beh-eh nee. paint ah-tah kahn jeh three thousand. kee n fee koon oon?',
            en: 'That is right. A paint of peppers is ₦3,000. Shall I add it?',
          },
          missedCritical: {
            native: 'Paint kan jẹ́ three thousand.',
            phonetic: 'paint kahn jeh three thousand.',
            en: 'A paint is ₦3,000.',
          },
          skipped: {
            native: 'Ata? Paint kan jẹ́ three thousand.',
            phonetic: 'ah-tah? paint kahn jeh three thousand.',
            en: 'Peppers? A paint is ₦3,000.',
          },
        },
      },
      {
        kind: 'say',
        id: 'yo_s5',
        nudge:
          'Close it. Agree, ask her to wrap it all for you — and ask for your jàra, the little extra a trader throws in for a good customer. Asking is expected, not greedy.',
        line: {
          native: 'Ó dáa ma, ẹ bá mi dì í. Ẹ jọ̀ọ́, ẹ fi jàra sí i!',
          phonetic: 'oh dah mah, eh bah mee dee ee. eh jaw-aw, eh fee jah-rah see ee!',
          en: 'Alright ma, wrap it up for me. Please, add a little extra!',
        },
        chunks: ['yo_o_daa', 'yo_ma', 'yo_e_ba_mi_di', 'yo_ejoo', 'yo_e_fi_jara'],
        rapportDelta: 20,
        reactions: {
          firstTry: {
            native: 'Mo ti fi jàra sí i. O ṣeun ọmọ mi, máa bọ̀ o!',
            phonetic: 'moh tee fee jah-rah see ee. oh sheh-oon aw-maw mee, mah baw oh!',
            en: 'I have added a little extra. Thank you my child, do come again!',
          },
          retry: {
            native: 'Ó dáa, mo ti fi jàra sí i. Máa bọ̀ o.',
            phonetic: 'oh dah, moh tee fee jah-rah see ee. mah baw oh.',
            en: 'Alright, I have added a little extra. Do come again.',
          },
          missedCritical: {
            native: 'Ó dáa. Mo ti dì í.',
            phonetic: 'oh dah. moh tee dee ee.',
            en: 'Alright. I have wrapped it.',
          },
          skipped: {
            native: 'Mo ti dì í. O ṣeun.',
            phonetic: 'moh tee dee ee. oh sheh-oon.',
            en: 'I have wrapped it. Thank you.',
          },
        },
      },
    ],
  };
}

const GREETING_PHONETIC: Record<DayPart, string> = {
  m: 'kah-ah-raw',
  a: 'kah-ah-sahn',
  e: 'kah-ah-leh',
};

const YORUBA_BY_PART: Record<DayPart, Encounter> = {
  m: yorubaEncounter('m'),
  a: yorubaEncounter('a'),
  e: yorubaEncounter('e'),
};

export const YORUBA_ENCOUNTER: Encounter = YORUBA_BY_PART.m;

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

/**
 * The encounter for a scenario at a given part of the day. Only the Yorùbá
 * greeting varies with the clock; the same object is returned each time, so
 * callers can compare it by identity.
 */
export function getEncounter(scenarioId: string, part: DayPart = 'm'): Encounter | null {
  if (scenarioId === YORUBA_ENCOUNTER.scenarioId) return YORUBA_BY_PART[part];
  return ENCOUNTERS[scenarioId] ?? null;
}

/** Every encounter the app can play, including each time-of-day variant. */
export function allEncounters(): Encounter[] {
  return [...Object.values(YORUBA_BY_PART), ...Object.values(ENCOUNTERS).filter((e) => e !== YORUBA_ENCOUNTER)];
}

/** Every line the lesson can speak aloud: trader lines, targets, reactions and choices. */
export function spokenLines(encounter: Encounter): string[] {
  const lines: string[] = [];
  for (const s of encounter.steps) {
    if (s.kind === 'trader') lines.push(s.line.native);
    else if (s.kind === 'say') {
      lines.push(s.line.native);
      for (const reaction of Object.values(s.reactions)) if (reaction) lines.push(reaction.native);
    } else {
      for (const option of s.options) lines.push(option.line.native, option.reaction.native);
    }
  }
  return lines;
}
