/**
 * Turns a JuiceResult into geometry: where each key-cap sits and the path its
 * stream follows into the hub. Everything here is in a local 2D frame on the
 * ground plane (x, z) with the hub at the origin; in "funnel" mode juice flows
 * along +x (sources on the left, outputs on the right, like a Sankey diagram).
 */
import type { Health, JuiceResult, JuiceSource } from "../../shared/model";

export type LayoutMode = "funnel" | "vortex";

export const SAMPLES = 64;
export const HUB_RADIUS = 2.6;

export interface KeyNode {
  id: string;
  source: JuiceSource;
  kind: "main" | "tail" | "lost";
  x: number;
  z: number;
  size: number;
  /** 0 = fully visible, 1 = blended into the background. */
  fade: number;
  /** Rotation around the vertical axis. */
  rot: number;
  /** Index of the stream path in `paths` (or -1). */
  path: number;
}

export interface StreamPath {
  id: string;
  key: number;
  /** Uniform arc-length samples, SAMPLES long. */
  points: Float32Array;
  length: number;
  halfWidth: number;
  /** 0..1 visual strength (sqrt of share relative to the strongest stream). */
  strength: number;
  health: Health;
  kind: "main" | "tail" | "lost";
  /** Seconds after reveal starts when this stream begins to flow. */
  delay: number;
  fade: number;
}

export interface OutputSlot {
  x: number;
  z: number;
}

export interface Layout {
  mode: LayoutMode;
  keys: KeyNode[];
  paths: StreamPath[];
  outputs: OutputSlot[];
  outputLine: Float32Array | null;
  /** Approximate extent of the scene in local units, used to frame the camera. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const MAIN_KEYS = 28;
const TAIL_KEYS = 30;
const LOST_KEYS = 12;

/** Deterministic jitter in [-1, 1] so layouts look hand-placed but stay stable. */
const jitter = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

const DEG = Math.PI / 180;

function resample(dense: [number, number][]): { points: Float32Array; length: number } {
  const cum = [0];
  for (let i = 1; i < dense.length; i++) {
    const [x0, z0] = dense[i - 1]!;
    const [x1, z1] = dense[i]!;
    cum.push(cum[i - 1]! + Math.hypot(x1 - x0, z1 - z0));
  }
  const total = cum[cum.length - 1]!;
  const out = new Float32Array(SAMPLES * 2);
  let j = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const s = (i / (SAMPLES - 1)) * total;
    while (j < cum.length - 2 && cum[j + 1]! < s) j++;
    const seg = cum[j + 1]! - cum[j]! || 1;
    const f = Math.min(1, Math.max(0, (s - cum[j]!) / seg));
    const [x0, z0] = dense[j]!;
    const [x1, z1] = dense[j + 1]!;
    out[i * 2] = x0 + (x1 - x0) * f;
    out[i * 2 + 1] = z0 + (z1 - z0) * f;
  }
  return { points: out, length: total };
}

function bezier(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], n = 120): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    pts.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return pts;
}

/** Visual half-width of a stream from its share of the juice. */
export function halfWidthFor(share: number, maxShare: number): number {
  if (!(share > 0) || !(maxShare > 0)) return 0.03;
  const s = Math.sqrt(share / maxShare);
  return 0.05 + 1.0 * s;
}

/** Spread order for slots: center first, then alternating outward (0, +1, -1, +2, -2, ...). */
function centerOut(n: number): number[] {
  const mid = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
}

interface Slot {
  x: number;
  z: number;
  angle: number;
  r: number;
}

/** Slots on arcs to the left of the hub (angles measured from -x, positive toward +z). */
function fanSlots(radii: number[], spread: number, spacing: number[]): Slot[][] {
  return radii.map((r, ri) => {
    const arc = 2 * spread * r;
    const n = Math.max(1, Math.floor(arc / spacing[ri]!));
    const step = (2 * spread) / n;
    const shift = ri % 2 ? 0.25 : -0.25; // stagger rings so outer streams pass between inner keys
    const slots: Slot[] = [];
    for (let i = 0; i < n; i++) {
      const a = -spread + step * (i + 0.5 + shift);
      slots.push({ angle: a, r, x: -r * Math.cos(a), z: r * Math.sin(a) });
    }
    return centerOut(slots.length).map((i) => slots[i]!);
  });
}

