// Builds a world from a SceneLayout: a template lays out the ground, roads and
// slots; the layout's dressing fills the slots from the kit; the character
// stands at the origin, facing the learner, who arrives from +z (the renderer
// spawns them 15m in front of `bisiPosition`).
//
// Deterministic: the same layout, seed included, always builds the same scene.

import * as THREE from 'three';
import { rng } from '@/data/lagos-data';
import type { Dressing, SceneLayout, SceneTemplate } from '@/data/scene-layout';
import { makePerson, randomPerson } from './people';
import { makeVehicle, updateVehicles, Vehicle } from './vehicles';
import { mat, outline } from './kit/core';
import { PALETTE } from './kit/palettes';
import {
  broadTree,
  cbdTower,
  goodsPile,
  jacaranda,
  kiosk,
  laySealedRoad,
  lockUpShop,
  makePriceCard,
  palmTree,
  shelter,
  umbrellaStall,
} from './kit/props';
import { makeApproachRing, makePin } from './kit/markers';
import { addDaylight, headOf, makePostureAnimator, stepCrowd, TRADER_POSTURES, Walker } from './kit/life';
import type { Blocker, BuiltScene } from './kit/types';

/** A place a prop can go, facing `rotY`. */
interface Slot {
  x: number;
  z: number;
  rotY: number;
}

/** A lane traffic drives along. */
interface RoadLane {
  axis: 'x' | 'z';
  at: number;
  limit: number;
}

interface TemplatePlan {
  /** Where stalls, shops and kiosks go. */
  frontage: Slot[];
  /** Where trees go. */
  verge: Slot[];
  /** Where towers go, if the layout asks for them. */
  background: Slot[];
  roads: RoadLane[];
  /** Where a shelter goes, if there is one. */
  shelter: Slot;
  /** The area the crowd wanders, as half-extents. */
  crowd: { spanX: number; spanZ: number };
}

/** Shopfront colours, from the illustrated map's buildings. */
const SHOP_COLOURS = ['#D9C3A0', '#C9A27E', '#E3CFA8', '#B98A63', '#D6B98E', '#CDB08A'];
const UMBRELLA_COLOURS: [string, string][] = [
  [PALETTE.marigold, PALETTE.pink2],
  [PALETTE.green, PALETTE.marigold],
  [PALETTE.pink, PALETTE.green],
  [PALETTE.orange, PALETTE.brown],
  ['#2E5C9A', PALETTE.marigold],
];
const GOODS_KIND = { tomatoes: 0, peppers: 1, plantain: 2, grain: 3, fabric: 4 } as const;

/** Nothing is placed where the character stands or where the learner walks in. */
const clear = (x: number, z: number, margin = 0) =>
  Math.hypot(x, z) > 7 + margin && !(Math.abs(x) < 5 + margin && z > -2 && z < 20);

function row(z: number, from: number, to: number, step: number, rotY: number): Slot[] {
  const slots: Slot[] = [];
  for (let x = from; x <= to; x += step) slots.push({ x, z, rotY });
  return slots;
}

function column(x: number, from: number, to: number, step: number, rotY: number): Slot[] {
  const slots: Slot[] = [];
  for (let z = from; z <= to; z += step) slots.push({ x, z, rotY });
  return slots;
}

