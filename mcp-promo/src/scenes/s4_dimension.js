// 04 — 3D
// The orange disc inflates into a flat-shaded icosphere (320 tris), explodes
// along its normals, and every face flies home into a torus that has exactly
// 320 triangles too. The torus turns to face us and we dolly through its hole
// — a portal into the next shot.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, TAU, mix, ramp, hash, alpha } from "../engine/math.js";
import { v3, rotX, rotZ, mmul, apply, rotAxis, icosphere, torus, centroid, faceNormal } from "../engine/three.js";
import { text, scramble } from "../engine/draw.js";
import s5 from "./s5_particles.js";

const B = BEAT;
const CX = W / 2, CY = H / 2;
const DIST = 4.5;
const F = 230 * Math.sqrt(DIST * DIST - 1); // sphere silhouette radius = 230px
const TR = 1.0, Tr = 0.42;

// ── meshes + face correspondence ─────────────────────────────────────────────
const SPH = icosphere(2);
const TOR = torus(TR, Tr, 16, 10);
const az = (c) => Math.atan2(c[1], c[0]);
const sphOrder = SPH.map((t, i) => ({ i, c: centroid(t) }))
  .sort((a, b) => az(a.c) - az(b.c));
const groups = [];
for (let g = 0; g < 16; g++) groups.push(sphOrder.slice(g * 20, g * 20 + 20).sort((a, b) => a.c[2] - b.c[2]));
// torus u-sector boundaries start at angle 0; sphere azimuth sorted from -π → rotate to align
const torSorted = TOR.map((t, i) => ({ i, t })).sort((a, b) => Math.floor(a.t.u) - Math.floor(b.t.u) || a.t.v - b.t.v);
const FACES = [];
for (let g = 0; g < 16; g++) {
  const tg = torSorted.slice(g * 20, g * 20 + 20);
  for (let k = 0; k < 20; k++) {
    const s = SPH[groups[(g + 8) % 16][k].i];
    let t = tg[k].t.slice();
    // windings: both outward
    const ns = faceNormal(s), cs = centroid(s);
    let S = v3.dot(ns, cs) < 0 ? [s[0], s[2], s[1]] : s.slice();
    const ct = centroid(t), ring = [TR * Math.cos(az(ct)), TR * Math.sin(az(ct)), 0];
    if (v3.dot(faceNormal(t), v3.sub(ct, ring)) < 0) t = [t[0], t[2], t[1]];
    // best cyclic vertex match
    let best = t, bd = Infinity;
    for (let r = 0; r < 3; r++) {
      const tt = [t[r], t[(r + 1) % 3], t[(r + 2) % 3]];
      const d = tt.reduce((acc, v, j) => acc + v3.len(v3.sub(v, S[j])), 0);
      if (d < bd) { bd = d; best = tt; }
    }
    const id = FACES.length;
    FACES.push({
      S, T: best, cS: centroid(S), nS: faceNormal(S),
      axis: v3.norm([hash(id * 3 + 1) - 0.5, hash(id * 3 + 2) - 0.5, hash(id * 3 + 3) - 0.5]),
      h: hash(id * 7 + 11), order: g / 16 + k / 320,
    });
  }
}

// ── look ────────────────────────────────────────────────────────────────────
const LIGHT = v3.norm([-0.55, 0.6, -0.6]);
const FRONT = ["#2B0C3A", "#7D1A3A", "#D23A1C", "#FF5A1F", "#FF8A4A", "#FFD2A8"];
const BACK = ["#14072A", "#3B1040", "#6E1A3A"];

const T_EXPLODE = B, T_FORM = 2 * B - 0.1, T_PORTAL = 3 * B;
function tilt(lt) {
  return lerp(1.08, 0, curves.swift(seg(lt, T_PORTAL - 0.05, T_PORTAL + 0.24)));
}
function spin(lt) {
  return lt * 1.15 + 0.9 * curves.snap(seg(lt, T_EXPLODE, T_EXPLODE + 0.6)) + 1.2 * curves.swift(seg(lt, T_FORM, T_FORM + 0.6));
}
function zoom(lt) {
  return lerp(1, 10.5, ease.inQuart(seg(lt, T_PORTAL + 0.12, 4 * B)));
}

