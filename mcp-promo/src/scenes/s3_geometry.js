// 03 — GEOMETRY
// A bleed grid of 17×9 cells. Every beat a morph wave ripples out from a new
// origin (centre → corner → corner → centre): circles → squares → crosses →
// radial bars aligned like iron filings, then everything is sucked into the
// core while cobalt tiles close in from the edges.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, mix, hash } from "../engine/math.js";
import { cobaltGround } from "./s4_dimension.js";

const B = BEAT;
const CELL = 120;
const COLS = 17, ROWS = 9;
const CX = W / 2, CY = H / 2;
const N = 96; // polar samples per shape

// polar shape functions r(θ), unit size
const SH = {
  circle: () => 1,
  square: (th) => 1 / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th))),
  plus: (th) => {
    // cross with arm half-width a, half-length 1 (ray/polygon intersection)
    const a = 0.34, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    const r1 = Math.min(1 / Math.max(c, 1e-6), a / Math.max(s, 1e-6)); // horizontal arm
    const r2 = Math.min(a / Math.max(c, 1e-6), 1 / Math.max(s, 1e-6)); // vertical arm
    return Math.max(r1, r2);
  },
  bar: (th) => {
    const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    return Math.min(1 / Math.max(c, 1e-6), 0.13 / Math.max(s, 1e-6));
  },
};
const TABLE = {};
for (const k of Object.keys(SH)) {
  TABLE[k] = new Float32Array(N);
  for (let i = 0; i < N; i++) TABLE[k][i] = SH[k]((i / N) * TAU);
}
// sample a table at angle th (radians) with linear interpolation
function sample(tab, th) {
  const u = (((th / TAU) % 1) + 1) % 1 * N;
  const i = Math.floor(u), f = u - i;
  return tab[i % N] * (1 - f) + tab[(i + 1) % N] * f;
}

const cells = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = c * CELL, y = CELL / 2 + r * CELL;
    const d = Math.hypot(x - CX, y - CY);
    cells.push({ c, r, x, y, d, ang: Math.atan2(CY - y, CX - x), h: hash(c * 31 + r * 17) });
  }
}
const DMAX = Math.max(...cells.map((k) => k.d));

// waves: [start time, origin, speed]
const WAVES = [
  { t: 0.0, o: [CX, CY], v: 2700 },
  { t: B, o: [0, 0], v: 6200 },
  { t: 2 * B, o: [W, H], v: 6200 },
  { t: 3 * B - 0.03, o: [CX, CY], v: 6500 },
];
// per-wave shape state: size (px), rotation, colour
// each state is "alive": a travelling modulation keeps the field breathing between waves
const STATE = [
  (k, lt) => ({ tab: TABLE.circle, size: 38 * (0.5 + 0.5 * Math.cos(k.d / 150 - lt * 9)) + 6, rot: 0, col: colorA(k) }),
  (k, lt) => ({ tab: TABLE.square, size: 30 * (0.62 + 0.38 * Math.sin((k.x + k.y) / 240 - lt * 8)), rot: Math.PI / 2, col: colorB(k) }),
  (k, lt) => ({ tab: TABLE.plus, size: 42, rot: Math.PI / 2 + Math.PI / 4 + 0.9 * Math.sin(k.x / 300 - lt * 7), col: colorC(k) }),
  (k, lt) => ({ tab: TABLE.bar, size: 50 * (0.75 + 0.25 * Math.sin(k.d / 90 - lt * 14)), rot: 0, abs: k.ang, col: colorD(k) }),
];
function colorA(k) {
  return (k.c + k.r) % 4 === 0 ? PAL.orange : PAL.ink;
}
function colorB(k) {
  return (k.c - k.r + 40) % 5 === 0 ? PAL.cobalt : (k.c + k.r) % 4 === 0 ? PAL.orange : PAL.ink;
}
function colorC(k) {
  return k.r % 2 === 0 ? (k.c % 2 === 0 ? PAL.cobalt : PAL.ink) : k.c % 3 === 0 ? PAL.orange : PAL.ink;
}
function colorD(k) {
  return k.h < 0.22 ? PAL.orange : k.h < 0.36 ? PAL.cobalt : PAL.ink;
}

function waveP(k, i, lt) {
  const w = WAVES[i];
  const d = Math.hypot(k.x - w.o[0], k.y - w.o[1]) / w.v;
  return seg(lt, w.t + d, w.t + d + 0.3);
}

const T_SUCK = 1.6;

