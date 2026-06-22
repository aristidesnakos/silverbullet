// Blood flow: a cheap 1-D scalar per edge, NOT a fluid sim.
// Incompressible continuity in a tube: Q = A·v, A = πr², so v ∝ 1/r².
// Narrow vessels rush faster — free tension and physically true.
//
// Two feel layers ride on top of that mean flow (see config.ts):
//   • PULSATILITY — Q varies in time as an asymmetric systolic spike. You advance in
//     diastole and survive systole; the skill is reading the rhythm.
//   • RADIAL PROFILE — Poiseuille: fast at the centre, ~zero at the wall. This is what
//     makes "hug the inside wall to dodge the rush" a real tactic.

import type { SimConfig } from './config';
import type { VesselEdge } from './vesselGraph';

// Time multiplier on Q: 1 in diastole, up to (1 + A·scale) at the systolic peak.
// Asymmetric — a fast rise and slower decay, not a sine — so it reads as a heartbeat.
// `scale` tapers the throb downstream (trunk pounds, tumour bed barely pulses).
export function pulseFactor(tSec: number, cfg: SimConfig, scale = 1): number {
  const phase = (tSec * cfg.heartRateHz) % 1; // 0..1 within the current beat
  // gaussian spike centred just after the beat start; sharp rise, softer tail.
  const spike = Math.exp(-Math.pow((phase - 0.12) / 0.09, 2));
  return 1 + cfg.pulseAmplitude * scale * spike;
}

// Radial multiplier on the mean speed. rhoFrac = |offset|/radius ∈ [0,1].
// Full Poiseuille is 2·(1−rhoFrac²): 2× at the centre, 0 at the wall, mean 1 (flux
// conserved). wallShelter blends from flat (1 everywhere) to that profile.
export function radialFactor(rhoFrac: number, cfg: SimConfig): number {
  const f = Math.max(0, Math.min(1, rhoFrac));
  const poiseuille = 2 * (1 - f * f);
  return 1 + cfg.wallShelter * (poiseuille - 1);
}

// Signed along-edge flow speed felt by the blob at (s, radial position, time).
// flowSign points the current along (or against) increasing s.
export function flowSpeedAt(
  edge: VesselEdge,
  s: number,
  rhoFrac: number,
  tSec: number,
  cfg: SimConfig,
): number {
  const r = edge.radiusAt(s);
  const area = Math.PI * r * r;
  const mean = (edge.flowSign * edge.flowQ) / area; // v = Q/A, Q is per-edge
  return mean * pulseFactor(tSec, cfg, edge.pulseScale) * radialFactor(rhoFrac, cfg);
}
