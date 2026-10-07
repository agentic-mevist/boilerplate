// Scenes, one per chapter. Each scene: { draw(ctx, t, ch), sfx(ch) → [[time, kind, gain?]] }
import {
  W, H, C, FONT, clamp, lerp, ease, prog, life, rng, noise1, text, measure, typed, hand, fmt, card, roundRect, popIn,
  glowDot, ring, sketchPath, sLine, sRect, sCircle, arrowHead, dashedLine, quadPt, quadPts, arcCtrl,
  serverIcon, phoneIcon, browser, person, gcoreAvatar, gcoreWordmark,
} from './core.mjs';
import { sectionHead, bigStat, HANDLE } from './chrome.mjs';
import { CITY, POPS, POP_ORDER, globeProj, visible, drawGlobe, globeArc, strokePts, ptAt, mapProj, drawMap, geoInterpolate } from './geo.mjs';

// time of the n-th occurrence of a word in a chapter
const LEAD = 0.1; // visuals land a few frames before the spoken word
export function wordT(ch, w, n = 0) {
  const nz = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hits = ch.words.filter(x => nz(x.w) === nz(w));
  if (!hits[n]) throw new Error(`word ${w} not in ${ch.id}`);
  return hits[n].start - LEAD;
}
const cue = (ch, k) => { if (ch.cues[k] === undefined) throw new Error(`cue ${k} missing in ${ch.id}`); return ch.cues[k] - LEAD; };

// ---------- shared pieces ----------
const FRA = CITY.frankfurt, SYD = CITY.sydney;
const fsMap = () => mapProj(0, 560, W, 620, { center: [80, 8], scale: 1.28 });
function labelTag(ctx, s, x, y, { color = C.ink, alpha = 1, bg = 'rgba(8,13,30,0.85)', font = FONT.mono(17, 500) } = {}) {
  if (alpha <= 0) return;
  const w = measure(ctx, s, font) + 20;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - 16, w, 30, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(160,185,255,0.25)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  text(ctx, s, x, y + 6, { font, color, align: 'center', alpha });
}
function countUp(t, t0, d, to, e = ease.out) { return to * prog(t, t0, d, e); }
function pulseRing(ctx, x, y, t, t0, color, { r0 = 8, r1 = 46, period = 1.4, alpha = 1 } = {}) {
  if (t < t0) return;
  const f = ((t - t0) % period) / period;
  ring(ctx, x, y, lerp(r0, r1, f), color, { alpha: alpha * (1 - f) * 0.8, lw: 2 });
}
function stamp(ctx, s, x, y, t, t0, color, { size = 30, rot = -0.08, alpha = 1 } = {}) {
  if (t < t0) return;
  const p = clamp((t - t0) / 0.25), sc = lerp(1.8, 1, ease.out(p));
  ctx.save(); ctx.globalAlpha *= alpha * ease.out(p); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  const w = measure(ctx, s, FONT.head(size, 900)) + 26;
  ctx.strokeStyle = color; ctx.lineWidth = 3.5; roundRect(ctx, -w / 2, -size * 0.85, w, size * 1.35, 8); ctx.stroke();
  text(ctx, s, 0, size * 0.32, { font: FONT.head(size, 900), color, align: 'center' });
  ctx.restore();
}

