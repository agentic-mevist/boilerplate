"""Bar chart race: most popular US baby girl names, 1880-2017 (SSA data)."""
import os, sys, subprocess
from multiprocessing import Pool
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

DATA = sys.argv[1] if len(sys.argv) > 1 else "babynames.csv"
OUT = sys.argv[2] if len(sys.argv) > 2 else "girl_names_race.mp4"
SEX, TOPN, POOL = "F", 12, 25
FPS, FPY, HOLD = 30, 36, 4          # frames per year, seconds held at end
W, H, DPI = 1920, 1080, 100
FRAMES = "frames"

PALETTE = ["#5ab4ac", "#3d7fb8", "#f2c14e", "#e07a5f", "#9b5094", "#81b29a",
           "#f4a259", "#5b8e7d", "#bc4b51", "#6d597a", "#4ea8de", "#e5989b"]

df = pd.read_csv(DATA)
df = df[df.sex == SEX]
df["year"] = df.year.astype(int)
years = sorted(df.year.unique())
# names that ever reach the visible pool
df["rank"] = df.groupby("year")["prop"].rank(ascending=False, method="first")
keep = df[df["rank"] <= POOL].name.unique()
wide = (df[df.name.isin(keep)].pivot(index="year", columns="name", values="prop")
        .reindex(years).fillna(0) * 100)               # percent
ranks = wide.rank(axis=1, ascending=False, method="first").clip(upper=POOL + 1)
V, R, names = wide.values, ranks.values, list(wide.columns)
order = sorted(names, key=lambda n: (ranks[n].idxmin(), ranks[n].min()))
cols = [PALETTE[order.index(n) % len(PALETTE)] for n in names]

def ease(t):
    return t * t * (3 - 2 * t)

def state(f):
    i = min(f // FPY, len(years) - 1)
    t = ease((f % FPY) / FPY) if i < len(years) - 1 else 0.0
    j = min(i + 1, len(years) - 1)
    return i, V[i] + (V[j] - V[i]) * t, R[i] + (R[j] - R[i]) * t, years[i] + t

def render(f):
    i, v, r, yr = state(f)
    fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI, facecolor="white")
    ax = fig.add_axes([0.17, 0.06, 0.72, 0.80])
    vis = r <= TOPN + 0.99
    xmax = v[vis].max() * 1.13 if vis.any() else 1
    for k in np.where(vis)[0]:
        y = r[k]
        ax.barh(y, v[k], height=0.84, color=cols[k], zorder=2)
        ax.text(-xmax * 0.012, y, names[k], ha="right", va="center",
                fontsize=24, color="#333", fontweight="normal")
        ax.text(v[k] + xmax * 0.012, y, f"{v[k]:.3f}%", ha="left", va="center",
                fontsize=21, color="#444")
    ax.set_ylim(TOPN + 0.6, 0.4)
    ax.set_xlim(0, xmax)
    ax.set_yticks([])
    ax.xaxis.tick_top()
    ax.tick_params(axis="x", colors="#999", labelsize=13, length=0)
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
    # progress ring like the reference video
    prog = (yr - years[0]) / (years[-1] - years[0])
    rax = fig.add_axes([0.80, 0.37, 0.09, 0.16], projection="polar")
    rax.set_axis_off()
    th = np.linspace(0, 2 * np.pi, 200)
    rax.plot(th, np.ones_like(th), color="#ddd", lw=8)
    tp = np.linspace(0, 2 * np.pi * prog, 200)
    rax.plot(tp, np.ones_like(tp), color="#555", lw=8, solid_capstyle="round")
    rax.set_theta_zero_location("N"); rax.set_theta_direction(-1); rax.set_ylim(0, 1.1)
    fig.savefig(f"{FRAMES}/{f:05d}.png", dpi=DPI)
    plt.close(fig)

if __name__ == "__main__":
    os.makedirs(FRAMES, exist_ok=True)
    total = (len(years) - 1) * FPY + 1 + HOLD * FPS
    with Pool() as p:
        p.map(render, range(total), chunksize=20)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
                    "-i", f"{FRAMES}/%05d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-crf", "20", "-preset", "medium", OUT], check=True)
    print("wrote", OUT, total, "frames")
