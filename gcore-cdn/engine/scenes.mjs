// Scenes, one per chapter. Each scene: { draw(ctx, t, ch), sfx(ch) → [[time, kind, gain?]] }
import {
  W, H, C, FONT, clamp, lerp, ease, prog, life, rng, noise1, text, measure, typed, hand, fmt, card, roundRect, popIn,
  glowDot, ring, sketchPath, sLine, sRect, sCircle, arrowHead, dashedLine, quadPt, quadPts, arcCtrl,
  serverIcon, phoneIcon, browser, person, gcoreAvatar, gcoreWordmark, defer, textLayer, withA, pill, THEME, svgImage, youDot,
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
const FRA = CITY.frankfurt, SJC = CITY.sanjose;
const KM = 9150; // Frankfurt ↔ San Jose, great circle
// North Atlantic map: California on the left, Frankfurt on the right
const atlMap = () => mapProj(0, 560, W, 660, { center: [-57, 45], scale: 2.05 });
function labelTag(ctx, s, x, y, { color = C.ink, alpha = 1, bg = C.halo, font = FONT.mono(17, 500) } = {}) {
  if (alpha <= 0) return;
  const w = measure(ctx, s, font) + 22, h = +(/([\d.]+)px/.exec(font)[1]) * 1.7;
  defer(ctx, () => {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - h / 2 - 1, w, h, 8); ctx.fill();
    ctx.strokeStyle = C.cardLine; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    text(ctx, s, x, y + h * 0.2, { font, color, align: 'center', alpha, halo: false });
  });
}
function countUp(t, t0, d, to, e = ease.out) { return to * prog(t, t0, d, e); }
function pulseRing(ctx, x, y, t, t0, color, { r0 = 8, r1 = 46, period = 1.4, alpha = 1 } = {}) {
  if (t < t0) return;
  const f = ((t - t0) % period) / period;
  ring(ctx, x, y, lerp(r0, r1, f), color, { alpha: alpha * (1 - f) * 0.8, lw: 2 });
}
// gcore.com-style tab label ("DDOS PROTECTION"): solid rounded tab, white caps. Orange tabs get the brand gradient.
function stamp(ctx, s, x, y, t, t0, color, { size = 30, rot = -0.08, alpha = 1, fg = '#ffffff' } = {}) {
  if (t < t0 || alpha <= 0) return;
  const p = clamp((t - t0) / 0.25), sc = lerp(1.6, 1, ease.out(p));
  defer(ctx, () => {
    ctx.save(); ctx.globalAlpha *= alpha * ease.out(p); ctx.translate(x, y); ctx.rotate(rot * 0.5); ctx.scale(sc, sc);
    const font = FONT.head(size, 800), w = measure(ctx, s, font, 1) + size * 1.1, h = size * 1.55;
    let fill = color;
    if (color === C.orange || color === C.good || color === C.orangeText) {
      fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      fill.addColorStop(0, C.orange2); fill.addColorStop(0.3, C.orange); fill.addColorStop(0.65, C.orange); fill.addColorStop(1, '#ffbc9f');
    }
    ctx.shadowColor = C.shadow; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    roundRect(ctx, -w / 2, -h / 2 - size * 0.12, w, h, size * 0.35); ctx.fillStyle = fill; ctx.fill(); ctx.shadowColor = 'transparent';
    text(ctx, s, 0, size * 0.28, { font, color: fg, align: 'center', halo: false, ls: 1 });
    ctx.restore();
  });
}

