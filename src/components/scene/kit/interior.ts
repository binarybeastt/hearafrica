// Furniture and fittings for rooms: the parlour of a Nigerian home and the
// counter of an office, bank or clinic. Same rules as the outdoor props — flat
// primitives in the palette, outlines on the big pieces, seeded randomness.
//
// Rooms are drawn as a cutaway: no ceiling, and no wall on the side the camera
// comes from, so the chase camera looks in over the walls.

import * as THREE from 'three';
import { geo, mat, outline } from './core';
import { PALETTE } from './palettes';

/** Upholstery, the colours parlours actually come in. */
export const UPHOLSTERY = ['#7A2E2E', '#3F4E7A', '#5B6B3A', '#8A5A36', '#6E3A5E', '#2F5D5D'];
/** Wall paint: pastel emulsion. */
export const WALL_PAINT = ['#E8D9B5', '#CFE0D8', '#DCCFE4', '#F0D9C4', '#D5DDE8'];

function box(w: number, h: number, d: number, colour: string, key?: string) {
  const geometry = key ? geo(`interior:${key}`, () => new THREE.BoxGeometry(w, h, d)) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geometry, mat(colour));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// --- The room itself -----------------------------------------------------------

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * A floor, a back wall and two side walls, open toward +z where the learner
 * comes in. Returns the walkable bounds, a little inside the walls.
 */
export function makeRoom(
  scene: THREE.Scene,
  opts: { width: number; back: number; front: number; floor: string; wall: string; height?: number }
): RoomBounds {
  const h = opts.height ?? 2.8;
  const depth = opts.front - opts.back;
  const centreZ = (opts.front + opts.back) / 2;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(opts.width, depth), mat(opts.floor));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.02, centreZ);
  floor.receiveShadow = true;
  scene.add(floor);

  const back = box(opts.width + 0.4, h, 0.25, opts.wall);
  back.position.set(0, h / 2, opts.back - 0.12);
  outline(back);
  scene.add(back);

  for (const side of [-1, 1]) {
    const wall = box(0.25, h, depth, opts.wall);
    wall.position.set(side * (opts.width / 2 + 0.12), h / 2, centreZ);
    outline(wall);
    scene.add(wall);

    // A skirting line, so the wall meets the floor rather than floating.
    const skirt = box(0.05, 0.14, depth, PALETTE.timber);
    skirt.position.set(side * (opts.width / 2 - 0.02), 0.07, centreZ);
    scene.add(skirt);
  }

  return {
    minX: -opts.width / 2 + 0.6,
    maxX: opts.width / 2 - 0.6,
    minZ: opts.back + 0.6,
    maxZ: opts.front + 6,
  };
}

/** A window on a wall: frame, glass, burglar-proof bars. */
export function wallWindow(width = 1.6, height = 1.2): THREE.Group {
  const group = new THREE.Group();
  const glass = box(width, height, 0.05, '#9FC3CF');
  group.add(glass);
  const frame = box(width + 0.16, 0.1, 0.08, '#F2EAD6');
  frame.position.y = height / 2;
  group.add(frame);
  const sill = frame.clone();
  sill.position.y = -height / 2;
  group.add(sill);
  for (let i = 1; i < 5; i++) {
    const bar = box(0.04, height, 0.06, '#3A3530');
    bar.position.x = -width / 2 + (i * width) / 5;
    group.add(bar);
  }
  return group;
}

/** A doorway: a dark opening with a frame, flush on a wall. */
export function doorway(): THREE.Group {
  const group = new THREE.Group();
  const opening = box(1.0, 2.1, 0.05, '#2A1D14');
  opening.position.y = 1.05;
  group.add(opening);
  const lintel = box(1.2, 0.12, 0.08, PALETTE.timber);
  lintel.position.y = 2.16;
  group.add(lintel);
  return group;
}

// --- Parlour -----------------------------------------------------------------------

/** A sofa: base, cushions, back and arms, facing +z. */
export function sofa(seats: number, colour: string): THREE.Group {
  const group = new THREE.Group();
  const w = seats * 0.8 + 0.4;
  const base = box(w, 0.42, 0.85, colour);
  base.position.y = 0.21;
  outline(base);
  group.add(base);
  for (let i = 0; i < seats; i++) {
    const cushion = box(0.76, 0.12, 0.7, colour, 'cushion');
    cushion.position.set(-w / 2 + 0.2 + 0.4 + i * 0.8, 0.48, 0.05);
    group.add(cushion);
  }
  const back = box(w, 0.6, 0.2, colour);
  back.position.set(0, 0.72, -0.34);
  outline(back);
  group.add(back);
  for (const side of [-1, 1]) {
    const arm = box(0.2, 0.3, 0.85, colour, 'arm');
    arm.position.set(side * (w / 2 - 0.1), 0.57, 0);
    group.add(arm);
  }
  return group;
}

