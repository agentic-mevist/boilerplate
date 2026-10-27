// 05–10 — WHAT IT DOES
// One bar per tool family (two for the reel breakdown), cut on the downbeat,
// in the website's style. Left: eyebrow, headline with the green highlighter,
// a body line and the MCP tool the agent calls; right: the product moment,
// whipped in from the right.
import { W, H, BEAT, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, TAU, alpha } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
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

function frame(ctx, lt, { bg, fg = HP.ink, sub = HP.muted, kicker, kickerColor, tool, lines, line2, toolBg = HP.ink, toolFg = "#fff", markInk = HP.ink }) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const pk = seg(lt, 0.02, 0.3);
  if (pk > 0) {
    ctx.save();
    ctx.globalAlpha = pk;
    eyebrow(ctx, kicker, LX, 262, { size: 20, w: 600, color: kickerColor || sub });
    ctx.restore();
  }
  const hd = head(ctx, lt, lines, LX, 296, { size: 112, color: fg, markInk, t0: 0.04, stagger: 0.08, maxW: 790, markAt: 0.26 });
  const by = 296 + hd.h + 58;
  body(ctx, lt, line2, LX, by, { size: 38, color: sub, t0: 0.34 });
  const pt = seg(lt, 0.55, 0.95);
  if (pt > 0) toolPill(ctx, typed(tool, pt) + (pt < 1 ? "▍" : ""), LX, by + 92, { bg: toolBg, fg: toolFg });
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
// @lotosinbloom as get_instagram_account returned it on 2026-10-27
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(Math.round(n)));
const comma = (n) => Math.round(n).toLocaleString("en-US");
const GRID = ["d1", "d2", "d3", "d4", "d5", "d6"];
const VIEWS = [22087, 3856, 2360, 2180, 1024, 715];
const MEDIAN = 1024;
export const lookup = {
  hud: () => "light",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: HP.blue, fg: "#fff", sub: "rgba(255,255,255,.82)", kicker: "Instagram lookups", tool: "get_instagram_account(\"@lotosinbloom\")",
      lines: ["Look up", "[any account.]"], line2: "And what works for them.", toolBg: "#fff", toolFg: HP.ink,
    });
    const dx = slideIn(lt);
    const x = VX + dx, y = 120;
    hpCard(ctx, x, y, 790, 840, { r: 30, shadow: 0.9, stroke: null });
    circleImg(ctx, env.images.d5, x + 96, y + 100, 54);
    ctx.strokeStyle = HP.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 96, y + 100, 56, 0, TAU);
    ctx.stroke();
    it(ctx, "@lotosinbloom", x + 178, y + 92, { size: 36, w: 600, color: HP.ink, ls: tight(36) });
    it(ctx, "Daria · psychology and meditation for women", x + 178, y + 130, { size: 21, w: 400, color: HP.muted });
    const k = ease.outCubic(seg(lt, 0.25, 1.1));
    const stats = [["Followers", comma(5086 * k)], ["Posts", comma(2925 * k)], ["Median reel views", comma(MEDIAN * k)]];
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
      // views land on beat 3; the top reel is called out against her median
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
      it(ctx, `${Math.round(VIEWS[0] / MEDIAN)}× her median`, 99, 29, { size: 19, w: 600, color: "#fff", align: 0.5 });
      ctx.restore();
    }
  },
};

