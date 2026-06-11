// No-limit 2-7 single draw game engine with simple bot opponents.
import { makeDeck, shuffle, evaluate, CAT, shortName, cardStr } from './cards.js';
import { analyzeKeeps, bestKeep } from './analysis.js';

export const PHASE = { IDLE: 'idle', PREDRAW: 'predraw', DRAW: 'draw', POSTDRAW: 'postdraw', SHOWDOWN: 'showdown' };

const BOT_NAMES = ['Doyle', 'Billy', 'Jen', 'Sailor', 'Amarillo'];
const BOT_DELAY = 850;

export class Game {
  // opts: { botCount, stack, sb, bb, onUpdate(game), onLog(msg, cls), onHumanTurn(kind), onHandEnd(summary) }
  constructor(opts) {
    this.opts = opts;
    this.sb = opts.sb ?? 5;
    this.bb = opts.bb ?? 10;
    this.players = [];
    this.players.push(this.mkPlayer(0, 'You', true, opts.stack));
    for (let i = 0; i < opts.botCount; i++) {
      this.players.push(this.mkPlayer(i + 1, BOT_NAMES[i], false, opts.stack));
    }
    this.button = Math.floor(Math.random() * this.players.length);
    this.phase = PHASE.IDLE;
    this.handNum = 0;
    this.timers = [];
  }

  mkPlayer(seat, name, isHuman, stack) {
    return { seat, name, isHuman, stack, buyIns: 1,
      cards: [], folded: true, allIn: false, acted: false,
      betRound: 0, contrib: 0, drewCount: null, revealed: false,
      snowing: false };
  }

  destroy() { this.timers.forEach(clearTimeout); }
  later(fn, ms = BOT_DELAY) { this.timers.push(setTimeout(fn, ms)); }

  log(msg, cls) { this.opts.onLog(msg, cls); }
  update() { this.opts.onUpdate(this); }

  get pot() { return this.players.reduce((s, p) => s + p.contrib, 0); }
  get alive() { return this.players.filter(p => !p.folded); }
  get actors() { return this.players.filter(p => !p.folded && !p.allIn); }
  get human() { return this.players[0]; }

  positionOf(p) {
    const n = this.players.length;
    if (p.seat === (this.button + 1) % n && n > 2) return 'sb';
    if (p.seat === (this.button + (n > 2 ? 2 : 1)) % n) return 'bb';
    if (p.seat === this.button) return 'late';
    // seats between BB and button: early..late
    const order = this.seatOrder((this.button + (n > 2 ? 3 : 1)) % n)
      .filter(s => s !== this.button);
    const i = order.indexOf(p.seat);
    if (i < 0) return 'late';
    return i < order.length / 2 ? 'early' : 'middle';
  }

  seatOrder(start) {
    const n = this.players.length;
    return Array.from({ length: n }, (_, i) => (start + i) % n);
  }

  // ---------------- hand lifecycle ----------------
  startHand() {
    this.handNum++;
    this.deck = shuffle(makeDeck());
    this.muck = [];
    for (const p of this.players) {
      if (p.stack <= 0) { p.stack = this.opts.stack; p.buyIns++; this.log(`${p.name} re-buys for ${this.opts.stack}.`, 'sys'); }
      p.cards = []; p.folded = false; p.allIn = false; p.acted = false;
      p.betRound = 0; p.contrib = 0; p.drewCount = null; p.revealed = false;
      p.snowing = false;
    }
    this.button = (this.button + 1) % this.players.length;
    const n = this.players.length;
    const sbSeat = n > 2 ? (this.button + 1) % n : this.button;
    const bbSeat = n > 2 ? (this.button + 2) % n : (this.button + 1) % n;

    this.log(`— Hand #${this.handNum} — ${this.players[this.button].name} has the button —`, 'hand');
    this.post(this.players[sbSeat], this.sb, 'small blind');
    this.post(this.players[bbSeat], this.bb, 'big blind');

    for (let i = 0; i < 5; i++) for (const s of this.seatOrder((this.button + 1) % n)) {
      this.players[s].cards.push(this.deck.pop());
    }

    this.phase = PHASE.PREDRAW;
    this.currentBet = this.bb;
    this.minRaiseInc = this.bb;
    this.toAct = (bbSeat + 1) % n;
    this.update();
    this.nextToAct();
  }

