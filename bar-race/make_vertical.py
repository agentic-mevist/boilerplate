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
from PIL import Image

DATA, OUT, STORY = sys.argv[1], sys.argv[2], sys.argv[3]
SEX, TOPN, POOL = "F", 12, 25
FPS, SEC_PER_YEAR, MIN_SEC, END_SEC, FADE = 30, 1.0, 5.5, 6.0, 0.35
W, H, DPI = 1080, 1920, 100
FRAMES = "frames_v"

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
CARD = (40, 1200, 1000, 470)          # x, y, w, h in px (kept clear of TikTok/Reels UI)

def draw_card(fig, c, a):
    x, y, w, h = CARD
    bg = fig.add_axes(px(x, y, w, h)); bg.set_axis_off()
    bg.set_xlim(0, w); bg.set_ylim(h, 0)
    acc = col_of.get((c.get("names") or [None])[0], "#555")
    bg.add_patch(FancyBboxPatch((3, 3), w - 6, h - 6, boxstyle="round,pad=0,rounding_size=26",
                                fc="#fbfbfb", ec="#e2e2e2", lw=2, alpha=a))
    bg.add_patch(FancyBboxPatch((3, 3), 14, h - 6, boxstyle="round,pad=0,rounding_size=7",
                                fc=acc, ec="none", alpha=a))
    tx = 40
    if c["img"] is not None:
        ih, iw = c["img"].shape[:2]
        bw, bh = 300, h - 110
        s = min(bw / iw, bh / ih)
        pw, ph = iw * s, ih * s
        ia = fig.add_axes(px(x + 40 + (bw - pw) / 2, y + 40 + (bh - ph) / 2, pw, ph))
        ia.imshow(c["img"], alpha=a); ia.set_axis_off()
        tx = 370
        if c.get("image_credit"):
            bg.text(40, h - 28, textwrap.shorten("Photo: " + c["image_credit"], 70),
                    fontsize=10, color=FAINT, alpha=a, va="center")
    tw = w - tx - 34                    # text column width in px
    chars = int(tw / 18.5)
    # kind + label pills
    kind = c.get("kind", "")
    bg.text(tx, 52, kind, fontsize=19, fontweight="bold", color=acc, alpha=a, va="center")
    lab = c.get("label")
    if lab:
        bg.text(w - 34, 52, lab, fontsize=13, fontweight="bold", color="white", ha="right",
                va="center", alpha=a,
                bbox=dict(boxstyle="round,pad=0.45,rounding_size=0.8", fc=LABEL_COL.get(lab, "#555"),
                          ec="none", alpha=a))
    head = textwrap.fill(c["headline"], int(chars * 0.82))
    bg.text(tx, 92, head, fontsize=32, fontweight="bold", color=INK, va="top", alpha=a,
            linespacing=1.12)
    nl = head.count("\n") + 1
    bg.text(tx, 92 + nl * 45 + 20, textwrap.fill(c["text"], chars), fontsize=25,
            color="#3c3c3c", va="top", alpha=a, linespacing=1.38)

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
    fig.text(50 / W, 1 - 200 / H, "Top Baby Girl", fontsize=38, fontweight="bold", color=INK)
    fig.text(50 / W, 1 - 255 / H, "Names in the USA", fontsize=38, fontweight="bold", color=INK)
    fig.text(1030 / W, 1 - 262 / H, str(int(yr)), fontsize=92, fontweight="bold",
             color="#3a3a3a", ha="right")
    # timeline progress bar with decade ticks
    tl = fig.add_axes(px(50, 292, 980, 34)); tl.set_axis_off()
    tl.set_xlim(Y0, Y1); tl.set_ylim(0, 1)
    tl.plot([Y0, Y1], [0.65, 0.65], color="#e4e4e4", lw=7, solid_capstyle="round")
    tl.plot([Y0, yr], [0.65, 0.65], color="#555", lw=7, solid_capstyle="round")
    for d in range(1900, Y1 + 1, 25):
        tl.text(d, 0.0, str(d), fontsize=11, color=FAINT, ha="center", va="center")

    # chart (fixed geometry)
    ax = fig.add_axes(px(250, 370, 640, 790))
    vis = r <= TOPN + 0.99
    xmax = (v[vis].max() if vis.any() else 1) * 1.12
    for k in np.where(vis)[0]:
        y, n = r[k], names[k]
        lit = n in hi
        alpha = 1.0 if (lit or not hi) else 0.38
        ax.barh(y, v[k], height=0.82, color=cols[k], alpha=alpha, zorder=2,
                edgecolor=INK if lit else "none", linewidth=3.5 if lit else 0)
        ax.text(-xmax * 0.025, y, n, ha="right", va="center", fontsize=25,
                color=INK if (lit or not hi) else "#aaaaaa",
                fontweight="bold" if lit else "normal")
        ax.text(v[k] + xmax * 0.015, y, f"{v[k]:.2f}%", ha="left", va="center",
                fontsize=19, color="#444" if (lit or not hi) else "#bbbbbb",
                fontweight="bold" if lit else "normal")
    ax.set_ylim(TOPN + 0.6, 0.4)
    ax.set_xlim(0, xmax)
    ax.set_yticks([]); ax.set_xticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)
    fig.text(250 / W, 1 - 1172 / H, "% of girls born that year given the name",
             fontsize=14, color=FAINT)

    # story card (cross-fade)
    if prev is not None and fade_out > 0:
        draw_card(fig, prev, fade_out)
    elif cur is not None:
        draw_card(fig, cur, fade)
    fig.text(540 / W, 1 - 1705 / H, "Data: U.S. Social Security Administration",
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
