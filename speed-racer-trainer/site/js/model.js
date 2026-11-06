// Tournament model: payouts, ICM (exact + Monte Carlo), progressive-bounty equity,
// all-in hand resolution with side pots, and the Monte Carlo spot solver.
import {
  evalCards, classOf, rangeFromPct, makeSampler, mulberry32,
} from './poker.js';
import { SHOVE_ORDER, CALL_ORDER } from './ranking.js';

export const POSITIONS = {
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  5: ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  2: ['SB', 'BB'],
};

// ---------------- Villain profiles ----------------
// shove: % of hands shoved when folded to them at ~10bb. call: % called vs a ~10bb shove.
export const PROFILES = {
  nit: { label: 'Nit', short: 'NIT', vpip: 13, pfr: 10, shove: { UTG: 7, HJ: 9, CO: 12, BTN: 17, SB: 24 }, call: 9 },
  reg: { label: 'Reg', short: 'REG', vpip: 23, pfr: 19, shove: { UTG: 11, HJ: 14, CO: 19, BTN: 28, SB: 40 }, call: 15 },
  fish: { label: 'Loose fish', short: 'FISH', vpip: 45, pfr: 14, shove: { UTG: 17, HJ: 20, CO: 25, BTN: 32, SB: 42 }, call: 30 },
  maniac: { label: 'Maniac', short: 'MAN', vpip: 62, pfr: 50, shove: { UTG: 32, HJ: 38, CO: 46, BTN: 60, SB: 75 }, call: 38 },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function shovePct(profileKey, pos, stackBB) {
  const p = PROFILES[profileKey];
  const base = p.shove[pos] ?? p.shove.SB;
  return clamp(base * clamp(Math.pow(10 / Math.max(stackBB, 1), 0.45), 0.55, 2.2), 1, 100);
}

// ctx: {riskBB, covers, callersAhead, isBB, bubble}
export function callPct(profileKey, ctx) {
  const p = PROFILES[profileKey];
  let pct = p.call;
  pct *= clamp(Math.pow(10 / Math.max(ctx.riskBB, 0.5), 0.55), 0.6, 2.6);
  pct *= ctx.covers ? 1.3 : 0.9; // players widen when they can win a bounty
  if (ctx.isBB) pct *= 1.2;
  if (ctx.callersAhead > 0) pct *= 0.55;
  if (ctx.bubble && !ctx.covers && profileKey !== 'fish' && profileKey !== 'maniac') pct *= 0.75;
  return clamp(pct, 1, 100);
}

// Chips a player can actually put in the middle this hand (the BB ante is dead money).
export function liveRoom(spot, i) {
  const s = spot.seats[i];
  return s.stack - (s.pos === 'BB' ? Math.min(spot.ante, s.stack) : 0);
}
// Does player a cover player b (i.e. can a bust b and win the bounty)?
export function covers(spot, a, b) { return liveRoom(spot, a) >= liveRoom(spot, b) - 1e-9; }

export function shoveRange(pct) { return rangeFromPct(SHOVE_ORDER, pct); }
export function callRange(pct) { return rangeFromPct(CALL_ORDER, pct); }

// ---------------- Payouts ----------------
export function makePayouts(entries, prizePerEntry, paidPct = 0.15) {
  const P = entries * prizePerEntry;
  const paid = Math.max(1, Math.round(entries * paidPct));
  if (paid === 1) return [P];
  const target = Math.min(2.0 * prizePerEntry, 0.8 * P / paid);
  const share = a => {
    let s = 0;
    for (let k = 1; k <= paid; k++) s += Math.pow(k, -a);
    return Math.pow(paid, -a) / s;
  };
  let lo = 0.01, hi = 4;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (share(m) * P > target) lo = m; else hi = m;
  }
  const a = (lo + hi) / 2;
  let s = 0;
  for (let k = 1; k <= paid; k++) s += Math.pow(k, -a);
  const pays = [];
  for (let k = 1; k <= paid; k++) pays.push(Math.round(P * Math.pow(k, -a) / s * 100) / 100);
  return pays;
}

