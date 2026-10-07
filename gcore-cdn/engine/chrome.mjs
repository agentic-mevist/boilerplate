// Persistent UI: background, grain, header, progress bar, chapter label, karaoke captions, section heads.
import { W, H, C, FONT, clamp, lerp, ease, prog, rng, makeCanvas, text, measure, roundRect, gcoreAvatar } from './core.mjs';

// ---------- background (rendered once) ----------
let BG = null, GRID = null, VIG = null, GRAIN = [];
function buildBackground() {
  BG = makeCanvas(); const g = BG.getContext('2d');
  const rad = g.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.45, H * 0.75);
  rad.addColorStop(0, C.bgCenter); rad.addColorStop(0.55, C.bgMid); rad.addColorStop(1, '#0a1128');
  g.fillStyle = rad; g.fillRect(0, 0, W, H);
  // blueprint grid on its own (taller) layer so it can drift slowly; period 240 px
  GRID = makeCanvas(W, H + 240); const gg = GRID.getContext('2d');
  const step = 60, ox = (W / 2) % step, oy = 30, GH = H + 240;
  gg.strokeStyle = C.grid; gg.lineWidth = 1;
  for (let x = ox; x < W; x += step) { gg.beginPath(); gg.moveTo(x + 0.5, 0); gg.lineTo(x + 0.5, GH); gg.stroke(); }
  for (let y = oy; y < GH; y += step) { gg.beginPath(); gg.moveTo(0, y + 0.5); gg.lineTo(W, y + 0.5); gg.stroke(); }
  // major grid every 4 cells, slightly brighter
  gg.strokeStyle = 'rgba(130,160,230,0.07)'; gg.lineWidth = 1.5;
  for (let x = ox; x < W; x += step * 4) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, GH); gg.stroke(); }
  for (let y = oy; y < GH; y += step * 4) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(W, y); gg.stroke(); }
  // faint radar rings
  g.strokeStyle = 'rgba(160,185,255,0.045)'; g.lineWidth = 2;
  for (const [cx, cy, rs] of [[W / 2, 860, [260, 420, 600, 800]], [-80, 1500, [300, 520]], [W + 60, 300, [260, 460]]])
    for (const r of rs) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
  // corner ticks
  g.strokeStyle = 'rgba(160,185,255,0.18)'; g.lineWidth = 2;
  for (const [x, y, sx, sy] of [[40, 40, 1, 1], [W - 40, 40, -1, 1], [40, H - 40, 1, -1], [W - 40, H - 40, -1, -1]]) {
    g.beginPath(); g.moveTo(x, y + 26 * sy); g.lineTo(x, y); g.lineTo(x + 26 * sx, y); g.stroke();
  }
  VIG = makeCanvas(); const v = VIG.getContext('2d');
  const vg = v.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, H * 0.78);
  vg.addColorStop(0, 'rgba(2,6,20,0)'); vg.addColorStop(1, 'rgba(2,6,20,0.72)');
  v.fillStyle = vg; v.fillRect(0, 0, W, H);
  for (let k = 0; k < 4; k++) {
    const c = makeCanvas(256, 256), x = c.getContext('2d'), im = x.createImageData(256, 256), r = rng(k + 3);
    for (let i = 0; i < 256 * 256; i++) { const n = Math.floor(r() * 255); im.data[i * 4] = n; im.data[i * 4 + 1] = n; im.data[i * 4 + 2] = n; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); GRAIN.push(c);
  }
}
export function drawBackground(ctx, t = 0) {
  if (!BG) buildBackground();
  ctx.drawImage(BG, 0, 0);
  ctx.drawImage(GRID, 0, -((t * 7) % 240));
}
export function drawVignette(ctx) { ctx.drawImage(VIG, 0, 0); }
export function drawGrain(ctx, frame) {
  const tile = GRAIN[frame % GRAIN.length];
  ctx.save(); ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(tile, x, y);
  ctx.restore();
}

