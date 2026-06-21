// The bridge's shared mutable state. The sim lives here, OUTSIDE React — the render
// loop reads/writes it every frame via refs; React only subscribes to the low-freq
// HUD store. This is the one rule that keeps a particle game at 60fps: no setState
// in the hot loop.

import { create } from 'zustand';
import { makeSimState } from '../sim/sim';
import type { SimState } from '../sim/sim';
import { DEFAULT_CONFIG } from '../sim/config';
import type { Vec3 } from '../sim/vec';

export interface Engine {
  sim: SimState;
  // player input, written by MagnetControl, read by the loop:
  magnetPos: Vec3; // already offset-corrected (leads ahead of the finger)
  magnetActive: boolean;
}

// module singleton — deliberately not in React state.
export const engine: Engine = {
  sim: makeSimState(DEFAULT_CONFIG),
  magnetPos: { x: -8, y: 0, z: 0 },
  magnetActive: false,
};

export function resetEngine() {
  engine.sim = makeSimState(DEFAULT_CONFIG);
  engine.magnetActive = false;
}

// Low-frequency read model for the HUD. The loop pushes to this ~10x/s, NOT 120x/s.
interface HudState {
  upstreamProgress: number; // -1 losing .. +1 beating the current
  flowSpeed: number;
  s: number; // progress along the vessel
  push: (p: Partial<HudState>) => void;
}

export const useHud = create<HudState>((set) => ({
  upstreamProgress: 0,
  flowSpeed: 0,
  s: 0,
  push: (p) => set(p),
}));
