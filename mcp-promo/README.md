# HandlePilot MCP — promo video

A 45-second promo for the HandlePilot MCP server (`https://app.handlepilot.com/mcp`), rendered entirely from code on the engine of the 2026 motion reel (https://claude-motion-reel.donatizehelp.workers.dev): Canvas 2D through Skia in Node, every frame a pure function of time, sub-frame motion blur in linear light, and a soundtrack synthesized on the same 128 BPM grid.

1920×1080 · 60 fps · H.264 + AAC. No prices anywhere in the picture.

v2 (2026-10-27) is drawn in the website's style guide (`public/site/landing.css` in the handlepilot repo): `#f7f7f7` paper, `#0a0a0a` ink, `#3478f5` blue, the `#c0efad` green highlighter behind key words, Inter 600 headlines at -0.045em, uppercase eyebrows, white cards with `#e4e4e4` hairlines, the app's own lucide icons. The tokens are `HP` in `src/timeline.js`; the drawing helpers (`head`, `eyebrow`, `body`, `markRect`, `hpCard`, `iconTile`) are at the end of `src/engine/ui.js`.

## The cut

24 bars of 1.875 s. Scene lengths live in `src/timeline.js` (`CHAPTERS`); picture and `tools/audio.py` both read the same grid.

| Bars | Scene | What happens |
|---|---|---|
| 1–2 | Hook | "Give your Instagram" word by word over @lotosinbloom's reels, then "AI superpowers." with the highlighter; the product's pieces float out like the site's hero and get pulled into the mark. |
| 3–5 | The hub | ChatGPT, Claude, Claude Code, Codex, Cursor and GitHub Copilot (their real marks) wire into HandlePilot. "Your AI does the work." "HandlePilot gives it superpowers." Then what that means: eyes on Instagram, a memory for your brand, the playbooks, editors for every post. |
| 6–7 | Ask | A chat with your agent: the raw take is dropped in, "Edit this into a reel", then `get_playbook`, `get_creator_context`, `watch_video`, render. |
| 8–11 | Edit | Bar 8: Victor's raw teleprompter take. On the drop a scan line turns it into the effects reel Claude cut from it, one effect per eighth note (20), ending on its pull-back: "Uploaded to HandlePilot · Ready to publish". |
| 12–18 | What it does | Playbooks (free, with the app's icons); a lookup of @lotosinbloom with her real numbers and reels; two bars of Daria's montage playing from her run, with its breakdown (hook on screen, 13 shots, why it works); content plan; editable carousels; the production board. Each names the MCP tool the agent calls. |
| 19–20 | All of it | Pull back into a wall of every screen; Research. Plan. Make. Ship. |
| 21–22 | Connect | "One URL. Any agent.": add the connector, Allow, connected. |
| 23–24 | End | The mark lands beside "HandlePilot", "Free to start.", handlepilot.com/mcp. |

## Media

- `assets/img/`: the HandlePilot logo (`logo.png`, the site's `logo-512.png` with its light edge fringe cleaned off), carousel slides from the site's gallery, `d1`–`d6` (covers of @lotosinbloom's top reels, from `get_instagram_account` / `get_instagram_post` on 2026-10-27), `m00`–`m12` (the montage's 13 shots).
- `assets/icons/`: lucide icons as the app uses them (`l-*`, ISC) and the agents' marks from `@lobehub/icons-static-svg` (`a-*`, MIT), rasterized per colour at load (`tools/env.mjs`).
- `assets/clips/` (not committed, ~0.7 GB of raw frames): build with
  `tools/clips.sh <take1080.mp4> <effects-reel.mp4> <library-montage.mp4>`.
  - The take is asset `7a5a5f27-1019-4a17-a179-3943dc5c2638` (lotosinbloom Asset Library), scaled to 1080×1920 30 fps.
  - The effects reel is the Remotion project on handlepilot branch `claude/sweet-ride-vz1jex` (`marketing/effects-reel/edit`), re-rendered from that take on 2026-10-27 (Robust Video Matting on CPU, `clean.jpg` as the empty room).
  - The montage is the landing page's `public/site/assets/library-montage.mp4`.

## Run it

```bash
npm install                                   # @napi-rs/canvas (Skia)
pip install numpy scipy pillow
tools/clips.sh take1080.mp4 effects-reel.mp4 library-montage.mp4
python3 tools/audio.py --spectro              # → out/soundtrack.wav (+ spectrogram)
node tools/still.mjs 2.6,9.4                  # test stills
node tools/render.mjs --samples 6 --workers 4 --out out/handlepilot-mcp-promo.mp4
```

`tools/grid.sh out.jpg <cols> <png…>` makes contact sheets from stills. A full render with 6 blur samples takes roughly half an hour on 4 cores.

## Credits

Typefaces under the SIL Open Font License (`fonts/licenses/`): Inter, Anybody, Instrument Serif, JetBrains Mono, Space Grotesk. Icons: Lucide (ISC), LobeHub Icons (MIT). The agents' marks belong to their companies and are shown to say HandlePilot works with them.
