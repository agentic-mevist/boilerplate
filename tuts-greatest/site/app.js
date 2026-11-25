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
  const thumb = (u, n) => (u || '').replace('600x600bb', `${n}x${n}bb`);

  // ---------- tabs ----------
  const loaded = {};
  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    if (['cheat', 'format', 'playlists'].includes(name) && !loaded[name]) {
      fetch(name + '.html', { cache: 'no-cache' }).then(r => r.text()).then(h => { $('#' + name + 'Doc').innerHTML = h; loaded[name] = true; });
    }
    if (name === 'list' && !loaded.list) { renderList(); loaded.list = true; }
    history.replaceState(null, '', '#' + name);
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------- trainer ----------
  let mode = 'audio', cur = null, curSrc = '', recent = [];
  const NOTES = {
    audio: 'Только звук: экран закрыт, угадывайте исполнителя и название на слух.',
    clip: 'Клип со звуком: видно клип, название и логотипы закрыты плашками. В пул попадают только песни, для которых найден клип или живое выступление.',
    mute: 'Клип без звука: угадайте песню по видеоряду — как в механике «клип с чужой музыкой».',
    cover: 'Обложка: по обложке альбома или сингла угадайте исполнителя, песню (и альбом).',
  };
  document.querySelectorAll('#modes button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    document.querySelectorAll('#modes button').forEach(x => x.classList.toggle('on', x === b));
    $('#lblStart').hidden = mode === 'cover'; $('#lblLen').hidden = mode === 'cover';
    $('#modeNote').textContent = NOTES[mode] + ` Доступно песен: ${pool().length}.`;
    clearStage();
  }));
  function pool() {
    const r = $('#tRange').value, d = $('#tDecade').value;
    let p = S.filter(x => mode === 'cover' ? x.cover : (mode === 'audio' ? x.yt : x.vid));
    if (r === 'unknown') p = p.filter(x => unknown(x.rank));
    else p = p.filter(x => x.rank <= +r);
    if (d !== 'all') p = p.filter(x => String(x.decade) === d);
    return p;
  }
  function clearStage() {
    $('#screen').querySelectorAll('iframe').forEach(f => f.remove());
    $('#coverImg').hidden = true; $('#cover').hidden = true; $('#shadeTop').hidden = true; $('#shadeBottom').hidden = true;
    $('#placeholder').hidden = false; $('#answer').hidden = true;
    $('#revealBtn').disabled = true; $('#replayBtn').disabled = true; cur = null;
  }
  function next() {
    const p = pool();
    if (!p.length) { clearStage(); $('#placeholder').querySelector('p').textContent = 'Нет песен для этих настроек'; return; }
    let cand = p.filter(x => !recent.includes(x.rank));
    if (!cand.length) { recent = []; cand = p; }
    cur = cand[Math.floor(Math.random() * cand.length)];
    recent.push(cur.rank); if (recent.length > Math.min(40, p.length - 1)) recent.shift();
    $('#answer').hidden = true; $('#revealBtn').disabled = false; $('#gotArtist').classList.remove('on'); $('#gotSong').classList.remove('on');
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
    const m = marks[cur.rank] || (marks[cur.rank] = {});
    m.seen = true; m.a = false; m.s = false; save(); renderScore();
  }
  function toggle(key, btn) {
    if (!cur) return;
    const m = marks[cur.rank] || (marks[cur.rank] = { seen: true });
    m[key] = !m[key]; btn.classList.toggle('on', m[key]); save(); renderScore();
  }
  function renderScore() {
    const seen = Object.values(marks).filter(m => m.seen);
    const a = seen.filter(m => m.a).length, s = seen.filter(m => m.s).length;
    $('#tScore').innerHTML = `Прослушано <b>${seen.length}</b> · исполнитель <b>${a}</b> · название <b>${s}</b> · «не угадал» <b>${seen.filter(m => !(m.a && m.s)).length}</b> &nbsp; <button class="btn small" id="resetBtn">Сбросить</button>`;
    $('#resetBtn').onclick = () => { if (confirm('Сбросить статистику?')) { marks = {}; save(); renderScore(); } };
  }
  $('#nextBtn').onclick = next;
  $('#replayBtn').onclick = () => { if (curSrc && mode !== 'cover') play(); };
  $('#revealBtn').onclick = reveal;
  $('#gotArtist').onclick = (e) => toggle('a', e.currentTarget);
  $('#gotSong').onclick = (e) => toggle('s', e.currentTarget);
  $('#tRange').onchange = $('#tDecade').onchange = () => { $('#modeNote').textContent = NOTES[mode] + ` Доступно песен: ${pool().length}.`; };

  // ---------- list ----------
  function renderList() {
    const q = $('#lSearch').value.trim().toLowerCase(), d = $('#lDecade').value, t = $('#lTag').value;
    let l = S;
    if (d !== 'all') l = l.filter(x => String(x.decade) === d);
    if (t === 'unknown') l = l.filter(x => unknown(x.rank));
    else if (t !== 'all') l = l.filter(x => (x.tags || []).includes(t));
    if (q) l = l.filter(x => [x.artist, x.song, x.album, x.fact, x.writers].join(' ').toLowerCase().includes(q));
    $('#lCount').textContent = `Найдено: ${l.length}`;
    $('#list').innerHTML = l.map(x => `
      <article class="song ${unknown(x.rank) ? 'unk' : ''}">
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
    $('#modeNote').textContent = NOTES[mode] + ` Доступно песен: ${pool().length}.`;
    renderScore();
    const h = location.hash.slice(1);
    if (['list', 'cheat', 'format', 'playlists'].includes(h)) showTab(h);
  });
})();