function faceAt(f, lt) {
  const e = curves.snap(seg(lt, T_EXPLODE + f.h * 0.05, T_EXPLODE + 0.55));
  const m = curves.swift(seg(lt, T_FORM + f.order * 0.16, T_FORM + f.order * 0.16 + 0.36));
  const D = 0.75 + 0.95 * f.h;
  const off = v3.mul(f.nS, D * e * (1 - m) + 0.0);
  const R = rotAxis(f.axis, 2.6 * (f.h - 0.5) * e * (1 - m) + TAU * 0.5 * m * (f.h > 0.5 ? 1 : -1) * Math.sin(Math.PI * m) * 0.3);
  return f.S.map((v, j) => {
    const local = apply(R, v3.sub(v, f.cS));
    const sv = v3.add(v3.add(f.cS, off), local);
    return v3.lerp(sv, f.T[j], m);
  });
}

function orbit(radius, tiltA, tiltB, phase) {
  const M = mmul(rotX(tiltA), rotZ(tiltB));
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * TAU + phase;
    pts.push(apply(M, [Math.cos(a) * radius, Math.sin(a) * radius, 0]));
  }
  return pts;
}

function project(p, zs) {
  const z = p[2] + DIST;
  return [CX + ((F * p[0]) / z) * zs, CY - ((F * p[1]) / z) * zs, z];
}

