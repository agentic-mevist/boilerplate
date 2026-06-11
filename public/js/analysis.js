// Draw analysis + coach advice for 2-7 single draw.
import { makeDeck, evaluate, CAT, RANK_CHAR, cardStr } from './cards.js';

// ---- utility scale for a final 5-card hand (bigger = better) ----
export function utilityOf(ev) {
  if (ev.cat === CAT.PAIR) return ev.ranks[0] <= 3 ? 7 : 4; // small pairs win occasionally
  if (ev.cat > CAT.PAIR) return 1;
  const hi = ev.ranks[0], second = ev.ranks[1];
  const base = { 7: 100, 8: 84, 9: 70, 10: 56, 11: 42, 12: 30, 13: 20, 14: 12 }[hi] ?? 1;
  return base - (second - 3) * 0.8; // smoother hands worth a bit more
}

function keySubsets(cards) {
  // All keep-subsets of size 2..5 with no paired ranks (keeping a pair is
  // never a value play). Size 5 = stand pat with whatever you hold.
  const subs = [];
  const n = cards.length;
  for (let mask = 0; mask < (1 << n); mask++) {
    const kept = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) kept.push(cards[i]);
    if (kept.length < 2) continue;
    if (kept.length < 5) {
      const rs = new Set(kept.map(c => c.r));
      if (rs.size !== kept.length) continue;
    }
    subs.push(kept);
  }
  return subs;
}

// Monte Carlo every sensible keep. Returns sorted [{kept, drawCount, ev:{...}}].
export function analyzeKeeps(cards, trials = 350) {
  const dead = new Set(cards.map(c => c.r + c.s));
  const stub = makeDeck().filter(c => !dead.has(c.r + c.s));
  const results = [];

  for (const kept of keySubsets(cards)) {
    const need = 5 - kept.length;
    if (need === 0) {
      const ev = evaluate(kept);
      results.push({ kept, drawCount: 0, util: utilityOf(ev),
        p8: ev.cat === 0 && ev.ranks[0] <= 8 ? 1 : 0,
        p9: ev.cat === 0 && ev.ranks[0] <= 9 ? 1 : 0,
        pJ: ev.cat === 0 && ev.ranks[0] <= 11 ? 1 : 0,
        pPairPlus: ev.cat > 0 ? 1 : 0, patEv: ev });
      continue;
    }
    let util = 0, p8 = 0, p9 = 0, pJ = 0, pPairPlus = 0;
    for (let t = 0; t < trials; t++) {
      // partial Fisher-Yates: sample `need` cards from stub
      const pick = [];
      const idx = new Set();
      while (pick.length < need) {
        const j = Math.floor(Math.random() * stub.length);
        if (!idx.has(j)) { idx.add(j); pick.push(stub[j]); }
      }
      const ev = evaluate(kept.concat(pick));
      util += utilityOf(ev);
      if (ev.cat === 0) {
        if (ev.ranks[0] <= 8) p8++;
        if (ev.ranks[0] <= 9) p9++;
        if (ev.ranks[0] <= 11) pJ++;
      } else pPairPlus++;
    }
    results.push({ kept, drawCount: need, util: util / trials,
      p8: p8 / trials, p9: p9 / trials, pJ: pJ / trials, pPairPlus: pPairPlus / trials });
  }
  results.sort((a, b) => b.util - a.util);
  return results;
}

// Best keep for a given draw count (or overall best if count == null).
export function bestKeep(cards, drawCount = null, trials = 350) {
  const all = analyzeKeeps(cards, trials);
  if (drawCount === null) return all[0];
  return all.find(r => r.drawCount === drawCount) || all[0];
}

