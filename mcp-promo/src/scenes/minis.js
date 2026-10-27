// Mini loops for the reel wall — little proofs of range (UI, data, colour, type…).
// Each draws a full 1920×1080 tile and is a pure function of time.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, lerp, ease, curves, spring, TAU, mod, alpha } from "../engine/math.js";
import { text, rrect } from "../engine/draw.js";

const CX = W / 2, CY = H / 2;

export function miniBars(ctx, t) {
  ctx.fillStyle = PAL.paper;
  ctx.fillRect(0, 0, W, H);
  const n = 8, bw = 120, gap = 70, x0 = CX - (n * bw + (n - 1) * gap) / 2, base = 880;
  for (let i = 0; i < n; i++) {
    const cyc = mod(t * 0.9 + i * 0.06, 1.6);
    const h = 600 * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + Math.floor(t * 0.9 + i * 0.06) * 2.1))) * spring(cyc, { k: 260, c: 16 });
    ctx.fillStyle = i === 5 ? PAL.cobalt : PAL.orange;
    ctx.fillRect(x0 + i * (bw + gap), base - h, bw, h);
  }
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x0 - 40, base, n * (bw + gap) + 10, 8);
}

export function miniPalette(ctx, t) {
  const cols = [PAL.ink, PAL.orange, PAL.cobalt, PAL.lime, PAL.pink, PAL.paper];
  const w = W / cols.length;
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, W, H);
  const cyc = mod(t, 1.4);
  for (let i = 0; i < cols.length; i++) {
    const pin = curves.snap(clamp((cyc - i * 0.05) / 0.4));
    const pout = ease.inCubic(clamp((cyc - 0.95 - i * 0.04) / 0.3));
    ctx.fillStyle = cols[i];
    ctx.fillRect(i * w - 1, H * (1 - pin) + H * pout * -1, w + 2, H);
  }
}

export function miniToggle(ctx, t) {
  ctx.fillStyle = PAL.cobalt;
  ctx.fillRect(0, 0, W, H);
  const k = Math.floor(t / BEAT), f = (t % BEAT) / BEAT;
  const on = k % 2 === 0;
  const p = spring(f * BEAT, { k: 400, c: 22 });
  const pos = on ? p : 1 - p;
  const pw = 820, ph = 380, x = CX - pw / 2, y = CY - ph / 2;
  ctx.fillStyle = on ? PAL.lime : PAL.paper;
  ctx.beginPath();
  rrect(ctx, x, y, pw, ph, ph / 2);
  ctx.fill();
  const r = 150, kx = lerp(x + ph / 2, x + pw - ph / 2, pos);
  const sq = 1 + 0.25 * Math.sin(Math.PI * clamp(f * 3));
  ctx.fillStyle = PAL.ink;
  ctx.beginPath();
  ctx.ellipse(kx, CY, r * sq, r / sq, 0, 0, TAU);
  ctx.fill();
}

export function miniSpecimen(ctx, t) {
  ctx.fillStyle = PAL.paper;
  ctx.fillRect(0, 0, W, H);
  const wg = 500 + 400 * Math.sin(t * 3.2);
  const wd = 100 + 50 * Math.sin(t * 2.1 + 1);
  text(ctx, "Aa", CX, CY + 250, { font: "display", size: 760, axes: { wght: wg, wdth: wd }, align: 0.5, color: PAL.ink });
}

export function miniLoop(ctx, t) {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = PAL.lime;
  ctx.lineWidth = 14;
  for (let i = 0; i < 9; i++) {
    const s = 80 + i * 52;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(ease.inOutCubic(mod(t * 0.8 - i * 0.06, 1)) * (Math.PI / 2));
    ctx.strokeRect(-s, -s, 2 * s, 2 * s);
    ctx.restore();
  }
}

export function miniEQ(ctx, t) {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, W, H);
  const n = 28, bw = 44, gap = 18, x0 = CX - (n * (bw + gap)) / 2;
  ctx.fillStyle = PAL.pink;
  for (let i = 0; i < n; i++) {
    const beat = Math.exp(-((t % BEAT) / BEAT) * 4);
    const h = 60 + 520 * Math.abs(Math.sin(i * 0.45 + t * 5) * 0.6 + Math.sin(i * 1.3 - t * 3) * 0.4) * (0.55 + 0.45 * beat);
    ctx.beginPath();
    rrect(ctx, x0 + i * (bw + gap), CY - h / 2, bw, h, bw / 2);
    ctx.fill();
  }
}

export function miniOrbit(ctx, t) {
  ctx.fillStyle = PAL.cobalt;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = alpha(PAL.paper, 0.6);
  ctx.lineWidth = 6;
  for (let i = 0; i < 3; i++) {
    const rot = (i * Math.PI) / 3;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 400, 140, 0, 0, TAU);
    ctx.stroke();
    const a = t * (2.4 + i * 0.6) + i;
    ctx.fillStyle = [PAL.lime, PAL.paper, PAL.orange][i];
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 400, Math.sin(a) * 140, 34, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = PAL.paper;
  ctx.beginPath();
  ctx.arc(CX, CY, 70, 0, TAU);
  ctx.fill();
}

export function miniWaves(ctx, t) {
  ctx.fillStyle = PAL.orange;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  for (let k = 0; k < 11; k++) {
    const y0 = 140 + k * 80;
    ctx.beginPath();
    for (let x = 120; x <= W - 120; x += 24) {
      const env = Math.sin(((x - 120) / (W - 240)) * Math.PI);
      const y = y0 + env * 70 * Math.sin(x / 140 - t * 6 + k * 0.5);
      x === 120 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
