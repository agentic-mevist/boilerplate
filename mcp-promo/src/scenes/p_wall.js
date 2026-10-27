// 13 — ALL OF IT
// Pull back from the board into a wall of everything we just saw, then four
// words slam over it on the beat: RESEARCH. PLAN. MAKE. SHIP.
import { W, H, BEAT, PAL, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { head } from "../engine/ui.js";
import { playbooks, lookup, watch, plan, carousel, board } from "./p_tools.js";
import hub from "./p_hub.js";
import chat from "./p_chat.js";

const B = BEAT;
const COLS = 4, ROWS = 3;
const TW = 560, TH = 315, GAP = 36;
// [scene, local time to freeze]; the board sits where the camera starts
const TILES = [
  [hub, 3.0], [playbooks, 1.7], [lookup, 1.7], [chat, 3.2],
  [watch, 1.7], [plan, 1.7], [board, 1.8], [carousel, 1.7],
  [lookup, 1.0], [watch, 3.2], [playbooks, 1.1], [plan, 1.0],
];
const HOME = 6; // index of the board tile
let cache = null;
function tiles(env) {
  if (cache) return cache;
  cache = TILES.map(([s, t]) => {
    const c = env.createCanvas(W, H);
    const g = c.getContext("2d");
    s.render(g, t, env);
    const small = env.createCanvas(TW, TH);
    small.getContext("2d").drawImage(c, 0, 0, TW, TH);
    return small;
  });
  return cache;
}
const pos = (i) => {
  const c = i % COLS, r = Math.floor(i / COLS);
  const gw = COLS * TW + (COLS - 1) * GAP, gh = ROWS * TH + (ROWS - 1) * GAP;
  return [W / 2 - gw / 2 + c * (TW + GAP), H / 2 - gh / 2 + r * (TH + GAP)];
};
const WORDS = ["Research.", "Plan.", "Make.", "Ship."];

export default {
  hud: () => "dark",
  blur: (lt) => (lt < 0.6 ? { samples: 2.5 } : null),
  render(ctx, lt, env) {
    const T = tiles(env);
    ctx.fillStyle = HP.paper;
    ctx.fillRect(0, 0, W, H);
    // camera: from the board tile filling the frame to the whole wall, drifting
    const pb = curves.glide(seg(lt, 0, 0.9));
    const [hx, hy] = pos(HOME);
    const zFull = W / TW;
    const z = lerp(zFull, 0.62, pb) * (1 + 0.03 * lt);
    const cx = lerp(hx + TW / 2, W / 2, pb), cy = lerp(hy + TH / 2, H / 2, pb);
    const dim = seg(lt, 4 * B - 0.1, 4 * B + 0.2);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.rotate(-0.06 * pb);
    ctx.translate(-cx - lt * 20, -cy);
    T.forEach((img, i) => {
      const [x, y] = pos(i);
      const p = i === HOME ? 1 : curves.snap(seg(lt, 0.15 + ((i * 5) % 12) * 0.03, 0.6 + ((i * 5) % 12) * 0.03));
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.shadowColor = "rgba(0,0,0,.12)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      rrect(ctx, x, y + (1 - p) * 40, TW, TH, 14);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = p;
      ctx.beginPath();
      rrect(ctx, x, y + (1 - p) * 40, TW, TH, 14);
      ctx.clip();
      ctx.drawImage(img, x, y + (1 - p) * 40, TW, TH);
      ctx.restore();
    });
    ctx.restore();
    if (dim > 0) {
      ctx.fillStyle = alpha(HP.paper, 0.86 * dim);
      ctx.fillRect(0, 0, W, H);
    }
    // the four verbs, one per beat in bar 2, stacked and left-aligned; each
    // gets the highlighter as it lands
    WORDS.forEach((w, i) => {
      const t0 = 4 * B + i * B;
      head(ctx, lt, [`[${w}]`], 150, 160 + i * 208, { size: 162, t0, markAt: 0.12, markD: 0.26 });
    });
  },
};
