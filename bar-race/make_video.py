"""Bar chart race: most popular US baby girl names, 1880-2017 (SSA data).

usage: python make_video.py babynames.csv out.mp4 [events.json]
events.json: list of {name, year, headline, text, image, image_credit} (see cards/).
While a card is on screen the timeline runs at half speed and bars shrink left
to make room for it.
"""
import os, sys, json, subprocess, textwrap
from multiprocessing import Pool
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from PIL import Image

DATA = sys.argv[1] if len(sys.argv) > 1 else "babynames.csv"
OUT = sys.argv[2] if len(sys.argv) > 2 else "girl_names_race.mp4"
EVENTS = sys.argv[3] if len(sys.argv) > 3 else None
SEX, TOPN, POOL = "F", 12, 25
FPS, FPY, HOLD = 30, 36, 4          # frames per year, seconds held at end
CARD_SEC, SLOW, FADE = 5.0, 0.5, 0.4  # card duration, timeline speed while shown, fade (s)
W, H, DPI = 1920, 1080, 100
FRAMES = "frames"

PALETTE = ["#5ab4ac", "#3d7fb8", "#f2c14e", "#e07a5f", "#9b5094", "#81b29a",
           "#f4a259", "#5b8e7d", "#bc4b51", "#6d597a", "#4ea8de", "#e5989b"]

df = pd.read_csv(DATA)
df = df[df.sex == SEX]
df["year"] = df.year.astype(int)
years = sorted(df.year.unique())
counts = df.pivot(index="year", columns="name", values="n").fillna(0)
# names that ever reach the visible pool
df["rank"] = df.groupby("year")["prop"].rank(ascending=False, method="first")
keep = df[df["rank"] <= POOL].name.unique()
wide = (df[df.name.isin(keep)].pivot(index="year", columns="name", values="prop")
        .reindex(years).fillna(0) * 100)               # percent
ranks = wide.rank(axis=1, ascending=False, method="first").clip(upper=POOL + 1)
V, R, names = wide.values, ranks.values, list(wide.columns)
order = sorted(names, key=lambda n: (ranks[n].idxmin(), ranks[n].min()))
cols = [PALETTE[order.index(n) % len(PALETTE)] for n in names]

# ---- timeline: data-time t (in years since years[0]) for every frame ----
events = json.load(open(EVENTS)) if EVENTS else []
events = sorted((e for e in events if e.get("verdict", "VERIFIED") != "UNSUPPORTED"),
                key=lambda e: e["year"])
card_len = CARD_SEC * FPS * SLOW / FPY        # data-years covered by one card
prev_end = -1.0
for e in events:
    e["t0"] = max(e["year"] - years[0] - 0.5, prev_end + 0.3)
    e["t1"] = e["t0"] + card_len
    prev_end = e["t1"]
    e["img"] = None
    if e.get("image"):
        p = os.path.join(os.path.dirname(EVENTS), e["image"])
        if os.path.exists(p):
            e["img"] = np.asarray(Image.open(p).convert("RGB"))
    a, b = e["year"] - 1, min(e["year"] + 2, years[-1])
    n = e.get("stat_name", e["name"])
    if n in counts:
        e["stat"] = f"Girls named {n}:  {a}: {int(counts[n].get(a, 0)):,}  →  {b}: {int(counts[n].get(b, 0)):,}"

T, t, end = [], 0.0, len(years) - 1
while t < end:
    T.append(t)
    slow = any(e["t0"] <= t < e["t1"] for e in events)
    t += (SLOW if slow else 1.0) / FPY
T += [float(end)] * (HOLD * FPS)

def ease(x):
    return x * x * (3 - 2 * x)

def state(f):
    t = T[f]
    i = min(int(t), len(years) - 1)
    x = ease(t - i) if i < len(years) - 1 else 0.0
    j = min(i + 1, len(years) - 1)
    return t, V[i] + (V[j] - V[i]) * x, R[i] + (R[j] - R[i]) * x, years[i] + x

def card_alpha(e, t):
    """0..1 visibility of a card at data-time t (fades in/out over FADE seconds)."""
    fd = FADE * FPS * SLOW / FPY
    if t < e["t0"] - fd or t > e["t1"]:
        return 0.0
    return float(np.clip(min((t - e["t0"] + fd) / fd, (e["t1"] - t) / fd), 0, 1))