function drawCell(ctx, k, lt) {
  // which state pair are we between?
  const pApp = waveP(k, 0, lt);
  if (pApp <= 0) return;
  let i = 0, p = 0;
  for (let j = 1; j < 4; j++) {
    const pj = waveP(k, j, lt);
    if (pj > 0) { i = j - 1; p = pj; }
  }
  const A = STATE[i](k, lt), Bs = STATE[Math.min(3, i + 1)](k, lt);
  const e = curves.swift(p);
  let scale = i === 0 && p === 0 ? spring(lt - (k.d / WAVES[0].v), { k: 330, c: 15 }) : 1;
  // pulse on each wave arrival
  scale *= 1 + 0.45 * Math.sin(Math.PI * clamp(p * 1.3));
  // suction into the core
  const tS = T_SUCK + (k.d / DMAX) * 0.1;
  const ps = ease.inCubic(seg(lt, tS, tS + 0.17));
  if (ps >= 1) return;
  const x = lerp(k.x, CX, ps), y = lerp(k.y, CY, ps);
  scale *= 1 - ps * 0.7;

  const rotA = A.abs !== undefined ? A.abs : A.rot;
  const rotB = Bs.abs !== undefined ? Bs.abs : Bs.rot;
  const rot = lerp(rotA, rotB, e);
  ctx.fillStyle = p > 0.5 ? Bs.col : A.col;
  ctx.beginPath();
  for (let n = 0; n <= N; n++) {
    const th = (n / N) * TAU;
    const ra = sample(A.tab, th - (rotA - rot)) * A.size;
    const rb = sample(Bs.tab, th - (rotB - rot)) * Bs.size;
    const rr = lerp(ra, rb, e) * scale;
    const px = x + Math.cos(th + rot) * rr, py = y + Math.sin(th + rot) * rr;
    n === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export default {
  hud: (lt) => (lt > 1.72 ? "light" : "dark"),
  vignette: (lt) => lerp(0.07, 0.2, seg(lt, 1.6, 1.84)),
  blur: (lt) => (lt > 1.5 ? { samples: 1.5 } : null),
  render(ctx, lt) {
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(0, 0, W, H);
    const zoom = lerp(1.14, 1.0, curves.glide(seg(lt, 0, 1.6)));
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(zoom, zoom);
    ctx.translate(-CX, -CY);

    // Swiss grid hairlines draw on, then retreat
    const gIn = curves.snap(seg(lt, 0.0, 0.5)), gOut = seg(lt, 1.4, 1.6);
    if (gIn > 0 && gOut < 1) {
      ctx.strokeStyle = `rgba(13,13,16,${0.09 * (1 - gOut)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 0; c <= COLS; c++) {
        const x = c * CELL - CELL / 2;
        const len = H * gIn;
        ctx.moveTo(x, CY - len / 2);
        ctx.lineTo(x, CY + len / 2);
      }
      for (let r = 0; r <= ROWS; r++) {
        const y = r * CELL;
        const len = W * gIn;
        ctx.moveTo(CX - len / 2, y);
        ctx.lineTo(CX + len / 2, y);
      }
      ctx.stroke();
    }

    // cobalt tiles close in from the edges (behind the shapes)
    ctx.fillStyle = cobaltGround(ctx);
    for (const k of cells) {
      const ds = k.d / DMAX;
      const t0 = 1.58 + (1 - ds) * 0.1;
      const p = curves.snap(seg(lt, t0, t0 + 0.11));
      if (p <= 0) continue;
      // once a tile is mostly in, back it with a solid cell so no seam can show paper
      if (p > 0.55) ctx.fillRect(k.x - CELL / 2 - 1, k.y - CELL / 2 - 1, CELL + 2, CELL + 2);
      const s = (CELL / 2) * 1.1 * Math.min(1, p * 1.05);
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate((1 - p) * Math.PI / 4);
      ctx.fillRect(-s, -s, 2 * s, 2 * s);
      ctx.restore();
    }
    // centre tile region may be uncovered by rotation; ensure the frame ends fully cobalt
    const full = seg(lt, 1.83, 1.84);
    if (full > 0) {
      ctx.fillStyle = cobaltGround(ctx);
      ctx.fillRect(0, 0, W, H);
    }

    // the seed dot: lands at centre, becomes the centre cell
    if (lt < 0.12) {
      const sq = 0.3 * Math.exp(-lt * 30) * Math.cos(lt * 50);
      ctx.fillStyle = PAL.ink;
      ctx.beginPath();
      ctx.ellipse(CX, CY, 44 * (1 + sq), 44 * (1 - sq), 0, 0, TAU);
      ctx.fill();
    }
    // shockwave ring from the impact
    const pr = seg(lt, 0, 0.5);
    if (pr > 0 && pr < 1) {
      ctx.strokeStyle = `rgba(13,13,16,${0.5 * (1 - pr)})`;
      ctx.lineWidth = 6 * (1 - pr);
      ctx.beginPath();
      ctx.arc(CX, CY, 50 + 1200 * curves.snap(pr), 0, TAU);
      ctx.stroke();
    }

    for (const k of cells) drawCell(ctx, k, lt);
    ctx.restore();

    // the core: swallows the grid, swells into the next scene's sphere
    const pc = seg(lt, T_SUCK, 1.875);
    if (pc > 0) {
      const r = lerp(30, 230, ease.inOutCubic(pc)) * (1 + 0.06 * Math.sin(pc * Math.PI * 3));
      ctx.fillStyle = mix(PAL.ink, PAL.orange, ease.inOutCubic(seg(pc, 0, 0.7)));
      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, TAU);
      ctx.fill();
    }
  },
};
