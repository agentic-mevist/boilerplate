/* Frame-capture renderer.
 *
 * Loads the deterministic template, injects the timeline, then screenshots one
 * PNG per frame by calling window.seek(t) at t = frameIndex / fps. Because
 * seek() is a pure function of time, the output is reproducible and the audio
 * will line up exactly when muxed at the same fps.
 */

import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = pathToFileURL(path.join(__dirname, "..", "template", "index.html")).href;

export async function renderFrames(reel, framesDir, opts = {}) {
  const fps = opts.fps ?? 30;
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1920;
  const durationMs = reel.durationMs;
  const totalFrames = Math.ceil((durationMs / 1000) * fps);

  await fs.mkdir(framesDir, { recursive: true });

  const browser = await chromium.launch({ args: ["--no-sandbox", "--force-color-profile=srgb"] });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  await page.addInitScript((data) => { window.__REEL__ = data; }, reel);
  await page.goto(TEMPLATE, { waitUntil: "load" });
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 15000 });

  for (let i = 0; i < totalFrames; i++) {
    const t = (i / fps) * 1000;
    await page.evaluate((tt) => window.seek(tt), t);
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(i).padStart(6, "0")}.png`),
      animations: "disabled",
    });
    if (i % 60 === 0) process.stdout.write(`\r  frames ${i}/${totalFrames}`);
  }
  process.stdout.write(`\r  frames ${totalFrames}/${totalFrames}\n`);

  await browser.close();
  return { totalFrames, fps, width, height };
}

// CLI: node src/render.js <reel.json> <framesDir>
if (process.argv[1] && process.argv[1].endsWith("render.js")) {
  const [reelPath, framesDir] = process.argv.slice(2);
  const reel = JSON.parse(await fs.readFile(reelPath, "utf8"));
  await renderFrames(reel, framesDir || "data/frames");
}
