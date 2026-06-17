# Conversation → Song Reel

Turn a screenshotted chat into an Instagram-DM-style animated reel set to an
AI-generated song.

```
screenshots ──▶ parse ──▶ messages.json
                              │
                              ▼
                  reading-time timeline  ──┐
                              │            │
                       Lyria 3 song        │  (timeline drives the animation;
                              │            │   the song fills the soundtrack)
                              ▼            ▼
                   render frames (Playwright) ──▶ stitch (ffmpeg) ──▶ reel.mp4
```

## Why the architecture is "audio-led", not "timecode-driven"

The intuitive idea is to send each phrase to a music API *with exact timecodes*
and have it sing on cue. **No music API supports that** — generation timing is
non-deterministic, and Lyria 3 doesn't return lyric timestamps at all. So
instead:

1. The **reading-time timeline** (`src/timeline.js`) decides when each bubble
   pops, from word count and a sung-reading pace. Fully deterministic, no
   external service.
2. The **template** (`template/`) renders the exact visual state for any
   timestamp via `window.seek(tMs)` — a pure function of time.
3. The **renderer** (`src/render.js`) screenshots one frame per `1/fps`, so
   output is reproducible and frame-perfect.
4. **Lyria 3** (`src/music.js`) generates the song from the conversation
   lyrics. The reel is stretched to the song length (`fitToAudio`).

## Quick start

```bash
npm install
npx playwright install chromium

# Full pipeline on the sample conversation, stub audio (silence):
node src/pipeline.js

# Audible sync check — a blip plays as each message appears:
node src/pipeline.js --blips

# Real song (needs GEMINI_API_KEY). 30s clip:
GEMINI_API_KEY=... node src/pipeline.js samples/messages.json --music
# Full ~2min song:
GEMINI_API_KEY=... node src/pipeline.js samples/messages.json --music --full
```

Output: `data/reel.mp4` (1080×1920, 30fps).

## Keys

| Purpose            | Env var             | Where                                   |
|--------------------|---------------------|-----------------------------------------|
| Lyria 3 song       | `GEMINI_API_KEY`    | https://aistudio.google.com/apikey      |
| Screenshot parsing | `ANTHROPIC_API_KEY` | optional — vision OCR of screenshots    |

## From screenshots

```bash
node src/parse.js shot1.png shot2.png > samples/mychat.json
node src/pipeline.js samples/mychat.json --music
```

`messages.json` schema:

```json
{ "peer": { "name": "customer" },
  "messages": [ { "side": "in|out", "text": "..." } ] }
```

`out` = the account owner (right side / coloured bubbles); `in` = the other
person.

## Tightening sync (optional, later)

Lyria does not return lyric timestamps, so sync currently uses reading-time
estimates stretched to the song length. For word-perfect lip-sync, run forced
alignment on the generated audio (e.g. WhisperX) to get per-word timings, then
build the timeline from those instead of the estimate. The seam is marked in
`src/pipeline.js`.

## Layout

| Path                | Role                                          |
|---------------------|-----------------------------------------------|
| `template/`         | Deterministic Instagram-DM animation (`seek`) |
| `src/timeline.js`   | Reading-time pacing                           |
| `src/lyrics.js`     | Conversation → Lyria prompt                   |
| `src/music.js`      | Lyria 3 client                                |
| `src/parse.js`      | Screenshot → messages (Claude vision)         |
| `src/render.js`     | Playwright frame capture                      |
| `src/stitch.js`     | ffmpeg frames + audio → MP4                   |
| `src/audio_stub.js` | Placeholder soundtrack                        |
| `src/pipeline.js`   | Orchestrator                                  |
