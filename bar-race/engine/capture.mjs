// Frame-accurate capture of the stat-race engine via the engine's own seek event.
// usage: node capture.mjs <topic> <outdir> [fps=30] [workers=4] [only=t1,t2,...]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const [topic = 'girls_ssa', outDir = 'frames', fpsArg = '30', workersArg = '4', only] = process.argv.slice(2);
const FPS = +fpsArg, WORKERS = +workersArg;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');   // bar-race/
fs.mkdirSync(outDir, { recursive: true });

// tiny static server rooted at bar-race/ so the engine can reach ../cards images
const types = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/engine/harness.html?topic=${topic}`;

const browser = await chromium.launch();
// wait until every <img> on the page is decoded (bounded, never hangs)
const settle = (page) => page.evaluate(() => Promise.race([
  Promise.all([...document.images].map((im) => im.decode().catch(() => 0))),
  new Promise((r) => setTimeout(r, 3000)),
]));
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 + 44 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(url);
  await page.waitForSelector('svg[data-om-exportable-video-with-duration-secs]', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  return page;
}
const seek = (page, t) => page.evaluate((t) => {
  const svg = document.querySelector('svg[data-om-exportable-video-with-duration-secs]');
  svg.dispatchEvent(new CustomEvent('data-om-seek-to-time-frame', { detail: { time: t, sync: true } }));
}, t);

const first = await openPage();
const duration = +(await first.getAttribute('svg[data-om-exportable-video-with-duration-secs]', 'data-om-exportable-video-with-duration-secs'));
const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(duration * FPS) }, (_, i) => i / FPS);
console.log(`duration ${duration}s, ${times.length} frames`);

const pages = [first, ...(await Promise.all(Array.from({ length: Math.max(0, WORKERS - 1) }, openPage)))];
let done = 0;
await Promise.all(pages.map(async (page, w) => {
  for (let i = w; i < times.length; i += pages.length) {
    await seek(page, times[i]);
    await settle(page);
    await page.screenshot({ path: path.join(outDir, `${String(i).padStart(5, '0')}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    if (++done % 300 === 0) console.log(`${done}/${times.length}`);
  }
}));
await browser.close();
server.close();
console.log('frames done');
