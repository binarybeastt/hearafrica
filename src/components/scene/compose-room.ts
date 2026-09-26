// Builds a room from a layout: the parlour of a home, or the counter of an
// office, bank, clinic or pharmacy. Same contract as the outdoor composer —
// the person is at the origin facing +z, the learner comes in from +z — but a
// cutaway room, furniture instead of stalls, and a few seated extras instead
// of a crowd and traffic.

import * as THREE from 'three';
import { rng } from '@/data/lagos-data';
import type { SceneLayout } from '@/data/scene-layout';
import { makePerson, Person, randomPerson, sitDown } from './people';
import { mat } from './kit/core';
import { PALETTE } from './kit/palettes';
import { makePriceCard } from './kit/props';
import {
  centreTable,
  doorway,
  makeRoom,
  noticeBoard,
  rug,
  serviceCounter,
  shelves,
  sideStool,
  sofa,
  standingFan,
  tvStand,
  UPHOLSTERY,
  waitingChairs,
  WALL_PAINT,
  wallClock,
  wallPictures,
  wallWindow,
  waterDispenser,
} from './kit/interior';
import { makeApproachRing, makePin } from './kit/markers';
import { addDaylight, headOf, makePostureAnimator, TRADER_POSTURES } from './kit/life';
import type { Blocker, BuiltScene } from './kit/types';

const ROOM = { width: 14, back: -5.5, front: 8 };
/** Where the back wall's face is, for hanging things on it. */
const BACK_FACE = ROOM.back + 0.02;

/** Circles along a straight piece of furniture, so the learner walks around it. */
function blockLine(blockers: Blocker[], x1: number, z1: number, x2: number, z2: number, r: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / r));
  for (let i = 0; i <= steps; i++) {
    blockers.push({ x: x1 + ((x2 - x1) * i) / steps, z: z1 + ((z2 - z1) * i) / steps, r });
  }
}

function extra(rand: () => number): Person {
  return randomPerson(rand, { load: 'none' });
}

/** Seats `count` extras along a sofa or chair row that runs along z at `x`, facing `rotY`. */
function seatAlong(scene: THREE.Scene, rand: () => number, count: number, x: number, z0: number, spacing: number, rotY: number, seat: number) {
  for (let i = 0; i < count; i++) {
    const person = extra(rand);
    sitDown(person, seat);
    person.group.position.x = x;
    person.group.position.z = z0 + i * spacing;
    person.group.rotation.y = rotY;
    scene.add(person.group);
  }
}

function makeCharacter(layout: SceneLayout): Person {
  const c = layout.character;
  return makePerson({
    cloth: c.cloth,
    accent: c.accent,
    skin: '#4A2C18',
    head: c.head,
    wrapper: c.gender === 'woman',
    scale: c.age === 'elder' ? 1.06 : c.age === 'young' ? 0.97 : 1.02,
  });
}

