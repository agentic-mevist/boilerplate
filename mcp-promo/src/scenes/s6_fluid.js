// 06 — FLUID
// The core drops into a rising lime liquid: crown splash, droplets that merge
// back into the surface (same implicit field), a flood that fills the frame.
// Then an ink drop blooms and divides on the beat — 1 → 2 → 4 — with gooey
// bridges, glossy highlights and a drop shadow, before re-merging into the dot.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, rng, alpha, mix } from "../engine/math.js";
import { isoPath, ballField } from "../engine/contour.js";
import { drawSeed } from "./s5_particles.js";

const B = BEAT;
const CX = W / 2, CY = H / 2;
const T_HIT = 0.2;
const SURF0 = H * 0.7;

// liquid level: rises, holds for the splash, then floods the frame
function level(lt) {
  const a = curves.snap(seg(lt, 0, 0.2));
  const b = ease.inOutCubic(seg(lt, 0.36, 0.64));
  return lerp(lerp(H + 60, SURF0, a), -140, b);
}
function surfaceY(x, lt) {
  let y = level(lt);
  // slosh as it rises
  y += 14 * Math.sin(x / 210 + lt * 9) * (1 - seg(lt, 0.15, 0.5));
  // impact ripples
  const tp = lt - T_HIT;
  if (tp > 0) {
    const d = Math.abs(x - CX);
    y += 46 * Math.exp(-tp * 5) * Math.exp(-d / 520) * Math.cos(d / 46 - tp * 26);
  }
  return y;
}

// crown splash droplets (ballistic, deterministic)
const DROPS = (() => {
  const r = rng(77);
  return Array.from({ length: 20 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const spread = r();
    return {
      vx: side * (150 + spread * 820),
      vy: -(1000 + (1 - spread) * 900 + r() * 300),
      r: 9 + r() * 17,
      x0: CX + side * (115 + spread * 80), // launched from the crater rim, so the cavity stays open
    };
  });
})();
const G = 4200;

function liquidField(lt) {
  const tp = lt - T_HIT;
  const balls = [];
  if (tp > 0) {
    for (const d of DROPS) {
      const t = tp;
      const y = SURF0 - 10 + d.vy * t + 0.5 * G * t * t;
      balls.push({ x: d.x0 + d.vx * t, y, r: d.r * clamp(t / 0.03) });
    }
    // the central jet column
    const jt = clamp((tp - 0.06) / 0.4); // Worthington jet rises once the cavity collapses
    const jh = 330 * Math.sin(Math.PI * Math.pow(jt, 0.8));
    for (let k = 0; k < 5; k++) {
      const f = k / 4;
      balls.push({ x: CX, y: SURF0 - jh * f, r: (34 - 16 * f) * Math.sin(Math.PI * jt) });
    }
  }
  const bf = ballField(balls);
  return (x, y) => bf(x, y) + Math.exp((y - surfaceY(x, lt)) / 16);
}

// ink choreography: bloom → split in 2 → split in 4 → swirl → merge → the dot
function inkBalls(lt) {
  const out = [];
  const tb = lt - B;
  if (tb < 0) return out;
  const bloom = spring(tb, { k: 240, c: 17 });
  const s2 = curves.swift(seg(lt, 2 * B, 2 * B + 0.3));
  const s4 = curves.swift(seg(lt, 2.5 * B, 2.5 * B + 0.28));
  const mg = curves.swift(seg(lt, 3 * B + 0.04, 3 * B + 0.36));
  const shrink = ease.inOutCubic(seg(lt, 3 * B + 0.24, 4 * B - 0.06));
  const swirl = (lt - 2.5 * B) * 2.2 * (lt > 2.5 * B ? 1 : 0) + mg * 1.4;
  const R0 = 150 * bloom;
  const r2 = lerp(R0, 106, s2), r4 = lerp(r2, 76, s4);
  const sep2 = 230 * s2 * (1 - mg), sep4 = 150 * s4 * (1 - mg);
  for (let a = -1; a <= 1; a += 2) {
    for (let b = -1; b <= 1; b += 2) {
      let x = a * sep2, y = b * sep4;
      const ca = Math.cos(swirl), sa = Math.sin(swirl);
      [x, y] = [x * ca - y * sa, x * sa + y * ca];
      // four quarter-balls whose combined field equals one ball before the splits
      const rr = s4 > 0 || s2 > 0 ? lerp(r2 / Math.SQRT2, r4, s4) : R0 / 2;
      out.push({ x: CX + x, y: CY + y, r: lerp(rr, R0 / 2, mg) * lerp(1, 44 / 150 / 0.5, shrink) });
    }
  }
  // satellites spun off the divisions
  const sat = seg(lt, 2 * B + 0.1, 2 * B + 0.4) * (1 - mg);
  if (sat > 0) {
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + lt * 1.6;
      const rad = 380 + 40 * Math.sin(lt * 5 + i);
      out.push({ x: CX + Math.cos(ang) * rad * sat, y: CY + Math.sin(ang) * rad * 0.62 * sat, r: (16 + (i % 3) * 6) * sat });
    }
  }
  return out;
}

