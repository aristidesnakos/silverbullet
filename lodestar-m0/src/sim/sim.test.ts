import { describe, it, expect } from 'vitest';
import { makeSimState, step, run } from './sim';
import type { SimInput } from './sim';
import { flowSpeedAt } from './flow';
import { makeM0Graph } from './vesselGraph';
import { DEFAULT_CONFIG } from './config';

const NO_MAGNET: SimInput = { magnetPos: { x: 1000, y: 1000, z: 1000 } }; // effectively off

describe('determinism', () => {
  it('same inputs → identical trajectory (replayable)', () => {
    const a = run(makeSimState(), NO_MAGNET, 600);
    const b = run(makeSimState(), NO_MAGNET, 600);
    expect(a.blob.s).toBe(b.blob.s);
    expect(a.blob.offset.x).toBe(b.blob.offset.x);
    expect(a.blob.offset.y).toBe(b.blob.offset.y);
  });

  it('a different seed diverges (the noise is actually live)', () => {
    const a = run(makeSimState(DEFAULT_CONFIG, makeM0Graph(), 1), NO_MAGNET, 600);
    const b = run(makeSimState(DEFAULT_CONFIG, makeM0Graph(), 999), NO_MAGNET, 600);
    expect(a.blob.offset.x).not.toBe(b.blob.offset.x);
  });
});

describe('flow continuity (v ∝ 1/r²)', () => {
  it('flow is faster where the vessel is narrower', () => {
    const edge = makeM0Graph().edges.e0;
    const rWide = edge.radiusAt(0.05); // near the end (wide)
    const rNarrow = edge.radiusAt(0.5); // stenosis (narrow)
    expect(rNarrow).toBeLessThan(rWide);

    // sample at the centreline (rhoFrac=0) and the same beat phase (tSec=0) so the
    // radial profile and pulse cancel out and the pure 1/r² continuity is testable.
    const vWide = Math.abs(flowSpeedAt(edge, 0.05, 0, 0, DEFAULT_CONFIG));
    const vNarrow = Math.abs(flowSpeedAt(edge, 0.5, 0, 0, DEFAULT_CONFIG));
    expect(vNarrow).toBeGreaterThan(vWide);

    // and the speed-up should track the area ratio (1/r²), within tolerance
    const predicted = (rWide * rWide) / (rNarrow * rNarrow);
    const measured = vNarrow / vWide;
    expect(measured).toBeCloseTo(predicted, 5);
  });
});

describe('pulsatility (the heartbeat you fight in rhythm)', () => {
  it('systole rushes harder than diastole at the same place', () => {
    const edge = makeM0Graph().edges.e0;
    // beat period = 1/heartRateHz; systolic spike sits near phase 0.12, diastole near 0.6.
    const period = 1 / DEFAULT_CONFIG.heartRateHz;
    const vSystole = Math.abs(flowSpeedAt(edge, 0.3, 0, 0.12 * period, DEFAULT_CONFIG));
    const vDiastole = Math.abs(flowSpeedAt(edge, 0.3, 0, 0.6 * period, DEFAULT_CONFIG));
    expect(vSystole).toBeGreaterThan(vDiastole);
  });
});

describe('radial profile (hug the wall to dodge the rush)', () => {
  it('flow is faster at the centre than near the wall', () => {
    const edge = makeM0Graph().edges.e0;
    const vCentre = Math.abs(flowSpeedAt(edge, 0.3, 0.0, 0, DEFAULT_CONFIG));
    const vWall = Math.abs(flowSpeedAt(edge, 0.3, 0.95, 0, DEFAULT_CONFIG));
    expect(vCentre).toBeGreaterThan(vWall);
  });
});

describe('wall clamping (no collision solver)', () => {
  it('blob never leaves the lumen', () => {
    // yank the magnet hard to one side for a while, then check containment
    let s = makeSimState();
    const sideMagnet: SimInput = { magnetPos: { x: 0, y: 8, z: 0 } };
    for (let i = 0; i < 1200; i++) {
      s = step(s, sideMagnet);
      const r = s.graph.edges[s.blob.edgeId].radiusAt(s.blob.s);
      const offLen = Math.hypot(s.blob.offset.x, s.blob.offset.y);
      // allow a hair of float slack
      expect(offLen).toBeLessThanOrEqual(r - DEFAULT_CONFIG.blobRadius + 1e-6);
    }
  });
});

describe('the verb: magnet vs. current', () => {
  it('with no magnet, the current carries the blob downstream (s increases)', () => {
    const start = makeSimState();
    const end = run(start, NO_MAGNET, 1200);
    expect(end.blob.s).toBeGreaterThan(start.blob.s);
  });

  it('a strong upstream magnet can hold the blob against the current', () => {
    // place the magnet behind the inlet so its pull opposes the downstream flow
    const start = makeSimState();
    const upstream: SimInput = { magnetPos: { x: -8, y: 0, z: 0 } };
    const free = run(start, NO_MAGNET, 1200);
    const held = run(start, upstream, 1200);
    // the held blob must make less downstream progress than the free-drifting one
    expect(held.blob.s).toBeLessThan(free.blob.s);
  });
});
