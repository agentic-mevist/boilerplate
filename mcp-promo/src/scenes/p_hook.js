// 01 — HOOK
// "Give your Instagram" rises word by word on the beat and the Instagram mark
// pops in after it; an Instagram profile draws itself under the line (outline
// first, then the avatar, numbers, buttons and the grid). On the downbeat of
// bar 2 the profile steps aside, "AI superpowers." lands with the site's green
// highlighter and the product's pieces float out around it like the website's
// hero. On the last beat everything is pulled into the HandlePilot mark.
import { W, H, BEAT, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { it, tight, measureInter, markRect, hpCard, iconTile, eyebrow, logo, pop, sparkle, playTri, card, icon } from "../engine/ui.js";
import { drawSlide } from "./slides.js";

const B = BEAT;
const SIZE = 160;
const L1 = ["Give", "your", "Instagram"];
const L2 = "AI superpowers.";
const W_T = [0.02, 0.5 * B, B]; // word entrances, bar 1
const T_L2 = 4 * B; // bar 2 downbeat
const T_OUT = 7 * B; // pulled into the mark
const LS = tight(SIZE);

// the Instagram mark after line 1
const IG = 124, IG_GAP = 34, T_IG = 1.5 * B;
// the profile: drawn under line 1 in bar 1, then parked bottom right
const PW = 780, PH = 500, PX = W / 2, PY = 446 + PH / 2;
const P_TO = [1655, 842, 0.5, 0.045]; // cx, cy, scale, rotation once it steps aside
const T_DRAW = 1.7 * B;
// floaters: [kind, x, y, w, h, enter, extra]
const FLOAT = [
  ["chart", 560, 150, 340, 166, 4.75 * B],
  ["tile", 1240, 176, 110, 110, 5.0 * B, "l-lightbulb"],
  ["grow", 1560, 168, 300, 124, 5.12 * B],
  ["tile", 120, 520, 96, 96, 5.25 * B, "l-gallery-horizontal-end"],
  ["slide", 156, 690, 190, 238, 5.35 * B, 3],
  ["cal", 1020, 800, 330, 186, 5.45 * B],
  ["tile", 700, 858, 100, 100, 5.65 * B, "l-clapperboard"],
  ["tile", 1716, 548, 92, 92, 5.85 * B, "l-mic"],
];

function chart(ctx, w, h, lt) {
  eyebrow(ctx, "Top reel", 26, 40, { size: 15, color: HP.soft, w: 600 });
  const k = ease.outCubic(seg(lt, 5.0 * B, 6.6 * B));
  it(ctx, (22.1 * k).toFixed(1) + "K views", 26, 82, { size: 30, w: 600, color: HP.ink, ls: tight(30) * 0.5 });
  // a rising line, green under blue, as on the site
  const pts = [0.1, 0.18, 0.14, 0.3, 0.26, 0.48, 0.44, 0.7, 0.92];
  const x0 = 26, y0 = h - 22, cw = w - 52, ch = 56;
  const n = Math.max(2, Math.ceil(pts.length * clamp(k * 1.2)));
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 0; i < n; i++) ctx.lineTo(x0 + (i / (pts.length - 1)) * cw, y0 - pts[i] * ch);
  ctx.lineTo(x0 + ((n - 1) / (pts.length - 1)) * cw, y0);
  ctx.closePath();
  ctx.fillStyle = alpha(HP.green, 0.6);
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) ctx[i ? "lineTo" : "moveTo"](x0 + (i / (pts.length - 1)) * cw, y0 - pts[i] * ch);
  ctx.strokeStyle = HP.blue;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function cal(ctx, w, h, lt) {
  eyebrow(ctx, "November", 24, 38, { size: 15, color: HP.soft, w: 600 });
  const cw = (w - 48) / 7;
  for (let d = 0; d < 14; d++) {
    const c = d % 7, r = Math.floor(d / 7);
    const x = 24 + c * cw, y = 58 + r * 58;
    ctx.strokeStyle = HP.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    rrect(ctx, x + 2, y, cw - 4, 50, 8);
    ctx.stroke();
    if ([1, 3, 4, 8, 10, 12].includes(d)) {
      const p = pop(lt, 5.8 * B + d * 0.03, 420, 22);
      if (p > 0) {
        ctx.fillStyle = d % 3 === 0 ? HP.green : HP.blue;
        ctx.beginPath();
        rrect(ctx, x + 7, y + 28 - 10 * clamp(p), cw - 14, 16, 5);
        ctx.fill();
      }
    }
  }
}

