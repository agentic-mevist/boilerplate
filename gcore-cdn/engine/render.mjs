// usage:
//   node engine/render.mjs --stills 1.2,14.8,...      → build/stills/t_<t>.png
//   node engine/render.mjs --from 0 --to 30 --out build/part.mp4   (frame range by seconds)
//   node engine/render.mjs --sfx                      → build/sfx.json
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ROOT, W, H, FPS, makeCanvas, prog, ease, clamp, textLayer } from './core.mjs';
import { drawBackground, drawVignette, drawGrain, drawHeader, buildCaptionChunks, drawCaptions } from './chrome.mjs';
import { SCENES } from './scenes.mjs';

const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/timeline.json'), 'utf8'));
const CH = TL.chapters;
const CHUNKS = buildCaptionChunks(TL);
const TR = 0.45; // crossfade length
const bounds = CH.map((c, i) => (i === 0 ? -1e9 : c.start - 0.2));

const canvas = makeCanvas(), ctx = canvas.getContext('2d');
const layer = makeCanvas(), lctx = layer.getContext('2d');

function drawFrame(t, frame) {
  drawBackground(ctx, t);
  CH.forEach((ch, i) => {
    const b0 = bounds[i], b1 = i + 1 < CH.length ? bounds[i + 1] : 1e9;
    const aIn = i === 0 ? 1 : prog(t, b0 - TR / 2, TR, ease.inOut), aOut = 1 - prog(t, b1 - TR / 2, TR, ease.inOut);
    const a = Math.min(aIn, aOut);
    if (a <= 0.001) return;
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H); lctx.globalAlpha = 1;
    lctx.save(); textLayer.begin(); SCENES[ch.id].draw(lctx, t, ch); textLayer.end(); lctx.restore();
    const span = Math.max(1, (i + 1 < CH.length ? b1 : TL.duration) - Math.max(0, b0));
    const drift = 0.035 * clamp((t - Math.max(0, b0)) / span);
    const s = 1 + drift + (1 - aIn) * 0.05 - (1 - aOut) * 0.035;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(W / 2, 860); ctx.scale(s, s); ctx.translate(-W / 2, -860);
    ctx.drawImage(layer, 0, 0); ctx.restore();
  });
  drawVignette(ctx);
  drawHeader(ctx, t, TL);
  drawCaptions(ctx, t, CHUNKS);
  drawGrain(ctx, frame);
}

const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

if (args.includes('--sfx')) {
  const ev = [];
  for (const ch of CH) for (const [t, kind, gain = 1] of SCENES[ch.id].sfx(ch)) ev.push({ t: +t.toFixed(3), kind, gain });
  ev.sort((a, b) => a.t - b.t);
  fs.writeFileSync(path.join(ROOT, 'build/sfx.json'), JSON.stringify(ev, null, 1));
  console.log('sfx events', ev.length);
} else if (opt('--stills')) {
  const dir = path.join(ROOT, 'build/stills'); fs.mkdirSync(dir, { recursive: true });
  for (const ts of opt('--stills').split(',')) {
    const t = +ts, t0 = Date.now();
    drawFrame(t, Math.round(t * FPS));
    fs.writeFileSync(path.join(dir, `t_${t.toFixed(2)}.png`), canvas.toBuffer('image/png'));
    console.log('still', t, `${Date.now() - t0} ms`);
  }
} else {
  const from = Math.round(+(opt('--from') ?? 0) * FPS), to = Math.round(+(opt('--to') ?? TL.duration) * FPS);
  const out = opt('--out') ?? path.join(ROOT, 'build/video.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    drawFrame(f / FPS, f);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % 150 === 0) console.log(`${out}: frame ${f - from}/${to - from} ${((Date.now() - t0) / Math.max(1, f - from)).toFixed(0)} ms/f`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('done', out, `${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
