// 05–10 — WHAT IT DOES
// One bar per tool family (two for the reel breakdown), cut on the downbeat,
// in the website's style. Left: eyebrow, headline with the green highlighter,
// a body line and the MCP tool the agent calls; right: the product moment,
// whipped in from the right.
import { W, H, BEAT, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { SLIDES, drawSlide } from "./slides.js";
import { jb, card, cover, circleImg, pop, typed, measure, it, head, body, eyebrow, hpCard, iconTile, measureInter, tight, playTri } from "../engine/ui.js";

const B = BEAT;
const LX = 120; // headline column
const VX = 1010; // product column

// the tool call, as an agent's log line: mono in a pill with a live dot
function toolPill(ctx, str, x, y, { bg, fg, dot = HP.green }) {
  const size = 22, h = 50, pad = 20;
  const w = measure(ctx, str, { size, w: 500, family: "JetBrains Mono" }) + 2 * pad + 24;
  card(ctx, x, y - h / 2, w, h, { r: h / 2, fill: bg });
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(x + pad + 6, y, 6, 0, TAU);
  ctx.fill();
  jb(ctx, str, x + pad + 24, y + 8, { size, color: fg });
}

function frame(ctx, lt, { bg, fg = HP.ink, sub = HP.muted, kicker, kickerColor, tool, tool2, t2 = 0, lines, line2, maxW = 790, toolBg = HP.ink, toolFg = "#fff", markInk = HP.ink }) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const pk = seg(lt, 0.02, 0.3);
  if (pk > 0) {
    ctx.save();
    ctx.globalAlpha = pk;
    eyebrow(ctx, kicker, LX, 262, { size: 20, w: 600, color: kickerColor || sub });
    ctx.restore();
  }
  const hd = head(ctx, lt, lines, LX, 296, { size: 112, color: fg, markInk, t0: 0.04, stagger: 0.08, maxW, markAt: 0.26 });
  const by = 296 + hd.h + 58;
  body(ctx, lt, line2, LX, by, { size: 38, color: sub, t0: 0.34 });
  // the tool call types itself out; a second call retypes the pill at t2
  const [str, pt] = tool2 && lt >= t2 ? [tool2, seg(lt, t2, t2 + 0.4)] : [tool, seg(lt, 0.55, 0.95)];
  if (pt > 0) toolPill(ctx, typed(str, pt) + (pt < 1 ? "▍" : ""), LX, by + 92, { bg: toolBg, fg: toolFg });
}

const slideIn = (lt, d = 0.34) => (1 - curves.snap(seg(lt, 0, d))) * 760;
const blurIn = (lt) => (lt < 0.3 ? { samples: 2.5 } : null);

// ── PLAYBOOKS ───────────────────────────────────────────────────────────────
// the app's own lucide icons for each area
const BOOKS = [
  ["Strategy", "A plan from your arena", "l-layout-dashboard"],
  ["Discovery", "Find the accounts to beat", "l-lightbulb"],
  ["Voice pack", "Write like you", "l-mic"],
  ["Remix", "Proven posts, your script", "l-repeat"],
  ["Carousel", "Slides that stay editable", "l-gallery-horizontal-end"],
  ["Reel editing", "Cut and caption on your computer", "l-clapperboard"],
];
export const playbooks = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: HP.paper, kicker: "Knowledge tools · free", tool: "get_playbook(\"strategy\")",
      lines: ["The playbooks,", "[built in.]"], line2: "How the best creators work.",
    });
    const dx = slideIn(lt);
    BOOKS.forEach(([t, s, ic], i) => {
      const p = pop(lt, 0.08 + i * 0.07, 260, 19);
      if (p <= 0) return;
      // the deck fans out, then settles into a tidy grid
      const fan = curves.snap(seg(lt, 0.7, 1.3));
      const x = VX + dx + 40 + i * 20 + fan * (i % 2) * 380 - fan * i * 20;
      const y = 150 + i * lerp(30, 0, fan) + fan * Math.floor(i / 2) * 270 + (1 - p) * 200;
      const rot = lerp((i - 2.5) * 0.05, 0, fan);
      ctx.save();
      ctx.translate(x + 170, y + 120);
      ctx.rotate(rot);
      hpCard(ctx, -170, -120, 350, 240, { r: 24, shadow: 0.35 });
      iconTile(ctx, env, ic, -114, -64, 64, { r: 0.28 });
      eyebrow(ctx, "Playbook", -146, 14, { size: 14, w: 600 });
      it(ctx, t, -146, 60, { size: 38, w: 600, color: HP.ink, ls: tight(38) });
      it(ctx, s, -146, 96, { size: 19, w: 400, color: HP.muted });
      ctx.restore();
    });
    // "Free" lands on beat 3, a green pill like the site's highlights
    const ps = pop(lt, 2 * B, 520, 22);
    if (ps > 0) {
      ctx.save();
      ctx.translate(1728, 900);
      ctx.rotate(-0.1);
      ctx.scale(lerp(2.2, 1, clamp(ps)), lerp(2.2, 1, clamp(ps)));
      ctx.globalAlpha = clamp(ps * 2);
      card(ctx, -120, -50, 240, 100, { r: 50, fill: HP.green, shadow: 0.3 });
      it(ctx, "Free", 0, 20, { size: 56, w: 600, color: HP.ink, align: 0.5, ls: tight(56) });
      ctx.restore();
    }
  },
};

