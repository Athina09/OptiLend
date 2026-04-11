'use client';

import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function DataParticle({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <Sphere args={[0.04, 16, 16]} position={position}>
        <meshBasicMaterial color="#14b8a6" transparent opacity={0.85} />
      </Sphere>
    </Float>
  );
}

function DataLine({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const points = useMemo(
    () => [new THREE.Vector3(...start), new THREE.Vector3(...end)],
    [start, end]
  );
  return (
    <Line points={points} color="#06b6d4" lineWidth={0.5} transparent opacity={0.5} />
  );
}

function SceneContent() {
  const count = 40;
  const particles = useMemo(() => {
    const p: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      p.push([
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
      ]);
    }
    return p;
  }, []);

  const lines = useMemo(() => {
    const l: { start: [number, number, number]; end: [number, number, number] }[] = [];
    for (let i = 0; i < 25; i++) {
      const a = particles[Math.floor(Math.random() * particles.length)];
      const b = particles[Math.floor(Math.random() * particles.length)];
      if (a && b) l.push({ start: a, end: b });
    }
    return l;
  }, [particles]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
      <pointLight position={[-10, -10, 5]} intensity={0.5} color="#14b8a6" />
      {particles.map((pos, i) => (
        <DataParticle key={i} position={pos} />
      ))}
      {lines.map(({ start, end }, i) => (
        <DataLine key={i} start={start} end={end} />
      ))}
    </>
  );
}

function Scene3D() {
  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <SceneContent />
      </Canvas>
      {/* Gradient keeps particle “art” visible toward the top; solid read zone for hero copy below */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-white/25 via-white/45 to-white/88"
        aria-hidden
      />
    </div>
  );
}

export { Scene3D };
export default Scene3D;
