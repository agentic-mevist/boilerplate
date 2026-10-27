// 02 — TYPOGRAPHY
// A three-line poster built on the beat, justified *with the width axis*
// of a variable font. Each line enters with a different technique, the block
// breathes with a per-letter width wave, then slices away in strips.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, mix } from "../engine/math.js";
import { fonts } from "../fonts.js";
import { layout, glyphPath, flatten, partialContours, glyphBounds } from "../engine/font.js";
import { text } from "../engine/draw.js";

const B = BEAT;
const BLOCK_W = 1640;
const WGHT = 900;
let M = null; // lazily computed metrics

function widthAt(str, wdth, size, wght = WGHT) {
  return layout(fonts.display, str, { size, axes: { wdth, wght } }).width;
}
// solve wdth so `str` spans `target` px (width axis as justification)
function fitWdth(str, size, target) {
  let lo = 50, hi = 150;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (widthAt(str, mid, size) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function metrics() {
  if (M) return M;
  const f = fonts.display, s = fonts.serif;
  // Justify all three lines to one measure using the width axis:
  // EVERY sits at wdth 150; solve PURPOSE's wdth (and the size) so line 3 matches.
  const serifK = (0.78 * f.capHeight) / f.upm / (s.xHeight / s.upm);
  const onW1 = layout(s, "on", { size: serifK }).width;
  const sizeFor = (w) => BLOCK_W / (onW1 + 0.16 + widthAt("PURPOSE.", w, 1));
  let lo = 50, hi = 100, w3 = 75, size = 300;
  for (let i = 0; i < 40; i++) {
    w3 = (lo + hi) / 2;
    size = sizeFor(w3);
    if (widthAt("EVERY", 150, size) < BLOCK_W) hi = w3; else lo = w3;
  }
  const cap = f.capHeight * (size / f.upm);
  const ss = serifK * size;
  const onW = layout(s, "on", { size: ss }).width;
  const lead = cap * 1.2;
  const top = (H + cap - 2 * lead) / 2; // baseline of line 1 (block centred)
  M = {
    size, cap, lead, ss, onW,
    base: [top, top + lead, top + 2 * lead],
    w1: fitWdth("EVERY", size, BLOCK_W),
    w2: fitWdth("POST,", size, BLOCK_W),
    w3,
    x0: (W - BLOCK_W) / 2,
  };
  return M;
}

// per-letter wave that ripples across the block after it lands
const exhale = (lt) => ease.inOutCubic(seg(lt, 1.5, 1.7));
const ax = (lt, wdth, wght) => {
  const e = exhale(lt);
  return { wdth: clamp(lerp(wdth, 50, e), 50, 150), wght: lerp(wght, 100, e) };
};
function wave(lt, i, line) {
  const on = seg(lt, 1.36, 1.5) * (1 - seg(lt, 1.62, 1.72));
  return on * 16 * Math.sin(TAU * (lt * 2.2 - i * 0.11 - line * 0.22));
}

function drawGlyphs(ctx, L, ox, base, fx) {
  for (const g of L.glyphs) {
    if (!g.pts) continue;
    const o = fx ? fx(g) : null;
    if (o && o.hide) continue;
    if (!o) {
      ctx.beginPath();
      glyphPath(ctx, g.types, g.pts, ox + g.x, base);
      ctx.fill();
      continue;
    }
    const b = glyphBounds(g);
    const cx = ox + b.cx, cy = base + b.cy;
    ctx.save();
    ctx.translate(cx + (o.dx || 0), cy + (o.dy || 0));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.sx ?? 1, o.sy ?? 1);
    ctx.beginPath();
    glyphPath(ctx, g.types, g.pts, ox + g.x - cx, base - cy);
    ctx.fill();
    ctx.restore();
  }
}

// the period: lands as a paper dot, later detaches and becomes the next scene's seed
function dotState(lt) {
  const m = metrics();
  const t0 = 3 * B;
  if (lt < t0 - 0.2 || m.pEnd === undefined) return null;
  const r = m.cap * 0.165;
  const hx = m.pEnd + r * 1.35, hy = m.base[2] - r;
  // hops in from off-screen right along the baseline, landing on the beat
  const u = seg(lt, t0 - 0.2, t0);
  let x = lerp(W + 80, hx, ease.outQuad(u)), y = hy - 140 * Math.sin(Math.PI * u);
  let sx = 1, sy = 1;
  const tc = lt - t0;
  if (tc > 0) {
    const sq = 0.35 * Math.exp(-tc * 22) * Math.cos(tc * 40);
    sx = 1 + sq; sy = 1 - sq;
    y = hy + r * sq;
  }
  // detach and travel to centre, turning ink for the paper world
  const tt = seg(lt, 1.56, 1.875);
  const pp = curves.swift(tt);
  x = lerp(x, W / 2, pp);
  y = lerp(y, H / 2, pp) - Math.sin(Math.PI * pp) * 120;
  return {
    x, y, r: lerp(r, 44, pp), sx, sy,
    color: tt > 0 ? mix(PAL.paper, PAL.ink, ease.inOutCubic(tt)) : PAL.paper,
  };
}

function poster(ctx, lt) {
  const m = metrics();
  const f = fonts.display;
  ctx.fillStyle = PAL.orange;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAL.ink;

  // line 1: EVERY — letters rise from behind the baseline, condensed → justified
  {
    const L = layout(f, "EVERY", {
      size: m.size,
      axes: (i) => {
        const p = spring(lt - i * 0.035, { k: 260, c: 19 });
        return ax(lt, lerp(55, m.w1, p) + wave(lt, i, 0), WGHT);
      },
    });
    const ox = W / 2 - L.width / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, m.base[0] - m.cap - 60, W, m.cap + 72);
    ctx.clip();
    drawGlyphs(ctx, L, ox, m.base[0], (g) => {
      const p = curves.snap(seg(lt, g.i * 0.035, g.i * 0.035 + 0.42));
      return { dy: (1 - p) * m.cap * 1.3, rot: (1 - p) * 0.12 * (g.i % 2 ? 1 : -1) };
    });
    ctx.restore();
  }

  // line 2: FRAME, — springs open along the width axis from the centre
  if (lt >= B - 0.02) {
    const p = spring(lt - B, { k: 210, c: 13 });
    const L = layout(f, "POST,", {
      size: m.size,
      axes: (i) => ax(lt, lerp(50, m.w2, p) + wave(lt, i, 1), lerp(150, WGHT, ease.outCubic(seg(lt, B, B + 0.25)))),
    });
    const ox = W / 2 - L.width / 2;
    const sy = lerp(0.2, 1, curves.snap(seg(lt, B, B + 0.2)));
    drawGlyphs(ctx, L, ox, m.base[1], () => ({ sy }));
  }

  // line 3: "on" written on in serif italic, then PURPOSE drops in
  const base3 = m.base[2];
  if (lt >= 2 * B - 0.02) {
    const t0 = 2 * B;
    const L = layout(fonts.serif, "on", { size: m.ss });
    const draw = seg(lt, t0, t0 + 0.26);
    const fill = seg(lt, t0 + 0.16, t0 + 0.3);
    const sh = (1 - curves.snap(seg(lt, t0, t0 + 0.4))) * 40;
    for (const g of L.glyphs) {
      if (!g.pts) continue;
      if (fill < 1) {
        ctx.strokeStyle = PAL.ink;
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        partialContours(ctx, flatten(g.types, g.pts, 12), ease.inOutCubic(draw), m.x0 + g.x - sh, base3);
        ctx.stroke();
      }
      if (fill > 0) {
        ctx.save();
        ctx.globalAlpha = ease.outCubic(fill);
        ctx.beginPath();
        glyphPath(ctx, g.types, g.pts, m.x0 + g.x - sh, base3);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  const pStart = m.x0 + m.onW + m.size * 0.16;
  const LP = layout(f, "PURPOSE", {
    size: m.size,
    axes: (i) => ax(lt, m.w3 + wave(lt, i + 1, 2), WGHT),
  });
  m.pEnd = pStart + LP.width;
  if (lt >= 2.5 * B - 0.05) {
    const t0 = 2.5 * B;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, base3 - m.cap - 50, W, m.cap + 80);
    ctx.clip();
    drawGlyphs(ctx, LP, pStart, base3, (g) => {
      const tt = lt - t0 - g.i * 0.03;
      if (tt < 0) return { hide: true };
      const p = spring(tt, { k: 380, c: 21 });
      const sq = Math.exp(-(((tt - 0.12) / 0.05) ** 2)) * 0.14;
      return { dy: (1 - p) * -m.cap * 1.35, sx: 1 + sq, sy: 1 - sq };
    });
    ctx.restore();
  }
}

function drawDot(ctx, lt) {
  const d = dotState(lt);
  if (!d) return;
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, d.r * d.sx, d.r * d.sy, 0, 0, TAU);
  ctx.fill();
}

// live readout of the variable axes, set vertically in the margin — a detail for type people
function liveReadout(ctx, lt) {
  const m = metrics();
  const p = spring(lt - B, { k: 210, c: 13 });
  const wd = lt < B ? lerp(55, m.w1, spring(lt, { k: 260, c: 19 })) : lerp(50, m.w2, p);
  const wg = lt < B ? WGHT : lerp(150, WGHT, ease.outCubic(seg(lt, B, B + 0.25)));
  const a = seg(lt, 0.05, 0.25) * (1 - seg(lt, 1.45, 1.58));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(m.x0 - 52, H / 2);
  ctx.rotate(-Math.PI / 2);
  const o = { font: "mono", size: 14, tracking: 0.14, axes: { wght: 600 }, color: PAL.ink };
  const s = `ANYBODY VF  —  WDTH ${wd.toFixed(1).padStart(5, "0")}  /  WGHT ${String(Math.round(wg)).padStart(3, "0")}`;
  text(ctx, s, 0, 5, { ...o, align: 0.5 });
  ctx.restore();
}

const TS = 1.6; // paper bars sweep in
export default {
  hud: () => "dark",
  vignette: (lt) => lerp(0.2, 0.07, seg(lt, 1.6, 1.82)),
  blur: (lt) => (lt > 1.56 ? { samples: 2 } : null),
  render(ctx, lt) {
    poster(ctx, lt);
    liveReadout(ctx, lt);
    if (lt >= TS) {
      const rows = 9, rh = H / rows;
      ctx.fillStyle = PAL.paper;
      for (let r = 0; r < rows; r++) {
        const order = Math.abs(r - 4);
        const p = curves.swift(seg(lt, TS + order * 0.022, TS + order * 0.022 + 0.18));
        if (p <= 0) continue;
        const dir = r % 2 ? 1 : -1;
        const x = dir < 0 ? -W + p * W : W - p * W;
        ctx.fillRect(x - 1, r * rh - 0.5, W + 2, rh + 1);
      }
    }
    drawDot(ctx, lt);
  },
};
