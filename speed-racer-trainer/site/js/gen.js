// Random training-spot generator for 6-max progressive-bounty "Speed Racer" style tournaments.
import { mulberry32, combosOfClass } from './poker.js';
import {
  POSITIONS, PROFILES, shovePct, callPct, makePayouts, prepareSpot, solveSpot,
} from './model.js';

export const DEFAULT_CFG = {
  buyIn: 2.5,
  prizePerEntry: 1.30, // goes to the regular prize pool
  startBounty: 1.00,   // starting head; a KO pays koShare of it in cash
  koShare: 0.5,
  entries: 400,
  paidPct: 0.15,
  startBB: 10,
  ante: 1,             // big-blind ante, in big blinds
};

export const STAGES = {
  early: { label: 'Early (level 1-3)', hint: 'Far from the money: chips ≈ $, bounties are huge relative to stacks.' },
  mid: { label: 'Mid (pre-bubble)', hint: 'Field has thinned; stacks are short, bounties have grown.' },
  bubble: { label: 'Bubble', hint: 'A few players from the money: ICM pressure is at its peak.' },
  itm: { label: 'In the money', hint: 'Pay jumps matter, but bounties are big again.' },
  ft: { label: 'Final table', hint: '6 or fewer left: steep pay jumps, big heads.' },
};
export const SPOT_TYPES = {
  call: { label: 'Facing a shove' },
  open: { label: 'Open-shove or fold' },
  multi: { label: 'Shove + call in front' },
};

