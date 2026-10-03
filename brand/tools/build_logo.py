"""Build the Gruffles Charts SVG logos with text as outlines (no font needed to view them).

usage: python build_logo.py   (writes ../logo/*.svg)
Needs fonttools + brotli. Uses the engine's own Bricolage Grotesque variable font at weight 800.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, '../../bar-race/engine/vendor/fonts/3y9H6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiawA1Xp.woff2')
OUT = os.path.join(HERE, '../logo')

INK, PINK, YELLOW, CYAN, CORAL, MINT, LILAC, WHITE = '#111111', '#FF9ACB', '#FFE14D', '#5CE1E6', '#FF5E5B', '#7BF1A8', '#B79CFF', '#FFFFFF'

_fonts = {}
def font(wght):
    if wght not in _fonts:
        _fonts[wght] = instantiateVariableFont(TTFont(FONT), {'wght': wght})
    return _fonts[wght]


def text_path(s, size, x, y, wght=800, tracking=-0.01):
    """SVG path data for s, baseline at y, starting at x. Returns (d, width)."""
    f = font(wght)
    upm, cmap, gs, hmtx = f['head'].unitsPerEm, f.getBestCmap(), f.getGlyphSet(), f['hmtx']
    k = size / upm
    pen = SVGPathPen(gs)
    cx = 0.0
    for ch in s:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x + cx, y)))
        cx += hmtx[g][0] * k + tracking * size
    return pen.getCommands(), cx - tracking * size


def cap_height(size, wght=800):
    f = font(wght)
    return f['OS/2'].sCapHeight * size / f['head'].unitsPerEm


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">\n{body}\n</svg>\n'


def pill(x, y, w, h, fill, stroke=6, shadow=8):
    r = h / 2
    return (f'<rect x="{x + shadow:.1f}" y="{y + shadow:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r:.1f}" fill="{INK}"/>'
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r:.1f}" fill="{fill}" stroke="{INK}" stroke-width="{stroke}"/>')


def bars_mark(x, y, scale=1.0):
    """The race mark: three pill bars of falling length, like a leaderboard."""
    out, bh, gap = [], 34 * scale, 14 * scale
    for i, (w, c) in enumerate([(150, YELLOW), (112, CYAN), (78, CORAL)]):
        out.append(pill(x, y + i * (bh + gap), w * scale, bh, c, stroke=5 * scale, shadow=6 * scale))
    return ''.join(out), 150 * scale + 6 * scale, 3 * bh + 2 * gap + 6 * scale


def charts_tag(x, y, size, fill=CORAL, ink=INK):
    """The 'CHARTS' pill, styled like the engine's NEW #1 tag."""
    h = size * 1.9
    d, tw = text_path('CHARTS', size, 0, 0, wght=800, tracking=0.12)
    w = tw + size * 1.6
    ch = cap_height(size)
    d, _ = text_path('CHARTS', size, x + size * 0.8, y + h / 2 + ch / 2, wght=800, tracking=0.12)
    return pill(x, y, w, h, fill, stroke=size * 0.2, shadow=size * 0.28) + f'<path d="{d}" fill="{ink}"/>', w, h


def wordmark_stack(fill_word=INK, sticker=False):
    """Primary logo: race mark + 'Gruffles' + CHARTS tag."""
    size = 200
    mark, mw, mh = bars_mark(20, 40, 1.35)
    tx = 20 + mw + 44
    ch = cap_height(size)
    base = 40 + ch + 6
    d, tw = text_path('Gruffles', size, tx, base)
    word = ''
    if sticker:
        sd, _ = text_path('Gruffles', size, tx + 12, base + 12)
        word += f'<path d="{sd}" fill="{INK}" stroke="{INK}" stroke-width="16" stroke-linejoin="round"/>'
        word += f'<path d="{d}" fill="{fill_word}" stroke="{INK}" stroke-width="16" stroke-linejoin="round" paint-order="stroke"/>'
    else:
        word += f'<path d="{d}" fill="{fill_word}"/>'
    tag, gw, gh = charts_tag(tx + 6, base + 62, 46)
    w = max(tx + tw, tx + gw) + 40
    h = base + 62 + gh + 40
    return svg(w, h, mark + word + tag)


def wordmark_inline(word_fill=INK, tag_fill=CORAL):
    """One-line logo for banners, end cards and watermarks."""
    size = 120
    ch = cap_height(size)
    base = 30 + ch
    d, tw = text_path('Gruffles', size, 30, base)
    tag, gw, gh = charts_tag(30 + tw + 28, base - ch / 2 - 46 * 1.9 / 2, 46, fill=tag_fill)
    return svg(30 + tw + 28 + gw + 40, base + 50, f'<path d="{d}" fill="{word_fill}"/>' + tag)


def icon(bg=PINK):
    """Square app/favicon mark: the race bars on a pink tile."""
    s = 512
    mark, mw, mh = bars_mark(0, 0, 2.2)
    ox, oy = (s - mw) / 2, (s - mh) / 2
    mark, _, _ = bars_mark(ox, oy, 2.2)
    return svg(s, s, f'<rect width="{s}" height="{s}" rx="112" fill="{bg}"/>' + mark)


os.makedirs(OUT, exist_ok=True)
files = {
    'gruffles-charts-logo.svg': wordmark_stack(),
    'gruffles-charts-logo-sticker.svg': wordmark_stack(fill_word=YELLOW, sticker=True),
    'gruffles-charts-logo-white.svg': wordmark_stack(fill_word=WHITE, sticker=True),
    'gruffles-charts-inline.svg': wordmark_inline(),
    'gruffles-charts-inline-white.svg': wordmark_inline(word_fill=WHITE),
    'gruffles-icon.svg': icon(),
}
for name, s in files.items():
    open(os.path.join(OUT, name), 'w').write(s)
    print('wrote', name)
