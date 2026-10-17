"""Render the hero's stills: the picture each look shows before the live
one is up, and in its place where it cannot run.

sky.js renders them itself, in WebKit, through a stub that steps its
clock, so they match the live picture's first frame. Each look gets a
wide still (every frame at least 1.5:1 is laid out alike, so a still at
4:1 matches any of them up to that, a 32:9 screen included, cropped to
the sides) and a tall one (every frame up to 0.7:1, phones and portrait
tablets). The new moon is set, so the live moon comes out at its own
phase as the picture fades in. The stills are written to
stills/<look>-<wide|tall>.webp, and a tiny copy of each goes into
style.css as the glimpse the page paints, blurred, before anything has
loaded.

Run:  uv run --with playwright==1.62.0 --with pillow python tools/stills.py
(once: uv run --with playwright==1.62.0 playwright install webkit)
"""

import base64
import io
import re
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent
LOOKS = ["day", "dusk", "night"]
FRAMES = {"wide": (3600, 900), "tall": (840, 1200)}
GLIMPSE = {"wide": (120, 30), "tall": (21, 30)}

STUB = """<script>
(function () {
  var q = [], clock = 0, id = 0;
  window.requestAnimationFrame = function (cb) { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = function (i) { q = q.filter(function (e) { return e[0] !== i; }); };
  performance.now = function () { return clock; };
  Object.defineProperty(document, 'hidden', { get: function () { return false; } });
  window.ResizeObserver = undefined;
  window.IntersectionObserver = undefined;
  var RealDate = Date, moonless = RealDate.UTC(2000, 0, 6, 18, 14);
  window.Date = function () { return arguments.length ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))() : new RealDate(moonless); };
  window.Date.UTC = RealDate.UTC;
  window.Date.now = function () { return moonless; };
  window.Date.prototype = RealDate.prototype;
  window.__step = function (n, dt) {
    for (var i = 0; i < n; i++) {
      clock += dt;
      var cur = q; q = [];
      cur.forEach(function (e) { e[1](clock); });
    }
  };
})();
</script>
"""


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            html = (REPO / "index.html").read_text()
            # the page's security policy would refuse the stub; it is dropped here
            html = re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>', "", html)
            tag = '<script src="/sky.js" defer></script>'
            body = html.replace(tag, STUB + "    " + tag).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def render(page, look, size):
    w, h = size
    page.set_viewport_size({"width": w, "height": h})
    page.goto("/?look=" + look)
    for _ in range(2000):
        done = page.evaluate("() => { __step(1, 16); return document.getElementById('sky').classList.contains('drawn') || document.documentElement.classList.contains('still'); }")
        if done:
            break
        page.wait_for_timeout(5)
    url = page.evaluate("() => { __step(40, 16); var c = document.getElementById('sky'); return c.classList.contains('drawn') ? c.toDataURL('image/png') : ''; }")
    if not url:
        raise SystemExit("the picture did not draw for %s at %dx%d" % (look, w, h))
    return Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))).convert("RGB")


def glimpse(img, size):
    small = img.resize(size, Image.LANCZOS)
    buf = io.BytesIO()
    small.save(buf, "WEBP", quality=70, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(REPO)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    out = REPO / "stills"
    out.mkdir(exist_ok=True)
    css = (REPO / "style.css").read_text()
    with sync_playwright() as p:
        browser = p.webkit.launch()
        page = browser.new_page(base_url="http://127.0.0.1:%d" % server.server_address[1], device_scale_factor=1)
        for look in LOOKS:
            for kind, size in FRAMES.items():
                img = render(page, look, size)
                path = out / ("%s-%s.webp" % (look, kind))
                img.save(path, "WEBP", quality=76, method=6)
                data = glimpse(img, GLIMPSE[kind])
                css, n = re.subn(r"(--glimpse-%s-%s: )url\([^)]*\)" % (look, kind), lambda m: m.group(1) + "url(" + data + ")", css)
                if n != 1:
                    raise SystemExit("style.css has no --glimpse-%s-%s" % (look, kind))
                print("%s  %dx%d  %d KB, glimpse %d B" % (path.relative_to(REPO), img.width, img.height, path.stat().st_size // 1024, len(data)))
        browser.close()
    server.shutdown()
    (REPO / "style.css").write_text(css)


if __name__ == "__main__":
    main()
