// 05 — ASK
// Out of the @, a chat with your agent. A raw take is dropped in, one line is
// typed, and the agent works through HandlePilot's tools on the beat.
import { W, H, BEAT, PAL, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { sg, jb, card, cover, pop, typed, measure } from "../engine/ui.js";

const B = BEAT;
const WX = 310, WY = 120, WW = 1300, WH = 840;
const ASK = "Edit this into a reel: motion graphics, captions, our style.";
const STEPS = [
  ["get_playbook", "reel-editing"],
  ["get_creator_context", "voice, style, brand"],
  ["watch_video", "take.mp4 · every beat"],
  ["render", "cutting it on your computer"],
];
// the thumbnail card's resting place in the chat (the edit scene grows it from here)
export const THUMB = { x: WX + WW - 60 - 140, y: WY + 100, w: 140, h: 249 };

export default {
  hud: () => "light",
  blur: (lt) => (lt < 0.35 || lt > 3.45 ? { samples: 2.5 } : null),
  render(ctx, lt, env) {
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 0, W, H);
    const pw = spring(lt - 0.02, { k: 220, c: 20 });
    const s = lerp(0.9, 1, clamp(pw));
    const exit = ease.inCubic(seg(lt, 3.45, 3.75));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(s, s);
    ctx.translate(-W / 2, -H / 2 - exit * 60);
    ctx.globalAlpha = clamp(pw * 1.5) * (1 - exit);

    // window chrome
    card(ctx, WX, WY, WW, WH, { r: 28, fill: "#1A1D24", stroke: "rgba(255,255,255,.08)", shadow: 1 });
    ctx.fillStyle = "#15171D";
    ctx.beginPath();
    rrect(ctx, WX, WY, 270, WH, 28);
    ctx.fill();
    ctx.fillRect(WX + 240, WY, 30, WH);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 0 ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.05)";
      ctx.beginPath();
      rrect(ctx, WX + 26, WY + 100 + i * 56, i === 0 ? 218 : 150 + ((i * 37) % 60), 34, 10);
      ctx.fill();
    }
    sg(ctx, "Your AI agent", WX + 310, WY + 58, { size: 24, w: 700, color: PAL.paper });
    // connected badge
    const bw = measure(ctx, "HandlePilot connected", { size: 18, w: 500 }) + 46;
    card(ctx, WX + WW - 40 - bw, WY + 30, bw, 40, { r: 20, fill: "rgba(192,239,173,.14)" });
    ctx.fillStyle = HP.green;
    ctx.beginPath();
    ctx.arc(WX + WW - 40 - bw + 20, WY + 50, 6, 0, TAU);
    ctx.fill();
    sg(ctx, "HandlePilot connected", WX + WW - 40 - bw + 34, WY + 57, { size: 18, w: 500, color: HP.green });

    // 1. the take is dropped in (a drag from off-screen, landing on beat 2)
    const pd = curves.snap(seg(lt, 0.25, B + 0.1));
    const land = pop(lt, B, 420, 22);
    const fx = lerp(W + 120, THUMB.x, pd), fy = lerp(H + 200, THUMB.y, pd) - Math.sin(Math.PI * pd) * 120;
    const rot = lerp(0.25, 0, pd);
    if (lt > 0.25) {
      ctx.save();
      ctx.translate(fx + THUMB.w / 2, fy + THUMB.h / 2);
      ctx.rotate(rot);
      const sq = lt > B ? 1 + 0.06 * Math.exp(-(lt - B) * 12) * Math.cos((lt - B) * 30) : 1;
      ctx.scale(sq, 2 - sq);
      card(ctx, -THUMB.w / 2 - 6, -THUMB.h / 2 - 6, THUMB.w + 12, THUMB.h + 12, { r: 22, fill: "#2A2D35", shadow: 0.8 });
      cover(ctx, env.clip("before", lt * 30), -THUMB.w / 2, -THUMB.h / 2, THUMB.w, THUMB.h, 16);
      ctx.restore();
      if (land > 0) {
        ctx.save();
        ctx.globalAlpha *= clamp(land);
        jb(ctx, "take.mp4", THUMB.x - 20, THUMB.y + 36, { size: 20, w: 600, color: PAL.paper, align: 1 });
        jb(ctx, "4K · 77 s · no edits", THUMB.x - 20, THUMB.y + 66, { size: 17, color: PAL.mute, align: 1 });
        ctx.restore();
      }
    }

    // 2. the ask, typed into a user bubble
    const pa = seg(lt, B + 0.1, 3 * B);
    if (pa > 0) {
      const str = typed(ASK, pa);
      const cut0 = ASK.indexOf("motion");
      const bwid = Math.max(measure(ctx, ASK.slice(0, cut0), { size: 28, w: 500 }), measure(ctx, ASK.slice(cut0), { size: 28, w: 500 })) + 64;
      const bx = WX + WW - 60 - bwid, by = THUMB.y + THUMB.h + 22;
      card(ctx, bx, by, bwid, 116, { r: 26, fill: HP.blue });
      // two lines
      const cut = ASK.indexOf("motion");
      const l1 = str.slice(0, Math.min(str.length, cut)), l2 = str.length > cut ? str.slice(cut) : "";
      sg(ctx, l1, bx + 30, by + 48, { size: 28, w: 500, color: "#fff" });
      sg(ctx, l2 + (pa < 1 && Math.floor(lt * 6) % 2 ? "▍" : ""), bx + 30, by + 88, { size: 28, w: 500, color: "#fff" });
    }

    // 3. the agent's tool calls, one per beat
    const ax = WX + 310, ay = WY + 500;
    STEPS.forEach(([tool, note], i) => {
      const t0 = 3.3 * B + i * B;
      const p = pop(lt, t0, 360, 24);
      if (p <= 0) return;
      const y = ay + i * 72 + (1 - clamp(p)) * 30;
      ctx.save();
      ctx.globalAlpha *= clamp(p * 2);
      card(ctx, ax, y, 520, 62, { r: 16, fill: "#242833" });
      const done = lt > t0 + 0.75 * B;
      // spinner → check
      ctx.strokeStyle = done ? HP.green : PAL.paper;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (done) {
        ctx.moveTo(ax + 26, y + 34);
        ctx.lineTo(ax + 35, y + 43);
        ctx.lineTo(ax + 52, y + 24);
      } else {
        const a0 = lt * 9;
        ctx.arc(ax + 39, y + 33, 12, a0, a0 + 4.2);
      }
      ctx.stroke();
      jb(ctx, tool, ax + 72, y + 30, { size: 21, w: 600, color: PAL.paper });
      sg(ctx, note, ax + 72, y + 54, { size: 17, w: 400, color: PAL.mute });
      ctx.restore();
    });
    // progress bar under the last step
    const pp = seg(lt, 6.4 * B, 7.6 * B);
    if (pp > 0) {
      const y = ay + 4 * 72 + 4;
      card(ctx, ax, y, 520, 10, { r: 5, fill: "#242833" });
      card(ctx, ax, y, 520 * ease.inOutCubic(pp), 10, { r: 5, fill: HP.green });
    }
    ctx.restore();
  },
};
