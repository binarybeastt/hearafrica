// Lagos traffic for the 3D market: danfo, keke napep, taxi and okada.
//
// The danfo — a yellow Volkswagen/Toyota minibus with black stripes — is the
// most recognisable object on a Lagos street, so it carries most of the weight
// of making this read as Nigeria rather than a generic market.

import * as THREE from 'three';
import { makePerson, Person, SKIN_TONES, CLOTH_COLOURS } from './people';

export const LAGOS_YELLOW = '#F5C400';
export const STRIPE_BLACK = '#1D1510';

/** Cached: a dozen vehicles built fresh materials for every panel and wheel. */
const materialCache = new Map<string, THREE.MeshLambertMaterial>();
function mat(color: string): THREE.MeshLambertMaterial {
  let material = materialCache.get(color);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color });
    materialCache.set(color, material);
  }
  return material;
}

/** Wheels and glass repeat across every vehicle; build each shape once. */
const geometryCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = build();
    geometryCache.set(key, geometry);
  }
  return geometry as T;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

export function clearVehicleCaches() {
  materialCache.clear();
  geometryCache.clear();
  textureCache.clear();
  matatuMaterials.clear();
}

function wheel(radius: number, width: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geo(`wheel${radius}x${width}`, () =>
      new THREE.CylinderGeometry(radius, radius, width, 10)
    ),
    mat('#20201E')
  );
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  return mesh;
}

function glass(w: number, h: number): THREE.Mesh {
  return new THREE.Mesh(
    geo(`glass${w}x${h}`, () => new THREE.BoxGeometry(w, h, 0.04)),
    mat('#5E7A86')
  );
}

export type VehicleKind =
  | 'danfo'
  | 'keke'
  | 'taxi'
  | 'okada'
  | 'trotro'
  | 'ghanataxi'
  | 'matatu';

/**
 * A matatu's livery is painted art, not a stripe, so it has to be a texture:
 * blocks of saturated colour cut by diagonals, the way the panel beaters in
 * Nairobi's yards actually lay them out. A flat colour reads as a trotro.
 */
