import { Road, WaterBody, Vehicle, Place } from '@/types';
import { inRing } from './geo-data';
import { lerp } from '@/lib/solar';

export function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LAGOS = { lon: 3.42, lat: 6.49 };

export const WATER: WaterBody[] = [
  {
    k: 'ocean',
    p: [
      3.0, 6.4, 3.3, 6.402, 3.39, 6.404, 3.41, 6.406, 3.43, 6.418, 3.5, 6.425,
      3.62, 6.432, 3.8, 6.44, 3.8, 6.2, 3.0, 6.2,
    ],
  },
  {
    k: 'ch',
    p: [
      3.392, 6.405, 3.41, 6.407, 3.4, 6.425, 3.39, 6.436, 3.384, 6.445, 3.381,
      6.465, 3.368, 6.466, 3.371, 6.445, 3.378, 6.43, 3.385, 6.415,
    ],
  },
  {
    k: 'ck',
    p: [
      3.388, 6.432, 3.42, 6.436, 3.445, 6.438, 3.472, 6.446, 3.472, 6.452,
      3.445, 6.4445, 3.42, 6.4415, 3.389, 6.4395,
    ],
  },
  {
    k: 'lag',
    p: [
      3.368, 6.466, 3.381, 6.465, 3.4, 6.4625, 3.42, 6.459, 3.44, 6.4565,
      3.472, 6.452, 3.52, 6.455, 3.62, 6.46, 3.75, 6.47, 3.75, 6.57, 3.6,
      6.565, 3.5, 6.58, 3.43, 6.59, 3.405, 6.575, 3.395, 6.545, 3.388, 6.51,
      3.383, 6.485, 3.372, 6.474,
    ],
  },
];

export const inWater = (lon: number, lat: number) =>
  WATER.some((w) => inRing(w.p, lon, lat));

export const ROADS: Road[] = [
  {
    n: 'Third Mainland Bridge',
    w: 1.5,
    p: [
      [3.392, 6.462],
      [3.388, 6.475],
      [3.387, 6.49],
      [3.39, 6.51],
      [3.394, 6.53],
      [3.398, 6.55],
      [3.403, 6.567],
      [3.395, 6.58],
      [3.385, 6.595],
    ],
  },
  {
    n: 'Carter Bridge',
    w: 1.1,
    p: [
      [3.39, 6.461],
      [3.379, 6.4635],
      [3.368, 6.468],
      [3.36, 6.475],
    ],
  },
  {
    n: 'Eko Bridge',
    w: 1.1,
    p: [
      [3.392, 6.449],
      [3.38, 6.452],
      [3.368, 6.456],
      [3.356, 6.46],
    ],
  },
  {
    n: 'Ikorodu Road',
    w: 1.1,
    p: [
      [3.36, 6.475],
      [3.37, 6.49],
      [3.375, 6.515],
      [3.378, 6.54],
      [3.385, 6.575],
      [3.4, 6.61],
    ],
  },
  {
    n: 'Ikeja axis',
    w: 1.1,
    p: [
      [3.36, 6.475],
      [3.357, 6.5],
      [3.352, 6.53],
      [3.347, 6.565],
      [3.343, 6.6],
    ],
  },
  {
    n: 'Apapa Road',
    w: 0.9,
    p: [
      [3.356, 6.46],
      [3.35, 6.45],
      [3.358, 6.44],
      [3.37, 6.435],
    ],
  },
  {
    n: 'Falomo Bridge',
    w: 0.9,
    p: [
      [3.43, 6.448],
      [3.428, 6.4365],
      [3.425, 6.43],
    ],
  },
  {
    n: 'Lekki–Epe Expressway',
    w: 1.2,
    p: [
      [3.405, 6.428],
      [3.425, 6.43],
      [3.45, 6.432],
      [3.49, 6.436],
      [3.54, 6.44],
      [3.62, 6.446],
      [3.72, 6.452],
    ],
  },
  {
    n: 'Awolowo Road',
    w: 0.9,
    p: [
      [3.4, 6.45],
      [3.42, 6.449],
      [3.44, 6.448],
      [3.46, 6.447],
    ],
  },
  {
    n: 'Marina',
    w: 0.9,
    p: [
      [3.384, 6.4435],
      [3.395, 6.442],
      [3.41, 6.443],
    ],
  },
  {
    n: 'Island road',
    w: 0.8,
    p: [
      [3.383, 6.452],
      [3.392, 6.452],
      [3.4, 6.451],
      [3.4, 6.45],
    ],
  },
];