// ============ HOOK ============
const hook = {
  draw(ctx, t, ch) {
    const t0 = ch.start;
    // title
    const l1 = ['WHY', 'THE', 'WEB'], l2 = ['FEELS', 'INSTANT'];
    let x = 70;
    l1.forEach((w, i) => {
      const a = prog(t, t0 + i * 0.12, 0.3);
      text(ctx, w, x, 345 + (1 - a) * 20, { font: FONT.head(84, 900), color: C.white, alpha: a });
      x += measure(ctx, w + ' ', FONT.head(84, 900));
    });
    x = 70;
    l2.forEach((w, i) => {
      const a = prog(t, t0 + 0.4 + i * 0.15, 0.3);
      text(ctx, w, x, 445 + (1 - a) * 20, { font: FONT.head(84, 900), color: i === 1 ? C.orangeText : C.white, alpha: a });
      x += measure(ctx, w + ' ', FONT.head(84, 900));
    });
    // globe with PoPs and data arcs
    const gp = prog(t, t0, 0.6);
    const pr = globeProj(540, 930, 250 * lerp(0.85, 1, gp), 15 + (t - t0) * 8, 25);
    ctx.save(); ctx.globalAlpha = gp;
    for (const [r, d] of [[340, [6, 10]], [430, [2, 12]]]) {
      ctx.strokeStyle = 'rgba(170,195,255,0.25)'; ctx.lineWidth = 1.5; ctx.setLineDash(d); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.arc(540, 930, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // orbiting edge nodes on the rings
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 340 : 430, a = i * 0.63 + (t - t0) * (i % 2 ? 0.25 : -0.18);
      glowDot(ctx, 540 + Math.cos(a) * r, 930 + Math.sin(a) * r, 4.5, i % 3 ? C.orange : C.blue, { glow: 2.5 });
    }
    drawGlobe(ctx, pr, { outline: prog(t, t0 + 0.1, 0.8) });
    POPS.forEach((p, i) => { if (i % 2 === 0 && visible(pr, p)) { const [px, py] = pr(p); glowDot(ctx, px, py, 3, C.orange, { glow: 2, alpha: 0.9 }); } });
    const pairs = [[CITY.london, CITY.newyork], [CITY.frankfurt, CITY.mumbai], [CITY.paris, CITY.lagos], [CITY.amsterdam, CITY.dubai],
      [CITY.madrid, CITY.saopaulo], [CITY.stockholm, CITY.singapore], [CITY.milan, CITY.johannesburg], [CITY.warsaw, CITY.tokyo]];
    pairs.forEach(([a, b], i) => {
      const s0 = t0 + 0.3 + i * 0.28, f = ((t - s0) % 2.2) / 2.2;
      if (t < s0) return;
      const pts = globeArc(pr, a, b, 0.22);
      ctx.strokeStyle = 'rgba(255,120,60,0.55)'; ctx.lineWidth = 2; strokePts(ctx, pts, prog(t, s0, 0.8));
      const p = ptAt(pts, f); if (p) glowDot(ctx, p[0], p[1], 4, '#ffd2b8', { glow: 3 });
    });
    ctx.restore();
    // "blink" note
    const bt = cue(ch, 'blink');
    hand(ctx, 'a blink ≈ 0.3 s', 610, 1270, t, bt + 0.1, { size: 44, color: C.blue, rot: -0.05 });
    if (t > bt + 0.1) { ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; sketchPath(ctx, [[600, 1250], [560, 1225], [530, 1180]], { seed: 4, draw: prog(t, bt + 0.2, 0.4) }); }
  },
  sfx: ch => [[ch.start, 'whoosh', 0.7], [ch.start + 0.45, 'pop'], [cue(ch, 'blink') + 0.1, 'click']],
};

// ============ DISTANCE ============
const distance = {
  draw(ctx, t, ch) {
    const tS = cue(ch, 'strange'), tF = cue(ch, 'fra'), tY = cue(ch, 'syd'), tK = cue(ch, 'km');
    const tWhy = wordT(ch, "here's") - 0.15;
    // phase A: you in Sydney, talking to... whom?
    const aA = 1 - prog(t, tWhy, 0.35);
    if (aA > 0) {
      sectionHead(ctx, t, tS - 0.1, '01', "who's really answering?", { t1: tWhy });
      ctx.save(); ctx.globalAlpha = aA;
      const pr = globeProj(540, 900, 300, 140 - (t - ch.start) * 3, -22);
      drawGlobe(ctx, pr, { outline: prog(t, ch.start - 0.2, 0.7) });
      const [ux, uy] = pr(SYD);
      glowDot(ctx, ux, uy, 9, C.lime, { glow: 3 }); pulseRing(ctx, ux, uy, t, ch.start, C.lime);
      hand(ctx, 'you', ux + 20, uy + 46, t, ch.start + 0.2, { size: 42, color: C.lime });
      // the "website" up top, a line to it, then crossed out
      const sx = 770, sy = 450, pa = prog(t, tS + 0.2, 0.35);
      ctx.save(); popIn(ctx, t, tS + 0.2, sx, sy); serverIcon(ctx, sx, sy, { s: 1, alpha: pa, t }); ctx.restore();
      hand(ctx, 'the website', sx - 70, sy + 85, t, tS + 0.4, { size: 40, color: C.blue });
      ctx.strokeStyle = 'rgba(195,245,60,0.8)'; ctx.lineWidth = 3;
      sketchPath(ctx, [[ux, uy - 14], [sx - 40, sy + 40]], { seed: 9, draw: prog(t, tS + 0.5, 0.6) });
      const tX = wordT(ch, 'all') - 0.1;
      if (t > tX) {
        ctx.strokeStyle = C.red; ctx.lineWidth = 7; ctx.lineCap = 'round';
        const mx = (ux + sx - 40) / 2, my = (uy + sy + 26) / 2;
        sketchPath(ctx, [[mx - 34, my - 34], [mx + 34, my + 34]], { seed: 2, draw: prog(t, tX, 0.15) });
        sketchPath(ctx, [[mx + 34, my - 34], [mx - 34, my + 34]], { seed: 3, draw: prog(t, tX + 0.12, 0.15) });
        ctx.lineCap = 'butt';
      }
      ctx.restore();
    }
    // phase B: Frankfurt ↔ Sydney map
    const aB = prog(t, tWhy, 0.4);
    if (aB > 0) {
      const pr = fsMap();
      drawMap(ctx, pr, null, { alpha: aB });
      fraSyd(ctx, t, pr, { tF, tY, tK, alpha: aB });
      const km = countUp(t, tK, 1.1, 16500);
      bigStat(ctx, 'distance to the server', fmt(Math.round(km / 100) * 100), 70, 400, { color: C.white, alpha: prog(t, tK - 0.1, 0.3), unit: 'km' });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.6], [cue(ch, 'strange') + 0.2, 'pop'], [wordT(ch, 'all') - 0.1, 'error', 0.6],
    [wordT(ch, "here's") - 0.15, 'whoosh', 0.6], [cue(ch, 'fra'), 'pop'], [cue(ch, 'syd'), 'pop'], [cue(ch, 'km'), 'draw'], [cue(ch, 'km'), 'tick', 0.5], [cue(ch, 'km'), 'impact', 0.6]],
};
// Frankfurt server + Sydney user + long arc on the flat map
function fraSyd(ctx, t, pr, { tF, tY, tK, alpha = 1, arcAlpha = 1, showArc = true }) {
  const [fx, fy] = pr(FRA), [sx, sy] = pr(SYD);
  ctx.save(); ctx.globalAlpha *= alpha;
  if (t > tF) { ctx.save(); popIn(ctx, t, tF, fx, fy - 70); serverIcon(ctx, fx, fy - 70, { s: 0.75, t }); ctx.restore(); }
  glowDot(ctx, fx, fy, 6, C.blue, { alpha: prog(t, tF, 0.2) });
  hand(ctx, 'origin · Frankfurt', fx - 60, fy - 128, t, tF + 0.1, { size: 38, color: C.blue });
  if (t > tY) { glowDot(ctx, sx, sy, 9, C.lime, { glow: 3 }); pulseRing(ctx, sx, sy, t, tY, C.lime); }
  hand(ctx, 'you · Sydney', sx - 120, sy + 62, t, tY + 0.1, { size: 38, color: C.lime });
  if (showArc && t > tK) {
    const ctrl = arcCtrl([fx, fy], [sx, sy], -0.32);
    ctx.globalAlpha *= arcAlpha;
    ctx.strokeStyle = C.orange; ctx.lineWidth = 3.2; sketchPath(ctx, quadPts([fx, fy], ctrl, [sx, sy], 50), { seed: 14, draw: prog(t, tK, 0.9, ease.inOut) });
    const m = quadPt([fx, fy], ctrl, [sx, sy], 0.5);
    hand(ctx, '16 500 km', m[0] - 70, m[1] - 18, t, tK + 0.6, { size: 46, color: C.orangeText, rot: 0.04 });
  }
  ctx.restore();
}

// ============ LIGHT ============
const ROUTE = [FRA, [5.4, 43.3], [12, 38.5], [29.9, 31.6], [32.5, 29.9], [38, 20], [43.4, 12.3], [56, 13], [72.8, 18.9], [79.9, 6.9],
  [95, 5.8], [103.8, 1.3], [106, -5.6], [114.5, -22], [115.8, -32], [128, -34.6], [138.6, -35], [146, -39], [151.2, -33.9]];
const light = {
  draw(ctx, t, ch) {
    const tSp = cue(ch, 'speed'), tC = cue(ch, 'curvy'), tR = cue(ch, 'rtt'), tSo = wordT(ch, 'sounds');
    const aA = 1 - prog(t, tC - 0.35, 0.35);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha = aA;
      bigStat(ctx, 'light inside fiber', fmt(Math.round(countUp(t, tSp - 0.35, 0.6, 200000) / 1000) * 1000), 70, 400,
        { color: C.white, alpha: prog(t, ch.start, 0.3), unit: 'km/s' });
      text(ctx, 'in a vacuum: 299 792 km/s · glass slows it by about a third', 70, 450, { font: FONT.mono(19, 400), color: C.dim, alpha: prog(t, tSp + 0.8, 0.4) });
      fiber(ctx, t, 60, 760, 960, 150, ch.start);
      hand(ctx, 'fiber-optic cable', 650, 950, t, ch.start + 0.3, { size: 40, color: C.blue });
      hand(ctx, 'instant?', 760, 360, t, tSo + 0.05, { size: 58, color: C.orangeText, rot: -0.1 });
      ctx.restore();
    }
    const aB = prog(t, tC - 0.35, 0.4);
    if (aB > 0) {
      const pr = fsMap();
      drawMap(ctx, pr, null, { alpha: aB });
      fraSyd(ctx, t, pr, { tF: -1, tY: -1, tK: -1, alpha: aB, showArc: false });
      const [fx, fy] = pr(FRA), [sx, sy] = pr(SYD);
      ctx.save(); ctx.globalAlpha = aB;
      ctx.strokeStyle = 'rgba(233,238,252,0.35)'; ctx.lineWidth = 2; dashedLine(ctx, fx, fy, sx, sy, [8, 10]);
      hand(ctx, 'straight line', lerp(fx, sx, 0.7) + 30, lerp(fy, sy, 0.7) - 60, t, tC + 0.2, { size: 34, color: C.dim, rot: 0.25 });
      const rp = ROUTE.map(p => pr(p));
      ctx.strokeStyle = C.orange; ctx.lineWidth = 3.5; sketchPath(ctx, rp, { seed: 31, rough: 1.2, draw: prog(t, tC, 1.6, ease.inOut) });
      hand(ctx, 'real cable route', rp[5][0] - 270, rp[5][1] + 50, t, tC + 1.0, { size: 38, color: C.orangeText });
      // round-trip pulse
      if (t > tR) {
        const f = ((t - tR) % 2.4) / 2.4, ff = f < 0.5 ? f * 2 : 2 - f * 2;
        const L = rp.length - 1, i = ff * L, a = Math.floor(Math.min(i, L - 1)), b = a + 1;
        const px = lerp(rp[a][0], rp[b][0], i - a), py = lerp(rp[a][1], rp[b][1], i - a);
        glowDot(ctx, px, py, 7, '#fff2e0', { glow: 4 });
      }
      ctx.restore();
      bigStat(ctx, 'there and back', countUp(t, tR, 1.3, 0.25).toFixed(2), 70, 400, { color: C.orangeText, alpha: prog(t, tR - 0.1, 0.3), unit: 's' });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.5], [cue(ch, 'speed'), 'tick', 0.5], [wordT(ch, 'sounds'), 'pop'],
    [cue(ch, 'curvy') - 0.3, 'whoosh', 0.6], [cue(ch, 'curvy'), 'draw'], [cue(ch, 'rtt'), 'ping'], [cue(ch, 'rtt'), 'tick', 0.5], [cue(ch, 'rtt'), 'impact', 0.5]],
};
// fiber tube with a light pulse bouncing inside (total internal reflection)
function fiber(ctx, t, x, y, w, h, t0) {
  const a = prog(t, t0, 0.4);
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(120,170,255,0.05)'); g.addColorStop(0.5, 'rgba(120,170,255,0.16)'); g.addColorStop(1, 'rgba(120,170,255,0.05)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6;
  sLine(ctx, x, y, x + w, y, { seed: 41, draw: prog(t, t0, 0.6) }); sLine(ctx, x, y + h, x + w, y + h, { seed: 42, draw: prog(t, t0 + 0.1, 0.6) });
  ctx.strokeStyle = 'rgba(233,238,252,0.25)'; ctx.lineWidth = 1.5;
  sLine(ctx, x, y + 22, x + w, y + 22, { seed: 43 }); sLine(ctx, x, y + h - 22, x + w, y + h - 22, { seed: 44 });
  // zig-zag light path
  const zig = []; const n = 9;
  for (let i = 0; i <= n; i++) zig.push([x + (w * i) / n, i % 2 ? y + h - 24 : y + 24]);
  const P = f => { const i = clamp(f) * n, j = Math.min(n - 1, Math.floor(i)); return [lerp(zig[j][0], zig[j + 1][0], i - j), lerp(zig[j][1], zig[j + 1][1], i - j)]; };
  ctx.lineCap = 'round';
  for (let q = 0; q < 3; q++) {
    const head = ((t - t0) * 0.5 + q * 0.42) % 1.3;
    for (let k = 0; k < 60; k++) {
      const f0 = head - k * 0.005, f1 = head - (k + 1) * 0.005;
      if (f1 < 0 || f0 > 1) continue;
      const p0 = P(f0), p1 = P(f1);
      ctx.strokeStyle = `rgba(255,${Math.round(210 - k * 1.5)},${Math.round(160 - k * 2)},${(1 - k / 60) * 0.95})`; ctx.lineWidth = 6.5 - k * 0.08;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    if (head <= 1) { const p = P(head); glowDot(ctx, p[0], p[1], 7, '#fff', { glow: 4 }); }
  }
  ctx.lineCap = 'butt';
  ctx.restore();
}

// ============ HANDSHAKE ============
const handshake = {
  trips(ch) {
    return [
      { t: cue(ch, 'hs'), out: 'where is shop.example?', back: 'DNS answer', tag: 'find' },
      { t: cue(ch, 'tcp'), out: 'SYN', back: 'SYN-ACK', tag: 'connect' },
      { t: cue(ch, 'tls'), out: 'hello · keys', back: 'certificate', tag: 'encrypt' },
      { t: cue(ch, 'get'), out: 'GET /page', back: '200 OK', tag: 'ask' },
    ];
  },
  draw(ctx, t, ch) {
    const LX = 210, RX = 870, Y0 = 640, DY = 70, LEG = 0.34;
    const tB = cue(ch, 'blank');
    const dimLanes = 1 - 0.75 * prog(t, tB - 0.1, 0.35);
    ctx.save(); ctx.globalAlpha = dimLanes;
    const a0 = prog(t, ch.start - 0.1, 0.4);
    ctx.save(); ctx.globalAlpha *= a0;
    phoneIcon(ctx, LX, 500, { s: 1.15 }); serverIcon(ctx, RX, 505, { s: 1, t });
    text(ctx, 'you · Sydney', LX, 590, { font: FONT.mono(20, 500), color: C.lime, align: 'center' });
    text(ctx, 'server · Frankfurt', RX, 590, { font: FONT.mono(20, 500), color: C.blue, align: 'center' });
    ctx.strokeStyle = 'rgba(233,238,252,0.3)'; ctx.lineWidth = 2;
    dashedLine(ctx, LX, 610, LX, 1290, [6, 10]); dashedLine(ctx, RX, 610, RX, 1290, [6, 10]);
    ctx.restore();
    let done = 0;
    this.trips(ch).forEach((tr, i) => {
      const y = Y0 + i * DY * 2.45;
      const p1 = prog(t, tr.t, LEG, ease.inOut), p2 = prog(t, tr.t + LEG, LEG, ease.inOut);
      if (p1 <= 0) return;
      ctx.strokeStyle = C.orange; ctx.lineWidth = 3;
      sketchPath(ctx, [[LX + 6, y], [RX - 6, y + DY]], { seed: 50 + i, draw: p1 });
      if (p1 >= 1) arrowHead(ctx, RX - 6, y + DY, Math.atan2(DY, RX - LX - 12));
      const ang = Math.atan2(DY, RX - LX);
      ctx.save(); ctx.translate((LX + RX) / 2, y + DY / 2); ctx.rotate(ang);
      text(ctx, tr.out, 0, -14, { font: FONT.mono(25, 700), color: C.ink, align: 'center', alpha: prog(t, tr.t + 0.1, 0.2) }); ctx.restore();
      if (p2 > 0) {
        ctx.strokeStyle = C.blue; ctx.lineWidth = 3;
        sketchPath(ctx, [[RX - 6, y + DY], [LX + 6, y + DY * 2]], { seed: 60 + i, draw: p2 });
        if (p2 >= 1) arrowHead(ctx, LX + 6, y + DY * 2, Math.atan2(DY, -(RX - LX - 12)));
        ctx.save(); ctx.translate((LX + RX) / 2, y + DY * 1.5); ctx.rotate(-Math.atan2(DY, RX - LX));
        text(ctx, tr.back, 0, -14, { font: FONT.mono(25, 600), color: C.blue, align: 'center', alpha: prog(t, tr.t + LEG, 0.2) }); ctx.restore();
      }
      text(ctx, `${i + 1}`, LX - 60, y + DY + 10, { font: FONT.head(30, 900), color: C.orangeText, align: 'center', alpha: prog(t, tr.t, 0.2) });
      text(ctx, tr.tag, LX - 60, y + DY + 38, { font: FONT.hand(30), color: C.orangeText, align: 'center', alpha: prog(t, tr.t + 0.1, 0.2) });
      done += (p1 + p2) / 2;
    });
    ctx.restore();
    const tm = 0.25 * done;
    bigStat(ctx, 'waiting for the first byte', tm.toFixed(2), 70, 400, { color: tm >= 0.99 ? C.red : C.white, alpha: prog(t, cue(ch, 'hs') - 0.2, 0.3), unit: 's' });
    // blank screen
    if (t > tB - 0.1) {
      ctx.save(); const a = popIn(ctx, t, tB - 0.1, 540, 900, 0.35, 0.8);
      browser(ctx, 230, 640, 620, 560, { alpha: a, spinner: 1, t });
      ctx.restore();
      hand(ctx, '…still nothing', 560, 1318, t, tB + 0.3, { size: 58, color: C.red, rot: -0.04 });
    }
  },
  sfx(ch) {
    const o = [[ch.start - 0.2, 'whoosh', 0.5]];
    this.trips(ch).forEach(tr => { o.push([tr.t, 'blip']); o.push([tr.t + 0.34, 'blip', 0.7]); o.push([tr.t + 0.68, 'tick', 0.6]); });
    o.push([cue(ch, 'blank') - 0.1, 'pop']); o.push([cue(ch, 'blank') + 0.3, 'error', 0.5]);
    return o;
  },
};

// ============ PATIENCE ============
const patience = {
  draw(ctx, t, ch) {
    const tG = cue(ch, 'g53'), tS = cue(ch, 's3'), tA = cue(ch, 'amz'), tP = cue(ch, 'pct1');
    const aGrid = 1 - prog(t, tA - 0.3, 0.35);
    if (aGrid > 0) {
      ctx.save(); ctx.globalAlpha = aGrid;
      const leave = rng(5), order = Array.from({ length: 100 }, (_, i) => [i, leave()]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      const leaving = new Set(order.slice(0, 53));
      for (let i = 0; i < 100; i++) {
        const gx = 150 + (i % 10) * 87, gy = 560 + Math.floor(i / 10) * 66;
        const appear = prog(t, ch.start + i * 0.006, 0.25);
        let col = C.ink, dx = 0, a = appear;
        if (leaving.has(i)) {
          const k = order.indexOf(i), lt = tG + 0.2 + k * 0.035, lp = prog(t, lt, 0.5, ease.in);
          col = t > lt - 0.15 ? C.red : C.ink; dx = lp * 160; a *= 1 - lp * 0.85;
        }
        person(ctx, gx + dx, gy + Math.sin(t * 2.2 + i * 0.9) * 2.5, 1.25, col, a);
      }
      bigStat(ctx, 'mobile visitors who leave', `${Math.round(countUp(t, tG, 1.4, 53))}%`, 70, 400, { color: C.orangeText, alpha: prog(t, tG - 0.1, 0.3) });
      text(ctx, 'Google · mobile speed study, 2016', 70, 448, { font: FONT.mono(18, 400), color: C.faint, alpha: prog(t, tG + 0.5, 0.3) });
      // 0–3 s ruler
      const ra = prog(t, tS - 0.1, 0.3);
      if (ra > 0) {
        const x0 = 120, x1 = 960, y = 1270;
        ctx.save(); ctx.globalAlpha *= ra; ctx.strokeStyle = C.dim; ctx.lineWidth = 2; sLine(ctx, x0, y, x1, y, { seed: 70 });
        for (let s = 0; s <= 3; s++) {
          const xx = lerp(x0, x1, s / 3); sLine(ctx, xx, y - 10, xx, y + 10, { seed: 71 + s });
          text(ctx, `${s} s`, xx, y + 42, { font: FONT.mono(20), color: C.dim, align: 'center' });
        }
        const f = prog(t, tS, 1.1, ease.inOut);
        ctx.strokeStyle = C.orange; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, f), y); ctx.stroke(); ctx.lineCap = 'butt';
        glowDot(ctx, lerp(x0, x1, f), y, 9, '#fff', { glow: 2 });
        hand(ctx, 'gone.', x1 - 40, y - 34, t, tS + 1.1, { size: 44, color: C.red });
        ctx.restore();
      }
      ctx.restore();
    }
    // Amazon quote + stat
    const aQ = prog(t, tA - 0.2, 0.35);
    if (aQ > 0) {
      ctx.save(); const a = popIn(ctx, t, tA - 0.2, 540, 620, 0.35, 0.85);
      card(ctx, 110, 470, 860, 230, { alpha: a });
      text(ctx, '“Every 100 ms of delay', 150, 560, { font: FONT.sans(44, 700), color: C.white, alpha: a });
      text(ctx, 'costs 1% of sales.”', 150, 615, { font: FONT.sans(44, 700), color: C.white, alpha: a });
      text(ctx, 'Greg Linden · Amazon · 2006', 150, 666, { font: FONT.mono(19, 400), color: C.dim, alpha: a });
      ctx.restore();
      const b1 = prog(t, tA + 0.6, 0.3), b2 = prog(t, tP, 0.3);
      bigStat(ctx, 'page gets slower by', '+100 ms', 150, 900, { color: C.orangeText, size: 78, alpha: b1 });
      bigStat(ctx, 'sales drop by', '−1%', 150, 1110, { color: C.red, size: 110, alpha: b2 });
      if (b2 > 0) { ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.save(); ctx.globalAlpha = b2; sketchPath(ctx, [[600, 950], [700, 1010], [800, 1000], [900, 1090]], { seed: 77, draw: prog(t, tP, 0.6) }); arrowHead(ctx, 900, 1090, Math.atan2(90, 100), 18); ctx.restore(); }
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.5], [ch.start, 'crowd', 0.5], [cue(ch, 'g53'), 'tick', 0.6], [cue(ch, 'g53'), 'impact', 0.7], [cue(ch, 'g53'), 'ticks', 0.5], [cue(ch, 'g53') + 0.3, 'leave', 0.7], [cue(ch, 's3'), 'draw'], [cue(ch, 's3'), 'ticks', 0.4], [cue(ch, 's3') + 1.1, 'error', 0.35],
    [cue(ch, 'amz') - 0.2, 'pop'], [cue(ch, 'amz') + 0.6, 'click'], [cue(ch, 'pct1'), 'error', 0.5]],
};

