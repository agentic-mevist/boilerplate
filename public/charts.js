// Hand-rolled SVG charts: weight line chart + calories bar chart.
// Marks: 2px lines, r4 dots with 2px surface ring, bars ≤24px with 4px rounded
// data-end and 2px gaps, hairline solid grid, one y-axis per chart, crosshair
// tooltip listing every series at the hovered X. Colors come from CSS tokens.

const NS = 'http://www.w3.org/2000/svg';
const PAD = { l: 44, r: 14, t: 10, b: 26 };

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function niceStep(range, maxTicks) {
  const rough = range / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * mag >= rough) return m * mag;
  }
  return 10 * mag;
}

function yTicks(min, max, maxTicks = 4) {
  const step = niceStep(max - min || 1, maxTicks);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Math.round(v * 100) / 100);
  return { ticks, lo, hi };
}

function fmt(n, dp = 0) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Pick ~5 x-axis label positions across the day list.
function xLabelIdx(n) {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i);
  const count = 5;
  if (n <= 1) return [0];
  const idx = new Set();
  for (let i = 0; i < count; i++) idx.add(Math.round((i * (n - 1)) / (count - 1)));
  return [...idx];
}

function makeSvg(container, height) {
  container.textContent = '';
  const width = Math.max(240, container.clientWidth || 320);
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, height });
  container.appendChild(svg);
  return { svg, width };
}

function drawAxis(svg, width, plotBottom, ticks, yOf, unit) {
  for (const t of ticks) {
    const y = yOf(t);
    const line = el('line', { x1: PAD.l, x2: width - PAD.r, y1: y, y2: y, class: 'gridline' });
    svg.appendChild(line);
    const text = el('text', { x: PAD.l - 6, y: y + 3.5, 'text-anchor': 'end', class: 'axis-text' });
    text.textContent = fmt(t, t % 1 ? 1 : 0);
    svg.appendChild(text);
  }
  const base = el('line', { x1: PAD.l, x2: width - PAD.r, y1: plotBottom, y2: plotBottom, class: 'baseline' });
  svg.appendChild(base);
}

function drawXLabels(svg, days, xOf, plotBottom) {
  for (const i of xLabelIdx(days.length)) {
    const text = el('text', { x: xOf(i), y: plotBottom + 16, 'text-anchor': 'middle', class: 'axis-text' });
    text.textContent = days[i].label;
    svg.appendChild(text);
  }
}

// surface-colored halo so a label stays legible where it crosses marks
function halo(textEl) {
  textEl.style.paintOrder = 'stroke';
  textEl.style.stroke = css('--surface') || '#fcfcfb';
  textEl.style.strokeWidth = '3.5px';
  textEl.style.strokeLinejoin = 'round';
}

function tooltipDiv(container) {
  let tt = container.querySelector('.tooltip');
  if (!tt) {
    tt = document.createElement('div');
    tt.className = 'tooltip hidden';
    container.appendChild(tt);
  }
  return tt;
}

function showTooltip(container, tt, px, rows, dateLabel) {
  tt.textContent = '';
  const d = document.createElement('div');
  d.className = 'tt-date';
  d.textContent = dateLabel;
  tt.appendChild(d);
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'tt-row';
    const key = document.createElement('span');
    key.className = 'tt-key';
    key.style.background = r.color;
    const name = document.createElement('span');
    name.textContent = r.name;
    const val = document.createElement('span');
    val.className = 'tt-val';
    val.textContent = r.value;
    row.append(key, name, val);
    tt.appendChild(row);
  }
  tt.classList.remove('hidden');
  const cw = container.clientWidth;
  const tw = tt.offsetWidth;
  let left = px + 12;
  if (left + tw > cw - 4) left = px - tw - 12;
  tt.style.left = `${Math.max(4, left)}px`;
  tt.style.top = '8px';
}

