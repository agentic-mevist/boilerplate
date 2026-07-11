#!/usr/bin/env python3
"""Generate 6 Instagram FEED covers (1080x1350, 4:5) + profile-grid mockup for @lotosinbloom.

Reels covers = REAL frames of Daria talking to camera (extracted from her own
published reels via ffmpeg) + her serif title system. Carousel covers = her real
photos (clean carousel slides). No AI synthesis of her likeness anywhere.

Grid mockup = her real header (avatar/bio/stats from scrape) + 6 new covers on
top of her 6 actual most recent covers, cropped 3:4 like the current IG grid.

Usage: python3 generate_feed_previews.py <workdir_with_fonts_and_frames> <out_dir>
"""
import os
import shutil
import subprocess
import sys

WORK = sys.argv[1] if len(sys.argv) > 1 else "/tmp/feedwork"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/previews"
ROOT = "/home/user/boilerplate"

# n = posting order (1 = first to publish). img: frames from own reels (fr/) or clean photos (ph/)
COVERS = [
    {
        "n": 1, "type": "reel", "img": "fr/DZ9kdG5vLfA_t12.jpg", "pos": "50% 16%",
        "kicker": "СИГНАЛЫ ИСТОЩЕНИЯ · №1",
        "h": "Не лень.<br>Не прокрастинация.",
        "sub": "почему вечером ты «зависаешь» в телефоне",
    },
    {
        "n": 2, "type": "reel", "img": "fr/DaXWsOtvm1w_t4.jpg", "pos": "50% 14%",
        "kicker": "МНЕНИЕ · ПСИХОЛОГ ПО МЕДИТАЦИИ",
        "h": "Отпуск&nbsp;≠ отдых",
        "sub": "нервной системе нужна частота, а не длительность",
    },
    {
        "n": 3, "type": "reel", "img": "fr/DZ9kdG5vLfA_t9.jpg", "pos": "50% 24%",
        "kicker": "ПРОВЕРЬ СЕБЯ",
        "h": "Где в теле живёт «я&nbsp;сама»",
        "sub": "челюсть · плечи · дыхание",
    },
    {
        "n": 4, "type": "carousel", "img": "ph/DMTLp5Ktjbm_13.jpg", "pos": "50% 45%",
        "kicker": "ПРАКТИКА · 5 МИНУТ",
        "h": "Для тех, у кого нет сил даже на&nbsp;практику",
        "sub": "лечь можно. этого достаточно.",
    },
    {
        "n": 5, "type": "carousel", "img": "ph/DKsAZGJNL1-_3.jpg", "pos": "50% 22%",
        "kicker": "ЛИЧНОЕ",
        "h": "Я выглядела идеально. И&nbsp;разваливалась внутри",
        "sub": "история, с которой начался мой метод",
    },
    {
        "n": 6, "type": "reel", "img": "fr/DYMKIVovtmE_t12.jpg", "pos": "50% 18%",
        "kicker": "8 ЛЕТ ПРЕПОДАЮ МЕДИТАЦИЮ",
        "h": "«Медитация не&nbsp;работает»",
        "sub": "…пока ты пытаешься «очистить разум»",
    },
]

# Frames that carry baked-in karaoke captions / UI badges get re-extracted from the
# source video with a crop filter (imageio's ffmpeg build can't decode jpg inputs).
# fname -> (video shortcode, timestamp, x0, x1, y0, y1) — fractions of frame size,
# because source videos vary in resolution (720x1280 vs 1080x1920).
FRAME_CROPS = {
    # cut «я слишком» caption below chest
    "DZ9kdG5vLfA_t9.jpg": ("DZ9kdG5vLfA", "9", 0.0, 1.0, 0.0, 0.578),
    # cut «2x» badge at mid-right + «принимают» word below
    "DYMKIVovtmE_t12.jpg": ("DYMKIVovtmE", "12", 0.0, 0.75, 0.09, 0.70),
}

# Her actual 6 most recent covers (downloaded from CDN), newest first
REAL_RECENT = [
    ("DakwLt7FO2Q", "carousel"),
    ("DahzhHBP182", "reel"),
    ("DaXWsOtvm1w", "reel"),
    ("DaW0pQPvScY", "reel"),
    ("DaAvhmXlKKx", "carousel"),
    ("DZ9kdG5vLfA", "reel"),
]