// the Instagram app mark, drawn (gradient square, camera outline)
function igMark(ctx, cx, cy, s) {
  const x = cx - s / 2, y = cy - s / 2;
  const g = ctx.createRadialGradient(x + 0.3 * s, y + 1.08 * s, 0, x + 0.3 * s, y + 1.08 * s, 1.35 * s);
  g.addColorStop(0, "#fdf497");
  g.addColorStop(0.08, "#fdf497");
  g.addColorStop(0.45, "#fd5949");
  g.addColorStop(0.62, "#d6249f");
  g.addColorStop(0.92, "#285aeb");
  ctx.fillStyle = g;
  ctx.beginPath();
  rrect(ctx, x, y, s, s, 0.26 * s);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 0.085 * s;
  ctx.beginPath();
  rrect(ctx, x + 0.2 * s, y + 0.2 * s, 0.6 * s, 0.6 * s, 0.18 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 0.15 * s, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + 0.69 * s, y + 0.31 * s, 0.045 * s, 0, TAU);
  ctx.fill();
}

function grow(ctx, w, h, lt, env) {
  eyebrow(ctx, "This month", 24, 40, { size: 15, color: HP.soft, w: 600 });
  const k = ease.outCubic(seg(lt, 5.2 * B, 6.6 * B));
  const nw = it(ctx, "+" + Math.round(1240 * k).toLocaleString("en-US"), 24, 90, { size: 34, w: 600, color: HP.ink, ls: tight(34) * 0.5 });
  it(ctx, "followers", 24 + nw + 8, 90, { size: 17, w: 500, color: HP.muted });
  iconTile(ctx, env, "l-trending-up", w - 50, h / 2, 56, { fill: HP.green, tint: "ink" });
}

