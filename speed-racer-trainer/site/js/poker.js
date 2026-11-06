// Card primitives, a fast 7-card evaluator, hand classes and ranges.
// Card encoding: c = rank*4 + suit, rank 0..12 = 2..A, suit 0..3.

export const RANKS = '23456789TJQKA';
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];

export function cardStr(c) { return RANKS[c >> 2] + 'shdc'[c & 3]; }

// ---------- RNG ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Evaluator ----------
function popcnt(x) {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  return (((x + (x >> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
}
function straightHigh(m) {
  m = (m << 1) | ((m >> 12) & 1); // bit0 = ace-low
  for (let h = 13; h >= 4; h--) if (((m >> (h - 4)) & 31) === 31) return h - 1;
  return -1;
}
function topBits(m, k) {
  let v = 0, n = 0;
  for (let r = 12; r >= 0 && n < k; r--) if (m & (1 << r)) { v = (v << 4) | r; n++; }
  while (n < k) { v <<= 4; n++; }
  return v;
}
const CNT = new Int32Array(13);
const SM = new Int32Array(4);

// Returns an integer; bigger is better. category<<20 | kickers.
export function evalCards(cs, n) {
  SM[0] = SM[1] = SM[2] = SM[3] = 0;
  CNT.fill(0);
  let rm = 0;
  for (let i = 0; i < n; i++) {
    const c = cs[i], r = c >> 2;
    SM[c & 3] |= 1 << r;
    CNT[r]++;
    rm |= 1 << r;
  }
  let fm = 0;
  for (let s = 0; s < 4; s++) if (popcnt(SM[s]) >= 5) { fm = SM[s]; break; }
  if (fm) {
    const sh = straightHigh(fm);
    if (sh >= 0) return (8 << 20) | (sh << 16);
  }
  let q = -1, t1 = -1, t2 = -1, p1 = -1, p2 = -1;
  for (let r = 12; r >= 0; r--) {
    const k = CNT[r];
    if (k === 4) q = r;
    else if (k === 3) { if (t1 < 0) t1 = r; else if (t2 < 0) t2 = r; }
    else if (k === 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; }
  }
  if (q >= 0) return (7 << 20) | (q << 16) | (topBits(rm & ~(1 << q), 1) << 12);
  if (t1 >= 0 && (t2 >= 0 || p1 >= 0)) return (6 << 20) | (t1 << 16) | (Math.max(t2, p1) << 12);
  if (fm) return (5 << 20) | topBits(fm, 5);
  const st = straightHigh(rm);
  if (st >= 0) return (4 << 20) | (st << 16);
  if (t1 >= 0) return (3 << 20) | (t1 << 16) | (topBits(rm & ~(1 << t1), 2) << 8);
  if (p1 >= 0 && p2 >= 0) return (2 << 20) | (p1 << 16) | (p2 << 12) | (topBits(rm & ~(1 << p1) & ~(1 << p2), 1) << 8);
  if (p1 >= 0) return (1 << 20) | (p1 << 16) | (topBits(rm & ~(1 << p1), 3) << 4);
  return topBits(rm, 5);
}

// ---------- Hand classes (13x13 grid) ----------
// idx = row*13+col; row/col 0 = Ace. Diagonal = pairs, upper-right = suited, lower-left = offsuit.
export const CLASS_NAMES = [];
export const CLASS_COMBOS = new Int32Array(169);
const CLASS_COMBO_LIST = [];
for (let i = 0; i < 13; i++) {
  for (let j = 0; j < 13; j++) {
    const ri = 12 - i, rj = 12 - j;
    const list = [];
    if (i === j) {
      CLASS_NAMES.push(RANKS[ri] + RANKS[ri]);
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) list.push([ri * 4 + a, ri * 4 + b]);
    } else if (i < j) {
      CLASS_NAMES.push(RANKS[ri] + RANKS[rj] + 's');
      for (let s = 0; s < 4; s++) list.push([ri * 4 + s, rj * 4 + s]);
    } else {
      CLASS_NAMES.push(RANKS[rj] + RANKS[ri] + 'o');
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== b) list.push([rj * 4 + a, ri * 4 + b]);
    }
    CLASS_COMBOS[i * 13 + j] = list.length;
    CLASS_COMBO_LIST.push(list);
  }
}
export function combosOfClass(idx) { return CLASS_COMBO_LIST[idx]; }

const CLASS_OF = new Int16Array(52 * 52);
for (let a = 0; a < 52; a++) for (let b = 0; b < 52; b++) {
  if (a === b) continue;
  const ra = a >> 2, rb = b >> 2, hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  let row, col;
  if (ra === rb) { row = col = 12 - hi; }
  else if ((a & 3) === (b & 3)) { row = 12 - hi; col = 12 - lo; }
  else { row = 12 - lo; col = 12 - hi; }
  CLASS_OF[a * 52 + b] = row * 13 + col;
}
export function classOf(a, b) { return CLASS_OF[a * 52 + b]; }
export function classIndexByName(name) { return CLASS_NAMES.indexOf(name); }

// ---------- Ranges ----------
// A range is a Float32Array(169) of weights 0..1.
export function rangeFromPct(order, pct) {
  const r = new Float32Array(169);
  const target = Math.max(0, Math.min(100, pct)) / 100 * 1326;
  let acc = 0;
  for (const idx of order) {
    if (acc >= target - 1e-9) break;
    const c = CLASS_COMBOS[idx];
    const w = Math.min(1, (target - acc) / c);
    r[idx] = w;
    acc += c * w;
  }
  return r;
}
export function rangePct(r) {
  let s = 0;
  for (let i = 0; i < 169; i++) s += r[i] * CLASS_COMBOS[i];
  return s / 1326 * 100;
}

// Weighted combo sampler for a range, with rejection of dead cards.
export function makeSampler(range) {
  const c1 = [], c2 = [], cum = [];
  let tot = 0;
  for (let i = 0; i < 169; i++) {
    if (range[i] <= 0) continue;
    for (const [a, b] of CLASS_COMBO_LIST[i]) { tot += range[i]; c1.push(a); c2.push(b); cum.push(tot); }
  }
  const C1 = Int8Array.from(c1), C2 = Int8Array.from(c2), CUM = Float64Array.from(cum);
  return function sample(dead, rng) {
    if (!CUM.length) return null;
    for (let tries = 0; tries < 200; tries++) {
      const x = rng() * tot;
      let lo = 0, hi = CUM.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (CUM[m] < x) lo = m + 1; else hi = m; }
      if (!dead[C1[lo]] && !dead[C2[lo]]) return [C1[lo], C2[lo]];
    }
    return null;
  };
}

// Human readable compact description of a range (e.g. "22+, A2s+, KTo+").
export function describeRange(range) {
  const inR = i => range[i] >= 0.5;
  const parts = [];
  // pairs
  let run = [];
  const flush = (arr, fmt) => { if (arr.length) parts.push(fmt(arr)); };
  for (let i = 0; i < 13; i++) {
    if (inR(i * 13 + i)) run.push(i); else { flush(run, a => groupPairs(a)); run = []; }
  }
  flush(run, a => groupPairs(a));
  for (const suited of [true, false]) {
    for (let hi = 0; hi < 12; hi++) {
      let seq = [];
      const out = () => {
        if (!seq.length) return;
        const H = RANKS[12 - hi], s = suited ? 's' : 'o';
        const top = seq[0], bot = seq[seq.length - 1];
        if (top === hi + 1 && seq.length > 1) parts.push(H + RANKS[12 - bot] + s + '+');
        else if (seq.length === 1) parts.push(H + RANKS[12 - top] + s);
        else parts.push(H + RANKS[12 - top] + s + '-' + H + RANKS[12 - bot] + s);
        seq = [];
      };
      for (let lo = hi + 1; lo < 13; lo++) {
        const idx = suited ? hi * 13 + lo : lo * 13 + hi;
        if (inR(idx)) seq.push(lo); else out();
      }
      out();
    }
  }
  return parts.join(', ') || '—';
}
function groupPairs(a) {
  const top = RANKS[12 - a[0]], bot = RANKS[12 - a[a.length - 1]];
  if (a.length === 1) return top + top;
  if (a[0] === 0) return bot + bot + '+';
  return top + top + '-' + bot + bot;
}