// ---------------------------------------------------------------- weight ---
// days: [{label, dateLabel, weight|null, trend|null}], unit: 'kg'|'lb'
export function renderWeightChart(container, days, unit) {
  const H = 210;
  const { svg, width } = makeSvg(container, H);
  const plotBottom = H - PAD.b;
  const vals = [];
  for (const d of days) {
    if (d.weight != null) vals.push(d.weight);
    if (d.trend != null) vals.push(d.trend);
  }
  if (!vals.length) {
    const t = el('text', { x: width / 2, y: H / 2, 'text-anchor': 'middle', class: 'axis-text' });
    t.textContent = 'No weigh-ins yet — log one on the Today tab';
    svg.appendChild(t);
    return;
  }
  const span = Math.max(0.8, Math.max(...vals) - Math.min(...vals));
  const { ticks, lo, hi } = yTicks(Math.min(...vals) - span * 0.15, Math.max(...vals) + span * 0.15);
  const yOf = (v) => plotBottom - ((v - lo) / (hi - lo)) * (plotBottom - PAD.t);
  const n = days.length;
  const xOf = (i) => PAD.l + ((i + 0.5) / n) * (width - PAD.l - PAD.r);

  drawAxis(svg, width, plotBottom, ticks, yOf, unit);
  drawXLabels(svg, days, xOf, plotBottom);

  const cDot = css('--series-1-lt') || '#86b6ef';
  const cLine = css('--series-1') || '#2a78d6';
  const cSurface = css('--surface') || '#fcfcfb';

  // 7-day trend line (2px, round caps), broken across gaps
  let dPath = '';
  let pen = false;
  for (let i = 0; i < n; i++) {
    if (days[i].trend == null) { pen = false; continue; }
    dPath += `${pen ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(days[i].trend).toFixed(1)}`;
    pen = true;
  }
  if (dPath) {
    svg.appendChild(el('path', {
      d: dPath, fill: 'none', stroke: cLine, 'stroke-width': 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }));
  }

  // daily weigh-in dots: r4 with 2px surface ring
  for (let i = 0; i < n; i++) {
    if (days[i].weight == null) continue;
    svg.appendChild(el('circle', {
      cx: xOf(i), cy: yOf(days[i].weight), r: 4,
      fill: cDot, stroke: cSurface, 'stroke-width': 2,
    }));
  }

  // selective direct label: trend endpoint
  let lastIdx = -1;
  for (let i = n - 1; i >= 0; i--) if (days[i].trend != null) { lastIdx = i; break; }
  if (lastIdx >= 0) {
    const lx = xOf(lastIdx), ly = yOf(days[lastIdx].trend);
    svg.appendChild(el('circle', { cx: lx, cy: ly, r: 4, fill: cLine, stroke: cSurface, 'stroke-width': 2 }));
    const anchor = lx > width - 64 ? 'end' : 'start';
    const label = el('text', {
      x: anchor === 'end' ? lx - 8 : lx + 8,
      y: ly - 10, 'text-anchor': anchor,
      class: 'axis-text', 'font-weight': 650,
    });
    label.textContent = `${fmt(days[lastIdx].trend, 1)} ${unit}`;
    label.style.fill = css('--ink-2');
    halo(label);
    svg.appendChild(label);
  }

  // crosshair + tooltip
  const tt = tooltipDiv(container);
  const cross = el('line', { y1: PAD.t, y2: plotBottom, class: 'crosshair', visibility: 'hidden' });
  svg.appendChild(cross);
  const hasData = (i) => days[i].weight != null || days[i].trend != null;

  function onMove(clientX) {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * width;
    let best = -1, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!hasData(i)) continue;
      const d = Math.abs(xOf(i) - px);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    if (best < 0) return;
    const x = xOf(best);
    cross.setAttribute('x1', x); cross.setAttribute('x2', x);
    cross.setAttribute('visibility', 'visible');
    const rows = [];
    if (days[best].weight != null) rows.push({ name: 'Daily', color: cDot, value: `${fmt(days[best].weight, 1)} ${unit}` });
    if (days[best].trend != null) rows.push({ name: '7-day trend', color: cLine, value: `${fmt(days[best].trend, 1)} ${unit}` });
    showTooltip(container, tt, (x / width) * container.clientWidth, rows, days[best].dateLabel);
  }
  svg.addEventListener('pointermove', (e) => onMove(e.clientX));
  svg.addEventListener('pointerleave', () => {
    cross.setAttribute('visibility', 'hidden');
    tt.classList.add('hidden');
  });
}

