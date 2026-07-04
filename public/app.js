import { BUILTIN_FOODS } from '/foods.js';
import { renderWeightChart, renderKcalChart } from '/charts.js';

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------- state ----
const DEFAULTS = { kcal_target: 2200, protein_target: 140, carbs_target: 230, fat_target: 70, unit: 'kg' };
let settings = { ...DEFAULTS };
let customFoods = [];
let curDate = today();
let range = 30;           // progress range: 7 | 30 | 90 | 'all'
let lastHistory = null;   // cached rows for chart re-render on resize

// ------------------------------------------------------------- utils ----
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function parseIso(s) { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }
function fmt(n, dp = 0) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
const kg2disp = (kg) => settings.unit === 'lb' ? kg * 2.20462 : kg;
const disp2kg = (v) => settings.unit === 'lb' ? v / 2.20462 : v;

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

// --------------------------------------------------------------- api ----
async function api(path, opts = {}) {
  const res = await fetch(`/api/${path}`, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      'x-pin': localStorage.getItem('pin') || '',
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    showPin(localStorage.getItem('pin') ? 'expired' : '');
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request failed (${res.status})`);
  }
  return res.json();
}

// ---------------------------------------------------------- PIN gate ----
function showPin(state) {
  $('pin-screen').classList.remove('hidden');
  $('app').classList.add('hidden');
  $('tabbar').classList.add('hidden');
  $('pin-error').classList.toggle('hidden', state !== 'wrong');
  if (state) localStorage.removeItem('pin');
  setTimeout(() => $('pin-input').focus(), 50);
}

async function tryUnlock(pin) {
  localStorage.setItem('pin', pin);
  try {
    await api('settings');
    $('pin-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('tabbar').classList.remove('hidden');
    await boot();
  } catch {
    showPin('wrong');
  }
}

$('pin-submit').addEventListener('click', () => tryUnlock($('pin-input').value.trim()));
$('pin-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryUnlock($('pin-input').value.trim());
});

// ---------------------------------------------------------- boot/init ----
async function boot() {
  const [s, f] = await Promise.all([api('settings'), api('foods')]);
  settings = { ...DEFAULTS, ...s };
  customFoods = f.foods;
  renderSettingsForm();
  await loadDay();
}

// ------------------------------------------------------------- views ----
const views = { today: $('view-today'), progress: $('view-progress'), settings: $('view-settings') };
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('selected', t === tab));
    const name = tab.dataset.view;
    for (const [k, v] of Object.entries(views)) v.classList.toggle('hidden', k !== name);
    if (name === 'progress') loadProgress();
    if (name === 'settings') { renderSettingsForm(); renderMyFoods(); }
    window.scrollTo(0, 0);
  });
});

// ========================================================== TODAY ========
function dateLabel(d) {
  const t = today();
  if (iso(d) === iso(t)) return 'Today';
  if (iso(d) === iso(addDays(t, -1))) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

$('date-prev').addEventListener('click', () => { curDate = addDays(curDate, -1); loadDay(); });
$('date-next').addEventListener('click', () => {
  if (iso(curDate) < iso(today())) { curDate = addDays(curDate, 1); loadDay(); }
});
$('date-label').addEventListener('click', () => { curDate = today(); loadDay(); });

async function loadDay() {
  $('date-label').textContent = dateLabel(curDate);
  $('date-next').style.visibility = iso(curDate) < iso(today()) ? 'visible' : 'hidden';
  let data;
  try {
    data = await api(`day?date=${iso(curDate)}`);
  } catch (e) {
    if (e.message !== 'unauthorized') toast(e.message);
    return;
  }
  renderDay(data);
}

function renderDay({ entries, weight }) {
  const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) { tot.kcal += e.kcal; tot.protein += e.protein; tot.carbs += e.carbs; tot.fat += e.fat; }

  const left = settings.kcal_target - tot.kcal;
  $('hero-label').textContent = left >= 0 ? 'Calories left' : 'Over target';
  $('hero-kcal').textContent = fmt(Math.abs(left));
  $('hero-kcal').classList.toggle('over', left < 0);
  $('hero-sub').textContent = `${fmt(tot.kcal)} eaten · target ${fmt(settings.kcal_target)}`;
  const pct = Math.min(100, (tot.kcal / settings.kcal_target) * 100);
  const kcalMeter = $('kcal-meter');
  kcalMeter.style.width = `${pct}%`;
  kcalMeter.classList.toggle('warn', left < 0);

  for (const [key, target] of [['protein', settings.protein_target], ['carbs', settings.carbs_target], ['fat', settings.fat_target]]) {
    $(`tile-${key}`).textContent = `${fmt(tot[key])} g`;
    $(`tile-${key}-t`).textContent = `of ${fmt(target)} g`;
    $(`meter-${key}`).style.width = `${Math.min(100, (tot[key] / target) * 100)}%`;
  }

  $('weight-unit').textContent = settings.unit;
  $('weight-input').value = weight != null ? fmt(kg2disp(weight), 1).replace(',', '') : '';

  const list = $('entry-list');
  list.textContent = '';
  if (!entries.length) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = 'Nothing logged yet. Tap “+ Add food”.';
    list.appendChild(p);
    return;
  }
  for (const e of entries) {
    const row = document.createElement('div');
    row.className = 'entry';
    const main = document.createElement('div');
    main.className = 'entry-main';
    const name = document.createElement('div');
    name.className = 'entry-name';
    name.textContent = e.name;
    const sub = document.createElement('div');
    sub.className = 'entry-sub';
    sub.textContent = `${e.grams ? `${fmt(e.grams)} g · ` : ''}P ${fmt(e.protein)} · C ${fmt(e.carbs)} · F ${fmt(e.fat)}`;
    main.append(name, sub);
    const kcal = document.createElement('div');
    kcal.className = 'entry-kcal';
    kcal.textContent = fmt(e.kcal);
    const del = document.createElement('button');
    del.className = 'entry-del';
    del.textContent = '✕';
    del.setAttribute('aria-label', `Delete ${e.name}`);
    del.addEventListener('click', async () => {
      try { await api(`entries/${e.id}`, { method: 'DELETE' }); loadDay(); }
      catch (err) { toast(err.message); }
    });
    row.append(main, kcal, del);
    list.appendChild(row);
  }
}

$('weight-save').addEventListener('click', async () => {
  const v = parseFloat($('weight-input').value);
  if (!Number.isFinite(v) || v <= 0) { toast('Enter a weight first'); return; }
  try {
    await api('weight', { method: 'PUT', body: JSON.stringify({ date: iso(curDate), kg: disp2kg(v) }) });
    toast('Weight saved');
  } catch (e) { toast(e.message); }
});

// ==================================================== ADD-FOOD SHEET =====
let selectedFood = null; // {name, kcal, protein, carbs, fat, serving_g, mine}

function allFoods() {
  const builtin = BUILTIN_FOODS.map(([name, kcal, protein, carbs, fat, serv]) => (
    { name, kcal, protein, carbs, fat, serving_g: serv || null, mine: false }
  ));
  const mine = customFoods.map((f) => ({ ...f, mine: true }));
  return [...mine, ...builtin];
}

function openSheet() {
  $('sheet').classList.remove('hidden');
  $('sheet-backdrop').classList.remove('hidden');
  setSheetMode('search');
  $('food-search').value = '';
  showDetail(null);
  renderResults('');
}
function closeSheets() {
  $('sheet').classList.add('hidden');
  $('foodsheet').classList.add('hidden');
  $('sheet-backdrop').classList.add('hidden');
}
$('add-entry').addEventListener('click', openSheet);
$('sheet-backdrop').addEventListener('click', closeSheets);

function setSheetMode(mode) {
  document.querySelectorAll('#sheet-tabs .chip').forEach((c) =>
    c.classList.toggle('selected', c.dataset.mode === mode));
  $('sheet-search').classList.toggle('hidden', mode !== 'search');
  $('sheet-manual').classList.toggle('hidden', mode !== 'manual');
}
document.querySelectorAll('#sheet-tabs .chip').forEach((c) =>
  c.addEventListener('click', () => setSheetMode(c.dataset.mode)));

function renderResults(query) {
  const q = query.trim().toLowerCase();
  const box = $('food-results');
  box.textContent = '';
  const matches = allFoods()
    .filter((f) => !q || f.name.toLowerCase().includes(q))
    .slice(0, 30);
  if (!matches.length) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = 'No match — use the Manual tab to log it anyway.';
    box.appendChild(p);
    return;
  }
  for (const f of matches) {
    const btn = document.createElement('button');
    btn.className = 'food-result';
    const left = document.createElement('div');
    const nm = document.createElement('div');
    nm.textContent = f.name;
    if (f.mine) {
      const tag = document.createElement('span');
      tag.className = 'mine';
      tag.textContent = 'MINE';
      nm.appendChild(tag);
    }
    const sub = document.createElement('div');
    sub.className = 'fr-sub';
    sub.textContent = `P ${fmt(f.protein)} · C ${fmt(f.carbs)} · F ${fmt(f.fat)} per 100 g`;
    left.append(nm, sub);
    const kc = document.createElement('span');
    kc.className = 'fr-kcal';
    kc.textContent = `${fmt(f.kcal)} kcal`;
    btn.append(left, kc);
    btn.addEventListener('click', () => showDetail(f));
    box.appendChild(btn);
  }
}
$('food-search').addEventListener('input', (e) => renderResults(e.target.value));

function showDetail(food) {
  selectedFood = food;
  $('food-detail').classList.toggle('hidden', !food);
  $('food-results').classList.toggle('hidden', !!food);
  $('food-search').classList.toggle('hidden', !!food);
  if (!food) return;
  $('detail-name').textContent = food.name;
  $('detail-per').textContent = `${fmt(food.kcal)} kcal · P ${fmt(food.protein)} · C ${fmt(food.carbs)} · F ${fmt(food.fat)} per 100 g`;
  $('grams-input').value = food.serving_g || 100;
  const chips = $('grams-chips');
  chips.textContent = '';
  const opts = [...new Set([food.serving_g, 50, 100, 150, 200].filter(Boolean))];
  for (const g of opts) {
    const c = document.createElement('button');
    c.className = 'chip';
    c.textContent = g === food.serving_g ? `1 serving (${fmt(g)} g)` : `${g} g`;
    c.addEventListener('click', () => { $('grams-input').value = g; updatePreview(); });
    chips.appendChild(c);
  }
  updatePreview();
}
$('detail-back').addEventListener('click', () => showDetail(null));
$('grams-input').addEventListener('input', updatePreview);

function scaled() {
  const g = parseFloat($('grams-input').value) || 0;
  const k = g / 100;
  return {
    grams: g,
    kcal: selectedFood.kcal * k,
    protein: selectedFood.protein * k,
    carbs: selectedFood.carbs * k,
    fat: selectedFood.fat * k,
  };
}

function updatePreview() {
  if (!selectedFood) return;
  const s = scaled();
  const box = $('macro-preview');
  box.textContent = '';
  for (const [label, val] of [['kcal', s.kcal], ['protein', s.protein], ['carbs', s.carbs], ['fat', s.fat]]) {
    const d = document.createElement('div');
    d.className = 'mp';
    const b = document.createElement('b');
    b.textContent = fmt(val);
    const sp = document.createElement('span');
    sp.textContent = label === 'kcal' ? 'kcal' : `${label} g`;
    d.append(b, sp);
    box.appendChild(d);
  }
}

$('detail-add').addEventListener('click', async () => {
  if (!selectedFood) return;
  const s = scaled();
  if (!s.grams) { toast('Enter grams'); return; }
  try {
    await api('entries', {
      method: 'POST',
      body: JSON.stringify({ date: iso(curDate), name: selectedFood.name, ...s }),
    });
    closeSheets();
    loadDay();
  } catch (e) { toast(e.message); }
});

$('manual-add').addEventListener('click', async () => {
  const name = $('man-name').value.trim() || 'Quick add';
  const protein = parseFloat($('man-protein').value) || 0;
  const carbs = parseFloat($('man-carbs').value) || 0;
  const fat = parseFloat($('man-fat').value) || 0;
  let kcal = parseFloat($('man-kcal').value);
  if (!Number.isFinite(kcal)) kcal = protein * 4 + carbs * 4 + fat * 9;
  if (!kcal && !protein && !carbs && !fat) { toast('Enter at least one value'); return; }
  try {
    await api('entries', {
      method: 'POST',
      body: JSON.stringify({ date: iso(curDate), name, grams: null, kcal, protein, carbs, fat }),
    });
    ['man-name', 'man-kcal', 'man-protein', 'man-carbs', 'man-fat'].forEach((id) => { $(id).value = ''; });
    closeSheets();
    loadDay();
  } catch (e) { toast(e.message); }
});

// ======================================================== PROGRESS =======
document.querySelectorAll('#range-row .chip').forEach((c) =>
  c.addEventListener('click', () => {
    document.querySelectorAll('#range-row .chip').forEach((x) => x.classList.toggle('selected', x === c));
    range = c.dataset.range === 'all' ? 'all' : Number(c.dataset.range);
    loadProgress();
  }));

async function loadProgress() {
  const to = iso(today());
  // fetch 6 extra days before the window so the 7-day trend is right from day one
  const from = range === 'all' ? '2015-01-01' : iso(addDays(today(), -(range - 1 + 6)));
  let hist;
  try {
    hist = await api(`history?from=${from}&to=${to}`);
  } catch (e) {
    if (e.message !== 'unauthorized') toast(e.message);
    return;
  }
  lastHistory = hist;
  renderProgress(hist);
}

function buildDays(hist) {
  const kcalBy = Object.fromEntries(hist.days.map((d) => [d.date, d]));
  const wBy = Object.fromEntries(hist.weights.map((w) => [w.date, kg2disp(w.kg)]));
  const allDates = [...hist.days.map((d) => d.date), ...hist.weights.map((w) => w.date)].sort();

  let start;
  if (range === 'all') {
    start = allDates.length ? parseIso(allDates[0]) : addDays(today(), -29);
  } else {
    start = addDays(today(), -(range - 1));
  }
  const days = [];
  const short = (d, span) => span <= 7
    ? d.toLocaleDateString('en-US', { weekday: 'short' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const span = Math.round((today() - start) / 86400000) + 1;

  for (let d = new Date(start); d <= today(); d = addDays(d, 1)) {
    const key = iso(d);
    // trend: average of weigh-ins over the trailing 7 days
    const win = [];
    for (let i = 0; i < 7; i++) {
      const k = iso(addDays(d, -i));
      if (wBy[k] != null) win.push(wBy[k]);
    }
    days.push({
      date: key,
      label: short(d, span),
      dateLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      weight: wBy[key] ?? null,
      trend: win.length ? win.reduce((a, b) => a + b, 0) / win.length : null,
      kcal: kcalBy[key] ? kcalBy[key].kcal : null,
      protein: kcalBy[key] ? kcalBy[key].protein : null,
    });
  }
  return days;
}

function renderProgress(hist) {
  const days = buildDays(hist);
  const unit = settings.unit;

  // stat tiles
  const weighed = days.filter((d) => d.weight != null);
  if (weighed.length) {
    const last = weighed[weighed.length - 1];
    $('stat-weight').textContent = `${fmt(last.weight, 1)} ${unit}`;
    const firstTrend = days.find((d) => d.trend != null);
    const lastTrend = [...days].reverse().find((d) => d.trend != null);
    if (firstTrend && lastTrend && firstTrend !== lastTrend) {
      const delta = lastTrend.trend - firstTrend.trend;
      const arrow = delta < -0.05 ? '▼' : delta > 0.05 ? '▲' : '·';
      $('stat-weight-delta').textContent = `${arrow} ${fmt(Math.abs(delta), 1)} ${unit} over this period`;
    } else {
      $('stat-weight-delta').textContent = 'first weigh-in of this period';
    }
  } else {
    $('stat-weight').textContent = '—';
    $('stat-weight-delta').textContent = 'no weigh-ins yet';
  }

  const logged = days.filter((d) => d.kcal != null);
  if (logged.length) {
    const avg = logged.reduce((a, d) => a + d.kcal, 0) / logged.length;
    $('stat-kcal').textContent = fmt(avg);
    $('stat-kcal-sub').textContent = `across ${logged.length} logged day${logged.length > 1 ? 's' : ''}`;
  } else {
    $('stat-kcal').textContent = '—';
    $('stat-kcal-sub').textContent = 'no food logged yet';
  }

  renderWeightChart($('chart-weight'), days, unit);
  renderKcalChart($('chart-kcal'), days, settings.kcal_target);
  renderTable(days, unit);
}

function renderTable(days, unit) {
  const table = $('data-table');
  table.textContent = '';
  const head = table.createTHead().insertRow();
  for (const h of ['Date', 'Calories', 'Protein (g)', `Weight (${unit})`]) {
    const th = document.createElement('th');
    th.textContent = h;
    head.appendChild(th);
  }
  const body = table.createTBody();
  for (const d of [...days].reverse()) {
    if (d.kcal == null && d.weight == null) continue;
    const tr = body.insertRow();
    for (const v of [d.dateLabel, d.kcal != null ? fmt(d.kcal) : '—',
      d.protein != null ? fmt(d.protein) : '—', d.weight != null ? fmt(d.weight, 1) : '—']) {
      tr.insertCell().textContent = v;
    }
  }
}

$('table-toggle').addEventListener('click', () => {
  const wrap = $('data-table-wrap');
  wrap.classList.toggle('hidden');
  $('table-toggle').textContent = wrap.classList.contains('hidden') ? 'Show data table' : 'Hide data table';
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!views.progress.classList.contains('hidden') && lastHistory) renderProgress(lastHistory);
  }, 150);
});

// ======================================================== SETTINGS =======
function renderSettingsForm() {
  $('set-kcal').value = settings.kcal_target;
  $('set-protein').value = settings.protein_target;
  $('set-carbs').value = settings.carbs_target;
  $('set-fat').value = settings.fat_target;
  $('set-unit').value = settings.unit;
}

$('settings-save').addEventListener('click', async () => {
  const next = {
    kcal_target: parseInt($('set-kcal').value, 10) || DEFAULTS.kcal_target,
    protein_target: parseInt($('set-protein').value, 10) || DEFAULTS.protein_target,
    carbs_target: parseInt($('set-carbs').value, 10) || DEFAULTS.carbs_target,
    fat_target: parseInt($('set-fat').value, 10) || DEFAULTS.fat_target,
    unit: $('set-unit').value === 'lb' ? 'lb' : 'kg',
  };
  try {
    await api('settings', { method: 'PUT', body: JSON.stringify(next) });
    settings = { ...settings, ...next };
    toast('Saved');
    loadDay();
  } catch (e) { toast(e.message); }
});

function renderMyFoods() {
  const list = $('myfoods-list');
  list.textContent = '';
  if (!customFoods.length) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = 'No custom foods yet.';
    list.appendChild(p);
    return;
  }
  for (const f of customFoods) {
    const row = document.createElement('div');
    row.className = 'entry';
    const main = document.createElement('div');
    main.className = 'entry-main';
    const nm = document.createElement('div');
    nm.className = 'entry-name';
    nm.textContent = f.name;
    const sub = document.createElement('div');
    sub.className = 'entry-sub';
    sub.textContent = `${fmt(f.kcal)} kcal · P ${fmt(f.protein)} · C ${fmt(f.carbs)} · F ${fmt(f.fat)} per 100 g`;
    main.append(nm, sub);
    const del = document.createElement('button');
    del.className = 'entry-del';
    del.textContent = '✕';
    del.addEventListener('click', async () => {
      try {
        await api(`foods/${f.id}`, { method: 'DELETE' });
        customFoods = customFoods.filter((x) => x.id !== f.id);
        renderMyFoods();
      } catch (e) { toast(e.message); }
    });
    row.append(main, del);
    list.appendChild(row);
  }
}

$('food-new').addEventListener('click', () => {
  $('foodsheet').classList.remove('hidden');
  $('sheet-backdrop').classList.remove('hidden');
});

$('nf-save').addEventListener('click', async () => {
  const body = {
    name: $('nf-name').value.trim(),
    kcal: parseFloat($('nf-kcal').value) || 0,
    protein: parseFloat($('nf-protein').value) || 0,
    carbs: parseFloat($('nf-carbs').value) || 0,
    fat: parseFloat($('nf-fat').value) || 0,
    serving_g: parseFloat($('nf-serving').value) || null,
  };
  if (!body.name) { toast('Give it a name'); return; }
  try {
    const r = await api('foods', { method: 'POST', body: JSON.stringify(body) });
    customFoods = [...customFoods, { ...body, id: r.id }].sort((a, b) => a.name.localeCompare(b.name));
    ['nf-name', 'nf-kcal', 'nf-protein', 'nf-carbs', 'nf-fat', 'nf-serving'].forEach((id) => { $(id).value = ''; });
    closeSheets();
    renderMyFoods();
    toast('Food saved');
  } catch (e) { toast(e.message); }
});

$('lock-btn').addEventListener('click', () => {
  localStorage.removeItem('pin');
  showPin('');
});

// --------------------------------------------------------------- start ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

if (localStorage.getItem('pin')) {
  $('app').classList.remove('hidden');
  $('tabbar').classList.remove('hidden');
  boot().catch(() => {});
} else {
  showPin('');
}
