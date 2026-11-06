/* places.js · the places the hero can show

   The meadow above Zermatt is the site's own picture and the first of
   them, shown on every visit. The others are traced by the stage
   (scenes/stage.js), each scene fetched the first time a visitor turns
   to it and drawn on a canvas of its own over the meadow. While a place
   is made, the picture on show keeps moving and a hairline under the
   name fills; once the place has drawn, it fades in over the picture
   before it, both moving through the fade, and only then does the one
   it covered sleep: the meadow (sky.js listens for the 'place' event)
   or the place before. Two places are kept at most, so a turn back to
   the last one is at once.

   The arrows beside the look dots step through the places, as do a
   sideways swipe over the picture and the arrow keys; ?scene= opens on
   one, and the head of the page has told the meadow so already, so it
   does not wake only to be covered. */

(function () {
'use strict';

var PLACES = [
  { id: 'meadow', name: 'Zermatt', where: 'The meadow above Zermatt, Switzerland' },
  { id: 'fjord', name: 'Nærøyfjord', where: 'Nærøyfjord, Vestland, Norway' },
  { id: 'dunes', name: 'Deadvlei', where: 'Deadvlei, Sossusvlei, Namibia' },
  { id: 'summit', name: 'Mount Fuji', where: 'Mount Fuji above the clouds, from the Southern Alps, Japan' },
  { id: 'headland', name: 'Neist Point', where: 'Neist Point, Isle of Skye, Scotland' }
];
var BASE = '/scenes/';
/* bumped with each release, so a page never runs with another's files */
var V = '?v=20261106d';
/* the crossfade, as long as the stylesheet's */
var FADE = 900;
/* places kept on the GPU at once */
var KEEP = 2;

var root = document.documentElement;
var hero = document.querySelector('.letterhead');
var scene = hero && hero.querySelector('.scene');
var box = document.querySelector('.places');
/* set by the head of the page for ?scene=, and the meadow asleep for it */
var early = root.getAttribute('data-place');

/* this script cannot play its part: the meadow, woken if it was told to
   wait for another place */
function meadowOnly() {
  root.classList.remove('afar');
  if (!early || early === 'meadow') return;
  root.setAttribute('data-place', 'meadow');
  document.dispatchEvent(new CustomEvent('place', { detail: 'meadow' }));
}

if (!hero || !scene || !box) {
  meadowOnly();
  return;
}
/* the control is shown only once its styles are in: a page that met an
   older stylesheet (a cache holding on to it) leaves it hidden rather
   than set in the line of the name, and keeps to the meadow */
if (getComputedStyle(box).position !== 'absolute') {
  meadowOnly();
  return;
}
box.hidden = false;

var label = box.querySelector('.place');
var sky = document.getElementById('sky');
var meta = document.querySelector('meta[name="theme-color"]');
var reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* the places made, by id: { id, cv, st, theme, p, on, vis, full,
   active, used, timer, made } */
var units = {};
/* the place named, the place turned to, and the one on show or fading
   in over the rest (null on a page opened on a place not yet drawn) */
var at = 0, want = 'meadow';
var top = early && early !== 'meadow' ? null : 'meadow';
/* whether the meadow is drawing, and whether it has ever been seen: one
   never seen has nothing to show through a place fading in */
var awake = top === 'meadow', seen = awake;
var gen = 0, Z = 2, broken = false, bad = {}, tries = {};

function index(id) {
  for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return i;
  return -1;
}

function each(f) {
  Object.keys(units).forEach(function (k) { f(units[k]); });
}

/* ------------------------------------------------------------ fetching */

var staged = null, queue = Promise.resolve(), scripts = {};

function load(src) {
  return new Promise(function (ok, no) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = ok;
    s.onerror = function () {
      s.remove();
      no(new Error('network'));
    };
    document.head.appendChild(s);
  });
}

function stage() {
  if (!staged) {
    staged = load(BASE + 'stage.js' + V);
    staged.catch(function () { staged = null; });
  }
  return staged;
}

/* a scene's file, once; each leaves itself on window.PLACE, so they come
   one at a time */
function script(id) {
  if (!scripts[id]) {
    var p = queue.then(stage).then(function () {
      window.PLACE = null;
      return load(BASE + id + '.js' + V);
    }).then(function () {
      var S = window.PLACE;
      window.PLACE = null;
      if (!S || S.id !== id || !window.PlaceStage) throw new Error('network');
      return S;
    });
    scripts[id] = p;
    queue = p.catch(function () {
      if (scripts[id] === p) scripts[id] = null;
    });
  }
  return scripts[id];
}

/* ------------------------------------------------------------ the bar */
/* the same hairline the meadow fills as it is made, under the words: at
   once for a place to be made, a moment later for one made already, so
   one drawn at once shows none; it runs out and fades as the place fades
   in */

var bar = (function () {
  var el = null, fill = null, of = null, wait = 0;
  function put(p) {
    if (fill) fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)).toFixed(3) + ')';
  }
  function end(full) {
    clearTimeout(wait);
    of = null;
    if (!el) return;
    if (full) put(1);
    var b = el;
    el = fill = null;
    setTimeout(function () {
      if (!b.animate) {
        b.remove();
        return;
      }
      b.animate([{ opacity: getComputedStyle(b).opacity }, { opacity: 0 }], {
        duration: full ? 600 : 300, easing: 'ease', fill: 'forwards'
      }).onfinish = function () { b.remove(); };
    }, full && !reduced.matches ? 320 : 0);
  }
  return {
    start: function (u) {
      of = u;
      clearTimeout(wait);
      if (el) {
        put(u.p);
        return;
      }
      wait = setTimeout(function () {
        if (of !== u) return;
        el = document.createElement('span');
        fill = document.createElement('i');
        el.className = 'load soon';
        el.setAttribute('aria-hidden', 'true');
        el.appendChild(fill);
        (hero.querySelector('.words') || hero).appendChild(el);
        put(u.p);
      }, u.st ? 140 : 0);
    },
    progress: function (u) {
      if (of === u) put(u.p);
    },
    done: function (u) {
      if (of === u) end(true);
    },
    stop: function () {
      end(false);
    }
  };
})();

