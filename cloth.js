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
   stylesheet as --cloth-day and --cloth-dusk; the page is then marked
   clothed, and lifts the veil it lays over its paper until the picture
   comes into focus. The context they are knitted on is given back as
   soon as they are made.

   When the look turns, the paper turns with it. The hero knits its cloth
   in the paper's colour as it is at that moment, and wool in a middle
   shade shows its stitches far more than cream or plum do, so a page
   that only faded the one look's cloth into the other's would lie flat
   and grey beside the hero halfway. The way from one look to the other
   is knitted too, in rungs, each in the colour the stylesheet's paper
   passes through and under the light between the looks, and on a turn
   the page lays the two rungs either side of its paper's colour now,
   the upper one let through by how far the colour has gone between
   them. The paper's colour is read from the stylesheet, as the hero
   reads it, so the cloth beyond the hero and the cloth the hero knits
   itself turn together. */

(function () {
'use strict';

var root = document.documentElement;
var Knit = window.Knit;
function clothed() {
  root.classList.add('clothed');
}
if (!Knit || !Knit.pass || !Knit.fit || !Knit.gauge) {
  clothed();
  return;
}

var TILE = [24, 30];
var PAPER = { day: [0xf6, 0xf3, 0xec], dusk: [0x23, 0x1e, 0x22] };
/* the rungs from day (0) to dusk (1), both looks among them. Cream wool
   darkening shows its stitches fastest, so they stand closest at the
   day end: measured against the knit itself at 33 points of the way,
   these seven, crossfaded, come within three levels of it everywhere,
   where the two looks alone were 29 out halfway to grey. The ends are
   knitted first, then the rest, the widest gaps first */
var AT = [0, 1 / 16, 1 / 8, 1 / 4, 3 / 8, 1 / 2, 1];
var RUNGS = AT.length;
var ORDER = [0, 6, 3, 5, 1, 2, 4];

function rung(r) {
  var f = AT[r], a = PAPER.day, b = PAPER.dusk;
  return {
    flat: [0, 1, 2].map(function (i) { return (a[i] + (b[i] - a[i]) * f) / 255; }),
    look: [1 - f, f, 0]
  };
}

/* ------------------------------------------------------------ knitting */

/* the rungs knitted at the gauge last made, as data: URLs; their images
   are kept, decoded, so that a turn finds them ready */
var ladder = null, kept = [];
var made = '', busy = false, again = false;

function encode(cv) {
  var url = '';
  try { url = cv.toDataURL('image/webp', 0.92); } catch (err) {}
  if (!/^data:image\/webp/.test(url)) {
    try { url = cv.toDataURL('image/jpeg', 0.95); } catch (err) { url = ''; }
  }
  return /^data:image\/(webp|jpeg)/.test(url) ? url : '';
}

function keep(url) {
  var im = new Image();
  im.src = url;
  if (im.decode) im.decode().catch(function () {});
  kept.push(im);
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
  if (!k) {
    clothed();
    return;
  }
  busy = true;
  var rungs = [], next = 0;
  function end() {
    k.free();
    var x = !gl.isContextLost() && gl.getExtension('WEBGL_lose_context');
    if (x) x.loseContext();
    busy = false;
    clothed();
    if (again) {
      again = false;
      /* a ladder left part made is made again whole */
      if (next < ORDER.length) made = '';
      knit();
    }
  }
  function one(r) {
    var p = rung(r);
    if (!k.draw({ flat: p.flat, look: p.look, tile: TILE, still: true, cssW: w, cssH: h })) return false;
    rungs[r] = encode(cv);
    return !!rungs[r];
  }
  function lost() {
    return k.failed || gl.isContextLost();
  }
  /* then the rungs between, one at a time, where a turn can use them as
     soon as they are made: once the picture is up, never while the page
     turns, and not at all should another gauge be asked for meanwhile */
  function between() {
    if (lost() || again) return end();
    var c = root.classList;
    if (c.contains('turning') || !(c.contains('live') || c.contains('still') || !document.querySelector('.letterhead'))) {
      setTimeout(between, 300);
      return;
    }
    if (!one(ORDER[next])) return end();
    keep(rungs[ORDER[next]]);
    next++;
    if (next < ORDER.length) setTimeout(between, 50);
    else end();
  }
  (function poll() {
    if (lost()) return end();
    if (!k.ready()) {
      requestAnimationFrame(poll);
      return;
    }
    /* the two looks at once, and the page dressed in them */
    if (!one(ORDER[0]) || !one(ORDER[1])) return end();
    next = 2;
    made = key;
    kept = [];
    ladder = rungs;
    keep(rungs[0]);
    keep(rungs[RUNGS - 1]);
    root.style.setProperty('--cloth-day', 'url(' + rungs[0] + ')');
    root.style.setProperty('--cloth-dusk', 'url(' + rungs[RUNGS - 1] + ')');
    clothed();
    between();
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
/* Two layers over the page's own cloth while the paper turns: the rung
   at or below the paper's colour now, and over it the rung above, let
   through by how far the colour has gone from the one to the other.
   Each new picture a layer takes has it painted again, page wide, so
   when the colour passes a rung the layer that showed it goes under and
   keeps it, and only the other takes a new one. Where no rungs were
   knitted, the old look's cloth alone is laid over the new one's, let
   go of as the colour leaves the old look. */

var layers = null, raf = 0;

function layer() {
  var el = document.createElement('div');
  el.className = 'cloth';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return { el: el, url: null };
}

/* a layer showing url (the stylesheet's own cloth for ''), under or over
   the other, let through by alpha */
function lay(l, url, over, alpha) {
  if (l.url !== url) {
    l.url = url;
    l.el.style.backgroundImage = url ? 'url(' + url + ')' : '';
  }
  l.el.style.zIndex = over ? '-1' : '-2';
  l.el.style.opacity = alpha.toFixed(4);
  l.el.style.visibility = alpha > 0.002 ? 'visible' : 'hidden';
}

/* the rungs lo and hi laid, the upper let through by t, with as few new
   pictures as the layers allow */
function rungs(lo, hi, t) {
  var a = layers[0], b = layers[1];
  if (b.url === ladder[lo] || a.url === ladder[hi]) {
    a = layers[1];
    b = layers[0];
  }
  lay(a, ladder[lo], false, 1);
  lay(b, ladder[hi], true, t);
}

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

/* how far the paper's colour is on its way from day's (0) to dusk's (1) */
function along() {
  var a = PAPER.day, b = PAPER.dusk, c = colour();
  if (!c) return null;
  var d = 0, l = 0;
  for (var i = 0; i < 3; i++) {
    d += (c[i] - a[i]) * (b[i] - a[i]);
    l += (b[i] - a[i]) * (b[i] - a[i]);
  }
  return Math.max(0, Math.min(1, d / l));
}

function frame() {
  raf = 0;
  if (!layers) layers = [layer(), layer()];
  var f = along(), end = root.getAttribute('data-look') === 'dusk' ? 1 : 0;
  var on = f !== null && Math.abs(f - end) > 0.002;
  if (!on) {
    lay(layers[0], layers[0].url, false, 0);
    lay(layers[1], layers[1].url, true, 0);
  } else if (ladder) {
    /* the knitted rungs either side of the colour, and how far between */
    var lo = 0, hi = RUNGS - 1;
    for (var r = 1; r < RUNGS - 1; r++) {
      if (!ladder[r]) continue;
      if (AT[r] <= f) lo = r;
      else if (r < hi) hi = r;
    }
    rungs(lo, hi, Math.max(0, Math.min(1, (f - AT[lo]) / (AT[hi] - AT[lo]))));
  } else {
    /* the stylesheet's own cloth: the old look's, over the new one's */
    lay(layers[0], '', false, 0);
    lay(layers[1], '', true, Math.abs(f - end));
  }
  if (on || root.classList.contains('turning')) raf = requestAnimationFrame(frame);
}

/* the first rungs go down at once, before the page can paint its new
   look's cloth bare */
new MutationObserver(function () {
  if (!document.body) return;
  cancelAnimationFrame(raf);
  frame();
}).observe(root, { attributes: true, attributeFilter: ['data-look'] });

knit();

})();
