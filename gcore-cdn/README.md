# Gcore CDN explainer reel

A 2:47 vertical (1080×1920, 30 fps) motion-graphics explainer, **"Why the web feels instant"**, made for Gcore about how a CDN works.
It recreates the visual style of [@aldoniq's "How does GPS find you?" reel](https://www.instagram.com/reel/Dd9gN15BfCH/):
navy blueprint grid, channel header with a segmented chapter progress bar, wide heavy karaoke captions with
highlight boxes, hand-drawn line art, monospace data cards, and handwritten annotations.

Final video: [`gcore_cdn_reel.mp4`](gcore_cdn_reel.mp4)

## Story (13 sections, 11 chapters on the progress bar)

| # | chapter | beat | visual |
|---|---------|------|--------|
| – | hook | "How does a website from the other side of the planet open in the blink of an eye?" | title + globe with PoPs and data arcs |
| 1 | distance | you're usually not talking to the website at all; Frankfurt ↔ Sydney, 16 500 km | globe → world map, distance counter |
| 2 | light | fiber ≈ 200 000 km/s, cables aren't straight, a round trip ≈ 0.25 s | light bouncing inside a fiber, real cable route |
| 3 | handshake | DNS, TCP, TLS, GET: 3–4 round trips, almost a second of blank screen | sequence diagram + timer + blank browser |
| 4 | patience | 53% of mobile visitors leave after 3 s; Amazon: +100 ms = −1% sales | crowd grid, 0–3 s ruler, quote card |
| 5 | edge | move the site closer: CDN; Gcore 210+ PoPs on six continents | copy flies to Sydney, PoPs pop on the globe, zoom to Sydney |
| 6 | routing | one address everywhere; routing sends you to the nearest door (anycast) | world map, same IP on every PoP, users → nearest |
| 7 | cache | first visitor = MISS, then HIT; Gcore's 85% average cache hit ratio | edge/origin diagram, edge log, donut chart |
| 8 | weight | WebP/AVIF, up to 85% lighter | photo shrinking, size bar, −85% stamp |
| 9 | rush | patch day: one server melts, a CDN splits the crowd; Gcore was born in gaming | launcher card, players map, melting server, Gcore card |
| 10 | shield | the 2025 6 Tbps / 5.3 Bpps DDoS spread over 200+ Tbps of capacity | attack streams from Brazil & the US, PoPs absorbing, capacity bar |
| 11 | result | ≈250 ms vs ≈30 ms per round trip | comparison card, bars, two browsers |
| – | outro | follow Gcore | big avatar, @GCORE.OFFICIAL, globe |

### Fact sources
- Gcore CDN page (gcore.com/cdn): 210+ PoPs across six continents, 200+ Tbps capacity, 30 ms average latency worldwide,
  85% average cache hit ratio, up to 85% file size savings with WebP/AVIF, anycast and GeoDNS routing.
- Gcore press release, Oct 2025: 6 Tbps / 5.3 Bpps attack on a gaming hosting provider, 30–45 s, 51% of sources in Brazil
  and 23.7% in the US, absorbed using 210+ PoPs and 200+ Tbps filtering capacity.
- Gcore history (Wikipedia): founded 2014 in Luxembourg; its CDN was originally built for the gaming industry.
- Google/DoubleClick "The Need for Mobile Speed" (2016): 53% of mobile visits are abandoned after 3 s.
- Greg Linden (Amazon, 2006): every 100 ms of delay costs 1% of sales.
- Light in optical fiber ≈ 200 000 km/s (refractive index ≈ 1.47); Frankfurt–Sydney great-circle ≈ 16 500 km.
- `203.0.113.7` is a documentation-range IP (RFC 5737), used as an illustrative anycast address.
  The PoP dots are representative city locations, not Gcore's exact PoP list.

## Pipeline

1. **Analysis.** The reel was downloaded with the ScrapeCreators API and analysed with Gemini 3.1 Pro and 3.8 Flash
   (`reference/` holds the style bibles and the timestamped transcript).
2. **Script.** `script/script.txt` uses `## id | chapter`, `[cue]` markers (the timing of the next word drives the
   visuals) and `*word*` for caption highlight boxes. `python3 script/parse_script.py` writes `script.json`.
3. **Voice-over.** ElevenLabs v3, voice "Chris", via FAL (`tools/make_vo.py`), one take per chapter, with character
   timestamps. It won a blind Gemini comparison against Gemini TTS voices. `tools/build_timeline.py` trims and joins
   the takes into `audio/vo.wav` and writes `build/timeline.json` with word and cue times.
4. **Animation.** Node + `@napi-rs/canvas` + `d3-geo` (`engine/`). Every frame is a pure function of time.
   `core.mjs` holds the palette, easing, sketchy hand-drawn primitives, icons and the Gcore logo paths.
   `geo.mjs` handles the globe, maps and PoPs. `chrome.mjs` draws the background, header, progress bar and captions.
   `scenes.mjs` has one scene per chapter (with SFX cues). `render.mjs` streams raw frames into ffmpeg.
5. **Audio.** The music bed is Lyria 3 Pro (`audio/music/pro_0.mp3`, picked over the Lyria 3.5 take by Gemini).
   It is time-stretched to fit and ducked under the voice. UI sound effects are synthesized in `tools/mix.py` at the
   scene cue times. The final mix is loudness-normalised to −14 LUFS.

```bash
npm install
python3 script/parse_script.py
python3 tools/make_vo.py            # needs FAL_API_KEY (skips chapters that already have a take)
python3 tools/build_timeline.py
node engine/render.mjs --sfx
node engine/render.mjs --stills 12.5,40   # preview frames → build/stills/
node engine/render.mjs --out build/video_only.mp4   # or render slices with --from/--to in parallel
python3 tools/mix.py
ffmpeg -i build/video_only.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest gcore_cdn_reel.mp4
```

Fonts (all OFL): Unbounded (captions and headings), JetBrains Mono (data), Caveat (handwriting), Inter (cards).
