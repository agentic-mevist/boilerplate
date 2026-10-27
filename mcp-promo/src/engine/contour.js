// Marching squares → closed vector contours of an implicit field (metaballs).
// Loops are chained into one path and filled even-odd, so blobs stay crisp and
// seam-free at any size — no raster blur/threshold tricks.

// edge ids: top=0 right=1 bottom=2 left=3 ; table → list of [edgeA, edgeB]
const T = [
  [], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], null, [[0, 2]], [[3, 0]],
  [[3, 0]], [[0, 2]], null, [[0, 1]], [[3, 1]], [[1, 2]], [[3, 2]], [],
];

export function isoPath(ctx, field, { x0 = 0, y0 = 0, x1, y1, cell = 8, iso = 1, ox = 0, oy = 0 }) {
  const nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell);
  const sx = nx + 1;
  const V = new Float32Array(sx * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    const y = y0 + j * cell;
    for (let i = 0; i <= nx; i++) V[j * sx + i] = field(x0 + i * cell, y) - iso;
  }
  for (let i = 0; i <= nx; i++) { V[i] = -1; V[ny * sx + i] = -1; }
  for (let j = 0; j <= ny; j++) { V[j * sx] = -1; V[j * sx + nx] = -1; }

  // global edge id: horizontal (i,j)->(i+1,j) = 2*(j*sx+i); vertical (i,j)->(i,j+1) = 2*(j*sx+i)+1
  const pts = new Map();
  const point = (id) => {
    let p = pts.get(id);
    if (p) return p;
    const base = id >> 1, i = base % sx, j = (base / sx) | 0;
    const va = V[base];
    const vb = id & 1 ? V[base + sx] : V[base + 1];
    const t = va / (va - vb);
    p = id & 1 ? [x0 + i * cell, y0 + (j + t) * cell] : [x0 + (i + t) * cell, y0 + j * cell];
    pts.set(id, p);
    return p;
  };
  const segA = [], segB = [];
  const adj = new Map();
  const link = (e, s) => {
    const l = adj.get(e);
    if (l) l.push(s); else adj.set(e, [s]);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = V[j * sx + i], b = V[j * sx + i + 1], c = V[(j + 1) * sx + i + 1], d = V[(j + 1) * sx + i];
      const k = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
      if (k === 0 || k === 15) continue;
      let segs = T[k];
      if (!segs) {
        const center = (a + b + c + d) / 4 > 0;
        if (k === 5) segs = center ? [[3, 0], [1, 2]] : [[0, 1], [3, 2]];
        else segs = center ? [[0, 1], [3, 2]] : [[3, 0], [1, 2]];
      }
      const E = [2 * (j * sx + i), 2 * (j * sx + i + 1) + 1, 2 * ((j + 1) * sx + i), 2 * (j * sx + i) + 1];
      for (const [ea, eb] of segs) {
        const s = segA.length;
        segA.push(E[ea]);
        segB.push(E[eb]);
        link(E[ea], s);
        link(E[eb], s);
      }
    }
  }
  const used = new Uint8Array(segA.length);
  let loops = 0;
  for (let s0 = 0; s0 < segA.length; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const start = segA[s0];
    let p = point(start);
    ctx.moveTo(p[0] + ox, p[1] + oy);
    let e = segB[s0], s = s0;
    for (let guard = 0; guard < 100000; guard++) {
      p = point(e);
      ctx.lineTo(p[0] + ox, p[1] + oy);
      if (e === start) break;
      const l = adj.get(e);
      const nxt = l[0] === s ? l[1] : l[0];
      if (nxt === undefined || used[nxt]) break;
      used[nxt] = 1;
      e = segA[nxt] === e ? segB[nxt] : segA[nxt];
      s = nxt;
    }
    ctx.closePath();
    loops++;
  }
  return loops;
}

// Metaball field from balls [{x,y,r}] (r = radius of an isolated ball's iso contour)
export function ballField(balls) {
  return (x, y) => {
    let f = 0;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const dx = x - b.x, dy = y - b.y;
      f += (b.r * b.r) / (dx * dx + dy * dy + 1e-3);
    }
    return f;
  };
}
