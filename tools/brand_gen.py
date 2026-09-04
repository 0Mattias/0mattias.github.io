"""Generate og.jpg, apple-touch-icon.png, and favicon.ico from the site
palette and macOS system fonts.

og.jpg is the hero: tools/og-sky.png is a capture of the sky canvas at a
1200x630 viewport in the dusk look (canvas.toDataURL with the context
created preserveDrawingBuffer: true, then reverted), and the name and
dateline are set over it here in Charter, matching the page's type.
The capture is not committed; with it missing the old paper card is drawn to og.png.

Run:  uv run --with pillow --with pyoxipng python tools/brand_gen.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parent.parent

PAPER = (246, 243, 236)
INK = (33, 31, 25)
QUIET = (94, 91, 78)

CHARTER = "/System/Library/Fonts/Supplemental/Charter.ttc"
MENLO = "/System/Library/Fonts/Menlo.ttc"


def crush(path):
    try:
        import oxipng
    except ImportError:
        return
    path.write_bytes(oxipng.optimize_from_memory(
        path.read_bytes(), level=6, strip=oxipng.StripChunks.safe()))


def og_card():
    s = 2
    w, h = 1200 * s, 630 * s
    sky = REPO / "tools" / "og-sky.png"

    if sky.exists():
        img = Image.open(sky).convert("RGB")
        k = max(w / img.width, h / img.height)
        img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
        x0 = (img.width - w) // 2
        y0 = (img.height - h) // 2
        img = img.crop((x0, y0, x0 + w, y0 + h))

        name = ImageFont.truetype(CHARTER, 146 * s // 2, index=0)
        dateline = ImageFont.truetype(CHARTER, 37 * s // 2, index=0)
        lines = [("Mattias Rask", name, 268 * s, 255),
                 ("security tools · AI agents · low-level systems · Boston, MA", dateline, 334 * s, 220)]

        shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        for text, font, y, _ in lines:
            sd.text((w / 2, y + 2 * s), text, font=font, fill=(20, 30, 60, 60), anchor="ms")
        shadow = shadow.filter(ImageFilter.GaussianBlur(9 * s))
        img = Image.alpha_composite(img.convert("RGBA"), shadow)

        type_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        td = ImageDraw.Draw(type_layer)
        for text, font, y, alpha in lines:
            td.text((w / 2, y), text, font=font, fill=PAPER + (alpha,), anchor="ms")
        img = Image.alpha_composite(img, type_layer).convert("RGB")
    else:
        img = Image.new("RGB", (w, h), PAPER)
        d = ImageDraw.Draw(img)
        name = ImageFont.truetype(CHARTER, 92 * s, index=0)
        fitting = ImageFont.truetype(MENLO, 25 * s, index=0)
        d.text((w / 2, 306 * s), "Mattias Rask", font=name, fill=INK, anchor="ms")
        d.text((w / 2, 368 * s), "security tools · AI agents · low-level systems",
               font=fitting, fill=QUIET, anchor="ms")
        d.text((w / 2, 416 * s), "Boston, MA · 0mattias.github.io",
               font=fitting, fill=QUIET, anchor="ms")

    small = img.resize((1200, 630), Image.LANCZOS)
    if sky.exists():
        out = REPO / "og.jpg"
        small.save(out, quality=92, subsampling=0, optimize=True)
        return out
    out = REPO / "og.png"
    small.save(out)
    crush(out)
    return out


def m_plate(size, radius_ratio):
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
    out = REPO / "apple-touch-icon.png"
    m_plate(180 * 4, 0).convert("RGB").resize((180, 180), Image.LANCZOS).save(out)
    crush(out)
    return out


def favicon_ico():
    out = REPO / "favicon.ico"
    m_plate(48 * 4, 13 / 64).resize((48, 48), Image.LANCZOS).save(
        out, format="ICO", sizes=[(48, 48), (32, 32), (16, 16)])
    return out


for path in (og_card(), touch_icon(), favicon_ico()):
    print(f"wrote {path.relative_to(REPO)}")
