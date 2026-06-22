// The greybox vessel TREE: one translucent swept tube per edge of the scenario graph,
// each along the SAME centerline the sim uses, with a varying radius so narrowings (and
// the chaotic tumour caliber) are visible. Art is intentionally off — this is the verb
// test, not the beauty pass. Distinctions are by SHAPE/opacity, not hue (colourblind-safe).

import { useMemo } from 'react';
import * as THREE from 'three';
import { breastTumourScenario } from '../scenarios/breastTumour';
import type { VesselEdge } from '../sim/vesselGraph';

export function VesselMesh() {
  const built = useMemo(() => {
    return Object.values(breastTumourScenario.graph.edges).map((edge) => ({
      id: edge.id,
      tumour: edge.tumour,
      // tumour bed: more rings + per-vertex bumpiness → a disorganized, knobbly wall.
      wall: buildTube(edge, {
        tubular: edge.tumour ? 100 : 80,
        radial: edge.tumour ? 16 : 18,
        bump: edge.tumour ? 0.06 : 0,
      }),
      // healthy tissue alongside the edge: a faint raised SLEEVE over the zone's s-range.
      sleeves: edge.healthyZones.map((z, i) => ({
        key: `${edge.id}-hz-${i}`,
        geo: buildTube(edge, {
          sStart: z.sRange[0],
          sEnd: z.sRange[1],
          tubular: 44,
          radial: 14,
          radiusMul: 1.18,
          addR: 0.05,
        }),
      })),
    }));
  }, []);

  return (
    <group>
      {built.map((b) => (
        <group key={b.id}>
          {/* vessel wall */}
          <mesh geometry={b.wall}>
            {b.tumour ? (
              <meshStandardMaterial
                color="#9fb1ba"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
                roughness={0.9}
                metalness={0.0}
                flatShading
                depthWrite={false}
              />
            ) : (
              <meshStandardMaterial
                color="#7fb0c8"
                transparent
                opacity={0.22}
                side={THREE.DoubleSide}
                roughness={0.6}
                metalness={0.0}
                depthWrite={false}
              />
            )}
          </mesh>

          {/* healthy-tissue sleeves (warm, faint, faceted — shape cue, not just colour) */}
          {b.sleeves.map((s) => (
            <mesh key={s.key} geometry={s.geo}>
              <meshStandardMaterial
                color="#d8a07a"
                transparent
                opacity={0.16}
                side={THREE.DoubleSide}
                roughness={0.85}
                metalness={0.0}
                flatShading
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

interface TubeOpts {
  sStart?: number; // sub-range start (for partial sleeves), default 0
  sEnd?: number; // sub-range end, default 1
  tubular?: number;
  radial?: number;
  radiusMul?: number; // scale the radius (sleeves sit just outside the wall)
  addR?: number; // constant added to radius
  bump?: number; // deterministic per-vertex radius jitter (the tumour's disorder)
}

// Manual swept tube so radius can vary along the curve (TubeGeometry can't taper).
// Uses a LOCAL tangent frame per sample so it works over any sub-range [sStart,sEnd].
function buildTube(edge: VesselEdge, opts: TubeOpts = {}): THREE.BufferGeometry {
  const {
    sStart = 0,
    sEnd = 1,
    tubular = 80,
    radial = 18,
    radiusMul = 1,
    addR = 0,
    bump = 0,
  } = opts;

  const pts = edge.controlPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(pts);

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const up = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();

  for (let i = 0; i <= tubular; i++) {
    const u = sStart + (sEnd - sStart) * (i / tubular);
    const uc = Math.min(0.999, Math.max(0.001, u));
    const center = curve.getPoint(uc);
    const t = curve.getTangent(uc).normalize();
    up.set(Math.abs(t.y) < 0.9 ? 0 : 1, Math.abs(t.y) < 0.9 ? 1 : 0, 0);
    N.crossVectors(t, up).normalize();
    B.crossVectors(t, N).normalize();

    const baseR = edge.radiusAt(u) * radiusMul + addR;
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;
      const r = bump ? Math.max(0.04, baseR + bump * (hash(i, j) - 0.5) * 2) : baseR;
      positions.push(center.x + r * nx, center.y + r * ny, center.z + r * nz);
      normals.push(nx, ny, nz);
    }
  }

  for (let i = 1; i <= tubular; i++) {
    for (let j = 1; j <= radial; j++) {
      const a = (radial + 1) * (i - 1) + (j - 1);
      const b = (radial + 1) * i + (j - 1);
      const c = (radial + 1) * i + j;
      const d = (radial + 1) * (i - 1) + j;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

// deterministic 0..1 hash so the tumour's bumpy wall is stable across renders.
function hash(i: number, j: number): number {
  const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