// ── LOOKUPS ─────────────────────────────────────────────────────────────────
// @mosseri as get_instagram_account and get_instagram_post returned him on
// 2026-10-27: his six most-viewed recent reels (the top one is the Rings film
// he shares with @design), against his median reel
const fmt = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(Math.round(n));
const comma = (n) => Math.round(n).toLocaleString("en-US");
const GRID = ["mo1", "mo2", "mo3", "mo4", "mo5", "mo6"];
const VIEWS = [22902836, 10032447, 9243966, 9191598, 7830437, 6668849];
const MEDIAN = 9212768;
export const lookup = {
  hud: () => "light",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: HP.blue, fg: "#fff", sub: "rgba(255,255,255,.82)", kicker: "Instagram lookups", tool: "get_instagram_account(\"@mosseri\")",
      lines: ["Look up", "[any account.]"], line2: "And what works for them.", toolBg: "#fff", toolFg: HP.ink,
    });
    const dx = slideIn(lt);
    const x = VX + dx, y = 120;
    hpCard(ctx, x, y, 790, 840, { r: 30, shadow: 0.9, stroke: null });
    circleImg(ctx, env.images["mo-avatar"], x + 96, y + 100, 54);
    ctx.strokeStyle = HP.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 96, y + 100, 56, 0, TAU);
    ctx.stroke();
    const hw = it(ctx, "@mosseri", x + 178, y + 92, { size: 36, w: 600, color: HP.ink, ls: tight(36) });
    // the verified tick
    const vx = x + 178 + hw + 20, vy = y + 80;
    ctx.fillStyle = HP.blue;
    ctx.beginPath();
    ctx.arc(vx, vy, 14, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(vx - 6, vy + 0.5);
    ctx.lineTo(vx - 1.5, vy + 5);
    ctx.lineTo(vx + 6.5, vy - 4.5);
    ctx.stroke();
    it(ctx, "Adam Mosseri · head of Instagram", x + 178, y + 130, { size: 21, w: 400, color: HP.muted });
    const k = ease.outCubic(seg(lt, 0.25, 1.1));
    const stats = [["Followers", fmt(4248662 * k)], ["Posts", comma(1385 * k)], ["Median reel views", fmt(MEDIAN * k)]];
    stats.forEach(([l, v], i) => {
      it(ctx, v, x + 50 + i * 240, y + 232, { size: 44, w: 600, color: HP.ink, ls: tight(44) });
      it(ctx, l, x + 50 + i * 240, y + 266, { size: 18, w: 500, color: HP.soft });
    });
    const cw = 226, ch = 246, gx = x + 38, gy = y + 300;
    GRID.forEach((n, i) => {
      const p = pop(lt, 0.3 + i * 0.07, 380, 24);
      if (p <= 0) return;
      const cx = gx + (i % 3) * (cw + 10), cy = gy + Math.floor(i / 3) * (ch + 10);
      ctx.save();
      ctx.translate(cx + cw / 2, cy + ch / 2);
      ctx.scale(clamp(p, 0, 1.2), clamp(p, 0, 1.2));
      cover(ctx, env.images[n], -cw / 2, -ch / 2, cw, ch, 12, { ay: 0.3 });
      // views land on beat 3; the top reel is called out against his median
      const pr = pop(lt, 2 * B + i * 0.05, 420, 24);
      if (pr > 0) {
        const top = i === 0;
        const label = fmt(VIEWS[i]);
        const vw = measureInter(ctx, label, { size: 20, w: 600 }) + 50;
        ctx.globalAlpha = clamp(pr);
        card(ctx, -cw / 2 + 10, ch / 2 - 50, vw, 38, { r: 19, fill: top ? HP.green : "rgba(10,10,10,.72)" });
        playTri(ctx, -cw / 2 + 25, ch / 2 - 31, 12, top ? HP.ink : "#fff");
        it(ctx, label, -cw / 2 + 44, ch / 2 - 24, { size: 20, w: 600, color: top ? HP.ink : "#fff" });
      }
      ctx.restore();
    });
    const po = pop(lt, 2.6 * B, 380, 20);
    if (po > 0) {
      ctx.save();
      ctx.translate(gx + 14, gy + 14);
      ctx.scale(clamp(po, 0, 1.15), clamp(po, 0, 1.15));
      hpCard(ctx, 0, 0, 198, 44, { r: 22, fill: HP.ink, stroke: null, shadow: 0.4 });
      it(ctx, `${(VIEWS[0] / MEDIAN).toFixed(1)}× his median`, 99, 29, { size: 19, w: 600, color: "#fff", align: 0.5 });
      ctx.restore();
    }
  },
};

