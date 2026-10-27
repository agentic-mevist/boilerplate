// 01 — ANIMATION
// The protagonist dot is tossed in, bounces on the beat with physically-timed
// squash & stretch, gets annotated like an animator's study, anticipates,
// launches, bursts, and floods the frame orange on the downbeat.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha, smoothstep } from "../engine/math.js";
import { text, scramble } from "../engine/draw.js";

export const R = 44;
const FLOOR = 800; // y of floor surface
const CX = W / 2, CY = H / 2;
const C = [BEAT, 2 * BEAT, 2.5 * BEAT, 2.75 * BEAT]; // contact centres on the beat grid
const D = [0.05, 0.04, 0.03, 0.022]; // contact (squash) durations
const LAND = C.map((c, i) => c - D[i] / 2);
const LEAVE = C.map((c, i) => c + D[i] / 2);
const T1 = LAND[1] - LEAVE[0];
const g = (8 * 300) / (T1 * T1); // first bounce apex = 300px
const TA = 0.16; // apex time of the toss-in
const H0 = (g / 2) * (LAND[0] - TA) ** 2;
const VX0 = 1221;
const DECAY = 0.55;
const T_ANT = 1.34, T_LAUNCH = 1.47, T_BURST = 3.5 * BEAT, T_WIPE = 1.665, T_END = 4 * BEAT;
const LAUNCH = { k: 520, c: 26 };

// horizontal: constant speed per flight, losing 45% at each contact
const XS = [-50], VX = [VX0];
for (let i = 0; i < 4; i++) {
  const t0 = i === 0 ? 0 : C[i - 1];
  XS.push(XS[i] + VX[i] * (C[i] - t0));
  VX.push(VX[i] * DECAY);
}
const ROLL = CX - XS[4];
function xAt(t) {
  if (t >= C[3]) return XS[4] + ROLL * (1 - Math.exp(-(t - C[3]) / 0.03));
  for (let i = 0; i < 4; i++) {
    const t0 = i === 0 ? 0 : C[i - 1];
    if (t < C[i]) return XS[i] + VX[i] * (t - t0);
  }
  return CX;
}
function vxAt(t) {
  if (t >= C[3]) return (ROLL / 0.03) * Math.exp(-(t - C[3]) / 0.03);
  for (let i = 0; i < 4; i++) if (t < C[i]) return VX[i];
  return 0;
}
const VIMPACT = [g * (LAND[0] - TA)];
for (let i = 1; i < 4; i++) VIMPACT.push((g * (LAND[i] - LEAVE[i - 1])) / 2);

// → [height of ball bottom above floor, vertical speed (up +), contact index | -1, contact phase]
function hAt(t) {
  if (t < LAND[0]) return [H0 - (g / 2) * (t - TA) ** 2, -g * (t - TA), -1, 0];
  for (let i = 0; i < 4; i++) {
    if (t < LEAVE[i]) {
      if (t >= LAND[i]) return [0, 0, i, (t - LAND[i]) / D[i]];
    }
    if (i < 3 && t >= LEAVE[i] && t < LAND[i + 1]) {
      const T = LAND[i + 1] - LEAVE[i], mid = (LAND[i + 1] + LEAVE[i]) / 2;
      return [(g / 2) * ((T / 2) ** 2 - (t - mid) ** 2), -g * (t - mid), -1, 0];
    }
  }
  return [0, 0, -1, 0];
}

function stretchM(vx, vy) {
  const sp = Math.hypot(vx, vy);
  const sPar = 1 + 0.4 * clamp(sp / 3800);
  const sPerp = 1 / Math.pow(sPar, 0.75);
  const th = Math.atan2(-vy, vx);
  const c = Math.cos(th), s = Math.sin(th);
  return [c * c * sPar + s * s * sPerp, c * s * (sPar - sPerp), c * s * (sPar - sPerp), s * s * sPar + c * c * sPerp];
}
const lerpM = (A, B, u) => A.map((v, k) => lerp(v, B[k], u));

