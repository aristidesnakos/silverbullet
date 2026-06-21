// ─────────────────────────────────────────────────────────────────────────────
// THE FUN-BAND KNOBS. Everything tunable about how the verb FEELS lives here.
// M0's whole job is to find values in this object that make steering the blob
// against the current satisfying for ~60s. Sweep these; nothing else.
// ─────────────────────────────────────────────────────────────────────────────

export interface SimConfig {
  // --- flow (the current you fight) ---
  inletFlow: number; // Q, abstract µL/s. Higher = stronger current pushing you downstream.
  flowNoise: number; // small lateral jitter so the current feels alive, not rigid.

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

  // --- integration ---
  fixedDt: number; // logical timestep (s). 1/120 = 120 Hz logical rate.
}

export const DEFAULT_CONFIG: SimConfig = {
  inletFlow: 0.35,
  flowNoise: 0.015,

  blobRadius: 0.18,
  mobility: 1.0,

  magnetStrength: 0.9,
  controlExponent: 2.2, // softened from the true ~4 — start here, sweep up/down for feel.
  controlDeadzone: 0.6,
  maxPull: 1.6,

  fixedDt: 1 / 120,
};
