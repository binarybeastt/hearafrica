'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Camera, FlyAnimation, HoverTarget, ViewLevel, Country, Place } from '@/types';
import { READY, TONES, CITIES } from '@/data/geo-data';
import { REAL_AFRICA_COUNTRIES, REAL_OTHER_LAND } from '@/data/geo-africa';
import { ADMIN1_REGIONS } from '@/data/geo-admin1';
import { LANGUAGE_REGIONS } from '@/data/language-regions';
import {
  REAL_LAGOS_WATER,
  REAL_LAGOS_ROADS,
  REAL_DISTRICTS,
  REAL_WATER_LABELS,
  LAGOS_CENTER,
} from '@/data/lagos-real';
import { LANDMARKS, Landmark } from '@/data/landmarks-data';
import { renderLandmark, findLandmarkAt } from '@/components/landmarks';
import {
  SPECKS,
  LAMPS,
  PLACES,
  roadAt,
  VEH,
} from '@/data/lagos-data';
import { MK, M, LX, LY, UMB, BLD, PEOPLE, NPCS } from '@/data/market-data';
import {
  clamp,
  lerp,
  sstep,
  lagosH,
  sun,
  elev,
  dark,
  trafficAct,
  marketAct,
  stallsOpen,
  npcHere,
} from '@/lib/solar';

interface WorldCanvasProps {
  simT: number;
  activeLanguage?: string | null;
  onSimTick: (dt: number) => void;
  onHoverChange: (target: HoverTarget | null, pos: { x: number; y: number }) => void;
  onLevelChange: (level: ViewLevel, curCountry: Country | null) => void;
  onSunElevationChange: (el: number) => void;
  onCountrySelect: (c: Country) => void;
  onLagosSelect: () => void;
  onPlaceSelect: (p: Place) => void;
  onNpcSelect: (npcId: string) => void;
  onToast: (msg: string) => void;
  onLandmarkSelect?: (lm: Landmark) => void;
  initialFly?: boolean;
  navTarget?: string | null;
  /** Skips drawing while the 3D market covers the map entirely. */
  paused?: boolean;
  onNavComplete?: () => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  simT,
  activeLanguage = 'yoruba',
  onSimTick,
  onHoverChange,
  onLevelChange,
  onSunElevationChange,
  onCountrySelect,
  onLagosSelect,
  onPlaceSelect,
  onNpcSelect,
  onToast,
  onLandmarkSelect,
  navTarget,
  paused = false,
  onNavComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera state
  const camRef = useRef<Camera>({ lon: 18, lat: 2, s: 6 });
  const flyRef = useRef<FlyAnimation | null>(null);

  // Screen size & DPR
  const sizeRef = useRef<{ W: number; H: number; DPR: number }>({
    W: 0,
    H: 0,
    DPR: 1,
  });

  // Hover & pointers
  const hoverRef = useRef<HoverTarget | null>(null);
  const ptrsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch0Ref = useRef<{ d: number; s: number } | null>(null);
  const dragMovedRef = useRef<number>(0);

  // Night offscreen canvas
  const nightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper coordinate transforms
  const P = useCallback((lon: number, lat: number): [number, number] => {
    const { W, H } = sizeRef.current;
    const cam = camRef.current;
    return [(lon - cam.lon) * cam.s + W / 2, -(lat - cam.lat) * cam.s + H / 2];
  }, []);

  const U = useCallback((x: number, y: number): [number, number] => {
    const { W, H } = sizeRef.current;
    const cam = camRef.current;
    return [(x - W / 2) / cam.s + cam.lon, -(y - H / 2) / cam.s + cam.lat];
  }, []);

  const clampCam = useCallback(() => {
    const cam = camRef.current;
    cam.lon = clamp(cam.lon, -25, 60);
    cam.lat = clamp(cam.lat, -40, 40);
  }, []);

  const zoomAt = useCallback(
    (x: number, y: number, f: number) => {
      const { W, H } = sizeRef.current;
      const cam = camRef.current;
      const [lo, la] = U(x, y);
      cam.s = clamp(cam.s * f, 3, 700000);
      cam.lon = lo - (x - W / 2) / cam.s;
      cam.lat = la + (y - H / 2) / cam.s;
      clampCam();
    },
    [U, clampCam]
  );

