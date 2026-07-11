---
name: ig-scrape
description: Scrape Instagram profiles, posts, and search results via Apify. Use when asked to collect Instagram data for @lotosinbloom or competitor accounts (profiles, posts, reels, discovery by keyword).
---

# Instagram scraping via Apify

Requires `APIFY_API_KEY` env var (already provisioned in this environment).
Helper: `scripts/apify_client.py` (start/status/items/run commands).

## Recipes

### Profile(s) — bio, followers, 12 latest posts, related profiles
```bash
echo '{"usernames": ["lotosinbloom", "other_account"]}' > /tmp/in.json
python3 scripts/apify_client.py start apify/instagram-profile-scraper /tmp/in.json
# poll: python3 scripts/apify_client.py status <runId>
# fetch: python3 scripts/apify_client.py items <datasetId> > out.json
```

### Posts (full history slice, with videoUrl for download)
```bash
cat > /tmp/in.json <<'EOF'
{"directUrls": ["https://www.instagram.com/USERNAME/"],
 "resultsType": "posts", "resultsLimit": 100, "addParentData": false}
EOF
python3 scripts/apify_client.py start apify/instagram-scraper /tmp/in.json
```
Multiple accounts per run: put several URLs in `directUrls` (resultsLimit applies per URL).
Batch ~9 accounts x 40 posts ≈ 3-5 min.

### Account discovery by keyword
```bash
echo '{"search": "психолог для женщин", "searchType": "user", "searchLimit": 25}' > /tmp/in.json
python3 scripts/apify_client.py start apify/instagram-search-scraper /tmp/in.json
```
Search returns mostly small accounts — combine with `relatedProfiles` field from
profile scrapes and web research for the big players.

## Data format notes
- Post fields: `type` (Video/Sidecar/Image), `caption`, `likesCount`, `commentsCount`,
  `videoViewCount` (videos only), `timestamp`, `shortCode`, `videoUrl`, `ownerUsername`.
- `likesCount` can be -1 (hidden). `videoUrl` links EXPIRE within hours — download
  immediately if video analysis is planned.
- Split multi-account results by `ownerUsername`; ignore accounts with <5 posts in
  the result (tagged-post noise).

## Analysis
`python3 scripts/analyze_account.py <posts.json> <followers> [out.json]` — computes
cadence, format mix, ER, view medians, top posts. See data/analysis/ for existing outputs.
