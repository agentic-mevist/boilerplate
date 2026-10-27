// 13 — HANDLEPILOT
// The site's header, as an end card. The mark drops in and lands with a
// squash; "HandlePilot" rises letter by letter beside it and flinches when it
// lands; "Free to start." gets the highlighter, then the address in a blue
// button. One last heartbeat.
import { W, H, BEAT, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "../engine/math.js";
import { it, tight, measureInter, markRect, logo, card, eyebrow } from "../engine/ui.js";

const B = BEAT;
const CX = W / 2;
const WORD = "HandlePilot";
const SIZE = 196, LS = tight(SIZE);
const BASE = 560;
const R = 92, GAP = 44;
const T_LAND = 0.5 * B;

export default {
  hud: () => "dark",
  hudFade: (lt) => 1 - seg(lt, 0.2, 0.5),
  blur: (lt) => (lt < 0.5 ? { samples: 1.5 } : null),
  render(ctx, lt, env) {
    ctx.fillStyle = HP.paper;
    ctx.fillRect(0, 0, W, H);
    const gl = ctx.createRadialGradient(CX, 520, 0, CX, 520, 900);
    gl.addColorStop(0, HP.skyPanel);
    gl.addColorStop(1, "rgba(234,240,252,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);

    const ww = measureInter(ctx, WORD, { size: SIZE, w: 600, ls: LS });
    const total = 2 * R + GAP + ww;
    const lx = CX - total / 2 + R, ly = BASE - SIZE * 0.36;
    const tx = lx + R + GAP;

    // the mark: drops from above, squashes on landing, settles; heartbeat on beat 8
    let my = ly, sx = 1, sy = 1;
    if (lt < T_LAND) {
      const p = lt / T_LAND;
      my = lerp(ly - 620, ly, ease.inQuad(p));
      sy = 1 + 0.18 * p;
      sx = 1 / sy;
    } else {
      const tc = lt - T_LAND;
      const sq = 0.3 * Math.exp(-tc * 14) * Math.cos(tc * 30);
      sx = 1 + sq;
      sy = 1 - sq;
      my = ly + R * Math.max(0, sq) * 0.6;
    }
    const hb = 1 + 0.12 * Math.exp(-(((lt - 7 * B) / 0.06) ** 2)) + 0.05 * Math.exp(-(((lt - 7 * B - 0.16) / 0.05) ** 2));
    ctx.save();
    ctx.translate(lx, my);
    ctx.scale(sx * hb, sy * hb);
    ctx.shadowColor = alpha(HP.blue, 0.4);
    ctx.shadowBlur = 60;
    logo(ctx, env, 0, 0, R, (1 - curves.snap(seg(lt, 0, T_LAND + 0.4))) * -1.6);
    ctx.restore();
    // landing ring + heartbeat ring
    for (const [t0, a] of [[T_LAND, 0.7], [7 * B, 0.5]]) {
      const p = seg(lt, t0, t0 + 0.55);
      if (p <= 0 || p >= 1) continue;
      ctx.strokeStyle = alpha(HP.blue, a * (1 - p));
      ctx.lineWidth = 5 * (1 - p) + 0.5;
      ctx.beginPath();
      ctx.arc(lx, ly, R + 30 + 260 * curves.snap(p), 0, TAU);
      ctx.stroke();
    }

    // the wordmark, letter by letter through a baseline mask
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, BASE - SIZE * 1.02, W, SIZE * 1.32);
    ctx.clip();
    let x = tx;
    for (let i = 0; i < WORD.length; i++) {
      const ch = WORD[i];
      const t0 = 0.08 + i * 0.04;
      const p = curves.snap(seg(lt, t0, t0 + 0.4));
      const fl = lt - T_LAND - i * 0.025;
      const flinch = fl > 0 ? 12 * Math.exp(-fl * 14) * Math.sin(fl * 30) : 0;
      if (p > 0) it(ctx, ch, x, BASE + (1 - p) * SIZE * 1.05 + flinch, { size: SIZE, w: 600, color: HP.ink, ls: LS });
      x += measureInter(ctx, ch, { size: SIZE, w: 600, ls: LS });
    }
    ctx.restore();

    // tagline with the highlighter
    const tag = "Free to start.";
    const ts = 84, tls = tight(ts);
    const tw = measureInter(ctx, tag, { size: ts, w: 600, ls: tls });
    const tyy = BASE + 170;
    const pT = curves.snap(seg(lt, B + 0.05, B + 0.45));
    if (pT > 0) {
      markRect(ctx, CX - tw / 2, tyy, tw, ts, curves.glide(seg(lt, B + 0.3, B + 0.65)));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, tyy - ts * 1.02, W, ts * 1.32);
      ctx.clip();
      it(ctx, tag, CX - tw / 2, tyy + (1 - pT) * ts * 1.05, { size: ts, w: 600, color: HP.ink, ls: tls });
      ctx.restore();
    }
    // the address, as the site's blue button
    const pM = spring(lt - 2 * B, { k: 300, c: 22 });
    if (pM > 0) {
      const label = "handlepilot.com/mcp";
      const bw = measureInter(ctx, label, { size: 34, w: 600 }) + 84, bh = 76;
      ctx.save();
      ctx.translate(CX, tyy + 128);
      ctx.scale(clamp(pM, 0, 1.1), clamp(pM, 0, 1.1));
      card(ctx, -bw / 2, -bh / 2, bw, bh, { r: bh / 2, fill: HP.blue, shadow: 0.4 });
      it(ctx, label, 0, 12, { size: 34, w: 600, color: "#fff", align: 0.5, ls: -0.6 });
      ctx.restore();
    }
    const pS = seg(lt, 2.6 * B, 2.6 * B + 0.4);
    if (pS > 0) {
      ctx.save();
      ctx.globalAlpha = curves.glide(pS);
      eyebrow(ctx, "One URL for any AI agent", CX, tyy + 222, { size: 18, w: 600, align: 0.5 });
      ctx.restore();
    }
  },
};
