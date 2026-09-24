export interface Camera {
  lon: number;
  lat: number;
  s: number;
}

export interface FlyAnimation {
  from: Camera;
  to: Camera;
  t0: number;
  dur: number;
}

export interface Country {
  c: string; // ISO code, e.g. "NGA", "GHA"
  n: string; // Name, e.g. "Nigeria"
  r: number[][]; // Polygon rings [lon0, lat0, lon1, lat1, ...]
  bb?: [number, number, number, number]; // [minLon, maxLon, minLat, maxLat]
  i?: number; // color tone index
}

export type ViewLevel = 'africa' | 'country' | 'lagos' | 'market';

export interface NPC {
  name: string;
  role: string;
  x: number;
  y: number;
  elder: boolean;
  female: boolean;
  base: number;
  wrap: string | null;
  cloth: string;
}

export interface Place {
  id: string;
  n: string;
  sub: string;
  lon: number;
  lat: number;
  ready?: boolean;
}

import { Landmark } from '@/data/landmarks-data';

export type HoverTarget =
  | { type: 'country'; c: Country }
  | { type: 'lagos' }
  | { type: 'accra' }
  | { type: 'place'; p: Place }
  | { type: 'npc'; id: string }
  | { type: 'landmark'; lm: Landmark };

export interface Vehicle {
  r: number;
  d: number;
  dir: number;
  v: number;
  t: 'danfo' | 'keke' | 'car';
  o: number;
}

export interface Road {
  n: string;
  w: number;
  p: [number, number][];
  cum?: number[];
  len?: number;
}

export interface WaterBody {
  k: string;
  p: number[];
}

export interface Umbrella {
  x: number;
  y: number;
  r: number;
  c: [string, string];
  a: number;
}

export interface MarketBuilding {
  x: number;
  y: number;
  w: number;
  h: number;
  c: string;
  ridge: boolean;
}

export interface Pedestrian {
  a: number;
  b: number;
  na: number;
  nb: number;
  t: number;
  v: number;
  c: string;
  off: number;
}

export interface ConvoMessage {
  id: string;
  sender: 'npc' | 'you' | 'sys';
  yo?: string;
  en?: string;
  text?: string;
  note?: string;
  bad?: boolean;
}

export interface ConvoChoice {
  yo: string;
  en: string;
  act: () => void;
}

export interface ConversationSession {
  id: string;
  np: NPC;
  b: 'm' | 'a' | 'e';
  time: string;
  rap: number;
  price: number | null;
  step: 'greet' | 'ask' | 'bargain' | 'close' | 'done';
  saidNum?: boolean;
  saidWell?: boolean;
  askedPepper?: boolean;
  notes: string[];
  lessons: string[];
}
