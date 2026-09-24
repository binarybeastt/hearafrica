export interface LanguageRegion {
  id: 'yoruba' | 'hausa' | 'igbo' | 'akan' | 'swahili';
  name: string;
  nativeName: string;
  speakers: string;
  countries: string[];
  color: string;
  fillColor: string;
  accentColor: string;
  tagline: string;
  description: string;
  linguisticFamily: string;
  stateIds: string[]; // references Admin1Region.id
  boundaryHull: number[]; // [lon, lat, lon, lat, ...]
  center: [number, number];
}

export const LANGUAGE_REGIONS: Record<string, LanguageRegion> = {
  yoruba: {
    id: 'yoruba',
    name: 'Yorùbá',
    nativeName: 'Èdè Yorùbá',
    speakers: '45–50 Million',
    countries: ['Nigeria', 'Benin', 'Togo'],
    color: '#d44a28',
    fillColor: 'rgba(212, 74, 40, 0.22)',
    accentColor: '#f38258',
    tagline: 'Living culture spanning three West African nations across colonial borders',
    description:
      'Languages do not stop at national borders. Over 45 million Yorùbá speakers reside across Southwest Nigeria, Southern Benin Republic, and Eastern Togo. The 1884 Berlin Conference drew arbitrary colonial boundaries directly through historical Yorùbá kingdoms such as Kétou (Ketu) and Ṣabẹ (Sabe).',
    linguisticFamily: 'Niger-Congo (Volta-Niger)',
    stateIds: [
      'NG_LAGOS',
      'NG_OGUN',
      'NG_OYO',
      'NG_OSUN',
      'NG_ONDO',
      'NG_EKITI',
      'NG_KWARA',
      'NG_KOGI',
      'BEN_OU_M_',
      'BEN_PLATEAU',
      'BEN_COLLINES',
      'BEN_ZOU',
      'BEN_ATLANTIQUE',
      'BEN_LITTORAL',
    ],
    boundaryHull: [
      1.5, 6.2,
      1.5, 8.8,
      2.5, 9.4,
      4.2, 9.3,
      5.8, 8.6,
      6.8, 8.0,
      6.8, 7.0,
      6.1, 6.2,
      4.8, 5.8,
      3.4, 6.3,
      2.6, 6.2,
      1.5, 6.2,
    ],
    center: [3.8, 7.5],
  },
  hausa: {
    id: 'hausa',
    name: 'Hausa',
    nativeName: 'Harshen Hausa',
    speakers: '80–85 Million',
    countries: ['Nigeria', 'Niger', 'Ghana', 'Cameroon', 'Chad'],
    color: '#c48938',
    fillColor: 'rgba(196, 137, 56, 0.22)',
    accentColor: '#e0a85a',
    tagline: 'The premier indigenous trade lingua franca across West Africa and the Sahel',
    description:
      'The Hausa homeland (Kasar Hausa) straddles the Nigeria-Niger international border. It is spoken as a first language by over 55 million people and as a primary trade lingua franca by another 30 million throughout West Africa and Sahel caravan routes.',
    linguisticFamily: 'Afroasiatic (Chadic)',
    stateIds: [
      'NG_KANO',
      'NG_KADUNA',
      'NG_KATSINA',
      'NG_SOKOTO',
      'NG_KEBBI',
      'NG_ZAMFARA',
      'NG_JIGAWA',
      'NG_BAUCHI',
      'NG_GOMBE',
      'NG_YOBE',
      'NG_NIGER',
      'NER_MARADI',
      'NER_ZINDER',
      'NER_TAHOUA',
      'NER_DOSSO',
    ],
    boundaryHull: [
      3.5, 11.5,
      3.5, 14.5,
      6.5, 15.2,
      10.0, 15.0,
      12.8, 14.2,
      13.5, 12.0,
      11.5, 10.0,
      8.0, 9.2,
      5.5, 10.0,
      3.5, 11.5,
    ],
    center: [8.5, 12.2],
  },
  igbo: {
    id: 'igbo',
    name: 'Igbo',
    nativeName: 'Asụsụ Igbo',
    speakers: '40–45 Million',
    countries: ['Nigeria', 'Diaspora'],
    color: '#388e3c',
    fillColor: 'rgba(56, 142, 60, 0.22)',
    accentColor: '#66bb6a',
    tagline: 'Rainforest commercial heartland celebrated for republican enterprise and art',
    description:
      'The ancestral homeland of the Igbo people (Ala Igbo) spans Southeastern Nigeria across the lower Niger River. Famed for historic bronze artistry (Igbo-Ukwu), vibrant market towns (Onitsha, Aba), and democratic village republics.',
    linguisticFamily: 'Niger-Congo (Volta-Niger)',
    stateIds: [
      'NG_ANAMBRA',
      'NG_IMO',
      'NG_ENUGU',
      'NG_ABIA',
      'NG_EBONYI',
      'NG_DELTA',
      'NG_RIVERS',
    ],
    boundaryHull: [
      5.8, 4.8,
      5.8, 6.8,
      6.8, 7.3,
      8.2, 7.0,
      8.4, 5.5,
      7.6, 4.5,
      6.5, 4.5,
      5.8, 4.8,
    ],
    center: [7.1, 5.9],
  },
  akan: {
    id: 'akan',
    name: 'Akan',
    nativeName: 'Twi / Fante',
    speakers: '20–25 Million',
    countries: ['Ghana', "Côte d'Ivoire"],
    color: '#d49b18',
    fillColor: 'rgba(212, 155, 24, 0.22)',
    accentColor: '#fbc02d',
    tagline: 'Golden heritage of the Ashanti, Fante, and Baoulé peoples',
    description:
      'Akan is the predominant linguistic group of Ghana and extends westward across the border into Eastern Côte d’Ivoire among the Baoulé and Agni. Renowned for adinkra symbols, kente weaving, and the historic Ashanti Golden Stool.',
    linguisticFamily: 'Niger-Congo (Kwa)',
    // These must match the ids in geo-admin1.ts exactly. Ghana's carry a
    // _REGION suffix that Nigeria's do not, and without it none of the Akan
    // states matched, so the sphere never drew.
    stateIds: [
      'GH_ASHANTI_REGION',
      'GH_EASTERN_REGION',
      'GH_CENTRAL_REGION',
      'GH_WESTERN_REGION',
      'GH_GREATER_ACCRA_REGION',
      'GH_AHAFO_REGION',
      'GH_BONO_REGION',
      'GH_BONO_EAST_REGION',
      'GH_WESTERN_NORTH_REGION',
    ],
    boundaryHull: [
      -3.8, 5.0,
      -3.8, 7.8,
      -2.0, 8.5,
      0.2, 7.5,
      0.8, 5.8,
      -0.2, 5.5,
      -2.0, 4.8,
      -3.8, 5.0,
    ],
    center: [-1.4, 6.6],
  },
  swahili: {
    id: 'swahili',
    name: 'Kiswahili',
    nativeName: 'Kiswahili',
    speakers: 'Over 100 Million',
    countries: [
      'Tanzania',
      'Kenya',
      'DR Congo',
      'Uganda',
      'Rwanda',
      'Burundi',
      'Mozambique',
      'Comoros',
      'Somalia',
    ],
    color: '#1f8a8a',
    fillColor: 'rgba(31, 138, 138, 0.22)',
    accentColor: '#45b3b3',
    tagline: 'An Indian Ocean trade tongue that outgrew every border it met',
    description:
      'Kiswahili began as the speech of Bantu coastal towns trading across the Indian Ocean, taking Arabic, Persian and later Portuguese vocabulary into a thoroughly Bantu grammar. It then spread inland along the caravan routes far past the coast where it was born, and the sphere below follows that spread rather than any country: it runs from the Bajuni islands of southern Somalia down the Kenyan and Tanzanian coast to northern Mozambique, and inland through Uganda, Rwanda and Burundi to Kisangani and Lubumbashi, where the Congolese variety Kingwana is a first language for millions. Most of its speakers learned it second. It is official in Tanzania, Kenya, Uganda, Rwanda and the DRC, a working language of the African Union, and on Comoros it stands beside the closely related Comorian.',
    linguisticFamily: 'Niger-Congo (Bantu)',
    // Every Kenyan county, and that is the honest answer rather than a
    // shortcut: unlike Yorùbá or Igbo, which have a homeland inside one
    // country, Kiswahili is Kenya's national language and is spoken the whole
    // way across it. The coast is where it is a first language; the rest is
    // where everyone meets in it. Tanzania, Uganda and the DRC have no admin1
    // polygons in this project yet, so their share of the sphere is carried by
    // the hull alone.
    stateIds: [
      'KE_BARINGO', 'KE_BOMET', 'KE_BUNGOMA',
      'KE_BUSIA', 'KE_ELGEYO_MARAKWET', 'KE_EMBU',
      'KE_GARISSA', 'KE_HOMA_BAY', 'KE_ISIOLO',
      'KE_KAJIADO', 'KE_KAKAMEGA', 'KE_KERICHO',
      'KE_KIAMBU', 'KE_KILIFI', 'KE_KIRINYAGA',
      'KE_KISII', 'KE_KISUMU', 'KE_KITUI',
      'KE_KWALE', 'KE_LAIKIPIA', 'KE_LAMU',
      'KE_MACHAKOS', 'KE_MAKUENI', 'KE_MANDERA',
      'KE_MARSABIT', 'KE_MERU', 'KE_MIGORI',
      'KE_MOMBASA', 'KE_MURANG_A', 'KE_NAIROBI',
      'KE_NAKURU', 'KE_NANDI', 'KE_NAROK',
      'KE_NYAMIRA', 'KE_NYANDARUA', 'KE_NYERI',
      'KE_SAMBURU', 'KE_SIAYA', 'KE_TAITA_TAVETA',
      'KE_TANA_RIVER', 'KE_THARAKA', 'KE_TRANS_NZOIA',
      'KE_TURKANA', 'KE_UASIN_GISHU', 'KE_VIHIGA',
      'KE_WAJIR', 'KE_WEST_POKOT',
    ],
    // Deliberately not a union of countries: it cuts through Somalia,
    // Mozambique and the DRC, taking the parts where Kiswahili is actually
    // spoken and leaving the parts where it is not. Comoros sits offshore of
    // the south-east corner and cannot be drawn by a single ring.
    boundaryHull: [
      42.8, -0.3,
      41.9, -2.1,
      40.2, -8.0,
      40.6, -11.0,
      40.9, -14.5,
      38.5, -17.2,
      35.0, -13.5,
      32.0, -13.5,
      27.6, -12.2,
      25.5, -9.0,
      25.0, -4.5,
      24.8, 0.6,
      28.0, 4.2,
      33.0, 5.0,
      35.5, 5.2,
      41.0, 4.0,
      42.8, -0.3,
    ],
    center: [34.5, -4.5],
  },
};