ROADS.forEach((r) => {
  r.cum = [0];
  for (let i = 1; i < r.p.length; i++) {
    const a = r.p[i - 1],
      b = r.p[i];
    r.cum.push(r.cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  r.len = r.cum[r.cum.length - 1];
});

export function roadAt(r: Road, d: number): [number, number, number] {
  const len = r.len || 1;
  const cum = r.cum || [0, 1];
  d = ((d % len) + len) % len;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = r.p[i - 1],
    b = r.p[i],
    t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    Math.atan2(-(b[1] - a[1]), b[0] - a[0]),
  ];
}

export const VEH: Vehicle[] = [];
{
  const R = rng(7);
  ROADS.forEach((r, ri) => {
    const len = r.len || 1;
    const n = Math.round(10 + len * 260);
    for (let i = 0; i < n; i++) {
      const u = R();
      VEH.push({
        r: ri,
        d: R() * len,
        dir: R() < 0.5 ? 1 : -1,
        v: 0.0022 + R() * 0.0026,
        t: u < 0.62 ? 'danfo' : u < 0.8 ? 'keke' : 'car',
        o: R(),
      });
    }
  });
}

export const SPECKS: [number, number, number][] = [];
{
  const R = rng(11);
  let n = 0;
  while (SPECKS.length < 2600 && n < 20000) {
    n++;
    const lo = 3.3 + R() * 0.35,
      la = 6.405 + R() * 0.21;
    if (inWater(lo, la)) continue;
    const dense = Math.exp(
      -(((lo - 3.39) ** 2) / 0.004 + ((la - 6.47) ** 2) / 0.003)
    );
    if (R() > 0.35 + dense) continue;
    SPECKS.push([lo, la, R()]);
  }
}

export const LAMPS: [number, number, number][] = [];
ROADS.forEach((r) => {
  const len = r.len || 1;
  for (let d = 0; d < len; d += 0.0045) LAMPS.push(roadAt(r, d));
});

export const DISTRICTS: [string, number, number][] = [
  ['Lagos Island', 3.392, 6.4475],
  ['Ikoyi', 3.44, 6.452],
  ['Victoria Island', 3.425, 6.424],
  ['Lekki', 3.53, 6.434],
  ['Apapa', 3.355, 6.438],
  ['Surulere', 3.348, 6.484],
  ['Yaba', 3.37, 6.505],
  ['Mushin', 3.342, 6.53],
  ['Ikeja', 3.34, 6.605],
];

export const WATERLAB: [string, number, number][] = [
  ['Lagos Lagoon', 3.52, 6.515],
  ['Atlantic Ocean', 3.5, 6.39],
];

export const PLACES: Place[] = [
  {
    id: 'balogun',
    n: 'Balogun Market',
    sub: 'Market scenario: ready',
    lon: 3.3875,
    lat: 6.4577,
    ready: true,
  },
  {
    id: 'obalende',
    n: 'Obalende Motor Park',
    sub: 'Getting around: needs recordings',
    lon: 3.405,
    lat: 6.4485,
  },
  {
    id: 'yaba',
    n: 'Buka in Yaba',
    sub: 'Ordering food: needs recordings',
    lon: 3.378,
    lat: 6.512,
  },
  {
    id: 'surulere',
    n: 'Family home, Surulere',
    sub: 'Meeting the family: needs recordings',
    lon: 3.352,
    lat: 6.492,
  },
];