// ---------------- ICM ----------------
// Hero equity of the regular prize pool. Exact Harville for <= 9 players, otherwise
// Monte Carlo with an exponential race (equivalent to Harville) using common random
// numbers so that different outcome states are compared on the same samples.
function harvilleHero(stacks, hero, pays) {
  const n = stacks.length;
  const memo = new Float64Array(1 << n).fill(NaN);
  const full = (1 << n) - 1;
  const f = mask => {
    if (!isNaN(memo[mask])) return memo[mask];
    let tot = 0, cnt = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) { tot += stacks[i]; cnt++; }
    const place = n - cnt;
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      const p = stacks[i] / tot;
      if (i === hero) v += p * (pays[place] || 0);
      else v += p * f(mask & ~(1 << i));
    }
    memo[mask] = v;
    return v;
  };
  return f(full);
}

export function makeIcmContext(spot) {
  const N = spot.playersLeft;
  const T = spot.seats.length;
  const pays = spot.payouts;
  const paid = pays.length;
  const others = spot.others.stacks;
  const M = others.length;
  const ctx = { N, T, pays, paid, others, M };
  if (N <= 9) { ctx.exact = true; return ctx; }
  const rng = mulberry32(spot.seed ^ 0x9e3779b9);
  const keep = Math.min(M, paid);
  const S = Math.max(800, Math.min(4000, Math.floor(4e6 / Math.max(M, 1))));
  ctx.S = S; ctx.keep = keep;
  ctx.tableE = new Float64Array(S * T);
  ctx.otherKeys = new Float64Array(S * keep);
  const tmp = new Float64Array(M);
  for (let s = 0; s < S; s++) {
    for (let t = 0; t < T; t++) ctx.tableE[s * T + t] = -Math.log(1 - rng());
    for (let m = 0; m < M; m++) tmp[m] = -Math.log(1 - rng()) / others[m];
    tmp.sort();
    for (let k = 0; k < keep; k++) ctx.otherKeys[s * keep + k] = tmp[k];
  }
  return ctx;
}

// finalStacks: table stacks after the hand (0 = busted). startStacks: before the hand.
export function heroIcm(ctx, heroIdx, finalStacks, startStacks) {
  const { N, T, pays } = ctx;
  const busted = [];
  for (let t = 0; t < T; t++) if (finalStacks[t] <= 1e-9) busted.push(t);
  const k = busted.length;
  if (finalStacks[heroIdx] <= 1e-9) {
    // Busted players take places N..N-k+1; bigger starting stack finishes higher.
    let place = N, ties = 0;
    for (const t of busted) {
      if (t === heroIdx) continue;
      if (startStacks[t] < startStacks[heroIdx]) place--;
      else if (startStacks[t] === startStacks[heroIdx]) ties++;
    }
    let v = 0;
    for (let i = 0; i <= ties; i++) v += pays[place - i - 1] || 0;
    return v / (ties + 1);
  }
  const alive = N - k;
  if (alive <= 9) {
    const st = [], heroPos = { i: -1 };
    for (let t = 0; t < T; t++) if (finalStacks[t] > 1e-9) { if (t === heroIdx) heroPos.i = st.length; st.push(finalStacks[t]); }
    for (const s of ctx.others) st.push(s);
    return harvilleHero(st, heroPos.i, pays);
  }
  const { S, keep, tableE, otherKeys } = ctx;
  const hs = finalStacks[heroIdx];
  let sum = 0;
  for (let s = 0; s < S; s++) {
    const hk = tableE[s * T + heroIdx] / hs;
    let cnt = 0;
    for (let t = 0; t < T; t++) {
      if (t === heroIdx || finalStacks[t] <= 1e-9) continue;
      if (tableE[s * T + t] / finalStacks[t] < hk) cnt++;
    }
    let lo = 0, hi = keep;
    const base = s * keep;
    while (lo < hi) { const m = (lo + hi) >> 1; if (otherKeys[base + m] < hk) lo = m + 1; else hi = m; }
    cnt += lo;
    sum += pays[cnt] || 0;
  }
  return sum / S;
}

export function remainingPrize(pays, alive) {
  let s = 0;
  for (let i = 0; i < Math.min(alive, pays.length); i++) s += pays[i];
  return s;
}

