// Tiny pure vector helpers. No three.js — the sim must not import a renderer.
// The render layer builds its own three.Vector3s from the same numbers.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Vec2 {
  x: number;
  y: number;
}

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: Vec3, s: number): Vec3 => v3(a.x * s, a.y * s, a.z * s);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a: Vec3): number => Math.sqrt(dot(a, a));
export const dist = (a: Vec3, b: Vec3): number => len(sub(a, b));
export const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return l > 1e-9 ? scale(a, 1 / l) : v3(0, 0, 0);
};

// Catmull-Rom spline through control points, sampled at u ∈ [0,1] over the whole
// chain. Matches three.CatmullRomCurve3 closely enough for a shared centerline.
export function catmullRom(points: Vec3[], u: number): Vec3 {
  const n = points.length - 1;
  const t = Math.max(0, Math.min(1, u)) * n;
  const i = Math.min(Math.floor(t), n - 1);
  const f = t - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n, i + 2)];
  const f2 = f * f;
  const f3 = f2 * f;
  const comp = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f2 + (-a + 3 * b - 3 * c + d) * f3);
  return v3(
    comp(p0.x, p1.x, p2.x, p3.x),
    comp(p0.y, p1.y, p2.y, p3.y),
    comp(p0.z, p1.z, p2.z, p3.z),
  );
}

// Unit tangent at u via a small finite difference along the spline.
export function catmullRomTangent(points: Vec3[], u: number): Vec3 {
  const h = 1e-3;
  const a = catmullRom(points, Math.min(1, u + h));
  const b = catmullRom(points, Math.max(0, u - h));
  return norm(sub(a, b));
}

// Deterministic, seedable pseudo-random (mulberry32) — no Math.random in the sim,
// so trajectories are replayable and unit-testable.
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
