// 07–12 — WHAT IT DOES
// One bar per tool family, cut on the downbeat. Left: the headline rises in;
// right: the product moment, whipped in from the right. Each one names the
// MCP tool the agent calls.
import { W, H, BEAT, BAR, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha, mix, hash } from "../engine/math.js";
import { rrect } from "../engine/draw.js";
import { sg, jb, card, cover, circleImg, pop, typed, pill, riseLines, serifLine, measure } from "../engine/ui.js";

const B = BEAT;
const LX = 120; // headline column
const VX = 1010; // product column

function frame(ctx, lt, { bg, fg, kicker, tool, lines, serif, toolBg, toolFg }) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // kicker + headline + serif sub
  const pk = seg(lt, 0.02, 0.3);
  if (pk > 0) {
    ctx.save();
    ctx.globalAlpha = pk;
    jb(ctx, kicker, LX, 250, { size: 20, w: 600, color: fg, ls: 3 });
    ctx.restore();
  }
  const h = riseLines(ctx, lt, lines, LX, 290, { size: 118, color: fg, t0: 0.04, stagger: 0.08, wdth: 92, maxW: 800 });
  serifLine(ctx, lt, serif, LX, 290 + h + 78, { size: 64, color: fg, t0: 0.38 });
  // the tool call, typed out like an agent's log line
  const pt = seg(lt, 0.55, 0.95);
  if (pt > 0) pill(ctx, typed(tool, pt) + (pt < 1 ? "▍" : ""), LX, 290 + h + 170, { size: 22, bg: toolBg, fg: toolFg, h: 48, pad: 18, dot: PAL.lime });
}

const slideIn = (lt, d = 0.34) => (1 - curves.snap(seg(lt, 0, d))) * 760;
const blurIn = (lt) => (lt < 0.3 ? { samples: 2.5 } : null);

// ── PLAYBOOKS ───────────────────────────────────────────────────────────────
const BOOKS = [
  ["Strategy", "A plan from your arena", PAL.cobalt],
  ["Discovery", "Find the accounts to beat", PAL.orange],
  ["Voice pack", "Write like you", PAL.pink],
  ["Remix", "Proven posts, your script", PAL.lime],
  ["Carousel", "Slides that stay editable", PAL.yellow],
  ["Reel editing", "Cut and caption on your machine", PAL.teal],
];
export const playbooks = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt) {
    frame(ctx, lt, {
      bg: PAL.paper, fg: PAL.ink, kicker: "KNOWLEDGE TOOLS · FREE", tool: "get_playbook(\"strategy\")",
      lines: ["THE PLAYBOOKS,", "BUILT IN."], serif: "how the best creators work", toolBg: PAL.ink, toolFg: PAL.paper,
    });
    const dx = slideIn(lt);
    BOOKS.forEach(([t, s, c], i) => {
      const p = pop(lt, 0.08 + i * 0.07, 260, 19);
      if (p <= 0) return;
      // the deck fans out, then settles into a tidy staircase
      const fan = curves.snap(seg(lt, 0.7, 1.3));
      const x = VX + dx + 40 + i * 20 + fan * (i % 2) * 380 - fan * i * 20;
      const y = 150 + i * (lerp(30, 0, fan)) + fan * Math.floor(i / 2) * 270 + (1 - p) * 200;
      const rot = lerp((i - 2.5) * 0.05, 0, fan);
      ctx.save();
      ctx.translate(x + 170, y + 120);
      ctx.rotate(rot);
      card(ctx, -170, -120, 350, 240, { r: 22, fill: "#fff", shadow: 0.6 });
      ctx.fillStyle = c;
      ctx.beginPath();
      rrect(ctx, -146, -96, 56, 56, 14);
      ctx.fill();
      jb(ctx, "PLAYBOOK", -146, 6, { size: 15, w: 600, color: PAL.mute, ls: 2 });
      sg(ctx, t, -146, 52, { size: 38, w: 700, color: PAL.ink });
      sg(ctx, s, -146, 88, { size: 19, w: 400, color: "#565D66" });
      ctx.restore();
    });
    // FREE stamp lands on beat 3
    const ps = pop(lt, 2 * B, 520, 22);
    if (ps > 0) {
      ctx.save();
      ctx.translate(1700, 870);
      ctx.rotate(-0.12);
      ctx.scale(lerp(2.2, 1, clamp(ps)), lerp(2.2, 1, clamp(ps)));
      ctx.globalAlpha = clamp(ps * 2);
      card(ctx, -120, -50, 240, 100, { r: 50, fill: PAL.lime });
      sg(ctx, "FREE", 0, 20, { size: 54, w: 700, color: PAL.ink, align: 0.5 });
      ctx.restore();
    }
  },
};

