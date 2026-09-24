// Procedural 3D Kejetia Market, Kumasi — the Ashanti capital.
//
// Built the same way as Balogun (primitives, flat-shaded, no assets), but it
// should not feel like the same market with a different trader. What makes it
// Ghanaian rather than generically West African:
//
//   - Kente. Woven bands of gold, green, red and black, generated as a texture
//     and used on the canopies, the hanging cloth and the goods themselves.
//   - The roof sea. Kejetia is famous from above as an ocean of rusted zinc;
//     the roofs here are denser, lower and rustier than Lagos.
//     - Trotro and yellow-winged taxis instead of danfo and keke.
//   - Adinkra. Simple stamped motifs on the stall boards.
//
// TRANSLATION/CULTURE STATUS: first-pass, not reviewed by Ghanaian speakers.

import * as THREE from 'three';
import { rng } from '@/data/lagos-data';
import { animateWalk, makePerson, Person, randomPerson } from './people';
import {
  clearVehicleCaches,
  makeVehicle,
  updateVehicles,
  Vehicle,
  VehicleKind,
} from './vehicles';
import { BuiltScene, TraderMood } from './balogun-scene';

export const GHANA_PALETTE = {
  paper: '#F7EFE2',
  ink: '#1D1510',
  ground: '#B8A183',
  lane: '#CDBA98',
  gold: '#E8B10A',
  green: '#118A4E',
  red: '#C8102E',
  black: '#17110C',
  timber: '#8A5A36',
  zinc: '#9BA3A6',
  rust: '#8A5B43',
  rustDeep: '#6E4531',
  asphalt: '#4B4A46',
  asphaltLine: '#D9CFA8',
  leaf: '#2F6B34',
  leafDark: '#24512A',
  bark: '#6B4A2F',
  cocoa: '#7A4A22',
};

/** Reused by traderHead() so the speech bubble does not allocate per frame. */
const headScratch = new THREE.Vector3();

const materialCache = new Map<string, THREE.MeshLambertMaterial>();
function mat(color: string): THREE.MeshLambertMaterial {
  let material = materialCache.get(color);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color });
    materialCache.set(color, material);
  }
  return material;
}

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

export function clearKejetiaCaches() {
  geometryCache.clear();
  materialCache.clear();
  textureCache.clear();
  kenteMaterials.clear();
  adinkraMaterial = null;
  clearVehicleCaches();
}

/**
 * A kente texture: warp stripes crossed by weft blocks, in the Ashanti
 * gold/green/red/black. Not a real pattern name — a plausible strip weave.
 */
