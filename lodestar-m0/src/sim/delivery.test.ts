import { describe, it, expect } from 'vitest';
import { stepDelivery, cleanliness } from './delivery';
import type { DeliveryConfig, DeliveryInput } from './delivery';
import { makeSimState, step } from './sim';
import { DEFAULT_CONFIG } from './config';
import { edgePoint, makeM0Graph } from './vesselGraph';
import { breastTumourScenario } from '../scenarios/breastTumour';

// The ending (sim/delivery.ts): hold steady on the tumour to charge → auto-fire clean
// delivery; get knocked off while hot → collateral dump. These are PURE-function tests
// (no render, no full-tree steering) plus one integration test through the real sim.

const DT = 1 / 120;
const CFG: DeliveryConfig = {
  releaseRadius: 0.7,
  holdThreshold: 0.3,
  chargeTime: 1.6,
  chargeBleed: 1.0,
  collateralThreshold: 0.3,
};
const ORIGIN = { x: 0, y: 0, z: 0 };

// minimal input builder — every test overrides just the fields it cares about.
function input(over: Partial<DeliveryInput>): DeliveryInput {
  return {
    charge: 0,
    blobWorld: ORIGIN,
    speed: 0,
    onTarget: true,
    nearHealthyWeight: 0,
    delivered: false,
    ...over,
  };
}

describe('delivery: charging to a clean release', () => {
  it('holding steady on the tumour fills the charge and auto-fires (no button)', () => {
    let charge = 0;
    let prev = -1;
    let fired: ReturnType<typeof stepDelivery> | null = null;
    let steps = 0;
    for (let i = 0; i < 1000 && !fired; i++) {
      const r = stepDelivery(input({ charge, speed: 0, onTarget: true }), CFG, DT);
      expect(r.charge).toBeGreaterThan(prev); // strictly climbs while held
      prev = r.charge;
      charge = r.charge;
      steps = i + 1;
      if (r.delivered) fired = r;
    }
    expect(fired).toBeTruthy();
    expect(fired!.delivered).toBe(true);
    expect(fired!.targetDoseAdd).toBe(1); // full clean dose to the tumour
    expect(fired!.healthyDoseAdd).toBe(0); // nothing spilled
    expect(fired!.event?.kind).toBe('delivered');
    // ~chargeTime worth of steps (1.6s / (1/120) ≈ 192), give or take the final partial.
    expect(steps).toBeGreaterThan(180);
    expect(steps).toBeLessThan(210);
  });
});

describe('delivery: collateral dump (heat has to go somewhere)', () => {
  it('breaking off the tumour while hot dumps the dose where you are', () => {
    const here = { x: 1, y: 2, z: 3 };
    const r = stepDelivery(
      input({ charge: 0.6, onTarget: false, blobWorld: here }),
      CFG,
      DT,
    );
    expect(r.event?.kind).toBe('collateral');
    expect(r.healthyDoseAdd).toBeGreaterThan(0);
    expect(r.targetDoseAdd).toBe(0);
    expect(r.delivered).toBe(false);
    expect(r.charge).toBe(0); // the heat discharged — nothing left
    if (r.event?.kind === 'collateral') expect(r.event.pos).toEqual(here);
  });

  it('a barely-warm charge off-target just bleeds — no dump, no harm', () => {
    const r = stepDelivery(input({ charge: 0.2, onTarget: false }), CFG, DT);
    expect(r.event).toBeNull();
    expect(r.healthyDoseAdd).toBe(0);
    expect(r.charge).toBeLessThan(0.2); // cooling off
    expect(r.charge).toBeGreaterThanOrEqual(0);
  });

  it('the bleed is floored at zero (never negative charge)', () => {
    const r = stepDelivery(input({ charge: 0.004, onTarget: false }), CFG, DT);
    expect(r.charge).toBe(0);
    expect(r.event).toBeNull();
  });

  it('releasing onto healthy tissue is worse than into a bare vessel', () => {
    const bare = stepDelivery(input({ charge: 0.6, onTarget: false, nearHealthyWeight: 0 }), CFG, DT);
    const onTissue = stepDelivery(input({ charge: 0.6, onTarget: false, nearHealthyWeight: 1 }), CFG, DT);
    expect(onTissue.healthyDoseAdd).toBeGreaterThan(bare.healthyDoseAdd);
    expect(bare.healthyDoseAdd).toBeCloseTo(0.6); // charge·(1+0)
    expect(onTissue.healthyDoseAdd).toBeCloseTo(1.2); // charge·(1+1)
    if (bare.event?.kind === 'collateral') expect(bare.event.nearHealthy).toBe(false);
    if (onTissue.event?.kind === 'collateral') expect(onTissue.event.nearHealthy).toBe(true);
  });
});

