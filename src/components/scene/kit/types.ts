import type * as THREE from 'three';
import type { Person } from '../people';

/** How the trader is holding herself. This is the rapport meter. */
export type TraderMood = 'idle' | 'speaking' | 'listening' | 'warm' | 'pleased' | 'cool';

/** A circle the crowd walks around rather than through. */
export interface Blocker {
  x: number;
  z: number;
  r: number;
}

/** What every world hands the renderer, whether hand-built or composed. */
export interface BuiltScene {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  trader: Person;
  bisiPosition: THREE.Vector3;
  blockers: Blocker[];
  /** The waypoint marker over the person to talk to. */
  pin: THREE.Group;
  /** Where a learner should stand to talk to them. */
  approachPoint: THREE.Vector3;
  /** Writes the agreed price onto the scene's price card. */
  setPrice: (price: number | null) => void;
  /** Sets their posture. Warmth is shown by how they stand, not by a bar. */
  setTraderMood: (mood: TraderMood) => void;
  /**
   * World position of their head, for anchoring a speech bubble. Writes into
   * `out` (a shared scratch vector by default) rather than allocating.
   */
  traderHead: (out?: THREE.Vector3) => THREE.Vector3;
  /** Advances crowd and traffic. */
  update: (dt: number, elapsed: number) => void;
  /** How far in front of the person the learner starts. Outdoors, 15m. */
  spawnDistance?: number;
  /** Walls the learner cannot walk through, for a room. */
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
}
