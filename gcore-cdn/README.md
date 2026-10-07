# Gcore CDN explainer reel

A ~2:28 vertical (1080×1920, 30 fps) motion-graphics explainer about how a CDN works, made for Gcore.
v2 is narrated in a voice cloned (with permission) from Gcore CEO Andre Reitenbach and styled after the
[gcore.com WAF page](https://gcore.com/security/waf): warm-white background, Montserrat, ink line art with brand orange,
dotted maps and globes, gradient tab labels and stat blocks. The structure follows
[@aldoniq's "How does GPS find you?" reel](https://www.instagram.com/reel/Dd9gN15BfCH/): chapter progress bar,
heavy karaoke captions with highlight boxes, a diagram per beat.

Final video: [`gcore_cdn_reel.mp4`](gcore_cdn_reel.mp4)

## Story (13 sections, 11 chapters on the progress bar)

| # | chapter | beat | visual |
|---|---------|------|--------|
| – | hook | "When you open a website, you're almost never talking to the website itself. So who is answering?" | you → "the website" crossed out, a mystery node next to you, dotted globe of PoPs |
| 1 | distance | an online store in San Jose, California; you in Frankfurt; 9 150 km | dotted North-Atlantic map, arc and counter |
| 2 | light | fiber ≈ 200 000 km/s, cables aren't straight, a round trip ≈ 150 ms | light bouncing inside a fiber, transatlantic cable route |
| 3 | handshake | DNS, TCP, TLS, GET: 3–4 round trips, over half a second of blank screen | sequence diagram + timer + blank browser |
| 4 | patience | 53% of mobile visitors leave after 3 s; Amazon: +100 ms = −1% sales | crowd grid, 0–3 s ruler, quote card |
| 5 | edge | move the site closer: CDN; Gcore 210+ PoPs on six continents | copy flies to Frankfurt, PoPs pop on the globe, zoom to Frankfurt |
| 6 | routing | one address everywhere; routing sends you to the nearest door (anycast) | dotted world map, same IP on every PoP, users → nearest |
| 7 | cache | first visitor = MISS, then HIT; Gcore's 85% average cache hit ratio | edge/origin diagram, edge log, donut chart |
| 8 | weight | WebP/AVIF, up to 85% lighter | photo shrinking, size bar, −85% tab |
| 9 | rush | patch day: one server melts, a CDN splits the crowd; the G in Gcore originally stood for gaming | launcher card, players map, melting server, "G = Gaming" card with gcore.com's gaming icon |
| 10 | shield | the 2025 6 Tbps / 5.3 Bpps DDoS spread over 200+ Tbps of capacity | attack streams from Brazil & the US, PoPs absorbing, capacity bar |
| 11 | result | ≈150 ms vs ≈30 ms per round trip | comparison card, bars, two browsers |
| – | outro | follow Gcore | avatar, @GCORE.OFFICIAL, globe |

### Fact sources
- Gcore CDN page (gcore.com/cdn): 210+ PoPs across six continents, 200+ Tbps capacity, 30 ms average latency worldwide,
  85% average cache hit ratio, up to 85% file size savings with WebP/AVIF, anycast and GeoDNS routing.
- Gcore network page (gcore.com/network): PoPs in Frankfurt, San Jose and Santa Clara, among others.
- Gcore press release, Oct 2025: 6 Tbps / 5.3 Bpps attack on a gaming hosting provider, 51% of sources in Brazil
  and 23.7% in the US, absorbed using 210+ PoPs and 200+ Tbps filtering capacity.
- Andre Reitenbach (NHN Cloud partnership video, 2023): "initially, the letter G in Gcore stood for gaming".
  Gcore was founded in 2014 in Luxembourg.
- Google/DoubleClick "The Need for Mobile Speed" (2016): 53% of mobile visits are abandoned after 3 s.
- Greg Linden (Amazon, 2006): every 100 ms of delay costs 1% of sales.
- Light in optical fiber ≈ 200 000 km/s; Frankfurt–San Jose great circle ≈ 9 150 km; a real transatlantic route is
  ≈ 10 300 km and a typical Frankfurt–Bay Area round trip is ≈ 150 ms.
- `203.0.113.7` is a documentation-range IP (RFC 5737), used as an illustrative anycast address.
  The PoP dots are representative city locations, not Gcore's exact PoP list.

## Pipeline

1. **Analysis.** The reference reel was downloaded with ScrapeCreators and analysed with Gemini (`reference/`).
   The gcore.com WAF page design system (fonts, palette, icons, screenshots) is in `reference/waf/STYLE.md`.
2. **Script.** `script/script.txt` uses `## id | chapter`, `[cue]` markers (the timing of the next word drives the
   visuals) and `*word*` for caption highlight boxes. `python3 script/parse_script.py` writes `script.json`.
3. **Voice-over.** `tools/make_vo.py <engine>` renders one take per chapter into `audio/vo/<engine>/`:
   - `qwen3` (used): Qwen3-TTS 1.7B via FAL with a speaker embedding cloned from 53 s of Andre's own speech
     (`audio/ref/andre_ref.mp3`, cut from the NHN Cloud video). "Gcore" is spelled "G-Coar" for the clone, which a
     side-by-side test against Andre's real pronunciation picked. Word timings come from ElevenLabs forced alignment.
   - `minimax`, `chatterbox`, `indextts2`: other cloning engines; `tools/clone_test.py` auditions them and has Gemini
     rate similarity to the real voice (Qwen3 won: 9.5/10 similarity, 9/10 naturalness).
   - `chris`: ElevenLabs v3 "Chris" (the v1 narrator).
   `tools/check_vo.py <engine>` transcribes every take back and diffs it against the script.
   `tools/build_timeline.py [engine]` trims and joins the takes into `audio/vo.wav` and writes `build/timeline.json`.
4. **Animation.** Node + `@napi-rs/canvas` + `d3-geo` (`engine/`). Every frame is a pure function of time.
   `core.mjs` holds the light/dark palettes (`THEME=light|dark`), easing, line art, icons and the Gcore logo.
   Text and labels are queued on a text layer and painted after all line art, with a background-coloured halo,
   so they are never covered by lines. `geo.mjs` draws dot-matrix globes and maps from a rasterised land mask.
   `chrome.mjs` draws the background, header, progress bar, eyebrow headings, stat blocks and captions.
   `scenes.mjs` has one scene per chapter (with sound cues). `render.mjs` streams raw frames into ffmpeg.
5. **Audio.** Music bed: Lyria 3 Pro (`audio/music/pro_0.mp3`), time-stretched and ducked under the voice.
   Sound effects: a soft pack generated with ElevenLabs Sound Effects v2 (`tools/make_sfx.py`, candidates rated by
   Gemini), low-passed and placed sparingly (about 65 cues). The mix is loudness-normalised to −14 LUFS.

```bash
npm install
python3 script/parse_script.py
python3 tools/make_vo.py qwen3       # needs FAL_API_KEY and audio/ref/andre_ref.mp3 (skips existing takes)
python3 tools/check_vo.py qwen3
python3 tools/build_timeline.py
node engine/render.mjs --sfx
node engine/render.mjs --stills 12.5,40              # preview frames → build/stills/ (THEME=dark for dark mode)
node engine/render.mjs --out build/video_only.mp4    # or render slices with --from/--to in parallel
python3 tools/mix.py
ffmpeg -i build/video_only.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest gcore_cdn_reel.mp4
```

Fonts (both SIL OFL, as served by gcore.com): Montserrat, Fira Code.