// ============ HOOK ============
const hook = {
  draw(ctx, t, ch) {
    const t0 = ch.start, tI = cue(ch, 'itself'), tW = cue(ch, 'who');
    // title
    const l1 = ['WHO’S', 'REALLY'];
    let x = 70;
    l1.forEach((w, i) => {
      const a = prog(t, t0 + i * 0.12, 0.3);
      text(ctx, w, x, 345 + (1 - a) * 20, { font: FONT.head(84, 900), color: C.text, alpha: a });
      x += measure(ctx, w + ' ', FONT.head(84, 900));
    });
    const a2 = prog(t, t0 + 0.35, 0.3);
    text(ctx, 'ANSWERING?', 70, 445 + (1 - a2) * 20, { font: FONT.head(84, 900), color: C.orangeText, alpha: a2 });
    // faint globe of PoPs behind everything
    const gp = prog(t, t0, 0.8);
    const pr = globeProj(540, 900, 300, -20 + (t - t0) * 7, 30);
    ctx.save(); ctx.globalAlpha = gp * 0.55;
    drawGlobe(ctx, pr, { outline: prog(t, t0 + 0.1, 0.8) });
    ctx.restore();
    const lit = prog(t, tW, 0.9);
    POPS.forEach((p, i) => {
      if (i % 2 || !visible(pr, p)) return;
      const [px, py] = pr(p); glowDot(ctx, px, py, 3, C.orange, { glow: 2, alpha: gp * lerp(0.25, 1, lit) });
    });
    // you → "the website", then crossed out
    const U = [250, 1170], S = [800, 600];
    ctx.save(); popIn(ctx, t, t0 + 0.2, U[0], U[1]); phoneIcon(ctx, U[0], U[1], { s: 1.3, alpha: prog(t, t0 + 0.2, 0.3) }); ctx.restore();
    hand(ctx, 'you', U[0] - 130, U[1] + 20, t, t0 + 0.35, { size: 46, color: C.you });
    ctx.save(); popIn(ctx, t, t0 + 0.45, S[0], S[1]); serverIcon(ctx, S[0], S[1], { s: 1.15, alpha: prog(t, t0 + 0.45, 0.3), t }); ctx.restore();
    hand(ctx, 'the website', S[0] - 95, S[1] + 100, t, t0 + 0.6, { size: 42, color: C.blue });
    ctx.strokeStyle = withA(C.you, 0.85); ctx.lineWidth = 3;
    sketchPath(ctx, [[U[0] + 30, U[1] - 50], [S[0] - 50, S[1] + 50]], { seed: 9, draw: prog(t, t0 + 0.6, 0.7) });
    if (t > tI) {
      ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.lineCap = 'round';
      const mx = (U[0] + S[0]) / 2, my = (U[1] + S[1]) / 2;
      sketchPath(ctx, [[mx - 36, my - 36], [mx + 36, my + 36]], { seed: 2, draw: prog(t, tI, 0.15) });
      sketchPath(ctx, [[mx + 36, my - 36], [mx - 36, my + 36]], { seed: 3, draw: prog(t, tI + 0.12, 0.15) });
      ctx.lineCap = 'butt';
    }
    // someone much closer answers instead: a mystery node next to you
    if (t > tW - 0.15) {
      const Q = [560, 1060], qa = prog(t, tW - 0.15, 0.35);
      ctx.save(); ctx.globalAlpha = qa; ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(U[0] + 40, U[1] - 20); ctx.lineTo(Q[0] - 60, Q[1] + 20); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      ctx.save(); popIn(ctx, t, tW - 0.1, Q[0], Q[1], 0.4, 0.5);
      ctx.globalAlpha = qa; ctx.fillStyle = C.halo; ctx.beginPath(); ctx.arc(Q[0], Q[1], 58, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.orange; ctx.lineWidth = 3.5; sCircle(ctx, Q[0], Q[1], 58, { seed: 12, draw: prog(t, tW - 0.1, 0.4) });
      text(ctx, '?', Q[0], Q[1] + 30, { font: FONT.head(84, 900), color: C.orangeText, align: 'center', halo: false });
      ctx.restore();
      pulseRing(ctx, Q[0], Q[1], t, tW, C.orange, { r0: 60, r1: 120, period: 1.3, alpha: qa });
    }
  },
  sfx: ch => [[ch.start + 0.2, 'pop', 0.8], [ch.start + 0.45, 'pop', 0.8], [cue(ch, 'itself'), 'down'], [cue(ch, 'who') - 0.15, 'swell']],
};

// ============ DISTANCE ============
const distance = {
  draw(ctx, t, ch) {
    const tO = cue(ch, 'sj'), tU = cue(ch, 'fra'), tK = cue(ch, 'km');
    sectionHead(ctx, t, ch.start - 0.1, '01', 'follow one click', { t1: tK - 0.5 });
    const pr = atlMap();
    drawMap(ctx, pr, null, { alpha: prog(t, ch.start - 0.2, 0.5) });
    sjFra(ctx, t, pr, { tO, tU, tK });
    const km = countUp(t, tK, 1.1, KM);
    bigStat(ctx, 'distance to the server', fmt(Math.round(km / 10) * 10), 70, 400, { color: C.text, alpha: prog(t, tK - 0.1, 0.3), unit: 'km' });
  },
  sfx: ch => [[ch.start - 0.25, 'whoosh', 0.7], [cue(ch, 'sj'), 'pop'], [cue(ch, 'fra'), 'pop'], [cue(ch, 'km'), 'swell']],
};
// San Jose origin server + Frankfurt user + the long arc across the Atlantic
function sjFra(ctx, t, pr, { tO, tU, tK, alpha = 1, arcAlpha = 1, showArc = true }) {
  const [ox, oy] = pr(SJC), [ux, uy] = pr(FRA);
  ctx.save(); ctx.globalAlpha *= alpha;
  if (t > tO) { ctx.save(); popIn(ctx, t, tO, ox, oy - 75); serverIcon(ctx, ox, oy - 75, { s: 0.8, t }); ctx.restore(); }
  youDot(ctx, ox, oy, 6, { color: C.dim, alpha: prog(t, tO, 0.2) });
  hand(ctx, 'origin · San Jose', ox - 70, oy + 62, t, tO + 0.1, { size: 38, color: C.blue });
  if (t > tU) { pulseRing(ctx, ux, uy, t, tU, C.orange); youDot(ctx, ux, uy, 10); }
  hand(ctx, 'you · Frankfurt', ux - 150, uy + 66, t, tU + 0.1, { size: 38, color: C.you });
  if (showArc && t > tK) {
    const ctrl = arcCtrl([ox, oy], [ux, uy], 0.3);
    ctx.globalAlpha *= arcAlpha;
    ctx.strokeStyle = C.orange; ctx.lineWidth = 3.4; sketchPath(ctx, quadPts([ox, oy], ctrl, [ux, uy], 50), { seed: 14, draw: prog(t, tK, 0.9, ease.inOut) });
    const m = quadPt([ox, oy], ctrl, [ux, uy], 0.5);
    hand(ctx, `${fmt(KM)} km`, m[0], m[1] - 34, t, tK + 0.6, { size: 46, color: C.orangeText, rot: 0, align: 'center' });
  }
  ctx.restore();
}

// ============ LIGHT ============
// a plausible terrestrial + transatlantic fibre path: Frankfurt → Amsterdam → London → Cornwall → New York → Chicago → Denver → San Jose
const ROUTE = [FRA, [4.9, 52.37], [-0.13, 51.5], [-5.5, 50.1], [-20, 51.3], [-40, 49], [-58, 44.5], [-70.5, 41.2], [-74, 40.7], [-87.6, 41.9],
  [-96, 41.2], [-105, 39.7], [-112, 40.8], [-119.8, 39.5], [-121.89, 37.34]];
const light = {
  draw(ctx, t, ch) {
    const tSp = cue(ch, 'speed'), tC = cue(ch, 'curvy'), tR = cue(ch, 'rtt'), tSo = wordT(ch, 'sounds');
    const aA = 1 - prog(t, tC - 0.35, 0.35);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha = aA;
      bigStat(ctx, 'light inside fiber', fmt(Math.round(countUp(t, tSp - 0.35, 0.6, 200000) / 1000) * 1000), 70, 400,
        { color: C.text, alpha: prog(t, ch.start, 0.3), unit: 'km/s' });
      text(ctx, 'in a vacuum: 299 792 km/s · glass slows it by about a third', 70, 450, { font: FONT.mono(19, 400), color: C.dim, alpha: prog(t, tSp + 0.8, 0.4) });
      fiber(ctx, t, 60, 760, 960, 150, ch.start);
      hand(ctx, 'fiber-optic cable', 650, 950, t, ch.start + 0.3, { size: 40, color: C.blue });
      hand(ctx, 'instant?', 760, 360, t, tSo + 0.05, { size: 58, color: C.orangeText, rot: -0.1 });
      ctx.restore();
    }
    const aB = prog(t, tC - 0.35, 0.4);
    if (aB > 0) {
      const pr = atlMap();
      drawMap(ctx, pr, null, { alpha: aB });
      sjFra(ctx, t, pr, { tO: -1, tU: -1, tK: -1, alpha: aB, showArc: false });
      const [ox, oy] = pr(SJC), [ux, uy] = pr(FRA);
      ctx.save(); ctx.globalAlpha = aB;
      ctx.strokeStyle = withA(C.line, 0.35); ctx.lineWidth = 2; dashedLine(ctx, ox, oy, ux, uy, [8, 10]);
      const ang = Math.atan2(uy - oy, ux - ox);
      ctx.save(); ctx.translate(lerp(ox, ux, 0.56), lerp(oy, uy, 0.56)); ctx.rotate(ang);
      hand(ctx, 'straight line', 0, 46, t, tC + 0.2, { size: 36, color: C.dim, rot: 0, align: 'center' }); ctx.restore();
      const rp = ROUTE.map(p => pr(p)).reverse();
      ctx.strokeStyle = C.orange; ctx.lineWidth = 3.5; sketchPath(ctx, rp, { seed: 31, rough: 1.2, draw: prog(t, tC, 1.6, ease.inOut) });
      const lp = pr([-38, 49]);
      hand(ctx, 'real cable route', lp[0], lp[1] - 46, t, tC + 1.0, { size: 38, color: C.orangeText, rot: -0.04, align: 'center' });
      // round-trip pulse
      if (t > tR) {
        const f = ((t - tR) % 2.4) / 2.4, ff = f < 0.5 ? f * 2 : 2 - f * 2;
        const L = rp.length - 1, i = ff * L, a = Math.floor(Math.min(i, L - 1)), b = a + 1;
        const px = lerp(rp[a][0], rp[b][0], i - a), py = lerp(rp[a][1], rp[b][1], i - a);
        glowDot(ctx, px, py, 7, C.spark, { glow: 4 });
      }
      ctx.restore();
      bigStat(ctx, 'there and back', String(Math.round(countUp(t, tR, 1.3, 150))), 70, 400, { color: C.orangeText, alpha: prog(t, tR - 0.1, 0.3), unit: 'ms' });
    }
  },
  sfx: ch => [[cue(ch, 'speed'), 'tap'], [wordT(ch, 'sounds'), 'pop', 0.8], [cue(ch, 'curvy') - 0.35, 'whoosh', 0.7], [cue(ch, 'rtt'), 'swell', 0.8]],
};
// fiber tube with a light pulse bouncing inside (total internal reflection)
function fiber(ctx, t, x, y, w, h, t0) {
  const a = prog(t, t0, 0.4);
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, withA(C.orange, 0.03)); g.addColorStop(0.5, withA(C.orange, 0.10)); g.addColorStop(1, withA(C.orange, 0.03));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6;
  sLine(ctx, x, y, x + w, y, { seed: 41, draw: prog(t, t0, 0.6) }); sLine(ctx, x, y + h, x + w, y + h, { seed: 42, draw: prog(t, t0 + 0.1, 0.6) });
  ctx.strokeStyle = withA(C.line, 0.25); ctx.lineWidth = 1.5;
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
    if (head <= 1) { const p = P(head); glowDot(ctx, p[0], p[1], 7, C.spark, { glow: 4 }); }
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
    text(ctx, 'you · Frankfurt', LX, 590, { font: FONT.mono(20, 500), color: C.you, align: 'center' });
    text(ctx, 'server · San Jose', RX, 590, { font: FONT.mono(20, 500), color: C.blue, align: 'center' });
    ctx.strokeStyle = withA(C.line, 0.3); ctx.lineWidth = 2;
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
    const tm = 0.15 * done;
    bigStat(ctx, 'waiting for the first byte', tm.toFixed(2), 70, 400, { color: tm >= 0.5 ? C.red : C.text, alpha: prog(t, cue(ch, 'hs') - 0.2, 0.3), unit: 's' });
    // blank screen (covers the lane labels, so paint the queued labels first)
    if (t > tB - 0.1) {
      textLayer.flush();
      ctx.save(); const a = popIn(ctx, t, tB - 0.1, 540, 900, 0.35, 0.8);
      browser(ctx, 230, 640, 620, 560, { alpha: a, spinner: 1, t });
      ctx.restore();
      hand(ctx, '…still nothing', 560, 1318, t, tB + 0.3, { size: 58, color: C.red, rot: -0.04 });
    }
  },
  sfx(ch) {
    const o = this.trips(ch).map(tr => [tr.t, 'tap', 0.8]);
    o.push([cue(ch, 'blank') - 0.1, 'pop']); o.push([cue(ch, 'blank') + 0.3, 'down', 0.8]);
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
        glowDot(ctx, lerp(x0, x1, f), y, 9, C.spark, { glow: 2 });
        hand(ctx, 'gone.', x1 - 40, y - 34, t, tS + 1.1, { size: 44, color: C.red });
        ctx.restore();
      }
      ctx.restore();
    }
    // Amazon quote + stat
    const aQ = prog(t, tA - 0.2, 0.35);
    if (aQ > 0) {
      textLayer.flush();
      ctx.save(); const a = popIn(ctx, t, tA - 0.2, 540, 620, 0.35, 0.85);
      card(ctx, 110, 470, 860, 230, { alpha: a });
      text(ctx, '“Every 100 ms of delay', 150, 560, { font: FONT.sans(44, 700), color: C.text, alpha: a });
      text(ctx, 'costs 1% of sales.”', 150, 615, { font: FONT.sans(44, 700), color: C.text, alpha: a });
      text(ctx, 'Greg Linden · Amazon · 2006', 150, 666, { font: FONT.mono(19, 400), color: C.dim, alpha: a });
      ctx.restore();
      const b1 = prog(t, tA + 0.6, 0.3), b2 = prog(t, tP, 0.3);
      bigStat(ctx, 'page gets slower by', '+100 ms', 150, 900, { color: C.orangeText, size: 78, alpha: b1 });
      bigStat(ctx, 'sales drop by', '−1%', 150, 1110, { color: C.red, size: 110, alpha: b2 });
      if (b2 > 0) { ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.save(); ctx.globalAlpha = b2; sketchPath(ctx, [[600, 950], [700, 1010], [800, 1000], [900, 1090]], { seed: 77, draw: prog(t, tP, 0.6) }); arrowHead(ctx, 900, 1090, Math.atan2(90, 100), 18); ctx.restore(); }
    }
  },
  sfx: ch => [[cue(ch, 'g53'), 'swell', 0.8], [cue(ch, 's3') + 1.1, 'down', 0.6], [cue(ch, 'amz') - 0.2, 'pop'], [cue(ch, 'pct1'), 'down', 0.8]],
};