def draw_card(fig, e, a, col):
    x0, y0, w, h = 0.585, 0.33, 0.39, 0.50
    bg = fig.add_axes([x0, y0, w, h]); bg.set_axis_off()
    bg.add_patch(FancyBboxPatch((0.01, 0.01), 0.98, 0.98, boxstyle="round,pad=0,rounding_size=0.04",
                                fc="white", ec="#dddddd", lw=2, alpha=a, transform=bg.transAxes))
    bg.add_patch(FancyBboxPatch((0.01, 0.90), 0.98, 0.09, boxstyle="round,pad=0,rounding_size=0.04",
                                fc=col, ec="none", alpha=a, transform=bg.transAxes))
    bg.text(0.05, 0.945, f"WHY {e['name'].upper()}?", fontsize=20, fontweight="bold",
            color="white", va="center", alpha=a, transform=bg.transAxes)
    bg.text(0.95, 0.945, str(e["year"]), fontsize=20, fontweight="bold",
            color="white", va="center", ha="right", alpha=a, transform=bg.transAxes)
    tx = 0.05
    if e["img"] is not None:
        ih, iw = e["img"].shape[:2]
        bw, bh = 0.40 * w, 0.72 * h          # image box in figure fraction
        s = min(bw * W / iw, bh * H / ih)
        pw, ph = iw * s / W, ih * s / H
        ia = fig.add_axes([x0 + 0.03 * w + (bw - pw) / 2, y0 + 0.13 * h + (bh - ph), pw, ph])
        ia.imshow(e["img"], alpha=a); ia.set_axis_off()
        tx = 0.47
    wrap = 24 if e["img"] is not None else 46
    head = textwrap.fill(e["headline"], wrap - 4)
    bg.text(tx, 0.84, head, fontsize=24, fontweight="bold", color="#222", va="top",
            alpha=a, transform=bg.transAxes, linespacing=1.15)
    nl = head.count("\n") + 1
    bg.text(tx, 0.84 - 0.085 * nl - 0.03, textwrap.fill(e["text"], wrap + 4), fontsize=17,
            color="#444", va="top", alpha=a, transform=bg.transAxes, linespacing=1.35)
    if e.get("stat"):
        bg.text(0.05, 0.075, e["stat"], fontsize=15, color=col, fontweight="bold",
                alpha=a, transform=bg.transAxes)
    if e.get("image_credit") and e["img"] is not None:
        bg.text(0.95, 0.025, "Photo: " + e["image_credit"], fontsize=9, color="#999",
                ha="right", alpha=a, transform=bg.transAxes)

def render(f):
    t, v, r, yr = state(f)
    active = [(e, card_alpha(e, t)) for e in events]
    active = [(e, a) for e, a in active if a > 0]
    squeeze = max([a for _, a in active], default=0.0)
    fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI, facecolor="white")
    ax = fig.add_axes([0.17, 0.06, 0.72 - 0.32 * ease(squeeze), 0.80])
    vis = r <= TOPN + 0.99
    vmax = v[vis].max() if vis.any() else 1
    xmax = vmax * 1.13
    hi = {e["name"] for e, _ in active}
    for k in np.where(vis)[0]:
        y = r[k]
        lit = names[k] in hi
        ax.barh(y, v[k], height=0.84, color=cols[k], zorder=2,
                edgecolor="#222" if lit else "none", linewidth=3 if lit else 0)
        ax.text(-xmax * 0.012, y, names[k], ha="right", va="center", fontsize=24,
                color="#000" if lit else "#333", fontweight="bold" if lit else "normal")
        ax.text(v[k] + xmax * 0.012, y, f"{v[k]:.3f}%", ha="left", va="center",
                fontsize=21, color="#444")
    ax.set_ylim(TOPN + 0.6, 0.4)
    ax.set_xlim(0, xmax)
    ax.set_yticks([])
    ax.xaxis.tick_top()
    ax.tick_params(axis="x", colors="#999", labelsize=13, length=0)
    ax.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(7))
    ax.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda x, _: f"{x:.1f}%"))
    ax.grid(axis="x", color="#e6e6e6", zorder=0)
    for s in ax.spines.values():
        s.set_visible(False)
    fig.text(0.5, 0.955, "Most Popular Baby Girl Names in the USA", ha="center",
             fontsize=38, fontweight="bold", color="#222")
    fig.text(0.97, 0.13, str(int(yr)), ha="right", fontsize=150,
             fontweight="bold", color="#3a3a3a", alpha=0.9)
    fig.text(0.97, 0.075, "% of girls born that year given this name",
             ha="right", fontsize=16, color="#888")
    fig.text(0.97, 0.025, "Source: U.S. Social Security Administration (names with 5+ births)",
             ha="right", fontsize=12, color="#aaa")
    # progress ring like the reference video (fades out while a card is shown)
    if squeeze < 1:
        prog = (yr - years[0]) / (years[-1] - years[0])
        rax = fig.add_axes([0.80, 0.37, 0.09, 0.16], projection="polar")
        rax.set_axis_off()
        th = np.linspace(0, 2 * np.pi, 200)
        rax.plot(th, np.ones_like(th), color="#ddd", lw=8, alpha=1 - squeeze)
        tp = np.linspace(0, 2 * np.pi * prog, 200)
        rax.plot(tp, np.ones_like(tp), color="#555", lw=8, solid_capstyle="round", alpha=1 - squeeze)
        rax.set_theta_zero_location("N"); rax.set_theta_direction(-1); rax.set_ylim(0, 1.1)
    for e, a in active:
        k = names.index(e["name"]) if e["name"] in names else None
        draw_card(fig, e, a, cols[k] if k is not None else "#555")
    fig.savefig(f"{FRAMES}/{f:05d}.png", dpi=DPI)
    plt.close(fig)

if __name__ == "__main__":
    os.makedirs(FRAMES, exist_ok=True)
    for f in os.listdir(FRAMES):
        os.remove(os.path.join(FRAMES, f))
    with Pool() as p:
        p.map(render, range(len(T)), chunksize=20)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
                    "-i", f"{FRAMES}/%05d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-crf", "20", "-preset", "medium", OUT], check=True)
    print("wrote", OUT, len(T), "frames,", len(events), "cards")
