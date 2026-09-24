// Procedural 3D Balogun Market — prototype.
//
// No models, no textures, no asset pipeline: every object is built from
// primitives in code and flat-shaded in the HearAfrica palette, so this is the
// existing illustrated style extruded rather than a different art direction.
//
// Layout comes from src/data/market-data.ts, whose x/y metre offsets become
// (x, 0, y) in world space, so this is the same market the 2D map already draws.

import * as THREE from 'three';
import { UMB, BLD, NPCS, LX, LY } from '@/data/market-data';
import { rng } from '@/data/lagos-data';
import {
  animateWalk,
  clearPeopleCaches,
  makePerson,
  Person,
  randomPerson,
  CLOTH_COLOURS,
} from './people';
import {
  clearVehicleCaches,
  makeVehicle,
  updateVehicles,
  Vehicle,
  VehicleKind,
} from './vehicles';

export const PALETTE = {
  paper: '#F7EFE2',
  ink: '#1D1510',
  ground: '#C9B291',
  lane: '#D9C7A4',
  pink: '#F2A1CB',
  pink2: '#E0609F',
  marigold: '#F6B82C',
  orange: '#F28A2E',
  green: '#11663F',
  olive: '#8C8A2B',
  brown: '#9A5A38',
  brown2: '#B8683A',
  timber: '#8A5A36',
  tomato: '#D44A28',
  pepper: '#B3231B',
  plantain: '#C9C22B',
  zinc: '#9BA3A6',
  zincRust: '#8A5B43',
  skin: '#5A3A26',
  asphalt: '#4B4A46',
  asphaltLine: '#D9CFA8',
  leaf: '#2F6B34',
  leafDark: '#24512A',
  palm: '#3C7A3A',
  bark: '#6B4A2F',
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

/** Shapes repeat across ~160 stalls, so build each one once. */
const geometryCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = build();
    geometryCache.set(key, geometry);
  }
  return geometry as T;
}

/** See clearPeopleCaches: shared resources must not outlive a disposed scene. */
export function clearSceneCaches() {
  geometryCache.clear();
  materialCache.clear();
  clearPeopleCaches();
  clearVehicleCaches();
}

/** Outlines are what keep the drawn look once geometry is extruded. */
function outline(mesh: THREE.Mesh, colour = PALETTE.ink, opacity = 0.45) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
  mesh.add(
    new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity })
    )
  );
  return mesh;
}

/** A corrugated zinc sheet — the roof of most of Lagos. */
function zincRoof(width: number, depth: number, rusty: boolean, pitch = 0): THREE.Group {
  const group = new THREE.Group();
  const colour = rusty ? PALETTE.zincRust : PALETTE.zinc;

  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), mat(colour));
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  // Ribs, to catch the light the way corrugation does.
  const ribs = Math.max(2, Math.floor(width / 1.6));
  for (let i = 0; i < ribs; i++) {
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, depth, 5),
      mat(rusty ? '#9A6A4E' : '#AEB6B9')
    );
    rib.rotation.x = Math.PI / 2;
    rib.position.set(-width / 2 + (i + 0.5) * (width / ribs), 0.06, 0);
    group.add(rib);
  }

  group.rotation.x = pitch;
  return group;
}

