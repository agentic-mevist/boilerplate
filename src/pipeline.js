/* End-to-end pipeline:
 *   messages.json -> reading-time timeline -> (song or stub audio)
 *   -> render frames -> stitch MP4
 *
 * Usage:
 *   node src/pipeline.js [messages.json] [--music] [--blips] [--full]
 *
 *   default messages : samples/messages.json
 *   --music          : generate a real song with Lyria 3 (needs GEMINI_API_KEY)
 *   --full           : use lyria-3-pro-preview (~2min) instead of the 30s clip
 *   --blips          : audible marker tones at each message (stub-audio mode)
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildTimeline, fitToAudio } from "./timeline.js";
import { buildLyrics } from "./lyrics.js";
import { generateSong, hasMusicKey } from "./music.js";
import { makeStubAudio } from "./audio_stub.js";
import { renderFrames } from "./render.js";
import { stitch } from "./stitch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function ffprobeDurationMs() { return null; } // placeholder; we trust timeline length

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const msgPath = args.find((a) => !a.startsWith("--")) ||
    path.join(ROOT, "samples", "messages.json");

  const DATA = path.join(ROOT, "data");
  const FRAMES = path.join(DATA, "frames");
  await fs.rm(FRAMES, { recursive: true, force: true });
  await fs.mkdir(DATA, { recursive: true });

  console.log("→ loading", path.relative(ROOT, msgPath));
  const convo = JSON.parse(await fs.readFile(msgPath, "utf8"));
  const peer = convo.peer || { name: "customer" };

  console.log("→ building reading-time timeline");
  let timeline = buildTimeline(convo.messages);
  console.log(`  ${convo.messages.length} messages, ${(timeline.durationMs / 1000).toFixed(1)}s`);

  // ---- audio ----
  let audioPath = path.join(DATA, "audio.m4a");
  const wantMusic = flags.has("--music");
  if (wantMusic) {
    if (!hasMusicKey()) {
      console.error("✗ --music requested but GEMINI_API_KEY is not set.");
      process.exit(1);
    }
    const { prompt } = buildLyrics(convo.messages, { peerName: peer.name });
    console.log("→ generating song with Lyria 3");
    const model = flags.has("--full") ? "lyria-3-pro-preview" : "lyria-3-clip-preview";
    const song = await generateSong(prompt, path.join(DATA, "song"), { model });
    audioPath = song.audioPath;
    console.log("  song:", path.relative(ROOT, audioPath));
    // NOTE: for word-perfect sync, run forced alignment on `audioPath` here and
    // rebuild the timeline from word timings (see README "Tightening sync").
    // For now we stretch the reading-time timeline to the song length.
    const songMs = ffprobeDurationMs(audioPath) ||
      (model.includes("clip") ? 30000 : Math.max(timeline.durationMs, 60000));
    timeline = fitToAudio(timeline, songMs);
  } else {
    console.log("→ generating stub audio" + (flags.has("--blips") ? " (with sync blips)" : " (silence)"));
    await makeStubAudio(timeline.durationMs, audioPath, {
      blips: flags.has("--blips"),
      appearAts: timeline.messages.map((m) => m.appearAt),
    });
  }

  // ---- reel descriptor for the template ----
  const reel = { peer, durationMs: timeline.durationMs, fps: 30, messages: timeline.messages };
  await fs.writeFile(path.join(DATA, "reel.json"), JSON.stringify(reel, null, 2));

  // ---- render + stitch ----
  console.log("→ rendering frames");
  const r = await renderFrames(reel, FRAMES, { fps: 30 });

  console.log("→ stitching MP4");
  const out = path.join(DATA, "reel.mp4");
  await stitch(FRAMES, audioPath, out, { fps: r.fps });

  console.log("\n✓ done →", path.relative(ROOT, out));
}

main().catch((e) => { console.error(e); process.exit(1); });