function straightDanger(kept) {
  if (kept.length !== 4) return null;
  const rs = kept.map(c => c.r).sort((a, b) => a - b);
  if (rs[3] - rs[0] === 3) {
    const outs = [];
    if (rs[0] - 1 >= 2) outs.push(RANK_CHAR[rs[0] - 1]);
    if (rs[3] + 1 <= 14) outs.push(RANK_CHAR[rs[3] + 1]);
    return outs; // catching these makes a straight
  }
  if (rs[3] - rs[0] === 4) {
    for (let r = rs[0] + 1; r < rs[3]; r++) {
      if (!rs.includes(r)) return [RANK_CHAR[r]]; // gutshot fill
    }
  }
  return null;
}

// ---- pre-draw hand classification & advice ----
// position: 'early' | 'middle' | 'late' | 'sb' | 'bb'
// facing: 'unopened' | 'limped' | 'raised' | 'reraised'
export function predrawAdvice(cards, position, facing) {
  const pat = evaluate(cards);
  const best = analyzeKeeps(cards, 300);
  const top = best[0];
  const keep4 = best.find(r => r.drawCount === 1);
  const late = position === 'late' || position === 'sb';

  const lines = [];
  let action; // 'raise' | 'call' | 'fold'

  const patLow = pat.cat === CAT.HIGH_CARD ? pat.ranks[0] : 99;

  if (patLow <= 10) {
    action = 'raise';
    lines.push(`You were dealt a **pat ${pat.name}** — that's a genuine hand in 2-7. Raise (or re-raise) and plan to stand pat.`);
  } else if (patLow <= 11 && facing !== 'reraised') {
    action = 'raise';
    lines.push(`A pat Jack-low is playable: open-raise it, stand pat, and proceed carefully. Against a re-raise, consider it a coin flip at best.`);
  } else if (keep4 && goodOneCardDraw(keep4)) {
    const drawHi = Math.max(...keep4.kept.map(c => c.r));
    if (drawHi <= 8) {
      action = facing === 'reraised' ? 'call' : 'raise';
      lines.push(`You have a **one-card draw to a ${RANK_CHAR[drawHi]}** (keep ${keep4.kept.map(cardStr).join(' ')}). That's a premium draw — ${facing === 'reraised'
        ? 'even against a raise and re-raise it\'s worth a call, but just call: the re-raiser often has a pat hand.'
        : 'raise with it from any seat.'}`);
    } else if (drawHi <= 10 && (late || position === 'middle') && facing !== 'reraised') {
      action = facing === 'raised' ? 'call' : 'raise';
      lines.push(`A one-card draw to a ${RANK_CHAR[drawHi]} is decent but not premium. Fine to open from ${position} position; against heavy action, let it go.`);
    } else {
      action = 'fold';
      lines.push(`Your best draw is rough (one card to a ${RANK_CHAR[drawHi]}). Out of position or facing a raise, this is a fold. Tight is right.`);
    }
  } else if (top.drawCount === 2 && Math.max(...top.kept.map(c => c.r)) <= 7 && late && facing === 'unopened') {
    action = 'raise';
    lines.push(`A two-card draw to a seven (keep ${top.kept.map(cardStr).join(' ')}) is a steal candidate from late position only. If you get action, you'll often have to give up.`);
  } else {
    action = 'fold';
    lines.push(`Nothing here. The safe play is to fold — two-card draws are big underdogs against any one-card draw, and pat junk loses money.`);
  }

  if (keep4) {
    const danger = straightDanger(keep4.kept);
    if (danger && action !== 'fold') {
      lines.push(`⚠️ Heads up: if you draw to ${keep4.kept.map(cardStr).join(' ')}, catching ${danger.join(' or ')} makes a **straight**, which loses to almost everything. Those “outs” are dead.`);
    }
  }

  if (facing === 'raised' && action === 'raise') {
    lines.push(`Someone already raised — in 2-7 NL it's usually “raise or fold”: flat-calling lets the blinds in cheap.`);
  }

  return { action, lines, pat, top, keep4 };
}

function goodOneCardDraw(keep4) {
  // 4 distinct ranks, highest <= 10
  return keep4 && Math.max(...keep4.kept.map(c => c.r)) <= 10;
}