// ── WATCH ───────────────────────────────────────────────────────────────────
// @askcatgpt's "How to start using AI agents" (DWHXyMhgicK, 2.6M views),
// playing from its hook, and what watch_video read in it on 2026-10-27; in bar
// 2 the agent turns that format into a scripted card for you (create_card).
const ROWS = [
  ["Hook · 0:00", "“How to start using AI agents”", "Title on screen, straight to camera"],
  ["Structure", "Hook, compare, demo, 3 rules, CTA", null],
  ["Why it works", "Three rules make a big idea easy", "A real example proves it first"],
];
// the beats watch_video found, as [label, start s], for the strip
const BEATS = [["Hook", 0], ["Compare", 6], ["Demo", 16], ["3 rules", 51], ["CTA", 108]];
const CAT_LEN = 120;
const T_REMIX = 4 * B;
export const watch = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: HP.paper, kicker: "Reel breakdowns", tool: "watch_video(\"DWHXyMhgicK\")", tool2: "create_card(remix)", t2: T_REMIX,
      lines: ["Watch and remix", "[any reel.]"], line2: "Its hook and beats, then yours.", maxW: 690,
    });
    const dx = slideIn(lt);
    // the reel, playing, with a scan line reading it
    const x = 880 + dx, y = 196, rw = 340, rh = 604;
    card(ctx, x - 10, y - 10, rw + 20, rh + 20, { r: 40, fill: HP.ink, shadow: 0.6 });
    cover(ctx, env.clip("cat", lt * 30) || env.images.c0, x, y, rw, rh, 32);
    const sp = seg(lt, 0.2, 1.7);
    if (sp > 0 && sp < 1) {
      const sy = y + rh * sp;
      const g = ctx.createLinearGradient(0, sy - 90, 0, sy);
      g.addColorStop(0, alpha(HP.green, 0));
      g.addColorStop(1, alpha(HP.green, 0.6));
      ctx.fillStyle = g;
      ctx.fillRect(x, sy - 90, rw, 90);
      ctx.fillStyle = HP.blue;
      ctx.fillRect(x, sy - 2, rw, 4);
    }
    // playhead under the phone
    const prog = clamp(lt / 3.75);
    card(ctx, x, y + rh + 34, rw, 6, { r: 3, fill: HP.line });
    card(ctx, x, y + rh + 34, rw * (0.02 + 0.1 * prog), 6, { r: 3, fill: HP.blue });
    it(ctx, "@askcatgpt · 0:0" + Math.floor(lt) + " / 2:00 · 2.6M views", x, y + rh + 78, { size: 20, w: 500, color: HP.soft });

    // the breakdown card, typed out row by row
    const bx = x + rw + 50, by = 150, bw = 1800 - bx;
    const pc = pop(lt, 0.25, 260, 22);
    if (pc <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(pc * 2);
    ctx.translate(0, (1 - clamp(pc)) * 40);
    hpCard(ctx, bx, by, bw, 780, { r: 28, shadow: 0.4 });
    ROWS.forEach(([l, v, s], i) => {
      const t0 = 0.45 + i * B * 1.2;
      const p = seg(lt, t0, t0 + 0.5);
      if (p <= 0) return;
      const ry = by + 64 + i * 172;
      eyebrow(ctx, l, bx + 40, ry, { size: 16, w: 600, color: i === 0 ? HP.blue : HP.soft });
      it(ctx, typed(v, p), bx + 40, ry + 44, { size: 26, w: 600, color: HP.ink, ls: -0.6 });
      if (s) it(ctx, s, bx + 40, ry + 80, { size: 21, w: 400, color: HP.muted });
      if (i === 1) {
        // one frame per beat, widths by how long each runs
        const sw = bw - 80, gap = 5;
        let sx = bx + 40;
        BEATS.forEach(([lab, t], k) => {
          const end = k < BEATS.length - 1 ? BEATS[k + 1][1] : CAT_LEN;
          const tw = Math.max(46, ((end - t) / CAT_LEN) * (sw - gap * 4 - 46 * 2.2));
          const q = pop(lt, t0 + 0.15 + k * 0.06, 420, 24);
          if (q > 0) {
            ctx.save();
            ctx.translate(sx + tw / 2, ry + 54 + 30);
            ctx.scale(clamp(q, 0, 1.15), clamp(q, 0, 1.15));
            cover(ctx, env.images["c" + k], -tw / 2, -30, tw, 60, 7, { ay: 0.35 });
            ctx.restore();
          }
          sx += tw + gap;
        });
      }
      ctx.fillStyle = HP.line;
      ctx.fillRect(bx + 40, ry + 122, bw - 80, 1.5);
    });
    // bar 2: the remix, written for you, lands as a card from the board
    const pr = pop(lt, T_REMIX + 0.1, 300, 20);
    if (pr > 0) {
      const ry = by + 64 + 3 * 172 - 18, rx = bx + 24, rww = bw - 48, rhh = 200;
      ctx.save();
      ctx.translate(rx + rww / 2, ry + rhh / 2);
      ctx.scale(clamp(pr, 0, 1.08), clamp(pr, 0, 1.08));
      ctx.translate(-rww / 2, -rhh / 2);
      hpCard(ctx, 0, 0, rww, rhh, { r: 20, fill: HP.sagePanel, stroke: null, shadow: 0.3 });
      card(ctx, 16, 18, 112, 34, { r: 17, fill: HP.green });
      it(ctx, "Remix", 72, 42, { size: 18, w: 600, color: HP.ink, align: 0.5 });
      eyebrow(ctx, "Scripted for you · Idea", 144, 41, { size: 14, w: 600 });
      const pt = seg(lt, T_REMIX + 0.3, T_REMIX + 1.1);
      it(ctx, typed("“How to start using AI in your job search”", pt), 16, 100, { size: 23, w: 600, color: HP.ink, ls: -0.5 });
      if (lt > T_REMIX + 1.0) {
        ctx.globalAlpha = clamp((lt - T_REMIX - 1.0) / 0.3);
        it(ctx, "Same hook, demo and 3 rules, in your voice", 16, 138, { size: 20, w: 400, color: HP.muted });
        it(ctx, "Board · Idea → Pre-production", 16, 176, { size: 17, w: 500, color: HP.greenDeep });
      }
      ctx.restore();
    }
    ctx.restore();
  },
};

