// Human figures for the 3D market.
//
// Built from primitives — head, torso, arms, legs — with jointed limbs so they
// walk rather than glide. Still stylised and flat-shaded to match the app's
// illustrated look, but with enough articulation to read as people.

import * as THREE from 'three';

export const SKIN_TONES = ['#4A2C18', '#5A3A26', '#6B452C', '#7C5435', '#3E2413'];

/** Wax-print and everyday market colours. */
export const CLOTH_COLOURS = [
  '#F2A1CB', '#11663F', '#F6B82C', '#F28A2E', '#8C8A2B',
  '#E0609F', '#1E8A55', '#D44A28', '#2E5C9A', '#7B3F9E',
  '#F7EFE2', '#9A5A38', '#C9A227', '#186F5C',
];

export const WRAP_COLOURS = [
  '#E0609F', '#F6B82C', '#D44A28', '#11663F', '#F7EFE2',
  '#7B3F9E', '#F28A2E', '#2E5C9A',
];

export type HeadStyle = 'bare' | 'gele' | 'cap' | 'hijab' | 'scarf';
export type Load = 'none' | 'basin' | 'tray';

export interface PersonOptions {
  cloth: string;
  accent?: string;
  skin?: string;
  head?: HeadStyle;
  /** A wrapper skirt rather than trousers. */
  wrapper?: boolean;
  load?: Load;
  scale?: number;
}

export interface Person {
  group: THREE.Group;
  /** Pivots the walk cycle rotates. */
  limbs: {
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    torso: THREE.Group;
    head: THREE.Group;
  };
}

const materialCache = new Map<string, THREE.MeshLambertMaterial>();
function mat(color: string): THREE.MeshLambertMaterial {
  let material = materialCache.get(color);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color });
    materialCache.set(color, material);
  }
  return material;
}

/** Bodies repeat across the crowd; build each shape once per scale bucket. */
const geometryCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = build();
    geometryCache.set(key, geometry);
  }
  return geometry as T;
}

/**
 * Drops the shared caches. Must be called whenever a scene is disposed: the
 * teardown disposes every geometry it walks, and handing a disposed geometry
 * back to the next build leaves the renderer re-uploading it every frame.
 */
export function clearPeopleCaches() {
  geometryCache.clear();
  materialCache.clear();
}

/** Scales are quantised so cached geometry is actually reused. */
function bucket(s: number): number {
  return Math.round(s * 10) / 10;
}

function limb(
  length: number,
  radius: number,
  colour: string,
  pivotY: number,
  x: number
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, pivotY, 0);
  const k = `${bucket(length)}x${bucket(radius)}`;
  const mesh = new THREE.Mesh(
    geo(`limb${k}`, () => new THREE.CapsuleGeometry(radius, length, 3, 6)),
    mat(colour)
  );
  // Hang from the pivot so rotation swings from the joint, not the middle.
  mesh.position.y = -(length / 2 + radius);
  pivot.add(mesh);
  return pivot;
}

