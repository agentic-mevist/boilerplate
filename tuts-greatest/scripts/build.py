"""Build the trainer site: pick YouTube videos, merge Russian facts, render docs."""
import collections
import json
import pathlib
import re

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


def build_songs():
    rs = load("rs500.json", [])
    cands = {}
    for fname in ("yt_candidates.json", "yt_candidates_rev.json"):
        for x in load(fname, []):
            if x.get("candidates") and not cands.get(x["rank"]):
                cands[x["rank"]] = x["candidates"]
    over = load("yt_overrides.json", {})
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
        out.append({
            "rank": s["rank"], "artist": s["artist"], "song": s["song"], "year": s["year"].rstrip("/"),
            "decade": 1940 if y < 1950 else (y // 10) * 10, "writers": s.get("writers", ""),
            "yt": yid, "dur": dur, "fact": fx.get("fact", ""), "tags": fx.get("tags", []),
        })
    (SITE / "songs.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print("songs:", len(out), "with video:", sum(1 for x in out if x["yt"]), "with facts:", sum(1 for x in out if x["fact"]))
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


def build_docs(songs):
    md = markdown.Markdown(extensions=["tables", "sane_lists"])
    cheat = (CONTENT / "cheat.md").read_text(encoding="utf-8") if (CONTENT / "cheat.md").exists() else "# Шпаргалка\n"
    full = cheat.rstrip() + "\n\n" + auto_cheat(songs) + "\n"
    for name, text in [("cheat", full), ("format", (CONTENT / "format.md").read_text(encoding="utf-8") if (CONTENT / "format.md").exists() else "# Формат\n")]:
        md.reset()
        html = md.convert(text).replace('<a href="http', '<a target="_blank" rel="noopener" href="http')
        (SITE / f"{name}.html").write_text(html, encoding="utf-8")
        print("built", name, len(html))


if __name__ == "__main__":
    s = build_songs()
    build_docs(s)
