// 14 — CONNECT
// One URL, pasted once: add the connector, sign in, Allow, connected.
import { W, H, BEAT, PAL, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { card, pop, typed, logo, it, head, eyebrow, hpCard } from "../engine/ui.js";

const B = BEAT;
const URL = "https://app.handlepilot.com/mcp";
const DX = 560, DY = 330, DW = 800, DH = 560;
const ADD = { x: DX + DW - 40 - 150, y: DY + DH - 40 - 64, w: 150, h: 64 };
const ALLOW = { x: 1210, y: 740, w: 200, h: 64 };

function cursor(ctx, x, y, press) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 - 0.15 * press, 1 - 0.15 * press);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = HP.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 38);
  ctx.lineTo(10, 29);
  ctx.lineTo(18, 46);
  ctx.lineTo(25, 43);
  ctx.lineTo(17, 26);
  ctx.lineTo(30, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
const press = (lt, t) => Math.exp(-(((lt - t) / 0.06) ** 2));

export default {
  hud: () => "dark",
  blur: (lt) => (lt < 0.3 ? { samples: 2.5 } : null),
  render(ctx, lt, env) {
    ctx.fillStyle = HP.paper;
    ctx.fillRect(0, 0, W, H);
    const gl = ctx.createRadialGradient(W / 2, 620, 0, W / 2, 620, 800);
    gl.addColorStop(0, HP.skyPanel);
    gl.addColorStop(1, "rgba(234,240,252,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
    head(ctx, lt, ["One URL. [Any agent.]"], W / 2, 130, { size: 104, t0: 0.02, align: 0.5, markAt: 0.28 });

    // the connector dialog
    const pd = spring(lt - 0.1, { k: 240, c: 21 });
    ctx.save();
    ctx.globalAlpha = clamp(pd * 2);
    ctx.translate(0, (1 - clamp(pd)) * 80);
    hpCard(ctx, DX, DY, DW, DH, { r: 28, shadow: 0.7 });
    it(ctx, "Add custom connector", DX + 44, DY + 74, { size: 34, w: 600, color: HP.ink, ls: -1.2 });
    const field = (label, val, y, p, focus) => {
      eyebrow(ctx, label, DX + 44, y, { size: 15, w: 600 });
      card(ctx, DX + 44, y + 16, DW - 88, 72, { r: 14, fill: "#fff", stroke: focus ? HP.blue : HP.line, lw: focus ? 2.5 : 1.5 });
      const str = typed(val, p);
      const tw = it(ctx, str, DX + 68, y + 63, { size: 28, w: 500, color: HP.ink });
      if (focus && Math.floor(lt * 5) % 2 === 0) {
        ctx.fillStyle = HP.ink;
        ctx.fillRect(DX + 72 + tw, y + 36, 2.5, 34);
      }
    };
    const pn = seg(lt, 0.3, 0.75), pu = seg(lt, 0.85, 2.6 * B + 0.4);
    field("Name", "HandlePilot", DY + 140, pn, pn < 1);
    field("Remote MCP server URL", URL, DY + 270, pu, pn >= 1 && lt < 4 * B);
    // Add button
    const added = lt > 4 * B;
    card(ctx, ADD.x, ADD.y, ADD.w, ADD.h, { r: 32, fill: added ? HP.green : HP.blue });
    it(ctx, added ? "Added" : "Add", ADD.x + ADD.w / 2, ADD.y + 42, { size: 26, w: 600, color: added ? HP.ink : "#fff", align: 0.5 });
    ctx.restore();

    // sign-in sheet: HandlePilot asks, Allow
    const ps = spring(lt - 4 * B - 0.08, { k: 260, c: 22 });
    if (ps > 0) {
      const sx = 1010, sy = 470, sw = 600, sh = 400;
      ctx.save();
      ctx.globalAlpha = clamp(ps * 2) * (1 - seg(lt, 7 * B, 7 * B + 0.15));
      ctx.translate(0, (1 - clamp(ps)) * 60);
      hpCard(ctx, sx, sy, sw, sh, { r: 26, shadow: 1 });
      logo(ctx, env, sx + 70, sy + 76, 34);
      it(ctx, "HandlePilot", sx + 120, sy + 87, { size: 30, w: 600, color: HP.ink, ls: -1 });
      it(ctx, "Your agent wants to use your", sx + 40, sy + 170, { size: 24, w: 400, color: HP.muted });
      it(ctx, "workspaces, research and editors.", sx + 40, sy + 204, { size: 24, w: 400, color: HP.muted });
      const allowed = lt > 6 * B;
      card(ctx, ALLOW.x, ALLOW.y, ALLOW.w, ALLOW.h, { r: 32, fill: allowed ? HP.green : HP.blue });
      it(ctx, allowed ? "Allowed" : "Allow", ALLOW.x + ALLOW.w / 2, ALLOW.y + 42, { size: 26, w: 600, color: allowed ? HP.ink : "#fff", align: 0.5 });
      it(ctx, "Cancel", ALLOW.x - 120, ALLOW.y + 42, { size: 24, w: 500, color: HP.muted, align: 0.5 });
      ctx.restore();
    }

    // the pointer: drifts to Add (beat 4), then to Allow (beat 6)
    const k1 = curves.glide(seg(lt, 2.6 * B, 4 * B - 0.04)), k2 = curves.glide(seg(lt, 4.6 * B, 6 * B - 0.04));
    let cx = lerp(1500, ADD.x + 90, k1), cy = lerp(980, ADD.y + 34, k1);
    cx = lerp(cx, ALLOW.x + 120, k2);
    cy = lerp(cy, ALLOW.y + 36, k2);
    if (lt > 2.2 * B && lt < 7 * B) cursor(ctx, cx, cy, Math.max(press(lt, 4 * B), press(lt, 6 * B)));
    // click ripples
    for (const [t, x, y] of [[4 * B, ADD.x + 90, ADD.y + 34], [6 * B, ALLOW.x + 120, ALLOW.y + 36]]) {
      const p = seg(lt, t, t + 0.4);
      if (p <= 0 || p >= 1) continue;
      ctx.strokeStyle = alpha(HP.blue, 1 - p);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 10 + 60 * curves.snap(p), 0, TAU);
      ctx.stroke();
    }

    // connected toast on beat 7
    const pt = pop(lt, 7 * B, 380, 22);
    if (pt > 0) {
      const tw = 520, th = 96, tx = W / 2 - tw / 2, ty = 912;
      ctx.save();
      ctx.translate(W / 2, ty + th / 2);
      ctx.scale(clamp(pt, 0, 1.1), clamp(pt, 0, 1.1));
      card(ctx, -tw / 2, -th / 2, tw, th, { r: 48, fill: HP.green, shadow: 0.5 });
      ctx.strokeStyle = HP.ink;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-tw / 2 + 44, 0);
      ctx.lineTo(-tw / 2 + 60, 16);
      ctx.lineTo(-tw / 2 + 88, -16);
      ctx.stroke();
      ctx.lineCap = "butt";
      it(ctx, "HandlePilot connected", -tw / 2 + 112, 12, { size: 34, w: 600, color: HP.ink, ls: -1.2 });
      ctx.restore();
    }
  },
};
