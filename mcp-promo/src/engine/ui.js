// Interface drawing for the product scenes: native Space Grotesk / JetBrains
// Mono text, cards, image fills, and the headline that rises through a mask.
import { fonts } from "../fonts.js";
import { layout, glyphPath } from "./font.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "./math.js";
import { rrect } from "./draw.js";
import { PAL } from "../timeline.js";

const ALIGN = ["left", "center", "right"];
function native(ctx, family, str, x, y, { size = 24, w = 500, color, align = 0, ls = 0 } = {}) {
  ctx.font = `${w} ${size}px "${family}"`;
  ctx.textAlign = ALIGN[align === 0.5 ? 1 : align === 1 ? 2 : 0];
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${ls}px`;
  if (color) ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  const m = ctx.measureText(str).width;
  ctx.letterSpacing = "0px";
  return m;
}
export const sg = (ctx, str, x, y, o) => native(ctx, "Space Grotesk", str, x, y, o);
export const jb = (ctx, str, x, y, o) => native(ctx, "JetBrains Mono", str, x, y, o);
export function measure(ctx, str, { size = 24, w = 500, family = "Space Grotesk" } = {}) {
  ctx.font = `${w} ${size}px "${family}"`;
  return ctx.measureText(str).width;
}

// a filled rounded card with an optional soft shadow and hairline
export function card(ctx, x, y, w, h, { r = 18, fill = "#fff", stroke, shadow = 0, lw = 1.5 } = {}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = `rgba(0,0,0,${0.28 * shadow})`;
    ctx.shadowBlur = 40 * shadow;
    ctx.shadowOffsetY = 18 * shadow;
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  rrect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.beginPath();
    rrect(ctx, x, y, w, h, r);
    ctx.stroke();
  }
}

// draw an image (or canvas) as object-fit: cover inside a rounded rect
export function cover(ctx, img, x, y, w, h, r = 0, { zoom = 1, ax = 0.5, ay = 0.5 } = {}) {
  if (!img) return;
  const iw = img.width, ih = img.height;
  const s = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  ctx.save();
  ctx.beginPath();
  rrect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) * ax, y + (h - dh) * ay, dw, dh);
  ctx.restore();
}

export function circleImg(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();
  const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
  ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
  ctx.restore();
}

// 0 → 1 with a little overshoot, starting at t0
export const pop = (lt, t0, k = 300, c = 20) => spring(lt - t0, { k, c });
export const typed = (str, p) => str.slice(0, Math.round(clamp(p) * str.length));

// a pill tag in mono, e.g. the MCP tool being called
export function pill(ctx, str, x, y, { size = 20, fg = PAL.ink, bg = PAL.paper, pad = 14, h = 40, align = 0, dot } = {}) {
  const tw = measure(ctx, str, { size, w: 500, family: "JetBrains Mono" }) + (dot ? 22 : 0);
  const w = tw + 2 * pad;
  const x0 = x - w * align;
  card(ctx, x0, y - h / 2, w, h, { r: h / 2, fill: bg });
  if (dot) {
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(x0 + pad + 6, y, 6, 0, TAU);
    ctx.fill();
  }
  jb(ctx, str, x0 + pad + (dot ? 22 : 0), y + size * 0.36, { size, color: fg });
  return w;
}

// Big display headline (Anybody, vector), one line per entry, each rising
// through its own baseline mask on the beat; returns the block's height.
export function riseLines(ctx, lt, lines, x, y, { size = 120, color = PAL.ink, lead = 0.98, t0 = 0, stagger = 0.09, wdth = 100, wght = 880, align = 0, maxW = 0 } = {}) {
  const f = fonts.display;
  if (maxW) {
    const widest = Math.max(...lines.map((ln) => layout(f, ln, { size, axes: { wdth, wght } }).width));
    if (widest > maxW) size *= maxW / widest;
  }
  const cap = f.capHeight * (size / f.upm);
  lines.forEach((ln, li) => {
    const base = y + cap + li * size * lead;
    const tl = t0 + li * stagger;
    const p = curves.snap(seg(lt, tl, tl + 0.45));
    if (p <= 0) return;
    const L = layout(f, ln, {
      size,
      axes: (i) => {
        const q = spring(lt - tl - i * 0.018, { k: 240, c: 19 });
        return { wdth: lerp(60, wdth, q), wght: lerp(300, wght, clamp(q)) };
      },
    });
    const ox = x - L.width * align;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, base - cap * 1.35, 1920, cap * 1.6);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const g of L.glyphs) if (g.pts) glyphPath(ctx, g.types, g.pts, ox + g.x, base + (1 - p) * cap * 1.3);
    ctx.fill();
    ctx.restore();
  });
  return lines.length * size * lead;
}

// Serif italic line written on with a clip sweep
export function serifLine(ctx, lt, str, x, y, { size = 60, color = PAL.ink, t0 = 0, d = 0.4, align = 0 } = {}) {
  const p = seg(lt, t0, t0 + d);
  if (p <= 0) return 0;
  const L = layout(fonts.serif, str, { size });
  const ox = x - L.width * align;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox - 20, y - size * 1.1, (L.width + 40) * curves.glide(p), size * 1.5);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const g of L.glyphs) if (g.pts) glyphPath(ctx, g.types, g.pts, ox + g.x, y + (1 - curves.snap(p)) * 16);
  ctx.fill();
  ctx.restore();
  return L.width;
}

// the HandlePilot mark
export function logo(ctx, env, cx, cy, r, rot = 0) {
  const img = env.images.logo;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.drawImage(img, -r, -r, 2 * r, 2 * r);
  ctx.restore();
}

// whip in from the right on the downbeat, whip out to the left on the last 8th
export function whip(lt, len, { inD = 0.32, outD = 0.16 } = {}) {
  const pin = curves.snap(seg(lt, 0, inD));
  const pout = ease.inCubic(seg(lt, len - outD, len));
  return (1 - pin) * 700 - pout * 1400;
}

export { alpha };

// ── HandlePilot brand (the website's style guide) ──────────────────────────
// Inter, tight headlines (600, -0.045em), the green highlighter "mark" behind
// key words, uppercase eyebrows, white cards with hairline borders.
import { HP } from "../timeline.js";
export const it = (ctx, str, x, y, o = {}) => native(ctx, "Inter", str, x, y, { w: 500, ...o });
export const tight = (size) => -0.045 * size;
export function measureInter(ctx, str, { size = 24, w = 600, ls = 0 } = {}) {
  ctx.font = `${w} ${size}px "Inter"`;
  ctx.letterSpacing = `${ls}px`;
  const m = ctx.measureText(str).width;
  ctx.letterSpacing = "0px";
  return m;
}

// "Look up [any account.]" → [{ s: "Look up ", mark: false }, { s: "any account.", mark: true }]
function parseMarks(line) {
  const out = [];
  const re = /\[([^\]]*)\]|([^[]+)/g;
  let m;
  while ((m = re.exec(line))) out.push(m[1] !== undefined ? { s: m[1], mark: true } : { s: m[2], mark: false });
  return out;
}

// The green highlighter: drawn like the site's <mark> (content box of the
// line, padding 0 .11em .03em, radius 5px at 16px).
export function markRect(ctx, x, base, w, size, p = 1, color = HP.green) {
  if (p <= 0) return;
  const px = 0.11 * size, top = base - 0.93 * size, h = 1.18 * size;
  ctx.fillStyle = color;
  ctx.beginPath();
  rrect(ctx, x - px, top, (w + 2 * px) * p, h, Math.min(0.09 * size, ((w + 2 * px) * p) / 2));
  ctx.fill();
}

// Headline: one entry per line, each rising through its own mask on the beat,
// then the marked words get highlighted with a left-to-right sweep.
// Returns { h, size, lines: [{ x, base, w }] }.
export function head(ctx, lt, lines, x, y, {
  size = 110, color = HP.ink, markInk = HP.ink, markColor = HP.green, t0 = 0, stagger = 0.08, lead = 1.08,
  align = 0, maxW = 0, w = 600, markAt = 0.3, markD = 0.32, rise = 0.42,
} = {}) {
  const parsed = lines.map(parseMarks);
  const ls = (s) => tight(s);
  const widthOf = (segs, s) => segs.reduce((a, g) => a + measureInter(ctx, g.s, { size: s, w, ls: ls(s) }), 0);
  if (maxW) {
    const widest = Math.max(...parsed.map((p) => widthOf(p, size)));
    if (widest > maxW) size *= maxW / widest;
  }
  const out = [];
  parsed.forEach((segs, li) => {
    const base = y + size * 0.73 + li * size * lead;
    const tl = t0 + li * stagger;
    const p = curves.snap(seg(lt, tl, tl + rise));
    const lw = widthOf(segs, size);
    const x0 = x - lw * align;
    out.push({ x: x0, base, w: lw });
    if (p <= 0) return;
    // marks first, under the words
    let cx = x0;
    const pm = curves.glide(seg(lt, tl + markAt, tl + markAt + markD));
    for (const g of segs) {
      const gw = measureInter(ctx, g.s.replace(/\s+$/, ""), { size, w, ls: ls(size) });
      if (g.mark) markRect(ctx, cx, base, gw, size, pm, markColor);
      cx += measureInter(ctx, g.s, { size, w, ls: ls(size) });
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, base - size * 1.02, 1920, size * 1.32);
    ctx.clip();
    cx = x0;
    const dy = (1 - p) * size * 1.05;
    for (const g of segs) {
      const col = g.mark && pm > 0.5 ? markInk : color;
      cx += native(ctx, "Inter", g.s, cx, base + dy, { size, w, color: col, ls: ls(size) });
    }
    ctx.restore();
  });
  return { h: lines.length * size * lead, size, lines: out };
}

// uppercase label, as the site's .eyebrow
export function eyebrow(ctx, str, x, y, { size = 20, color = HP.soft, align = 0, w = 500 } = {}) {
  return native(ctx, "Inter", str.toUpperCase(), x, y, { size, w, color, align, ls: 0.1 * size });
}

// body line that fades up into place
export function body(ctx, lt, str, x, y, { size = 36, color = HP.muted, t0 = 0, d = 0.35, align = 0, w = 400 } = {}) {
  const p = seg(lt, t0, t0 + d);
  if (p <= 0) return 0;
  ctx.save();
  ctx.globalAlpha *= curves.glide(p);
  const r = native(ctx, "Inter", str, x, y + (1 - curves.snap(p)) * 18, { size, w, color, align, ls: -0.01 * size });
  ctx.restore();
  return r;
}

// an icon from env.icons, centred on (cx, cy)
export function icon(ctx, env, name, cx, cy, size, tint = "ink") {
  const set = env.icons && env.icons[name];
  if (!set) return;
  const img = set[tint] || set.ink;
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
}

// a soft square tile with a line icon in it, like the site's floating icons
export function iconTile(ctx, env, name, cx, cy, s, { fill = HP.skyPanel, tint = "blue", r = 0.26, stroke } = {}) {
  card(ctx, cx - s / 2, cy - s / 2, s, s, { r: s * r, fill, stroke });
  icon(ctx, env, name, cx, cy, s * 0.5, tint);
}

// the site's white card: hairline border, faint lift
export function hpCard(ctx, x, y, w, h, { r = 22, fill = HP.white, stroke = HP.line, shadow = 0.25 } = {}) {
  card(ctx, x, y, w, h, { r, fill, stroke, shadow, lw: 1.5 });
}

// the four-point sparkle the site puts next to the mark (✦ has no Inter glyph)
export function sparkle(ctx, cx, cy, r, color = HP.blue, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  for (let i = 1; i <= 4; i++) {
    const a = (i * Math.PI) / 2, c = a - Math.PI / 4;
    ctx.quadraticCurveTo(Math.cos(c) * r * 0.16, Math.sin(c) * r * 0.16, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// a play triangle (the views badge), drawn so it never depends on a glyph
export function playTri(ctx, x, cy, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, cy - s / 2);
  ctx.lineTo(x + s * 0.88, cy);
  ctx.lineTo(x, cy + s / 2);
  ctx.closePath();
  ctx.fill();
}