// ============ EDGE ============
const edge = {
  draw(ctx, t, ch) {
    const tCl = cue(ch, 'closer'), tCDN = wordT(ch, 'cdn'), tPo = cue(ch, 'pops'), tSix = cue(ch, 'six'), tN = cue(ch, 'near');
    // phase A: copy the site next to the user
    const aA = 1 - prog(t, tPo - 0.4, 0.35);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha = aA;
      const pr = atlMap(); drawMap(ctx, pr);
      const arcFade = 1 - prog(t, tCl + 0.7, 0.5);
      sjFra(ctx, t, pr, { tO: -1, tU: -1, tK: -1, arcAlpha: arcFade });
      const [ox, oy] = pr(SJC), [ux, uy] = pr(FRA);
      const ex = ux - 60, ey = uy + 190; // edge server placed right by Frankfurt
      const mv = prog(t, tCl, 0.9, ease.inOut);
      if (t > tCl) {
        const ctrl = arcCtrl([ox, oy - 75], [ex, ey], 0.3), p = quadPt([ox, oy - 75], ctrl, [ex, ey], mv);
        serverIcon(ctx, p[0], p[1], { s: lerp(0.8, 0.9, mv), color: C.orangeText, accent: C.orange, t, seed: 12 });
        if (mv >= 1) {
          ctx.strokeStyle = C.you; ctx.lineWidth = 3.5; sketchPath(ctx, [[ux, uy], [ex + 10, ey - 45]], { seed: 18, draw: prog(t, tCl + 0.9, 0.3) });
          hand(ctx, 'edge copy', ex - 230, ey + 14, t, tCl + 0.95, { size: 40, color: C.orangeText });
        }
      }
      const km = t < tCl + 0.2 ? KM : lerp(KM, 5, prog(t, tCl + 0.2, 0.9, ease.inOut));
      const sa = 1 - prog(t, tCDN - 0.25, 0.25);
      bigStat(ctx, 'distance to the server', fmt(Math.round(km)), 70, 400, { color: km < 100 ? C.good : C.text, alpha: sa, unit: 'km' });
      // CDN acronym
      if (t > tCDN - 0.15) {
        ['CONTENT', 'DELIVERY', 'NETWORK'].forEach((w, i) => {
          const a = prog(t, tCDN - 0.15 + i * 0.22, 0.3), y = 300 + i * 64;
          text(ctx, w[0], 70, y, { font: FONT.head(58, 900), color: C.orangeText, alpha: a });
          text(ctx, w.slice(1), 70 + measure(ctx, w[0], FONT.head(58, 900)), y, { font: FONT.head(58, 900), color: C.text, alpha: a });
        });
      }
      ctx.restore();
    }
    // phase B: Gcore's PoPs on the globe, then zoom to Frankfurt
    const aB = prog(t, tPo - 0.4, 0.4);
    if (aB > 0) {
      const z = prog(t, tN - 0.5, 1.4, ease.inOut);
      const lon = lerp(-30 + (t - tPo) * 9, FRA[0], z), lat = lerp(22, FRA[1], z);
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
        const [ux, uy] = pr([8.45, 50.22]), [px, py] = pr(FRA);
        const U = [ux - 150, uy - 40], P = [px + 120, py + 70];
        pulseRing(ctx, U[0], U[1], t, tN + 0.3, C.orange, { alpha: za }); youDot(ctx, U[0], U[1], 11, { alpha: za });
        hand(ctx, 'you', U[0] - 40, U[1] - 34, t, tN + 0.4, { size: 44, color: C.you });
        ctx.strokeStyle = C.you; ctx.lineWidth = 3.5; sketchPath(ctx, [U, [P[0] - 50, P[1] - 20]], { seed: 19, draw: prog(t, tN + 0.5, 0.4) });
        ctx.save(); ctx.globalAlpha *= za; serverIcon(ctx, P[0], P[1], { s: 0.9, color: C.orangeText, accent: C.orange, t }); ctx.restore();
        hand(ctx, 'Gcore PoP · Frankfurt', P[0], P[1] + 100, t, tN + 0.5, { size: 40, color: C.orangeText, align: 'center' });
        const m = [(U[0] + P[0]) / 2, (U[1] + P[1]) / 2];
        hand(ctx, 'a few km', m[0] - 20, m[1] - 34, t, tN + 0.8, { size: 38, color: C.you, rot: Math.atan2(P[1] - U[1], P[0] - U[0]), align: 'center' });
      }
      ctx.restore();
      const sa = aB * (1 - prog(t, tN - 0.6, 0.3));
      bigStat(ctx, 'Gcore points of presence', shown >= POPS.length ? '210+' : String(Math.min(210, shown)), 70, 400, { color: C.orangeText, alpha: sa, size: 96 });
      text(ctx, 'on 6 continents · 200+ Tbps network', 70, 452, { font: FONT.mono(20, 500), color: C.dim, alpha: sa * prog(t, tSix, 0.3) });
    }
  },
  sfx: ch => [[cue(ch, 'closer'), 'whoosh', 0.8], [cue(ch, 'closer') + 0.9, 'pop'], [wordT(ch, 'cdn') - 0.15, 'tap'],
    [cue(ch, 'pops') - 0.4, 'whoosh', 0.6], [cue(ch, 'pops') + 2.2, 'swell', 0.8], [cue(ch, 'near') - 0.5, 'whoosh', 0.7], [cue(ch, 'near') + 0.4, 'pop']],
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
      youDot(ctx, ux, uy, 7, { alpha: a });
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.you; ctx.lineWidth = 3;
      sketchPath(ctx, [[ux, uy], [px, py]], { seed: 90 + i, draw: prog(t, t0 + 0.1, 0.4), rough: 0.8 }); ctx.restore();
    });
    hand(ctx, 'nearest door wins', 560, 1215, t, tD + 0.2, { size: 46, color: C.you, rot: -0.03 });
    if (t > tA - 0.1) { ctx.save(); const a = popIn(ctx, t, tA - 0.1, 270, 1250, 0.35, 0.7); stamp(ctx, 'ANYCAST', 260, 1250, t, tA - 0.1, C.orangeText, { size: 40 }); ctx.restore(); }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.6], [wordT(ch, 'same') - 0.15, 'tap'], [cue(ch, 'door') - 0.6, 'pop', 0.7], [cue(ch, 'anycast') - 0.1, 'stamp']],
};

