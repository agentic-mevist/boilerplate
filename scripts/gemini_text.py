#!/usr/bin/env python3
"""Gemini text generation helper.

Usage: python3 gemini_text.py <prompt_file> [--model gemini-2.5-flash] [--json] [--max-tokens N]
Reads prompt from file, prints response text.
"""
import json
import os
import sys
import time

import requests

KEY = os.environ["GEMINI_API_KEY"]
BASE = "https://generativelanguage.googleapis.com"


def generate(prompt: str, model="gemini-2.5-flash", force_json=False, max_tokens=16384) -> str:
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": max_tokens},
    }
    if force_json:
        body["generationConfig"]["responseMimeType"] = "application/json"
    for attempt in range(4):
        r = requests.post(f"{BASE}/v1beta/models/{model}:generateContent?key={KEY}", json=body, timeout=300)
        if r.status_code in (429, 500, 503):
            time.sleep(15 * (attempt + 1))
            continue
        r.raise_for_status()
        data = r.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise RuntimeError(f"unexpected response: {json.dumps(data)[:2000]}")
    raise RuntimeError(f"generate failed: {r.status_code} {r.text[:500]}")


if __name__ == "__main__":
    prompt = open(sys.argv[1]).read()
    model = "gemini-2.5-flash"
    if "--model" in sys.argv:
        model = sys.argv[sys.argv.index("--model") + 1]
    max_tokens = 16384
    if "--max-tokens" in sys.argv:
        max_tokens = int(sys.argv[sys.argv.index("--max-tokens") + 1])
    print(generate(prompt, model=model, force_json="--json" in sys.argv, max_tokens=max_tokens))
