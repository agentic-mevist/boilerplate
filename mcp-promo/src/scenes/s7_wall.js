// 07 — COMPOSITING
// Pull back from the liquid shot to reveal a 5×5 wall of live tiles — every
// scene of the reel plus eight extra loops — then the wall flips, tile by tile,
// into a skills index, and we push into the one tile still holding the dot.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, TAU, mod, alpha, mix } from "../engine/math.js";
import { rrect, text } from "../engine/draw.js";
import s1 from "./s1_bounce.js";
import s2 from "./s2_type.js";
import s3 from "./s3_geometry.js";
import s4 from "./s4_dimension.js";
import s5 from "./s5_particles.js";
import s6 from "./s6_fluid.js";
import s8 from "./s8_identity.js";
import * as mini from "./minis.js";

const B = BEAT;
const CX = W / 2, CY = H / 2;
const GAP = 96;
const STEP_X = W + GAP, STEP_Y = H + GAP;
const RAD = 44;
const S_WALL = 0.188;
const T_PULL = 0.62, T_FLIP = 1.0, T_CENTER = 1.38, T_PUSH = 1.5, T_END = 4 * B;

const seq = (sc, a, b, speed = 1, phase = 0) => (ctx, t) => sc.render(ctx, a + mod(t * speed + phase, b - a));
const fn = (f, phase = 0) => (ctx, t) => f(ctx, t + phase);

// 5×5 wall, row-major; null = centre tile
const TILES = [
  [seq(s2, 1.3, 1.52), fn(mini.miniBars), seq(s4, 0.1, 1.3), fn(mini.miniPalette), seq(s1, 0.0, 1.4)],
  [seq(s5, 0.95, 1.55), seq(s3, 0.0, 1.0), fn(mini.miniToggle), seq(s6, 0.9, 1.7), fn(mini.miniSpecimen)],
  [seq(s4, 0.45, 1.0), fn(mini.miniLoop), null, seq(s5, 1.2, 1.62, 1, 0.2), seq(s3, 1.0, 1.5)],
  [fn(mini.miniEQ), seq(s1, 0.3, 1.45, 1, 0.5), seq(s2, 0.9, 1.5), fn(mini.miniOrbit), seq(s6, 0.12, 0.62)],
  [seq(s3, 1.3, 1.56), seq(s5, 0.25, 0.95), fn(mini.miniWaves), seq(s4, 1.0, 1.38), seq(s2, 0.35, 1.25)],
];
const SKILLS = [
  "KINETIC TYPE", "DATA VIZ", "3D", "COLOUR", "CHARACTER",
  "PARTICLES", "PATTERN", "UI MOTION", "FLUIDS", "VARIABLE FONTS",
  "MODELLING", "LOOPS", "", "SIMULATION", "GRIDS",
  "SOUND SYNC", "TIMING", "LAYOUT", "SYSTEMS", "PHYSICS",
  "GEOMETRY", "FLOW FIELDS", "GENERATIVE", "SHADING", "EDITORIAL",
];

function camera(lt) {
  const pull = ease.inOutCubic(seg(lt, 0, T_PULL));
  const push = ease.inQuart(seg(lt, T_PUSH, T_END));
  const drift = seg(lt, T_PULL, T_PUSH);
  let ls = lerp(0, Math.log(S_WALL), pull);
  ls = lerp(ls, Math.log(S_WALL * 0.94), curves.glide(drift));
  ls = lerp(ls, 0, push);
  const rot = lerp(lerp(0, -0.11, pull), -0.07, drift) * (1 - push);
  return { s: Math.exp(ls), rot };
}

function flipAngle(r, c, lt) {
  if (r === 2 && c === 2) return Math.PI * curves.swift(seg(lt, T_CENTER, T_CENTER + 0.2));
  const d = Math.hypot(c - 2, (r - 2) * 1.2) / Math.hypot(2, 2.4);
  const t0 = T_FLIP + (1 - d) * 0.3 + ((r * 5 + c) % 3) * 0.015;
  return Math.PI * curves.swift(seg(lt, t0, t0 + 0.2));
}

