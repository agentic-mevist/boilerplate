// Globe + flat map rendering (d3-geo), city coordinates and the PoP point cloud.
import { geoOrthographic, geoNaturalEarth1, geoMercator, geoPath, geoDistance, geoInterpolate, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import fs from 'fs';
import path from 'path';
import { ROOT, C, clamp, lerp, rng, sCircle, glowDot } from './core.mjs';

const load = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/world-atlas', f), 'utf8'));
const land110 = feature(load('land-110m.json'), load('land-110m.json').objects.land);
const land50 = feature(load('land-50m.json'), load('land-50m.json').objects.land);
const graticule = geoGraticule10();

export const CITY = {
  frankfurt: [8.68, 50.11], sydney: [151.21, -33.87], london: [-0.13, 51.5], paris: [2.35, 48.86], amsterdam: [4.9, 52.37],
  newyork: [-74.0, 40.71], ashburn: [-77.49, 39.04], chicago: [-87.63, 41.88], dallas: [-96.8, 32.78], losangeles: [-118.24, 34.05],
  seattle: [-122.33, 47.6], miami: [-80.19, 25.76], toronto: [-79.38, 43.65], mexico: [-99.13, 19.43], saopaulo: [-46.63, -23.55],
  buenosaires: [-58.38, -34.6], santiago: [-70.67, -33.45], bogota: [-74.07, 4.71], lima: [-77.04, -12.05], tokyo: [139.69, 35.68],
  seoul: [126.98, 37.57], singapore: [103.82, 1.35], hongkong: [114.17, 22.32], mumbai: [72.88, 19.08], dubai: [55.27, 25.2],
  johannesburg: [28.05, -26.2], lagos: [3.38, 6.52], nairobi: [36.82, -1.29], cairo: [31.24, 30.04], istanbul: [28.98, 41.01],
  warsaw: [21.01, 52.23], stockholm: [18.07, 59.33], madrid: [-3.7, 40.42], milan: [9.19, 45.46], luxembourg: [6.13, 49.61],
  melbourne: [144.96, -37.81], perth: [115.86, -31.95], auckland: [174.76, -36.85], jakarta: [106.85, -6.2], manila: [120.98, 14.6],
  bangkok: [100.5, 13.76], almaty: [76.89, 43.24], tbilisi: [44.79, 41.72], riyadh: [46.68, 24.71], telaviv: [34.78, 32.08],
  brisbane: [153.03, -27.47], fortaleza: [-38.54, -3.72], denver: [-104.99, 39.74], vienna: [16.37, 48.21], helsinki: [24.94, 60.17],
};

// ~210 PoP-like points: real hub cities plus a few satellites around the big ones (illustrative).
const HUBS = [
  // Europe
  [8.68, 50.11], [-0.13, 51.5], [2.35, 48.86], [4.9, 52.37], [6.13, 49.61], [13.4, 52.52], [11.58, 48.14], [16.37, 48.21], [14.42, 50.08],
  [21.01, 52.23], [19.04, 47.5], [26.1, 44.43], [23.32, 42.7], [18.07, 59.33], [10.75, 59.91], [12.57, 55.68], [24.94, 60.17], [24.1, 56.95],
  [25.28, 54.69], [-3.7, 40.42], [2.17, 41.39], [-9.14, 38.72], [9.19, 45.46], [12.5, 41.9], [8.54, 47.37], [6.14, 46.2], [4.35, 50.85],
  [-6.26, 53.35], [-2.24, 53.48], [5.37, 43.3], [23.73, 37.98], [28.98, 41.01], [30.52, 50.45], [27.56, 53.9], [15.98, 45.81], [20.46, 44.79],
  [14.51, 46.06], [-1.55, 47.22], [7.0, 51.45], [9.99, 53.55], [17.03, 51.11], [21.0, 52.0], [22.27, 60.45], [-8.6, 41.15], [13.0, 55.6],
  // North America
  [-74.0, 40.71], [-77.49, 39.04], [-87.63, 41.88], [-96.8, 32.78], [-118.24, 34.05], [-122.33, 47.6], [-121.89, 37.34], [-80.19, 25.76],
  [-84.39, 33.75], [-79.38, 43.65], [-73.57, 45.5], [-123.12, 49.28], [-104.99, 39.74], [-112.07, 33.45], [-95.37, 29.76], [-93.27, 44.98],
  [-71.06, 42.36], [-75.17, 39.95], [-90.07, 29.95], [-115.14, 36.17], [-122.68, 45.52], [-81.69, 41.5], [-86.16, 39.77], [-114.07, 51.05],
  [-99.13, 19.43], [-103.35, 20.66], [-100.32, 25.69], [-82.37, 23.11], [-79.52, 8.98], [-66.1, 18.47],
  // South America
  [-46.63, -23.55], [-43.17, -22.91], [-58.38, -34.6], [-70.67, -33.45], [-74.07, 4.71], [-77.04, -12.05], [-38.54, -3.72], [-49.27, -25.43],
  [-51.23, -30.03], [-56.16, -34.9], [-66.9, 10.48], [-78.47, -0.18], [-34.88, -8.05], [-48.5, -1.46], [-60.02, -3.12], [-47.88, -15.79],
  // Asia
  [139.69, 35.68], [135.5, 34.69], [126.98, 37.57], [129.08, 35.18], [103.82, 1.35], [114.17, 22.32], [121.47, 31.23], [116.4, 39.9],
  [113.26, 23.13], [121.56, 25.03], [72.88, 19.08], [77.21, 28.61], [80.27, 13.08], [77.59, 12.97], [88.36, 22.57], [100.5, 13.76],
  [106.85, -6.2], [120.98, 14.6], [101.69, 3.14], [105.85, 21.03], [106.7, 10.78], [76.89, 43.24], [71.43, 51.13], [69.24, 41.3],
  [55.27, 25.2], [54.37, 24.45], [46.68, 24.71], [51.53, 25.29], [50.58, 26.23], [44.79, 41.72], [44.51, 40.18], [49.87, 40.41],
  [34.78, 32.08], [35.5, 33.89], [58.38, 23.59], [67.0, 24.86], [74.34, 31.55], [90.41, 23.81], [96.16, 16.84], [104.92, 11.56],
  [37.62, 55.75], [30.31, 59.94], [60.6, 56.84], [82.92, 55.03], [131.89, 43.12], [141.35, 43.06], [130.4, 33.59], [126.7, 37.45],
  // Africa
  [28.05, -26.2], [18.42, -33.93], [31.03, -29.86], [3.38, 6.52], [-0.19, 5.6], [36.82, -1.29], [31.24, 30.04], [-7.59, 33.57],
  [10.18, 36.81], [3.06, 36.75], [-17.45, 14.69], [38.76, 9.03], [32.58, 0.35], [39.27, -6.79], [47.52, -18.91], [13.23, -8.84],
  // Oceania
  [151.21, -33.87], [144.96, -37.81], [153.03, -27.47], [115.86, -31.95], [138.6, -34.93], [174.76, -36.85], [172.64, -43.53], [149.13, -35.28],
];
export const POPS = (() => {
  const r = rng(42), out = HUBS.map(p => [...p]);
  const big = [0, 1, 2, 3, 45, 46, 47, 48, 49, 50, 75, 91, 94, 95, 102, 115, 141, 157];
  while (out.length < 214) {
    const h = HUBS[big[Math.floor(r() * big.length)] % HUBS.length];
    out.push([h[0] + (r() - 0.5) * 9, h[1] + (r() - 0.5) * 6]);
  }
  return out;
})();
// order of appearance: sweep east→west-ish with noise so the counter ticks up across the globe
export const POP_ORDER = POPS.map((p, i) => [i, ((p[0] + 200) % 360) / 360 + rng(i + 7)() * 0.25]).sort((a, b) => a[1] - b[1]).map(x => x[0]);

export function globeProj(cx, cy, r, lon, lat, tilt = 0) {
  return geoOrthographic().scale(r).translate([cx, cy]).rotate([-lon, -lat, tilt]).clipAngle(90).precision(0.5);
}
export const visible = (proj, lonlat) => {
  const rot = proj.rotate();
  return geoDistance(lonlat, [-rot[0], -rot[1]]) < Math.PI / 2 - 0.02;
};

// Globe: halo, ocean, land, coastlines, sketchy outline.
export function drawGlobe(ctx, proj, { alpha = 1, detail = 'low', outline = 1, seed = 11, landColor = C.land, glow = 1, grat = 0 } = {}) {
  if (alpha <= 0) return;
  const [cx, cy] = proj.translate(), r = proj.scale();
  ctx.save(); ctx.globalAlpha *= alpha;
  if (glow) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.5);
    g.addColorStop(0, 'rgba(120,160,255,0.22)'); g.addColorStop(1, 'rgba(120,160,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2); ctx.fill();
  }
  const sea = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  sea.addColorStop(0, '#1b2a5e'); sea.addColorStop(1, '#0b1431');
  ctx.fillStyle = sea; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  const p = geoPath(proj, ctx);
  if (grat) { ctx.beginPath(); p(graticule); ctx.strokeStyle = `rgba(150,180,255,${0.08 * grat})`; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.beginPath(); p(detail === 'high' ? land50 : land110); ctx.fillStyle = landColor; ctx.fill();
  ctx.strokeStyle = C.landLine; ctx.lineWidth = r > 400 ? 1.6 : 1.1; ctx.stroke();
  // terminator shading
  const sh = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.2, cx, cy, r * 1.02);
  sh.addColorStop(0, 'rgba(255,255,255,0.05)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  if (outline > 0) { ctx.strokeStyle = C.white; ctx.lineWidth = r > 300 ? 3 : 2.4; sCircle(ctx, cx, cy, r, { seed, rough: r > 300 ? 2 : 1.2, draw: outline, overshoot: 0.04 }); }
  ctx.restore();
}

// Great-circle arc between two lon/lat points, lifted above the surface; returns screen points (null when hidden)
export function globeArc(proj, a, b, lift = 0.18, n = 48) {
  const it = geoInterpolate(a, b), [cx, cy] = proj.translate(), pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, ll = it(f);
    if (!visible(proj, ll)) { pts.push(null); continue; }
    const [x, y] = proj(ll), h = 1 + lift * Math.sin(Math.PI * f);
    pts.push([cx + (x - cx) * h, cy + (y - cy) * h]);
  }
  return pts;
}
export function strokePts(ctx, pts, draw = 1) {
  const m = Math.floor((pts.length - 1) * clamp(draw)) + 1;
  ctx.beginPath(); let pen = false;
  for (let i = 0; i < m; i++) {
    const p = pts[i]; if (!p) { pen = false; continue; }
    pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true;
  }
  ctx.stroke();
}
export function ptAt(pts, f) {
  const i = clamp(f) * (pts.length - 1), a = Math.floor(i), b = Math.min(pts.length - 1, a + 1);
  if (!pts[a] || !pts[b]) return null;
  return [lerp(pts[a][0], pts[b][0], i - a), lerp(pts[a][1], pts[b][1], i - a)];
}

// Flat map projection fitted into a box. center = [lon, lat]
export function mapProj(x, y, w, h, { center = [80, 10], scale = 1, kind = 'ne' } = {}) {
  const base = kind === 'merc' ? geoMercator() : geoNaturalEarth1();
  const pr = base.rotate([-center[0], 0]).center([0, center[1]]).translate([x + w / 2, y + h / 2]);
  pr.scale((w / 5.4) * scale);
  return pr;
}
export function drawMap(ctx, proj, box, { alpha = 1, detail = 'low', landColor = C.land, coast = C.landLine, frame = false } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (box) { ctx.beginPath(); ctx.rect(box[0], box[1], box[2], box[3]); ctx.clip(); }
  const p = geoPath(proj, ctx);
  ctx.beginPath(); p(detail === 'high' ? land50 : land110);
  ctx.fillStyle = landColor; ctx.fill(); ctx.strokeStyle = coast; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.restore();
}
export { geoInterpolate, geoDistance };
