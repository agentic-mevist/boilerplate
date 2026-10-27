// 05 — SIMULATION
// 3,200 particles, simulated once (deterministically) and sampled at any time:
// the seed bursts on the downbeat, rides a curl-noise flow field, snaps into
// Keplerian orbit rings on the next downbeat, then spirals back into one point.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, TAU, rng, makeNoise, alpha } from "../engine/math.js";

const B = BEAT;
const CX = W / 2, CY = H / 2;
const N = 3200;
const RATE = 240; // sim steps per second
const DUR = 4 * B + 0.02;
const STEPS = Math.ceil(DUR * RATE) + 2;
const T_RINGS = 2 * B, T_COLLAPSE = 3 * B - 0.02, T_DONE = 4 * B - 0.1;
const RINGS = [110, 175, 245, 320, 400, 485];

const noise = makeNoise(42);
const rand = rng(1234);

const P = new Float32Array(STEPS * N * 2);
const meta = [];
(function simulate() {
  const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = rand() * TAU;
    const sp = 250 + Math.pow(rand(), 0.6) * 1500;
    x[i] = CX + Math.cos(a) * 4;
    y[i] = CY + Math.sin(a) * 4;
    vx[i] = Math.cos(a) * sp;
    vy[i] = Math.sin(a) * sp;
    const ring = Math.min(RINGS.length - 1, Math.floor(Math.pow(rand(), 0.85) * RINGS.length));
    meta.push({ ring, r: RINGS[ring] + (rand() - 0.5) * 22, th0: 0, hue: rand(), size: 0.7 + rand() * 0.9 });
  }
  const dt = 1 / RATE;
  const eps = 2;
  const curl = (px, py, t) => {
    const s = 0.0019, s2 = 0.0047;
    const f = (u, v) => noise.n3(u * s, v * s, t * 0.5) + 0.22 * noise.n3(u * s2 + 40, v * s2, t * 0.8);
    const dx = (f(px + eps, py) - f(px - eps, py)) / (2 * eps);
    const dy = (f(px, py + eps) - f(px, py - eps)) / (2 * eps);
    return [dy, -dx];
  };
  let ringsSet = false;
  for (let k = 0; k < STEPS; k++) {
    const t = k * dt;
    const base = k * N * 2;
    if (!ringsSet && t >= T_RINGS - 0.06) {
      ringsSet = true;
      for (let i = 0; i < N; i++) meta[i].th0 = Math.atan2(y[i] - CY, x[i] - CX);
    }
    for (let i = 0; i < N; i++) {
      P[base + 2 * i] = x[i];
      P[base + 2 * i + 1] = y[i];
      const m = meta[i];
      if (t < T_RINGS - 0.06) {
        // burst with drag, increasingly steered by the flow field
        const steer = clamp((t - 0.08) / 0.35);
        const [cx, cy] = curl(x[i], y[i], t);
        const fs = 260000 * m.size;
        const tx = cx * fs, ty = cy * fs;
        const drag = Math.exp(-2.6 * dt);
        vx[i] = lerp(vx[i] * drag, tx, steer * (1 - Math.exp(-3.2 * dt)) * 1.0) ;
        vy[i] = lerp(vy[i] * drag, ty, steer * (1 - Math.exp(-3.2 * dt)) * 1.0);
      } else {
        // orbit rings (Kepler-ish: inner rings faster), later spiralling to the core
        const col = ease.inCubic(clamp((t - T_COLLAPSE) / (T_DONE - T_COLLAPSE)));
        const rr = m.r * (1 - col);
        const tt = t - (T_RINGS - 0.06);
        const omega = 3.4 * Math.pow(110 / m.r, 1.2);
        const th = m.th0 + omega * tt + col * col * 9;
        const txp = CX + Math.cos(th) * rr, typ = CY + Math.sin(th) * rr * 0.92;
        const kk = 380 * clamp(tt / 0.26) + 30 + col * 2000;
        const cc = 2 * Math.sqrt(kk) * 0.75;
        vx[i] += (kk * (txp - x[i]) - cc * vx[i]) * dt;
        vy[i] += (kk * (typ - y[i]) - cc * vy[i]) * dt;
      }
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
    }
  }
})();

