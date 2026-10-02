# Stat-race engine (channel design system)

Vertical 1080×1920 bar-chart-race videos in the channel's house style. The
style lives in these files from the design system:

- `animations-v3.jsx`: the continuous-composition animation engine
- `stat-race.jsx`: the stat-race layout, motion and cards
- `race-topics.jsx`: the topic library: data, story cards and a per-topic skin

`Baby_Names_Race.dc.html` and `support.js` are the original design-tool
documents, kept for reference. They are not used for rendering.

## Local extensions to `stat-race.jsx`

All of these are opt-in per topic, so existing topics render unchanged.

- `topic.spotlight: true`: a featured name that is still outside the top 10
  rides in an extra row under the chart. It shows its real rank (from
  `topic.trueRank`), so a story card can start as soon as the name starts
  climbing.
- `topic.dimOthers: false`: featured names are ringed, and the rest of the
  board stays at full strength.
- `event.names: [...]`: highlights several names on one card.
- `event.image`, `event.caption`, `event.credit`: a photo fills the card's
  monogram panel, with the stat on a scrim. The caption and credit go under
  the body text.
- `window.RACE_SCENES[topicId]`: a topic can bring its own scene list (pacing).

## Rendering a video

```sh
python3 build_girls_topic.py ../data/babynames_F_1880_2025.csv.gz ../cards/story.json   # -> topics/girls_ssa.js
PLAYWRIGHT_PATH=$(npm root -g)/playwright node capture.mjs girls_ssa /tmp/frames 30 4
ffmpeg -framerate 30 -i /tmp/frames/%05d.png -c:v libx264 -pix_fmt yuv420p -crf 21 out.mp4
```

`capture.mjs` serves `bar-race/` locally and opens `harness.html?topic=…`
in headless Chromium. For each frame it fires the engine's own
`data-om-seek-to-time-frame` event and screenshots the stage. Add `&safe=1`
to the harness URL to preview the safe-zone overlay.

To preview individual frames, pass a comma-separated list of times as the
5th argument: `node capture.mjs girls_ssa /tmp/test 30 1 3,40,120`.

## New topics

1. Write a `build_<topic>_topic.py` that emits `topics/<id>.js`. It
   registers `window.RACE_TOPICS.<id>` (with `raw` yearly keyframes, `events`,
   `outro` and a `skin`) and `window.RACE_SCENES.<id>`.
2. Add the topic `<script>` to `harness.html`.
3. Pick a skin from `race-topics.jsx`, or add one. The layout, the
   typeface (Bricolage Grotesque) and the motion are brand constants.

Story-card images go in `../cards/`. Anything dropped into `../cards/custom/`
with the same file stem replaces the default image (see the README there).
