"""Build the `girls_ssa` topic for the stat-race engine from real SSA data.

usage: python build_girls_topic.py ../data/babynames_F_1880_2025.csv.gz ../cards/story.json

Writes topics/girls_ssa.js, which registers window.RACE_TOPICS.girls_ssa and
window.RACE_SCENES.girls_ssa (the OM_SCENES list that paces the video: one
scene per story card, each at least MIN_SEC long, plus the Outro).
"""
import sys, os, json
import pandas as pd

DATA, STORY = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "topics", "girls_ssa.js")
SEC_PER_YEAR, MIN_SEC, OUTRO_SEC = 1.0, 5.5, 6.0
KEEP_RANK = 14            # names that ever reach this rank get full keyframes

df = pd.read_csv(DATA)
df = df[df.sex == "F"]
df["rank"] = df.groupby("year")["n"].rank(ascending=False, method="first")
Y0, Y1 = int(df.year.min()), int(df.year.max())
story = json.load(open(STORY))
cards_dir = os.path.relpath(os.path.dirname(os.path.abspath(STORY)),
                            os.path.dirname(os.path.abspath(__file__)))

CUSTOM = os.path.join(os.path.dirname(os.path.abspath(STORY)), "custom")
_cj = os.path.join(CUSTOM, "credits.json")
custom_credits = json.load(open(_cj)) if os.path.exists(_cj) else {}

featured = {n for c in story for n in c.get("names", [])}
keep = set(df[df["rank"] <= KEEP_RANK].name) | featured
P = (df[df.name.isin(keep)].pivot(index="year", columns="name", values="prop") * 100)
R = df[df.name.isin(featured)].pivot(index="year", columns="name", values="rank")

raw = {}
for n in sorted(keep):
    s = P[n].dropna()
    raw[n] = " ".join(f"{y}:{v:.4f}" for y, v in s.items())
true_rank = {n: " ".join(f"{y}:{int(v)}" for y, v in R[n].dropna().items()) for n in featured}

KICKER = {"WHY #1": "The Queen", "NEW #1": "New #1", "RISING": "Rising", "TREND": "Trend",
          "END OF AN ERA": "End of an era"}

body = [c for c in story if c.get("kind") != "FINALE"]
finale = next((c for c in story if c.get("kind") == "FINALE"), None)
events, scenes, anchors = [], [], []
for i, c in enumerate(body):
    a = c["year"]
    b = body[i + 1]["year"] if i + 1 < len(body) else Y1
    names = c.get("names") or []
    ev = {
        "from": a, "to": b, "name": names[0] if names else "Mary", "names": names,
        "kicker": KICKER.get(c["kind"], c["kind"].title()),
        "tag": "Fact" if c.get("label") == "DOCUMENTED" else "Theory",
        "title": c["headline"], "body": c["text"],
    }
    if c.get("focus"):
        ev["focus"] = c["focus"]
    # cards/custom/<stem>.* (creator-supplied) overrides the default image
    stem = os.path.splitext(c["image"])[0] if c.get("image") else (names[0].lower() if names else "")
    hit = next((f for f in sorted(os.listdir(CUSTOM)) if stem and os.path.splitext(f)[0] == stem), None) \
        if os.path.isdir(CUSTOM) else None
    if hit:
        ev["image"] = f"{cards_dir}/custom/{hit}"
        ev["caption"] = custom_credits.get(stem + "_caption", c.get("image_caption", ""))
        ev["credit"] = custom_credits.get(stem, "")
    elif c.get("image"):
        ev["image"] = f"{cards_dir}/{c['image']}"
        ev["caption"] = c.get("image_caption", "")
        ev["credit"] = c.get("image_credit", "")
    events.append(ev)
    scene = f"S{i:02d}_{ev['name']}"
    scenes.append({"name": scene, "dur": round(max((b - a) * SEC_PER_YEAR, MIN_SEC), 2),
                   "desc": f"{a}-{b}: {c['headline']}"})
    anchors.append([scene, a])
scenes.append({"name": "Outro", "dur": OUTRO_SEC, "desc": f"Hold on {Y1} and land the takeaway"})
anchors.append(["Outro", Y1])

# one stable color per name, never shared by two names on screen together
PALETTE = ["#FFE14D", "#5CE1E6", "#FF5E5B", "#7BF1A8", "#B79CFF", "#FFFFFF", "#FF9F1C", "#4D7CFE",
           "#C6F432", "#1FB5A3", "#8E5CFF", "#FFC9A0", "#E0245E", "#A8D8FF", "#2B3A8C", "#FF3FA4"]
vis = df[df["rank"] <= 11]
together = {n: set() for n in keep}
for _, g in vis.groupby("year"):
    ns = [n for n in g.name if n in keep]
    for n in ns:
        together[n].update(ns)
for c in body:   # a spotlit name shares the screen with its card's top 11
    b = next((x["year"] for x in body if x["year"] > c["year"]), Y1)
    era = set(vis[(vis.year >= c["year"] - 1) & (vis.year <= b)].name) & keep
    for n in c.get("names", []):
        together[n] |= era
        for m in era:
            together[m].add(n)
first = vis.groupby("name").year.min()
order = sorted(keep, key=lambda n: (first.get(n, 9999), n))
colors, used = {}, {c: 0 for c in PALETTE}
for n in order:
    taken = {colors[m] for m in together[n] if m in colors and m != n}
    free = [c for c in PALETTE if c not in taken]
    if not free:
        print("palette too small for", n, sorted(m for m in together[n] if m in colors))
        free = PALETTE
    colors[n] = min(free, key=lambda c: used[c])
    used[colors[n]] += 1

topic = {
    "label": "Baby girl names (SSA)", "title": "Top Baby Girl Names in the USA", "region": "USA", "headerLead": True,
    "range": [Y0, Y1], "anchors": anchors, "ticks": [1880, 1900, 1925, 1950, 1975, 2000, 2025],
    "note": "% of all girls born that year",
    "totals": " ".join(f"{y}:{n}" for y, n in df.groupby("year").n.sum().items()),
    "totalLabel": "girls on record", "countUnit": "girls", "leadLabel": "Reigning #1",
    "source": f"Data: U.S. Social Security Administration, {Y0}–{Y1}",
    "raw": raw, "trueRank": true_rank, "events": events,
    "spotlight": True,
    "highlight": {"ring": False, "dim": 0.4, "band": False, "badge": False}, "risePop": False,
    "colors": colors,
    "outro": {"kicker": f"{Y1 - Y0} years later", "a": "Mary", "b": "Olivia",
              "line": "1880: 1 in 13 girls got the #1 name. 2025: fewer than 1 in 100. "
                      "Will Charlotte take #1 in 2026?"},
}
js = (
    "// GENERATED by build_girls_topic.py, do not edit by hand.\n"
    "(function () {\n"
    f"const T = {json.dumps(topic)};\n"
    "T.fmt = (v) => v.toFixed(2) + '%';\n"
    "T.skin = Object.assign({}, window.RACE_TOPICS.girls.skin);\n"
    "window.RACE_TOPICS.girls_ssa = T;\n"
    "window.RACE_SCENES = window.RACE_SCENES || {};\n"
    f"window.RACE_SCENES.girls_ssa = {json.dumps(json.dumps(scenes))};\n"
    "})();\n"
)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w").write(js)
print(f"wrote {OUT}: {len(keep)} names, {len(events)} cards, "
      f"{sum(s['dur'] for s in scenes):.0f}s total")
