// Core helpers: canvas, fonts, palette, easing, timing, sketchy line art, text, cards and icons.
import { createCanvas, GlobalFonts, Path2D } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const W = 1080, H = 1920, FPS = 30;

for (const f of fs.readdirSync(path.join(ROOT, 'assets/fonts'))) {
  const fam = f.split('-')[0].replace('JetBrainsMono', 'JetBrains Mono');
  GlobalFonts.registerFromPath(path.join(ROOT, 'assets/fonts', f), fam);
}

export const C = {
  bgCenter: '#1f2c55', bgMid: '#131c3a', bgEdge: '#040a20',
  grid: 'rgba(120,150,220,0.085)',
  white: '#ffffff', ink: '#e9eefc', dim: '#7c89ad', faint: '#4a5880', slate: '#2a3866',
  orange: '#ff4c00', orangeText: '#ff6a2b', amber: '#ffb648',
  lime: '#c3f53c', red: '#ff4d5e', blue: '#8fb8ff', cyan: '#6fe3ff',
  card: 'rgba(8,13,30,0.86)', cardLine: 'rgba(140,165,230,0.18)',
  land: '#2b3a6b', landLine: 'rgba(190,210,255,0.55)', sea: '#0e1838',
};

export const FONT = {
  head: (s, w = 900) => `${w} ${s}px Unbounded`,
  mono: (s, w = 500) => `${w} ${s}px JetBrains Mono`,
  hand: (s, w = 700) => `${w} ${s}px Caveat`,
  sans: (s, w = 700) => `${w} ${s}px Inter`,
};

// ---------- math / easing ----------
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  lin: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
// progress of t within [t0, t0+d], eased
export const prog = (t, t0, d = 0.4, e = ease.out) => e(clamp((t - t0) / d));
// 0→1 at t0 (fade in over din), 1→0 at t1 (fade out over dout)
export const life = (t, t0, t1 = Infinity, din = 0.3, dout = 0.3) =>
  Math.min(ease.out(clamp((t - t0) / din)), 1 - ease.in(clamp((t - t1) / dout)));

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// smooth 1-D value noise in [-1, 1]
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 101.3), hash(i + 1 + seed * 101.3), u) * 2 - 1;
}

export function makeCanvas(w = W, h = H) { return createCanvas(w, h); }
export { Path2D };

// ---------- sketchy primitives (hand-drawn look, deterministic) ----------
// Points along a polyline get a low-frequency perpendicular wobble; `draw` (0..1) trims the path.
export function sketchPath(ctx, pts, { seed = 1, rough = 1.6, draw = 1, closed = false } = {}) {
  if (pts.length < 2 || draw <= 0) return;
  // resample by length
  const seg = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  const step = 9, n = Math.max(2, Math.ceil(total / step));
  const out = []; let si = 0, acc = 0;
  for (let k = 0; k <= n; k++) {
    const target = (k / n) * total;
    while (si < seg.length - 1 && acc + seg[si] < target) { acc += seg[si]; si++; }
    const f = seg[si] ? (target - acc) / seg[si] : 0;
    const a = pts[si], b = pts[si + 1] || a;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const off = noise1(target / 70, seed) * rough + noise1(target / 23, seed + 7) * rough * 0.35;
    out.push([a[0] + dx * f - (dy / L) * off, a[1] + dy * f + (dx / L) * off]);
  }
  const m = Math.max(1, Math.floor(out.length * clamp(draw)));
  ctx.beginPath(); ctx.moveTo(out[0][0], out[0][1]);
  for (let i = 1; i < m; i++) ctx.lineTo(out[i][0], out[i][1]);
  if (closed && draw >= 1) ctx.closePath();
  ctx.stroke();
}
export function sLine(ctx, x1, y1, x2, y2, o = {}) { sketchPath(ctx, [[x1, y1], [x2, y2]], o); }
export function sRect(ctx, x, y, w, h, o = {}) {
  sketchPath(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 2]], { ...o, closed: false });
}
export function circlePts(cx, cy, r, a0 = -Math.PI / 2, sweep = Math.PI * 2, n = 0) {
  n = n || Math.max(24, Math.ceil(r * sweep / 8));
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (sweep * i) / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}
// hand-drawn circle: slight radius wobble + small overshoot past the start point
export function sCircle(ctx, cx, cy, r, { seed = 3, rough = 1.4, draw = 1, overshoot = 0.06, a0 } = {}) {
  const start = a0 ?? (-Math.PI / 2 + noise1(seed, 9) * 0.6);
  const sweep = Math.PI * 2 * (1 + overshoot) * clamp(draw);
  if (sweep <= 0) return;
  const n = Math.max(30, Math.ceil(r * sweep / 7));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = start + (sweep * i) / n;
    const rr = r + noise1(i / n * 6, seed) * rough * 1.5 + (i / n) * rough * 1.2;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}