PROFILE = {
    "username": "lotosinbloom",
    "fullname": "DARIA • МЕНТАЛЬНОЕ БЛАГОПОЛУЧИЕ",
    "bio": "♡︎ Уход за психикой самыми эффективными методами<br>♡ Первая система эстетики внутреннего состояния<br>♡︎ Психология • майндфулнесс • тело ↓",
    "link": "t.me/lotosclub27",
    "posts": "2 895",  # 2 889 + 6 new
    "followers": "4 824",
    "following": "973",
}

REEL_ICON = '<svg viewBox="0 0 24 24" fill="white"><path d="M12.823 1l2.974 5.002h-5.58l-2.65-4.971c.206-.013.419-.022.642-.027L8.55 1zm2.327 0h.298c3.06 0 4.468.754 5.64 1.887a6.007 6.007 0 011.596 2.82l.07.295h-4.629L15.15 1zm-9.667.377L7.95 6.002H1.244a6.01 6.01 0 013.942-4.53zm9.735 12.834l-4.545-2.624a.909.909 0 00-1.356.668l-.008.12v5.248a.91.91 0 001.255.84l.109-.053 4.545-2.624a.909.909 0 00.1-1.507l-.1-.068-4.545-2.624zm-14.2-6.209h21.964l.015.36.003.189v6.899c0 3.061-.755 4.469-1.888 5.64-1.151 1.114-2.5 1.856-5.33 1.909l-.334.003H8.551c-3.06 0-4.467-.755-5.64-1.889-1.114-1.15-1.854-2.498-1.908-5.33L1 15.45V8.551l.003-.189z"/></svg>'
CAROUSEL_ICON = '<svg viewBox="0 0 48 48" fill="white"><path d="M34.8 29.7V11c0-2.9-2.3-5.2-5.2-5.2H11c-2.9 0-5.2 2.3-5.2 5.2v18.7c0 2.9 2.3 5.2 5.2 5.2h18.7c2.8-.1 5.1-2.4 5.1-5.2zM39.2 15v16.1c0 4.5-3.7 8.2-8.2 8.2H14.9c-.6 0-.9.7-.5 1.1 1 1.1 2.4 1.8 4.1 1.8h13.4c5.7 0 10.3-4.6 10.3-10.3V18.5c0-1.6-.7-3.1-1.8-4.1-.5-.4-1.2 0-1.2.6z"/></svg>'


