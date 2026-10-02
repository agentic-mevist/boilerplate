"""Vertical (9:16) bar chart race of US baby girl names with an always-on story card.

usage: python make_vertical.py babynames.csv out.mp4 cards/story.json

story.json: list ordered by year of
  {year, names: [...], kind, label, headline, text, image, image_credit}
A card stays on screen until the next one starts, so there is always a fact
visible. The timeline slows down where cards are dense so each card gets at
least MIN_SEC seconds. Bars of the names a card talks about are outlined and
the rest of the chart is dimmed.
"""
import os, sys, json, subprocess, textwrap
from multiprocessing import Pool
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from PIL import Image, ImageFont

DATA, OUT, STORY = sys.argv[1], sys.argv[2], sys.argv[3]
SEX, TOPN, POOL = "F", 12, 80        # POOL: ranks tracked (for the spotlight row)
SPOT = TOPN + 1.55                   # y of the spotlight row under the chart
FPS, SEC_PER_YEAR, MIN_SEC, END_SEC, FADE = 30, 1.0, 5.5, 6.0, 0.35
W, H, DPI = 1080, 1920, 100
FRAMES = "frames_v"
HIGHLIGHT = os.environ.get("HIGHLIGHT", "bold")   # "bold" | "dim" | "tag"

PALETTE = ["#5ab4ac", "#3d7fb8", "#f2c14e", "#e07a5f", "#9b5094", "#81b29a",
           "#f4a259", "#5b8e7d", "#bc4b51", "#6d597a", "#4ea8de", "#e5989b"]
INK, MUTED, FAINT = "#222222", "#666666", "#9a9a9a"
LABEL_COL = {"DOCUMENTED": "#2e7d4f", "THEORY": "#b26a00"}

def px(x, y, w, h):
    """Figure-fraction rect from pixel box measured from the top-left corner."""
    return [x / W, 1 - (y + h) / H, w / W, h / H]

# ---------------- data ----------------
df = pd.read_csv(DATA)
df = df[df.sex == SEX]
df["year"] = df.year.astype(int)
years = sorted(df.year.unique())
Y0, Y1 = years[0], years[-1]
df["rank"] = df.groupby("year")["prop"].rank(ascending=False, method="first")
keep = df[df["rank"] <= POOL].name.unique()
wide = (df[df.name.isin(keep)].pivot(index="year", columns="name", values="prop")
        .reindex(years).fillna(0) * 100)
ranks = wide.rank(axis=1, ascending=False, method="first").clip(upper=POOL + 1)
V, R, names = wide.values, ranks.values, list(wide.columns)
order = sorted(names, key=lambda n: (ranks[n].idxmin(), ranks[n].min()))
cols = [PALETTE[order.index(n) % len(PALETTE)] for n in names]
col_of = dict(zip(names, cols))

# ---------------- story + timeline ----------------
story = sorted(json.load(open(STORY)), key=lambda c: c["year"])
for c in story:
    c["img"] = None
    if c.get("image"):
        p = os.path.join(os.path.dirname(STORY), c["image"])
        if os.path.exists(p):
            c["img"] = np.asarray(Image.open(p).convert("RGB"))
        else:
            print("missing image", p)
    for n in c.get("names", []):
        if n not in ranks or ranks.loc[c["year"], n] > TOPN:
            print(f"WARNING: {n} not in top {TOPN} in {c['year']}")

# segment boundaries in data-time (years since Y0); every card gets >= MIN_SEC
T, starts = [], []
bounds = [c["year"] - Y0 for c in story] + [Y1 - Y0]
if bounds[0] > 0:
    bounds = [0] + bounds
    story = [None] + story
for a, b in zip(bounds[:-1], bounds[1:]):
    starts.append(len(T))
    n = int(round(max((b - a) * SEC_PER_YEAR, MIN_SEC) * FPS))
    T += list(a + (b - a) * np.arange(n) / n)
starts.append(len(T))
n_end = int(END_SEC * FPS)
if story[-1]["year"] == Y1:          # last card sits on the final year
    starts[-1] = starts[-2]
T += [float(Y1 - Y0)] * n_end
seg_of = np.zeros(len(T), int)
for i, s in enumerate(starts[:-1]):
    seg_of[s:] = i
if story[-1]["year"] == Y1:
    seg_of[starts[-2]:] = len(story) - 1

def ease(x):
    return x * x * (3 - 2 * x)

def state(f):
    t = T[f]
    i = min(int(t), len(years) - 1)
    x = ease(t - i) if i < len(years) - 1 else 0.0
    j = min(i + 1, len(years) - 1)
    return V[i] + (V[j] - V[i]) * x, R[i] + (R[j] - R[i]) * x, years[i] + x

