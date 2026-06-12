"""Generate metaphoric raccoon card images with the Gemini API.

Usage:
    GEMINI_API_KEY=... python3 scripts/generate-cards.py

Add new (name, scene) pairs to CARDS, run, and the processed WebP files
land in public/cards/. Then add the new names to CARDS in public/app.js.
Requires: pip install pillow
"""

import base64
import io
import json
import os
import sys
import urllib.request

from PIL import Image

KEY = os.environ["GEMINI_API_KEY"]
MODEL = "gemini-3.1-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "cards")

STYLE = (
    "Whimsical storybook cartoon illustration for a metaphoric association card. "
    "Soft watercolor-and-ink style, muted warm earthy palette with gentle teal and amber accents, "
    "subtle paper grain texture, dreamy atmospheric lighting, painterly, emotionally evocative, "
    "no text, no words, no border, no frame, portrait composition. "
)

CARDS = [
    ("crossroads", "A small raccoon standing at a crossroads in a misty autumn forest at dawn, two winding paths diverging — one sunlit and open, one dark and overgrown — the raccoon looking back over its shoulder."),
    ("reflection", "A raccoon kneeling at the edge of a still moonlit pond, gazing at its own reflection, but the reflection shows the raccoon wearing a tiny golden crown, fireflies drifting around."),
    ("ascent", "A determined raccoon climbing a very tall wooden ladder that disappears into soft pink clouds, far below a tiny village glows at dusk, the raccoon pausing mid-climb to look up."),
    ("shelter", "A raccoon curled up with a book and a steaming mug inside a cozy hollow-tree home, warm lamplight inside, heavy rain and a stormy dark blue forest visible through the round window."),
    ("letting-go", "A raccoon standing on a stone bridge at golden hour, releasing a small paper boat with a glowing candle down a calm river, the boat drifting away among floating autumn leaves."),
]


def generate(name, scene):
    out_path = os.path.join(OUT_DIR, f"{name}.webp")
    if os.path.exists(out_path):
        print(f"{name}: exists, skipping")
        return
    body = json.dumps({
        "contents": [{"parts": [{"text": STYLE + scene}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "2:3"},
        },
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.load(r)
    for part in resp["candidates"][0]["content"]["parts"]:
        if "inlineData" in part:
            im = Image.open(io.BytesIO(base64.b64decode(part["inlineData"]["data"]))).convert("RGB")
            im.thumbnail((560, 840), Image.LANCZOS)
            im.save(out_path, "WEBP", quality=82, method=6)
            print(f"{name}: {im.size} -> {out_path} ({os.path.getsize(out_path)//1024} KB)")
            return
    print(f"{name}: no image in response: {json.dumps(resp)[:400]}", file=sys.stderr)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for card_name, card_scene in CARDS:
        try:
            generate(card_name, card_scene)
        except Exception as e:  # keep going if one card fails
            print(f"{card_name}: FAILED {e}", file=sys.stderr)