// ---------------------------------------------------------------- kcal ----
// days: [{label, dateLabel, kcal|null}], target: number|null
export function renderKcalChart(container, days, target) {
  const H = 190;
  const { svg, width } = makeSvg(container, H);
  const plotBottom = H - PAD.b;
  const vals = days.filter((d) => d.kcal != null).map((d) => d.kcal);
  if (!vals.length) {
    const t = el('text', { x: width / 2, y: H / 2, 'text-anchor': 'middle', class: 'axis-text' });
    t.textContent = 'No food logged in this period yet';
    svg.appendChild(t);
    return;
  }
  const maxV = Math.max(...vals, target || 0) * 1.1;
  const { ticks, hi } = yTicks(0, maxV, 3);
  const yOf = (v) => plotBottom - (v / hi) * (plotBottom - PAD.t);
  const n = days.length;
  const band = (width - PAD.l - PAD.r) / n;
  const xOf = (i) => PAD.l + (i + 0.5) * band;
  const barW = Math.max(2, Math.min(24, band - 2)); // ≤24px thick, 2px surface gap

  drawAxis(svg, width, plotBottom, ticks.filter((t) => t >= 0), yOf);
  drawXLabels(svg, days, xOf, plotBottom);

  const cBar = css('--series-2') || '#1baf7a';

  // bars: 4px rounded data-end, square at baseline
  for (let i = 0; i < n; i++) {
    const v = days[i].kcal;
    if (v == null || v <= 0) continue;
    const x = xOf(i) - barW / 2;
    const y = yOf(v);
    const h = plotBottom - y;
    const r = Math.min(4, barW / 2, h);
    const d = `M${x},${plotBottom} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${plotBottom} Z`;
    svg.appendChild(el('path', { d, fill: cBar, 'data-i': i }));
  }

  // target: solid hairline + muted label
  if (target) {
    const ty = yOf(target);
    svg.appendChild(el('line', { x1: PAD.l, x2: width - PAD.r, y1: ty, y2: ty, class: 'baseline' }));
    const lbl = el('text', { x: width - PAD.r, y: ty - 5, 'text-anchor': 'end', class: 'target-label' });
    lbl.textContent = `Target ${fmt(target)}`;
    halo(lbl);
    svg.appendChild(lbl);
  }

  // per-bar hover: full-band hit targets
  const tt = tooltipDiv(container);
  let lifted = null;
  for (let i = 0; i < n; i++) {
    const hit = el('rect', {
      x: PAD.l + i * band, y: PAD.t, width: band, height: plotBottom - PAD.t,
      fill: 'transparent', 'data-i': i, tabindex: days[i].kcal != null ? 0 : -1,
    });
    const show = () => {
      if (days[i].kcal == null) { tt.classList.add('hidden'); return; }
      if (lifted) lifted.setAttribute('opacity', 1);
      lifted = svg.querySelector(`path[data-i="${i}"]`);
      if (lifted) lifted.setAttribute('opacity', 0.75);
      showTooltip(container, tt, ((xOf(i)) / width) * container.clientWidth,
        [{ name: 'Calories', color: cBar, value: fmt(days[i].kcal) }], days[i].dateLabel);
    };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('focus', show);
    svg.appendChild(hit);
  }
  svg.addEventListener('pointerleave', () => {
    if (lifted) lifted.setAttribute('opacity', 1);
    tt.classList.add('hidden');
  });
}
