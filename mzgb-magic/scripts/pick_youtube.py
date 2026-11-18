"""Pick the best YouTube candidate per song -> site/songs.json."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "data" / "songs_yt_candidates.json").read_text(encoding="utf-8"))
overrides = {}
ov_path = ROOT / "data" / "songs_overrides.json"
if ov_path.exists():
    overrides = json.loads(ov_path.read_text(encoding="utf-8"))


def norm(s):
    return re.sub(r"[^a-zа-яё0-9 ]+", " ", (s or "").lower())


def score(song, c):
    t, ch = norm(c.get("title")), norm(c.get("channel"))
    sc = 0
    title_words = [w for w in norm(song["title"]).split() if len(w) > 2]
    if title_words and all(w in t for w in title_words):
        sc += 4
    artist_words = [w for w in norm(re.sub(r"\(.*?\)|«.*?»", "", song["artist"])).split() if len(w) > 2]
    if artist_words and any(w in t or w in ch for w in artist_words):
        sc += 2
    if "vevo" in ch or ch.endswith(" topic") or "official" in t or "official" in ch or "официальн" in t:
        sc += 2
    if re.search(r"karaoke|караоке|cover|кавер|reaction|tutorial|lesson|8d|slowed|sped up|remix|full movie|instrumental", t):
        sc -= 5
    try:
        d = float(c.get("duration") or 0)
        if d and d < 60:
            sc -= 5
        if d > 1200:
            sc -= 4
    except ValueError:
        pass
    return sc


out = []
for s in data:
    cands = s.get("candidates") or []
    best = max(cands, key=lambda c: score(s, c)) if cands else None
    vid = overrides.get(f'{s["artist"]} — {s["title"]}') or (best or {}).get("id")
    out.append({k: s[k] for k in ("group", "title", "artist", "year", "hook")} | {
        "youtube_id": vid,
        "yt_title": (best or {}).get("title"),
        "yt_channel": (best or {}).get("channel"),
    })
(ROOT / "site" / "songs.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
for x in out:
    print(f'{x["artist"][:30]:30} | {x["title"][:28]:28} | {x["youtube_id"]} | {(x["yt_title"] or "")[:60]} | {(x["yt_channel"] or "")[:25]}')
