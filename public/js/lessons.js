// Course content for the Learn tab.
export const LESSONS = [
{
  id: 'basics',
  title: '1 · The Game in Two Minutes',
  body: `
<p><strong>2-7 Single Draw No-Limit</strong> (a.k.a. "Deuce-to-Seven lowball") is the simplest draw game there is, and one of the purest forms of no-limit poker. The goal: make the <em>worst</em> conventional poker hand.</p>
<h4>How a hand plays out</h4>
<ol>
  <li><strong>Blinds & deal.</strong> Small blind and big blind are posted (some games add an ante). Everyone gets <strong>5 cards face down</strong>.</li>
  <li><strong>First betting round</strong> — no-limit, starts left of the big blind. Fold, call, or raise as much as you like.</li>
  <li><strong>The draw.</strong> One time only, starting left of the button, each remaining player discards 0–5 cards and gets replacements. Discarding zero is called <strong>standing pat</strong>. <em>Watch how many cards everyone takes — it's the only "board" this game has.</em></li>
  <li><strong>Second betting round</strong> — again no-limit, starts left of the button.</li>
  <li><strong>Showdown.</strong> The <strong>lowest</strong> hand wins the pot.</li>
</ol>
<h4>The three rules that trip everyone up</h4>
<ul>
  <li><strong>Aces are always HIGH.</strong> A-2-3-4-5 is not a wheel here — it's just a lousy ace-high.</li>
  <li><strong>Straights and flushes count AGAINST you.</strong> 2-3-4-5-6 isn't a great low — it's a straight, and a straight even loses to a pair of kings here. Treat it as a disaster.</li>
  <li><strong>Pairs are bad.</strong> Any pair loses to any no-pair hand.</li>
</ul>
<p>The best possible hand is <strong>7-5-4-3-2</strong> (not all the same suit) — players call it <em>"Number One."</em></p>`
},
{
  id: 'rankings',
  title: '2 · Hand Rankings',
  body: `
<p>Hands rank from best to worst like this. Within "high card" hands, compare from the top card down — lower is better.</p>
<table>
<tr><th>Rank</th><th>Hand</th><th>Notes</th></tr>
<tr><td>1</td><td><strong>7-5-4-3-2</strong></td><td>"Number One" — the nuts</td></tr>
<tr><td>2</td><td>7-6-4-3-2</td><td>"Number Two"</td></tr>
<tr><td>3</td><td>7-6-5-3-2</td><td>"Number Three"</td></tr>
<tr><td>…</td><td>any 8-low (e.g. 8-5-4-3-2)</td><td>Monsters. Bet them hard.</td></tr>
<tr><td>…</td><td>any 9-low</td><td>Strong — usually good at showdown</td></tr>
<tr><td>…</td><td>any 10-low</td><td>Decent; a typical winning hand heads-up</td></tr>
<tr><td>…</td><td>J / Q / K-low</td><td>Marginal — wins small pots, loses big ones</td></tr>
<tr><td>…</td><td>Ace-high (e.g. A-9-5-4-2)</td><td>Weak — remember the ace is high!</td></tr>
<tr><td>…</td><td>One pair, two pair, trips…</td><td>Bad. A pair of deuces beats a pair of treys, though.</td></tr>
<tr><td>worst</td><td>Straights, flushes, straight flushes</td><td>2-3-4-5-6 is a straight, not a smooth low!</td></tr>
</table>
<h4>Comparing two low hands</h4>
<p>Read both hands from the highest card down: <strong>9</strong>-7-6-4-2 beats <strong>9</strong>-<strong>8</strong>-4-3-2 (the nines tie, then 7 &lt; 8). A "smooth" hand has low cards under its top card; a "rough" one is packed near the top — 8-7-6-5-3 is the roughest 8, 8-5-4-3-2 the smoothest.</p>
<h4>Memorize these traps</h4>
<ul>
  <li><strong>2-3-4-5-6</strong> and <strong>3-4-5-6-7</strong> = straights. Garbage.</li>
  <li><strong>A-2-3-4-5</strong> = ace-high, not a straight, but still weak.</li>
  <li>Drawing one to <strong>2-3-4-5</strong>: a 6 makes a straight, a 7 makes the nuts. Only 7s, 8s and 9s actually help.</li>
  <li>Four of one suit drawing one: a fifth of that suit makes a flush. Suits matter on the draw!</li>
</ul>`
},
{
  id: 'predraw',
  title: '3 · Before the Draw: What to Play',
  body: `
<p>Pre-draw is where most of the money is won and lost. The single biggest leak in home games is playing too many hands and drawing two or three cards. Your edge: <strong>be tight, be aggressive</strong>.</p>
<h4>Hand categories (best to worst)</h4>
<ul>
  <li><strong>Pat hands</strong> — five different ranks, no straight/flush, 10-high or better. You're dealt one rarely; raise and re-raise with it.</li>
  <li><strong>One-card draws</strong> — four cards 8-or-lower of mixed ranks, e.g. 2-4-7-8. The bread and butter of the game.</li>
  <li><strong>Two-card draws</strong> — three babies like 2-3-7. Big underdog vs. any one-card draw; mostly a fold.</li>
</ul>
<h4>A safe opening guide (raise ~2.5–3× the big blind)</h4>
<table>
<tr><th>Your hand</th><th>Early seats</th><th>Late / button</th></tr>
<tr><td>Pat 10 or better</td><td>Raise, re-raise</td><td>Raise, re-raise</td></tr>
<tr><td>Pat J / Q</td><td>Raise, fold to a 3-bet</td><td>Raise</td></tr>
<tr><td>1-card draw to 7 or 8</td><td>Raise</td><td>Raise</td></tr>
<tr><td>1-card draw to 9 or 10</td><td>Fold</td><td>Raise</td></tr>
<tr><td>2-card draw to a 7 (with a deuce)</td><td>Fold</td><td>Raise if unopened</td></tr>
<tr><td>Everything else</td><td>Fold</td><td>Fold</td></tr>
</table>
<h4>Key principles</h4>
<ul>
  <li><strong>Raise or fold.</strong> Limping and flat-calling invite multiway pots where your one-card draw shrinks in value. Enter with a raise.</li>
  <li><strong>Deuces are gold.</strong> Almost every great hand contains a 2. A draw like 3-4-5-8 is much weaker than 2-4-5-8 — and 3-4-5-x draws flirt with straights.</li>
  <li><strong>Position is huge.</strong> Acting last, you see how many cards opponents draw before you decide. Play far more hands on the button than under the gun.</li>
  <li><strong>Facing a raise:</strong> re-raise with pat 9-or-better and premium 8-draws; call in position with good one-card draws; fold the rest. Don't peel raises with two-card draws "to see what happens."</li>
</ul>`
},
{
  id: 'draw',
  title: '4 · The Draw: What to Keep',
  body: `
<p>You draw <strong>once</strong>. There's no second chance, so the math is unforgiving — a one-card draw to an 8 completes a J-or-better low only about half the time and pairs up a quarter of the time.</p>
<h4>Default rules</h4>
<ul>
  <li><strong>Never keep a pair</strong> (unless you're bluffing — see snowing below). Break it, keep the lowest cards.</li>
  <li><strong>Draw one, not two.</strong> If your choice is "draw two to a great hand" or "fold," it was probably a pre-draw fold.</li>
  <li><strong>Stand pat with a Jack-low or better when heads-up</strong> against one opponent who is drawing. A pat J beats a busted draw, and draws bust more often than not.</li>
  <li><strong>Check the straight and flush cards before discarding.</strong> Keeping 4-5-6-7? A 3 or an 8 makes a straight. Keeping four spades? Throw the draw's suit awareness in: a spade ruins you.</li>
  <li><strong>Don't chase perfection.</strong> Breaking a pat 10 to draw at an 8 is usually lighting money on fire when there's already a big pot you might win as-is.</li>
</ul>
<h4>The information game</h4>
<p>The number of cards each player draws is public and priceless:</p>
<ul>
  <li>Opponent <strong>stands pat</strong> → they claim a made hand (usually a 9, 10 or J — or a bluff).</li>
  <li>Opponent <strong>draws one</strong> → they'll make a 9-or-better only ~1 time in 3.</li>
  <li>Opponent <strong>draws two+</strong> → they were weak pre-draw and usually still are.</li>
</ul>
<h4>Snowing (advanced — use rarely)</h4>
<p>A <strong>snow</strong> is standing pat with garbage and betting like you have a monster. It works because pat hands are scary and draws miss often. While learning: snow at most once a night, in position, against one opponent who drew two. The threat that you <em>could</em> be snowing is worth more than the bluff itself.</p>`
},
{
  id: 'postdraw',
  title: '5 · After the Draw: Betting the Result',
  body: `
<p>One round of no-limit betting remains. Your decisions key off two things: <strong>what you made</strong>, and <strong>how many cards each opponent took</strong>.</p>
<h4>When you were the one drawing</h4>
<table>
<tr><th>You made…</th><th>vs. opponent who drew</th><th>vs. opponent who stood pat</th></tr>
<tr><td>8-low or better</td><td>Bet ⅔ pot for value</td><td>Bet for value; happily get it in</td></tr>
<tr><td>9-low</td><td>Bet — they miss too often</td><td>Check-call one bet</td></tr>
<tr><td>10 / J-low</td><td>Check; call a normal bet</td><td>Check-fold to real pressure</td></tr>
<tr><td>Q-or-worse / a pair</td><td>Check-fold (occasionally bluff)</td><td>Check-fold</td></tr>
</table>
<h4>When you stood pat</h4>
<ul>
  <li>Against players who drew: <strong>bet your 9s-or-better for value</strong>. Bet about ⅔ pot. They paired or bricked nearly half the time and will still pay you with worse pat-type hands.</li>
  <li>With a pat 10/J against one drawer: betting and checking are both fine — betting folds out hands you beat, checking induces bluffs from busted draws.</li>
</ul>
<h4>Discipline points</h4>
<ul>
  <li><strong>Pot odds in one line:</strong> if the bet is half the pot, you need to win ~25% of the time for a call. A 9-low against a single drawer clears that easily; a Q-low against a pat raiser doesn't.</li>
  <li><strong>Don't pay off huge post-draw raises</strong> with 10s and Js. When a sane player raises after the draw, they have an 8 or better (or a rare snow — let them have it).</li>
  <li><strong>Don't slowplay.</strong> There are no more cards to come; if you check your 7 you usually just lose value. Bet your good hands.</li>
</ul>`
},
{
  id: 'cheatsheet',
  title: '6 · Play-Safe Cheat Sheet',
  body: `
<p>Tape this to your forehead for the first home game:</p>
<ol>
  <li>Aces high. Straights & flushes bad. Nuts = <strong>7-5-4-3-2</strong>.</li>
  <li>Enter pots with a <strong>raise or fold</strong> — almost never limp/flat.</li>
  <li>Play: pat 10-or-better, one-card draws to a 9-or-better (8 from early seats). Fold the rest.</li>
  <li><strong>Two-card draws are folds</strong> except a 2-x-7 type on the button in an unopened pot.</li>
  <li>Love deuces. A draw without a 2 or 3 is suspect.</li>
  <li>Before discarding, check: does any catch make a <strong>straight or flush</strong>?</li>
  <li>Heads-up vs. one drawer, <strong>stand pat with J-low or better</strong>.</li>
  <li>After the draw: <strong>bet 8s and 9s for value</strong>, check 10s/Js, give up on worse.</li>
  <li>Never pay off a big post-draw raise with a 10 or worse.</li>
  <li>Snow (pat-hand bluff) at most once a night. Tight is right; let <em>them</em> bluff <em>you</em>... and call with your 9s.</li>
</ol>
<p>Bankroll tip for the home game: buy in for ~100 big blinds and treat each decision as raise/fold. You'll instantly be tighter and more aggressive than the table, which is exactly the profile that wins at lowball.</p>`
},
];
