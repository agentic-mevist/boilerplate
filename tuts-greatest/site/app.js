(() => {
  const $ = (s) => document.querySelector(s);
  const LS = 'groove-marks-v1';
  let S = [];
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { marks = {}; }
  const save = () => localStorage.setItem(LS, JSON.stringify(marks));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TAGS = { cover: 'кавер', covered: 'есть кавер', film: 'кино/ТВ', riff: 'рифф/интро', sample: 'сэмпл', debut: 'дебют', no1: '№1' };
  const known = (r) => marks[r] && marks[r].a && marks[r].s;
  const unknown = (r) => marks[r] && marks[r].seen && !known(r);

  // ---------- tabs ----------
  const loaded = {};
  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    if ((name === 'cheat' || name === 'format') && !loaded[name]) {
      fetch(name + '.html', { cache: 'no-cache' }).then(r => r.text()).then(h => { $('#' + name + 'Doc').innerHTML = h; loaded[name] = true; });
    }
    if (name === 'list' && !loaded.list) { renderList(); loaded.list = true; }
    history.replaceState(null, '', '#' + name);
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------- trainer ----------
  let cur = null, curSrc = '', recent = [];
  function pool() {
    const r = $('#tRange').value, d = $('#tDecade').value;
    let p = S.filter(x => x.yt);
    if (r === 'unknown') p = p.filter(x => unknown(x.rank));
    else p = p.filter(x => x.rank <= +r);
    if (d !== 'all') p = p.filter(x => String(x.decade) === d);
    return p;
  }
  function embed(x, start, len) {
    const end = len > 0 ? `&end=${start + len}` : '';
    return `https://www.youtube-nocookie.com/embed/${x.yt}?autoplay=1&start=${start}${end}&controls=0&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`;
  }
  function next() {
    const p = pool();
    if (!p.length) { $('#placeholder').textContent = 'Нет песен для этих настроек'; $('#placeholder').hidden = false; return; }
    let cand = p.filter(x => !recent.includes(x.rank));
    if (!cand.length) { recent = []; cand = p; }
    cur = cand[Math.floor(Math.random() * cand.length)];
    recent.push(cur.rank); if (recent.length > Math.min(40, p.length - 1)) recent.shift();
    const dur = cur.dur || 200, mode = $('#tStart').value, len = +$('#tLen').value;
    let start = 0;
    if (mode === 'mid') start = Math.floor(dur * 0.4);
    if (mode === 'random') start = Math.floor(dur * (0.1 + Math.random() * 0.6));
    curSrc = embed(cur, start, len);
    play();
    $('#answer').hidden = true; $('#revealBtn').disabled = false; $('#replayBtn').disabled = false;
    $('#gotArtist').classList.remove('on'); $('#gotSong').classList.remove('on');
  }
  function play() {
    const sc = $('#screen');
    sc.querySelectorAll('iframe').forEach(f => f.remove());
    const f = document.createElement('iframe');
    f.src = curSrc; f.allow = 'autoplay; encrypted-media'; f.title = 'track';
    sc.insertBefore(f, $('#cover'));
    $('#placeholder').hidden = true; $('#cover').hidden = false;
  }
  function reveal() {
    if (!cur) return;
    $('#cover').hidden = true;
    $('#aRank').textContent = '#' + cur.rank; $('#aSong').textContent = cur.song; $('#aArtist').textContent = cur.artist; $('#aYear').textContent = cur.year;
    $('#aFact').textContent = cur.fact || '';
    $('#aLink').href = 'https://www.youtube.com/watch?v=' + cur.yt;
    $('#answer').hidden = false;
    const m = marks[cur.rank] || (marks[cur.rank] = { a: false, s: false });
    m.seen = true; m.a = false; m.s = false; save(); renderScore();
  }
  function toggle(key, btn) {
    if (!cur) return;
    const m = marks[cur.rank] || (marks[cur.rank] = { seen: true, a: false, s: false });
    m[key] = !m[key]; btn.classList.toggle('on', m[key]); save(); renderScore();
  }
  function renderScore() {
    const seen = Object.values(marks).filter(m => m.seen);
    const a = seen.filter(m => m.a).length, s = seen.filter(m => m.s).length;
    $('#tScore').innerHTML = `Прослушано: <b>${seen.length}</b> · угадан исполнитель: <b>${a}</b> · название: <b>${s}</b> · «не угадал»: <b>${seen.filter(m => !(m.a && m.s)).length}</b> <button class="ghost small" id="resetBtn">сброс</button>`;
    $('#resetBtn').onclick = () => { if (confirm('Сбросить статистику?')) { marks = {}; save(); renderScore(); } };
  }
  $('#nextBtn').onclick = next;
  $('#replayBtn').onclick = () => { if (curSrc) play(); };
  $('#revealBtn').onclick = reveal;
  $('#gotArtist').onclick = (e) => toggle('a', e.currentTarget);
  $('#gotSong').onclick = (e) => toggle('s', e.currentTarget);

  // ---------- list ----------
  function renderList() {
    const q = $('#lSearch').value.trim().toLowerCase(), d = $('#lDecade').value, t = $('#lTag').value;
    let l = S;
    if (d !== 'all') l = l.filter(x => String(x.decade) === d);
    if (t === 'unknown') l = l.filter(x => unknown(x.rank));
    else if (t !== 'all') l = l.filter(x => (x.tags || []).includes(t));
    if (q) l = l.filter(x => (x.artist + ' ' + x.song + ' ' + (x.fact || '') + ' ' + (x.writers || '')).toLowerCase().includes(q));
    $('#lCount').textContent = `Найдено: ${l.length}`;
    $('#list').innerHTML = l.map(x => `
      <div class="song ${unknown(x.rank) ? 'unk' : ''}" data-r="${x.rank}">
        <div class="t"><span class="rank">#${x.rank}</span><b>${esc(x.song)}</b> — ${esc(x.artist)} <span class="yr">${esc(x.year)}</span></div>
        ${x.fact ? `<p class="f">${esc(x.fact)}</p>` : ''}
        ${(x.tags || []).length ? `<div class="tags">${x.tags.map(g => `<span class="tag">${esc(TAGS[g] || g)}</span>`).join('')}</div>` : ''}
        <div class="row">
          ${x.yt ? `<button class="ghost small play" data-id="${esc(x.yt)}">▶ Слушать</button><a class="ghost small" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${esc(x.yt)}">YouTube ↗</a>` : ''}
          <a class="ghost small" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.artist + ' ' + x.song)}">🔎</a>
        </div>
        <div class="player"></div>
      </div>`).join('');
    $('#list').querySelectorAll('.play').forEach(b => b.onclick = () => {
      const pl = b.closest('.song').querySelector('.player');
      if (pl.innerHTML) { pl.innerHTML = ''; b.textContent = '▶ Слушать'; return; }
      $('#list').querySelectorAll('.player').forEach(p => p.innerHTML = '');
      $('#list').querySelectorAll('.play').forEach(p => p.textContent = '▶ Слушать');
      pl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.id}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
      b.textContent = '■ Закрыть';
    });
  }
  let tmr;
  $('#lSearch').oninput = () => { clearTimeout(tmr); tmr = setTimeout(renderList, 200); };
  $('#lDecade').onchange = renderList; $('#lTag').onchange = renderList;

  // ---------- init ----------
  fetch('songs.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
    S = d;
    const decs = [...new Set(S.map(x => x.decade))].sort();
    const opts = decs.map(x => `<option value="${x}">${x < 1950 ? 'до 1950' : String(x).slice(2) + '-е'} (${S.filter(s => s.decade === x).length})</option>`).join('');
    $('#tDecade').insertAdjacentHTML('beforeend', opts); $('#lDecade').insertAdjacentHTML('beforeend', opts);
    renderScore();
    const h = location.hash.slice(1);
    if (['list', 'cheat', 'format'].includes(h)) showTab(h);
  });
})();