// ── PLAN ────────────────────────────────────────────────────────────────────
const KINDS = [["Reel", HP.blue, "#fff"], ["Carousel", HP.green, HP.ink], ["Story", HP.ink, "#fff"]];
const PLAN_DAYS = [1, 3, 4, 7, 9, 11, 14, 15, 17, 18, 21, 23, 24, 26, 28, 30];
export const plan = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt) {
    frame(ctx, lt, {
      bg: HP.skyPanel, kicker: "Content plans", kickerColor: HP.blue, tool: "save_content_plan(month)",
      lines: ["A plan from", "[your numbers.]"], line2: "On your calendar.",
    });
    const dx = slideIn(lt);
    const x = VX + dx, y = 130, w = 790, h = 820;
    hpCard(ctx, x, y, w, h, { r: 30, shadow: 0.4 });
    it(ctx, "November", x + 44, y + 80, { size: 40, w: 600, color: HP.ink, ls: tight(40) });
    KINDS.forEach(([k, c], i) => {
      card(ctx, x + 410 + i * 128, y + 56, 18, 18, { r: 5, fill: c });
      it(ctx, k, x + 436 + i * 128, y + 72, { size: 19, w: 500, color: HP.muted });
    });
    const cw = (w - 88) / 7, chh = 128, gx = x + 44, gy = y + 140;
    ["M", "T", "W", "T", "F", "S", "S"].forEach((d, i) => eyebrow(ctx, d, gx + i * cw + 12, gy, { size: 15, w: 600 }));
    for (let d = 1; d <= 35; d++) {
      const c = (d - 1) % 7, r = Math.floor((d - 1) / 7);
      const cx = gx + c * cw, cy = gy + 20 + r * chh;
      ctx.strokeStyle = HP.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      rrect(ctx, cx + 3, cy, cw - 6, chh - 8, 12);
      ctx.stroke();
      if (d <= 30) it(ctx, String(d), cx + 16, cy + 30, { size: 18, w: 500, color: HP.soft });
    }
    // posts land on the days, in a wave that runs with the beat
    PLAN_DAYS.forEach((d, i) => {
      const t0 = 0.3 + i * 0.065;
      const p = pop(lt, t0, 420, 22);
      if (p <= 0) return;
      const c = (d - 1) % 7, r = Math.floor((d - 1) / 7);
      const cx = gx + c * cw, cy = gy + 20 + r * chh;
      const [k, col, ink] = KINDS[(d * 7) % 3];
      const yy = cy + 50 + (1 - clamp(p)) * -60;
      ctx.save();
      ctx.globalAlpha = clamp(p * 2);
      card(ctx, cx + 9, yy, cw - 18, 50, { r: 10, fill: col });
      it(ctx, k, cx + cw / 2, yy + 31, { size: 14, w: 600, color: ink, align: 0.5 });
      ctx.restore();
    });
  },
};