export function composeRoom(layout: SceneLayout): BuiltScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.paper);
  scene.fog = new THREE.Fog(PALETTE.paper, 40, 120);

  const rand = rng(layout.seed);
  const blockers: Blocker[] = [];
  const wants = (d: string) => layout.dressing.includes(d as never);
  const parlour = layout.template === 'parlour';

  // The compound outside, seen past the open side of the room.
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#BDB5A6'));
  yard.rotation.x = -Math.PI / 2;
  yard.receiveShadow = true;
  scene.add(yard);

  const wall = WALL_PAINT[(rand() * WALL_PAINT.length) | 0];
  const bounds = makeRoom(scene, { ...ROOM, floor: parlour ? '#D8CBB0' : '#CFCABF', wall });

  for (const side of [-1, 1]) {
    const window = wallWindow();
    window.position.set(side * (ROOM.width / 2), 1.55, 1.5);
    window.rotation.y = Math.PI / 2;
    scene.add(window);
  }

  const trader = makeCharacter(layout);
  let setPrice: (price: number | null) => void = () => {};
  let approachZ: number;
  let pinY: number;

  if (parlour) {
    // --- The parlour: the elder in the chair at the head of the room ----------
    const upholstery = UPHOLSTERY[(rand() * UPHOLSTERY.length) | 0];
    const chair = sofa(1, upholstery);
    chair.position.set(0, 0, -0.35);
    scene.add(chair);
    for (const x of [-1.15, 1.15]) {
      const stool = sideStool();
      stool.position.x = x;
      scene.add(stool);
    }
    sitDown(trader, 0.5);
    trader.group.position.z = -0.1;
    scene.add(trader.group);
    blockers.push({ x: 0, z: 0, r: 1.6 });

    const door = doorway();
    door.position.set(-5.2, 0, BACK_FACE);
    scene.add(door);

    if (wants('pictures')) {
      const pictures = wallPictures(rand);
      pictures.position.set(-1.2, 1.75, BACK_FACE);
      scene.add(pictures);
    }
    if (wants('tv')) {
      const tv = tvStand();
      tv.position.set(4.3, 0, ROOM.back + 0.3);
      scene.add(tv);
      blockers.push({ x: 4.3, z: ROOM.back + 0.3, r: 0.9 });
    }
    if (wants('fan')) {
      const fan = standingFan();
      fan.position.set(-6.3, 0, ROOM.back + 0.6);
      scene.add(fan);
    }

    // Sofas down both walls, facing into the room: the shape of a parlour.
    if (wants('sofas')) {
      for (const side of [-1, 1]) {
        const s = sofa(3, upholstery);
        s.position.set(side * 5.7, 0, 1.6);
        s.rotation.y = -side * (Math.PI / 2);
        scene.add(s);
        blockLine(blockers, side * 5.7, 0.4, side * 5.7, 2.8, 0.7);
      }
      const carpet = rug(7.5, 5.5, '#8C3B2E');
      carpet.position.set(0, 0.03, 1.8);
      scene.add(carpet);
      // Whoever else is home sits on the sofas.
      const left = Math.min(layout.extras, 2);
      seatAlong(scene, rand, left, -5.55, 1.0, 1.1, Math.PI / 2, 0.45);
      seatAlong(scene, rand, layout.extras - left, 5.55, 1.6, 1.1, -Math.PI / 2, 0.45);
    }
    if (wants('centre-table')) {
      const table = centreTable();
      table.position.set(-3.9, 0, 2);
      table.rotation.y = Math.PI / 2;
      scene.add(table);
      blockers.push({ x: -3.9, z: 2, r: 0.8 });
    }

    approachZ = 2.2;
    pinY = 2.7;
  } else {
    // --- A counter: office, bank, clinic or pharmacy ----------------------------
    const kind = layout.counterKind;
    const desk = serviceCounter(4.2, wants('partition') || kind === 'bank');
    desk.position.set(0, 0, 0.35);
    scene.add(desk);
    blockLine(blockers, -1.8, 0.35, 1.8, 0.35, 0.6);
    trader.group.position.z = -0.75;
    scene.add(trader.group);
    blockers.push({ x: 0, z: -0.75, r: 0.6 });

    if (layout.priceTitle) {
      const card = makePriceCard(layout.priceTitle);
      card.mesh.scale.setScalar(0.7);
      card.mesh.position.set(1.4, 1.35, 0.72);
      card.mesh.rotation.set(-0.3, -0.15, 0);
      scene.add(card.mesh);
      setPrice = card.setPrice;
    }

    if (wants('shelves')) {
      for (const x of [-3.1, 3.1]) {
        const unit = shelves(kind === 'pharmacy' ? 'medicine' : 'files', rand);
        unit.position.set(x, 0, ROOM.back + 0.25);
        scene.add(unit);
        blockers.push({ x, z: ROOM.back + 0.25, r: 1.2 });
      }
    }
    const clock = wallClock();
    clock.position.set(0, 2.3, BACK_FACE + 0.03);
    scene.add(clock);
    const board = noticeBoard(rand);
    board.position.set(-5.7, 1.6, BACK_FACE + 0.02);
    scene.add(board);
    const door = doorway();
    door.position.set(5.6, 0, BACK_FACE);
    scene.add(door);

    if (wants('waiting-chairs')) {
      const colour = ['#2E5C9A', '#E8412F', '#11663F'][(rand() * 3) | 0];
      for (const z of [1.2, 4.2]) {
        const row = waitingChairs(4, colour);
        row.position.set(-5.9, 0, z);
        row.rotation.y = Math.PI / 2;
        scene.add(row);
        blockLine(blockers, -5.9, z - 1, -5.9, z + 1, 0.6);
      }
      // People waiting their turn.
      seatAlong(scene, rand, Math.min(layout.extras, 4), -5.85, 0.4, 1.1, Math.PI / 2, 0.45);
    }
    if (wants('water-dispenser')) {
      const water = waterDispenser();
      water.position.set(6.3, 0, -3.6);
      scene.add(water);
      blockers.push({ x: 6.3, z: -3.6, r: 0.5 });
    }
    if (wants('fan')) {
      const fan = standingFan();
      fan.position.set(6.3, 0, 3.4);
      fan.rotation.y = -Math.PI / 2;
      scene.add(fan);
    }

    approachZ = 1.9;
    pinY = 3.0;
  }

  const pin = makePin({ body: PALETTE.pink2, face: PALETTE.marigold, ink: PALETTE.ink });
  pin.scale.setScalar(0.62);
  pin.position.set(0, pinY, -0.4);
  scene.add(pin);

  const approachPoint = new THREE.Vector3(0, 0, approachZ);
  scene.add(makeApproachRing(approachPoint, PALETTE.pink2));

  // Indoors: warmer, flatter light, and the sun kept low in the sky's role.
  const { ambient, sun } = addDaylight(scene, {
    sky: 0xfff1dc,
    ground: 0xb8a58a,
    ambientIntensity: 1.2,
    sunColour: 0xfff0cf,
    sunIntensity: 1.2,
    sunPosition: [20, 40, 30],
  });

  const posture = makePostureAnimator(trader, TRADER_POSTURES);

  return {
    scene,
    sun,
    ambient,
    trader,
    bisiPosition: new THREE.Vector3(0, 0, 0),
    blockers,
    pin,
    approachPoint,
    setPrice,
    setTraderMood: posture.setMood,
    traderHead: headOf(trader),
    update: (dt, elapsed) => {
      pin.position.y = pinY + Math.sin(elapsed * 2) * 0.18;
      pin.rotation.y = elapsed * 0.9;
      posture.update(dt, elapsed);
    },
    // Just outside the open side of the room, beyond the 6m at which the lesson
    // opens, so the learner walks in rather than starting mid-conversation.
    spawnDistance: 9,
    bounds,
  };
}
