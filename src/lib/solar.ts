export const D2R = Math.PI / 180;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const sstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const lagosH = (t: number): number => {
  const d = new Date(t);
  return ((d.getUTCHours() + 1) % 24) + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
};

export const pad = (n: number) => String(n).padStart(2, '0');

export const fmtTime = (t: number): string => {
  const h = lagosH(t);
  return pad(Math.floor(h)) + ':' + pad(Math.floor((h % 1) * 60));
};

export interface SunPosition {
  dec: number;
  lon: number;
}

export function sun(t: number): SunPosition {
  const d = new Date(t);
  const n = (t - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
  const dec = -23.44 * Math.cos((2 * Math.PI * (n + 10)) / 365) * D2R;
  const uh = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  return { dec, lon: (12 - uh) * 15 };
}

export function elev(lat: number, lon: number, sp: SunPosition): number {
  const la = lat * D2R;
  return (
    Math.asin(
      Math.sin(la) * Math.sin(sp.dec) +
        Math.cos(la) * Math.cos(sp.dec) * Math.cos((lon - sp.lon) * D2R)
    ) / D2R
  );
}

export const dark = (el: number): number => (el >= 0 ? 0 : el <= -10 ? 1 : -el / 10);

export const bucket = (h: number): 'm' | 'a' | 'e' =>
  h >= 4 && h < 12 ? 'm' : h >= 12 && h < 16 ? 'a' : 'e';

export function marketAct(h: number): number {
  if (h < 6 || h >= 20) return 0;
  if (h < 9) return sstep(6, 9, h);
  if (h < 16) return 1;
  return 1 - sstep(16, 19.8, h);
}

export function trafficAct(h: number): number {
  return clamp(
    0.12 +
      0.55 * Math.exp(-((h - 8) ** 2) / 2) +
      0.6 * Math.exp(-((h - 18) ** 2) / 3) +
      0.35 * (h > 9 && h < 17 ? 1 : 0),
    0.08,
    1
  );
}

export const stallsOpen = (h: number): boolean => h >= 6.5 && h < 19.5;

export const npcHere = (h: number): boolean => h >= 7 && h < 19;