// per-frame tile cache (tiles are tiny on screen, so render them once per frame)
let cache = null;
function tileImage(env, idx, draw, t, key) {
  if (!cache) cache = new Map();
  let c = cache.get(idx);
  if (!c) {
    const tw = env.tileRes || 768;
    c = { canvas: env.createCanvas(tw, Math.round((tw * 9) / 16)), key: null };
    cache.set(idx, c);
  }
  if (c.key !== key) {
    const g = c.canvas.getContext("2d");
    g.setTransform(c.canvas.width / W, 0, 0, c.canvas.height / H, 0, 0);
    g.save();
    draw(g, t);
    g.restore();
    c.key = key;
  }
  return c.canvas;
}

function drawBack(ctx, i) {
  ctx.fillStyle = "#121217";
  ctx.fillRect(-W / 2, -H / 2, W, H);
  ctx.strokeStyle = alpha(PAL.paper, 0.22);
  ctx.lineWidth = 8;
  ctx.beginPath();
  rrect(ctx, -W / 2 + 4, -H / 2 + 4, W - 8, H - 8, RAD);
  ctx.stroke();
  text(ctx, String(i + 1).padStart(2, "0"), -W / 2 + 90, -H / 2 + 170, { font: "mono", size: 96, axes: { wght: 400 }, color: alpha(PAL.paper, 0.45) });
  text(ctx, SKILLS[i], 0, 60, { font: "display", size: 180, axes: { wght: 800, wdth: 112 }, align: 0.5, color: PAL.paper });
}

export default {
  hud: (lt) => mix(PAL.ink, PAL.paper, ease.inOutSine(seg(lt, 0.08, 0.4))),
  vignette: (lt) => lerp(0.07, 0.2, seg(lt, 0.05, 0.45)),
  blur: (lt) => (lt > T_PUSH ? { samples: 2.5 } : lt < T_PULL ? { samples: 1.5 } : null),
  render(ctx, lt, env) {
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 0, W, H);
    const cam = camera(lt);
    // one tile render per output frame (shared by its sub-frames); live playback may refresh less often
    const key = Math.round((lt * 60) / ((env && env.tileStride) || 1));
    const beatPulse = 1 + 0.025 * Math.exp(-mod(lt, B) * 10) * seg(lt, T_PULL - 0.1, T_PULL) * (1 - seg(lt, T_FLIP, T_FLIP + 0.1));
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(cam.rot);
    ctx.scale(cam.s, cam.s);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const x = (c - 2) * STEP_X, y = (r - 2) * STEP_Y;
        // cull tiles that are off screen
        const sx = Math.abs(x) * cam.s, sy = Math.abs(y) * cam.s;
        const halfW = (W / 2) * cam.s, halfH = (H / 2) * cam.s;
        if (sx - halfW > W * 0.75 || sy - halfH > H * 0.75) continue;
        const ang = flipAngle(r, c, lt);
        const centre = r === 2 && c === 2;
        const showBack = ang > Math.PI / 2;
        const kx = Math.abs(Math.cos(ang));
        ctx.save();
        ctx.translate(x, y);
        if (!centre) ctx.scale(beatPulse, beatPulse);
        ctx.scale(Math.max(0.001, kx), 1);
        ctx.beginPath();
        rrect(ctx, -W / 2, -H / 2, W, H, centre && cam.s > 0.9 ? RAD * (1 - seg(cam.s, 0.9, 1)) : RAD);
        ctx.clip();
        const onScreen = W * cam.s;
        ctx.save();
        if (centre) {
          ctx.translate(-W / 2, -H / 2);
          if (showBack) s8.render(ctx, 0, env);
          else s6.render(ctx, 4 * B, env);
        } else if (showBack) {
          drawBack(ctx, r * 5 + c);
        } else {
          const draw = TILES[r][c];
          if (onScreen > 900 || !env || !env.createCanvas) {
            ctx.translate(-W / 2, -H / 2);
            draw(ctx, lt);
          } else {
            ctx.drawImage(tileImage(env, r * 5 + c, draw, lt, key), -W / 2, -H / 2, W, H);
          }
        }
        ctx.restore();
        // hairline frame so dark tiles still read as cards
        ctx.strokeStyle = alpha(PAL.paper, 0.12);
        ctx.lineWidth = 6;
        ctx.beginPath();
        rrect(ctx, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, RAD);
        ctx.stroke();
        // flip shading
        const shade = 1 - kx;
        if (shade > 0.01) {
          ctx.fillStyle = `rgba(0,0,0,${0.6 * shade})`;
          ctx.fillRect(-W / 2, -H / 2, W, H);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  },
};
