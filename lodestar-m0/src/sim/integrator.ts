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
import type { VesselEdge, VesselGraph } from './vesselGraph';
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
  tSec: number,
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

  // 2. velocity = blood flow along the tangent + magnetic nudge.
  // Flow depends on WHERE in the cross-section we are (Poiseuille: centre rushes, wall
  // shelters) and on the heartbeat phase (pulsatile Q). rhoFrac is our radial position.
  const r0 = edge.radiusAt(blob.s);
  const rhoFrac = r0 > 1e-9 ? Math.hypot(blob.offset.x, blob.offset.y) / r0 : 0;
  const flowSpeed = flowSpeedAt(edge, blob.s, rhoFrac, tSec, cfg);
  const vFlow = scale(tangent, flowSpeed);

  // The "grab": lag the APPLIED pull magnitude toward its target so authority ramps in
  // over ~grabTau instead of snapping. v = v_flow + μ·(dir · pullMag).
  const fTarget = controlPull(field, blobWorld, cfg);
  const targetMag = len(fTarget);
  const dir = targetMag > 1e-9 ? scale(fTarget, 1 / targetMag) : { x: 0, y: 0, z: 0 };
  const alpha = 1 - Math.exp(-dt / cfg.grabTau);
  const pullMag = blob.pullMag + (targetMag - blob.pullMag) * alpha;
  const fMag = scale(dir, pullMag);
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

  // 5. junction: if we ran off the end (or back off the start) of the edge, cross the
  //    node and pick the branch whose entry best matches our heading. Steering your
  //    approach angle IS the commit (best-tangent match); backing out of a dead end
  //    means fighting upstream. (Single-edge graphs just clamp — no node to cross.)
  const moved = resolveJunction(graph, edge, s, v);
  const curEdge = moved.edge;
  s = moved.s;

  // 6. wall = clamp, not a collision solver: |offset| ≤ radius(s) − blobRadius
  const maxOffset = Math.max(0, curEdge.radiusAt(s) - cfg.blobRadius);
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
    blob: { edgeId: curEdge.id, s, offset: { x: ox, y: oy }, pullMag },
    blobWorld,
    flowSpeed,
    upstreamProgress,
  };
}

// Cross zero or more nodes if s left [0,1]. At each node, choose the connected branch
// (excluding the one we came from) whose entry direction best matches our heading.
interface Resolved {
  edge: VesselEdge;
  s: number;
}
function resolveJunction(
  graph: VesselGraph,
  startEdge: VesselEdge,
  startS: number,
  vWorld: Vec3,
): Resolved {
  let edge = startEdge;
  let s = startS;
  const vlen = len(vWorld);
  if (vlen < 1e-9) return { edge, s: clamp(s, 0, 1) };
  const vHat = scale(vWorld, 1 / vlen);

  for (let guard = 0; guard < 4; guard++) {
    if (s > 1) {
      const overshoot = (s - 1) * edge.length; // world units past the node
      const pick = bestBranch(graph, edge.to, edge.id, vHat);
      if (!pick) {
        s = 1; // leaf (dead end / chest wall): nowhere to go, clamp.
        break;
      }
      edge = pick.edge;
      s = pick.enterAtStart ? overshoot / edge.length : 1 - overshoot / edge.length;
    } else if (s < 0) {
      const overshoot = -s * edge.length;
      const pick = bestBranch(graph, edge.from, edge.id, vHat);
      if (!pick) {
        s = 0;
        break;
      }
      edge = pick.edge;
      s = pick.enterAtStart ? overshoot / edge.length : 1 - overshoot / edge.length;
    } else break;
  }
  return { edge, s: clamp(s, 0, 1) };
}

// Best connected branch at a node, by alignment of its entry direction with heading.
function bestBranch(
  graph: VesselGraph,
  nodeId: string,
  fromEdgeId: string,
  vHat: Vec3,
): { edge: VesselEdge; enterAtStart: boolean } | null {
  const adj = graph.adjacency[nodeId];
  if (!adj) return null;
  let best: { edge: VesselEdge; enterAtStart: boolean } | null = null;
  let bestDot = -Infinity;
  // edges leaving the node (from === node): enter forward at s=0, heading +tangent(0).
  for (const id of adj.out) {
    if (id === fromEdgeId) continue;
    const e = graph.edges[id];
    const d = dot(edgeTangent(e, 0), vHat);
    if (d > bestDot) {
      bestDot = d;
      best = { edge: e, enterAtStart: true };
    }
  }
  // edges arriving at the node (to === node): enter backward at s=1, heading −tangent(1).
  for (const id of adj.in) {
    if (id === fromEdgeId) continue;
    const e = graph.edges[id];
    const d = dot(scale(edgeTangent(e, 1), -1), vHat);
    if (d > bestDot) {
      bestDot = d;
      best = { edge: e, enterAtStart: false };
    }
  }
  return best;
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
