# HandlePilot MCP — promo video

A 45-second promo for the HandlePilot MCP server (`https://app.handlepilot.com/mcp`), rendered entirely from code on the engine of the 2026 motion reel (https://claude-motion-reel.donatizehelp.workers.dev): Canvas 2D through Skia in Node, every frame a pure function of time, sub-frame motion blur in linear light, and a soundtrack synthesized on the same 128 BPM grid.

1920×1080 · 60 fps · H.264 + AAC. No prices anywhere in the picture.

**Watch it:** https://handlepilot-mcp-promo.donatizehelp.workers.dev (published 2026-10-28; page source and publish steps in `site/`).

v5 (2026-10-27) clears the frame: only the HandlePilot mark stays in the corner (no "MCP server" eyebrow, chapter name or chapter progress), and the profile in the hook is "yourhandle".

v4 (2026-10-27) changes the opening and thins out the sound effects, as Victor asked: the first screen draws an Instagram profile under "Give your Instagram" and its icon instead of showing a creator's reels, the words slide in on soft air instead of a hit each, the floating pieces share one whoosh instead of a pop each, the hub's four powers get a faint brush of air instead of four notes, and the agent's tool calls, the reel breakdown rows, the "connected" moment and the logo's heartbeat at the end play without effects. The edit, the remix and the wall keep theirs.

v3 (2026-10-27) keeps v2's look and music and changes what Victor asked for: text always sits above the highlighter (`head()` draws every line's marks before any words), real people in the carousels, Adam Mosseri in the lookup, a reel that is watched *and remixed*, a highlighter colour per verb on the wall, @lotosinbloom's reels without Russian on them, and recorded sound effects in place of the synth blips.

v2 (2026-10-27) is drawn in the website's style guide (`public/site/landing.css` in the handlepilot repo): `#f7f7f7` paper, `#0a0a0a` ink, `#3478f5` blue, the `#c0efad` green highlighter behind key words, Inter 600 headlines at -0.045em, uppercase eyebrows, white cards with `#e4e4e4` hairlines, the app's own lucide icons. The tokens are `HP` in `src/timeline.js`; the drawing helpers (`head`, `eyebrow`, `body`, `markRect`, `hpCard`, `iconTile`) are at the end of `src/engine/ui.js`.

## The cut

24 bars of 1.875 s. Scene lengths live in `src/timeline.js` (`CHAPTERS`); picture and `tools/audio.py` both read the same grid.

| Bars | Scene | What happens |
|---|---|---|
| 1–2 | Hook | "Give your Instagram" word by word, the Instagram icon pops in after it and a profile mockup draws itself underneath (avatar ring, counting stats, a grid of posts); on the downbeat it parks in the corner, "AI superpowers." gets the highlighter and the product's pieces float out like the site's hero (a top reel, follower growth, a carousel, the calendar, the app's icons), then everything is pulled into the mark. |
| 3–5 | The hub | ChatGPT, Claude, Claude Code, Codex, Cursor and GitHub Copilot (their real marks) wire into HandlePilot. "Your AI does the work." "HandlePilot gives it superpowers." Then what that means: eyes on Instagram, a memory for your brand, the playbooks, editors for every post. |
| 6–7 | Ask | A chat with your agent: the raw take is dropped in, "Edit this into a reel", then `get_playbook`, `get_creator_context`, `watch_video`, render. |
| 8–11 | Edit | Bar 8: Victor's raw teleprompter take. On the drop a scan line turns it into the effects reel Claude cut from it, one effect per eighth note (20), ending on its pull-back: "Uploaded to HandlePilot · Ready to publish". |
| 12–18 | What it does | Playbooks (free, with the app's icons); a lookup of @mosseri with his real numbers and six most-viewed recent reels (the top one 2.5× his median); "Watch and remix any reel": @askcatgpt's "How to start using AI agents" playing, its real `watch_video` breakdown (hook, the five beats, why it works), then the remix as a scripted card for a career coach; content plan; carousels from five different creators (career coach, strength coach, resume coach, nutrition coach, yoga teacher), each in its own style; the production board. Each names the MCP tool the agent calls. |
| 19–20 | All of it | Pull back into a wall of every screen; Research. Plan. Make. Ship., each with its own pastel highlighter (sky, sun, peach, the brand green). |
| 21–22 | Connect | "One URL. Any agent.": add the connector, Allow, connected. |
| 23–24 | End | The mark lands beside "HandlePilot", "Free to start.", handlepilot.com/mcp. |

## Media

- `assets/img/`: the HandlePilot logo (`logo.png`, the site's `logo-512.png` with its light edge fringe cleaned off) and, all fetched with HandlePilot's own tools on 2026-10-27:
  - lookup: `mo1`–`mo6` (frames of @mosseri's six most-viewed recent reels: `DeuX3Thu4UA`, `Dey7vpthPgn`, `DGVfPMfyLu6`, `De9m9lchZXj`, `DeZY3ipuZcl`, `De9qKAvJFKY`), `mo-avatar` (his face from `DGVfPMfyLu6`);
  - watch: `c0`–`c4` (one frame per beat of @askcatgpt's `DWHXyMhgicK`, from `tools/clips.sh`);
  - carousels: `car-*` (photos generated with Gemini 3 Pro Image for the five example creators; the people are not real), laid out live in `src/scenes/slides.js`.
- `assets/icons/`: lucide icons as the app uses them (`l-*`, ISC) and the agents' marks from `@lobehub/icons-static-svg` (`a-*`, MIT), rasterized per colour at load (`tools/env.mjs`).
- `assets/sfx/`: the sound effects, real recordings (Freesound via Openverse, all CC0), listed in `assets/sfx/CREDITS.md`.
- `assets/clips/` (not committed, ~0.7 GB of raw frames): build with
  `tools/clips.sh <take1080.mp4> <effects-reel.mp4> <askcatgpt-reel.mp4>`.
  - The take is asset `7a5a5f27-1019-4a17-a179-3943dc5c2638` (lotosinbloom Asset Library), scaled to 1080×1920 30 fps.
  - The effects reel is the Remotion project on handlepilot branch `claude/sweet-ride-vz1jex` (`marketing/effects-reel/edit`), re-rendered from that take on 2026-10-27 (Robust Video Matting on CPU, `clean.jpg` as the empty room).
  - The ChatGPT reel is @askcatgpt's `DWHXyMhgicK` as `get_instagram_post` returned it (720×1280).

## Run it

```bash
npm install                                   # @napi-rs/canvas (Skia)
pip install numpy scipy pillow
tools/clips.sh take1080.mp4 effects-reel.mp4 askcatgpt-DWHXyMhgicK.mp4
python3 tools/audio.py --spectro              # → out/soundtrack.wav (+ spectrogram; --levels, --no-fx, --fx-only to balance)
node tools/still.mjs 2.6,9.4                  # test stills
node tools/render.mjs --samples 6 --workers 4 --out out/handlepilot-mcp-promo.mp4
```

`tools/grid.sh out.jpg <cols> <png…>` makes contact sheets from stills. A full render with 6 blur samples takes roughly half an hour on 4 cores.

## Credits

Typefaces under the SIL Open Font License (`fonts/licenses/`): Inter, Anybody, Instrument Serif, JetBrains Mono, Space Grotesk. Icons: Lucide (ISC), LobeHub Icons (MIT). The agents' marks belong to their companies and are shown to say HandlePilot works with them. Sound effects: CC0 recordings from Freesound, credited in `assets/sfx/CREDITS.md`. The reels shown belong to @mosseri (and his collaborators) and @askcatgpt. The hook's profile is a mockup ("yourhandle"), not a real account.