export function makePerson(opts: PersonOptions): Person {
  const s = opts.scale ?? 1;
  const skin = opts.skin ?? SKIN_TONES[0];
  const cloth = opts.cloth;
  const accent = opts.accent ?? cloth;

  const group = new THREE.Group();
  const torso = new THREE.Group();
  group.add(torso);

  // --- Torso: tapered, shoulders wider than waist -------------------------
  const b = bucket(s);
  const chest = new THREE.Mesh(
    geo(`chest${b}`, () => new THREE.CylinderGeometry(0.3 * s, 0.24 * s, 0.62 * s, 8)),
    mat(cloth)
  );
  chest.position.y = 1.06 * s;
  chest.castShadow = true;
  torso.add(chest);

  const shoulders = new THREE.Mesh(
    geo(`shoulder${b}`, () => new THREE.CylinderGeometry(0.31 * s, 0.31 * s, 0.14 * s, 8)),
    mat(cloth)
  );
  shoulders.position.y = 1.34 * s;
  torso.add(shoulders);

  // --- Lower body ----------------------------------------------------------
  if (opts.wrapper) {
    const skirt = new THREE.Mesh(
      geo(`skirt${b}`, () => new THREE.CylinderGeometry(0.26 * s, 0.42 * s, 0.78 * s, 10)),
      mat(accent)
    );
    skirt.position.y = 0.42 * s;
    skirt.castShadow = true;
    torso.add(skirt);
  }

  const legColour = opts.wrapper ? skin : accent;
  const leftLeg = limb(0.42 * s, 0.11 * s, legColour, 0.76 * s, -0.13 * s);
  const rightLeg = limb(0.42 * s, 0.11 * s, legColour, 0.76 * s, 0.13 * s);
  group.add(leftLeg, rightLeg);

  // --- Arms ----------------------------------------------------------------
  const leftArm = limb(0.4 * s, 0.085 * s, skin, 1.33 * s, -0.34 * s);
  const rightArm = limb(0.4 * s, 0.085 * s, skin, 1.33 * s, 0.34 * s);
  // Short sleeves over the top of each arm.
  for (const [arm, sign] of [[leftArm, -1], [rightArm, 1]] as const) {
    const sleeve = new THREE.Mesh(
      geo(`sleeve${b}`, () => new THREE.CylinderGeometry(0.11 * s, 0.1 * s, 0.22 * s, 6)),
      mat(cloth)
    );
    sleeve.position.set(0, -0.1 * s, 0);
    arm.add(sleeve);
    void sign;
  }
  group.add(leftArm, rightArm);

  // --- Head ----------------------------------------------------------------
  const head = new THREE.Group();
  head.position.y = 1.44 * s;
  torso.add(head);

  const neck = new THREE.Mesh(
    geo(`neck${b}`, () => new THREE.CylinderGeometry(0.08 * s, 0.09 * s, 0.1 * s, 6)),
    mat(skin)
  );
  neck.position.y = 0.04 * s;
  head.add(neck);

  const skull = new THREE.Mesh(
    geo(`skull${b}`, () => new THREE.SphereGeometry(0.19 * s, 10, 8)),
    mat(skin)
  );
  skull.position.y = 0.26 * s;
  skull.scale.set(1, 1.12, 0.95);
  skull.castShadow = true;
  head.add(skull);

  switch (opts.head) {
    case 'gele': {
      // A tied head wrap: wider than the head, tilted, with a knot.
      const wrap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * s, 0.22 * s, 0.24 * s, 10),
        mat(accent)
      );
      wrap.position.y = 0.4 * s;
      wrap.rotation.z = 0.16;
      head.add(wrap);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), mat(accent));
      knot.position.set(0.2 * s, 0.46 * s, -0.06 * s);
      head.add(knot);
      break;
    }
    case 'hijab': {
      const veil = new THREE.Mesh(
        new THREE.SphereGeometry(0.26 * s, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.72),
        mat(accent)
      );
      veil.position.y = 0.27 * s;
      veil.scale.set(1, 1.25, 1);
      head.add(veil);
      break;
    }
    case 'cap': {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2 * s, 0.21 * s, 0.14 * s, 8),
        mat(accent)
      );
      cap.position.y = 0.42 * s;
      head.add(cap);
      break;
    }
    case 'scarf': {
      const scarf = new THREE.Mesh(
        new THREE.SphereGeometry(0.21 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
        mat(accent)
      );
      scarf.position.y = 0.28 * s;
      head.add(scarf);
      break;
    }
    default: {
      const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.2 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mat('#17110C')
      );
      hair.position.y = 0.28 * s;
      head.add(hair);
    }
  }

  // --- Head load: the market's most characteristic silhouette --------------
  if (opts.load && opts.load !== 'none') {
    const carry = new THREE.Group();
    carry.position.y = 0.56 * s;

    if (opts.load === 'basin') {
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34 * s, 0.24 * s, 0.22 * s, 12),
        mat('#C0C6CC')
      );
      carry.add(basin);
      const goods = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
        // Derived from what they wear rather than Math.random(), so a scene
        // built from the same seed is the same scene.
        mat(CLOTH_COLOURS[[...opts.cloth].reduce((n, c) => n + c.charCodeAt(0), 0) % CLOTH_COLOURS.length])
      );
      goods.position.y = 0.1 * s;
      carry.add(goods);
    } else {
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(0.7 * s, 0.09 * s, 0.46 * s),
        mat('#B98A55')
      );
      carry.add(tray);
      for (let i = 0; i < 4; i++) {
        const item = new THREE.Mesh(
          new THREE.SphereGeometry(0.075 * s, 8, 6),
          mat(i % 2 ? '#D44A28' : '#F6B82C')
        );
        item.position.set((i - 1.5) * 0.16 * s, 0.08 * s, 0);
        carry.add(item);
      }
    }
    head.add(carry);
  }

  return {
    group,
    limbs: { leftLeg, rightLeg, leftArm, rightArm, torso, head },
  };
}

/** Swings the limbs of a walking figure. `speed` 0 leaves them at rest. */
export function animateWalk(person: Person, time: number, speed: number) {
  const { limbs } = person;
  if (speed < 0.01) {
    limbs.leftLeg.rotation.x *= 0.85;
    limbs.rightLeg.rotation.x *= 0.85;
    limbs.leftArm.rotation.x *= 0.85;
    limbs.rightArm.rotation.x *= 0.85;
    limbs.torso.position.y = Math.sin(time * 1.4) * 0.008;
    return;
  }
  const phase = time * 8 * Math.min(speed, 1.6);
  const swing = Math.sin(phase) * 0.62 * Math.min(speed, 1.4);
  limbs.leftLeg.rotation.x = swing;
  limbs.rightLeg.rotation.x = -swing;
  limbs.leftArm.rotation.x = -swing * 0.7;
  limbs.rightArm.rotation.x = swing * 0.7;
  limbs.torso.position.y = Math.abs(Math.cos(phase)) * 0.045;
}

/**
 * Sits a person down: thighs forward, body lowered onto a seat of the given
 * height. Legs are the only limbs the posture animator leaves alone, so a
 * seated trader can still lean, gesture and nod.
 */
export function sitDown(person: Person, seatHeight: number) {
  person.group.position.y = seatHeight + 0.08;
  person.limbs.leftLeg.rotation.x = -1.2;
  person.limbs.rightLeg.rotation.x = -1.2;
}

/** A random market-goer. */
export function randomPerson(rand: () => number, opts: Partial<PersonOptions> = {}): Person {
  const female = rand() < 0.55;
  const heads: HeadStyle[] = female
    ? ['gele', 'gele', 'scarf', 'hijab', 'bare']
    : ['bare', 'bare', 'cap'];
  return makePerson({
    cloth: CLOTH_COLOURS[(rand() * CLOTH_COLOURS.length) | 0],
    accent: WRAP_COLOURS[(rand() * WRAP_COLOURS.length) | 0],
    skin: SKIN_TONES[(rand() * SKIN_TONES.length) | 0],
    head: heads[(rand() * heads.length) | 0],
    wrapper: female && rand() < 0.75,
    load: female && rand() < 0.3 ? (rand() < 0.5 ? 'basin' : 'tray') : 'none',
    scale: 0.95 + rand() * 0.16,
    ...opts,
  });
}
