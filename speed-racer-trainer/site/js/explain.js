// Turns solver output into verdicts, numbers and plain-language explanations.
import { CLASS_NAMES, CLASS_COMBOS, RANKS, classOf, describeRange, rangePct } from './poker.js';
import { PROFILES, MODELS, dollarsPerBB, shoveRange, callRange, remainingPrize, covers as coversFn, liveRoom } from './model.js';

const SUIT_HTML = ['♠', '♥', '♦', '♣'];
const SUIT_CLASS = ['s', 'h', 'd', 'c'];
export const cardHtml = (c, big) =>
  `<span class="card ${SUIT_CLASS[c & 3]}${big ? ' big' : ''}"><b>${RANKS[c >> 2] === 'T' ? '10' : RANKS[c >> 2]}</b><i>${SUIT_HTML[c & 3]}</i></span>`;
export const handName = cards => CLASS_NAMES[classOf(cards[0], cards[1])];
export const fmt$ = x => {
  const a = Math.abs(x);
  const s = a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2);
  return (x < 0 ? '−$' : '$') + s;
};
export const fmtSigned$ = x => (x >= 0 ? '+' : '') + fmt$(x).replace('−', '−');
export const fmtBB = x => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2) + 'bb';
export const pct = x => (x * 100).toFixed(1) + '%';

export function verdict(spot, rt, res) {
  const dpb = dollarsPerBB(rt);
  const diff = res.go.full - res.fold.full;
  const diffBB = diff / dpb;
  const best = diff > 0 ? res.act : 'fold';
  const marginal = Math.abs(diffBB) < 0.12;
  const perModel = MODELS.map(m => {
    const d = res.go[m.key] - res.fold[m.key];
    return { ...m, fold: res.fold[m.key], go: res.go[m.key], diff: d, best: d > 0 ? res.act : 'fold' };
  });
  return { dpb, diff, diffBB, best, marginal, perModel };
}

function seatLabel(spot, i) {
  const s = spot.seats[i];
  return `<b>${s.name}</b> (${s.pos}${s.profile && PROFILES[s.profile] ? ', ' + PROFILES[s.profile].label : ''})`;
}

// Required equity from the win/lose/fold states (heads-up spots).
function requiredEquities(res) {
  const W = res.go.huWin, L = res.go.huLose;
  if (!W || !L) return null;
  const out = {};
  for (const m of MODELS) {
    const w = W[m.key], l = L[m.key], f = res.fold[m.key];
    out[m.key] = (f - l) / (w - l);
  }
  return out;
}

