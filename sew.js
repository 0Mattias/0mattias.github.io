/* 0mattias.github.io · the embroidery
   Words that are sewn and not printed. Every element marked data-sew
   keeps its text where it is, for a reader, a selection and a search,
   but the eye is shown a canvas laid over it, its first child, on which
   the loom's thread (knit.js) has embroidered the very same letters:
   the browser's own layout read line by line, the mask painted from it,
   the floss sewn in a small WebGL2 context of the page's own that is
   never shown, and its picture copied onto the element's canvas. The
   canvas rides with its element, so the name rises with its stitches
   on.

   Nothing runs at rest. The lettering is sewn again when the fonts
   come, when the window or the element changes size, when another
   script changes the element's style or its words, when the look
   turns (every frame of the turn), and while the light still follows a
   pointer over lettering that is on screen. Where there is no WebGL2
   (or only one in software), no thread, no stylesheet that knows the
   thread, or the colours are forced, nothing is marked and the words
   stand as they always have; the root is marked 'sewing' only while
   there are words the thread is ready to sew. */

(function () {
'use strict';

var root = document.documentElement;
var Knit = window.Knit;
if (!Knit || !Knit.thread || !Knit.ink || !Knit.reach || !document.querySelector('[data-sew]')) return;

var reduced = matchMedia('(prefers-reduced-motion: reduce)');
var forced = matchMedia('(forced-colors: active)');
var LOOKS = { day: [1, 0, 0], dusk: [0, 1, 0], night: [0, 0, 1] };

/* how long words nobody has seen yet wait, unseen, for their first
   stitches before they are let rise as they are; and how long words
   already seen take to turn into stitches (the stylesheet's .basting) */
var WAIT = 500;
var TURN = 600;

/* what a piece of lettering wants: to be read off the page again (and
   its mask painted again if that has changed), or only to be sewn */
var MEASURE = 2, SEW = 1;

function listen(mq, f) {
  if (mq.addEventListener) mq.addEventListener('change', f);
  else if (mq.addListener) mq.addListener(f);
}

/* ----------------------------------------------------------- the thread */
/* One context for every piece of lettering, on a canvas of its own that
   is never put in the page: it grows to the largest piece, each is sewn
   into its lower left corner (the thread draws over the viewport 0, 0,
   w, h) and copied out from there. If the context is lost it is made
   again once, from the browser's restoring it or, failing that, on a
   new canvas; lost a second time, the words go back to being printed. */

var glc = null, gl = null, t = null;
var lost = false, again = false, revive = 0, over = false;

function make() {
  glc = document.createElement('canvas');
  glc.width = glc.height = 1;
  try {
    gl = glc.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
  } catch (err) {
    gl = null;
  }
  t = gl && !soft() ? Knit.thread(gl) : null;
  if (!t) {
    var x = gl && gl.getExtension('WEBGL_lose_context');
    if (x) x.loseContext();
    gl = glc = null;
    return false;
  }
  glc.addEventListener('webglcontextlost', lose);
  glc.addEventListener('webglcontextrestored', restore);
  return true;
}

/* a renderer in software, as a browser without a GPU falls back on: the
   meadow and the places stand down on one, and the words stay printed */
function soft() {
  var r = String(gl.getParameter(gl.RENDERER));
  if (/^webkit webgl$/i.test(r)) {
    var info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) r = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
}

function lose(ev) {
  ev.preventDefault();
  lost = true;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (t) t.free();
  t = null;
  if (again) {
    quit();
    return;
  }
  clearTimeout(revive);
  revive = setTimeout(function () {
    if (!lost || again) return;
    again = true;
    glc.removeEventListener('webglcontextlost', lose);
    glc.removeEventListener('webglcontextrestored', restore);
    if (!make()) {
      quit();
      return;
    }
    lost = false;
    stale(MEASURE | SEW, true);
  }, 3000);
}

function restore() {
  clearTimeout(revive);
  if (over || again) return;
  again = true;
  t = Knit.thread(gl);
  if (!t) {
    quit();
    return;
  }
  lost = false;
  /* a mask's own canvas may have lost its paint with the GPU: all of
     them are painted again */
  pieces.forEach(function (p) { p.key = ''; });
  stale(MEASURE | SEW, true);
}

/* ------------------------------------------------------------- the look */
/* The mix of looks the page shows, followed through a turn as sky.js
   follows it, from where it was to where it is going, eased alike over
   the root's --turn. */

var named = has(LOOKS, root.getAttribute('data-look')) ? root.getAttribute('data-look') : 'day';
var mixed = LOOKS[named].slice(), turn = null;

function has(o, k) {
  return typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
}

function mix(now) {
  if (!turn) return mixed;
  var k = Math.min(1, Math.max(0, (now - turn.t0) / turn.dur));
  k = k * k * (3 - 2 * k);
  mixed = turn.from.map(function (v, i) { return v + (turn.to[i] - v) * k; });
  if (k >= 1) turn = null;
  return mixed;
}

/* a time as the stylesheet writes it, in ms */
function ms(v) {
  var n = parseFloat(v) || 0;
  return /[^m]s\s*$/.test(v) ? n * 1000 : n;
}

function looked() {
  var name = root.getAttribute('data-look');
  if (!has(LOOKS, name) || name === named) return false;
  named = name;
  var now = performance.now(), from = mix(now).slice();
  var dur = root.classList.contains('turning') ? ms(getComputedStyle(root).getPropertyValue('--turn')) : 0;
  if (dur > 0 && !reduced.matches) turn = { t0: now, dur: dur, from: from, to: LOOKS[name].slice() };
  else {
    turn = null;
    mixed = LOOKS[name].slice();
  }
  return true;
}

/* ------------------------------------------------------------ a colour */

var tint = document.createElement('canvas').getContext('2d');

/* a colour the stylesheet gives, any way it writes it, as display sRGB
   0..1; undefined where it gives none, and the thread's own is used */
function colour(v) {
  v = (v || '').trim();
  if (!v || !tint) return undefined;
  tint.fillStyle = '#010203';
  tint.fillStyle = v;
  var s = String(tint.fillStyle), m;
  if (s === '#010203' && !/^#010203$/i.test(v)) return undefined;
  if ((m = /^#([0-9a-f]{6})$/i.exec(s))) {
    var n = parseInt(m[1], 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  if ((m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s))) return [m[1] / 255, m[2] / 255, m[3] / 255];
  return undefined;
}

/* --------------------------------------------------------- the lettering */
/* Each piece: the element, its canvas, the mask Knit.ink paints for it,
   and where on the page it was last laid. */

var pieces = [];

function Piece(el) {
  this.el = el;
  this.cv = document.createElement('canvas');
  this.cv.className = 'thread';
  this.cv.setAttribute('aria-hidden', 'true');
  if (ours) ours.add(this.cv);
  this.cx = this.cv.getContext('2d');
  this.mask = document.createElement('canvas');
  this.mx = this.mask.getContext('2d');
  this.w = this.h = 0;
  this.px = 1;
  this.size = 16;
  this.at = [0, 0];
  this.key = '';
  this.want = MEASURE | SEW;
  this.seen = true;
  this.shown = false;
}

/* The words as the browser has set them, line by line: for every text
   node, a range over each of its letters says on which line it fell and
   where, and a probe of no size set in after the node finds the true
   baseline. Lengths are the viewport's, as the element now lies. */
function lines(el) {
  var out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), range = document.createRange(), n;
  while ((n = walk.nextNode())) {
    var host = n.parentElement, d = n.data;
    if (!host || !d) continue;
    var cs = getComputedStyle(host);
    if (cs.visibility !== 'visible') continue;
    var set = [], line = null, i = 0;
    while (i < d.length) {
      var len = d.codePointAt(i) > 0xffff ? 2 : 1, ch = d.substr(i, len), white = /\s/.test(ch);
      range.setStart(n, i);
      range.setEnd(n, i + len);
      i += len;
      var rs = range.getClientRects(), r = null;
      for (var k = 0; k < rs.length; k++) if (rs[k].width > 0 || !white) { r = rs[k]; break; }
      if (!r) continue;
      if (!line || Math.abs(r.top - line.top) > 0.5 * Math.max(r.height, 1)) {
        if (white) continue;
        line = { text: '', left: r.left, top: r.top, right: r.right, bottom: r.bottom, from: i - len, to: i };
        set.push(line);
      }
      line.text += white ? ' ' : ch;
      line.right = Math.max(line.right, r.right);
      line.bottom = Math.max(line.bottom, r.bottom);
      if (!white) line.to = i;
    }
    if (!set.length) continue;
    /* a letter's own box may be rounded where the line's is not: where
       each line starts is read from the line whole */
    set.forEach(function (l) {
      range.setStart(n, l.from);
      range.setEnd(n, l.to);
      var q = range.getClientRects()[0];
      if (q) {
        l.left = q.left;
        l.top = q.top;
      }
    });
    var probe = document.createElement('span'), ps = probe.style;
    ps.display = 'inline-block';
    ps.width = ps.height = ps.margin = ps.padding = ps.borderWidth = '0';
    ps.verticalAlign = 'baseline';
    if (ours) ours.add(probe);
    host.insertBefore(probe, n.nextSibling);
    var drop = probe.getBoundingClientRect().bottom - set[set.length - 1].top;
    host.removeChild(probe);
    var size = parseFloat(cs.fontSize) || 16, gap = parseFloat(cs.letterSpacing) || 0;
    var stretch = { '50%': 'ultra-condensed', '62.5%': 'extra-condensed', '75%': 'condensed', '87.5%': 'semi-condensed', '112.5%': 'semi-expanded', '125%': 'expanded', '150%': 'extra-expanded', '200%': 'ultra-expanded' }[cs.fontStretch] || '';
    var font = [cs.fontStyle, cs.fontVariantCaps === 'small-caps' ? 'small-caps' : '', cs.fontWeight, stretch, size + 'px', cs.fontFamily].join(' ').replace(/\s+/g, ' ').trim();
    set.forEach(function (l) {
      var text = l.text.replace(/\s+$/, '');
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
      out.push({ text: text, left: l.left, top: l.top, right: l.right, bottom: l.bottom, base: l.top + drop, font: font, size: size, spacing: gap, kerning: cs.fontKerning });
    });
  }
  return out;
}

/* the element's own translation, from a rise under way: taken off, so
   that the canvas is set where the element will come to rest. Any other
   transform is left in, and the piece is read again once it has run. */
function shift(cs) {
  var m = /^matrix(3d)?\((.*)\)$/.exec(cs.transform || ''), v;
  if (!m) return [0, 0];
  v = m[2].split(',').map(parseFloat);
  if (!m[1] && v.length === 6 && v[0] === 1 && v[1] === 0 && v[2] === 0 && v[3] === 1) return [v[4], v[5]];
  if (m[1] && v.length === 16 && v[0] === 1 && v[5] === 1 && v[10] === 1 && v[15] === 1 && !v[1] && !v[2] && !v[4] && !v[6] && !v[8] && !v[9]) return [v[12], v[13]];
  return [0, 0];
}

/* The canvas covers the element's box and every line of its text, with
   Knit.reach all round for the edge thread and the shadow, out to whole
   CSS px: a browser sets a canvas down on a whole CSS px whatever layout
   says (half a px out and it moves it), and only there is its store, as
   many px as Knit.fit gives, laid on the screen's own without being
   resampled. (A transform that moves it by a fraction resamples it all
   the same, which is why the words are raised with top and not with a
   transform.) The mask is painted again only when what it holds has
   changed. False if the element is not laid out.

   Where layout sets the element between two px, the browsers part ways:
   one rounds the canvas and the text's baseline to whole CSS px of the
   page, another rounds each positioned box against the one it lies in,
   to device px, and the text within it likewise. So the element is first
   moved, by half a px at most, to lie on a whole CSS px itself: then its
   canvas lies on one too, by a whole number of px from it, and the
   letters fall where the stitches are in either, to within a device px. */
function place(p) {
  var el = p.el, cs = getComputedStyle(el), box = el.getBoundingClientRect();
  if (cs.display === 'none' || !(box.width > 0 && box.height > 0)) {
    if (p.w && t) t.forget(p.mask);
    p.w = p.h = 0;
    p.key = '';
    return false;
  }
  var size = parseFloat(cs.fontSize) || 16, reach = Knit.reach(size);
  var off = shift(cs), sx = off[0], sy = off[1];
  var was = p.nudge || [0, 0], fx = box.left - sx - was[0], fy = box.top - sy - was[1];
  var nudge = [Math.round(fx) - fx, Math.round(fy) - fy];
  if (Math.abs(nudge[0] - was[0]) > 0.004 || Math.abs(nudge[1] - was[1]) > 0.004) {
    p.nudge = nudge;
    el.style.left = Math.abs(nudge[0]) > 0.004 ? nudge[0] + 'px' : '';
    el.style.top = Math.abs(nudge[1]) > 0.004 ? nudge[1] + 'px' : '';
    box = el.getBoundingClientRect();
  }
  var set = lines(el), x0 = box.left, y0 = box.top, x1 = box.right, y1 = box.bottom;
  set.forEach(function (l) {
    x0 = Math.min(x0, l.left);
    y0 = Math.min(y0, l.top);
    x1 = Math.max(x1, l.right);
    y1 = Math.max(y1, l.bottom);
  });
  var L = Math.floor(x0 - sx - reach), T = Math.floor(y0 - sy - reach);
  var R = Math.ceil(x1 - sx + reach), B = Math.ceil(y1 - sy + reach);
  var cssW = R - L, cssH = B - T, store = Knit.fit(cssW, cssH), px = store[0] / cssW;
  var runs = set.map(function (l) {
    return { text: l.text, x: l.left - sx - L, y: Math.round((l.base - sy - T) * px) / px, font: l.font, size: l.size, spacing: l.spacing };
  });
  var s = p.cv.style;
  s.left = (L - (box.left - sx)) + 'px';
  s.top = (T - (box.top - sy)) + 'px';
  s.width = cssW + 'px';
  s.height = cssH + 'px';
  p.at = [L + window.scrollX, T + window.scrollY];
  var thread = colour(cs.getPropertyValue('--sew-thread')), edge = colour(cs.getPropertyValue('--sew-edge'));
  var key = JSON.stringify([store, cssW, cssH, size, runs, set.length && set[0].kerning]);
  var hue = JSON.stringify([thread, edge]);
  if (hue !== p.hue) {
    p.hue = hue;
    p.thread = thread;
    p.edge = edge;
    p.want |= SEW;
  }
  if (key === p.key) return true;
  p.key = key;
  if (p.cv.width !== store[0] || p.cv.height !== store[1]) {
    p.cv.width = store[0];
    p.cv.height = store[1];
  }
  if (p.mask.width !== store[0] || p.mask.height !== store[1]) {
    p.mask.width = store[0];
    p.mask.height = store[1];
  }
  p.w = store[0];
  p.h = store[1];
  p.px = px;
  p.size = size;
  if ('fontKerning' in p.mx && set.length) p.mx.fontKerning = set[0].kerning === 'none' ? 'none' : set[0].kerning === 'normal' ? 'normal' : 'auto';
  Knit.ink(p.mx, runs, { px: p.px });
  p.want |= SEW;
  return true;
}

/* the floss, sewn into the shared context and copied onto the piece's
   own canvas, whole */
function sew(p, now, look) {
  if (glc.width < p.w || glc.height < p.h) {
    glc.width = Math.max(glc.width, p.w);
    glc.height = Math.max(glc.height, p.h);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  var ok = t.draw({
    mask: p.mask, w: p.w, h: p.h, px: p.px, size: p.size,
    thread: p.thread, edge: p.edge,
    look: look, time: now / 1000, still: reduced.matches,
    x: p.at[0], y: p.at[1]
  });
  if (!ok) return false;
  p.cx.globalCompositeOperation = 'copy';
  p.cx.drawImage(glc, 0, glc.height - p.h, p.w, p.h, 0, 0, p.w, p.h);
  return true;
}

/* ------------------------------------------------------- showing them */
/* Words nobody has seen yet (the script has run before the page's first
   paint, and their rise has not begun) are made clear at once, and they
   and the words beside them hold their rise until the first stitches
   are up, so that the name rises already sewn. If the stitches are not
   up within WAIT ms the words are let rise as they are. Words already
   seen are turned into stitches when those come: the canvas fades in
   over them, and then their own letters are made clear. */

var held = [], waiting = 0;

function unseen(el) {
  try {
    if (performance.getEntriesByType('paint').length) return false;
  } catch (err) {}
  var a = el.getAnimations ? el.getAnimations() : [];
  for (var i = 0; i < a.length; i++) {
    var c = a[i].effect && a[i].effect.getComputedTiming ? a[i].effect.getComputedTiming() : null;
    if (c && c.progress > 0.01) return false;
  }
  return true;
}

function hold(el) {
  var list = [];
  Array.prototype.forEach.call(el.parentElement ? el.parentElement.children : [el], function (c) {
    if (c.getAnimations) list = list.concat(c.getAnimations());
  });
  list.forEach(function (a) {
    var c = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
    if (held.indexOf(a) >= 0 || (c && c.progress > 0.01)) return;
    try {
      a.pause();
      held.push(a);
    } catch (err) {}
  });
}

function release() {
  clearTimeout(waiting);
  waiting = 0;
  held.forEach(function (a) {
    try {
      a.play();
    } catch (err) {}
  });
  held = [];
}

function shown(p) {
  if (p.shown) return;
  p.shown = true;
  var el = p.el;
  if (el.classList.contains('sewn')) return;
  var done = function () {
    if (!el.classList.contains('basting')) return;
    el.classList.remove('basting');
    if (p.cv.parentNode === el) el.classList.add('sewn');
  };
  /* the fade begins with the next frame, for the reason the rise is let
     go with it */
  requestAnimationFrame(function () {
    if (p.cv.parentNode !== el) return;
    el.classList.add('basting');
    p.cv.addEventListener('animationend', done, { once: true });
    setTimeout(done, TURN + 150);
  });
}

function mark(el, early) {
  for (var i = 0; i < pieces.length; i++) if (pieces[i].el === el) return;
  var p = new Piece(el);
  if (!p.cx || !p.mx) return;
  el.insertBefore(p.cv, el.firstChild);
  /* a stylesheet that does not know the thread (an older one a cache
     holds on to, or none at all) leaves the canvas in the line of the
     words, where each measure of them would make it larger: the words
     stay printed instead, for good */
  if (getComputedStyle(p.cv).position !== 'absolute') {
    el.removeChild(p.cv);
    quit();
    return;
  }
  if (early) el.classList.add('sewn');
  pieces.push(p);
  p.cv.addEventListener('contextrestored', function () {
    p.want |= SEW;
    wake();
  });
  if (sizes) {
    sizes.observe(el);
    if (el.parentElement) sizes.observe(el.parentElement);
  }
  if (sight) sight.observe(el);
  if (edits) edits.observe(el, { attributes: true, attributeFilter: ['class', 'style'], attributeOldValue: true, childList: true, characterData: true, subtree: true });
}

function unmark(p) {
  if (t) t.forget(p.mask);
  if (p.cv.parentNode) p.cv.parentNode.removeChild(p.cv);
  p.el.classList.remove('sewn', 'basting');
  if (p.nudge) p.el.style.left = p.el.style.top = '';
  if (sizes) sizes.unobserve(p.el);
  if (sight) sight.unobserve(p.el);
  p.mask.width = p.mask.height = p.cv.width = p.cv.height = 0;
  pieces.splice(pieces.indexOf(p), 1);
}

/* every element marked and not yet sewn */
function scan(early) {
  if (over || forced.matches) return;
  Array.prototype.forEach.call(document.querySelectorAll('[data-sew]'), function (el) {
    if (!over) mark(el, early && unseen(el));
  });
  stale(MEASURE | SEW, true);
}

/* the words go back to print for good: no WebGL2, a thread that will
   not link, a context lost twice, or a stylesheet that does not know the
   thread. The context goes too, rather than count for the rest of the
   visit against the few a page may hold */
function quit() {
  over = true;
  clearTimeout(revive);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  pieces.slice().forEach(unmark);
  release();
  root.classList.remove('sewing');
  if (t) t.free();
  t = null;
  if (glc) {
    glc.removeEventListener('webglcontextlost', lose);
    glc.removeEventListener('webglcontextrestored', restore);
  }
  var x = gl && !gl.isContextLost() && gl.getExtension('WEBGL_lose_context');
  if (x) x.loseContext();
  gl = glc = null;
}

/* ------------------------------------------------------------ the frame */

var raf = 0;

function wake() {
  if (!raf && t && !lost && !over) raf = requestAnimationFrame(frame);
}

function stale(what, now) {
  pieces.forEach(function (p) { p.want |= what; });
  if (now) wake();
}

function frame(now) {
  raf = 0;
  if (!t || lost || over) return;
  if (!t.ready()) {
    if (t.failed) quit();
    else raf = requestAnimationFrame(frame);
    return;
  }
  if (pieces.length && !root.classList.contains('sewing')) root.classList.add('sewing');
  var look = mix(now).slice(), turning = !!turn || root.classList.contains('turning');
  var moving = !reduced.matches && Knit.moving(), any = false;
  pieces.slice().forEach(function (p) {
    if (!p.el.isConnected) {
      unmark(p);
      return;
    }
    /* a screen of another density that sent no word of it: the store is
       no longer what the loom gives the canvas's box, and it is read
       again, as the meadow and the places are on their next frame */
    if (p.w && !(p.want & MEASURE)) {
      var f = Knit.fit(parseFloat(p.cv.style.width), parseFloat(p.cv.style.height));
      if (f[0] !== p.w || f[1] !== p.h) p.want |= MEASURE;
    }
    if (p.want & MEASURE) {
      p.want &= ~MEASURE;
      if (!place(p)) return;
    }
    if (!p.w) return;
    if (p.seen) any = true;
    if ((p.want & SEW) || (p.seen && (moving || turning))) {
      if (sew(p, now, look)) {
        p.want &= ~SEW;
        shown(p);
      }
    }
  });
  if (!pieces.length) root.classList.remove('sewing');
  /* the words held for their stitches rise once every piece that can
     be seen has them: from the next frame, since a browser whose thread
     linked in this one, holding it up, would start the rise from when
     this one began and show it already half risen */
  if (held.length && pieces.every(function (q) { return q.shown || !q.w; })) requestAnimationFrame(release);
  if (turning || (any && !reduced.matches && Knit.moving())) wake();
}

/* ------------------------------------------------------------ the cues */

var sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(function (list) {
  list.forEach(function (e) {
    pieces.forEach(function (p) {
      if (p.el === e.target || p.el.parentElement === e.target || !p.el.isConnected) p.want |= MEASURE;
    });
  });
  wake();
}) : null;

var sight = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (list) {
  list.forEach(function (e) {
    pieces.forEach(function (p) {
      if (p.el !== e.target) return;
      /* back on screen after the light has moved on without it */
      if (e.isIntersecting && !p.seen) p.want |= SEW;
      p.seen = e.isIntersecting;
    });
  });
  wake();
}) : null;

/* another script has changed a piece's style, its classes or its words,
   and its box may be the size it was (another face of the same measure,
   say): it is read again. What this script sets in and takes out, its
   canvas and its probe, and the classes it gives, are passed over */
var ours = typeof WeakSet === 'function' ? new WeakSet() : null;

function bare(s) {
  return String(s || '').split(/\s+/).filter(function (c) { return c && c !== 'sewn' && c !== 'basting'; }).sort().join(' ');
}

function mine(list) {
  return Array.prototype.every.call(list, function (n) { return ours.has(n); });
}

var edits = ours && typeof MutationObserver === 'function' ? new MutationObserver(function (list) {
  var any = false;
  list.forEach(function (m) {
    if (ours.has(m.target)) return;
    if (m.type === 'childList' && mine(m.addedNodes) && mine(m.removedNodes)) return;
    if (m.type === 'attributes' && m.attributeName === 'class' && bare(m.oldValue) === bare(m.target.getAttribute('class'))) return;
    pieces.forEach(function (p) {
      if (p.el !== m.target && !p.el.contains(m.target)) return;
      p.want |= MEASURE;
      any = true;
    });
  });
  if (any) wake();
}) : null;

addEventListener('resize', function () { stale(MEASURE, true); });

/* the zoom, or a screen of another density, without a resize */
(function dense() {
  var mq = matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)'), once = function () {
    if (mq.removeEventListener) mq.removeEventListener('change', once);
    else if (mq.removeListener) mq.removeListener(once);
    stale(MEASURE, true);
    dense();
  };
  listen(mq, once);
})();

if (document.fonts) {
  if (document.fonts.ready) document.fonts.ready.then(function () { stale(MEASURE, true); });
  if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { stale(MEASURE, true); });
}

/* the light follows a mouse or a pen; a finger leaves it be */
addEventListener('pointermove', function (ev) {
  if (reduced.matches || (ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen')) return;
  wake();
}, { passive: true });
root.addEventListener('mouseleave', wake);
addEventListener('blur', wake);

new MutationObserver(function () {
  if (looked()) stale(MEASURE | SEW, false);
  wake();
}).observe(root, { attributes: true, attributeFilter: ['data-look', 'class'] });

listen(reduced, function () {
  if (reduced.matches) turn = null;
  stale(SEW, true);
});

listen(forced, function () {
  if (forced.matches) {
    pieces.slice().forEach(unmark);
    release();
    root.classList.remove('sewing');
  } else if (begun) scan(false);
});

/* -------------------------------------------------------------- begin */
/* The thread links meanwhile, but nothing is marked before the
   stylesheet is in: Safari runs this without waiting for it, and the
   words are measured as it lays them out, and asked whether it knows the
   thread. Where it has not come yet, the words are marked once it has,
   or has failed to, or at the latest once the page has loaded */

if (!make()) {
  over = true;
  return;
}

var begun = false;

function begin() {
  if (begun || over) return;
  begun = true;
  scan(true);
  if (pieces.some(function (p) { return p.el.classList.contains('sewn'); })) {
    pieces.forEach(function (p) { if (p.el.classList.contains('sewn')) hold(p.el); });
    waiting = setTimeout(function () {
      pieces.forEach(function (p) { if (!p.shown) p.el.classList.remove('sewn'); });
      release();
    }, WAIT);
  }
}

var sheet = document.querySelector('link[rel="stylesheet"]');
if (sheet && !sheet.sheet && document.readyState !== 'complete') {
  sheet.addEventListener('load', begin, { once: true });
  sheet.addEventListener('error', begin, { once: true });
  addEventListener('load', begin, { once: true });
} else begin();

/* for a script that marks more words later, or wants them all read
   again */
window.Sew = {
  refresh: function () {
    if (begun) scan(false);
  }
};

})();
