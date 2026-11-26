(() => {
  const $ = (s) => document.querySelector(s);
  // Progress lives only in this browser (localStorage), so every friend has their own.
  const LS = 'groove-marks-v1', PREFS = 'groove-prefs-v1';
  let S = [];
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { marks = {}; }
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREFS) || '{}'); } catch (e) { prefs = {}; }
  const save = () => localStorage.setItem(LS, JSON.stringify(marks));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TAGS = { cover: 'кавер', covered: 'есть кавер', film: 'кино/ТВ', riff: 'рифф/интро', sample: 'сэмпл', debut: 'дебют', no1: '№1' };
  const known = (r) => !!(marks[r] && marks[r].a && marks[r].s);
  const missed = (r) => !!(marks[r] && marks[r].seen && !known(r));
  const fresh = (r) => !(marks[r] && marks[r].seen);
  const thumb = (u, n) => (u || '').replace('600x600bb', `${n}x${n}bb`);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- ranges: packs of 50 and tops ----------
  const PACKS = Array.from({ length: 10 }, (_, i) => i * 50 + 1);
  const inRange = (x, v) => {
    if (!v || v === 'all') return true;
    if (v.startsWith('p:')) { const a = +v.slice(2); return x.rank >= a && x.rank < a + 50; }
    if (v.startsWith('top:')) return x.rank <= +v.slice(4);
    return true;
  };
  const rangeName = (v) => v.startsWith('p:') ? `Места ${+v.slice(2)}–${+v.slice(2) + 49}` : (v === 'top:500' ? 'Все 500' : 'Топ-' + v.slice(4));
  const stats = (v) => {
    const l = S.filter(x => inRange(x, v));
    return { total: l.length, known: l.filter(x => known(x.rank)).length, miss: l.filter(x => missed(x.rank)).length, fresh: l.filter(x => fresh(x.rank)).length };
  };
  function fillRanges() {
    const opt = (v) => { const st = stats(v); return `<option value="${v}">${rangeName(v).replace('Места ', '')} · выучено ${st.known}/${st.total}</option>`; };
    const t = $('#tRange'), keep = t.value || prefs.range || 'p:1';
    t.innerHTML = `<optgroup label="Паки по 50">${PACKS.map(a => opt('p:' + a)).join('')}</optgroup>` +
      `<optgroup label="Больше">${['top:100', 'top:200', 'top:500'].map(opt).join('')}</optgroup>`;
    t.value = keep; if (!t.value) t.value = 'p:1';
    const l = $('#lPack'), lk = l.value || 'all';
    l.innerHTML = `<option value="all">Все 500</option>` + PACKS.map(a => { const st = stats('p:' + a); return `<option value="p:${a}">Места ${a}–${a + 49} · выучено ${st.known}/${st.total}</option>`; }).join('');
    l.value = lk;
  }

  // ---------- tabs ----------
  const loaded = {};
  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    if (['cheat', 'format', 'playlists'].includes(name) && !loaded[name]) {
      fetch(name + '.html', { cache: 'no-cache' }).then(r => r.text()).then(h => { $('#' + name + 'Doc').innerHTML = h; loaded[name] = true; });
    }
    if (name === 'list') renderList();
    if (name === 'charts' && window.renderCharts) window.renderCharts();
    history.replaceState(null, '', '#' + name);
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------- trainer ----------
  let mode = 'audio', cur = null, curSrc = '';
  let deck = [], deckKey = '', deckTotal = 0, deckDone = 0;
  const NOTES = {
    audio: 'Только звук: экран закрыт, угадывайте исполнителя и название на слух.',
    clip: 'Клип со звуком: видно клип, название и логотипы закрыты плашками. В пул попадают только песни, для которых найден клип или живое выступление.',
    mute: 'Клип без звука: угадайте песню по видеоряду — как в механике «клип с чужой музыкой».',
    cover: 'Обложка: по обложке альбома или сингла угадайте исполнителя, песню (и альбом).',
  };
  const WHICH = { all: '', left: ' (не выученные)', miss: ' (только ошибки)' };
  function savePrefs() {
    prefs = { mode, range: $('#tRange').value, which: $('#tWhich').value, decade: $('#tDecade').value, start: $('#tStart').value, len: $('#tLen').value };
    localStorage.setItem(PREFS, JSON.stringify(prefs));
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll('#modes button').forEach(x => x.classList.toggle('on', x.dataset.mode === m));
    $('#lblStart').hidden = mode === 'cover'; $('#lblLen').hidden = mode === 'cover';
  }
  document.querySelectorAll('#modes button').forEach(b => b.addEventListener('click', () => {
    setMode(b.dataset.mode); savePrefs(); clearStage(); updateNote();
  }));
  function pool() {
    const r = $('#tRange').value, d = $('#tDecade').value, w = $('#tWhich').value;
    let p = S.filter(x => mode === 'cover' ? x.cover : (mode === 'audio' ? x.yt : x.vid));
    p = p.filter(x => inRange(x, r));
    if (d !== 'all') p = p.filter(x => String(x.decade) === d);
    if (w === 'left') p = p.filter(x => !known(x.rank));
    if (w === 'miss') p = p.filter(x => missed(x.rank));
    return p;
  }
  const settingsKey = () => [mode, $('#tRange').value, $('#tWhich').value, $('#tDecade').value].join('|');
  function updateNote() {
    $('#modeNote').textContent = NOTES[mode] + ` В выбранном наборе${WHICH[$('#tWhich').value]}: ${pool().length} песен.`;
    renderRound();
  }
  function renderRound() {
    const el = $('#round');
    if (deckKey !== settingsKey() || !deckTotal) { el.textContent = 'Песни идут в случайном порядке без повторов, пока не пройдёте весь набор.'; return; }
    el.innerHTML = `Круг: <b>${deckDone}</b> из <b>${deckTotal}</b> · осталось <b>${deck.length}</b>`;
  }
  function clearStage(msg) {
    $('#screen').querySelectorAll('iframe').forEach(f => f.remove());
    $('#coverImg').hidden = true; $('#cover').hidden = true; $('#shadeTop').hidden = true; $('#shadeBottom').hidden = true;
    $('#placeholder').hidden = false; $('#answer').hidden = true;
    $('#placeholder').querySelector('p').innerHTML = msg || 'Нажмите «Следующий трек»';
    $('#revealBtn').disabled = true; $('#replayBtn').disabled = true; cur = null;
  }
  function onSettingsChange() {
    savePrefs(); deckKey = ''; deck = []; deckTotal = 0; deckDone = 0;
    const w = $('#tWhich').value, empty = !pool().length;
    clearStage(empty && w === 'left' ? '🎉 Все песни набора выучены' : (empty && w === 'miss' ? 'Ошибок в этом наборе нет' : (empty ? 'Нет песен для этих настроек' : '')));
    updateNote(); renderScore();
  }
  function next() {
    const p = pool(), key = settingsKey();
    if (key !== deckKey) { deck = shuffle(p.map(x => x.rank)); deckKey = key; deckTotal = deck.length; deckDone = 0; }
    const ok = new Set(p.map(x => x.rank));
    while (deck.length && !ok.has(deck[0])) deck.shift();
    if (!deck.length) {
      const st = stats($('#tRange').value), w = $('#tWhich').value;
      let msg;
      if (!p.length) msg = w === 'all' ? 'Нет песен для этих настроек' : (w === 'left' ? '🎉 Все песни набора выучены' : 'Ошибок в этом наборе нет');
      else msg = `Круг пройден! ${rangeName($('#tRange').value)}: выучено <b>${st.known}</b> из ${st.total}.<br>Нажмите «Следующий трек» для нового круга` + (w === 'all' && st.known < st.total ? ' или выберите «Не выученные».' : '.');
      deckKey = ''; deckTotal = 0;
      clearStage(msg); renderRound();
      return;
    }
    const rk = deck.shift();
    cur = S.find(x => x.rank === rk); deckDone++;
    renderRound();
    $('#answer').hidden = true; $('#revealBtn').disabled = false;
    ['#gotArtist', '#gotSong', '#gotBoth'].forEach(id => $(id).classList.remove('on'));
    if (mode === 'cover') {
      $('#screen').querySelectorAll('iframe').forEach(f => f.remove());
      $('#placeholder').hidden = true; $('#cover').hidden = true; $('#shadeTop').hidden = true; $('#shadeBottom').hidden = true;
      $('#coverImg').src = cur.cover; $('#coverImg').hidden = false; $('#replayBtn').disabled = true;
      return;
    }
    const vid = mode === 'audio' ? cur.yt : cur.vid;
    const dur = (mode === 'audio' ? cur.dur : cur.vdur) || cur.dur || 200;
    const len = +$('#tLen').value, sm = $('#tStart').value;
    let start = 0;
    if (sm === 'mid') start = Math.floor(dur * 0.4);
    if (sm === 'random') start = Math.floor(dur * (0.1 + Math.random() * 0.6));
    const end = len > 0 ? `&end=${start + len}` : '';
    const mute = mode === 'mute' ? '&mute=1' : '';
    curSrc = `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&start=${start}${end}${mute}&controls=0&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`;
    play();
    $('#replayBtn').disabled = false;
  }
  function play() {
    const sc = $('#screen');
    sc.querySelectorAll('iframe').forEach(f => f.remove());
    const f = document.createElement('iframe');
    f.src = curSrc; f.allow = 'autoplay; encrypted-media'; f.title = 'track';
    sc.insertBefore(f, $('#coverImg'));
    $('#placeholder').hidden = true; $('#coverImg').hidden = true;
    $('#cover').hidden = mode !== 'audio';
    $('#shadeTop').hidden = mode === 'audio'; $('#shadeBottom').hidden = mode === 'audio';
  }
  function reveal() {
    if (!cur) return;
    $('#cover').hidden = true; $('#shadeTop').hidden = true; $('#shadeBottom').hidden = true;
    const pic = cur.img ? cur.img + '?w=400' : cur.cover;
    $('#aCover').src = pic || ''; $('#aCover').hidden = !pic;
    $('#aRank').textContent = '#' + cur.rank;
    $('#aArtist').textContent = cur.artist; $('#aSong').textContent = cur.song;
    $('#aMeta').innerHTML = (cur.cover && cur.img ? `<img class="mini" src="${esc(thumb(cur.cover, 100))}" alt="">` : '') + esc([cur.album ? 'Альбом: ' + cur.album : '', cur.year].filter(Boolean).join(' · '));
    $('#aFact').textContent = cur.fact || '';
    const link = (mode === 'audio' || !cur.vid) ? cur.yt : cur.vid;
    $('#aLink').href = 'https://www.youtube.com/watch?v=' + link; $('#aLink').hidden = !link;
    $('#answer').hidden = false;
    // the latest attempt counts: until you tick the boxes, the song is "not guessed"
    marks[cur.rank] = { seen: true, a: false, s: false };
    save(); syncMarks();
  }
  function setMark(a, s) {
    if (!cur) return;
    marks[cur.rank] = { seen: true, a, s };
    $('#gotArtist').classList.toggle('on', a); $('#gotSong').classList.toggle('on', s); $('#gotBoth').classList.toggle('on', a && s);
    save(); syncMarks();
  }
  function syncMarks() { fillRanges(); renderScore(); updateNote(); }
  function renderScore() {
    const v = $('#tRange').value || 'p:1', st = stats(v), all = stats('top:500');
    $('#tScore').innerHTML = `<b>${rangeName(v)}</b>: выучено <b>${st.known}</b> из ${st.total} · ошибки <b>${st.miss}</b> · ещё не было <b>${st.fresh}</b>` +
      ` &nbsp;·&nbsp; Всего выучено <b>${all.known}</b> из 500` +
      ` <span class="resets"><button class="btn small" id="resetPack">Сбросить этот набор</button> <button class="btn small" id="resetAll">Сбросить всё</button></span>` +
      `<br><span class="hint">Прогресс хранится только в этом браузере на этом устройстве — у друзей он свой.</span>`;
    $('#resetPack').onclick = () => {
      if (!confirm(`Сбросить прогресс: ${rangeName(v)}?`)) return;
      S.filter(x => inRange(x, v)).forEach(x => delete marks[x.rank]); save(); onSettingsChange(); fillRanges();
    };
    $('#resetAll').onclick = () => { if (confirm('Сбросить весь прогресс по 500 песням?')) { marks = {}; save(); onSettingsChange(); fillRanges(); } };
  }
  $('#nextBtn').onclick = next;
  $('#replayBtn').onclick = () => { if (curSrc && mode !== 'cover') play(); };
  $('#revealBtn').onclick = reveal;
  $('#gotArtist').onclick = () => { const m = marks[cur?.rank] || {}; setMark(!m.a, !!m.s); };
  $('#gotSong').onclick = () => { const m = marks[cur?.rank] || {}; setMark(!!m.a, !m.s); };
  $('#gotBoth').onclick = () => { const m = marks[cur?.rank] || {}; const both = !(m.a && m.s); setMark(both, both); };
  ['#tRange', '#tWhich', '#tDecade'].forEach(id => { $(id).onchange = onSettingsChange; });
  ['#tStart', '#tLen'].forEach(id => { $(id).onchange = savePrefs; });

  // ---------- list ----------
  function renderList() {
    const q = $('#lSearch').value.trim().toLowerCase(), d = $('#lDecade').value, t = $('#lTag').value, pk = $('#lPack').value;
    let l = S.filter(x => inRange(x, pk));
    if (d !== 'all') l = l.filter(x => String(x.decade) === d);
    if (t === 'left') l = l.filter(x => !known(x.rank));
    else if (t === 'miss') l = l.filter(x => missed(x.rank));
    else if (t === 'known') l = l.filter(x => known(x.rank));
    else if (t !== 'all') l = l.filter(x => (x.tags || []).includes(t));
    if (q) l = l.filter(x => [x.artist, x.song, x.album, x.fact, x.writers].join(' ').toLowerCase().includes(q));
    const sort = $('#lSort').value, yr = (x) => +String(x.year).slice(0, 4);
    if (sort !== 'rank') l = [...l].sort((a, b) => (sort === 'year' ? yr(a) - yr(b) : yr(b) - yr(a)) || a.rank - b.rank);
    const perYear = {}; l.forEach(x => { perYear[yr(x)] = (perYear[yr(x)] || 0) + 1; });
    let lastYear = null;
    const head = (x) => {
      if (sort === 'rank' || yr(x) === lastYear) return '';
      lastYear = yr(x);
      const n = perYear[lastYear];
      return `<h3 class="yearhead">${lastYear} <span>${n} ${n % 10 === 1 && n % 100 !== 11 ? 'песня' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'песни' : 'песен')}</span></h3>`;
    };
    const st = pk === 'all' ? stats('top:500') : stats(pk);
    $('#lCount').textContent = `Найдено: ${l.length} · выучено ${st.known} из ${st.total}`;
    $('#list').innerHTML = l.map(x => head(x) + `
      <article class="song ${missed(x.rank) ? 'unk' : ''} ${known(x.rank) ? 'known' : ''}" data-rank="${x.rank}">
        <div class="num">${x.rank}</div>
        ${x.img ? `<img loading="lazy" src="${esc(x.img)}?w=200" alt="">` : (x.cover ? `<img loading="lazy" src="${esc(thumb(x.cover, 200))}" alt="">` : '<img alt="">')}
        <div>
          <div class="who">${esc(x.artist)}</div>
          <div class="what">${esc(x.song)}</div>
          <div class="meta">${x.cover && x.img ? `<img class="mini" loading="lazy" src="${esc(thumb(x.cover, 100))}" alt="">` : ''}${esc([x.album, x.year].filter(Boolean).join(' · '))}</div>
          ${x.fact ? `<p class="f">${esc(x.fact)}</p>` : ''}
          ${(x.tags || []).length ? `<div class="tags">${x.tags.map(g => `<span class="tag">${esc(TAGS[g] || g)}</span>`).join('')}</div>` : ''}
          <div class="row">
            ${x.yt ? `<button class="btn small play" data-id="${esc(x.yt)}">▶ Слушать</button>` : ''}
            ${x.vid && x.vid !== x.yt ? `<button class="btn small play" data-id="${esc(x.vid)}">🎬 Клип</button>` : ''}
            <a class="btn small" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.artist + ' ' + x.song)}">🔎 YouTube</a>
            <button class="mark small learn ${known(x.rank) ? 'on' : ''}">${known(x.rank) ? '✓ Выучено' : '☐ Знаю'}</button>
          </div>
        </div>
        <div class="player"></div>
      </article>`).join('');
    $('#list').querySelectorAll('.play').forEach(b => b.onclick = () => {
      const art = b.closest('.song'), pl = art.querySelector('.player');
      const same = pl.dataset.id === b.dataset.id && pl.innerHTML;
      $('#list').querySelectorAll('.player').forEach(p => { p.innerHTML = ''; p.dataset.id = ''; });
      if (same) return;
      pl.dataset.id = b.dataset.id;
      pl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.id}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    });
    $('#list').querySelectorAll('.learn').forEach(b => b.onclick = () => {
      const art = b.closest('.song'), r = +art.dataset.rank;
      if (known(r)) marks[r] = { seen: true, a: false, s: false }; else marks[r] = { seen: true, a: true, s: true };
      save();
      const k = known(r);
      b.classList.toggle('on', k); b.textContent = k ? '✓ Выучено' : '☐ Знаю';
      art.classList.toggle('known', k); art.classList.toggle('unk', !k);
      const s2 = pk === 'all' ? stats('top:500') : stats(pk);
      $('#lCount').textContent = `Найдено: ${l.length} · выучено ${s2.known} из ${s2.total}`;
      fillRanges(); renderScore(); updateNote();
    });
  }
  let tmr;
  $('#lSearch').oninput = () => { clearTimeout(tmr); tmr = setTimeout(renderList, 200); };
  $('#lDecade').onchange = renderList; $('#lTag').onchange = renderList; $('#lPack').onchange = renderList; $('#lSort').onchange = renderList;

  window.GROOVE = { songs: () => S, known, esc, thumb, refresh: () => { fillRanges(); renderScore(); updateNote(); } };

  // ---------- init ----------
  fetch('songs.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
    S = d;
    const decs = [...new Set(S.map(x => x.decade))].sort();
    const opts = decs.map(x => `<option value="${x}">${x < 1950 ? 'до 1950' : String(x).slice(2) + '-е'} (${S.filter(s => s.decade === x).length})</option>`).join('');
    $('#tDecade').insertAdjacentHTML('beforeend', opts); $('#lDecade').insertAdjacentHTML('beforeend', opts);
    fillRanges();
    if (prefs.which) $('#tWhich').value = prefs.which;
    if (prefs.decade && [...$('#tDecade').options].some(o => o.value === prefs.decade)) $('#tDecade').value = prefs.decade;
    if (prefs.start) $('#tStart').value = prefs.start;
    if (prefs.len) $('#tLen').value = prefs.len;
    setMode(prefs.mode || 'audio');
    updateNote(); renderScore();
    const h = location.hash.slice(1);
    if (['list', 'charts', 'cheat', 'format', 'playlists'].includes(h)) showTab(h);
  });
})();
