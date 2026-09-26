// What makes a scene feel inhabited: a crowd that walks without colliding, a
// trader whose posture follows the conversation, and daylight that follows the
// simulated clock. Every world ran its own copy of these loops.

import * as THREE from 'three';
import { animateWalk, Person } from '../people';
import type { Blocker, BuiltScene, TraderMood } from './types';
import { PALETTE } from './palettes';

// --- Crowd --------------------------------------------------------------------

/** Someone drifting along an elliptical path through the lanes. */
export interface Walker {
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

/** Enough to feel busy without paying for a full navigation system. */
export function stepCrowd(walkers: Walker[], blockers: Blocker[], dt: number, elapsed: number) {
  for (const w of walkers) {
    // Scratch values rather than Vector3 clones: two allocations per walker
    // per frame was enough garbage to cause periodic collection pauses.
    const prevX = w.person.group.position.x;
    const prevZ = w.person.group.position.z;
    w.angle += w.speed * dt * 0.25;
    let x = w.cx + Math.cos(w.angle) * w.radiusX;
    let z = w.cz + Math.sin(w.angle) * w.radiusZ;

    // People used to walk through stalls and trees. Push them back out.
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

  // People used to walk straight through one another. One relaxation pass
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
}

// --- The person you talk to -----------------------------------------------------

/** Arm swing, lean, head tilt and how open the arms are, per mood. */
export interface Posture {
  arms: number;
  lean: number;
  tilt: number;
  spread: number;
}

/** The market traders' stances. Folded arms: understood, but no warmth. */
export const TRADER_POSTURES: Record<TraderMood, Posture> = {
  idle: { arms: 0, lean: 0, tilt: 0, spread: 0 },
  speaking: { arms: -0.3, lean: 0.06, tilt: 0.05, spread: 0.18 },
  listening: { arms: -0.12, lean: 0.16, tilt: 0.14, spread: 0 },
  warm: { arms: -0.85, lean: 0.1, tilt: -0.06, spread: 0.45 },
  pleased: { arms: -0.45, lean: 0.05, tilt: -0.04, spread: 0.2 },
  cool: { arms: 1.25, lean: -0.12, tilt: -0.02, spread: -0.3 },
};

/**
 * Eases a person towards the posture for the current mood each frame, so they
 * settle into a stance rather than snapping, with breathing and a nod while
 * they speak on top.
 */
export function makePostureAnimator(
  person: Person,
  postures: Record<TraderMood, Posture> = TRADER_POSTURES,
  breathing = { rate: 1.5, depth: 0.012 }
) {
  let mood: TraderMood = 'idle';
  return {
    setMood(next: TraderMood) {
      mood = next;
    },
    update(dt: number, elapsed: number) {
      const target = postures[mood];
      const k = Math.min(1, dt * 4.5);
      const limbs = person.limbs;
      limbs.leftArm.rotation.x += (target.arms - limbs.leftArm.rotation.x) * k;
      limbs.rightArm.rotation.x += (target.arms - limbs.rightArm.rotation.x) * k;
      limbs.leftArm.rotation.z += (-target.spread - limbs.leftArm.rotation.z) * k;
      limbs.rightArm.rotation.z += (target.spread - limbs.rightArm.rotation.z) * k;
      limbs.torso.rotation.x += (target.lean - limbs.torso.rotation.x) * k;
      limbs.head.rotation.z += (target.tilt - limbs.head.rotation.z) * k;

      limbs.torso.position.y = Math.sin(elapsed * breathing.rate) * breathing.depth;
      if (mood === 'speaking') limbs.head.rotation.x = Math.sin(elapsed * 9) * 0.07;
      else limbs.head.rotation.x *= 0.9;
    },
  };
}

/** Reused by headOf() so the speech bubble does not allocate per frame. */
const headScratch = new THREE.Vector3();

/** Where to anchor a speech bubble: just above the person's head. */
export function headOf(person: Person) {
  return (out = headScratch) => {
    person.limbs.head.getWorldPosition(out);
    out.y += 0.55;
    return out;
  };
}

// --- Light ------------------------------------------------------------------

export interface DaylightOptions {
  sky: number;
  ground: number;
  ambientIntensity: number;
  sunColour: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
}

/** A sky/ground fill and a shadow-casting sun, sized for a ~120m play area. */
export function addDaylight(scene: THREE.Scene, options: DaylightOptions) {
  const ambient = new THREE.HemisphereLight(options.sky, options.ground, options.ambientIntensity);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(options.sunColour, options.sunIntensity);
  sun.position.set(...options.sunPosition);
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
  return { ambient, sun };
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
