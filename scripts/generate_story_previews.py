#!/usr/bin/env python3
"""Generate 6 Instagram-story preview canvases (1080x1920) for @lotosinbloom.

Backgrounds = her real published photos (clean carousel slides / video frames).
Typography replicates her cover style: high-contrast serif (Playfair Display),
cream ink, letter-spaced caps kicker, italic serif sublines, IG story chrome.

Usage: python3 generate_story_previews.py <workdir_with_fonts> <out_dir>
Emits <workdir>/previews.html + renders story_1..6.png via Playwright chromium.
"""
import json
import os
import shutil
import subprocess
import sys

WORK = sys.argv[1] if len(sys.argv) > 1 else "/tmp/previews"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/previews"
ROOT = "/home/user/boilerplate"

SLIDES = [
    {
        "n": 1, "img": "DKsAZGJNL1-_4.jpg", "pos": "50% 30%",
        "kicker": "СИГНАЛЫ ИСТОЩЕНИЯ · №1",
        "h": "Не лень.<br>Не прокрастинация.",
        "sub": "почему вечером ты «зависаешь» в телефоне\nи не можешь встать с дивана",
        "cta": "напиши <b>ТИШИНА</b> — пришлю практику в директ",
        "tail": "продолжение — в новом reels",
    },
    {
        "n": 2, "img": "DSkiN5-kiyg_5.jpg", "pos": "50% 20%",
        "kicker": "МНЕНИЕ · ПСИХОЛОГ ПО МЕДИТАЦИИ",
        "h": "Отпуск&nbsp;≠ отдых",
        "sub": "нервная система успокаивается частотой,\nа не длительностью",
        "cta": "сохрани на сезон отпусков",
        "tail": "разбор — в новом reels",
    },
    {
        "n": 3, "img": "DKsAZGJNL1-_2.jpg", "pos": "50% 25%",
        "kicker": "ТЕЛО ВЫДАЁТ · ПРОВЕРЬ СЕБЯ",
        "h": "Где в теле живёт «я&nbsp;сама»",
        "sub": "челюсть · плечи · дыхание —\nтри зоны, которые держат всё",
        "cta": "напиши <b>ТИШИНА</b> — практика на 5 минут",
        "tail": "полная карта тела — в reels",
    },
    {
        "n": 4, "img": "DMTLp5Ktjbm_13.jpg", "pos": "50% 45%",
        "kicker": "ПРАКТИКА · 5 МИНУТ",
        "h": "Для тех, у кого нет сил даже на&nbsp;практику",
        "sub": "лечь можно. этого достаточно.",
        "cta": "сохрани — пригодится вечером",
        "tail": "все шаги — в карусели",
    },
    {
        "n": 5, "img": "DKsAZGJNL1-_1.jpg", "pos": "50% 20%",
        "kicker": "ЛИЧНОЕ",
        "h": "Я выглядела идеально. И&nbsp;разваливалась внутри",
        "sub": "история, с которой начался мой метод",
        "cta": "полная история — в новом посте",
        "tail": "",
    },
    {
        "n": 6, "img": "DKsAZGJNL1-_3.jpg", "pos": "50% 30%",
        "kicker": "8 ЛЕТ ПРЕПОДАЮ МЕДИТАЦИЮ",
        "h": "«Медитация не&nbsp;работает»",
        "sub": "…пока ты думаешь, что цель — очистить разум",
        "cta": "отправь подруге, которая «пробовала»",
        "tail": "почему это норма — в reels",
    },
]

