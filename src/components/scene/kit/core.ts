// The scene kit's foundations: shared material and geometry caches, and the
// outline that keeps the drawn look once geometry is extruded.
//
// Every world used to carry its own copy of these. They share one cache now,
// so geometry keys are namespaced by the piece that builds them ('umbrella:pole',
// 'kente:bolt'): two worlds once used 'bolt' for a cylinder and a box.

import * as THREE from 'three';
import { clearPeopleCaches } from '../people';
import { clearVehicleCaches } from '../vehicles';
import { PALETTE } from './palettes';

const materialCache = new Map<string, THREE.MeshLambertMaterial>();

export function mat(color: string): THREE.MeshLambertMaterial {
  let material = materialCache.get(color);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color });
    materialCache.set(color, material);
  }
  return material;
}

/** Shapes repeat across hundreds of props, so build each one once. */
const geometryCache = new Map<string, THREE.BufferGeometry>();

export function geo<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = build();
    geometryCache.set(key, geometry);
  }
  return geometry as T;
}

/** Shared resources must not outlive a disposed scene. */
export function clearKitCaches() {
  geometryCache.clear();
  materialCache.clear();
  clearPeopleCaches();
  clearVehicleCaches();
}

/** Outlines are what keep the drawn look once geometry is extruded. */
export function outline(mesh: THREE.Mesh, colour = PALETTE.ink, opacity = 0.45) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
  mesh.add(
    new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity })
    )
  );
  return mesh;
}
