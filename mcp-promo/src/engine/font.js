// Variable-font outline engine.
// Glyph outlines were exported on a grid of axis locations (tools/extract_fonts.py);
// here we multilinearly interpolate them so every letter can have its own
// continuously-animated weight/width, and we can stroke, morph or shatter them.

export class VarFont {
  constructor(data) {
    this.name = data.name;
    this.upm = data.upm;
    this.capHeight = data.capHeight;
    this.xHeight = data.xHeight;
    this.ascender = data.ascender;
    this.descender = data.descender;
    this.axes = data.axes;
    this.grid = data.axes.map((a) => data.grid[a]);
    this.strides = [];
    let s = 1;
    for (let i = this.axes.length - 1; i >= 0; i--) {
      this.strides[i] = s;
      s *= this.grid[i].length;
    }
    this.glyphs = {};
    for (const [ch, g] of Object.entries(data.glyphs)) {
      this.glyphs[ch] = {
        types: g.types,
        pts: g.pts.map((p) => Float32Array.from(p)),
        adv: Float32Array.from(g.adv),
      };
    }
    this.kerning = {};
    for (const [pair, v] of Object.entries(data.kern)) this.kerning[pair] = Float32Array.from(v);
    this.defaults = {};
    this.axes.forEach((a, i) => (this.defaults[a] = this.grid[i][Math.floor(this.grid[i].length / 2)]));
  }

  // → [[locIndex, weight], ...] for an axis-value object
  weights(v = {}) {
    let out = [[0, 1]];
    for (let ai = 0; ai < this.axes.length; ai++) {
      const g = this.grid[ai];
      let x = v[this.axes[ai]];
      if (x === undefined) x = this.defaults[this.axes[ai]];
      x = Math.min(g[g.length - 1], Math.max(g[0], x));
      let i = 0;
      while (i < g.length - 2 && x > g[i + 1]) i++;
      const f = g.length === 1 ? 0 : (x - g[i]) / (g[i + 1] - g[i]);
      const st = this.strides[ai];
      const next = [];
      for (const [idx, w] of out) {
        if (1 - f > 1e-6) next.push([idx + i * st, w * (1 - f)]);
        if (f > 1e-6) next.push([idx + (i + 1) * st, w * f]);
      }
      out = next;
    }
    return out;
  }

  has(ch) {
    return !!this.glyphs[ch];
  }

  outline(ch, v) {
    const g = this.glyphs[ch] || this.glyphs["?"];
    const w = this.weights(v);
    const n = g.pts[0].length;
    const out = new Float32Array(n);
    for (const [li, wt] of w) {
      const p = g.pts[li];
      for (let i = 0; i < n; i++) out[i] += p[i] * wt;
    }
    return { types: g.types, pts: out };
  }

  advance(ch, v) {
    const g = this.glyphs[ch] || this.glyphs["?"];
    let a = 0;
    for (const [li, wt] of this.weights(v)) a += g.adv[li] * wt;
    return a;
  }

  kern(a, b, v) {
    const k = this.kerning[a + b];
    if (!k) return 0;
    let s = 0;
    for (const [li, wt] of this.weights(v)) s += k[li] * wt;
    return s;
  }
}

// Lay out a single line. `axes` is an object or (index, char) => object.
// Returns glyph records in px with y-down coordinates relative to the baseline origin.
export function layout(font, text, { size = 100, axes = {}, tracking = 0, kern = true } = {}) {
  const sc = size / font.upm;
  const chars = [...text];
  const glyphs = [];
  let x = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const v = typeof axes === "function" ? axes(i, ch) : axes;
    const adv = font.advance(ch, v) * sc;
    let k = 0;
    if (kern && i < chars.length - 1) {
      const vn = typeof axes === "function" ? axes(i + 1, chars[i + 1]) : axes;
      // average the two letters' locations for the pair adjustment
      const mid = {};
      for (const a of font.axes) mid[a] = ((v[a] ?? font.defaults[a]) + (vn[a] ?? font.defaults[a])) / 2;
      k = font.kern(ch, chars[i + 1], mid) * sc;
    }
    let types = "", pts = null;
    if (ch !== " ") {
      const o = font.outline(ch, v);
      types = o.types;
      pts = o.pts;
      for (let j = 0; j < pts.length; j += 2) {
        pts[j] *= sc;
        pts[j + 1] *= -sc;
      }
    }
    glyphs.push({ ch, i, x, adv, types, pts, axes: v });
    x += adv + k + tracking * size;
  }
  const width = glyphs.length ? x - tracking * size : 0;
  return { glyphs, width, size, capHeight: font.capHeight * sc, xHeight: font.xHeight * sc, scale: sc };
}