function progress(u, p) {
  if (!(p > u.p)) return;
  u.p = Math.min(p, 1);
  bar.progress(u);
}

/* ------------------------------------------------------------ colour */
/* the browser's own colour around the page takes the place's sky, as it
   takes the meadow's while that is on show */

function colours(t) {
  var out = ['day', 'dusk', 'night'].map(function (k) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec((t && t[k]) || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  });
  return out[0] && out[1] && out[2] ? out : null;
}

function tint(u, w) {
  if (!meta || !u.theme || root.getAttribute('data-place') !== u.id) return;
  var c = [0, 1, 2].map(function (i) {
    return Math.round(u.theme[0][i] * w[0] + u.theme[1][i] * w[1] + u.theme[2][i] * w[2]);
  });
  meta.setAttribute('content', 'rgb(' + c.join(',') + ')');
}

/* ------------------------------------------------------------ places */

function make(id) {
  var cv = document.createElement('canvas');
  cv.className = 'alt';
  cv.setAttribute('data-for', id);
  cv.setAttribute('aria-hidden', 'true');
  scene.appendChild(cv);
  var u = units[id] = {
    id: id, cv: cv, st: null, theme: null, p: 0.03,
    on: false, vis: false, full: false, active: false, dead: false, used: 0, timer: 0
  };
  u.made = script(id).then(function (S) {
    /* the stage is made once the bar is on screen: a browser that
       compiles its shaders on the page's own thread holds the page a
       moment while it does */
    return new Promise(function (r) {
      requestAnimationFrame(function () { setTimeout(function () { r(S); }, 0); });
    });
  }).then(function (S) {
    if (u.dead) throw new Error('gone');
    u.theme = colours(S.theme);
    progress(u, 0.05);
    u.st = window.PlaceStage(S, {
      canvas: cv,
      hero: hero,
      progress: function (p) { progress(u, p); },
      tint: function (w) { tint(u, w); }
    });
    u.st.onlost = function () { lost(u); };
    return u.st;
  });
  u.made.catch(function () {});
  return u;
}

