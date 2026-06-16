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
    ("mask", "A raccoon sitting on a small wooden stool, thoughtfully holding up an ornate theatrical mask and studying it, soft candlelight, quiet introspective mood."),
    ("lantern", "A small raccoon walking along a dark winding forest path at night, holding a glowing paper lantern that casts a warm circle of light, soft mist between the trees."),
    ("key", "A raccoon holding an oversized ornate golden key with both paws, standing before a small carved wooden door set into the trunk of an enormous old tree, gentle morning light."),
    ("bridge", "A raccoon cautiously stepping onto a swaying rope-and-plank bridge over a deep misty ravine, the far side hidden in soft fog, pale dawn light."),
    ("garden", "A raccoon kneeling to tend a small flourishing garden of blooming wildflowers and a single pink lotus, a tiny watering can in its paw, gentle sunlight."),
    ("thread", "A raccoon sitting and gently untangling a softly glowing ball of golden thread, loose luminous strands drifting in the air around it, calm dark background."),
    ("campfire", "A small raccoon sitting alone by a warm crackling campfire in a quiet forest clearing under a vast starry night sky, peaceful solitude."),
    ("teatime", "Two raccoons sitting close together on a cozy windowsill at dusk, sharing tea from tiny cups, warm lamplight, a feeling of gentle companionship."),
    ("boat", "A raccoon sitting calmly in a small wooden rowboat on a vast still sea at dawn, the distant horizon glowing softly, gentle reflective water."),
    ("shadow", "A raccoon standing in warm low lamplight before a wall on which its own shadow looms large and a little wild, the raccoon looking up at its shadow."),
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