// ── CAROUSELS ───────────────────────────────────────────────────────────────
// five creators, five styles (src/scenes/slides.js)
export const carousel = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: HP.paper, kicker: "Carousels", tool: "create_carousel(style, slides)",
      lines: ["Carousels", "you can [edit.]"], line2: "Every word stays yours.",
    });
    const dx = slideIn(lt);
    const sw = 340, sh = 425;
    ctx.save();
    ctx.beginPath();
    ctx.rect(VX - 30, 0, W, H);
    ctx.clip();
    // the deck slides along one slide per beat
    const step = Math.min(3, Math.floor(lt / B)) + curves.swift(clamp((lt % B) / 0.22)) - 1;
    const scroll = Math.max(0, step);
    SLIDES.forEach((_, i) => {
      const p = pop(lt, 0.05 + i * 0.05, 300, 22);
      if (p <= 0) return;
      const off = i - scroll;
      const x = VX + 40 + dx + off * (sw + 30);
      const y = 290 + (1 - clamp(p)) * 120 + Math.abs(off) * 18;
      const s = lerp(1, 0.9, clamp(Math.abs(off)));
      ctx.save();
      ctx.translate(x + sw / 2, y + sh / 2);
      ctx.scale(s, s);
      hpCard(ctx, -sw / 2 - 6, -sh / 2 - 6, sw + 12, sh + 12, { r: 20, shadow: 0.5 });
      ctx.beginPath();
      rrect(ctx, -sw / 2, -sh / 2, sw, sh, 14);
      ctx.clip();
      drawSlide(ctx, env, i, -sw / 2, -sh / 2, sw);
      ctx.restore();
    });
    // the editing caret: a selection box on the headline of the slide in view
    const pe = seg(lt, 2.2 * B, 2.6 * B);
    if (pe > 0) {
      const k = sw / 1080, [ex, ey, ew, eh] = SLIDES[Math.round(scroll)].edit;
      const x = VX + 40 + dx + (Math.round(scroll) - scroll) * (sw + 30) + ex * k;
      const y = 290 + ey * k;
      ctx.save();
      ctx.globalAlpha = clamp(pe * 2);
      ctx.strokeStyle = HP.blue;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      rrect(ctx, x, y, ew * k, eh * k * curves.snap(pe), 6);
      ctx.stroke();
      ctx.setLineDash([]);
      const lw = measureInter(ctx, "Edit text", { size: 17, w: 600 }) + 28;
      card(ctx, x, y - 40, lw, 34, { r: 17, fill: HP.blue });
      it(ctx, "Edit text", x + 14, y - 17, { size: 17, w: 600, color: "#fff" });
      ctx.restore();
    }
    ctx.restore();
    // slide counter
    it(ctx, `${String(Math.round(scroll) + 1).padStart(2, "0")} / 05`, VX + 40 + dx, 800, { size: 22, w: 600, color: HP.ink });
  },
};