export function explain(spot, rt, res, v) {
  const h = spot.heroIdx, hero = spot.seats[h];
  const name = handName(spot.heroCards);
  const lines = [];
  const dpb = v.dpb;
  const shove = spot.prefix.find(p => p.act === 'shove');
  const callers = spot.prefix.filter(p => p.act === 'call');
  const pureHU = shove && !callers.length && !spot.behind.length;
  const koCash = i => spot.koShare * spot.seats[i].head;
  const covers = i => coversFn(spot, h, i);
  const anteNote = i => (hero.pos === 'BB' && spot.ante > 0 && hero.stack >= spot.seats[i].stack && !covers(i))
    ? ` <i>Careful: you started with ${hero.stack.toFixed(1)}bb vs their ${spot.seats[i].stack.toFixed(1)}bb, but your ${spot.ante}bb ante is dead money, so you can only put ${liveRoom(spot, h).toFixed(1)}bb in the pot. They keep the rest and survive.</i>` : '';

  if (shove) {
    const s = spot.seats[shove.idx];
    lines.push(`${seatLabel(spot, shove.idx)} shoves <b>${s.stack.toFixed(1)}bb</b> with roughly the top <b>${shove.pct.toFixed(0)}%</b> of hands.` +
      (callers.length ? ' ' + callers.map(c => `${seatLabel(spot, c.idx)} calls (top ~${c.pct.toFixed(0)}%).`).join(' ') : ''));
  } else {
    lines.push(`Folded to you in the <b>${hero.pos}</b> with <b>${hero.stack.toFixed(1)}bb</b>. ${spot.behind.length} player${spot.behind.length > 1 ? 's' : ''} left to act.`);
  }

  // ---- Equity / pot odds ----
  if (shove && !callers.length && !pureHU) {
    const g = res.go, i = shove.idx;
    if (g.huEq != null) lines.push(`When it ends up heads-up, your <b>${name}</b> has about <b>${pct(g.huEq)}</b> equity against ${spot.seats[i].name}'s range.`);
    lines.push(`${spot.behind.map(b => spot.seats[b.idx].name).join(', ')} still to act behind you: someone overcalls about <b>${pct(g.multiway)}</b> of the time if you call. That makes marginal calls worse (you get squeezed between two ranges).`);
    if (covers(i)) lines.push(`<span class="tag t-bounty">Bounty</span> You cover ${spot.seats[i].name}: winning busts them and pays <b>${fmt$(koCash(i))}</b> cash (≈ <b>${(koCash(i) / dpb).toFixed(1)}bb</b> of extra pot). You collect a bounty in <b>${pct(g.ko)}</b> of runouts.`);
    else lines.push(`<span class="tag t-bounty">Bounty</span> ${spot.seats[i].name} <b>covers you</b>: no bounty for you even if you win, and your ${fmt$(hero.head)} head is at risk.${anteNote(i)}`);
    lines.push(`<span class="tag t-icm">ICM</span> ${icmContext(spot)}`);
  } else if (pureHU) {
    const req = requiredEquities(res);
    const eq = res.go.huEq;
    if (req && eq != null) {
      const W = res.go.huWin, L = res.go.huLose, F = res.fold;
      const winBB = W.chips - F.chips, loseBB = F.chips - L.chips;
      lines.push(`Your <b>${name}</b> has <b>${pct(eq)}</b> equity against that range.`);
      lines.push(`<span class="tag t-chips">Chip EV</span> You risk ${loseBB.toFixed(1)}bb to win ${winBB.toFixed(1)}bb → you need <b>${pct(req.chips)}</b>.`);
      if (covers(shove.idx)) {
        const cash = koCash(shove.idx);
        lines.push(`<span class="tag t-bounty">Bounty</span> You cover them, so winning also pays <b>${fmt$(cash)}</b> cash right now (≈ <b>${(cash / dpb).toFixed(1)}bb</b> of extra pot) and adds ${fmt$(spot.seats[shove.idx].head - cash)} to your own head. Counting that, you only need <b>${pct(req.linb)}</b>.`);
      } else {
        lines.push(`<span class="tag t-bounty">Bounty</span> They <b>cover you</b>: even if you win, nobody is eliminated and you collect no bounty. If you lose, <b>they</b> take your ${fmt$(hero.head)} head. No bounty discount here.${anteNote(shove.idx)}`);
      }
      const prem = req.full - req.linb;
      lines.push(`<span class="tag t-icm">ICM</span> ${icmContext(spot)} With prize-pool pressure the requirement is <b>${pct(req.full)}</b> (${prem >= 0 ? '+' : ''}${(prem * 100).toFixed(1)} points of risk premium).`);
      lines.push(`<b>${pct(eq)}</b> vs <b>${pct(req.full)}</b> needed → <b>${eq > req.full ? 'CALL' : 'FOLD'}</b>.`);
    }
  } else if (!shove) {
    const g = res.go;
    lines.push(`If you shove, everyone folds <b>${pct(g.uncontested)}</b> of the time and you pick up the blinds and ante for free (${(spot.sb + spot.bb + spot.ante).toFixed(1)}bb).`);
    lines.push(`You get called <b>${pct(g.called)}</b> of the time` + (g.multiway > 0.005 ? ` (${pct(g.multiway)} multiway)` : '') +
      (g.huEq != null ? `; when called heads-up your ${name} has about <b>${pct(g.huEq)}</b> equity.` : '.'));
    const coverable = spot.behind.filter(b => covers(b.idx));
    if (coverable.length) lines.push(`<span class="tag t-bounty">Bounty</span> You cover ${coverable.map(b => spot.seats[b.idx].name).join(', ')}: a call you win busts them and pays ${coverable.map(b => fmt$(koCash(b.idx))).join(' / ')} cash. You win a bounty in <b>${pct(g.ko)}</b> of all runouts.`);
    const bigger = spot.behind.filter(b => !covers(b.idx));
    if (bigger.length) lines.push(`<span class="tag t-bounty">Bounty</span> ${bigger.map(b => spot.seats[b.idx].name).join(', ')} cover${bigger.length === 1 ? 's' : ''} you: they call wider because your ${fmt$(hero.head)} head is on the line. You bust <b>${pct(g.busted)}</b> of the time.`);
    lines.push(`<span class="tag t-icm">ICM</span> ${icmContext(spot)}`);
  } else {
    const g = res.go;
    lines.push(`Calling puts you in a <b>multiway</b> pot. You win a bounty in <b>${pct(g.ko)}</b> of runouts and bust <b>${pct(g.busted)}</b> of the time.`);
    const tgt = [shove.idx, ...callers.map(c => c.idx)];
    const cov = tgt.filter(covers);
    if (cov.length) lines.push(`<span class="tag t-bounty">Bounty</span> You cover ${cov.map(i => spot.seats[i].name + ' (' + fmt$(koCash(i)) + ' cash)').join(' and ')}. Two bounties can be in play, but three-way you rarely have more than ~35-40% equity even with a good hand.`);
    else lines.push(`<span class="tag t-bounty">Bounty</span> You don't cover anyone: you can only win chips (the main pot), never a bounty.`);
    if (spot.behind.length) lines.push(`Players still behind you may also wake up with a hand.`);
    lines.push(`<span class="tag t-icm">ICM</span> ${icmContext(spot)} When someone else is already all-in and called, folding lets the others fight; any bust moves you up for free.`);
  }

  // ---- What changed the decision ----
  const pm = Object.fromEntries(v.perModel.map(m => [m.key, m]));
  const lessons = [];
  if (pm.chips.best !== pm.linb.best) lessons.push(pm.linb.best === 'fold'
    ? 'Bounty dynamics turned a chip-EV +EV play into a fold (you are covered, so your head is at risk).'
    : `<b>The bounty made this a ${res.act}.</b> In pure chips it's a fold, but the cash you get for a knockout pays for the risk.`);
  if (pm.linb.best !== pm.full.best) lessons.push(pm.full.best === 'fold'
    ? `<b>ICM made this a fold.</b> Chips you lose are worth more than chips you win, because busting costs you your share of the prize pool.`
    : `ICM actually favors ${res.act === 'call' ? 'calling' : 'shoving'} here: your stack is so short that blinding off costs more than the risk.`);
  if (!lessons.length) lessons.push(`All models agree: this is a ${v.best === 'fold' ? 'fold' : res.act} in chips, with bounties, and with ICM.`);
  return { lines, lessons };
}

