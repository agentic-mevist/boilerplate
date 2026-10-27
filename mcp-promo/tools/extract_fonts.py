#!/usr/bin/env python3
"""Export glyph outlines from (variable) fonts at a grid of axis locations.

TrueType variable instances share an identical point structure, so the JS
side can bilinearly interpolate outlines between grid locations and get
smooth, continuous weight/width animation per glyph. Kerning comes from
HarfBuzz shaping so GPOS pair adjustments are honoured at every location.
"""
import json
import sys
from itertools import product
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
CHARSET = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    ".,:;!?'\"-–—/&@#()+×·•→←↗*%_[]|<>= "
)


class CmdPen(BasePen):
    """Flattens any outline into M/L/Q/C/Z with explicit coordinates."""

    def __init__(self, glyphset):
        super().__init__(glyphset)
        self.types = []
        self.pts = []

    def _moveTo(self, p):
        self.types.append("M")
        self.pts += p

    def _lineTo(self, p):
        self.types.append("L")
        self.pts += p

    def _qCurveToOne(self, p1, p2):
        self.types.append("Q")
        self.pts += p1 + p2

    def _curveToOne(self, p1, p2, p3):
        self.types.append("C")
        self.pts += p1 + p2 + p3

    def _closePath(self):
        self.types.append("Z")

    def _endPath(self):
        self.types.append("Z")


def extract(path, grid, out_name):
    tt = TTFont(path)
    cmap = tt.getBestCmap()
    upm = tt["head"].unitsPerEm
    os2 = tt["OS/2"]
    hhea = tt["hhea"]
    axes_tags = list(grid.keys())
    locs = [dict(zip(axes_tags, v)) for v in product(*[grid[a] for a in axes_tags])]

    blob = hb.Blob.from_file_path(str(path))
    face = hb.Face(blob)
    hbfont = hb.Font(face)

    chars = [c for c in CHARSET if ord(c) in cmap]
    glyphs = {c: {"types": None, "pts": [], "adv": []} for c in chars}
    kern = {}

    for li, loc in enumerate(locs):
        gs = tt.getGlyphSet(location=loc if loc else None)
        for c in chars:
            gname = cmap[ord(c)]
            pen = CmdPen(gs)
            gs[gname].draw(pen)
            t = "".join(pen.types)
            g = glyphs[c]
            if g["types"] is None:
                g["types"] = t
            elif g["types"] != t:
                raise SystemExit(f"incompatible outline for {c!r} at {loc}")
            g["pts"].append([round(v, 1) for v in pen.pts])
            g["adv"].append(round(gs[gname].width, 1))

        if loc:
            hbfont.set_variations(loc)
        adv = {c: glyphs[c]["adv"][li] for c in chars}
        for a in chars:
            if a == " ":
                continue
            for b in chars:
                if b == " ":
                    continue
                buf = hb.Buffer()
                buf.add_str(a + b)
                buf.guess_segment_properties()
                hb.shape(hbfont, buf, {"kern": True, "liga": False, "calt": False})
                pos = buf.glyph_positions
                if len(pos) != 2:
                    continue
                k = pos[0].x_advance - adv[a]
                if abs(k) > 0.5:
                    kern.setdefault(a + b, [0] * len(locs))[li] = round(k, 1)

    data = {
        "name": out_name,
        "upm": upm,
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "capHeight": getattr(os2, "sCapHeight", 0) or 0,
        "xHeight": getattr(os2, "sxHeight", 0) or 0,
        "axes": axes_tags,
        "grid": {a: grid[a] for a in axes_tags},
        "glyphs": glyphs,
        "kern": kern,
    }
    out = ROOT / "src" / "fontdata" / f"{out_name}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, separators=(",", ":")))
    print(f"{out_name}: {len(chars)} glyphs x {len(locs)} locs, {len(kern)} kern pairs, {out.stat().st_size/1e6:.2f} MB")


if __name__ == "__main__":
    F = ROOT / "fonts"
    which = sys.argv[1:] or ["anybody", "serif", "mono"]
    jobs = {
        "anybody": (F / "Anybody-VF.ttf", {"wdth": [50, 75, 100, 125, 150], "wght": [100, 300, 500, 700, 900]}),
        "serif": (F / "InstrumentSerif-Italic.ttf", {}),
        "mono": (F / "JetBrainsMono-VF.ttf", {"wght": [100, 400, 800]}),
    }
    for k in which:
        extract(*jobs[k], k)
