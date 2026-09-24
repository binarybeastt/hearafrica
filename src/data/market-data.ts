import { Umbrella, MarketBuilding, Pedestrian, NPC } from '@/types';
import { rng, inWater } from './lagos-data';

export const MK = { lon: 3.3875, lat: 6.4577 };

export const M = (x: number, y: number): [number, number] => [
  MK.lon + x / 110600,
  MK.lat + y / 110600,
];

export const LX = [-108, -72, -36, 0, 36, 72, 108];
export const LY = [-80, -48, -16, 16, 48, 80];

export const UMB: Umbrella[] = [];
export const BLD: MarketBuilding[] = [];

{
  const R = rng(3);
  const pal: [string, string][] = [
    ['#F2A1CB', '#F7EFE2'],
    ['#11663F', '#F6B82C'],
    ['#F28A2E', '#F7EFE2'],
    ['#8C8A2B', '#F2A1CB'],
    ['#F6B82C', '#11663F'],
    ['#9A5A38', '#F6B82C'],
    ['#E0609F', '#F6B82C'],
  ];

  for (let i = 0; i < LX.length - 1; i++) {
    for (let j = 0; j < LY.length - 1; j++) {
      const cx = (LX[i] + LX[i + 1]) / 2,
        cy = (LY[j] + LY[j + 1]) / 2;
      for (const ox of [-8.5, 0, 8.5]) {
        for (const oy of [-7.5, 7.5]) {
          if (R() < 0.12) continue;
          UMB.push({
            x: cx + ox + (R() - 0.5) * 2,
            y: cy + oy + (R() - 0.5) * 2,
            r: 3.6 + R() * 1.2,
            c: pal[Math.floor(R() * pal.length)],
            a: R() * 6,
          });
        }
      }
    }
  }

  const roofs = [
    '#9A5A38',
    '#B8683A',
    '#8C8A2B',
    '#C77B3B',
    '#6F4A30',
    '#11663F',
    '#E0609F',
  ];

  for (let x = -340; x <= 340; x += 26) {
    for (let y = -300; y <= 300; y += 24) {
      if (Math.abs(x) < 132 && Math.abs(y) < 98) continue;
      if (R() < 0.1) continue;
      const [lo, la] = M(x, y);
      if (inWater(lo, la)) continue;
      BLD.push({
        x: x + (R() - 0.5) * 4,
        y: y + (R() - 0.5) * 4,
        w: 15 + R() * 8,
        h: 13 + R() * 8,
        c: roofs[Math.floor(R() * roofs.length)],
        ridge: R() < 0.5,
      });
    }
  }
}

export const PEOPLE: Pedestrian[] = [];
{
  const R = rng(5);
  const cl = [
    '#F2A1CB',
    '#11663F',
    '#F6B82C',
    '#F28A2E',
    '#8C8A2B',
    '#F7EFE2',
    '#E0609F',
    '#1E8A55',
  ];
  for (let i = 0; i < 170; i++) {
    const a = Math.floor(R() * LX.length),
      b = Math.floor(R() * LY.length);
    PEOPLE.push({
      a,
      b,
      na: a,
      nb: b,
      t: 1,
      v: 0.9 + R() * 0.7,
      c: cl[Math.floor(R() * cl.length)],
      off: (R() - 0.5) * 3,
    });
  }
}

export const NPCS: Record<string, NPC> = {
  bisi: {
    name: 'Iya Bisi',
    role: 'Sells tomatoes and pepper. Older woman.',
    x: -30.5,
    y: 1,
    elder: true,
    female: true,
    base: 2000,
    wrap: '#E0609F',
    cloth: '#F6B82C',
  },
  tunde: {
    name: 'Tunde',
    role: 'Sells ankara fabric. About your age.',
    x: 41.5,
    y: -31,
    elder: false,
    female: false,
    base: 5000,
    wrap: null,
    cloth: '#11663F',
  },
  musa: {
    name: 'Alhaji Musa',
    role: 'Sells leather goods and dates. Elder Hausa merchant.',
    x: 0,
    y: 0,
    elder: true,
    female: false,
    base: 3500,
    wrap: '#F7EFE2',
    cloth: '#11663F',
  },
  akosua: {
    name: 'Auntie Akosua',
    role: 'Weaves and sells kente. Elder Ashanti woman.',
    x: -18,
    y: 4,
    elder: true,
    female: true,
    base: 450,
    wrap: '#E8B10A',
    cloth: '#118A4E',
  },
  kevo: {
    name: 'Kevo',
    role: 'Matatu conductor on the Westlands route. About your age.',
    x: 0,
    y: 0,
    elder: false,
    female: false,
    base: 100,
    wrap: null,
    cloth: '#E8412F',
  },
  chioma: {
    name: 'Mama Chioma',
    role: 'Sells prime stockfish and spices. Elder Igbo merchant.',
    x: 0,
    y: 0,
    elder: true,
    female: true,
    base: 4500,
    wrap: '#F6B82C',
    cloth: '#D44A28',
  },
};
