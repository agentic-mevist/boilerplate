// The reel: routes global time to scenes, then draws the HUD + film finish.
import { W, H, BAR, BEAT, DURATION, FPS, PAL, CHAPTERS } from "./timeline.js";
import { clamp, seg, ease, curves, hash, mix, alpha } from "./engine/math.js";
import { text, scramble, rrect } from "./engine/draw.js";

import s1 from "./scenes/s1_bounce.js";
import s2 from "./scenes/s2_type.js";
import s3 from "./scenes/s3_geometry.js";
import hub from "./scenes/p_hub.js";
import chat from "./scenes/p_chat.js";
import edit from "./scenes/p_edit.js";
import { playbooks, lookup, watch, plan, carousel, board } from "./scenes/p_tools.js";
import wall from "./scenes/p_wall.js";
import connect from "./scenes/p_connect.js";
import identity from "./scenes/s8_identity.js";

const BY_KEY = { bounce: s1, type: s2, grid: s3, hub, chat, edit, playbooks, lookup, watch, plan, carousel, board, wall, connect, identity };
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
  drawHUD(ctx, t);
  drawFinish(ctx, t, env, grain);
}

// ── HUD ────────────────────────────────────────────────────────────────────
function hudColor(t) {
  const s = sceneAt(t);
  const lt = t - s.start;
  const c = s.hud ? s.hud(lt) : "light";
  return c === "dark" ? PAL.ink : c === "light" ? PAL.paper : c;
}

function timecode(t) {
  const f = Math.min(DURATION * FPS, Math.round(t * FPS));
  const ss = Math.floor(f / FPS), ff = f % FPS;
  return `00:${String(Math.floor(ss / 60)).padStart(2, "0")}:${String(ss % 60).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
}

function drawHUD(ctx, t) {
  const s = sceneAt(t);
  const lt = t - s.start;
  const col = hudColor(t);
  const intro = curves.snap(seg(t, 0.05, 0.6));
  const outro = s.hudFade ? s.hudFade(lt) : 1;
  const a = intro * outro;
  if (a <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = "butt";

  // crop marks
  const m = 40, L = 26 * intro;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x, y + dy * L);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * L, y);
  }
  ctx.stroke();

  const mono = { font: "mono", size: 15, tracking: 0.12, axes: { wght: 460 } };
  const decodeIntro = seg(t, 0.1, 0.7);

  // top-left: name
  const nm = text(ctx, scramble("HANDLEPILOT", decodeIntro, 1), 84, 92, { ...mono, axes: { wght: 800 } });
  text(ctx, scramble("MCP SERVER '26", decodeIntro, 2), 84 + nm.width + 18, 92, { ...mono });

  // top-right: beat light + timecode
  const beatPhase = (t / BEAT) % 1;
  const blink = t < DURATION - 0.02 ? Math.max(0.25, 1 - beatPhase * 1.6) : 1;
  const tc = text(ctx, timecode(t), W - 84, 92, { ...mono, align: 1 });
  const tcl = text(ctx, "TC", tc.ox - 14, 92, { ...mono, axes: { wght: 800 }, align: 1 });
  ctx.save();
  ctx.globalAlpha = a * blink;
  ctx.fillStyle = PAL.orange;
  ctx.beginPath();
  ctx.arc(tcl.ox - 16, 87, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // bottom-left: chapter with decode on change
  const ch = s.chapter;
  const p = clamp(lt / 0.32);
  const label = scramble(`${ch.id} / ${ch.title}`, t < 0.1 ? 0 : p, s.index + 3);
  text(ctx, label, 84, H - 80, { ...mono, size: 15 });

  // bottom-right: chapter progress
  const segW = 16, gap = 5, n = SCENES.length;
  const x0 = W - 84 - n * segW - (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    const fill = clamp((t - SCENES[i].start) / (SCENES[i].end - SCENES[i].start));
    const x = x0 + i * (segW + gap);
    ctx.save();
    ctx.globalAlpha = a * 0.35;
    ctx.fillRect(x, H - 88, segW, 4);
    ctx.restore();
    if (fill > 0) ctx.fillRect(x, H - 88, segW * fill, 4);
  }
  text(ctx, "APP.HANDLEPILOT.COM/MCP", x0 - 22, H - 80, { ...mono, align: 1 });
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
  const va = sc.vignette ? sc.vignette(t - sc.start) : hudColor(t) === PAL.ink ? 0.07 : 0.2;
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
  ctx.globalAlpha = 0.07;
  const ox = Math.floor(hash(f * 3 + 1) * 256), oy = Math.floor(hash(f * 7 + 2) * 256);
  const pat = ctx.createPattern(tile, "repeat");
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}