// Append a glyph outline to the current path at (ox, oy), optional uniform scale about origin.
export function glyphPath(ctx, types, pts, ox = 0, oy = 0, s = 1) {
  let j = 0;
  for (let i = 0; i < types.length; i++) {
    switch (types[i]) {
      case "M": ctx.moveTo(ox + pts[j] * s, oy + pts[j + 1] * s); j += 2; break;
      case "L": ctx.lineTo(ox + pts[j] * s, oy + pts[j + 1] * s); j += 2; break;
      case "Q": ctx.quadraticCurveTo(ox + pts[j] * s, oy + pts[j + 1] * s, ox + pts[j + 2] * s, oy + pts[j + 3] * s); j += 4; break;
      case "C": ctx.bezierCurveTo(ox + pts[j] * s, oy + pts[j + 1] * s, ox + pts[j + 2] * s, oy + pts[j + 3] * s, ox + pts[j + 4] * s, oy + pts[j + 5] * s); j += 6; break;
      case "Z": ctx.closePath(); break;
    }
  }
}

// Glyph bounding box from its points (control points included; fine for layout)
export function glyphBounds(g) {
  if (!g.pts || !g.pts.length) return { x0: g.x, y0: 0, x1: g.x + g.adv, y1: 0, cx: g.x + g.adv / 2, cy: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let j = 0; j < g.pts.length; j += 2) {
    const x = g.pts[j], y = g.pts[j + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0: g.x + x0, y0, x1: g.x + x1, y1, cx: g.x + (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// Flatten an outline into polyline contours: [[x,y,x,y...], ...] with cumulative lengths
export function flatten(types, pts, steps = 10) {
  const contours = [];
  let cur = null, j = 0, px = 0, py = 0, sx = 0, sy = 0;
  const push = (x, y) => { cur.push(x, y); px = x; py = y; };
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    if (t === "M") {
      cur = [];
      contours.push(cur);
      sx = pts[j]; sy = pts[j + 1];
      push(sx, sy); j += 2;
    } else if (t === "L") {
      push(pts[j], pts[j + 1]); j += 2;
    } else if (t === "Q") {
      const x0 = px, y0 = py, cx = pts[j], cy = pts[j + 1], x1 = pts[j + 2], y1 = pts[j + 3];
      for (let s = 1; s <= steps; s++) {
        const u = s / steps, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        push(a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1);
      }
      j += 4;
    } else if (t === "C") {
      const x0 = px, y0 = py;
      const [c1x, c1y, c2x, c2y, x1, y1] = [pts[j], pts[j + 1], pts[j + 2], pts[j + 3], pts[j + 4], pts[j + 5]];
      for (let s = 1; s <= steps; s++) {
        const u = s / steps, v = 1 - u;
        push(
          v * v * v * x0 + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * x1,
          v * v * v * y0 + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * y1
        );
      }
      j += 6;
    } else if (t === "Z") {
      if (cur && (px !== sx || py !== sy)) push(sx, sy);
    }
  }
  return contours.map((c) => {
    const len = [0];
    for (let k = 2; k < c.length; k += 2) len.push(len[len.length - 1] + Math.hypot(c[k] - c[k - 2], c[k + 1] - c[k - 1]));
    return { pts: c, len, total: len[len.length - 1] };
  });
}

// Stroke the first `p` (0..1) of every contour — the classic "write-on".
export function partialContours(ctx, contours, p, ox = 0, oy = 0, start = 0) {
  for (const c of contours) {
    const a = c.total * Math.max(0, start), b = c.total * Math.min(1, p);
    if (b <= a) continue;
    const P = c.pts, L = c.len;
    let begun = false;
    for (let k = 0; k < L.length - 1; k++) {
      const l0 = L[k], l1 = L[k + 1];
      if (l1 < a) continue;
      if (l0 > b) break;
      const x0 = P[2 * k], y0 = P[2 * k + 1], x1 = P[2 * k + 2], y1 = P[2 * k + 3];
      const span = l1 - l0 || 1;
      const u0 = Math.max(0, (a - l0) / span), u1 = Math.min(1, (b - l0) / span);
      if (!begun) {
        ctx.moveTo(ox + x0 + (x1 - x0) * u0, oy + y0 + (y1 - y0) * u0);
        begun = true;
      }
      ctx.lineTo(ox + x0 + (x1 - x0) * u1, oy + y0 + (y1 - y0) * u1);
    }
  }
}