function matatuTexture(variant: number): THREE.CanvasTexture {
  const key = `matatu${variant}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const schemes = [
    ['#7B2FF7', '#F5C400', '#00C2A8', '#12121A'],
    ['#E8412F', '#1B4E9B', '#F5C400', '#12121A'],
    ['#00A859', '#111827', '#F5C400', '#E8412F'],
    ['#2FA8E0', '#E8412F', '#F2F0E6', '#12121A'],
  ];
  const scheme = schemes[variant % schemes.length];

  ctx.fillStyle = scheme[0];
  ctx.fillRect(0, 0, 256, 128);

  // Diagonal slashes across the flank.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = scheme[1 + (i % 3)];
    ctx.beginPath();
    const x = i * 58 - 20;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 30, 0);
    ctx.lineTo(x + 8, 128);
    ctx.lineTo(x - 22, 128);
    ctx.closePath();
    ctx.fill();
  }

  // A pale band through the middle, where the lettering usually sits.
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillRect(0, 52, 256, 26);
  ctx.fillStyle = scheme[3];
  ctx.fillRect(0, 52, 256, 4);
  ctx.fillRect(0, 74, 256, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

const matatuMaterials = new Map<number, THREE.MeshLambertMaterial>();
function matatuSkin(variant: number): THREE.MeshLambertMaterial {
  let material = matatuMaterials.get(variant);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ map: matatuTexture(variant) });
    matatuMaterials.set(variant, material);
  }
  return material;
}

/**
 * A Nairobi matatu: a 14-seater minibus under a coat of graffiti, tinted
 * glass and a chrome skirt. `variant` picks the livery.
 */
export function makeMatatu(rand: () => number, variant = (rand() * 4) | 0): THREE.Group {
  const group = new THREE.Group();
  const L = 5.6;
  const W = 2.1;
  const H = 2.4;

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), matatuSkin(variant));
  body.position.y = 1.45;
  body.castShadow = true;
  group.add(body);

  // Chrome skirt and roof lip — matatus are trimmed, not plain.
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, 0.3, L + 0.05), mat('#C7CBD1'));
  skirt.position.y = 0.42;
  group.add(skirt);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.12, L + 0.06), mat('#C7CBD1'));
  lip.position.y = H + 0.3;
  group.add(lip);

  // Blacked-out glass, the full length of the flank.
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, L - 1.3), mat('#16181C'));
    strip.position.set((side * W) / 2 + side * 0.02, 1.92, -0.15);
    group.add(strip);
  }

  const windscreen = glass(W - 0.28, 0.8);
  windscreen.position.set(0, 1.9, L / 2 + 0.01);
  group.add(windscreen);

  // Route board above the windscreen.
  const board = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.3, 0.08), mat('#12121A'));
  board.position.set(0, 2.44, L / 2 - 0.04);
  group.add(board);

  // Roof spoiler — the aftermarket touch every Nairobi matatu carries.
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.22, 0.5), mat('#12121A'));
  spoiler.position.set(0, H + 0.48, L / 2 - 0.7);
  group.add(spoiler);

  for (const [x, z] of [[-1.02, 1.7], [1.02, 1.7], [-1.02, -1.75], [1.02, -1.75]]) {
    const w = wheel(0.47, 0.32);
    w.position.set(x, 0.47, z);
    group.add(w);
  }
  return group;
}

/** A danfo: boxy yellow minibus, black stripes along the flanks. */
function makeDanfo(): THREE.Group {
  const group = new THREE.Group();
  const L = 5.4;
  const W = 2.1;
  const H = 2.2;

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), mat(LAGOS_YELLOW));
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);

  // The two black stripes.
  for (const y of [1.0, 1.72]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.03, 0.2, L + 0.03),
      mat(STRIPE_BLACK)
    );
    stripe.position.y = y;
    group.add(stripe);
  }

  // Lower cab, slightly narrower, and a windscreen.
  const nose = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 1.1, 1.1), mat(LAGOS_YELLOW));
  nose.position.set(0, 0.8, L / 2 - 0.2);
  group.add(nose);

  const windscreen = glass(W - 0.35, 0.72);
  windscreen.position.set(0, 1.78, L / 2 + 0.01);
  group.add(windscreen);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const window = glass(0.04, 0.6);
      window.geometry = new THREE.BoxGeometry(0.04, 0.6, 1.1);
      window.position.set((side * W) / 2 + side * 0.01, 1.78, 1.1 - i * 1.35);
      group.add(window);
    }
  }

  // Roof rack, usually loaded.
  const rack = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.1, L - 1.4), mat('#8A8A80'));
  rack.position.y = H + 0.3;
  group.add(rack);
  const load = new THREE.Mesh(new THREE.BoxGeometry(W - 0.55, 0.45, 1.5), mat('#9A5A38'));
  load.position.set(0, H + 0.55, -0.4);
  load.castShadow = true;
  group.add(load);

  for (const [x, z] of [[-1.02, 1.6], [1.02, 1.6], [-1.02, -1.7], [1.02, -1.7]]) {
    const w = wheel(0.46, 0.3);
    w.position.set(x, 0.46, z);
    group.add(w);
  }

  return group;
}

/** A keke napep: yellow three-wheeler with a canopy. */
function makeKeke(): THREE.Group {
  const group = new THREE.Group();

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.25, 2.1), mat(LAGOS_YELLOW));
  cabin.position.y = 0.95;
  cabin.castShadow = true;
  group.add(cabin);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.16, 2.13), mat(STRIPE_BLACK));
  stripe.position.y = 0.85;
  group.add(stripe);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 2.0), mat('#111'));
  roof.position.y = 1.6;
  roof.castShadow = true;
  group.add(roof);

  const front = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.7), mat(LAGOS_YELLOW));
  front.position.set(0, 0.8, 1.2);
  group.add(front);

  const w1 = wheel(0.3, 0.16);
  w1.position.set(0, 0.3, 1.35);
  group.add(w1);
  for (const x of [-0.62, 0.62]) {
    const w = wheel(0.32, 0.18);
    w.position.set(x, 0.32, -0.75);
    group.add(w);
  }

  return group;
}

/** A Lagos taxi: yellow saloon with a black stripe. */
function makeTaxi(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 4.3), mat(LAGOS_YELLOW));
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.66, 2.1), mat(LAGOS_YELLOW));
  cabin.position.set(0, 1.42, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.18, 4.32), mat(STRIPE_BLACK));
  stripe.position.y = 0.95;
  group.add(stripe);

  const screen = glass(1.5, 0.5);
  screen.position.set(0, 1.42, 0.86);
  screen.rotation.x = -0.25;
  group.add(screen);

  for (const [x, z] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]]) {
    const w = wheel(0.36, 0.24);
    w.position.set(x, 0.36, z);
    group.add(w);
  }

  return group;
}

/** An okada: motorcycle with a rider. */
function makeOkada(rand: () => number): { group: THREE.Group; rider: Person } {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.7), mat('#9C1F1F'));
  frame.position.y = 0.65;
  frame.castShadow = true;
  group.add(frame);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.9), mat('#17110C'));
  seat.position.set(0, 0.92, -0.2);
  group.add(seat);

  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.07), mat('#4A4A48'));
  bars.position.set(0, 1.05, 0.72);
  group.add(bars);

  for (const z of [0.8, -0.75]) {
    const w = wheel(0.35, 0.14);
    w.position.set(0, 0.35, z);
    group.add(w);
  }

  const rider = makePerson({
    cloth: CLOTH_COLOURS[(rand() * CLOTH_COLOURS.length) | 0],
    accent: '#2E5C9A',
    skin: SKIN_TONES[(rand() * SKIN_TONES.length) | 0],
    head: 'cap',
    scale: 0.95,
  });
  rider.group.position.set(0, 0.62, -0.15);
  // Seated: thighs forward, arms out to the bars.
  rider.limbs.leftLeg.rotation.x = -1.2;
  rider.limbs.rightLeg.rotation.x = -1.2;
  rider.limbs.leftArm.rotation.x = -1.05;
  rider.limbs.rightArm.rotation.x = -1.05;
  group.add(rider.group);

  return { group, rider };
}

export interface Vehicle {
  group: THREE.Group;
  kind: VehicleKind;
  /** Axis the vehicle travels along. */
  axis: 'x' | 'z';
  lane: number;
  direction: 1 | -1;
  speed: number;
  position: number;
  limit: number;
}

/**
 * A trotro: Ghana's shared minibus. Usually a white or cream body with a bold
 * coloured band down the flank and a slogan board above the windscreen —
 * quite unlike the danfo's yellow-and-black, which is the point.
 */
function makeTrotro(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const L = 5.2;
  const W = 2.05;
  const H = 2.25;
  const band = ['#1E7A4A', '#C8102E', '#1B4E9B', '#E8A317'][(rand() * 4) | 0];

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), mat('#EFE7D6'));
  body.position.y = 1.4;
  body.castShadow = true;
  group.add(body);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, 0.34, L + 0.03), mat(band));
  stripe.position.y = 1.16;
  group.add(stripe);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.4, L + 0.02), mat('#4A5157'));
  skirt.position.y = 0.55;
  group.add(skirt);

  const windscreen = glass(W - 0.3, 0.78);
  windscreen.position.set(0, 1.86, L / 2 + 0.01);
  group.add(windscreen);

  // The slogan board over the windscreen: the most recognisable trotro detail.
  const board = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, 0.34, 0.08), mat(band));
  board.position.set(0, 2.42, L / 2 - 0.05);
  group.add(board);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 1.05), mat('#5E7A86'));
      window.position.set((side * W) / 2 + side * 0.01, 1.82, 1.05 - i * 1.3);
      group.add(window);
    }
  }

  const rack = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, 0.1, L - 1.6), mat('#8A8A80'));
  rack.position.y = H + 0.32;
  group.add(rack);
  const load = new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, 0.5, 1.6), mat('#B98A55'));
  load.position.set(0, H + 0.6, -0.3);
  load.castShadow = true;
  group.add(load);

  for (const [x, z] of [[-1, 1.55], [1, 1.55], [-1, -1.65], [1, -1.65]]) {
    const w = wheel(0.45, 0.3);
    w.position.set(x, 0.45, z);
    group.add(w);
  }
  return group;
}

/** A Ghanaian taxi: yellow wings over a coloured body, not all-over yellow. */
function makeGhanaTaxi(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const shell = ['#C8102E', '#1B4E9B', '#2E7D32', '#4A4A48'][(rand() * 4) | 0];

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 4.3), mat(shell));
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.66, 2.1), mat(shell));
  cabin.position.set(0, 1.42, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Yellow wings front and back — the Ghanaian taxi livery.
  for (const z of [1.62, -1.62]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.84, 1.1), mat('#F5C400'));
    wing.position.set(0, 0.72, z);
    group.add(wing);
  }

  const screen = glass(1.5, 0.5);
  screen.position.set(0, 1.42, 0.86);
  screen.rotation.x = -0.25;
  group.add(screen);

  for (const [x, z] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]]) {
    const w = wheel(0.36, 0.24);
    w.position.set(x, 0.36, z);
    group.add(w);
  }
  return group;
}

export function makeVehicle(kind: VehicleKind, rand: () => number): THREE.Group {
  switch (kind) {
    case 'danfo':
      return makeDanfo();
    case 'keke':
      return makeKeke();
    case 'taxi':
      return makeTaxi();
    case 'okada':
      return makeOkada(rand).group;
    case 'trotro':
      return makeTrotro(rand);
    case 'ghanataxi':
      return makeGhanaTaxi(rand);
    case 'matatu':
      return makeMatatu(rand);
  }
}

/** Advances every vehicle along its lane, wrapping at the edge of the world. */
export function updateVehicles(vehicles: Vehicle[], dt: number) {
  for (const v of vehicles) {
    v.position += v.speed * v.direction * dt;
    if (v.position > v.limit) v.position = -v.limit;
    if (v.position < -v.limit) v.position = v.limit;

    if (v.axis === 'z') {
      v.group.position.set(v.lane, 0, v.position);
      v.group.rotation.y = v.direction > 0 ? 0 : Math.PI;
    } else {
      v.group.position.set(v.position, 0, v.lane);
      v.group.rotation.y = v.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
}
