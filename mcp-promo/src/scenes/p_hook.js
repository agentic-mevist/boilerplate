// 01 — HOOK
// "Give your Instagram" rises word by word on the beat; on the downbeat of bar
// 2 "AI superpowers." lands with the site's green highlighter, and the
// product's pieces float out around it like the website's hero. On the last
// beat everything is pulled into the HandlePilot mark, which the hub takes over.
import { W, H, BEAT, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { it, tight, measureInter, markRect, hpCard, iconTile, eyebrow, cover, logo, pop, sparkle, playTri } from "../engine/ui.js";

const B = BEAT;
const SIZE = 160;
const L1 = ["Give", "your", "Instagram"];
const L2 = "AI superpowers.";
const W_T = [0.02, 0.5 * B, B]; // word entrances, bar 1
const T_L2 = 4 * B; // bar 2 downbeat
const T_OUT = 7 * B; // pulled into the mark
const LS = tight(SIZE);

// your Instagram: four of @lotosinbloom's reels, a row in bar 1 that scatters
// to the corners on the downbeat of bar 2 (cx, cy, rotation, views)
// (h1, h3: frames of DVItk47j6_U and DXOAil_PRLM between subtitles; h4: a
// frame of DdjNxHYzEto with its caption box removed; d5: her own cover)
const COVERS = [
  ["h1", 196, 272, -0.07, "1.1K"],
  ["d5", 1724, 272, 0.06, "1K"],
  ["h3", 236, 826, 0.05, "712"],
  ["h4", 1684, 820, -0.05, "695"],
];
const CW = 176, CH = 313, CS = 0.64;
// floaters: [kind, x, y, w, h, enter, extra]
const FLOAT = [
  ["chart", 560, 150, 340, 166, 4.75 * B],
  ["tile", 1240, 176, 110, 110, 5.0 * B, "l-lightbulb"],
  ["tile", 120, 548, 96, 96, 5.25 * B, "l-gallery-horizontal-end"],
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
    // the reels: rise in as a row under line 1, then scatter on the downbeat
    const pc = curves.snap(seg(lt, T_L2 - 0.1, T_L2 + 0.42));
    COVERS.forEach(([img, tx, ty, rot, views], i) => {
      const p = pop(lt, 1.45 * B + i * 0.07, 300, 21);
      if (p <= 0) return;
      const rx = W / 2 + (i - 1.5) * (CW + 26), ry = base1 + 80 + CH / 2 + (1 - clamp(p)) * 160;
      const bob = Math.sin(lt * 2 + i * 2.1) * 6 * pc;
      const cx = lerp(rx, tx, pc), cy = lerp(ry, ty, pc) + bob;
      const sc = lerp(1, CS, pc) * lerp(0.9, 1, clamp(p));
      ctx.save();
      ctx.globalAlpha *= clamp(p * 2);
      ctx.translate(cx, cy);
      ctx.rotate(rot * pc);
      ctx.scale(sc, sc);
      hpCard(ctx, -CW / 2 - 7, -CH / 2 - 7, CW + 14, CH + 14, { r: 22, shadow: 0.45 });
      cover(ctx, env.images[img], -CW / 2, -CH / 2, CW, CH, 16);
      // its views, real numbers from the lookup
      const pv = pop(lt, T_L2 + 0.35 + i * 0.08, 420, 20);
      if (pv > 0) {
        const vw = measureInter(ctx, views, { size: 26, w: 600 }) + 62;
        ctx.save();
        ctx.translate(-CW / 2 + 14, CH / 2 - 60);
        ctx.scale(clamp(pv, 0, 1.2), clamp(pv, 0, 1.2));
        hpCard(ctx, 0, 0, vw, 46, { r: 23, fill: i === 0 ? HP.green : HP.white, stroke: i === 0 ? null : HP.line, shadow: 0.2 });
        playTri(ctx, 18, 23, 15, HP.ink);
        it(ctx, views, 42, 32, { size: 26, w: 600, color: HP.ink });
        ctx.restore();
      }
      ctx.restore();
    });

    // the product's pieces float in around the line
    FLOAT.forEach(([kind, fx, fy, fw, fh, t0, extra], i) => {
      const p = pop(lt, t0, 260, 17);
      if (p <= 0) return;
      const bob = Math.sin(lt * 2.2 + i * 1.7) * 7;
      // they burst out from behind the mark
      const ox = lerp(W / 2, fx + fw / 2, clamp(p)), oy = lerp(base2 - SIZE * 0.4, fy + fh / 2, clamp(p)) + bob;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate([-0.04, 0.06, -0.05, 0.03, -0.07, 0.05][i] * clamp(p));
      ctx.scale(clamp(p, 0, 1.15), clamp(p, 0, 1.15));
      ctx.translate(-fw / 2, -fh / 2);
      if (kind === "tile") iconTile(ctx, env, extra, fw / 2, fh / 2, fw, { fill: HP.white, stroke: HP.line });
      else {
        hpCard(ctx, 0, 0, fw, fh, { r: kind === "slide" ? 14 : 20, shadow: 0.35 });
        if (kind === "chart") chart(ctx, fw, fh, lt);
        if (kind === "cal") cal(ctx, fw, fh, lt);
        if (kind === "slide") cover(ctx, env.images[extra], 6, 6, fw - 12, fh - 12, 10);
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

    // the words, over the pieces
    const full = measureInter(ctx, L1.join(" "), { size: SIZE, w: 600, ls: LS });
    const space = measureInter(ctx, " ", { size: SIZE, w: 600, ls: LS });
    let x = W / 2 - full / 2;
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
    // a caret waits at the end of the line through beats 3–4
    if (lt > 1.4 * B && lt < T_L2 && Math.floor(lt / (B / 2)) % 2 === 0) {
      ctx.fillStyle = HP.blue;
      ctx.fillRect(W / 2 + full / 2 + 22, base1 - SIZE * 0.72, 9, SIZE * 0.86);
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
