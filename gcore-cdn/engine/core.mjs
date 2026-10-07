// Core helpers: canvas, fonts, palette, easing, timing, sketchy line art, text, cards and icons.
import { createCanvas, GlobalFonts, Path2D, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const W = 1080, H = 1920, FPS = 30;

// gcore.com typography: Montserrat for everything set in type, Fira Code for data and logs
for (const f of fs.readdirSync(path.join(ROOT, 'assets/fonts'))) {
  const fam = f.split('-')[0].replace('FiraCode', 'Fira Code');
  GlobalFonts.registerFromPath(path.join(ROOT, 'assets/fonts', f), fam);
}

// gcore.com palettes. light = the WAF page as served (warm white, ink line art, orange); dark = its dark mode / dark cards.
// Pick with THEME=light|dark (default light).
export const THEME = process.env.THEME === 'dark' ? 'dark' : 'light';
const BRAND = { orange: '#ff4c00', orange2: '#ff9a70', peach: '#fec0a5', peach2: '#ffe3d0', amber: '#ffb648', white: '#ffffff', cyan: '#6fe3ff' };
export const C = THEME === 'light' ? {
  ...BRAND, bg: '#fbf9f8', leak: '#f9e6da', leak2: '#f8efe9', bgDeep: 'rgba(120,70,40,0.10)', outline: '#150c18',
  text: '#150c18', ink: '#150c18', dim: '#5b545f', faint: '#9a939f', slate: '#e7e4e0', line: '#150c18', track: 'rgba(21,12,24,0.08)',
  orangeText: '#ff4c00', you: '#150c18', good: '#ff4c00', muted: '#9a939f', red: '#e5203d', blue: '#5b545f', spark: '#ff4c00',
  card: '#ffffff', halo: 'rgba(251,249,248,0.92)', surface: '#ffffff', cardLine: '#ffffff', shadow: 'rgba(255,76,0,0.16)',
  dot: 'rgba(21,12,24,0.30)', globeA: '#ffffff', globeB: '#f7ece6', globeGlow: 'rgba(255,76,0,0.10)', globeRim: 'rgba(21,12,24,0.28)', glowOp: 'source-over',
} : {
  ...BRAND, bg: '#1e1224', leak: '#3a2852', leak2: '#2a1c38', bgDeep: 'rgba(10,4,14,0.6)', outline: '#150c18',
  text: '#ffffff', ink: '#f3eff6', dim: '#b8acc5', faint: '#7a6d88', slate: '#3f3544', line: '#ffffff', track: 'rgba(255,255,255,0.14)',
  orangeText: '#ff5a14', you: '#ffffff', good: '#ff5a14', muted: '#8a7d99', red: '#ff3d5a', blue: '#d4c8ea', spark: '#fff2e0',
  card: 'rgba(42,30,52,0.94)', halo: 'rgba(25,15,31,0.9)', surface: '#1e1224', cardLine: 'rgba(255,255,255,0.14)', shadow: 'rgba(0,0,0,0.45)',
  dot: 'rgba(214,200,236,0.42)', globeA: '#2c1d3c', globeB: '#170d1d', globeGlow: 'rgba(168,130,255,0.18)', globeRim: 'rgba(255,255,255,0.35)', glowOp: 'lighter',
};
// '#rrggbb' + alpha → rgba()
export function withA(hex, a) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}



