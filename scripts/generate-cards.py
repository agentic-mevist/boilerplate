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
    ("doors", "A raccoon standing in a soft dreamlike space before a row of several differently coloured wooden doors, considering which to open, gentle light."),
    ("window-rain", "A raccoon sitting indoors on a windowsill watching raindrops run down the glass, a cozy blanket around it, soft melancholy, warm interior light against a grey rainy day."),
    ("kite", "A joyful raccoon running through a breezy green meadow flying a colourful diamond kite high in a bright sky with soft clouds."),
    ("sprout", "A raccoon gently cupping a tiny glowing green sprout growing from soil in its paws, soft morning light, tender and hopeful."),
    ("burden", "A small raccoon walking up a hill carrying an enormous overstuffed backpack much bigger than itself, determined but weary, muted light."),
    ("memories", "A raccoon kneeling and opening an old suitcase from which soft glowing orbs of light and tiny memory-images gently drift upward, dim warm room."),
    ("cocoon", "A raccoon sitting on a branch watching a delicate butterfly emerge from a cocoon, dawn light through leaves, quiet wonder."),
    ("tug-of-war", "Two raccoons on either end of a thick rope in a gentle tug of war on a grassy field, playful tension, soft daylight."),
    ("embrace", "Two raccoons hugging each other warmly in a soft snowfall, eyes closed, tender and comforting, muted blue evening light."),
    ("apart", "Two raccoons sitting back to back on a log with a small gap between them, looking in opposite directions, quiet wistful autumn mood."),
    ("well", "A raccoon leaning over the stone rim of a deep old well, lowering a wooden bucket, peering down into mysterious darkness, soft light."),
    ("treasure", "A raccoon kneeling before an open ornate chest glowing with warm golden light spilling out, awe on its face, dim cave."),
    ("kintsugi", "A raccoon carefully mending a cracked ceramic pot with shimmering golden seams, focused and gentle, warm tabletop light."),
    ("umbrella", "A calm raccoon standing under a large umbrella in a heavy downpour on an empty path, puddles and soft grey rain, serene."),
    ("sunrise", "A raccoon standing on a grassy hilltop with arms slightly open, watching a warm golden sunrise spread over distant hills."),
    ("starfield", "A small raccoon lying on its back in a meadow at night gazing up at a vast glittering milky way, peaceful and tiny under the cosmos."),
    ("maze", "A raccoon standing thoughtfully inside a tall green hedge maze, winding paths around it, soft overcast light, a feeling of searching."),
    ("anchor", "A raccoon sitting beside a large iron anchor on a quiet shore at dusk, looking out at a calm sea, contemplative, heavy stillness."),
    ("floating", "A raccoon floating peacefully on its back in calm clear water, eyes closed, surrounded by gentle ripples and soft sky reflections, serene surrender."),
    ("stone-door", "A small raccoon pushing with all its might against a huge heavy stone door set in a mossy cliff, effort and resistance, dramatic soft light."),
    ("compass", "A raccoon holding a glowing brass compass in both paws in a misty forest, looking at it for direction, soft shafts of light."),
    ("clock", "A small raccoon standing beside an enormous old grandfather clock in a dim room, looking up at it, a sense of time and pressure, warm dim light."),
    ("spilled", "A raccoon crouching beside an overturned basket with apples rolled across the ground, a look of dismay, soft outdoor light, gentle forgiving mood."),
    ("swing", "A raccoon happily sitting on a wooden rope swing hanging from a huge old oak tree, soft summer afternoon light, nostalgic and carefree."),
    ("seasons", "A raccoon standing exactly at the boundary where a snowy winter landscape meets a blossoming spring meadow, half snow half flowers, transition."),
    ("fishing", "A patient raccoon sitting on a small wooden dock fishing in a still misty lake at dawn, calm and meditative, soft pastel light."),
    ("free-bird", "A raccoon standing beside an open birdcage, gently watching a small bird fly up into a bright open sky, bittersweet release."),
    ("cliff-edge", "A raccoon standing at the very edge of a high cliff looking out over a vast glowing horizon and open sky, awe mixed with fear."),
    ("lighthouse", "A small raccoon standing on rocks beside a tall lighthouse sweeping a warm beam of light across a dark stormy sea at night, hope and guidance."),
    ("roots", "A raccoon sitting among the tangled glowing roots of an enormous ancient tree underground, soft luminous threads, complexity and origins."),
    ("offering", "A raccoon holding out a small carefully wrapped gift with both paws toward the viewer, warm hopeful expression, soft golden light."),
    ("map", "A raccoon studying a large unfolded old map spread on the ground, tracing a route with its paw, a lantern beside it, planning a journey, warm light."),
    ("balance-stones", "A raccoon carefully balancing a tall stack of smooth round stones on a riverbank at golden hour, focused and calm, equilibrium."),
    ("tightrope", "A small raccoon carefully walking a tightrope strung between two tall trees high above a soft misty forest, arms out for balance, dawn light."),
    ("balloon-ride", "A raccoon riding in the basket of a colourful hot-air balloon drifting over a patchwork landscape of fields and hills at sunrise, wonder and perspective."),
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