// ============ EDGE ============
const edge = {
  draw(ctx, t, ch) {
    const tCl = cue(ch, 'closer'), tCDN = wordT(ch, 'cdn'), tPo = cue(ch, 'pops'), tSix = cue(ch, 'six'), tN = cue(ch, 'near');
    // phase A: copy the site next to the user
    const aA = 1 - prog(t, tPo - 0.4, 0.35);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha = aA;
      const pr = fsMap(); drawMap(ctx, pr);
      const arcFade = 1 - prog(t, tCl + 0.7, 0.5);
      fraSyd(ctx, t, pr, { tF: -1, tY: -1, tK: -1, arcAlpha: arcFade });
      const [fx, fy] = pr(FRA), [sx, sy] = pr(SYD);
      const ex = sx - 150, ey = sy - 150; // edge server placed by Sydney
      const mv = prog(t, tCl, 0.9, ease.inOut);
      if (t > tCl) {
        const ctrl = arcCtrl([fx, fy - 70], [ex, ey], -0.32), p = quadPt([fx, fy - 70], ctrl, [ex, ey], mv);
        serverIcon(ctx, p[0], p[1], { s: lerp(0.75, 0.9, mv), color: C.orangeText, accent: C.orange, t, seed: 12 });
        if (mv >= 1) {
          ctx.strokeStyle = C.lime; ctx.lineWidth = 3.5; sketchPath(ctx, [[sx, sy], [ex + 20, ey + 40]], { seed: 18, draw: prog(t, tCl + 0.9, 0.3) });
          hand(ctx, 'edge copy', ex - 150, ey - 40, t, tCl + 0.95, { size: 40, color: C.orangeText });
        }
      }
      const km = t < tCl + 0.2 ? 16500 : lerp(16500, 12, prog(t, tCl + 0.2, 0.9, ease.inOut));
      const sa = 1 - prog(t, tCDN - 0.25, 0.25);
      bigStat(ctx, 'distance to the server', fmt(Math.round(km)), 70, 400, { color: km < 100 ? C.lime : C.white, alpha: sa, unit: 'km' });
      // CDN acronym
      const ca = prog(t, tCDN - 0.15, 0.3);
      if (ca > 0) {
        ['CONTENT', 'DELIVERY', 'NETWORK'].forEach((w, i) => {
          const a = prog(t, tCDN - 0.15 + i * 0.22, 0.3), y = 300 + i * 64;
          text(ctx, w[0], 70, y, { font: FONT.head(58, 900), color: C.orangeText, alpha: a });
          text(ctx, w.slice(1), 70 + measure(ctx, w[0], FONT.head(58, 900)), y, { font: FONT.head(58, 900), color: C.white, alpha: a });
        });
      }
      ctx.restore();
    }
    // phase B: Gcore's PoPs on the globe, then zoom to Sydney
    const aB = prog(t, tPo - 0.4, 0.4);
    if (aB > 0) {
      const z = prog(t, tN - 0.5, 1.4, ease.inOut);
      const lon = lerp(10 + (t - tPo) * 9, 151.2, z), lat = lerp(20, -33.9, z);
      const r = lerp(330, 2600, ease.in(z) * 0.6 + z * 0.4), cy = lerp(880, 860, z);
      const pr = globeProj(540, cy, r, lon, lat);
      ctx.save(); ctx.globalAlpha = aB;
      drawGlobe(ctx, pr, { outline: 1, detail: z > 0.2 ? 'high' : 'low', glow: 1 - z });
      const shown = Math.floor(countUp(t, tPo, 2.2, POPS.length, ease.inOut));
      for (let k = 0; k < shown; k++) {
        const p = POPS[POP_ORDER[k]]; if (!visible(pr, p)) continue;
        const [px, py] = pr(p); glowDot(ctx, px, py, lerp(3.6, 6, z), C.orange, { glow: 2.2 });
      }
      if (z > 0.6) {
        const za = prog(t, tN + 0.3, 0.3);
        const [ux, uy] = pr([151.0, -33.75]), [px, py] = pr([151.21, -33.87]);
        glowDot(ctx, ux - 40, uy - 30, 10, C.lime, { glow: 3, alpha: za }); pulseRing(ctx, ux - 40, uy - 30, t, tN + 0.3, C.lime, { alpha: za });
        hand(ctx, 'you', ux - 110, uy - 50, t, tN + 0.4, { size: 44, color: C.lime });
        ctx.save(); ctx.globalAlpha *= za; serverIcon(ctx, px + 90, py + 60, { s: 0.85, color: C.orangeText, accent: C.orange, t }); ctx.restore();
        hand(ctx, 'Gcore PoP · Sydney', px + 10, py + 160, t, tN + 0.5, { size: 40, color: C.orangeText });
        ctx.strokeStyle = C.lime; ctx.lineWidth = 3.5; sketchPath(ctx, [[ux - 40, uy - 30], [px + 60, py + 50]], { seed: 19, draw: prog(t, tN + 0.5, 0.4) });
        hand(ctx, 'a few km', (ux + px) / 2 - 10, (uy + py) / 2 - 10, t, tN + 0.8, { size: 38, color: C.lime, rot: 0.3 });
      }
      ctx.restore();
      const sa = aB * (1 - prog(t, tN - 0.6, 0.3));
      bigStat(ctx, 'Gcore points of presence', shown >= POPS.length ? '210+' : String(Math.min(210, shown)), 70, 400, { color: C.orangeText, alpha: sa, size: 96 });
      text(ctx, 'on 6 continents · 200+ Tbps network', 70, 452, { font: FONT.mono(20, 500), color: C.dim, alpha: sa * prog(t, tSix, 0.3) });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.4], [cue(ch, 'closer'), 'swish', 0.6], [cue(ch, 'closer') + 0.9, 'pop'], [wordT(ch, 'cdn') - 0.15, 'click'],
    [cue(ch, 'pops') - 0.4, 'whoosh', 0.6], [cue(ch, 'pops'), 'ticks', 0.5], [cue(ch, 'pops') + 2.2, 'impact', 0.7], [cue(ch, 'six'), 'click'], [cue(ch, 'near') - 0.5, 'zoom', 0.8], [cue(ch, 'near') + 0.4, 'pop']],
};

