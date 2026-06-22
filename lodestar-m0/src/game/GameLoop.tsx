// THE BRIDGE. One useFrame advances the pure sim with a fixed-timestep accumulator
// and writes results straight into three objects via refs. No setState in here.
// React only learns about the world through the low-freq HUD push (~10Hz).

import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { engine, useHud } from './engine';
import { step } from '../sim/sim';
import { pulseFactor } from '../sim/flow';
import { cleanliness } from '../sim/delivery';
import { DEFAULT_CONFIG } from '../sim/config';
import { breastTumourScenario } from '../scenarios/breastTumour';
import { strain } from '../feel/haptics';
import { VesselMesh } from '../render/VesselMesh';

const CELL_COUNT = 900;
const MAGNET_LEAD = 1.1; // world units the magnet leads ABOVE the finger (anti-occlusion)

const scenario = breastTumourScenario;
const allEdges = Object.values(scenario.graph.edges);

export function GameLoop() {
  const { camera } = useThree();

  const blobRef = useRef<THREE.Mesh>(null!);
  const magnetRef = useRef<THREE.Group>(null!);
  const cellsRef = useRef<THREE.InstancedMesh>(null!);
  const ghostRef = useRef<THREE.Line>(null!);
  const targetRef = useRef<THREE.Mesh>(null!);
  // --- the ending: charge halo + one-shot delivery/collateral effects ---
  const chargeRingRef = useRef<THREE.Mesh>(null!);
  const bloomRef = useRef<THREE.Mesh>(null!); // soft clean-release pulse
  const puffRef = useRef<THREE.Mesh>(null!); // dull collateral dump
  const seenSeq = useRef(0); // edge-trigger sim.eventSeq so each event fires once
  const bloomT = useRef(-1); // local anim clock (s); <0 = idle
  const puffT = useRef(-1);
  const puffNearHealthy = useRef(false);

  // one centerline curve per edge — cells drift along these.
  const curves = useMemo(() => {
    const m: Record<string, THREE.CatmullRomCurve3> = {};
    for (const e of allEdges) {
      m[e.id] = new THREE.CatmullRomCurve3(
        e.controlPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
      );
    }
    return m;
  }, []);

  // static world position of the tumour target (e4 @ s).
  const targetPos = useMemo(() => {
    const t = scenario.target;
    return curves[t.edgeId].getPointAt(Math.min(0.999, Math.max(0.001, t.s)));
  }, [curves]);

  // per-cell drift state, spread across the whole tree (cosmetic → Math.random is fine).
  const cells = useMemo(
    () =>
      Array.from({ length: CELL_COUNT }, () => {
        const edge = allEdges[Math.floor(Math.random() * allEdges.length)];
        return {
          edgeId: edge.id,
          s: Math.random(),
          ang: Math.random() * Math.PI * 2,
          rad: 0.2 + Math.random() * 0.55,
          size: 0.035 + Math.random() * 0.05,
        };
      }),
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

    // --- charge ring: the drug "heat" building as you hold the tumour. Tightens,
    //     brightens, and pulses as it fills; billboarded so it reads as a halo. ---
    if (chargeRingRef.current) {
      const charge = sim.blob.chargeLevel;
      const mat = chargeRingRef.current.material as THREE.MeshStandardMaterial;
      if (charge > 0.01) {
        chargeRingRef.current.visible = true;
        chargeRingRef.current.position.copy(blobV);
        chargeRingRef.current.quaternion.copy(camera.quaternion); // face camera
        const pulse = 1 + 0.12 * Math.sin(sim.tSec * 9) * charge;
        chargeRingRef.current.scale.setScalar((0.6 + 0.7 * charge) * pulse);
        mat.opacity = 0.2 + 0.7 * charge;
        mat.emissiveIntensity = 0.5 + 2.2 * charge;
      } else {
        chargeRingRef.current.visible = false;
      }
    }

    // --- one-shot delivery events (edge-triggered off eventSeq): fire each exactly once.
    //     Clean delivery → hopeful bloom + push the end card. Collateral → dull puff. ---
    if (sim.eventSeq > seenSeq.current && sim.lastEvent) {
      seenSeq.current = sim.eventSeq;
      const ev = sim.lastEvent;
      if (ev.kind === 'delivered') {
        bloomT.current = 0;
        if (bloomRef.current) bloomRef.current.position.set(ev.pos.x, ev.pos.y, ev.pos.z);
        // the score is revealed ONCE, here — never as a live counter.
        useHud.getState().push({
          delivered: true,
          cleanliness: cleanliness(sim.targetDose, sim.healthyDose, DEFAULT_CONFIG.collateralWeight),
          healthyDose: sim.healthyDose,
        });
      } else {
        puffT.current = 0;
        puffNearHealthy.current = ev.nearHealthy;
        if (puffRef.current) {
          puffRef.current.position.set(ev.pos.x, ev.pos.y, ev.pos.z);
          // wilt is darker/more saturated when it grazes healthy tissue.
          (puffRef.current.material as THREE.MeshStandardMaterial).color.set(
            ev.nearHealthy ? '#5f4a5c' : '#857f90',
          );
        }
      }
    }

    // --- clean-release bloom: a soft, hopeful pulse of delivery (NEVER a blast). ---
    if (bloomRef.current) {
      if (bloomT.current >= 0) {
        bloomT.current += delta;
        const u = bloomT.current / 1.5; // over ~1.5s
        if (u >= 1) {
          bloomT.current = -1;
          bloomRef.current.visible = false;
        } else {
          bloomRef.current.visible = true;
          const e = 1 - Math.pow(1 - u, 3); // ease-out expansion
          bloomRef.current.scale.setScalar(0.3 + e * 3.0);
          (bloomRef.current.material as THREE.MeshStandardMaterial).opacity =
            0.55 * Math.sin(Math.PI * u); // fade in then out
        }
      } else {
        bloomRef.current.visible = false;
      }
    }

    // --- collateral puff: drug released in the WRONG place — dull, desaturated, recoils. ---
    if (puffRef.current) {
      if (puffT.current >= 0) {
        puffT.current += delta;
        const u = puffT.current / 1.2;
        if (u >= 1) {
          puffT.current = -1;
          puffRef.current.visible = false;
        } else {
          puffRef.current.visible = true;
          puffRef.current.scale.setScalar(0.4 + u * 1.3);
          (puffRef.current.material as THREE.MeshStandardMaterial).opacity =
            (puffNearHealthy.current ? 0.55 : 0.4) * Math.sin(Math.PI * u);
        }
      } else {
        puffRef.current.visible = false;
      }
    }

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

    // --- tumour target: arrhythmic throb (a motion tell distinct from healthy pulse).
    //     After clean delivery it QUIETS and recedes — shrinks toward a small calm node
    //     (tone guardrail: the tumour shrinks/quiets, it never explodes). ---
    if (targetRef.current) {
      if (sim.delivered) {
        const cur = targetRef.current.scale.x;
        const next = cur + (0.35 - cur) * (1 - Math.pow(0.02, delta));
        targetRef.current.scale.setScalar(next);
      } else {
        const t = sim.tSec;
        const throb = 1 + 0.12 * (Math.sin(t * 5.0) + 0.6 * Math.sin(t * 8.3 + 1.7));
        targetRef.current.scale.setScalar(throb);
      }
    }

    // --- blood cells drift downstream per-edge: the current you're fighting, made
    //     visible. Each edge carries its own Q and pulses on its own scale, so the
    //     trunk pounds and the tumour bed barely stirs. ---
    if (cellsRef.current) {
      // after delivery the body quiets — the current all but stills ("cut to silence").
      const flowDim = sim.delivered ? 0.15 : 1;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const edge = scenario.graph.edges[c.edgeId];
        const curve = curves[c.edgeId];
        const r = edge.radiusAt(c.s);
        const pf = pulseFactor(sim.tSec, DEFAULT_CONFIG, edge.pulseScale);
        const speed = (Math.abs(edge.flowQ) / (Math.PI * r * r)) * pf * flowDim;
        c.s += (Math.sign(edge.flowSign) * speed * delta) / edge.length;
        if (c.s > 1) c.s -= 1;
        if (c.s < 0) c.s += 1;
        const u = Math.min(0.999, Math.max(0.001, c.s));
        const center = curve.getPointAt(u);
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

      {/* the tumour target marker (release goal) */}
      <mesh ref={targetRef} position={targetPos}>
        <icosahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial
          color="#d65db1"
          emissive="#a01a7d"
          emissiveIntensity={0.7}
          roughness={0.5}
          transparent
          opacity={0.55}
          flatShading
        />
      </mesh>

      {/* charge ring — drug "heat" building as you hold the tumour; hidden until charging */}
      <mesh ref={chargeRingRef} visible={false}>
        <torusGeometry args={[0.42, 0.05, 12, 32]} />
        <meshStandardMaterial
          color="#ffb24d"
          emissive="#ff7a18"
          emissiveIntensity={0.5}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* clean-release bloom — a soft, hopeful pulse of delivery (never a blast) */}
      <mesh ref={bloomRef} visible={false}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial
          color="#ffd9a0"
          emissive="#ff9e3d"
          emissiveIntensity={1.6}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* collateral dump — drug in the WRONG place: dull, desaturated, recoiling */}
      <mesh ref={puffRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#857f90"
          transparent
          opacity={0}
          roughness={0.9}
          depthWrite={false}
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
