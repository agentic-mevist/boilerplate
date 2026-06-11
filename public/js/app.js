import { LESSONS } from './lessons.js';
import { initPlayTab } from './table-ui.js';
import { newDuel, renderQuiz } from './drills.js';

// ---- tabs ----
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.onclick = () => {
  tabs.forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('hidden', p.id !== 'panel-' + t.dataset.tab));
});

// ---- lessons ----
const lessonsEl = document.getElementById('lessons');
lessonsEl.innerHTML = LESSONS.map((l, i) => `
  <details class="lesson" ${i === 0 ? 'open' : ''}>
    <summary>${l.title}</summary>
    <div class="lesson-body">${l.body}</div>
  </details>`).join('');

// ---- play ----
initPlayTab();

// ---- drills ----
newDuel();
renderQuiz(true);
