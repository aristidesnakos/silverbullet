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
import { stepDelivery } from './delivery';
import type { DeliveryEvent } from './delivery';
import { mulberry32, dist, len } from './vec';
import type { Vec3 } from './vec';

// Where (and what) the run is trying to deliver to. Mirrors Scenario.target; the sim
// holds it so the delivery pass has a goal. Optional — the bare M0 graph has none, and
// without a target the ending logic stays inert (keeps the old trajectory tests valid).
export interface ReleaseTarget {
  edgeId: string;
  s: number;
  kind: 'tumour';
}

export interface SimState {
  graph: VesselGraph;
  blob: Blob;
  cfg: SimConfig;
  rngState: number; // advanced each step so noise is deterministic & replayable
  tSec: number; // accumulated SIM time — drives the heartbeat. Never wall-clock (determinism).
  // cached read-model for renderer/HUD (updated every step)
  blobWorld: Vec3;
  flowSpeed: number;
  upstreamProgress: number;
  velEma: Vec3; // smoothed blob velocity; its magnitude is the steadiness gate (not jitter)
  // --- the ending (see sim/delivery.ts) ---
  target?: ReleaseTarget;
  targetWorld?: Vec3; // precomputed world position of the target (proximity gate)
  targetDose: number; // clean dose delivered to the tumour
  healthyDose: number; // collateral dose into healthy tissue
  delivered: boolean; // clean delivery happened → run complete
  lastEvent: DeliveryEvent | null; // one-shot delivery event; pair with eventSeq to edge-trigger
  eventSeq: number; // increments each time lastEvent is set, so the renderer fires it once
}

export interface SimInput {
  magnetPos: Vec3; // where the player is pulling toward (already offset-corrected)
}

export function makeSimState(
  cfg: SimConfig = DEFAULT_CONFIG,
  graph: VesselGraph = makeM0Graph(),
  seed = 1,
  target?: ReleaseTarget,
): SimState {
  const blob = makeBlob(graph.inletEdge);
  const targetWorld =
    target && graph.edges[target.edgeId]
      ? edgePoint(graph.edges[target.edgeId], target.s)
      : undefined;
  return {
    graph,
    blob,
    cfg,
    rngState: seed >>> 0,
    tSec: 0,
    blobWorld: edgePoint(graph.edges[graph.inletEdge], blob.s),
    flowSpeed: 0,
    upstreamProgress: 0,
    velEma: { x: 0, y: 0, z: 0 },
    target,
    targetWorld,
    targetDose: 0,
    healthyDose: 0,
    delivered: false,
    lastEvent: null,
    eventSeq: 0,
  };
}

// How much healthy tissue a collateral dump at (edge, s) would harm, 0..1. Releasing
// right over a healthy-tissue sleeve is worse than into a bare vessel (boosts k).
function healthyExposure(graph: VesselGraph, edgeId: string, s: number): number {
  const edge = graph.edges[edgeId];
  if (!edge) return 0;
  for (const z of edge.healthyZones) {
    if (s >= z.sRange[0] && s <= z.sRange[1]) return 1;
  }
  return 0;
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
  const res: StepResult = integrate(state.graph, state.blob, field, state.cfg, state.tSec, rand);

  // Smooth the velocity for the steadiness gate: vibrating in place under a tight magnet
  // has high instantaneous speed but ~zero net drift, and a player reads that as "held".
  // An EMA cancels the symmetric jitter and keeps real travel — so the gate measures drift.
  const a = 1 - Math.exp(-state.cfg.fixedDt / state.cfg.steadyTau);
  const velEma: Vec3 = {
    x: state.velEma.x + (res.blobVel.x - state.velEma.x) * a,
    y: state.velEma.y + (res.blobVel.y - state.velEma.y) * a,
    z: state.velEma.z + (res.blobVel.z - state.velEma.z) * a,
  };

  // --- the ending: charge / clean-release / collateral (inert without a target) ---
  let blob = res.blob;
  let { targetDose, healthyDose, delivered, lastEvent, eventSeq } = state;
  if (state.target && state.targetWorld) {
    const onTarget = dist(res.blobWorld, state.targetWorld) < state.cfg.releaseRadius;
    const del = stepDelivery(
      {
        charge: blob.chargeLevel,
        blobWorld: res.blobWorld,
        speed: len(velEma),
        onTarget,
        nearHealthyWeight: healthyExposure(state.graph, blob.edgeId, blob.s),
        delivered,
      },
      state.cfg,
      state.cfg.fixedDt,
    );
    blob = { ...blob, chargeLevel: del.charge };
    targetDose += del.targetDoseAdd;
    healthyDose += del.healthyDoseAdd;
    delivered = del.delivered;
    if (del.event) {
      lastEvent = del.event;
      eventSeq += 1;
    }
  }

  return {
    ...state,
    blob,
    rngState: seed,
    tSec: state.tSec + state.cfg.fixedDt,
    blobWorld: res.blobWorld,
    flowSpeed: res.flowSpeed,
    upstreamProgress: res.upstreamProgress,
    velEma,
    targetDose,
    healthyDose,
    delivered,
    lastEvent,
    eventSeq,
  };
}

// Run N steps with a constant input — handy for tests and headless tuning sweeps.
export function run(state: SimState, input: SimInput, steps: number): SimState {
  let s = state;
  for (let i = 0; i < steps; i++) s = step(s, input);
  return s;
}
