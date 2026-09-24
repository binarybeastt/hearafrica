export type LandmarkZoomLevel = 'country' | 'city';
export type LandmarkStatus = 'ready' | 'locked' | 'orientation';

export interface Landmark {
  id: string;
  name: string;
  locationName: string;
  lon: number;
  lat: number;
  zoomLevel: LandmarkZoomLevel;
  status: LandmarkStatus;
  description: string;
  tag?: string;
  scenarioId?: string;
  navTarget?: string;
}

export const LANDMARKS: Landmark[] = [
  // --- Country Zoom Landmarks ---
  {
    id: 'national_theatre',
    name: 'National Arts Theatre',
    locationName: 'Lagos, Nigeria',
    lon: 3.368,
    lat: 6.482,
    zoomLevel: 'country',
    status: 'ready',
    tag: 'FESTAC 77 Icon',
    description:
      'Completed in 1976 for FESTAC 77. The iconic hat-shaped cultural palace features circular concrete colonnades and a crown-shaped roof.',
    navTarget: 'lagos',
  },
  {
    id: 'cocoa_house',
    name: 'Cocoa House',
    locationName: 'Ibadan, Oyo State',
    lon: 3.882,
    lat: 7.388,
    zoomLevel: 'country',
    status: 'ready',
    tag: 'First Skyscraper',
    description:
      'Built in 1965 entirely from regional cocoa export wealth. At 26 storeys, it was the first skyscraper constructed in tropical Africa.',
  },
  {
    id: 'dye_pits',
    name: 'Kofar Mata & Kurmi Market',
    locationName: 'Kano, Kano State',
    lon: 8.520,
    lat: 11.990,
    zoomLevel: 'country',
    status: 'ready',
    tag: '⚡ Hausa Scenario',
    scenarioId: 'kano_leather',
    description:
      'Founded in 1498 AD. Historic trans-Saharan trade caravan terminus. Step inside to bargain in authentic Hausa with Alhaji Musa!',
  },
  {
    id: 'onitsha_market',
    name: 'Onitsha Main Market (Ahia Ọtụ)',
    locationName: 'Onitsha, Anambra State',
    lon: 6.780,
    lat: 6.150,
    zoomLevel: 'country',
    status: 'ready',
    tag: '⚡ Igbo Scenario',
    scenarioId: 'onitsha_stockfish',
    description:
      'Bustling commercial giant on the bank of the River Niger. Practice energetic market haggling in authentic Igbo with Mama Chioma!',
  },
  {
    id: 'national_mosque',
    name: 'Abuja National Mosque',
    locationName: 'Abuja, FCT',
    lon: 7.490,
    lat: 9.060,
    zoomLevel: 'country',
    status: 'ready',
    tag: 'Golden Dome',
    description:
      'National monument in the federal capital with an expansive golden central dome and four 120-meter pencil minarets.',
  },
  {
    id: 'independence_arch',
    name: 'Independence Arch',
    locationName: 'Accra, Ghana',
    lon: -0.190,
    lat: 5.550,
    zoomLevel: 'country',
    status: 'ready',
    tag: 'Black Star Square',
    description:
      'Commissioned by Kwame Nkrumah in 1957. Crowned with the Black Star of Africa, symbolizing Pan-African sovereignty and freedom.',
  },

  {
    id: 'kejetia_market',
    name: 'Kejetia Market',
    locationName: 'Kumasi, Ghana',
    lon: -1.618,
    lat: 6.696,
    zoomLevel: 'country',
    status: 'ready',
    scenarioId: 'kejetia_kente',
    tag: 'Kente & Ashanti gold',
    description:
      'The largest open-air market in West Africa, at the heart of Ashanti Kumasi. A sea of rusted zinc roofs over thousands of stalls.',
  },

  // --- City Zoom Landmarks (Lagos) ---
  {
    id: 'balogun_market',
    name: 'Balogun Market',
    locationName: 'Lagos Island',
    lon: 3.385,
    lat: 6.455,
    zoomLevel: 'city',
    status: 'ready',
    tag: 'Active Scenario',
    description:
      'West Africa’s grandest textile hub. Shaded by vibrant umbrellas with endless bolts of lace, ankara, and lively negotiations.',
    scenarioId: 'balogun',
    navTarget: 'market',
  },
  {
    id: 'kencom_stage',
    name: 'Kencom Stage',
    locationName: 'Nairobi CBD, Kenya',
    lon: 36.826,
    lat: -1.286,
    zoomLevel: 'country',
    status: 'ready',
    tag: 'Matatu Terminus',
    description:
      'The downtown terminus where Westlands and Ngong Road matatus load. Conductors hang from the doors calling routes over the engines.',
    scenarioId: 'nairobi_matatu',
  },
  {
    id: 'obalende_danfo',
    name: 'Obalende Motor Park',
    locationName: 'Lagos Island',
    lon: 3.415,
    lat: 6.450,
    zoomLevel: 'city',
    status: 'ready',
    tag: 'Transit Hub',
    description:
      'The bustling nerve center of yellow Danfo buses and conductors calling passengers heading across the lagoon.',
    scenarioId: 'danfo',
  },
  {
    id: 'yaba_buka',
    name: 'Yaba Buka (Mama Put)',
    locationName: 'Yaba Tech District',
    lon: 3.376,
    lat: 6.512,
    zoomLevel: 'city',
    status: 'ready',
    tag: 'Culinary Scene',
    description:
      'Famous roadside canteen serving piping hot amala, gbegiri, and jollof rice with animated rising steam.',
    scenarioId: 'buka',
  },
  {
    id: 'surulere_compound',
    name: 'Surulere Family Compound',
    locationName: 'Surulere Residential',
    lon: 3.355,
    lat: 6.498,
    zoomLevel: 'city',
    status: 'ready',
    tag: 'Family Life',
    description:
      'Classic Afro-Brazilian colonial compound house with terracotta hip roof, louvered verandas, and warm family hospitality.',
    scenarioId: 'family',
  },
  {
    id: 'lekki_ikoyi_bridge',
    name: 'Lekki–Ikoyi Link Bridge',
    locationName: 'Five Cowrie Creek',
    lon: 3.446,
    lat: 6.452,
    zoomLevel: 'city',
    status: 'orientation',
    tag: 'Orientation Landmark',
    description:
      'West Africa’s first cable-stayed bridge. 1.36km span crossing Five Cowrie Creek, connecting Ikoyi to Lekki Phase 1.',
  },
  {
    id: 'third_mainland_bridge',
    name: 'Third Mainland Bridge',
    locationName: 'Lagos Lagoon',
    lon: 3.393,
    lat: 6.512,
    zoomLevel: 'city',
    status: 'orientation',
    tag: 'Orientation Landmark',
    description:
      '11.8km concrete viaduct sweeping across the open waters of Lagos Lagoon, the primary lifeline between Mainland and Island.',
  },
];
