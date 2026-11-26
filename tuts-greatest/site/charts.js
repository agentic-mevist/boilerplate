// Charts tab: songs per year (columns) and year × rank (scatter). Plain SVG, no libraries.
(() => {
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const RED = '#ec1c24', RED_DARK = '#b3121a', GRAY = '#d6d6d6', INK = '#111', MUTE = '#6b6b6b', GRID = '#e8e8e8';
  let selYear = null, pickRank = null, built = false;

  const G = () => window.GROOVE;
  const yr = (x) => +String(x.year).slice(0, 4);
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11) ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  const songsWord = (n) => `${n} ${plural(n, 'песня', 'песни', 'песен')}`;
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // ---------- tooltip (text only via textContent) ----------
  const tip = () => $('#tip');
  function showTip(evt, strong, rest) {
    const t = tip();
    t.textContent = '';
    const b = document.createElement('b'); b.textContent = strong; t.appendChild(b);
    if (rest) { const s = document.createElement('span'); s.textContent = rest; t.appendChild(s); }
    t.hidden = false;
    const r = t.getBoundingClientRect();
    let x = evt.clientX + 14, y = evt.clientY + 14;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - 14;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  const hideTip = () => { tip().hidden = true; };

  // ---------- KPI tiles ----------
  function kpis(S) {
    const by = {};
    S.forEach(x => { by[yr(x)] = (by[yr(x)] || 0) + 1; });
    const [topY, topN] = Object.entries(by).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    const dec = {};
    S.forEach(x => { const d = Math.floor(yr(x) / 10) * 10; dec[d] = (dec[d] || 0) + 1; });
    const [topD, topDN] = Object.entries(dec).sort((a, b) => b[1] - a[1])[0];
    const sorted = [...S].sort((a, b) => yr(a) - yr(b) || a.rank - b.rank);
    const median = yr(sorted[Math.floor(sorted.length / 2)]);
    const oldest = sorted[0], newest = sorted[sorted.length - 1];
    const top10 = S.filter(x => x.rank <= 100);
    const t100 = {}; top10.forEach(x => { const d = Math.floor(yr(x) / 10) * 10; t100[d] = (t100[d] || 0) + 1; });
    const [t100D, t100N] = Object.entries(t100).sort((a, b) => b[1] - a[1])[0];
    const tile = (label, value, sub, year) => `<button class="kpi" ${year ? `data-year="${year}"` : ''}><span class="klabel">${label}</span><span class="kval">${value}</span><span class="ksub">${G().esc(sub)}</span></button>`;
    $('#kpis').innerHTML =
      tile('Самый плотный год', topY, songsWord(+topN), topY) +
      tile('Самое плотное десятилетие', `${String(topD).slice(2)}-е`, `${songsWord(topDN)} из 500 (${Math.round(topDN / 5)}%)`) +
      tile('Половина песен старше', median, 'медианный год') +
      tile('В топ-100 чаще всего', `${String(t100D).slice(2)}-е`, `${songsWord(t100N)} из 100`) +
      tile('Самая старая', yr(oldest), `#${oldest.rank} ${oldest.artist} — ${oldest.song}`, yr(oldest)) +
      tile('Самая новая', yr(newest), `#${newest.rank} ${newest.artist} — ${newest.song}`, yr(newest));
    $('#kpis').querySelectorAll('.kpi[data-year]').forEach(b => b.onclick = () => selectYear(+b.dataset.year, true));
  }

  // ---------- column chart: songs per year ----------
  function yearChart(S) {
    const box = $('#yearChart'); box.textContent = '';
    const by = {};
    S.forEach(x => { by[yr(x)] = (by[yr(x)] || 0) + 1; });
    const y0 = Math.min(...Object.keys(by).map(Number)), y1 = Math.max(...Object.keys(by).map(Number));
    const years = []; for (let y = y0; y <= y1; y++) years.push(y);
    const max = Math.max(...Object.values(by));
    const W = Math.max(320, box.clientWidth), H = W < 600 ? 220 : 260;
    const m = { l: 30, r: 6, t: 18, b: 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const slot = pw / years.length, bw = Math.min(24, Math.max(2, slot - 2)), rad = Math.min(4, bw / 2);
    const yMax = Math.ceil(max / 5) * 5;
    const ys = (v) => m.t + ph - (v / yMax) * ph;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Количество песен по годам' }, box);
    for (let v = 0; v <= yMax; v += 5) {
      el('line', { x1: m.l, x2: W - m.r, y1: ys(v), y2: ys(v), stroke: v === 0 ? '#bdbdbd' : GRID, 'stroke-width': 1 }, svg);
      const t = el('text', { x: m.l - 6, y: ys(v) + 4, 'text-anchor': 'end', class: 'tick' }, svg); t.textContent = v;
    }
    years.forEach((y, i) => {
      if (y % 10 === 0) { const t = el('text', { x: m.l + slot * i + slot / 2, y: H - 8, 'text-anchor': 'middle', class: 'tick' }, svg); t.textContent = y; }
    });
    years.forEach((y, i) => {
      const n = by[y] || 0, x = m.l + slot * i + (slot - bw) / 2;
      const g = el('g', { class: 'bar', tabindex: n ? 0 : -1, 'data-year': y, role: 'button', 'aria-label': `${y}: ${songsWord(n)}` }, svg);
      el('rect', { x: m.l + slot * i, y: m.t, width: slot, height: ph, fill: 'transparent' }, g); // hit area = whole column
      if (n) {
        const top = ys(n), bottom = ys(0), r = Math.min(rad, bottom - top);
        el('path', { class: 'col', d: `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${bottom}Z` }, g);
        if (n === max) { const t = el('text', { x: x + bw / 2, y: top - 5, 'text-anchor': 'middle', class: 'vlabel' }, svg); t.textContent = n; }
      }
      const enter = (e) => { g.classList.add('hover'); showTip(e, songsWord(n), `${y} год`); };
      g.addEventListener('pointermove', enter);
      g.addEventListener('pointerleave', () => { g.classList.remove('hover'); hideTip(); });
      g.addEventListener('focus', () => { g.classList.add('hover'); const r = g.getBoundingClientRect(); showTip({ clientX: r.left + r.width / 2, clientY: r.top }, songsWord(n), `${y} год`); });
      g.addEventListener('blur', () => { g.classList.remove('hover'); hideTip(); });
      g.addEventListener('click', () => { if (n) selectYear(y, true); });
      g.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && n) { e.preventDefault(); selectYear(y, true); } });
    });
    paintBars();
    // table twin
    $('#yearTable').innerHTML = `<table><thead><tr><th>Год</th><th>Песен</th><th>Лучшее место</th></tr></thead><tbody>${years.filter(y => by[y]).map(y => {
      const best = S.filter(x => yr(x) === y).sort((a, b) => a.rank - b.rank)[0];
      return `<tr><td>${y}</td><td>${by[y]}</td><td>#${best.rank} ${G().esc(best.artist)} — ${G().esc(best.song)}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function paintBars() {
    document.querySelectorAll('#yearChart .bar').forEach(g => {
      const on = selYear === null || +g.dataset.year === selYear;
      g.classList.toggle('dim', !on); g.classList.toggle('sel', selYear !== null && on);
    });
  }

  // scroll just enough to show the top of a panel, keeping the chart above it in view
  function peek(node) {
    const top = node.getBoundingClientRect().top, vh = window.innerHeight;
    if (top > vh - 160) window.scrollBy({ top: top - vh + Math.min(320, vh * 0.45), behavior: 'smooth' });
  }

  // ---------- year box: songs of the selected year ----------
  function renderYearBox() {
    const box = $('#yearBox');
    $('#clearYear').hidden = selYear === null;
    if (selYear === null) { box.hidden = true; box.textContent = ''; return; }
    const S = G().songs(), list = S.filter(x => yr(x) === selYear).sort((a, b) => a.rank - b.rank);
    const years = [...new Set(S.map(yr))].sort((a, b) => a - b), i = years.indexOf(selYear);
    const prev = years[i - 1], next = years[i + 1], esc = G().esc;
    box.innerHTML = `
      <div class="yhead">
        <button class="btn small" ${prev ? `data-go="${prev}"` : 'disabled'}>← ${prev || ''}</button>
        <h3>${selYear} <span>${songsWord(list.length)}</span></h3>
        <button class="btn small" ${next ? `data-go="${next}"` : 'disabled'}>${next || ''} →</button>
        <button class="btn small close" data-close="1">✕</button>
      </div>
      <ol class="ylist">${list.map(x => `
        <li data-rank="${x.rank}">
          <span class="yr">#${x.rank}</span>
          <span class="ys"><b>${esc(x.artist)}</b> — ${esc(x.song)}${G().known(x.rank) ? ' <i class="ok">✓</i>' : ''}</span>
          ${x.yt ? `<button class="btn small yplay" data-id="${esc(x.yt)}">▶</button>` : ''}
          <div class="yplayer"></div>
        </li>`).join('')}</ol>`;
    box.hidden = false;
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => selectYear(+b.dataset.go, false));
    box.querySelector('[data-close]').onclick = () => selectYear(null);
    box.querySelectorAll('.yplay').forEach(b => b.onclick = () => togglePlayer(b.closest('li').querySelector('.yplayer'), b.dataset.id, box));
  }
  function togglePlayer(pl, id, scope) {
    const same = pl.dataset.id === id && pl.innerHTML;
    scope.querySelectorAll('.yplayer, .pplayer').forEach(p => { p.innerHTML = ''; p.dataset.id = ''; });
    if (same) return;
    pl.dataset.id = id;
    pl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  }
  function selectYear(y, scroll) {
    selYear = (y === selYear && scroll) ? null : y;
    paintBars(); paintDots(); renderYearBox();
    if (scroll && selYear !== null) peek($('#yearBox'));
  }

  // ---------- scatter: year × rank ----------
  let pts = [];
  function scatter(S) {
    const box = $('#scatter'); box.textContent = '';
    const W = Math.max(320, box.clientWidth), H = W < 600 ? 380 : 500;
    const m = { l: 40, r: 10, t: 14, b: 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const y0 = 1935, y1 = 2025;
    const xs = (y) => m.l + ((y - y0) / (y1 - y0)) * pw;
    const rs = (r) => m.t + ((r - 1) / 499) * ph;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Каждая песня: год выхода и место в рейтинге' }, box);
    [1, 100, 200, 300, 400, 500].forEach(r => {
      el('line', { x1: m.l, x2: W - m.r, y1: rs(r), y2: rs(r), stroke: GRID, 'stroke-width': 1 }, svg);
      const t = el('text', { x: m.l - 6, y: rs(r) + 4, 'text-anchor': 'end', class: 'tick' }, svg); t.textContent = r === 1 ? '№1' : r;
    });
    for (let y = 1940; y <= 2020; y += 10) {
      el('line', { x1: xs(y), x2: xs(y), y1: m.t, y2: m.t + ph, stroke: GRID, 'stroke-width': 1 }, svg);
      const t = el('text', { x: xs(y), y: H - 8, 'text-anchor': 'middle', class: 'tick' }, svg); t.textContent = y;
    }
    // songs sharing a year spread a little sideways so they don't sit on one vertical line
    const seen = {};
    pts = [...S].sort((a, b) => a.rank - b.rank).map(x => {
      const y = yr(x), k = seen[y] = (seen[y] || 0) + 1;
      const jitter = ((k * 0.618) % 1 - 0.5) * Math.min(6, pw / (y1 - y0) * 0.8);
      return { x: xs(y + 0.5) + jitter, y: rs(x.rank), s: x };
    });
    const g = el('g', {}, svg);
    pts.forEach(p => { p.el = el('circle', { cx: p.x, cy: p.y, r: 4, class: 'dot' }, g); });
    const one = pts[0];
    const lab = el('text', { x: one.x + 9, y: one.y + 4, class: 'dlabel' }, svg); lab.textContent = `${one.s.song} · ${yr(one.s)}`;
    const ring = el('circle', { r: 7, class: 'ring', visibility: 'hidden' }, svg);
    const pickRing = el('circle', { r: 7, class: 'ring pickring', visibility: 'hidden' }, svg);
    const overlay = el('rect', { x: m.l - 6, y: m.t - 6, width: pw + 12, height: ph + 12, fill: 'transparent', class: 'overlay' }, svg);
    const nearest = (evt) => {
      const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      let best = null, bd = 24 * 24;
      for (const p of pts) { const d = (p.x - loc.x) ** 2 + (p.y - loc.y) ** 2; if (d < bd) { bd = d; best = p; } }
      return best;
    };
    overlay.addEventListener('pointermove', (e) => {
      const p = nearest(e);
      if (!p) { ring.setAttribute('visibility', 'hidden'); hideTip(); overlay.style.cursor = 'default'; return; }
      ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y); ring.setAttribute('visibility', 'visible');
      overlay.style.cursor = 'pointer';
      showTip(e, `#${p.s.rank} · ${yr(p.s)}`, `${p.s.artist} — ${p.s.song}`);
    });
    overlay.addEventListener('pointerleave', () => { ring.setAttribute('visibility', 'hidden'); hideTip(); });
    overlay.addEventListener('click', (e) => { const p = nearest(e); if (p) pick(p.s.rank); });
    scatter.pickRing = pickRing;
    paintDots();
    if (pickRank) pick(pickRank, true);
  }
  function paintDots() {
    const hl = $('#hlKnown').checked, known = G().known;
    pts.forEach(p => {
      const on = (selYear === null || yr(p.s) === selYear) && (!hl || known(p.s.rank));
      p.el.classList.toggle('dim', !on);
    });
    // bring highlighted dots to the front
    const g = pts[0] && pts[0].el.parentNode;
    if (g) pts.filter(p => !p.el.classList.contains('dim')).forEach(p => g.appendChild(p.el));
  }
  function pick(rank, silent) {
    pickRank = rank;
    const p = pts.find(q => q.s.rank === rank), x = p.s, esc = G().esc, box = $('#pick');
    scatter.pickRing.setAttribute('cx', p.x); scatter.pickRing.setAttribute('cy', p.y); scatter.pickRing.setAttribute('visibility', 'visible');
    const pic = x.img ? x.img + '?w=200' : G().thumb(x.cover, 200);
    box.innerHTML = `
      ${pic ? `<img src="${esc(pic)}" alt="">` : '<div></div>'}
      <div>
        <div class="prank">#${x.rank} <span>· ${yr(x)}</span></div>
        <div class="aartist">${esc(x.artist)}</div>
        <div class="asong">${esc(x.song)}</div>
        ${x.fact ? `<p class="fact">${esc(x.fact)}</p>` : ''}
        <div class="row">
          ${x.yt ? `<button class="btn small red pplay" data-id="${esc(x.yt)}">▶ Слушать</button>` : ''}
          <button class="btn small" data-year="${yr(x)}">Все песни ${yr(x)} года</button>
          <button class="btn small" data-close="1">✕</button>
        </div>
        <div class="pplayer"></div>
      </div>`;
    box.hidden = false;
    const pb = box.querySelector('.pplay');
    if (pb) pb.onclick = () => togglePlayer(box.querySelector('.pplayer'), pb.dataset.id, box);
    box.querySelector('[data-year]').onclick = () => selectYear(yr(x), true);
    box.querySelector('[data-close]').onclick = () => { pickRank = null; box.hidden = true; box.textContent = ''; scatter.pickRing.setAttribute('visibility', 'hidden'); };
    if (!silent) peek(box);
  }

  // ---------- render ----------
  function render() {
    const S = G() && G().songs();
    if (!S || !S.length) return;
    if (!built) {
      kpis(S);
      $('#hlKnown').onchange = paintDots;
      $('#clearYear').onclick = () => selectYear(null);
      built = true;
    }
    yearChart(S); scatter(S); renderYearBox();
  }
  window.renderCharts = render;
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (document.querySelector('#tab-charts.active')) { yearChart(G().songs()); scatter(G().songs()); } }, 200);
  });
})();
