// Node host: Skia canvas + font data + linear-light motion-blur accumulator.
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import path from "path";
import fs from "fs";
import { initFonts, FONT_FILES } from "../src/fonts.js";
import { W, H, FPS } from "../src/timeline.js";
import { renderFrame, renderOverlay, sceneAt } from "../src/reel.js";

const dir = new URL("../src/fontdata/", import.meta.url);
const map = {};
for (const [k, f] of Object.entries(FONT_FILES)) map[k] = JSON.parse(fs.readFileSync(new URL(f + ".json", dir)));
initFonts(map);

// UI type (Space Grotesk, the site's face) is drawn natively by Skia.
const root = new URL("..", import.meta.url).pathname;
for (const w of [400, 500, 700]) GlobalFonts.registerFromPath(path.join(root, `fonts/space-grotesk-latin-${w}-normal.woff2`), "Space Grotesk");
GlobalFonts.registerFromPath(path.join(root, "fonts/JetBrainsMono-VF.ttf"), "JetBrains Mono");

// Stills, decoded once before the first frame.
const imgDir = path.join(root, "assets/img");
const images = {};
for (const f of fs.readdirSync(imgDir)) if (/\.(png|jpe?g)$/.test(f)) images[f.replace(/\.\w+$/, "")] = await loadImage(path.join(imgDir, f));

// Clips: raw RGBA frame files (assets/clips/<name>.rgba + .json), read on demand.
const clipDir = path.join(root, "assets/clips");
const clips = {};
if (fs.existsSync(clipDir))
  for (const f of fs.readdirSync(clipDir)) if (f.endsWith(".json")) {
    const name = f.slice(0, -5);
    const meta = JSON.parse(fs.readFileSync(path.join(clipDir, f)));
    clips[name] = { ...meta, fd: fs.openSync(path.join(clipDir, name + ".rgba"), "r"), cache: new Map() };
  }
function clip(name, i) {
  const c = clips[name];
  if (!c) return null;
  i = Math.max(0, Math.min(c.frames - 1, Math.floor(i)));
  if (c.cache.has(i)) return c.cache.get(i);
  const size = c.w * c.h * 4;
  const buf = Buffer.alloc(size);
  fs.readSync(c.fd, buf, 0, size, i * size);
  const cv = createCanvas(c.w, c.h);
  const g = cv.getContext("2d");
  const img = g.createImageData(c.w, c.h);
  img.data.set(buf);
  g.putImageData(img, 0, 0);
  if (c.cache.size > 6) c.cache.delete(c.cache.keys().next().value);
  c.cache.set(i, cv);
  return cv;
}

export const env = { createCanvas: (w, h) => createCanvas(w, h), node: true, images, clip, clips };

// sRGB <-> linear lookup tables
const DEC = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  DEC[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
const ENC_N = 8192;
const ENC = new Uint8ClampedArray(ENC_N + 1);
for (let i = 0; i <= ENC_N; i++) {
  const v = i / ENC_N;
  ENC[i] = Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
}

export function makeRenderer(w = W, h = H) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const acc = new Float32Array(w * h * 3);
  const sx = w / W, sy = h / H;

  function scene(t) {
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    renderFrame(ctx, t, env);
  }

  // Render frame at time t with `samples` sub-frames spread across the shutter.
  function frame(t, { samples = 1, shutter = 0.5, overlay = true, grain = true } = {}) {
    const s = sceneAt(t);
    const lt = t - s.start;
    if (s.blur) {
      const o = s.blur(lt);
      if (o) {
        samples = Math.max(1, Math.round(samples * (o.samples ?? 1)));
        shutter = o.shutter ?? shutter;
      }
    }
    if (samples <= 1) {
      scene(t);
    } else {
      acc.fill(0);
      const dt = shutter / FPS;
      for (let k = 0; k < samples; k++) {
        const tk = t + ((k + 0.5) / samples - 0.5) * dt;
        scene(Math.max(0, tk));
        const d = ctx.getImageData(0, 0, w, h).data;
        for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
          acc[j] += DEC[d[i]];
          acc[j + 1] += DEC[d[i + 1]];
          acc[j + 2] += DEC[d[i + 2]];
        }
      }
      const img = ctx.createImageData(w, h);
      const o = img.data;
      const k = ENC_N / samples;
      for (let i = 0, j = 0; i < o.length; i += 4, j += 3) {
        o[i] = ENC[Math.min(ENC_N, (acc[j] * k) | 0)];
        o[i + 1] = ENC[Math.min(ENC_N, (acc[j + 1] * k) | 0)];
        o[i + 2] = ENC[Math.min(ENC_N, (acc[j + 2] * k) | 0)];
        o[i + 3] = 255;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(img, 0, 0);
    }
    if (overlay) {
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      renderOverlay(ctx, t, env, { grain });
    }
    return canvas;
  }
  return { canvas, ctx, frame };
}
