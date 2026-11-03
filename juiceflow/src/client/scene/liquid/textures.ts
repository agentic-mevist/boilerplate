/**
 * Parameters for the juice's procedural textures. The textures themselves are
 * rendered once on the GPU (see `generator` shaders); this module builds the
 * wave tables and the normalization constants, which only need a coarse CPU
 * sample.
 *
 * The surface is a sum of "exponential sine" waves: sharper crests than plain
 * sines, as in real water. Every wave has an integer number of cycles per tile,
 * so the texture repeats seamlessly. Caustics come from the same surface: where
 * its curvature focuses light onto the bed (the Jacobian of the refraction map
 * goes to zero), the bed lights up in bright lines.
 */

const TAU = Math.PI * 2;

export const RIPPLE_WAVES = 34;
export const PATCH_WAVES = 10;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Random waves with integer wave numbers between kMin and kMax cycles per tile: [kx, ky, amplitude, phase] × count. */
function waves(r: () => number, count: number, kMin: number, kMax: number, falloff: number): Float32Array {
  const out = new Float32Array(count * 4);
  let n = 0;
  while (n < count) {
    const kx = Math.round((r() * 2 - 1) * kMax);
    const ky = Math.round((r() * 2 - 1) * kMax);
    const m = Math.hypot(kx, ky);
    if (m < kMin || m > kMax) continue;
    out.set([kx, ky, Math.pow(m, -falloff), r() * TAU], n * 4);
    n++;
  }
  return out;
}

export interface FieldSample {
  h: number;
  gx: number;
  gy: number;
  hxx: number;
  hxy: number;
  hyy: number;
}

/** Height, slope and curvature of the ripple surface at (u, v) in tile units. Mirrors the GLSL generator. */
export function sampleField(w: Float32Array, u: number, v: number): FieldSample {
  const f: FieldSample = { h: 0, gx: 0, gy: 0, hxx: 0, hxy: 0, hyy: 0 };
  for (let i = 0; i < w.length; i += 4) {
    const kx = TAU * w[i]!, ky = TAU * w[i + 1]!;
    const th = kx * u + ky * v + w[i + 3]!;
    const s = Math.sin(th), c = Math.cos(th);
    const e = w[i + 2]! * Math.exp(s - 1);
    const d2 = e * (c * c - s);
    f.h += e;
    f.gx += e * c * kx;
    f.gy += e * c * ky;
    f.hxx += d2 * kx * kx;
    f.hxy += d2 * kx * ky;
    f.hyy += d2 * ky * ky;
  }
  return f;
}

export interface RippleStats {
  hMin: number;
  hMax: number;
  /** Slope that maps to ±1 in the texture. */
  gMax: number;
  /** Depth of the bed for the caustics, in tile units. */
  depth: number;
  /** Caustic intensity range mapped to 0..1. */
  cLo: number;
  cHi: number;
}

const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))]!;

export function causticOf(f: FieldSample, depth: number): number {
  const det = (1 + depth * f.hxx) * (1 + depth * f.hyy) - depth * depth * f.hxy * f.hxy;
  return 1 / Math.max(Math.abs(det), 0.08);
}

export function rippleStats(w: Float32Array, grid = 48): RippleStats {
  const samples: FieldSample[] = [];
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) samples.push(sampleField(w, (x + 0.37) / grid, (y + 0.61) / grid));
  const hs = samples.map((s) => s.h).sort((a, b) => a - b);
  const gs = samples.map((s) => Math.max(Math.abs(s.gx), Math.abs(s.gy))).sort((a, b) => a - b);
  // focusing curvature: the most negative eigenvalue of the Hessian (crests)
  const curv = samples
    .map((s) => {
      const tr = (s.hxx + s.hyy) / 2, q = Math.sqrt(((s.hxx - s.hyy) / 2) ** 2 + s.hxy ** 2);
      return Math.max(0, -(tr - q));
    })
    .sort((a, b) => a - b);
  const depth = 1.08 / Math.max(1e-6, pct(curv, 0.9));
  const cs = samples.map((s) => causticOf(s, depth)).sort((a, b) => a - b);
  return { hMin: hs[0]!, hMax: hs[hs.length - 1]!, gMax: pct(gs, 0.995), depth, cLo: pct(cs, 0.45), cHi: pct(cs, 0.985) };
}

export interface WaveTable {
  ripple: Float32Array;
  patch: Float32Array;
  stats: RippleStats;
}

let cached: WaveTable | null = null;

export function waveTable(): WaveTable {
  if (cached) return cached;
  const r = rng(11);
  const ripple = waves(r, RIPPLE_WAVES, 2.2, 15, 1.3);
  const patch = waves(r, PATCH_WAVES, 1, 3.2, 0.6);
  cached = { ripple, patch, stats: rippleStats(ripple) };
  return cached;
}