// ---- draw-phase advice ----
export function drawAdvice(cards, oppInfo) {
  const all = analyzeKeeps(cards, 400);
  const top = all[0];
  const lines = [];
  const pct = x => Math.round(x * 100) + '%';

  if (top.drawCount === 0) {
    lines.push(`**Stand pat.** Your ${top.patEv.name} is better than what you'd likely make by drawing.`);
  } else {
    const keptStr = top.kept.map(cardStr).join(' ');
    lines.push(`**Keep ${keptStr}, draw ${top.drawCount}.**`);
    lines.push(`Chances after the draw: ${pct(top.p8)} to make an 8-or-better, ${pct(top.p9)} a 9-or-better, ${pct(top.pPairPlus)} you pair up (bad).`);
    const danger = straightDanger(top.kept);
    if (danger) lines.push(`⚠️ Catching ${danger.join(' or ')} makes a straight — don't celebrate those.`);
  }

  const patAlt = all.find(r => r.drawCount === 0);
  if (top.drawCount > 0 && patAlt && patAlt.util > top.util * 0.85) {
    lines.push(`Close call: standing pat with ${patAlt.patEv.name} is nearly as good${oppInfo?.someoneDrew ? ', especially against opponents who are drawing' : ''}.`);
  }
  return { top, all, lines };
}

// ---- post-draw advice ----
export function postdrawAdvice(cards, ctx) {
  // ctx: { oppPat: number standing pat, oppDrew: number who drew, facingBet, potSize, toCall }
  const ev = evaluate(cards);
  const lines = [];
  let action;
  const lowRank = ev.cat === CAT.HIGH_CARD ? ev.ranks[0] : 99;

  if (lowRank <= 8) {
    action = ctx.facingBet ? 'raise' : 'bet';
    lines.push(`You made **${ev.name}** — a clear value hand. ${ctx.facingBet ? 'Raise.' : 'Bet around two-thirds of the pot.'}`);
    if (ctx.oppPat > 0) lines.push(`An opponent stood pat — most pat hands are 9s and 10s, so you're still in great shape, but a re-raise war means a 7 or 8; use judgment.`);
  } else if (lowRank === 9) {
    if (ctx.facingBet) {
      action = ctx.oppPat > 0 ? 'call' : 'call';
      lines.push(`A 9-low is a solid bluff-catcher. Call a single bet; only fold to massive pressure from a player who stood pat before you acted.`);
    } else {
      action = ctx.oppDrew > 0 ? 'bet' : 'check';
      lines.push(ctx.oppDrew > 0
        ? `You made **${ev.name}**. Bet for value against players who drew — they miss more often than they hit.`
        : `You made **${ev.name}**. Against a pat hand, check and decide based on their sizing.`);
    }
  } else if (lowRank <= 11) {
    if (ctx.facingBet) {
      const oddsOk = ctx.toCall > 0 && ctx.toCall <= ctx.potSize * 0.4;
      action = oddsOk && ctx.oppPat === 0 ? 'call' : 'fold';
      lines.push(`A ${ev.name} is marginal. ${action === 'call'
        ? `Getting better than 2.5-to-1 against a drawer, a call is okay — they often missed.`
        : `Facing real pressure${ctx.oppPat > 0 ? ' from a pat hand' : ''}, let it go.`}`);
    } else {
      action = 'check';
      lines.push(`You made **${ev.name}**. Check — it wins showdowns often enough, but it can't stand a raise. Don't turn it into a bluff.`);
    }
  } else {
    if (ctx.facingBet) {
      action = 'fold';
      lines.push(`You have **${ev.name}** — that beats almost nothing. Fold to any bet.`);
    } else {
      action = 'check';
      lines.push(`You have **${ev.name}**. Check and hope it gets checked down. (Skilled players bluff here sometimes — while learning, just give up cheaply.)`);
    }
  }
  return { action, lines, ev };
}
