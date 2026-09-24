// Procedural 3D matatu stage, Nairobi CBD.
//
// Built the same way as Balogun and Kejetia — primitives, flat-shaded, no
// assets — but it is deliberately not a third market. The other two worlds are
// grids of stalls you wander; this is a terminus: a tarmac yard with painted
// bays, vehicles nosed in, and a city standing over it. What makes it Nairobi:
//
//   - Graffiti matatus. The livery is painted art (see makeMatatu in
//     vehicles.ts), which is the single most recognisable thing in the yard.
//   - A CBD skyline. Mid-rise concrete and glass behind the stage, where the
//     markets have sheds and zinc.
//   - Jacarandas, which flower purple over Nairobi streets.
//   - The fare board instead of a chalk price card: a matatu advertises its
//     destination and its fare on the vehicle, not on a counter.
//
// TRANSLATION/CULTURE STATUS: first-pass, not reviewed by Kenyan speakers.

import * as THREE from 'three';
import { rng } from '@/data/lagos-data';
import { animateWalk, makePerson, Person, randomPerson } from './people';
import {
  makeMatatu,
  makeVehicle,
  updateVehicles,
  Vehicle,
  VehicleKind,
} from './vehicles';
import { BuiltScene, TraderMood } from './balogun-scene';

export const NAIROBI_PALETTE = {
  paper: '#EFEDE4',
  ink: '#16181C',
  ground: '#9FA3A0',
  tarmac: '#53565A',
  bay: '#E8E4D4',
  kerb: '#C9CCC6',
  concrete: '#BFC2BA',
  concreteDark: '#9DA29A',
  glassTower: '#7FA6B8',
  red: '#E8412F',
  green: '#00A859',
  blue: '#2FA8E0',
  gold: '#F5C400',
  jacaranda: '#8E7BC8',
  jacarandaDeep: '#6E5BA8',
  leaf: '#3F6B3A',
  bark: '#5E4A38',
  awning: '#1E5A48',
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

export function clearNairobiCaches() {
  geometryCache.clear();
  materialCache.clear();
}

/** A CBD block: concrete frame, banded glazing, a flat roof with plant. */
function cbdTower(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const w = 9 + rand() * 7;
  const d = 8 + rand() * 6;
  const floors = 4 + ((rand() * 7) | 0);
  const floorHeight = 3.2;
  const h = floors * floorHeight;

  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat(rand() < 0.4 ? NAIROBI_PALETTE.concreteDark : NAIROBI_PALETTE.concrete)
  );
  shell.position.y = h / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  // Banded glazing: one strip per floor, front and back.
  for (let f = 0; f < floors; f++) {
    for (const side of [1, -1]) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w - 1.1, 1.5, 0.06),
        mat(NAIROBI_PALETTE.glassTower)
      );
      band.position.set(0, f * floorHeight + 2, (side * d) / 2 + side * 0.03);
      group.add(band);
    }
    for (const side of [1, -1]) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.5, d - 1.1),
        mat(NAIROBI_PALETTE.glassTower)
      );
      band.position.set((side * w) / 2 + side * 0.03, f * floorHeight + 2, 0);
      group.add(band);
    }
  }

  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3),
    mat(NAIROBI_PALETTE.concreteDark)
  );
  parapet.position.y = h + 0.25;
  group.add(parapet);

  const plant = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.2, 2.2),
    mat(NAIROBI_PALETTE.concreteDark)
  );
  plant.position.set((rand() - 0.5) * (w - 4), h + 1.1, (rand() - 0.5) * (d - 4));
  group.add(plant);

  return group;
}

/** A jacaranda: Nairobi's street tree, in flower. */
function jacaranda(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const height = 4 + rand() * 2.2;
  const trunk = new THREE.Mesh(
    geo('jacTrunk', () => new THREE.CylinderGeometry(0.26, 0.42, 1, 7)),
    mat(NAIROBI_PALETTE.bark)
  );
  trunk.scale.y = height;
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  group.add(trunk);

  for (let b = 0; b < 4; b++) {
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 + rand() * 0.9, 7, 5),
      mat(b % 2 ? NAIROBI_PALETTE.jacaranda : NAIROBI_PALETTE.jacarandaDeep)
    );
    blob.position.set(
      (rand() - 0.5) * 2.6,
      height + 0.6 + rand() * 1.1,
      (rand() - 0.5) * 2.6
    );
    blob.scale.y = 0.7;
    blob.castShadow = true;
    group.add(blob);
  }
  return group;
}