/** A low centre table with a doily and a bowl on it. */
export function centreTable(): THREE.Group {
  const group = new THREE.Group();
  const top = box(1.3, 0.08, 0.7, '#6B4A2F');
  top.position.y = 0.45;
  outline(top);
  group.add(top);
  for (const [x, z] of [[-0.55, -0.28], [0.55, -0.28], [-0.55, 0.28], [0.55, 0.28]]) {
    const leg = box(0.07, 0.42, 0.07, '#5A3E27', 'tableLeg');
    leg.position.set(x, 0.21, z);
    group.add(leg);
  }
  const doily = new THREE.Mesh(geo('interior:doily', () => new THREE.CylinderGeometry(0.28, 0.28, 0.01, 12)), mat('#F2EAD6'));
  doily.position.y = 0.5;
  group.add(doily);
  const bowl = new THREE.Mesh(
    geo('interior:bowl', () => new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)),
    mat('#C9A227')
  );
  bowl.position.y = 0.66;
  group.add(bowl);
  return group;
}

/** A small side stool beside a chair. */
export function sideStool(): THREE.Mesh {
  const stool = new THREE.Mesh(geo('interior:stool', () => new THREE.CylinderGeometry(0.22, 0.24, 0.5, 10)), mat('#6B4A2F'));
  stool.position.y = 0.25;
  stool.castShadow = true;
  return stool;
}

/** A television on a low cabinet, facing +z. */
export function tvStand(): THREE.Group {
  const group = new THREE.Group();
  const cabinet = box(1.6, 0.55, 0.45, '#5A3E27');
  cabinet.position.y = 0.275;
  outline(cabinet);
  group.add(cabinet);
  const screen = box(1.2, 0.72, 0.06, '#15181C');
  screen.position.set(0, 0.55 + 0.46, 0);
  outline(screen, '#000000', 0.6);
  group.add(screen);
  return group;
}

/** A standing fan in the corner, as in any Lagos parlour or office. */
export function standingFan(): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(geo('interior:fanBase', () => new THREE.CylinderGeometry(0.28, 0.3, 0.06, 12)), mat('#E6E1D6'));
  base.position.y = 0.03;
  group.add(base);
  const pole = new THREE.Mesh(geo('interior:fanPole', () => new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6)), mat('#BDB7AA'));
  pole.position.y = 0.68;
  group.add(pole);
  const cage = new THREE.Mesh(geo('interior:fanCage', () => new THREE.TorusGeometry(0.3, 0.025, 6, 20)), mat('#E6E1D6'));
  cage.position.set(0, 1.4, 0.05);
  group.add(cage);
  const hub = new THREE.Mesh(geo('interior:fanHub', () => new THREE.SphereGeometry(0.09, 8, 6)), mat('#2E5C9A'));
  hub.position.set(0, 1.4, 0.05);
  group.add(hub);
  return group;
}

/** Framed photographs and a calendar hung on a wall, facing +z. */
export function wallPictures(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const count = 3 + ((rand() * 2) | 0);
  for (let i = 0; i < count; i++) {
    const w = 0.4 + rand() * 0.3;
    const h = 0.5 + rand() * 0.25;
    const frame = box(w, h, 0.04, '#3A2A1C');
    frame.position.set((i - (count - 1) / 2) * 0.95, (rand() - 0.5) * 0.2, 0);
    group.add(frame);
    const photo = box(w - 0.1, h - 0.1, 0.02, ['#C9A27E', '#8FA3B0', '#B98A63', '#7E8C6A'][(rand() * 4) | 0]);
    photo.position.copy(frame.position);
    photo.position.z = 0.025;
    group.add(photo);
  }
  // The annual calendar every household has, a little apart from the photos.
  const calendar = box(0.5, 0.7, 0.02, '#F7EFE2');
  calendar.position.set((count / 2) * 0.95 + 0.4, -0.05, 0.01);
  group.add(calendar);
  const band = box(0.5, 0.18, 0.025, PALETTE.green);
  band.position.set(calendar.position.x, 0.2, 0.02);
  group.add(band);
  return group;
}

/** A rug under the seating area. */
export function rug(w: number, d: number, colour: string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(colour));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  mesh.receiveShadow = true;
  return mesh;
}

// --- Counter ----------------------------------------------------------------------

