(() => {
  const $ = (s) => document.querySelector(s);
  const LS = 'mzgb-magic-marks-v1';
  let Q = [];
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { marks = {}; }
  const state = { round: 'all', order: 'seq', idx: 0, list: [], revealed: false, mode: 'card' };

  // ---------- tabs ----------
  const loaded = {};
  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    if (name !== 'quiz' && !loaded[name]) loadDoc(name);
    history.replaceState(null, '', '#' + name);
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  async function loadDoc(name) {
    const map = { cheat: ['cheatsheet.html', '#cheatDoc'], method: ['method.html', '#methodDoc'], tactics: ['tactics.html', '#tacticsDoc'] };
    const [file, sel] = map[name];
    try {
      const r = await fetch(file, { cache: 'no-cache' });
      $(sel).innerHTML = await r.text();
      loaded[name] = true;
    } catch (e) { $(sel).textContent = 'Не удалось загрузить ' + file; }
  }

  // ---------- cheat sheet search ----------
  $('#cheatSearch').addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    const doc = $('#cheatDoc');
    doc.querySelectorAll('mark').forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
    doc.normalize();
    const blocks = [...doc.querySelectorAll('li, p, tr, h3, blockquote')];
    if (!term) { doc.querySelectorAll('.hide').forEach(x => x.classList.remove('hide')); return; }
    // descendants first, so a parent item knows whether any nested item matched
    blocks.reverse().forEach(b => {
      const kids = [...b.querySelectorAll('li, tr')];
      const kidVisible = kids.some(x => !x.classList.contains('hide'));
      const hit = b.textContent.toLowerCase().includes(term);
      b.classList.toggle('hide', !(kidVisible || hit));
    });
    doc.querySelectorAll('ul, ol, table').forEach(l => {
      const any = [...l.querySelectorAll('li, tr')].some(x => !x.classList.contains('hide'));
      l.classList.toggle('hide', !any);
    });
    // highlight
    const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const i = n.nodeValue.toLowerCase().indexOf(term);
      if (i < 0 || n.parentElement.closest('.hide')) return;
      const m = document.createElement('mark');
      const after = n.splitText(i); after.splitText(term.length);
      m.textContent = after.nodeValue; after.replaceWith(m);
    });
  });

  // ---------- quiz ----------
  function saveMarks() { localStorage.setItem(LS, JSON.stringify(marks)); }
  function rounds() { return [...new Set(Q.map(q => q.round))]; }

  function buildFilters() {
    const box = $('#roundFilters');
    const all = [['all', 'Все (' + Q.length + ')']].concat(rounds().map(r => [r, r + ' (' + Q.filter(q => q.round === r).length + ')']));
    box.innerHTML = '';
    all.forEach(([v, label]) => {
      const b = document.createElement('button');
      b.className = 'chip' + (state.round === v ? ' on' : '');
      b.textContent = label;
      b.onclick = () => { state.round = v; buildFilters(); rebuild(); };
      box.appendChild(b);
    });
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function rebuild() {
    let l = Q.filter(q => state.round === 'all' || q.round === state.round);
    if (state.order === 'unknown') l = l.filter(q => marks[q.id] === 'u');
    if (state.order === 'unseen') l = l.filter(q => !marks[q.id]);
    if (state.order === 'shuffle') l = shuffle(l.slice());
    state.list = l; state.idx = 0;
    render();
  }

  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function linkify(s) { return esc(s).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }

  function renderScore() {
    const k = Object.values(marks).filter(v => v === 'k').length;
    const u = Object.values(marks).filter(v => v === 'u').length;
    $('#scoreBar').innerHTML = `<span>Знал: <b>${k}</b></span><span>Не знал: <b>${u}</b></span><span>Осталось: <b>${Q.length - k - u}</b> из ${Q.length}</span>`;
  }

  function render() {
    renderScore();
    if (state.mode === 'list') return renderList();
    const q = state.list[state.idx];
    $('#answerBox').hidden = true; state.revealed = false;
    $('#revealBtn').hidden = false;
    if (!q) {
      $('#qRound').textContent = ''; $('#qTopic').textContent = ''; $('#qNum').textContent = '';
      $('#qText').textContent = state.order === 'unknown' ? 'Нет вопросов с отметкой «не знал». Отлично!' : 'Нет вопросов для этого фильтра.';
      $('#qFig').hidden = true; $('#revealBtn').hidden = true; $('#pos').textContent = '';
      return;
    }
    $('#qRound').textContent = q.round;
    $('#qTopic').textContent = q.topic || '';
    $('#qNum').textContent = '№ ' + q.id;
    $('#qText').textContent = q.question;
    if (q.image) {
      $('#qFig').hidden = false; $('#qImg').src = q.image; $('#qImg').alt = 'Иллюстрация к вопросу ' + q.id;
      $('#qImgCap').textContent = q.image_credit || '';
    } else { $('#qFig').hidden = true; $('#qImg').removeAttribute('src'); }
    $('#qAns').textContent = q.answer;
    $('#qAcc').textContent = q.accept ? 'Зачёт: ' + q.accept : '';
    $('#qExpl').innerHTML = (q.explanation ? '<p><b>Как взять:</b> ' + esc(q.explanation) + '</p>' : '') + (q.fact ? '<p><b>Факт:</b> ' + esc(q.fact) + '</p>' : '');
    $('#qSrc').innerHTML = q.source ? 'Источник: ' + linkify(q.source) : '';
    $('#knewBtn').classList.toggle('on', marks[q.id] === 'k');
    $('#didntBtn').classList.toggle('on', marks[q.id] === 'u');
    $('#pos').textContent = (state.idx + 1) + ' / ' + state.list.length;
  }

  function renderList() {
    const box = $('#listView');
    box.innerHTML = state.list.map(q => `
      <div class="li ${marks[q.id] || ''}">
        <div class="tag">№ ${q.id} · ${esc(q.round)}${q.topic ? ' · ' + esc(q.topic) : ''}</div>
        ${q.image ? `<img src="${esc(q.image)}" alt="Иллюстрация к вопросу ${q.id}" loading="lazy">` : ''}
        <p class="q">${esc(q.question)}</p>
        <details><summary>Ответ</summary>
          <p><b>${esc(q.answer)}</b>${q.accept ? ' <span class="tag">(зачёт: ' + esc(q.accept) + ')</span>' : ''}</p>
          ${q.explanation ? '<p><b>Как взять:</b> ' + esc(q.explanation) + '</p>' : ''}
          ${q.fact ? '<p><b>Факт:</b> ' + esc(q.fact) + '</p>' : ''}
          ${q.source ? '<p class="tag">Источник: ' + linkify(q.source) + '</p>' : ''}
        </details>
      </div>`).join('') || '<p>Нет вопросов для этого фильтра.</p>';
  }

  function reveal() { if (!state.list[state.idx]) return; $('#answerBox').hidden = false; $('#revealBtn').hidden = true; state.revealed = true; }
  function mark(v) {
    const q = state.list[state.idx]; if (!q) return;
    marks[q.id] = v; saveMarks(); renderScore();
    $('#knewBtn').classList.toggle('on', v === 'k'); $('#didntBtn').classList.toggle('on', v === 'u');
    setTimeout(next, 250);
  }
  function next() { if (state.idx < state.list.length - 1) { state.idx++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  function prev() { if (state.idx > 0) { state.idx--; render(); } }

  $('#revealBtn').onclick = reveal;
  $('#knewBtn').onclick = () => mark('k');
  $('#didntBtn').onclick = () => mark('u');
  $('#nextBtn').onclick = next;
  $('#prevBtn').onclick = prev;
  $('#orderSel').onchange = (e) => { state.order = e.target.value; rebuild(); };
  $('#resetBtn').onclick = () => { if (confirm('Сбросить все отметки «знал / не знал»?')) { marks = {}; saveMarks(); rebuild(); } };
  $('#modeBtn').onclick = () => {
    state.mode = state.mode === 'card' ? 'list' : 'card';
    $('#cardView').hidden = state.mode === 'list'; $('#listView').hidden = state.mode !== 'list';
    $('#modeBtn').textContent = state.mode === 'list' ? '▢ Карточки' : '☰ Список';
    render();
  };
  document.addEventListener('keydown', (e) => {
    if (!$('#tab-quiz').classList.contains('active') || state.mode !== 'card') return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); state.revealed ? next() : reveal(); }
    else if (e.code === 'ArrowRight') next();
    else if (e.code === 'ArrowLeft') prev();
    else if (e.key === '1' && state.revealed) mark('k');
    else if (e.key === '2' && state.revealed) mark('u');
  });

  fetch('questions.json', { cache: 'no-cache' }).then(r => r.json()).then(data => {
    Q = data; buildFilters(); rebuild();
    const h = location.hash.slice(1);
    if (['cheat', 'method', 'tactics'].includes(h)) showTab(h);
  }).catch(() => { $('#qText').textContent = 'Не удалось загрузить вопросы.'; });
})();
