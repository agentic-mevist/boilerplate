// Drills: "which hand wins" trainer + scenario quiz.
import { makeDeck, shuffle, evaluate, shortName } from './cards.js';
import { cardHTML } from './table-ui.js';

// ---- Which hand wins ----
let streak = 0, bestStreak = 0, duel = null;

function dealInstructiveHand(deck) {
  // Bias toward low-ish, instructive hands: draw 5 from a deck weighted to babies,
  // occasionally produce straights/flushes/pairs traps naturally.
  const mode = Math.random();
  if (mode < 0.25) {
    // near-straight or straight territory: take 5 cards from a 6-rank window
    const start = 2 + Math.floor(Math.random() * 6);
    const pool = deck.filter(c => c.r >= start && c.r <= start + 5);
    shuffle(pool);
    return pool.slice(0, 5);
  }
  if (mode < 0.5) {
    const pool = deck.filter(c => c.r <= 9);
    shuffle(pool);
    return pool.slice(0, 5);
  }
  if (mode < 0.65) {
    const suit = deck[Math.floor(Math.random() * deck.length)].s;
    const pool = deck.filter(c => c.s === suit || Math.random() < 0.25);
    shuffle(pool);
    return pool.slice(0, 5);
  }
  shuffle(deck);
  return deck.slice(0, 5);
}

export function newDuel() {
  const deck = makeDeck();
  const a = dealInstructiveHand([...deck]);
  const usedA = new Set(a.map(c => c.r + c.s));
  const b = dealInstructiveHand(deck.filter(c => !usedA.has(c.r + c.s)));
  duel = { a, b, evA: evaluate(a), evB: evaluate(b), done: false };
  renderDuel();
}

function renderDuel() {
  const el = document.getElementById('duel-area');
  const sortLow = h => [...h].sort((x, y) => y.r - x.r);
  el.innerHTML = `
    <p class="duel-q">Which hand wins at showdown? <span class="streak">Streak: ${streak} · Best: ${bestStreak}</span></p>
    <div class="duel-hands">
      <button class="duel-hand" data-pick="a">${sortLow(duel.a).map(cardHTML).join('')}</button>
      <div class="duel-vs">vs</div>
      <button class="duel-hand" data-pick="b">${sortLow(duel.b).map(cardHTML).join('')}</button>
    </div>
    <div id="duel-result"></div>`;
  el.querySelectorAll('.duel-hand').forEach(btn => btn.onclick = () => pickDuel(btn.dataset.pick));
}

function pickDuel(pick) {
  if (duel.done) return;
  duel.done = true;
  const { evA, evB } = duel;
  const correct = evA.score === evB.score ? 'tie' : (evA.score < evB.score ? 'a' : 'b');
  const right = pick === correct;
  if (correct === 'tie') streak++; else streak = right ? streak + 1 : 0;
  bestStreak = Math.max(bestStreak, streak);
  const res = document.getElementById('duel-result');
  res.innerHTML = `
    <p class="${right || correct === 'tie' ? 'good' : 'bad'}">
      ${correct === 'tie' ? 'It’s a tie!' : right ? '✔ Correct!' : '✘ Not quite.'}
      Left: <strong>${shortName(evA)}</strong> · Right: <strong>${shortName(evB)}</strong>.
      ${correct === 'tie' ? '' : `The ${correct === 'a' ? 'left' : 'right'} hand is lower, so it wins.`}
    </p>
    <button class="btn primary" id="duel-next">Next pair →</button>`;
  document.getElementById('duel-next').onclick = newDuel;
  renderHeaderStreak();
}

function renderHeaderStreak() {
  const s = document.querySelector('#duel-area .streak');
  if (s) s.textContent = `Streak: ${streak} · Best: ${bestStreak}`;
}

