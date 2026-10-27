// 06 — EDIT
// The take from the chat grows into a phone. Bar 1: the raw take, as shot.
// On the downbeat of bar 2 a scan line turns it into the edit Claude made from
// it (the effects reel), one effect per eighth note, ending on its pull-back
// into HandlePilot's board.
import { W, H, BEAT, BAR, PAL, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { sg, jb, card, cover, pop, logo, it, head, body, eyebrow, hpCard, markRect, measureInter, tight } from "../engine/ui.js";
import { mix } from "../engine/math.js";
import { THUMB } from "./p_chat.js";

const B = BEAT, E = B / 2;
const PW = 450, PH = 800, PX = W / 2 - PW / 2 + 40, PY = H / 2 - PH / 2 + 10;
export const EFFECTS = [
  "Text behind", "Orbit", "Clone", "Freeze frame", "Spotlight", "Parallax", "Split screen", "Phone mockup",
  "Notifications", "Hand prop", "Glitch", "Speed ramp", "Halftone", "Ticker", "Chart grow", "Light leak",
  "Whip zoom", "Doodle", "Cover story", "Pull-back",
];
// after.rgba holds 8 frames from each of the first 19 effects, then the pull-back
// (see tools/clips.sh)
const PER = 8, PULL = 19 * PER, PULL_N = 46;
const T_WIPE = BAR, T_PULL = BAR + 19 * E;

function afterIndex(lt) {
  const u = lt - T_WIPE;
  if (u < 19 * E) {
    const i = Math.floor(u / E);
    return { i, f: i * PER + Math.min(PER - 1, Math.floor(((u - i * E) / E) * PER)) };
  }
  return { i: 19, f: PULL + Math.min(PULL_N - 1, Math.floor(((lt - T_PULL) / (BAR * 4 - T_PULL - 0.1)) * PULL_N)) };
}

export default {
  hud: (lt) => (lt < 0.25 ? "light" : "dark"),
  blur: (lt) => (lt < 0.4 ? { samples: 2 } : null),
  render(ctx, lt, env) {
    // out of the agent's dark window into HandlePilot's paper
    ctx.fillStyle = mix("#111318", HP.paper, ease.inOutCubic(seg(lt, 0.05, 0.45)));
    ctx.fillRect(0, 0, W, H);
    const gl = ctx.createRadialGradient(PX + PW / 2, PY + PH / 2, 0, PX + PW / 2, PY + PH / 2, 700);
    gl.addColorStop(0, alpha(HP.skyPanel, seg(lt, 0.2, 0.6)));
    gl.addColorStop(1, alpha(HP.skyPanel, 0));
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);

    // the phone grows out of the chat thumbnail
    const pg = curves.snap(seg(lt, 0, 0.5));
    const x = lerp(THUMB.x, PX, pg), y = lerp(THUMB.y, PY, pg);
    const w = lerp(THUMB.w, PW, pg), h = lerp(THUMB.h, PH, pg);
    const r = lerp(16, 48, pg);
    // beat bounce once the edit plays
    const kick = lt > T_WIPE ? 1 + 0.012 * Math.exp(-((lt - T_WIPE) % E) / 0.05) : 1;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(kick, kick);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    card(ctx, x - 12, y - 12, w + 24, h + 24, { r: r + 10, fill: HP.ink, shadow: 0.7 });
    const before = env.clip("before", 20 + lt * 30);
    const ai = afterIndex(lt);
    const after = env.clip("after", ai.f) || before;
    const pw = seg(lt, T_WIPE - 0.06, T_WIPE + 0.22);
    if (pw < 1) cover(ctx, before, x, y, w, h, r);
    if (pw > 0) {
      ctx.save();
      ctx.beginPath();
      rrect(ctx, x, y, w, h, r);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(x, y, w, h * curves.swift(pw));
      ctx.clip();
      ctx.drawImage(after, x, y, w, h);
      ctx.restore();
      if (pw < 1) {
        const sy = y + h * curves.swift(pw);
        const g = ctx.createLinearGradient(0, sy - 120, 0, sy);
        g.addColorStop(0, alpha(HP.green, 0));
        g.addColorStop(1, alpha(HP.green, 0.7));
        ctx.fillStyle = g;
        ctx.fillRect(x, sy - 120, w, 120);
        ctx.fillStyle = HP.blue;
        ctx.fillRect(x - 30, sy - 2.5, w + 60, 5);
      }
    }
    ctx.restore();

    // left column: what happened
    const LX = 120;
    if (lt < T_WIPE) {
      eyebrow(ctx, "The upload", LX, 268, { size: 20, w: 600 });
      head(ctx, lt, ["Drop in", "[a raw take.]"], LX, 300, { size: 100, t0: 0.15, maxW: 560 });
      body(ctx, lt, "One take, no edits.", LX, 560, { size: 36, t0: 0.5 });
    } else {
      const lt2 = lt - T_WIPE;
      eyebrow(ctx, "The edit", LX, 268, { size: 20, w: 600, color: HP.blue });
      head(ctx, lt2, ["Get the", "[edit back.]"], LX, 300, { size: 100, t0: 0, maxW: 560 });
      body(ctx, lt2, "Motion graphics, in your style.", LX, 560, { size: 36, t0: 0.3 });
    }

    // right column: the effect counter, ticking on every eighth
    const RX = PX + PW + 90;
    if (lt >= T_WIPE) {
      const i = ai.i;
      const local = i < 19 ? (lt - T_WIPE) - i * E : lt - T_PULL;
      const p = curves.snap(clamp(local / 0.12));
      eyebrow(ctx, "Effect", RX, 330, { size: 20, w: 600 });
      const num = String(i + 1).padStart(2, "0");
      const nw = it(ctx, num, RX, 470 + (1 - p) * 30, { size: 150, w: 600, color: HP.ink, ls: tight(150) });
      it(ctx, "/20", RX + nw + 14, 470, { size: 50, w: 500, color: HP.soft, ls: -1 });
      const ew = measureInter(ctx, EFFECTS[i], { size: 46, w: 600, ls: tight(46) });
      markRect(ctx, RX, 552, ew, 46, curves.glide(clamp(local / 0.1)));
      it(ctx, EFFECTS[i], RX, 552 + (1 - p) * 16, { size: 46, w: 600, color: HP.ink, ls: tight(46) });
      // progress ticks
      for (let k = 0; k < 20; k++) {
        ctx.fillStyle = k <= i ? HP.blue : HP.line;
        ctx.beginPath();
        rrect(ctx, RX + k * 21, 600, 15, 6, 3);
        ctx.fill();
      }
    } else {
      const pr = seg(lt, 0.5, 0.8);
      if (pr > 0) {
        ctx.save();
        ctx.globalAlpha = pr;
        eyebrow(ctx, "Effects", RX, 330, { size: 20, w: 600 });
        it(ctx, "00", RX, 470, { size: 150, w: 600, color: HP.line, ls: tight(150) });
        ctx.restore();
      }
    }

    // the finished reel goes back into HandlePilot
    const pu = pop(lt, BAR * 4 - 2 * B, 380, 22);
    if (pu > 0) {
      const tw = 560, th = 92, tx = RX, ty = 700;
      ctx.save();
      ctx.globalAlpha = clamp(pu * 2);
      ctx.translate(0, (1 - clamp(pu)) * 30);
      hpCard(ctx, tx, ty, tw, th, { r: 46, shadow: 0.5 });
      logo(ctx, env, tx + 48, ty + th / 2, 26);
      it(ctx, "Uploaded to HandlePilot", tx + 90, ty + 42, { size: 28, w: 600, color: HP.ink, ls: -0.8 });
      it(ctx, "Ready to publish", tx + 90, ty + 72, { size: 20, w: 400, color: HP.muted });
      // green check
      ctx.fillStyle = HP.green;
      ctx.beginPath();
      ctx.arc(tx + tw - 48, ty + th / 2, 22, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = HP.ink;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx + tw - 58, ty + th / 2);
      ctx.lineTo(tx + tw - 51, ty + th / 2 + 7);
      ctx.lineTo(tx + tw - 37, ty + th / 2 - 8);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.restore();
    }
  },
};