// ============ ROUTING ============
const ANY_POPS = [CITY.frankfurt, CITY.newyork, CITY.saopaulo, CITY.singapore, CITY.sydney, CITY.johannesburg, CITY.tokyo, CITY.losangeles, CITY.dubai, CITY.london, CITY.mumbai];
const ANY_USERS = [[CITY.paris, 0], [CITY.chicago, 1], [CITY.buenosaires, 2], [CITY.bangkok, 3], [CITY.melbourne, 4], [CITY.nairobi, 5], [CITY.seoul, 6]];
const routing = {
  draw(ctx, t, ch) {
    const tSa = wordT(ch, 'same') - 0.15, tD = cue(ch, 'door'), tA = cue(ch, 'anycast');
    const pr = mapProj(0, 520, W, 640, { center: [20, 8], scale: 1.0 });
    drawMap(ctx, pr, null, { alpha: prog(t, ch.start - 0.2, 0.4) });
    // DNS card
    const ca = prog(t, ch.start + 0.1, 0.3);
    card(ctx, 70, 270, 940, 150, { alpha: ca });
    text(ctx, 'browser asks: where is shop.example?', 100, 320, { font: FONT.mono(21, 500), color: C.dim, alpha: ca });
    text(ctx, typed('→ 203.0.113.7', t, tSa, 30), 100, 380, { font: FONT.mono(38, 700), color: C.orangeText, alpha: ca });
    text(ctx, 'one address', 980, 380, { font: FONT.hand(40), color: C.blue, align: 'right', alpha: prog(t, tSa + 0.6, 0.3) });
    ANY_POPS.forEach((p, i) => {
      const [x, y] = pr(p), a = prog(t, ch.start + 0.2 + i * 0.07, 0.25);
      glowDot(ctx, x, y, 7, C.orange, { glow: 2.5, alpha: a });
      pulseRing(ctx, x, y, t, ch.start + i * 0.17, C.orange, { r0: 7, r1: 30, period: 1.6, alpha: a });
      if (i < 5) labelTag(ctx, '203.0.113.7', x, y - 36, { color: C.orangeText, alpha: prog(t, tSa + 0.1 + i * 0.15, 0.25), font: FONT.mono(21, 700) });
    });
    ANY_USERS.forEach(([u, k], i) => {
      const [ux, uy] = pr(u), [px, py] = pr(ANY_POPS[k]), t0 = tD - 0.6 + i * 0.13;
      const a = prog(t, t0, 0.25);
      if (a <= 0) return;
      glowDot(ctx, ux, uy, 7, C.lime, { glow: 2.5, alpha: a });
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.lime; ctx.lineWidth = 3;
      sketchPath(ctx, [[ux, uy], [px, py]], { seed: 90 + i, draw: prog(t, t0 + 0.1, 0.4), rough: 0.8 }); ctx.restore();
    });
    hand(ctx, 'nearest door wins', 560, 1215, t, tD + 0.2, { size: 46, color: C.lime, rot: -0.03 });
    if (t > tA - 0.1) { ctx.save(); const a = popIn(ctx, t, tA - 0.1, 270, 1250, 0.35, 0.7); stamp(ctx, 'ANYCAST', 260, 1250, t, tA - 0.1, C.orangeText, { size: 40 }); ctx.restore(); }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.6], [ch.start + 0.2, 'ticks', 0.4], [wordT(ch, 'same') - 0.15, 'type', 0.6], [wordT(ch, 'same'), 'ticks', 0.5], [cue(ch, 'door') - 0.6, 'draw'], [cue(ch, 'anycast') - 0.1, 'stamp']],
};

