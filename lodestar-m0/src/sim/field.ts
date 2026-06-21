// The player-controlled external magnet. It lives OUTSIDE the vessel and pulls the
// blob UP the field-magnitude gradient (toward the magnet).
//
// Two layers, on purpose (see config.ts):
//   • trueFieldFalloff  — honest physics, |B| ∝ 1/d³ ⇒ force ≈ 1/d⁴. Used for the
//     VISUALISED field strength so the science on screen stays correct.
//   • controlPull       — a clamped, reshaped response used for what actually MOVES
//     the blob, so the control feels crisp instead of all-or-nothing.

import type { SimConfig } from './config';
import { sub, norm, dist, scale } from './vec';
import type { Vec3 } from './vec';

export interface Field {
  magnetPos: Vec3; // world position of the external magnet
}

// True dipole-gradient magnitude at distance d (for field-line / halo viz only).
export function trueFieldFalloff(d: number): number {
  const dd = Math.max(d, 1e-3);
  return 1 / (dd * dd * dd * dd); // ≈ 1/d⁴
}

// The force vector that actually moves the blob. Direction = up the gradient
// (toward the magnet). Magnitude = reshaped falloff, deadzoned and clamped.
export function controlPull(field: Field, blobWorld: Vec3, cfg: SimConfig): Vec3 {
  const toMagnet = sub(field.magnetPos, blobWorld);
  const d = dist(field.magnetPos, blobWorld);
  if (d < 1e-4) return { x: 0, y: 0, z: 0 };

  const dEff = Math.max(d, cfg.controlDeadzone);
  let mag = cfg.magnetStrength / Math.pow(dEff, cfg.controlExponent);
  mag = Math.min(mag, cfg.maxPull);

  return scale(norm(toMagnet), mag);
}