function kenteTexture(variant: number): THREE.CanvasTexture {
  const key = `kente${variant}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    [GHANA_PALETTE.gold, GHANA_PALETTE.green, GHANA_PALETTE.red, GHANA_PALETTE.black],
    [GHANA_PALETTE.gold, GHANA_PALETTE.black, GHANA_PALETTE.red, GHANA_PALETTE.gold],
    [GHANA_PALETTE.green, GHANA_PALETTE.gold, GHANA_PALETTE.black, GHANA_PALETTE.red],
  ];
  const colours = palettes[variant % palettes.length];

  ctx.fillStyle = colours[0];
  ctx.fillRect(0, 0, 128, 128);

  // Warp: vertical bands.
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = colours[(x / 16) % colours.length];
    ctx.fillRect(x, 0, 8, 128);
  }
  // Weft: horizontal blocks, offset every other band so it reads as woven.
  for (let y = 0; y < 128; y += 16) {
    for (let x = ((y / 16) % 2) * 16; x < 128; x += 32) {
      ctx.fillStyle = colours[((y / 16) + 2) % colours.length];
      ctx.fillRect(x, y, 16, 8);
    }
  }
  // Thin black separators, the way strips are edged.
  ctx.fillStyle = GHANA_PALETTE.black;
  for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 2, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

/**
 * There are only three kente patterns and a couple of repeat values, but this
 * used to clone the texture AND build a new material on every call — 379
 * textures and 557 materials for 407 meshes. Each clone is a separate GPU
 * upload and kills batching, which is what made this market stutter.
 */
const kenteMaterials = new Map<string, THREE.MeshLambertMaterial>();
function kenteMaterial(variant: number, repeat = 1): THREE.MeshLambertMaterial {
  const key = `${variant % 3}|${repeat}`;
  let material = kenteMaterials.get(key);
  if (!material) {
    const texture = kenteTexture(variant).clone();
    texture.needsUpdate = true;
    texture.repeat.set(repeat, repeat);
    material = new THREE.MeshLambertMaterial({ map: texture });
    kenteMaterials.set(key, material);
  }
  return material;
}

let adinkraMaterial: THREE.MeshLambertMaterial | null = null;

/** An adinkra-ish stamped board, used as stall signage. */
function adinkraBoard(): THREE.Mesh {
  const key = 'adinkra';
  let texture = textureCache.get(key);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#E8DCC0';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = GHANA_PALETTE.black;
    ctx.lineWidth = 4;
    // Four stamped motifs, loosely in the spirit of adinkra symbols.
    for (let i = 0; i < 4; i++) {
      const cx = 32 + (i % 2) * 64;
      const cy = 32 + ((i / 2) | 0) * 64;
      ctx.beginPath();
      if (i % 3 === 0) {
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.moveTo(cx - 16, cy);
        ctx.lineTo(cx + 16, cy);
      } else if (i % 3 === 1) {
        ctx.moveTo(cx, cy - 18);
        ctx.lineTo(cx + 16, cy);
        ctx.lineTo(cx, cy + 18);
        ctx.lineTo(cx - 16, cy);
        ctx.closePath();
      } else {
        ctx.arc(cx, cy - 8, 11, Math.PI, 0);
        ctx.arc(cx, cy + 8, 11, 0, Math.PI);
      }
      ctx.stroke();
    }
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(key, texture);
  }
  // One material and one geometry for every board, not one per kiosk.
  let material = adinkraMaterial;
  if (!material) {
    material = new THREE.MeshLambertMaterial({ map: texture });
    adinkraMaterial = material;
  }
  return new THREE.Mesh(
    geo('adinkraBoard', () => new THREE.PlaneGeometry(1.5, 0.75)),
    material
  );
}

/** Corrugated zinc, rustier and lower than Lagos — Kejetia's signature. */
function zincRoof(width: number, depth: number, rust: number): THREE.Group {
  const group = new THREE.Group();
  const colour =
    rust > 0.66 ? GHANA_PALETTE.rustDeep : rust > 0.33 ? GHANA_PALETTE.rust : GHANA_PALETTE.zinc;

  const slab = new THREE.Mesh(
    geo(`roof${Math.round(width)}x${Math.round(depth)}`, () =>
      new THREE.BoxGeometry(width, 0.1, depth)
    ),
    mat(colour)
  );
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  const ribs = 2;
  for (let i = 0; i < ribs; i++) {
    const rib = new THREE.Mesh(
      geo('rib', () => new THREE.CylinderGeometry(0.05, 0.05, 1, 5)),
      mat(rust > 0.5 ? '#9A6A4E' : '#AEB6B9')
    );
    rib.rotation.x = Math.PI / 2;
    rib.scale.z = depth;
    rib.position.set(-width / 2 + (i + 0.5) * (width / ribs), 0.06, 0);
    group.add(rib);
  }
  return group;
}

/** A cloth stall: kente canopy, a rail of hanging strips, folded bolts. */
function kenteStall(rand: () => number, variant: number): THREE.Group {
  const group = new THREE.Group();

  // Two posts, not four: the back pair is never visible behind the cloth.
  for (const [x, z] of [[-1.6, 1.1], [1.6, 1.1]]) {
    const post = new THREE.Mesh(
      geo('post', () => new THREE.CylinderGeometry(0.07, 0.07, 2.9, 6)),
      mat(GHANA_PALETTE.timber)
    );
    post.position.set(x, 1.45, z);
    group.add(post);
  }

  const canopy = new THREE.Mesh(
    geo('canopy', () => new THREE.BoxGeometry(3.7, 0.12, 2.6)),
    kenteMaterial(variant, 2)
  );
  canopy.position.y = 2.95;
  canopy.castShadow = true;
  group.add(canopy);

  const table = new THREE.Mesh(
    geo('table', () => new THREE.BoxGeometry(3.2, 0.12, 1.3)),
    mat(GHANA_PALETTE.timber)
  );
  table.position.set(0, 0.85, 0.7);
  table.receiveShadow = true;
  group.add(table);

  const trestle = new THREE.Mesh(
    geo('trestle', () => new THREE.BoxGeometry(3, 0.8, 1.1)),
    mat('#6F492C')
  );
  trestle.position.set(0, 0.42, 0.7);
  group.add(trestle);

  // Folded bolts of cloth on the table.
  for (let i = 0; i < 2; i++) {
    const bolt = new THREE.Mesh(
      geo('bolt', () => new THREE.BoxGeometry(0.85, 0.22, 0.6)),
      kenteMaterial((variant + i) % 3, 1)
    );
    bolt.position.set((i - 0.5) * 1.3, 1.02 + (rand() < 0.4 ? 0.22 : 0), 0.7);
    bolt.rotation.y = (rand() - 0.5) * 0.3;
    group.add(bolt);
  }

  // Strips hanging from a rail at the back — how cloth is actually displayed.
  const rail = new THREE.Mesh(
    geo('rail', () => new THREE.BoxGeometry(3.4, 0.07, 0.07)),
    mat(GHANA_PALETTE.timber)
  );
  rail.position.set(0, 2.55, -1.1);
  group.add(rail);

  // Two wide strips read the same as four narrow ones at any real distance.
  for (let i = 0; i < 2; i++) {
    const strip = new THREE.Mesh(
      geo('strip', () => new THREE.PlaneGeometry(1.5, 1.85)),
      kenteMaterial((variant + i) % 3, 1)
    );
    strip.position.set((i - 0.5) * 1.6, 1.6, -1.08);
    group.add(strip);
  }

  return group;
}

/** A lock-up kiosk with a low rusted roof and a stamped board. */
function kiosk(w: number, d: number, rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const h = 2.7;
  const shell = ['#C9B79A', '#A8BFA0', '#C2A08A', '#9FB3C4', '#D0BE96'][(rand() * 5) | 0];

  const walls = new THREE.Mesh(
    geo(`kiosk${Math.round(w)}x${Math.round(d)}`, () => new THREE.BoxGeometry(w, h, d)),
    mat(shell)
  );
  walls.position.y = h / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const roof = zincRoof(w * 1.15, d * 1.15, rand());
  roof.position.y = h + 0.06;
  group.add(roof);

  const front = new THREE.Mesh(
    geo('kioskFront', () => new THREE.BoxGeometry(1, 1.8, 0.08)),
    mat('#2A1D14')
  );
  front.scale.x = (w * 0.6) / 1;
  front.position.set(0, 0.9, d / 2 + 0.03);
  group.add(front);

  if (rand() < 0.45) {
    const board = adinkraBoard();
    board.position.set(0, 2.25, d / 2 + 0.05);
    group.add(board);
  }
  return group;
}

/** Auntie Akosua's stall, and Auntie Akosua. */
function makeAkosuaStall(): {
  group: THREE.Group;
  trader: Person;
  setPrice: (price: number | null) => void;
} {
  const group = new THREE.Group();
  const rand = rng(23);

  const stall = kenteStall(rand, 0);
  group.add(stall);

  // A weaver's loom beside the stall: this is Kumasi, the cloth is made here.
  const loom = new THREE.Group();
  for (const x of [-0.5, 0.5]) {
    const upright = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.6, 0.1),
      mat(GHANA_PALETTE.timber)
    );
    upright.position.set(x, 0.8, 0);
    loom.add(upright);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), mat(GHANA_PALETTE.timber));
  beam.position.y = 1.55;
  loom.add(beam);
  const warp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), kenteMaterial(1, 1));
  warp.position.set(0, 0.85, 0);
  loom.add(warp);
  loom.position.set(-2.9, 0, -0.3);
  loom.rotation.y = 0.5;
  group.add(loom);

  const stool = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.42, 0.42),
    mat(GHANA_PALETTE.cocoa)
  );
  stool.position.set(2.3, 0.21, -0.5);
  group.add(stool);

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.3, 1.1),
    mat('#7A5233')
  );
  platform.position.set(0, 0.15, -0.55);
  platform.receiveShadow = true;
  group.add(platform);

  const trader = makePerson({
    cloth: GHANA_PALETTE.green,
    accent: GHANA_PALETTE.gold,
    skin: '#4A2C18',
    head: 'gele',
    wrapper: true,
    scale: 1.05,
  });
  trader.group.position.set(0, 0.3, -0.55);
  group.add(trader.group);

  // The price board, chalked in cedis.
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const draw = (price: number | null) => {
    if (!ctx) return;
    ctx.fillStyle = '#2A2B26';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = GHANA_PALETTE.gold;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 148);
    ctx.fillStyle = '#F2EAD6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Georgia, serif';
    ctx.fillText('KENTE', 128, 52);
    ctx.font = 'bold 50px Georgia, serif';
    ctx.fillText(price === null ? 'GH₵ ?' : `GH₵${price.toLocaleString()}`, 128, 116);
    texture.needsUpdate = true;
  };
  draw(null);

  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.72),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  card.position.set(-1.5, 1.08, 1.35);
  card.rotation.set(-0.3, 0.22, 0.04);
  group.add(card);

  return { group, trader, setPrice: draw };
}

function makePin(): THREE.Group {
  const group = new THREE.Group();
  const pinMat = new THREE.MeshBasicMaterial({ color: GHANA_PALETTE.red, depthTest: false });
  const headMat = new THREE.MeshBasicMaterial({ color: GHANA_PALETTE.gold, depthTest: false });
  const inkMat = new THREE.MeshBasicMaterial({ color: GHANA_PALETTE.ink, depthTest: false });

  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 10), pinMat);
  spike.position.y = 0.85;
  spike.rotation.x = Math.PI;
  spike.renderOrder = 999;
  group.add(spike);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), pinMat);
  head.position.y = 2.1;
  head.renderOrder = 999;
  group.add(head);

  // A black star, for Ghana.
  const star = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), headMat);
  star.position.set(0, 2.1, 0.55);
  star.renderOrder = 1000;
  group.add(star);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 18), inkMat);
  ring.position.y = 2.1;
  ring.renderOrder = 1000;
  group.add(ring);

  group.traverse((o) => {
    o.userData.pin = true;
  });
  return group;
}

const AKOSUA = { x: -18, y: 4 };
/** Kejetia is denser than Balogun: tighter rows, narrower lanes. */
const LANES_X = [-96, -60, -24, 12, 48, 84];
const LANES_Z = [-72, -40, -8, 24, 56];

export function buildKejetiaScene(): BuiltScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GHANA_PALETTE.paper);
  scene.fog = new THREE.Fog(GHANA_PALETTE.paper, 65, 195);

  const rand = rng(41);
  const blockers: { x: number; z: number; r: number }[] = [];
  const CLEARING = 9;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(440, 440), mat(GHANA_PALETTE.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  for (const x of LANES_X) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(6, 200), mat(GHANA_PALETTE.lane));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(x, 0.02, 0);
    lane.receiveShadow = true;
    scene.add(lane);
  }
  for (const z of LANES_Z) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(230, 5), mat(GHANA_PALETTE.lane));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.021, z);
    lane.receiveShadow = true;
    scene.add(lane);
  }

  // --- Sealed roads around the market ---------------------------------------
  const roadLanesZ = [LANES_X[0], LANES_X[LANES_X.length - 1]];
  const roadLanesX = [LANES_Z[0], LANES_Z[LANES_Z.length - 1]];

  const laySealedRoad = (along: 'x' | 'z', at: number, length: number) => {
    const width = 11;
    const road = new THREE.Mesh(
      along === 'z'
        ? new THREE.PlaneGeometry(width, length)
        : new THREE.PlaneGeometry(length, width),
      mat(GHANA_PALETTE.asphalt)
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(along === 'z' ? at : 0, 0.03, along === 'z' ? 0 : at);
    road.receiveShadow = true;
    scene.add(road);

    const dashes = Math.floor(length / 9);
    for (let i = 0; i < dashes; i++) {
      const offset = -length / 2 + 4.5 + i * 9;
      const dash = new THREE.Mesh(
        along === 'z' ? new THREE.PlaneGeometry(0.28, 3.6) : new THREE.PlaneGeometry(3.6, 0.28),
        mat(GHANA_PALETTE.asphaltLine)
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(along === 'z' ? at : offset, 0.035, along === 'z' ? offset : at);
      scene.add(dash);
    }
  };
  for (const at of roadLanesZ) laySealedRoad('z', at, 220);
  for (const at of roadLanesX) laySealedRoad('x', at, 240);

  // --- The roof sea: dense rows of low kiosks -------------------------------
  for (let i = 0; i < LANES_X.length - 1; i++) {
    for (let j = 0; j < LANES_Z.length - 1; j++) {
      const cx = (LANES_X[i] + LANES_X[i + 1]) / 2;
      const cz = (LANES_Z[j] + LANES_Z[j + 1]) / 2;
      for (const ox of [-11, 11]) {
        for (const oz of [-9, 9]) {
          const x = cx + ox + (rand() - 0.5) * 2;
          const z = cz + oz + (rand() - 0.5) * 2;
          if (Math.hypot(x - AKOSUA.x, z - AKOSUA.y) < CLEARING) continue;
          if (rand() < 0.12) continue;

          if (rand() < 0.45) {
            const stall = kenteStall(rand, (rand() * 3) | 0);
            stall.position.set(x, 0, z);
            stall.rotation.y = Math.round(rand() * 2) * Math.PI;
            scene.add(stall);
            blockers.push({ x, z, r: 2 });
          } else {
            const shop = kiosk(6 + rand() * 3, 5 + rand() * 2, rand);
            shop.position.set(x, 0, z);
            shop.rotation.y = Math.round(rand() * 4) * (Math.PI / 2);
            scene.add(shop);
            blockers.push({ x, z, r: 3.4 });
          }
        }
      }
    }
  }

  // --- Auntie Akosua --------------------------------------------------------
  const { group, trader, setPrice } = makeAkosuaStall();
  group.position.set(AKOSUA.x, 0, AKOSUA.y);
  scene.add(group);
  blockers.push({ x: AKOSUA.x, z: AKOSUA.y, r: 2.4 });

  // --- Greenery -------------------------------------------------------------
  for (let i = 0; i < 14; i++) {
    const x = (rand() - 0.5) * 220;
    const z = (rand() - 0.5) * 180;
    if (Math.hypot(x - AKOSUA.x, z - AKOSUA.y) < 16) continue;
    const treeGroup = new THREE.Group();
    const height = 3.6 + rand() * 2;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.46, height, 7),
      mat(GHANA_PALETTE.bark)
    );
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    for (let b = 0; b < 3; b++) {
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(1.7 + rand() * 0.8, 7, 5),
        mat(b % 2 ? GHANA_PALETTE.leaf : GHANA_PALETTE.leafDark)
      );
      blob.position.set((rand() - 0.5) * 2.2, height + 0.8 + rand(), (rand() - 0.5) * 2.2);
      blob.scale.y = 0.75;
      treeGroup.add(blob);
    }
    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
    blockers.push({ x, z, r: 1.3 });
  }

  // --- Pin and approach ring ------------------------------------------------
  const pin = makePin();
  pin.scale.setScalar(0.72);
  pin.position.set(AKOSUA.x, 3.2, AKOSUA.y - 0.6);
  scene.add(pin);

  const approachPoint = new THREE.Vector3(AKOSUA.x, 0, AKOSUA.y + 3.2);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.9, 22),
    new THREE.MeshBasicMaterial({
      color: GHANA_PALETTE.red,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(approachPoint.x, 0.06, approachPoint.z);
  marker.userData.pin = true;
  scene.add(marker);

  // --- Crowd ----------------------------------------------------------------
  interface Walker {
    person: Person;
    angle: number;
    radiusX: number;
    radiusZ: number;
    cx: number;
    cz: number;
    speed: number;
    lastX: number;
    lastZ: number;
  }
  const walkers: Walker[] = [];
  for (let i = 0; i < 28; i++) {
    const person = randomPerson(rand);
    scene.add(person.group);
    walkers.push({
      person,
      angle: rand() * Math.PI * 2,
      radiusX: 6 + rand() * 18,
      radiusZ: 5 + rand() * 14,
      cx: (rand() - 0.5) * 170,
      cz: (rand() - 0.5) * 130,
      speed: 0.12 + rand() * 0.22,
      lastX: 0,
      lastZ: 0,
    });
  }
  for (const offset of [-2.6, 2.4]) {
    const person = randomPerson(rand);
    person.group.position.set(AKOSUA.x + offset, 0, AKOSUA.y + 3);
    person.group.rotation.y = Math.PI;
    scene.add(person.group);
  }

  // --- Traffic: trotro and yellow-winged taxis ------------------------------
  const vehicles: Vehicle[] = [];
  const kinds: VehicleKind[] = [
    'trotro', 'trotro', 'trotro', 'ghanataxi', 'ghanataxi', 'trotro', 'ghanataxi', 'okada',
  ];
  kinds.forEach((kind, i) => {
    const vehicleGroup = makeVehicle(kind, rand);
    scene.add(vehicleGroup);
    const onZ = i % 3 !== 2;
    const lanes = onZ ? roadLanesZ : roadLanesX;
    const base = lanes[(rand() * lanes.length) | 0];
    const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
    vehicles.push({
      group: vehicleGroup,
      kind,
      axis: onZ ? 'z' : 'x',
      lane: base + direction * 1.6,
      direction,
      speed: kind === 'okada' ? 9 + rand() * 4 : 6 + rand() * 5,
      position: (rand() - 0.5) * 190,
      limit: 108,
    });
  });

  // --- Light ----------------------------------------------------------------
  const ambient = new THREE.HemisphereLight(0xfff4de, 0xa08868, 1.05);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0cf, 1.5);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 240;
  sun.shadow.bias = -0.0007;
  scene.add(sun);
  scene.add(sun.target);

  const POSTURES: Record<TraderMood, { arms: number; lean: number; tilt: number; spread: number }> = {
    idle: { arms: 0, lean: 0, tilt: 0, spread: 0 },
    speaking: { arms: -0.3, lean: 0.06, tilt: 0.05, spread: 0.18 },
    listening: { arms: -0.12, lean: 0.16, tilt: 0.14, spread: 0 },
    warm: { arms: -0.85, lean: 0.1, tilt: -0.06, spread: 0.45 },
    pleased: { arms: -0.45, lean: 0.05, tilt: -0.04, spread: 0.2 },
    cool: { arms: 1.25, lean: -0.12, tilt: -0.02, spread: -0.3 },
  };
  let mood: TraderMood = 'idle';

  const update = (dt: number, elapsed: number) => {
    pin.position.y = 3.2 + Math.sin(elapsed * 2) * 0.22;
    pin.rotation.y = elapsed * 0.9;

    const target = POSTURES[mood];
    const k = Math.min(1, dt * 4.5);
    const limbs = trader.limbs;
    limbs.leftArm.rotation.x += (target.arms - limbs.leftArm.rotation.x) * k;
    limbs.rightArm.rotation.x += (target.arms - limbs.rightArm.rotation.x) * k;
    limbs.leftArm.rotation.z += (-target.spread - limbs.leftArm.rotation.z) * k;
    limbs.rightArm.rotation.z += (target.spread - limbs.rightArm.rotation.z) * k;
    limbs.torso.rotation.x += (target.lean - limbs.torso.rotation.x) * k;
    limbs.head.rotation.z += (target.tilt - limbs.head.rotation.z) * k;
    limbs.torso.position.y = Math.sin(elapsed * 1.5) * 0.012;
    if (mood === 'speaking') limbs.head.rotation.x = Math.sin(elapsed * 9) * 0.07;
    else limbs.head.rotation.x *= 0.9;

    for (const w of walkers) {
      // Scratch values rather than Vector3 clones: two allocations per walker
      // per frame was enough garbage to cause periodic collection pauses.
      const prevX = w.person.group.position.x;
      const prevZ = w.person.group.position.z;
      w.angle += w.speed * dt * 0.25;
      let x = w.cx + Math.cos(w.angle) * w.radiusX;
      let z = w.cz + Math.sin(w.angle) * w.radiusZ;
      for (const b of blockers) {
        const dx = x - b.x;
        const dz = z - b.z;
        const distance = Math.hypot(dx, dz);
        const minimum = b.r + 0.6;
        if (distance < minimum && distance > 0.0001) {
          x = b.x + (dx / distance) * minimum;
          z = b.z + (dz / distance) * minimum;
        }
      }
      w.person.group.position.set(x, w.person.group.position.y, z);
      w.lastX = prevX;
      w.lastZ = prevZ;
    }

    // Shoppers used to walk straight through one another. One relaxation pass
    // over the crowd: each overlapping pair is pushed apart by half the
    // overlap, which is enough to keep bodies separate without a real
    // simulation. O(n^2) over ~30 people is a few hundred checks.
    const SEPARATION = 0.95;
    for (let i = 0; i < walkers.length; i++) {
      const a = walkers[i].person.group.position;
      for (let j = i + 1; j < walkers.length; j++) {
        const b = walkers[j].person.group.position;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distance = Math.hypot(dx, dz);
        if (distance >= SEPARATION || distance < 0.0001) continue;
        const push = (SEPARATION - distance) / 2;
        const nx = dx / distance;
        const nz = dz / distance;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
      }
    }

    for (const w of walkers) {
      const dx = w.person.group.position.x - w.lastX;
      const dz = w.person.group.position.z - w.lastZ;
      const moved = Math.hypot(dx, dz);
      if (moved > 0.001) {
        w.person.group.rotation.y = Math.atan2(dx, dz);
      }
      animateWalk(w.person, elapsed, moved / Math.max(dt, 0.001) / 3);
    }
    updateVehicles(vehicles, dt);
  };

  return {
    scene,
    sun,
    ambient,
    trader,
    bisiPosition: new THREE.Vector3(AKOSUA.x, 0, AKOSUA.y),
    blockers,
    pin,
    approachPoint,
    setPrice,
    setTraderMood: (next: TraderMood) => {
      mood = next;
    },
    traderHead: (out = headScratch) => {
      trader.limbs.head.getWorldPosition(out);
      out.y += 0.55;
      return out;
    },
    update,
  };
}
