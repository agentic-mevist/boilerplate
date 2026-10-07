"""Small FAL helpers: synchronous run with retries, file upload to FAL storage, download."""
import base64, mimetypes, os, time, requests

KEY = os.environ["FAL_API_KEY"]
HDR = {"Authorization": f"Key {KEY}"}


def run(endpoint, body, timeout=900, tries=3):
    last = None
    for attempt in range(tries):
        try:
            r = requests.post(f"https://fal.run/{endpoint}", headers=HDR, json=body, timeout=timeout)
            d = r.json()
            if r.status_code < 300:
                return d
            last = d
        except Exception as e:  # network hiccup: retry
            last = str(e)
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"{endpoint} failed: {str(last)[:1500]}")


def upload(path):
    """Upload a local file to FAL storage and return its public URL (falls back to a data URI)."""
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    try:
        r = requests.post("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", headers=HDR,
                          json={"content_type": mime, "file_name": os.path.basename(path)}, timeout=60)
        r.raise_for_status()
        j = r.json()
        requests.put(j["upload_url"], data=open(path, "rb").read(), headers={"Content-Type": mime}, timeout=300).raise_for_status()
        return j["file_url"]
    except Exception as e:
        print("storage upload failed, using data URI:", e)
        return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def download(url, out):
    if url.startswith("data:"):
        open(out, "wb").write(base64.b64decode(url.split(",", 1)[1]))
    else:
        open(out, "wb").write(requests.get(url, timeout=300).content)
    return out
