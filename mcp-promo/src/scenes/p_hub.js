// 02 — THE HUB
// The mark from the hook grows; the agents people already use arrive on the
// beat and wire into it. Bar 1: "Your AI does the work." Bar 2: "HandlePilot
// gives it superpowers." Bar 3 says what that means, one power per half beat,
// each one pulsing out to every agent; then we fall into the @.
import { W, H, BEAT, HP } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha, mix } from "../engine/math.js";
import { it, card, hpCard, logo, pop, head, eyebrow, icon, iconTile, measureInter } from "../engine/ui.js";

const B = BEAT;
const CX = 1250, CY = 560;
const AGENTS = [
  ["ChatGPT", "a-openai"],
  ["Claude", "a-claude-color"],
  ["Claude Code", "a-claudecode-color"],
  ["Codex", "a-codex-color"],
  ["Cursor", "a-cursor"],
  ["GitHub Copilot", "a-githubcopilot"],
];
const ORBIT = 300, XS = 0.98;
const angleOf = (i) => -Math.PI / 2 + (i / AGENTS.length) * TAU;
const POWERS = [
  ["l-eye", "Eyes on Instagram", "any account, any reel, the numbers"],
  ["l-brain", "A memory for your brand", "voice, plan, board and assets"],
  ["l-book-open", "The playbooks", "how the best creators work"],
  ["l-gallery-horizontal-end", "Editors for every post", "carousels, reels and a calendar"],
];
const T2 = 4 * B, T3 = 8 * B, T_Z = 11 * B;
const pulseAt = (i) => T3 + 0.1 + i * 0.5 * B;