export default {
  hud: () => "light",
  blur: (lt) => (lt > T_PORTAL + 0.15 ? { samples: 2.5 } : lt > T_EXPLODE - 0.05 && lt < T_FORM + 0.6 ? { samples: 1.5 } : null),
  render(ctx, lt) {
    ctx.fillStyle = cobaltGround(ctx);
    ctx.fillRect(0, 0, W, H);

    const zs = zoom(lt);
    const M = mmul(rotX(tilt(lt)), rotZ(spin(lt)));
    const shade = ease.outCubic(seg(lt, 0.0, 0.16));
    const pulse = 1 + 0.05 * Math.sin(Math.PI * seg(lt, 0, 0.3));

    // ground shadow
    const ex = curves.snap(seg(lt, T_EXPLODE, T_EXPLODE + 0.5)) * (1 - seg(lt, T_FORM, T_FORM + 0.4));
    const shA = 0.5 * (1 - seg(lt, T_PORTAL, T_PORTAL + 0.2));
    if (shA > 0) {
      ctx.save();
      ctx.translate(CX, CY + 340);
      ctx.scale(1 + ex * 0.6, 0.16);
      const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
      sg.addColorStop(0, `rgba(8,14,90,${shA * (1 - ex * 0.5)})`);
      sg.addColorStop(1, "rgba(8,14,90,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, 0, 300, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // portal: the next shot, seen through the torus hole
    const tl = tilt(lt);
    if (tl < 0.5) {
      const rh = ((TR - Tr) * F) / DIST * zs * 0.985;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(CX, CY, rh, rh * Math.cos(tl), 0, 0, TAU);
      ctx.clip();
      s5.render(ctx, lt - 4 * B);
      ctx.restore();
    }

    // orbits (back halves)
    const orbA = seg(lt, 0.1, 0.4) * (1 - seg(lt, T_PORTAL - 0.1, T_PORTAL + 0.1));
    const orbits = orbA > 0 ? [
      { pts: orbit(1.65, 1.2, 0.4, lt * 0.6), sat: (lt * 2.1) % 1, col: PAL.lime },
      { pts: orbit(1.9, -1.0, -0.7, -lt * 0.4), sat: (0.5 + lt * 1.4) % 1, col: PAL.paper },
    ] : [];
    const drawOrbits = (front) => {
      for (const o of orbits) {
        ctx.strokeStyle = alpha(PAL.paper, 0.45 * orbA);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let pen = false;
        for (const p of o.pts) {
          const q = project(p, zs * pulse);
          const isFront = p[2] < 0;
          if (isFront === front) {
            pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
            pen = true;
          } else pen = false;
        }
        ctx.stroke();
        const sp = o.pts[Math.floor(o.sat * 120)];
        if ((sp[2] < 0) === front) {
          const q = project(sp, zs * pulse);
          ctx.fillStyle = o.col;
          ctx.globalAlpha = orbA;
          ctx.beginPath();
          ctx.arc(q[0], q[1], 9 * (DIST / q[2]), 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    };
    drawOrbits(false);

    // faces → view space → sort → shade → draw
    const list = [];
    for (const f of FACES) {
      const tri = faceAt(f, lt).map((p) => apply(M, v3.mul(p, pulse)));
      const n = faceNormal(tri);
      const c = centroid(tri);
      const toCam = v3.norm(v3.sub([0, 0, -DIST], c));
      const facing = v3.dot(n, toCam);
      list.push({ tri, n: facing < 0 ? v3.mul(n, -1) : n, back: facing < 0, z: c[2], toCam });
    }
    list.sort((a, b) => b.z - a.z);
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.2;
    for (const o of list) {
      const lam = v3.dot(o.n, LIGHT);
      const hv = v3.norm(v3.add(LIGHT, o.toCam));
      const spec = Math.pow(Math.max(0, v3.dot(o.n, hv)), 28);
      const rim = Math.pow(1 - Math.abs(v3.dot(o.n, o.toCam)), 2.2);
      let col;
      if (o.back) col = ramp(BACK, clamp(lam * 0.5 + 0.5));
      else {
        const t = clamp(lam * 0.36 + 0.44 + spec * 0.42);
        col = ramp(FRONT, lerp(0.6, t, shade));
        if (rim > 0.05) col = mix(rgbToHex(col), PAL.lilac, rim * 0.55 * shade);
      }
      const p0 = project(o.tri[0], zs), p1 = project(o.tri[1], zs), p2 = project(o.tri[2], zs);
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    drawOrbits(true);

    // spec sheet label
    const la = seg(lt, 0.15, 0.3) * (1 - seg(lt, T_PORTAL, T_PORTAL + 0.12));
    if (la > 0) {
      ctx.save();
      ctx.globalAlpha = la;
      const x = 1430, y = 300;
      const mode = lt < T_EXPLODE ? 0 : lt < T_FORM + 0.2 ? 1 : 2;
      const tm = [0.15, T_EXPLODE, T_FORM + 0.2][mode];
      const p = seg(lt, tm, tm + 0.25);
      const lines = [
        ["MESH 04.A", "ICOSPHERE / 320 TRIS"],
        ["MESH 04.A", "EXPLODED VIEW"],
        ["MESH 04.B", "TORUS / 320 TRIS"],
      ][mode];
      ctx.fillStyle = PAL.paper;
      ctx.fillRect(x, y - 34, 220 * curves.snap(seg(lt, 0.15, 0.5)), 2);
      text(ctx, lines[0], x, y, { font: "mono", size: 15, tracking: 0.14, axes: { wght: 800 }, color: PAL.paper });
      text(ctx, scramble(lines[1], p, mode + 5), x, y + 26, { font: "mono", size: 15, tracking: 0.14, axes: { wght: 450 }, color: PAL.paper });
      ctx.restore();
    }
  },
};

// cobalt with a soft lift behind the object (also used by S3's closing tiles)
export function cobaltGround(ctx) {
  const bg = ctx.createRadialGradient(CX, CY - 40, 60, CX, CY, 1150);
  bg.addColorStop(0, "#3552FF");
  bg.addColorStop(1, "#1A2FD6");
  return bg;
}

function rgbToHex(css) {
  const m = css.match(/\d+/g).map(Number);
  return "#" + m.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("");
}
