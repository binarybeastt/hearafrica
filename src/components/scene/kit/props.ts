// The props every world is assembled from: roofs, stalls, shops, kiosks, trees,
// towers, shelters, roads. Each takes a seeded random source rather than calling
// Math.random, so the same seed always builds the same scene.

import * as THREE from 'three';
import { CLOTH_COLOURS, randomPerson } from '../people';
import { geo, mat, outline } from './core';
import { GHANA_PALETTE, NAIROBI_PALETTE, PALETTE } from './palettes';

/** A corrugated zinc sheet — the roof of most of Lagos. */
export function zincRoof(width: number, depth: number, rusty: boolean, pitch = 0): THREE.Group {
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
export function goodsPile(kind: number, rand: () => number): THREE.Group {
  const group = new THREE.Group();

  if (kind === 0 || kind === 1) {
    const colour = kind === 0 ? PALETTE.tomato : PALETTE.pepper;
    const basin = new THREE.Mesh(
      geo('goods:basin', () => new THREE.CylinderGeometry(0.5, 0.36, 0.34, 10)),
      mat(kind === 0 ? PALETTE.brown2 : '#9BA3A6')
    );
    group.add(basin);
    const heap = new THREE.Mesh(
      geo('goods:heap', () => new THREE.SphereGeometry(0.44, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      mat(colour)
    );
    heap.position.y = 0.15;
    group.add(heap);
  } else if (kind === 2) {
    // A hand of plantain.
    for (let i = 0; i < 5; i++) {
      const finger = new THREE.Mesh(
        geo('goods:plantain', () => new THREE.CapsuleGeometry(0.075, 0.38, 3, 6)),
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
        geo('goods:sack', () => new THREE.CapsuleGeometry(0.25, 0.3, 3, 7)),
        mat(i % 2 ? '#D8CBA8' : '#C6B68F')
      );
      sack.position.set((rand() - 0.5) * 0.18, 0.28 + i * 0.42, (rand() - 0.5) * 0.18);
      group.add(sack);
    }
  } else {
    // Bolts of ankara, stood on end.
    for (let i = 0; i < 4; i++) {
      const bolt = new THREE.Mesh(
        geo('goods:bolt', () => new THREE.CylinderGeometry(0.11, 0.11, 0.8, 8)),
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
export function palmTree(rand: () => number): THREE.Group {
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
export function broadTree(rand: () => number): THREE.Group {
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

/** An umbrella-and-table pitch, the commonest kind in the market. */
export function umbrellaStall(radius: number, top: string, trim: string, rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const height = 3.3;

  const r = Math.round(radius * 4) / 4; // Quantised so the cache actually hits.

  const pole = new THREE.Mesh(
    geo('umbrella:pole', () => new THREE.CylinderGeometry(0.07, 0.07, height, 6)),
    mat(PALETTE.timber)
  );
  pole.position.y = height / 2;
  group.add(pole);

  const canopy = new THREE.Mesh(
    geo(`umbrella:canopy${r}`, () => new THREE.ConeGeometry(r, r * 0.5, 9)),
    mat(top)
  );
  canopy.position.y = height;
  canopy.castShadow = true;
  group.add(canopy);

  const band = new THREE.Mesh(
    geo(`umbrella:band${r}`, () => new THREE.CylinderGeometry(r * 0.99, r * 0.99, 0.1, 9)),
    mat(trim)
  );
  band.position.y = height - r * 0.25;
  group.add(band);

  // One trestle rather than a top and four legs: four boxes per stall across
  // 160 stalls was 640 draw calls on its own.
  const table = new THREE.Mesh(
    geo(`umbrella:table${r}`, () => new THREE.BoxGeometry(r * 1.5, 0.12, r * 0.95)),
    mat(PALETTE.timber)
  );
  table.position.y = 0.85;
  table.receiveShadow = true;
  group.add(table);

  const trestle = new THREE.Mesh(
    geo(`umbrella:trestle${r}`, () => new THREE.BoxGeometry(r * 1.35, 0.8, r * 0.7)),
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
export function lockUpShop(w: number, d: number, roofColour: string, rand: () => number): THREE.Group {
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
export function makePriceCard(title = 'TÒMÁTÌ'): { mesh: THREE.Mesh; setPrice: (price: number | null) => void } {
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
    ctx.fillText(title, 128, 52);

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

/** A CBD block: concrete frame, banded glazing, a flat roof with plant. */
export function cbdTower(rand: () => number): THREE.Group {
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
export function jacaranda(rand: () => number): THREE.Group {
  const group = new THREE.Group();
  const height = 4 + rand() * 2.2;
  const trunk = new THREE.Mesh(
    geo('jacaranda:trunk', () => new THREE.CylinderGeometry(0.26, 0.42, 1, 7)),
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
export function shelter(rand: () => number): THREE.Group {
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
      geo('shelter:post', () => new THREE.CylinderGeometry(0.1, 0.1, 3, 6)),
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

/** Corrugated zinc, rustier and lower than Lagos — Kejetia's signature. */
export function tinRoof(width: number, depth: number, rust: number): THREE.Group {
  const group = new THREE.Group();
  const colour =
    rust > 0.66 ? GHANA_PALETTE.rustDeep : rust > 0.33 ? GHANA_PALETTE.rust : GHANA_PALETTE.zinc;

  const slab = new THREE.Mesh(
    geo(`tinroof:${Math.round(width)}x${Math.round(depth)}`, () =>
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
      geo('tinroof:rib', () => new THREE.CylinderGeometry(0.05, 0.05, 1, 5)),
      mat(rust > 0.5 ? '#9A6A4E' : '#AEB6B9')
    );
    rib.rotation.x = Math.PI / 2;
    rib.scale.z = depth;
    rib.position.set(-width / 2 + (i + 0.5) * (width / ribs), 0.06, 0);
    group.add(rib);
  }
  return group;
}

/** A lock-up kiosk with a low rusted roof, and sometimes a sign on the front. */
export function kiosk(
  w: number,
  d: number,
  rand: () => number,
  /** A sign for the front, when the kiosk gets one. */
  sign?: () => THREE.Object3D
): THREE.Group {
  const group = new THREE.Group();
  const h = 2.7;
  const shell = ['#C9B79A', '#A8BFA0', '#C2A08A', '#9FB3C4', '#D0BE96'][(rand() * 5) | 0];

  const walls = new THREE.Mesh(
    geo(`kiosk:${Math.round(w)}x${Math.round(d)}`, () => new THREE.BoxGeometry(w, h, d)),
    mat(shell)
  );
  walls.position.y = h / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const roof = tinRoof(w * 1.15, d * 1.15, rand());
  roof.position.y = h + 0.06;
  group.add(roof);

  const front = new THREE.Mesh(
    geo('kiosk:front', () => new THREE.BoxGeometry(1, 1.8, 0.08)),
    mat('#2A1D14')
  );
  front.scale.x = (w * 0.6) / 1;
  front.position.set(0, 0.9, d / 2 + 0.03);
  group.add(front);

  // The draw happens whether or not there is a sign to hang, so a kiosk
  // without one leaves the rest of the scene's random sequence unchanged.
  if (rand() < 0.45 && sign) {
    const board = sign();
    board.position.set(0, 2.25, d / 2 + 0.05);
    group.add(board);
  }
  return group;
}

/** A sealed road with a broken centre line, and kerbs where the world has them. */
export function laySealedRoad(
  scene: THREE.Scene,
  along: 'x' | 'z',
  at: number,
  length: number,
  kerbs = true
) {
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

  if (!kerbs) return;
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
}
