/**
 * components/landing/Particles.jsx
 * -----------------------------------
 * The signature visual element of the landing page: a field of slowly
 * drifting warm "embers" (like a dying hearth fire) that occasionally
 * connect to their nearest neighbor with a thin thread of light.
 *
 * WHY THIS METAPHOR: the app is about two people's devices reaching across
 * a network and briefly, privately connecting - encrypt, send, decrypt.
 * Two embers drifting close and joining by a filament of light is a quiet,
 * literal picture of that handshake, rather than generic ambient particles.
 *
 * Performance note: with ~90 embers, checking all pairs every frame is only
 * ~4000 distance checks, which is trivial for a modern GPU/CPU - no need for
 * spatial partitioning at this scale.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EMBER_COUNT = 90;
const CONNECT_DISTANCE = 1.6; // world units - embers closer than this may connect
const FIELD_RADIUS_X = 9;
const FIELD_RADIUS_Y = 5;
const FIELD_DEPTH = 6;

// Two warm tones we lerp between per-ember so the field doesn't look flat.
const COLOR_A = new THREE.Color('#FF7A45'); // ember
const COLOR_B = new THREE.Color('#FFB86B'); // ember-glow

function makeEmberSeeds() {
  return Array.from({ length: EMBER_COUNT }, () => ({
    basePos: new THREE.Vector3(
      (Math.random() - 0.5) * FIELD_RADIUS_X * 2,
      (Math.random() - 0.5) * FIELD_RADIUS_Y * 2,
      -Math.random() * FIELD_DEPTH
    ),
    // Each ember drifts along a unique, slow Lissajous-like path so the
    // field feels organic rather than uniformly bobbing.
    speed: 0.15 + Math.random() * 0.25,
    phase: Math.random() * Math.PI * 2,
    driftRadius: 0.4 + Math.random() * 0.8,
    colorMix: Math.random(),
    scale: 0.5 + Math.random() * 1.1,
  }));
}

export default function Particles({ pointer }) {
  const seeds = useMemo(makeEmberSeeds, []);
  const pointsRef = useRef();
  const linesRef = useRef();
  const positionsRef = useRef(new Float32Array(EMBER_COUNT * 3));
  const colorsRef = useRef(new Float32Array(EMBER_COUNT * 3));

  // A soft round sprite generated on a canvas, used as the point texture so
  // embers render as glowing dots rather than hard-edged squares.
  const sprite = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,180,120,0.8)');
    gradient.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Pre-allocate a reusable geometry for connecting threads - max possible
  // segments is EMBER_COUNT (each ember connects to at most one neighbor).
  const maxLineVertices = EMBER_COUNT * 2;
  const linePositions = useMemo(() => new Float32Array(maxLineVertices * 3), [maxLineVertices]);
  // Reused Vector3 pool so we don't allocate 90 new vectors every frame (GC pressure).
  const worldPositions = useMemo(() => Array.from({ length: EMBER_COUNT }, () => new THREE.Vector3()), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const positions = positionsRef.current;

    for (let i = 0; i < EMBER_COUNT; i += 1) {
      const s = seeds[i];
      const driftX = Math.sin(t * s.speed + s.phase) * s.driftRadius;
      const driftY = Math.cos(t * s.speed * 0.8 + s.phase) * s.driftRadius * 0.6;
      const parallaxX = pointer ? pointer.current.x * 0.6 : 0;
      const parallaxY = pointer ? pointer.current.y * 0.3 : 0;

      const x = s.basePos.x + driftX + parallaxX;
      const y = s.basePos.y + driftY + parallaxY;
      const z = s.basePos.z;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      worldPositions[i].set(x, y, z);
    }

    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // --- Connecting threads: for each ember, find its nearest neighbor; if
    // within CONNECT_DISTANCE, draw a short line segment between them.
    let vertexIndex = 0;
    for (let i = 0; i < EMBER_COUNT; i += 1) {
      let nearestDist = Infinity;
      let nearestIdx = -1;
      for (let j = 0; j < EMBER_COUNT; j += 1) {
        if (i === j) continue;
        const d = worldPositions[i].distanceTo(worldPositions[j]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = j;
        }
      }
      // Only draw each pair once (i < nearestIdx) and only when close enough.
      if (nearestIdx > i && nearestDist < CONNECT_DISTANCE && vertexIndex < maxLineVertices - 1) {
        const a = worldPositions[i];
        const b = worldPositions[nearestIdx];
        linePositions[vertexIndex * 3] = a.x;
        linePositions[vertexIndex * 3 + 1] = a.y;
        linePositions[vertexIndex * 3 + 2] = a.z;
        linePositions[(vertexIndex + 1) * 3] = b.x;
        linePositions[(vertexIndex + 1) * 3 + 1] = b.y;
        linePositions[(vertexIndex + 1) * 3 + 2] = b.z;
        vertexIndex += 2;
      }
    }
    // Zero out any unused tail so old segments don't linger on screen.
    for (let k = vertexIndex; k < maxLineVertices; k += 1) {
      linePositions[k * 3] = 0;
      linePositions[k * 3 + 1] = 0;
      linePositions[k * 3 + 2] = 0;
    }

    if (linesRef.current) {
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.setDrawRange(0, vertexIndex);
    }
  });

  // Static per-ember colors, computed once.
  useMemo(() => {
    const colors = colorsRef.current;
    for (let i = 0; i < EMBER_COUNT; i += 1) {
      const c = COLOR_A.clone().lerp(COLOR_B, seeds[i].colorMix);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
  }, [seeds]);

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positionsRef.current, 3]} />
          <bufferAttribute attach="attributes-color" args={[colorsRef.current, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.22}
          map={sprite}
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#FFB86B" transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}