describe('delivery: the gates actually gate', () => {
  it('on the tumour but moving too fast: charge freezes (you must hold)', () => {
    const r = stepDelivery(input({ charge: 0.5, onTarget: true, speed: 0.5 }), CFG, DT);
    expect(r.charge).toBe(0.5); // no accrual
    expect(r.targetDoseAdd).toBe(0);
    expect(r.event).toBeNull();
    expect(r.delivered).toBe(false);
  });

  it('once delivered, the ending holds — idempotent, no further dose', () => {
    const r = stepDelivery(input({ charge: 1, onTarget: true, speed: 0, delivered: true }), CFG, DT);
    expect(r.delivered).toBe(true);
    expect(r.targetDoseAdd).toBe(0);
    expect(r.healthyDoseAdd).toBe(0);
    expect(r.event).toBeNull();
    expect(r.charge).toBe(1);
  });
});

describe('delivery: cleanliness score', () => {
  it('is 1.0 with no collateral and decreases as collateral grows', () => {
    expect(cleanliness(1, 0, 2)).toBe(1);
    expect(cleanliness(1, 0.5, 2)).toBeLessThan(1);
    expect(cleanliness(1, 1, 2)).toBeLessThan(cleanliness(1, 0.5, 2));
  });

  it('handles a run with zero target dose without NaN', () => {
    const c = cleanliness(0, 0, 2);
    expect(c).toBe(0);
    expect(Number.isFinite(c)).toBe(true);
  });
});

describe('delivery: wired through the real sim', () => {
  it('holding the blob on the breast-tumour target delivers cleanly', () => {
    const target = breastTumourScenario.target;
    let st = makeSimState(DEFAULT_CONFIG, breastTumourScenario.graph, 1, target);
    // teleport the blob into the tumour bed (skip the steering, which junction.test covers).
    st = { ...st, blob: { ...st.blob, edgeId: target.edgeId, s: target.s, offset: { x: 0, y: 0 } } };
    // park the magnet right on the target world point so the gentle distal flow can't drift us.
    const tip = edgePoint(breastTumourScenario.graph.edges[target.edgeId], target.s);
    const magnetPos = { x: tip.x, y: tip.y, z: tip.z };

    for (let i = 0; i < 400 && !st.delivered; i++) {
      st = step(st, { magnetPos });
    }

    expect(st.delivered).toBe(true);
    expect(st.targetDose).toBe(1);
    expect(st.healthyDose).toBe(0); // a clean hold spills nothing
    expect(st.eventSeq).toBeGreaterThanOrEqual(1);
    expect(st.lastEvent?.kind).toBe('delivered');
  });

  it('a sim with no target never enters the ending (logic stays inert)', () => {
    let st = makeSimState(DEFAULT_CONFIG, makeM0Graph(), 1); // no target arg
    for (let i = 0; i < 2000; i++) st = step(st, { magnetPos: { x: 0, y: 8, z: 0 } });
    expect(st.delivered).toBe(false);
    expect(st.targetDose).toBe(0);
    expect(st.healthyDose).toBe(0);
    expect(st.eventSeq).toBe(0);
  });
});
