// Table rendering + human interaction for the Play tab.
import { RANK_CHAR, evaluate, shortName } from './cards.js';
import { Game, PHASE } from './engine.js';
import { predrawAdvice, drawAdvice, postdrawAdvice } from './analysis.js';

let game = null;
let selectedDiscards = new Set();
let coachOn = true;
let net = 0; // human lifetime net for the session

export function cardHTML(c, opts = {}) {
  const red = c.s === '♥' || c.s === '♦';
  return `<div class="card ${red ? 'red' : ''} ${opts.cls || ''}" ${opts.idx !== undefined ? `data-idx="${opts.idx}"` : ''}>
    <span class="card-rank">${RANK_CHAR[c.r]}</span><span class="card-suit">${c.s}</span></div>`;
}

const cardBackHTML = `<div class="card back"></div>`;

export function initPlayTab() {
  document.getElementById('start-game').onclick = () => {
    const botCount = +document.getElementById('bot-count').value;
    startGame(botCount);
  };
  document.getElementById('coach-toggle').onchange = e => {
    coachOn = e.target.checked;
    renderCoach();
  };
}

function startGame(botCount) {
  if (game) game.destroy();
  document.getElementById('game-setup').classList.add('hidden');
  document.getElementById('game-area').classList.remove('hidden');
  document.getElementById('log').innerHTML = '';
  net = 0;
  game = new Game({
    botCount, stack: 1000, sb: 5, bb: 10,
    onUpdate: render,
    onLog: log,
    onHumanTurn: kind => { render(); renderControls(kind); renderCoach(kind); },
    onHandEnd: onHandEnd,
  });
  game.startHand();
}

