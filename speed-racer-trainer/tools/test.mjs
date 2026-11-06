// Sanity tests: evaluator, payouts, ICM, and a handful of solved random spots.
// Run: node tools/test.mjs
import { generateSpot, DEFAULT_CFG, chooseHeroHand } from '../site/js/gen.js';
import { prepareSpot, solveSpot, dollarsPerBB, makePayouts, heroIcm, makeIcmContext } from '../site/js/model.js';
import { cardStr, evalCards } from '../site/js/poker.js';

const c = s => '23456789TJQKA'.indexOf(s[0]) * 4 + 'shdc'.indexOf(s[1]);
const ev = str => evalCards(str.split(' ').map(c), 7);
const assert = (cond, msg) => { if (!cond) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
assert(ev('As Ks Qs Js Ts 2d 3c') > ev('9h 9d 9c 9s Ah 2d 3c'), 'royal > quads');
assert(ev('Ah 2d 3c 4s 5h Kd Kc') >> 20 === 4, 'wheel straight');
assert(ev('Ah 2h 3h 4h 5h Kd Kc') >> 20 === 8, 'steel wheel');
assert(ev('Ah Ad Kc Ks Qh Qd 2c') === ev('Ah Ad Kc Ks Jh Jd Qc'), 'two pair: third pair plays as kicker');
assert(ev('Ah Ad Kc Ks Qh 3d 2c') > ev('Ah Ad Kc Ks Jh 3d 2c'), 'two pair kicker');
assert(ev('Th Td Tc 9s 9h 9d 2c') >> 20 === 6, 'double trips = full house');
assert(ev('Ah Kh 7h 4h 2h 2d 2c') >> 20 === 5, 'flush beats trips');

const p = makePayouts(400, 1.3, 0.15);
console.log('payouts', p.length, p.slice(0, 5), '... min', p[p.length - 1], 'sum', p.reduce((a, b) => a + b, 0).toFixed(2));

// ICM: Monte Carlo (10 left) vs exact (9 left) should be in the same ballpark.
const sp = { playersLeft: 10, seats: [{ stack: 10 }, { stack: 20 }, { stack: 5 }], payouts: [50, 30, 20], others: { stacks: [10, 10, 10, 10, 10, 10, 5] }, seed: 3 };
const ctx = makeIcmContext(sp);
console.log('MC icm (10 left) hero stack10', heroIcm(ctx, 0, [10, 20, 5], [10, 20, 5]).toFixed(3), 'stack20', heroIcm(ctx, 1, [10, 20, 5], [10, 20, 5]).toFixed(3));
const sp9 = { ...sp, playersLeft: 9, others: { stacks: [10, 10, 10, 10, 10, 15] } };
const ctx9 = makeIcmContext(sp9);
console.log('exact (9 left)    hero stack10', heroIcm(ctx9, 0, [10, 20, 5], [10, 20, 5]).toFixed(3), 'stack20', heroIcm(ctx9, 1, [10, 20, 5], [10, 20, 5]).toFixed(3));

const stages = ['early', 'mid', 'bubble', 'itm', 'ft'];
for (let seed = 1; seed <= 10; seed++) {
  const spot = generateSpot(DEFAULT_CFG, { stages: [stages[seed % 5]], types: ['call', 'open', 'multi'] }, seed * 1000);
  const t0 = Date.now();
  spot.heroCards = chooseHeroHand(spot, true, seed);
  const t1 = Date.now();
  const rt = prepareSpot(spot);
  const r = solveSpot(rt, spot.heroCards, 20000, 5);
  const t2 = Date.now();
  console.log(`\n#${seed} ${spot.stage} ${spot.type} N=${spot.playersLeft} paid=${spot.payouts.length} hero=${spot.seats[spot.heroIdx].pos} ${spot.heroCards.map(cardStr).join('')} ($/bb ${dollarsPerBB(rt).toFixed(3)}) choose ${t1 - t0}ms solve ${t2 - t1}ms`);
  spot.seats.forEach(s => console.log(`  ${s.pos.padEnd(4)} ${s.name.padEnd(12)} ${s.stack.toFixed(1).padStart(5)}bb $${s.head.toFixed(2)} ${s.profile}`));
  console.log('  prefix', JSON.stringify(spot.prefix), 'behind', JSON.stringify(spot.behind));
  for (const k of ['chips', 'icm', 'linb', 'full']) console.log(`  ${k.padEnd(5)} fold ${r.fold[k].toFixed(4)}  ${r.act} ${r.go[k].toFixed(4)}  diff ${(r.go[k] - r.fold[k]).toFixed(4)}`);
  console.log('  stats', JSON.stringify({ unc: r.go.uncontested, called: r.go.called, bust: r.go.busted, ko: r.go.ko, huEq: r.go.huEq, memo: rt.memo.size }));
}
