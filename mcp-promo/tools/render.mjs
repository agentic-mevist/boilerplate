// Final render: N parallel workers → lossless FFV1 chunks → x264 + AAC master.
// usage: node tools/render.mjs [--samples 8] [--workers 4] [--from 0] [--to 900] [--out out/reel.mp4]
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DURATION } from "../src/timeline.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};

async function worker() {
  const { makeRenderer } = await import("./env.mjs");
  const [a, b, out, samples] = [+arg("--a"), +arg("--b"), arg("--chunk"), +arg("--samples", 8)];
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", "1920x1080", "-r", "60",
    "-i", "-", "-c:v", "ffv1", "-level", "3", "-pix_fmt", "bgr0", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const R = makeRenderer();
  const t0 = performance.now();
  for (let f = a; f < b; f++) {
    const c = R.frame(f / 60, { samples });
    const buf = c.data();
    if (!ff.stdin.write(Buffer.from(buf))) await new Promise((r) => ff.stdin.once("drain", r));
    if ((f - a) % 20 === 0) {
      const el = (performance.now() - t0) / 1000;
      process.stdout.write(`[${a}-${b}] frame ${f} (${(el / (f - a + 1)).toFixed(2)} s/f)\n`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
}

async function main() {
  const samples = +arg("--samples", 8), workers = +arg("--workers", 4);
  const from = +arg("--from", 0), to = +arg("--to", Math.round(DURATION * 60));
  const out = path.resolve(root, arg("--out", "out/reel.mp4"));
  const chunksDir = path.join(root, "out", "chunks");
  fs.mkdirSync(chunksDir, { recursive: true });
  // interleave heavy sections fairly: split into many small ranges, round-robin over workers
  const ranges = [];
  const step = 30;
  for (let f = from; f < to; f += step) ranges.push([f, Math.min(to, f + step)]);
  const t0 = performance.now();
  let next = 0;
  const run = () =>
    new Promise((resolve, reject) => {
      const go = () => {
        if (next >= ranges.length) return resolve();
        const [a, b] = ranges[next++];
        const chunk = path.join(chunksDir, `c_${String(a).padStart(4, "0")}.mkv`);
        const p = spawn(process.execPath, [fileURLToPath(import.meta.url), "--worker", "--a", a, "--b", b, "--chunk", chunk, "--samples", samples], {
          stdio: ["ignore", "inherit", "inherit"],
        });
        p.on("close", (code) => (code === 0 ? go() : reject(new Error(`worker ${a}-${b} exited ${code}`))));
      };
      go();
    });
  await Promise.all(Array.from({ length: workers }, run));
  console.log(`rendered ${to - from} frames in ${((performance.now() - t0) / 1000).toFixed(1)} s`);

  const list = path.join(chunksDir, "list.txt");
  fs.writeFileSync(list, ranges.map(([a]) => `file 'c_${String(a).padStart(4, "0")}.mkv'`).join("\n"));
  const audio = path.join(root, "out", "soundtrack.wav");
  const audioArgs = fs.existsSync(audio) ? ["-i", audio] : [];
  const enc = [
    "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, ...audioArgs,
    "-map", "0:v", ...(audioArgs.length ? ["-map", "1:a"] : []),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", arg("--crf", "16"), "-tune", "animation",
    "-profile:v", "high", "-level", "4.2", "-g", "60",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    ...(audioArgs.length ? ["-c:a", "aac", "-b:a", "256k"] : []),
    "-movflags", "+faststart", "-shortest", out,
  ];
  await new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", enc, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error("encode failed"))));
  });
  console.log("wrote", out, (fs.statSync(out).size / 1e6).toFixed(1), "MB");
}

if (process.argv.includes("--worker")) worker();
else main();