function drop(u) {
  if (u.dead) return;
  u.dead = true;
  clearTimeout(u.timer);
  if (u.st) {
    u.st.onlost = null;
    u.st.destroy();
  }
  u.cv.remove();
  if (units[u.id] === u) delete units[u.id];
  if (top === u.id) top = null;
}

/* the places kept: the one on show, the one turned to, and the last one
   seen while there is room */
function trim() {
  var list = Object.keys(units).map(function (k) { return units[k]; });
  list.sort(function (a, b) { return a.used - b.used; });
  for (var i = 0, n = list.length; i < list.length && n > KEEP; i++) {
    var u = list[i];
    if (u.vis || u.id === want || u.id === top) continue;
    drop(u);
    n--;
  }
}

/* after every change: the meadow draws while it can be seen or is turned
   to, a place while it can be seen or is turned to */
function settle() {
  var cover = false;
  each(function (u) { if (u.on && u.full) cover = true; });
  meadow(want === 'meadow' || top === 'meadow' || (seen && top !== null && !cover));
  each(function (u) {
    if (u.active && !u.vis && u.id !== want) {
      u.active = false;
      if (u.st) u.st.deactivate();
    }
  });
  trim();
}

function meadow(a) {
  if (a === awake) return;
  awake = a;
  document.dispatchEvent(new CustomEvent('place', { detail: a ? 'meadow' : want }));
}

function off(u, instant) {
  clearTimeout(u.timer);
  u.on = u.full = false;
  if (instant) {
    u.cv.style.transition = 'none';
    u.cv.classList.remove('on');
    void u.cv.offsetWidth;
    u.cv.style.transition = '';
    u.vis = false;
    return;
  }
  u.cv.classList.remove('on');
  u.timer = setTimeout(function () {
    u.vis = false;
    settle();
  }, FADE + 60);
}

/* a place drawn, in the look on show: over all the rest, or, if it lies
   on beneath what was turned to over it, out from under that */
function arrive(u) {
  bar.done(u);
  top = u.id;
  clearTimeout(u.timer);
  if (u.on) {
    var z = +u.cv.style.zIndex;
    each(function (v) {
      if (v !== u && v.on && +v.cv.style.zIndex > z) off(v, false);
    });
  } else {
    u.cv.style.zIndex = String(++Z);
    u.on = u.vis = true;
    u.full = false;
    u.cv.classList.add('on');
  }
  root.classList.add('placed');
  u.timer = setTimeout(function () {
    if (top !== u.id || !u.on) return;
    u.full = true;
    /* covered now, the meadow's glimpse may come back under it */
    root.classList.remove('afar');
    var z = +u.cv.style.zIndex;
    each(function (v) {
      if (v !== u && v.vis && +v.cv.style.zIndex < z) off(v, true);
    });
    settle();
  }, FADE + 60);
  settle();
}

function go(u, g) {
  u.used = performance.now();
  if (u.id === top && u.on) {
    bar.stop();
    settle();
    return;
  }
  /* one made already has only a look to trace, if that */
  if (u.p >= 1) u.p = 0.6;
  bar.start(u);
  u.made.then(function (st) {
    if (g !== gen) return null;
    u.active = true;
    return st.activate().then(function () {
      if (g === gen && !u.dead) arrive(u);
    });
  }).catch(function (err) { trouble(u, err, g); });
}

/* back to the meadow: woken first, and the place over it fades once it
   has a picture to show, its own first build if it never had one */
function home(g) {
  bar.stop();
  meadow(true);
  if (top === 'meadow') {
    settle();
    return;
  }
  var t0 = performance.now();
  (function check() {
    if (g !== gen) return;
    var c = root.classList;
    if (!(sky && sky.classList.contains('drawn')) && !(c.contains('still') && c.contains('pic')) && performance.now() - t0 < 15000) {
      requestAnimationFrame(check);
      return;
    }
    top = 'meadow';
    seen = true;
    root.classList.remove('afar');
    each(function (v) { if (v.on) off(v, false); });
    settle();
  })();
}

