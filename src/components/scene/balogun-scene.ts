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
import { makePerson, Person, randomPerson } from './people';
import { makeVehicle, updateVehicles, Vehicle, VehicleKind } from './vehicles';
import { mat, outline } from './kit/core';
import { PALETTE } from './kit/palettes';
import {
  broadTree,
  goodsPile,
  laySealedRoad,
  lockUpShop,
  makePriceCard,
  palmTree,
  umbrellaStall,
} from './kit/props';
import { makeApproachRing, makePin } from './kit/markers';
import {
  addDaylight,
  headOf,
  makePostureAnimator,
  stepCrowd,
  TRADER_POSTURES,
  Walker,
} from './kit/life';
import type { BuiltScene } from './kit/types';

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

  for (const at of roadLanesZ) laySealedRoad(scene, 'z', at, 240);
  for (const at of roadLanesX) laySealedRoad(scene, 'x', at, 260);

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
  const pin = makePin({ body: PALETTE.pink2, face: PALETTE.marigold, ink: PALETTE.ink });
  // Low enough to stay inside the frustum from the chase camera, high enough to
  // clear her canopy.
  // It draws through geometry (depthTest off), so it can sit low over the
  // counter and still be seen from anywhere — and it stays in frame.
  pin.scale.setScalar(0.72);
  pin.position.set(bisiSpot.x, 3.2, bisiSpot.y - 0.6);
  scene.add(pin);

  // A ring on the ground marking where to stand to talk to her.
  const approachPoint = new THREE.Vector3(bisiSpot.x, 0, bisiSpot.y + 3.4);
  scene.add(makeApproachRing(approachPoint, PALETTE.pink2));

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
  const { ambient, sun } = addDaylight(scene, {
    sky: 0xfff4de,
    ground: 0xa8926e,
    ambientIntensity: 1.05,
    sunColour: 0xfff0cf,
    sunIntensity: 1.5,
    sunPosition: [40, 60, 20],
  });

  // Her posture is the rapport meter: eased towards the stance for each mood.
  const posture = makePostureAnimator(trader, TRADER_POSTURES);

  const update = (dt: number, elapsed: number) => {
    pin.position.y = 3.2 + Math.sin(elapsed * 2) * 0.22;
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
    bisiPosition: new THREE.Vector3(bisiSpot.x, 0, bisiSpot.y),
    blockers,
    pin,
    approachPoint,
    setPrice,
    setTraderMood: posture.setMood,
    traderHead: headOf(trader),
    update,
  };
}