// ── LOOKUPS ─────────────────────────────────────────────────────────────────
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.round(n)));
const GRID = ["lisbon-tram", "cafe-journal", "lisbon-tiles", "surf-morning", "film-camera", "orange-flower"];
const VIEWS = [184000, 42000, 96000, 311000, 27000, 58000];
export const lookup = {
  hud: () => "light",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: PAL.cobalt, fg: PAL.paper, kicker: "INSTAGRAM LOOKUPS", tool: "get_instagram_account(\"@lisbon.mornings\")",
      lines: ["LOOK UP", "ANY ACCOUNT."], serif: "and what works for them", toolBg: PAL.paper, toolFg: PAL.ink,
    });
    const dx = slideIn(lt);
    const x = VX + dx, y = 130;
    card(ctx, x, y, 780, 820, { r: 30, fill: "#fff", shadow: 0.8 });
    circleImg(ctx, env.images["city-shadows"], x + 100, y + 105, 58);
    sg(ctx, "@lisbon.mornings", x + 186, y + 96, { size: 36, w: 700, color: PAL.ink });
    sg(ctx, "Slow travel · Lisbon · film photos", x + 186, y + 134, { size: 21, w: 400, color: "#565D66" });
    const k = ease.outCubic(seg(lt, 0.25, 1.1));
    const stats = [["Followers", fmt(48200 * k)], ["Posts", String(Math.round(312 * k))], ["Avg views", fmt(21400 * k)]];
    stats.forEach(([l, v], i) => {
      sg(ctx, v, x + 52 + i * 240, y + 232, { size: 46, w: 700, color: PAL.ink });
      sg(ctx, l, x + 52 + i * 240, y + 266, { size: 19, w: 500, color: PAL.mute });
    });
    const cw = 222, ch = 236, gx = x + 42, gy = y + 300;
    GRID.forEach((n, i) => {
      const p = pop(lt, 0.3 + i * 0.07, 380, 24);
      if (p <= 0) return;
      const cx = gx + (i % 3) * (cw + 10), cy = gy + Math.floor(i / 3) * (ch + 10);
      ctx.save();
      ctx.translate(cx + cw / 2, cy + ch / 2);
      ctx.scale(clamp(p, 0, 1.2), clamp(p, 0, 1.2));
      cover(ctx, env.images[n], -cw / 2, -ch / 2, cw, ch, 10);
      // top performers get ranked on beat 3
      const rank = [1, 4, 2, 0, 5, 3][i];
      const pr = pop(lt, 2 * B + rank * 0.06, 420, 24);
      if (pr > 0) {
        const top = rank < 2;
        ctx.globalAlpha = clamp(pr);
        card(ctx, -cw / 2 + 10, ch / 2 - 50, 120, 38, { r: 19, fill: top ? PAL.lime : "rgba(17,19,24,.78)" });
        sg(ctx, "▶ " + fmt(VIEWS[i]), -cw / 2 + 24, ch / 2 - 24, { size: 19, w: 700, color: top ? PAL.ink : "#fff" });
      }
      ctx.restore();
    });
  },
};

