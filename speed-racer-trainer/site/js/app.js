import { generateSpot, chooseHeroHand, DEFAULT_CFG, STAGES, SPOT_TYPES, randomComboOfClass } from './gen.js';
import {
  prepareSpot, solveSpot, dollarsPerBB, PROFILES, POSITIONS, shovePct, callPct, makePayouts, MODELS, heroActionName, covers,
} from './model.js';
import { mulberry32, CLASS_NAMES, classOf, RANKS } from './poker.js';
import {
  cardHtml, handName, fmt$, fmtBB, pct, verdict, explain, rangeGridHtml, villainRangeInfo, chartHtml,
} from './explain.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let cfg = { ...DEFAULT_CFG, ...load('sr.cfg', {}) };
let opts = load('sr.opts', { stages: ['early', 'mid', 'bubble', 'itm', 'ft'], types: ['call', 'open', 'multi'], borderline: true, autochart: true });
let stats = load('sr.stats', { hands: 0, correct: 0, evLostBB: 0, evLost$: 0, streak: 0, best: 0, byStage: {}, mistakes: [] });

// ---------------- Tabs ----------------
function showTab(name) {
  $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  if (name === 'settings') renderSettings();
  window.scrollTo(0, 0);
}
$$('nav button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
$$('[data-goto]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); showTab(a.dataset.goto); }));

// ---------------- Worker (range charts) ----------------
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let chartJob = 0;
const chartCallbacks = {};
worker.onmessage = e => { const cb = chartCallbacks[e.data.id]; if (cb) cb(e.data); };
function requestChart(spot, onProgress, onDone) {
  const id = ++chartJob;
  chartCallbacks[id] = d => { if (d.done) { delete chartCallbacks[id]; onDone(d); } else onProgress(d.progress); };
  worker.postMessage({ id, spot, iters: 1200 });
  return id;
}

// ---------------- Table rendering ----------------
const SLOT_POS = [[50, 87], [11, 68], [12, 24], [50, 12], [88, 24], [89, 68]];
const SLOT_POS_MOBILE = [[50, 90], [17, 68], [17, 30], [50, 9], [83, 30], [83, 68]];
const SLOTS_FOR = { 6: [0, 1, 2, 3, 4, 5], 5: [0, 1, 2, 4, 5], 4: [0, 1, 3, 5], 3: [0, 2, 4], 2: [0, 3] };

function hudFor(spot, i) {
  const s = spot.seats[i], p = PROFILES[s.profile];
  const r = mulberry32(spot.seed + i * 101);
  const hands = 4 + Math.floor(r() * 45);
  const noise = 30 / Math.sqrt(hands);
  const vpip = Math.max(0, Math.min(100, Math.round(p.vpip + (r() - 0.5) * 2 * noise)));
  const pfr = Math.max(0, Math.min(vpip, Math.round(p.pfr + (r() - 0.5) * 2 * noise)));
  return `VPIP ${vpip} · PFR ${pfr} · <span title="sample size">${hands}h</span>`;
}

function renderTable(el, spot) {
  const T = spot.seats.length, h = spot.heroIdx, hero = spot.seats[h];
  const mobile = window.matchMedia('(max-width: 640px)').matches;
  const slots = SLOTS_FOR[T];
  let pot = spot.ante + (spot.seats.find(s => s.pos === 'SB') ? spot.sb : 0) + spot.bb;
  let level = spot.bb;
  const acts = {};
  for (const p of spot.prefix) acts[p.idx] = p;
  for (const p of spot.prefix) {
    const s = spot.seats[p.idx];
    const room = s.stack - (s.pos === 'BB' ? spot.ante : 0);
    const posted = s.pos === 'SB' ? spot.sb : s.pos === 'BB' ? spot.bb : 0;
    if (p.act === 'shove') { pot += room - posted; level = Math.max(level, room); }
    if (p.act === 'call') { pot += Math.min(room, level) - posted; }
  }
  const heroRoom = hero.stack - (hero.pos === 'BB' ? spot.ante : 0);
  const heroPosted = hero.pos === 'SB' ? spot.sb : hero.pos === 'BB' ? spot.bb : 0;
  const isCall = spot.prefix.some(p => p.act === 'shove');
  const toCall = isCall ? Math.min(heroRoom, level) - heroPosted : heroRoom - heroPosted;

  let html = `<div class="felt"></div><div class="pot">Pot <b>${pot.toFixed(1)}bb</b><br>${isCall ? `To call: <b>${toCall.toFixed(1)}bb</b>` : `Shove = <b>${heroRoom.toFixed(1)}bb</b>`}</div>`;
  for (let k = 0; k < T; k++) {
    const i = (h + k) % T;
    const s = spot.seats[i];
    const [x, y] = (mobile ? SLOT_POS_MOBILE : SLOT_POS)[slots[k]];
    const isHero = i === h;
    const a = acts[i];
    let chip = '', cls = '';
    if (a?.act === 'fold') { chip = '<span class="act-chip fold">FOLD</span>'; cls = 'folded'; }
    else if (a?.act === 'shove') { chip = `<span class="act-chip shove">ALL-IN ${s.stack.toFixed(1)}</span>`; cls = 'allin'; }
    else if (a?.act === 'call') { chip = '<span class="act-chip call">CALL</span>'; cls = 'allin'; }
    else if (!isHero) chip = '<span class="act-chip wait">to act</span>';
    const prof = PROFILES[s.profile];
    let read = '';
    if (a?.act === 'shove') read = `Read: shoves ~${a.pct.toFixed(0)}%`;
    else if (a?.act === 'call') read = `Read: calls ~${a.pct.toFixed(0)}%`;
    else if (!isHero && !a) {
      const b = spot.behind.find(b => b.idx === i);
      if (b) read = `Read: calls ${isCall ? 'shove+you' : 'your shove'} ~${b.pctIn.toFixed(0)}%`;
    }
    const cover = isHero ? '' : covers(spot, h, i) ? '<span class="cover yes" title="You have more chips: you can win their bounty">you cover</span>' : '<span class="cover no" title="They have more chips: no bounty for you, your head is at risk">covers you</span>';
    html += `<div class="seat ${isHero ? 'hero' : ''} ${cls}" style="left:${x}%;top:${y}%">
      <div class="nm"><span>${s.name}</span><span class="pos">${s.pos}</span></div>
      <div class="stk"><b>${s.stack.toFixed(1)}bb</b><span class="bounty" title="Current bounty (head). KO pays ${Math.round(spot.koShare * 100)}% in cash.">🎯 ${fmt$(s.head)}</span></div>
      ${isHero ? '' : `<div class="hud"><span class="tag-prof ${s.profile}">${prof.short}</span> ${hudFor(spot, i)}</div>`}
      ${read ? `<div class="read">${read}</div>` : ''}
      <div>${chip} ${cover}</div>
    </div>`;
  }
  el.innerHTML = html;
}

function renderTourneyBar(el, spot, rt) {
  const N = spot.playersLeft, paid = spot.payouts.length;
  const heads = spot.seats.reduce((a, s) => a + s.head, 0) + rt.otherHeads;
  const prize = spot.payouts.slice(0, Math.min(N, paid)).reduce((a, b) => a + b, 0);
  const dist = N > paid ? `<b>${N - paid}</b> from the money` : '<b>in the money</b>';
  el.innerHTML = `<span class="stage">${STAGES[spot.stage]?.label ?? 'Custom'}</span>
    <span>Left <b>${N}</b>/${spot.cfg.entries}</span><span>Paid <b>${paid}</b> (${dist})</span>
    <span>Min-cash <b>${fmt$(spot.payouts[paid - 1])}</b> · 1st <b>${fmt$(spot.payouts[0])}</b></span>
    <span>Avg stack <b>${spot.avgStack.toFixed(1)}bb</b></span>
    <span>Prize $ left <b>${fmt$(prize)}</b> · bounty $ in play <b>${fmt$(heads)}</b></span>
    <span>1bb ≈ <b>${fmt$(dollarsPerBB(rt))}</b></span>
    <span>Blinds 0.5/1 + ${spot.ante}bb BB-ante</span>`;
}

// ---------------- Result rendering ----------------
function renderResult(el, spot, rt, res, userAction) {
  const v = verdict(spot, rt, res);
  const ex = explain(spot, rt, res, v);
  const actName = res.act === 'call' ? 'CALL' : 'SHOVE';
  const bestName = v.best === 'fold' ? 'FOLD' : actName;
  let head;
  if (userAction) {
    const correct = v.marginal || userAction === v.best;
    head = `<span class="badge ${v.marginal ? 'close' : correct ? 'good' : 'bad'}">${v.marginal ? 'Close spot' : correct ? 'Correct' : 'Mistake'}</span>
      <span>Best play: <b>${bestName}</b> by <b>${Math.abs(v.diffBB).toFixed(2)}bb</b> (${fmt$(Math.abs(v.diff))})</span>`;
  } else {
    head = `<span class="badge ${v.marginal ? 'close' : 'good'}">${bestName}</span><span>by <b>${Math.abs(v.diffBB).toFixed(2)}bb</b> (${fmt$(Math.abs(v.diff))})${v.marginal ? ', basically break-even' : ''}</span>`;
  }
  let table = `<table class="ev-table"><tr><th>Model</th><th>EV fold</th><th>EV ${res.act}</th><th>Difference</th><th>Says</th></tr>`;
  for (const m of v.perModel) {
    const f = m.unit === 'bb' ? x => x.toFixed(2) + 'bb' : fmt$;
    const d = m.diff;
    const dTxt = m.unit === 'bb' ? fmtBB(d) : `${d >= 0 ? '+' : '−'}${fmt$(Math.abs(d))} <span class="muted">(${fmtBB(d / v.dpb)})</span>`;
    table += `<tr class="${m.key === 'full' ? 'main' : ''}" title="${m.desc}"><td>${m.label}</td><td>${f(m.fold)}</td><td>${f(m.go)}</td><td class="${d > 0 ? 'pos-ev' : 'neg-ev'}">${dTxt}</td><td>${m.best === 'fold' ? 'Fold' : actName[0] + actName.slice(1).toLowerCase()}</td></tr>`;
  }
  table += '</table>';
  const vr = villainRangeInfo(spot);
  const heroCls = classOf(spot.heroCards[0], spot.heroCards[1]);
  const ranges = vr.slice(0, 3).map(r => `<div><div class="small"><b>${r.label}</b></div>${rangeGridHtml(r.range, heroCls)}<div class="range-desc">${r.text}</div></div>`).join('');
  el.innerHTML = `
    <div class="verdict">${head}</div>
    <div class="two-col">
      <div>
        <div class="explain">${ex.lines.map(l => `<p>${l}</p>`).join('')}</div>
        ${ex.lessons.map(l => `<div class="lesson">💡 ${l}</div>`).join('')}
        ${table}
      </div>
      <div>${ranges}</div>
    </div>
    <div class="chart-head">
      <div><b>Your full ${res.act} range in this exact spot</b> <span class="muted small" id="chart-pct"></span></div>
      <div class="model-toggle">${MODELS.map(m => `<button data-model="${m.key}" class="${m.key === 'full' ? 'active' : ''}">${m.label}</button>`).join('')}</div>
    </div>
    <div class="progress hidden"><div></div></div>
    <div class="chart-box"><button class="build-chart">Build range chart</button></div>
    <p class="muted small">Green = ${res.act} is +EV, red = fold. Hover a cell for the EV difference. Toggle the models to see how bounties and ICM move the range. Charts use fewer samples than the main answer, so borderline cells can be off by a little.</p>`;
  el.classList.remove('hidden');

  let data = null, model = 'full';
  const box = el.querySelector('.chart-box'), prog = el.querySelector('.progress');
  const draw = () => {
    if (!data) return;
    const c = chartHtml(data, model, v.dpb, heroCls, res.act);
    box.innerHTML = c.html;
    el.querySelector('#chart-pct').textContent = `→ ${res.act} ${c.pct.toFixed(1)}% of hands (${MODELS.find(m => m.key === model).label})`;
  };
  el.querySelectorAll('.model-toggle button').forEach(b => b.addEventListener('click', () => {
    model = b.dataset.model;
    el.querySelectorAll('.model-toggle button').forEach(x => x.classList.toggle('active', x === b));
    draw();
  }));
  const build = () => {
    box.innerHTML = '<span class="muted">Computing 169 hands…</span>';
    prog.classList.remove('hidden');
    requestChart(spot, p => { prog.firstElementChild.style.width = (p * 100) + '%'; }, d => {
      prog.classList.add('hidden');
      data = d.out;
      draw();
    });
  };
  box.querySelector('.build-chart').addEventListener('click', build);
  return { v, build };
}

// ---------------- Trainer ----------------
let cur = null;

function renderSide() {
  const acc = stats.hands ? (stats.correct / stats.hands * 100).toFixed(0) + '%' : '–';
  let byStage = '';
  for (const [k, s] of Object.entries(stats.byStage)) byStage += `<div class="small muted">${STAGES[k]?.label ?? k}: ${s.c}/${s.n}</div>`;
  $('#stats').innerHTML = `<div class="stats-grid">
    <div class="stat"><b>${stats.hands}</b><span>hands</span></div>
    <div class="stat"><b>${acc}</b><span>accuracy</span></div>
    <div class="stat"><b>${stats.evLostBB.toFixed(1)}bb</b><span>EV lost (${fmt$(stats.evLost$)})</span></div>
    <div class="stat"><b>${stats.streak}</b><span>streak (best ${stats.best})</span></div>
  </div>${byStage}`;
  $('#mistakes').innerHTML = stats.mistakes.length ? stats.mistakes.map(m => `<div>${m}</div>`).join('') : '<i class="muted">None yet.</i>';
}

function renderDrillOptions() {
  $('#stage-checks').innerHTML = Object.entries(STAGES).map(([k, s]) => `<label title="${s.hint}"><input type="checkbox" data-stage="${k}" ${opts.stages.includes(k) ? 'checked' : ''}> ${s.label}</label>`).join('');
  $('#type-checks').innerHTML = Object.entries(SPOT_TYPES).map(([k, s]) => `<label><input type="checkbox" data-type="${k}" ${opts.types.includes(k) ? 'checked' : ''}> ${s.label}</label>`).join('');
  $('#opt-borderline').checked = opts.borderline;
  $('#opt-autochart').checked = opts.autochart;
  const upd = () => {
    const st = $$('[data-stage]').filter(x => x.checked).map(x => x.dataset.stage);
    const ty = $$('[data-type]').filter(x => x.checked).map(x => x.dataset.type);
    opts = { stages: st.length ? st : ['early'], types: ty.length ? ty : ['call'], borderline: $('#opt-borderline').checked, autochart: $('#opt-autochart').checked };
    save('sr.opts', opts);
  };
  $$('#stage-checks input, #type-checks input, #opt-borderline, #opt-autochart').forEach(x => x.addEventListener('change', upd));
}

function newHand() {
  const seed = (Math.random() * 2 ** 31) | 0;
  const spot = generateSpot(cfg, opts, seed);
  spot.heroCards = chooseHeroHand(spot, opts.borderline, seed);
  const rt = prepareSpot(spot);
  cur = { spot, rt, answered: false };
  renderTourneyBar($('#tourney-bar'), spot, rt);
  renderTable($('#table'), spot);
  const act = heroActionName(spot);
  $('#hero-hand').innerHTML = spot.heroCards.map(c => cardHtml(c, true)).join('') + `<span class="label">${handName(spot.heroCards)}<br>${spot.seats[spot.heroIdx].pos}</span>`;
  $('#btn-go').textContent = act === 'call' ? 'Call' : 'Shove';
  $('#btn-fold').disabled = $('#btn-go').disabled = false;
  $('#btn-next').classList.add('hidden');
  $('#result').classList.add('hidden');
}

function answer(action) {
  if (!cur || cur.answered) return;
  cur.answered = true;
  $('#btn-fold').disabled = $('#btn-go').disabled = true;
  const { spot, rt } = cur;
  const res = solveSpot(rt, spot.heroCards, 24000, spot.seed);
  const userAct = action === 'go' ? res.act : 'fold';
  const { v, build } = renderResult($('#result'), spot, rt, res, userAct);
  const correct = v.marginal || userAct === v.best;
  stats.hands++;
  const bs = stats.byStage[spot.stage] ||= { n: 0, c: 0 };
  bs.n++;
  if (correct) { stats.correct++; bs.c++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
  else {
    stats.streak = 0;
    stats.evLostBB += Math.abs(v.diffBB);
    stats.evLost$ += Math.abs(v.diff);
    const shover = spot.prefix.find(p => p.act === 'shove');
    const desc = shover ? `${spot.seats[spot.heroIdx].pos} vs ${spot.seats[shover.idx].pos} shove` : `${spot.seats[spot.heroIdx].pos} open`;
    stats.mistakes.unshift(`<b>${handName(spot.heroCards)}</b> ${desc} · ${STAGES[spot.stage].label}: you ${userAct === 'fold' ? 'folded' : userAct === 'call' ? 'called' : 'shoved'}, best ${v.best} (${Math.abs(v.diffBB).toFixed(2)}bb)`);
    stats.mistakes = stats.mistakes.slice(0, 25);
  }
  save('sr.stats', stats);
  renderSide();
  $('#btn-next').classList.remove('hidden');
  if (opts.autochart) build();
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('#btn-fold').addEventListener('click', () => answer('fold'));
$('#btn-go').addEventListener('click', () => answer('go'));
$('#btn-next').addEventListener('click', () => { newHand(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('#btn-reset-stats').addEventListener('click', () => {
  if (!confirm('Reset session stats?')) return;
  stats = { hands: 0, correct: 0, evLostBB: 0, evLost$: 0, streak: 0, best: 0, byStage: {}, mistakes: [] };
  save('sr.stats', stats); renderSide();
});
document.addEventListener('keydown', e => {
  if (!$('#tab-train').classList.contains('active') || e.target.matches('input, select, textarea')) return;
  if (e.key === 'f' || e.key === 'F') answer('fold');
  if (e.key === 'c' || e.key === 'C' || e.key === 's' || e.key === 'S') answer('go');
  if ((e.key === 'n' || e.key === 'Enter' || e.key === ' ') && cur?.answered) { e.preventDefault(); newHand(); }
});
window.addEventListener('resize', () => { if (cur) renderTable($('#table'), cur.spot); });

// ---------------- Settings ----------------
function renderSettings() {
  $$('[data-cfg]').forEach(inp => { inp.value = cfg[inp.dataset.cfg]; });
  const pays = makePayouts(cfg.entries, cfg.prizePerEntry, cfg.paidPct);
  const shown = pays.map((p, i) => [i + 1, p]).filter(([k]) => k <= 9 || k === pays.length || k % Math.ceil(pays.length / 8) === 0);
  $('#payout-preview').innerHTML = `<span>Prize pool <b>${fmt$(cfg.entries * cfg.prizePerEntry)}</b>, bounty pool <b>${fmt$(cfg.entries * cfg.startBounty)}</b>, ${pays.length} paid</span>` +
    shown.map(([k, p]) => `<span>${k}: <b>${fmt$(p)}</b></span>`).join('');
}
$('#cfg-save').addEventListener('click', () => {
  const n = { ...cfg };
  $$('[data-cfg]').forEach(inp => { const x = parseFloat(inp.value); if (!isNaN(x)) n[inp.dataset.cfg] = x; });
  n.entries = Math.max(10, Math.round(n.entries));
  n.koShare = Math.max(0, Math.min(1, n.koShare));
  cfg = n; save('sr.cfg', cfg); renderSettings();
  $('#cfg-msg').textContent = 'Saved. New hands use these settings.';
});
$('#cfg-reset').addEventListener('click', () => { cfg = { ...DEFAULT_CFG }; save('sr.cfg', cfg); renderSettings(); $('#cfg-msg').textContent = 'Defaults restored.'; });

// ---------------- Calculator ----------------
const ROLE_OPTS = ['fold', 'shove', 'call', 'hero', 'behind'];
function calcRows(size, preset) {
  const pos = POSITIONS[size];
  $('#c-seats').innerHTML = pos.map((p, i) => {
    const d = preset?.[i] || {};
    const role = d.role || (p === 'BB' ? 'hero' : p === 'BTN' ? 'shove' : 'fold');
    return `<tr data-i="${i}"><td><b>${p}</b></td>
      <td><input type="number" step="0.1" min="0.5" class="c-stack" value="${d.stack ?? 10}"></td>
      <td><input type="number" step="0.05" min="0" class="c-head" value="${d.head ?? cfg.startBounty}"></td>
      <td><select class="c-role">${ROLE_OPTS.map(r => `<option ${r === role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
      <td><select class="c-prof">${Object.entries(PROFILES).map(([k, v]) => `<option value="${k}" ${k === (d.prof || 'reg') ? 'selected' : ''}>${v.label}</option>`).join('')}</select></td>
      <td><input type="number" step="1" min="1" max="100" class="c-pct" placeholder="auto" value="${d.pct ?? ''}"></td></tr>`;
  }).join('');
}
const PRESETS = {
  l1bb: { left: Math.round(DEFAULT_CFG.entries * 0.95), avg: 10, avghead: 1, hand: 'K8o', size: 6, seats: [{}, {}, {}, { role: 'shove', prof: 'reg', stack: 9 }, {}, { role: 'hero', stack: 10 }] },
  l1sb: { left: Math.round(DEFAULT_CFG.entries * 0.95), avg: 10, avghead: 1, hand: 'Q6s', size: 6, seats: [{}, {}, {}, {}, { role: 'hero', stack: 10 }, { role: 'behind', prof: 'reg', stack: 10 }] },
  bubble: { left: 62, avg: 9, avghead: 2.5, hand: 'A7o', size: 6, seats: [{ stack: 6, head: 2 }, { stack: 14, head: 4 }, { role: 'shove', prof: 'reg', stack: 18, head: 5 }, { stack: 5, head: 1.5 }, { stack: 7, head: 2 }, { role: 'hero', stack: 11, head: 3 }] },
  ft: { left: 6, avg: 13, avghead: 0, hand: 'Q9o', size: 6, seats: [{ stack: 25, head: 60 }, { stack: 6, head: 12 }, { stack: 15, head: 30 }, { stack: 10, head: 20 }, { role: 'shove', prof: 'reg', stack: 9, head: 22 }, { role: 'hero', stack: 13, head: 28 }] },
  multi: { left: 200, avg: 11, avghead: 1.5, hand: 'AQo', size: 6, seats: [{}, { role: 'shove', prof: 'reg', stack: 8, head: 1.2 }, {}, { role: 'call', prof: 'fish', stack: 12, head: 1.6 }, {}, { role: 'hero', stack: 15, head: 2 }] },
};
function applyPreset(k) {
  const p = PRESETS[k];
  $('#c-left').value = p.left; $('#c-avg').value = p.avg; $('#c-avghead').value = p.avghead; $('#c-hand').value = p.hand; $('#c-size').value = p.size;
  calcRows(p.size, p.seats.map(s => ({ stack: 10, head: cfg.startBounty, ...s })));
}
$$('[data-preset]').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
$('#c-size').addEventListener('change', () => calcRows(+$('#c-size').value));

function parseHand(txt, rng) {
  txt = txt.trim();
  const m4 = txt.match(/^([2-9TJQKA])([shdc])([2-9TJQKA])([shdc])$/i);
  if (m4) {
    const c = (r, s) => RANKS.indexOf(r.toUpperCase()) * 4 + 'shdc'.indexOf(s.toLowerCase());
    const a = c(m4[1], m4[2]), b = c(m4[3], m4[4]);
    return a === b ? null : [a, b];
  }
  let t = txt.toUpperCase().replace(/O$/, 'o').replace(/S$/, 's');
  if (t.length === 3) t = t.slice(0, 2) + t[2].toLowerCase();
  let idx = CLASS_NAMES.indexOf(t);
  if (idx < 0 && t.length === 2) idx = CLASS_NAMES.indexOf(t + 'o');
  if (idx < 0 && t.length === 3) { const sw = t[1] + t[0] + t[2]; idx = CLASS_NAMES.indexOf(sw); }
  if (idx < 0) return null;
  return randomComboOfClass(idx, rng);
}

function buildCalcSpot() {
  const size = +$('#c-size').value;
  const pos = POSITIONS[size];
  const rows = $$('#c-seats tr').map(tr => ({
    stack: parseFloat(tr.querySelector('.c-stack').value), head: parseFloat(tr.querySelector('.c-head').value) || 0,
    role: tr.querySelector('.c-role').value, prof: tr.querySelector('.c-prof').value, pct: parseFloat(tr.querySelector('.c-pct').value),
  }));
  const heroIdx = rows.findIndex(r => r.role === 'hero');
  if (heroIdx < 0 || rows.filter(r => r.role === 'hero').length > 1) throw new Error('Pick exactly one Hero.');
  if (rows.some(r => !(r.stack > 0))) throw new Error('Every stack must be > 0.');
  const N = Math.max(size, Math.round(+$('#c-left').value));
  if (N > cfg.entries) throw new Error(`Players left (${N}) is larger than entries in Settings (${cfg.entries}).`);
  const avg = +$('#c-avg').value || 10, avgHead = +$('#c-avghead').value || 0;
  const payouts = makePayouts(cfg.entries, cfg.prizePerEntry, cfg.paidPct);
  const seed = (Math.random() * 2 ** 31) | 0;
  const rng = mulberry32(seed);
  const cards = parseHand($('#c-hand').value, rng);
  if (!cards) throw new Error('Could not read the hero hand. Use e.g. AJo, 77, T9s or AhJd.');
  const seats = rows.map((r, i) => ({ pos: pos[i], stack: r.stack, head: r.head, profile: i === heroIdx ? 'hero' : r.prof, name: i === heroIdx ? 'You' : `${pos[i]} (${PROFILES[r.prof].label})` }));
  const room = i => seats[i].stack - (seats[i].pos === 'BB' ? cfg.ante : 0);
  const paid = payouts.length, bubble = N <= paid + 5;
  const prefix = [];
  let shover = -1, nCall = 0;
  for (let i = 0; i < heroIdx; i++) {
    const r = rows[i];
    if (r.role === 'shove' && shover < 0) {
      shover = i; prefix.push({ idx: i, act: 'shove', pct: r.pct || shovePct(r.prof, pos[i], r.stack) });
    } else if (r.role === 'call' || (r.role === 'shove' && shover >= 0)) {
      if (shover < 0) throw new Error(`${pos[i]} calls, but nobody shoved before them.`);
      prefix.push({ idx: i, act: 'call', pct: r.pct || callPct(r.prof, { riskBB: Math.min(room(i), room(shover)), covers: room(i) >= room(shover), callersAhead: nCall, isBB: pos[i] === 'BB', bubble }) });
      nCall++;
    } else prefix.push({ idx: i, act: 'fold' });
  }
  const behind = [];
  for (let i = heroIdx + 1; i < size; i++) {
    const r = rows[i];
    const base = shover >= 0 ? room(shover) : 0;
    const lvl = Math.max(base, room(heroIdx));
    const pctIn = r.pct || callPct(r.prof, { riskBB: Math.min(room(i), lvl), covers: room(i) >= room(heroIdx), callersAhead: nCall + (shover >= 0 ? 1 : 0), isBB: pos[i] === 'BB', bubble });
    const pctOut = shover >= 0 ? (r.pct || callPct(r.prof, { riskBB: Math.min(room(i), base), covers: room(i) >= room(shover), callersAhead: nCall, isBB: pos[i] === 'BB', bubble })) : 0;
    behind.push({ idx: i, pctIn, pctOut });
  }
  const M = N - size;
  const tableChips = rows.reduce((a, r) => a + r.stack, 0);
  const others = M > 0 ? Array.from({ length: M }, (_, k) => Math.max(0.5, avg * (0.5 + ((k * 7919) % 100) / 100))) : [];
  const os = others.reduce((a, b) => a + b, 0);
  const othersScaled = M > 0 ? others.map(x => x / os * avg * M) : [];
  return {
    seed, stage: 'custom', type: shover >= 0 ? (nCall ? 'multi' : 'call') : 'open', cfg: { ...cfg },
    playersLeft: N, payouts, koShare: cfg.koShare, sb: 0.5, bb: 1, ante: cfg.ante,
    seats, heroIdx, prefix, behind, heroCards: cards,
    others: { stacks: othersScaled, heads: othersScaled.map(() => avgHead) },
    avgStack: (tableChips + avg * M) / N,
  };
}

$('#c-solve').addEventListener('click', () => {
  $('#c-msg').textContent = '';
  let spot;
  try { spot = buildCalcSpot(); } catch (e) { $('#c-msg').textContent = '⚠ ' + e.message; return; }
  const rt = prepareSpot(spot);
  const res = solveSpot(rt, spot.heroCards, 40000, spot.seed);
  const el = $('#calc-result');
  el.innerHTML = '';
  const tb = document.createElement('div'); tb.className = 'tourney-bar';
  const tbl = document.createElement('div'); tbl.className = 'table-wrap';
  const box = document.createElement('div');
  el.append(tb, tbl, box);
  renderTourneyBar(tb, spot, rt);
  renderTable(tbl, spot);
  const hh = document.createElement('div'); hh.className = 'decision';
  hh.innerHTML = `<div class="hero-hand">${spot.heroCards.map(c => cardHtml(c, true)).join('')}<span class="label">${handName(spot.heroCards)}</span></div>`;
  tbl.after(hh);
  el.classList.remove('hidden');
  const { build } = renderResult(box, spot, rt, res, null);
  box.classList.remove('result');
  build();
  el.scrollIntoView({ behavior: 'smooth' });
});

// ---------------- Boot ----------------
renderDrillOptions();
renderSide();
calcRows(6);
applyPreset('l1bb');
newHand();