export function arrowHead(ctx, x, y, ang, size = 14) {
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(ang - 0.45) * size, y - Math.sin(ang - 0.45) * size);
  ctx.lineTo(x, y);
  ctx.lineTo(x - Math.cos(ang + 0.45) * size, y - Math.sin(ang + 0.45) * size);
  ctx.stroke();
}
export function dashedLine(ctx, x1, y1, x2, y2, dash = [10, 9], offset = 0) {
  ctx.save(); ctx.setLineDash(dash); ctx.lineDashOffset = offset;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
// point along a quadratic curve
export function quadPt(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}
export function quadPts(p0, p1, p2, n = 40) { const o = []; for (let i = 0; i <= n; i++) o.push(quadPt(p0, p1, p2, i / n)); return o; }
export function arcCtrl(a, b, bend = 0.25) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  return [mx + dy * bend, my - dx * bend];
}

// ---------- text ----------
export function text(ctx, s, x, y, { font = FONT.sans(28), color = C.ink, align = 'left', base = 'alphabetic', alpha = 1, ls = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (ls) ctx.letterSpacing = `${ls}px`;
  ctx.fillText(s, x, y); ctx.restore();
}
export function measure(ctx, s, font, ls = 0) {
  ctx.save(); ctx.font = font; if (ls) ctx.letterSpacing = `${ls}px`; const w = ctx.measureText(s).width; ctx.restore(); return w;
}
// typewriter: reveal characters over time
export function typed(s, t, t0, cps = 38) { const n = Math.floor(clamp((t - t0) * cps, 0, s.length)); return s.slice(0, n); }
// handwritten note with slight rotation, written on progressively
export function hand(ctx, s, x, y, t, t0, { size = 40, color = C.blue, rot = -0.03, align = 'left', alpha = 1, cps = 22 } = {}) {
  if (t < t0) return;
  const font = FONT.hand(size), w = measure(ctx, s, font) + 8;
  const p = ease.out(clamp((t - t0) / Math.max(0.25, s.length / cps)));
  const x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.rect(x0 - 4, -size * 1.2, w * p, size * 1.8); ctx.clip();
  text(ctx, s, 0, 0, { font, color, align, alpha: alpha * Math.min(1, p * 3) });
  ctx.restore();
}
// number formatting with thin-space thousands, e.g. 16 500
export function fmt(n, dec = 0, sep = ' ', dp = '.') {
  const s = Math.abs(n).toFixed(dec); let [i, d] = s.split('.');
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (n < 0 ? '−' : '') + i + (d ? dp + d : '');
}

// ---------- cards / panels ----------
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function card(ctx, x, y, w, h, { alpha = 1, r = 14, fill = C.card, line = C.cardLine, shadow = true } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; }
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = 1.5; ctx.strokeStyle = line; ctx.stroke();
  ctx.restore();
}
// pop-in transform helper: scale from s0 with back easing around (cx, cy)
export function popIn(ctx, t, t0, cx, cy, d = 0.35, s0 = 0.6) {
  const p = clamp((t - t0) / d), s = lerp(s0, 1, ease.back(p));
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  return ease.out(p);
}

