"""Capture og.jpg, the card a shared link shows: the hero as the page draws it.

The page is opened at 1200x630 at two device px to the CSS px, in the day
look, and left until the meadow is knitted (#sky.woven) and the name sewn
(h1.sewn), and a moment more for both to come up. The time-of-day dots and
the loading bar are hidden, and what is left is the card: the knitted
meadow and the name embroidered over it, as the page shows them, taken
down to 1200x630 with LANCZOS.

The knitting is fine and busy and will not pack: at quality 92 the card
is 560 KB, and some apps (WhatsApp among them) show no large preview for
a card past 300 KB. It is written at the best quality from 85 down that
comes in under 290 KB, which lands near 80 with the chroma halved, and
side by side at twice the size it is not told from the capture.

The loom is driven in WebKit on this machine's GPU, as tools/stills.py and
tools/fabric.py drive it; --browser chrome drives Chrome (ANGLE) instead.
The page's CSP is bypassed only so the dots can be hidden with a stylesheet
the test sets.

Run:  uv run --with playwright==1.62.0 --with pillow python tools/og.py
(once: uv run --with playwright==1.62.0 playwright install webkit)
"""

import argparse
import io
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "og.jpg"
W, H, DPR = 1200, 630, 2
BUDGET = 290_000
SETTLE_MS = 3000
HIDE = ".looks, .load, .skip { visibility: hidden !important; }"


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--browser", default="webkit", choices=["webkit", "chrome"])
    a.add_argument("--look", default="day", choices=["day", "dusk"])
    a.add_argument("--out", default=str(OUT))
    a.add_argument("--png", help="also write the capture, lossless, at full size there")
    o = a.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(REPO)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        browser = p.webkit.launch() if o.browser == "webkit" else p.chromium.launch(channel="chrome")
        ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=DPR, bypass_csp=True)
        page = ctx.new_page()
        page.goto("http://127.0.0.1:%d/?look=%s" % (server.server_address[1], o.look))
        page.wait_for_selector("#sky.woven", state="attached", timeout=30000)
        page.wait_for_selector("h1.name.sewn", state="attached", timeout=30000)
        page.add_style_tag(content=HIDE)
        page.wait_for_timeout(SETTLE_MS)
        shot = Image.open(io.BytesIO(page.screenshot(clip={"x": 0, "y": 0, "width": W, "height": H}))).convert("RGB")
        browser.close()
    server.shutdown()

    if o.png:
        shot.save(o.png)
    card = shot.resize((W, H), Image.LANCZOS)
    out = Path(o.out)
    for q in range(85, 59, -1):
        buf = io.BytesIO()
        card.save(buf, "JPEG", quality=q, subsampling=2, optimize=True, progressive=True)
        if buf.tell() <= BUDGET:
            break
    out.write_bytes(buf.getvalue())
    print("wrote %s: %d bytes at quality %d, %dx%d from a %dx%d capture" % (
        out, out.stat().st_size, q, W, H, shot.width, shot.height))


if __name__ == "__main__":
    main()
