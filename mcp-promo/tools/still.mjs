// Full-res stills. usage: node tools/still.mjs <t1,t2,...> [blur=1] [prefix=still]
import fs from "fs";
import { makeRenderer } from "./env.mjs";

const times = process.argv[2].split(",").map(Number);
const blur = +(process.argv[3] || 1);
const prefix = process.argv[4] || "still";
const R = makeRenderer();
for (const t of times) {
  const t0 = performance.now();
  const c = R.frame(t, { samples: blur });
  const f = `out/${prefix}_${t.toFixed(3)}.png`;
  fs.writeFileSync(f, c.toBuffer("image/png"));
  console.log(f, `${(performance.now() - t0).toFixed(0)} ms`);
}