// ---------- glow dots ----------
export function glowDot(ctx, x, y, r, color, { alpha = 1, glow = 3 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * glow * 2);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha *= 0.35; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * glow * 2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.35; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
export function ring(ctx, x, y, r, color, { alpha = 1, lw = 2 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// ---------- icons (line art) ----------
// server rack: s = height scale (~1 → 86px tall)
export function serverIcon(ctx, x, y, { s = 1, color = C.ink, accent = C.lime, alpha = 1, seed = 5, hot = 0, t = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  const w = 74, h = 26;
  for (let i = 0; i < 3; i++) {
    const yy = -40 + i * (h + 4);
    ctx.fillStyle = hot ? `rgba(${Math.round(lerp(18, 90, hot))},${Math.round(lerp(28, 20, hot))},${Math.round(lerp(60, 30, hot))},0.95)` : 'rgba(18,28,60,0.95)';
    roundRect(ctx, -w / 2, yy, w, h, 5); ctx.fill();
    ctx.strokeStyle = hot ? `rgb(255,${Math.round(lerp(230, 80, hot))},${Math.round(lerp(240, 90, hot))})` : color; ctx.lineWidth = 2.4;
    sRect(ctx, -w / 2, yy, w, h, { seed: seed + i, rough: 0.8 });
    ctx.lineWidth = 2; sLine(ctx, -w / 2 + 12, yy + h / 2, -w / 2 + 34, yy + h / 2, { seed: seed + 9 + i, rough: 0.5 });
    const blink = 0.5 + 0.5 * Math.sin(t * 9 + i * 2 + seed);
    glowDot(ctx, w / 2 - 14, yy + h / 2, 3.4, hot ? C.red : accent, { alpha: hot ? 1 : 0.55 + 0.45 * blink, glow: 2 });
  }
  ctx.restore();
}
// user device: a phone outline
export function phoneIcon(ctx, x, y, { s = 1, color = C.ink, alpha = 1, seed = 8, screen = null } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(14,22,50,0.95)'; roundRect(ctx, -22, -38, 44, 76, 8); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2.4; sRect(ctx, -22, -38, 44, 76, { seed, rough: 0.7 });
  ctx.lineWidth = 2; sLine(ctx, -6, 30, 6, 30, { seed: seed + 1, rough: 0.3 });
  if (screen) { ctx.fillStyle = screen; ctx.fillRect(-16, -30, 32, 54); }
  ctx.restore();
}
// a little browser window (used for "blank screen" / "loaded page")
export function browser(ctx, x, y, w, h, { alpha = 1, url = 'shop.example', loaded = 0, spinner = 0, t = 0, seed = 21 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  card(ctx, x, y, w, h, { r: 16, fill: 'rgba(10,16,36,0.92)' });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; sRect(ctx, x, y, w, h, { seed, rough: 1 });
  ctx.lineWidth = 1.6; sLine(ctx, x, y + 46, x + w, y + 46, { seed: seed + 1, rough: 0.6 });
  for (let i = 0; i < 3; i++) glowDot(ctx, x + 24 + i * 22, y + 23, 5, [C.red, C.amber, C.lime][i], { alpha: 0.8, glow: 1 });
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; roundRect(ctx, x + 96, y + 11, w - 120, 24, 12); ctx.fill();
  text(ctx, url, x + 112, y + 29, { font: FONT.mono(17), color: C.dim });
  const bx = x + 18, by = y + 62, bw = w - 36, bh = h - 80;
  if (loaded > 0) {
    ctx.save(); ctx.globalAlpha *= loaded;
    ctx.fillStyle = 'rgba(255,76,0,0.85)'; roundRect(ctx, bx, by, bw, bh * 0.42, 8); ctx.fill();
    // mountains in the hero image
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(bx + 10, by + bh * 0.42);
    ctx.lineTo(bx + bw * 0.3, by + bh * 0.16); ctx.lineTo(bx + bw * 0.5, by + bh * 0.3); ctx.lineTo(bx + bw * 0.68, by + bh * 0.12);
    ctx.lineTo(bx + bw - 10, by + bh * 0.42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(233,238,252,0.9)'; roundRect(ctx, bx, by + bh * 0.5, bw * 0.7, 18, 6); ctx.fill();
    ctx.fillStyle = 'rgba(233,238,252,0.35)';
    for (let i = 0; i < 3; i++) { roundRect(ctx, bx, by + bh * 0.62 + i * 26, bw * (0.92 - i * 0.18), 12, 6); ctx.fill(); }
    ctx.fillStyle = C.orange; roundRect(ctx, bx, by + bh - 40, 150, 40, 10); ctx.fill();
    text(ctx, 'BUY NOW', bx + 75, by + bh - 14, { font: FONT.sans(17, 800), color: '#fff', align: 'center' });
    ctx.restore();
  }
  if (spinner > 0) {
    ctx.save(); ctx.globalAlpha *= spinner; ctx.strokeStyle = C.dim; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const cx = x + w / 2, cy = y + 46 + (h - 46) / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 26, t * 7, t * 7 + Math.PI * 1.4); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
// person glyph (for audience / players)
export function person(ctx, x, y, s, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - 9 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + 8 * s, 10 * s, 9 * s, 0, Math.PI, 0); ctx.fill();
  ctx.restore();
}

// Gcore logo (paths from gcore.com). Path 0 is the mark, 1-7 the wordmark; viewBox 128x32.
const LOGO_D = [...fs.readFileSync(path.join(ROOT, 'assets/gcore_logo.svg'), 'utf8').matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
const LOGO_P = LOGO_D.map(d => new Path2D(d));
export function gcoreMark(ctx, cx, cy, size, color = C.orange) {
  ctx.save(); ctx.translate(cx - (13.65 * size) / 32, cy - (15.9 * size) / 32); ctx.scale(size / 32, size / 32);
  ctx.fillStyle = color; ctx.fill(LOGO_P[0], 'evenodd'); ctx.restore();
}
export function gcoreWordmark(ctx, x, y, h, color = C.orange) {
  // x,y = top-left; h = height of the full logo box (32 units)
  ctx.save(); ctx.translate(x, y); ctx.scale(h / 32, h / 32); ctx.fillStyle = color;
  for (const p of LOGO_P) ctx.fill(p, 'evenodd');
  ctx.restore();
}
export function gcoreAvatar(ctx, cx, cy, r, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  gcoreMark(ctx, cx + r * 0.02, cy, r * 1.25, C.orange);
  ctx.restore();
}