// ============ CACHE ============
const cache = {
  draw(ctx, t, ch) {
    const tM = cue(ch, 'miss'), tK = cue(ch, 'keep'), tH = cue(ch, 'hit'), tP = cue(ch, 'p85');
    const O = [850, 560], E = [430, 860], U = [150, 1150];
    const a0 = prog(t, ch.start - 0.2, 0.4);
    ctx.save(); ctx.globalAlpha = a0;
    serverIcon(ctx, O[0], O[1], { s: 0.95, t }); text(ctx, 'origin · Frankfurt', O[0], O[1] + 80, { font: FONT.mono(19, 500), color: C.blue, align: 'center' });
    serverIcon(ctx, E[0], E[1], { s: 1.2, color: C.orangeText, accent: C.orange, t, seed: 13 });
    text(ctx, 'edge · Sydney', E[0], E[1] + 95, { font: FONT.mono(19, 500), color: C.orangeText, align: 'center' });
    // cache shelf
    ctx.strokeStyle = 'rgba(233,238,252,0.6)'; ctx.lineWidth = 2; sRect(ctx, E[0] + 70, E[1] - 50, 120, 90, { seed: 33 });
    text(ctx, 'cache', E[0] + 130, E[1] - 62, { font: FONT.mono(16, 500), color: C.dim, align: 'center' });
    ctx.strokeStyle = 'rgba(233,238,252,0.2)'; ctx.lineWidth = 2; dashedLine(ctx, E[0] + 40, E[1] - 40, O[0] - 40, O[1] + 30, [5, 9]);
    hand(ctx, '16 500 km', 640, 640, t, ch.start, { size: 34, color: C.dim, rot: -0.6 });
    phoneIcon(ctx, U[0], U[1], { s: 1, alpha: 1 });
    ctx.restore();
    // miss journey: U→E→O→E→U
    const legs = [[U, E], [E, O], [O, E], [E, U]], LD = [0.35, 0.7, 0.7, 0.35];
    let tt = tM;
    legs.forEach(([A, B], i) => {
      const p = prog(t, tt, LD[i], ease.inOut), s0 = tt; tt += LD[i];
      if (p <= 0 || t > tK + 0.6) return;
      const x = lerp(A[0], B[0], p), y = lerp(A[1], B[1], p);
      ctx.strokeStyle = i < 2 ? 'rgba(255,120,60,0.8)' : 'rgba(143,184,255,0.8)'; ctx.lineWidth = 3;
      sketchPath(ctx, [[A[0], A[1]], [x, y]], { seed: 100 + i, rough: 0.6 });
      if (p < 1) { if (i >= 2) doc(ctx, x, y, 0.8, 1); else glowDot(ctx, x, y, 6, '#fff', { glow: 3 }); }
    });
    stamp(ctx, 'MISS', E[0] - 10, E[1] - 140, t, tM - 0.12, C.red, { size: 32, alpha: 1 - prog(t, tH - 0.2, 0.3) });
    // stored copy
    const kp = prog(t, tK, 0.45, ease.back);
    if (t > tK) doc(ctx, lerp(E[0], E[0] + 130, kp), lerp(E[1] - 80, E[1] - 5, kp), 1, 1);
    hand(ctx, 'keeps a copy', E[0] + 210, E[1] + 20, t, tK + 0.3, { size: 40, color: C.orangeText });
    // hits: many users around
    if (t > tH - 0.1) {
      stamp(ctx, 'HIT', E[0] - 10, E[1] - 140, t, tH - 0.12, C.lime, { size: 36 });
      const R = rng(9);
      for (let i = 0; i < 14; i++) {
        const ang = Math.PI * (0.55 + i * 0.075), rr = 330 + R() * 120;
        const ux = E[0] + Math.cos(ang) * rr * 0.9, uy = E[1] + Math.sin(ang) * rr * 0.75 + 140;
        const ap = prog(t, tH + i * 0.12, 0.25); if (ap <= 0) continue;
        glowDot(ctx, ux, uy, 6, C.lime, { glow: 2, alpha: ap });
        const per = 0.9 + R() * 0.6, f = ((t - tH - i * 0.12) % per) / per;
        ctx.save(); ctx.globalAlpha = ap * 0.6; ctx.strokeStyle = C.lime; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(E[0], E[1]); ctx.stroke(); ctx.restore();
        const ff = f < 0.5 ? f * 2 : 2 - f * 2;
        glowDot(ctx, lerp(ux, E[0], ff), lerp(uy, E[1], ff), 3.5, '#f4ffd8', { glow: 2, alpha: ap });
      }
    }
    // log card
    const lines = [{ t: tM, s: 'GET /index.html', r: 'MISS → origin', ms: '268 ms', c: C.red }];
    for (let i = 0; i < 40; i++) lines.push({ t: tH + i * 0.33, s: 'GET /index.html', r: 'HIT', ms: `${3 + ((i * 7) % 5)} ms`, c: C.lime });
    const vis = lines.filter(l => t > l.t).slice(-3);
    card(ctx, 70, 250, 940, 200, { alpha: prog(t, ch.start, 0.3) });
    text(ctx, 'edge log · sydney', 100, 292, { font: FONT.mono(18, 500), color: C.faint, alpha: prog(t, ch.start, 0.3) });
    vis.forEach((l, i) => {
      const y = 340 + i * 42;
      text(ctx, l.s, 100, y, { font: FONT.mono(23, 500), color: C.ink });
      text(ctx, l.r, 520, y, { font: FONT.mono(23, 700), color: l.c });
      text(ctx, l.ms, 980, y, { font: FONT.mono(23, 500), color: l.c, align: 'right' });
    });
    // 85% donut
    const dp = prog(t, tP - 0.1, 0.35);
    if (dp > 0) {
      const cx = 800, cy = 1130, r = 120;
      ctx.save(); popIn(ctx, t, tP - 0.1, cx, cy, 0.35, 0.7);
      ctx.globalAlpha = dp; ctx.fillStyle = 'rgba(8,13,30,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, r + 26, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 26; ctx.strokeStyle = 'rgba(120,140,190,0.3)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      const f = countUp(t, tP, 1.2, 0.85);
      ctx.strokeStyle = C.orange; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
      text(ctx, `${Math.round(f * 100)}%`, cx, cy + 18, { font: FONT.head(54, 900), color: C.white, align: 'center' });
      ctx.restore();
      text(ctx, 'avg. cache hit ratio · Gcore', 800, 1310, { font: FONT.mono(19, 500), color: C.dim, align: 'center', alpha: prog(t, tP + 0.3, 0.3) });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.5], [cue(ch, 'miss') - 0.12, 'stamp', 1.3], [cue(ch, 'miss') + 0.35, 'swish', 0.4], [cue(ch, 'miss') + 1.05, 'ping', 0.6],
    [cue(ch, 'keep'), 'pop'], [cue(ch, 'hit') - 0.12, 'stamp', 1.3], [cue(ch, 'hit') - 0.1, 'success', 0.35], ...Array.from({ length: 10 }, (_, i) => [cue(ch, 'hit') + 0.15 + i * 0.33, 'blip', 0.35]),
    [cue(ch, 'p85') - 0.1, 'pop'], [cue(ch, 'p85'), 'ticks', 0.4], [cue(ch, 'p85'), 'impact', 0.6]],
};
function doc(ctx, x, y, s = 1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#f4f6ff'; ctx.beginPath(); ctx.moveTo(-18, -24); ctx.lineTo(8, -24); ctx.lineTo(18, -14); ctx.lineTo(18, 24); ctx.lineTo(-18, 24); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.orange; ctx.fillRect(-11, -10, 22, 4); ctx.fillStyle = '#8a96bd'; ctx.fillRect(-11, -1, 22, 3); ctx.fillRect(-11, 7, 16, 3);
  ctx.restore();
}