// ── WATCH ───────────────────────────────────────────────────────────────────
const ROWS = [
  ["HOOK", "“Nobody tells you this about Lisbon.”"],
  ["STRUCTURE", "Hook · 3 quick tips · the reveal · ask"],
  ["MUSIC", "Lo-fi, cut on every tip"],
  ["WHY IT WORKS", "Curiosity gap, payoff in 7 s"],
];
export const watch = {
  hud: () => "light",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: PAL.ink, fg: PAL.paper, kicker: "REEL BREAKDOWNS", tool: "watch_video(reel)",
      lines: ["WATCH", "ANY REEL."], serif: "every scene, hook and beat", toolBg: PAL.paper, toolFg: PAL.ink,
    });
    const dx = slideIn(lt);
    const x = VX + dx, y = 130;
    // the reel, playing (slow push), with a scan line reading it
    const rw = 300, rh = 534;
    card(ctx, x - 8, y - 8, rw + 16, rh + 16, { r: 30, fill: "#2A2D35" });
    cover(ctx, env.images.rs3, x, y, rw, rh, 24, { zoom: 1 + 0.08 * lt });
    const sp = seg(lt, 0.2, 1.6);
    if (sp > 0 && sp < 1) {
      const sy = y + rh * sp;
      const g = ctx.createLinearGradient(0, sy - 80, 0, sy);
      g.addColorStop(0, alpha(PAL.lime, 0));
      g.addColorStop(1, alpha(PAL.lime, 0.45));
      ctx.fillStyle = g;
      ctx.fillRect(x, sy - 80, rw, 80);
      ctx.fillStyle = PAL.lime;
      ctx.fillRect(x, sy - 2, rw, 3);
    }
    // scene strip under the reel
    const cols = [PAL.orange, PAL.cobalt, PAL.yellow, PAL.pink, PAL.lime];
    let sx = x;
    [0.22, 0.18, 0.26, 0.2, 0.14].forEach((wf, i) => {
      const p = seg(lt, 0.3 + i * 0.1, 0.5 + i * 0.1);
      const w = rw * wf;
      ctx.fillStyle = cols[i];
      ctx.fillRect(sx, y + rh + 30, (w - 4) * curves.snap(p), 16);
      sx += w;
    });
    jb(ctx, "SCENES 5 · 0:21", x, y + rh + 80, { size: 17, color: PAL.mute });
    // the breakdown, typed out row by row
    const bx = x + rw + 50;
    ROWS.forEach(([l, v], i) => {
      const t0 = 0.35 + i * B * 0.75;
      const p = seg(lt, t0, t0 + 0.5);
      if (p <= 0) return;
      const ry = y + 30 + i * 140;
      ctx.save();
      ctx.globalAlpha = clamp(p * 3);
      jb(ctx, l, bx, ry, { size: 17, w: 700, color: PAL.lime, ls: 2 });
      ctx.restore();
      const words = v;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, ry + 10, 420, 120);
      ctx.clip();
      wrap(ctx, typed(words, p), bx, ry + 46, 400, 32, { size: 27, w: 500, color: PAL.paper });
      ctx.restore();
    });
  },
};
function wrap(ctx, str, x, y, maxW, lh, o) {
  const words = str.split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (measure(ctx, test, o) > maxW && line) {
      sg(ctx, line, x, yy, o);
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) sg(ctx, line, x, yy, o);
}

// ── PLAN ────────────────────────────────────────────────────────────────────
const KINDS = [["Reel", PAL.orange], ["Carousel", PAL.cobalt], ["Story", PAL.pink]];
const PLAN_DAYS = [1, 3, 4, 7, 9, 11, 14, 15, 17, 18, 21, 23, 24, 26, 28, 30];
export const plan = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt) {
    frame(ctx, lt, {
      bg: PAL.yellow, fg: PAL.ink, kicker: "CONTENT PLANS", tool: "save_content_plan(month)",
      lines: ["A PLAN FROM", "YOUR NUMBERS."], serif: "on your calendar", toolBg: PAL.ink, toolFg: PAL.paper,
    });
    const dx = slideIn(lt);
    const x = VX + dx, y = 130, w = 790, h = 820;
    card(ctx, x, y, w, h, { r: 30, fill: "#fff", shadow: 0.6 });
    sg(ctx, "November", x + 44, y + 80, { size: 40, w: 700, color: PAL.ink });
    KINDS.forEach(([k, c], i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + 420 + i * 125, y + 66, 8, 0, TAU);
      ctx.fill();
      sg(ctx, k, x + 436 + i * 125, y + 73, { size: 19, w: 500, color: "#565D66" });
    });
    const cw = (w - 88) / 7, chh = 128, gx = x + 44, gy = y + 140;
    ["M", "T", "W", "T", "F", "S", "S"].forEach((d, i) => jb(ctx, d, gx + i * cw + 10, gy, { size: 16, color: PAL.mute }));
    for (let d = 1; d <= 35; d++) {
      const c = (d - 1) % 7, r = Math.floor((d - 1) / 7);
      const cx = gx + c * cw, cy = gy + 20 + r * chh;
      ctx.strokeStyle = "rgba(17,19,24,.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      rrect(ctx, cx + 3, cy, cw - 6, chh - 8, 10);
      ctx.stroke();
      if (d <= 30) sg(ctx, String(d), cx + 14, cy + 30, { size: 18, w: 500, color: "#565D66" });
    }
    // posts land on the days, in a wave that runs with the beat
    PLAN_DAYS.forEach((d, i) => {
      const t0 = 0.3 + i * 0.065;
      const p = pop(lt, t0, 420, 22);
      if (p <= 0) return;
      const c = (d - 1) % 7, r = Math.floor((d - 1) / 7);
      const cx = gx + c * cw, cy = gy + 20 + r * chh;
      const [k, col] = KINDS[(d * 7) % 3];
      const yy = cy + 50 + (1 - clamp(p)) * -60;
      ctx.save();
      ctx.globalAlpha = clamp(p * 2);
      card(ctx, cx + 9, yy, cw - 18, 50, { r: 10, fill: col });
      sg(ctx, k, cx + cw / 2, yy + 31, { size: 14, w: 700, color: "#fff", align: 0.5 });
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
      bg: PAL.orange, fg: PAL.ink, kicker: "CAROUSELS", tool: "create_carousel(style, slides)",
      lines: ["CAROUSELS", "YOU CAN EDIT."], serif: "every word stays yours", toolBg: PAL.ink, toolFg: PAL.paper,
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
      card(ctx, -sw / 2, -sh / 2, sw, sh, { r: 16, fill: "#fff", shadow: 0.7 });
      cover(ctx, env.images[n], -sw / 2, -sh / 2, sw, sh, 16);
      ctx.restore();
    });
    // the editing caret: a selection box on the headline of the slide in view
    const pe = seg(lt, 2.2 * B, 2.6 * B);
    if (pe > 0) {
      const x = VX + 40 + dx + (Math.round(scroll) - scroll) * (sw + 30);
      ctx.save();
      ctx.globalAlpha = clamp(pe * 2);
      ctx.strokeStyle = PAL.cobalt;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      rrect(ctx, x + 18, 290 + 56, sw - 36, 120 * curves.snap(pe), 6);
      ctx.stroke();
      ctx.setLineDash([]);
      pill(ctx, "Edit text", x + 18, 290 + 38, { size: 17, bg: PAL.cobalt, fg: "#fff", h: 34, pad: 12 });
      ctx.restore();
    }
    ctx.restore();
    // slide counter
    jb(ctx, `${String(Math.round(scroll) + 1).padStart(2, "0")} / 05`, VX + 40 + dx, 790, { size: 20, w: 600, color: PAL.ink });
  },
};

