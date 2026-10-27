#!/bin/sh
# Clips the edit scene plays, as raw RGBA frames (src/scenes/p_edit.js):
#   before: the raw take, 5 s from 0:11 of the 1080p proxy
#   after:  8 frames from the middle of each of the effects reel's first 19 effects, then
#           its pull-back (frames 783-828)
# usage: tools/clips.sh <take1080.mp4> <effects-reel.mp4>
set -e
cd "$(dirname "$0")/.."
mkdir -p assets/clips
W=540; H=960
ffmpeg -v error -y -ss 11 -t 5 -i "$1" -vf "scale=$W:$H,fps=30" -f rawvideo -pix_fmt rgba assets/clips/before.rgba
SEL=""
# 8 frames from the middle of each effect's window, where it is fully on
set -- "$@" 0 50 88 121 162 204 239 286 320 369 403 435 503 546 582 624 667 707 739 783
TAKE=$1; REEL=$2; shift 2
prev=""
for at in "$@"; do
  if [ -n "$prev" ]; then
    s=$(( prev + (at - prev) / 2 - 4 ))
    SEL="$SEL+between(n\,$s\,$((s + 7)))"
  fi
  prev=$at
done
set -- "$TAKE" "$REEL"
SEL="${SEL#+}+between(n\,783\,828)"
ffmpeg -v error -y -i "$2" -vf "select='$SEL',scale=$W:$H" -vsync 0 -f rawvideo -pix_fmt rgba assets/clips/after.rgba
for c in before after; do
  n=$(( $(stat -c %s assets/clips/$c.rgba) / (W * H * 4) ))
  echo "{\"w\":$W,\"h\":$H,\"fps\":30,\"frames\":$n}" > assets/clips/$c.json
  echo "$c: $n frames"
done