// ============ CACHE ============
const cache = {
  draw(ctx, t, ch) {
    const tM = cue(ch, 'miss'), tK = cue(ch, 'keep'), tH = cue(ch, 'hit'), tP = cue(ch, 'p85');
    const O = [850, 560], E = [430, 860], U = [150, 1150];
    const a0 = prog(t, ch.start - 0.2, 0.4);
    ctx.save(); ctx.globalAlpha = a0;
    serverIcon(ctx, O[0], O[1], { s: 0.95, t }); text(ctx, 'origin · San Jose', O[0], O[1] + 80, { font: FONT.mono(19, 500), color: C.blue, align: 'center' });
    serverIcon(ctx, E[0], E[1], { s: 1.2, color: C.orangeText, accent: C.orange, t, seed: 13 });
    text(ctx, 'edge · Frankfurt', E[0], E[1] + 95, { font: FONT.mono(19, 500), color: C.orangeText, align: 'center' });
    // cache shelf
    ctx.strokeStyle = withA(C.line, 0.7); ctx.lineWidth = 2; roundRect(ctx, E[0] + 70, E[1] - 50, 120, 90, 10); ctx.stroke();
    text(ctx, 'cache', E[0] + 130, E[1] - 62, { font: FONT.mono(16, 500), color: C.dim, align: 'center' });
    ctx.strokeStyle = withA(C.line, 0.25); ctx.lineWidth = 2; dashedLine(ctx, E[0] + 40, E[1] - 40, O[0] - 40, O[1] + 30, [5, 9]);
    { // distance label beside the dashed line, never on it
      const A = [E[0] + 40, E[1] - 40], B = [O[0] - 40, O[1] + 30], ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      ctx.save(); ctx.translate(lerp(A[0], B[0], 0.5), lerp(A[1], B[1], 0.5)); ctx.rotate(ang);
      hand(ctx, `${fmt(KM)} km`, 0, -26, t, ch.start, { size: 36, color: C.dim, rot: 0, align: 'center' }); ctx.restore();
    }
    phoneIcon(ctx, U[0], U[1], { s: 1, alpha: 1 });
    ctx.restore();
    // miss journey: U→E→O→E→U
    const legs = [[U, E], [E, O], [O, E], [E, U]], LD = [0.35, 0.7, 0.7, 0.35];
    let tt = tM;
    legs.forEach(([A, B], i) => {
      const p = prog(t, tt, LD[i], ease.inOut), s0 = tt; tt += LD[i];
      if (p <= 0 || t > tK + 0.6) return;
      const x = lerp(A[0], B[0], p), y = lerp(A[1], B[1], p);
      ctx.strokeStyle = i < 2 ? withA(C.orange, 0.85) : withA(C.line, 0.6); ctx.lineWidth = 3;
      sketchPath(ctx, [[A[0], A[1]], [x, y]], { seed: 100 + i, rough: 0.6 });
      if (p < 1) { if (i >= 2) doc(ctx, x, y, 0.8, 1); else glowDot(ctx, x, y, 6, C.spark, { glow: 3 }); }
    });
    stamp(ctx, 'MISS', E[0] - 10, E[1] - 140, t, tM - 0.12, C.text, { size: 32, alpha: 1 - prog(t, tH - 0.2, 0.3), fg: C.surface });
    // stored copy
    const kp = prog(t, tK, 0.45, ease.back);
    if (t > tK) doc(ctx, lerp(E[0], E[0] + 130, kp), lerp(E[1] - 80, E[1] - 5, kp), 1, 1);
    hand(ctx, 'keeps a copy', E[0] + 210, E[1] + 20, t, tK + 0.3, { size: 40, color: C.orangeText });
    // hits: many users around
    if (t > tH - 0.1) {
      stamp(ctx, 'HIT', E[0] - 10, E[1] - 140, t, tH - 0.12, C.good, { size: 36 });
      const R = rng(9);
      for (let i = 0; i < 14; i++) {
        const ang = Math.PI * (0.62 + i * 0.05), rr = 330 + R() * 120;
        const ux = E[0] + Math.cos(ang) * rr * 0.9, uy = E[1] + Math.sin(ang) * rr * 0.75 + 140;
        const ap = prog(t, tH + i * 0.12, 0.25); if (ap <= 0) continue;
        youDot(ctx, ux, uy, 6, { alpha: ap });
        const per = 0.9 + R() * 0.6, f = ((t - tH - i * 0.12) % per) / per;
        ctx.save(); ctx.globalAlpha = ap * 0.3; ctx.strokeStyle = C.you; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(E[0], E[1]); ctx.stroke(); ctx.restore();
        const ff = f < 0.5 ? f * 2 : 2 - f * 2;
        glowDot(ctx, lerp(ux, E[0], ff), lerp(uy, E[1], ff), 3.5, C.spark, { glow: 2, alpha: ap });
      }
    }
    // log card
    const lines = [{ t: tM, s: 'GET /index.html', r: 'MISS → origin', ms: '184 ms', c: C.dim }];
    for (let i = 0; i < 40; i++) lines.push({ t: tH + i * 0.33, s: 'GET /index.html', r: 'HIT', ms: `${3 + ((i * 7) % 5)} ms`, c: C.good });
    const vis = lines.filter(l => t > l.t).slice(-3);
    card(ctx, 70, 250, 940, 200, { alpha: prog(t, ch.start, 0.3) });
    text(ctx, 'edge log · frankfurt', 100, 292, { font: FONT.mono(18, 500), color: C.faint, alpha: prog(t, ch.start, 0.3) });
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
      textLayer.flush();
      ctx.save(); popIn(ctx, t, tP - 0.1, cx, cy, 0.35, 0.7);
      ctx.globalAlpha = dp; ctx.shadowColor = C.shadow; ctx.shadowBlur = 40; ctx.fillStyle = C.card; ctx.beginPath(); ctx.arc(cx, cy, r + 26, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.lineWidth = 26; ctx.strokeStyle = C.track; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.lineCap = 'round';
      const f = countUp(t, tP, 1.2, 0.85);
      ctx.strokeStyle = C.orange; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
      text(ctx, `${Math.round(f * 100)}%`, cx, cy + 18, { font: FONT.head(54, 900), color: C.text, align: 'center' });
      ctx.restore();
      text(ctx, 'avg. cache hit ratio · Gcore', 800, 1310, { font: FONT.mono(19, 500), color: C.dim, align: 'center', alpha: prog(t, tP + 0.3, 0.3) });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.5], [cue(ch, 'miss') - 0.12, 'stamp'], [cue(ch, 'keep'), 'pop', 0.8],
    [cue(ch, 'hit') - 0.12, 'stamp'], [cue(ch, 'hit') + 0.1, 'chime', 0.7], [cue(ch, 'p85') - 0.1, 'swell', 0.8]],
};
function doc(ctx, x, y, s = 1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = C.surface; ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-18, -24); ctx.lineTo(8, -24); ctx.lineTo(18, -14); ctx.lineTo(18, 24); ctx.lineTo(-18, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.orange; ctx.fillRect(-11, -10, 22, 4); ctx.fillStyle = C.faint; ctx.fillRect(-11, -1, 22, 3); ctx.fillRect(-11, 7, 16, 3);
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
    bigStat(ctx, 'file size', mb.toFixed(2), 70, 400, { color: mb < 0.3 ? C.good : C.text, alpha: a, unit: 'MB' });
    // size bar
    const bx = 120, by = 1040, bw = 840;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = C.track; roundRect(ctx, bx, by, bw, 26, 13); ctx.fill();
    ctx.fillStyle = mb < 0.3 ? C.good : C.orange; roundRect(ctx, bx, by, Math.max(26, bw * mb / 1.2), 26, 13); ctx.fill();
    ['JPEG', 'WebP', 'AVIF'].forEach((f, i) => {
      const on = (i === 0 && t < tW) || (i === 1 && t >= tW && t < tAv) || (i === 2 && t >= tAv);
      text(ctx, f, bx + i * 150, by + 72, { font: FONT.mono(24, on ? 700 : 400), color: on ? C.orangeText : C.faint });
    });
    ctx.restore();
    hand(ctx, 'on a diet', 700, 480, t, tD + 0.05, { size: 54, color: C.orangeText, rot: -0.08 });
    const t85 = wordT(ch, 'eighty-five');
    if (t > t85) { stamp(ctx, '−85%', 800, 900, t, t85, C.good, { size: 58, rot: -0.12 }); }
    text(ctx, 'up to · Gcore image optimization', 960, 1000, { font: FONT.mono(17, 400), color: C.dim, align: 'right', alpha: prog(t, tL + 0.3, 0.3) });
    // loading bars
    const la = prog(t, tLe - 0.2, 0.3);
    if (la > 0) {
      const lp = clamp((t - tLe) / 0.6);
      [['before', 0.35, C.muted], ['after', 1, C.good]].forEach(([lab, sp, col], i) => {
        const y = 1170 + i * 60;
        text(ctx, lab, 120, y + 8, { font: FONT.mono(20, 500), color: C.dim, alpha: la });
        ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = C.track; roundRect(ctx, 260, y - 10, 700, 20, 10); ctx.fill();
        ctx.fillStyle = col; roundRect(ctx, 260, y - 10, Math.max(20, 700 * clamp(lp * sp * 1.6)), 20, 10); ctx.fill(); ctx.restore();
      });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.5], [cue(ch, 'diet'), 'pop'], [cue(ch, 'webp'), 'tap', 0.7], [wordT(ch, 'avif'), 'tap', 0.7],
    [wordT(ch, 'eighty-five'), 'stamp']],
};
function photo(ctx, x, y, w, h, t) {
  ctx.save(); roundRect(ctx, x, y, w, h, 14); ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, '#ff8a4c'); sky.addColorStop(0.55, '#ffcf8a'); sky.addColorStop(1, '#6a4a7a');
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  glowDot(ctx, x + w * 0.7, y + h * 0.38, 48, '#fff4d6', { glow: 1.6 });
  ctx.fillStyle = '#3a2852'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.62); ctx.lineTo(x + w * 0.22, y + h * 0.4); ctx.lineTo(x + w * 0.4, y + h * 0.6);
  ctx.lineTo(x + w * 0.6, y + h * 0.35); ctx.lineTo(x + w * 0.86, y + h * 0.62); ctx.lineTo(x + w, y + h * 0.5); ctx.lineTo(x + w, y + h); ctx.fill();
  ctx.fillStyle = '#1e1224'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.8); ctx.lineTo(x + w * 0.3, y + h * 0.7); ctx.lineTo(x + w * 0.55, y + h * 0.82);
  ctx.lineTo(x + w * 0.8, y + h * 0.68); ctx.lineTo(x + w, y + h * 0.78); ctx.lineTo(x + w, y + h); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = C.line; ctx.lineWidth = 2.6; roundRect(ctx, x, y, w, h, 14); ctx.stroke();
}

