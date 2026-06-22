// ─────────────────────────────────────────────────────────────────────────────
// THE FUN-BAND KNOBS. Everything tunable about how the verb FEELS lives here.
// M0's whole job is to find values in this object that make steering the blob
// against the current satisfying for ~60s. Sweep these; nothing else.
// ─────────────────────────────────────────────────────────────────────────────

export interface SimConfig {
  // --- flow (the current you fight) ---
  inletFlow: number; // Q, abstract µL/s. Higher = stronger current pushing you downstream.
  flowNoise: number; // small lateral jitter so the current feels alive, not rigid.

  // --- pulsatility (the heartbeat you fight in rhythm) ---
  // Q is time-varying: an asymmetric SYSTOLIC SPIKE (fast rise, slow decay), NOT a
  // sine. You make progress in diastole and just survive systole — the skill is
  // timing advances to the gaps between beats. Driven by accumulated SIM time so it
  // stays deterministic/replayable (never wall-clock).
  heartRateHz: number; // beats/s. ~1.1 ≈ 66 bpm.
  pulseAmplitude: number; // A: systolic peak adds A·Q on top of baseline Q.

  // --- radial flow profile (why hugging the wall works) ---
  // Poiseuille: flow is fastest at the lumen centre, ~zero at the wall. wallShelter
  // blends flat(0)→full-Poiseuille(1). The single change that makes "hug the inside
  // wall to dodge the rush" a real tactic instead of dragging a cursor.
  wallShelter: number; // 0..1

  // --- blob ---
  blobRadius: number; // physical radius; also sets how close to the wall you can get.
  mobility: number; // μ = 1/(6πηr). Bigger = the magnet moves the blob more easily.

  // --- magnetic pull ---
  // The TRUE physics: external dipole |B| ∝ 1/d³, gradient force ≈ 1/d⁴. That steep
  // falloff is honest but brutal as a control curve, so we keep the true law for the
  // *visualised* field and apply a separate, reshaped response for what actually moves
  // the blob. controlExponent lets us soften 1/d⁴ toward something playable.
  magnetStrength: number; // k, overall pull gain. The primary authority knob.
  controlExponent: number; // effective falloff exponent for FEEL (true physics ≈ 4).
  controlDeadzone: number; // distance under which pull is capped (prevents snap-to-finger).
  maxPull: number; // clamp on pull magnitude (keeps it from overwhelming everything).
  grabTau: number; // s. one-pole lag on APPLIED pull — authority ramps in (~120ms) so
  // the magnet CATCHES the blob instead of teleporting it. The "grab".

  // --- integration ---
  fixedDt: number; // logical timestep (s). 1/120 = 120 Hz logical rate.
}

export const DEFAULT_CONFIG: SimConfig = {
  inletFlow: 0.45, // up from 0.35: the current should genuinely contest the pull.
  flowNoise: 0.015,

  heartRateHz: 1.1, // ~66 bpm.
  pulseAmplitude: 0.6, // systole peaks at 1.6× baseline Q.
  wallShelter: 0.85, // near-full Poiseuille — the wall is a real haven.

  blobRadius: 0.18,
  mobility: 1.0,

  // Authority rebalanced toward a 1.3–1.6× control margin at the stenosis centre
  // during systole: the magnet can win, but at the worst instant it costs nearly all
  // your pull AND perfect placement. Everywhere else you have margin. That ratio is
  // the whole game. Final fun-band values come from the in-hand Gate-0 sweep.
  magnetStrength: 0.9,
  controlExponent: 2.6, // steeper than 2.2: pull is LOCAL — no parking far and coasting.
  controlDeadzone: 0.35, // smaller: kill the dead band where the blob glues to the cursor.
  maxPull: 1.5,
  grabTau: 0.12,

  fixedDt: 1 / 120,
};