// ---------------- Spot runtime ----------------
// spot = {
//   playersLeft, payouts[], koShare, sb, bb(=1), ante, seed,
//   seats: [{pos, stack, head, profile, name}],   (stacks in big blinds, preflop action order)
//   heroIdx, heroCards?: [c1,c2],
//   prefix: [{idx, act:'fold'|'shove'|'call', pct}],
//   behind: [{idx, pctIn, pctOut}],   (call % vs hero's all-in / vs the original shove if hero folds)
//   others: {stacks:[], heads:[]}
// }
export function prepareSpot(spot) {
  const T = spot.seats.length;
  const rt = {
    spot, T,
    icm: makeIcmContext(spot),
    memo: new Map(),
    rangeCache: new Map(),
    dead: new Uint8Array(52),
    cards: new Int32Array(7),
    startStacks: spot.seats.map(s => s.stack),
    C: spot.seats.reduce((a, s) => a + s.stack, 0) + spot.others.stacks.reduce((a, b) => a + b, 0),
    otherHeads: spot.others.heads.reduce((a, b) => a + b, 0),
    prefixSamplers: {},
  };
  for (const p of spot.prefix) {
    if (p.act === 'shove') rt.prefixSamplers[p.idx] = makeSampler(shoveRange(p.pct));
    if (p.act === 'call') rt.prefixSamplers[p.idx] = makeSampler(callRange(p.pct));
  }
  // posts
  rt.dead0 = new Float64Array(T); rt.blind0 = new Float64Array(T);
  spot.seats.forEach((s, i) => {
    if (s.pos === 'BB') { rt.dead0[i] = Math.min(spot.ante, s.stack); rt.blind0[i] = Math.min(spot.bb, s.stack - rt.dead0[i]); }
    if (s.pos === 'SB') rt.blind0[i] = Math.min(spot.sb, s.stack);
  });
  rt.hasPriorShove = spot.prefix.some(p => p.act === 'shove');
  return rt;
}

function getCallRange(rt, pct) {
  const key = Math.round(pct * 10);
  let r = rt.rangeCache.get(key);
  if (!r) { r = callRange(key / 10); rt.rangeCache.set(key, r); }
  return r;
}

// Evaluate a resolved outcome for the hero under four models.
function evalState(rt, finalStacks, heads, heroCash) {
  const key = finalStacks.map(x => x.toFixed(3)).join(',') + '|' + heads.map(x => x.toFixed(3)).join(',') + '|' + heroCash.toFixed(4);
  let v = rt.memo.get(key);
  if (v) return v;
  const sp = rt.spot, h = sp.heroIdx;
  const hs = finalStacks[h];
  let alive = sp.playersLeft;
  for (const s of finalStacks) if (s <= 1e-9) alive--;
  const icm = heroIcm(rt.icm, h, finalStacks, rt.startStacks);
  const headsLeft = heads.reduce((a, b) => a + b, 0) + rt.otherHeads;
  const share = hs / rt.C;
  // Chip-linear prize equity: everyone alive is guaranteed the current min cash, the rest is split by chips.
  const floor = sp.payouts[alive - 1] || 0;
  const lin = hs > 1e-9 ? floor + share * (remainingPrize(sp.payouts, alive) - alive * floor) : icm;
  const bnt = share * headsLeft + heroCash;
  v = { chips: hs, icm, lin, bnt, full: icm + bnt, linb: lin + bnt, key };
  rt.memo.set(key, v);
  return v;
}

export const MODELS = [
  { key: 'chips', label: 'Chip EV', unit: 'bb', desc: 'Chips only: no bounty, no ICM' },
  { key: 'icm', label: 'ICM only', unit: '$', desc: 'Prize-pool equity, bounties ignored' },
  { key: 'linb', label: 'Chips + bounty', unit: '$', desc: 'Chips linear in $, bounties counted' },
  { key: 'full', label: 'ICM + bounty', unit: '$', desc: 'Full model (the answer)' },
];

