"""Build the trainer site: pick YouTube videos, merge Russian facts, render docs."""
import collections
import difflib
import json
import pathlib
import re
import unicodedata

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA, SITE, CONTENT = ROOT / "data", ROOT / "site", ROOT / "content"


def load(name, default):
    p = DATA / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower().replace("’", "'").replace("'", ""))


def score(song, c):
    t, ch = norm(c.get("title")), norm(c.get("channel"))
    sc = 0
    words = [w for w in norm(song["song"]).split() if len(w) > 2]
    if words and sum(w in t for w in words) >= max(1, len(words) - 1):
        sc += 4
    art = [w for w in norm(re.split(r" feat\.| and | & |,", song["artist"])[0]).split() if len(w) > 2]
    if art and any(w in t or w in ch for w in art):
        sc += 3
    if ch.endswith(" topic") or "vevo" in ch or "official" in t or "official" in ch:
        sc += 2
    if re.search(r"\blive\b|cover|karaoke|remix|reaction|lesson|tutorial|8d|slowed|sped up|full album|instrumental|lyrics? video|\bversion\b", t):
        sc -= 4
    try:
        d = float(c.get("duration") or 0)
        if d and (d < 70 or d > 900):
            sc -= 6
    except ValueError:
        pass
    return sc


def squash(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def squash_accents(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()


def apple_ok(song, am):
    """Reject Apple matches that point to another performer (karaoke, original instead of cover)."""
    if not am:
        return False
    a, b = squash(re.split(r" feat\.|,", song["artist"])[0]), squash(am.get("apple_artist"))
    words = lambda x: {w for w in re.sub(r"[^a-z0-9 ]", " ", unicodedata.normalize("NFKD", x or "").lower()).split() if len(w) > 3}
    same = a in b or b in a or difflib.SequenceMatcher(None, a, b).ratio() > 0.75 or words(song["artist"]) & words(am.get("apple_artist"))
    if "karaoke" in b or not a or not b or not same:
        return False
    t, u = squash(song["song"]), squash(am.get("apple_track"))
    return bool(t and u and (t in u or u in t or difflib.SequenceMatcher(None, t, u).ratio() > 0.75))


def vscore(t):
    t = (t or "").lower()
    v = 0
    if re.search(r"official (music |hd |4k )?video|music video|\(video\)|\[video\]|videoclip|official clip|remastered video|\bmv\b", t):
        v += 5
    if re.search(r"lyric|audio|visuali[sz]er|cover|karaoke|remix|reaction|full album|tutorial|lesson", t):
        v -= 6
    return v


def is_live(t):
    t = (t or "").lower()
    return bool(re.search(r"\blive\b|performance|perform|\btv\b|show|concert|ed sullivan|top of the pops|\b19[5-8]\d\b", t)) and not re.search(r"lyric|audio|cover|karaoke|remix|reaction", t)


def rank_videos(song, cs):
    """Clip candidates, best first: official videos, then live performances."""
    def ok_dur(c):
        try:
            d = float(c.get("duration") or 0)
        except ValueError:
            d = 0
        return 60 <= d <= 900
    words = [w for w in norm(song["song"]).split() if len(w) > 2]
    art = {w for part in re.split(r" feat\. | and | & |, ", song["artist"]) for w in norm(squash_accents(part)).split() if len(w) > 2 and w != "the"}

    def by_artist(c):
        # the clip must name the performer, otherwise it is usually somebody's cover
        t = norm(squash_accents(c.get("title"))) + " " + norm(squash_accents(c.get("channel")))
        return not art or any(w in t.split() or w in t for w in art)
    rel = [c for c in cs if ok_dur(c) and by_artist(c) and (not words or sum(w in norm(c.get("title")) for w in words) >= max(1, len(words) - 1))]
    off = sorted([c for c in rel if vscore(c.get("title")) > 0], key=lambda c: -score(song, c))
    live = [c for c in rel if is_live(c.get("title")) and c not in off]
    seen, out = set(), []
    for c in off + live:
        if c["id"] not in seen:
            seen.add(c["id"])
            out.append(c)
    return out


def pick_video(song, cs):
    r = rank_videos(song, cs)
    return r[0] if r else None


def build_songs():
    rs = load("rs500.json", [])
    cands = {}
    for fname in ("yt_candidates.json", "yt_candidates_rev.json"):
        for x in load(fname, []):
            if x.get("candidates") and not cands.get(x["rank"]):
                cands[x["rank"]] = x["candidates"]
    over = load("yt_overrides.json", {})
    vcands = load("video_candidates.json", {})
    vover = load("video_overrides.json", {})
    vover.update(load("video_manual.json", {}))  # hand-checked fixes win over automatic ones
    apple = load("apple_meta.json", {})
    rsimg = load("rs_images.json", {})
    facts = {}
    for f in ("facts_1.json", "facts_2.json"):
        facts.update(load(f, {}))
    out = []
    for s in rs:
        cs = cands.get(s["rank"], [])
        best = max(cs, key=lambda c: score(s, c)) if cs else None
        yid = over.get(str(s["rank"])) or (best or {}).get("id")
        try:
            dur = int(float((best or {}).get("duration") or 0))
        except ValueError:
            dur = 0
        y = int(re.match(r"\d{4}", s["year"]).group()) if re.match(r"\d{4}", s["year"]) else 0
        fx = facts.get(str(s["rank"]), {})
        v = pick_video(s, cs + (vcands.get(str(s["rank"])) or []))
        vid = vover.get(str(s["rank"]), (v or {}).get("id"))
        try:
            vdur = int(float((v or {}).get("duration") or 0))
        except ValueError:
            vdur = 0
        am = apple.get(str(s["rank"]), {})
        if not apple_ok(s, am):
            am = {}
        out.append({
            "rank": s["rank"], "artist": s["artist"], "song": s["song"], "year": s["year"].rstrip("/"),
            "decade": 1940 if y < 1950 else (y // 10) * 10, "writers": s.get("writers", ""),
            "yt": yid, "dur": dur, "vid": vid if vid else None, "vdur": vdur,
            "album": am.get("album", ""), "cover": am.get("cover", ""),
            "img": rsimg.get(str(s["rank"]), ""),
            "fact": fx.get("fact", ""), "tags": fx.get("tags", []),
        })
    (SITE / "songs.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print("songs:", len(out), "with audio video:", sum(1 for x in out if x["yt"]), "with clip:", sum(1 for x in out if x["vid"]),
          "with cover:", sum(1 for x in out if x["cover"]), "with facts:", sum(1 for x in out if x["fact"]))
    return out


def auto_cheat(songs):
    L = []
    by_dec = collections.Counter(x["decade"] for x in songs)
    L.append("## Рейтинг в цифрах (сгенерировано по данным)\n")
    L.append("| Эпоха | Песен | Доля |\n|---|---|---|")
    for d in sorted(by_dec):
        name = "до 1950" if d < 1950 else f"{d}-е"
        L.append(f"| {name} | {by_dec[d]} | {round(100 * by_dec[d] / len(songs))}% |")
    main_artist = lambda a: re.split(r" feat\.| and the | & the |,", a)[0].strip()
    arts = collections.Counter(main_artist(x["artist"]) for x in songs)
    L.append("\n### Больше всех песен в рейтинге\n")
    for a, n in arts.most_common(25):
        if n < 3:
            break
        titles = ", ".join(f"«{x['song']}» (#{x['rank']})" for x in songs if main_artist(x["artist"]) == a)
        L.append(f"- **{a}** — {n}: {titles}")
    for tag, title in [("cover", "Каверы: песня в рейтинге — не оригинал (важно для механики «узнай оригинал по каверу»)"),
                       ("covered", "У песни есть знаменитый кавер"),
                       ("film", "Песни, связанные с кино, сериалами и рекламой"),
                       ("riff", "Знаменитые риффы, интро и басовые линии — узнаются за 2–3 секунды"),
                       ("sample", "Сэмплы: на чём построены и кого сэмплировали")]:
        xs = [x for x in songs if tag in x["tags"]]
        if not xs:
            continue
        L.append(f"\n## {title} ({len(xs)})\n")
        for x in xs:
            L.append(f"- **#{x['rank']} {x['song']}** — {x['artist']} ({x['year']}). {x['fact']}")
    L.append("\n## Весь топ-100 одной таблицей\n")
    L.append("| # | Песня | Исполнитель | Год |\n|---|---|---|---|")
    for x in songs[:100]:
        L.append(f"| {x['rank']} | {x['song']} | {x['artist']} | {x['year']} |")
    return "\n".join(L)


def youtube_playlists(songs):
    L = ["\n## YouTube: весь рейтинг плейлистами по 50 песен\n",
         "Ссылки открывают временный плейлист YouTube из видео этого тренажёра (по порядку мест). Удобно слушать подряд в машине или в наушниках.\n"]
    for i in range(0, 500, 50):
        ids = [x["yt"] for x in songs[i:i + 50] if x["yt"]]
        L.append(f"- [Места {i + 1}–{i + 50}](https://www.youtube.com/watch_videos?video_ids={','.join(ids)}) — {len(ids)} видео")
    return "\n".join(L)


def build_docs(songs):
    md = markdown.Markdown(extensions=["tables", "sane_lists"])
    cheat = (CONTENT / "cheat.md").read_text(encoding="utf-8") if (CONTENT / "cheat.md").exists() else "# Шпаргалка\n"
    full = cheat.rstrip() + "\n\n" + auto_cheat(songs) + "\n"
    pl = (CONTENT / "playlists.md").read_text(encoding="utf-8") if (CONTENT / "playlists.md").exists() else "# Плейлисты\n"
    docs = [("cheat", full), ("format", (CONTENT / "format.md").read_text(encoding="utf-8")), ("playlists", pl.rstrip() + "\n" + youtube_playlists(songs) + "\n")]
    for name, text in docs:
        md.reset()
        html = md.convert(text).replace('<a href="http', '<a target="_blank" rel="noopener" href="http')
        (SITE / f"{name}.html").write_text(html, encoding="utf-8")
        print("built", name, len(html))


if __name__ == "__main__":
    s = build_songs()
    build_docs(s)