  /**
   * How much of the Lagos city detail applies at this camera position. The
   * layer used to be gated on zoom alone, so flying to Kumasi at city zoom
   * drew Lagos's roads and water at Lagos's coordinates — off screen — and
   * left Ghana looking empty.
   */
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Keep the hidden map inert rather than relying on stacking order alone.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.pointerEvents = paused ? 'none' : 'auto';
  }, [paused]);

  const lagosProximity = useCallback((lon: number, lat: number): number => {
    const d = Math.hypot(lon - LAGOS_CENTER.lon, lat - LAGOS_CENTER.lat);
    // Full detail within ~1.2°, gone by ~3°.
    return 1 - sstep(1.2, 3, d);
  }, []);

  const getView = useCallback((k: string): Camera => {
    const { W, H } = sizeRef.current;
    const V: Record<string, [number, number, number, number, number]> = {
      africa: [18, 4, 76, 76, 0.95],
      nigeria: [8.4, 9.2, 12.5, 10.5, 0.9],
      ghana: [-1.1, 7.9, 4.6, 7, 0.85],
      kenya: [37.9, 0.4, 9.5, 10.2, 0.85],
      lagos: [LAGOS_CENTER.lon, LAGOS_CENTER.lat, 0.32, 0.20, 1],
      kumasi: [-1.618, 6.696, 0.32, 0.2, 1],
      'nairobi-city': [36.826, -1.286, 0.32, 0.2, 1],
      market: [MK.lon, MK.lat, 0.0026, 0.0019, 1],
      // Kejetia, Kumasi — the same zoom depth, so the level still reads as
      // 'market' and the 3D world takes over.
      kejetia: [-1.618, 6.696, 0.0026, 0.0019, 1],
      // Kencom stage, Nairobi. Same depth again: it is not a market, but it is
      // a 3D world, and 'market' is the level that hands off to one.
      nairobi: [36.826, -1.286, 0.0026, 0.0019, 1],
    };
    const target = V[k] || V.africa;
    return {
      lon: target[0],
      lat: target[1],
      s: Math.min((W || 800) / target[2], (H || 600) / target[3]) * target[4],
    };
  }, []);

  const flyTo = useCallback((v: Camera, dur?: number) => {
    const cam = camRef.current;
    flyRef.current = {
      from: { lon: cam.lon, lat: cam.lat, s: cam.s },
      to: v,
      t0: performance.now(),
      dur: dur || 1700,
    };
  }, []);

  // Handle programmatic navigation from props
  useEffect(() => {
    if (navTarget) {
      flyTo(getView(navTarget));
      if (onNavComplete) onNavComplete();
    }
  }, [navTarget, getView, flyTo, onNavComplete]);

  // Initial mount & resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    nightCanvasRef.current = document.createElement('canvas');

    const handleResize = () => {
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      const W = window.innerWidth;
      const H = window.innerHeight;
      sizeRef.current = { W, H, DPR };
      canvas.width = W * DPR;
      canvas.height = H * DPR;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Start with overview fly animation
    const v0 = getView('africa');
    camRef.current.lon = v0.lon + 8;
    camRef.current.lat = v0.lat - 4;
    camRef.current.s = v0.s * 0.45;
    flyTo(v0, 2600);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [getView, flyTo]);

  // Point in polygon ring
  const inRing = useCallback((r: number[], lon: number, lat: number): boolean => {
    let inside = false;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i], yi = r[i + 1];
      const xj = r[j], yj = r[j + 1];
      const intersect =
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Real country at lon/lat
  const countryAtCoord = useCallback((lon: number, lat: number): Country | null => {
    for (const c of REAL_AFRICA_COUNTRIES) {
      if (lon < c.bbox[0] || lon > c.bbox[2] || lat < c.bbox[1] || lat > c.bbox[3]) continue;
      for (const ring of c.r) {
        if (inRing(ring, lon, lat)) {
          return { c: c.c, n: c.n, r: c.r, bb: c.bbox };
        }
      }
    }
    return null;
  }, [inRing]);

  // Pick / Hit testing
  const pick = useCallback(
    (x: number, y: number): HoverTarget | null => {
      const s = camRef.current.s;
      const currentLevel: 'africa' | 'country' | 'city' | 'market' =
        s < 22 ? 'africa' : s < 650 ? 'country' : s < 45000 ? 'city' : 'market';
      const aCity =
        sstep(260, 650, s) *
        lagosProximity(camRef.current.lon, camRef.current.lat);
      const h = lagosH(simT);

      // 1. Check Balogun Market NPCs
      if (currentLevel === 'market' && npcHere(h)) {
        for (const id in NPCS) {
          const c = NPCS[id];
          const [px, py] = P(...M(c.x, c.y));
          if (Math.hypot(px - x, py - y) < Math.max(30, (5 * s) / 110600)) {
            return { type: 'npc', id };
          }
        }
      }

      // 2. Check City Level Illustrated Landmarks
      if (currentLevel === 'city') {
        const cityLm = findLandmarkAt(LANDMARKS, 'city', P, x, y);
        if (cityLm) {
          return { type: 'landmark', lm: cityLm };
        }
      }

      // 3. Check Places
      if (currentLevel === 'city' || currentLevel === 'market') {
        for (const p of PLACES) {
          const [px, py] = P(p.lon, p.lat);
          if (Math.hypot(px - x, py - y) < 22) {
            return { type: 'place', p };
          }
        }
      }

      // 4. Check Country Level Illustrated Landmarks
      if (currentLevel === 'country') {
        const countryLm = findLandmarkAt(LANDMARKS, 'country', P, x, y);
        if (countryLm) {
          return { type: 'landmark', lm: countryLm };
        }
      }

      // 5. Country Level overview
      if (aCity < 0.5) {
        if (s >= 18) {
          const [px, py] = P(LAGOS_CENTER.lon, LAGOS_CENTER.lat);
          if (Math.hypot(px - x, py - y) < 26) return { type: 'lagos' };
          const [ax, ay] = P(-0.19, 5.6);
          if (Math.hypot(ax - x, ay - y) < 16) return { type: 'accra' };
        }
        const [lo, la] = U(x, y);
        const c = countryAtCoord(lo, la);
        if (c) return { type: 'country', c };
      }

      return null;
    },
    [P, U, simT, countryAtCoord, lagosProximity]
  );

  const doHover = useCallback(
    (x: number, y: number) => {
      const hit = pick(x, y);
      hoverRef.current = hit;
      if (canvasRef.current) {
        canvasRef.current.classList.toggle('hot', !!hit);
      }
      onHoverChange(hit, { x, y });
    },
    [pick, onHoverChange]
  );

  const handleClick = useCallback(
    (x: number, y: number) => {
      const hit = pick(x, y);
      if (!hit) return;

      if (hit.type === 'landmark') {
        const lm = hit.lm;
        if (lm.navTarget) {
          flyTo(getView(lm.navTarget));
        } else if (lm.scenarioId === 'balogun') {
          flyTo(getView('market'), 2200);
          onPlaceSelect({
            id: 'balogun',
            n: 'Balogun Market',
            sub: 'Fabric and fashion epicenter',
            lon: 3.385,
            lat: 6.455,
            ready: true,
          });
        } else if (lm.status === 'ready') {
          onToast(`${lm.name}: ${lm.description}`);
          if (onLandmarkSelect) onLandmarkSelect(lm);
        } else {
          onToast(`${lm.name}: ${lm.description}`);
        }
      } else if (hit.type === 'country') {
        if (hit.c.c === 'NGA') {
          flyTo(getView('nigeria'));
          onCountrySelect(hit.c);
        } else if (hit.c.c === 'GHA') {
          flyTo(getView('ghana'));
          onToast(
            'Twi speakers in Accra and Kumasi are recording now. Lagos is ready to explore.'
          );
        } else if (hit.c.c === 'KEN') {
          flyTo(getView('kenya'));
          onToast('Nairobi is ready. Find the matatu stage to practise Kiswahili.');
        } else {
          onToast(
            `${hit.c.n} isn't recorded yet. Speakers can add their voice to light it up.`
          );
        }
      } else if (hit.type === 'lagos') {
        flyTo(getView('lagos'), 2000);
        onLagosSelect();
      } else if (hit.type === 'accra') {
        onToast('Accra is still being recorded.');
      } else if (hit.type === 'place') {
        if (hit.p.ready) {
          flyTo(getView('market'), 2200);
          onPlaceSelect(hit.p);
        } else {
          onToast(
            `${hit.p.n}: this scenario needs native speakers to record it first.`
          );
        }
      } else if (hit.type === 'npc') {
        onNpcSelect(hit.id);
      }
    },
    [
      pick,
      flyTo,
      getView,
      onCountrySelect,
      onLagosSelect,
      onPlaceSelect,
      onNpcSelect,
      onToast,
      onLandmarkSelect,
    ]
  );

  // Main animation frame loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let hudTime = 0;

    const ringPath = (ctx: CanvasRenderingContext2D, r: number[]) => {
      const cam = camRef.current;
      const { W, H } = sizeRef.current;
      for (let i = 0; i < r.length; i += 2) {
        const x = (r[i] - cam.lon) * cam.s + W / 2;
        const y = -(r[i + 1] - cam.lat) * cam.s + H / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    /**
     * @param bb [minLat, minLon, maxLat, maxLon] — the order every call site
     *   passes. The comparisons previously paired latitudes against
     *   longitudes, which culled Ghana entirely: its minLat of 4.71 was tested
     *   against the view's right-edge longitude of 4.66 and read as
     *   "off-screen to the right". Nigeria's numbers happened not to trip it.
     */
    const isVisible = (bb: [number, number, number, number], m: number) => {
      const { W, H } = sizeRef.current;
      const [leftLon, topLat] = U(-m, -m);
      const [rightLon, bottomLat] = U(W + m, H + m);
      const [minLat, minLon, maxLat, maxLon] = bb;
      return !(
        maxLon < leftLon ||
        minLon > rightLon ||
        maxLat < bottomLat ||
        minLat > topLat
      );
    };

    const glowDot = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      col: string,
      a: number
    ) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col.replace('A', String(a)));
      g.addColorStop(1, col.replace('A', '0'));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const drawLabel = (
      ctx: CanvasRenderingContext2D,
      t: string,
      x: number,
      y: number,
      o: {
        font: string;
        align?: CanvasTextAlign;
        halo?: number;
        haloC?: string;
        a?: number;
        c?: string;
      }
    ) => {
      ctx.font = o.font;
      ctx.textAlign = o.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.halo || 4;
      ctx.strokeStyle = o.haloC || 'rgba(29,21,16,.85)';
      ctx.globalAlpha = o.a ?? 1;
      ctx.strokeText(t, x, y);
      ctx.fillStyle = o.c || '#F3E9D6';
      ctx.fillText(t, x, y);
      ctx.globalAlpha = 1;
    };

    const drawWaves = (
      ctx: CanvasRenderingContext2D,
      now: number,
      s: number,
      W: number,
      H: number
    ) => {
      const a = 0.18 * (1 - sstep(300, 700, s));
      if (a <= 0) return;
      ctx.strokeStyle = `rgba(247,239,226,${a})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const step = 46;
      const off = (now / 90) % step;
      for (let y = -step; y < H + step; y += step) {
        for (let x = -step; x < W + step; x += step * 2) {
          const xx = x + ((y / step) % 2 ? step : 0) + off;
          const yy = y;
          ctx.beginPath();
          ctx.moveTo(xx, yy);
          ctx.quadraticCurveTo(xx + 7, yy - 5, xx + 14, yy);
          ctx.quadraticCurveTo(xx + 21, yy + 5, xx + 28, yy);
          ctx.stroke();
        }
      }
    };

    const drawNight = (
      ctx: CanvasRenderingContext2D,
      sp: { dec: number; lon: number },
      W: number,
      H: number
    ) => {
      const nightC = nightCanvasRef.current;
      if (!nightC) return;
      const nctx = nightC.getContext('2d');
      if (!nctx) return;

      // A hidden or collapsed viewport reports 0 × 0; there is nothing to shade.
      if (!(W > 0 && H > 0 && Number.isFinite(W) && Number.isFinite(H))) return;
      const gw = 72;
      const gh = Math.max(8, Math.round((72 * H) / W));
      if (nightC.width !== gw || nightC.height !== gh) {
        nightC.width = gw;
        nightC.height = gh;
      }

      const img = nctx.createImageData(gw, gh);
      const d = img.data;
      for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) {
          const [lo, la] = U(((i + 0.5) * W) / gw, ((j + 0.5) * H) / gh);
          const el = elev(la, lo, sp);
          const k = (j * gw + i) * 4;
          if (el < 0) {
            const dk = dark(el);
            d[k] = 34;
            d[k + 1] = 14;
            d[k + 2] = 30;
            d[k + 3] = Math.round(dk * 0.66 * 255);
          } else if (el < 8) {
            const g = 1 - el / 8;
            d[k] = 255;
            d[k + 1] = 140;
            d[k + 2] = 60;
            d[k + 3] = Math.round(g * 0.16 * 255);
          }
        }
      }
      nctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(nightC, 0, 0, W, H);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Update simulation time
      onSimTick(dt);

      // Camera flight step
      const fly = flyRef.current;
      if (fly) {
        const u = clamp((now - fly.t0) / fly.dur, 0, 1);
        const e =
          u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        const a = fly.from;
        const b = fly.to;
        const ls = lerp(Math.log(a.s), Math.log(b.s), e);
        const s = Math.exp(ls);
        let w = e;
        if (Math.abs(Math.log(b.s / a.s)) > 0.2) {
          w = (1 / a.s - 1 / s) / (1 / a.s - 1 / b.s);
        }
        camRef.current.s = s;
        camRef.current.lon = lerp(a.lon, b.lon, w);
        camRef.current.lat = lerp(a.lat, b.lat, w);
        if (u >= 1) flyRef.current = null;
      }

      // Update vehicles and pedestrians
      const h = lagosH(simT);
      const tf = 0.6 + trafficAct(h) * 0.6;
      const vs = Math.min(1, 6000 / camRef.current.s);
      for (const v of VEH) {
        v.d += v.dir * v.v * dt * tf * vs;
      }

      const act = marketAct(h);
      const nPeople = Math.round(PEOPLE.length * act);
      for (let i = 0; i < nPeople; i++) {
        const p = PEOPLE[i];
        const seg =
          Math.hypot(LX[p.na] - LX[p.a], LY[p.nb] - LY[p.b]) || 1;
        p.t += (p.v * dt * 3) / seg;
        if (p.t >= 1) {
          p.a = p.na;
          p.b = p.nb;
          p.t = 0;
          const opts: [number, number][] = [];
          if (p.a > 0) opts.push([p.a - 1, p.b]);
          if (p.a < LX.length - 1) opts.push([p.a + 1, p.b]);
          if (p.b > 0) opts.push([p.a, p.b - 1]);
          if (p.b < LY.length - 1) opts.push([p.a, p.b + 1]);
          const o = opts[Math.floor(Math.random() * opts.length)];
          p.na = o[0];
          p.nb = o[1];
        }
      }

      // RENDER — skipped entirely while the 3D market covers the map. The
      // simulation above still ticks so the clock and crowds stay coherent.
      // Input is disabled with it: a click that reached the hidden map used to
      // fly the camera away and open the wrong city's conversation on top.
      const canvas = pausedRef.current ? null : canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { W, H, DPR } = sizeRef.current;
          const cam = camRef.current;
          const s = cam.s;
          const sp = sun(simT);
          const near = lagosProximity(cam.lon, cam.lat);
          const aCity = sstep(260, 650, s) * near;
          const aMk = sstep(26000, 60000, s) * near;
          const hover = hoverRef.current;

          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

          // Ocean background
          ctx.fillStyle = '#11663F';
          ctx.fillRect(0, 0, W, H);
          drawWaves(ctx, now, s, W, H);

          if (aCity < 1) {
            ctx.globalAlpha = 1;

            // Graticule
            const ga = 0.08 * (1 - sstep(30, 120, s));
            if (ga > 0) {
              ctx.strokeStyle = `rgba(243,233,214,${ga})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              for (let lo = -40; lo <= 80; lo += 10) {
                const [x] = P(lo, 0);
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
              }
              for (let la = -50; la <= 50; la += 10) {
                const [, y] = P(0, la);
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
              }
              ctx.stroke();
            }

            // Real Neighbor landmasses (Natural Earth)
            ctx.fillStyle = '#8C8A2B';
            ctx.beginPath();
            REAL_OTHER_LAND.forEach((ring) => ringPath(ctx, ring));
            ctx.fill();
            ctx.strokeStyle = 'rgba(29,21,16,.6)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Real Africa countries (Natural Earth)
            const pulse = 0.5 + 0.5 * Math.sin(now / 650);
            const activeReg = activeLanguage ? LANGUAGE_REGIONS[activeLanguage] : null;

            for (const c of REAL_AFRICA_COUNTRIES) {
              if (!isVisible([c.bbox[1], c.bbox[0], c.bbox[3], c.bbox[2]], 20)) continue;
              const rd = READY[c.c];
              ctx.beginPath();
              c.r.forEach((ring) => ringPath(ctx, ring));

              let col = c.tone || TONES[0];
              if (rd) {
                col =
                  c.c === 'NGA'
                    ? `rgb(${Math.round(lerp(236, 246, pulse))},${Math.round(
                        lerp(128, 170, pulse)
                      )},${Math.round(lerp(186, 210, pulse))})`
                    : '#F7C6DF';
              }
              if (hover && hover.type === 'country' && hover.c.c === c.c) {
                col = rd ? '#E0609F' : '#FFD978';
              }
              ctx.fillStyle = col;
              ctx.fill();
              ctx.strokeStyle = '#1D1510';
              ctx.lineWidth = clamp(s / 12, 1, 2.4);
              ctx.stroke();
            }

            // --- LINGUISTIC REGIONS LAYER (Cultural cross-border highlight) ---
            if (activeReg) {
              // 1. Highlight constituent states inside the linguistic realm
              const stateIdSet = new Set(activeReg.stateIds);
              for (const st of ADMIN1_REGIONS) {
                if (stateIdSet.has(st.id)) {
                  if (!isVisible([st.bbox[1], st.bbox[0], st.bbox[3], st.bbox[2]], 10)) continue;
                  ctx.beginPath();
                  st.r.forEach((ring) => ringPath(ctx, ring));
                  ctx.fillStyle = activeReg.fillColor;
                  ctx.fill();
                }
              }

              // 2. Trans-border Outer Linguistic Hull with glowing dashed boundary
              ctx.beginPath();
              ringPath(ctx, activeReg.boundaryHull);
              ctx.fillStyle = activeReg.fillColor;
              ctx.fill();
              ctx.setLineDash([8, 6]);
              ctx.lineDashOffset = -now / 45;
              ctx.strokeStyle = activeReg.color;
              ctx.lineWidth = clamp(s / 8, 2, 4.5);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // --- FIRST-ORDER ADMINISTRATIVE STATE BOUNDARIES (Nigeria 36 States, Ghana, Benin) ---
            if (s >= 14) {
              const stateA = clamp((s - 14) / 10, 0, 1);
              ctx.globalAlpha = stateA;
              ctx.strokeStyle = 'rgba(29, 21, 16, 0.45)';
              ctx.lineWidth = 1.0;
              ctx.setLineDash([3, 3]);
              for (const st of ADMIN1_REGIONS) {
                if (!isVisible([st.bbox[1], st.bbox[0], st.bbox[3], st.bbox[2]], 10)) continue;
                ctx.beginPath();
                st.r.forEach((ring) => ringPath(ctx, ring));
                ctx.stroke();
              }
              ctx.setLineDash([]);

              // State names at moderate country zoom
              if (s >= 30) {
                for (const st of ADMIN1_REGIONS) {
                  // Benin and Niger are drawn as borderland context, so their
                  // divisions stay unlabelled; the countries you can enter name
                  // theirs.
                  if (
                    st.countryCode === 'NGA' ||
                    st.countryCode === 'GHA' ||
                    st.countryCode === 'KEN'
                  ) {
                    const [sx, sy] = P(st.centroid[0], st.centroid[1]);
                    if (sx < 0 || sy < 0 || sx > W || sy > H) continue;
                    drawLabel(ctx, st.name, sx, sy, {
                      font: '600 11px Figtree',
                      a: stateA * 0.8,
                      c: 'rgba(29, 21, 16, 0.85)',
                      haloC: 'rgba(247, 239, 226, 0.9)',
                      halo: 3,
                    });
                  }
                }
              }
              ctx.globalAlpha = 1;
            }

            // Ready country shimmering borders
            for (const c of REAL_AFRICA_COUNTRIES) {
              const rd = READY[c.c];
              if (!rd || !isVisible([c.bbox[1], c.bbox[0], c.bbox[3], c.bbox[2]], 20)) continue;
              ctx.beginPath();
              c.r.forEach((ring) => ringPath(ctx, ring));
              ctx.setLineDash([6, 6]);
              ctx.lineDashOffset = -now / 60;
              ctx.strokeStyle =
                c.c === 'NGA'
                  ? 'rgba(255,255,255,.95)'
                  : 'rgba(255,255,255,.6)';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.setLineDash([]);
            }
            ctx.globalAlpha = 1;

            // --- COUNTRY ZOOM LEVEL ILLUSTRATED LANDMARKS ---
            if (s >= 12) {
              const lmAlpha = sstep(12, 22, s) * (1 - aCity);
              const countryLandmarks = LANDMARKS.filter((lm) => lm.zoomLevel === 'country');

              for (const lm of countryLandmarks) {
                const [lx, ly] = P(lm.lon, lm.lat);
                if (lx < -40 || ly < -40 || lx > W + 40 || ly > H + 40) continue;

                const isHovered =
                  hover && hover.type === 'landmark' && hover.lm.id === lm.id;

                ctx.globalAlpha = lmAlpha;

                // Render procedural vector illustration with idle animation
                renderLandmark(
                  ctx,
                  lm,
                  lx,
                  ly,
                  clamp(s / 32, 0.85, 1.45),
                  now / 1000,
                  !!isHovered
                );
              }
              ctx.globalAlpha = 1;
            }
          }

          // City rendering (Lagos)
          if (aCity > 0) {
            ctx.globalAlpha = aCity;
            ctx.fillStyle = '#F3B84A';
            ctx.fillRect(0, 0, W, H);

            // Urban texture specks
            if (aMk < 1) {
              const sz = clamp(s / 1600, 1.2, 5);
              for (const p of SPECKS) {
                const [x, y] = P(p[0], p[1]);
                if (x < -6 || y < -6 || x > W + 6 || y > H + 6) continue;
                ctx.fillStyle =
                  p[2] < 0.33 ? '#E0922F' : p[2] < 0.66 ? '#D98A3A' : '#C7773A';
                ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz * 0.8);
              }
            }

            // Real Water bodies (Atlantic, Lagos Lagoon, Five Cowrie Creek, Commodore Channel)
            for (const w of REAL_LAGOS_WATER) {
              ctx.beginPath();
              ringPath(ctx, w.p);
              ctx.fillStyle = w.k === 'ocean' ? '#11663F' : '#1D7A4D';
              ctx.fill();
            }

            // Shorelines
            ctx.strokeStyle = '#1D1510';
            ctx.lineWidth = 2;
            for (const w of REAL_LAGOS_WATER) {
              ctx.beginPath();
              ringPath(ctx, w.p);
              ctx.stroke();
            }

            // Real Roads & Iconic Bridges
            const rw = clamp(s / 1400, 1.4, 16);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (const r of REAL_LAGOS_ROADS) {
              ctx.beginPath();
              r.p.forEach((q, i) => {
                const [x, y] = P(q[0], q[1]);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.strokeStyle = '#1D1510';
              ctx.lineWidth = rw * r.w + 3;
              ctx.stroke();
              ctx.strokeStyle = '#F7EFE2';
              ctx.lineWidth = rw * r.w;
              ctx.stroke();
            }

            // Vehicles
            const actT = trafficAct(h);
            const cdVeh = dark(elev(cam.lat, cam.lon, sp));
            for (const v of VEH) {
              if (v.o > actT) continue;
              const r = REAL_LAGOS_ROADS[v.r % REAL_LAGOS_ROADS.length];
              const [lo, la, ang] = roadAt(r, v.d);
              const [x, y] = P(lo, la);
              if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;

              const L =
                v.t === 'danfo'
                  ? Math.max(10, (5 * s) / 110600)
                  : v.t === 'keke'
                  ? Math.max(6, (2.6 * s) / 110600)
                  : Math.max(8, (4.2 * s) / 110600);
              const Wd = L * 0.48;

              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(ang + (v.dir < 0 ? Math.PI : 0));
              ctx.translate(0, rw * r.w * 0.22);
              ctx.fillStyle =
                v.t === 'danfo'
                  ? '#FFD23A'
                  : v.t === 'keke'
                  ? '#1E8A55'
                  : '#F2A1CB';
              ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
              ctx.strokeStyle = '#1D1510';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(-L / 2, -Wd / 2, L, Wd);

              if (v.t === 'danfo') {
                ctx.fillStyle = '#1B1B1B';
                ctx.fillRect(-L / 2 + L * 0.1, -Wd / 2, L * 0.08, Wd);
                ctx.fillRect(L * 0.2, -Wd / 2, L * 0.06, Wd);
              }

              if (cdVeh > 0.2) {
                ctx.globalCompositeOperation = 'lighter';
                glowDot(
                  ctx,
                  L / 2 + 4,
                  0,
                  8,
                  'rgba(255,230,170,A)',
                  0.7 * cdVeh * aCity
                );
                ctx.globalCompositeOperation = 'source-over';
              }
              ctx.restore();
            }

            // --- CITY LEVEL ILLUSTRATED LANDMARKS (Balogun, Obalende, Yaba Buka, Surulere, Bridges) ---
            if (aMk < 1) {
              const cityLandmarks = LANDMARKS.filter((lm) => lm.zoomLevel === 'city');
              for (const lm of cityLandmarks) {
                const [lx, ly] = P(lm.lon, lm.lat);
                if (lx < -40 || ly < -40 || lx > W + 40 || ly > H + 40) continue;

                const isHovered =
                  hover && hover.type === 'landmark' && hover.lm.id === lm.id;

                renderLandmark(
                  ctx,
                  lm,
                  lx,
                  ly,
                  clamp(s / 4000, 0.9, 1.6),
                  now / 1000,
                  !!isHovered
                );
              }
            }

            ctx.globalAlpha = 1;
          }

          // Market rendering (Balogun)
          if (aMk > 0) {
            ctx.globalAlpha = aMk;
            const k = s / 110600;
            const open = stallsOpen(h);

            // Buildings
            for (const b of BLD) {
              const [x, y] = P(...M(b.x, b.y));
              const w = b.w * k;
              const hh = b.h * k;
              if (
                x + w < -10 ||
                y + hh < -10 ||
                x - w > W + 10 ||
                y - hh > H + 10
              )
                continue;

              ctx.fillStyle = 'rgba(40,30,20,.35)';
              ctx.fillRect(x - w / 2 + 3, y - hh / 2 + 3, w, hh);
              ctx.fillStyle = b.c;
              ctx.fillRect(x - w / 2, y - hh / 2, w, hh);
              ctx.strokeStyle = '#1D1510';
              ctx.lineWidth = 1.6;
              ctx.strokeRect(x - w / 2, y - hh / 2, w, hh);

              ctx.strokeStyle = 'rgba(0,0,0,.15)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              if (b.ridge) {
                ctx.moveTo(x - w / 2, y);
                ctx.lineTo(x + w / 2, y);
              } else {
                ctx.moveTo(x, y - hh / 2);
                ctx.lineTo(x, y + hh / 2);
              }
              ctx.stroke();
            }

            // Market ground & lanes
            const [x0, y0] = P(...M(-122, 92));
            const [x1, y1] = P(...M(122, -92));
            ctx.fillStyle = '#EE963A';
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.strokeStyle = '#1D1510';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

            ctx.fillStyle = '#F6C874';
            for (const lx of LX) {
              const [a] = P(...M(lx - 2.6, 0));
              const [b] = P(...M(lx + 2.6, 0));
              ctx.fillRect(a, y0, b - a, y1 - y0);
            }
            for (const ly of LY) {
              const [, a] = P(...M(0, ly + 2.6));
              const [, b] = P(...M(0, ly - 2.6));
              ctx.fillRect(x0, a, x1 - x0, b - a);
            }

            // Goods near stalls
            for (const [gx, gy] of [
              [-27.5, 4],
              [-27.5, -2],
            ]) {
              const [x, y] = P(...M(gx, gy));
              ctx.fillStyle = '#8A5A2B';
              ctx.beginPath();
              ctx.arc(x, y, 1.5 * k, 0, 7);
              ctx.fill();
              if (open) {
                ctx.fillStyle = '#D8322A';
                for (let i = 0; i < 6; i++) {
                  ctx.beginPath();
                  ctx.arc(
                    x + Math.cos(i) * 0.7 * k,
                    y + Math.sin(i * 1.7) * 0.7 * k,
                    0.42 * k,
                    0,
                    7
                  );
                  ctx.fill();
                }
              }
            }

            if (open) {
              const fab = ['#2F6FD0', '#F0BF2E', '#D23A2B', '#2E9A58', '#7C41A2'];
              fab.forEach((c, i) => {
                const [x, y] = P(...M(44 + i * 0.1, -26 - i * 1.6));
                ctx.fillStyle = c;
                ctx.fillRect(x, y, 3.2 * k, 1.3 * k);
                ctx.fillStyle = 'rgba(255,255,255,.35)';
                for (let q = 0; q < 3; q++) {
                  ctx.fillRect(x + q * k, y, 0.3 * k, 1.3 * k);
                }
              });
            }

            // Umbrellas
            for (const u of UMB) {
              const [x, y] = P(...M(u.x, u.y));
              const r = (open ? u.r : 1.1) * k;
              if (x < -r || y < -r || x > W + r || y > H + r) continue;

              if (!open) {
                ctx.fillStyle = '#7A5A45';
                ctx.beginPath();
                ctx.arc(x, y, r, 0, 7);
                ctx.fill();
                continue;
              }

              ctx.fillStyle = 'rgba(40,30,20,.3)';
              ctx.beginPath();
              ctx.arc(x + 2, y + 2, r, 0, 7);
              ctx.fill();

              for (let i = 0; i < 8; i++) {
                ctx.fillStyle = u.c[i % 2];
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.arc(
                  x,
                  y,
                  r,
                  u.a + (i * Math.PI) / 4,
                  u.a + ((i + 1) * Math.PI) / 4
                );
                ctx.closePath();
                ctx.fill();
              }

              ctx.strokeStyle = '#1D1510';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, 7);
              ctx.stroke();
              ctx.fillStyle = '#1D1510';
              ctx.beginPath();
              ctx.arc(x, y, 0.3 * k, 0, 7);
              ctx.fill();
            }

            // Pedestrians
            for (let i = 0; i < nPeople; i++) {
              const p = PEOPLE[i];
              const ax = LX[p.a],
                ay = LY[p.b],
                bx = LX[p.na],
                by = LY[p.nb];
              const px =
                lerp(ax, bx, p.t) + (ay === by ? 0 : p.off);
              const py =
                lerp(ay, by, p.t) + (ax === bx ? 0 : p.off);
              const [x, y] = P(...M(px, py));

              const r = Math.max(2.6, 0.55 * k);
              ctx.fillStyle = p.c;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, 7);
              ctx.fill();
              ctx.fillStyle = 'rgba(30,20,10,.55)';
              ctx.beginPath();
              ctx.arc(x, y, r * 0.5, 0, 7);
              ctx.fill();
            }

            // NPCs
            if (npcHere(h)) {
              for (const id in NPCS) {
                const c = NPCS[id];
                const [x, y] = P(...M(c.x, c.y));
                const bob = Math.sin(now / 400 + c.x) * 0.15 * k;
                const r = Math.max(13, 3 * k);
                const hot =
                  hover && hover.type === 'npc' && hover.id === id;

                const pulse2 = (now / 1300 + (id === 'tunde' ? 0.5 : 0)) % 1;
                ctx.globalAlpha = aMk * (1 - pulse2);
                ctx.strokeStyle = '#FFE3A8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, r * 1.6 + pulse2 * r * 3, 0, 7);
                ctx.stroke();
                ctx.globalAlpha = aMk;

                ctx.fillStyle = c.cloth;
                ctx.beginPath();
                ctx.ellipse(x, y + bob, r * 1.25, r * 0.95, 0, 0, 7);
                ctx.fill();
                ctx.strokeStyle = '#1D1510';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#5A3A26';
                ctx.beginPath();
                ctx.arc(x, y - r * 0.1 + bob, r * 0.62, 0, 7);
                ctx.fill();

                if (c.wrap) {
                  ctx.fillStyle = c.wrap;
                  ctx.beginPath();
                  ctx.arc(x, y - r * 0.25 + bob, r * 0.62, Math.PI, 0);
                  ctx.fill();
                }

                if (hot) {
                  ctx.strokeStyle = '#FFF6E4';
                  ctx.lineWidth = 2.5;
                  ctx.beginPath();
                  ctx.arc(x, y, r * 1.6, 0, 7);
                  ctx.stroke();
                }
              }
            }

            ctx.globalAlpha = 1;
          }

          // Day / Night terminator
          drawNight(ctx, sp, W, H);
          const cd = dark(elev(cam.lat, cam.lon, sp));

          // Night illumination lights
          ctx.globalCompositeOperation = 'lighter';
          if (aCity < 1) {
            for (const c of CITIES) {
              const [x, y] = P(c[0], c[1]);
              if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
              const d = dark(elev(c[1], c[0], sp));
              if (d <= 0) continue;
              const r = clamp((c[2] * s) / 1.6, 7, 48);
              glowDot(
                ctx,
                x,
                y,
                r,
                'rgba(255,196,110,A)',
                0.55 * d * (1 - aCity)
              );
              glowDot(
                ctx,
                x,
                y,
                r * 0.3,
                'rgba(255,236,200,A)',
                0.9 * d * (1 - aCity)
              );
            }
          }

          if (aCity > 0 && cd > 0 && aMk < 1) {
            const a = cd * aCity * (1 - aMk);
            for (const L of LAMPS) {
              const [x, y] = P(L[0], L[1]);
              if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
              glowDot(
                ctx,
                x,
                y,
                clamp(s / 900, 3, 10),
                'rgba(255,190,110,A)',
                0.5 * a
              );
            }
            for (const sp2 of SPECKS) {
              if (sp2[2] > 0.35) continue;
              const [x, y] = P(sp2[0], sp2[1]);
              if (x < 0 || y < 0 || x > W || y > H) continue;
              glowDot(ctx, x, y, 3, 'rgba(255,214,150,A)', 0.35 * a);
            }
          }

          if (aMk > 0 && cd > 0) {
            const a = cd * aMk;
            if (h >= 17 && h < 20.5) {
              for (const u of UMB) {
                if (((u.a * 10) | 0) % 3) continue;
                const [x, y] = P(...M(u.x, u.y));
                glowDot(
                  ctx,
                  x,
                  y,
                  (s / 110600) * 7,
                  'rgba(255,200,120,A)',
                  0.6 * a
                );
              }
            }
            for (const b of BLD) {
              if ((b.x * 7 + b.y) % 5 > 1) continue;
              const [x, y] = P(...M(b.x, b.y));
              glowDot(
                ctx,
                x,
                y,
                (s / 110600) * 5,
                'rgba(255,210,140,A)',
                0.35 * a
              );
            }
          }
          ctx.globalCompositeOperation = 'source-over';

          // City district labels
          if (aCity > 0 && aMk < 1) {
            const nt = cd > 0.4;
            const a = aCity * (1 - sstep(20000, 40000, s));
            if (a > 0) {
              for (const d of REAL_DISTRICTS) {
                const [x, y] = P(d.lon, d.lat);
                drawLabel(
                  ctx,
                  d.n,
                  x,
                  y,
                  nt
                    ? {
                        font: `600 ${d.sz}px Figtree`,
                        a: a * 0.9,
                        c: '#EFE3CC',
                        haloC: 'rgba(20,18,50,.8)',
                        halo: 4,
                      }
                    : {
                        font: `700 ${d.sz}px Figtree`,
                        a: a * 0.95,
                        c: '#1D1510',
                        haloC: 'rgba(247,239,226,.9)',
                        halo: 4,
                      }
                );
              }

              for (const d of REAL_WATER_LABELS) {
                const [x, y] = P(d.lon, d.lat);
                drawLabel(ctx, d.n, x, y, {
                  font: `italic 600 ${d.sz}px Fraunces`,
                  a: a * 0.9,
                  c: '#DDF0DA',
                  haloC: 'rgba(8,50,28,.7)',
                  halo: 3,
                });
              }
            }
          }

          // Market labels
          if (aMk > 0) {
            const k = s / 110600;
            if (npcHere(h)) {
              for (const id in NPCS) {
                const c = NPCS[id];
                const [x, y] = P(...M(c.x, c.y));
                const r = Math.max(13, 3 * k);
                drawLabel(ctx, c.name, x, y + r * 2.2 + 10, {
                  font: '800 15px Figtree',
                  a: aMk,
                  c: '#FFFFFF',
                  haloC: 'rgba(29,21,16,.9)',
                });
                drawLabel(
                  ctx,
                  c.elder ? 'Tomatoes and pepper' : 'Ankara fabric',
                  x,
                  y + r * 2.2 + 27,
                  {
                    font: '600 12px Figtree',
                    a: aMk * 0.9,
                    c: '#FAD4E7',
                    haloC: 'rgba(29,21,16,.9)',
                  }
                );
              }
            }
            const [x, y] = P(...M(0, -92));
            drawLabel(ctx, 'Balogun Market', x, y + 26, {
              font: '26px "Bagel Fat One"',
              a: aMk * 0.95,
              c: '#F2A1CB',
              haloC: '#1D1510',
              halo: 6,
            });
          }

          // --- MANDATORY ATTRIBUTION BADGE (OpenStreetMap & Natural Earth) ---
          drawLabel(
            ctx,
            '© OpenStreetMap contributors • Natural Earth',
            W - 14,
            H - 12,
            {
              font: '500 10px Figtree',
              align: 'right',
              c: 'rgba(245, 238, 220, 0.65)',
              haloC: 'rgba(10, 16, 12, 0.85)',
              halo: 3,
            }
          );
        }
      }

      // Check current level & HUD update every 200ms
      if (now - hudTime > 200) {
        hudTime = now;
        const s = camRef.current.s;
        const currentLevel: ViewLevel =
          s < 22
            ? 'africa'
            : s < 650
            ? 'country'
            : s < 45000
            ? 'lagos'
            : 'market';
        const curC = countryAtCoord(camRef.current.lon, camRef.current.lat);
        onLevelChange(currentLevel, curC);

        const sp = sun(simT);
        const sunEl = elev(camRef.current.lat, camRef.current.lon, sp);
        onSunElevationChange(sunEl);
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [
    simT,
    activeLanguage,
    onSimTick,
    onLevelChange,
    onSunElevationChange,
    P,
    U,
    countryAtCoord,
  ]);

  // Pointer event listeners on canvas
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return;
      cv.setPointerCapture(e.pointerId);
      ptrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragMovedRef.current = 0;
      flyRef.current = null;

      if (ptrsRef.current.size === 2) {
        const pts = Array.from(ptrsRef.current.values());
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinch0Ref.current = { d, s: camRef.current.s };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pausedRef.current) return;
      if (!ptrsRef.current.has(e.pointerId)) {
        doHover(e.clientX, e.clientY);
        return;
      }

      const prev = ptrsRef.current.get(e.pointerId)!;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      dragMovedRef.current += Math.hypot(dx, dy);
      ptrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (ptrsRef.current.size === 1) {
        const cam = camRef.current;
        cam.lon -= dx / cam.s;
        cam.lat += dy / cam.s;
        clampCam();
      } else if (ptrsRef.current.size === 2 && pinch0Ref.current) {
        const pts = Array.from(ptrsRef.current.values());
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mx = (pts[0].x + pts[1].x) / 2;
        const my = (pts[0].y + pts[1].y) / 2;
        const factor = (d / (pinch0Ref.current.d || 1)) * (pinch0Ref.current.s / camRef.current.s);
        zoomAt(mx, my, factor);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pausedRef.current) return;
      ptrsRef.current.delete(e.pointerId);
      if (ptrsRef.current.size < 2) pinch0Ref.current = null;

      if (dragMovedRef.current < 6) {
        handleClick(e.clientX, e.clientY);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (pausedRef.current) return;
      e.preventDefault();
      flyRef.current = null;
      const f = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      zoomAt(e.clientX, e.clientY, f);
      doHover(e.clientX, e.clientY);
    };

    cv.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cv.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cv.removeEventListener('wheel', onWheel);
    };
  }, [doHover, handleClick, zoomAt, clampCam]);

  return <canvas ref={canvasRef} id="world" />;
};