// ---- Scenario quiz ----
const QUIZ = [
  { q: 'You\'re dealt A♠ 2♥ 3♦ 4♣ 5♠. What do you have?',
    opts: ['A straight — fold', 'The best possible hand', 'Ace-high — a weak hand', 'A 5-low — very strong'],
    a: 2, why: 'Aces are always high in 2-7 and A-2-3-4-5 is not a straight. It\'s just ace-high — weak.' },
  { q: 'Which is the best possible hand in 2-7?',
    opts: ['A-2-3-4-5', '2-3-4-5-6', '7-5-4-3-2 offsuit', '7-5-4-3-2 all spades'],
    a: 2, why: '7-5-4-3-2 of mixed suits is "Number One." The same ranks all in one suit make a flush — nearly the worst hand.' },
  { q: 'Showdown: your 9-6-5-4-2 vs. the opponent\'s 9-8-4-3-2. Who wins?',
    opts: ['You', 'Opponent', 'Tie'],
    a: 0, why: 'Compare from the top: 9 ties 9, then your 6 beats their 8. Smoothness below the top card decides.' },
  { q: 'Under the gun (first to act), you hold 3♣ 5♦ 8♠ J♥ K♦ with one card to draw at best a Jack. Action?',
    opts: ['Raise', 'Limp in cheap', 'Fold'],
    a: 2, why: 'A one-card draw to a Jack from early position is a clear fold. Tight is right — wait for a draw to a 9 or better.' },
  { q: 'On the button, unopened pot, you hold 2♦ 4♠ 7♥ 8♣ Q♦. Action?',
    opts: ['Fold — there\'s a queen', 'Raise, planning to discard the Q and draw one', 'Call and draw two'],
    a: 1, why: 'Toss the queen: 2-4-7-8 is a strong one-card draw to an 8. Open-raise it from any seat.' },
  { q: 'You hold 2♣ 3♦ 4♥ 5♠ K♣ and will draw one. What\'s the catch?',
    opts: ['Nothing — any low card wins it', 'A 6 makes a straight; only 7/8/9 truly help', 'You should draw two instead'],
    a: 1, why: 'Drawing to 2-3-4-5: a 6 makes a straight, an ace is high. Real outs are 7s, 8s, 9s (a 7 makes the nuts).' },
  { q: 'Heads-up. You\'re pat with J-9-6-4-2. Your lone opponent draws one. Best plan?',
    opts: ['Break the J and draw one too', 'Stay pat', 'Fold before the draw'],
    a: 1, why: 'A pat Jack beats every busted draw, and one-card draws miss (pair or worse-than-J) more often than they hit. Stand pat.' },
  { q: 'After the draw you made 8-6-5-4-2. Your opponent drew one and checks. You should…',
    opts: ['Check it back to be safe', 'Bet about ⅔ pot for value', 'Go all-in 10× pot'],
    a: 1, why: 'An 8-low is a clear value hand. Bet a size worse hands can call — checking back wastes your equity; a huge overbet folds out everything you beat.' },
  { q: 'You made T-8-5-4-2 after drawing. A tight player who stood pat bets full pot, you have a 10-low. You should…',
    opts: ['Call — pot odds', 'Raise as a bluff', 'Fold'],
    a: 2, why: 'A sane pat hand betting pot beats a 10-low almost always (pat 9s and better). Don\'t pay off — losing small is the skill.' },
  { q: 'What does it mean when an opponent "stands pat"?',
    opts: ['They fold', 'They discard zero cards, claiming a made hand', 'They draw five fresh cards'],
    a: 1, why: 'Standing pat = drawing zero. It announces a made hand — or, rarely, a "snow" (a pat bluff).' },
  { q: 'Which one-card draw is strongest?',
    opts: ['3-4-5-6', '2-3-4-7', '2-4-5-8', '4-5-7-8'],
    a: 1, why: '2-3-4-7 can\'t make a straight (the 7 blocks it), contains a deuce, and a 5 or 6 makes a 7-low — including 7-5-4-3-2. 3-4-5-6 looks pretty but a 2 or 7 makes a straight!' },
  { q: 'You\'re dealt a pat T-7-6-4-2 and face a single raise. Best line?',
    opts: ['Re-raise and stand pat', 'Call and draw one to the 7', 'Fold — a ten is too weak'],
    a: 0, why: 'A pat 10 is a strong hand in single draw. Re-raise for value and stand pat; breaking it to chase a 7 throws away a made winner.' },
];

let quizIdx = 0, quizScore = 0;

export function renderQuiz(reset = false) {
  if (reset) { quizIdx = 0; quizScore = 0; }
  const el = document.getElementById('quiz-area');
  if (quizIdx >= QUIZ.length) {
    el.innerHTML = `
      <p class="quiz-done">Quiz complete: <strong>${quizScore} / ${QUIZ.length}</strong>
      ${quizScore === QUIZ.length ? ' — perfect! You\'re ready for the home game.' :
        quizScore >= QUIZ.length * 0.75 ? ' — solid. Re-read the lessons you missed and run it back.' :
        ' — worth another pass through the Learn tab before game night.'}</p>
      <button class="btn primary" id="quiz-restart">Restart quiz</button>`;
    document.getElementById('quiz-restart').onclick = () => renderQuiz(true);
    return;
  }
  const item = QUIZ[quizIdx];
  el.innerHTML = `
    <p class="quiz-progress">Question ${quizIdx + 1} of ${QUIZ.length} · Score ${quizScore}</p>
    <p class="quiz-q">${item.q}</p>
    <div class="quiz-opts">${item.opts.map((o, i) => `<button class="btn quiz-opt" data-i="${i}">${o}</button>`).join('')}</div>
    <div id="quiz-result"></div>`;
  el.querySelectorAll('.quiz-opt').forEach(btn => btn.onclick = () => {
    const i = +btn.dataset.i;
    const right = i === item.a;
    if (right) quizScore++;
    el.querySelectorAll('.quiz-opt').forEach((b, j) => {
      b.disabled = true;
      if (j === item.a) b.classList.add('correct');
      else if (j === i) b.classList.add('wrong');
    });
    document.getElementById('quiz-result').innerHTML = `
      <p class="${right ? 'good' : 'bad'}">${right ? '✔ Correct.' : '✘ ' + item.opts[item.a]}</p>
      <p class="quiz-why">${item.why}</p>
      <button class="btn primary" id="quiz-next">${quizIdx + 1 === QUIZ.length ? 'See result' : 'Next →'}</button>`;
    document.getElementById('quiz-next').onclick = () => { quizIdx++; renderQuiz(); };
  });
}
