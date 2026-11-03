/**
 * Turns a JuiceResult into geometry: where each key-cap sits and the river its
 * juice follows into your site's lake. Everything is in a local 2D frame on the
 * ground plane (x, z) with the hub at the origin.
 *
 * Rivers never pass under another site's key: sources sit on two rings, and
 * every outer river flows through a reserved corridor between two inner keys.
 * Corridors are sized from the actual river widths (a 1-D packing along the
 * arc), like the nodes of a Sankey diagram. Inside the rings the rivers converge
 * and pour into the lake.
 */
import type { Health, JuiceResult, JuiceSource } from "../../shared/model";

export type LayoutMode = "funnel" | "vortex";

export const SAMPLES = 64;
export const HUB_RADIUS = 2.6;
export const LAKE_RADIUS = 3.7;

/** River width (world units) for a share of the juice: tiny springs to wide rivers. */
export const W_MIN = 0.08;
export const W_MAX = 1.6;
export function riverWidth(share: number, maxShare: number): number {
  if (!(share > 0) || !(maxShare > 0)) return W_MIN;
  return W_MIN + (W_MAX - W_MIN) * Math.pow(Math.min(1, share / maxShare), 0.6);
}

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
  /** Index of the river in `paths` (or -1). */
  path: number;
}

export interface StreamPath {
  id: string;
  key: number;
  /** Uniform arc-length samples, SAMPLES long, xz pairs. */
  points: Float32Array;
  length: number;
  /** Full river width in world units. */
  width: number;
  /** 0..1 visual strength (relative to the strongest river). */
  strength: number;
  health: Health;
  kind: "main" | "tail" | "lost";
  /** Seconds after the reveal starts when this river begins to flow. */
  delay: number;
  fade: number;
}

export interface OutputSlot {
  x: number;
  z: number;
}

export interface TailInfo {
  count: number;
  share: number;
  x: number;
  z: number;
}

export interface Layout {
  mode: LayoutMode;
  keys: KeyNode[];
  paths: StreamPath[];
  outputs: OutputSlot[];
  outputLine: Float32Array | null;
  tail: TailInfo | null;
  /** Radius inside which rivers converge (no keys there). */
  packRadius: number;
  /** Approximate extent of the scene in local units, used to frame the camera. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const DEG = Math.PI / 180;
const GAP = 0.34;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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

/** Spread order for slots: center first, then alternating outward. */
function centerOut(n: number): number[] {
  const mid = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
}

/** Golden-ratio spread: positions for ranks so big rivers are evenly spaced around a circle. */
function goldenOrder(n: number): number[] {
  const used = new Set<number>();
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    let p = Math.floor(((k * 0.6180339887) % 1) * n);
    while (used.has(p)) p = (p + 1) % n;
    used.add(p);
    out.push(p);
  }
  return out; // out[rank] = position
}

const keySize = (s: JuiceSource, ring: number) => (1.0 + 0.55 * Math.min(1, Math.max(0, s.factors.dr / 100))) * (ring === 0 ? 1 : 0.9);

interface Item {
  kind: "inner" | "corridor" | "tail";
  source?: JuiceSource;
  width: number; // river width
  span: number; // linear width reserved along the packing arc
  angle: number; // center angle (pre-swirl)
}

