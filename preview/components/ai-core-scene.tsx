"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Core() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const rings = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.07;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.04;
    }
    if (inner.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.7) * 0.035;
      inner.current.scale.setScalar(pulse);
    }
    if (rings.current) {
      rings.current.rotation.z -= delta * 0.18;
      rings.current.rotation.x = Math.PI / 2.35 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={group} position={[0, 0.35, 0]}>
      <Float speed={1.35} rotationIntensity={0.12} floatIntensity={0.18}>
        <mesh ref={inner}>
          <icosahedronGeometry args={[1.28, 6]} />
          <meshPhysicalMaterial
            color="#0b5fff"
            emissive="#29dfff"
            emissiveIntensity={1.6}
            roughness={0.18}
            metalness={0.2}
            transparent
            opacity={0.31}
            transmission={0.58}
            thickness={0.8}
          />
        </mesh>
        <mesh scale={1.055}>
          <icosahedronGeometry args={[1.28, 2]} />
          <meshBasicMaterial color="#72e8ff" wireframe transparent opacity={0.34} />
        </mesh>
        <Sparkles count={105} scale={2.45} size={2.2} speed={0.45} color="#9befff" />
      </Float>

      <group ref={rings}>
        {[1.62, 1.82, 2.08].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.65]}>
            <torusGeometry args={[radius, index === 0 ? 0.018 : 0.011, 12, 180]} />
            <meshBasicMaterial color={index === 1 ? "#8a62ff" : "#20d9ff"} transparent opacity={0.72 - index * 0.13} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, -1.72, 0]}>
        <cylinderGeometry args={[1.55, 1.9, 0.22, 96]} />
        <meshStandardMaterial color="#07131f" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, -1.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.57, 0.05, 16, 120]} />
        <meshBasicMaterial color="#20d9ff" />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.06, 0.15, 3.1, 24]} />
        <meshBasicMaterial color="#7beaff" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

function Fire({ position }: { position: [number, number, number] }) {
  const flame = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (flame.current) {
      const t = state.clock.elapsedTime;
      flame.current.scale.y = 0.9 + Math.sin(t * 7 + position[0]) * 0.18;
      flame.current.rotation.z = Math.sin(t * 3 + position[0]) * 0.08;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.34, 0.45, 0.16, 24]} />
        <meshStandardMaterial color="#1a1112" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh ref={flame} position={[0, 0.25, 0]}>
        <coneGeometry args={[0.23, 0.9, 18]} />
        <meshBasicMaterial color="#ff9a45" transparent opacity={0.88} />
      </mesh>
      <pointLight color="#ff7a32" intensity={4} distance={5} decay={2} position={[0, 0.35, 0]} />
      <Sparkles count={16} scale={[0.7, 1.6, 0.7]} size={2.4} speed={1.3} color="#ffd38a" position={[0, 0.6, 0]} />
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const crown = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (crown.current) crown.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.55 + position[0]) * 0.025;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.11, 0.18, 1.7, 12]} />
        <meshStandardMaterial color="#1e1711" roughness={1} />
      </mesh>
      <group ref={crown} position={[0, 1.85, 0]}>
        <mesh position={[-0.35, 0, 0]}>
          <icosahedronGeometry args={[0.68, 1]} />
          <meshStandardMaterial color="#103a31" roughness={0.9} />
        </mesh>
        <mesh position={[0.28, 0.12, 0.04]}>
          <icosahedronGeometry args={[0.78, 1]} />
          <meshStandardMaterial color="#0d4b3d" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function Waterfall({ position }: { position: [number, number, number] }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (material.current) material.current.opacity = 0.32 + Math.sin(state.clock.elapsedTime * 1.8 + position[0]) * 0.05;
  });
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[1.2, 5.2, 1, 24]} />
        <meshBasicMaterial ref={material} color="#6ddcff" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <Sparkles count={45} scale={[1.25, 5, 0.45]} size={1.7} speed={0.8} color="#c4f7ff" />
    </group>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.82, 0]} receiveShadow>
        <circleGeometry args={[15, 128]} />
        <meshStandardMaterial color="#061019" roughness={0.22} metalness={0.72} />
      </mesh>
      {[2.6, 4.1, 6.2].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.79 + index * 0.006, 0]}>
          <ringGeometry args={[radius - 0.018, radius + 0.018, 150]} />
          <meshBasicMaterial color={index === 1 ? "#8a62ff" : "#1aa7ff"} transparent opacity={0.24} />
        </mesh>
      ))}
    </>
  );
}

function Environment() {
  const trees = useMemo(
    () => [
      [-6.2, -1.82, -2.4, 1.25],
      [-4.8, -1.82, -5.1, 1.55],
      [5.7, -1.82, -3.2, 1.4],
      [4.2, -1.82, -6.1, 1.7],
      [-7.5, -1.82, -6.5, 1.8],
      [7.2, -1.82, -6.8, 2],
    ] as const,
    [],
  );
  return (
    <>
      <fog attach="fog" args={["#07111c", 9, 23]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight color="#8edfff" groundColor="#071019" intensity={0.62} />
      <directionalLight position={[7, 8, 4]} intensity={2.5} color="#e6f4ff" castShadow />
      <pointLight position={[0, 1, 1]} intensity={7} color="#1ebdff" distance={10} />
      <Stars radius={32} depth={22} count={800} factor={2.3} saturation={0.2} fade speed={0.08} />
      <Ground />
      <Core />
      <Fire position={[-3.8, -1.65, 0.1]} />
      <Fire position={[3.8, -1.65, 0.1]} />
      <Waterfall position={[-5.8, 0.3, -6.5]} />
      <Waterfall position={[5.8, 0.3, -6.5]} />
      {trees.map(([x, y, z, s]) => <Tree key={`${x}-${z}`} position={[x, y, z]} scale={s} />)}
      <Sparkles count={70} scale={[15, 5, 13]} size={1.1} speed={0.15} color="#7cdcff" position={[0, 0, -2]} />
    </>
  );
}

export default function AICoreScene({ lowPower = false }: { lowPower?: boolean }) {
  return (
    <Canvas
      dpr={lowPower ? [0.7, 1] : [1, 1.7]}
      camera={{ position: [0, 1.25, 8.4], fov: 44 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: lowPower ? "low-power" : "high-performance" }}
      shadows={!lowPower}
      className="ai-canvas"
    >
      <Environment />
    </Canvas>
  );
}
