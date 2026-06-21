// THE BRIDGE. One useFrame advances the pure sim with a fixed-timestep accumulator
// and writes results straight into three objects via refs. No setState in here.
// React only learns about the world through the low-freq HUD push (~10Hz).

import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { engine, useHud } from './engine';
import { step } from '../sim/sim';
import { makeM0Graph } from '../sim/vesselGraph';
import { DEFAULT_CONFIG } from '../sim/config';
import { strain } from '../feel/haptics';
import { VesselMesh } from '../render/VesselMesh';

const CELL_COUNT = 700;
const MAGNET_LEAD = 1.1; // world units the magnet leads ABOVE the finger (anti-occlusion)

export function GameLoop() {
  const { camera } = useThree();

  const blobRef = useRef<THREE.Mesh>(null!);
  const magnetRef = useRef<THREE.Group>(null!);
  const cellsRef = useRef<THREE.InstancedMesh>(null!);
  const ghostRef = useRef<THREE.Line>(null!);

  // shared geometry for the centerline frame (cells + ghost line)
  const curve = useMemo(() => {
    const pts = makeM0Graph().edges.e0.controlPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  const edge = useMemo(() => makeM0Graph().edges.e0, []);

  // per-cell drift state (deterministic-ish; cosmetic so Math.random is fine here)
  const cells = useMemo(
    () =>
      Array.from({ length: CELL_COUNT }, () => ({
        s: Math.random(),
        ang: Math.random() * Math.PI * 2,
        rad: 0.2 + Math.random() * 0.55,
        size: 0.04 + Math.random() * 0.05,
      })),
    [],
  );

  // fixed-timestep accumulator + HUD throttle
  const acc = useRef(0);
  const hudT = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const ghostPositions = useMemo(() => new Float32Array(6), []);
  const prevBlob = useRef(new THREE.Vector3());

  // ---- pointer → magnet (offset control: magnet leads ahead of the finger) ----
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const setMagnetFromEvent = useCallback((e: ThreeEvent<PointerEvent>) => {
    // R3F gives us a ray; intersect the z=0 play plane.
    const hit = new THREE.Vector3();
    e.ray.intersectPlane(plane, hit);
    if (hit) {
      engine.magnetPos = { x: hit.x, y: hit.y + MAGNET_LEAD, z: 0 };
    }
  }, [plane]);

  const onDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      engine.magnetActive = true;
      setMagnetFromEvent(e);
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    },
    [setMagnetFromEvent],
  );
  const onMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (engine.magnetActive) setMagnetFromEvent(e);
    },
    [setMagnetFromEvent],
  );
  const onUp = useCallback(() => {
    engine.magnetActive = false;
  }, []);

  useFrame((_, delta) => {
    const dt = DEFAULT_CONFIG.fixedDt;
    acc.current += Math.min(delta, 0.1); // clamp huge frames (tab refocus)

    // advance the sim in fixed logical steps, independent of render FPS
    while (acc.current >= dt) {
      engine.sim = step(engine.sim, { magnetPos: engine.magnetPos });
      acc.current -= dt;
    }

    const sim = engine.sim;
    const bw = sim.blobWorld;
    const blobV = new THREE.Vector3(bw.x, bw.y, bw.z);

    // --- blob: write position + velocity-proportional squash/stretch (feel) ---
    if (blobRef.current) {
      blobRef.current.position.copy(blobV);
      const vel = blobV.clone().sub(prevBlob.current);
      const speed = Math.min(vel.length() * 12, 0.6);
      blobRef.current.scale.set(1 - speed * 0.3, 1 + speed * 0.5, 1 - speed * 0.3);
      if (vel.lengthSq() > 1e-8) {
        blobRef.current.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          vel.clone().normalize(),
        );
      }
    }
    prevBlob.current.copy(blobV);

    // --- magnet marker + ghost-pull line (legibility: blob ≠ finger-chaser) ---
    if (magnetRef.current) {
      const m = engine.magnetPos;
      magnetRef.current.position.set(m.x, m.y, m.z);
      const pulse = engine.magnetActive ? 1.15 : 0.9;
      magnetRef.current.scale.setScalar(pulse);
    }
    if (ghostRef.current) {
      const m = engine.magnetPos;
      ghostPositions[0] = bw.x; ghostPositions[1] = bw.y; ghostPositions[2] = bw.z;
      ghostPositions[3] = m.x; ghostPositions[4] = m.y; ghostPositions[5] = m.z;
      const g = ghostRef.current.geometry as THREE.BufferGeometry;
      g.setAttribute('position', new THREE.BufferAttribute(ghostPositions, 3));
      g.attributes.position.needsUpdate = true;
      (ghostRef.current.material as THREE.LineBasicMaterial).opacity = engine.magnetActive
        ? 0.5
        : 0.15;
    }

    // --- blood cells drift downstream: the current you're fighting, made visible ---
    if (cellsRef.current) {
      const flowDir = Math.sign(DEFAULT_CONFIG.inletFlow) || 1;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const r = edge.radiusAt(c.s);
        const speed = DEFAULT_CONFIG.inletFlow / (Math.PI * r * r);
        c.s += (speed * flowDir * delta) / edge.length;
        if (c.s > 1) c.s -= 1;
        if (c.s < 0) c.s += 1;
        const center = curve.getPointAt(Math.min(0.999, Math.max(0.001, c.s)));
        const frame = frameAt(curve, c.s);
        const off = Math.min(c.rad, r - 0.06);
        dummy.position.set(
          center.x + (Math.cos(c.ang) * frame.n.x + Math.sin(c.ang) * frame.b.x) * off,
          center.y + (Math.cos(c.ang) * frame.n.y + Math.sin(c.ang) * frame.b.y) * off,
          center.z + (Math.cos(c.ang) * frame.n.z + Math.sin(c.ang) * frame.b.z) * off,
        );
        dummy.scale.setScalar(c.size);
        dummy.updateMatrix();
        cellsRef.current.setMatrixAt(i, dummy.matrix);
      }
      cellsRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- eased follow camera (third-person, above/behind; no nausea) ---
    const target = blobV.clone().add(new THREE.Vector3(0, 1.5, 9));
    camera.position.lerp(target, 1 - Math.pow(0.0001, delta));
    camera.lookAt(blobV);

    // --- low-freq HUD push (~12Hz) + haptic strain when losing to the current ---
    hudT.current += delta;
    if (hudT.current > 0.08) {
      hudT.current = 0;
      useHud.getState().push({
        upstreamProgress: sim.upstreamProgress,
        flowSpeed: sim.flowSpeed,
        s: sim.blob.s,
      });
      if (engine.magnetActive && sim.upstreamProgress < -0.1) {
        strain(Math.min(1, -sim.upstreamProgress), performance.now());
      }
    }
  });

  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 6]} intensity={0.9} />

      <VesselMesh />

      {/* the blob */}
      <mesh ref={blobRef}>
        <sphereGeometry args={[DEFAULT_CONFIG.blobRadius, 24, 24]} />
        <meshStandardMaterial
          color="#ffb24d"
          emissive="#ff7a18"
          emissiveIntensity={1.4}
          roughness={0.3}
        />
      </mesh>

      {/* blood cells (instanced — one draw call) */}
      <instancedMesh ref={cellsRef} args={[undefined, undefined, CELL_COUNT]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial color="#c0392b" transparent opacity={0.55} />
      </instancedMesh>

      {/* the external magnet + ghost-pull line */}
      <group ref={magnetRef}>
        <mesh>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color="#4aa3ff" emissive="#1e6fff" emissiveIntensity={0.8} />
        </mesh>
      </group>
      {/* @ts-expect-error three line element */}
      <line ref={ghostRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#7fc8ff" transparent opacity={0.2} />
      </line>

      {/* invisible drag plane covering the play area */}
      <mesh
        position={[0, 0, 0]}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        visible={false}
      >
        <planeGeometry args={[60, 40]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

// centerline normal/binormal frame for placing cells around the lumen
function frameAt(curve: THREE.CatmullRomCurve3, s: number) {
  const u = Math.min(0.999, Math.max(0.001, s));
  const t = curve.getTangentAt(u);
  const up = Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const n = new THREE.Vector3().crossVectors(t, up).normalize();
  const b = new THREE.Vector3().crossVectors(t, n).normalize();
  return { n, b };
}
