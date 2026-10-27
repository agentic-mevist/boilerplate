// 06 — EDIT
// The take from the chat grows into a phone. Bar 1: the raw take, as shot.
// On the downbeat of bar 2 a scan line turns it into the edit Claude made from
// it (the effects reel), one effect per eighth note, ending on its pull-back
// into HandlePilot's board.
import { W, H, BEAT, BAR, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { sg, jb, card, cover, pop, riseLines, serifLine, pill, logo } from "../engine/ui.js";
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
  hud: () => "light",
  blur: (lt) => (lt < 0.4 ? { samples: 2 } : null),
  render(ctx, lt, env) {
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 0, W, H);
    // faint grid
    ctx.strokeStyle = "rgba(242,245,239,.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 96) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 96) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

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
    card(ctx, x - 12, y - 12, w + 24, h + 24, { r: r + 10, fill: "#2A2D35", shadow: 1.2 });
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
        g.addColorStop(0, alpha(PAL.lime, 0));
        g.addColorStop(1, alpha(PAL.lime, 0.55));
        ctx.fillStyle = g;
        ctx.fillRect(x, sy - 120, w, 120);
        ctx.fillStyle = PAL.lime;
        ctx.fillRect(x - 30, sy - 2, w + 60, 4);
      }
    }
    ctx.restore();

    // left column: what happened
    if (lt < T_WIPE) {
      riseLines(ctx, lt, ["DROP IN", "A RAW TAKE."], 120, 300, { size: 92, color: PAL.paper, t0: 0.15, maxW: 560 });
      serifLine(ctx, lt, "one take, no edits", 120, 590, { size: 58, color: PAL.paper, t0: 0.5 });
    } else {
      const lt2 = lt - T_WIPE;
      riseLines(ctx, lt2, ["GET THE", "EDIT BACK."], 120, 300, { size: 92, color: PAL.lime, t0: 0, maxW: 560 });
      serifLine(ctx, lt2, "motion graphics, in your style", 120, 590, { size: 50, color: PAL.paper, t0: 0.3 });
    }
    const pk = seg(lt, 0.2, 0.5);
    if (pk > 0) {
      ctx.save();
      ctx.globalAlpha = pk;
      jb(ctx, lt < T_WIPE ? "THE UPLOAD" : "THE EDIT", 120, 250, { size: 20, w: 600, color: lt < T_WIPE ? PAL.mute : PAL.lime, ls: 3 });
      ctx.restore();
    }

    // right column: the effect counter, ticking on every eighth
    const RX = PX + PW + 90;
    if (lt >= T_WIPE) {
      const i = ai.i;
      const local = i < 19 ? (lt - T_WIPE) - i * E : lt - T_PULL;
      const p = curves.snap(clamp(local / 0.12));
      jb(ctx, "EFFECT", RX, 330, { size: 20, w: 600, color: PAL.mute, ls: 3 });
      const nw = sg(ctx, String(i + 1).padStart(2, "0"), RX, 470 + (1 - p) * 30, { size: 150, w: 700, color: PAL.paper });
      sg(ctx, "/20", RX + nw + 14, 470, { size: 50, w: 500, color: PAL.mute });
      sg(ctx, EFFECTS[i], RX, 550 + (1 - p) * 16, { size: 46, w: 700, color: PAL.lime });
      // progress ticks
      for (let k = 0; k < 20; k++) {
        ctx.fillStyle = k <= i ? PAL.lime : "rgba(242,245,239,.16)";
        ctx.fillRect(RX + k * 21, 600, 15, 6);
      }
    } else {
      const pr = seg(lt, 0.5, 0.8);
      if (pr > 0) {
        ctx.save();
        ctx.globalAlpha = pr;
        jb(ctx, "EFFECTS", RX, 330, { size: 20, w: 600, color: PAL.mute, ls: 3 });
        sg(ctx, "00", RX, 470, { size: 150, w: 700, color: "rgba(242,245,239,.35)" });
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
      card(ctx, tx, ty, tw, th, { r: 46, fill: PAL.paper, shadow: 0.8 });
      logo(ctx, env, tx + 48, ty + th / 2, 26);
      sg(ctx, "Uploaded to HandlePilot", tx + 90, ty + 42, { size: 28, w: 700, color: PAL.ink });
      sg(ctx, "Ready to publish", tx + 90, ty + 72, { size: 20, w: 500, color: "#565D66" });
      ctx.restore();
    }
  },
};
