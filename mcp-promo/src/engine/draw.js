// Drawing helpers shared by scenes.
import { fonts } from "../fonts.js";
import { layout, glyphPath } from "./font.js";
import { TAU } from "./math.js";

export function circle(ctx, x, y, r) {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

export function fillCircle(ctx, x, y, r, color) {
  if (r <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// Ellipse with independent scale + rotation (squash & stretch)
export function fillBlob(ctx, x, y, r, sx, sy, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function line(ctx, x0, y0, x1, y1) {
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
}

// Draw a text line using vector outlines. align: 0=left, .5=center, 1=right.
// Returns the layout so callers can position decorations.
export function text(ctx, str, x, y, { font = "mono", size = 16, axes = {}, tracking = 0, align = 0, color, kern = true } = {}) {
  const f = fonts[font];
  const L = layout(f, str, { size, axes, tracking, kern });
  const ox = x - L.width * align;
  if (color) ctx.fillStyle = color;
  ctx.beginPath();
  for (const g of L.glyphs) if (g.pts) glyphPath(ctx, g.types, g.pts, ox + g.x, y);
  ctx.fill();
  L.ox = ox;
  return L;
}

// Rounded rectangle path
export function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Text "decode" scramble: reveals target string progressively with random glyphs before it
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_*+<>";
export function scramble(target, p, seed = 0) {
  const n = target.length;
  let out = "";
  for (let i = 0; i < n; i++) {
    const reveal = p * (n + 4) - i;
    if (reveal >= 4 || target[i] === " ") out += target[i];
    else if (reveal > 0) {
      const k = (Math.floor(p * 60) + i * 7 + seed * 13) % GLYPHS.length;
      out += GLYPHS[k];
    } else out += " ";
  }
  return out;
}
