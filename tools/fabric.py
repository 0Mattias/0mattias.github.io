"""Knit the relief the hero's stills wear: the loom's own fabric, knitted
in middle grey, as a tile a stylesheet can lay.

The tile is the one knit.js describes at its head: a canvas of
Knit.fit(24 kw, 30 kh) px drawn with { flat: [0.5, 0.5, 0.5], tile:
[24, 30], still: true, cssW: 24 kw, cssH: 30 kh }, at two device px to
the CSS px and the widest stitch the page knits (kw 11, so 264 CSS px
square and 528 px of picture). Everything that tells one stitch from
another repeats every 24 stitches and 30 rows, so laid from the page's
corner at calc(var(--kw) * 24) by calc(var(--kh) * 30) it falls on the
page's lattice stitch for stitch, and middle grey comes back as middle
grey on average: laid over a picture with a blend that leaves 50%
alone, it is the relief alone. The live canvases are given the same
tile, so the knitting they draw over the still is the same knitting.

The paper is knitted the same way, in the paper's own colour and each
look's own light, as the page's cloth before a script has knitted it at
the screen's gauge (cloth.js), and for good where no script runs: one
tile for each look, written to stills/paper-day.webp and
stills/paper-dusk.webp. Laid from the page's corner they are the stitches
the hero's ground is knitted in, so the picture runs on into them.

It is written to stills/knit.webp: WebP, as the stills are. The relief
is fine and busy (its grey runs 30 to 220) and will not pack: a PNG of
it is 500 KB and lossless WebP 300 KB, where lossy WebP at quality 75
is 60 KB and keeps it within 3.5 levels on average, its ply a little
softened at three times the size and nothing a picture under it would
show. Every browser the page is drawn in reads it.

The loom is driven in WebKit on this machine's GPU, as tools/stills.py
drives the meadow; --browser chrome drives Chrome (ANGLE) instead, and
--check knits a canvas of two tiles each way and compares it against
the tile laid four times; --png PATH also writes the loom's picture
lossless.

Run:  uv run --with playwright==1.62.0 --with pillow python tools/fabric.py
(once: uv run --with playwright==1.62.0 playwright install webkit)
"""

import argparse
import base64
import io
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "stills" / "knit.webp"
PAPERS = {"day": ([0xF6, 0xF3, 0xEC], [1, 0, 0]), "dusk": ([0x23, 0x1E, 0x22], [0, 1, 0])}
KW = 11
TILE = (24, 30)
DPR = 2
QUALITY = 75

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>fabric</title>
<script src="/knit.js"></script>
</head>
<body>
<script>
document.documentElement.style.setProperty('--kw', '%dpx');
document.documentElement.style.setProperty('--kh', 'calc(var(--kw) * 0.8)');
window.knit = function (n, m, tile, flat, look) {
  var g = Knit.gauge(), w = n * g.w, h = m * g.h, size = Knit.fit(w, h);
  var c = document.createElement('canvas');
  c.width = size[0];
  c.height = size[1];
  var gl = c.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
  var k = Knit.pass(gl);
  if (!k) return Promise.reject(new Error('no WebGL2 here'));
  return new Promise(function (done, fail) {
    (function poll() {
      if (k.failed) return fail(new Error('the loom did not link'));
      if (!k.ready()) return requestAnimationFrame(poll);
      if (!k.draw({ flat: flat || [0.5, 0.5, 0.5], look: look || [1, 0, 0], tile: tile || [n, m], still: true, cssW: w, cssH: h })) return fail(new Error('the loom did not draw'));
      done({ gauge: [g.w, g.h], css: [w, h], size: size, dpr: devicePixelRatio, png: c.toDataURL('image/png') });
    })();
  });
};
</script>
</body>
</html>
""" % KW


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/__fabric":
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def knit(page, n, m, tile=None, flat=None, look=None):
    page.goto("/__fabric")
    r = page.evaluate("([n, m, tile, flat, look]) => knit(n, m, tile, flat, look)", [n, m, tile, flat, look])
    img = Image.open(io.BytesIO(base64.b64decode(r["png"].split(",", 1)[1]))).convert("RGB")
    return r, img


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--browser", default="webkit", choices=["webkit", "chrome"])
    a.add_argument("--out", default=str(OUT))
    a.add_argument("--check", action="store_true")
    a.add_argument("--png", help="also write the loom's picture, lossless, there")
    a.add_argument("--what", default="all", choices=["all", "relief", "paper"], help="the relief, the paper tiles, or both")
    o = a.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(REPO)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        browser = p.webkit.launch() if o.browser == "webkit" else p.chromium.launch(channel="chrome")
        page = browser.new_page(base_url="http://127.0.0.1:%d" % server.server_address[1],
                                viewport={"width": 1600, "height": 1000}, device_scale_factor=DPR)
        if o.what in ("all", "paper"):
            for look, (rgb, weights) in PAPERS.items():
                rp, tile = knit(page, TILE[0], TILE[1], None, [c / 255 for c in rgb], weights)
                path = REPO / "stills" / ("paper-%s.webp" % look)
                tile.save(path, "WEBP", quality=QUALITY, method=6)
                mean = ImageStat.Stat(tile).mean
                print("wrote %s: %d bytes, %dx%d; mean %.1f %.1f %.1f against the paper's %s" % (
                    path, path.stat().st_size, tile.width, tile.height, mean[0], mean[1], mean[2], rgb))
            if o.what == "paper":
                browser.close()
                server.shutdown()
                return
        r, img = knit(page, *TILE)
        print("gauge %s CSS px, tile %s CSS px, canvas %s px at dpr %s" % (r["gauge"], r["css"], r["size"], r["dpr"]))
        if r["gauge"] != [KW, KW * 0.8] or r["size"] != [round(TILE[0] * KW * DPR), round(TILE[1] * KW * 0.8 * DPR)]:
            raise SystemExit("the loom did not knit at the gauge asked for")
        out = Path(o.out)
        out.parent.mkdir(exist_ok=True)
        img.save(out, "WEBP", quality=QUALITY, method=6)
        if o.png:
            img.save(o.png, "PNG")
        back = Image.open(out).convert("RGB")
        diff = ImageChops.difference(img, back)
        mean = ImageStat.Stat(img).mean
        print("wrote %s: %d bytes, %dx%d; mean %.2f %.2f %.2f; webp against the loom: mean %.2f, worst %d levels" % (
            out, out.stat().st_size, img.width, img.height, mean[0], mean[1], mean[2],
            sum(ImageStat.Stat(diff).mean) / 3, max(b[1] for b in diff.getextrema())))
        if o.check:
            # the same tile twice over: it must be the tile laid twice, every way
            r2, two = knit(page, TILE[0] * 2, TILE[1] * 2, list(TILE))
            w, h = img.size
            worst = 0
            for x in (0, w):
                for y in (0, h):
                    d = ImageChops.difference(two.crop((x, y, x + w, y + h)), img)
                    worst = max(worst, max(b[1] for b in d.getextrema()))
            print("check: a 2x2 draw against the tile laid four times: worst %d levels" % worst)
        browser.close()
    server.shutdown()


if __name__ == "__main__":
    main()
