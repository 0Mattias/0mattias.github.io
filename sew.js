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

   Every word on the page is sewn so, each in its own colour: the
   stylesheet's colour for the words, or the thread it names in
   --sew-thread and --sew-edge, and a colour it gives part transparent is
   the colour that shows over the paper. Each link is a strand of its own,
   so the pointer can turn its colour alone, and its underline is a running
   stitch (in --sew-under) that stops short of the letters it crosses. An
   element marked data-sew-dot is sewn as a padded dot, and ringed while it
   is pressed (in --sew-ring). Lettering marked data-sew="still" lies on
   cloth that lies at rest, and is lit as that cloth is: only the words over
   the live picture follow the pointer's light.

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
var LOOKS = { day: [1, 0, 0], dusk: [0, 1, 0] };

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
  pieces.forEach(function (p) { p.strands.forEach(function (s) { s.key = ''; }); });
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
   0..1 and its alpha; undefined where it gives none (or none that shows) */
function colour(v) {
  v = (v || '').trim();
  if (!v || !tint || /^(transparent|currentcolor)$/i.test(v)) return undefined;
  tint.fillStyle = '#010203';
  tint.fillStyle = v;
  var s = String(tint.fillStyle), m;
  if (s === '#010203' && !/^#010203$/i.test(v)) return undefined;
  if ((m = /^#([0-9a-f]{6})$/i.exec(s))) {
    var n = parseInt(m[1], 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
  }
  if ((m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?/i.exec(s))) {
    var a = m[4] === undefined ? 1 : +m[4];
    return a > 0.004 ? [m[1] / 255, m[2] / 255, m[3] / 255, a] : undefined;
  }
  return undefined;
}

/* the paper the words lie on, as the page shows it now (a turn of the
   looks included) */
function paper() {
  return colour(getComputedStyle(root).getPropertyValue('--paper')) || [0.965, 0.953, 0.925, 1];
}

/* a colour as a thread can be dyed: one the stylesheet gives part
   transparent is the colour it shows over the paper */
function dyed(c, under) {
  if (!c) return undefined;
  var a = c[3] === undefined ? 1 : c[3];
  return [0, 1, 2].map(function (i) { return c[i] * a + under[i] * (1 - a); });
}

/* the thread couched round a letter's edge, where the stylesheet names
   none: the floss's own colour gone part of the way toward the paper, so
   small lettering keeps its weight and its outline is the floss's own */
var EDGE = 0.7;

function edged(c, under) {
  return [0, 1, 2].map(function (i) { return c[i] + (under[i] - c[i]) * EDGE; });
}

/* --------------------------------------------------------- the lettering */
/* Each piece: the element, its canvas, and the strands it is sewn in.
   A strand is what one thread sews: a colour of the lettering at one
   size, a link (whose colour the pointer may change alone), the running
   stitch under a link, a dot, a ring; each has a mask of its own, only
   as large as what it sews, and is sewn into its own corner of the
   piece's canvas. */

var pieces = [];

function Piece(el) {
  this.el = el;
  this.cv = document.createElement('canvas');
  this.cv.className = 'thread';
  this.cv.setAttribute('aria-hidden', 'true');
  if (ours) ours.add(this.cv);
  this.cx = this.cv.getContext('2d');
  this.strands = [];
  this.w = this.h = 0;
  this.px = 1;
  this.at = [0, 0];
  this.want = MEASURE | SEW;
  this.seen = true;
  this.shown = false;
  this.hot = 0;
  /* lettering on cloth that lies at rest (the paper, the ground below
     the picture) is lit as that cloth is, with the light at rest */
  this.still = el.getAttribute('data-sew') === 'still';
}

function Strand(id) {
  this.id = id;
  this.mask = document.createElement('canvas');
  this.mx = this.mask.getContext('2d');
  this.key = '';
  this.x = this.y = this.w = this.h = 0;
}

function unpick(s) {
  if (t) t.forget(s.mask);
  s.mask.width = s.mask.height = 0;
  s.key = '';
}

/* The words as the browser has set them, line by line: for every text
   node, a range over each of its letters says on which line it fell and
   where, and a probe of no size set in after the node finds the true
   baseline. Lengths are the viewport's, as the element now lies. Words
   in another piece, in a dot, or set at no size are left out, and words
   hidden inside a piece that can itself be seen. */
function lines(el) {
  var out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), range = document.createRange(), n;
  var shown = getComputedStyle(el).visibility === 'visible';
  while ((n = walk.nextNode())) {
    var host = n.parentElement, d = n.data;
    if (!host || !d || host.closest('[data-sew]') !== el || host.closest('[data-sew-dot]')) continue;
    var cs = getComputedStyle(host);
    if (shown && cs.visibility !== 'visible') continue;
    var size = parseFloat(cs.fontSize) || 0;
    if (!(size > 1)) continue;
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
      if (!white) {
        line.to = i;
        line.end = r.right;
      }
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
    var drop = fall(host, n, set);
    var gap = parseFloat(cs.letterSpacing) || 0;
    var stretch = { '50%': 'ultra-condensed', '62.5%': 'extra-condensed', '75%': 'condensed', '87.5%': 'semi-condensed', '112.5%': 'semi-expanded', '125%': 'expanded', '150%': 'extra-expanded', '200%': 'ultra-expanded' }[cs.fontStretch] || '';
    var font = [cs.fontStyle, cs.fontVariantCaps === 'small-caps' ? 'small-caps' : '', cs.fontWeight, stretch, size + 'px', cs.fontFamily].join(' ').replace(/\s+/g, ' ').trim();
    set.forEach(function (l) {
      var text = l.text.replace(/\s+$/, '');
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
      out.push({ text: text, left: l.left, top: l.top, right: l.right, end: l.end || l.right, bottom: l.bottom, base: l.top + drop, font: font, size: size, spacing: gap, kerning: cs.fontKerning, host: host });
    });
  }
  return out;
}

/* How far below the top of a line of this text its baseline lies: a
   probe of no size is set in after the node, and failing that before
   it, and read on whichever of the node's own lines it falls (one set in
   after words that end a line may wrap onto the next, which holds none
   of them). Every line of a node is in one face, so one will do. */
function fall(host, n, set) {
  var probe = document.createElement('span'), ps = probe.style, drop = null;
  ps.display = 'inline-block';
  ps.width = ps.height = ps.margin = ps.padding = ps.borderWidth = '0';
  ps.verticalAlign = 'baseline';
  if (ours) ours.add(probe);
  [n.nextSibling, n].some(function (at, k) {
    host.insertBefore(probe, at);
    var b = probe.getBoundingClientRect().bottom;
    host.removeChild(probe);
    for (var i = 0; i < set.length; i++) {
      if (b >= set[i].top - 0.5 && b <= set[i].bottom + 0.5) {
        drop = b - set[i].top;
        return true;
      }
    }
    if (!k) drop = b - set[set.length - 1].top;
    return false;
  });
  return drop;
}

/* the element within the piece that underlines a host's words, if any
   does: a decoration is drawn by the box that asks for it, through every
   box inside */
function underliner(host, el) {
  for (var e = host; e && e !== el.parentElement; e = e.parentElement) {
    if (/underline/.test(getComputedStyle(e).textDecorationLine || '')) return e;
    if (e === el) break;
  }
  return null;
}

/* What a piece sews, strand by strand, each with its runs in viewport
   CSS px less the element's own rise (tx, ty), its size, the element its
   colours are read from, and the box it reaches. */
var STITCH = 0.26;

function strands(el, tx, ty) {
  var set = lines(el), out = [], by = {};
  var links = [], unders = [];
  function strand(id, kind, host, size) {
    if (!by[id]) {
      by[id] = { id: id, kind: kind, host: host, size: size, runs: [], box: [1e9, 1e9, -1e9, -1e9] };
      out.push(by[id]);
    }
    return by[id];
  }
  function reach(s, l, t, r, b) {
    var f = Knit.reach(s.size);
    s.box[0] = Math.min(s.box[0], l - f);
    s.box[1] = Math.min(s.box[1], t - f);
    s.box[2] = Math.max(s.box[2], r + f);
    s.box[3] = Math.max(s.box[3], b + f);
  }
  set.forEach(function (l) {
    var a = l.host.closest('a'), id;
    if (a && !el.contains(a)) a = null;
    if (a) {
      if (links.indexOf(a) < 0) links.push(a);
      id = 'a' + links.indexOf(a) + '/' + l.size;
    } else {
      var cs = getComputedStyle(l.host);
      id = 'c' + (cs.getPropertyValue('--sew-thread').trim() || cs.color) + '/' + l.size;
    }
    var s = strand(id, 'text', a || l.host, l.size);
    s.runs.push({ text: l.text, x: l.left - tx, base: l.base - ty, font: l.font, size: l.size, spacing: l.spacing });
    s.kerning = l.kerning;
    reach(s, l.left - tx, l.top - ty, l.right - tx, l.bottom - ty);
    /* the running stitch under a link, line by line, stopping short of
       every letter it crosses */
    var u = underliner(l.host, el);
    if (u) {
      if (unders.indexOf(u) < 0) unders.push(u);
      var ucs = getComputedStyle(u);
      var off = parseFloat(ucs.textUnderlineOffset) || 0.1 * l.size, wide = parseFloat(ucs.textDecorationThickness) || 1;
      var us = strand('u' + unders.indexOf(u), 'under', u, l.size), y = Math.round(l.base - ty + off + wide / 2) + (wide % 2 ? 0.5 : 0), seg = null;
      for (var i = 0; i < us.runs.length; i++) {
        var r = us.runs[i];
        if (r.line && Math.abs(r.line[1] - y) < 0.5) seg = r;
      }
      if (seg) {
        seg.line[0] = Math.min(seg.line[0], l.left - tx);
        seg.line[2] = Math.max(seg.line[2], l.end - tx);
      } else us.runs.unshift({ line: [l.left - tx, y, l.end - tx], width: wide, dash: [STITCH * l.size, STITCH * l.size], size: l.size });
      us.runs.push({ text: l.text, x: l.left - tx, base: l.base - ty, font: l.font, size: l.size, spacing: l.spacing, clear: 0.9 });
      reach(us, l.left - tx, y - wide, l.end - tx, y + wide);
    }
  });
  /* the dots, padded, and a ring round the one that is pressed */
  Array.prototype.forEach.call(el.querySelectorAll('[data-sew-dot]'), function (d, i) {
    var b = d.getBoundingClientRect(), cs = getComputedStyle(d);
    if (!(b.width > 0 && b.height > 0) || cs.display === 'none') return;
    var size = parseFloat(cs.getPropertyValue('--sew-size')) || 36, g = Knit.reach(size);
    var cx = (b.left + b.right) / 2 - tx, cy = (b.top + b.bottom) / 2 - ty, rr = Math.min(b.width, b.height) / 2;
    var core = Math.max(rr - 0.024 * size - 0.65, 1);
    var s = strand('d' + i, 'dot', d, size);
    s.runs.push({ dot: [cx, cy, core], size: size });
    reach(s, cx - rr, cy - rr, cx + rr, cy + rr);
    if (d.getAttribute('aria-pressed') === 'true') {
      var ring = strand('r', 'ring', d, 16);
      ring.runs.push({ ring: [cx, cy, rr / (b.width / (d.offsetWidth || b.width)) + 3.5], width: 0.6, size: 16 });
      reach(ring, cx - rr - 5, cy - rr - 5, cx + rr + 5, cy + rr + 5);
    }
  });
  /* each sewn in turn: the running stitch first, so the letters' shadow
     falls over it, the ring last */
  var order = { under: 0, text: 1, dot: 2, ring: 3 };
  out.sort(function (a, b) { return order[a.kind] - order[b.kind]; });
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

/* The canvas covers the element's box and everything it sews, with
   Knit.reach all round for the edge thread and the shadow, out to whole
   CSS px: a browser sets a canvas down on a whole CSS px whatever layout
   says (half a px out and it moves it), and only there is its store, as
   many px as Knit.fit gives, laid on the screen's own without being
   resampled. (A transform that moves it by a fraction resamples it all
   the same, which is why the words are raised with top and not with a
   transform.) Each strand is given a whole number of device px of it,
   and its mask is painted again only when what it holds has changed.
   False if the element is not laid out.

   Where layout sets the element between two px, the browsers part ways:
   one rounds the canvas and the text's baseline to whole CSS px of the
   page, another rounds each positioned box against the one it lies in,
   to device px, and the text within it likewise. So an element laid out
   in the flow is first moved, by half a px at most, to lie on a whole
   CSS px itself: then its canvas lies on one too, by a whole number of
   px from it, and the letters fall where the stitches are in either, to
   within a device px. One placed outright is left where it is. */
function place(p) {
  var el = p.el, cs = getComputedStyle(el), box = el.getBoundingClientRect();
  if (cs.display === 'none' || !(box.width > 0 && box.height > 0)) {
    p.strands.forEach(unpick);
    p.strands = [];
    p.w = p.h = 0;
    return false;
  }
  var size = parseFloat(cs.fontSize) || 16, reach = Knit.reach(size);
  var off = shift(cs), tx = off[0], ty = off[1];
  if (cs.position === 'relative') {
    var was = p.nudge || [0, 0], fx = box.left - tx - was[0], fy = box.top - ty - was[1];
    var nudge = [Math.round(fx) - fx, Math.round(fy) - fy];
    if (Math.abs(nudge[0] - was[0]) > 0.004 || Math.abs(nudge[1] - was[1]) > 0.004) {
      p.nudge = nudge;
      el.style.left = Math.abs(nudge[0]) > 0.004 ? nudge[0] + 'px' : '';
      el.style.top = Math.abs(nudge[1]) > 0.004 ? nudge[1] + 'px' : '';
      box = el.getBoundingClientRect();
    }
  }
  var list = strands(el, tx, ty);
  var x0 = box.left - tx - reach, y0 = box.top - ty - reach, x1 = box.right - tx + reach, y1 = box.bottom - ty + reach;
  list.forEach(function (s) {
    x0 = Math.min(x0, s.box[0]);
    y0 = Math.min(y0, s.box[1]);
    x1 = Math.max(x1, s.box[2]);
    y1 = Math.max(y1, s.box[3]);
  });
  var L = Math.floor(x0), T = Math.floor(y0), R = Math.ceil(x1), B = Math.ceil(y1);
  var cssW = R - L, cssH = B - T, store = Knit.fit(cssW, cssH), px = store[0] / cssW;
  var c = p.cv.style;
  c.left = (L - (box.left - tx)) + 'px';
  c.top = (T - (box.top - ty)) + 'px';
  c.width = cssW + 'px';
  c.height = cssH + 'px';
  p.at = [L + window.scrollX, T + window.scrollY];
  if (p.cv.width !== store[0] || p.cv.height !== store[1]) {
    p.cv.width = store[0];
    p.cv.height = store[1];
  }
  if (p.w !== store[0] || p.h !== store[1] || p.px !== px) p.want |= SEW;
  p.w = store[0];
  p.h = store[1];
  p.px = px;

  var kept = {};
  p.strands.forEach(function (s) { kept[s.id] = s; });
  p.strands = list.map(function (m) {
    var s = kept[m.id] || new Strand(m.id);
    delete kept[m.id];
    s.kind = m.kind;
    s.host = m.host;
    s.size = m.size;
    var sx = Math.max(0, Math.floor((m.box[0] - L) * px)), sy = Math.max(0, Math.floor((m.box[1] - T) * px));
    var ex = Math.min(store[0], Math.ceil((m.box[2] - L) * px)), ey = Math.min(store[1], Math.ceil((m.box[3] - T) * px));
    var w = Math.max(1, ex - sx), h = Math.max(1, ey - sy), ox = L + sx / px, oy = T + sy / px;
    var runs = m.runs.map(function (r) {
      var q = {}, k;
      for (k in r) if (Object.prototype.hasOwnProperty.call(r, k)) q[k] = r[k];
      if (r.text !== undefined) {
        q.x = r.x - ox;
        q.y = (Math.round((r.base - T) * px) - sy) / px;
        delete q.base;
      }
      if (r.line) q.line = [r.line[0] - ox, (Math.round((r.line[1] - T) * px * 2) / 2 - sy) / px, r.line[2] - ox];
      if (r.dot) q.dot = [r.dot[0] - ox, r.dot[1] - oy, r.dot[2]];
      if (r.ring) q.ring = [r.ring[0] - ox, r.ring[1] - oy, r.ring[2]];
      return q;
    });
    s.x = sx;
    s.y = sy;
    var key = JSON.stringify([w, h, px, runs, m.kerning]);
    if (key !== s.key) {
      s.key = key;
      if (s.mask.width !== w || s.mask.height !== h) {
        s.mask.width = w;
        s.mask.height = h;
      }
      s.w = w;
      s.h = h;
      if ('fontKerning' in s.mx) s.mx.fontKerning = m.kerning === 'none' ? 'none' : m.kerning === 'normal' ? 'normal' : 'auto';
      Knit.ink(s.mx, runs, { px: px });
      p.want |= SEW;
    }
    return s;
  });
  Object.keys(kept).forEach(function (id) {
    unpick(kept[id]);
    p.want |= SEW;
  });
  return true;
}

/* each strand's colours, read again before every sewing, so that a turn
   of the looks or a pointer over a link is followed as it goes */
function dye(p) {
  var under = paper();
  p.strands.forEach(function (s) {
    var cs = getComputedStyle(s.host), own = colour(cs.getPropertyValue('--sew-thread')), rim = colour(cs.getPropertyValue('--sew-edge'));
    var c;
    if (s.kind === 'under') c = dyed(colour(cs.getPropertyValue('--sew-under')) || colour(cs.color), under);
    else if (s.kind === 'ring') c = dyed(colour(cs.getPropertyValue('--sew-ring')) || colour(cs.color), under);
    else c = dyed(own || colour(cs.color), under);
    s.thread = c || [under[0], under[1], under[2]];
    s.edge = s.kind !== 'under' && s.kind !== 'ring' && rim ? dyed(rim, under) : edged(s.thread, under);
  });
}

/* the strands, sewn one after another into the shared context and each
   laid into its own corner of the piece's canvas */
function sew(p, now, look) {
  dye(p);
  var mw = 1, mh = 1;
  p.strands.forEach(function (s) {
    mw = Math.max(mw, s.w);
    mh = Math.max(mh, s.h);
  });
  if (glc.width < mw || glc.height < mh) {
    glc.width = Math.max(glc.width, mw);
    glc.height = Math.max(glc.height, mh);
  }
  p.cx.globalCompositeOperation = 'source-over';
  p.cx.clearRect(0, 0, p.w, p.h);
  for (var i = 0; i < p.strands.length; i++) {
    var s = p.strands[i];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var ok = t.draw({
      mask: s.mask, w: s.w, h: s.h, px: p.px, size: s.size,
      thread: s.thread, edge: s.edge,
      look: look, time: now / 1000, still: reduced.matches || p.still,
      x: p.at[0] + s.x / p.px, y: p.at[1] + s.y / p.px
    });
    if (!ok) return false;
    p.cx.drawImage(glc, 0, glc.height - s.h, s.w, s.h, s.x, s.y, s.w, s.h);
  }
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
  if (!p.cx) return;
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
  if (edits) edits.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'aria-pressed'], attributeOldValue: true, childList: true, characterData: true, subtree: true });
}