function lognorm(rng, sigma) {
  const u = 1 - rng(), v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.exp(sigma * z - sigma * sigma / 2);
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function pickWeighted(rng, obj) {
  const entries = Object.entries(obj);
  let tot = entries.reduce((a, [, w]) => a + w, 0), x = rng() * tot;
  for (const [k, w] of entries) { if ((x -= w) <= 0) return k; }
  return entries[0][0];
}
const round1 = x => Math.round(x * 10) / 10;
const NAMES = ['VelvetAce', 'RiverRat88', 'ChipNinja', 'TurboTina', 'Shovelord', 'NitWit', 'KO_Kong', 'Donkasaurus',
  'FoldPlz', 'MrMinRaise', 'BountyBabe', 'IcmIggy', 'PushBot', 'LuckBox', 'AceMagnet', 'SuitedSam', 'Ragequit',
  'TiltWhisper', 'SpeedyG', 'Zoomer42', 'CoolerKing', 'HeadHunter', 'StackAttack', 'BlindThief'];

function headFor(rng, cfg, stack, startChipsNow) {
  const growth = Math.max(1, 0.5 + 0.5 * stack / startChipsNow);
  return Math.round(cfg.startBounty * growth * (0.85 + 0.3 * rng()) * 100) / 100;
}

// Build a spot (without the hero hand chosen). opts: {stages:[], types:[]}
export function generateSpot(cfg, opts, seed) {
  const rng = mulberry32(seed);
  const payouts = makePayouts(cfg.entries, cfg.prizePerEntry, cfg.paidPct);
  const paid = payouts.length;
  const stage = pick(rng, opts.stages);
  let type = pick(rng, opts.types);

  let N, avg, sigma;
  if (stage === 'early') { N = Math.round(cfg.entries * (0.75 + 0.25 * rng())); avg = cfg.startBB * (cfg.entries / N); sigma = 0.3; }
  else if (stage === 'mid') { N = Math.round(paid * (1.4 + 1.6 * rng())); avg = 9 + 6 * rng(); sigma = 0.6; }
  else if (stage === 'bubble') { N = paid + 1 + Math.floor(rng() * 4); avg = 7 + 6 * rng(); sigma = 0.6; }
  else if (stage === 'itm') { N = Math.max(10, Math.round(paid * (0.35 + 0.55 * rng()))); avg = 7 + 6 * rng(); sigma = 0.65; }
  else { N = 3 + Math.floor(rng() * 4); avg = 9 + 10 * rng(); sigma = 0.6; }
  N = Math.min(N, cfg.entries);
  const T = Math.min(6, N);
  if (type === 'multi' && T < 3) type = 'call';
  const positions = POSITIONS[T];
  const C = N * avg;                       // total chips in play, in current big blinds
  const startChipsNow = C / cfg.entries;   // value of a starting stack in current big blinds

  // table stacks
  let stacks = [];
  for (let i = 0; i < T; i++) stacks.push(Math.max(1.6, avg * lognorm(rng, sigma)));
  if (stage === 'early' && rng() < 0.5) stacks = stacks.map(() => startChipsNow * (0.8 + 0.4 * rng()));
  stacks = stacks.map(round1);
  let tableSum = stacks.reduce((a, b) => a + b, 0);
  const M = N - T;
  let others = [];
  if (M === 0) {
    const f = C / tableSum; // final table: normalise
    stacks = stacks.map(s => s * f);
    tableSum = C;
  } else {
    const minOthers = M * 0.8;
    if (C - tableSum < minOthers) { const f = (C - minOthers) / tableSum; stacks = stacks.map(s => s * f); tableSum = C - minOthers; }
    let raw = [];
    for (let i = 0; i < M; i++) raw.push(lognorm(rng, sigma));
    const rs = raw.reduce((a, b) => a + b, 0);
    others = raw.map(x => x / rs * (C - tableSum));
  }
  const heads = stacks.map(s => headFor(rng, cfg, s, startChipsNow));
  const otherHeads = others.map(s => headFor(rng, cfg, s, startChipsNow));

  // seats
  const names = [...NAMES].sort(() => rng() - 0.5);
  const seats = positions.map((pos, i) => ({
    pos, stack: stacks[i], head: heads[i], name: names[i],
    profile: pickWeighted(rng, { reg: 40, fish: 30, nit: 15, maniac: 15 }),
  }));

  // hero / action layout
  let heroIdx, prefix = [], shoverIdx = -1, callerIdx = -1;
  if (type === 'open') {
    heroIdx = Math.floor(rng() * (T - 1));
    if (rng() < 0.35 && T >= 3) heroIdx = T - 2 - (rng() < 0.5 ? 0 : 1); // extra BTN / SB spots
  } else if (type === 'call') {
    heroIdx = rng() < 0.55 ? T - 1 : 1 + Math.floor(rng() * (T - 1));
    shoverIdx = Math.floor(rng() * heroIdx);
  } else {
    heroIdx = rng() < 0.6 ? T - 1 : 2 + Math.floor(rng() * (T - 2));
    shoverIdx = Math.floor(rng() * (heroIdx - 1));
    callerIdx = shoverIdx + 1 + Math.floor(rng() * (heroIdx - shoverIdx - 1));
  }
  seats[heroIdx].name = 'You';
  seats[heroIdx].profile = 'hero';
  const bubble = stage === 'bubble' || stage === 'ft';
  const room = i => seats[i].stack - (seats[i].pos === 'BB' ? cfg.ante : 0);

  for (let i = 0; i < heroIdx; i++) {
    if (i === shoverIdx) prefix.push({ idx: i, act: 'shove', pct: round1(shovePct(seats[i].profile, seats[i].pos, seats[i].stack)) });
    else if (i === callerIdx) {
      const risk = Math.min(room(i), room(shoverIdx));
      prefix.push({ idx: i, act: 'call', pct: round1(callPct(seats[i].profile, { riskBB: risk, covers: room(i) >= room(shoverIdx), callersAhead: 0, isBB: seats[i].pos === 'BB', bubble })) });
    } else prefix.push({ idx: i, act: 'fold' });
  }
  const behind = [];
  for (let i = heroIdx + 1; i < T; i++) {
    const base = shoverIdx >= 0 ? room(shoverIdx) : 0;
    const levelIn = Math.max(base, room(heroIdx));
    const riskIn = Math.min(room(i), levelIn);
    const coversIn = room(i) >= room(heroIdx);
    const ahead = callerIdx >= 0 ? 1 : 0;
    const pctIn = callPct(seats[i].profile, { riskBB: riskIn, covers: coversIn, callersAhead: ahead + (shoverIdx >= 0 ? 1 : 0), isBB: seats[i].pos === 'BB', bubble });
    let pctOut = 0;
    if (shoverIdx >= 0) {
      pctOut = callPct(seats[i].profile, { riskBB: Math.min(room(i), base), covers: room(i) >= room(shoverIdx), callersAhead: ahead, isBB: seats[i].pos === 'BB', bubble });
    }
    behind.push({ idx: i, pctIn: round1(pctIn), pctOut: round1(pctOut) });
  }

  return {
    seed, stage, type, cfg: { ...cfg },
    playersLeft: N, payouts, koShare: cfg.koShare, sb: 0.5, bb: 1, ante: cfg.ante,
    seats, heroIdx, prefix, behind,
    others: { stacks: others, heads: otherHeads },
    avgStack: avg, startChipsNow,
  };
}

// Pick a hero hand. With borderline=true we prefer hands near the call/fold threshold.
export function chooseHeroHand(spot, borderline, seed) {
  const rng = mulberry32(seed * 31 + 7);
  const deal = () => {
    const a = Math.floor(rng() * 52);
    let b; do { b = Math.floor(rng() * 52); } while (b === a);
    return [a, b];
  };
  if (!borderline || rng() < 0.25) return deal();
  const rt = prepareSpot(spot);
  let best = null, bestScore = Infinity;
  for (let k = 0; k < 4; k++) {
    const cards = deal();
    const r = solveSpot(rt, cards, 1500, seed + k);
    const scale = Math.abs(r.fold.full) + 0.5;
    const score = Math.abs(r.go.full - r.fold.full) / scale;
    if (score < bestScore) { bestScore = score; best = cards; }
  }
  return best;
}

export function randomComboOfClass(idx, rng) {
  const list = combosOfClass(idx);
  return list[Math.floor(rng() * list.length)].slice();
}

export { PROFILES };
