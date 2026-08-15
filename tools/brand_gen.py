"""Redraw the brand set: crest.svg, og.png (1200x630), apple-touch-icon.png.

The crest is the personal cut of the house artwork shared with
anaphase.ai: one hairline icosphere cage over a white glow, ink on
paper, drawn by the same recipe as the company seal but at its own
seed and rotation, so the two marks are siblings rather than copies.
The sphere machinery is ported from anaphaseassets/gen/svg.py.

og.png is the page's own letterhead rather than separate artwork, so
the card a stranger sees in a link preview is the sheet they land on:
the crest over the name in Charter, the dateline in the system mono,
on lit, grained paper. Drawn at 2x and downsampled so the hairlines
stay crisp.

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
ACCENT = (154, 74, 18)    # --accent, umber: the person's, never the company's

INK_HEX = "#211f19"

CHARTER = "/System/Library/Fonts/Supplemental/Charter.ttc"
MENLO = "/System/Library/Fonts/Menlo.ttc"

# The personal cut: its own seed and rotation. The company seal sits at
# seed 41, rot (0.45, 0.30, 0.06); this face is nobody else's.
CREST_SEED = 18
CREST_ROT = (0.62, -0.41, 0.08)
CREST_STRENGTH = 0.62


# ---------------------------------------------------------------- geometry
# Ported from anaphaseassets/gen/svg.py so the cage is the house cage.
def icosphere_levels(max_level):
    """Return [(verts, edges)] per subdivision level, verts on unit sphere."""
    phi = (1 + 5**0.5) / 2

    def norm(v):
        n = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
        return (v[0] / n, v[1] / n, v[2] / n)

    vs = [norm(v) for v in [
        (-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0),
        (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi),
        (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1),
    ]]
    faces = [
        (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
        (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
        (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
        (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1),
    ]
    levels = []
    for lvl in range(max_level + 1):
        edges = set()
        for f in faces:
            for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
                edges.add((min(a, b), max(a, b)))
        levels.append((list(vs), sorted(edges)))
        if lvl == max_level:
            break
        cache = {}

        def mid(a, b):
            key = (min(a, b), max(a, b))
            if key not in cache:
                va, vb = vs[a], vs[b]
                vs.append(norm(((va[0] + vb[0]) / 2,
                                (va[1] + vb[1]) / 2,
                                (va[2] + vb[2]) / 2)))
                cache[key] = len(vs) - 1
            return cache[key]

        nf = []
        for a, b, c in faces:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            nf += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        faces = nf
    return levels


LEVELS_GEO = icosphere_levels(3)

# (level, radius_factor, width, base_opacity) - coarse cage slightly larger.
LEVEL_STYLE = [
    (0, 1.035, 1.30, 0.30),
    (1, 1.018, 0.92, 0.26),
    (2, 1.006, 0.62, 0.20),
    (3, 1.000, 0.42, 0.125),
]


def rotated(v, ax, ay, az):
    x, y, z = v
    c, s = math.cos(ax), math.sin(ax)
    y, z = c * y - s * z, s * y + c * z
    c, s = math.cos(ay), math.sin(ay)
    x, z = c * x + s * z, -s * x + c * z
    c, s = math.cos(az), math.sin(az)
    x, y = c * x - s * y, s * x + c * y
    return (x, y, z)


def project(v, cx, cy, radius):
    x, y, z = v
    p = 1.0 / (1.0 - 0.10 * z)  # slight perspective, +z toward viewer
    return (cx + radius * x * p, cy - radius * y * p, z)


def cage(rnd, cx, cy, radius, rot, strength=1.0):
    """One sphere as draw lists: (segments, glints, dots).

    segments: (x1, y1, x2, y2, width, opacity)
    glints:   the same shape, round-capped near-silhouette surges
    dots:     (x, y, r, opacity) hub joints
    """
    segments, glint_pool, dots = [], [], []
    for lvl, rf, wdt, base in LEVEL_STYLE:
        verts, edges = LEVELS_GEO[lvl]
        rv = [rotated(v, *rot) for v in verts]
        pts = [project(v, cx, cy, radius * rf) for v in rv]
        for a, b in edges:
            x1, y1, z1 = pts[a]
            x2, y2, z2 = pts[b]
            zm = (z1 + z2) / 2
            front = zm >= 0
            # limb weighting: rim proximity of the edge midpoint, projected
            rho = min(1.0, math.hypot((x1 + x2) / 2 - cx,
                                      (y1 + y2) / 2 - cy) / (radius * rf))
            op = base * strength
            if front:
                op *= 0.38 + 0.62 * rho**2.2  # denser at the rim
                w = wdt
            else:
                op *= 0.26  # depth fog
                w = wdt * 0.82
            segments.append((x1, y1, x2, y2, w, max(op, 0.012)))
            if lvl == 1 and front and zm < 0.45 and rho > 0.72:
                glint_pool.append((x1, y1, x2, y2, wdt))
    glints = []
    for x1, y1, x2, y2, wdt in rnd.sample(glint_pool, min(8, len(glint_pool))):
        glints.append((x1, y1, x2, y2, wdt, (0.30 + rnd.random() * 0.18) * strength))
    for lvl, rf, r_dot, op_f, op_b in ((0, 1.035, 2.3, 0.55, 0.13),
                                       (1, 1.018, 1.25, 0.26, 0.0)):
        verts = LEVELS_GEO[lvl][0]
        for v in verts:
            x, y, z = project(rotated(v, *rot), cx, cy, radius * rf)
            if z > 0.08 and op_f:
                dots.append((x, y, r_dot, op_f * strength))
            elif z <= 0.08 and op_b:
                dots.append((x, y, r_dot * 0.7, op_b * strength))
    return segments, glints, dots


# ---------------------------------------------------------------- crest.svg
def crest_svg():
    """The crest at its native drawing size, scaled as a group so the
    hairlines keep their weight relative to the sphere at any display
    size, exactly the way the company seal is built."""
    box = 320
    c = box / 2
    r_disp = 76.0          # glow disc r*2.1 = 159.6, inside the box
    k = r_disp / 44.0      # native stroke density lives at r=44
    rnd = random.Random(CREST_SEED)
    segments, glints, dots = cage(rnd, c, c, 44.0, CREST_ROT,
                                  strength=CREST_STRENGTH)

    groups = {}
    for x1, y1, x2, y2, w, op in segments:
        key = (round(w, 2), round(op * 50) / 50)
        groups.setdefault(key, []).append(f"M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}")

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box} {box}">',
        "<!-- Mattias Rask. The personal cut of the anaphase light system: "
        "one hairline icosphere over a white glow. Generated by "
        "tools/brand_gen.py; edit the generator, not this file. -->",
        '<defs><radialGradient id="glow" cx="50%" cy="50%" r="50%">'
        '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>'
        '<stop offset="48%" stop-color="#ffffff" stop-opacity="0.34"/>'
        '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>'
        "</radialGradient></defs>",
        f'<circle cx="{c}" cy="{c}" r="{r_disp * 2.1:.0f}" fill="url(#glow)" '
        'opacity="0.6"/>',
        f'<g transform="translate({c} {c}) scale({k:.4f}) translate({-c} {-c})">',
    ]
    for (w, op), segs in sorted(groups.items()):
        parts.append(f'<path d="{"".join(segs)}" stroke="{INK_HEX}" '
                     f'stroke-width="{w}" opacity="{op}" fill="none"/>')
    for x1, y1, x2, y2, w, op in glints:
        parts.append(f'<path d="M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}" '
                     f'stroke="{INK_HEX}" stroke-width="{w:.2f}" '
                     f'opacity="{op:.2f}" fill="none" stroke-linecap="round"/>')
    for x, y, r, op in dots:
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" '
                     f'fill="{INK_HEX}" opacity="{op:.2f}"/>')
    parts.append("</g></svg>")

    out = REPO / "crest.svg"
    out.write_text("\n".join(parts) + "\n")
    return out


# ---------------------------------------------------------------- rasters
def crush(path):
    """The grain is the payload, so only lossless crushing is allowed."""
    try:
        import oxipng
    except ImportError:
        return
    path.write_bytes(oxipng.optimize_from_memory(
        path.read_bytes(), level=6, strip=oxipng.StripChunks.safe()))


def grained_paper(w, h, lifts):
    """Lit paper rather than flat fill: white lifts where the light
    stands, a breath of vignette, and grain. lifts is a list of
    (cx, cy, spread, strength)."""
    d = 8
    atmo = Image.new("RGB", (w // d, h // d))
    px = atmo.load()
    for ay in range(h // d):
        for ax in range(w // d):
            x, y = ax * d + d / 2, ay * d + d / 2
            lift = 0.0
            for cx, cy, spread, strength in lifts:
                rr = math.hypot(x - cx, y - cy) / spread
                lift += math.exp(-rr * rr * 1.4) * strength
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


def draw_cage(img, cx, cy, r_disp, s):
    """The crest onto a raster: the same draw lists, alpha-composited."""
    rnd = random.Random(CREST_SEED)
    k = r_disp / 44.0
    segments, glints, dots = cage(rnd, 0.0, 0.0, 44.0, CREST_ROT,
                                  strength=CREST_STRENGTH)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x1, y1, x2, y2, w, op in segments + glints:
        d.line([(cx + x1 * k, cy + y1 * k), (cx + x2 * k, cy + y2 * k)],
               fill=INK + (round(op * 255),),
               width=max(1, round(w * k * s / 2)))
    for x, y, r, op in dots:
        rr = r * k
        d.ellipse([cx + x * k - rr, cy + y * k - rr,
                   cx + x * k + rr, cy + y * k + rr],
                  fill=INK + (round(op * 255),))
    img.alpha_composite(layer)


def og_card():
    s = 2
    w, h = 1200 * s, 630 * s
    crest_cx, crest_cy, crest_r = w / 2, 218 * s, 92 * s

    img = grained_paper(w, h, [
        (w / 2, 150 * s, 340 * s, 0.030),     # the sheet's own light
        (crest_cx, crest_cy, 170 * s, 0.055), # the crest's glow
    ]).convert("RGBA")

    draw_cage(img, crest_cx, crest_cy, crest_r, s)
    d = ImageDraw.Draw(img)

    name = ImageFont.truetype(CHARTER, 86 * s, index=0)
    fitting = ImageFont.truetype(MENLO, 25 * s, index=0)

    d.text((w / 2, 434 * s), "Mattias Rask", font=name, fill=INK, anchor="ms")
    d.text((w / 2, 492 * s), "security tools · AI agents · low-level systems",
           font=fitting, fill=QUIET, anchor="ms")
    d.text((w / 2, 540 * s), "Boston, MA · 0mattias.github.io",
           font=fitting, fill=QUIET, anchor="ms")

    out = REPO / "og.png"
    img.convert("RGB").resize((1200, 630), Image.LANCZOS).save(out)
    crush(out)
    return out


def favicon_ico():
    """The registry chip for the browsers that still ask for /favicon.ico:
    the umber plate, corners rounded the way the inline SVG rounds them,
    with the paper Charter M. Modern browsers take the SVG link instead."""
    s = 4
    size = 48 * s
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1],
                        radius=round(size * 13 / 64), fill=ACCENT + (255,))

    letter = ImageFont.truetype(CHARTER, round(31.5 * s), index=0)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((0, 0), "M", font=letter, fill=PAPER + (255,))
    box = layer.getbbox()
    img.alpha_composite(layer, ((size - (box[2] - box[0])) // 2 - box[0],
                                (size - (box[3] - box[1])) // 2 - box[1]))

    out = REPO / "favicon.ico"
    img.resize((48, 48), Image.LANCZOS).save(
        out, format="ICO", sizes=[(48, 48), (32, 32), (16, 16)])
    return out


def touch_icon():
    """Full bleed: iOS rounds the corners itself, so the source stays square.
    The umber plate with a paper Charter M, matching the inline favicon."""
    s = 4
    size = 180 * s
    img = Image.new("RGB", (size, size), ACCENT)

    letter = ImageFont.truetype(CHARTER, 132 * s, index=0)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((0, 0), "M", font=letter, fill=PAPER + (255,))
    box = layer.getbbox()
    img.paste(layer, ((size - (box[2] - box[0])) // 2 - box[0],
                      (size - (box[3] - box[1])) // 2 - box[1]), layer)

    out = REPO / "apple-touch-icon.png"
    img.resize((180, 180), Image.LANCZOS).save(out)
    crush(out)
    return out


for path in (crest_svg(), og_card(), touch_icon(), favicon_ico()):
    print(f"wrote {path.relative_to(REPO)}")