function unmark(p) {
  p.strands.forEach(unpick);
  p.strands = [];
  if (p.cv.parentNode) p.cv.parentNode.removeChild(p.cv);
  p.el.classList.remove('sewn', 'basting');
  if (p.nudge) p.el.style.left = p.el.style.top = '';
  if (sizes) sizes.unobserve(p.el);
  if (sight) sight.unobserve(p.el);
  p.cv.width = p.cv.height = 0;
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
  var moving = !reduced.matches && Knit.moving(), any = false, warm = false;
  pieces.slice().forEach(function (p) {
    if (!p.el.isConnected) {
      unmark(p);
      return;
    }
    /* a pointer has come to a link or a button in it, or left one: its
       colour and its size are followed, frame by frame, through the
       stylesheet's own transition */
    if (p.hot > now) {
      p.want |= p.grows ? MEASURE | SEW : SEW;
      warm = true;
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
    if (p.seen && !p.still) any = true;
    if ((p.want & SEW) || (p.seen && ((moving && !p.still) || turning))) {
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
  if (turning || warm || (any && !reduced.matches && Knit.moving())) wake();
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

/* a link or a button the pointer or the keyboard comes to, or leaves.
   A finger leaves a link it tapped hovered until the next tap, and that
   one may land on no link at all, so the link the pointer was last over
   is read again too whenever it comes to anything else */
var HOT = 360, was = null;

function heat(c, until) {
  pieces.forEach(function (p) {
    if (!p.el.contains(c)) return;
    p.hot = until;
    /* a link only changes colour; a button may grow, and is read again */
    p.grows = c.tagName === 'BUTTON';
  });
}

function stir(ev) {
  var c = ev.target && ev.target.closest ? ev.target.closest('a, button') : null;
  var left = was && was !== c ? was : null, until = performance.now() + HOT;
  if (ev.type === 'pointerover') was = c;
  if (left) heat(left, until);
  if (c) heat(c, until);
  if (c || left) wake();
}

['pointerover', 'pointerout', 'focusin', 'focusout'].forEach(function (k) {
  document.addEventListener(k, stir, { passive: true });
});

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