// 2x2 deformation matrix [a,b,c,d]
function deform(t) {
  if (t < T_ANT) {
    const [, vy, ci, u] = hAt(t);
    if (ci < 0) return stretchM(vxAt(t), vy);
    // on the floor: stretched → squashed → stretched, all within ~2–3 frames
    const m = 0.5 * Math.pow(VIMPACT[ci] / VIMPACT[0], 0.75);
    const sy = 1 - m, sx = 1 / Math.pow(sy, 0.9);
    const vIn = -VIMPACT[ci], vOut = ci < 3 ? VIMPACT[ci + 1] : 0;
    const from = stretchM(vxAt(t), u < 0.5 ? vIn : vOut);
    const q = u < 0.5 ? smoothstep(0, 0.4, u) : 1 - smoothstep(0.6, 1, u);
    return lerpM(from, [sx, 0, 0, sy], q);
  }
  if (t < T_LAUNCH) {
    const p = ease.inOutSine(seg(t, T_ANT, T_LAUNCH));
    const sy = 1 - 0.38 * p, sx = 1 / Math.pow(sy, 0.8);
    return [sx, 0, 0, sy];
  }
  const tl = t - T_LAUNCH;
  const v = (spring(tl + 0.002, LAUNCH) - spring(tl, LAUNCH)) / 0.002;
  const sPar = 1 + 0.6 * clamp(Math.abs(v) / 12);
  let sy = sPar, sx = 1 / Math.pow(sPar, 0.8);
  const pb = t - T_BURST;
  const k = 1 + 0.32 * Math.exp(-((pb / 0.05) ** 2)) - 0.12 * Math.exp(-(((pb - 0.07) / 0.04) ** 2));
  return [sx * k, 0, 0, sy * k];
}

function ballState(t) {
  const M = deform(t);
  const extY = Math.hypot(M[2], M[3]);
  if (t < T_LAUNCH) {
    const [h] = hAt(t);
    return { x: xAt(t), y: FLOOR - h - R * extY, M };
  }
  const p = spring(t - T_LAUNCH, LAUNCH);
  const y0 = FLOOR - R * extY;
  return { x: CX, y: lerp(FLOOR - R, CY, p) + (y0 - (FLOOR - R)) * (1 - clamp(p * 3)), M };
}