/** Goods piled on a counter: tomatoes, peppers, plantain, oranges. */
function goodsPile(kind: number, rand: () => number): THREE.Group {
  const group = new THREE.Group();

  if (kind === 0 || kind === 1) {
    const colour = kind === 0 ? PALETTE.tomato : PALETTE.pepper;
    const basin = new THREE.Mesh(
      geo('basin', () => new THREE.CylinderGeometry(0.5, 0.36, 0.34, 10)),
      mat(kind === 0 ? PALETTE.brown2 : '#9BA3A6')
    );
    group.add(basin);
    const heap = new THREE.Mesh(
      geo('heap', () => new THREE.SphereGeometry(0.44, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      mat(colour)
    );
    heap.position.y = 0.15;
    group.add(heap);
  } else if (kind === 2) {
    // A hand of plantain.
    for (let i = 0; i < 5; i++) {
      const finger = new THREE.Mesh(
        geo('plantain', () => new THREE.CapsuleGeometry(0.075, 0.38, 3, 6)),
        mat(PALETTE.plantain)
      );
      finger.rotation.z = Math.PI / 2;
      finger.rotation.y = (i - 2) * 0.16;
      finger.position.set(0, 0.1 + i * 0.055, (i - 2) * 0.06);
      group.add(finger);
    }
  } else if (kind === 3) {
    // Stacked sacks of grain.
    for (let i = 0; i < 3; i++) {
      const sack = new THREE.Mesh(
        geo('sack', () => new THREE.CapsuleGeometry(0.25, 0.3, 3, 7)),
        mat(i % 2 ? '#D8CBA8' : '#C6B68F')
      );
      sack.position.set((rand() - 0.5) * 0.18, 0.28 + i * 0.42, (rand() - 0.5) * 0.18);
      group.add(sack);
    }
  } else {
    // Bolts of ankara, stood on end.
    for (let i = 0; i < 4; i++) {
      const bolt = new THREE.Mesh(
        geo('bolt', () => new THREE.CylinderGeometry(0.11, 0.11, 0.8, 8)),
        mat(CLOTH_COLOURS[(rand() * CLOTH_COLOURS.length) | 0])
      );
      bolt.position.set((i - 1.5) * 0.26, 0.4, 0);
      bolt.rotation.z = (rand() - 0.5) * 0.25;
      group.add(bolt);
    }
  }
  return group;
}

/** A palm, the quickest way to say "this is the coast of West Africa". */
function palmTree(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const height = 6 + rand() * 4;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.32, height, 7),
    mat(PALETTE.bark)
  );
  trunk.position.y = height / 2;
  trunk.rotation.z = (rand() - 0.5) * 0.14;
  trunk.castShadow = true;
  group.add(trunk);

  // Five fronds, and none of them cast shadows: a canopy of shadow-casting
  // cones across dozens of palms was what took this scene from 100fps to 14.
  const frondGeo = new THREE.ConeGeometry(0.42, 3.4, 4);
  const frondMat = mat(rand() < 0.5 ? PALETTE.palm : PALETTE.leafDark);
  for (let i = 0; i < 5; i++) {
    const frond = new THREE.Mesh(frondGeo, frondMat);
    const angle = (i / 5) * Math.PI * 2;
    frond.position.set(Math.cos(angle) * 1.5, height + 0.2, Math.sin(angle) * 1.5);
    frond.rotation.z = Math.cos(angle) * 1.15;
    frond.rotation.x = -Math.sin(angle) * 1.15;
    group.add(frond);
  }

  return group;
}

/** A broad-canopy tree, the kind traders sit under. */
function broadTree(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const height = 3.4 + rand() * 2;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.44, height, 7),
    mat(PALETTE.bark)
  );
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  group.add(trunk);

  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 + rand() * 0.8, 7, 5),
      mat(i % 2 ? PALETTE.leaf : PALETTE.leafDark)
    );
    blob.position.set(
      (rand() - 0.5) * 2.2,
      height + 0.7 + rand() * 1.0,
      (rand() - 0.5) * 2.2
    );
    blob.scale.y = 0.75;
    group.add(blob);
  }
  return group;
}

/** A low shrub or grass tuft. */
function shrub(rand: () => number): THREE.Mesh {
  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(0.5 + rand() * 0.55, 7, 5),
    mat(rand() < 0.5 ? PALETTE.leaf : PALETTE.leafDark)
  );
  bush.position.y = 0.32;
  bush.scale.y = 0.62;
  bush.castShadow = true;
  return bush;
}

