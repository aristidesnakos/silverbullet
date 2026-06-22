// A Scenario is the playable level as PURE DATA (JSON-serialisable): nodes, edges,
// the target, healthy zones. `compileScenario` turns that data into the runtime
// VesselGraph (radius closures, arc lengths, adjacency). Adding stroke/infection
// later is authoring a new spec, not engineering — the roadmap's promise.

import { approxLength, buildAdjacency } from './vesselGraph';
import type { HealthyZone, VesselEdge, VesselGraph, VesselNode } from './vesselGraph';
import type { Vec3 } from './vec';

// --- the data shapes (no functions — serialisable) ---

export interface RadiusSpec {
  base: number;
  taperTo?: number; // if set, radius lerps base→taperTo across s∈[0,1]
  stenosis?: { at: number; depth: number; width: number }; // a local narrowing
  wobbleAmp?: number; // caliber wobble (the tumour bed's chaotic neovasculature)
  wobbleFreq?: number; // wobbles per unit s
}

export interface EdgeSpec {
  id: string;
  from: string;
  to: string;
  points: [number, number, number][]; // centerline control points
  radius: RadiusSpec;
  flowQ: number; // volumetric flow this edge carries
  pulseScale?: number; // default 1
  flowSign?: 1 | -1; // default 1
  healthyZones?: HealthyZone[];
  tumour?: boolean;
}

export interface ScenarioSpec {
  nodes: { id: string; pos: [number, number, number] }[];
  edges: EdgeSpec[];
  startEdge: string;
  target: { edgeId: string; s: number; kind: 'tumour' };
  payloadLabel: string;
}

export interface Scenario {
  graph: VesselGraph;
  startEdge: string;
  target: { edgeId: string; s: number; kind: 'tumour' };
  payloadLabel: string;
}

// --- the compiler ---

const MIN_RADIUS = 0.08;

function compileRadius(spec: RadiusSpec): (s: number) => number {
  return (s: number) => {
    let r = spec.taperTo != null ? spec.base + (spec.taperTo - spec.base) * s : spec.base;
    if (spec.stenosis) {
      const { at, depth, width } = spec.stenosis;
      r -= depth * Math.exp(-((s - at) ** 2) / (2 * width * width));
    }
    if (spec.wobbleAmp) {
      r += spec.wobbleAmp * Math.sin(s * (spec.wobbleFreq ?? 4) * Math.PI * 2);
    }
    return Math.max(MIN_RADIUS, r);
  };
}

export function compileScenario(spec: ScenarioSpec): Scenario {
  const nodes: Record<string, VesselNode> = {};
  for (const n of spec.nodes) {
    nodes[n.id] = { id: n.id, pos: { x: n.pos[0], y: n.pos[1], z: n.pos[2] } };
  }

  const edges: Record<string, VesselEdge> = {};
  for (const e of spec.edges) {
    const controlPoints: Vec3[] = e.points.map((p) => ({ x: p[0], y: p[1], z: p[2] }));
    edges[e.id] = {
      id: e.id,
      from: e.from,
      to: e.to,
      controlPoints,
      radiusAt: compileRadius(e.radius),
      flowSign: e.flowSign ?? 1,
      length: approxLength(controlPoints),
      flowQ: e.flowQ,
      pulseScale: e.pulseScale ?? 1,
      healthyZones: e.healthyZones ?? [],
      tumour: e.tumour ?? false,
    };
  }

  const graph: VesselGraph = {
    nodes,
    edges,
    inletEdge: spec.startEdge,
    adjacency: buildAdjacency(nodes, edges),
  };
  return { graph, startEdge: spec.startEdge, target: spec.target, payloadLabel: spec.payloadLabel };
}