function log(msg, cls = '') {
  const el = document.getElementById('log');
  const div = document.createElement('div');
  div.className = `log-line ${cls}`;
  div.textContent = msg;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function onHandEnd({ winners }) {
  renderControls(null);
  const me = winners.find(w => w.name === 'You');
  const stack = game.human.stack;
  const invested = 1000 * game.human.buyIns;
  net = stack - invested;
  document.getElementById('controls').innerHTML = `
    <div class="hand-over">
      <span>${me ? `You won ${me.amount}! ` : ''}Session: <strong class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : ''}${net}</strong></span>
      <button class="btn primary" id="next-hand">Deal next hand</button>
    </div>`;
  document.getElementById('next-hand').onclick = () => { selectedDiscards.clear(); game.startHand(); };
}

// ---------------- rendering ----------------
function render() {
  if (!game) return;
  const seats = document.getElementById('seats');
  const isShowdownIdle = game.phase === PHASE.SHOWDOWN || game.phase === PHASE.IDLE;
  seats.innerHTML = game.players.slice(1).map(p => `
    <div class="seat ${p.folded ? 'folded' : ''} ${game.toAct === p.seat && !isShowdownIdle ? 'active' : ''}">
      <div class="seat-name">${p.name} ${game.button === p.seat ? '<span class="btn-chip">D</span>' : ''}</div>
      <div class="seat-stack">${p.stack}</div>
      <div class="seat-cards">${p.revealed ? p.cards.map(c => cardHTML(c)).join('') : (p.folded ? '' : Array(5).fill(cardBackHTML).join(''))}</div>
      <div class="seat-info">${p.betRound > 0 ? `<span class="bet-chip">${p.betRound}</span>` : ''}
        ${p.drewCount !== null && !p.folded ? `<span class="drew">${p.drewCount === 0 ? 'PAT' : 'drew ' + p.drewCount}</span>` : ''}
        ${p.folded ? '<span class="folded-tag">folded</span>' : ''}</div>
    </div>`).join('');

  document.getElementById('pot').textContent = `Pot: ${game.pot}`;
  const phaseNames = { predraw: 'Pre-draw betting', draw: 'The draw', postdraw: 'Post-draw betting', showdown: 'Showdown', idle: 'Hand over' };
  document.getElementById('phase').textContent = phaseNames[game.phase] || '';

  const me = game.human;
  const myArea = document.getElementById('my-area');
  const inDraw = game.phase === PHASE.DRAW && game.players[game.drawQueue?.[0]] === me;
  myArea.innerHTML = `
    <div class="seat-name">You ${game.button === 0 ? '<span class="btn-chip">D</span>' : ''}
      <span class="seat-stack">stack ${me.stack}</span>
      ${me.betRound > 0 ? `<span class="bet-chip">${me.betRound}</span>` : ''}
      ${me.drewCount !== null && !me.folded ? `<span class="drew">${me.drewCount === 0 ? 'PAT' : 'drew ' + me.drewCount}</span>` : ''}
      ${me.folded ? '<span class="folded-tag">folded</span>' : ''}</div>
    <div class="my-cards ${inDraw ? 'selecting' : ''}">
      ${me.cards.map((c, i) => cardHTML(c, { idx: i, cls: selectedDiscards.has(i) ? 'discard' : '' })).join('')}
    </div>
    ${!me.folded && me.cards.length === 5 ? `<div class="my-hand-name">${evaluate(me.cards).name}</div>` : ''}`;

  if (inDraw) {
    myArea.querySelectorAll('.card').forEach(el => {
      el.onclick = () => {
        const i = +el.dataset.idx;
        if (selectedDiscards.has(i)) selectedDiscards.delete(i); else selectedDiscards.add(i);
        render(); renderControls('draw');
      };
    });
  }
}

function renderControls(kind) {
  const el = document.getElementById('controls');
  if (!kind) { el.innerHTML = ''; return; }
  const me = game.human;

  if (kind === 'draw') {
    const n = selectedDiscards.size;
    el.innerHTML = `
      <span class="draw-hint">Tap cards to discard, then confirm:</span>
      <button class="btn primary" id="confirm-draw">${n === 0 ? 'Stand pat' : `Draw ${n}`}</button>`;
    document.getElementById('confirm-draw').onclick = () => {
      const idx = [...selectedDiscards];
      selectedDiscards.clear();
      el.innerHTML = '';
      game.humanDraw(idx);
    };
    return;
  }

  const { acts, toCall, minRaiseTo } = game.legalActions(me);
  const pot = game.pot;
  const maxTo = me.betRound + me.stack;
  const sizes = [];
  if (acts.includes('raise')) {
    const opts = [
      ['Min', minRaiseTo],
      [game.currentBet > 0 ? 'Pot raise' : '⅔ pot', game.currentBet > 0 ? game.currentBet * 2 + pot : Math.max(minRaiseTo, Math.round(pot * 0.66 / 5) * 5)],
      ['All-in', maxTo],
    ];
    const seen = new Set();
    for (const [label, raw] of opts) {
      const to = Math.min(Math.max(raw, minRaiseTo), maxTo);
      if (seen.has(to)) continue;
      seen.add(to);
      sizes.push(`<button class="btn raise" data-to="${to}">${label} ${to}</button>`);
    }
  }
  el.innerHTML = `
    ${acts.includes('fold') ? '<button class="btn fold" id="act-fold">Fold</button>' : ''}
    <button class="btn call" id="act-call">${toCall > 0 ? `Call ${toCall}` : 'Check'}</button>
    ${sizes.join('')}`;
  const q = id => document.getElementById(id);
  const doAct = action => { el.innerHTML = ''; game.humanAction(action); };
  if (q('act-fold')) q('act-fold').onclick = () => doAct({ type: 'fold' });
  q('act-call').onclick = () => doAct({ type: toCall > 0 ? 'call' : 'check' });
  el.querySelectorAll('.btn.raise').forEach(b => b.onclick = () => doAct({ type: 'raise', to: +b.dataset.to }));
}

// ---------------- coach ----------------
function md(s) { return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

function renderCoach(kind) {
  const el = document.getElementById('coach');
  if (!coachOn) { el.innerHTML = '<p class="coach-off">Coach is off. Toggle it on for live advice.</p>'; return; }
  if (!game || !kind) { el.innerHTML = '<p class="coach-off">Coach will chime in when it\'s your turn.</p>'; return; }
  const me = game.human;
  let advice;
  try {
    if (kind === 'draw') {
      const someoneDrew = game.alive.some(p => p !== me && p.drewCount !== null && p.drewCount > 0);
      advice = drawAdvice(me.cards, { someoneDrew });
    } else if (game.phase === PHASE.PREDRAW) {
      const facing = game.currentBet > game.bb * 4 ? 'reraised' : game.currentBet > game.bb ? 'raised' : 'unopened';
      advice = predrawAdvice(me.cards, game.positionOf(me), facing);
    } else {
      const opps = game.alive.filter(p => p !== me);
      advice = postdrawAdvice(me.cards, {
        oppPat: opps.filter(p => p.drewCount === 0).length,
        oppDrew: opps.filter(p => p.drewCount > 0).length,
        facingBet: game.currentBet > me.betRound,
        potSize: game.pot,
        toCall: game.currentBet - me.betRound,
      });
    }
  } catch (e) {
    el.innerHTML = '<p class="coach-off">Coach hiccuped on this one.</p>';
    return;
  }
  const tag = advice.action ? `<span class="coach-action ${advice.action}">${advice.action.toUpperCase()}</span>` : '';
  el.innerHTML = `<div class="coach-head">🎓 Coach ${tag}</div>` +
    advice.lines.map(l => `<p>${md(l)}</p>`).join('');
}

export function getCoachState() { return coachOn; }
