// Web worker: computes EV(call/shove) - EV(fold) for all 169 starting-hand classes in a spot.
import { prepareSpot, simulate, meanAcc, heroActionName, newAcc } from './model.js';
import { combosOfClass, mulberry32 } from './poker.js';

self.onmessage = e => {
  const { spot, iters, id } = e.data;
  const rt = prepareSpot(spot);
  const act = heroActionName(spot);
  const foldNeedsMC = rt.hasPriorShove && (spot.behind.length > 0 || spot.prefix.some(p => p.act === 'call'));
  const fold = meanAcc(simulate(rt, 'fold', null, foldNeedsMC ? 6000 : 1, mulberry32(99)));
  const out = new Array(169);
  for (let i = 0; i < 169; i++) {
    const combos = combosOfClass(i);
    const acc = newAcc();
    const rng = mulberry32(4242); // common random numbers across hand classes
    const per = Math.max(1, Math.round(iters / combos.length));
    for (const c of combos) simulate(rt, act, c, per, rng, acc);
    const m = meanAcc(acc);
    out[i] = {
      chips: m.chips - fold.chips, icm: m.icm - fold.icm, linb: m.linb - fold.linb, full: m.full - fold.full,
      huEq: m.huEq, busted: m.busted, ko: m.ko,
    };
    if (i % 13 === 12) self.postMessage({ id, progress: (i + 1) / 169 });
  }
  self.postMessage({ id, done: true, out, act });
};