/** Chartbrew-style path: leave the key heading right, then curve into the hub at `entry` (polar angle on the hub rim). */
function funnelPath(x: number, z: number, entry: number): [number, number][] {
  const ex = HUB_RADIUS * Math.cos(entry);
  const ez = HUB_RADIUS * Math.sin(entry);
  const dirIn: [number, number] = [-Math.cos(entry), -Math.sin(entry)];
  const dist = Math.hypot(x - ex, z - ez);
  const p1: [number, number] = [x + dist * 0.42, z];
  const p2: [number, number] = [ex - dirIn[0] * dist * 0.38, ez - dirIn[1] * dist * 0.38];
  return bezier([x, z], p1, p2, [ex, ez]);
}

/** Main fan: compress the slot angle into the hub's left rim so streams converge like rivers into a lake. */
const fanEntry = (angle: number, spread: number) => Math.PI - (angle / spread) * 80 * DEG;

function vortexPath(r0: number, a0: number, swirl: number): [number, number][] {
  const pts: [number, number][] = [];
  const n = 140;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const e = Math.pow(t, 1.08);
    const r = r0 + (HUB_RADIUS - r0) * e;
    const a = a0 + swirl * (r0 - r);
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}

export function computeLayout(result: JuiceResult, mode: LayoutMode, showLost: boolean): Layout {
  const sources = result.sources;
  const maxShare = sources[0]?.share ?? 0;
  const keys: KeyNode[] = [];
  const paths: StreamPath[] = [];

  const main = sources.slice(0, MAIN_KEYS);
  const tail = sources.slice(MAIN_KEYS, MAIN_KEYS + TAIL_KEYS);
  const lost = showLost ? result.lost.slice(0, LOST_KEYS) : [];

  const keySize = (s: JuiceSource, base: number, span: number) => base + span * Math.min(1, Math.max(0, s.factors.dr / 100));

  const addPath = (key: KeyNode, dense: [number, number][], src: JuiceSource, kind: StreamPath["kind"], delay: number) => {
    const { points, length } = resample(dense);
    const share = kind === "lost" ? 0 : src.share;
    const strength = maxShare > 0 ? Math.sqrt(Math.max(0, share) / maxShare) : 0;
    paths.push({
      id: key.id,
      key: keys.length - 1,
      points,
      length,
      halfWidth: kind === "lost" ? 0.03 : halfWidthFor(share, maxShare),
      strength,
      health: src.health,
      kind,
      delay,
      fade: key.fade,
    });
    key.path = paths.length - 1;
  };

  let outputs: OutputSlot[] = [];
  let outputLine: Float32Array | null = null;

  if (mode === "funnel") {
    const spread = 62 * DEG;
    const mainRings = fanSlots([6.0, 8.5, 11.0, 13.5], spread, [2.3, 2.3, 2.25, 2.2]);
    const tailRings = fanSlots([15.9, 17.9], spread * 1.03, [1.5, 1.5]);
    const take = (rings: Slot[][], n: number) => {
      const out: (Slot & { ring: number })[] = [];
      rings.forEach((ring, ri) => ring.forEach((sl) => out.length < n && out.push({ ...sl, ring: ri })));
      return out;
    };
    const mainSlots = take(mainRings, main.length);
    const tailSlots = take(tailRings, tail.length);

    main.forEach((s, i) => {
      const sl = mainSlots[i]!;
      const r = sl.r + jitter(i, 1) * 0.3;
      const a = sl.angle + jitter(i, 2) * 0.035;
      const x = -r * Math.cos(a), z = r * Math.sin(a);
      const size = keySize(s, 1.0, 0.6) * (sl.ring >= 3 ? 0.88 : 1);
      keys.push({ id: s.id, source: s, kind: "main", x, z, size, fade: 0, rot: 0, path: -1 });
      addPath(keys[keys.length - 1]!, funnelPath(x, z, fanEntry(a, spread)), s, "main", 0.15 + i * 0.06);
    });
    tail.forEach((s, i) => {
      const sl = tailSlots[i];
      if (!sl) return;
      const r = sl.r + jitter(i, 3) * 0.7;
      const a = sl.angle + jitter(i, 4) * 0.04;
      const x = -r * Math.cos(a), z = r * Math.sin(a);
      const fade = 0.35 + sl.ring * 0.22 + Math.abs(a / spread) * 0.12;
      keys.push({ id: s.id, source: s, kind: "tail", x, z, size: 0.62 + 0.25 * (s.factors.dr / 100), fade, rot: 0, path: -1 });
      addPath(keys[keys.length - 1]!, funnelPath(x, z, fanEntry(a, spread * 1.03)), s, "tail", 1.8 + i * 0.02);
    });
    // Lost links sit out on the flanks, beyond the fan.
    lost.forEach((s, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const row = Math.floor(i / 2);
      const a = side * (spread + (10 + (row % 2) * 7) * DEG);
      const r = 7.2 + row * 1.9;
      const x = -r * Math.cos(a), z = r * Math.sin(a);
      keys.push({ id: `lost:${s.id}`, source: s, kind: "lost", x, z, size: 0.9, fade: 0.2, rot: 0, path: -1 });
      addPath(keys[keys.length - 1]!, funnelPath(x, z, Math.PI - side * (86 + row * 3) * DEG), s, "lost", 0.8 + i * 0.05);
    });

    outputs = [{ x: 6.6, z: 0 }, { x: 11.4, z: 0 }, { x: 16.2, z: 0 }];
    const line: [number, number][] = [];
    for (let i = 0; i <= 40; i++) line.push([HUB_RADIUS + (19.5 - HUB_RADIUS) * (i / 40), 0]);
    outputLine = resample(line).points;
  } else {
    // Vortex: rings all around the hub, strongest sources spread evenly by the golden angle.
    const ringDefs = [
      { r: 6.3, n: 8 },
      { r: 9.0, n: 12 },
      { r: 11.7, n: 16 },
    ];
    const tailRingDefs = [
      { r: 14.3, n: 26 },
      { r: 16.3, n: 30 },
    ];
    const swirl = 0.085;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const placeRing = (list: JuiceSource[], defs: { r: number; n: number }[], kind: "main" | "tail", startDelay: number) => {
      let idx = 0;
      defs.forEach((def, ri) => {
        const count = Math.min(def.n, list.length - idx);
        if (count <= 0) return;
        const used = new Set<number>();
        for (let k = 0; k < count; k++) {
          const s = list[idx + k]!;
          let slot = Math.floor(((k * golden) / (2 * Math.PI)) % 1 * def.n);
          while (used.has(slot)) slot = (slot + 1) % def.n;
          used.add(slot);
          const a = (slot / def.n) * Math.PI * 2 + ri * 0.21 + (kind === "tail" ? 0.07 : 0);
          const x = def.r * Math.cos(a), z = def.r * Math.sin(a);
          const fade = kind === "tail" ? 0.35 + ri * 0.25 : 0;
          const size = kind === "main" ? keySize(s, 1.0, 0.6) : 0.62 + 0.25 * (s.factors.dr / 100);
          keys.push({ id: s.id, source: s, kind, x, z, size, fade, rot: -a, path: -1 });
          addPath(keys[keys.length - 1]!, vortexPath(def.r, a, swirl), s, kind, startDelay + (idx + k) * (kind === "main" ? 0.05 : 0.012));
        }
        idx += count;
      });
    };
    placeRing(main, ringDefs, "main", 0.15);
    placeRing(tail, tailRingDefs, "tail", 1.6);
    lost.forEach((s, i) => {
      const a = (i / Math.max(1, lost.length)) * Math.PI * 2 + 0.4;
      const r = 18.4;
      const x = r * Math.cos(a), z = r * Math.sin(a);
      keys.push({ id: `lost:${s.id}`, source: s, kind: "lost", x, z, size: 0.9, fade: 0.2, rot: -a, path: -1 });
      addPath(keys[keys.length - 1]!, vortexPath(r, a, swirl), s, "lost", 0.8 + i * 0.05);
    });
  }

  const xs = keys.map((k) => k.x), zs = keys.map((k) => k.z);
  const bounds = {
    minX: Math.min(-HUB_RADIUS, ...xs),
    maxX: Math.max(HUB_RADIUS, ...xs, ...(outputs.length ? [outputs[outputs.length - 1]!.x + 2.5] : [])),
    minZ: Math.min(-HUB_RADIUS, ...zs),
    maxZ: Math.max(HUB_RADIUS, ...zs),
  };
  return { mode, keys, paths, outputs, outputLine, bounds };
}
