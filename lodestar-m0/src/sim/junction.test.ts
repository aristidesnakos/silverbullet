import { describe, it, expect } from 'vitest';
import { makeSimState, step } from './sim';
import type { SimState } from './sim';
import { DEFAULT_CONFIG } from './config';
import { breastTumourScenario } from '../scenarios/breastTumour';
import type { Vec3 } from './vec';

// The breast tree: e0 (trunk) → J1 {e1 medial/tempting | e2 lateral/correct} ;
// e2 → J2 {e3 → J3 → e4 tumour | e5 dead-end}. Flow runs downstream toward the tumour,
// so reaching it is mostly WITH the current; junctions are decided by HEADING at the node.

const FAR_MAGNET = { x: 1000, y: 1000, z: 1000 }; // effectively no magnet

function freshState(seed = 1): SimState {
  return makeSimState(DEFAULT_CONFIG, breastTumourScenario.graph, seed);
}

// Drive the blob by steering the magnet a short lead ahead of it, toward a sequence of
// world-space waypoints — a crude autopilot so we can test routing deterministically.
function autopilot(waypoints: Vec3[], maxSteps: number, lead = 1.2) {
  let s = freshState();
  let wp = 0;
  const visited = new Set<string>([s.blob.edgeId]);
  for (let i = 0; i < maxSteps; i++) {
    const b = s.blobWorld;
    const target = waypoints[Math.min(wp, waypoints.length - 1)];
    const dx = target.x - b.x;
    const dy = target.y - b.y;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.6 && wp < waypoints.length - 1) wp++;
    const magnetPos: Vec3 =
      d > 1e-6
        ? { x: b.x + (dx / d) * lead, y: b.y + (dy / d) * lead, z: b.z + (dz / d) * lead }
        : target;
    s = step(s, { magnetPos });
    visited.add(s.blob.edgeId);
  }
  return { state: s, visited };
}

const NODE = breastTumourScenario.graph.nodes;

// Phase controller: ride the trunk to J1, then "kick" the heading in a fixed direction
// right at the node. The branch the blob commits to is whichever entry tangent the kick
// aligns with — exactly the best-tangent commit the integrator does. Returns visited set.
function driveThroughJ1(kick: { x: number; y: number }, lead = 0.6, maxSteps = 4000) {
  let s = freshState();
  const visited = new Set<string>([s.blob.edgeId]);
  for (let i = 0; i < maxSteps; i++) {
    const b = s.blobWorld;
    const dJ1 = Math.hypot(NODE.n_J1.pos.x - b.x, NODE.n_J1.pos.y - b.y);
    let dir = kick;
    if (s.blob.edgeId === 'e0' && dJ1 > 1.4) {
      // approach phase: head for the junction
      const dx = NODE.n_J1.pos.x - b.x;
      const dy = NODE.n_J1.pos.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      dir = { x: dx / d, y: dy / d };
    }
    s = step(s, { magnetPos: { x: b.x + dir.x * lead, y: b.y + dir.y * lead, z: 0 } });
    visited.add(s.blob.edgeId);
  }
  return visited;
}

describe('junction: crossing a node', () => {
  it('the current alone carries the blob off e0 onto a downstream edge', () => {
    let s = freshState();
    for (let i = 0; i < 4000; i++) s = step(s, { magnetPos: FAR_MAGNET });
    expect(s.blob.edgeId).not.toBe('e0'); // it left the trunk
    expect(Object.keys(breastTumourScenario.graph.edges)).toContain(s.blob.edgeId);
  });
});

describe('junction: best-tangent commit at J1', () => {
  // e1 (medial) entry tangent ≈ (-0.45, -0.89); e2 (lateral) ≈ (0.80, -0.60).
  it('kicking toward the medial tangent commits to e1 (the tempting branch)', () => {
    const visited = driveThroughJ1({ x: -0.447, y: -0.894 });
    expect(visited.has('e1')).toBe(true);
    expect(visited.has('e2')).toBe(false);
  });

  it('kicking toward the lateral tangent commits to e2 (the correct branch)', () => {
    const visited = driveThroughJ1({ x: 0.8, y: -0.6 });
    expect(visited.has('e2')).toBe(true);
    expect(visited.has('e1')).toBe(false);
  });

  it('the two headings produce genuinely different commitments', () => {
    const medial = driveThroughJ1({ x: -0.447, y: -0.894 });
    const lateral = driveThroughJ1({ x: 0.8, y: -0.6 });
    const medialBranch = medial.has('e1') ? 'e1' : 'e2';
    const lateralBranch = lateral.has('e2') ? 'e2' : 'e1';
    expect(medialBranch).not.toBe(lateralBranch);
  });
});

describe('junction: reaching the tumour', () => {
  it('steering down the correct subtree reaches e4 (the tumour edge)', () => {
    const { visited } = autopilot(
      [NODE.n_J1.pos, NODE.n_J2.pos, NODE.n_J3.pos, NODE.n_tumour.pos],
      6000,
    );
    expect(visited.has('e2')).toBe(true); // took the correct branch at J1
    expect(visited.has('e4')).toBe(true); // arrived in the tumour bed
  });
});

describe('junction: determinism on the multi-edge graph', () => {
  it('same inputs → identical final (edgeId, s, offset)', () => {
    const a = autopilot([NODE.n_J1.pos, NODE.n_J2.pos, NODE.n_tumour.pos], 2500);
    const b = autopilot([NODE.n_J1.pos, NODE.n_J2.pos, NODE.n_tumour.pos], 2500);
    expect(a.state.blob.edgeId).toBe(b.state.blob.edgeId);
    expect(a.state.blob.s).toBe(b.state.blob.s);
    expect(a.state.blob.offset.x).toBe(b.state.blob.offset.x);
    expect(a.state.blob.offset.y).toBe(b.state.blob.offset.y);
  });
});

describe('junction: no NaNs, s stays in [0,1]', () => {
  it('a long actively-steered run never produces NaN or out-of-range s', () => {
    let s = freshState();
    for (let i = 0; i < 6000; i++) {
      // chase a moving-ish magnet that yanks around the play area
      const ang = i * 0.01;
      s = step(s, { magnetPos: { x: Math.cos(ang) * 4, y: Math.sin(ang) * 4, z: 0 } });
      expect(Number.isFinite(s.blob.s)).toBe(true);
      expect(Number.isFinite(s.blob.offset.x)).toBe(true);
      expect(Number.isFinite(s.blob.offset.y)).toBe(true);
      expect(s.blob.s).toBeGreaterThanOrEqual(0);
      expect(s.blob.s).toBeLessThanOrEqual(1);
    }
  });
});