// ============ RUSH ============
const PLAYERS = (() => { const r = rng(77), o = []; for (let i = 0; i < 700; i++) { const h = POPS[Math.floor(r() * 160)]; o.push([h[0] + (r() - 0.5) * 14, h[1] + (r() - 0.5) * 9, r()]); } return o; })();
const RUSH_POPS = POPS.filter((_, i) => i % 5 === 0);
const rush = {
  draw(ctx, t, ch) {
    const tMi = cue(ch, 'million'), tMe = cue(ch, 'melt'), tSp = cue(ch, 'split'), tG = wordT(ch, 'gcore') - 0.2, tGm = cue(ch, 'gaming');
    // launcher card
    const la = life(t, ch.start - 0.2, tMi - 0.3);
    if (la > 0) {
      ctx.save(); popIn(ctx, t, ch.start - 0.2, 540, 760, 0.35, 0.85);
      card(ctx, 170, 520, 740, 480, { alpha: la });
      text(ctx, 'UPDATE AVAILABLE', 540, 610, { font: FONT.head(40, 900), color: C.text, align: 'center', alpha: la });
      text(ctx, 'patch 2.0 · new season', 540, 660, { font: FONT.mono(22, 500), color: C.dim, align: 'center', alpha: la });
      ctx.globalAlpha = la; ctx.fillStyle = C.orange; roundRect(ctx, 330, 720, 420, 96, 18); ctx.fill();
      text(ctx, 'DOWNLOAD', 540, 785, { font: FONT.head(38, 900), color: '#fff', align: 'center', halo: false });
      ctx.fillStyle = C.track; roundRect(ctx, 250, 890, 580, 16, 8); ctx.fill();
      text(ctx, '0%', 540, 950, { font: FONT.mono(20, 500), color: C.dim, align: 'center' });
      // cursor
      const cp = prog(t, ch.start + 0.4, 0.8, ease.inOut), cx = lerp(800, 600, cp), cy = lerp(980, 790, cp);
      ctx.fillStyle = C.text; ctx.strokeStyle = C.surface; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 42); ctx.lineTo(cx + 11, cy + 31); ctx.lineTo(cx + 30, cy + 31); ctx.closePath(); ctx.stroke(); ctx.fill();
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
      ctx.save(); ctx.globalAlpha = ap * 0.55; ctx.fillStyle = C.you; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (i % 4 === 0 && t > tMe - 0.3) {
        // line to the origin (melting), later to the nearest PoP
        let best = RUSH_POPS[0], bd = 1e9;
        for (const q of RUSH_POPS) { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; best = q; } }
        const [nx, ny] = pr(best);
        const tx = lerp(origin[0], nx, splitP), ty = lerp(origin[1], ny, splitP);
        ctx.save(); ctx.globalAlpha = ap * lerp(0.22, 0.45, splitP) * prog(t, tMe - 0.3, 0.4);
        ctx.strokeStyle = splitP > 0.5 ? C.you : C.red; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore();
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
      { color: st ? C.good : C.orangeText, alpha: prog(t, tMi, 0.3) * (1 - prog(t, tG - 0.3, 0.3)), size: 76 });
    if (st) text(ctx, 'neighborhood', 70, 455, { font: FONT.head(40, 900), color: C.good, alpha: prog(t, tSp + 0.3, 0.3) * (1 - prog(t, tG - 0.3, 0.3)) });
    // Gcore origin card: the G stood for gaming
    const ga = prog(t, tG - 0.2, 0.35);
    if (ga > 0) {
      textLayer.flush();
      ctx.save(); popIn(ctx, t, tG - 0.2, 540, 360, 0.35, 0.85);
      card(ctx, 70, 240, 940, 230, { alpha: ga });
      ctx.globalAlpha = ga; gcoreWordmark(ctx, 110, 275, 46);
      text(ctx, 'est. 2014 · Luxembourg', 110, 360, { font: FONT.mono(22, 500), color: C.dim });
      const gx = 110, gy = 440, gf = FONT.head(62, 900);
      text(ctx, 'G', gx, gy, { font: gf, color: C.orangeText, halo: false });
      text(ctx, typed('aming', t, tGm, 14), gx + measure(ctx, 'G', gf), gy, { font: gf, color: C.text, halo: false });
      ctx.restore();
      gamepad(ctx, 860, 370, 1.1, { t, alpha: prog(t, tGm - 0.1, 0.35) });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'pop'], [ch.start + 1.2, 'tap'], [cue(ch, 'million') - 0.3, 'whoosh', 0.6],
    [cue(ch, 'melt'), 'down'], [cue(ch, 'melt'), 'rumble', 0.5], [cue(ch, 'split'), 'whoosh', 0.6],
    [wordT(ch, 'gcore') - 0.4, 'pop'], [cue(ch, 'gaming') - 0.1, 'chime', 0.7]],
};
// game controller: gcore.com's own "Gaming" use-case icon (88 px gradient line icon), rasterised large
const GAMING_ICON = await svgImage('assets/icons/gaming.svg', 3);
function gamepad(ctx, x, y, s, { t = 0, alpha = 1 } = {}) {
  if (alpha <= 0) return;
  const size = 132 * s, bob = Math.sin(t * 2.4) * 3;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(GAMING_ICON, x - size / 2, y - size / 2 + bob, size, size); ctx.restore();
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
    labelTag(ctx, ok > 0 ? 'still online' : 'gaming host', T[0], T[1] - 140, { color: ok > 0 ? C.you : C.ink, alpha: prog(t, ch.start + 0.3, 0.3) });
    if (ok > 0) { ctx.save(); ctx.globalAlpha = ok; ctx.strokeStyle = C.you; ctx.lineWidth = 5; ctx.lineCap = 'round';
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
        ctx.save(); ctx.globalAlpha = fade * 0.9; ctx.globalCompositeOperation = C.glowOp; ctx.lineCap = 'round';
        ctx.strokeStyle = withA(C.red, 0.18); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.strokeStyle = C.red; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
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
      const x = 120, y = 1195, w = 840;
      text(ctx, 'Gcore network capacity · 200+ Tbps', x, y - 22, { font: FONT.mono(20, 500), color: C.dim, alpha: ba });
      ctx.save(); ctx.globalAlpha = ba; ctx.strokeStyle = C.orange; ctx.lineWidth = 3; roundRect(ctx, x, y, w, 34, 10); ctx.stroke();
      ctx.fillStyle = C.red; roundRect(ctx, x + 4, y + 4, Math.max(8, (w - 8) * 0.03 * prog(t, t2 + 0.4, 0.5)), 26, 6); ctx.fill(); ctx.restore();
      hand(ctx, 'the 6 Tbps attack', x + 40, y + 98, t, t2 + 0.7, { size: 50, color: C.red });
      if (t > t2 + 0.7) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 3; sketchPath(ctx, [[x + 28, y + 80], [x + 12, y + 44]], { seed: 6, draw: prog(t, t2 + 0.7, 0.25) }); arrowHead(ctx, x + 12, y + 44, Math.atan2(-36, -16), 12); ctx.restore(); }
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.6], [wordT(ch, 'botnet'), 'rumble', 0.7], [cue(ch, 't6'), 'swell'],
    [cue(ch, 't200'), 'whoosh', 0.6], [cue(ch, 'absorb') + 0.2, 'chime', 0.8]],
};

