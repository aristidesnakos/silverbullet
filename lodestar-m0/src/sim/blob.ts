// The blob's state lives in vessel-space, not world-space: (edge, s, offset).
// This is the decoupling that lets the same sim run under a greybox tube or a
// beautified vessel without touching the physics.

import type { Vec2 } from './vec';

export interface Blob {
  edgeId: string;
  s: number; // 0..1 along the current edge's centerline
  offset: Vec2; // radial position within the cross-section (clamped to radius)
  pullMag: number; // applied magnet-pull magnitude, lagged toward target (the "grab")
  chargeLevel: number; // 0..1 accumulated drug "heat"; full → auto-fire. See sim/delivery.ts.
}

export function makeBlob(edgeId: string, s = 0.08): Blob {
  return { edgeId, s, offset: { x: 0, y: 0 }, pullMag: 0, chargeLevel: 0 };
}
