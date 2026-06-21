// Blood flow: a cheap 1-D scalar per edge, NOT a fluid sim.
// Incompressible continuity in a tube: Q = A·v, A = πr², so v ∝ 1/r².
// Narrow vessels rush faster — free tension and physically true.

import type { SimConfig } from './config';
import type { VesselEdge } from './vesselGraph';

export function flowSpeedAt(edge: VesselEdge, s: number, cfg: SimConfig): number {
  const r = edge.radiusAt(s);
  const area = Math.PI * r * r;
  // v = Q / A. flowSign points the current along (or against) increasing s.
  return (edge.flowSign * cfg.inletFlow) / area;
}