// an Instagram profile (the web layout), drawing itself in: outline, card,
// avatar ring, handle, buttons, numbers, bio, tabs, then the grid
const TILES = [
  [HP.markSky, "l-play", "12.4K"],
  [HP.markSun, "l-gallery-horizontal-end", null],
  [HP.markPeach, "l-play", "8.1K"],
  [HP.green, "l-gallery-horizontal-end", null],
  [HP.skyPanel, "l-play", null],
  [HP.markSun, "l-play", null],
];
function profile(ctx, lt, env) {
  const t0 = T_DRAW;
  const w = PW, h = PH;
  // the outline draws around, then the card fills in under it
  const pO = seg(lt, t0, t0 + 0.42);
  const pF = curves.glide(seg(lt, t0 + 0.26, t0 + 0.52));
  if (pF > 0) {
    ctx.save();
    ctx.globalAlpha *= pF;
    hpCard(ctx, 0, 0, w, h, { r: 26, shadow: 0.45 });
    ctx.restore();
  }
  if (pO > 0 && pF < 1) {
    const per = 2 * (w + h);
    ctx.save();
    ctx.globalAlpha *= 1 - pF;
    ctx.strokeStyle = HP.blue;
    ctx.lineWidth = 3;
    ctx.setLineDash([per * curves.glide(pO), per]);
    ctx.beginPath();
    rrect(ctx, 0, 0, w, h, 26);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // avatar: the story ring draws round, the face pops inside
  const ax = 132, ay = 108, ar = 66;
  const pr = curves.glide(seg(lt, t0 + 0.32, t0 + 0.72));
  if (pr > 0) {
    const g = ctx.createLinearGradient(ax - ar, ay + ar, ax + ar, ay - ar);
    g.addColorStop(0, "#feda75");
    g.addColorStop(0.35, "#fa7e1e");
    g.addColorStop(0.65, "#d62976");
    g.addColorStop(1, "#4f5bd5");
    ctx.strokeStyle = g;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(ax, ay, ar + 8, -Math.PI / 2, -Math.PI / 2 + TAU * pr);
    ctx.stroke();
  }
  const pa = pop(lt, t0 + 0.4, 340, 20);
  if (pa > 0) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(clamp(pa, 0, 1.15), clamp(pa, 0, 1.15));
    ctx.fillStyle = HP.skyPanel;
    ctx.beginPath();
    ctx.arc(0, 0, ar, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = alpha(HP.blue, 0.55);
    ctx.beginPath();
    ctx.arc(0, -14, 24, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 52, 42, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  // handle and buttons
  const rx = 248;
  const ph = seg(lt, t0 + 0.42, t0 + 0.66);
  const hs = { size: 30, w: 600, color: HP.ink, ls: tight(30) * 0.6 };
  if (ph > 0) it(ctx, "yourhandle", rx, 76, hs);
  const bx0 = rx + measureInter(ctx, "yourhandle", hs) + 22;
  [["Follow", HP.blue, "#fff", bx0], ["Message", "#efefef", HP.ink, bx0 + 136]].forEach(([l, bg, fg, bx], i) => {
    const pb = pop(lt, t0 + 0.52 + i * 0.06, 360, 20);
    if (pb <= 0) return;
    ctx.save();
    ctx.translate(bx + 60, 66);
    ctx.scale(clamp(pb, 0, 1.12), clamp(pb, 0, 1.12));
    card(ctx, -60, -20, 120, 40, { r: 10, fill: bg });
    it(ctx, l, 0, 7, { size: 18, w: 600, color: fg, align: 0.5 });
    ctx.restore();
  });
  // the numbers count up
  const k = ease.outCubic(seg(lt, t0 + 0.55, t0 + 1.05));
  if (k > 0) {
    [["posts", Math.round(248 * k).toString(), 0], ["followers", (12.4 * k).toFixed(1) + "K", 150], ["following", Math.round(318 * k).toString(), 330]].forEach(([l, v, dx]) => {
      const vw = it(ctx, v, rx + dx, 128, { size: 21, w: 600, color: HP.ink });
      it(ctx, l, rx + dx + vw + 7, 128, { size: 21, w: 400, color: HP.ink });
    });
  }
  // name and bio, as bars that grow
  const pn = curves.glide(seg(lt, t0 + 0.6, t0 + 0.9));
  if (pn > 0) {
    it(ctx, "Your Name", rx, 168, { size: 18, w: 600, color: HP.ink });
    ctx.fillStyle = "#e9e9e9";
    for (const [y, bw] of [[184, 330], [204, 240]]) {
      ctx.beginPath();
      rrect(ctx, rx, y, bw * pn, 10, 5);
      ctx.fill();
    }
  }
  // tabs hairline
  const pt = curves.glide(seg(lt, t0 + 0.68, t0 + 0.95));
  if (pt > 0) {
    ctx.fillStyle = HP.line;
    ctx.fillRect(28, 236, (w - 56) * pt, 1.5);
    ctx.fillStyle = HP.ink;
    ctx.fillRect(w / 2 - 40, 235, 80 * pt, 3);
  }
  // the grid, a tile at a time (the second row peeks under the card's edge)
  ctx.save();
  ctx.beginPath();
  rrect(ctx, 0, 0, w, h, 26);
  ctx.clip();
  const gx = 28, gy = 252, tw = (w - 56 - 16) / 3, th = 196;
  TILES.forEach(([c, ic, views], i) => {
    const p = pop(lt, t0 + 0.72 + i * 0.06, 360, 21);
    if (p <= 0) return;
    const x = gx + (i % 3) * (tw + 8), y = gy + Math.floor(i / 3) * (th + 8);
    ctx.save();
    ctx.translate(x + tw / 2, y + th / 2);
    ctx.scale(clamp(p, 0, 1.1), clamp(p, 0, 1.1));
    const g = ctx.createLinearGradient(-tw / 2, -th / 2, tw / 2, th / 2);
    g.addColorStop(0, c);
    g.addColorStop(1, alpha(c, 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    rrect(ctx, -tw / 2, -th / 2, tw, th, 8);
    ctx.fill();
    icon(ctx, env, ic, 0, -6, 54, "white");
    icon(ctx, env, ic === "l-play" ? "l-clapperboard" : "l-gallery-horizontal-end", tw / 2 - 22, -th / 2 + 22, 22, "white");
    if (views) {
      playTri(ctx, -tw / 2 + 16, th / 2 - 20, 11, "#fff");
      it(ctx, views, -tw / 2 + 32, th / 2 - 13, { size: 18, w: 600, color: "#fff" });
    }
    ctx.restore();
  });
  ctx.restore();
}

export default {
  hud: () => "dark",
  blur: (lt) => (lt > T_OUT ? { samples: 2.5 } : null),
  render(ctx, lt, env) {
    ctx.fillStyle = HP.paper;
    ctx.fillRect(0, 0, W, H);
    // two soft panels drifting behind, the site's sky and sage
    const drift = lt * 18;
    for (const [x, y, r, c] of [[420 + drift, 330, 520, HP.skyPanel], [1500 - drift, 760, 560, HP.sagePanel]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, alpha(c, 0.95));
      g.addColorStop(1, alpha(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    const pOut = ease.inCubic(seg(lt, T_OUT, T_OUT + 0.4));
    // everything is pulled into the centre on the last beat
    const pull = 1 - 0.75 * pOut;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    const push = 1 + 0.035 * (lt / (8 * B));
    ctx.scale(push * pull, push * pull);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = 1 - seg(pOut, 0.4, 0.9);

    // line 1 sits centred in bar 1, then moves up to make room for line 2
    const up = curves.snap(seg(lt, T_L2 - 0.12, T_L2 + 0.3));
    const base1 = lerp(372, 492, up), base2 = 492 + SIZE * 1.08;
    // the profile, under line 1 in bar 1; on the downbeat it steps aside
    const pc = curves.snap(seg(lt, T_L2 - 0.18, T_L2 + 0.34));
    if (lt >= T_DRAW) {
      const [tx, ty, ts, tr] = P_TO;
      const bob = Math.sin(lt * 2 + 1.3) * 6 * pc;
      ctx.save();
      ctx.translate(lerp(PX, tx, pc), lerp(PY, ty, pc) + bob);
      ctx.rotate(tr * pc);
      ctx.scale(lerp(1, ts, pc), lerp(1, ts, pc));
      ctx.translate(-PW / 2, -PH / 2);
      profile(ctx, lt, env);
      ctx.restore();
    }

    // the product's pieces float in around the line
    FLOAT.forEach(([kind, fx, fy, fw, fh, t0, extra], i) => {
      const p = pop(lt, t0, 260, 17);
      if (p <= 0) return;
      const bob = Math.sin(lt * 2.2 + i * 1.7) * 7;
      // they burst out from behind the mark
      const ox = lerp(W / 2, fx + fw / 2, clamp(p)), oy = lerp(base2 - SIZE * 0.4, fy + fh / 2, clamp(p)) + bob;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate([-0.04, 0.06, 0.05, -0.05, -0.06, 0.03, -0.07, 0.05][i] * clamp(p));
      ctx.scale(clamp(p, 0, 1.15), clamp(p, 0, 1.15));
      ctx.translate(-fw / 2, -fh / 2);
      if (kind === "tile") iconTile(ctx, env, extra, fw / 2, fh / 2, fw, { fill: HP.white, stroke: HP.line });
      else {
        hpCard(ctx, 0, 0, fw, fh, { r: kind === "slide" ? 14 : 20, shadow: 0.35 });
        if (kind === "chart") chart(ctx, fw, fh, lt);
        if (kind === "cal") cal(ctx, fw, fh, lt);
        if (kind === "grow") grow(ctx, fw, fh, lt, env);
        if (kind === "slide") {
          ctx.save();
          ctx.beginPath();
          rrect(ctx, 6, 6, fw - 12, fh - 12, 10);
          ctx.clip();
          drawSlide(ctx, env, extra, 6, 6, fw - 12);
          ctx.restore();
        }
      }
      ctx.restore();
    });
    // line 2's highlighter goes down before any words, so the descenders of
    // "Instagram" and "your" stay on top of it
    const w2f = measureInter(ctx, L2, { size: SIZE, w: 600, ls: LS });
    const x2 = W / 2 - w2f / 2;
    const p2 = curves.snap(seg(lt, T_L2, T_L2 + 0.4));
    const pm = curves.glide(seg(lt, T_L2 + 0.22, T_L2 + 0.62));
    if (p2 > 0) markRect(ctx, x2, base2, w2f, SIZE, pm);

    // the words, over the pieces, and the Instagram mark after them
    const tw1 = measureInter(ctx, L1.join(" "), { size: SIZE, w: 600, ls: LS });
    const space = measureInter(ctx, " ", { size: SIZE, w: 600, ls: LS });
    let x = W / 2 - (tw1 + IG_GAP + IG) / 2;
    L1.forEach((word, i) => {
      const ww = measureInter(ctx, word, { size: SIZE, w: 600, ls: LS });
      const p = curves.snap(seg(lt, W_T[i], W_T[i] + 0.4));
      if (p > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 20, base1 - SIZE * 1.02, ww + 40, SIZE * 1.3);
        ctx.clip();
        it(ctx, word, x, base1 + (1 - p) * SIZE * 1.05, { size: SIZE, w: 600, color: HP.ink, ls: LS });
        ctx.restore();
      }
      x += ww + space;
    });
    const pi = pop(lt, T_IG, 320, 16);
    if (pi > 0) {
      ctx.save();
      ctx.translate(x - space + IG_GAP + IG / 2, base1 - SIZE * 0.36);
      ctx.rotate((1 - clamp(pi)) * -0.5);
      ctx.scale(clamp(pi, 0, 1.2), clamp(pi, 0, 1.2));
      ctx.shadowColor = "rgba(214,36,159,.28)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 12;
      igMark(ctx, 0, 0, IG);
      ctx.restore();
    }

    // line 2: rises on the downbeat, then the highlighter sweeps under it
    if (p2 > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, base2 - SIZE * 1.02, W, SIZE * 1.32);
      ctx.clip();
      it(ctx, L2, x2, base2 + (1 - p2) * SIZE * 1.05, { size: SIZE, w: 600, color: HP.ink, ls: LS });
      ctx.restore();
      // sparkles off the end of the mark, twinkling on the beat
      for (const [dx, dy, r, k] of [[w2f + 40, -SIZE * 0.95, 30, 0], [w2f + 92, -SIZE * 0.6, 16, 1], [-56, -SIZE * 0.1, 20, 2]]) {
        const ps = pop(lt, T_L2 + 0.5 + k * 0.12, 380, 16);
        if (ps <= 0) continue;
        const tw = 1 + 0.18 * Math.exp(-((lt % B) / 0.1));
        sparkle(ctx, x2 + dx, base2 + dy, r * clamp(ps, 0, 1.3) * tw, k === 1 ? HP.greenDeep : HP.blue, lt * 0.6);
      }
    }

    ctx.restore();

    // the mark arrives at the centre as everything is pulled into it
    const pl = spring(lt - T_OUT - 0.12, { k: 260, c: 18 });
    if (pl > 0) {
      ctx.save();
      ctx.shadowColor = alpha(HP.blue, 0.35);
      ctx.shadowBlur = 60;
      logo(ctx, env, W / 2, H / 2 + 20, 70 * pl, (1 - clamp(pl)) * -2.4);
      ctx.restore();
    }
  },
};
