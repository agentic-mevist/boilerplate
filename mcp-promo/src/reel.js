// The reel: routes global time to scenes, then draws the HUD + film finish.
import { W, H, BAR, BEAT, DURATION, FPS, PAL, HP, CHAPTERS } from "./timeline.js";
import { seg, ease, curves, hash, mix, alpha } from "./engine/math.js";

import { it, logo, tight } from "./engine/ui.js";
import hook from "./scenes/p_hook.js";
import hub from "./scenes/p_hub.js";
import chat from "./scenes/p_chat.js";
import edit from "./scenes/p_edit.js";
import { playbooks, lookup, watch, plan, carousel, board } from "./scenes/p_tools.js";
import wall from "./scenes/p_wall.js";
import connect from "./scenes/p_connect.js";
import identity from "./scenes/p_end.js";

const BY_KEY = { hook, hub, chat, edit, playbooks, lookup, watch, plan, carousel, board, wall, connect, identity };
export const SCENES = CHAPTERS.map((c, i) => ({ ...BY_KEY[c.key], index: i, start: c.start, end: c.end, chapter: c }));

export function sceneAt(t) {
  for (const s of SCENES) if (t < s.end - 1e-9) return s;
  return SCENES[SCENES.length - 1];
}

// Scene content only. This is what gets motion-blurred.
export function renderFrame(ctx, t, env) {
  const s = sceneAt(t);
  ctx.save();
  s.render(ctx, t - s.start, env);
  ctx.restore();
}

// Overlay drawn once per output frame (never blurred): HUD, vignette, grain.
export function renderOverlay(ctx, t, env, { grain = true } = {}) {
  drawHUD(ctx, t, env);
  drawFinish(ctx, t, env, grain);
}

// ── HUD ────────────────────────────────────────────────────────────────────
// The website's header, small: the mark + "HandlePilot" top left. (v5: no
// "MCP server" eyebrow, chapter name or chapter progress; Victor found them
// distracting.)
function hudColor(t) {
  const s = sceneAt(t);
  const lt = t - s.start;
  const c = s.hud ? s.hud(lt) : "light";
  return c === "dark" ? HP.ink : c === "light" ? "#ffffff" : c;
}

function drawHUD(ctx, t, env) {
  const s = sceneAt(t);
  const lt = t - s.start;
  const col = hudColor(t);
  const intro = curves.snap(seg(t, 0.05, 0.6));
  const outro = s.hudFade ? s.hudFade(lt) : 1;
  const a = intro * outro;
  if (a <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = col;

  // top-left: the brand, as in the site header
  logo(ctx, env, 84 + 19, 84, 19);
  it(ctx, "HandlePilot", 84 + 50, 93, { size: 26, w: 600, color: col, ls: tight(26) * 0.6 });
  ctx.restore();
}

// ── Film finish: vignette + animated grain ─────────────────────────────────
let grainTiles = null;
function makeGrain(env) {
  const tiles = [];
  for (let k = 0; k < 4; k++) {
    const c = env.createCanvas(256, 256);
    const g = c.getContext("2d");
    const img = g.createImageData(256, 256);
    let seed = 1234 + k * 999;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = seed >>> 24;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}

function drawFinish(ctx, t, env, grain) {
  // vignette (gentler on light grounds so paper never looks grubby)
  const sc = sceneAt(t);
  const va = sc.vignette ? sc.vignette(t - sc.start) : hudColor(t) === HP.ink ? 0.05 : 0.18;
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.1);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${va.toFixed(4)})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  if (!grain || !env || !env.createCanvas) return;
  if (!grainTiles) grainTiles = makeGrain(env);
  const f = Math.round(t * FPS);
  const tile = grainTiles[f % grainTiles.length];
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = hudColor(t) === HP.ink ? 0.035 : 0.06;
  const ox = Math.floor(hash(f * 3 + 1) * 256), oy = Math.floor(hash(f * 7 + 2) * 256);
  const pat = ctx.createPattern(tile, "repeat");
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}
