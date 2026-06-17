/* Placeholder audio so the full pipeline produces a real muxed MP4 before a
 * Lyria key is wired in. Default: silence of the exact reel length. Optional
 * `blips:true` drops a short marker tone at each message appearAt so you can
 * AUDIBLY confirm the visual sync. */

import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs/promises";

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "inherit"] });
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg ${c}`))));
  });
}

export async function makeStubAudio(durationMs, outPath, opts = {}) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const sec = (durationMs / 1000).toFixed(3);

  if (!opts.blips || !opts.appearAts?.length) {
    await run([
      "-y", "-f", "lavfi",
      "-i", `anullsrc=r=44100:cl=stereo`,
      "-t", sec, "-c:a", "aac", "-b:a", "128k", outPath,
    ]);
    return outPath;
  }

  // Build a filtergraph that lays short sine blips at each appearAt.
  const base = `anullsrc=r=44100:cl=stereo`;
  const inputs = ["-f", "lavfi", "-t", sec, "-i", base];
  const blips = [];
  opts.appearAts.forEach((ms, i) => {
    inputs.push("-f", "lavfi", "-t", "0.12", "-i", "sine=frequency=880:sample_rate=44100");
    blips.push(`[${i + 1}]adelay=${ms}|${ms},volume=0.5[b${i}]`);
  });
  const mix = `[0]${opts.appearAts.map((_, i) => `[b${i}]`).join("")}amix=inputs=${opts.appearAts.length + 1}:duration=first:normalize=0[out]`;
  await run([
    "-y", ...inputs,
    "-filter_complex", `${blips.join(";")};${mix}`,
    "-map", "[out]", "-t", sec, "-c:a", "aac", "-b:a", "128k", outPath,
  ]);
  return outPath;
}
