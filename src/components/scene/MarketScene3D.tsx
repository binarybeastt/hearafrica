'use client';

// Prototype renderer for the 3D Balogun Market.
//
// Deliberately standalone: it is mounted at /scene and touches nothing the
// working app depends on, so it can be thrown away or rebuilt without risk.

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  BuiltScene,
  TraderMood,
  applySunElevation,
  buildBaloganScene,
  clearSceneCaches,
  PALETTE,
} from './balogun-scene';
import { buildKejetiaScene, clearKejetiaCaches } from './kejetia-scene';
import { buildNairobiScene, clearNairobiCaches } from './nairobi-scene';
import { animateWalk, makePerson } from './people';

interface MarketScene3DProps {
  /** Solar elevation in degrees, as the simulated clock computes it. */
  sunElevation?: number;
  onApproachTrader?: () => void;
  /**
   * Freezes walking and camera input while a lesson is open, so the market
   * cannot be driven around underneath the conversation, and so Space belongs
   * to the microphone rather than to the scene.
   */
  paused?: boolean;
  /** Frame counter and prototype labelling; off inside the real app. */
  debug?: boolean;
  /** Eases the camera into an over-the-shoulder two-shot with the trader. */
  focusTrader?: boolean;
  /** Her current line, shown as a speech bubble above her. */
  traderLine?: { native: string; en: string } | null;
  /** Her posture — the rapport meter, shown as how she stands. */
  traderMood?: TraderMood;
  /** Written on the chalk card on her counter. */
  price?: number | null;
  /** Which world to build. */
  market?: 'balogun' | 'kejetia' | 'nairobi';
  /** Who the learner is walking toward, and what they stand at. */
  traderName?: string;
  pitchNoun?: string;
}

const WALK_SPEED = 13;
const EYE_HEIGHT = 1.62;
const APPROACH_DISTANCE = 6;

