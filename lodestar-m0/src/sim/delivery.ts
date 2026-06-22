// THE ENDING, as a pure deterministic function. This is the spine's payoff (see
// docs/product/Lodestar-Gameplay-Design-v0.1.md §3): the SAME "hold station" gesture
// you steered with becomes the release. Hold the blob steady on the tumour and the drug
// charges; at full charge it auto-fires — clean delivery. Get knocked off the tumour
// while it's already hot and the heat dumps where you are — collateral. There is no
// release button: the verb itself delivers, and imprecision is what poisons healthy
// tissue. That single rule IS the targeted-vs-systemic lesson.
//
// No three.js, no React — same (state, input, dt) → same output, so it's unit-testable
// in isolation (delivery.test.ts) just like the integrator.

import type { Vec3 } from './vec';

// The subset of SimConfig the delivery pass reads. Keeping it narrow makes the unit
// tests trivial to set up and documents exactly which knobs shape the ending.
export interface DeliveryConfig {
  releaseRadius: number;
  holdThreshold: number;
  chargeTime: number;
  chargeBleed: number;
  collateralThreshold: number;
}

// A one-shot thing that happened THIS step, for the render/feel layer to react to once
// (bloom on clean delivery, wilt + puff on collateral). The sim never renders — it just
// reports. `pos` is where it happened in world space.
export type DeliveryEvent =
  | { kind: 'delivered'; pos: Vec3 }
  | { kind: 'collateral'; pos: Vec3; dose: number; nearHealthy: boolean };

export interface DeliveryInput {
  charge: number; // current chargeLevel (0..1)
  blobWorld: Vec3; // where the blob is, for siting events
  speed: number; // |v_blob| world units/s — the steadiness gate
  onTarget: boolean; // is the blob within releaseRadius of the tumour?
  nearHealthyWeight: number; // 0..1: how much healthy tissue a dump here would harm (k boost)
  delivered: boolean; // has the clean delivery already happened? (run complete → freeze)
}

export interface DeliveryStep {
  charge: number; // next chargeLevel
  targetDoseAdd: number; // dose delivered cleanly to the tumour this step
  healthyDoseAdd: number; // collateral dose into healthy tissue this step
  delivered: boolean; // clean delivery happened (this or an earlier step)
  event: DeliveryEvent | null; // one-shot event for the render layer
}

const NO_CHANGE = (charge: number, delivered: boolean): DeliveryStep => ({
  charge,
  targetDoseAdd: 0,
  healthyDoseAdd: 0,
  delivered,
  event: null,
});

// One delivery step. Three gates decide what the charge does:
//   • on target + steady → charge climbs; at full it auto-fires a CLEAN delivery.
//   • off target + already hot (> collateralThreshold) → it DUMPS here (collateral).
//   • off target + barely warm → it just bleeds away, no harm done.
//   • on target but moving → frozen: you have to actually hold to charge.
export function stepDelivery(
  input: DeliveryInput,
  cfg: DeliveryConfig,
  dt: number,
): DeliveryStep {
  // The run completes at clean delivery; after that the ending just holds.
  if (input.delivered) return NO_CHANGE(input.charge, true);

  const steady = input.speed < cfg.holdThreshold;

  if (input.onTarget) {
    if (steady) {
      const charge = input.charge + dt / cfg.chargeTime;
      if (charge >= 1) {
        // CLEAN DELIVERY — the one peak. Full dose into the tumour; run complete.
        return {
          charge: 1,
          targetDoseAdd: 1,
          healthyDoseAdd: 0,
          delivered: true,
          event: { kind: 'delivered', pos: input.blobWorld },
        };
      }
      return { charge, targetDoseAdd: 0, healthyDoseAdd: 0, delivered: false, event: null };
    }
    // on the tumour but not holding still: charge freezes. No reward for drifting through.
    return NO_CHANGE(input.charge, false);
  }

  // off the tumour --------------------------------------------------------------
  if (input.charge > cfg.collateralThreshold) {
    // The heat is committed and you're not on target — it goes where you are.
    const dose = input.charge * (1 + input.nearHealthyWeight); // worse atop healthy tissue
    return {
      charge: 0,
      targetDoseAdd: 0,
      healthyDoseAdd: dose,
      delivered: false,
      event: {
        kind: 'collateral',
        pos: input.blobWorld,
        dose,
        nearHealthy: input.nearHealthyWeight > 0.01,
      },
    };
  }
  // too little to matter — it harmlessly cools off.
  return NO_CHANGE(Math.max(0, input.charge - cfg.chargeBleed * dt), false);
}

// The cleanliness score, revealed once on the end card (never a live HUD counter — that
// would turn pedagogy into a score-chase). 1.0 = all dose on target; lower = collateral.
export function cleanliness(targetDose: number, healthyDose: number, k: number): number {
  const denom = targetDose + k * healthyDose;
  return denom > 1e-9 ? targetDose / denom : 0;
}