const SHADOW = "#9CC21A";
export default {
  hud: (lt) => (lt > 0.58 ? "dark" : "light"),
  vignette: (lt) => lerp(0.2, 0.07, seg(lt, 0.4, 0.66)),
  blur: (lt) => (lt < 0.75 ? { samples: 1.5 } : null),
  render(ctx, lt) {
    // ink world before the flood
    if (lt < 0.7) {
      const bg = ctx.createRadialGradient(CX, CY, 40, CX, CY, 1100);
      bg.addColorStop(0, "#17121F");
      bg.addColorStop(1, PAL.ink);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      // the seed falls
      if (lt < T_HIT + 0.02) {
        const y = CY + 0.5 * ((2 * (SURF0 - CY)) / (T_HIT * T_HIT)) * lt * lt;
        const st = 1 + 0.6 * seg(lt, 0.08, T_HIT);
        ctx.save();
        ctx.translate(CX, y);
        ctx.scale(1 / Math.sqrt(st), st);
        drawSeed(ctx, 0, 0, lt, 1.25);
        ctx.restore();
      }
    }
    // liquid (lime) — surface + crown droplets share one field so they merge
    if (lt < 0.72) {
      ctx.fillStyle = PAL.lime;
      ctx.beginPath();
      isoPath(ctx, liquidField(lt), { x0: -24, y0: -24, x1: W + 24, y1: H + 24, cell: 8 });
      ctx.fill("evenodd");
    } else {
      ctx.fillStyle = PAL.lime;
      ctx.fillRect(0, 0, W, H);
    }

    // rising bubbles for texture
    const bub = seg(lt, 0.5, 0.7) * (1 - seg(lt, 1.6, 1.8));
    if (bub > 0) {
      ctx.strokeStyle = alpha(PAL.ink, 0.22 * bub);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 22; i++) {
        const r = rng(500 + i);
        const sp = 260 + r() * 300, x0 = r() * W, ph = r();
        const y = H + 40 - (((lt * sp) / H + ph) % 1.2) * (H + 80);
        const x = x0 + Math.sin(lt * 4 + i) * 16;
        const rad = 5 + r() * 9;
        ctx.moveTo(x + rad, y);
        ctx.arc(x, y, rad, 0, TAU);
      }
      ctx.stroke();
    }

    // ink blobs: shadow → body → gloss
    const balls = inkBalls(lt);
    if (balls.length) {
      const f = ballField(balls);
      const box = { x0: CX - 760, y0: CY - 470, x1: CX + 760, y1: CY + 470, cell: 7 };
      ctx.fillStyle = alpha(SHADOW, 0.85);
      ctx.beginPath();
      isoPath(ctx, f, { ...box, ox: 16, oy: 24 });
      ctx.fill("evenodd");
      ctx.fillStyle = PAL.ink;
      ctx.beginPath();
      isoPath(ctx, f, box);
      ctx.fill("evenodd");
      // gloss: a shrunken, offset copy of the same field
      const gl = ballField(balls.map((b) => ({ x: b.x - b.r * 0.26, y: b.y - b.r * 0.3, r: b.r * 0.58 })));
      ctx.fillStyle = alpha(PAL.paper, 0.14);
      ctx.beginPath();
      isoPath(ctx, gl, box);
      ctx.fill("evenodd");
      ctx.fillStyle = alpha(PAL.paper, 0.92);
      ctx.beginPath();
      for (const b of balls) {
        if (b.r < 12) continue;
        const x = b.x - b.r * 0.42, y = b.y - b.r * 0.44;
        ctx.moveTo(x + b.r * 0.1, y);
        ctx.ellipse(x, y, b.r * 0.1, b.r * 0.07, -0.7, 0, TAU);
      }
      ctx.fill();
    }
  },
};
