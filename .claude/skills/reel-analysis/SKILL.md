---
name: reel-analysis
description: Analyze Instagram reels/videos with Gemini multimodal API — hooks, structure, retention devices, CTA. Use when asked to analyze video content quality or decode why a reel went viral.
---

# Reel analysis via Gemini

Requires `GEMINI_API_KEY` env var (provisioned). Models available: gemini-2.5-flash
(fast, default), gemini-2.5-pro (deep analysis). Auth via `?key=` param (NOT Bearer).

## Single reel
```bash
# 1. Get videoUrl from Apify post data (expires fast — download immediately)
python3 scripts/gemini_video.py download "<videoUrl>" video.mp4
# 2. Analyze (uploads via Files API, waits for ACTIVE, generates)
python3 scripts/gemini_video.py analyze video.mp4 scripts/reel_analysis_prompt.txt --json > analysis.json
```

## Batch (top reel per competitor)
```bash
python3 scripts/batch_reel_analysis.py   # edit ACCOUNTS list inside
```
Outputs: `data/videos/<user>_<code>.mp4` + `data/analysis/reels/<user>_<code>.json`

## Prompt
`scripts/reel_analysis_prompt.txt` returns structured JSON: hook (type/text/strength),
beat-by-beat structure, retention devices, visuals, CTA, seller signals, replicable
formula. Adjust fields there if a different analysis angle is needed.

## Text-only analysis (captions, strategy)
```bash
python3 scripts/gemini_text.py <prompt_file> [--model gemini-2.5-pro] [--json]
```

## Gotchas
- IG CDN URLs 403 without browser User-Agent (handled in gemini_video.py download).
- A <300KB mp4 is usually a failed/truncated download — re-scrape the post for a
  fresh URL rather than retrying the stale one.
- Files API uploads take 10-60s to become ACTIVE; the script polls automatically.
- 429/5xx: scripts retry with backoff automatically.