  post(p, amt, label) {
    const a = Math.min(amt, p.stack);
    p.stack -= a; p.betRound += a; p.contrib += a;
    if (p.stack === 0) p.allIn = true;
    this.log(`${p.name} posts the ${label} (${a}).`);
  }

  // ---------------- betting ----------------
  bettingComplete() {
    if (this.alive.length <= 1) return true;
    return this.actors.every(p => p.acted && p.betRound === this.currentBet);
  }

  nextToAct() {
    if (this.alive.length === 1) return this.endByFolds();
    if (this.bettingComplete()) return this.endBettingRound();
    while (true) {
      const p = this.players[this.toAct];
      if (!p.folded && !p.allIn && !(p.acted && p.betRound === this.currentBet)) break;
      this.toAct = (this.toAct + 1) % this.players.length;
    }
    const p = this.players[this.toAct];
    this.update();
    if (p.isHuman) this.opts.onHumanTurn('bet');
    else this.later(() => this.botBet(p));
  }

  legalActions(p) {
    const toCall = this.currentBet - p.betRound;
    const acts = [];
    if (toCall > 0) acts.push('fold');
    acts.push(toCall > 0 ? 'call' : 'check');
    if (p.stack > toCall) acts.push('raise');
    return { acts, toCall: Math.min(toCall, p.stack), minRaiseTo: this.currentBet + this.minRaiseInc };
  }

  // action: {type:'fold'|'check'|'call'|'raise', to?:number}
  act(p, action) {
    const { toCall } = this.legalActions(p);
    if (action.type === 'fold') {
      p.folded = true; this.muck.push(...p.cards);
      this.log(`${p.name} folds.`, p.isHuman ? 'you' : '');
    } else if (action.type === 'check') {
      this.log(`${p.name} checks.`, p.isHuman ? 'you' : '');
    } else if (action.type === 'call') {
      p.stack -= toCall; p.betRound += toCall; p.contrib += toCall;
      if (p.stack === 0) p.allIn = true;
      this.log(`${p.name} calls ${toCall}${p.allIn ? ' (all-in)' : ''}.`, p.isHuman ? 'you' : '');
    } else if (action.type === 'raise') {
      let to = Math.min(action.to, p.betRound + p.stack);
      const minTo = this.currentBet + this.minRaiseInc;
      if (to < minTo && p.betRound + p.stack > minTo) to = minTo;
      const add = to - p.betRound;
      p.stack -= add; p.betRound = to; p.contrib += add;
      if (p.stack === 0) p.allIn = true;
      if (to - this.currentBet >= this.minRaiseInc) {
        this.minRaiseInc = to - this.currentBet;
        for (const q of this.players) if (q !== p) q.acted = false;
      }
      const verb = this.currentBet > 0 && this.currentBet > this.bb || this.phase === PHASE.POSTDRAW && this.currentBet > 0
        ? 'raises to' : (this.phase === PHASE.PREDRAW ? 'raises to' : 'bets');
      this.currentBet = Math.max(this.currentBet, to);
      this.log(`${p.name} ${verb} ${to}${p.allIn ? ' (all-in)' : ''}.`, p.isHuman ? 'you' : 'agg');
    }
    p.acted = true;
    this.toAct = (this.toAct + 1) % this.players.length;
    this.nextToAct();
  }

  humanAction(action) {
    const p = this.human;
    if (this.players[this.toAct] !== p) return;
    this.act(p, action);
  }

  endBettingRound() {
    for (const p of this.players) { p.betRound = 0; p.acted = false; }
    this.currentBet = 0;
    this.minRaiseInc = this.bb;
    if (this.phase === PHASE.PREDRAW) this.startDrawPhase();
    else this.showdown();
  }

  endByFolds() {
    const w = this.alive[0];
    w.stack += this.pot;
    this.log(`Everyone folded — ${w.name} wins ${this.pot}.`, 'win');
    this.finishHand([{ name: w.name, amount: this.pot }]);
  }