export const MarketScene3D: React.FC<MarketScene3DProps> = ({
  sunElevation = 42,
  onApproachTrader,
  paused = false,
  debug = false,
  focusTrader = false,
  traderLine = null,
  traderMood = 'idle',
  price = null,
  market = 'balogun',
  traderName = 'the trader',
  pitchNoun = 'stall',
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const elevationRef = useRef(sunElevation);
  elevationRef.current = sunElevation;
  const approachRef = useRef(onApproachTrader);
  approachRef.current = onApproachTrader;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const focusRef = useRef(focusTrader);
  focusRef.current = focusTrader;
  const builtRef = useRef<BuiltScene | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const built: BuiltScene =
      market === 'kejetia'
        ? buildKejetiaScene()
        : market === 'nairobi'
        ? buildNairobiScene()
        : buildBaloganScene();
    builtRef.current = built;
    applySunElevation(built, elevationRef.current);

    // The sun only moves when the clock does, so the shadow map does not need
    // regenerating every frame — that was roughly half the render cost.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;

    const camera = new THREE.PerspectiveCamera(
      58,
      host.clientWidth / host.clientHeight,
      0.1,
      400
    );

    // The learner, third person, starting up the lane with the stall in view.
    const you = makePerson({
      cloth: PALETTE.green,
      accent: '#2E5C9A',
      head: 'bare',
      scale: 1,
    });
    const walker = you.group;
    walker.position.copy(built.bisiPosition.clone().add(new THREE.Vector3(0, 0, 15)));
    built.scene.add(walker);

    // Face down the lane toward Iya Bisi from the first frame.
    let yaw = Math.PI;
    let pitch = -0.12;
    const keys = new Set<string>();
    const target = new THREE.Vector3();
    let moveTarget: THREE.Vector3 | null = null;
    /** True while walking to the pin, so the camera can turn to face her. */
    let autoWalking = false;
    let disposed = false;

    // --- Input ---------------------------------------------------------------
    const onKeyDown = (e: KeyboardEvent) => {
      if (pausedRef.current) return;
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        moveTarget = null;
        autoWalking = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragMoved = false;
    const onPointerDown = (e: PointerEvent) => {
      if (pausedRef.current) return;
      dragging = true;
      dragMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
      lastX = e.clientX;
      lastY = e.clientY;
      yaw -= dx * 0.005;
      pitch = THREE.MathUtils.clamp(pitch - dy * 0.003, -0.55, 0.25);
    };
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const onPointerUp = (e: PointerEvent) => {
      if (pausedRef.current) return;
      dragging = false;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* fine */ }
      if (dragMoved) return;
      // A tap that was not a drag is a move order.
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      // The pin and its ground ring take priority over the ground beneath them.
      const pinHits = raycaster.intersectObjects(
        [built.pin, ...built.scene.children.filter((c) => c.userData.pin)],
        true
      );
      if (pinHits.length) {
        moveTarget = built.approachPoint.clone();
        autoWalking = true;
        return;
      }

      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        moveTarget = hit;
        autoWalking = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(host);

    // --- Movement, with crude circular collision -----------------------------
    /** Moves `position` by `delta`, pushed out of any blocker it lands inside. */
    const slide = (position: THREE.Vector3, delta: THREE.Vector3) => {
      position.add(delta);
      for (const b of built.blockers) {
        const dx = position.x - b.x;
        const dz = position.z - b.z;
        const distance = Math.hypot(dx, dz);
        const minimum = b.r + 0.55;
        if (distance < minimum && distance > 0.0001) {
          // Push back out along the normal: the walker slides rather than sticking.
          position.x = b.x + (dx / distance) * minimum;
          position.z = b.z + (dz / distance) * minimum;
        }
      }
      return position;
    };

    // Scratch vectors, reused every frame. Allocating these per frame produced
    // steady garbage and periodic collection pauses.
    const lastShadowAnchor = new THREE.Vector3(1e9, 0, 1e9);
    const bubbleAnchor = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const move = new THREE.Vector3();
    const to = new THREE.Vector3();
    const desired = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const side = new THREE.Vector3();

    const previousPosition = walker.position.clone();
    let appliedElevation = elevationRef.current;
    let last = performance.now();
    let frames = 0;
    let fpsClock = last;
    let wasNear = false;

    const loop = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      // Screen-right, from behind the walker. The sign was flipped, so A and D
      // strafed the wrong way.
      right.set(-forward.z, 0, forward.x);
      move.set(0, 0, 0);

      if (pausedRef.current) {
        keys.clear();
        moveTarget = null;
      }

      if (!pausedRef.current && (keys.has('KeyW') || keys.has('ArrowUp'))) move.add(forward);
      if (!pausedRef.current && (keys.has('KeyS') || keys.has('ArrowDown'))) move.sub(forward);
      if (!pausedRef.current && (keys.has('KeyA') || keys.has('ArrowLeft'))) move.sub(right);
      if (!pausedRef.current && (keys.has('KeyD') || keys.has('ArrowRight'))) move.add(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(WALK_SPEED * dt);
        slide(walker.position, move);
        walker.rotation.y = Math.atan2(move.x, move.z);
      } else if (moveTarget) {
        to.copy(moveTarget).sub(walker.position);
        to.y = 0;
        if (to.length() < 0.7) {
          moveTarget = null;
          if (autoWalking) {
            // Arrive facing the stall rather than facing whichever way you came.
            yaw = Math.atan2(
              built.bisiPosition.x - walker.position.x,
              built.bisiPosition.z - walker.position.z
            );
            autoWalking = false;
          }
        } else {
          to.normalize().multiplyScalar(WALK_SPEED * dt);
          slide(walker.position, to);
          walker.rotation.y = Math.atan2(to.x, to.z);
          if (autoWalking) {
            // Swing the camera round to follow, so she comes into view.
            const desiredYaw = Math.atan2(to.x, to.z);
            let delta = desiredYaw - yaw;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            yaw += delta * Math.min(1, dt * 2.6);
          }
        }
      }

      // Swing the limbs at the speed actually travelled.
      const travelled = walker.position.distanceTo(previousPosition) / Math.max(dt, 0.001);
      previousPosition.copy(walker.position);
      animateWalk(you, now / 1000, travelled / 6);

      built.update(dt, now / 1000);

      // Third-person camera trailing behind the walker.
      if (focusRef.current) {
        // Over-the-shoulder two-shot: your shoulder in the lower foreground,
        // the trader centred. This is the framing the market was built for.
        offset.copy(built.bisiPosition).sub(walker.position).setY(0);
        const distance = offset.length() || 1;
        offset.divideScalar(distance);
        side.set(-offset.z, 0, offset.x);
        desired
          .copy(walker.position)
          .addScaledVector(offset, -4.1)
          .addScaledVector(side, 1.45);
        desired.y += EYE_HEIGHT + 2.6;
        // Keep yaw in step so releasing the lesson does not snap the view.
        yaw = Math.atan2(offset.x, offset.z);
        // Aimed BELOW her head so she sits high in frame, clear of the coaching
        // bar that occupies the lower part of the screen.
        target.copy(built.bisiPosition);
        target.y += 0.15;
      } else {
        // A raised three-quarter chase camera: canopies are ~4m tall and a
        // shoulder-height camera spends most of its time inside one.
        offset.set(Math.sin(yaw), 0, Math.cos(yaw));
        desired.copy(walker.position).addScaledVector(offset, -11);
        desired.y += EYE_HEIGHT + 7.4 + pitch * -7;
        target.copy(walker.position);
        target.y += 1.5;
      }

      // A slower ease when reframing, so the move reads as a camera move.
      const ease = focusRef.current ? 1 - Math.pow(0.02, dt) : 1 - Math.pow(0.0001, dt);
      camera.position.lerp(desired, ease);
      camera.lookAt(target);

      // Iya Bisi turns to face whoever is in front of her.
      const toWalker = walker.position.clone().sub(built.bisiPosition);
      const distance = Math.hypot(toWalker.x, toWalker.z);
      built.trader.group.rotation.y = Math.atan2(toWalker.x, toWalker.z) - Math.PI;

      const isNear = distance < APPROACH_DISTANCE;
      if (isNear !== wasNear) {
        wasNear = isNear;
        setNear(isNear);
        if (isNear) approachRef.current?.();
      }

      // Keep the shadow frustum on the walker rather than the origin.
      built.sun.target.position.copy(walker.position);
      built.sun.target.updateMatrixWorld();
      if (walker.position.distanceToSquared(lastShadowAnchor) > 64) {
        lastShadowAnchor.copy(walker.position);
        renderer.shadowMap.needsUpdate = true;
      }

      // Re-apply the sun so the time-of-day control actually moves the light.
      if (elevationRef.current !== appliedElevation) {
        appliedElevation = elevationRef.current;
        applySunElevation(built, appliedElevation);
        renderer.shadowMap.needsUpdate = true;
      }

      built.pin.visible = !focusRef.current;

      // Anchor the speech bubble to her head in screen space.
      const bubble = bubbleRef.current;
      if (bubble) {
        const head = built.traderHead(bubbleAnchor).project(camera);
        const onScreen = head.z < 1 && Math.abs(head.x) < 1.25 && Math.abs(head.y) < 1.4;
        if (onScreen) {
          bubble.style.left = `${(head.x * 0.5 + 0.5) * 100}%`;
          bubble.style.top = `${(-head.y * 0.5 + 0.5) * 100}%`;
          bubble.style.visibility = 'visible';
        } else {
          bubble.style.visibility = 'hidden';
        }
      }

      renderer.render(built.scene, camera);

      frames++;
      if (now - fpsClock > 500) {
        setFps(Math.round((frames * 1000) / (now - fpsClock)));
        frames = 0;
        fpsClock = now;
      }
      requestAnimationFrame(loop);
    };

    // Prototype-only debug handle.
    (window as unknown as Record<string, unknown>).__scene = {
      walker,
      camera,
      built,
      renderer,
      get yaw() { return yaw; },
    };

    setReady(true);
    requestAnimationFrame(loop);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      built.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      // The caches hand out shared geometry and materials, and the traversal
      // above has just disposed them, so they must not survive into the next
      // build (React mounts this twice in development).
      clearSceneCaches();
      clearKejetiaCaches();
      clearNairobiCaches();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [market]);

  useEffect(() => {
    builtRef.current?.setTraderMood(traderMood);
  }, [traderMood]);

  useEffect(() => {
    builtRef.current?.setPrice(price);
  }, [price]);

  useEffect(() => {
    // Fade rather than pop, so a new line does not flash on screen.
    setBubbleVisible(false);
    if (!traderLine) return;
    const timer = window.setTimeout(() => setBubbleVisible(true), 40);
    return () => window.clearTimeout(timer);
  }, [traderLine?.native, traderLine?.en]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Her words, anchored over her head rather than filed in a chat log. */}
      {traderLine && (
        <div
          ref={bubbleRef}
          style={{
            position: 'absolute',
            transform: 'translate(-50%, -100%)',
            maxWidth: 'min(330px, 68vw)',
            padding: '10px 13px',
            background: 'var(--paper, #F7EFE2)',
            border: '2.5px solid var(--ink, #1D1510)',
            borderRadius: '16px',
            boxShadow: '4px 4px 0 var(--ink, #1D1510)',
            pointerEvents: 'none',
            opacity: bubbleVisible ? 1 : 0,
            transition: 'opacity .22s ease',
            zIndex: 10,
          }}
        >
          <div
            className="yo"
            style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3, color: 'var(--ink, #1D1510)' }}
          >
            {traderLine.native}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink2, #4A3A2E)', marginTop: 3 }}>
            {traderLine.en}
          </div>
          {/* Tail, pointing down at her. */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-11px',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '11px solid var(--ink, #1D1510)',
            }}
          />
        </div>
      )}

      {!paused && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            padding: '7px 10px',
            background: 'rgba(247,239,226,0.9)',
            border: '2px solid #1D1510',
            borderRadius: 9,
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
            color: '#4A3A2E',
            lineHeight: 1.45,
            maxWidth: 190,
            pointerEvents: 'none',
          }}
        >
          WASD to walk · drag to look · tap the pin to reach {traderName}
          {debug && (
            <div style={{ marginTop: 3, fontWeight: 700 }}>{ready ? `${fps} fps` : '…'}</div>
          )}
        </div>
      )}

      {near && !paused && (
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 16px',
            background: '#F6B82C',
            border: '2px solid #1D1510',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            color: '#1D1510',
          }}
        >
          You are at {traderName}&apos;s {pitchNoun}
        </div>
      )}
    </div>
  );
};
