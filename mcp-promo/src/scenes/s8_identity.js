// 08 — IDENTITY
// Impact. The dot squashes, leaps, and lands as the full stop of the wordmark
// while the letters rise through a baseline mask on the variable axes; the
// letters flinch as it lands. Tagline writes in; one last heartbeat.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha, mod } from "../engine/math.js";
import { fonts } from "../fonts.js";
import { layout, glyphPath, glyphBounds } from "../engine/font.js";
import { text, scramble } from "../engine/draw.js";
import { drawInkBackground } from "./s1_bounce.js";

const B = BEAT;
const CX = W / 2, CY = H / 2;
const WORD = "handlepilot";
const SIZE = 228;
const BASE = 585;
const DOT_R = 34;
const AX_END = { wdth: 104, wght: 820 };
let M = null;
function metrics() {
  if (M) return M;
  const L = layout(fonts.display, WORD, { size: SIZE, axes: AX_END });
  const gap = SIZE * 0.07;
  const total = L.width + gap + 2 * DOT_R;
  const x0 = CX - total / 2;
  M = { x0, width: L.width, dotX: x0 + L.width + gap + DOT_R, dotY: BASE - DOT_R };
  return M;
}

const T_LEAP = 0.07, T_LAND = B;
function dot(lt, liveW) {
  const m = metrics();
  const liveX = CX + (liveW + SIZE * 0.07 + 2 * DOT_R) / 2 - DOT_R;
  if (lt < T_LEAP) {
    const p = lt / T_LEAP;
    const sy = 1 - 0.35 * ease.outQuad(p);
    return { x: CX, y: CY + 44 * (1 - sy), r: 44, sx: 1 / Math.pow(sy, 0.8), sy };
  }
  if (lt < T_LAND) {
    const p = (lt - T_LEAP) / (T_LAND - T_LEAP);
    const x = lerp(CX, liveX, curves.glide(p));
    const yLin = lerp(CY, m.dotY, p);
    const y = yLin - 330 * 4 * p * (1 - p);
    const r = lerp(44, DOT_R, ease.inOutCubic(p));
    const v = Math.abs(1 - 2 * p);
    const st = 1 + 0.35 * v;
    return { x, y, r, sx: 1 / Math.pow(st, 0.7), sy: st };
  }
  const tc = lt - T_LAND;
  const sq = 0.42 * Math.exp(-tc * 16) * Math.cos(tc * 34);
  // heartbeat on beat 31
  const hb = 1 + 0.32 * Math.exp(-(((lt - 7 * B) / 0.06) ** 2)) + 0.14 * Math.exp(-(((lt - 7 * B - 0.16) / 0.05) ** 2));
  return { x: liveX, y: m.dotY + DOT_R * Math.max(0, sq) * 0.9, r: DOT_R * hb, sx: 1 + sq, sy: 1 - sq };
}

export default {
  hud: () => "light",
  hudFade: (lt) => (1 - 0.55 * seg(lt, 0.9, 1.4)) * (1 - seg(lt, 3.3, 3.7)),
  blur: (lt) => (lt < 0.55 ? { samples: 1.5 } : null),
  render(ctx, lt) {
    const m = metrics();
    drawInkBackground(ctx);

    // impact shockwave
    const pr = seg(lt, 0, 0.55);
    if (pr > 0 && pr < 1) {
      ctx.strokeStyle = alpha(PAL.orange, 0.9 * (1 - pr));
      ctx.lineWidth = 14 * (1 - pr) + 1;
      ctx.beginPath();
      ctx.arc(CX, CY, 50 + 1100 * curves.snap(pr), 0, TAU);
      ctx.stroke();
      const p2 = seg(lt, 0.06, 0.6);
      if (p2 > 0) {
        ctx.strokeStyle = alpha(PAL.paper, 0.4 * (1 - p2));
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(CX, CY, 50 + 800 * curves.snap(p2), 0, TAU);
        ctx.stroke();
      }
    }

    // wordmark: letters rise through the baseline mask on the variable axes
    const L = layout(fonts.display, WORD, {
      size: SIZE,
      axes: (i) => {
        const t0 = 0.06 + i * 0.045;
        const p = spring(lt - t0, { k: 230, c: 18 });
        return { wdth: lerp(52, AX_END.wdth, p), wght: lerp(260, AX_END.wght, clamp(p)) };
      },
    });
    const ox = CX - (L.width + SIZE * 0.07 + 2 * DOT_R) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, BASE - SIZE * 1.1, W, SIZE * 1.1 + SIZE * 0.32);
    ctx.clip();
    ctx.fillStyle = PAL.paper;
    for (const g of L.glyphs) {
      const t0 = 0.06 + g.i * 0.045;
      const p = curves.snap(seg(lt, t0, t0 + 0.42));
      if (p <= 0) continue;
      // flinch when the dot lands (ripples right → left)
      const fl = lt - T_LAND - (WORD.length - 1 - g.i) * 0.03;
      const flinch = fl > 0 ? 16 * Math.exp(-fl * 14) * Math.sin(fl * 30) : 0;
      ctx.beginPath();
      glyphPath(ctx, g.types, g.pts, ox + g.x, BASE + (1 - p) * SIZE * 0.95 + flinch);
      ctx.fill();
    }
    ctx.restore();

    // the dot
    const d = dot(lt, L.width);
    ctx.fillStyle = PAL.orange;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r * d.sx, d.r * d.sy, 0, 0, TAU);
    ctx.fill();
    // landing ring + heartbeat ring
    for (const [t0, a] of [[T_LAND, 0.8], [7 * B, 0.6]]) {
      const p = seg(lt, t0, t0 + 0.5);
      if (p <= 0 || p >= 1) continue;
      ctx.strokeStyle = alpha(PAL.orange, a * (1 - p));
      ctx.lineWidth = 4 * (1 - p) + 0.5;
      ctx.beginPath();
      ctx.arc(d.x, m.dotY, DOT_R + 120 * curves.snap(p), 0, TAU);
      ctx.stroke();
    }

    // tagline
    const ty = BASE + 130;
    const pT = seg(lt, B + 0.05, B + 0.45);
    if (pT > 0) {
      const Ls = layout(fonts.serif, "Free to start.", { size: 76 });
      const tx = CX - Ls.width / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, ty - 80, tx + Ls.width * curves.glide(pT) + 10, 120);
      ctx.clip();
      ctx.fillStyle = PAL.paper;
      ctx.beginPath();
      for (const g of Ls.glyphs) if (g.pts) glyphPath(ctx, g.types, g.pts, tx + g.x, ty + (1 - curves.snap(pT)) * 20);
      ctx.fill();
      ctx.restore();
      // hairline rules either side
      const rl = 150 * curves.snap(seg(lt, B + 0.15, B + 0.6));
      ctx.fillStyle = alpha(PAL.paper, 0.55);
      ctx.fillRect(tx - 40 - rl, ty - 24, rl, 2);
      ctx.fillRect(tx + Ls.width + 40, ty - 24, rl, 2);
    }
    const pM = seg(lt, 2 * B, 2 * B + 0.4);
    if (pM > 0) {
      text(ctx, scramble("HANDLEPILOT.COM/MCP  ·  ONE URL FOR ANY AGENT", pM, 9), CX, ty + 82, {
        font: "mono", size: 17, tracking: 0.26, axes: { wght: 520 }, align: 0.5, color: alpha(PAL.paper, 0.62),
      });
    }
  },
};