// ── BOARD ───────────────────────────────────────────────────────────────────
const COLS = ["Idea", "Pre-production", "Production", "Post", "Ready", "Published"];
export const board = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: HP.sagePanel, kicker: "Production board", tool: "update_card(ready_to_publish)",
      lines: ["Idea to", "[published.]"], line2: "One board, on a calendar.",
    });
    const dx = slideIn(lt);
    const x = VX - 20 + dx, y = 140, cw = 136, gap = 10;
    COLS.forEach((c, i) => {
      const cx = x + i * (cw + gap);
      card(ctx, cx, y, cw, 800, { r: 18, fill: "rgba(255,255,255,.6)", stroke: HP.line });
      it(ctx, c, cx + 14, y + 38, { size: 16, w: 600, color: HP.ink });
      // resting cards
      for (let k = 0; k < 3 - (i % 2); k++) {
        const ky = y + 64 + k * 112 + (i === 4 ? 112 : 0);
        hpCard(ctx, cx + 10, ky, cw - 20, 96, { r: 12, shadow: 0 });
        ctx.fillStyle = HP.line;
        ctx.fillRect(cx + 22, ky + 24, cw - 60, 10);
        ctx.fillRect(cx + 22, ky + 44, cw - 80, 10);
        ctx.fillStyle = [HP.blue, HP.green, HP.ink][(i + k) % 3];
        ctx.fillRect(cx + 22, ky + 68, 28, 8);
      }
    });
    // the edited reel's card hops column to column on each beat, lands in Ready
    const hops = clamp(lt / B, 0, 4);
    const k = Math.floor(hops), f = curves.swift(clamp((hops - k) / 0.45));
    const col = Math.min(4, k + f);
    const cx = x + col * (cw + gap) + 6, cy = y + 64 - Math.sin(Math.PI * f) * 60 * (k < 4 ? 1 : 0);
    const reel = env.clip("after", 100) || env.images.rs1;
    card(ctx, cx, cy, cw - 12, 104, { r: 12, fill: HP.ink, shadow: 0.8 });
    cover(ctx, reel, cx + 8, cy + 8, 50, 88, 8);
    it(ctx, "Effects", cx + 66, cy + 40, { size: 16, w: 600, color: "#fff" });
    it(ctx, "reel", cx + 66, cy + 60, { size: 16, w: 600, color: "#fff" });
    const pr = seg(lt, 3.6 * B, 3.9 * B);
    if (pr > 0) {
      card(ctx, cx + 64, cy + 72, 56, 24, { r: 12, fill: HP.green });
      it(ctx, "Nov 4", cx + 92, cy + 89, { size: 13, w: 600, color: HP.ink, align: 0.5 });
    }
  },
};
