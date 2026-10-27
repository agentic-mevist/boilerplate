#!/bin/sh
# Clips the edit scene plays, as raw RGBA frames (src/scenes/p_edit.js):
#   before: the raw take, 5 s from 0:11 of the 1080p proxy
#   after:  8 frames from the middle of each of the effects reel's first 19 effects, then
#           its pull-back (frames 783-828)
#   run:    Daria's montage from the landing page (public/site/assets/library-montage.mp4),
#           4 s from her run at 0:01 (src/scenes/p_tools.js, watch)
# and the montage's 13 shots as stills for the watch scene's scene strip (assets/img/m00..m12).
# usage: tools/clips.sh <take1080.mp4> <effects-reel.mp4> <library-montage.mp4>
set -e
cd "$(dirname "$0")/.."
mkdir -p assets/clips
W=540; H=960
ffmpeg -v error -y -ss 11 -t 5 -i "$1" -vf "scale=$W:$H,fps=30" -f rawvideo -pix_fmt rgba assets/clips/before.rgba
SEL=""
# 8 frames from the middle of each effect's window, where it is fully on

set -- "$@" 0 50 88 121 162 204 239 286 320 369 403 435 503 546 582 624 667 707 739 783
TAKE=$1; REEL=$2; MONT=$3; shift 3
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
ffmpeg -v error -y -ss 1.0 -t 4 -i "$MONT" -vf "scale=360:640,fps=30" -f rawvideo -pix_fmt rgba assets/clips/run.rgba
n=$(( $(stat -c %s assets/clips/run.rgba) / (360 * 640 * 4) ))
echo "{\"w\":360,\"h\":640,\"fps\":30,\"frames\":$n}" > assets/clips/run.json
echo "run: $n frames"
# one still from the middle of each shot (cuts found with ffmpeg's scene score)
i=0
for at in 0.5 1.55 2.7 3.8 4.9 6.0 7.0 8.0 9.1 10.2 11.2 12.3 13.5; do
  ffmpeg -v error -y -ss $at -i "$MONT" -frames:v 1 -vf scale=72:128 -q:v 3 assets/img/m$(printf %02d $i).jpg
  i=$((i + 1))
done
