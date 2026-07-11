#!/usr/bin/env python3
"""Download top viral reel per account and analyze with Gemini.

Usage: python3 batch_reel_analysis.py
Writes data/videos/<user>_<code>.mp4 and data/analysis/reels/<user>_<code>.json
"""
import json
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(__file__))
from gemini_video import download, generate, upload_file

ACCOUNTS = [
    "_rybakova", "marya_london_", "telo_psy", "jenya.vm", "tasya_prohelp",
    "labkovskiyofficial", "psycholog.alexandr.shahov", "larangsovet",
    "anastasiya__motorina", "milalevchuk", "prosto.meditation", "mari_ommm",
]

PROMPT = open(os.path.join(os.path.dirname(__file__), "reel_analysis_prompt.txt")).read()
OUT_DIR = "data/analysis/reels"
VID_DIR = "data/videos"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(VID_DIR, exist_ok=True)

for user in ACCOUNTS:
    try:
        posts = json.load(open(f"data/competitors/posts/{user}.json"))
        vids = [p for p in posts if p.get("type") == "Video" and p.get("videoUrl")]
        if not vids:
            print(f"SKIP {user}: no videos with url", flush=True)
            continue
        top = max(vids, key=lambda p: p.get("videoViewCount") or 0)
        code = top["shortCode"]
        out_json = f"{OUT_DIR}/{user}_{code}.json"
        if os.path.exists(out_json):
            print(f"DONE-ALREADY {user}", flush=True)
            continue
        mp4 = f"{VID_DIR}/{user}_{code}.mp4"
        if not os.path.exists(mp4):
            download(top["videoUrl"], mp4)
        size_mb = os.path.getsize(mp4) / 1e6
        print(f"DOWNLOADED {user} {code} {size_mb:.1f}MB views={top.get('videoViewCount')}", flush=True)
        info = upload_file(mp4)
        analysis = generate(info, PROMPT, force_json=True)
        parsed = json.loads(analysis)
        parsed["_meta"] = {
            "username": user,
            "shortCode": code,
            "views": top.get("videoViewCount"),
            "likes": top.get("likesCount"),
            "comments": top.get("commentsCount"),
            "caption": (top.get("caption") or "")[:500],
            "url": f"https://www.instagram.com/p/{code}/",
        }
        json.dump(parsed, open(out_json, "w"), ensure_ascii=False, indent=1)
        print(f"ANALYZED {user} {code}", flush=True)
    except Exception as e:
        print(f"ERROR {user}: {e}", flush=True)
        traceback.print_exc()
print("BATCH_COMPLETE", flush=True)
