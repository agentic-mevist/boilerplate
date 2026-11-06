// Verifies the worked example on the Learn page: BB 10bb vs BTN 9bb shove at level 1.
import { prepareSpot, solveSpot, makePayouts, shoveRange, dollarsPerBB } from '../site/js/model.js';
import { DEFAULT_CFG } from '../site/js/gen.js';
import { CLASS_NAMES, combosOfClass } from '../site/js/poker.js';
const cfg = DEFAULT_CFG, N = 390;
const others = Array(N - 6).fill(10);
const spot = {
  seed: 7, playersLeft: N, payouts: makePayouts(cfg.entries, cfg.prizePerEntry, cfg.paidPct), koShare: 0.5, sb: 0.5, bb: 1, ante: 1,
  seats: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map((pos, i) => ({ pos, stack: pos === 'BTN' ? 9 : 10, head: 1, profile: 'reg', name: pos })),
  heroIdx: 5, prefix: [{ idx: 0, act: 'fold' }, { idx: 1, act: 'fold' }, { idx: 2, act: 'fold' }, { idx: 3, act: 'shove', pct: 30 }, { idx: 4, act: 'fold' }],
  behind: [], others: { stacks: others, heads: others.map(() => 1) },
};
const rt = prepareSpot(spot);
console.log('$/bb', dollarsPerBB(rt).toFixed(3));
const rows = [];
for (let i = 0; i < 169; i++) {
  const r = solveSpot(rt, combosOfClass(i)[0], 6000, 3);
  const W = r.go.huWin, L = r.go.huLose;
  if (!W || !L) continue;
  const req = k => (r.fold[k] - L[k]) / (W[k] - L[k]);
  rows.push({ h: CLASS_NAMES[i], eq: r.go.huEq, chips: req('chips'), linb: req('linb'), full: req('full') });
}
const r0 = rows[0];
console.log('required: chips', r0.chips.toFixed(3), 'chips+bounty', r0.linb.toFixed(3), 'full', r0.full.toFixed(3));
console.log('hands between full-model and chip thresholds:', rows.filter(x => x.eq < r0.chips && x.eq > r0.full).map(x => `${x.h}:${(x.eq * 100).toFixed(1)}`).join(' '));