/** The waypoint marker floating over Iya Bisi's stall. */
function makePin(): THREE.Group {
  const group = new THREE.Group();

  // Drawn on top of everything so it stays findable across the market.
  const pinMat = new THREE.MeshBasicMaterial({ color: PALETTE.pink2, depthTest: false });
  const headMat = new THREE.MeshBasicMaterial({ color: PALETTE.marigold, depthTest: false });
  const inkMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, depthTest: false });

  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 10), pinMat);
  spike.position.y = 0.85;
  spike.rotation.x = Math.PI;
  spike.renderOrder = 999;
  group.add(spike);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), pinMat);
  head.position.y = 2.1;
  head.renderOrder = 999;
  group.add(head);

  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), headMat);
  dot.position.y = 2.1;
  dot.position.z = 0.55;
  dot.renderOrder = 1000;
  group.add(dot);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 18), inkMat);
  ring.position.y = 2.1;
  ring.renderOrder = 1000;
  group.add(ring);

  group.traverse((o) => {
    o.userData.pin = true;
  });
  return group;
}

/** An umbrella-and-table pitch, the commonest kind in the market. */
function umbrellaStall(radius: number, top: string, trim: string, rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const height = 3.3;

  const r = Math.round(radius * 4) / 4; // Quantised so the cache actually hits.

  const pole = new THREE.Mesh(
    geo('pole', () => new THREE.CylinderGeometry(0.07, 0.07, height, 6)),
    mat(PALETTE.timber)
  );
  pole.position.y = height / 2;
  group.add(pole);

  const canopy = new THREE.Mesh(
    geo(`canopy${r}`, () => new THREE.ConeGeometry(r, r * 0.5, 9)),
    mat(top)
  );
  canopy.position.y = height;
  canopy.castShadow = true;
  group.add(canopy);

  const band = new THREE.Mesh(
    geo(`band${r}`, () => new THREE.CylinderGeometry(r * 0.99, r * 0.99, 0.1, 9)),
    mat(trim)
  );
  band.position.y = height - r * 0.25;
  group.add(band);

  // One trestle rather than a top and four legs: four boxes per stall across
  // 160 stalls was 640 draw calls on its own.
  const table = new THREE.Mesh(
    geo(`table${r}`, () => new THREE.BoxGeometry(r * 1.5, 0.12, r * 0.95)),
    mat(PALETTE.timber)
  );
  table.position.y = 0.85;
  table.receiveShadow = true;
  group.add(table);

  const trestle = new THREE.Mesh(
    geo(`trestle${r}`, () => new THREE.BoxGeometry(r * 1.35, 0.8, r * 0.7)),
    mat('#6F492C')
  );
  trestle.position.y = 0.42;
  group.add(trestle);

  const count = 2 + ((rand() * 2) | 0);
  for (let i = 0; i < count; i++) {
    const pile = goodsPile((rand() * 5) | 0, rand);
    pile.position.set(
      (i - (count - 1) / 2) * (radius * 0.55),
      0.95,
      (rand() - 0.5) * radius * 0.3
    );
    pile.scale.setScalar(0.95 + rand() * 0.4);
    group.add(pile);
  }

  return group;
}

/** A lock-up shop: timber walls, corrugated roof, open shutter. */
function lockUpShop(w: number, d: number, roofColour: string, rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const storeys = rand() < 0.22 ? 2 : 1;
  const h = 3 * storeys;

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat(roofColour)
  );
  walls.position.y = h / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  outline(walls);
  group.add(walls);

  const roof = zincRoof(w * 1.12, d * 1.12, rand() < 0.45);
  roof.position.y = h + 0.06;
  group.add(roof);

  // A dark open shop front.
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.6, 1.9, 0.08),
    mat('#2A1D14')
  );
  front.position.set(0, 0.95, d / 2 + 0.03);
  group.add(front);

  // A shade awning over the front.
  if (rand() < 0.6) {
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.95, 0.07, 1.5),
      mat(CLOTH_COLOURS[(rand() * CLOTH_COLOURS.length) | 0])
    );
    awning.position.set(0, 2.35, d / 2 + 0.7);
    awning.rotation.x = 0.22;
    awning.castShadow = true;
    group.add(awning);
  }

  if (storeys === 2) {
    for (const sx of [-0.28, 0.28]) {
      const window = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.2, 0.8, 0.07),
        mat('#5E7A86')
      );
      window.position.set(sx * w, 4.2, d / 2 + 0.03);
      group.add(window);
    }
  }

  return group;
}