export const FONT = {
  head: (s, w = 800) => `${Math.min(w, 800)} ${s}px Montserrat`,
  mono: (s, w = 500) => `${w >= 500 ? 500 : 400} ${s}px Fira Code`,
  hand: (s, w = 700) => `${w} ${Math.round(s * 0.84)}px Montserrat`, // annotations (were handwritten): set smaller in Montserrat
  sans: (s, w = 700) => `${w} ${s}px Montserrat`,
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
// SVG asset rasterised at `scale` × its native size (re-written width/height so it stays crisp)
export async function svgImage(file, scale = 4) {
  let src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const m = /<svg[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"/.exec(src);
  if (m) src = src.replace(`width="${m[1]}"`, `width="${+m[1] * scale}"`).replace(`height="${m[2]}"`, `height="${+m[2] * scale}"`);
  return loadImage(Buffer.from(src));
}
export { Path2D };

// ---------- sketchy primitives (hand-drawn look, deterministic) ----------
// Points along a polyline get a low-frequency perpendicular wobble; `draw` (0..1) trims the path.
export const ROUGH = 0; // 0 = clean vector lines (gcore.com style); 1 = the original hand-drawn wobble
export function sketchPath(ctx, pts, { seed = 1, rough = 1.6, draw = 1, closed = false } = {}) {
  if (pts.length < 2 || draw <= 0) return;
  rough *= ROUGH;
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
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
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
export function sCircle(ctx, cx, cy, r, { seed = 3, rough = 1.4, draw = 1, overshoot = 0, a0 } = {}) {
  rough *= ROUGH;
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

// ---------- text layer ----------
// While a scene draws, text and labels are queued and painted after all line art, so labels always sit on top.
// textLayer.flush(ctx) paints the queue early (use it before drawing an overlay card that should cover labels).
let TQ = null;
export const textLayer = {
  begin() { TQ = []; },
  flush() { if (!TQ) return; const q = TQ; TQ = null; for (const f of q) f(); TQ = []; },
  end() { this.flush(); TQ = null; },
};
// run fn now, or queue it with the current transform/alpha when the text layer is active
export function defer(ctx, fn) {
  if (!TQ) return fn();
  const m = ctx.getTransform(), a = ctx.globalAlpha;
  TQ.push(() => { ctx.save(); ctx.setTransform(m); ctx.globalAlpha = a; fn(); ctx.restore(); });
}

// ---------- text ----------
// halo: a soft outline in the background colour so text stays readable where it crosses lines or dots
export function text(ctx, s, x, y, { font = FONT.sans(28), color = C.ink, align = 'left', base = 'alphabetic', alpha = 1, ls = 0, halo = true } = {}) {
  if (alpha <= 0 || !s) return;
  defer(ctx, () => {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    if (ls) ctx.letterSpacing = `${ls}px`;
    if (halo) {
      const size = +(/([\d.]+)px/.exec(font) || [0, 24])[1];
      ctx.strokeStyle = halo === true ? C.halo : halo; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.2);
      ctx.strokeText(s, x, y);
    }
    ctx.fillText(s, x, y); ctx.restore();
  });
}
export function measure(ctx, s, font, ls = 0) {
  ctx.save(); ctx.font = font; if (ls) ctx.letterSpacing = `${ls}px`; const w = ctx.measureText(s).width; ctx.restore(); return w;
}
// typewriter: reveal characters over time
export function typed(s, t, t0, cps = 38) { const n = Math.floor(clamp((t - t0) * cps, 0, s.length)); return s.slice(0, n); }
// handwritten note with slight rotation, revealed left to right
export function hand(ctx, s, x, y, t, t0, { size = 40, color = C.blue, rot = -0.03, align = 'left', alpha = 1, cps = 22 } = {}) {
  if (t < t0 || alpha <= 0) return;
  if (Math.abs(rot) < 0.15) rot = 0; // corporate type stays level; larger angles are deliberate (labels along a line)
  const font = FONT.hand(size), w = measure(ctx, s, font) + size * 0.8; // generous: script glyphs overhang their advance
  const p = ease.out(clamp((t - t0) / Math.max(0.25, s.length / cps)));
  const x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
  defer(ctx, () => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (p < 1) { ctx.beginPath(); ctx.rect(x0 - size * 0.4, -size * 1.4, w * p + size * 0.4, size * 2.2); ctx.clip(); }
    text(ctx, s, 0, 0, { font, color, align, alpha: alpha * Math.min(1, p * 3) });
    ctx.restore();
  });
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
export function card(ctx, x, y, w, h, { alpha = 1, r = 20, fill = C.card, line = C.cardLine, shadow = true } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (shadow) { ctx.shadowColor = C.shadow; ctx.shadowBlur = 50; ctx.shadowOffsetY = 14; }
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = 2; ctx.strokeStyle = line; ctx.stroke();
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
  g.addColorStop(0, color); g.addColorStop(1, withA(color, 0));
  ctx.globalAlpha *= 0.35; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * glow * 2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.35; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// a user / location marker: surface-filled dot with a thick ring and a solid centre (no glow, reads on light and dark)
export function youDot(ctx, x, y, r, { alpha = 1, color = C.you } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, r * 0.38); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
export function ring(ctx, x, y, r, color, { alpha = 1, lw = 2 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// ---------- icons (gcore.com dark-mode line art: white outlines, orange accents) ----------
// server rack: three rounded units with a status ring, a bar and an LED; s = 1 → ~94 px tall
export function serverIcon(ctx, x, y, { s = 1, color = C.line, accent = C.orange, alpha = 1, seed = 5, hot = 0, t = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  const w = 86, h = 27, stroke = hot ? `rgb(255,${Math.round(lerp(255, 61, hot))},${Math.round(lerp(255, 90, hot))})` : color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const yy = -44 + i * (h + 4);
    ctx.fillStyle = hot ? `rgba(${Math.round(lerp(30, 90, hot))},${Math.round(lerp(18, 14, hot))},${Math.round(lerp(36, 30, hot))},1)` : C.surface;
    roundRect(ctx, -w / 2, yy, w, h, 7); ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(-w / 2 + 13, yy + h / 2, 3.6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w / 2 + 25, yy + h / 2); ctx.lineTo(w / 2 - 30, yy + h / 2); ctx.stroke();
    const blink = 0.5 + 0.5 * Math.sin(t * 6 + i * 2 + seed);
    ctx.fillStyle = hot ? C.red : accent; ctx.globalAlpha = alpha * (hot ? 1 : 0.6 + 0.4 * blink);
    ctx.beginPath(); ctx.arc(w / 2 - 15, yy + h / 2, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = alpha;
  }
  ctx.restore();
}
// user device: phone outline with a lit screen bar
export function phoneIcon(ctx, x, y, { s = 1, color = C.line, alpha = 1, screen = null } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  roundRect(ctx, -24, -42, 48, 84, 10); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.lineWidth = 2; roundRect(ctx, -17, -33, 34, 60, 5); ctx.stroke();
  ctx.fillStyle = screen || C.orange; roundRect(ctx, -11, -25, 22, 8, 3); ctx.fill();
  ctx.fillStyle = color; ctx.globalAlpha *= 0.45; roundRect(ctx, -11, -12, 22, 4, 2); ctx.fill(); roundRect(ctx, -11, -4, 15, 4, 2); ctx.fill();
  ctx.globalAlpha = alpha; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-5, 35); ctx.lineTo(5, 35); ctx.stroke();
  ctx.restore();
}
// browser window (blank-screen spinner or a loaded shop page)
export function browser(ctx, x, y, w, h, { alpha = 1, url = 'shop.example', loaded = 0, spinner = 0, t = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round';
  ctx.shadowColor = C.shadow; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  roundRect(ctx, x, y, w, h, 16); ctx.fillStyle = C.surface; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = C.line; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + 46); ctx.lineTo(x + w, y + 46); ctx.stroke();
  [0, 1, 2].forEach(i => {
    ctx.beginPath(); ctx.arc(x + 24 + i * 20, y + 23, 5.5, 0, Math.PI * 2);
    if (i === 0) { ctx.fillStyle = C.orange; ctx.fill(); } else { ctx.lineWidth = 2; ctx.stroke(); }
  });
  ctx.lineWidth = 1.6; ctx.strokeStyle = withA(C.line, 0.4); roundRect(ctx, x + 96, y + 11, w - 120, 24, 12); ctx.stroke();
  text(ctx, url, x + 112, y + 29, { font: FONT.mono(17), color: C.dim, halo: false });
  const bx = x + 18, by = y + 62, bw = w - 36, bh = h - 80;
  if (loaded > 0) {
    ctx.save(); ctx.globalAlpha *= loaded;
    const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh * 0.42); g.addColorStop(0, C.orange); g.addColorStop(1, C.orange2);
    ctx.fillStyle = g; roundRect(ctx, bx, by, bw, bh * 0.42, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); // product sparkline in the hero
    for (let i = 0; i <= 24; i++) { const px = bx + 20 + (bw - 40) * i / 24, py = by + bh * 0.26 - Math.sin(i * 0.7) * 14 - i * 1.2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    ctx.fillStyle = withA(C.text, 0.85); roundRect(ctx, bx, by + bh * 0.5, bw * 0.7, 16, 8); ctx.fill();
    ctx.fillStyle = withA(C.text, 0.25);
    for (let i = 0; i < 3; i++) { roundRect(ctx, bx, by + bh * 0.62 + i * 24, bw * (0.92 - i * 0.18), 10, 5); ctx.fill(); }
    ctx.fillStyle = C.orange; roundRect(ctx, bx, by + bh - 40, 150, 40, 10); ctx.fill();
    text(ctx, 'BUY NOW', bx + 75, by + bh - 14, { font: FONT.sans(17, 800), color: '#fff', align: 'center', halo: false });
    ctx.restore();
  }
  if (spinner > 0) {
    ctx.save(); ctx.globalAlpha *= spinner; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const cx = x + w / 2, cy = y + 46 + (h - 46) / 2;
    ctx.strokeStyle = C.track; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.orange; ctx.beginPath(); ctx.arc(cx, cy, 26, t * 7, t * 7 + Math.PI * 1.2); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
// pill callout like gcore.com's "Nearest Gcore PoP": white pill, dark text, optional Gcore mark
export function pill(ctx, s, cx, cy, { alpha = 1, size = 22, logo = false, dark = false, outline = null } = {}) {
  if (alpha <= 0) return;
  const font = FONT.sans(size, 700), tw = measure(ctx, s, font), lw = logo ? size * 1.25 : 0, w = tw + lw + size * 1.2, h = size * 1.85;
  defer(ctx, () => {
    ctx.save(); ctx.globalAlpha *= alpha;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, size * 0.45);
    ctx.fillStyle = outline ? C.halo : dark ? C.slate : '#ffffff'; ctx.fill();
    if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke(); }
    if (logo) gcoreMark(ctx, cx - w / 2 + size * 0.6 + lw * 0.4, cy, size * 1.05, C.orange);
    text(ctx, s, cx - w / 2 + size * 0.6 + lw, cy + size * 0.36, { font, color: outline || (dark ? C.white : C.outline), halo: false });
    ctx.restore();
  });
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
  ctx.fillStyle = THEME === 'light' ? C.orange : '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  gcoreMark(ctx, cx + r * 0.02, cy, r * 1.25, THEME === 'light' ? '#ffffff' : C.orange);
  ctx.restore();
}
