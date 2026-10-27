// The five carousels the carousel scene scrolls through: first slides from five
// different creators who make talking-head videos, each in a style of its own.
// Drawn live (photo + type) so the words stay sharp at any zoom, laid out on a
// 1080×1350 slide and scaled to whatever size the scene asks for. The photos
// are generated (assets/img/car-*.jpg, see README); the people are not real.
import { HP } from "../timeline.js";
import { fonts } from "../fonts.js";
import { layout, glyphPath } from "../engine/font.js";
import { rrect } from "../engine/draw.js";
import { cover, it, measureInter, tight, card } from "../engine/ui.js";

// outline type from the font data (Instrument Serif italic, Anybody with axes)
function outline(ctx, font, str, x, y, { size, axes = {}, color, align = 0, tracking = 0 }) {
  const L = layout(font, str, { size, axes, tracking });
  const ox = x - L.width * align;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const g of L.glyphs) if (g.pts) glyphPath(ctx, g.types, g.pts, ox + g.x, y);
  ctx.fill();
  return L.width;
}
const label = (ctx, str, x, y, size, color, align = 0) =>
  it(ctx, str.toUpperCase(), x, y, { size, w: 600, color, align, ls: 0.12 * size });

function shade(ctx, y0, y1, a0, a1, w) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(10,10,10,${a0})`);
  g.addColorStop(1, `rgba(10,10,10,${a1})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, y1 - y0);
}

// Each: draw(ctx, env) on a 1080×1350 slide; edit = the headline's box, for the
// scene's "Edit text" selection.
export const SLIDES = [
  {
    // career coach: editorial, serif italic over the photo
    draw(ctx, env) {
      cover(ctx, env.images["car-coach"], 0, 0, 1080, 1350, 0, { ay: 0.35 });
      shade(ctx, 560, 1350, 0, 0.78, 1080);
      shade(ctx, 0, 200, 0.35, 0, 1080);
      label(ctx, "Maya · career coach", 70, 104, 26, "#fff");
      it(ctx, "1/7", 1010, 104, { size: 28, w: 500, color: "rgba(255,255,255,.85)", align: 1 });
      ["Three lines that", "get recruiters", "to reply."].forEach((s, i) =>
        outline(ctx, fonts.serif, s, 66, 990 + i * 118, { size: 126, color: "#fff" }));
      it(ctx, "Swipe for the script  →", 70, 1290, { size: 28, w: 500, color: "rgba(255,255,255,.8)" });
    },
    edit: [44, 860, 990, 390],
  },
  {
    // strength coach: loud, condensed caps on black, photo below
    draw(ctx, env) {
      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, 0, 1080, 1350);
      cover(ctx, env.images["car-fit"], 0, 560, 1080, 790, 0, { ay: 0.55 });
      label(ctx, "Jake · strength coach", 70, 104, 24, "rgba(255,255,255,.7)");
      outline(ctx, fonts.display, "5 MOVES", 62, 330, { size: 270, axes: { wdth: 55, wght: 900 }, color: "#d8ff3e" });
      outline(ctx, fonts.display, "FOR DESK BACKS", 66, 482, { size: 128, axes: { wdth: 62, wght: 850 }, color: "#fff" });
      card(ctx, 70, 1222, 250, 66, { r: 33, fill: "#d8ff3e" });
      it(ctx, "SAVE THIS", 195, 1267, { size: 28, w: 600, color: "#0d0d0d", align: 0.5, ls: 2 });
    },
    edit: [44, 136, 990, 380],
  },
  {
    // resume coach: clean, white top, the key words underlined in blue
    draw(ctx, env) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 1080, 1350);
      cover(ctx, env.images["car-resume"], 0, 640, 1080, 710, 0, { ay: 0.3 });
      label(ctx, "Kofi · resume coach", 76, 120, 24, HP.soft);
      const s = 104, ls = tight(s);
      it(ctx, "Your resume gets", 72, 286, { size: s, w: 600, color: HP.ink, ls });
      const w6 = measureInter(ctx, "6 seconds.", { size: s, w: 600, ls });
      it(ctx, "6 seconds.", 72, 408, { size: s, w: 600, color: HP.ink, ls });
      ctx.fillStyle = HP.blue;
      ctx.beginPath();
      rrect(ctx, 76, 432, w6 - 26, 14, 7);
      ctx.fill();
      it(ctx, "Here's what they read first.", 76, 530, { size: 38, w: 400, color: HP.muted });
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(960, 1230, 52, 0, Math.PI * 2);
      ctx.fill();
      it(ctx, "→", 960, 1248, { size: 50, w: 600, color: HP.ink, align: 0.5 });
    },
    edit: [48, 170, 984, 300],
  },
  {
    // nutrition coach: warm cream, rounded photo, a menu below
    draw(ctx, env) {
      ctx.fillStyle = "#f3ebdf";
      ctx.fillRect(0, 0, 1080, 1350);
      const tc = "#b8482b";
      ctx.font = `700 96px "Space Grotesk"`;
      ctx.letterSpacing = "-3px";
      ctx.textAlign = "left";
      ctx.fillStyle = tc;
      ctx.fillText("What I eat on", 70, 200);
      ctx.fillText("a busy Monday", 70, 300);
      ctx.letterSpacing = "0px";
      ctx.save();
      ctx.beginPath();
      rrect(ctx, 70, 380, 940, 700, 40);
      ctx.clip();
      cover(ctx, env.images["car-food"], 70, 380, 940, 700, 0, { ay: 0.45 });
      ctx.restore();
      [["7:30", "Oats, berries"], ["12:30", "The big bowl"], ["19:00", "Salmon, greens"]].forEach(([t, m], i) => {
        const x = 70 + i * 320;
        it(ctx, t, x, 1160, { size: 30, w: 600, color: tc });
        it(ctx, m, x, 1206, { size: 32, w: 500, color: "#3b2a20" });
      });
      label(ctx, "Lena · nutrition coach", 70, 1290, 22, "rgba(59,42,32,.6)");
    },
    edit: [44, 108, 990, 230],
  },
  {
    // yoga teacher: quiet, a centred serif line in the morning sky
    draw(ctx, env) {
      cover(ctx, env.images["car-yoga"], 0, 0, 1080, 1350, 0, { ay: 0.5 });
      const haze = ctx.createLinearGradient(0, 0, 0, 560);
      haze.addColorStop(0, "rgba(255,248,236,.6)");
      haze.addColorStop(1, "rgba(255,248,236,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, 1080, 560);
      label(ctx, "Mei · yoga teacher", 540, 120, 24, "rgba(29,42,34,.75)", 0.5);
      outline(ctx, fonts.serif, "Breathe first.", 540, 270, { size: 118, color: "#1d2a22", align: 0.5 });
      outline(ctx, fonts.serif, "Reply second.", 540, 386, { size: 118, color: "#1d2a22", align: 0.5 });
    },
    edit: [150, 160, 780, 270],
  },
];

// one slide at (x, y), w wide (4:5)
export function drawSlide(ctx, env, i, x, y, w) {
  const k = w / 1080;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  SLIDES[i].draw(ctx, env);
  ctx.restore();
}
