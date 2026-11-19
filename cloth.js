/* 0mattias.github.io · the cloth
   The paper the page is written on is knitted too: the loom (knit.js)
   knits one tile of it in the paper's own colour, under each look's own
   light, with the light and the eye at rest, and the stylesheet lays it
   over the whole page from its corner, so its stitches fall where the
   hero's do. The hero knits the cloth below its picture in that same
   yarn at rest, so the picture runs on into the paper without a seam.

   The stylesheet lays tiles knitted ahead of time at the widest gauge
   (stills/paper-*.webp) until these come, and for good where no script
   runs. Here they are knitted again at the gauge and the pixels of this
   screen, and again whenever either changes, and handed to the
   stylesheet as --cloth-day and --cloth-dusk. The context they are
   knitted on is given back as soon as they are made.

   When the look turns, the paper turns with it: the page lays the new
   look's cloth at once, and over it the old look's, which this script
   lets go of as the stylesheet's paper colour leaves the old look for
   the new. Both are read from that one colour, so the cloth beyond the
   hero and the cloth the hero knits itself turn together. */

(function () {
'use strict';

var root = document.documentElement;
var Knit = window.Knit;
if (!Knit || !Knit.pass || !Knit.fit || !Knit.gauge) return;

var TILE = [24, 30];
var PAPER = { day: [0xf6, 0xf3, 0xec], dusk: [0x23, 0x1e, 0x22] };
var LOOKS = { day: [1, 0, 0], dusk: [0, 1, 0] };

/* ------------------------------------------------------------ knitting */

var made = '', busy = false, again = false;

function encode(cv) {
  var url = '';
  try { url = cv.toDataURL('image/webp', 0.92); } catch (err) {}
  if (!/^data:image\/webp/.test(url)) {
    try { url = cv.toDataURL('image/jpeg', 0.95); } catch (err) { url = ''; }
  }
  return /^data:image\/(webp|jpeg)/.test(url) ? url : '';
}

function knit() {
  if (busy) {
    again = true;
    return;
  }
  var g = Knit.gauge(), w = TILE[0] * g.w, h = TILE[1] * g.h, size = Knit.fit(w, h);
  var key = [g.w, g.h, size[0], size[1]].join();
  if (key === made) return;
  var cv = document.createElement('canvas'), gl = null;
  cv.width = size[0];
  cv.height = size[1];
  try {
    gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  } catch (err) {
    gl = null;
  }
  var k = gl ? Knit.pass(gl) : null;
  if (!k) return;
  busy = true;
  function end() {
    k.free();
    var x = !gl.isContextLost() && gl.getExtension('WEBGL_lose_context');
    if (x) x.loseContext();
    busy = false;
    if (again) {
      again = false;
      knit();
    }
  }
  (function poll() {
    if (k.failed || gl.isContextLost()) return end();
    if (!k.ready()) {
      requestAnimationFrame(poll);
      return;
    }
    var urls = {}, ok = true;
    Object.keys(PAPER).forEach(function (look) {
      if (!ok) return;
      var p = PAPER[look];
      ok = k.draw({ flat: [p[0] / 255, p[1] / 255, p[2] / 255], look: LOOKS[look], tile: TILE, still: true, cssW: w, cssH: h });
      urls[look] = ok ? encode(cv) : '';
      ok = ok && !!urls[look];
    });
    if (ok) {
      made = key;
      Object.keys(urls).forEach(function (look) {
        root.style.setProperty('--cloth-' + look, 'url(' + urls[look] + ')');
      });
    }
    end();
  })();
}

var waiting = 0;
function soon() {
  clearTimeout(waiting);
  waiting = setTimeout(knit, 180);
}

addEventListener('resize', soon);

/* the zoom, or a screen of another density, without a resize */
(function dense() {
  var mq = matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)'), once = function () {
    if (mq.removeEventListener) mq.removeEventListener('change', once);
    else if (mq.removeListener) mq.removeListener(once);
    soon();
    dense();
  };
  if (mq.addEventListener) mq.addEventListener('change', once);
  else if (mq.addListener) mq.addListener(once);
})();

/* ------------------------------------------------------------- turning */
/* The old look's cloth, laid over the new one's while the paper turns.
   How much of it shows is how far the paper's colour still is from the
   new look's, along the way from the old look's */

var over = null, raf = 0;

function colour() {
  var s = '';
  try { s = getComputedStyle(root).getPropertyValue('--paper').trim(); } catch (err) {}
  var m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    var n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  return null;
}

function share() {
  var look = root.getAttribute('data-look') === 'dusk' ? 'dusk' : 'day';
  var to = PAPER[look], from = PAPER[look === 'day' ? 'dusk' : 'day'], c = colour();
  if (!c) return 0;
  var d = 0, l = 0;
  for (var i = 0; i < 3; i++) {
    d += (c[i] - to[i]) * (from[i] - to[i]);
    l += (from[i] - to[i]) * (from[i] - to[i]);
  }
  return l > 0 ? Math.max(0, Math.min(1, d / l)) : 0;
}

function frame() {
  raf = 0;
  if (!over) {
    over = document.createElement('div');
    over.className = 'cloth';
    over.setAttribute('aria-hidden', 'true');
    document.body.appendChild(over);
  }
  var k = share();
  over.style.opacity = k.toFixed(4);
  over.style.visibility = k > 0.002 ? 'visible' : 'hidden';
  if (k > 0.002 || root.classList.contains('turning')) raf = requestAnimationFrame(frame);
}

new MutationObserver(function () {
  if (!raf && document.body) raf = requestAnimationFrame(frame);
}).observe(root, { attributes: true, attributeFilter: ['data-look'] });

knit();

})();
