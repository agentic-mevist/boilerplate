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