/**
 * The chalk price card propped on her counter. This is the price meter: a
 * number on a board in the world rather than a readout in a panel.
 */
function makePriceCard(): { mesh: THREE.Mesh; setPrice: (price: number | null) => void } {
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
    ctx.strokeStyle = '#8A5A36';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 148);

    ctx.fillStyle = '#F2EAD6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText('TÒMÁTÌ', 128, 52);

    ctx.font = 'bold 56px Georgia, serif';
    // Squeezed rather than clipped when a bulk price runs to six characters.
    ctx.fillText(price === null ? '₦ ?' : `₦${price.toLocaleString()}`, 128, 116, 216);
    texture.needsUpdate = true;
  };

  draw(null);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.72),
    new THREE.MeshBasicMaterial({ map: texture })
  );

  return { mesh, setPrice: draw };
}

/** Iya Bisi's stall: counter, baskets of tomatoes, and Iya Bisi herself. */
function makeBisiStall(): {
  group: THREE.Group;
  trader: Person;
  setPrice: (price: number | null) => void;
} {
  const group = new THREE.Group();
  const bisi = NPCS.bisi;
  const rand = rng(11);

  // Her own canopy, higher and a little tighter than the generic pitches so the
  // counter beneath it stays readable.
  // Higher and tighter than before: the old canopy cropped her head.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 4.8, 6),
    mat(PALETTE.timber)
  );
  pole.position.y = 2.4;
  group.add(pole);

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.3, 9), mat(PALETTE.marigold));
  canopy.position.y = 4.9;
  canopy.castShadow = true;
  outline(canopy);
  group.add(canopy);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.67, 2.67, 0.12, 9),
    mat(PALETTE.pink2)
  );
  band.position.y = 4.6;
  group.add(band);

  // A back frame with cloth hung on it: this is what makes it read as a stall
  // rather than a table under a parasol.
  // Cloth hung on a frame behind her — moved out from under the canopy's
  // shadow and made taller so it actually reads.
  const backFrame = new THREE.Mesh(new THREE.BoxGeometry(5, 0.09, 0.09), mat(PALETTE.timber));
  backFrame.position.set(0, 3.1, -2.1);
  group.add(backFrame);
  for (const [i, colour] of [PALETTE.pink, PALETTE.green, PALETTE.orange].entries()) {
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.1, 0.05), mat(colour));
    cloth.position.set((i - 1) * 1.6, 2.05, -2.1);
    cloth.castShadow = true;
    group.add(cloth);
  }

  // A lower counter, so she is not hidden behind her own goods.
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.82, 1.4), mat(PALETTE.timber));
  counter.position.set(0, 0.41, 1.4);
  counter.castShadow = true;
  counter.receiveShadow = true;
  outline(counter, PALETTE.ink, 0.55);
  group.add(counter);

  for (const x of [-1.5, 0, 1.5]) {
    const pile = goodsPile(x === 0 ? 1 : 0, rand);
    pile.position.set(x, 0.95, 1.4);
    pile.scale.setScalar(1.2);
    group.add(pile);
  }

  // A crate of extra stock, and a stool.
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.9), mat(PALETTE.brown2));
  crate.position.set(-2.3, 0.35, 0.2);
  crate.castShadow = true;
  outline(crate);
  group.add(crate);

  const stool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.3, 0.45, 8),
    mat(PALETTE.timber)
  );
  stool.position.set(1.9, 0.22, -0.4);
  group.add(stool);

  const trader = makePerson({
    cloth: bisi.cloth,
    accent: bisi.wrap ?? PALETTE.pink2,
    skin: '#4A2C18',
    head: 'gele',
    wrapper: true,
    scale: 1.06,
  });
  // Traders stand on a plank behind the counter, which also lifts her clear of
  // it so her face and gele are visible from the customer side.
  const platform = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.2), mat(PALETTE.brown2));
  platform.position.set(0, 0.15, -0.9);
  platform.receiveShadow = true;
  group.add(platform);

  // Behind the counter, facing the customer side (+z). The group is NOT
  // rotated: rotating it put her in front of her own counter.
  trader.group.position.set(0, 0.3, -0.9);
  group.add(trader.group);

  const card = makePriceCard();
  card.mesh.position.set(-1.55, 1.05, 2.05);
  card.mesh.rotation.set(-0.32, 0.2, 0.04);
  group.add(card.mesh);

  return { group, trader, setPrice: card.setPrice };
}

