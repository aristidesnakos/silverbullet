// The whole physics, in one overdamped step. No acceleration is ever integrated:
// at low Reynolds number inertia is negligible, so net force ≈ 0 every instant and
// velocity tracks force directly (Stokes drag). v = v_fluid + μ·F_mag.
//
// This is a PURE function — same (state, input, dt) → same output — which is what
// makes the trajectory tests in sim.test.ts possible.

import type { SimConfig } from './config';
import type { Blob } from './blob';
import { controlPull } from './field';
import type { Field } from './field';
import { flowSpeedAt } from './flow';
import { edgePoint, edgeTangent } from './vesselGraph';
import type { VesselGraph } from './vesselGraph';
import { dot, sub, scale, len } from './vec';
import type { Vec3 } from './vec';

export interface StepResult {
  blob: Blob;
  blobWorld: Vec3; // cached for the renderer + feel layer
  flowSpeed: number; // signed along-edge flow speed (for HUD / current viz)
  upstreamProgress: number; // +1 fully beating the current, -1 fully losing
}

export function integrate(
  graph: VesselGraph,
  blob: Blob,
  field: Field,
  cfg: SimConfig,
  rand: () => number,
): StepResult {
  const edge = graph.edges[blob.edgeId];
  const dt = cfg.fixedDt;

  // 1. world position of the blob (centerline + radial offset, in a simple frame)
  const center = edgePoint(edge, blob.s);
  const tangent = edgeTangent(edge, blob.s);
  // build a stable normal frame around the tangent
  const up: Vec3 = Math.abs(tangent.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const nx = normCross(tangent, up);
  const ny = normCross(tangent, nx);
  const blobWorld: Vec3 = {
    x: center.x + nx.x * blob.offset.x + ny.x * blob.offset.y,
    y: center.y + nx.y * blob.offset.x + ny.y * blob.offset.y,
    z: center.z + nx.z * blob.offset.x + ny.z * blob.offset.y,
  };

  // 2. velocity = blood flow along the tangent + magnetic nudge
  const flowSpeed = flowSpeedAt(edge, blob.s, cfg);
  const vFlow = scale(tangent, flowSpeed);
  const fMag = controlPull(field, blobWorld, cfg);
  const v = {
    x: vFlow.x + cfg.mobility * fMag.x,
    y: vFlow.y + cfg.mobility * fMag.y,
    z: vFlow.z + cfg.mobility * fMag.z,
  };

  // 3. split velocity into along-edge (advances s) and perpendicular (advances offset)
  const vAlong = dot(v, tangent); // world units / s
  const vPerp = sub(v, scale(tangent, vAlong));

  // 4. advance s in normalized edge space; advance offset in the cross-section frame
  let s = blob.s + (vAlong * dt) / edge.length;
  let ox = blob.offset.x + dot(vPerp, nx) * dt;
  let oy = blob.offset.y + dot(vPerp, ny) * dt;

  // small lateral jitter so the current feels alive (deterministic via rand)
  ox += (rand() - 0.5) * cfg.flowNoise;
  oy += (rand() - 0.5) * cfg.flowNoise;

  // 5. clamp s to the edge (junction handling is a later gate; single edge for M0)
  s = Math.max(0, Math.min(1, s));

  // 6. wall = clamp, not a collision solver: |offset| ≤ radius(s) − blobRadius
  const maxOffset = Math.max(0, edge.radiusAt(s) - cfg.blobRadius);
  const offLen = Math.hypot(ox, oy);
  if (offLen > maxOffset && offLen > 1e-9) {
    const k = maxOffset / offLen;
    ox *= k;
    oy *= k;
  }

  // upstream progress: how much the magnet is beating the current, in [-1, 1]
  const flowMag = Math.abs(flowSpeed) + 1e-6;
  const upstreamProgress = clamp(-Math.sign(flowSpeed) * (vAlong / flowMag), -1, 1);

  return {
    blob: { edgeId: blob.edgeId, s, offset: { x: ox, y: oy } },
    blobWorld,
    flowSpeed,
    upstreamProgress,
  };
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function normCross(a: Vec3, b: Vec3): Vec3 {
  const c = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
  const l = len(c);
  return l > 1e-9 ? scale(c, 1 / l) : { x: 0, y: 0, z: 0 };
}