function pos(i, k) {
  const k0 = Math.max(0, Math.min(STEPS - 2, Math.floor(k)));
  const f = clamp(k - k0, 0, 1);
  const a = k0 * N * 2 + 2 * i, b = a + N * 2;
  return [P[a] + (P[b] - P[a]) * f, P[a + 1] + (P[b + 1] - P[a + 1]) * f];
}

// colour = destination ring: mixed in the chaos, sorted into bands when order snaps in
const COLORS = [PAL.paper, PAL.lime, PAL.lilac, PAL.pink, PAL.orange, "#FF7A35"];
const GROUPS = COLORS.map(() => []);
meta.forEach((m, i) => GROUPS[m.ring].push(i));

// background dust for depth
const DUST = Array.from({ length: 220 }, (_, i) => {
  const r = rng(900 + i);
  return { x: r() * W, y: r() * H, z: 0.2 + r() * 0.8, s: 0.6 + r() * 1.6 };
});

function glow(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(col, a));
  g.addColorStop(0.35, alpha(col, a * 0.35));
  g.addColorStop(1, alpha(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

export function drawSeed(ctx, x, y, lt, scale = 1) {
  const beat = (((lt % B) + B) % B) / B;
  const pulse = 1 + 0.18 * Math.exp(-beat * 6);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, x, y, 160 * scale * pulse, PAL.orange, 0.55);
  glow(ctx, x, y, 50 * scale * pulse, PAL.paper, 0.6);
  ctx.restore();
  ctx.fillStyle = PAL.paper;
  ctx.beginPath();
  ctx.arc(x, y, 13 * scale * pulse, 0, TAU);
  ctx.fill();
}

export default {
  hud: () => "light",
  blur: (lt) => (lt < 0.2 ? { samples: 1.5 } : null),
  render(ctx, lt) {
    const bg = ctx.createRadialGradient(CX, CY, 40, CX, CY, 1100);
    bg.addColorStop(0, "#17121F");
    bg.addColorStop(1, PAL.ink);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // dust drifting outward (parallax)
    ctx.fillStyle = alpha(PAL.paper, 0.35);
    ctx.beginPath();
    for (const d of DUST) {
      const s = 1 + (Math.max(0, lt) + 0.5) * 0.08 * d.z;
      const x = CX + (d.x - CX) * s, y = CY + (d.y - CY) * s;
      ctx.moveTo(x + d.s * d.z, y);
      ctx.arc(x, y, d.s * d.z, 0, TAU);
    }
    ctx.fill();

    if (lt < 0) {
      drawSeed(ctx, CX, CY, lt);
      return;
    }

    // burst flash + shockwave
    const pf = seg(lt, 0, 0.35);
    if (pf < 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, CX, CY, 420 * curves.snap(pf) + 60, PAL.orange, 0.7 * (1 - pf));
      ctx.restore();
      ctx.strokeStyle = alpha(PAL.paper, 0.8 * (1 - pf));
      ctx.lineWidth = 8 * (1 - pf) + 0.5;
      ctx.beginPath();
      ctx.arc(CX, CY, 30 + 900 * curves.snap(pf), 0, TAU);
      ctx.stroke();
    }

    // particles as short light-trails, additive
    const k = lt * RATE;
    const trailSteps = 9, trailStride = 2.4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const fadeEnd = 1 - seg(lt, T_DONE - 0.04, T_DONE + 0.06);
    for (let gi = 0; gi < GROUPS.length; gi++) {
      ctx.strokeStyle = alpha(COLORS[gi], 0.62 * fadeEnd);
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      for (const i of GROUPS[gi]) {
        let [x, y] = pos(i, k);
        ctx.moveTo(x, y);
        for (let j = 1; j <= trailSteps; j++) {
          const q = pos(i, Math.max(0, k - j * trailStride));
          ctx.lineTo(q[0], q[1]);
        }
      }
      ctx.stroke();
    }
    ctx.restore();

    // the core reforms as everything spirals home
    const pc = seg(lt, T_COLLAPSE + 0.15, T_DONE);
    if (pc > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, CX, CY, 70 + 200 * pc, PAL.orange, 0.5 * pc);
      ctx.restore();
      ctx.fillStyle = PAL.paper;
      ctx.beginPath();
      ctx.arc(CX, CY, 4 + 14 * ease.outBack(pc), 0, TAU);
      ctx.fill();
    }
  },
};
