import { Road, WaterBody } from '@/types';
import { inRing } from './geo-data';

export const LAGOS_CENTER = { lon: 3.42, lat: 6.49 };

// Realistic Water Bodies: Atlantic Ocean, Lagos Lagoon, Five Cowrie Creek, Commodore Channel, Badagry Creek
export const REAL_LAGOS_WATER: WaterBody[] = [
  // 1. Atlantic Ocean (South of Lagos coastline)
  {
    k: 'ocean',
    p: [
      3.05, 6.405,
      3.15, 6.408,
      3.25, 6.410,
      3.34, 6.412,
      3.395, 6.405, // Light House Beach / Tarkwa Bay entrance
      3.415, 6.418, // Kuramo / Bar Beach VI
      3.460, 6.425, // Elegushi / Lekki Phase 1
      3.550, 6.432, // Chevron / Alpha Beach
      3.650, 6.438, // Ajah / Sangotedo
      3.750, 6.445, // Eleko Beach
      3.750, 6.250,
      3.05, 6.250,
    ],
  },
  // 2. Commodore Channel (Shipping channel into Lagos Harbour)
  {
    k: 'ch',
    p: [
      3.395, 6.405,
      3.412, 6.415,
      3.410, 6.432,
      3.398, 6.442,
      3.385, 6.448,
      3.376, 6.452,
      3.370, 6.448,
      3.376, 6.435,
      3.388, 6.422,
      3.390, 6.410,
    ],
  },
  // 3. Five Cowrie Creek (Waterway between Lagos Island/Ikoyi and Victoria Island)
  {
    k: 'ck',
    p: [
      3.385, 6.440, // MacGregor / Bonny Camp inlet
      3.405, 6.438, // Onikan / Marina south
      3.425, 6.440, // Falomo Bridge crossing
      3.448, 6.446, // Lekki-Ikoyi Link Bridge crossing
      3.475, 6.452, // Lekki Phase 1 / Ikoyi eastern junction
      3.478, 6.458,
      3.445, 6.452,
      3.420, 6.446,
      3.395, 6.445,
      3.385, 6.444,
    ],
  },
  // 4. Lagos Lagoon (The vast inner tidal basin)
  {
    k: 'lag',
    p: [
      // Along Lagos Island northern waterfront
      3.385, 6.463,
      3.395, 6.462,
      3.415, 6.458,
      // Ikoyi northern shore past Banana Island
      3.435, 6.456,
      3.458, 6.460, // Banana Island perimeter
      3.468, 6.465,
      3.462, 6.472,
      3.440, 6.470,
      // East towards Lekki Lagoon
      3.520, 6.475,
      3.620, 6.490,
      3.720, 6.510,
      3.750, 6.550,
      3.720, 6.590,
      // Northern shore: Ikorodu to Majidun
      3.550, 6.615,
      3.480, 6.605,
      3.430, 6.590, // Kosofe / Ketu shore
      3.405, 6.575, // Oworonshoki (northern anchor of Third Mainland Bridge)
      3.392, 6.540, // UNILAG / Akoka waterfront
      3.385, 6.505, // Makoko / Ebute Metta stilt waters
      3.375, 6.480, // Iddo Island / Carter bridge approach
      3.376, 6.468,
    ],
  },
  // 5. Badagry Creek / Porto-Novo Creek (West of Apapa towards Satellite town)
  {
    k: 'badagry_creek',
    p: [
      3.365, 6.442,
      3.340, 6.445,
      3.300, 6.448,
      3.240, 6.452,
      3.180, 6.450,
      3.180, 6.460,
      3.250, 6.462,
      3.320, 6.458,
      3.355, 6.454,
    ],
  },
];

export const inRealWater = (lon: number, lat: number) =>
  REAL_LAGOS_WATER.some((w) => inRing(w.p, lon, lat));