/** The stage shelter: a steel canopy over a concrete bench. */
function shelter(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const w = 9;

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.18, 3.4),
    mat(NAIROBI_PALETTE.awning)
  );
  roof.position.y = 3;
  roof.castShadow = true;
  group.add(roof);

  for (const x of [-w / 2 + 0.5, 0, w / 2 - 0.5]) {
    const post = new THREE.Mesh(
      geo('shelterPost', () => new THREE.CylinderGeometry(0.1, 0.1, 3, 6)),
      mat(NAIROBI_PALETTE.ink)
    );
    post.position.set(x, 1.5, -1.5);
    group.add(post);
  }

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(w - 1.4, 0.35, 0.7),
    mat(NAIROBI_PALETTE.concrete)
  );
  bench.position.set(0, 0.5, -1.4);
  bench.castShadow = true;
  group.add(bench);

  for (let i = 0; i < 2; i++) {
    const sitter = randomPerson(rand);
    sitter.group.position.set(-2 + i * 4, 0.55, -1.3);
    sitter.limbs.leftLeg.rotation.x = -1.2;
    sitter.limbs.rightLeg.rotation.x = -1.2;
    group.add(sitter.group);
  }
  return group;
}

/**
 * Kevo's matatu, nosed into its bay, with him standing at the sliding door.
 * The fare board on the flank is this scene's price card: a matatu quotes its
 * destination and its fare on the vehicle, so that is where the number goes.
 */
function makeKevoStand(): {
  group: THREE.Group;
  trader: Person;
  setPrice: (price: number | null) => void;
} {
  const group = new THREE.Group();
  const rand = rng(17);

  const matatu = makeMatatu(rand, 0);
  // Nose into the bay, door toward the learner.
  matatu.rotation.y = Math.PI;
  group.add(matatu);

  // The fare board, hung on the flank beside the door.
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const draw = (price: number | null) => {
    if (!ctx) return;
    ctx.fillStyle = '#12121A';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = NAIROBI_PALETTE.gold;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 150);
    ctx.fillStyle = '#F2F0E6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Helvetica, Arial, sans-serif';
    ctx.fillText('WESTLANDS', 128, 54);
    ctx.fillStyle = NAIROBI_PALETTE.gold;
    ctx.font = 'bold 48px Helvetica, Arial, sans-serif';
    ctx.fillText(price === null ? 'KSh ?' : `KSh ${price.toLocaleString()}`, 128, 116);
    texture.needsUpdate = true;
  };
  draw(null);

  // On the rear, not the flank. The matatu is nosed into its bay, so the rear
  // is the face turned toward the aisle — which is both where a real one
  // carries its route and the only face the learner can read head-on.
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.94),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  board.position.set(-0.52, 1.78, 2.88);
  board.rotation.set(-0.05, 0, 0);
  group.add(board);

  // Kevo, on his feet at the door — not behind a counter.
  const trader = makePerson({
    cloth: NAIROBI_PALETTE.red,
    accent: NAIROBI_PALETTE.ink,
    skin: '#4A2C18',
    head: 'cap',
    scale: 1.02,
  });
  trader.group.position.set(1.5, 0, 2.1);
  trader.group.rotation.y = 0.35;
  group.add(trader.group);

  return { group, trader, setPrice: draw };
}

function makePin(): THREE.Group {
  const group = new THREE.Group();
  const pinMat = new THREE.MeshBasicMaterial({
    color: NAIROBI_PALETTE.red,
    depthTest: false,
  });
  const headMat = new THREE.MeshBasicMaterial({
    color: NAIROBI_PALETTE.green,
    depthTest: false,
  });
  const inkMat = new THREE.MeshBasicMaterial({
    color: NAIROBI_PALETTE.ink,
    depthTest: false,
  });

  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 10), pinMat);
  spike.position.y = 0.85;
  spike.rotation.x = Math.PI;
  spike.renderOrder = 999;
  group.add(spike);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), pinMat);
  head.position.y = 2.1;
  head.renderOrder = 999;
  group.add(head);

  const shield = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), headMat);
  shield.position.set(0, 2.1, 0.55);
  shield.renderOrder = 1000;
  group.add(shield);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 18), inkMat);
  ring.position.y = 2.1;
  ring.renderOrder = 1000;
  group.add(ring);

  group.traverse((o) => {
    o.userData.pin = true;
  });
  return group;
}

