import os, sys, json, time, requests
KEY = os.environ["GEMINI_API_KEY"]
path = sys.argv[1]; mime = sys.argv[2] if len(sys.argv) > 2 else "video/mp4"
size = os.path.getsize(path)
r = requests.post("https://generativelanguage.googleapis.com/upload/v1beta/files",
    headers={"x-goog-api-key": KEY, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
             "X-Goog-Upload-Header-Content-Length": str(size), "X-Goog-Upload-Header-Content-Type": mime,
             "Content-Type": "application/json"},
    json={"file": {"display_name": os.path.basename(path)}})
r.raise_for_status()
up = r.headers["X-Goog-Upload-URL"]
with open(path, "rb") as f:
    r = requests.post(up, headers={"X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize",
                                   "Content-Length": str(size)}, data=f.read())
r.raise_for_status()
fi = r.json()["file"]
while fi.get("state") == "PROCESSING":
    time.sleep(3)
    fi = requests.get(f"https://generativelanguage.googleapis.com/v1beta/{fi['name']}", headers={"x-goog-api-key": KEY}).json()
print(json.dumps(fi))