def cover_html(font_css):
    cells = []
    for c in COVERS:
        cells.append(f"""
<div class="cover" id="cover{c['n']}">
  <img class="bg" src="{c['img']}" style="object-position:{c['pos']}">
  <div class="scrim"></div>
  <div class="content">
    <div class="brand">@LOTOSINBLOOM</div>
    <div class="kicker">{c['kicker']}</div>
    <div class="rule"></div>
    <h1>{c['h']}</h1>
    <div class="sub">{c['sub']}</div>
  </div>
</div>""")
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
{font_css}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#111;font-family:'Manrope',sans-serif}}
.cover{{position:relative;width:1080px;height:1350px;overflow:hidden;background:#000;margin:0 0 40px}}
.bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.scrim{{position:absolute;left:0;right:0;bottom:0;height:760px;background:linear-gradient(0deg,rgba(12,9,7,.88) 10%,rgba(12,9,7,.62) 42%,rgba(12,9,7,.22) 72%,rgba(12,9,7,0))}}
.content{{position:absolute;left:84px;right:84px;bottom:78px;text-align:center}}
.brand{{color:rgba(233,223,201,.72);font-size:27px;font-weight:700;letter-spacing:.42em;margin-bottom:26px}}
.kicker{{color:#e9dfc9;font-size:29px;font-weight:600;letter-spacing:.34em;text-transform:uppercase}}
.rule{{width:80px;height:2px;background:rgba(233,223,201,.55);margin:26px auto}}
h1{{font-family:'Playfair Display',Georgia,serif;font-weight:500;color:#f4edda;font-size:88px;line-height:1.13;text-shadow:0 4px 40px rgba(0,0,0,.5)}}
.sub{{font-family:'Playfair Display',Georgia,serif;font-style:italic;color:rgba(244,237,218,.9);font-size:40px;line-height:1.35;margin-top:28px}}
</style></head><body>{''.join(cells)}</body></html>"""


def grid_html(font_css, badges=True):
    # feed order: newest first -> she posts 1..6, so grid shows 6,5,4 / 3,2,1
    new_order = [6, 5, 4, 3, 2, 1]
    tiles = []
    for n in new_order:
        c = next(x for x in COVERS if x["n"] == n)
        icon = REEL_ICON if c["type"] == "reel" else CAROUSEL_ICON
        badge = f'<span class="badge">{n}</span>' if badges else ""
        tiles.append(f'<div class="tile new"><img src="out/feed_{n}.png"><span class="ti">{icon}</span>{badge}</div>')
    for sc, typ in REAL_RECENT:
        icon = REEL_ICON if typ == "reel" else CAROUSEL_ICON
        tiles.append(f'<div class="tile"><img src="rc/{sc}.jpg"><span class="ti">{icon}</span></div>')
    hl = "".join(
        f'<div class="hli"><div class="hlc"><img src="{img}"></div><span>{lbl}</span></div>'
        for img, lbl in [
            ("ph/DKsAZGJNL1-_4.jpg", "практики"), ("ph/DMTLp5Ktjbm_13.jpg", "медитации"),
            ("ph/DSkiN5-kiyg_5.jpg", "о методе"), ("rc/DakwLt7FO2Q.jpg", "отзывы"),
        ])
    p = PROFILE
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
{font_css}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#fff;font-family:-apple-system,'Manrope','Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}}
.phone{{width:1170px;background:#fff;color:#000}}
.topbar{{display:flex;align-items:center;padding:36px 48px 24px;gap:24px}}
.topbar .uname{{font-size:66px;font-weight:700;letter-spacing:-.01em}}
.topbar .chev{{font-size:40px;margin-left:6px;opacity:.9}}
.topbar .right{{margin-left:auto;display:flex;gap:60px;font-size:66px;font-weight:300}}
.head{{display:flex;align-items:center;padding:18px 48px;gap:84px}}
.av{{width:264px;height:264px;border-radius:50%;object-fit:cover;border:1px solid #dbdbdb}}
.stats{{display:flex;flex:1;justify-content:space-around;text-align:center}}
.stats b{{display:block;font-size:60px;font-weight:700}}
.stats span{{font-size:42px;color:#262626}}
.meta{{padding:12px 48px 0}}
.meta .fn{{font-size:44px;font-weight:600;letter-spacing:.01em}}
.meta .bio{{font-size:42px;line-height:1.42;margin-top:8px;color:#111}}
.meta .lnk{{font-size:42px;color:#00376b;font-weight:500;margin-top:8px}}
.btns{{display:flex;gap:24px;padding:36px 48px 12px}}
.btn{{flex:1;text-align:center;font-size:42px;font-weight:600;padding:26px 0;border-radius:24px}}
.btn.follow{{background:#0095f6;color:#fff}}
.btn.msg{{background:#efefef;color:#000}}
.hl{{display:flex;gap:66px;padding:42px 48px 30px;overflow:hidden}}
.hli{{text-align:center}}
.hlc{{width:186px;height:186px;border-radius:50%;padding:6px;border:3px solid #c7c7c7}}
.hlc img{{width:100%;height:100%;border-radius:50%;object-fit:cover}}
.hli span{{display:block;font-size:36px;margin-top:14px;color:#111}}
.tabs{{display:flex;border-top:1px solid #dbdbdb;margin-top:18px}}
.tab{{flex:1;text-align:center;padding:30px 0;font-size:52px}}
.tab.on{{border-bottom:4px solid #000}}
.tab.off{{opacity:.32}}
.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#fff;padding-top:4px}}
.tile{{position:relative;aspect-ratio:3/4;overflow:hidden;background:#eee}}
.tile img{{width:100%;height:100%;object-fit:cover;display:block}}
.ti{{position:absolute;top:18px;right:18px;width:56px;height:56px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.45))}}
.ti svg{{width:100%;height:100%}}
.badge{{position:absolute;top:18px;left:18px;background:rgba(20,15,10,.72);border:1.5px solid rgba(244,237,218,.65);color:#f4edda;font-size:34px;font-weight:700;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}}
</style></head><body>
<div class="phone" id="phone">
  <div class="topbar"><span class="uname">{p['username']}</span><span class="chev">⌄</span><div class="right"><span>+</span><span>☰</span></div></div>
  <div class="head">
    <img class="av" src="ph/_avatar.jpg">
    <div class="stats">
      <div><b>{p['posts']}</b><span>публикации</span></div>
      <div><b>{p['followers']}</b><span>подписчики</span></div>
      <div><b>{p['following']}</b><span>подписки</span></div>
    </div>
  </div>
  <div class="meta">
    <div class="fn">{p['fullname']}</div>
    <div class="bio">{p['bio']}</div>
    <div class="lnk">🔗 {p['link']}</div>
  </div>
  <div class="btns"><div class="btn follow">Подписаться</div><div class="btn msg">Сообщение</div></div>
  <div class="hl">{hl}</div>
  <div class="tabs"><div class="tab on">▦</div><div class="tab off">▶</div><div class="tab off">👤</div></div>
  <div class="grid">{''.join(tiles)}</div>
</div>
</body></html>"""


font_css = open(f"{WORK}/fonts/local.css").read()
os.makedirs(f"{WORK}/ph", exist_ok=True)
os.makedirs(f"{WORK}/rc", exist_ok=True)
os.makedirs(f"{WORK}/out", exist_ok=True)
for c in COVERS:
    if c["img"].startswith("ph/"):
        shutil.copy(f"{ROOT}/data/target/photos_clean/{os.path.basename(c['img'])}", f"{WORK}/{c['img']}")
for f in ["DKsAZGJNL1-_4.jpg", "DMTLp5Ktjbm_13.jpg", "DSkiN5-kiyg_5.jpg"]:
    shutil.copy(f"{ROOT}/data/target/photos_clean/{f}", f"{WORK}/ph/{f}")
shutil.copy(f"{ROOT}/data/avatars/lotosinbloom.jpg", f"{WORK}/ph/_avatar.jpg")
for sc, _ in REAL_RECENT:
    shutil.copy(f"{ROOT}/data/target/photos_recent/{sc}.jpg", f"{WORK}/rc/{sc}.jpg")

# re-extract frames with baked captions/badges directly from source video, cropped
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
for fname, (video, t, x0, x1, y0, y1) in FRAME_CROPS.items():
    vf = (f"crop=floor(iw*{x1 - x0:.4f}/2)*2:floor(ih*{y1 - y0:.4f}/2)*2:"
          f"floor(iw*{x0:.4f}/2)*2:floor(ih*{y0:.4f}/2)*2")
    subprocess.run([FF, "-y", "-ss", t, "-i", f"{ROOT}/data/target/own_videos/{video}.mp4",
                    "-frames:v", "1", "-vf", vf, "-q:v", "2",
                    f"{WORK}/fr/{fname}"], check=True, capture_output=True)

open(f"{WORK}/feed.html", "w").write(cover_html(font_css))
open(f"{WORK}/grid.html", "w").write(grid_html(font_css, badges=True))
open(f"{WORK}/grid_clean.html", "w").write(grid_html(font_css, badges=False))

render_js = f"""
const {{ chromium }} = require('playwright-core');
(async () => {{
  const browser = await chromium.launch({{ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' }});
  const page = await browser.newPage({{ viewport: {{ width: 1080, height: 1350 }} }});
  await page.goto('file://{WORK}/feed.html');
  await page.waitForTimeout(2200);
  for (let i = 1; i <= 6; i++) {{
    const el = await page.$('#cover' + i);
    await el.screenshot({{ path: '{WORK}/out/feed_' + i + '.png' }});
    console.log('feed_' + i);
  }}
  const g = await browser.newPage({{ viewport: {{ width: 1170, height: 1400 }} }});
  for (const [f, out] of [['grid.html', 'feed_grid_numbered.png'], ['grid_clean.html', 'feed_grid.png']]) {{
    await g.goto('file://{WORK}/' + f);
    await g.waitForTimeout(2200);
    const ph = await g.$('#phone');
    await ph.screenshot({{ path: '{WORK}/out/' + out }});
    console.log(out);
  }}
  await browser.close();
}})();
"""
open(f"{WORK}/render_feed.js", "w").write(render_js)
subprocess.run(["node", f"{WORK}/render_feed.js"], check=True, cwd=WORK)
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(f"{WORK}/out"):
    shutil.copy(f"{WORK}/out/{f}", f"{OUT}/{f}")
print("DONE")