# ---------------- drawing ----------------
# Card sits inside the TikTok / Reels / Shorts safe area: below y~1440 captions and
# the account row cover the video, and x > ~890 holds the like/comment buttons.
CARD = (50, 1040, 840, 395)          # x, y, w, h in px

FONT = {False: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        True: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"}
_fonts = {}

def text_px(s, pt, bold=False):
    """Rendered width in px of string s at pt points (fig dpi = DPI)."""
    key = (round(pt * DPI / 72), bold)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT[bold], key[0])
    return _fonts[key].getlength(s)

def wrap_px(s, pt, width, bold=False):
    lines, cur = [], ""
    for word in s.split():
        t = f"{cur} {word}".strip()
        if cur and text_px(t, pt, bold) > width:
            lines.append(cur); cur = word
        else:
            cur = t
    return lines + ([cur] if cur else [])

def fit_block(head, body, width, height, hpt=30, bpt=23):
    """Shrink headline/body fonts together until both fit width x height px."""
    while True:
        hl, bl = wrap_px(head, hpt, width, True), wrap_px(body, bpt, width)
        hh = len(hl) * hpt * DPI / 72 * 1.18
        bh = len(bl) * bpt * DPI / 72 * 1.38
        if hh + 22 + bh <= height or bpt <= 14:
            return hl, bl, hpt, bpt, hh
        hpt *= 0.95; bpt *= 0.95

def draw_card(fig, c, a):
    x, y, w, h = CARD
    bg = fig.add_axes(px(x, y, w, h)); bg.set_axis_off()
    bg.set_xlim(0, w); bg.set_ylim(h, 0)
    acc = col_of.get((c.get("names") or [None])[0], "#555")
    bg.add_patch(FancyBboxPatch((3, 3), w - 6, h - 6, boxstyle="round,pad=0,rounding_size=26",
                                fc="#fbfbfb", ec="#e2e2e2", lw=2, alpha=a))
    bg.add_patch(FancyBboxPatch((3, 3), 14, h - 6, boxstyle="round,pad=0,rounding_size=7",
                                fc=acc, ec="none", alpha=a))
    pad = 36
    tx = pad + 8
    bottom = h - pad                      # lowest y available for text
    if c["img"] is not None:
        ih, iw = c["img"].shape[:2]
        cap = c.get("image_caption")
        bw, bh = 230, h - 2 * pad - (54 if cap else 26)
        sc = min(bw / iw, bh / ih)
        pw, ph = iw * sc, ih * sc
        ia = fig.add_axes(px(x + tx + (bw - pw) / 2, y + pad + (bh - ph) / 2, pw, ph))
        ia.imshow(c["img"], alpha=a); ia.set_axis_off()
        if cap:
            cl = wrap_px(cap, 13, bw, True)[:2]
            bg.text(tx + bw / 2, pad + bh + 8, "\n".join(cl), fontsize=13, fontweight="bold",
                    color="#555", ha="center", va="top", alpha=a, linespacing=1.15)
        tx = tx + bw + 30
    tw = w - tx - pad                     # text column width in px
    kind = c.get("kind", "")
    bg.text(tx, pad + 16, kind, fontsize=19, fontweight="bold", color=acc, alpha=a, va="center")
    lab = c.get("label")
    if lab:
        bg.text(w - pad, pad + 16, lab, fontsize=13, fontweight="bold", color="white", ha="right",
                va="center", alpha=a,
                bbox=dict(boxstyle="round,pad=0.45,rounding_size=0.8", fc=LABEL_COL.get(lab, "#555"),
                          ec="none", alpha=a))
    if c["img"] is not None and c.get("image_credit"):
        credit = "Image: " + c["image_credit"]
        while text_px(credit, 10) > w - 2 * pad - 16 and len(credit) > 10:
            credit = credit[:-2]
        bg.text(pad + 8, h - 16, credit, fontsize=10, color=FAINT, alpha=a, va="bottom")
        bottom = h - 34
    top = pad + 52
    hl, bl, hpt, bpt, hh = fit_block(c["headline"], c["text"], tw, bottom - top)
    bg.text(tx, top, "\n".join(hl), fontsize=hpt, fontweight="bold", color=INK, va="top",
            alpha=a, linespacing=1.18)
    bg.text(tx, top + hh + 22, "\n".join(bl), fontsize=bpt, color="#3c3c3c", va="top",
            alpha=a, linespacing=1.38)