const KEVO = { x: -4, y: 6 };
/** Bays run along the yard; the ring roads bound it. */
const BAY_ROWS = [-26, -6, 14, 34];
const RING_X = [-74, 70];
const RING_Z = [-62, 58];

export function buildNairobiScene(): BuiltScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NAIROBI_PALETTE.paper);
  scene.fog = new THREE.Fog(NAIROBI_PALETTE.paper, 75, 225);

  const rand = rng(61);
  const blockers: { x: number; z: number; r: number }[] = [];
  const CLEARING = 10;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 460),
    mat(NAIROBI_PALETTE.ground)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- The yard: one big tarmac apron with painted bays --------------------
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 120),
    mat(NAIROBI_PALETTE.tarmac)
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0.02, 0);
  apron.receiveShadow = true;
  scene.add(apron);

  for (const z of BAY_ROWS) {
    for (let i = 0; i < 11; i++) {
      const x = -66 + i * 13;
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 9),
        mat(NAIROBI_PALETTE.bay)
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.03, z);
      scene.add(line);
    }
    const stop = new THREE.Mesh(
      new THREE.PlaneGeometry(143, 0.25),
      mat(NAIROBI_PALETTE.bay)
    );
    stop.rotation.x = -Math.PI / 2;
    stop.position.set(0, 0.03, z - 4.5);
    scene.add(stop);
  }

  // --- Matatus parked in the bays ------------------------------------------
  for (const z of BAY_ROWS) {
    for (let i = 0; i < 10; i++) {
      const x = -59.5 + i * 13 + (rand() - 0.5) * 1.2;
      if (Math.hypot(x - KEVO.x, z - KEVO.y) < CLEARING) continue;
      if (rand() < 0.22) continue;
      const parked = makeMatatu(rand, (rand() * 4) | 0);
      parked.position.set(x, 0, z);
      parked.rotation.y = Math.PI + (rand() - 0.5) * 0.08;
      scene.add(parked);
      blockers.push({ x, z, r: 2.6 });
    }
  }

  // --- The CBD standing over the stage -------------------------------------
  for (let i = 0; i < 16; i++) {
    const edge = i % 4;
    let x: number;
    let z: number;
    if (edge === 0) {
      x = -95 + rand() * 190;
      z = -95 - rand() * 30;
    } else if (edge === 1) {
      x = -95 + rand() * 190;
      z = 92 + rand() * 30;
    } else if (edge === 2) {
      x = -110 - rand() * 30;
      z = -85 + rand() * 170;
    } else {
      x = 106 + rand() * 30;
      z = -85 + rand() * 170;
    }
    const tower = cbdTower(rand);
    tower.position.set(x, 0, z);
    tower.rotation.y = Math.round(rand() * 4) * (Math.PI / 2);
    scene.add(tower);
  }

  // --- Shelter and kerbside -------------------------------------------------
  const stageShelter = shelter(rand);
  stageShelter.position.set(KEVO.x + 16, 0, KEVO.y + 12);
  stageShelter.rotation.y = Math.PI;
  scene.add(stageShelter);
  blockers.push({ x: KEVO.x + 16, z: KEVO.y + 12, r: 4.6 });

  for (const z of [RING_Z[0] + 8, RING_Z[1] - 8]) {
    const kerb = new THREE.Mesh(
      new THREE.BoxGeometry(150, 0.28, 0.6),
      mat(NAIROBI_PALETTE.kerb)
    );
    kerb.position.set(0, 0.14, z);
    kerb.receiveShadow = true;
    scene.add(kerb);
  }

  // --- Kevo -----------------------------------------------------------------
  const { group, trader, setPrice } = makeKevoStand();
  group.position.set(KEVO.x, 0, KEVO.y);
  scene.add(group);
  blockers.push({ x: KEVO.x, z: KEVO.y - 1.4, r: 2.4 });

  // --- Jacarandas along the edges ------------------------------------------
  for (let i = 0; i < 12; i++) {
    const x = (rand() - 0.5) * 190;
    const z = rand() < 0.5 ? -70 - rand() * 14 : 66 + rand() * 14;
    const tree = jacaranda(rand);
    tree.position.set(x, 0, z);
    scene.add(tree);
    blockers.push({ x, z, r: 1.4 });
  }

  // --- Pin and approach ring ------------------------------------------------
  const pin = makePin();
  pin.scale.setScalar(0.72);
  pin.position.set(KEVO.x + 1.5, 3.4, KEVO.y + 2.1);
  scene.add(pin);

  const approachPoint = new THREE.Vector3(KEVO.x + 1.6, 0, KEVO.y + 5);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.9, 22),
    new THREE.MeshBasicMaterial({
      color: NAIROBI_PALETTE.gold,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(approachPoint.x, 0.06, approachPoint.z);
  marker.userData.pin = true;
  scene.add(marker);

  // Keep the crowd out of the spot the learner stands in, so nobody wanders
  // into the two-shot and stands between the camera and Kevo mid-lesson.
  blockers.push({ x: approachPoint.x, z: approachPoint.z, r: 2.2 });

  // --- Commuters ------------------------------------------------------------
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
  for (let i = 0; i < 26; i++) {
    // No head loads here: basins and trays are a market image, and this is a
    // CBD stage full of people going to work.
    const person = randomPerson(rand, { load: 'none' });
    scene.add(person.group);
    walkers.push({
      person,
      angle: rand() * Math.PI * 2,
      radiusX: 7 + rand() * 20,
      radiusZ: 5 + rand() * 15,
      cx: (rand() - 0.5) * 130,
      cz: (rand() - 0.5) * 100,
      speed: 0.16 + rand() * 0.26,
      lastX: 0,
      lastZ: 0,
    });
  }
  // A short queue at the door, so the bay reads as the one that is loading.
  // It runs along the flank rather than across the front: the learner walks in
  // from +Z, and anyone standing on that line stands in front of Kevo.
  for (const offset of [0, 1.3]) {
    const person = randomPerson(rand, { load: 'none' });
    person.group.position.set(KEVO.x + 4.6 + offset, 0, KEVO.y + 2.4 - offset * 0.5);
    person.group.rotation.y = Math.PI * 1.35;
    scene.add(person.group);
  }

  // --- Traffic on the ring roads -------------------------------------------
  const vehicles: Vehicle[] = [];
  const kinds: VehicleKind[] = [
    'matatu', 'matatu', 'taxi', 'okada', 'matatu', 'okada', 'taxi', 'matatu',
  ];
  kinds.forEach((kind, i) => {
    const vehicleGroup = makeVehicle(kind, rand);
    scene.add(vehicleGroup);
    const onZ = i % 3 !== 2;
    const lanes = onZ ? RING_X : RING_Z;
    const base = lanes[(rand() * lanes.length) | 0];
    const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
    vehicles.push({
      group: vehicleGroup,
      kind,
      axis: onZ ? 'z' : 'x',
      lane: base + direction * 1.8,
      direction,
      speed: kind === 'okada' ? 10 + rand() * 4 : 7 + rand() * 5,
      position: (rand() - 0.5) * 180,
      limit: 104,
    });
  });

  // --- Light ----------------------------------------------------------------
  // Nairobi sits at altitude on the equator: harder, cooler light than Lagos.
  const ambient = new THREE.HemisphereLight(0xf2f6ff, 0x8f9488, 1.0);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff6e4, 1.6);
  sun.position.set(40, 66, 22);
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

  // Kevo is a conductor, not a seated trader: his warmth shows in how much of
  // him is turned toward you, and folded arms mean the fare talk stalled.
  const POSTURES: Record<TraderMood, { arms: number; lean: number; tilt: number; spread: number }> = {
    idle: { arms: -0.15, lean: 0.04, tilt: 0, spread: 0.1 },
    speaking: { arms: -0.5, lean: 0.1, tilt: 0.05, spread: 0.3 },
    listening: { arms: -0.1, lean: 0.2, tilt: 0.16, spread: 0.05 },
    warm: { arms: -1.0, lean: 0.12, tilt: -0.07, spread: 0.5 },
    pleased: { arms: -0.6, lean: 0.06, tilt: -0.05, spread: 0.28 },
    cool: { arms: 1.3, lean: -0.14, tilt: -0.03, spread: -0.32 },
  };
  let mood: TraderMood = 'idle';

  const update = (dt: number, elapsed: number) => {
    pin.position.y = 3.4 + Math.sin(elapsed * 2) * 0.22;
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
    // He shifts his weight the way someone standing in a doorway does.
    limbs.torso.position.y = Math.sin(elapsed * 1.9) * 0.02;
    if (mood === 'speaking') limbs.head.rotation.x = Math.sin(elapsed * 9) * 0.07;
    else limbs.head.rotation.x *= 0.9;

    for (const w of walkers) {
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
    bisiPosition: new THREE.Vector3(KEVO.x + 1.5, 0, KEVO.y + 2.1),
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
