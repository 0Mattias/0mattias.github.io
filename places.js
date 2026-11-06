/* places.js · the places the hero can show

   The meadow above Zermatt is the site's own picture and the first of
   them, shown on every visit. The others are drawn by the concepts'
   stage (concepts/stage.js), each loaded the first time a visitor turns
   to it, in a layer of its own laid over the meadow: its still at once,
   the live picture over it once it is ready. The arrows beside the look
   dots step through the places, as do a sideways swipe over the picture
   and the arrow keys; ?scene= opens on one. While another place shows,
   the meadow sleeps (sky.js listens for the 'place' event); a place
   turned away from keeps its last frame for when it is turned back to. */

(function () {
'use strict';

var PLACES = [
  { id: 'meadow', name: 'Zermatt', where: 'The meadow above Zermatt, Switzerland' },
  { id: 'fjord', name: 'Nærøyfjord', where: 'Nærøyfjord, Vestland, Norway' },
  { id: 'dunes', name: 'Deadvlei', where: 'Deadvlei, Sossusvlei, Namibia' },
  { id: 'summit', name: 'Mount Fuji', where: 'Mount Fuji above the clouds, from the Southern Alps, Japan' },
  { id: 'headland', name: 'Neist Point', where: 'Neist Point, Isle of Skye, Scotland' }
];
var BASE = '/concepts/';

var root = document.documentElement;
var hero = document.querySelector('.letterhead');
var scene = hero && hero.querySelector('.scene');
var box = document.querySelector('.places');
if (!hero || !scene || !box) return;
var label = box.querySelector('.place');

var at = 0, layers = {}, queue = Promise.resolve(), staged = null;

function load(src) {
  return new Promise(function (ok, no) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = ok;
    s.onerror = no;
    document.head.appendChild(s);
  });
}

/* the stage once, then each scene in turn: a scene file leaves itself on
   window.CONCEPT, so no two may load at once */
function stage() {
  if (!staged) {
    window.CONCEPT_EMBED = true;
    staged = load(BASE + 'stage.js');
  }
  return staged;
}

function stillURL(id) {
  var look = root.getAttribute('data-look') || 'day';
  var a = innerWidth / Math.max(innerHeight, 480);
  return BASE + 'stills/' + id + '-' + look + '-' + (a > 1.2 ? 'wide' : 'tall') + '.webp';
}

function layer(id) {
  if (layers[id]) return layers[id];
  var div = document.createElement('div');
  div.className = 'alt';
  var img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  var cv = document.createElement('canvas');
  div.appendChild(img);
  div.appendChild(cv);
  scene.appendChild(div);
  var L = layers[id] = { div: div, img: img, inst: null };
  /* its still straight away, while the stage and the scene load */
  var first = new Image(), on = function () {
    if (img.getAttribute('src')) return;
    img.src = first.src;
    img.classList.add('on');
  };
  first.src = stillURL(id);
  if (first.decode) first.decode().then(on, function () {});
  else first.onload = on;
  queue = queue.then(stage).then(function () {
    window.CONCEPT = null;
    return load(BASE + 'scenes/' + id + '.js');
  }).then(function () {
    var S = window.CONCEPT;
    window.CONCEPT = null;
    if (!S || !window.ConceptStage) return;
    L.inst = window.ConceptStage(S, { canvas: cv, still: img, base: BASE });
    if (L.inst && PLACES[at].id === id) L.inst.activate();
  }).catch(function () {});
  return L;
}

function show(i) {
  at = (i + PLACES.length) % PLACES.length;
  var P = PLACES[at];
  label.textContent = P.name;
  label.title = P.where;
  root.setAttribute('data-place', P.id);
  document.dispatchEvent(new CustomEvent('place', { detail: P.id }));
  Object.keys(layers).forEach(function (k) {
    if (k === P.id) return;
    layers[k].div.classList.remove('on');
    if (layers[k].inst) layers[k].inst.deactivate();
  });
  if (P.id !== 'meadow') {
    var L = layer(P.id);
    requestAnimationFrame(function () {
      if (PLACES[at].id === P.id) L.div.classList.add('on');
    });
    if (L.inst) L.inst.activate();
  }
  try {
    var u = new URL(location.href);
    if (P.id === 'meadow') u.searchParams.delete('scene');
    else u.searchParams.set('scene', P.id);
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  } catch (err) {}
}

function step(d) {
  show(at + d);
}

/* a place still loading keeps the still of the look on show; once its
   stage is up, the stage keeps it */
Array.prototype.forEach.call(document.querySelectorAll('.looks button'), function (b) {
  b.addEventListener('click', function () {
    setTimeout(function () {
      Object.keys(layers).forEach(function (k) {
        var L = layers[k];
        if (L.inst) return;
        var url = stillURL(k), next = new Image();
        next.src = url;
        next.onload = function () {
          L.img.src = url;
          L.img.classList.add('on');
        };
      });
    }, 0);
  });
});

box.addEventListener('click', function (ev) {
  var b = ev.target.closest('button[data-step]');
  if (b) step(+b.getAttribute('data-step'));
});

/* a sideways swipe over the picture turns to the next place or back;
   the page still scrolls and zooms as ever (touch-action: pan-y) */
var sx = null, sy = 0, st = 0;
hero.addEventListener('pointerdown', function (ev) {
  if (ev.pointerType !== 'touch' || ev.target.closest('button, a')) return;
  sx = ev.clientX;
  sy = ev.clientY;
  st = performance.now();
}, { passive: true });
hero.addEventListener('pointerup', function (ev) {
  if (sx === null) return;
  var dx = ev.clientX - sx, dy = ev.clientY - sy;
  sx = null;
  if (Math.abs(dx) > 48 && Math.abs(dx) > 1.6 * Math.abs(dy) && performance.now() - st < 900) step(dx < 0 ? 1 : -1);
}, { passive: true });
hero.addEventListener('pointercancel', function () { sx = null; });

/* and the arrow keys, while the picture is on screen */
document.addEventListener('keydown', function (ev) {
  if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.defaultPrevented) return;
  if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
  var t = ev.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (hero.getBoundingClientRect().bottom < innerHeight * 0.4) return;
  step(ev.key === 'ArrowRight' ? 1 : -1);
});

var asked = null;
try { asked = new URLSearchParams(location.search).get('scene'); } catch (err) {}
var i0 = 0;
PLACES.forEach(function (P, i) { if (P.id === asked) i0 = i; });
if (i0) show(i0);

})();