// ============ WEIGHT ============
const weight = {
  draw(ctx, t, ch) {
    const tD = cue(ch, 'diet'), tW = cue(ch, 'webp'), tAv = wordT(ch, 'avif'), tL = cue(ch, 'lighter'), tLe = cue(ch, 'less');
    const a = prog(t, ch.start - 0.2, 0.4);
    const ix = 190, iy = 520, iw = 700, ih = 440;
    // squash the photo a little as it gets lighter (cartoon "diet")
    const shrink = lerp(1, 0.86, prog(t, tW, 1.6, ease.inOut));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(540, iy + ih / 2); ctx.scale(shrink, shrink); ctx.translate(-540, -(iy + ih / 2));
    photo(ctx, ix, iy, iw, ih, t);
    ctx.restore();
    const fmtName = t < tW ? 'photo.jpg' : t < tAv ? 'photo.webp' : 'photo.avif';
    labelTag(ctx, fmtName, ix + 90, iy - 30, { color: C.ink, alpha: a, font: FONT.mono(20, 500) });
    const mb = t < tW ? 1.2 : t < tAv ? lerp(1.2, 0.55, prog(t, tW, 0.5)) : lerp(0.55, 0.18, prog(t, tAv, 0.6));
    bigStat(ctx, 'file size', mb.toFixed(2), 70, 400, { color: mb < 0.3 ? C.lime : C.white, alpha: a, unit: 'MB' });
    // size bar
    const bx = 120, by = 1040, bw = 840;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(120,140,190,0.2)'; roundRect(ctx, bx, by, bw, 26, 13); ctx.fill();
    ctx.fillStyle = mb < 0.3 ? C.lime : C.orange; roundRect(ctx, bx, by, Math.max(26, bw * mb / 1.2), 26, 13); ctx.fill();
    ['JPEG', 'WebP', 'AVIF'].forEach((f, i) => {
      const on = (i === 0 && t < tW) || (i === 1 && t >= tW && t < tAv) || (i === 2 && t >= tAv);
      text(ctx, f, bx + i * 150, by + 72, { font: FONT.mono(24, on ? 700 : 400), color: on ? C.orangeText : C.faint });
    });
    ctx.restore();
    hand(ctx, 'on a diet', 700, 480, t, tD + 0.05, { size: 54, color: C.orangeText, rot: -0.08 });
    const t85 = wordT(ch, 'eighty-five');
    if (t > t85) { stamp(ctx, '−85%', 800, 900, t, t85, C.lime, { size: 58, rot: -0.12 }); }
    text(ctx, 'up to · Gcore image optimization', 960, 1000, { font: FONT.mono(17, 400), color: C.dim, align: 'right', alpha: prog(t, tL + 0.3, 0.3) });
    // loading bars
    const la = prog(t, tLe - 0.2, 0.3);
    if (la > 0) {
      const lp = clamp((t - tLe) / 0.6);
      [['before', 0.35, C.red], ['after', 1, C.lime]].forEach(([lab, sp, col], i) => {
        const y = 1170 + i * 60;
        text(ctx, lab, 120, y + 8, { font: FONT.mono(20, 500), color: C.dim, alpha: la });
        ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = 'rgba(120,140,190,0.2)'; roundRect(ctx, 260, y - 10, 700, 20, 10); ctx.fill();
        ctx.fillStyle = col; roundRect(ctx, 260, y - 10, Math.max(20, 700 * clamp(lp * sp * 1.6)), 20, 10); ctx.fill(); ctx.restore();
      });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.5], [cue(ch, 'diet'), 'pop'], [cue(ch, 'webp'), 'swish', 0.5], [wordT(ch, 'avif'), 'swish', 0.5],
    [wordT(ch, 'eighty-five'), 'stamp'], [wordT(ch, 'eighty-five'), 'impact', 0.5], [cue(ch, 'less'), 'blip']],
};
function photo(ctx, x, y, w, h, t) {
  ctx.save(); roundRect(ctx, x, y, w, h, 14); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, '#ff8a4c'); sky.addColorStop(0.55, '#ffcf8a'); sky.addColorStop(1, '#3b4f8f');
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  glowDot(ctx, x + w * 0.7, y + h * 0.38, 48, '#fff4d6', { glow: 1.6 });
  ctx.fillStyle = '#2b3a6b'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.62); ctx.lineTo(x + w * 0.22, y + h * 0.4); ctx.lineTo(x + w * 0.4, y + h * 0.6);
  ctx.lineTo(x + w * 0.6, y + h * 0.35); ctx.lineTo(x + w * 0.86, y + h * 0.62); ctx.lineTo(x + w, y + h * 0.5); ctx.lineTo(x + w, y + h); ctx.fill();
  ctx.fillStyle = '#1a2650'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.8); ctx.lineTo(x + w * 0.3, y + h * 0.7); ctx.lineTo(x + w * 0.55, y + h * 0.82);
  ctx.lineTo(x + w * 0.8, y + h * 0.68); ctx.lineTo(x + w, y + h * 0.78); ctx.lineTo(x + w, y + h); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = C.white; ctx.lineWidth = 3; sRect(ctx, x, y, w, h, { seed: 61, rough: 1.3 });
}

