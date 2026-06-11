# 2-7 Single Draw Trainer

A training course + practice emulator for **no-limit 2-7 single draw lowball**
(deuce-to-seven), built for home-game prep.

## What's inside

- **Learn** — a six-lesson course: rules, hand rankings, pre-draw strategy,
  the draw, post-draw betting, and a play-safe cheat sheet.
- **Play** — a no-limit single-draw table vs. 1–5 tight-aggressive bots
  (blinds 5/10, 1,000 stacks, side pots, occasional snows), with a **coach
  mode** that gives Monte-Carlo-backed advice at every decision: what to
  open, what to keep, what to bet, and which "outs" secretly make a straight.
- **Drills** — a "which hand wins?" speed trainer and a 12-question
  decision quiz.

## Run locally

Static site, no build step:

```sh
npx http-server public
```

Tests (evaluator checks + 800 simulated bot hands):

```sh
node test/sim.mjs
```

## Deploy

```sh
npx wrangler deploy
```