function icmContext(spot) {
  const N = spot.playersLeft, paid = spot.payouts.length;
  if (N > paid) {
    const away = N - paid;
    if (away > paid * 0.6) return `${N} players left, ${paid} paid: the money is far away, so ICM is mild and chips ≈ dollars.`;
    if (away <= 5) return `<b>Bubble:</b> ${away} more elimination${away > 1 ? 's' : ''} until the money (min-cash ${fmt$(spot.payouts[paid - 1])}). Short and medium stacks feel maximal pressure.`;
    return `${N} left, ${paid} paid: approaching the bubble, ICM pressure is building.`;
  }
  const next = spot.payouts[N - 2], cur = spot.payouts[N - 1];
  return `${N} left (in the money). Next pay jump: ${fmt$(cur)} → ${fmt$(next)}.`;
}

// ---- Range grids ----
export function rangeGridHtml(range, highlight = -1, cls = '') {
  let h = `<div class="grid mini ${cls}">`;
  for (let i = 0; i < 169; i++) {
    const w = range[i];
    h += `<div class="cell${i === highlight ? ' hl' : ''}" style="--w:${w.toFixed(2)}">${CLASS_NAMES[i]}</div>`;
  }
  return h + '</div>';
}

export function villainRangeInfo(spot) {
  const out = [];
  for (const p of spot.prefix) {
    if (p.act === 'shove') out.push({ label: `${spot.seats[p.idx].name} shove range (${p.pct.toFixed(0)}%)`, range: shoveRange(p.pct) });
    if (p.act === 'call') out.push({ label: `${spot.seats[p.idx].name} call range (${p.pct.toFixed(0)}%)`, range: callRange(p.pct) });
  }
  if (!out.length) for (const b of spot.behind) out.push({ label: `${spot.seats[b.idx].name} calls your shove (${b.pctIn.toFixed(0)}%)`, range: callRange(b.pctIn) });
  return out.map(o => ({ ...o, text: describeRange(o.range), actualPct: rangePct(o.range) }));
}

// EV chart: data[i] = {chips, icm, linb, full}
export function chartHtml(data, modelKey, dpb, highlight, act) {
  let h = '<div class="grid chart">';
  let combos = 0;
  for (let i = 0; i < 169; i++) {
    const d = data[i][modelKey];
    const bb = modelKey === 'chips' ? d : d / dpb;
    if (d > 0) combos += CLASS_COMBOS[i];
    const a = Math.min(1, Math.abs(bb) / 1.5);
    const col = d > 0 ? `rgba(46, 204, 113, ${0.25 + 0.75 * a})` : `rgba(231, 76, 60, ${0.12 + 0.6 * a})`;
    const title = `${CLASS_NAMES[i]}: ${act} − fold = ${bb >= 0 ? '+' : ''}${bb.toFixed(2)}bb` + (modelKey === 'chips' ? '' : ` (${d >= 0 ? '+' : ''}$${d.toFixed(3)})`);
    h += `<div class="cell${i === highlight ? ' hl' : ''}" style="background:${col}" title="${title}" data-i="${i}">${CLASS_NAMES[i]}</div>`;
  }
  h += '</div>';
  return { html: h, pct: combos / 1326 * 100 };
}

export { remainingPrize };
