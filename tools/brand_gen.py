"""Redraw the brand rasters: og.png (1200x630), apple-touch-icon.png,
favicon.ico.

No artwork. The og card is the letterhead and nothing else: the name in
Charter over the fittings in the system mono, centered on lit, grained
paper. Drawn at 2x and downsampled so the type stays crisp. The icons
are the ink plate with the paper Charter M, matching the inline SVG
favicon on every page.

Uses macOS system fonts. No webfonts here either. Edit this generator,
not the emitted files.

Run:  uv run --with pillow --with pyoxipng python tools/brand_gen.py
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent

PAPER = (246, 243, 236)   # --paper
INK = (33, 31, 25)        # --ink
QUIET = (94, 91, 78)      # the quiet tone, flattened onto this paper

CHARTER = "/System/Library/Fonts/Supplemental/Charter.ttc"
MENLO = "/System/Library/Fonts/Menlo.ttc"


def crush(path):
    """The grain is the payload, so only lossless crushing is allowed."""
    try:
        import oxipng
    except ImportError:
        return
    path.write_bytes(oxipng.optimize_from_memory(
        path.read_bytes(), level=6, strip=oxipng.StripChunks.safe()))


def grained_paper(w, h, cx, cy, spread, strength):
    """Lit paper rather than flat fill: a soft rise of light behind the
    name, a breath of vignette at the corners, and grain."""
    d = 8
    atmo = Image.new("RGB", (w // d, h // d))
    px = atmo.load()
    for ay in range(h // d):
        for ax in range(w // d):
            x, y = ax * d + d / 2, ay * d + d / 2
            rr = math.hypot(x - cx, y - cy) / spread
            lift = math.exp(-rr * rr * 1.4) * strength
            v = math.hypot(x / w - 0.5, y / h - 0.5) * 1.4142
            t = min(max((v - 0.55) / 0.53, 0.0), 1.0)
            vig = t * t * (3 - 2 * t) * 0.045
            px[ax, ay] = tuple(min(255, round(c * (1 + lift - vig)))
                               for c in PAPER)
    img = atmo.resize((w, h), Image.BILINEAR)

    rnd = random.Random(20260815)
    noise = Image.frombytes(
        "L", (w, h), bytes(bytearray(rnd.randrange(126, 131) for _ in range(w * h))))
    return ImageChops.add(img, noise.convert("RGB"), 1.0, -128)


def og_card():
    s = 2
    w, h = 1200 * s, 630 * s

    img = grained_paper(w, h, w / 2, 268 * s, 380 * s, 0.030)
    d = ImageDraw.Draw(img)

    name = ImageFont.truetype(CHARTER, 92 * s, index=0)
    fitting = ImageFont.truetype(MENLO, 25 * s, index=0)

    d.text((w / 2, 306 * s), "Mattias Rask", font=name, fill=INK, anchor="ms")
    d.text((w / 2, 368 * s), "security tools · AI agents · low-level systems",
           font=fitting, fill=QUIET, anchor="ms")
    d.text((w / 2, 416 * s), "Boston, MA · 0mattias.github.io",
           font=fitting, fill=QUIET, anchor="ms")

    out = REPO / "og.png"
    img.resize((1200, 630), Image.LANCZOS).save(out)
    crush(out)
    return out


def m_plate(size, radius_ratio):
    """The ink plate with the paper Charter M, at any size; the corner
    radius comes in as a ratio because iOS rounds the touch icon itself
    (ratio 0) while the favicon keeps the inline SVG's 13/64."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if radius_ratio:
        d.rounded_rectangle([0, 0, size - 1, size - 1],
                            radius=round(size * radius_ratio), fill=INK + (255,))
    else:
        d.rectangle([0, 0, size - 1, size - 1], fill=INK + (255,))

    letter = ImageFont.truetype(CHARTER, round(size * 0.66), index=0)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((0, 0), "M", font=letter, fill=PAPER + (255,))
    box = layer.getbbox()
    img.alpha_composite(layer, ((size - (box[2] - box[0])) // 2 - box[0],
                                (size - (box[3] - box[1])) // 2 - box[1]))
    return img


def touch_icon():
    """Full bleed: iOS rounds the corners itself, so the source stays
    square."""
    out = REPO / "apple-touch-icon.png"
    m_plate(180 * 4, 0).convert("RGB").resize((180, 180), Image.LANCZOS).save(out)
    crush(out)
    return out


def favicon_ico():
    """For the browsers that still ask for /favicon.ico; modern ones take
    the inline SVG link instead."""
    out = REPO / "favicon.ico"
    m_plate(48 * 4, 13 / 64).resize((48, 48), Image.LANCZOS).save(
        out, format="ICO", sizes=[(48, 48), (32, 32), (16, 16)])
    return out


for path in (og_card(), touch_icon(), favicon_ico()):
    print(f"wrote {path.relative_to(REPO)}")
