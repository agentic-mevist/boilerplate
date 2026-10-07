// Persistent UI: background, grain, header, progress bar, chapter label, karaoke captions, section heads.
import { W, H, C, FONT, THEME, clamp, lerp, ease, prog, rng, makeCanvas, text, measure, roundRect, gcoreAvatar, withA } from './core.mjs';

// ---------- background (rendered once) ----------
// gcore.com: warm white with soft peach "light leaks" (light) / aubergine with a lavender glow (dark). No grid.
let BG = null, VIG = null, GRAIN = [];
function blob(g, x, y, r, color) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, color); rg.addColorStop(1, withA(color.startsWith('#') ? color : '#000000', 0));
  g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function buildBackground() {
  BG = makeCanvas(); const g = BG.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  if (THEME === 'light') {
    blob(g, W * 0.95, H * 0.12, 620, C.leak); blob(g, W * 0.9, H * 0.86, 700, C.leak); blob(g, W * 0.05, H * 0.55, 520, C.leak2);
  } else {
    blob(g, W * 0.5, H * 1.02, 1100, '#3a2852'); blob(g, W * 0.95, H * 0.1, 520, '#2a1c38');
  }
  VIG = makeCanvas(); const v = VIG.getContext('2d');
  const vg = v.createRadialGradient(W / 2, H * 0.46, H * 0.32, W / 2, H * 0.5, H * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, C.bgDeep);
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
}
export function drawVignette(ctx) { ctx.drawImage(VIG, 0, 0); }
export function drawGrain(ctx, frame) {
  const tile = GRAIN[frame % GRAIN.length];
  ctx.save(); ctx.globalAlpha = THEME === 'light' ? 0.03 : 0.045; ctx.globalCompositeOperation = 'overlay';
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(tile, x, y);
  ctx.restore();
}

// ---------- header ----------
export const HANDLE = '@gcore.official', SUBTITLE = 'CDN · how the web gets to you';
const BAR_X0 = 70, BAR_X1 = 1010, BAR_Y = 190;
export function drawHeader(ctx, t, TL, { alpha = 1 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  gcoreAvatar(ctx, 104, 132, 33);
  text(ctx, HANDLE, 154, 128, { font: FONT.head(26, 700), color: C.text, halo: false });
  text(ctx, SUBTITLE, 155, 158, { font: FONT.sans(18, 500), color: C.dim, halo: false });
  // chapter label
  const segs = TL.chapters.filter(c => c.label !== '-');
  const curIdx = segs.findIndex((c, i) => t >= c.start - 0.25 && (i === segs.length - 1 || t < segs[i + 1].start - 0.25));
  const cur = curIdx >= 0 && t < segs[segs.length - 1].end + 0.3 ? segs[curIdx] : null;
  text(ctx, 'CHAPTER', 1010, 124, { font: FONT.sans(14, 700), color: C.faint, align: 'right', ls: 1.5, halo: false });
  if (cur) {
    const p = prog(t, cur.start - 0.25, 0.3);
    text(ctx, cur.label, 1010, 157 + (1 - p) * 10, { font: FONT.head(25, 700), color: C.orangeText, align: 'right', alpha: p, halo: false });
  } else {
    text(ctx, '—', 1010, 157, { font: FONT.head(25, 700), color: C.faint, align: 'right', halo: false });
  }
  // segmented progress bar
  const n = segs.length, gap = 9, sw = (BAR_X1 - BAR_X0 - gap * (n - 1)) / n;
  segs.forEach((c, i) => {
    const x = BAR_X0 + i * (sw + gap), next = segs[i + 1];
    const end = next ? next.start - 0.25 : c.end;
    const f = clamp((t - (c.start - 0.25)) / (end - (c.start - 0.25)));
    ctx.fillStyle = C.track; roundRect(ctx, x, BAR_Y, sw, 5, 2.5); ctx.fill();
    if (f > 0) {
      ctx.fillStyle = f >= 1 ? withA(C.orange, 0.45) : C.orange;
      roundRect(ctx, x, BAR_Y, Math.max(5, sw * f), 5, 2.5); ctx.fill();
    }
  });
  ctx.restore();
}

// ---------- section heading: gcore.com eyebrow ("— 01 · FOLLOW ONE CLICK") ----------
export function sectionHead(ctx, t, t0, num, label, { y = 300, t1 = Infinity } = {}) {
  const a = Math.min(prog(t, t0, 0.35), 1 - prog(t, t1, 0.3));
  if (a <= 0) return;
  const s = `${num} · ${label}`.toUpperCase(), shown = s.slice(0, Math.floor(clamp((t - t0) * 45, 0, s.length)));
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(70, y - 9); ctx.lineTo(70 + 26 * prog(t, t0, 0.3), y - 9); ctx.stroke(); ctx.restore();
  text(ctx, shown, 110, y, { font: FONT.sans(24, 700), color: C.orangeText, alpha: a, ls: 1.5 });
}

// ---------- big stat: gcore.com stat block (orange rule, small label, big number, orange unit) ----------
export function bigStat(ctx, label, value, x, y, { color = C.text, size = 84, alpha = 1, align = 'left', unit = '', unitColor = C.orangeText } = {}) {
  if (alpha <= 0) return;
  if (align === 'left') { ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = C.orange; ctx.fillRect(x, y - size * 1.12, 5, size * 1.2); ctx.restore(); x += 26; }
  text(ctx, label, x, y - size * 0.92, { font: FONT.sans(21, 600), color: C.dim, align, alpha });
  text(ctx, value, x, y, { font: FONT.head(size, 800), color, align, alpha, ls: -size * 0.03 });
  if (unit) {
    const w = measure(ctx, value, FONT.head(size, 800), -size * 0.03);
    const ux = align === 'right' ? x + 10 : x + w + 12;
    text(ctx, unit, ux, y, { font: FONT.head(Math.round(size * 0.42), 700), color: unitColor, alpha });
  }
}

// ---------- captions ----------
const CAP_Y = 1430, CAP_SIZE = 66, CAP_MAXW = 940;
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
        const bp = prog(t, a0, 0.18), gy = CAP_Y - size * 0.86;
        const gr = ctx.createLinearGradient(x, gy, x + ww, gy + size * 1.08);
        gr.addColorStop(0, C.orange2); gr.addColorStop(0.3, C.orange); gr.addColorStop(0.65, C.orange); gr.addColorStop(1, '#ffbc9f');
        ctx.fillStyle = gr; roundRect(ctx, x, gy, ww * bp, size * 1.08, 10); ctx.fill();
        text(ctx, s, cx, CAP_Y, { font: FONT.head(size, 900), color: '#ffffff', align: 'center', halo: false });
      } else {
        const [r0, g0, b0] = THEME === 'light' ? [154, 147, 159] : [140, 128, 160], [r1, g1, b1] = THEME === 'light' ? [21, 12, 24] : [255, 255, 255];
        const col = `rgb(${Math.round(lerp(r0, r1, p))},${Math.round(lerp(g0, g1, p))},${Math.round(lerp(b0, b1, p))})`;
        ctx.shadowColor = THEME === 'light' ? 'rgba(251,249,248,0.95)' : 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = THEME === 'light' ? 0 : 4;
        text(ctx, s, cx, CAP_Y, { font: FONT.head(size, 900), color: col, align: 'center', halo: false });
      }
      ctx.restore();
    }
    x += ww + sp();
  }
}