// Resolve one all-in confrontation. inHand: Int8Array; holes: array of [c1,c2] or null.
// Returns {final, heads, heroCash, heroShare (pot share won at showdown, for HU equity)}.
function resolve(rt, inHand, live, board, holes, rng) {
  const sp = rt.spot, T = rt.T;
  const final = new Array(T);
  const heads = sp.seats.map(s => s.head);
  let pot = 0;
  for (let i = 0; i < T; i++) final[i] = sp.seats[i].stack - rt.dead0[i] - live[i];
  const deadMoney = rt.dead0.reduce((a, b) => a + b, 0);
  const players = [];
  for (let i = 0; i < T; i++) if (inHand[i]) players.push(i);
  let heroCash = 0;
  if (players.length === 1) {
    let total = deadMoney;
    for (let i = 0; i < T; i++) total += live[i];
    final[players[0]] += total;
    return { final, heads, heroCash, sd: false };
  }
  // values
  const vals = new Array(T).fill(-1);
  const cs = rt.cards;
  for (let k = 0; k < 5; k++) cs[k + 2] = board[k];
  for (const i of players) { cs[0] = holes[i][0]; cs[1] = holes[i][1]; vals[i] = evalCards(cs, 7); }
  const levels = [...new Set(players.map(i => live[i]))].sort((a, b) => a - b);
  let prev = 0;
  const potWinners = []; // per level
  for (let li = 0; li < levels.length; li++) {
    const L = levels[li];
    let amt = 0;
    for (let i = 0; i < T; i++) amt += Math.min(live[i], L) - Math.min(live[i], prev);
    if (li === 0) amt += deadMoney;
    if (li === levels.length - 1) for (let i = 0; i < T; i++) if (!inHand[i] && live[i] > L) amt += live[i] - L;
    const elig = players.filter(i => live[i] >= L - 1e-12);
    let best = -1;
    for (const i of elig) best = Math.max(best, vals[i]);
    const winners = elig.filter(i => vals[i] === best);
    for (const w of winners) final[w] += amt / winners.length;
    potWinners.push(winners);
    prev = L;
  }
  // bounties
  for (const b of players) {
    if (final[b] > 1e-9) continue;
    const li = levels.indexOf(live[b]);
    const winners = potWinners[li];
    const head = heads[b];
    for (const w of winners) {
      const cash = sp.koShare * head / winners.length;
      heads[w] += (1 - sp.koShare) * head / winners.length;
      if (w === sp.heroIdx) heroCash += cash;
    }
    heads[b] = 0;
    final[b] = 0;
  }
  return { final, heads, heroCash, sd: true, vals, players };
}

// Run Monte Carlo for one hero action. heroCards may be null (only valid for 'fold').
// Returns accumulator with mean values per model and diagnostic stats.
export function simulate(rt, action, heroCards, iters, rng, acc) {
  const sp = rt.spot, T = rt.T, h = sp.heroIdx;
  acc = acc || newAcc();
  const dead = rt.dead;
  const heroIn = action !== 'fold';
  const holes = new Array(T).fill(null);
  const inHand = new Int8Array(T);
  const live = new Float64Array(T);
  const board = new Int32Array(5);

  // Hero folds and no shove happened (open-fold): deterministic state.
  if (!heroIn && !rt.hasPriorShove) {
    const final = rt.startStacks.slice();
    final[h] -= rt.dead0[h] + rt.blind0[h];
    const receiver = sp.seats.findIndex((s, i) => i !== h && s.pos === 'BB') >= 0
      ? sp.seats.findIndex((s, i) => i !== h && s.pos === 'BB')
      : sp.seats.findIndex((s, i) => i !== h && s.pos === 'SB');
    if (receiver >= 0) final[receiver] += rt.dead0[h] + rt.blind0[h];
    const v = evalState(rt, final, sp.seats.map(s => s.head), 0);
    addAcc(acc, v, iters, { folded: true });
    return acc;
  }

  for (let it = 0; it < iters; it++) {
    dead.fill(0);
    inHand.fill(0);
    for (let i = 0; i < T; i++) { holes[i] = null; live[i] = rt.blind0[i]; }
    if (heroCards) { dead[heroCards[0]] = dead[heroCards[1]] = 1; }
    let betLevel = 0, nIn = 0, ok = true;
    for (const p of sp.prefix) {
      if (p.act === 'fold') continue;
      const hc = rt.prefixSamplers[p.idx](dead, rng);
      if (!hc) { ok = false; break; }
      holes[p.idx] = hc; dead[hc[0]] = dead[hc[1]] = 1; inHand[p.idx] = 1; nIn++;
      const room = sp.seats[p.idx].stack - rt.dead0[p.idx];
      if (p.act === 'shove') { live[p.idx] = room; betLevel = Math.max(betLevel, room); }
      else live[p.idx] = Math.min(room, betLevel);
    }
    if (!ok) continue;
    if (heroIn) {
      holes[h] = heroCards; inHand[h] = 1; nIn++;
      const room = sp.seats[h].stack - rt.dead0[h];
      if (betLevel === 0) { live[h] = room; betLevel = room; } else live[h] = Math.min(room, betLevel);
    }
    const heroCommitted = heroIn;
    let callersAfter = 0;
    for (const b of sp.behind) {
      // draw a random hand for this player; they continue if it is in their calling range
      let c1, c2;
      do { c1 = (rng() * 52) | 0; } while (dead[c1]);
      do { c2 = (rng() * 52) | 0; } while (dead[c2] || c2 === c1);
      let pct = heroCommitted ? b.pctIn : b.pctOut;
      if (nIn >= 2 || callersAfter > 0) pct *= 0.6;
      const r = getCallRange(rt, pct);
      if (rng() < r[classOf(c1, c2)]) {
        holes[b.idx] = [c1, c2]; dead[c1] = dead[c2] = 1; inHand[b.idx] = 1; nIn++; callersAfter++;
        const room = sp.seats[b.idx].stack - rt.dead0[b.idx];
        live[b.idx] = Math.min(room, betLevel);
      }
    }
    // Uncalled bets are returned through the side-pot logic (single eligible player).
    if (nIn >= 2) {
      for (let k = 0; k < 5; k++) {
        let c; do { c = (rng() * 52) | 0; } while (dead[c]);
        dead[c] = 1; board[k] = c;
      }
    }
    const res = resolve(rt, inHand, live, board, holes, rng);
    const v = evalState(rt, res.final, res.heads, res.heroCash);
    const st = { heroIn, nIn, sd: res.sd };
    if (heroIn) {
      st.calledBy = nIn - 1;
      st.busted = res.final[h] <= 1e-9;
      st.ko = res.heroCash > 0;
      if (res.sd && nIn === 2) {
        const opp = res.players.find(i => i !== h);
        st.hu = res.vals[h] > res.vals[opp] ? 1 : res.vals[h] === res.vals[opp] ? 0.5 : 0;
        st.huOpp = opp;
        st.state = v;
      }
    }
    addAcc(acc, v, 1, st);
  }
  return acc;
}