export function computeLayout(result: JuiceResult, mode: LayoutMode, showLost: boolean): Layout {
  const sources = result.sources;
  const maxShare = sources[0]?.share ?? 0;
  const vortex = mode === "vortex";

  const maxInner = vortex ? 16 : 14;
  const total = sources.length;
  let nInner = vortex ? Math.min(maxInner, Math.ceil(total / 2)) : Math.min(maxInner, Math.ceil((total + 1) / 2));
  nInner = Math.max(nInner, Math.min(total, 1));
  const nOuter = Math.max(0, Math.min(vortex ? nInner : nInner - 1, total - nInner));
  const inner = sources.slice(0, nInner);
  const outer = sources.slice(nInner, nInner + nOuter);
  const rest = sources.slice(nInner + nOuter);
  const tailShare = rest.reduce((a, s) => a + s.share, 0);

  // --- order items around the arc
  const innerPos: (JuiceSource | undefined)[] = new Array(nInner);
  const corrCount = vortex ? nInner : Math.max(0, nInner - 1);
  const corrPos: (JuiceSource | undefined)[] = new Array(corrCount);
  if (vortex) {
    goldenOrder(nInner).forEach((p, rank) => (innerPos[p] = inner[rank]));
    goldenOrder(corrCount).forEach((p, rank) => (corrPos[p] = outer[rank]));
  } else {
    centerOut(nInner).forEach((p, rank) => (innerPos[p] = inner[rank]));
    centerOut(corrCount).forEach((p, rank) => (corrPos[p] = outer[rank]));
  }

  const items: Item[] = [];
  for (let i = 0; i < nInner; i++) {
    const s = innerPos[i]!;
    const w = riverWidth(s.share, maxShare);
    items.push({ kind: "inner", source: s, width: w, span: Math.max(keySize(s, 0), w) + GAP, angle: 0 });
    if (i < corrCount) {
      const o = corrPos[i];
      const ow = o ? riverWidth(o.share, maxShare) : 0;
      items.push({ kind: "corridor", source: o, width: ow, span: o ? ow + GAP * 1.6 : GAP * 0.6, angle: 0 });
    }
  }
  if (rest.length) {
    const tw = riverWidth(tailShare, maxShare);
    const tailItem: Item = { kind: "tail", width: tw, span: Math.max(1.4, tw + GAP * 2), angle: 0 };
    if (vortex) {
      // put the long tail opposite the strongest river
      const topIdx = items.findIndex((it) => it.source === inner[0]);
      items.splice((topIdx + Math.floor(items.length / 2)) % Math.max(1, items.length), 0, tailItem);
    } else items.push(tailItem);
  }

  // --- pack along an arc at radius R
  const available = vortex ? Math.PI * 2 : 200 * DEG;
  const sum = items.reduce((a, it) => a + it.span, 0);
  const R = Math.max(vortex ? 5.4 : 6.2, sum / available);
  const span = sum / R;
  const center = Math.PI; // the fan opens to the left of the hub
  let acc = center - span / 2;
  for (const it of items) {
    const a = it.span / R;
    it.angle = acc + a / 2;
    acc += a;
  }
  const r0 = R + 1.0;
  const outerKeyMax = Math.max(1.0, ...outer.map((s) => keySize(s, 1)));
  const r1 = r0 + 2.2 + outerKeyMax;

  const swirl = vortex ? 0.085 : 0; // the funnel stays symmetric
  const rRef = r1 + 3;
  const compress = vortex ? 1 : 0.9;
  const tw = (r: number, a: number) => a + swirl * (rRef - r);
  const polar = (r: number, a: number): [number, number] => {
    const t = tw(r, a);
    return [r * Math.cos(t), r * Math.sin(t)];
  };
  /** Angle of a river at radius r: straight through the rings, converging inside R. */
  const riverAngle = (a: number, r: number) => {
    if (r >= R) return a;
    const e = smoothstep(R, LAKE_RADIUS, r);
    return center + (a - center) * (1 - (1 - compress) * e);
  };

  const keys: KeyNode[] = [];
  const paths: StreamPath[] = [];

  const addRiver = (key: KeyNode, a: number, rStart: number, rEnd: number, src: JuiceSource | null, kind: StreamPath["kind"], width: number, health: Health, delay: number, id = key.id) => {
    const dense: [number, number][] = [];
    const steps = Math.max(24, Math.ceil((rStart - rEnd) / 0.08));
    for (let i = 0; i <= steps; i++) {
      const r = rStart + (rEnd - rStart) * (i / steps);
      dense.push(polar(r, riverAngle(a, r)));
    }
    const { points, length } = resample(dense);
    const share = src && kind !== "lost" ? src.share : kind === "tail" ? tailShare : 0;
    paths.push({
      id,
      key: keys.indexOf(key),
      points,
      length,
      width,
      strength: maxShare > 0 ? Math.min(1, Math.sqrt(share / maxShare)) : 0,
      health,
      kind,
      delay,
      fade: key.fade,
    });
    key.path = paths.length - 1;
  };

  for (const it of items) {
    if (it.kind === "inner" && it.source) {
      const s = it.source;
      const [x, z] = polar(r0, it.angle);
      const key: KeyNode = { id: s.id, source: s, kind: "main", x, z, size: keySize(s, 0), fade: 0, rot: 0, path: -1 };
      keys.push(key);
      addRiver(key, it.angle, r0, LAKE_RADIUS - 0.4, s, "main", it.width, s.health, 0.15 + s.rank * 0.05);
    } else if (it.kind === "corridor" && it.source) {
      const s = it.source;
      const [x, z] = polar(r1, it.angle);
      const key: KeyNode = { id: s.id, source: s, kind: "main", x, z, size: keySize(s, 1), fade: 0, rot: 0, path: -1 };
      keys.push(key);
      addRiver(key, it.angle, r1, LAKE_RADIUS - 0.4, s, "main", it.width, s.health, 0.15 + s.rank * 0.05);
    }
  }

  // --- the long tail: a cluster of small faded keys sharing one creek
  let tail: TailInfo | null = null;
  const tailItem = items.find((it) => it.kind === "tail");
  if (tailItem && rest.length) {
    const rT = r1 + 0.4;
    const [tx, tz] = polar(rT, tailItem.angle);
    const pebbles = rest.slice(0, 9);
    // The head is only an anchor for the shared creek; it is not a key.
    const head: KeyNode = { id: "tail", source: rest[0]!, kind: "tail", x: tx, z: tz, size: 0, fade: 0.12, rot: 0, path: -1 };
    pebbles.forEach((s, i) => {
      const row = Math.floor(i / 3), col = (i % 3) - 1;
      const rad = rT + 1.0 + row * 0.95;
      const ang = tailItem.angle + (col * 0.78) / rad;
      const [x, z] = polar(rad, ang);
      keys.push({ id: s.id, source: s, kind: "tail", x, z, size: 0.55 + 0.2 * (s.factors.dr / 100), fade: 0.18 + row * 0.14, rot: 0, path: -1 });
    });
    addRiver(head, tailItem.angle, rT + 0.5, LAKE_RADIUS - 0.4, null, "tail", tailItem.width, "clean", 1.4, "tail");
    tail = { count: rest.length, share: tailShare, x: tx, z: tz };
  }

  // --- lost links: ghost keys beyond the outer ring whose dry beds stop short
  if (showLost && result.lost.length) {
    const innerItems = items.filter((it) => it.kind === "inner");
    const slots = vortex ? goldenOrder(innerItems.length) : centerOut(innerItems.length);
    result.lost.slice(0, Math.min(12, innerItems.length)).forEach((s, k) => {
      const it = innerItems[slots[k]!]!;
      const rL = r1 + 2.6 + (k % 2) * 1.1;
      const [x, z] = polar(rL, it.angle);
      const key: KeyNode = { id: `lost:${s.id}`, source: s, kind: "lost", x, z, size: 0.85, fade: 0.2, rot: 0, path: -1 };
      keys.push(key);
      addRiver(key, it.angle, rL, r1 + 0.6, s, "lost", 0.42, "lost", 0.9 + k * 0.05);
    });
  }

  let outputs: OutputSlot[] = [];
  let outputLine: Float32Array | null = null;
  if (!vortex) {
    const x0 = LAKE_RADIUS + 3.8;
    outputs = [{ x: x0, z: 0 }, { x: x0 + 5.5, z: 0 }, { x: x0 + 11, z: 0 }];
    const line: [number, number][] = [];
    const end = x0 + 14;
    for (let i = 0; i <= 40; i++) line.push([LAKE_RADIUS + (end - LAKE_RADIUS) * (i / 40), 0]);
    outputLine = resample(line).points;
  }

  const xs = keys.map((k) => k.x), zs = keys.map((k) => k.z);
  const bounds = {
    minX: Math.min(-LAKE_RADIUS, ...xs) - 0.8,
    maxX: Math.max(LAKE_RADIUS, ...xs, ...(outputs.length ? [outputs[outputs.length - 1]!.x + 2.7] : [])) + 0.8,
    minZ: Math.min(-LAKE_RADIUS, ...zs) - 0.8,
    maxZ: Math.max(LAKE_RADIUS, ...zs) + 0.8,
  };
  return { mode, keys, paths, outputs, outputLine, tail, packRadius: R, bounds };
}