// ---------- header ----------
export const HANDLE = '@gcore.official', SUBTITLE = 'cdn · how the web gets to you';
const BAR_X0 = 70, BAR_X1 = 1010, BAR_Y = 190;
export function drawHeader(ctx, t, TL, { alpha = 1 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  gcoreAvatar(ctx, 104, 132, 33);
  text(ctx, HANDLE, 154, 128, { font: FONT.head(25, 700), color: C.white });
  text(ctx, SUBTITLE, 155, 158, { font: FONT.mono(17, 500), color: C.dim });
  // chapter label
  const segs = TL.chapters.filter(c => c.label !== '-');
  const curIdx = segs.findIndex((c, i) => t >= c.start - 0.25 && (i === segs.length - 1 || t < segs[i + 1].start - 0.25));
  const cur = curIdx >= 0 && t < segs[segs.length - 1].end + 0.3 ? segs[curIdx] : null;
  text(ctx, 'chapter', 1010, 124, { font: FONT.mono(16, 400), color: C.faint, align: 'right' });
  if (cur) {
    const p = prog(t, cur.start - 0.25, 0.3);
    text(ctx, cur.label, 1010, 157 + (1 - p) * 10, { font: FONT.head(24, 800), color: C.orangeText, align: 'right', alpha: p });
  } else {
    text(ctx, '—', 1010, 157, { font: FONT.head(24, 800), color: C.faint, align: 'right' });
  }
  // segmented progress bar
  const n = segs.length, gap = 9, sw = (BAR_X1 - BAR_X0 - gap * (n - 1)) / n;
  segs.forEach((c, i) => {
    const x = BAR_X0 + i * (sw + gap), next = segs[i + 1];
    const end = next ? next.start - 0.25 : c.end;
    const f = clamp((t - (c.start - 0.25)) / (end - (c.start - 0.25)));
    ctx.fillStyle = 'rgba(120,140,190,0.22)'; roundRect(ctx, x, BAR_Y, sw, 5, 2.5); ctx.fill();
    if (f > 0) {
      ctx.fillStyle = f >= 1 ? C.lime : C.orange;
      roundRect(ctx, x, BAR_Y, Math.max(5, sw * f), 5, 2.5); ctx.fill();
    }
  });
  ctx.restore();
}

// ---------- section heading ("01 / ...") ----------
export function sectionHead(ctx, t, t0, num, label, { y = 300, t1 = Infinity } = {}) {
  const a = Math.min(prog(t, t0, 0.35), 1 - prog(t, t1, 0.3));
  if (a <= 0) return;
  const shown = label.slice(0, Math.floor(clamp((t - t0) * 45, 0, label.length)));
  text(ctx, `${num} /`, 70, y, { font: FONT.mono(22, 500), color: C.faint, alpha: a });
  text(ctx, shown, 70 + measure(ctx, `${num} /`, FONT.mono(22, 500)) + 14, y, { font: FONT.sans(27, 700), color: C.orangeText, alpha: a });
}

// ---------- big stat: small label + huge number ----------
export function bigStat(ctx, label, value, x, y, { color = C.white, size = 84, alpha = 1, align = 'left', unit = '', unitColor = C.dim } = {}) {
  if (alpha <= 0) return;
  text(ctx, label, x, y - size * 0.95, { font: FONT.mono(20, 500), color: C.dim, align, alpha });
  text(ctx, value, x, y, { font: FONT.head(size, 900), color, align, alpha });
  if (unit) {
    const w = measure(ctx, value, FONT.head(size, 900));
    const ux = align === 'right' ? x + 10 : x + w + 14;
    text(ctx, unit, ux, y - 4, { font: FONT.mono(24, 500), color: unitColor, alpha });
  }
}

// ---------- captions ----------
const CAP_Y = 1430, CAP_SIZE = 64, CAP_MAXW = 940;
export function buildCaptionChunks(TL) {
  const chunks = [];
  for (const ch of TL.chapters) {
    let cur = null;
    ch.words.forEach((w, i) => {
      const prev = ch.words[i - 1];
      const len = cur ? cur.words.map(x => x.w).join(' ').length + 1 + w.w.length : 0;
      const brk = !cur || len > 17 || cur.words.length >= 3 || /[.,:;?!]$/.test(prev?.w || '') || (w.start - prev.end) > 0.35;
      if (brk) { cur = { words: [] }; chunks.push(cur); }
      cur.words.push(w);
    });
  }
  chunks.forEach((c, i) => {
    c.start = c.words[0].start - 0.06;
    const last = c.words[c.words.length - 1].end;
    c.end = chunks[i + 1] ? Math.min(chunks[i + 1].words[0].start - 0.06, last + 0.55) : last + 0.9;
  });
  return chunks;
}
const capText = w => w.replace(/[“”"]/g, '').toUpperCase();
export function drawCaptions(ctx, t, chunks) {
  const c = chunks.find(c => t >= c.start && t < c.end);
  if (!c) return;
  const fade = 1 - prog(t, c.end - 0.12, 0.12, ease.lin);
  let size = CAP_SIZE;
  const sp = () => size * 0.32;
  const widthAt = s => c.words.reduce((a, w) => a + measure(ctx, capText(w.w), FONT.head(s, 900)) + (w.hl ? s * 0.36 : 0), 0) + sp() * (c.words.length - 1);
  while (widthAt(size) > CAP_MAXW && size > 40) size -= 2;
  let x = W / 2 - widthAt(size) / 2;
  for (const w of c.words) {
    const s = capText(w.w), ww = measure(ctx, s, FONT.head(size, 900)) + (w.hl ? size * 0.36 : 0);
    const a0 = w.start - 0.05;
    if (t >= a0) {
      const p = prog(t, a0, 0.16, ease.out), sc = lerp(0.84, 1, ease.back(clamp((t - a0) / 0.2)));
      const cx = x + ww / 2;
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(cx, CAP_Y); ctx.scale(sc, sc); ctx.translate(-cx, -CAP_Y);
      if (w.hl) {
        const bp = prog(t, a0, 0.18);
        ctx.fillStyle = C.orange; roundRect(ctx, x, CAP_Y - size * 0.86, ww * bp, size * 1.08, 8); ctx.fill();
        text(ctx, s, cx, CAP_Y, { font: FONT.head(size, 900), color: '#ffffff', align: 'center' });
      } else {
        const col = `rgb(${Math.round(lerp(140, 255, p))},${Math.round(lerp(150, 255, p))},${Math.round(lerp(178, 255, p))})`;
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
        text(ctx, s, cx, CAP_Y, { font: FONT.head(size, 900), color: col, align: 'center' });
      }
      ctx.restore();
    }
    x += ww + sp();
  }
}