/** A service counter, facing +z, with an optional glass partition on top. */
export function serviceCounter(width: number, partition: boolean): THREE.Group {
  const group = new THREE.Group();
  const body = box(width, 1.05, 0.7, '#8A5A36');
  body.position.y = 0.525;
  outline(body);
  group.add(body);
  const top = box(width + 0.1, 0.06, 0.8, '#D9C3A0');
  top.position.y = 1.08;
  group.add(top);
  if (partition) {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.9, 0.04),
      new THREE.MeshLambertMaterial({ color: '#BFD9E0', transparent: true, opacity: 0.35 })
    );
    glass.position.set(0, 1.56, -0.1);
    group.add(glass);
    // The slot you talk and pass papers through.
    const slot = box(0.5, 0.12, 0.05, '#3A3530');
    slot.position.set(0, 1.17, -0.1);
    group.add(slot);
  }
  return group;
}

/** A row of joined plastic waiting chairs, facing +z. */
export function waitingChairs(count: number, colour: string): THREE.Group {
  const group = new THREE.Group();
  const beam = box(count * 0.55, 0.06, 0.1, '#6F6A60');
  beam.position.y = 0.38;
  group.add(beam);
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 0.55;
    const seat = box(0.48, 0.05, 0.45, colour, 'chairSeat');
    seat.position.set(x, 0.45, 0);
    group.add(seat);
    const back = box(0.48, 0.45, 0.05, colour, 'chairBack');
    back.position.set(x, 0.72, -0.22);
    group.add(back);
  }
  for (const side of [-1, 1]) {
    const leg = box(0.05, 0.38, 0.4, '#6F6A60', 'chairLeg');
    leg.position.set(side * (count * 0.55) * 0.45, 0.19, 0);
    group.add(leg);
  }
  return group;
}

/** Shelving against a wall: box files for an office, bottles for a pharmacy. */
export function shelves(kind: 'files' | 'medicine', rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const frame = box(2.4, 2.1, 0.4, '#A8A29A');
  frame.position.y = 1.05;
  outline(frame);
  group.add(frame);
  for (let s = 0; s < 4; s++) {
    const y = 0.35 + s * 0.48;
    const board = box(2.3, 0.04, 0.42, '#8A847A', 'shelfBoard');
    board.position.set(0, y, 0.02);
    group.add(board);
    const items = 6 + ((rand() * 4) | 0);
    for (let i = 0; i < items; i++) {
      const x = -1.05 + (i / items) * 2.1 + 0.1;
      const item =
        kind === 'files'
          ? box(0.12, 0.34, 0.3, ['#2E5C9A', '#7A2E2E', '#C9A227', '#3F6B3A'][(rand() * 4) | 0], `file${s}`)
          : new THREE.Mesh(
              geo('interior:bottle', () => new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8)),
              mat(['#F2EAD6', '#E8412F', '#2FA8E0', '#F5C400'][(rand() * 4) | 0])
            );
      item.position.set(x, y + (kind === 'files' ? 0.19 : 0.12), 0.1);
      group.add(item);
    }
  }
  return group;
}

/** A wall clock. */
export function wallClock(): THREE.Group {
  const group = new THREE.Group();
  const face = new THREE.Mesh(geo('interior:clockFace', () => new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20)), mat('#F7EFE2'));
  face.rotation.x = Math.PI / 2;
  group.add(face);
  const rim = new THREE.Mesh(geo('interior:clockRim', () => new THREE.TorusGeometry(0.28, 0.03, 6, 20)), mat('#1D1510'));
  group.add(rim);
  const hand = box(0.03, 0.2, 0.02, '#1D1510');
  hand.position.set(0, 0.08, 0.04);
  group.add(hand);
  return group;
}

/** A water dispenser with its big blue bottle. */
export function waterDispenser(): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.4, 1.0, 0.4, '#E6E1D6');
  body.position.y = 0.5;
  outline(body);
  group.add(body);
  const bottle = new THREE.Mesh(
    geo('interior:dispenserBottle', () => new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12)),
    new THREE.MeshLambertMaterial({ color: '#5BA3D0', transparent: true, opacity: 0.8 })
  );
  bottle.position.y = 1.25;
  group.add(bottle);
  return group;
}

/** A notice board with pinned papers. */
export function noticeBoard(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const board = box(1.4, 0.9, 0.04, '#B98A55');
  group.add(board);
  for (let i = 0; i < 5; i++) {
    const paper = box(0.26, 0.34, 0.01, '#F7EFE2');
    paper.position.set(-0.5 + i * 0.25, (rand() - 0.5) * 0.35, 0.03);
    paper.rotation.z = (rand() - 0.5) * 0.2;
    group.add(paper);
  }
  return group;
}
