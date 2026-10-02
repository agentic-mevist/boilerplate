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
- `topic.highlight: {ring, dim, band, badge}`: how the card's name is marked
  on the board. `ring` outlines the bar, `dim` (0 to 1) fades the rest of the
  board, `band` draws a pill behind the whole row, and `badge` puts the card's
  photo on the bar tip. The girls video uses only a 40% fade (`{dim: 0.4}`).
  Preview another style with `HARNESS_QUERY='&hl={"dim":0.3}'` on `capture.mjs`.
- `topic.colors` (`{name: "#hex"}`): one fixed color per name. The girls
  builder assigns them from a 16-color pop palette so no two names on screen
  together share a color.
- `topic.risePop: false`: a climbing bar stays still; only the ▲ marks the climb.
- `topic.headerLead: true`: the reigning #1 moves to the top-right corner and
  the region tag is dropped (put the region in the title instead).
- `topic.totals` (`"year:count …"`), `topic.countUnit`, `topic.totalLabel`:
  each bar shows its absolute count under the percentage, and the note line
  shows the year's total.
- Layout: slot 11 is reserved for the spotlight row. A name leaving the top 10
  fades out before it gets there, and the note sits below slot 11, so nothing
  overlaps the note or the card.
- `event.names: [...]`: highlights several names on one card.
- `event.image`, `event.caption`, `event.credit`, `event.focus`: a photo fills
  the card's monogram panel (`focus` is its CSS object-position). `event.stat`
  is optional; the girls video leaves it out. The caption and credit go under
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
