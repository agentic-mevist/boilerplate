#!/usr/bin/env python3
"""Analyze a video with Gemini (Files API upload + generateContent).

Usage:
  python3 gemini_video.py analyze <video.mp4> <prompt_file> [--model gemini-2.5-flash] [--json]
  python3 gemini_video.py download <url> <out.mp4>       # download video (e.g. IG videoUrl)
"""
import json
import os
import sys
import time

import requests

KEY = os.environ["GEMINI_API_KEY"]
BASE = "https://generativelanguage.googleapis.com"


def download(url: str, out: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    }
    r = requests.get(url, headers=headers, timeout=180, stream=True)
    r.raise_for_status()
    with open(out, "wb") as f:
        for chunk in r.iter_content(1 << 20):
            f.write(chunk)
    return out


def upload_file(path: str, mime="video/mp4") -> dict:
    size = os.path.getsize(path)
    # start resumable upload
    r = requests.post(
        f"{BASE}/upload/v1beta/files?key={KEY}",
        headers={
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": str(size),
            "X-Goog-Upload-Header-Content-Type": mime,
            "Content-Type": "application/json",
        },
        json={"file": {"display_name": os.path.basename(path)}},
        timeout=60,
    )
    r.raise_for_status()
    upload_url = r.headers["X-Goog-Upload-URL"]
    with open(path, "rb") as f:
        data = f.read()
    r2 = requests.post(
        upload_url,
        headers={
            "Content-Length": str(size),
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize",
        },
        data=data,
        timeout=600,
    )
    r2.raise_for_status()
    info = r2.json()["file"]
    # wait for ACTIVE
    name = info["name"]
    for _ in range(60):
        st = requests.get(f"{BASE}/v1beta/{name}?key={KEY}", timeout=30).json()
        if st.get("state") == "ACTIVE":
            return st
        if st.get("state") == "FAILED":
            raise RuntimeError(f"file processing failed: {st}")
        time.sleep(5)
    raise TimeoutError("file never became ACTIVE")


def generate(file_info: dict, prompt: str, model="gemini-2.5-flash", force_json=False) -> str:
    body = {
        "contents": [{
            "parts": [
                {"file_data": {"file_uri": file_info["uri"], "mime_type": file_info.get("mimeType", "video/mp4")}},
                {"text": prompt},
            ]
        }],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 8192},
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
    raise RuntimeError(f"generate failed after retries: {r.status_code} {r.text[:500]}")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "download":
        download(sys.argv[2], sys.argv[3])
        print(sys.argv[3], os.path.getsize(sys.argv[3]))
    elif cmd == "analyze":
        video, prompt_file = sys.argv[2], sys.argv[3]
        model = "gemini-2.5-flash"
        if "--model" in sys.argv:
            model = sys.argv[sys.argv.index("--model") + 1]
        prompt = open(prompt_file).read()
        info = upload_file(video)
        out = generate(info, prompt, model=model, force_json="--json" in sys.argv)
        print(out)
