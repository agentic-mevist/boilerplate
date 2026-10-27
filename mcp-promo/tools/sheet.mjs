// Contact sheet: N evenly spaced frames in a grid — my "timeline scrubber".
// usage: node tools/sheet.mjs <from> <to> [n=12] [cols=4] [blur=1] [name]
//        node tools/sheet.mjs t=1.2,1.5,1.8 [cols] [blur] [name]
import fs from "fs";
import { createCanvas } from "@napi-rs/canvas";
import { makeRenderer } from "./env.mjs";
import { W, H } from "../src/timeline.js";

const args = process.argv.slice(2);
let times;
let cols, blur, name;
if (args[0].startsWith("t=")) {
  times = args[0].slice(2).split(",").map(Number);
  cols = +(args[1] || 4);
  blur = +(args[2] || 1);
  name = args[3] || "sheet";
} else {
  const a = +args[0], b = +args[1], n = +(args[2] || 12);
  cols = +(args[3] || 4);
  blur = +(args[4] || 1);
  name = args[5] || `sheet_${a}_${b}`;
  times = Array.from({ length: n }, (_, i) => a + ((b - a) * i) / Math.max(1, n - 1));
}
const tw = Math.round(1920 / cols) - 8, th = Math.round((tw * H) / W);
const rows = Math.ceil(times.length / cols);
const sheet = createCanvas(cols * (tw + 8) + 8, rows * (th + 30) + 8);
const sc = sheet.getContext("2d");
sc.fillStyle = "#222";
sc.fillRect(0, 0, sheet.width, sheet.height);
const R = makeRenderer(W, H);
const t0 = performance.now();
times.forEach((t, i) => {
  const c = R.frame(t, { samples: blur, grain: false });
  const x = 8 + (i % cols) * (tw + 8), y = 8 + Math.floor(i / cols) * (th + 30);
  sc.drawImage(c, x, y, tw, th);
  sc.fillStyle = "#ddd";
  sc.font = "16px monospace";
  sc.fillText(`t=${t.toFixed(3)}  f${Math.round(t * 60)}`, x + 4, y + th + 20);
});
fs.writeFileSync(`out/${name}.png`, sheet.toBuffer("image/png"));
console.log(`out/${name}.png  ${times.length} frames  ${((performance.now() - t0) / times.length).toFixed(0)} ms/frame`);
