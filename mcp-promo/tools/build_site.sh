#!/usr/bin/env bash
# Assemble the static showreel site: page + the reel's own source (for live mode) + media.
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO="${1:-out/reel.mp4}"
OUT=dist
rm -rf "$OUT"
mkdir -p "$OUT/media" "$OUT/fonts" "$OUT/src"
cp site/index.html "$OUT/"
cp -r src/* "$OUT/src/"
cp fonts/*.ttf "$OUT/fonts/"
cp "$VIDEO" "$OUT/media/reel.mp4"
# poster = the end card
ffmpeg -loglevel error -y -sseof -0.1 -i "$VIDEO" -frames:v 1 -q:v 3 "$OUT/media/poster.jpg"
cp "$OUT/media/poster.jpg" media/poster.jpg 2>/dev/null || true
# the full project source, so the reel can be re-rendered or remixed
zip -qr "$OUT/claude-motion-reel-source.zip" README.md package.json package-lock.json .gitignore wrangler.jsonc src tools site worker fonts media -x "*.pyc" -x "*/__pycache__/*"
# byte sizes of media files for the range-serving Worker (worker/index.js)
python3 - "$OUT" > worker/sizes.json <<'PY'
import json, os, sys
root = sys.argv[1]
print(json.dumps({"/media/" + f: os.path.getsize(os.path.join(root, "media", f)) for f in sorted(os.listdir(os.path.join(root, "media")))}, indent=2))
PY
cat > "$OUT/_headers" <<'EOF'
/media/*
  Cache-Control: public, max-age=86400
/src/*
  Cache-Control: public, max-age=3600
EOF
du -sh "$OUT" && find "$OUT" -type f | wc -l
