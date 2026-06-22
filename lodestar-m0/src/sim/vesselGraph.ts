// The playable space, modelled as a GRAPH from the start so branching is a later
// data change, not a rewrite. M0 ships a single edge; the shape is already correct.

import { catmullRom, catmullRomTangent } from './vec';
import type { Vec3 } from './vec';

export interface VesselNode {
  id: string;
  pos: Vec3;
}

// A stretch of healthy tissue alongside an edge: drift/release here stresses it.
export interface HealthyZone {
  sRange: [number, number];
  tissue: string; // label, e.g. "chest-wall/skin perforator"
}

export interface VesselEdge {
  id: string;
  from: string;
  to: string;
  controlPoints: Vec3[]; // centerline control points (shared with the renderer)
  radiusAt: (s: number) => number; // radius profile along s∈[0,1]; tapering/stenosis
  flowSign: 1 | -1; // direction of blood flow along the curve
  length: number; // approximate arc length, precomputed for s→world scaling
  flowQ: number; // Q (volumetric flow) carried by THIS edge; splits at junctions.
  pulseScale: number; // 0..1 multiplier on systolic amplitude (tapers downstream).
  healthyZones: HealthyZone[]; // tissue that wilts if you release/scrape near it.
  tumour: boolean; // chaotic neovascular bed — the release target lives here.
}

// node id → outgoing/incoming edge ids, precomputed for junction selection.
export interface Adjacency {
  out: string[]; // edges whose `from` is this node (flow leaves the node here)
  in: string[]; // edges whose `to` is this node (flow arrives at the node here)
}

export interface VesselGraph {
  nodes: Record<string, VesselNode>;
  edges: Record<string, VesselEdge>;
  inletEdge: string;
  adjacency: Record<string, Adjacency>;
}

// Build the node→edges adjacency map from the edge list (small graphs; run once).
export function buildAdjacency(
  nodes: Record<string, VesselNode>,
  edges: Record<string, VesselEdge>,
): Record<string, Adjacency> {
  const adj: Record<string, Adjacency> = {};
  for (const id of Object.keys(nodes)) adj[id] = { out: [], in: [] };
  for (const e of Object.values(edges)) {
    adj[e.from]?.out.push(e.id);
    adj[e.to]?.in.push(e.id);
  }
  return adj;
}

export function edgePoint(edge: VesselEdge, s: number): Vec3 {
  return catmullRom(edge.controlPoints, s);
}
export function edgeTangent(edge: VesselEdge, s: number): Vec3 {
  return catmullRomTangent(edge.controlPoints, s);
}

export function approxLength(points: Vec3[], samples = 64): number {
  let total = 0;
  let prev = catmullRom(points, 0);
  for (let i = 1; i <= samples; i++) {
    const p = catmullRom(points, i / samples);
    total += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
    prev = p;
  }
  return total;
}

// M0 scenario: one gently bending vessel that narrows in the middle (a stenosis),
// so the v∝1/r² rush is visible and gives the magnet something to fight.
export function makeM0Graph(): VesselGraph {
  const controlPoints: Vec3[] = [
    { x: -6, y: 0, z: 0 },
    { x: -3, y: 1.2, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 3, y: -1.2, z: 0 },
    { x: 6, y: 0, z: 0 },
  ];

  // radius dips to ~0.55 at the midpoint, back out to ~1.0 at the ends.
  const radiusAt = (s: number) => {
    const base = 1.0;
    const dip = 0.45 * Math.exp(-((s - 0.5) ** 2) / (2 * 0.04));
    return base - dip;
  };

  const edge: VesselEdge = {
    id: 'e0',
    from: 'inlet',
    to: 'outlet',
    controlPoints,
    radiusAt,
    flowSign: 1,
    length: approxLength(controlPoints),
    flowQ: 0.45,
    pulseScale: 1,
    healthyZones: [],
    tumour: false,
  };

  const nodes = {
    inlet: { id: 'inlet', pos: controlPoints[0] },
    outlet: { id: 'outlet', pos: controlPoints[controlPoints.length - 1] },
  };
  const edges = { e0: edge };
  return { nodes, edges, inletEdge: 'e0', adjacency: buildAdjacency(nodes, edges) };
}