/* a place that cannot be drawn: without the GPU for it, none can, and
   the control goes; otherwise it is left out, or tried again later if
   only its file failed to come */
function trouble(u, err, g) {
  /* dropped meanwhile, by whatever dropped it */
  if (u.dead) return;
  var why = err && err.message;
  drop(u);
  if (why === 'unsupported') {
    broken = true;
    box.hidden = true;
  } else if (why !== 'network') bad[u.id] = true;
  if (g !== gen) {
    settle();
    return;
  }
  bar.stop();
  show(broken || top === null ? 0 : Math.max(0, index(top)));
}

/* the GPU took a place away: made again if it is turned to, twice at
   most */
function lost(u) {
  if (u.dead) return;
  var needed = u.id === want;
  drop(u);
  if (!needed) {
    settle();
    return;
  }
  tries[u.id] = (tries[u.id] || 0) + 1;
  if (tries[u.id] > 2) bad[u.id] = true;
  show(bad[u.id] ? 0 : at);
}

function show(i) {
  at = (i + PLACES.length) % PLACES.length;
  var P = PLACES[at];
  label.textContent = P.name;
  label.title = P.where;
  root.setAttribute('data-place', P.id);
  try {
    var url = new URL(location.href);
    if (P.id === 'meadow') url.searchParams.delete('scene');
    else url.searchParams.set('scene', P.id);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } catch (err) {}
  want = P.id;
  var g = ++gen;
  /* a place turned past before it was drawn rests, or goes */
  settle();
  if (P.id === 'meadow') home(g);
  else go(units[P.id] || make(P.id), g);
}

function step(d) {
  var i = at;
  for (var n = 0; n < PLACES.length; n++) {
    i = (i + d + PLACES.length) % PLACES.length;
    if (!bad[PLACES[i].id]) break;
  }
  show(i);
}

/* ------------------------------------------------------------ wiring */

/* turns wait until the hero has a picture of its own */
function ready() {
  var c = root.classList;
  return !broken && !box.hidden && (c.contains('live') || c.contains('still') || c.contains('placed'));
}

box.addEventListener('click', function (ev) {
  var b = ev.target.closest('button[data-step]');
  if (b) step(+b.getAttribute('data-step'));
});

/* a pointer coming to the arrows fetches the places either side */
function hint() {
  if (broken) return;
  [1, -1].forEach(function (d) {
    var P = PLACES[(at + d + PLACES.length) % PLACES.length];
    if (P.id !== 'meadow' && !bad[P.id]) script(P.id).catch(function () {});
  });
}
box.addEventListener('pointerenter', hint);
box.addEventListener('focusin', hint);

/* a sideways swipe over the picture turns to the next place or back;
   the page still scrolls and zooms as ever (touch-action: pan-y) */
var sx = null, sy = 0, st0 = 0;
hero.addEventListener('pointerdown', function (ev) {
  if (ev.pointerType !== 'touch' || ev.target.closest('button, a')) return;
  sx = ev.clientX;
  sy = ev.clientY;
  st0 = performance.now();
}, { passive: true });
hero.addEventListener('pointerup', function (ev) {
  if (sx === null) return;
  var dx = ev.clientX - sx, dy = ev.clientY - sy;
  sx = null;
  if (!ready()) return;
  if (Math.abs(dx) > 48 && Math.abs(dx) > 1.6 * Math.abs(dy) && performance.now() - st0 < 900) step(dx < 0 ? 1 : -1);
}, { passive: true });
hero.addEventListener('pointercancel', function () { sx = null; });

/* and the arrow keys, while the picture is on screen */
document.addEventListener('keydown', function (ev) {
  if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.defaultPrevented) return;
  if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
  var t = ev.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (!ready() || hero.getBoundingClientRect().bottom < innerHeight * 0.4) return;
  step(ev.key === 'ArrowRight' ? 1 : -1);
});

/* a page opened on a place */
var asked = early;
if (!asked) {
  try { asked = new URLSearchParams(location.search).get('scene'); } catch (err) {}
}
var i0 = index(asked);
if (i0 > 0) show(i0);
else meadowOnly();

})();
