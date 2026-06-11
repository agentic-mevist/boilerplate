// Headless sanity tests: evaluator correctness + engine simulation.
import { evaluate, CAT } from '../public/js/cards.js';
import { analyzeKeeps } from '../public/js/analysis.js';
import { Game, PHASE } from '../public/js/engine.js';

let fails = 0;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); fails++; }
}

const H = str => str.split(' ').map(t => ({ r: { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,T:10,J:11,Q:12,K:13,A:14 }[t[0]], s: { s:'♠',h:'♥',d:'♦',c:'♣' }[t[1]] }));

// --- evaluator ---
const nuts = evaluate(H('7s 5h 4d 3c 2s'));
check(nuts.cat === CAT.HIGH_CARD, 'nuts is high card');

const beats = (a, b) => evaluate(H(a)).score < evaluate(H(b)).score;
check(beats('7s 5h 4d 3c 2s', '7s 6h 4d 3c 2s'), '75432 beats 76432');
check(beats('8s 5h 4d 3c 2s', '8s 6h 4d 3c 2s'), 'smooth 8 beats rough 8');
check(beats('9s 6h 5d 4c 2s', '9s 8h 4d 3c 2s'), '96542 beats 98432 (second card)');
check(beats('Ks 9h 7d 4c 2s', 'As 5h 4d 3c 2s'), 'K-high beats A-high (A2345 is no straight)');
check(beats('As 9h 7d 4c 2s', '2s 2h 4d 5c 7s'), 'A-high beats a pair of 2s');
check(beats('2s 2h 9d 5c 7s', '3s 3h 4d 5c 6s'), 'pair of 2s beats pair of 3s');
check(beats('Ks Kh 9d 5c 7s', '2s 3h 4d 5c 6h'), 'pair of Ks beats 23456 straight');
check(beats('2s 3h 4d 5c 6h', '2s 3s 4s 5s 7s'), 'straight beats flush');
check(evaluate(H('As 2h 3d 4c 5s')).cat === CAT.HIGH_CARD, 'A2345 is high card, not straight');
check(evaluate(H('2s 3s 4s 5s 6s')).cat === CAT.STRAIGHT_FLUSH, '23456 suited is straight flush');
check(evaluate(H('Ts Jh Qd Kc As')).cat === CAT.STRAIGHT, 'TJQKA is a straight');

// tie
check(evaluate(H('9s 6h 5d 4c 2s')).score === evaluate(H('9h 6d 5c 4s 2h')).score, 'suit-only diff ties');

// --- analysis ---
const keeps = analyzeKeeps(H('2s 3h 4d 5c Kd'), 400);
const top = keeps[0];
check(top.drawCount >= 1, '2345K: should draw, not stand pat with K');
const keptRanks = top.kept.map(c => c.r).sort((a, b) => a - b).join(',');
console.log('  2345K best keep:', keptRanks, 'draw', top.drawCount, 'util', top.util.toFixed(1));

const patHand = H('8s 6h 5d 4c 2s');
const patTop = analyzeKeeps(patHand, 400)[0];
check(patTop.drawCount === 0, 'pat 86542 should stand pat');

const pairHand = analyzeKeeps(H('7s 7h 4d 3c 2s'), 400)[0];
check(pairHand.drawCount === 1 && !pairHand.kept.some((c, i) => pairHand.kept.findIndex(x => x.r === c.r) !== i), '77432: break the pair, draw 1');

// --- engine simulation ---
async function simulate(botCount, hands) {
  return new Promise(resolve => {
    let handsDone = 0;
    const game = new Game({
      botCount, stack: 1000, sb: 5, bb: 10,
      onUpdate: () => {},
      onLog: () => {},
      onHumanTurn: kind => {
        // drive the "human" with the bot brain
        queueMicrotask(() => {
          if (kind === 'draw') game.botDraw(game.human);
          else game.botBet(game.human);
        });
      },
      onHandEnd: () => {
        // chip conservation
        const totalStacks = game.players.reduce((s, p) => s + p.stack, 0);
        const totalBuyins = game.players.reduce((s, p) => s + p.buyIns * 1000, 0);
        check(totalStacks === totalBuyins, `chips conserved (${totalStacks} vs ${totalBuyins}) hand ${handsDone}`);
        check(game.players.every(p => p.stack >= 0), 'no negative stacks');
        handsDone++;
        if (handsDone >= hands) { game.destroy(); resolve(); }
        else queueMicrotask(() => game.startHand());
      },
    });
    game.later = fn => game.timers.push(setTimeout(fn, 0)); // fast-forward bot delays
    game.startHand();
  });
}

console.log('Simulating 300 hands heads-up...');
await simulate(1, 300);
console.log('Simulating 300 hands 4-handed...');
await simulate(3, 300);
console.log('Simulating 200 hands 6-handed...');
await simulate(5, 200);

if (fails === 0) console.log('\nAll checks passed ✔');
else { console.error(`\n${fails} check(s) failed`); process.exit(1); }