// ── BOARD ───────────────────────────────────────────────────────────────────
const COLS = ["Idea", "Pre-production", "Production", "Post", "Ready", "Published"];
export const board = {
  hud: () => "dark",
  blur: blurIn,
  render(ctx, lt, env) {
    frame(ctx, lt, {
      bg: PAL.lime, fg: PAL.ink, kicker: "PRODUCTION BOARD", tool: "update_card(ready_to_publish)",
      lines: ["IDEA TO", "PUBLISHED."], serif: "one board, on a calendar", toolBg: PAL.ink, toolFg: PAL.paper,
    });
    const dx = slideIn(lt);
    const x = VX - 20 + dx, y = 140, cw = 136, gap = 10;
    COLS.forEach((c, i) => {
      const cx = x + i * (cw + gap);
      card(ctx, cx, y, cw, 800, { r: 18, fill: "rgba(255,255,255,.55)" });
      sg(ctx, c, cx + 14, y + 38, { size: 17, w: 700, color: PAL.ink });
      // resting cards
      for (let k = 0; k < 3 - (i % 2); k++) {
        card(ctx, cx + 10, y + 64 + k * 112 + (i === 4 ? 112 : 0), cw - 20, 96, { r: 12, fill: "#fff" });
        ctx.fillStyle = "rgba(17,19,24,.12)";
        ctx.fillRect(cx + 22, y + 88 + k * 112 + (i === 4 ? 112 : 0), cw - 60, 10);
        ctx.fillRect(cx + 22, y + 108 + k * 112 + (i === 4 ? 112 : 0), cw - 80, 10);
      }
    });
    // the edited reel's card hops column to column on each beat, lands in Ready
    const hops = clamp(lt / B, 0, 4);
    const k = Math.floor(hops), f = curves.swift(clamp((hops - k) / 0.45));
    const col = Math.min(4, k + f);
    const cx = x + col * (cw + gap) + 6, cy = y + 64 - Math.sin(Math.PI * f) * 60 * (k < 4 ? 1 : 0);
    const reel = env.clip("after", 100) || env.images.rs1;
    card(ctx, cx, cy, cw - 12, 104, { r: 12, fill: PAL.ink, shadow: 1 });
    cover(ctx, reel, cx + 8, cy + 8, 50, 88, 8);
    sg(ctx, "Effects", cx + 66, cy + 40, { size: 16, w: 700, color: "#fff" });
    sg(ctx, "reel", cx + 66, cy + 60, { size: 16, w: 700, color: "#fff" });
    const pr = seg(lt, 3.6 * B, 3.9 * B);
    if (pr > 0) pill(ctx, "Nov 4", cx + 66, cy + 84, { size: 13, bg: PAL.lime, fg: PAL.ink, h: 24, pad: 7 });
  },
};