/** How the trader is holding herself. This is the rapport meter. */
export type TraderMood = 'idle' | 'speaking' | 'listening' | 'warm' | 'pleased' | 'cool';

export interface BuiltScene {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  trader: Person;
  bisiPosition: THREE.Vector3;
  blockers: { x: number; z: number; r: number }[];
  /** The waypoint marker over Iya Bisi's stall. */
  pin: THREE.Group;
  /** Where a learner should stand to talk to her. */
  approachPoint: THREE.Vector3;
  /** Writes the agreed price onto the chalk card on her counter. */
  setPrice: (price: number | null) => void;
  /** Sets her posture. Warmth is shown by how she stands, not by a bar. */
  setTraderMood: (mood: TraderMood) => void;
  /**
   * World position of her head, for anchoring a speech bubble. Writes into
   * `out` (a shared scratch vector by default) rather than allocating.
   */
  traderHead: (out?: THREE.Vector3) => THREE.Vector3;
  /** Advances crowd and traffic. */
  update: (dt: number, elapsed: number) => void;
}

interface Walker {
  person: Person;
  angle: number;
  radiusX: number;
  radiusZ: number;
  cx: number;
  cz: number;
  speed: number;
  /** Previous position, so facing survives the separation pass. */
  lastX: number;
  lastZ: number;
}

