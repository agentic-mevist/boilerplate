/* Stitch PNG frames (+ optional audio) into an MP4 using bundled ffmpeg. */

import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs/promises";

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "inherit"] });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))
    );
  });
}

export async function stitch(framesDir, audioPath, outPath, opts = {}) {
  const fps = opts.fps ?? 30;
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const pattern = path.join(framesDir, "frame-%06d.png");

  const hasAudio = !!audioPath;
  const args = [
    "-y",
    "-framerate", String(fps),
    "-i", pattern,
  ];
  if (hasAudio) args.push("-i", audioPath);

  args.push(
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-crf", "18",
    "-preset", "medium",
    "-r", String(fps),
  );

  if (hasAudio) {
    args.push("-c:a", "aac", "-b:a", "192k", "-shortest");
  }

  args.push(outPath);
  await run(args);
  return outPath;
}

// CLI: node src/stitch.js <framesDir> <audio|none> <out.mp4>
if (process.argv[1] && process.argv[1].endsWith("stitch.js")) {
  const [framesDir, audio, out] = process.argv.slice(2);
  await stitch(framesDir, audio === "none" ? null : audio, out || "data/out.mp4");
  console.log("wrote", out);
}
