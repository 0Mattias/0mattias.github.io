"""Generate apple-touch-icon.png and favicon.ico from the site palette and
macOS system fonts. og.jpg is a capture of the page's own hero, knitted
and with the name sewn, and comes from tools/og.py.

Run:  uv run --with pillow --with pyoxipng python tools/brand_gen.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent

PAPER = (246, 243, 236)
INK = (33, 31, 25)

CHARTER = "/System/Library/Fonts/Supplemental/Charter.ttc"


def crush(path):
    try:
        import oxipng
    except ImportError:
        return
    path.write_bytes(oxipng.optimize_from_memory(
        path.read_bytes(), level=6, strip=oxipng.StripChunks.safe()))


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


for path in (touch_icon(), favicon_ico()):
    print(f"wrote {path.relative_to(REPO)}")