export function buildBaloganScene(): BuiltScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.paper);
  scene.fog = new THREE.Fog(PALETTE.paper, 70, 210);

  const rand = rng(17);
  const blockers: { x: number; z: number; r: number }[] = [];
  const bisiSpot = NPCS.bisi;
  const CLEARING = 9;

  // --- Ground and lanes -----------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 460),
    mat(PALETTE.ground)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Dust lanes between the stalls.
  for (const x of LX) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(7, 220), mat(PALETTE.lane));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(x, 0.02, 0);
    lane.receiveShadow = true;
    scene.add(lane);
  }
  for (const y of LY) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(250, 6), mat(PALETTE.lane));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.021, y);
    lane.receiveShadow = true;
    scene.add(lane);
  }

  // --- Asphalt roads on the routes the traffic uses -------------------------
  const roadLanesZ = [LX[0], LX[1], LX[LX.length - 2], LX[LX.length - 1]];
  const roadLanesX = [LY[0], LY[LY.length - 1]];

  const laySealedRoad = (along: 'x' | 'z', at: number, length: number) => {
    const width = 11;
    const road = new THREE.Mesh(
      along === 'z'
        ? new THREE.PlaneGeometry(width, length)
        : new THREE.PlaneGeometry(length, width),
      mat(PALETTE.asphalt)
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(along === 'z' ? at : 0, 0.03, along === 'z' ? 0 : at);
    road.receiveShadow = true;
    scene.add(road);

    // Broken centre line.
    const dashes = Math.floor(length / 9);
    for (let i = 0; i < dashes; i++) {
      const offset = -length / 2 + 4.5 + i * 9;
      const dash = new THREE.Mesh(
        along === 'z'
          ? new THREE.PlaneGeometry(0.28, 3.6)
          : new THREE.PlaneGeometry(3.6, 0.28),
        mat(PALETTE.asphaltLine)
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(
        along === 'z' ? at : offset,
        0.035,
        along === 'z' ? offset : at
      );
      scene.add(dash);
    }

    // Kerbs.
    for (const side of [-1, 1]) {
      const kerb = new THREE.Mesh(
        along === 'z'
          ? new THREE.BoxGeometry(0.5, 0.22, length)
          : new THREE.BoxGeometry(length, 0.22, 0.5),
        mat('#B9B2A2')
      );
      kerb.position.set(
        along === 'z' ? at + side * (width / 2 + 0.25) : 0,
        0.11,
        along === 'z' ? 0 : at + side * (width / 2 + 0.25)
      );
      scene.add(kerb);
    }
  };

  for (const at of roadLanesZ) laySealedRoad('z', at, 240);
  for (const at of roadLanesX) laySealedRoad('x', at, 260);

  // --- Shops around the market ---------------------------------------------
  for (const b of BLD) {
    if (Math.abs(b.x) > 175 || Math.abs(b.y) > 155) continue;
    if (Math.hypot(b.x - bisiSpot.x, b.y - bisiSpot.y) < 12) continue;
    const shop = lockUpShop(b.w * 0.52, b.h * 0.52, b.c, rand);
    shop.position.set(b.x, 0, b.y);
    shop.rotation.y = Math.round(rand() * 4) * (Math.PI / 2);
    scene.add(shop);
    blockers.push({ x: b.x, z: b.y, r: Math.max(b.w, b.h) * 0.32 });
  }

  // --- Umbrella pitches -----------------------------------------------------
  for (const u of UMB) {
    if (Math.hypot(u.x - bisiSpot.x, u.y - bisiSpot.y) < CLEARING) continue;
    const stall = umbrellaStall(u.r * 0.85, u.c[0], u.c[1], rand);
    stall.position.set(u.x, 0, u.y);
    stall.rotation.y = u.a;
    scene.add(stall);
    blockers.push({ x: u.x, z: u.y, r: u.r * 0.62 });
  }

  // --- Iya Bisi -------------------------------------------------------------
  const { group, trader, setPrice } = makeBisiStall();
  group.position.set(bisiSpot.x, 0, bisiSpot.y);
  scene.add(group);
  blockers.push({ x: bisiSpot.x, z: bisiSpot.y, r: 2.4 });

  // --- Greenery -------------------------------------------------------------
  // Palms line the sealed roads; broad trees and shrubs fill the gaps between
  // the market and the shops.
  for (const at of roadLanesZ) {
    for (let z = -110; z <= 110; z += 46) {
      for (const side of [-1, 1]) {
        if (rand() < 0.45) continue;
        const tree = palmTree(rand);
        tree.position.set(at + side * 9.5, 0, z + (rand() - 0.5) * 5);
        scene.add(tree);
        blockers.push({ x: tree.position.x, z: tree.position.z, r: 0.9 });
      }
    }
  }
  for (const at of roadLanesX) {
    for (let x = -120; x <= 120; x += 52) {
      for (const side of [-1, 1]) {
        if (rand() < 0.5) continue;
        const tree = palmTree(rand);
        tree.position.set(x + (rand() - 0.5) * 6, 0, at + side * 9.5);
        scene.add(tree);
        blockers.push({ x: tree.position.x, z: tree.position.z, r: 0.9 });
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    const x = (rand() - 0.5) * 230;
    const z = (rand() - 0.5) * 190;
    if (Math.abs(x) < 120 && Math.abs(z) < 95) continue;
    if (Math.hypot(x - bisiSpot.x, z - bisiSpot.y) < 16) continue;
    const tree = broadTree(rand);
    tree.position.set(x, 0, z);
    scene.add(tree);
    blockers.push({ x, z, r: 1.3 });
  }

  // One instanced mesh rather than 70 separate objects.
  const SHRUBS = 80;
  const shrubMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.55, 7, 5),
    mat(PALETTE.leaf),
    SHRUBS
  );
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let i = 0; i < SHRUBS * 3 && placed < SHRUBS; i++) {
    const x = (rand() - 0.5) * 250;
    const z = (rand() - 0.5) * 210;
    if (Math.hypot(x - bisiSpot.x, z - bisiSpot.y) < 10) continue;
    dummy.position.set(x, 0.3, z);
    const scale = 0.7 + rand() * 0.8;
    dummy.scale.set(scale, scale * 0.6, scale);
    dummy.updateMatrix();
    shrubMesh.setMatrixAt(placed++, dummy.matrix);
  }
  shrubMesh.count = placed;
  shrubMesh.instanceMatrix.needsUpdate = true;
  scene.add(shrubMesh);

  // --- Waypoint pin over Iya Bisi -------------------------------------------
  const pin = makePin();
  // Low enough to stay inside the frustum from the chase camera, high enough to
  // clear her canopy.
  // It draws through geometry (depthTest off), so it can sit low over the
  // counter and still be seen from anywhere — and it stays in frame.
  pin.scale.setScalar(0.72);
  pin.position.set(bisiSpot.x, 3.2, bisiSpot.y - 0.6);
  scene.add(pin);

  // A ring on the ground marking where to stand to talk to her.
  const approachPoint = new THREE.Vector3(bisiSpot.x, 0, bisiSpot.y + 3.4);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.9, 22),
    new THREE.MeshBasicMaterial({
      color: PALETTE.pink2,
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
  // Shoppers drift along elliptical paths through the lanes. Enough to feel
  // busy without paying for a full navigation system.
  const walkers: Walker[] = [];
  for (let i = 0; i < 30; i++) {
    const person = randomPerson(rand);
    const cx = (rand() - 0.5) * 190;
    const cz = (rand() - 0.5) * 150;
    const walker: Walker = {
      person,
      angle: rand() * Math.PI * 2,
      radiusX: 6 + rand() * 20,
      radiusZ: 5 + rand() * 16,
      cx,
      cz,
      speed: 0.12 + rand() * 0.22,
      lastX: 0,
      lastZ: 0,
    };
    scene.add(person.group);
    walkers.push(walker);
  }

  // A few people standing still at stalls, haggling.
  for (let i = 0; i < 10; i++) {
    const person = randomPerson(rand);
    const u = UMB[(rand() * UMB.length) | 0];
    if (!u) continue;
    person.group.position.set(u.x + (rand() - 0.5) * 3, 0, u.y + 2.2 + rand() * 1.4);
    person.group.rotation.y = Math.PI + (rand() - 0.5) * 0.7;
    scene.add(person.group);
  }

  // Two customers already at Iya Bisi's, so her stall looks like a going concern.
  for (const offset of [-2.6, 2.4]) {
    const person = randomPerson(rand);
    person.group.position.set(bisiSpot.x + offset, 0, bisiSpot.y + 3.1);
    person.group.rotation.y = Math.PI;
    scene.add(person.group);
  }

  // --- Traffic on the outer lanes ------------------------------------------
  const vehicles: Vehicle[] = [];
  const kinds: VehicleKind[] = [
    'danfo', 'danfo', 'danfo', 'keke', 'keke', 'taxi', 'okada', 'okada',
    'danfo', 'keke', 'taxi', 'okada',
  ];
  const roadsZ = [LX[0], LX[LX.length - 1], LX[1], LX[LX.length - 2]];
  const roadsX = [LY[0], LY[LY.length - 1]];

  kinds.forEach((kind, i) => {
    const group = makeVehicle(kind, rand);
    scene.add(group);
    const onZ = i % 3 !== 2;
    const axis: 'x' | 'z' = onZ ? 'z' : 'x';
    const lanes = onZ ? roadsZ : roadsX;
    const base = lanes[(rand() * lanes.length) | 0];
    const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
    vehicles.push({
      group,
      kind,
      axis,
      // Offset from the centre line so opposing traffic does not overlap.
      lane: base + direction * 1.6,
      direction,
      speed: kind === 'okada' ? 9 + rand() * 5 : kind === 'keke' ? 5 + rand() * 3 : 7 + rand() * 5,
      position: (rand() - 0.5) * 200,
      limit: 115,
    });
  });

  // --- Light ----------------------------------------------------------------
  const ambient = new THREE.HemisphereLight(0xfff4de, 0xa8926e, 1.05);
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

  // Posture targets per mood: arm swing, lean, and head tilt. Eased towards
  // each frame so she settles into a stance rather than snapping.
  const POSTURES: Record<TraderMood, { arms: number; lean: number; tilt: number; spread: number }> = {
    idle: { arms: 0, lean: 0, tilt: 0, spread: 0 },
    speaking: { arms: -0.3, lean: 0.06, tilt: 0.05, spread: 0.18 },
    listening: { arms: -0.12, lean: 0.16, tilt: 0.14, spread: 0 },
    warm: { arms: -0.85, lean: 0.1, tilt: -0.06, spread: 0.45 },
    pleased: { arms: -0.45, lean: 0.05, tilt: -0.04, spread: 0.2 },
    // Arms folded, drawn back, chin level: understood, but no warmth.
    cool: { arms: 1.25, lean: -0.12, tilt: -0.02, spread: -0.3 },
  };
  let mood: TraderMood = 'idle';
  const setTraderMood = (next: TraderMood) => {
    mood = next;
  };

  const update = (dt: number, elapsed: number) => {
    pin.position.y = 3.2 + Math.sin(elapsed * 2) * 0.22;

    // Ease her towards the current posture.
    const target = POSTURES[mood];
    const k = Math.min(1, dt * 4.5);
    const limbs = trader.limbs;
    limbs.leftArm.rotation.x += (target.arms - limbs.leftArm.rotation.x) * k;
    limbs.rightArm.rotation.x += (target.arms - limbs.rightArm.rotation.x) * k;
    limbs.leftArm.rotation.z += (-target.spread - limbs.leftArm.rotation.z) * k;
    limbs.rightArm.rotation.z += (target.spread - limbs.rightArm.rotation.z) * k;
    limbs.torso.rotation.x += (target.lean - limbs.torso.rotation.x) * k;
    limbs.head.rotation.z += (target.tilt - limbs.head.rotation.z) * k;

    // A little life on top: breathing, and a nod while she speaks.
    limbs.torso.position.y = Math.sin(elapsed * 1.5) * 0.012;
    if (mood === 'speaking') {
      limbs.head.rotation.x = Math.sin(elapsed * 9) * 0.07;
    } else {
      limbs.head.rotation.x *= 0.9;
    }
    pin.rotation.y = elapsed * 0.9;

    for (const w of walkers) {
      // Scratch values rather than Vector3 clones: two allocations per walker
      // per frame was enough garbage to cause periodic collection pauses.
      const prevX = w.person.group.position.x;
      const prevZ = w.person.group.position.z;
      w.angle += w.speed * dt * 0.25;
      let x = w.cx + Math.cos(w.angle) * w.radiusX;
      let z = w.cz + Math.sin(w.angle) * w.radiusZ;

      // Shoppers used to walk through stalls and trees. Push them back out.
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
    bisiPosition: new THREE.Vector3(bisiSpot.x, 0, bisiSpot.y),
    blockers,
    pin,
    approachPoint,
    setPrice,
    setTraderMood,
    traderHead: (out = headScratch) => {
      trader.limbs.head.getWorldPosition(out);
      out.y += 0.55;
      return out;
    },
    update,
  };
}

/**
 * Positions the sun from a solar elevation in degrees and tints the scene for
 * the time of day, so the existing simulated clock drives the lighting.
 */
export function applySunElevation(built: BuiltScene, elevationDeg: number, azimuthRad = 0.9) {
  const elevation = THREE.MathUtils.degToRad(Math.max(-12, elevationDeg));
  const distance = 95;
  built.sun.position.set(
    Math.cos(azimuthRad) * Math.cos(elevation) * distance,
    Math.max(5, Math.sin(elevation) * distance),
    Math.sin(azimuthRad) * Math.cos(elevation) * distance
  );

  const day = THREE.MathUtils.clamp(elevationDeg / 18, 0, 1);
  const dusk = 1 - day;

  built.sun.intensity = 0.3 + day * 1.4;
  built.sun.color.setHSL(0.09 - dusk * 0.03, 0.45 + dusk * 0.3, 0.72 - dusk * 0.12);
  built.ambient.intensity = 0.32 + day * 0.78;

  const sky = new THREE.Color(PALETTE.paper).lerp(new THREE.Color('#232B45'), dusk * 0.78);
  (built.scene.background as THREE.Color).copy(sky);
  built.scene.fog?.color.copy(sky);
}

export { makePerson };
