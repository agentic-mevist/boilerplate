#!/bin/sh
# usage: grid.sh out.jpg cols img...  (each scaled to 960 wide)
out=$1; cols=$2; shift 2
python3 - "$out" "$cols" "$@" <<'PY'
import sys
from PIL import Image
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert("RGB").resize((960, 540)) for f in files]
rows = (len(ims) + cols - 1) // cols
g = Image.new("RGB", (960 * cols, 540 * rows))
for i, im in enumerate(ims): g.paste(im, ((i % cols) * 960, (i // cols) * 540))
g.save(out, quality=85)
PY