export default {
  hud: () => "dark",
  hudFade: (lt) => 1 - seg(lt, T_Z + 0.1, T_Z + 0.3),
  blur: (lt) => (lt < 0.3 || lt > T_Z ? { samples: 2.5 } : null),
  render(ctx, lt, env) {
    ctx.fillStyle = HP.paper;
    ctx.fillRect(0, 0, W, H);
    // the sky panel behind the orbit, breathing on the beat
    const beatK = Math.exp(-((lt % B) / 0.12));
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, 620);
    g.addColorStop(0, alpha(HP.skyPanel, 1));
    g.addColorStop(1, alpha(HP.skyPanel, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // final zoom into the mark's centre
    const pz = ease.inQuart(seg(lt, T_Z, 12 * B));
    const zoom = 1 + pz * 24;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(zoom, zoom);
    ctx.translate(-CX, -CY);
    // the whole orbit glides in from the centre of frame (where the hook left the mark)
    const pm = curves.glide(seg(lt, 0, 0.55));
    const ox = lerp(W / 2 - CX, 0, pm), oy = lerp(H / 2 + 20 - CY, 0, pm);
    ctx.translate(ox, oy);

    // spokes, packets and chips
    AGENTS.forEach(([name, ic], i) => {
      const t0 = 0.3 + i * 0.4 * B;
      const p = pop(lt, t0, 280, 20);
      if (p <= 0) return;
      const a = angleOf(i);
      const r = ORBIT * lerp(1.5, 1, clamp(p));
      const x = CX + Math.cos(a) * r * XS, y = CY + Math.sin(a) * r;
      const pl = curves.snap(seg(lt, t0 + 0.1, t0 + 0.45));
      ctx.strokeStyle = alpha(HP.blue, 0.28);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(lerp(x, CX, pl * 0.7), lerp(y, CY, pl * 0.7));
      ctx.stroke();
      // packets ride the spoke in on every beat once it connects
      for (let k = 0; k < 3; k++) {
        const ph = ((lt - t0 - 0.4) / B + k / 3) % 1;
        if (lt < t0 + 0.4 || ph < 0) continue;
        ctx.fillStyle = (i + k) % 2 ? HP.greenDeep : HP.blue;
        ctx.beginPath();
        ctx.arc(lerp(x, CX, ph * 0.7), lerp(y, CY, ph * 0.7), 5, 0, TAU);
        ctx.fill();
      }
      // in bar 3 each power fires out from the hub to every agent
      for (let j = 0; j < POWERS.length; j++) {
        const q = seg(lt, pulseAt(j), pulseAt(j) + 0.42);
        if (q <= 0 || q >= 1) continue;
        const e = curves.glide(q);
        ctx.fillStyle = alpha(HP.blue, 1 - q * 0.6);
        ctx.beginPath();
        ctx.arc(lerp(CX, x, 0.2 + e * 0.75), lerp(CY, y, 0.2 + e * 0.75), 9 * (1 - q * 0.4), 0, TAU);
        ctx.fill();
      }
      const hit = POWERS.reduce((m, _, j) => Math.max(m, Math.exp(-(((lt - pulseAt(j) - 0.4) / 0.07) ** 2))), 0);
      const tw = measureInter(ctx, name, { size: 28, w: 600 }) + 102;
      const s = clamp(p, 0, 1.15) * (1 + 0.06 * hit);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      hpCard(ctx, -tw / 2, -36, tw, 72, { r: 36, shadow: 0.3, stroke: hit > 0.3 ? HP.blue : HP.line });
      icon(ctx, env, ic, -tw / 2 + 44, 0, 36, "ink");
      it(ctx, name, -tw / 2 + 76, 10, { size: 28, w: 600, color: HP.ink, ls: -0.6 });
      ctx.restore();
    });

    // the mark: picks up from the hook, settles, pulses on the beat and on each power
    const grow = spring(lt, { k: 180, c: 16 });
    const fire = POWERS.reduce((m, _, j) => Math.max(m, Math.exp(-(((lt - pulseAt(j)) / 0.06) ** 2))), 0);
    const pulse = 1 + 0.035 * beatK * seg(lt, 0.8, 1) + 0.08 * fire;
    const rr = lerp(70, 132, grow) * pulse;
    ctx.save();
    ctx.shadowColor = alpha(HP.blue, 0.45);
    ctx.shadowBlur = 70;
    logo(ctx, env, CX, CY, rr, lt * 0.15);
    ctx.restore();
    // ring burst when it lands
    const pr = seg(lt, 0.15, 0.75);
    if (pr > 0 && pr < 1) {
      ctx.strokeStyle = alpha(HP.blue, 0.6 * (1 - pr));
      ctx.lineWidth = 6 * (1 - pr) + 1;
      ctx.beginPath();
      ctx.arc(CX, CY, 150 + 460 * curves.snap(pr), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    if (pz > 0.55) {
      ctx.fillStyle = alpha("#111318", seg(pz, 0.55, 0.85));
      ctx.fillRect(0, 0, W, H);
    }

    // left column: the words
    const out = 1 - seg(lt, T_Z, T_Z + 0.12);
    if (out <= 0) return;
    ctx.save();
    ctx.globalAlpha = out;
    const LX = 120;
    // bar 1
    const o1 = seg(lt, T2 - 0.14, T2);
    if (o1 < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - o1;
      ctx.translate(0, -40 * ease.inCubic(o1));
      eyebrow(ctx, "Any AI agent", LX, 330, { size: 20, color: HP.soft, w: 600 });
      head(ctx, lt, ["Your AI", "[does the work.]"], LX, 368, { size: 96, t0: 0.25, maxW: 680 });
      ctx.restore();
    }
    // bar 2
    const o2 = seg(lt, T3 - 0.14, T3);
    if (lt > T2 - 0.05 && o2 < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - o2;
      ctx.translate(0, -40 * ease.inCubic(o2));
      eyebrow(ctx, "HandlePilot MCP", LX, 280, { size: 20, color: HP.soft, w: 600 });
      head(ctx, lt, ["HandlePilot", "gives it", "[superpowers.]"], LX, 318, { size: 96, t0: T2, maxW: 680 });
      ctx.restore();
    }
    // bar 3: what the hub gives your AI
    if (lt > T3 - 0.05) {
      eyebrow(ctx, "Your AI gets", LX, 262, { size: 20, color: HP.soft, w: 600 });
      POWERS.forEach(([ic, label, sub], i) => {
        const p = pop(lt, pulseAt(i) - 0.08, 320, 22);
        if (p <= 0) return;
        const y = 300 + i * 150;
        ctx.save();
        ctx.globalAlpha *= clamp(p * 2);
        ctx.translate((1 - clamp(p)) * -60, 0);
        iconTile(ctx, env, ic, LX + 46, y + 46, 92, { fill: HP.white, stroke: HP.line });
        it(ctx, label, LX + 124, y + 42, { size: 44, w: 600, color: HP.ink, ls: -1.6 });
        it(ctx, sub, LX + 124, y + 84, { size: 26, w: 400, color: HP.muted });
        ctx.restore();
      });
    }
    ctx.restore();
  },
};