// ============ RESULT ============
const result = {
  draw(ctx, t, ch) {
    const tS = cue(ch, 'slow'), tF = cue(ch, 'fast'), tT = cue(ch, 'there'), tBl = wordT(ch, 'blank') - 0.3;
    const ca = prog(t, ch.start - 0.1, 0.35);
    sectionHead(ctx, t, ch.start - 0.1, '11', 'one round trip from Frankfurt', { y: 300 });
    card(ctx, 70, 340, 940, 170, { alpha: ca });
    text(ctx, 'without CDN · to San Jose', 100, 405, { font: FONT.mono(24, 500), color: C.ink, alpha: ca });
    text(ctx, '≈150 ms', 980, 405, { font: FONT.mono(26, 700), color: C.dim, align: 'right', alpha: prog(t, tS, 0.3) });
    text(ctx, 'with Gcore · average', 100, 465, { font: FONT.mono(24, 500), color: C.ink, alpha: ca });
    text(ctx, '≈30 ms', 980, 465, { font: FONT.mono(26, 700), color: C.good, align: 'right', alpha: prog(t, tF, 0.3) });
    // bars
    const x0 = 120, maxW = 700;
    [[tS, 150, C.muted, 'no CDN'], [tF, 30, C.good, 'Gcore']].forEach(([t0, ms, col, lab], i) => {
      const y = 620 + i * 130, p = prog(t, t0, 0.5, ease.out);
      if (p <= 0) return;
      text(ctx, lab, x0, y - 18, { font: FONT.mono(22, 500), color: C.dim, alpha: p });
      ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = col; roundRect(ctx, x0, y, Math.max(16, maxW * (ms / 150) * p), 44, 12); ctx.fill(); ctx.restore();
      text(ctx, `${Math.round(ms * p)} ms`, x0 + Math.max(16, maxW * (ms / 150) * p) + 18, y + 34, { font: FONT.head(34, 900), color: col, alpha: p });
    });
    hand(ctx, '≈ 5× faster', 600, 790, t, tF + 0.9, { size: 52, color: C.good, rot: -0.06 });
    // two browsers
    const ba = prog(t, tBl, 0.35);
    if (ba > 0) {
      browser(ctx, 80, 900, 440, 380, { alpha: ba, spinner: 1, t, url: 'no CDN', seed: 25 });
      browser(ctx, 560, 900, 440, 380, { alpha: ba, spinner: 1 - prog(t, tT - 0.1, 0.1), loaded: prog(t, tT - 0.1, 0.15), t, url: 'with Gcore', seed: 26 });
      if (t > tT) stamp(ctx, 'LOADED', 780, 1110, t, tT + 0.05, C.good, { size: 34, rot: -0.1 });
    }
  },
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.6], [cue(ch, 'slow'), 'tap'], [cue(ch, 'fast'), 'tap'],
    [wordT(ch, 'blank') - 0.3, 'pop', 0.8], [cue(ch, 'there') - 0.05, 'chime']],
};

// ============ OUTRO ============
const outro = {
  draw(ctx, t, ch) {
    const t0 = ch.start - 0.2, tF = cue(ch, 'follow');
    ctx.save(); const a = popIn(ctx, t, t0, 540, 560, 0.45, 0.4);
    ctx.globalAlpha = a; ctx.strokeStyle = C.line; ctx.lineWidth = 3;
    gcoreAvatar(ctx, 540, 560, 130); sCircle(ctx, 540, 560, 142, { seed: 7, draw: prog(t, t0 + 0.1, 0.6) });
    ctx.restore();
    const ha = prog(t, tF - 0.05, 0.35);
    text(ctx, HANDLE.toUpperCase(), 540, 820 + (1 - ha) * 20, { font: FONT.head(66, 900), color: C.text, align: 'center', alpha: ha });
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
  sfx: ch => [[ch.start - 0.2, 'whoosh', 0.8], [ch.start - 0.1, 'pop'], [cue(ch, 'follow'), 'swell', 0.7]],
};

export const SCENES = { hook, distance, light, handshake, patience, edge, routing, cache, weight, rush, shield, result, outro };