// ── WATCH ───────────────────────────────────────────────────────────────────
// Daria's montage from the landing page, playing from her run, and what
// watch_video reads in it: the hook on screen, its 13 shots, why it holds.
const ROWS = [
  ["Hook · 0:00", "“The real reason for my productivity”", "text on screen over a gym selfie"],
  ["Structure", "13 shots, about a second each", null],
  ["Pace", "A new place every second", "gym, run, beach, yoga, ride"],
  ["Why it works", "The hook asks, the montage answers", "she moves, every single day."],
];
export const watch = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: HP.paper, kicker: "Reel breakdowns", tool: "watch_video(reel)",
      lines: ["Watch", "[any reel.]"], line2: "Every shot, hook and beat.",
    });
    const dx = slideIn(lt);
    // the reel, playing, with a scan line reading it
    const x = 880 + dx, y = 196, rw = 340, rh = 604;
    card(ctx, x - 10, y - 10, rw + 20, rh + 20, { r: 40, fill: HP.ink, shadow: 0.6 });
    cover(ctx, env.clip("run", lt * 30) || env.images.rs3, x, y, rw, rh, 32);
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
    card(ctx, x, y + rh + 34, rw * (0.07 + 0.26 * prog), 6, { r: 3, fill: HP.blue });
    it(ctx, "@lotosinbloom · 0:" + String(1 + Math.floor(lt)).padStart(2, "0") + " / 0:14", x, y + rh + 78, { size: 20, w: 500, color: HP.soft });

    // the breakdown card, typed out row by row
    const bx = x + rw + 50, by = 150, bw = 1800 - bx;
    const pc = pop(lt, 0.25, 260, 22);
    if (pc <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(pc * 2);
    ctx.translate(0, (1 - clamp(pc)) * 40);
    hpCard(ctx, bx, by, bw, 780, { r: 28, shadow: 0.4 });
    ROWS.forEach(([l, v, s], i) => {
      const t0 = 0.45 + i * B * 1.5;
      const p = seg(lt, t0, t0 + 0.55);
      if (p <= 0) return;
      const ry = by + 64 + i * 182;
      eyebrow(ctx, l, bx + 40, ry, { size: 16, w: 600, color: i === 0 ? HP.blue : HP.soft });
      it(ctx, typed(v, p), bx + 40, ry + 44, { size: 27, w: 600, color: HP.ink, ls: -0.6 });
      if (s) it(ctx, s, bx + 40, ry + 80, { size: 21, w: 400, color: HP.muted });
      if (i === 1) {
        // the 13 shots as a strip, cut by cut
        for (let k = 0; k < 13; k++) {
          const q = pop(lt, t0 + 0.15 + k * 0.035, 420, 24);
          if (q <= 0) continue;
          const tw = 30, th = 54, sx = bx + 40 + k * (tw + 4);
          ctx.save();
          ctx.translate(sx + tw / 2, ry + 64 + th / 2);
          ctx.scale(clamp(q, 0, 1.15), clamp(q, 0, 1.15));
          cover(ctx, env.images["m" + String(k).padStart(2, "0")], -tw / 2, -th / 2, tw, th, 5);
          ctx.restore();
        }
      }
      if (i < ROWS.length - 1) {
        ctx.fillStyle = HP.line;
        ctx.fillRect(bx + 40, ry + 128, bw - 80, 1.5);
      }
    });
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
const SLIDES = ["noticed-0", "offline-3", "weekend-0", "noticed-3", "offline-4"];
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
    SLIDES.forEach((n, i) => {
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
      cover(ctx, env.images[n], -sw / 2, -sh / 2, sw, sh, 14);
      ctx.restore();
    });
    // the editing caret: a selection box on the headline of the slide in view
    const pe = seg(lt, 2.2 * B, 2.6 * B);
    if (pe > 0) {
      const x = VX + 40 + dx + (Math.round(scroll) - scroll) * (sw + 30);
      ctx.save();
      ctx.globalAlpha = clamp(pe * 2);
      ctx.strokeStyle = HP.blue;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      rrect(ctx, x + 18, 290 + 56, sw - 36, 120 * curves.snap(pe), 6);
      ctx.stroke();
      ctx.setLineDash([]);
      const lw = measureInter(ctx, "Edit text", { size: 17, w: 600 }) + 28;
      card(ctx, x + 18, 290 + 21, lw, 34, { r: 17, fill: HP.blue });
      it(ctx, "Edit text", x + 32, 290 + 44, { size: 17, w: 600, color: "#fff" });
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