function drawBall(ctx, s, r, color, strokeW = 0) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.transform(s.M[0], s.M[2], s.M[1], s.M[3], 0, 0);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.restore();
  if (strokeW) {
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = color;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// motion path, sampled once: dots every ~15px of arc length + keyframe markers
const PATH = (() => {
  const dots = [];
  let acc = 0, px = null, py = null;
  for (let t = 0.0; t <= T_ANT; t += 0.0015) {
    const [h] = hAt(t);
    const x = xAt(t), y = FLOOR - h - R;
    if (px !== null) acc += Math.hypot(x - px, y - py);
    if (px === null || acc >= 15) {
      dots.push([x, y, t]);
      acc = 0;
    }
    px = x; py = y;
  }
  const keys = [[xAt(TA), FLOOR - H0 - R, TA]];
  for (let i = 0; i < 4; i++) {
    keys.push([XS[i + 1], FLOOR - R, C[i]]);
    if (i < 3) {
      const tm = (LEAVE[i] + LAND[i + 1]) / 2;
      keys.push([xAt(tm), FLOOR - hAt(tm)[0] - R, tm]);
    }
  }
  return { dots, keys };
})();

function callout(ctx, t, t0, t1, ax, ay, lx, ly, label, seed) {
  const pin = seg(t, t0, t0 + 0.12), pout = seg(t, t1 - 0.14, t1);
  if (pin <= 0 || pout >= 1) return;
  const a = 1 - ease.inCubic(pout);
  const p = curves.snap(pin);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = PAL.paper;
  ctx.fillStyle = PAL.paper;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ax, ay, 4 * p, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(lerp(ax, lx, p), lerp(ay, ly, p));
  ctx.stroke();
  const dir = lx >= ax ? 0 : 1;
  text(ctx, scramble(label, seg(t, t0 + 0.04, t0 + 0.26), seed), lx + (dir ? -10 : 10), ly + 5, {
    font: "mono", size: 15, tracking: 0.14, axes: { wght: 640 }, align: dir, color: PAL.paper,
  });
  ctx.restore();
}

export function drawInkBackground(ctx) {
  const bg = ctx.createRadialGradient(CX, CY * 1.1, 50, CX, CY, 1100);
  bg.addColorStop(0, "#1A1A21");
  bg.addColorStop(1, PAL.ink);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

export default {
  hud: () => "light",
  blur: (lt) => (lt > T_WIPE ? { samples: 3 } : null),
  render(ctx, lt) {
    const t = lt;
    drawInkBackground(ctx);
    const studyFade = 1 - seg(t, T_ANT + 0.02, T_LAUNCH + 0.18);

    // motion path (dotted) + keyframe diamonds
    if (studyFade > 0) {
      ctx.fillStyle = alpha(PAL.paper, 0.3 * studyFade);
      ctx.beginPath();
      for (const [x, y, td] of PATH.dots) {
        if (td > t - 0.02) break;
        ctx.moveTo(x + 1.7, y);
        ctx.arc(x, y, 1.7, 0, TAU);
      }
      ctx.fill();
      ctx.strokeStyle = alpha(PAL.paper, 0.7 * studyFade);
      ctx.lineWidth = 1.5;
      for (const [x, y, tk] of PATH.keys) {
        const p = curves.overshoot(seg(t, tk, tk + 0.16));
        if (p <= 0) continue;
        const s = 6 * p;
        ctx.beginPath();
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
        ctx.stroke();
      }
    }

    // floor line: grows from first contact, retracts at launch
    const grow = curves.snap(seg(t, LAND[0] - 0.01, C[0] + 0.55));
    const shrink = ease.inOutCubic(seg(t, T_LAUNCH - 0.05, T_LAUNCH + 0.22));
    if (grow > 0 && shrink < 1) {
      const xa = XS[1];
      const left = lerp(xa, 120, grow), right = lerp(xa, W - 120, grow);
      const l2 = lerp(left, CX, shrink), r2 = lerp(right, CX, shrink);
      ctx.strokeStyle = alpha(PAL.paper, 0.32);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l2, FLOOR + 1);
      ctx.lineTo(r2, FLOOR + 1);
      ctx.stroke();
      ctx.strokeStyle = alpha(PAL.paper, 0.55 * (1 - shrink));
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const p = curves.snap(seg(t, C[i], C[i] + 0.15));
        if (p <= 0) continue;
        ctx.moveTo(XS[i + 1], FLOOR + 12);
        ctx.lineTo(XS[i + 1], FLOOR + 12 + 16 * p);
      }
      ctx.stroke();
    }

    // impact rings
    for (let i = 0; i < 4; i++) {
      const p = seg(t, LAND[i], LAND[i] + 0.42);
      if (p <= 0 || p >= 1) continue;
      const k = VIMPACT[i] / VIMPACT[0];
      const rx = R * 0.8 + 170 * k * curves.snap(p);
      ctx.strokeStyle = alpha(PAL.paper, 0.75 * (1 - p) * k ** 0.5);
      ctx.lineWidth = 3 * (1 - p) + 0.5;
      ctx.beginPath();
      ctx.ellipse(XS[i + 1], FLOOR, rx, rx * 0.2, 0, 0, TAU);
      ctx.stroke();
    }

    // onion skin
    if (studyFade > 0) {
      for (let k = 5; k >= 1; k--) {
        const tg = t - k * 0.036;
        if (tg < 0) continue;
        ctx.save();
        ctx.globalAlpha = 0.42 * (1 - k / 6) * studyFade;
        drawBall(ctx, ballState(tg), R, PAL.paper, 1.5);
        ctx.restore();
      }
    }

    // annotations — the principles, footnoted
    callout(ctx, t, LAND[0] - 0.01, C[0] + 0.42, XS[1], FLOOR + 40, XS[1] + 44, FLOOR + 96, "SQUASH", 1);
    const tApex = (LEAVE[0] + LAND[1]) / 2, apexX = xAt(tApex);
    callout(ctx, t, LEAVE[0] + 0.06, C[1] + 0.02, apexX + 30, FLOOR - 300 - 2 * R + 4, apexX + 120, FLOOR - 420, "STRETCH", 2);
    callout(ctx, t, T_ANT - 0.02, T_LAUNCH + 0.16, CX + 50, FLOOR - 22, CX + 160, FLOOR + 96, "ANTICIPATION", 3);
    callout(ctx, t, T_LAUNCH + 0.05, T_BURST + 0.02, CX - 56, CY + 64, CX - 180, CY + 150, "ARCS & TIMING", 4);

    // the ball
    if (t < T_WIPE) drawBall(ctx, ballState(t), R, PAL.orange);

    // burst lines + ring
    const pb = seg(t, T_BURST, T_BURST + 0.32);
    if (pb > 0 && pb < 1) {
      const head = R + 34 + 400 * curves.snap(pb);
      const tail = R + 34 + 400 * ease.outCubic(seg(pb, 0.18, 1));
      ctx.strokeStyle = PAL.paper;
      ctx.lineCap = "round";
      ctx.lineWidth = 7 * (1 - pb) + 1;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + TAU / 24;
        const len = i % 2 ? 0.72 : 1;
        ctx.moveTo(CX + Math.cos(a) * tail * len, CY + Math.sin(a) * tail * len);
        ctx.lineTo(CX + Math.cos(a) * head * len, CY + Math.sin(a) * head * len);
      }
      ctx.stroke();
      ctx.lineCap = "butt";
    }
    const pr = seg(t, T_BURST, T_BURST + 0.26);
    if (pr > 0 && pr < 1) {
      ctx.strokeStyle = alpha(PAL.paper, 1 - pr);
      ctx.lineWidth = 10 * (1 - pr);
      ctx.beginPath();
      ctx.arc(CX, CY, R + 14 + 200 * curves.snap(pr), 0, TAU);
      ctx.stroke();
    }

    // wipe: the dot floods the frame
    if (t >= T_WIPE) {
      const p = seg(t, T_WIPE, T_END);
      const r = lerp(R * 0.92, 1180, ease.inQuart(p));
      ctx.fillStyle = PAL.orange;
      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, TAU);
      ctx.fill();
    }
  },
};
