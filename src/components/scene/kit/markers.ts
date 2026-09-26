// The two markers that tell a learner where to go: the pin floating over the
// person to talk to, and the ring on the ground where they should stand.

import * as THREE from 'three';

export interface PinColours {
  body: string;
  /** The dot on its face: a star for Ghana, a shield for Kenya. */
  face: string;
  ink: string;
}

/** The waypoint marker. Drawn on top of everything so it stays findable. */
export function makePin(colours: PinColours): THREE.Group {
  const group = new THREE.Group();

  const pinMat = new THREE.MeshBasicMaterial({ color: colours.body, depthTest: false });
  const faceMat = new THREE.MeshBasicMaterial({ color: colours.face, depthTest: false });
  const inkMat = new THREE.MeshBasicMaterial({ color: colours.ink, depthTest: false });

  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 10), pinMat);
  spike.position.y = 0.85;
  spike.rotation.x = Math.PI;
  spike.renderOrder = 999;
  group.add(spike);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), pinMat);
  head.position.y = 2.1;
  head.renderOrder = 999;
  group.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), faceMat);
  face.position.set(0, 2.1, 0.55);
  face.renderOrder = 1000;
  group.add(face);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 18), inkMat);
  ring.position.y = 2.1;
  ring.renderOrder = 1000;
  group.add(ring);

  group.traverse((o) => {
    o.userData.pin = true;
  });
  return group;
}

/** A ring on the ground marking where to stand to talk. */
export function makeApproachRing(at: THREE.Vector3, colour: string, opacity = 0.75): THREE.Mesh {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.9, 22),
    new THREE.MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(at.x, 0.06, at.z);
  marker.userData.pin = true;
  return marker;
}
