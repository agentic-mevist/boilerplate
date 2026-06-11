// Deck + deuce-to-seven lowball hand evaluator.
// Ranks: 2..14 (A=14, aces are ALWAYS high in 2-7).
// Lower score = better lowball hand.

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANK_CHAR = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'T',11:'J',12:'Q',13:'K',14:'A' };
export const RANK_WORD = { 2:'Deuce',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight',9:'Nine',10:'Ten',11:'Jack',12:'Queen',13:'King',14:'Ace' };

export const CAT = {
  HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4,
  FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8,
};
export const CAT_NAME = [
  'high card', 'one pair', 'two pair', 'three of a kind', 'straight',
  'flush', 'full house', 'four of a kind', 'straight flush',
];

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) deck.push({ r, s });
  return deck;
}

export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function cardStr(c) { return RANK_CHAR[c.r] + c.s; }
export function cardsStr(cs) { return cs.map(cardStr).join(' '); }

// Evaluate exactly 5 cards. Returns { cat, ranks, score, name }.
// `ranks` are the tiebreak ranks in comparison order; lower score wins the pot.
export function evaluate(cards) {
  const byRank = new Map();
  for (const c of cards) byRank.set(c.r, (byRank.get(c.r) || 0) + 1);
  const desc = cards.map(c => c.r).sort((a, b) => b - a);

  const isFlush = cards.every(c => c.s === cards[0].s);
  // A-2-3-4-5 is NOT a straight in 2-7 (ace is high only).
  const isStraight = byRank.size === 5 && desc[0] - desc[4] === 4;

  let cat;
  const groups = [...byRank.entries()] // [rank, count]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (isStraight && isFlush) cat = CAT.STRAIGHT_FLUSH;
  else if (groups[0][1] === 4) cat = CAT.QUADS;
  else if (groups[0][1] === 3 && groups[1][1] === 2) cat = CAT.FULL_HOUSE;
  else if (isFlush) cat = CAT.FLUSH;
  else if (isStraight) cat = CAT.STRAIGHT;
  else if (groups[0][1] === 3) cat = CAT.TRIPS;
  else if (groups[0][1] === 2 && groups[1][1] === 2) cat = CAT.TWO_PAIR;
  else if (groups[0][1] === 2) cat = CAT.PAIR;
  else cat = CAT.HIGH_CARD;

  // Tiebreak ranks: grouped ranks first (e.g. pair rank), then kickers desc.
  const ranks = [];
  for (const [r, n] of groups) for (let i = 0; i < n; i++) ranks.push(r);

  let score = cat;
  for (const r of ranks) score = score * 15 + r;

  return { cat, ranks, score, name: handName(cat, ranks, desc) };
}

function plural(r) { return r === 6 ? 'Sixes' : RANK_WORD[r] + 's'; }

function handName(cat, ranks, desc) {
  const lowStr = desc.map(r => RANK_CHAR[r]).join('-');
  if (cat === CAT.HIGH_CARD) {
    if (lowStr === '7-5-4-3-2') return '7-5-4-3-2 — “Number One”, the nuts!';
    return `${RANK_WORD[desc[0]]}-low (${lowStr})`;
  }
  if (cat === CAT.PAIR) return `Pair of ${plural(ranks[0])}`;
  if (cat === CAT.TWO_PAIR) return `Two pair, ${plural(ranks[0])} and ${plural(ranks[2])}`;
  if (cat === CAT.TRIPS) return `Three ${plural(ranks[0])}`;
  if (cat === CAT.STRAIGHT) return `Straight (${lowStr}) — counts against you!`;
  if (cat === CAT.FLUSH) return `Flush — counts against you!`;
  if (cat === CAT.FULL_HOUSE) return `Full house`;
  if (cat === CAT.QUADS) return `Four of a kind`;
  return `Straight flush — the worst kind of luck`;
}

// Short label like "pat 8-6-5-3-2" or "Pair of Fours" — for logs/showdown.
export function shortName(ev) {
  if (ev.cat === CAT.HIGH_CARD) {
    return ev.ranks.map(r => RANK_CHAR[r]).join('-') + ' low';
  }
  return ev.name;
}