  // ---------------- draw phase ----------------
  startDrawPhase() {
    this.phase = PHASE.DRAW;
    this.drawQueue = this.seatOrder((this.button + 1) % this.players.length)
      .filter(s => !this.players[s].folded);
    this.log(`— The draw —`, 'hand');
    this.update();
    this.nextDrawer();
  }

  nextDrawer() {
    if (this.drawQueue.length === 0) return this.startPostdraw();
    const p = this.players[this.drawQueue[0]];
    this.toAct = p.seat;
    this.update();
    if (p.isHuman) this.opts.onHumanTurn('draw');
    else this.later(() => { this.botDraw(p); });
  }

  drawCardsFor(p, discardIdx) {
    this.drawQueue.shift();
    const discards = discardIdx.map(i => p.cards[i]);
    p.cards = p.cards.filter((_, i) => !discardIdx.includes(i));
    for (let k = 0; k < discards.length; k++) {
      if (this.deck.length === 0) { this.deck = shuffle(this.muck.splice(0)); }
      p.cards.push(this.deck.pop());
    }
    this.muck.push(...discards);
    p.drewCount = discards.length;
    this.log(p.drewCount === 0 ? `${p.name} stands pat.` : `${p.name} draws ${p.drewCount}.`,
      p.isHuman ? 'you' : (p.drewCount === 0 ? 'agg' : ''));
    this.nextDrawer();
  }

  humanDraw(discardIdx) {
    const p = this.human;
    if (this.players[this.drawQueue?.[0]] !== p) return;
    this.drawCardsFor(p, discardIdx);
  }

  startPostdraw() {
    this.phase = PHASE.POSTDRAW;
    if (this.actors.length < 2) { this.update(); return this.later(() => this.showdown(), 600); }
    this.toAct = this.seatOrder((this.button + 1) % this.players.length)
      .find(s => { const p = this.players[s]; return !p.folded && !p.allIn; });
    this.log(`— Post-draw betting —`, 'hand');
    this.update();
    this.nextToAct();
  }

  // ---------------- showdown & pots ----------------
  showdown() {
    this.phase = PHASE.SHOWDOWN;
    const live = this.alive;
    const winners = [];
    if (live.length > 1) {
      for (const p of live) { p.revealed = true; p.ev = evaluate(p.cards); }
      const sorted = [...live].sort((a, b) => a.ev.score - b.ev.score);
      for (const p of sorted) this.log(`${p.name} shows ${p.cards.map(cardStr).join(' ')} — ${shortName(p.ev)}.`, p.isHuman ? 'you' : '');
      // side pots from contributions
      const payouts = this.computePayouts(live);
      for (const [p, amt] of payouts) {
        p.stack += amt;
        this.log(`${p.name} wins ${amt} with ${shortName(p.ev)}.`, 'win');
        winners.push({ name: p.name, amount: amt });
      }
    }
    this.finishHand(winners);
  }

  computePayouts(live) {
    const contribs = this.players.map(p => ({ p, left: p.contrib }));
    const won = new Map();
    while (true) {
      const inPlay = contribs.filter(c => c.left > 0);
      if (inPlay.length === 0) break;
      const layer = Math.min(...inPlay.map(c => c.left));
      let potLayer = 0;
      for (const c of inPlay) { c.left -= layer; potLayer += layer; }
      let eligible = inPlay.map(c => c.p).filter(p => !p.folded);
      if (eligible.length === 0) eligible = live; // dead money from folders goes to the best live hand
      const bestScore = Math.min(...eligible.map(p => p.ev.score));
      const champs = eligible.filter(p => p.ev.score === bestScore);
      const share = Math.floor(potLayer / champs.length);
      let rem = potLayer - share * champs.length;
      for (const ch of champs) {
        won.set(ch, (won.get(ch) || 0) + share + (rem-- > 0 ? 1 : 0));
      }
    }
    return [...won.entries()];
  }

  finishHand(winners) {
    this.phase = PHASE.IDLE;
    for (const p of this.players) p.contrib = 0;
    this.update();
    this.opts.onHandEnd({ winners });
  }

  // ---------------- bot brain ----------------
  botBet(p) {
    if (this.phase === PHASE.PREDRAW) return this.act(p, this.botPredraw(p));
    return this.act(p, this.botPostdraw(p));
  }

