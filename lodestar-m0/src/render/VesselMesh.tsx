// The greybox vessel: a translucent tube swept along the SAME centerline the sim
// uses, with a varying radius so the stenosis (where the current rushes) is visible.
// Art is intentionally off — this is the verb test, not the beauty pass.

import { useMemo } from 'react';
import * as THREE from 'three';
import { makeM0Graph } from '../sim/vesselGraph';

export function VesselMesh() {
  const geometry = useMemo(() => buildVaryingTube(), []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#7fb0c8"
        transparent
        opacity={0.22}
        side={THREE.DoubleSide}
        roughness={0.6}
        metalness={0.0}
        depthWrite={false}
      />
    </mesh>
  );
}

// Manual swept tube so radius can vary along the curve (TubeGeometry can't taper).
function buildVaryingTube(): THREE.BufferGeometry {
  const edge = makeM0Graph().edges.e0;
  const pts = edge.controlPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(pts);

  const tubular = 120;
  const radial = 20;
  const frames = curve.computeFrenetFrames(tubular, false);

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    const center = curve.getPointAt(u);
    const r = edge.radiusAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;
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