function dustLane(scene: THREE.Scene, along: 'x' | 'z', at: number, length: number, width: number) {
  const lane = new THREE.Mesh(
    along === 'z' ? new THREE.PlaneGeometry(width, length) : new THREE.PlaneGeometry(length, width),
    mat(PALETTE.lane)
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(along === 'z' ? at : 0, 0.02, along === 'z' ? 0 : at);
  lane.receiveShadow = true;
  scene.add(lane);
}

/** Each template lays its own ground and says where things may go. */
const TEMPLATES: Record<SceneTemplate, (scene: THREE.Scene) => TemplatePlan> = {
  // A pavement along the character's frontage, and the road behind the
  // learner: they spawn 15m out, which must be kerb, not carriageway.
  street: (scene) => {
    laySealedRoad(scene, 'x', 24, 200);
    dustLane(scene, 'x', 2.5, 200, 5);
    return {
      frontage: [...row(-8, -66, 66, 11, 0), ...row(38, -66, 66, 11, Math.PI)],
      verge: [...row(4.5, -70, 70, 13, 0), ...row(17, -64, 64, 13, 0)],
      background: row(-26, -72, 72, 18, 0),
      roads: [{ axis: 'x', at: 24, limit: 100 }],
      shelter: { x: -11, z: 3.5, rotY: 0 },
      crowd: { spanX: 60, spanZ: 16 },
    };
  },

  // A lane through rows of stalls, ringed by roads, the way Balogun is.
  'market-lane': (scene) => {
    dustLane(scene, 'z', 0, 130, 7);
    for (const z of [-24, 24]) dustLane(scene, 'x', z, 120, 6);
    laySealedRoad(scene, 'x', -60, 150);
    for (const x of [-56, 56]) laySealedRoad(scene, 'z', x, 130);
    const frontage: Slot[] = [];
    for (const x of [-9, 9, -21, 21, -33, 33, -45, 45]) frontage.push(...column(x, -50, 50, 9, x < 0 ? Math.PI / 2 : -Math.PI / 2));
    return {
      frontage,
      verge: [...column(-50.5, -54, 54, 12, 0), ...column(50.5, -54, 54, 12, 0)],
      background: [...row(-76, -60, 60, 20, 0), ...column(-72, -50, 50, 20, 0), ...column(72, -50, 50, 20, 0)],
      roads: [
        { axis: 'x', at: -60, limit: 75 },
        { axis: 'z', at: -56, limit: 65 },
        { axis: 'z', at: 56, limit: 65 },
      ],
      shelter: { x: -12, z: 12, rotY: 0 },
      crowd: { spanX: 44, spanZ: 46 },
    };
  },

  // A stop on a main road: the character waits at the kerb, traffic passes behind.
  'bus-stop': (scene) => {
    laySealedRoad(scene, 'x', -9, 200);
    dustLane(scene, 'x', -1.5, 200, 4);
    return {
      frontage: [...row(-24, -66, 66, 11, 0), ...row(26, -66, 66, 11, Math.PI)],
      verge: [...row(-15.5, -70, 70, 13, 0), ...row(4, -64, 64, 13, 0)],
      background: row(-42, -72, 72, 18, 0),
      roads: [{ axis: 'x', at: -9, limit: 100 }],
      shelter: { x: -9, z: -2.2, rotY: 0 },
      crowd: { spanX: 60, spanZ: 14 },
    };
  },
};

function frontageProp(kind: Dressing, rand: () => number): { group: THREE.Group; r: number } {
  if (kind === 'umbrella-stalls') {
    const radius = 2.2 + rand() * 0.8;
    const [top, trim] = UMBRELLA_COLOURS[(rand() * UMBRELLA_COLOURS.length) | 0];
    return { group: umbrellaStall(radius, top, trim, rand), r: radius * 0.62 };
  }
  if (kind === 'kiosks') {
    const w = 5 + rand() * 2;
    const d = 4 + rand();
    return { group: kiosk(w, d, rand), r: Math.max(w, d) * 0.6 };
  }
  const w = 8 + rand() * 3;
  const d = 6 + rand() * 2;
  return { group: lockUpShop(w, d, SHOP_COLOURS[(rand() * SHOP_COLOURS.length) | 0], rand), r: Math.max(w, d) * 0.62 };
}

function vergeProp(kind: Dressing, rand: () => number): THREE.Group {
  if (kind === 'broad-trees') return broadTree(rand);
  if (kind === 'jacarandas') return jacaranda(rand);
  return palmTree(rand);
}

/** Where the character stands, and the pieces that tell you what they do. */
function makeStand(layout: SceneLayout, rand: () => number) {
  const group = new THREE.Group();
  const c = layout.character;
  let personZ = 0;
  let personY = 0;
  let cardAt: THREE.Vector3 | null = null;
  const pinY = 3.2;
  let blockR = 1.2;

  if (c.stands === 'stall') {
    // Bisi's stall, generalised: canopy, counter, goods, a plank to stand on.
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 6), mat(PALETTE.timber));
    pole.position.y = 2.4;
    group.add(pole);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.3, 9), mat(c.accent));
    canopy.position.y = 4.9;
    canopy.castShadow = true;
    outline(canopy);
    group.add(canopy);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.82, 1.4), mat(PALETTE.timber));
    counter.position.set(0, 0.41, 1.4);
    counter.castShadow = true;
    counter.receiveShadow = true;
    outline(counter, PALETTE.ink, 0.55);
    group.add(counter);
    for (const x of [-1.5, 0, 1.5]) {
      const pile = goodsPile(GOODS_KIND[c.goods], rand);
      pile.position.set(x, 0.95, 1.4);
      pile.scale.setScalar(1.2);
      group.add(pile);
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.2), mat(PALETTE.brown2));
    platform.position.set(0, 0.15, -0.9);
    group.add(platform);
    personZ = -0.9;
    personY = 0.3;
    cardAt = new THREE.Vector3(-1.55, 1.05, 2.05);
    blockR = 2.4;
  } else if (c.stands === 'kiosk') {
    const booth = kiosk(4.6, 3.4, rand);
    booth.position.z = -3.2;
    group.add(booth);
    cardAt = new THREE.Vector3(1.6, 1.2, 0.4);
    blockR = 1.6;
  } else if (c.stands === 'doorway') {
    const house = lockUpShop(7, 5, SHOP_COLOURS[(rand() * SHOP_COLOURS.length) | 0], rand);
    house.position.z = -4.2;
    group.add(house);
    personZ = -1.2;
    blockR = 1.4;
  }

  const person = makePerson({
    cloth: c.cloth,
    accent: c.accent,
    skin: '#4A2C18',
    head: c.head,
    wrapper: c.gender === 'woman',
    scale: c.age === 'elder' ? 1.06 : c.age === 'young' ? 0.97 : 1.02,
  });
  person.group.position.set(0, personY, personZ);
  group.add(person.group);

  let setPrice: (price: number | null) => void = () => {};
  if (cardAt && layout.priceTitle) {
    const card = makePriceCard(layout.priceTitle);
    card.mesh.position.copy(cardAt);
    card.mesh.rotation.set(-0.32, 0.2, 0.04);
    group.add(card.mesh);
    setPrice = card.setPrice;
  }
  return { group, person, setPrice, pinY, blockR };
}

