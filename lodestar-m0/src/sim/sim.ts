// The public sim surface: a pure, deterministic `step(state, input, dt-via-cfg)`.
// React/render never reach inside this — they hand it input and read the result.

import { DEFAULT_CONFIG } from './config';
import type { SimConfig } from './config';
import { makeBlob } from './blob';
import type { Blob } from './blob';
import type { Field } from './field';
import { makeM0Graph, edgePoint } from './vesselGraph';
import type { VesselGraph } from './vesselGraph';
import { integrate } from './integrator';
import type { StepResult } from './integrator';
import { mulberry32 } from './vec';
import type { Vec3 } from './vec';

export interface SimState {
  graph: VesselGraph;
  blob: Blob;
  cfg: SimConfig;
  rngState: number; // advanced each step so noise is deterministic & replayable
  // cached read-model for renderer/HUD (updated every step)
  blobWorld: Vec3;
  flowSpeed: number;
  upstreamProgress: number;
}

export interface SimInput {
  magnetPos: Vec3; // where the player is pulling toward (already offset-corrected)
}

export function makeSimState(cfg: SimConfig = DEFAULT_CONFIG, seed = 1): SimState {
  const graph = makeM0Graph();
  const blob = makeBlob(graph.inletEdge);
  return {
    graph,
    blob,
    cfg,
    rngState: seed >>> 0,
    blobWorld: edgePoint(graph.edges[graph.inletEdge], blob.s),
    flowSpeed: 0,
    upstreamProgress: 0,
  };
}

// One fixed logical step. Mutates nothing passed in beyond returning a new state-ish
// object; callers replace their reference. (We keep graph/cfg by reference — they're
// immutable during a run.)
export function step(state: SimState, input: SimInput): SimState {
  // derive a fresh deterministic RNG seeded from the running state so the same
  // input sequence always reproduces the same trajectory.
  const seed = (state.rngState + 0x9e3779b9) >>> 0;
  const rand = mulberry32(seed);

  const field: Field = { magnetPos: input.magnetPos };
  const res: StepResult = integrate(state.graph, state.blob, field, state.cfg, rand);

  return {
    ...state,
    blob: res.blob,
    rngState: seed,
    blobWorld: res.blobWorld,
    flowSpeed: res.flowSpeed,
    upstreamProgress: res.upstreamProgress,
  };
}

// Run N steps with a constant input — handy for tests and headless tuning sweeps.
export function run(state: SimState, input: SimInput, steps: number): SimState {
  let s = state;
  for (let i = 0; i < steps; i++) s = step(s, input);
  return s;
}