// Authentic Lagos Road Network & Iconic Bridges
export const REAL_LAGOS_ROADS: Road[] = [
  // Third Mainland Bridge (11.8 km from Oworonshoki over open lagoon to Lagos Island)
  {
    n: 'Third Mainland Bridge',
    w: 2.0,
    p: [
      [3.395, 6.570], // Oworonshoki interchange
      [3.398, 6.555],
      [3.396, 6.535], // Over open lagoon
      [3.393, 6.512],
      [3.390, 6.490],
      [3.388, 6.475],
      [3.392, 6.462], // Adeniji Adele interchange (Lagos Island)
    ],
  },
  // Carter Bridge (Historic connection from Iddo/Ebute Metta to Idumota/Balogun)
  {
    n: 'Carter Bridge',
    w: 1.6,
    p: [
      [3.375, 6.478], // Iddo
      [3.380, 6.472],
      [3.385, 6.464], // Idumota / Balogun market entry
    ],
  },
  // Eko Bridge (Connects Costain/Surulere to CMS/Marina)
  {
    n: 'Eko Bridge',
    w: 1.8,
    p: [
      [3.365, 6.482], // Costain / National Theatre
      [3.370, 6.475],
      [3.374, 6.466],
      [3.382, 6.453], // Marina / CMS (Lagos Island)
    ],
  },
  // Lekki-Ikoyi Link Bridge (Iconic cable-stayed bridge across Five Cowrie Creek)
  {
    n: 'Lekki-Ikoyi Link Bridge',
    w: 1.7,
    p: [
      [3.443, 6.455], // Alexander Ave, Ikoyi
      [3.446, 6.452], // Cable-stayed pylon tower
      [3.450, 6.448], // Admiralty Way, Lekki Phase 1
    ],
  },
  // Falomo Bridge (Between Ikoyi and Victoria Island)
  {
    n: 'Falomo Bridge',
    w: 1.5,
    p: [
      [3.424, 6.444], // Awolowo Rd, Ikoyi
      [3.426, 6.438], // Ozumba Mbadiwe, VI
    ],
  },
  // Ikorodu Road (Mainland spine through Yaba, Maryland, Ketu)
  {
    n: 'Ikorodu Road',
    w: 1.6,
    p: [
      [3.375, 6.478],
      [3.372, 6.500], // Yaba
      [3.368, 6.525], // Fadeyi
      [3.365, 6.550], // Anthony
      [3.368, 6.575], // Maryland
      [3.380, 6.600], // Ojota
      [3.410, 6.620], // Ketu
    ],
  },
  // Funsho Williams / Western Avenue (Surulere spine)
  {
    n: 'Western Avenue',
    w: 1.5,
    p: [
      [3.365, 6.482], // Costain
      [3.358, 6.500], // Ojuelegba (Surulere)
      [3.355, 6.525], // Stadium
    ],
  },
  // Lekki-Epe Expressway (Spine of Lekki Peninsula)
  {
    n: 'Lekki-Epe Expressway',
    w: 1.8,
    p: [
      [3.426, 6.438], // Victoria Island / Ozumba Mbadiwe
      [3.455, 6.440], // Lekki Toll Gate / Phase 1
      [3.500, 6.442], // Jakande / Ikate
      [3.560, 6.448], // Chevron / VGC
      [3.620, 6.455], // Ajah
      [3.700, 6.465], // Sangotedo
    ],
  },
  // Marina / Broad Street Loop (Lagos Island waterfront)
  {
    n: 'Marina Ring Road',
    w: 1.4,
    p: [
      [3.382, 6.453], // CMS
      [3.392, 6.450], // Marina south
      [3.402, 6.452], // Onikan / TBS
      [3.405, 6.458], // Obalende connector
      [3.395, 6.462], // Adeniji Adele
    ],
  },
  // Lagos-Badagry Expressway (Mainland West)
  {
    n: 'Lagos-Badagry Expressway',
    w: 1.7,
    p: [
      [3.365, 6.482], // Orile Iganmu
      [3.330, 6.468], // Mile 2
      [3.280, 6.462], // Festac Town
      [3.220, 6.460], // Trade Fair / Alaba
      [3.150, 6.458], // Okokomaiko / LASU
    ],
  },
];

// District labels & points of interest
export const REAL_DISTRICTS = [
  { n: 'LAGOS ISLAND', lon: 3.392, lat: 6.456, sz: 14, prio: 1 },
  { n: 'VICTORIA ISLAND', lon: 3.426, lat: 6.428, sz: 13, prio: 1 },
  { n: 'IKOYI', lon: 3.438, lat: 6.450, sz: 13, prio: 1 },
  { n: 'BANANA ISLAND', lon: 3.456, lat: 6.465, sz: 11, prio: 2 },
  { n: 'YABA', lon: 3.376, lat: 6.512, sz: 12, prio: 2 },
  { n: 'SURULERE', lon: 3.355, lat: 6.498, sz: 12, prio: 2 },
  { n: 'LEKKI PHASE 1', lon: 3.468, lat: 6.445, sz: 12, prio: 2 },
  { n: 'APAPA WHARF', lon: 3.365, lat: 6.442, sz: 11, prio: 3 },
  { n: 'EBUTE METTA', lon: 3.380, lat: 6.488, sz: 11, prio: 3 },
  { n: 'OWORONSHOKI', lon: 3.395, lat: 6.565, sz: 11, prio: 3 },
  { n: 'TARKWA BAY', lon: 3.392, lat: 6.402, sz: 10, prio: 3 },
];

export const REAL_WATER_LABELS = [
  { n: 'ATLANTIC OCEAN', lon: 3.38, lat: 6.32, sz: 16, rot: 0 },
  { n: 'LAGOS LAGOON', lon: 3.45, lat: 6.52, sz: 14, rot: -0.05 },
  { n: 'FIVE COWRIE CREEK', lon: 3.435, lat: 6.442, sz: 9, rot: 0.1 },
  { n: 'COMMODORE CHANNEL', lon: 3.395, lat: 6.425, sz: 9, rot: 1.2 },
];
