/**
 * components/landing/Scene3D.jsx
 * ---------------------------------
 * Sets up the actual <Canvas> for the landing page: a low-lit environment,
 * soft fog for depth, and the ember particle field. The scene responds to
 * pointer movement with a gentle parallax so it reads as "interactive"
 * rather than a static looping background video.
 */

import { useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import Particles from './Particles';

/** Eases the camera toward the pointer position each frame for subtle parallax. */
function PointerParallax({ pointer }) {
  const { camera } = useThree();

  useFrame(() => {
    const targetX = pointer.current.x * 0.4;
    const targetY = pointer.current.y * 0.2;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -2);
  });

  return null;
}

export default function Scene3D() {
  const pointer = useRef({ x: 0, y: 0 });

  const handlePointerMove = (e) => {
    // Normalize to roughly [-1, 1]
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  return (
    <div className="absolute inset-0" onPointerMove={handlePointerMove} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#0B0A0D']} />
        <fog attach="fog" args={['#0B0A0D', 4, 13]} />

        {/* Low-lit, warm ambient environment - no harsh key light, just enough
            to suggest depth without breaking the "quiet hearth" mood. */}
        <ambientLight intensity={0.25} color="#6b4a3a" />
        <pointLight position={[2, 1, 2]} intensity={12} color="#FF7A45" distance={8} decay={2} />
        <pointLight position={[-3, -1, -2]} intensity={6} color="#8A3B1F" distance={10} decay={2} />

        <Particles pointer={pointer} />
        <PointerParallax pointer={pointer} />
      </Canvas>
    </div>
  );
}