def build_html():
    font_css = open(f"{WORK}/fonts/local.css").read()
    slides_html = []
    for s in SLIDES:
        segs = "".join(
            f'<i style="opacity:{1 if i < s["n"] else .35}"></i>' for i in range(6)
        )
        sub = s["sub"].replace("\n", "<br>")
        tail = f'<div class="tail">{s["tail"]}</div>' if s["tail"] else ""
        slides_html.append(f"""
<div class="story" id="story{s['n']}">
  <img class="bg" src="photos/{s['img']}" style="object-position:{s['pos']}">
  <div class="scrim top"></div><div class="scrim bottom"></div>
  <div class="chrome">
    <div class="progress">{segs}</div>
    <div class="head">
      <img class="hav" src="photos/_avatar.jpg"><span class="hname">lotosinbloom</span><span class="htime">4 ч</span>
      <span class="hx">✕</span>
    </div>
  </div>
  <div class="content">
    <div class="kicker">{s['kicker']}</div>
    <div class="rule"></div>
    <h1>{s['h']}</h1>
    <div class="sub">{sub}</div>
  </div>
  <div class="foot">
    <div class="cta">{s['cta']}</div>
    {tail}
    <div class="msgrow"><span class="msg">Отправить сообщение</span><span class="ic">♡</span><span class="ic">✈</span></div>
  </div>
</div>""")
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
{font_css}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#111;font-family:'Manrope',sans-serif}}
.story{{position:relative;width:1080px;height:1920px;overflow:hidden;background:#000;margin:0 0 40px 0}}
.bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.scrim.top{{position:absolute;top:0;left:0;right:0;height:420px;background:linear-gradient(180deg,rgba(10,8,6,.62),rgba(10,8,6,0))}}
.scrim.bottom{{position:absolute;bottom:0;left:0;right:0;height:900px;background:linear-gradient(0deg,rgba(10,8,6,.78) 12%,rgba(10,8,6,.45) 45%,rgba(10,8,6,0))}}
.chrome{{position:absolute;top:0;left:0;right:0;padding:26px 34px 0;z-index:3}}
.progress{{display:flex;gap:8px;margin-bottom:26px}}
.progress i{{flex:1;height:5px;border-radius:3px;background:#fff;display:block}}
.head{{display:flex;align-items:center;gap:18px}}
.hav{{width:74px;height:74px;border-radius:50%;object-fit:cover;border:2.5px solid rgba(255,255,255,.85)}}
.hname{{color:#fff;font-weight:700;font-size:30px;letter-spacing:.01em}}
.htime{{color:rgba(255,255,255,.75);font-size:29px}}
.hx{{margin-left:auto;color:#fff;font-size:44px;font-weight:400;opacity:.9}}
.content{{position:absolute;left:70px;right:70px;bottom:640px;z-index:2;text-align:center}}
.kicker{{color:#e9dfc9;font-size:31px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;text-shadow:0 2px 22px rgba(0,0,0,.5)}}
.rule{{width:84px;height:2px;background:rgba(233,223,201,.6);margin:30px auto}}
h1{{font-family:'Playfair Display',Georgia,serif;font-weight:500;color:#f4edda;font-size:94px;line-height:1.14;letter-spacing:.005em;text-shadow:0 4px 44px rgba(0,0,0,.55)}}
.sub{{font-family:'Playfair Display',Georgia,serif;font-style:italic;color:rgba(244,237,218,.92);font-size:44px;line-height:1.4;margin-top:34px;text-shadow:0 2px 24px rgba(0,0,0,.5)}}
.foot{{position:absolute;left:70px;right:70px;bottom:64px;z-index:3;text-align:center}}
.cta{{display:inline-block;background:rgba(244,237,218,.16);border:1.5px solid rgba(244,237,218,.75);backdrop-filter:blur(6px);color:#f4edda;font-size:36px;font-weight:600;padding:24px 52px;border-radius:999px;letter-spacing:.02em}}
.cta b{{font-weight:800;letter-spacing:.12em}}
.tail{{color:rgba(244,237,218,.8);font-size:30px;margin-top:26px;font-style:italic;font-family:'Playfair Display',Georgia,serif}}
.msgrow{{display:flex;align-items:center;gap:26px;margin-top:44px}}
.msg{{flex:1;border:2px solid rgba(255,255,255,.55);border-radius:999px;color:rgba(255,255,255,.75);font-size:31px;text-align:left;padding:26px 36px}}
.ic{{color:#fff;font-size:48px;opacity:.95}}
</style></head><body>{''.join(slides_html)}</body></html>"""

os.makedirs(f"{WORK}/photos", exist_ok=True)
for s in SLIDES:
    src = f"{ROOT}/data/target/photos_clean/{s['img']}"
    shutil.copy(src, f"{WORK}/photos/{s['img']}")
shutil.copy(f"{ROOT}/data/avatars/lotosinbloom.jpg", f"{WORK}/photos/_avatar.jpg")
open(f"{WORK}/previews.html", "w").write(build_html())

render_js = f"""
const {{ chromium }} = require('playwright-core');
(async () => {{
  const browser = await chromium.launch({{ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' }});
  const page = await browser.newPage({{ viewport: {{ width: 1080, height: 1920 }} }});
  await page.goto('file://{WORK}/previews.html');
  await page.waitForTimeout(2500);
  for (let i = 1; i <= 6; i++) {{
    const el = await page.$('#story' + i);
    await el.screenshot({{ path: '{OUT}/story_' + i + '.png' }});
    console.log('rendered story_' + i);
  }}
  await browser.close();
}})();
"""
open(f"{WORK}/render.js", "w").write(render_js)
os.makedirs(OUT, exist_ok=True)
subprocess.run(["node", f"{WORK}/render.js"], check=True, cwd=WORK)
print("DONE")