export function newAcc() {
  return {
    n: 0, chips: 0, icm: 0, linb: 0, full: 0, lin: 0, bnt: 0,
    uncontested: 0, called: 0, multiway: 0, busted: 0, ko: 0,
    huN: 0, huEq: 0, huWin: null, huLose: null, huTie: null, huOppSet: new Set(),
  };
}
function addAcc(acc, v, w, st) {
  acc.n += w;
  acc.chips += v.chips * w; acc.icm += v.icm * w; acc.linb += v.linb * w; acc.full += v.full * w;
  acc.lin += v.lin * w; acc.bnt += v.bnt * w;
  if (st.heroIn) {
    if (st.calledBy === 0 && !st.sd) acc.uncontested += w;
    if (st.nIn >= 2) acc.called += w;
    if (st.nIn >= 3) acc.multiway += w;
    if (st.busted) acc.busted += w;
    if (st.ko) acc.ko += w;
    if (st.hu !== undefined) {
      acc.huN += w; acc.huEq += st.hu * w; acc.huOppSet.add(st.huOpp);
      if (st.hu === 1 && !acc.huWin) acc.huWin = st.state;
      if (st.hu === 0 && !acc.huLose) acc.huLose = st.state;
    }
  }
}
export function meanAcc(acc) {
  const n = acc.n || 1;
  return {
    n: acc.n, chips: acc.chips / n, icm: acc.icm / n, linb: acc.linb / n, full: acc.full / n,
    lin: acc.lin / n, bnt: acc.bnt / n,
    uncontested: acc.uncontested / n, called: acc.called / n, multiway: acc.multiway / n,
    busted: acc.busted / n, ko: acc.ko / n,
    huShare: acc.huN / n, huEq: acc.huN ? acc.huEq / acc.huN : null,
    huWin: acc.huWin, huLose: acc.huLose, huSingleOpp: acc.huOppSet.size === 1,
  };
}

export function heroActionName(spot) {
  return spot.prefix.some(p => p.act === 'shove') ? 'call' : 'shove';
}

// Full solve of the spot for the hero's actual hand.
export function solveSpot(rt, heroCards, iters = 20000, seed = 1) {
  const act = heroActionName(rt.spot);
  const rngF = mulberry32(seed), rngA = mulberry32(seed + 77);
  const fold = meanAcc(simulate(rt, 'fold', heroCards, rt.spot.behind.length || rt.spot.prefix.filter(p => p.act === 'call').length ? Math.round(iters / 2) : 1, rngF));
  const go = meanAcc(simulate(rt, act, heroCards, iters, rngA));
  return { act, fold, go };
}

// Dollar value of one big blind if chips were linear (for converting $ differences to bb).
export function dollarsPerBB(rt) {
  const sp = rt.spot;
  const heads = sp.seats.reduce((a, s) => a + s.head, 0) + rt.otherHeads;
  return (remainingPrize(sp.payouts, sp.playersLeft) + heads) / rt.C;
}