// ============ RUSH ============
const PLAYERS = (() => { const r = rng(77), o = []; for (let i = 0; i < 700; i++) { const h = POPS[Math.floor(r() * 160)]; o.push([h[0] + (r() - 0.5) * 14, h[1] + (r() - 0.5) * 9, r()]); } return o; })();
const RUSH_POPS = POPS.filter((_, i) => i % 5 === 0);
const rush = {
  draw(ctx, t, ch) {
    const tMi = cue(ch, 'million'), tMe = cue(ch, 'melt'), tSp = cue(ch, 'split'), tG = cue(ch, 'grew');
    // launcher card
    const la = life(t, ch.start - 0.2, tMi - 0.3);
    if (la > 0) {
      ctx.save(); popIn(ctx, t, ch.start - 0.2, 540, 760, 0.35, 0.85);
      card(ctx, 170, 520, 740, 480, { alpha: la });
      text(ctx, 'UPDATE AVAILABLE', 540, 610, { font: FONT.head(40, 900), color: C.white, align: 'center', alpha: la });
      text(ctx, 'patch 2.0 · new season', 540, 660, { font: FONT.mono(22, 500), color: C.dim, align: 'center', alpha: la });
      ctx.globalAlpha = la; ctx.fillStyle = C.orange; roundRect(ctx, 330, 720, 420, 96, 18); ctx.fill();
      text(ctx, 'DOWNLOAD', 540, 785, { font: FONT.head(38, 900), color: '#fff', align: 'center' });
      ctx.fillStyle = 'rgba(120,140,190,0.25)'; roundRect(ctx, 250, 890, 580, 16, 8); ctx.fill();
      text(ctx, '0%', 540, 950, { font: FONT.mono(20, 500), color: C.dim, align: 'center' });
      // cursor
      const cp = prog(t, ch.start + 0.4, 0.8, ease.inOut), cx = lerp(800, 600, cp), cy = lerp(980, 790, cp);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 42); ctx.lineTo(cx + 11, cy + 31); ctx.lineTo(cx + 30, cy + 31); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const ma = prog(t, tMi - 0.3, 0.4);
    if (ma <= 0) return;
    const pr = mapProj(0, 480, W, 700, { center: [15, 18], scale: 1.05 });
    drawMap(ctx, pr, null, { alpha: ma });
    const origin = pr(CITY.frankfurt);
    const heat = prog(t, tMe, 0.8) * (1 - prog(t, tSp + 0.6, 0.8));
    const splitP = prog(t, tSp, 1.2, ease.inOut);
    // players
    PLAYERS.forEach((p, i) => {
      const ap = prog(t, tMi + p[2] * 1.4, 0.2) * ma; if (ap <= 0) return;
      const [x, y] = pr([p[0], p[1]]);
      glowDot(ctx, x, y, 2.6, C.lime, { glow: 1.6, alpha: ap * 0.9 });
      if (i % 4 === 0 && t > tMe - 0.3) {
        // line to the origin (melting), later to the nearest PoP
        let best = RUSH_POPS[0], bd = 1e9;
        for (const q of RUSH_POPS) { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; best = q; } }
        const [nx, ny] = pr(best);
        const tx = lerp(origin[0], nx, splitP), ty = lerp(origin[1], ny, splitP);
        ctx.save(); ctx.globalAlpha = ap * lerp(0.22, 0.45, splitP) * prog(t, tMe - 0.3, 0.4);
        ctx.strokeStyle = splitP > 0.5 ? C.lime : C.red; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore();
      }
    });
    if (splitP > 0) RUSH_POPS.forEach((q, i) => { const [x, y] = pr(q); glowDot(ctx, x, y, 6, C.orange, { glow: 2.5, alpha: prog(t, tSp + (i % 10) * 0.05, 0.3) }); });
    // the lone origin server
    if (t > tMe - 0.3) {
      const shake = heat * 10, sx = origin[0] + noise1(t * 34, 1) * shake, sy = origin[1] - 70 + noise1(t * 34, 2) * shake;
      if (heat > 0) {
        const gl = ctx.createRadialGradient(sx, sy, 10, sx, sy, 220);
        gl.addColorStop(0, `rgba(255,60,70,${0.55 * heat})`); gl.addColorStop(1, 'rgba(255,60,70,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 220, 0, Math.PI * 2); ctx.fill();
        hand(ctx, 'melting!', sx + 70, sy + 30, t, tMe + 0.25, { size: 50, color: C.red, rot: 0.08, alpha: heat });
      }
      ctx.save(); popIn(ctx, t, tMe - 0.3, sx, sy, 0.3, 0.6); serverIcon(ctx, sx, sy, { s: 1.15, hot: heat, t }); ctx.restore();
      if (heat > 0.05) {
        for (let k = 0; k < 6; k++) { // melting drips
          const ph = ((t - tMe) * 0.9 + k * 0.37) % 1, dx = sx - 30 + k * 12, dy = sy + 45 + ph * 90;
          ctx.fillStyle = `rgba(255,77,94,${heat * (1 - ph)})`; ctx.beginPath(); ctx.ellipse(dx, dy, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
        }
        labelTag(ctx, '503 · overloaded', sx, sy - 88, { color: C.red, alpha: heat, font: FONT.mono(27, 700) });
      }
    }
    const st = splitP > 0.2;
    bigStat(ctx, st ? 'each location serves' : 'players hitting download', st ? 'ITS OWN' : 'MILLIONS', 70, 400,
      { color: st ? C.lime : C.orangeText, alpha: prog(t, tMi, 0.3) * (1 - prog(t, tG - 0.3, 0.3)), size: 76 });
    if (st) text(ctx, 'neighborhood', 70, 455, { font: FONT.head(40, 900), color: C.lime, alpha: prog(t, tSp + 0.3, 0.3) * (1 - prog(t, tG - 0.3, 0.3)) });
    // Gcore origin card
    const ga = prog(t, tG - 0.2, 0.35);
    if (ga > 0) {
      ctx.save(); popIn(ctx, t, tG - 0.2, 540, 360, 0.35, 0.85);
      card(ctx, 70, 250, 940, 200, { alpha: ga });
      ctx.globalAlpha = ga; gcoreWordmark(ctx, 110, 290, 52);
      text(ctx, 'est. 2014 · Luxembourg', 110, 400, { font: FONT.mono(22, 500), color: C.dim });
      text(ctx, 'born in gaming', 960, 345, { font: FONT.hand(52), color: C.orangeText, align: 'right' });
      gamepad(ctx, 860, 400, 0.9);
      ctx.restore();
    }
  },
  sfx: ch => [[ch.start - 0.2, 'pop'], [ch.start + 1.2, 'click'], [cue(ch, 'million') - 0.3, 'whoosh', 0.6], [cue(ch, 'million'), 'crowd', 0.5],
    [cue(ch, 'melt') - 0.3, 'pop'], [cue(ch, 'melt'), 'error', 0.35], [cue(ch, 'melt'), 'impact', 0.5], [cue(ch, 'melt') + 0.4, 'sizzle', 0.5], [cue(ch, 'split'), 'swish', 0.6], [cue(ch, 'split') + 0.2, 'ticks', 0.4],
    [cue(ch, 'grew') - 0.2, 'pop']],
};
function gamepad(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  sketchPath(ctx, [[-50, -15], [50, -15], [62, 20], [45, 30], [25, 12], [-25, 12], [-45, 30], [-62, 20], [-50, -15]], { seed: 88, rough: 0.8 });
  sLine(ctx, -36, -2, -20, -2, { seed: 1 }); sLine(ctx, -28, -10, -28, 6, { seed: 2 });
  glowDot(ctx, 26, -4, 4, C.orange, { glow: 1 }); glowDot(ctx, 38, 2, 4, C.lime, { glow: 1 });
  ctx.restore();
}

// ============ SHIELD ============
const SOURCES = [[[-47, -15], 0.51], [[-95, 38], 0.237], [[100, 15], 0.1], [[20, 5], 0.08], [[60, 45], 0.073]];
const SHIELD_POPS = POPS.filter((p, i) => i % 4 === 0 && p[0] > -130 && p[0] < 120);
const shield = {
  draw(ctx, t, ch) {
    const t6 = cue(ch, 't6'), tB = cue(ch, 'bpps'), t2 = cue(ch, 't200'), tA = cue(ch, 'absorb'), tBot = wordT(ch, 'botnet');
    const pr = mapProj(0, 500, W, 680, { center: [-15, 15], scale: 1.05 });
    drawMap(ctx, pr, null, { alpha: prog(t, ch.start - 0.2, 0.4) });
    const T = pr([8.68, 50.11]);
    // header card
    const ca = prog(t, ch.start + 0.1, 0.3);
    card(ctx, 70, 250, 940, 210, { alpha: ca });
    text(ctx, 'DDoS attack · 2025 · gaming host', 100, 300, { font: FONT.mono(21, 500), color: C.dim, alpha: ca });
    text(ctx, `${countUp(t, t6, 1.0, 6).toFixed(1)} Tbps`, 100, 390, { font: FONT.head(72, 900), color: C.red, alpha: prog(t, t6 - 0.1, 0.25) });
    text(ctx, typed('5.3 billion packets/s', t, tB, 35), 100, 435, { font: FONT.mono(22, 700), color: C.red, alpha: ca });
    text(ctx, 'peak', 980, 330, { font: FONT.hand(40), color: C.red, align: 'right', alpha: prog(t, t6 + 0.4, 0.3) });
    // target
    const ok = prog(t, tA + 0.2, 0.3);
    serverIcon(ctx, T[0], T[1] - 70, { s: 0.85, t, hot: prog(t, t6 + 0.4, 0.6) * (1 - prog(t, t2 + 0.6, 0.8)) });
    labelTag(ctx, ok > 0 ? 'still online' : 'gaming host', T[0], T[1] - 140, { color: ok > 0 ? C.lime : C.ink, alpha: prog(t, ch.start + 0.3, 0.3) });
    if (ok > 0) { ctx.save(); ctx.globalAlpha = ok; ctx.strokeStyle = C.lime; ctx.lineWidth = 5; ctx.lineCap = 'round';
      sketchPath(ctx, [[T[0] + 88, T[1] - 142], [T[0] + 98, T[1] - 130], [T[0] + 120, T[1] - 158]], { seed: 5, rough: 0.4, draw: prog(t, tA + 0.2, 0.3) }); ctx.restore(); }
    // flood particles
    const splitP = prog(t, t2, 1.0, ease.inOut), fade = 1 - prog(t, tA, 1.2);
    if (t > tBot && fade > 0) {
      const N = Math.round(lerp(50, 260, prog(t, t6 - 0.2, 0.6))), R = rng(3);
      for (let i = 0; i < N; i++) {
        const u = R(); let acc = 0, src = SOURCES[0][0];
        for (const [s, w] of SOURCES) { acc += w; if (u <= acc) { src = s; break; } }
        const s0 = [src[0] + (R() - 0.5) * 30, src[1] + (R() - 0.5) * 20];
        const pop = SHIELD_POPS[Math.floor(R() * SHIELD_POPS.length)];
        const ph = R(), per = 1.3;
        const life0 = tBot + ph * per, f = ((t - life0) % per) / per;
        if (t < life0) continue;
        const A = pr(s0), Bt = T, Bp = pr(pop);
        const B = [lerp(Bt[0], Bp[0], splitP), lerp(Bt[1] - 40, Bp[1], splitP)];
        const ctrl = arcCtrl(A, B, 0.18), p = quadPt(A, ctrl, B, ease.in(f)), q = quadPt(A, ctrl, B, ease.in(Math.max(0, f - 0.05)));
        ctx.save(); ctx.globalAlpha = fade * 0.9; ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,60,80,0.25)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.strokeStyle = '#ff6b78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.fillStyle = '#ffd0d5'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    // PoPs absorbing
    if (splitP > 0) SHIELD_POPS.forEach((q, i) => {
      const [x, y] = pr(q), a = prog(t, t2 + (i % 12) * 0.04, 0.3);
      glowDot(ctx, x, y, 5.5, C.orange, { glow: 2.5, alpha: a });
      pulseRing(ctx, x, y, t, t2 + (i % 7) * 0.13, C.orange, { r0: 6, r1: 26, period: 0.9, alpha: a * fade });
    });
    hand(ctx, 'from Brazil & the US', pr([-60, -30])[0] - 40, pr([-60, -30])[1] + 70, t, t6 + 0.5, { size: 36, color: C.red, rot: -0.03 });
    // capacity bar
    const ba = prog(t, t2 + 0.2, 0.35);
    if (ba > 0) {
      const x = 120, y = 1250, w = 840;
      text(ctx, 'Gcore network capacity · 200+ Tbps', x, y - 22, { font: FONT.mono(20, 500), color: C.dim, alpha: ba });
      ctx.save(); ctx.globalAlpha = ba; ctx.strokeStyle = C.orange; ctx.lineWidth = 3; roundRect(ctx, x, y, w, 34, 10); ctx.stroke();
      ctx.fillStyle = C.red; roundRect(ctx, x + 4, y + 4, Math.max(8, (w - 8) * 0.03 * prog(t, t2 + 0.4, 0.5)), 26, 6); ctx.fill(); ctx.restore();
      hand(ctx, 'the 6 Tbps attack', x + 40, y + 92, t, t2 + 0.7, { size: 40, color: C.red });
      if (t > t2 + 0.7) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 3; sketchPath(ctx, [[x + 28, y + 80], [x + 12, y + 44]], { seed: 6, draw: prog(t, t2 + 0.7, 0.25) }); arrowHead(ctx, x + 12, y + 44, Math.atan2(-36, -16), 12); ctx.restore(); }
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.6], [ch.start + 0.1, 'pop'], [wordT(ch, 'botnet'), 'alarm', 0.45], [wordT(ch, 'botnet'), 'swish', 0.5], [cue(ch, 't6'), 'rumble', 0.8], [cue(ch, 't6'), 'impact', 1.0], [cue(ch, 't6'), 'stream', 0.8], [cue(ch, 't6') + 2.4, 'stream', 0.7], [cue(ch, 't200') - 0.5, 'stream', 0.5], [cue(ch, 'bpps'), 'type', 0.5],
    [cue(ch, 't200'), 'swish', 0.7], [cue(ch, 't200') + 0.3, 'ticks', 0.4], [cue(ch, 'absorb') + 0.2, 'success', 0.8]],
};

// ============ RESULT ============
const result = {
  draw(ctx, t, ch) {
    const tS = cue(ch, 'slow'), tF = cue(ch, 'fast'), tT = cue(ch, 'there'), tBl = wordT(ch, 'blank') - 0.3;
    const ca = prog(t, ch.start - 0.1, 0.35);
    sectionHead(ctx, t, ch.start - 0.1, '11', 'one round trip from Sydney', { y: 300 });
    card(ctx, 70, 340, 940, 170, { alpha: ca });
    text(ctx, 'without CDN · to Frankfurt', 100, 405, { font: FONT.mono(24, 500), color: C.ink, alpha: ca });
    text(ctx, '≈250 ms', 980, 405, { font: FONT.mono(26, 700), color: C.red, align: 'right', alpha: prog(t, tS, 0.3) });
    text(ctx, 'with Gcore · average', 100, 465, { font: FONT.mono(24, 500), color: C.ink, alpha: ca });
    text(ctx, '≈30 ms', 980, 465, { font: FONT.mono(26, 700), color: C.lime, align: 'right', alpha: prog(t, tF, 0.3) });
    // bars
    const x0 = 120, maxW = 840;
    [[tS, 250, C.red, 'no CDN'], [tF, 30, C.lime, 'Gcore']].forEach(([t0, ms, col, lab], i) => {
      const y = 620 + i * 130, p = prog(t, t0, 0.5, ease.out);
      if (p <= 0) return;
      text(ctx, lab, x0, y - 18, { font: FONT.mono(22, 500), color: C.dim, alpha: p });
      ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = col; roundRect(ctx, x0, y, Math.max(16, maxW * (ms / 250) * p), 44, 12); ctx.fill(); ctx.restore();
      text(ctx, `${Math.round(ms * p)} ms`, x0 + Math.max(16, maxW * (ms / 250) * p) + 18, y + 34, { font: FONT.head(34, 900), color: col, alpha: p });
    });
    hand(ctx, '≈ 8× faster', 600, 790, t, tF + 0.9, { size: 52, color: C.lime, rot: -0.06 });
    // two browsers
    const ba = prog(t, tBl, 0.35);
    if (ba > 0) {
      browser(ctx, 80, 900, 440, 380, { alpha: ba, spinner: 1, t, url: 'no CDN', seed: 25 });
      browser(ctx, 560, 900, 440, 380, { alpha: ba, spinner: 1 - prog(t, tT - 0.1, 0.1), loaded: prog(t, tT - 0.1, 0.15), t, url: 'with Gcore', seed: 26 });
      if (t > tT) stamp(ctx, 'LOADED', 780, 1110, t, tT + 0.05, C.lime, { size: 34, rot: -0.1 });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.6], [cue(ch, 'slow'), 'draw'], [cue(ch, 'fast'), 'draw'], [cue(ch, 'fast') + 0.9, 'click'],
    [wordT(ch, 'blank') - 0.3, 'pop'], [cue(ch, 'there') - 0.05, 'success', 0.9]],
};

// ============ OUTRO ============
const outro = {
  draw(ctx, t, ch) {
    const t0 = ch.start - 0.2, tF = cue(ch, 'follow');
    ctx.save(); const a = popIn(ctx, t, t0, 540, 560, 0.45, 0.4);
    ctx.globalAlpha = a; ctx.strokeStyle = C.white; ctx.lineWidth = 4;
    gcoreAvatar(ctx, 540, 560, 130); sCircle(ctx, 540, 560, 142, { seed: 7, draw: prog(t, t0 + 0.1, 0.6) });
    ctx.restore();
    const ha = prog(t, tF - 0.05, 0.35);
    text(ctx, HANDLE.toUpperCase(), 540, 820 + (1 - ha) * 20, { font: FONT.head(66, 900), color: C.white, align: 'center', alpha: ha });
    text(ctx, 'follow for more tech you use every day', 540, 880, { font: FONT.mono(22, 500), color: C.dim, align: 'center', alpha: prog(t, tF + 0.5, 0.4) });
    const gp = prog(t, t0 + 0.3, 0.6);
    const pr = globeProj(540, 1120, 170, 20 + (t - t0) * 12, 20);
    ctx.save(); ctx.globalAlpha = gp;
    drawGlobe(ctx, pr, { outline: 1 });
    POPS.forEach(p => { if (visible(pr, p)) { const [x, y] = pr(p); glowDot(ctx, x, y, 2.6, C.orange, { glow: 2 }); } });
    for (let i = 0; i < 12; i++) {
      const r = i % 2 ? 230 : 280, an = i * 0.52 + (t - t0) * (i % 2 ? 0.3 : -0.22);
      glowDot(ctx, 540 + Math.cos(an) * r, 1120 + Math.sin(an) * r * 0.42, 4, i % 3 ? C.orange : C.blue, { glow: 2.5 });
    }
    ctx.restore();
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.8], [ch.start - 0.1, 'pop'], [cue(ch, 'follow'), 'success', 0.6]],
};

export const SCENES = { hook, distance, light, handshake, patience, edge, routing, cache, weight, rush, shield, result, outro };