  botPredraw(p) {
    const { toCall, minRaiseTo } = this.legalActions(p);
    const pat = evaluate(p.cards);
    const k1 = bestKeep(p.cards, 1, 200);
    const k2 = bestKeep(p.cards, 2, 150);
    const pos = this.positionOf(p);
    const late = pos === 'late' || pos === 'middle';
    const patLow = pat.cat === CAT.HIGH_CARD ? pat.ranks[0] : 99;
    const d1hi = k1 ? Math.max(...k1.kept.map(c => c.r)) : 99;
    const d2hi = k2 ? Math.max(...k2.kept.map(c => c.r)) : 99;
    const rnd = Math.random();

    const raiseTo = () => {
      const base = this.currentBet <= this.bb
        ? this.bb * (2.2 + Math.random() * 1.2)
        : this.currentBet * (2.3 + Math.random() * 0.8);
      return Math.max(minRaiseTo, Math.round(base / 5) * 5);
    };

    let tier;
    if (patLow <= 9) tier = 3;                       // premium pat
    else if (patLow <= 11 || d1hi <= 8) tier = 2;    // strong
    else if (d1hi <= 10) tier = 1;                   // playable
    else if (d2hi <= 7 && late) tier = 1;
    else tier = 0;

    // occasional snow attempt with trash in position
    if (tier === 0 && late && this.currentBet <= this.bb && rnd < 0.05) {
      p.snowing = true;
      return { type: 'raise', to: raiseTo() };
    }
    if (tier >= 2) {
      if (this.currentBet > this.bb * 6 && tier === 2 && rnd < 0.5) return { type: 'call' };
      return rnd < 0.85 ? { type: 'raise', to: raiseTo() } : { type: 'call' };
    }
    if (tier === 1) {
      if (this.currentBet <= this.bb) return rnd < 0.7 ? { type: 'raise', to: raiseTo() } : { type: 'call' };
      if (toCall <= p.stack * 0.08 && toCall <= this.pot) return { type: 'call' };
      return { type: 'fold' };
    }
    if (toCall === 0) return { type: 'check' };
    if (pos === 'bb' && toCall <= this.bb) return { type: 'call' };
    return { type: 'fold' };
  }

  botDraw(p) {
    if (p.snowing) { this.drawCardsFor(p, []); return; } // snow: stand pat with junk
    const best = analyzeKeeps(p.cards, 250)[0];
    const keepSet = new Set(best.kept);
    const discard = p.cards.map((c, i) => keepSet.has(c) ? -1 : i).filter(i => i >= 0);
    this.drawCardsFor(p, discard);
  }

  botPostdraw(p) {
    const { toCall, minRaiseTo } = this.legalActions(p);
    const ev = evaluate(p.cards);
    const lowRank = ev.cat === CAT.HIGH_CARD ? ev.ranks[0] : 99;
    const pot = this.pot;
    const rnd = Math.random();
    const oppPat = this.alive.filter(q => q !== p && q.drewCount === 0).length;

    const betSize = () => Math.max(minRaiseTo, Math.round(pot * (0.55 + Math.random() * 0.35) / 5) * 5);

    if (p.snowing) {
      if (toCall === 0 && rnd < 0.75) return { type: 'raise', to: betSize() };
      return toCall > 0 ? { type: 'fold' } : { type: 'check' };
    }
    if (lowRank <= 8) {
      return { type: 'raise', to: betSize() };
    }
    if (lowRank === 9) {
      if (toCall === 0) return oppPat === 0 || rnd < 0.4 ? { type: 'raise', to: betSize() } : { type: 'check' };
      return toCall <= pot ? { type: 'call' } : (rnd < 0.4 ? { type: 'call' } : { type: 'fold' });
    }
    if (lowRank <= 11) {
      if (toCall === 0) return { type: 'check' };
      if (oppPat === 0 && toCall <= pot * 0.5) return { type: 'call' };
      return rnd < 0.15 ? { type: 'call' } : { type: 'fold' };
    }
    // busted
    if (toCall === 0) {
      if (rnd < 0.12 && this.alive.length === 2) return { type: 'raise', to: betSize() }; // bluff
      return { type: 'check' };
    }
    return { type: 'fold' };
  }
}
