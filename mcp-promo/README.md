# HandlePilot MCP — promo video

A 43-second promo for the HandlePilot MCP server (`https://app.handlepilot.com/mcp`), rendered entirely from code on the engine of the 2026 motion reel (https://claude-motion-reel.donatizehelp.workers.dev): Canvas 2D through Skia in Node, every frame a pure function of time, sub-frame motion blur in linear light, and a soundtrack synthesized on the same 128 BPM grid.

1920×1080 · 60 fps · H.264 + AAC. No prices anywhere in the picture.

## The cut

23 bars of 1.875 s. Scene lengths live in `src/timeline.js` (`CHAPTERS`); picture and `tools/audio.py` both read the same grid.

| Bars | Scene | What happens |
|---|---|---|
| 1–3 | Hook | The reel's bouncing dot, "EVERY POST, *on* PURPOSE.", the morphing grid, all in HandlePilot's colours. |
| 4–5 | The hub | The core becomes the HandlePilot mark; ChatGPT, Claude, Claude Code, Codex, Cursor and VS Code wire into it. "Your agent *is the brain.* HandlePilot *is the hub.*" |
| 6–7 | Ask | A chat with your agent: the raw take is dropped in, "Edit this into a reel", then `get_playbook`, `get_creator_context`, `watch_video`, render. |
| 8–11 | Edit | Bar 8: Victor's raw teleprompter take. On the drop a scan line turns it into the effects reel Claude cut from it, one effect per eighth note (20), ending on its pull-back into the board: "Uploaded to HandlePilot · Ready to publish". |
| 12–17 | What it does | One bar each: playbooks (free), Instagram lookups, reel breakdowns, content plans, editable carousels, the production board. Each names the MCP tool the agent calls. |
| 18–19 | All of it | Pull back into a wall of every screen; RESEARCH. PLAN. MAKE. SHIP. |
| 20–21 | Connect | "One URL. Any agent.": add the connector, Allow, connected. |
| 22–23 | End | "handlepilot." with the dot landing, *Free to start.*, handlepilot.com/mcp. |

## Media

- `assets/img/`: the HandlePilot logo, carousel slides and photos from the site's gallery, reel stills from the landing page.
- `assets/clips/` (not committed, ~0.6 GB of raw frames): build with
  `tools/clips.sh <take1080.mp4> <effects-reel.mp4>`.
  - The take is asset `7a5a5f27-1019-4a17-a179-3943dc5c2638` (lotosinbloom Asset Library), scaled to 1080×1920 30 fps.
  - The effects reel is the Remotion project on handlepilot branch `claude/sweet-ride-vz1jex` (`marketing/effects-reel/edit`), re-rendered from that take on 2026-10-27 (Robust Video Matting on CPU, `clean.jpg` as the empty room).

## Run it

```bash
npm install                                   # @napi-rs/canvas (Skia)
pip install numpy scipy pillow
tools/clips.sh take1080.mp4 effects-reel.mp4  # the two phone clips
python3 tools/audio.py --spectro              # → out/soundtrack.wav (+ spectrogram)
node tools/still.mjs 15.3,22.4                # test stills
node tools/render.mjs --samples 6 --workers 4 --out out/handlepilot-mcp-promo.mp4
```

`tools/grid.sh out.jpg <cols> <png…>` makes contact sheets from stills. A full render with 6 blur samples takes roughly half an hour on 4 cores.

## Credits

Typefaces under the SIL Open Font License (`fonts/licenses/`): Anybody, Instrument Serif, JetBrains Mono, Space Grotesk.