export function composeScene(layout: SceneLayout): BuiltScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.paper);
  scene.fog = new THREE.Fog(PALETTE.paper, 60, 190);

  const rand = rng(layout.seed);
  const blockers: Blocker[] = [];

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mat(PALETTE.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plan = TEMPLATES[layout.template](scene);
  const wants = (kind: Dressing) => layout.dressing.includes(kind);

  // --- Frontage: stalls, shops and kiosks, mixed as the layout asks ----------
  const frontKinds = layout.dressing.filter((d) => d === 'umbrella-stalls' || d === 'lock-up-shops' || d === 'kiosks');
  if (!frontKinds.length) frontKinds.push('lock-up-shops');
  for (const slot of plan.frontage) {
    if (!clear(slot.x, slot.z, 3)) continue;
    const { group, r } = frontageProp(frontKinds[(rand() * frontKinds.length) | 0], rand);
    group.position.set(slot.x + (rand() - 0.5) * 1.5, 0, slot.z);
    group.rotation.y = slot.rotY;
    scene.add(group);
    blockers.push({ x: group.position.x, z: group.position.z, r });
  }

  // --- Verge: trees ---------------------------------------------------------------
  const treeKinds = layout.dressing.filter((d) => d === 'palms' || d === 'broad-trees' || d === 'jacarandas');
  for (const slot of treeKinds.length ? plan.verge : []) {
    if (rand() < 0.4 || !clear(slot.x, slot.z, 1)) continue;
    const tree = vergeProp(treeKinds[(rand() * treeKinds.length) | 0], rand);
    tree.position.set(slot.x + (rand() - 0.5) * 3, 0, slot.z);
    scene.add(tree);
    blockers.push({ x: tree.position.x, z: tree.position.z, r: 1 });
  }

  // --- Skyline --------------------------------------------------------------------
  if (wants('towers')) {
    for (const slot of plan.background) {
      if (rand() < 0.25) continue;
      const tower = cbdTower(rand);
      tower.position.set(slot.x, 0, slot.z);
      scene.add(tower);
    }
  }

  if (wants('shelter') || layout.template === 'bus-stop') {
    const s = shelter(rand);
    s.position.set(plan.shelter.x, 0, plan.shelter.z);
    s.rotation.y = plan.shelter.rotY;
    scene.add(s);
    blockers.push({ x: plan.shelter.x, z: plan.shelter.z - 1.4, r: 3 });
  }

  // --- The person you talk to -------------------------------------------------------
  const stand = makeStand(layout, rand);
  scene.add(stand.group);
  blockers.push({ x: 0, z: 0, r: stand.blockR });
  const trader = stand.person;

  const pin = makePin({ body: PALETTE.pink2, face: PALETTE.marigold, ink: PALETTE.ink });
  pin.scale.setScalar(0.72);
  pin.position.set(0, stand.pinY, -0.6);
  scene.add(pin);

  const approachPoint = new THREE.Vector3(0, 0, layout.character.stands === 'stall' ? 3.4 : 2.8);
  scene.add(makeApproachRing(approachPoint, PALETTE.pink2));
  // Keep the crowd out of the spot the learner stands in.
  blockers.push({ x: approachPoint.x, z: approachPoint.z, r: 2.2 });

  // --- Crowd --------------------------------------------------------------------------
  const walkers: Walker[] = [];
  const crowdSize = layout.density === 'busy' ? 26 : 9;
  for (let i = 0; i < crowdSize; i++) {
    const person = randomPerson(rand);
    scene.add(person.group);
    walkers.push({
      person,
      angle: rand() * Math.PI * 2,
      radiusX: 5 + rand() * 16,
      radiusZ: 3 + rand() * 8,
      cx: (rand() - 0.5) * plan.crowd.spanX * 2,
      cz: (rand() - 0.5) * plan.crowd.spanZ * 2,
      speed: 0.12 + rand() * 0.22,
      lastX: 0,
      lastZ: 0,
    });
  }

  // --- Traffic ------------------------------------------------------------------------
  const vehicles: Vehicle[] = [];
  const traffic = layout.density === 'busy' ? 10 : 4;
  for (let i = 0; i < traffic && plan.roads.length; i++) {
    const kind = layout.vehicles[i % layout.vehicles.length];
    const road = plan.roads[i % plan.roads.length];
    const group = makeVehicle(kind, rand);
    scene.add(group);
    const direction: 1 | -1 = rand() < 0.5 ? 1 : -1;
    vehicles.push({
      group,
      kind,
      axis: road.axis,
      // Offset from the centre line so opposing traffic does not overlap.
      lane: road.at + direction * 1.6,
      direction,
      speed: kind === 'okada' ? 9 + rand() * 5 : kind === 'keke' ? 5 + rand() * 3 : 7 + rand() * 5,
      position: (rand() - 0.5) * road.limit * 2,
      limit: road.limit,
    });
  }

  // A vehicle waiting at the stop, so it reads as a stop and not a kerb.
  if (layout.template === 'bus-stop') {
    const waiting = makeVehicle(layout.vehicles.find((v) => v !== 'okada') ?? 'danfo', rand);
    waiting.position.set(8, 0, -6.6);
    waiting.rotation.y = -Math.PI / 2;
    scene.add(waiting);
    blockers.push({ x: 8, z: -6.6, r: 3 });
  }

  const { ambient, sun } = addDaylight(scene, {
    sky: 0xfff4de,
    ground: 0xa8926e,
    ambientIntensity: 1.05,
    sunColour: 0xfff0cf,
    sunIntensity: 1.5,
    sunPosition: [40, 60, 20],
  });

  const posture = makePostureAnimator(trader, TRADER_POSTURES);
  const pinY = stand.pinY;

  return {
    scene,
    sun,
    ambient,
    trader,
    bisiPosition: new THREE.Vector3(0, 0, 0),
    blockers,
    pin,
    approachPoint,
    setPrice: stand.setPrice,
    setTraderMood: posture.setMood,
    traderHead: headOf(trader),
    update: (dt, elapsed) => {
      pin.position.y = pinY + Math.sin(elapsed * 2) * 0.22;
      pin.rotation.y = elapsed * 0.9;
      posture.update(dt, elapsed);
      stepCrowd(walkers, blockers, dt, elapsed);
      updateVehicles(vehicles, dt);
    },
  };
}
