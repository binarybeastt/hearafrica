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
import { makePerson, Person, randomPerson } from './people';
import {
  makeMatatu,
  makeVehicle,
  updateVehicles,
  Vehicle,
  VehicleKind,
} from './vehicles';
import { mat } from './kit/core';
import { NAIROBI_PALETTE } from './kit/palettes';
import { cbdTower, jacaranda, shelter } from './kit/props';
import { makeApproachRing, makePin } from './kit/markers';
import { addDaylight, headOf, makePostureAnimator, Posture, stepCrowd, Walker } from './kit/life';
import type { BuiltScene, TraderMood } from './kit/types';

export { NAIROBI_PALETTE } from './kit/palettes';

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
  const pin = makePin({ body: NAIROBI_PALETTE.red, face: NAIROBI_PALETTE.green, ink: NAIROBI_PALETTE.ink });
  pin.scale.setScalar(0.72);
  pin.position.set(KEVO.x + 1.5, 3.4, KEVO.y + 2.1);
  scene.add(pin);

  const approachPoint = new THREE.Vector3(KEVO.x + 1.6, 0, KEVO.y + 5);
  scene.add(makeApproachRing(approachPoint, NAIROBI_PALETTE.gold, 0.78));

  // Keep the crowd out of the spot the learner stands in, so nobody wanders
  // into the two-shot and stands between the camera and Kevo mid-lesson.
  blockers.push({ x: approachPoint.x, z: approachPoint.z, r: 2.2 });

  // --- Commuters ------------------------------------------------------------
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
  const { ambient, sun } = addDaylight(scene, {
    sky: 0xf2f6ff,
    ground: 0x8f9488,
    ambientIntensity: 1.0,
    sunColour: 0xfff6e4,
    sunIntensity: 1.6,
    sunPosition: [40, 66, 22],
  });

  // Kevo is a conductor, not a seated trader: his warmth shows in how much of
  // him is turned toward you, and folded arms mean the fare talk stalled.
  const POSTURES: Record<TraderMood, Posture> = {
    idle: { arms: -0.15, lean: 0.04, tilt: 0, spread: 0.1 },
    speaking: { arms: -0.5, lean: 0.1, tilt: 0.05, spread: 0.3 },
    listening: { arms: -0.1, lean: 0.2, tilt: 0.16, spread: 0.05 },
    warm: { arms: -1.0, lean: 0.12, tilt: -0.07, spread: 0.5 },
    pleased: { arms: -0.6, lean: 0.06, tilt: -0.05, spread: 0.28 },
    cool: { arms: 1.3, lean: -0.14, tilt: -0.03, spread: -0.32 },
  };
  // He shifts his weight the way someone standing in a doorway does.
  const posture = makePostureAnimator(trader, POSTURES, { rate: 1.9, depth: 0.02 });

  const update = (dt: number, elapsed: number) => {
    pin.position.y = 3.4 + Math.sin(elapsed * 2) * 0.22;
    pin.rotation.y = elapsed * 0.9;
    posture.update(dt, elapsed);
    stepCrowd(walkers, blockers, dt, elapsed);
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
    setTraderMood: posture.setMood,
    traderHead: headOf(trader),
    update,
  };
}