def render(f):
    v, r, yr = state(f)
    s = seg_of[f]
    cur = story[s]
    prev = story[s - 1] if s > 0 else None
    since = (f - starts[s]) / FPS
    # old card fades out over the first half of FADE, new card fades in over the second
    fade = float(np.clip((since - FADE / 2) / (FADE / 2), 0, 1)) if prev is not None else 1.0
    fade_out = float(np.clip(1 - since / (FADE / 2), 0, 1))
    hi = set(cur["names"]) if cur else set()

    fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI, facecolor="white")
    # header
    fig.text(60 / W, 1 - 268 / H, "Top Baby Girl", fontsize=34, fontweight="bold", color=INK)
    fig.text(60 / W, 1 - 318 / H, "Names in the USA", fontsize=34, fontweight="bold", color=INK)
    fig.text(1000 / W, 1 - 322 / H, str(int(yr)), fontsize=84, fontweight="bold",
             color="#3a3a3a", ha="right")
    # timeline progress bar with decade ticks
    tl = fig.add_axes(px(60, 346, 940, 30)); tl.set_axis_off()
    tl.set_xlim(Y0, Y1); tl.set_ylim(0, 1)
    tl.plot([Y0, Y1], [0.65, 0.65], color="#e4e4e4", lw=7, solid_capstyle="round")
    tl.plot([Y0, yr], [0.65, 0.65], color="#555", lw=7, solid_capstyle="round")
    for d in range(1900, Y1 + 1, 25):
        tl.text(d, 0.0, str(d), fontsize=11, color=FAINT, ha="center", va="center")

    # chart (fixed geometry)
    ax = fig.add_axes(px(235, 392, 565, 610))
    vis = r <= TOPN + 0.99
    # a featured name still outside the top 12 rides in a spotlight row below the chart
    for k in [names.index(n) for n in hi if n in names]:
        vis[k] = r[k] <= POOL
    xmax = (v[r <= TOPN + 0.99].max() if (r <= TOPN + 0.99).any() else 1) * 1.12
    for k in np.where(vis)[0]:
        y, n = min(r[k], SPOT), names[k]
        lit = n in hi
        dim = HIGHLIGHT == "dim" and hi and not lit
        ax.barh(y, v[k], height=0.82, color=cols[k], alpha=0.38 if dim else 1.0, zorder=2,
                edgecolor=INK if lit else "none", linewidth=3.5 if lit else 0)
        if lit and HIGHLIGHT == "tag":
            # name in a pill of the bar's colour
            ax.text(-xmax * 0.025, y, n, ha="right", va="center", fontsize=22, fontweight="bold",
                    color="white", bbox=dict(boxstyle="round,pad=0.25,rounding_size=0.6",
                                             fc=cols[k], ec=INK, lw=2))
        else:
            ax.text(-xmax * 0.025, y, n, ha="right", va="center", fontsize=22,
                    color="#aaaaaa" if dim else INK if lit else "#333",
                    fontweight="bold" if lit else "normal")
        ax.text(v[k] + xmax * 0.015, y, f"{v[k]:.2f}%", ha="left", va="center",
                fontsize=17, color="#bbbbbb" if dim else "#444",
                fontweight="bold" if lit else "normal")
        if r[k] > TOPN + 0.5:
            ax.text(v[k] + xmax * 0.17, y, f"#{int(round(r[k]))}", ha="left", va="center",
                    fontsize=15, fontweight="bold", color="white",
                    bbox=dict(boxstyle="round,pad=0.3,rounding_size=0.5", fc="#555", ec="none"))
    ax.set_ylim(SPOT + 0.55, 0.4)
    ax.set_xlim(0, xmax)
    ax.set_yticks([]); ax.set_xticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)
    fig.text(235 / W, 1 - 1022 / H, "% of girls born that year given the name",
             fontsize=13, color=FAINT)

    # story card (cross-fade)
    if prev is not None and fade_out > 0:
        draw_card(fig, prev, fade_out)
    elif cur is not None:
        draw_card(fig, cur, fade)
    fig.text(470 / W, 1 - 1462 / H, "Data: U.S. Social Security Administration (1880–2025)",
             fontsize=13, color=FAINT, ha="center")
    fig.savefig(f"{FRAMES}/{f:05d}.png", dpi=DPI)
    plt.close(fig)

if __name__ == "__main__":
    os.makedirs(FRAMES, exist_ok=True)
    for fn in os.listdir(FRAMES):
        os.remove(os.path.join(FRAMES, fn))
    print(len(T), "frames =", round(len(T) / FPS, 1), "s,", len([c for c in story if c]), "cards")
    with Pool() as p:
        p.map(render, range(len(T)), chunksize=20)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
                    "-i", f"{FRAMES}/%05d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-crf", "23", "-preset", "slow", "-movflags", "+faststart", OUT], check=True)
    print("wrote", OUT)
