// 04 — THE HUB
// The coral core from the grid becomes the HandlePilot mark. The agents a
// creator already uses arrive on the beat and wire into it. "Your agent is the
// brain" (bar 1), "HandlePilot is the hub" (bar 2), then we fall into the @.
import { W, H, BEAT, PAL } from "../timeline.js";
import { clamp, seg, lerp, ease, curves, spring, TAU, alpha, mix } from "../engine/math.js";
import { sg, jb, card, logo, pop, riseLines, serifLine, measure } from "../engine/ui.js";

const B = BEAT;
const CX = W / 2, CY = H / 2 + 20;
const AGENTS = ["ChatGPT", "Claude", "Claude Code", "Codex", "Cursor", "VS Code"];
const ORBIT = 330;
const angleOf = (i) => -Math.PI / 2 + (i / AGENTS.length) * TAU;

export default {
  hud: (lt) => "light",
  hudFade: (lt) => 1 - seg(lt, 3.4, 3.6),
  blur: (lt) => (lt < 0.4 || lt > 3.3 ? { samples: 2.5 } : null),
  render(ctx, lt, env) {
    // ground: cobalt → ink as the hub lights up
    ctx.fillStyle = mix(PAL.cobalt, PAL.ink, ease.inOutCubic(seg(lt, 0.15, 0.7)));
    ctx.fillRect(0, 0, W, H);

    // dot grid behind, breathing on the beat
    const beatK = Math.exp(-((lt % B) / 0.12));
    ctx.fillStyle = alpha(PAL.paper, 0.07 + 0.05 * beatK);
    for (let x = 60; x < W; x += 60) for (let y = 60; y < H; y += 60) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);

    // final zoom into the mark's ink centre
    const pz = ease.inQuart(seg(lt, 3.3, 3.75));
    const zoom = 1 + pz * 22;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(zoom, zoom);
    ctx.translate(-CX, -CY);

    // spokes + travelling packets from every agent into the hub
    AGENTS.forEach((name, i) => {
      const t0 = 0.45 + i * 0.5 * B;
      const p = pop(lt, t0, 280, 20);
      if (p <= 0) return;
      const a = angleOf(i);
      const r = ORBIT * lerp(1.6, 1, clamp(p));
      const x = CX + Math.cos(a) * r * 0.8, y = CY + Math.sin(a) * r;
      const pl = curves.snap(seg(lt, t0 + 0.1, t0 + 0.45));
      ctx.strokeStyle = alpha(PAL.paper, 0.28);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(lerp(x, CX, pl * 0.78), lerp(y, CY, pl * 0.78));
      ctx.stroke();
      // packets ride the spoke in on every beat after it connects
      for (let k = 0; k < 3; k++) {
        const ph = ((lt - t0 - 0.4) / B + k / 3) % 1;
        if (lt < t0 + 0.4 || ph < 0) continue;
        const px = lerp(x, CX, ph * 0.78), py = lerp(y, CY, ph * 0.78);
        ctx.fillStyle = i % 2 ? PAL.lime : PAL.orange;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, TAU);
        ctx.fill();
      }
      const tw = measure(ctx, name, { size: 30, w: 700 }) + 56;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(clamp(p, 0, 1.15), clamp(p, 0, 1.15));
      card(ctx, -tw / 2, -32, tw, 64, { r: 32, fill: PAL.paper });
      sg(ctx, name, 0, 11, { size: 30, w: 700, color: PAL.ink, align: 0.5 });
      ctx.restore();
    });

    // the mark: born from the coral core, spins up, settles, pulses on the beat
    const pb = seg(lt, 0, 0.35);
    if (pb < 1) {
      ctx.fillStyle = PAL.orange;
      ctx.beginPath();
      ctx.arc(CX, CY, lerp(230, 150, ease.inOutCubic(pb)) * (1 - ease.inQuad(seg(lt, 0.25, 0.35))), 0, TAU);
      ctx.fill();
    }
    const pl = spring(lt - 0.2, { k: 200, c: 15 });
    if (pl > 0) {
      const pulse = 1 + 0.04 * beatK * seg(lt, 0.8, 1);
      const spin = (1 - curves.snap(seg(lt, 0.2, 1.1))) * -TAU * 0.75 + lt * 0.12;
      ctx.save();
      ctx.shadowColor = alpha(PAL.cobalt, 0.6);
      ctx.shadowBlur = 80;
      logo(ctx, env, CX, CY, 150 * pl * pulse, spin);
      ctx.restore();
      // ring burst
      const pr = seg(lt, 0.25, 0.8);
      if (pr > 0 && pr < 1) {
        ctx.strokeStyle = alpha(PAL.paper, 0.8 * (1 - pr));
        ctx.lineWidth = 8 * (1 - pr) + 1;
        ctx.beginPath();
        ctx.arc(CX, CY, 160 + 520 * curves.snap(pr), 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (pz > 0.6) {
      ctx.fillStyle = alpha(PAL.ink, seg(pz, 0.6, 0.85));
      ctx.fillRect(0, 0, W, H);
    }

    // words: bar 1 top, bar 2 bottom
    const out = 1 - seg(lt, 3.28, 3.4);
    if (out <= 0) return;
    ctx.save();
    ctx.globalAlpha = out;
    const L1 = "YOUR AGENT", L2 = "HANDLEPILOT";
    riseLines(ctx, lt, [L1], 120, 400, { size: 66, color: PAL.paper, t0: 0.3, wdth: 100, maxW: 500 });
    serifLine(ctx, lt, "is the brain.", 120, 540, { size: 66, color: PAL.paper, t0: 0.62 });
    riseLines(ctx, lt, [L2], W - 120, 530, { size: 66, color: PAL.paper, t0: 4 * B, wdth: 100, align: 1, maxW: 500 });
    serifLine(ctx, lt, "is the hub.", W - 120, 670, { size: 66, color: PAL.orange, t0: 4 * B + 0.32, align: 1 });
    ctx.restore();
  },
};
