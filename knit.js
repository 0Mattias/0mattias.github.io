/* 0mattias.github.io · the loom
   Everything on the page is knitted here. A renderer no longer puts its
   finished picture on its canvas: it draws it, much smaller than before,
   into a target the loom hands it, and the loom reads that picture one
   colour to a stitch and draws the fabric itself at the screen's full
   resolution. The fabric is stockinette, worked out per pixel: every
   stitch a V of two round legs of two-ply wool whose foot stands proud
   of the stitch below and whose head dives under the stitch above, the
   eye's ray followed down into that relief so that yarn hides yarn, a
   second walk toward the light for the shadow each strand lays on the
   next, and wool for a material: light that gets about inside pale yarn
   and fills its hollows, plies, a sheen along the fibres, a nap that
   catches the light along every lit edge. The light comes from the upper
   left; the pointer swings it round and tilts the cloth a little under
   the eye. Every yarn comes back, on average, the colour it was given, so
   the picture keeps its brightness and the page its paper.

   One lattice runs through the whole page. A stitch is a cell of --kw by
   --kh CSS px counted from the page's top-left corner, stitch (i, j)
   covering [i kw, (i + 1) kw) by [j kh, (j + 1) kh), and what is a
   stitch's own (its shade, the turn of its plies) is hashed from (i, j)
   in integers. So two canvases that are told where they lie on the page
   knit the same stitch the same way, and their fabrics meet without a
   seam.

   window.Knit:

   Knit.gauge()               { w, h }: the stitch in CSS px, from --kw
                              and --kh on the root, whatever lengths they
                              are. Where the stylesheet gives none: 7 px
                              wide under 725 px of window, 8 from there,
                              9 from 975, 10 from 1225, 11 from 1475, and
                              four fifths as high. A stylesheet should
                              give those steps too: only a stitch that is
                              a whole number of CSS px lets a tile fall on
                              whole device px (see the tile, below).
   Knit.length(name)          a length the stylesheet gives the root in a
                              custom property ('--fade'), in CSS px; 0
                              where it gives none. Measured once, and
                              again after the window changes size.
   Knit.fit(cssW, cssH, q)    [w, h]: the backing store a canvas of that
                              CSS size should have under the fabric: the
                              screen's pixels up to two per CSS px, times
                              q (0..1, the caller's governor), each side
                              to the nearest whole px, odd or even, so
                              that the browser has nothing to resample;
                              4.4 million px at most, and then both sides
                              rounded down.
   Knit.scene(cssW, cssH, q)  [w, h]: the size at which the picture is
                              worth rendering: six px to a stitch's width,
                              times q, both even. More does no harm.
   Knit.point                 { x, y }: the pointer the light follows,
                              eased, -1..1 across the viewport, x to the
                              right and y down; (0, 0) at rest, and always
                              at rest under reduced motion and for a
                              finger. It eases as draw calls arrive, a
                              loom's or a thread's, by their own clock,
                              whether or not the call itself is still,
                              brings its own pointer or can draw at all;
                              nothing runs otherwise.
   Knit.moving()              true while it has not settled: whoever draws
                              on demand keeps drawing, and it settles
                              within a second and a half of draws.

   var k = Knit.pass(gl)      a loom on a WebGL2 context the caller owns;
                              null where there can be none.
   k.ready()                  true once its programs have linked. It never
                              waits where the browser can link in the
                              background: it is polled.
   k.failed                   true if they never will.
   k.target(w, h)             a framebuffer of that size (RGBA8, linear,
                              clamped; no depth, no samples, no mipmaps)
                              for the caller's last pass to draw the
                              finished picture into: display sRGB, the way
                              up, exactly what used to go to the canvas.
                              Kept between calls; made again when the size
                              changes. It leaves GL as it found it, and
                              gives null on a lost context.
   k.draw(o)                  reads the target one colour to a stitch and
                              draws the fabric, opaque, over the whole
                              drawing buffer of the default framebuffer.
                              True if it drew; false, and nothing touched,
                              before ready(), without a picture, or for a
                              box of more stitches than a texture holds.
       o.cssW, o.cssH         the canvas's CSS box
       o.x, o.y               its top-left corner on the page, CSS px
                              (0, 0 if left out). Any fraction will do for
                              the loom; but a browser sets a canvas down
                              on whole device px, so only a canvas that
                              lies on them meets a laid tile stitch for
                              stitch
       o.time                 seconds, the caller's clock: the light sways
                              by it, and nothing else moves
       o.still                true when nothing may move: the light holds
                              and the fabric lies as with the pointer at
                              rest
       o.look                 [day, dusk, night], weights
       o.lite                 true for the cheaper fabric: the eye's ray
                              is not followed (no parallax), the walk
                              toward the light takes half the steps, the
                              nap's halo and the fibres' streaks are left
                              out. Same lattice, same stitches.
       o.relief               0..1, how much of the relief shows (1)
       o.flat                 [r, g, b], display sRGB 0..1: knit one plain
                              colour and read no picture (no target is
                              needed)
       o.tile                 [n, m], up to 4096 each: everything that
                              tells one stitch from another repeats every
                              n stitches and m rows, so a canvas of n kw
                              by m kh CSS px, drawn with flat and still,
                              is a tile that repeats without a seam
                              wherever it is laid on the lattice. A live
                              canvas given the same tile has, stitch for
                              stitch, that tile's relief; one that is not
                              has every stitch in the same place, but off
                              in its wander and its plies by enough to
                              show. So every canvas that meets a laid
                              tile, or lies over a picture the tile is
                              laid on, is given that tile.
       o.ground               [r, g, b], display sRGB 0..1: the cloth that
                              goes on past the canvas (the paper under a
                              hero). The stitches the canvas's edge cuts,
                              and a row whose feet it cuts, are knitted in
                              it and not in the picture, so the picture
                              ends in whole stitches, toothed as knitting
                              is, and the canvas's edge falls in the
                              ground's own yarn. That yarn lies as a laid
                              tile lies, the light and the eye at rest and
                              the fabric the full one, whatever the
                              pointer, the clock and o.lite say of the
                              rest: given the tile the ground is laid
                              with, the canvas's edge cannot be found.
       o.sides                which edges the ground lies beyond: any of
                              the letters l, t, r, b; 'b' if left out
       o.fade                 CSS px: with the ground below, how far above
                              the canvas's bottom edge the picture begins
                              to give way to it, worked as colourwork is,
                              stitch by stitch, each a whole stitch of the
                              one yarn or the other or a shade between, more
                              of them the ground's the nearer the edge; and
                              over the same rows the cloth comes to rest,
                              so the edge cannot be found while the pointer
                              moves either. 0 if left out
       o.sweater              { yarns: [[r, g, b], [r, g, b]], mid: x,
                              base: y }: with the ground below, the
                              picture gives way to it not stitch by stitch
                              but as a holiday sweater's yoke does, in a
                              band of stranded colourwork 20 rows deep:
                              the picture ends in teeth, then a stripe,
                              snowflakes in the first yarn between trees
                              in the second, a stripe, and the ground.
                              Each stitch is all one yarn. mid, in CSS px
                              across the page, is where a snowflake
                              stands; base, in CSS px down the page, is
                              where the band's ground begins, the ground
                              going on below it to the canvas's edge (the
                              canvas's last own row if left out or
                              lower). o.fade still says over how many
                              rows the cloth comes to rest
       o.point                [x, y]: a pointer to use instead of
                              Knit.point (for a picture that must come out
                              the same twice)
   k.free()                   deletes all it made; safe twice, before the
                              programs have linked (they go when the link
                              is over), and after a lost context, where
                              there is nothing left to delete and nothing
                              is. After a lost context this loom is over:
                              ask for Knit.pass again on the restored one.

   What they leave behind. target() changes nothing. draw() leaves: the
   default framebuffer bound (read and draw), the viewport on the whole
   drawing buffer, the loom's own program in use, no vertex array bound,
   texture unit 0 active with no 2D texture and no sampler on it, and
   BLEND, DEPTH_TEST, STENCIL_TEST, SCISSOR_TEST, CULL_FACE,
   RASTERIZER_DISCARD, SAMPLE_COVERAGE and SAMPLE_ALPHA_TO_COVERAGE off,
   the colour mask all on. It touches no other unit, no pixel-store
   setting, no clear value, no buffer binding.

   A plain tile for a stylesheet: draw({ flat: [0.5, 0.5, 0.5], tile:
   [n, m], still: true, cssW: n * kw, cssH: m * kh }) on a canvas of
   Knit.fit(n * kw, m * kh) px, laid at n kw by m kh CSS px from the
   page's corner. Middle grey comes back as middle grey on average, so the
   result is the relief alone, ready to be laid over a picture with a
   blend that leaves 50% alone. The paper is the same call with the
   paper's colour, which comes back the paper's colour.

   The tile is on the lattice only where n kw and m kh come to whole
   device px: a browser handed a tile of 497.27 px scales it soft, or
   snaps it to 497 and lets the paper drift off the stitches. With a
   stitch a whole number of CSS px wide and four fifths as high, n a
   multiple of four and m of five ([24, 30] is 24 kw square) are whole at
   every device pixel ratio that is a multiple of a quarter. Knit.fit
   draws it at two px to the CSS px at most, as it sizes the canvases, so
   that on a denser screen tile and canvas are scaled alike.

   Words are not knitted. They are embroidered over the knitting: padded
   satin stitch, floss laid aslant over a low dome, a tight thread of a
   second colour couched round the edge, and the shadow all of it casts
   on the cloth beneath. Two things make them. The mask is a 2D canvas
   as large, in device px, as the picture that is wanted; Knit.ink paints
   the lettering on it. The thread is a program on a WebGL2 context the
   caller owns (a small one of its own will do); it reads the mask and
   draws the lettering, lit by the fabric's own light.

   Knit.reach(size)           how far past the ink of its glyphs lettering
                              of that size can fall, shadow and all, in
                              CSS px: what to leave free round it (5.8 at
                              19 px, 8.2 at 38, 12.5 at 72).
   Knit.ink(ctx, runs, o)     paints the mask on ctx's canvas, all of it,
                              and leaves the context as it found it.
       runs                   [{ text, x, y, font, size, spacing }], CSS
                              px from the mask's top-left corner: x where
                              the run's first letter starts, y its
                              alphabetic baseline; font the CSS shorthand
                              with its size, size that size again as a
                              number, spacing the letter-spacing in px.
                              A run may instead be a shape, cut by its
                              size as lettering is: { line: [x0, y, x1],
                              width, dash: [on, off] } a thread laid
                              across, whole or in running stitches;
                              { dot: [x, y, r] } a padded dot; { ring:
                              [x, y, r], width } a ring. And a run of
                              lettering with clear: n set is not sewn but
                              cuts its way through what the runs before
                              it painted, as far as its edge thread would
                              reach and n CSS px more: an underline that
                              stops short of every letter it crosses
       o.px                   device px to a CSS px
                              Gives back { left, top, right, bottom }, the
                              box in the mask's CSS px that the lettering
                              and its shadow keep within (null where the
                              browser cannot measure ink). The mask is
                              opaque: red the glyphs plumped, green the
                              glyphs as they are, blue the glyphs plumped
                              once more by the width of the edge thread.

   var t = Knit.thread(gl)    the embroidery on a WebGL2 context; null
                              where there can be none. It links as a loom
                              does:
   t.ready(), t.failed        as k.ready() and k.failed
   t.draw(o)                  sews the mask's lettering into the bound
                              framebuffer, over the viewport 0, 0, o.w,
                              o.h, the picture's top row uppermost as on
                              a canvas: premultiplied colour and alpha,
                              nil wherever the lettering and its shadow
                              do not reach, written without blending.
                              True if it drew; false, and nothing
                              touched, before ready(), on a lost context,
                              or for a mask no texture can hold.
       o.mask                 the canvas ink() painted. It is read into a
                              texture and softened the first time it is
                              drawn, and again only after ink() has
                              painted it anew or its size has changed, so
                              a mask kept for each piece of lettering
                              costs nothing more from frame to frame.
                              Every mask stays read for as long as it is
                              drawn, however many there are; its texture
                              is 4 bytes to the px. Past 64 MB of them,
                              room is made of those not drawn for a second
                              nor since room was last made, the stalest
                              first; they are read again if they come
                              back. forget() spares the wait.
       o.w, o.h               device px of the mask and of the picture
       o.px                   device px to a CSS px, as ink() was given
       o.size                 the lettering's font size, CSS px: the
                              floss, the padding, the edge thread and the
                              shadow are cut from it and from px, never
                              from the stitch. Under 46 px the dome begins
                              to flatten, under 30 the threads lose their
                              roundness, and at 19 it is plain flat
                              thread.
       o.thread, o.edge       [r, g, b], display sRGB 0..1: the floss and
                              the edge thread. Lit floss comes back the
                              colour given.
       o.look, o.time, o.still, o.point
                              as for a loom's draw(): the same light
       o.x, o.y               the picture's top-left corner on the page.
                              The light is one light over the whole page,
                              so today they change nothing.
   t.forget(mask)             gives back the texture of a mask that will
                              not be drawn again
   t.free()                   deletes all it made; safe twice, before it
                              has linked, and after a lost context. After
                              a lost context ask for Knit.thread again on
                              the restored one; a mask's own canvas may
                              have lost its paint with it, and wants ink()
                              again.

   What a thread's draw() leaves behind: the framebuffers that were bound
   still bound, the viewport on 0, 0, o.w, o.h, its own program in use,
   no vertex array bound, texture unit 0 active with no 2D texture and no
   sampler on it, the eight switches a loom's draw() turns off off, the
   colour mask all on. The pixel store and the unpack buffer are as it
   found them; it touches no other unit and no clear value. */

(function () {
'use strict';

var root = document.documentElement;
var reduced = matchMedia('(prefers-reduced-motion: reduce)');

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/* the shaders' smoothstep */
function ramp(a, b, x) {
  var t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/* --------------------------------------------------------- the gauge */
/* The stylesheet's --kw and --kh may be any length, clamp() and vw
   included, and a custom property is handed back as it was written; so a
   hidden box is given sixty-four stitches for a width and measured. It is
   measured again after the window changes size.

   The stitch wants to be a whole number of CSS px wide. A tile laid by a
   stylesheet repeats on the lattice only where its own size comes to a
   whole number of device px: at 10.36 px to a stitch one browser scales
   the tile soft and another snaps its period, and the paper walks off the
   lattice. So the rule the loom falls back on goes in steps, 7 px under
   725 px of window and one more for every 250 after, 11 at most, and a
   stylesheet that gives --kw should give those same steps. */

var cell = null;

function measure() {
  var w = 0, h = 0;
  try {
    if (getComputedStyle(root).getPropertyValue('--kw').trim()) {
      var probe = document.createElement('div'), s = probe.style;
      s.position = 'fixed';
      s.left = s.top = s.margin = s.padding = s.borderWidth = s.minWidth = s.minHeight = '0';
      s.maxWidth = s.maxHeight = s.transform = 'none';
      s.boxSizing = 'content-box';
      s.visibility = 'hidden';
      s.pointerEvents = 'none';
      s.width = 'calc(var(--kw) * 64)';
      s.height = 'calc(var(--kh, calc(var(--kw) * 0.8)) * 64)';
      root.appendChild(probe);
      var r = probe.getBoundingClientRect();
      /* a layout that counts in sixty-fourths of a px hands 5.6 back as
         5.59985: to the nearest thousandth */
      w = Math.round(r.width / 64 * 1000) / 1000;
      h = Math.round(r.height / 64 * 1000) / 1000;
      root.removeChild(probe);
    }
  } catch (err) {}
  if (!(w > 0.5)) w = clamp(Math.round(4.6 + 0.4 * (window.innerWidth || 1000) / 100), 7, 11);
  if (!(h > 0.5)) h = 0.8 * w;
  return { w: w, h: h };
}

function gauge() {
  if (!cell) cell = measure();
  return cell;
}

addEventListener('resize', function () { cell = null; lengths = {}; });

/* any length the stylesheet gives the root as a custom property (--fade,
   say), in CSS px, measured as the gauge is, and again after a resize */
var lengths = {};

function length(name) {
  name = String(name);
  if (!/^--[\w-]+$/.test(name)) return 0;
  if (!(name in lengths)) {
    var v = 0;
    try {
      if (getComputedStyle(root).getPropertyValue(name).trim()) {
        var probe = document.createElement('div'), s = probe.style;
        s.position = 'fixed';
        s.left = s.top = s.margin = s.padding = s.borderWidth = s.minHeight = '0';
        s.maxHeight = 'none';
        s.boxSizing = 'content-box';
        s.visibility = 'hidden';
        s.pointerEvents = 'none';
        s.height = 'var(' + name + ')';
        root.appendChild(probe);
        v = probe.getBoundingClientRect().height;
        root.removeChild(probe);
      }
    } catch (err) {}
    lengths[name] = v > 0 ? v : 0;
  }
  return lengths[name];
}

/* a length a caller gives: a number, not negative, not endless */
function span(v) {
  return clamp(+v || 0, 0, 1e5);
}

function even(v) {
  return Math.max(2, 2 * Math.round(v / 2));
}

function share(q) {
  return q > 0 ? Math.min(q, 1) : q === 0 ? 0.05 : 1;
}

/* A canvas's store is as many device px as its box, to the nearest whole
   one each way and whether that is even or odd: one px more or fewer and
   the browser resamples the whole fabric soft. Past the cap it is scaled
   anyway, and both sides are rounded down. */
function fit(cssW, cssH, q) {
  var s = Math.min(window.devicePixelRatio || 1, 2) * share(q);
  var w = span(cssW) * s, h = span(cssH) * s, over = Math.sqrt(w * h / 4.4e6);
  if (over > 1) return [Math.max(1, Math.floor(w / over)), Math.max(1, Math.floor(h / over))];
  return [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))];
}

function scene(cssW, cssH, q) {
  var s = 6 / gauge().w * share(q);
  return [even(span(cssW) * s), even(span(cssH) * s)];
}

/* -------------------------------------------------------- the pointer */
/* Where the pointer is across the viewport, followed a little behind.
   Only a mouse or a pen leads it, and it goes home when the pointer
   leaves the window. Every draw call brings it a step nearer by the time
   that has passed; calls that fall within the same frame share a step,
   so two canvases drawn together are lit alike. */

var point = { x: 0, y: 0 };
var aim = { x: 0, y: 0 };
var stepped = 0;

function home() { aim.x = aim.y = 0; }

addEventListener('pointermove', function (ev) {
  if (reduced.matches || (ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen')) return;
  aim.x = clamp(ev.clientX / Math.max(window.innerWidth, 1) * 2 - 1, -1, 1);
  aim.y = clamp(ev.clientY / Math.max(window.innerHeight, 1) * 2 - 1, -1, 1);
}, { passive: true });
root.addEventListener('mouseleave', home);
addEventListener('blur', home);

function follow() {
  var now = performance.now(), dt = now - stepped;
  if (reduced.matches) {
    aim.x = aim.y = point.x = point.y = 0;
    return;
  }
  if (dt < 3) return;
  stepped = now;
  var k = 1 - Math.exp(-Math.min(dt, 50) / 150);
  point.x += (aim.x - point.x) * k;
  point.y += (aim.y - point.y) * k;
  if (Math.abs(aim.x - point.x) + Math.abs(aim.y - point.y) < 0.002) {
    point.x = aim.x;
    point.y = aim.y;
  }
}

function moving() {
  return !reduced.matches && (point.x !== aim.x || point.y !== aim.y);
}

/* ------------------------------------------------------------ shaders */

var VERT = `#version 300 es
void main() {
  gl_Position = vec4(float((gl_VertexID << 1) & 2) * 2.0 - 1.0, float(gl_VertexID & 2) * 2.0 - 1.0, 0.0, 1.0);
}`;

/* The stitch map: one texel to a stitch that touches the canvas, and two
   more all round. Each takes the average of the picture over its own cell
   of the lattice, thirty taps of it, in linear light; and where one small
   thing far outshines the rest (the moon, a star, a firefly, a flower)
   the stitch leans toward it, so it comes through as one lit stitch
   instead of going under in the average.

   A light that lies across two stitches, or four, must not light each of
   them in full, or it would flare every time it drifted over an edge. So
   the taps go on one further all round the cell, and tell how much of the
   bright thing is this stitch's own: it leans by that share, and judges
   the thing's size by the whole of it and not by the part it holds. The
   shares are of the light over the darkest tap, cubed, so that what is
   bright counts and the grain of the ground does not; the cubes are
   summed about the cell's middle tap and moved to the darkest afterward,
   which is one pass and loses nothing to rounding.

   Where the cloth goes on past the canvas (GROUND), the stitches that are
   not the picture's own take the ground's colour and read no picture. In
   alpha goes the number that is the stitch's own, hashed here from its
   index, once a stitch, so the fabric need hash nothing. No mipmaps
   anywhere.
   BOX: the picture's uv at the top-left corner of the map's first cell
   and a cell's size in uv, v counted down from the top. */
var REDUCE = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D PIC;
uniform vec4 BOX;
uniform vec4 FLAT;
uniform vec4 GROUND;    /* rgb: the cloth the canvas is set in; a: 1 where there is any */
uniform ivec4 OWN;      /* the first and the last stitch that are the picture's own, across and down */
uniform ivec2 FIRST;    /* the stitch the map's first texel stands for */
uniform ivec4 WRAP;     /* a stitch's own number repeats every xy stitches; zw lifts the index clear of zero */
uniform vec2 FADE;      /* the row the picture begins to give way to the ground below it, and over how many rows */
uniform vec4 YARNA;     /* rgb: the sweater's first yarn (snowflakes, stripes); a: 1 where the picture ends in the sweater's band */
uniform vec3 YARNB;     /* the second (trees) */
uniform ivec2 MID;      /* the wale a snowflake stands on, and the band's lowest row */
out vec4 o;
/* a snowflake and a tree, 7 stitches across and 9 rows down (a row is
   shorter than a stitch is wide, so they come out square), a bit a
   stitch, the top row first. The snowflake's arms that run corner to
   corner are a V a row, each on its own, as on any knitted snowflake */
const uint SNOW[9] = uint[9](8u, 73u, 42u, 28u, 119u, 28u, 42u, 73u, 8u);
const uint TREE[9] = uint[9](8u, 28u, 62u, 28u, 62u, 127u, 8u, 8u, 0u);
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  ivec2 at = FIRST + ivec2(cell);
  vec3 c = FLAT.rgb * FLAT.rgb;
  if (GROUND.a > 0.5 && (any(lessThan(at, OWN.xy)) || any(greaterThan(at, OWN.zw)))) {
    c = GROUND.rgb * GROUND.rgb;
  } else if (FLAT.a < 0.5) {
    vec3 sum = vec3(0.0), top = vec3(0.0);
    vec3 t0 = textureLod(PIC, vec2(BOX.x + (cell.x + 0.5) * BOX.z, 1.0 - BOX.y - (cell.y + 0.5) * BOX.w), 0.0).rgb;
    float mid = dot(t0 * t0, vec3(0.25, 0.6, 0.15));
    float hi = -1.0, lo = 9.0, low = 9.0;
    vec3 mine = vec3(0.0), all = vec3(0.0);
    for (int j = -1; j < 6; j++) {
      for (int i = -1; i < 7; i++) {
        vec2 q = BOX.xy + (cell + (vec2(float(i), float(j)) + 0.5) / vec2(6.0, 5.0)) * BOX.zw;
        vec3 t = textureLod(PIC, vec2(q.x, 1.0 - q.y), 0.0).rgb;
        t *= t;
        float l = dot(t, vec3(0.25, 0.6, 0.15));
        float d = l - mid;
        vec3 pw = vec3(d, d * d, d * d * d);
        all += pw;
        low = min(low, l);
        if (i >= 0 && i < 6 && j >= 0 && j < 5) {
          sum += t;
          mine += pw;
          lo = min(lo, l);
        }
        if (l > hi) { hi = l; top = t; }
      }
    }
    vec3 avg = sum / 30.0;
    float la = dot(avg, vec3(0.25, 0.6, 0.15));
    /* the sums of (l - low) cubed, from the sums about the middle tap */
    float e = low - mid;
    vec3 k = vec3(3.0 * e * e, -3.0 * e, 1.0);
    float share = clamp((dot(mine, k) - 30.0 * e * e * e) / max(dot(all, k) - 56.0 * e * e * e, 1e-7), 0.0, 1.0);
    /* how much of a cell the bright thing fills, all of it, and how far it stands out */
    float part = (la - lo) / (max(hi - lo, 1e-4) * max(share, 0.05));
    c = mix(avg, top, 0.62 * share * (1.0 - smoothstep(0.03, 0.22, part)) * smoothstep(0.02, 0.14, hi - la));
  }
  /* and in alpha a number that is the stitch's own, from its index alone */
  uvec2 id = uvec2((at + WRAP.zw) % WRAP.xy);
  uint n = id.x * 0x045d9f3bu ^ (id.y * 0x119de1f3u + 0x9e3779b9u);
  n ^= n >> 15u;
  n *= 0x2c1b3c6du;
  n ^= n >> 12u;
  n *= 0x297a2d39u;
  n ^= n >> 15u;
  /* Above the ground the picture gives way to it as colourwork does: row
     by row more of the stitches are worked in the ground's yarn, each
     stitch taking it at its own row, so the last rows of the picture are
     flecked with the ground and the first of the ground with the picture,
     and no stitch is ever cut by the change */
  /* Or it ends as a holiday sweater's yoke is worked, counted up from
     its lowest row: two rows of the ground, a stripe, a row of the
     ground, nine rows of snowflakes between trees with a stitch either
     side of each, a row of the ground, a stripe, a row of the ground,
     and the picture's teeth, one stitch at the tip and two more each row
     up until they meet; and below it the ground. Every stitch is all one
     yarn */
  if (YARNA.a > 0.5 && GROUND.a > 0.5) {
    int b = MID.y - at.y;
    if (b < 20) {
      vec3 d = GROUND.rgb;
      if (b == 2 || b == 14) {
        d = YARNA.rgb;
      } else if (b >= 4 && b <= 12) {
        int m = 12 - b, p = ((at.x - MID.x + 4) % 18 + 18) % 18;
        int k = p < 9 ? p - 1 : p - 10;
        uint row = p < 9 ? SNOW[m] : TREE[m];
        if (k >= 0 && k < 7 && ((row >> uint(k)) & 1u) == 1u) d = p < 9 ? YARNA.rgb : YARNB.rgb;
      } else if (b >= 16) {
        int q = ((at.x - MID.x + 4) % 8 + 8) % 8;
        if (abs(q - 4) <= b - 16) d = sqrt(max(c, 0.0));
      }
      c = d * d;
    }
  } else if (FADE.y > 0.0 && GROUND.a > 0.5) {
    float s = clamp((float(at.y) + 1.0 - FADE.x) / FADE.y, 0.0, 1.0);
    float u = mix(0.3, 0.7, float((n >> 8u) & 255u) / 255.0);
    vec3 d = mix(sqrt(max(c, 0.0)), GROUND.rgb, smoothstep(u - 0.3, u + 0.3, s));
    c = d * d;
  }
  o = vec4(sqrt(max(c, 0.0)), float(n >> 24u) / 255.0);
}`;

/* The fabric. Units: stitch widths across, rows down (a row is RHO
   widths), heights in widths, z toward the eye.

   A leg runs from its foot, EB rows below its stitch's cell and AB from
   the wale's centre, up and outward to its head, ET rows above the cell
   and AT from the centre; t is 0 at the foot and 1 at the head. The two
   feet of a stitch lie side by side and make the point of its V. A leg
   is plumpest in the middle, arches two fifths of the way up, stands ZB
   higher at the foot than at the head and goes on down past both ends, so
   the foot comes up out of the stitch below and the head goes under the
   one above. x is folded about the wale's centre and about its edge, so
   one leg stands for its mirror twin and its neighbour; at any point only
   two stitches can be on top, the cell's own and the one above (in the
   top 0.38 of the row, where its foot hangs in) or below (elsewhere,
   where its head comes up). That holds for rows from 0.7 to 0.9 of a
   width.

   Nothing in it is a step: wherever one yarn gives way to another (a leg
   crossing a leg, a fold, the edge of a wale) the two are blended over
   about a pixel, and every height slopes finitely. So a pointer that
   moves a hair moves every pixel a hair, and nothing pops. */
var FABRIC = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D MAP;
uniform ivec4 BOX;      /* the map: the stitch its first texel stands for, and its last texel */
uniform ivec2 CELL;     /* the stitch the canvas's top-left corner lies in */
uniform vec4 FRAME;     /* xy: that corner within its stitch; zw: stitches and rows to a device px */
uniform vec4 GAUGE;     /* drawing buffer height, device px to a stitch, RHO, relief */
uniform vec3 LIGHT;     /* toward the key light: x right, y down, z to the eye; unit */
uniform vec4 EYE;       /* xy: the eye's tilt, widths per width of height; z: steps toward the light; w: 1 to follow the eye's ray */
uniform vec3 KEY;       /* the key light's colour */
uniform vec3 FILL;      /* the fill's */
uniform vec4 CALM;      /* where the picture's own stitches begin and end, in stitches and rows from the corner's: left, top, right, bottom */
uniform vec4 REST;      /* xyz: toward the key light with the pointer at rest; w: what the lights are worth there, to what they are worth now */
uniform vec2 LEVEL;     /* the eye's tilt at rest */
uniform vec4 WX;        /* the hand's wander: its frequencies across */
uniform vec4 WY;        /* and down */
uniform vec2 TRIM;      /* the exposure a fine gauge needs: over all, and more as the yarn is paler */
uniform float SETTLE;   /* over how many rows the cloth comes to rest above the ground below it */
out vec4 o;

const float EB = 0.18, ET = 0.42, LEN = 1.60;
const float AB = 0.09, AT = 0.40;
const float RAD = 0.225;
const float ZA = 0.21, ZB = 0.17, ZH = -0.10;
const float ZTOP = 0.45, ZFLOOR = -0.22, ZREF = 0.30;
const float TWL = 0.40;   /* a ply's ridge comes round this often along the yarn */
const float TWK = 2.7;    /* and this far round across it */

/* a leg's height over a point: a from the wale's centre, t along the leg.
   g: across the centre line, beyond its ends, the centre line's lean, radius. */
float strand(float a, float t, float rho, float fat, out vec4 g, out vec2 zz) {
  float tc = clamp(t, 0.0, 1.0);
  float u = tc * (1.0 - tc);
  float m = (AT - AB) * 6.0 * u / (LEN * rho);
  float dx = a - mix(AB, AT, tc * tc * (3.0 - 2.0 * tc));
  float dy = (t - tc) * LEN * rho;
  float rad = RAD * fat * (0.70 + 1.20 * u);
  float c = rad * rad - dx * dx / (1.0 + m * m) - dy * dy;
  float zd = 4.0 * ZA * (1.0 - 2.0 * tc) - ZB;
  float zc = ZH + ZB * (1.0 - tc) + 4.0 * ZA * u + zd * (t - tc);
  g = vec4(dx, dy, m, rad);
  zz = vec2(zc, zd);
  return zc + sqrt(max(c, 1e-8)) + min(c, 0.0) * 6.0;
}

/* the height of the fabric over p, for the two walks: the same legs, their
   backs parabolas instead of circles. A round back is upright at its edge,
   and a ray that grazes one would jump as the light swings; these slope
   no more than two in one anywhere, so every step is steady. */
float relief(vec2 p, float rho, float fat) {
  float a = abs(fract(p.x) - 0.5);
  float f = fract(p.y);
  float jn = f < 0.38 ? -1.0 : 1.0;
  float h = ZFLOOR;
  for (int k = 0; k < 2; k++) {
    float t = (float(k) * jn + 1.0 + EB - f) / LEN;
    float tc = clamp(t, 0.0, 1.0);
    float u = tc * (1.0 - tc);
    float m = (AT - AB) * 6.0 * u / (LEN * rho);
    float dx = a - mix(AB, AT, tc * tc * (3.0 - 2.0 * tc));
    float dy = (t - tc) * LEN * rho;
    float rad = RAD * fat * (0.70 + 1.20 * u);
    h = max(h, ZH + ZB * (1.0 - tc) + 4.0 * ZA * u + (4.0 * ZA * (1.0 - 2.0 * tc) - ZB) * (t - tc) + rad - (dx * dx / (1.0 + m * m) + dy * dy) / rad);
  }
  return h;
}

void main() {
  float sw = GAUGE.y, rho = GAUGE.z;
  float pxw = 1.0 / sw;
  vec2 st = FRAME.xy + vec2(gl_FragCoord.x, GAUGE.x - gl_FragCoord.y) * FRAME.zw;

  /* Past the picture's own stitches the cloth is the ground's, and goes
     on beyond the canvas as a tile laid once, with the pointer at rest.
     So there the fabric lies at rest too, light and eye, and is worked
     the full way whatever the rest of the canvas gets: or the canvas's
     edge would show in the ground as a ruled line every time the pointer
     moved. The change is spread over the picture's last row. */
  float calm = 0.0;
  vec3 light = LIGHT;
  vec2 lean = EYE.xy;
  if (st.x < CALM.x + 0.9 || st.y < CALM.y + 0.9 || st.x > CALM.z - 0.9 || st.y > CALM.w - SETTLE) {
    calm = max(max(1.0 - smoothstep(CALM.x, CALM.x + 0.9, st.x), smoothstep(CALM.z - 0.9, CALM.z, st.x)),
      max(1.0 - smoothstep(CALM.y, CALM.y + 0.9, st.y), smoothstep(CALM.w - SETTLE, CALM.w, st.y)));
    light = mix(LIGHT, REST.xyz, calm);
    light.xy *= 0.905 * inversesqrt(max(dot(light.xy, light.xy), 0.01));
    lean = mix(EYE.xy, LEVEL, calm);
  }
  bool full = EYE.w > 0.5 || calm > 0.0;
  float steps = calm > 0.0 ? 4.0 : EYE.z;

  /* knitted by hand: the wales wander, no two stitches sit quite alike,
     and the yarn runs a little thick and thin */
  vec2 at = vec2(CELL) + st;
  float w1 = sin(at.x * WX.x + at.y * WY.x);
  float w2 = sin(at.x * WX.y - at.y * WY.y + 1.3 * w1);
  vec2 jit = sin(vec2(at.x * WX.z + at.y * WY.z + 2.0 * w2, at.x * WX.w - at.y * WY.w + 1.0));
  st += vec2(0.034 * w1, 0.030 * w2) + 0.016 * jit;
  float fat = 1.0 + 0.045 * jit.x * jit.y;

  /* Two walks over the relief, in one loop, so that the relief is written
     out once and compiled once. Steps 0 and 1 go down the eye's ray to
     the yarn: where the ray stands over the fabric at the height of the
     fabric under it, twice over. Where they land, the two legs that can
     be on top are worked out, one after the other, and give the height of
     the point the eye sees. Steps 2 to 5 go from that point toward the
     light, and find what stands in the way. The cheaper fabric leaves
     out the first two and the last two: the loop's ends come from EYE. */
  vec2 tilt = vec2(lean.x, lean.y / rho);
  vec2 rake = vec2(light.x, light.y / rho) / light.z;
  vec2 p = st, cf = floor(st);
  float zv = ZREF, sh = 0.0, h = ZFLOOR;
  float fx = 0.5, f = 0.5, a = 0.0, jn = 1.0;
  vec4 gA = vec4(0.0, 0.0, 0.0, RAD), gB = gA;
  vec2 zA2 = vec2(0.0), zB2 = zA2;
  float tA = 0.0, tB = 0.0, zA = ZFLOOR, zB = ZFLOOR;
  int first = full ? 0 : 2, last = 2 + int(steps);
  for (int i = first; i < last; i++) {
    vec2 q = st;
    float zi = 0.0, s = 1.0;
    if (i < 2) {
      q = st + tilt * (zv - ZREF);
    } else {
      if (i == 2) {
        p = st + tilt * (zv - ZREF);
        cf = floor(p);
        fx = p.x - cf.x;
        f = p.y - cf.y;
        a = abs(fx - 0.5);
        jn = f < 0.38 ? -1.0 : 1.0;
        /* the cell's own leg, then the one from above or below */
        for (int k = 0; k < 2; k++) {
          vec4 g;
          vec2 zz;
          float t = (float(k) * jn + 1.0 + EB - f) / LEN;
          float z = strand(a, t, rho, fat, g, zz);
          if (k == 0) {
            tA = t;
            zA = z;
            gA = g;
            zA2 = zz;
          } else {
            tB = t;
            zB = z;
            gB = g;
            zB2 = zz;
          }
        }
        h = max(max(zA, zB), ZFLOOR);
      }
      s = float(i - 1) / steps;
      zi = h + (ZTOP - h) * s * (0.4 + 0.6 * s) + 0.004;
      q = p + rake * (zi - h);
    }
    float r = relief(q, rho, fat);
    if (i < 2) zv = r;
    else sh = max(sh, (r - zi) / (0.065 + 0.11 * s));
  }

  float side = fx < 0.5 ? -1.0 : 1.0;
  ivec2 id = CELL + ivec2(cf);
  ivec2 idn = id + ivec2(0, int(jn));
  /* where one crosses the other they are blended over about a pixel */
  float soft = clamp(1.5 * pxw, 0.07, 0.22);
  float w = smoothstep(-soft, soft, zA - zB);
  float h2 = max(min(zA, zB), ZFLOOR);
  float on = clamp((h - ZFLOOR) * 10.0, 0.0, 1.0);

  /* each stitch's one colour, and in alpha the number that is its own. At
     the wale's edge the neighbour's yarn takes over: there they change
     hands over a pixel, so no hard line stands where two colours meet */
  vec4 cA = texelFetch(MAP, clamp(id - BOX.xy, ivec2(0), BOX.zw), 0);
  vec4 cB = texelFetch(MAP, clamp(idn - BOX.xy, ivec2(0), BOX.zw), 0);
  float hand = 0.5 * smoothstep(0.5 - clamp(1.2 * pxw, 0.02, 0.2), 0.5, a);
  if (hand > 0.0) {
    ivec2 nb = ivec2(int(side), 0);
    cA = mix(cA, texelFetch(MAP, clamp(id + nb - BOX.xy, ivec2(0), BOX.zw), 0), hand);
    cB = mix(cB, texelFetch(MAP, clamp(idn + nb - BOX.xy, ivec2(0), BOX.zw), 0), hand);
  }
  vec2 mine = vec2(cA.a, cB.a);

  /* a pixel astride a fold sees a strand and its twin: there what is
     mirrored cancels, and the valley between them is rounded off */
  float ws = max(0.085, 1.25 * pxw);
  float centre = 1.0 - smoothstep(0.0, ws, a);
  float groove = smoothstep(0.5 - ws, 0.5, a);
  float open = (1.0 - centre) * (1.0 - groove);

  /* the plies: two, twisted the same way round whichever leg it is, each
     leg's from its own stitch's phase */
  float ply = smoothstep(7.0, 13.0, sw) * open * on;
  vec2 sv = inversesqrt(1.0 + vec2(gA.z * gA.z, gB.z * gB.z));
  vec2 psi = 6.2832 * (vec2(tA, tB) * (LEN * rho / TWL) + 7.0 * mine) + TWK * side * vec2(gA.x, gB.x) * sv / vec2(gA.w, gB.w);
  float wave = mix(sin(psi.y), sin(psi.x), w);
  float ridge = 0.5 + 0.5 * mix(cos(psi.y), cos(psi.x), w);
  vec2 ml = sin(0.5 * psi + 81.68 * mine);
  float tone = (0.955 + 0.09 * mix(mine.y, mine.x, w)) * (1.0 + 0.07 * ply * mix(ml.y, ml.x, w));
  /* and, where there are pixels for them, the fibres streaked along the plies */
  if (sw > 11.0 && full) {
    vec2 hr = sin(4.0 * psi + 9.0 * vec2(tA, tB) + 182.2 * mine);
    tone *= 1.0 + 0.035 * ply * smoothstep(11.0, 20.0, sw) * mix(hr.y, hr.x, w);
  }

  /* the leg on top: its frame and its normal */
  vec4 g = mix(gB, gA, w);
  vec2 zz = mix(zB2, zA2, w);
  float im = 1.0 / (1.0 + g.z * g.z);
  float sm = sqrt(im);
  vec2 along = vec2(g.z, -1.0) * sm;
  vec2 across = vec2(1.0, g.z) * sm;
  /* a pixel at the silhouette sees the normals under it averaged, not the grazing one */
  vec2 q = vec2(g.x * im, g.x * g.z * im - g.y) / g.w * (1.0 - min(0.5, 0.55 * pxw / g.w));
  float nz = sqrt(max(1.0 - dot(q, q), 0.03));
  float zs = zz.y / (LEN * rho);
  vec3 n = vec3(q.x, q.y + zs * nz, nz);
  n.xy += 0.32 * ply * wave * (along * 0.55 + across * side * 0.45) * nz;
  n = mix(vec3(0.0, 0.0, 1.0), n, on);
  float valley = centre * clamp(-n.x * 1.6, 0.0, 1.0) + groove * clamp(n.x * 1.6, 0.0, 1.0);
  float unfold = side * open;
  n.x *= unfold;
  /* stitches only a few pixels across: lit from the side, one leg of every
     V would outshine the other and the cloth read as twill; the light is
     let fall more evenly there */
  n.xy *= 1.0 - 0.55 * (1.0 - smoothstep(6.0, 13.0, sw));
  n = normalize(n);
  /* the fibres lie along the plies */
  vec3 tf = vec3(unfold * along.x * 0.65 - 0.76 * across.x * nz, along.y * 0.65 - unfold * 0.76 * across.y * nz, unfold * 0.76 * q.x - zs * 0.65);

  /* what stood in the light's way */
  float lit = 1.0 - clamp(sh, 0.0, 1.0);
  lit = lit * lit * (3.0 - 2.0 * lit);
  /* stitches only a few pixels across: the hollows are eased, or they turn to dots */
  float fine = 1.0 - smoothstep(6.0, 12.0, sw);
  lit = mix(lit, 1.0, 0.6 * fine);

  /* how buried the point is: deep in a gap, in the crease where two
     strands cross, in the valley where twins meet, between two plies */
  float depth = clamp((h - ZFLOOR) / (0.40 - ZFLOOR), 0.0, 1.0);
  float crease = clamp((h - h2) / 0.10, 0.0, 1.0);
  float ao = mix(0.18, 1.0, depth * depth * (3.0 - 2.0 * depth)) * (0.66 + 0.34 * crease) * (1.0 - 0.30 * valley);
  ao *= (1.0 - 0.22 * ply * (1.0 - ridge)) * mix(1.0, 0.55 + 0.45 * nz, on);
  ao = mix(ao, 0.85, 0.7 * fine);

  /* the yarn: the stitch's colour, each length a shade of its own, the
     two plies not quite alike, the fibres streaked along them */
  vec3 yarn = mix(cB.rgb, cA.rgb, w);
  vec3 alb = yarn * yarn * tone;

  /* light gets about inside pale wool and fills its hollows; dark wool
     keeps them, and what comes back out of a hollow is deeper in colour.
     It is the fill that gets about so. What the key light throws keeps
     its own shade whatever the yarn: let that be filled in too and every
     leg of white wool lies flat white, with a dot of a hollow to it, and
     the paper reads as a sheet of ticks and not as knitting */
  float lum = dot(yarn * yarn, vec3(0.2126, 0.7152, 0.0722));
  vec3 pale = min(mix(vec3(dot(yarn, vec3(0.25, 0.6, 0.15))), yarn, 0.25), vec3(1.0));
  vec3 kb = 0.90 * pale * pale;
  vec3 aoC = ao / (1.0 - kb * (1.0 - ao));
  float ndl = dot(n, light);
  float wrap = clamp((ndl + 0.20) / 1.20, 0.0, 1.0);
  float dif = wrap * wrap * (3.0 - 2.0 * wrap);
  float direct = dif * lit;
  vec3 deep = alb * alb / (dot(alb, vec3(0.3333)) + 1e-3);
  vec3 c = mix(alb, deep, (0.05 + 0.15 * lum) * (1.0 - ao)) * (FILL * 0.17 * aoC + KEY * 1.80 * (direct * (0.45 + 0.55 * aoC) + 0.30 * kb * kb * (1.0 - direct)));
  /* light gets into wool: the edge of the shade is coloured, not grey */
  c += deep * KEY * 0.04 * wrap * (1.0 - wrap) * 4.0 * lit;

  /* the sheen along the fibres, and the nap: a rim on every lit edge and
     a halo standing off it, over whatever lies behind */
  vec3 hv = normalize(light + vec3(0.0, 0.0, 1.0));
  vec3 tn = tf * inversesqrt(dot(tf, tf) + 1e-6);
  float th = dot(tn, hv);
  float sn = max(1.0 - th * th, 0.0);
  float s4 = sn * sn;
  s4 *= s4;
  float sheen = s4 * s4 * s4 * smoothstep(-0.1, 0.5, ndl) * lit * on;
  vec3 nap = KEY * (alb * 1.35 + 0.004);
  float ndh = max(dot(n, hv), 0.0);
  float glint = ndh * ndh;
  glint *= glint;
  glint *= glint * glint;
  c += KEY * (alb * 1.6 + 0.006) * (sheen * 0.16 + glint * 0.60 * lit * on) * ao;
  float rim = 1.0 - n.z;
  rim *= rim;
  c += nap * rim * clamp(0.15 + 1.2 * dot(n.xy, light.xy), 0.0, 1.0) * 0.8 * on * mix(lit, 1.0, 0.3);
  if (full) {
    vec2 oA = vec2(gA.x, gA.x * gA.z - gA.y * (1.0 + gA.z * gA.z)), oB = vec2(gB.x, gB.x * gB.z - gB.y * (1.0 + gB.z * gB.z));
    float eA = sqrt(gA.x * gA.x / (1.0 + gA.z * gA.z) + gA.y * gA.y) / gA.w, eB = sqrt(gB.x * gB.x / (1.0 + gB.z * gB.z) + gB.y * gB.y) / gB.w;
    vec2 past = vec2(eA, eB);
    vec2 halo = (1.0 - smoothstep(vec2(1.0), vec2(1.6), past)) * smoothstep(vec2(0.8), vec2(1.0), past)
      * smoothstep(vec2(-0.07), vec2(0.03), vec2(zA2.x + 0.35 * gA.w, zB2.x + 0.35 * gB.w) - h)
      * clamp(1.3 * vec2(dot(vec2(oA.x * unfold, oA.y), light.xy) * inversesqrt(dot(oA, oA) + 1e-6), dot(vec2(oB.x * unfold, oB.y), light.xy) * inversesqrt(dot(oB, oB) + 1e-6)) - 0.1, 0.0, 1.0);
    c += nap * min(halo.x + halo.y, 1.0) * 0.42 * mix(lit, 1.0, 0.5);
  }

  /* the exposure that gives each yarn back, on average, the colour it was
     given (measured, grey by grey; TRIM is what the gauge adds to that;
     the last term is for the nearly white, which cannot come back whole
     and still have a shaded side, and are set a shade under themselves),
     and a shoulder that rolls the highlights off instead of clipping them
     and keeps most of the yarn's hue: so white wool keeps its relief and
     cream stays cream */
  float grey = dot(yarn, vec3(0.2126, 0.7152, 0.0722));
  float g2 = grey * grey, g4 = g2 * g2;
  c *= mix(1.0, REST.w, calm) * TRIM.x * (1.0 - TRIM.y * (0.03 + 0.10 * g2 * grey)) * (0.9052 + grey * (0.9734 + grey * (1.6477 * grey - 2.4214)) + 0.5806 * g4 * g4 * g2 - 0.2687 * smoothstep(0.9255, 1.0, grey));
  vec3 peak = max(mix(vec3(max(max(c.r, c.g), c.b)), c, 0.45), 0.55);
  c *= (1.0 - 0.45 * exp(-(peak - 0.55) / 0.45)) / peak;
  o = vec4(mix(yarn, sqrt(max(c, 0.0)), GAUGE.w), 1.0);
}`;

/* ----------------------------------------------------------- the light */
/* What every program of the loom shares, so that fabric and floss are
   lit as one. */

/* each look's key light and fill, a warm one against a cool one and the
   other way about at night, and the balance that makes the two together
   give a grey yarn back grey */
var LOOKS = {
  key: [[1.02, 1.0, 0.97], [1.035, 0.99, 0.95], [0.975, 0.995, 1.03]],
  fill: [[0.98, 1.0, 1.03], [0.96, 0.99, 1.05], [1.01, 1.0, 0.985]],
  white: [[0.989, 1.0, 1.016], [0.974, 1.0, 1.0175], [1.014, 1.0, 0.978]]
};

/* further off than any stitch */
var FAR = 1 << 30;

/* the hand's wander: how fast each of its waves turns, across and down */
var WAVES = { x: [0.23, 0.53, 2.39, 1.37], y: [0.71, 0.37, 1.13, 2.71] };

/* the pointer a draw call is to use: the one it was given, none when
   nothing may move, or the eased one. The eased one is the page's and not
   any one draw's, so every draw call steps it on first, whichever it uses
   itself and whether or not it can draw at all: otherwise a page whose
   draws are all still, or whose loom is not ready or has lost its
   context, would wait for ever on moving() */
function aimed(o) {
  var pt = o.point || (o.still ? [0, 0] : [point.x, point.y]);
  return [clamp(+pt[0] || 0, -1, 1), clamp(+pt[1] || 0, -1, 1)];
}

/* toward the key light, x right, y down, z to the eye, a unit vector: from
   the upper left and low, swung round by the pointer at one height, so
   the fabric neither brightens nor dims as it turns; left to itself it
   sways a little */
function sun(pt, time, still) {
  var x = -0.52 + 0.30 * pt[0] + (still ? 0 : 0.045 * Math.sin(time * 0.31));
  var y = -0.68 + 0.30 * pt[1] + (still ? 0 : 0.045 * Math.cos(time * 0.23));
  var k = 0.905 / Math.max(Math.hypot(x, y), 0.1);
  return [x * k, y * k, 0.4254];
}

/* the two lights' colours for a blend of looks, times k */
function tints(look, k) {
  look = look || [1, 0, 0];
  var sum = (+look[0] || 0) + (+look[1] || 0) + (+look[2] || 0);
  if (!(sum > 1e-3)) {
    look = [1, 0, 0];
    sum = 1;
  }
  var key = [0, 0, 0], fill = [0, 0, 0];
  for (var i = 0; i < 3; i++) {
    for (var c = 0; c < 3; c++) {
      var w = (+look[i] || 0) / sum * LOOKS.white[i][c] * k;
      key[c] += w * LOOKS.key[i][c];
      fill[c] += w * LOOKS.fill[i][c];
    }
  }
  return { key: key, fill: fill };
}

/* ----------------------------------------------------------- programs */

/* a program is linked but not waited on: with the parallel compile
   extension the driver builds it off the main thread */
function program(gl, frag, names) {
  var vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER), p = gl.createProgram();
  if (!vs || !fs || !p) {
    scrap(gl, null, [{ p: p, vs: vs, fs: fs }]);
    return null;
  }
  gl.shaderSource(vs, VERT);
  gl.compileShader(vs);
  gl.shaderSource(fs, frag);
  gl.compileShader(fs);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  return { p: p, vs: vs, fs: fs, names: names, u: {} };
}

/* Programs given back, as many of them as were made. One that is still
   being linked off the main thread is left until that is over, and looked
   in on now and then: a browser asked to delete it in the middle goes on
   asking after it, finds it gone, and puts an error on the context. One
   the context no longer knows went with a lost context, even if the
   context has come back since: there is nothing to wait for or delete,
   and to ask after it would put an error on the restored context every
   time it was looked in on, for good. */
function scrap(gl, psc, progs) {
  var late = [];
  progs.forEach(function (g) {
    if (!g) return;
    gl.deleteShader(g.vs);
    gl.deleteShader(g.fs);
    if (!g.p || !gl.isProgram(g.p)) return;
    if (psc && !gl.getProgramParameter(g.p, psc.COMPLETION_STATUS_KHR)) late.push({ p: g.p });
    else gl.deleteProgram(g.p);
  });
  if (late.length) setTimeout(function () { scrap(gl, psc, late); }, 40);
}

/* whether they have all linked: 1, and their uniforms are found; 0, not
   yet; -1, never */
function linked(gl, psc, progs) {
  var i, j, g;
  if (psc) {
    for (i = 0; i < progs.length; i++) if (!gl.getProgramParameter(progs[i].p, psc.COMPLETION_STATUS_KHR)) return 0;
  }
  for (i = 0; i < progs.length; i++) {
    g = progs[i];
    if (!gl.getProgramParameter(g.p, gl.LINK_STATUS)) {
      if (gl.isContextLost()) return 0;
      console.error(gl.getShaderInfoLog(g.vs) || gl.getShaderInfoLog(g.fs) || gl.getProgramInfoLog(g.p));
      return -1;
    }
    for (j = 0; j < g.names.length; j++) g.u[g.names[j]] = gl.getUniformLocation(g.p, g.names[j]);
  }
  return 1;
}

function webgl2(gl) {
  return !!gl && typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext && !gl.isContextLost();
}

/* ------------------------------------------------------------ a pass */

function pass(gl) {
  if (!webgl2(gl)) return null;

  var PSC = gl.getExtension('KHR_parallel_shader_compile');
  var reduce = program(gl, REDUCE, ['PIC', 'BOX', 'FLAT', 'GROUND', 'OWN', 'FIRST', 'WRAP', 'FADE', 'YARNA', 'YARNB', 'MID']);
  var fabric = program(gl, FABRIC, ['MAP', 'BOX', 'CELL', 'FRAME', 'GAUGE', 'LIGHT', 'EYE', 'KEY', 'FILL', 'CALM', 'REST', 'LEVEL', 'WX', 'WY', 'TRIM', 'SETTLE']);
  var vao = gl.createVertexArray();
  if (!reduce || !fabric || !vao) {
    scrap(gl, PSC, [reduce, fabric]);
    gl.deleteVertexArray(vao);
    return null;
  }
  var progs = [reduce, fabric];
  var most = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
  var dead = false, lost = false, freed = false, ok = false, asked = false;
  var k = { failed: false };

  /* a context once lost takes everything made on it along: this loom is
     over, whether or not the context comes back, and there is nothing
     left of it to delete (a context that has come back would only
     complain of being handed another's objects) */
  function gone() { dead = lost = true; }
  if (gl.canvas && gl.canvas.addEventListener) gl.canvas.addEventListener('webglcontextlost', gone);

  /* the picture's target and the stitch map: a texture and its framebuffer each */
  var pic = { t: null, f: null, w: 0, h: 0 };
  var map = { t: null, f: null, w: 0, h: 0 };

  /* sized, or sized again: a new texture of fixed storage hung on the
     framebuffer, and the 2D texture and the framebuffers that were bound
     put back as they were */
  function size(s, w, h, filter) {
    var t0 = gl.getParameter(gl.TEXTURE_BINDING_2D);
    var d0 = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING), r0 = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    if (s.t) gl.deleteTexture(s.t);
    else s.f = gl.createFramebuffer();
    s.t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, s.t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, s.f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, s.t, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, d0);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, r0);
    gl.bindTexture(gl.TEXTURE_2D, t0);
    s.w = w;
    s.h = h;
  }

  k.ready = function () {
    if (dead || k.failed || gl.isContextLost()) return false;
    if (!ok) {
      var state = linked(gl, PSC, progs);
      k.failed = state < 0;
      ok = state > 0;
    }
    return ok;
  };

  k.target = function (w, h) {
    if (dead || gl.isContextLost()) return null;
    w = clamp(Math.round(w) || 1, 1, 8192);
    h = clamp(Math.round(h) || 1, 1, 8192);
    if (pic.w !== w || pic.h !== h) size(pic, w, h, gl.LINEAR);
    asked = true;
    return pic.f;
  };

  k.draw = function (o) {
    o = o || {};
    follow();
    var W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    if (!k.ready() || !(W > 0 && H > 0) || (!o.flat && !asked)) return false;
    var cssW = o.cssW > 0 ? o.cssW : W, cssH = o.cssH > 0 ? o.cssH : H;
    var x = clamp(+o.x || 0, -1e6, 1e6), y = clamp(+o.y || 0, -1e6, 1e6);
    var kw = gauge().w, kh = gauge().h;
    var still = !!o.still, lite = !!o.lite;
    var sw = Math.max(W / cssW * kw, 1);
    var pt = aimed(o);
    var light = sun(pt, +o.time || 0, still);
    /* the legs do not lie every way alike, so a light swung round them
       finds a little more or less to light, and the cheaper fabric casts
       a little less shade: that much is taken back out */
    var worth = (1 + 0.0085 * pt[0] + 0.0380 * pt[1] + 0.0153 * pt[0] * pt[1] - 0.0187 * pt[0] * pt[0] + 0.0010 * pt[1] * pt[1]) * (lite ? 0.957 : 1);
    var c = tints(o.look, worth);
    var rest = sun([0, 0], 0, true);

    /* the stitches the canvas touches, and two more all round for the
       legs and the tilt that reach past its edge. A box with more stitches
       than a texture can hold is no canvas: nothing is drawn for it, and
       nothing is touched */
    var i0 = Math.floor(x / kw), j0 = Math.floor(y / kh);
    var mw = Math.floor((x + cssW) / kw) - i0 + 5, mh = Math.floor((y + cssH) / kh) - j0 + 5;
    if (!(mw <= most && mh <= most)) return false;
    var newMap = map.w !== mw || map.h !== mh, newPic = !pic.t;
    if (newMap) size(map, mw, mh, gl.NEAREST);
    /* a plain colour reads no picture, but the sampler still wants a texture */
    if (newPic) size(pic, 2, 2, gl.LINEAR);

    /* Where the cloth goes on past the canvas, a picture cut off at the
       canvas's edge would be cut straight through its stitches: no cloth
       ends so. The stitches the edge cuts, and those beyond it, are
       knitted in the ground's colour instead, so the picture ends as
       knitting does, in whole stitches, the ground's heads rising between
       the last row's legs; and the cut itself falls in the ground's own
       yarn, the same on both sides of it. The point of a V shows two
       fifths of a row below its cell and its legs' heads two thirds of a
       row above: a row is the picture's only if the canvas holds that
       too. */
    var edges = o.ground ? String(o.sides || 'b') : '';
    var own = [
      edges.indexOf('l') < 0 ? -FAR : Math.ceil(x / kw - 0.02),
      edges.indexOf('t') < 0 ? -FAR : Math.ceil(y / kh + 0.63),
      edges.indexOf('r') < 0 ? FAR : Math.floor((x + cssW) / kw + 0.02) - 1,
      edges.indexOf('b') < 0 ? FAR : Math.floor((y + cssH) / kh - 0.38) - 1
    ];
    /* and the rows over which the picture gives way to the ground under it */
    var fade = edges.indexOf('b') < 0 ? 0 : clamp(+o.fade || 0, 0, cssH) / kh;

    /* what repeats, repeats in whole turns of every wave */
    var nx = 1 << 20, ny = 1 << 20;
    var wx = WAVES.x.slice(), wy = WAVES.y.slice();
    if (o.tile && o.tile[0] >= 1 && o.tile[1] >= 1) {
      nx = Math.min(Math.round(o.tile[0]), 4096);
      ny = Math.min(Math.round(o.tile[1]), 4096);
      for (var i = 0; i < 4; i++) {
        wx[i] = 2 * Math.PI * Math.round(wx[i] * nx / (2 * Math.PI)) / nx;
        wy[i] = 2 * Math.PI * Math.round(wy[i] * ny / (2 * Math.PI)) / ny;
      }
    }

    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.disable(gl.SAMPLE_COVERAGE);
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.colorMask(true, true, true, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindSampler(0, null);

    /* the picture to the stitch map; what was only now made is cleared
       first, which spares a browser that tracks such things the work of
       doing it itself */
    if (newPic) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, pic.f);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, map.f);
    if (newMap) gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, mw, mh);
    gl.useProgram(reduce.p);
    gl.bindTexture(gl.TEXTURE_2D, pic.t);
    gl.uniform1i(reduce.u.PIC, 0);
    gl.uniform4f(reduce.u.BOX, ((i0 - 2) * kw - x) / cssW, ((j0 - 2) * kh - y) / cssH, kw / cssW, kh / cssH);
    if (o.flat) gl.uniform4f(reduce.u.FLAT, clamp(+o.flat[0] || 0, 0, 1), clamp(+o.flat[1] || 0, 0, 1), clamp(+o.flat[2] || 0, 0, 1), 1);
    else gl.uniform4f(reduce.u.FLAT, 0, 0, 0, 0);
    if (o.ground) gl.uniform4f(reduce.u.GROUND, clamp(+o.ground[0] || 0, 0, 1), clamp(+o.ground[1] || 0, 0, 1), clamp(+o.ground[2] || 0, 0, 1), 1);
    else gl.uniform4f(reduce.u.GROUND, 0, 0, 0, 0);
    gl.uniform4i(reduce.u.OWN, own[0], own[1], own[2], own[3]);
    gl.uniform2i(reduce.u.FIRST, i0 - 2, j0 - 2);
    gl.uniform4i(reduce.u.WRAP, nx, ny, nx * Math.floor((1 << 24) / nx), ny * Math.floor((1 << 24) / ny));
    gl.uniform2f(reduce.u.FADE, own[3] + 1 - fade, fade);
    var yoke = edges.indexOf('b') >= 0 && o.sweater && o.sweater.yarns ? o.sweater : null;
    var ya = yoke ? yoke.yarns[0] || [] : [], yb = yoke ? yoke.yarns[1] || [] : [];
    gl.uniform4f(reduce.u.YARNA, clamp(+ya[0] || 0, 0, 1), clamp(+ya[1] || 0, 0, 1), clamp(+ya[2] || 0, 0, 1), yoke ? 1 : 0);
    gl.uniform3f(reduce.u.YARNB, clamp(+yb[0] || 0, 0, 1), clamp(+yb[1] || 0, 0, 1), clamp(+yb[2] || 0, 0, 1));
    var base = yoke && yoke.base > 0 ? Math.min(own[3], Math.floor(clamp(+yoke.base, -1e6, 1e6) / kh)) : own[3];
    gl.uniform2i(reduce.u.MID, yoke ? Math.floor(clamp(+yoke.mid || 0, -1e6, 1e6) / kw) : 0, base);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* the stitch map to the fabric */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(fabric.p);
    gl.bindTexture(gl.TEXTURE_2D, map.t);
    gl.uniform1i(fabric.u.MAP, 0);
    gl.uniform4i(fabric.u.BOX, i0 - 2, j0 - 2, mw - 1, mh - 1);
    gl.uniform2i(fabric.u.CELL, i0, j0);
    gl.uniform4f(fabric.u.FRAME, x / kw - i0, y / kh - j0, cssW / (W * kw), cssH / (H * kh));
    gl.uniform4f(fabric.u.GAUGE, H, sw, clamp(kh / kw, 0.5, 1.2), o.relief === undefined ? 1 : clamp(+o.relief || 0, 0, 1));
    gl.uniform3f(fabric.u.LIGHT, light[0], light[1], light[2]);
    /* the eye looks down a little from below and to the right, and leans with the pointer */
    gl.uniform4f(fabric.u.EYE, 0.06 + 0.12 * pt[0], 0.14 + 0.12 * pt[1], lite ? 2 : 4, lite ? 0 : 1);
    /* and the ground lies as with the pointer at rest, where the picture's own stitches end */
    gl.uniform4f(fabric.u.CALM, own[0] > -FAR ? own[0] - i0 : -1e5, own[1] > -FAR ? own[1] - j0 : -1e5, own[2] < FAR ? own[2] + 1 - i0 : 1e5, own[3] < FAR ? own[3] + 1 - j0 : 1e5);
    gl.uniform4f(fabric.u.REST, rest[0], rest[1], rest[2], 1 / worth);
    gl.uniform2f(fabric.u.LEVEL, 0.06, 0.14);
    gl.uniform3f(fabric.u.KEY, c.key[0], c.key[1], c.key[2]);
    gl.uniform3f(fabric.u.FILL, c.fill[0], c.fill[1], c.fill[2]);
    gl.uniform4f(fabric.u.WX, wx[0], wx[1], wx[2], wx[3]);
    gl.uniform4f(fabric.u.WY, wy[0], wy[1], wy[2], wy[3]);
    /* small stitches have their hollows eased, and come out lighter for it: measured, and taken back */
    gl.uniform2f(fabric.u.TRIM, 1 - 0.175 * (1 - ramp(5.5, 15, sw)), 1 - 0.7 * ramp(8.5, 12, sw) - 0.3 * ramp(13, 20, sw));
    /* the stitches worked in the ground lie as the ground does, the more of
       them the nearer the ground, so where the canvas ends nothing moves */
    gl.uniform1f(fabric.u.SETTLE, Math.max(0.9, fade));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    return true;
  };

  k.free = function () {
    if (freed) return;
    freed = dead = true;
    if (gl.canvas && gl.canvas.removeEventListener) gl.canvas.removeEventListener('webglcontextlost', gone);
    if (!lost) {
      scrap(gl, PSC, progs);
      gl.deleteTexture(pic.t);
      gl.deleteFramebuffer(pic.f);
      gl.deleteTexture(map.t);
      gl.deleteFramebuffer(map.f);
      gl.deleteVertexArray(vao);
    }
    pic.t = pic.f = map.t = map.f = null;
    pic.w = pic.h = map.w = map.h = 0;
  };

  return k;
}

/* ------------------------------------------------------- the embroidery */
/* Words are sewn over the knitting, not knitted into it: padded satin
   stitch, the way a name is worked on a sweater. The letters are padded
   out into a low dome; floss is laid across them side by side, aslant,
   and rides up over the padding; and a tight thread of another colour is
   couched round the edge, over the ends of the floss, so that pale
   letters keep their outline on a pale ground and dark ones on a dark.
   Everything is cut from the lettering's own size and the screen's
   pixels, nothing from the stitch. */

/* every length the mask and the floss share, in CSS px: how far a glyph
   is plumped so that a hairline can carry thread, the width of the edge
   thread, how soft the copy is that the padding is raised from, how soft
   the shadow's and how far that is cast, and how far past a glyph's own
   ink the last of it can fall */
function cut(size, px) {
  size = clamp(+size || 16, 4, 512);
  px = clamp(+px || 1, 0.5, 8);
  var plump = 0.012 * size + 0.1, cord = 0.012 * size + 0.55;
  var soft = 0.05 * size, dim = 0.02 * size + 0.2, cast = 0.05 * size + 0.25;
  return {
    size: size, px: px, plump: plump, cord: cord, soft: soft, dim: dim, cast: cast,
    reach: plump + cord + cast + 2.6 * dim + 2 / px
  };
}

/* the most that can be: what a caller leaves free round its lettering */
function reach(size) {
  return cut(size, 1).reach;
}

/* what ink() last painted on each mask: a thread reads a mask again only
   when this has moved on */
var inked = new WeakMap();
var stamp = 0;

/* The mask. On black, each channel added to the others and none in the
   way of another:
     red    the glyphs, plumped: where the floss lies
     green  the glyphs as they are: what the padding is raised from
     blue   the glyphs plumped once more by the width of the edge thread:
            the whole silhouette
   All three are sharp. Nothing is blurred here: a canvas has no blur but
   a shadow's, and no two browsers cast a text's shadow alike, so the
   thread softens what it needs itself.
   A run is drawn whole where the canvas can space letters itself;
   elsewhere letter by letter, each where the run up to and with it ends,
   less its own width, which keeps the kerning. */
function ink(ctx, runs, o) {
  var c = ctx.canvas, px = clamp(+(o && o.px) || 1, 0.5, 8);
  var spaced = typeof ctx.letterSpacing === 'string';
  var box = [1e9, 1e9, -1e9, -1e9], blind = false, most = 0, far = 0;
  runs = runs || [];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (typeof ctx.filter === 'string') ctx.filter = 'none';
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.setTransform(px, 0, 0, px, 0, 0);
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (typeof ctx.direction === 'string') ctx.direction = 'ltr';
  for (var r = 0; r < runs.length; r++) {
    var run = runs[r], text = String(run.text === undefined ? '' : run.text);
    var g = cut(run.size, px), gap = +run.spacing || 0, y = +run.y || 0;
    var bits = [], i;
    if (run.line || run.dot || run.ring) {
      most = Math.max(most, g.size);
      far = Math.max(far, g.reach);
      shape(ctx, run, g, box);
      continue;
    }
    ctx.font = run.font;
    if (spaced) ctx.letterSpacing = gap + 'px';
    if (spaced || !gap) bits.push([text, +run.x || 0]);
    else {
      var each = Array.from(text), upto = '';
      for (i = 0; i < each.length; i++) {
        upto += each[i];
        bits.push([each[i], (+run.x || 0) + ctx.measureText(upto).width - ctx.measureText(each[i]).width + i * gap]);
      }
    }
    /* lettering that only cuts its way through what is painted before it
       (an underline's thread, which stops short of every letter it would
       cross): painted out, all three channels, as wide as its edge thread
       reaches and as far again as it asks */
    if (run.clear) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 * (g.plump + g.cord + Math.max(+run.clear || 0, 0));
      for (i = 0; i < bits.length; i++) {
        ctx.strokeText(bits[i][0], bits[i][1], y);
        ctx.fillText(bits[i][0], bits[i][1], y);
      }
      ctx.globalCompositeOperation = 'lighter';
      continue;
    }
    most = Math.max(most, g.size);
    far = Math.max(far, g.reach);
    /* the ink's own box, and a hair more for what a browser's measure may miss */
    for (i = 0; i < bits.length; i++) {
      var m = ctx.measureText(bits[i][0]), x = bits[i][1], hair = 1 + Math.abs(gap);
      if (!(m.actualBoundingBoxLeft > -1e6 && m.actualBoundingBoxRight > -1e6 && m.actualBoundingBoxAscent > -1e6 && m.actualBoundingBoxDescent > -1e6)) blind = true;
      else {
        box[0] = Math.min(box[0], x - m.actualBoundingBoxLeft - hair);
        box[1] = Math.min(box[1], y - m.actualBoundingBoxAscent - hair);
        box[2] = Math.max(box[2], x + m.actualBoundingBoxRight + hair);
        box[3] = Math.max(box[3], y + m.actualBoundingBoxDescent + hair);
      }
    }
    var rounds = [['#f00', 2 * g.plump], ['#0f0', 0], ['#00f', 2 * (g.plump + g.cord)]];
    for (var k = 0; k < 3; k++) {
      ctx.fillStyle = ctx.strokeStyle = rounds[k][0];
      ctx.lineWidth = rounds[k][1];
      for (i = 0; i < bits.length; i++) {
        if (rounds[k][1] > 0) ctx.strokeText(bits[i][0], bits[i][1], y);
        ctx.fillText(bits[i][0], bits[i][1], y);
      }
    }
  }
  ctx.restore();
  if (box[0] > box[2]) box = [0, 0, 0, 0];
  else box = [box[0] - far, box[1] - far, box[2] + far, box[3] + far];
  if (blind) box = null;
  inked.set(c, { n: ++stamp, box: box, size: most || 16, px: px });
  return box ? { left: box[0], top: box[1], right: box[2], bottom: box[3] } : null;
}

/* What is sewn and is not lettering, painted as lettering is, each
   channel as wide as its round asks: a line of thread (an underline),
   whole or in running stitches, with round ends; a padded dot; a ring.
   Lengths in CSS px, the run's size cutting the plump and the edge as a
   font size does */
function shape(ctx, run, g, box) {
  var rounds = [['#f00', 2 * g.plump], ['#0f0', 0], ['#00f', 2 * (g.plump + g.cord)]], k, v, w;
  var dash = run.dash && run.dash.length === 2 && run.dash[0] > 0 && run.dash[1] > 0 ? [+run.dash[0], +run.dash[1]] : [];
  for (k = 0; k < 3; k++) {
    ctx.fillStyle = ctx.strokeStyle = rounds[k][0];
    ctx.beginPath();
    if (run.line) {
      v = run.line;
      w = Math.max(+run.width || 1, 0.25);
      ctx.setLineDash(dash);
      ctx.lineDashOffset = 0;
      ctx.lineWidth = w + rounds[k][1];
      ctx.moveTo(+v[0], +v[1]);
      ctx.lineTo(+v[2], +v[1]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (run.dot) {
      v = run.dot;
      ctx.arc(+v[0], +v[1], Math.max(+v[2], 0.25), 0, 2 * Math.PI);
      ctx.fill();
      if (rounds[k][1] > 0) {
        ctx.lineWidth = rounds[k][1];
        ctx.stroke();
      }
    } else {
      v = run.ring;
      ctx.lineWidth = Math.max(+run.width || 1, 0.25) + rounds[k][1];
      ctx.arc(+v[0], +v[1], Math.max(+v[2], 0.25), 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  var reach = run.line ? Math.max(+run.width || 1, 0.25) / 2 : run.dot ? +run.dot[2] : +run.ring[2] + Math.max(+run.width || 1, 0.25) / 2;
  var x0 = run.line ? Math.min(+run.line[0], +run.line[2]) : +v[0], x1 = run.line ? Math.max(+run.line[0], +run.line[2]) : +v[0];
  var yc = +v[1], hair = 1;
  box[0] = Math.min(box[0], x0 - reach - hair);
  box[1] = Math.min(box[1], yc - reach - hair);
  box[2] = Math.max(box[2], x1 + reach + hair);
  box[3] = Math.max(box[3], yc + reach + hair);
}

/* The softening, once for each mask and not once a frame: a bell laid
   over the green channel, wide, for the padding, and one over the blue,
   narrow, for the shadow, each first across and then down, by as many
   taps as keep them a pixel and a half apart. Red and blue pass through.
   What comes out is what the floss reads:
     red    where the floss lies          green  the padding, soft
     blue   the silhouette                alpha  the shadow, soft
   Past the box there is nothing to soften, and nothing is. */
var SOFTEN = `#version 300 es
precision highp float;
uniform highp sampler2D SRC;
uniform vec4 BOX;       /* left, top, right, bottom: device px of the mask, counted as its rows are */
uniform vec4 STEP;      /* xy: one tap of the padding's bell to the next, in uv; zw: of the shadow's */
uniform vec4 HOW;       /* xy: a device px in uv; z: taps each way; w: 0 on the way across, 1 on the way down */
out vec4 o;
void main() {
  vec2 f = gl_FragCoord.xy;
  o = vec4(0.0);
  if (f.x < BOX.x || f.y < BOX.y || f.x > BOX.z || f.y > BOX.w) return;
  vec2 uv = f * HOW.xy;
  vec4 c = textureLod(SRC, uv, 0.0);
  float g = 0.0, a = 0.0, sum = 0.0;
  for (int i = -40; i <= 40; i++) {
    float k = float(i);
    if (abs(k) > HOW.z) continue;
    float r = k / HOW.z;
    float w = exp(-3.38 * r * r);
    vec4 wide = textureLod(SRC, uv + k * STEP.xy, 0.0);
    vec4 near = textureLod(SRC, uv + k * STEP.zw, 0.0);
    g += w * wide.g;
    a += w * mix(near.b, near.a, HOW.w);
    sum += w;
  }
  o = vec4(c.r, g / sum, c.b, a / sum);
}`;

/* The floss. Units: device px, y down, as the mask is laid; heights in
   device px.

   Four taps stand round the pixel on its diagonals and give, for every
   channel at once, a mean and a slope. From the soft green they give the
   padding: its height, eased off toward the top so that where strokes
   meet it levels out, and its slope. From the two sharp channels they
   give the edge thread: a ridge that is high where the silhouette has
   begun and the floss has not.

   The floss runs up to the right, across the light, so that every thread
   has a lit side and the sheen has the whole dome to travel over. A
   thread is one turn of the phase w; the padding's height is added to
   the phase, so the threads bow as they ride over it, and by more or
   less as the pointer tilts the cloth. A thread's roundness is written
   as the first two terms of its series and not as a saw, so the groove
   between two threads is no step and nothing in it can crawl; where the
   threads crowd closer than the pixels can hold (small lettering, a
   steep flank) the terms fade and the floss lies flat. Its ends are the
   threads' own: the floss reaches a little further under the edge thread
   at the middle of each thread than at its sides, and there the pointer
   moves nothing, for an end is sewn down.

   The light is the fabric's, and the exposure is set from outside so
   that a flat stretch of lit floss comes back the colour it was given;
   past that a shoulder rolls off toward white, keeping the hue. */
var SEW = { rib: 0.40, groove: 0.6, amb: 1.0, sheen: 0.55, knee: 0.7, flat: 0.93, bow: 1.3 };

var FLOSS = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D MASK;
uniform vec4 BOX;       /* past this nothing of the lettering falls: left, top, right, bottom; device px, y down */
uniform vec4 DIM;       /* xy: a device px in the mask's uv; z: the output's height; w: how far out the four taps stand */
uniform vec4 PAD;       /* x: the padding's height; y: the edge thread's; z: threads to a device px; w: how far the padding carries them */
uniform vec3 LIGHT;     /* toward the key light: x right, y down, z to the eye; unit */
uniform vec3 HALF;      /* halfway between the light and the eye; unit */
uniform vec4 CAST;      /* xy: from a point toward what shades it, in uv; z: the shadow's depth; w: how much of the threads' roundness lettering this small shows */
uniform vec4 THREAD;    /* rgb: the floss, exposed; a: the white in its sheen */
uniform vec4 EDGE;      /* the edge thread, likewise */
uniform vec3 KEY;       /* the key light's colour */
uniform vec3 FILL;      /* the fill's */
out vec4 o;

const vec2 TD = vec2(0.9397, -0.3420);    /* the floss runs this way */
const vec2 TN = vec2(0.3420, 0.9397);     /* and is counted this way */
const vec3 SHADE = vec3(0.045, 0.04, 0.06);
const float RIB = ${SEW.rib.toFixed(4)}, GROOVE = ${SEW.groove.toFixed(4)}, AMB = ${SEW.amb.toFixed(4)}, SHEEN = ${SEW.sheen.toFixed(4)}, KNEE = ${SEW.knee.toFixed(4)}, BOW = ${SEW.bow.toFixed(4)};

void main() {
  vec2 p = vec2(gl_FragCoord.x, DIM.z - gl_FragCoord.y);
  o = vec4(0.0);
  /* past the box nothing can fall, not even the shadow: no tap is spent */
  if (p.x < BOX.x || p.y < BOX.y || p.x > BOX.z || p.y > BOX.w) return;
  vec2 uv = p * DIM.xy;
  vec4 m = textureLod(MASK, uv, 0.0);

  /* the shadow on what lies beneath, cast away from the light: tight, and
     nowhere on the lit side, so no halo stands round the lettering */
  float sh = CAST.z * smoothstep(0.1, 0.9, textureLod(MASK, uv + CAST.xy, 0.0).a);
  if (m.b <= 0.0) {
    o = vec4(SHADE * sh, sh);
    return;
  }

  vec2 e = DIM.w * DIM.xy;
  vec3 ta = textureLod(MASK, uv - e, 0.0).rgb;
  vec3 tb = textureLod(MASK, uv + vec2(e.x, -e.y), 0.0).rgb;
  vec3 tc = textureLod(MASK, uv + vec2(-e.x, e.y), 0.0).rgb;
  vec3 td = textureLod(MASK, uv + e, 0.0).rgb;
  vec3 avg = 0.25 * (ta + tb + tc + td);
  vec3 gx = (tb + td - ta - tc) * (0.25 / DIM.w);
  vec3 gy = (tc + td - ta - tb) * (0.25 / DIM.w);

  /* the padding: its height, 0..1, and its slope */
  float t = clamp((avg.g - 0.20) / 0.60, 0.0, 1.0);
  float h = t * (2.0 - t);
  vec2 dh = vec2(gx.g, gy.g) * (2.0 * (1.0 - t) / 0.60);
  vec2 rise = dh * PAD.x;

  /* the floss: where in its thread this pixel lies, and how wide a
     thread comes out here once the padding has bent it */
  vec2 fq = TN * PAD.z + PAD.w * dh;
  float lp = inversesqrt(max(dot(fq, fq), 1e-6));
  float a1 = smoothstep(2.4, 4.4, lp) * CAST.w, a2 = smoothstep(4.0, 7.0, lp) * CAST.w;
  float w = dot(p, TN) * PAD.z + PAD.w * h;
  float wi = floor(w);
  float ang = 6.2832 * (w - wi - 0.5);
  float s1 = sin(ang), c1 = cos(ang);
  float lean = 0.6366 * s1 * (a1 - a2 * c1);
  float crown = 0.4053 * (a1 * c1 - 0.25 * a2 * (2.0 * c1 * c1 - 1.0));
  /* each thread two numbers of its own; across the groove, over a pixel
     and a half, they pass into the next thread's, so that a thread sliding
     under the pointer carries them along and nothing jumps */
  float wj = floor(w - 0.5);
  uvec2 n = uvec2(uint(int(wj) + 65536)) + uvec2(0u, 1u);
  n *= 0x9e3779b9u;
  n ^= n >> 15u;
  n *= 0x2c1b3c6du;
  n ^= n >> 12u;
  n *= 0x297a2d39u;
  n ^= n >> 15u;
  float zone = clamp(0.75 / lp, 0.04, 0.5);
  float next = smoothstep(0.5 - zone, 0.5 + zone, w - 0.5 - wj);
  float own = mix(float(n.x >> 24u), float(n.y >> 24u), next) / 255.0;
  float other = mix(float((n.x >> 12u) & 255u), float((n.y >> 12u) & 255u), next) / 255.0;

  vec3 nf = normalize(vec3(fq * (lp * lean * RIB) - rise, 1.0));
  float ndl = dot(nf, LIGHT);
  float wrap = clamp((ndl + 0.2) / 1.2, 0.0, 1.0);
  float dif = wrap * wrap * (3.0 - 2.0 * wrap);
  float ao = (1.0 + GROOVE * crown) * (1.0 - 0.30 * CAST.w * (1.0 - h));
  /* the sheen runs along the thread: brightest where the thread, climbing
     the padding, lies square to the light's half-way */
  float lift = dot(rise, TD) + 0.12 * CAST.w * (other - 0.5);
  float th = (dot(TD, HALF.xy) + lift * HALF.z) * inversesqrt(1.0 + lift * lift);
  float sn = max(1.0 - th * th, 0.0);
  sn *= sn;
  sn *= sn;
  sn *= sn;
  sn *= sn;
  sn *= sn;
  float sheen = sn * smoothstep(-0.15, 0.35, ndl) * (1.0 + 1.2 * crown) * SHEEN;
  /* in its own shade a thread is deeper in colour, not greyer */
  vec3 deep = THREAD.rgb * THREAD.rgb / max(dot(THREAD.rgb, vec3(0.3333)), 1e-4);
  vec3 floss = mix(THREAD.rgb, deep, 0.7 * clamp(1.0 - 2.0 * dif, 0.0, 1.0)) * (1.0 + 0.07 * CAST.w * (own - 0.5));
  vec3 face = floss * (FILL * (AMB * ao) + KEY * (dif * (0.5 + 0.5 * ao))) + KEY * (THREAD.rgb * 1.2 + THREAD.a) * sheen;

  /* the edge thread: a ridge between the silhouette's edge and the floss's */
  float ridge = avg.b * (1.0 - avg.r);
  vec2 dr = vec2(gx.b, gy.b) * (1.0 - avg.r) - avg.b * vec2(gx.r, gy.r);
  vec3 nc = normalize(vec3(-dr * PAD.y, 1.0));
  float cw = clamp((dot(nc, LIGHT) + 0.2) / 1.2, 0.0, 1.0);
  float glint = max(dot(nc, HALF), 0.0);
  glint *= glint;
  glint *= glint;
  glint *= glint;
  glint *= glint;
  vec3 cord = EDGE.rgb * (FILL * (AMB * (0.7 + 0.3 * ridge)) + KEY * (cw * cw * (3.0 - 2.0 * cw)))
    + KEY * (EDGE.rgb * 1.2 + EDGE.a) * (glint * 0.5);

  /* where the floss gives way to the edge thread: its ends are scalloped,
     thread by thread, and stay where they go into the cloth: they are
     counted with the cloth at rest, whatever the pointer does to the bow
     of the threads above them. Lettering too small for scallops keeps the
     edge it was drawn with, so no hairline is eaten */
  float ce = cos(6.2832 * (fract(dot(p, TN) * PAD.z + BOW * h) - 0.5));
  float end = 0.4053 * (a1 * ce - 0.25 * a2 * (2.0 * ce * ce - 1.0));
  float cf = clamp((mix(m.r, avg.r, 0.5 * CAST.w) - 0.5 + 0.6 * end) * (1.0 + 1.4 * CAST.w) + 0.5, 0.0, 1.0);
  vec3 col = mix(cord, face, cf);
  float pk = max(max(col.r, col.g), col.b);
  col *= (pk > KNEE ? 1.0 - (1.0 - KNEE) * exp(-(pk - KNEE) / (1.0 - KNEE)) : pk) / max(pk, 1e-4);
  col = sqrt(max(col, 0.0));
  o = vec4(col * m.b + SHADE * (sh * (1.0 - m.b)), m.b + sh * (1.0 - m.b));
}`;

/* what a flat stretch of floss sends back under this light, thread by
   thread and channel by channel, and what the top of the edge thread
   does: the shader's own sums, done here once a draw, so that the
   exposure can give each thread back the colour it was given */
function level(light, half, c, a1, a2) {
  var floss = [0, 0, 0], cord = [0, 0, 0], N = 16, i, ch;
  var th = 0.9397 * half[0] - 0.3420 * half[1];
  var sn = Math.pow(Math.max(1 - th * th, 0), 32);
  for (i = 0; i < N; i++) {
    var ang = 2 * Math.PI * ((i + 0.5) / N - 0.5), s1 = Math.sin(ang), c1 = Math.cos(ang);
    var lean = 0.6366 * s1 * (a1 - a2 * c1) * SEW.rib;
    var crown = 0.4053 * (a1 * c1 - 0.25 * a2 * (2 * c1 * c1 - 1));
    var nx = 0.3420 * lean, ny = 0.9397 * lean;
    var ndl = (nx * light[0] + ny * light[1] + light[2]) / Math.hypot(nx, ny, 1);
    var dif = ramp(-0.2, 1, ndl), ao = 1 + SEW.groove * crown;
    var sheen = sn * ramp(-0.15, 0.35, ndl) * (1 + 1.2 * crown) * SEW.sheen;
    for (ch = 0; ch < 3; ch++) floss[ch] += (c.fill[ch] * SEW.amb * ao + c.key[ch] * (dif * (0.5 + 0.5 * ao) + 1.2 * sheen)) / N;
  }
  for (ch = 0; ch < 3; ch++) cord[ch] = c.fill[ch] * SEW.amb + c.key[ch] * ramp(-0.2, 1, light[2]);
  return { floss: floss, cord: cord };
}

/* a thread's colour as the shader wants it: squared, and lifted by what
   the shoulder will take back, over what a flat stretch sends back; and
   after it the white in its sheen */
function expose(col, flat, k) {
  var lin = [0, 0, 0], pk = 1e-4, i;
  for (i = 0; i < 3; i++) {
    var v = clamp(+col[i] || 0, 0, 1);
    lin[i] = v * v;
    pk = Math.max(pk, lin[i]);
  }
  var want = Math.min(pk, 0.97), knee = SEW.knee;
  var gain = k * (want > knee ? knee - (1 - knee) * Math.log((1 - want) / (1 - knee)) : want) / pk;
  return [lin[0] * gain / flat[0], lin[1] * gain / flat[1], lin[2] * gain / flat[2], 0.012 * gain * 3 / (flat[0] + flat[1] + flat[2])];
}

/* ----------------------------------------------------------- a thread */

function thread(gl) {
  if (!webgl2(gl)) return null;

  var PSC = gl.getExtension('KHR_parallel_shader_compile');
  var soften = program(gl, SOFTEN, ['SRC', 'BOX', 'STEP', 'HOW']);
  var sewn = program(gl, FLOSS, ['MASK', 'BOX', 'DIM', 'PAD', 'LIGHT', 'HALF', 'CAST', 'THREAD', 'EDGE', 'KEY', 'FILL']);
  var vao = gl.createVertexArray(), frame = gl.createFramebuffer();
  if (!soften || !sewn || !vao || !frame) {
    scrap(gl, PSC, [soften, sewn]);
    gl.deleteVertexArray(vao);
    gl.deleteFramebuffer(frame);
    return null;
  }
  var progs = [soften, sewn];
  var most = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
  var dead = false, lost = false, freed = false, ok = false;
  var t = { failed: false };

  /* The masks it has read, softened, each in a texture of its own, the
     one drawn last at the end. They are kept for as long as they are
     drawn, however many they are: a page sews a score of labels from one
     thread every frame the pointer moves, and to drop one of them is to
     read and soften it again the next frame, and the one dropped for it
     the frame after. Only past ROOM bytes of texture is room made, and
     then only of masks nobody has drawn for a second and since room was
     last made; a mask that is still being drawn is never dropped. */
  var kept = new Map();
  var ROOM = 64 * 1048576;
  var held = 0, drawn = 0, swept = 0;

  function gone() {
    dead = lost = true;
    kept.clear();
    held = 0;
  }
  if (gl.canvas && gl.canvas.addEventListener) gl.canvas.addEventListener('webglcontextlost', gone);

  function sweep(now) {
    kept.forEach(function (m, mask) {
      if (held > ROOM && m.n < swept && m.at < now - 1000) t.forget(mask);
    });
    swept = drawn;
  }

  function sheet(w, h) {
    var x = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, x);
    if (w) gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    return x;
  }

  function plain() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /* a mask is read when it is new, when ink() has painted it again, or
     when it or its lettering has changed size: read as it is, softened
     across into a second sheet and down into the one that is kept. The
     pixel store is set plain for the reading and the framebuffers that
     were bound are bound again after, so the caller finds both as it
     left them. Leaves the kept sheet bound. */
  function read(mask, note, g) {
    var W = mask.width, H = mask.height;
    var wide = g.soft * g.px, near = g.dim * g.px;
    var key = [note.n, W, H, wide, near].join();
    var now = performance.now();
    var m = kept.get(mask);
    if (m) kept.delete(mask);
    else m = { t: null, key: '', bytes: 0, n: 0, at: 0 };
    kept.set(mask, m);
    m.n = ++drawn;
    m.at = now;
    if (m.key === key) {
      gl.bindTexture(gl.TEXTURE_2D, m.t);
      return;
    }
    held += 4 * W * H - m.bytes;
    m.bytes = 4 * W * H;
    if (held > ROOM) sweep(now);

    var names = [gl.UNPACK_FLIP_Y_WEBGL, gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.UNPACK_ROW_LENGTH, gl.UNPACK_SKIP_PIXELS, gl.UNPACK_SKIP_ROWS];
    var want = [false, false, gl.NONE, 0, 0, 0];
    var was = names.map(function (q) { return gl.getParameter(q); });
    var buf = gl.getParameter(gl.PIXEL_UNPACK_BUFFER_BINDING);
    var d0 = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING), r0 = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    if (buf) gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    names.forEach(function (q, i) { gl.pixelStorei(q, want[i]); });
    var raw = sheet(0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, mask);
    plain();
    names.forEach(function (q, i) { gl.pixelStorei(q, was[i]); });
    if (buf) gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, buf);
    var half = sheet(W, H);
    plain();
    if (m.t) gl.deleteTexture(m.t);
    m.t = sheet(W, H);
    plain();
    m.key = key;

    /* the box the lettering keeps within, and, for the way across, as
       much more as the way down will reach for */
    var b = note.box, s = note.px || g.px, taps = clamp(Math.ceil(2.6 * Math.max(wide, near) / 1.5), 2, 40);
    var box = b ? [Math.floor(b[0] * s), Math.floor(b[1] * s), Math.ceil(b[2] * s), Math.ceil(b[3] * s)] : [0, 0, W, H];
    var more = Math.ceil(2.6 * Math.max(wide, near)) + 2;
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    gl.viewport(0, 0, W, H);
    gl.useProgram(soften.p);
    gl.uniform1i(soften.u.SRC, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, half, 0);
    gl.bindTexture(gl.TEXTURE_2D, raw);
    gl.uniform4f(soften.u.BOX, box[0] - more, box[1] - more, box[2] + more, box[3] + more);
    gl.uniform4f(soften.u.STEP, 2.6 * wide / taps / W, 0, 2.6 * near / taps / W, 0);
    gl.uniform4f(soften.u.HOW, 1 / W, 1 / H, taps, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, m.t, 0);
    gl.bindTexture(gl.TEXTURE_2D, half);
    gl.uniform4f(soften.u.BOX, box[0], box[1], box[2], box[3]);
    gl.uniform4f(soften.u.STEP, 0, 2.6 * wide / taps / H, 0, 2.6 * near / taps / H);
    gl.uniform4f(soften.u.HOW, 1 / W, 1 / H, taps, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, d0);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, r0);
    gl.deleteTexture(raw);
    gl.deleteTexture(half);
    gl.bindTexture(gl.TEXTURE_2D, m.t);
  }

  t.ready = function () {
    if (dead || t.failed || gl.isContextLost()) return false;
    if (!ok) {
      var state = linked(gl, PSC, progs);
      t.failed = state < 0;
      ok = state > 0;
    }
    return ok;
  };

  t.draw = function (o) {
    o = o || {};
    follow();
    var mask = o.mask;
    if (!t.ready() || !mask || !(mask.width > 0 && mask.height > 0) || mask.width > most || mask.height > most) return false;
    var note = inked.get(mask) || { n: 0, box: null, size: 0, px: 0 };
    var w = o.w >= 1 ? Math.round(o.w) : mask.width, h = o.h >= 1 ? Math.round(o.h) : mask.height;
    var px = clamp(+o.px || note.px || 1, 0.5, 8);
    var g = cut(+o.size || note.size, px), S = g.size * px;
    var pt = aimed(o);
    var light = sun(pt, +o.time || 0, !!o.still);
    var c = tints(o.look, 1);
    var hl = Math.hypot(light[0], light[1], light[2] + 1);
    var half = [light[0] / hl, light[1] / hl, (light[2] + 1) / hl];
    /* a thread is this many device px across: as fine as the pixels can
       show, coarser as the lettering grows; and lettering too small to
       show threads at all is sewn flat */
    var pitch = Math.max(0.032 * S, 3.2), round = ramp(14, 30, g.size), dome = ramp(12, 46, g.size);
    var flat = level(light, half, c, round * ramp(2.4, 4.4, pitch), round * ramp(4, 7, pitch));
    /* a dome's lit side stands above its flat top, so the top is set a
       little under the colour given; flat lettering is given it outright */
    var floss = expose(o.thread || [0.965, 0.953, 0.925], flat.floss, 1 - (1 - SEW.flat) * dome);
    var edge = expose(o.edge || [0.15, 0.17, 0.25], flat.cord, 1);
    var cord = g.cord * px;
    var bx = note.box, bs = note.px || px;

    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.disable(gl.SAMPLE_COVERAGE);
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.colorMask(true, true, true, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindSampler(0, null);
    read(mask, note, g);

    gl.viewport(0, 0, w, h);
    gl.useProgram(sewn.p);
    gl.uniform1i(sewn.u.MASK, 0);
    if (bx) gl.uniform4f(sewn.u.BOX, Math.floor(bx[0] * bs), Math.floor(bx[1] * bs), Math.ceil(bx[2] * bs), Math.ceil(bx[3] * bs));
    else gl.uniform4f(sewn.u.BOX, 0, 0, w, h);
    gl.uniform4f(sewn.u.DIM, 1 / w, 1 / h, h, clamp(0.3 * cord, 0.75, 1.5));
    /* small lettering lies flat; the pointer tilts the cloth, and the
       threads bow the more over the padding the more it is seen from the side */
    gl.uniform4f(sewn.u.PAD, 0.05 * S * dome, 2.0 * cord, 1 / pitch, SEW.bow * (1 + 0.15 * pt[0] + 0.4 * pt[1]));
    gl.uniform3f(sewn.u.LIGHT, light[0], light[1], light[2]);
    gl.uniform3f(sewn.u.HALF, half[0], half[1], half[2]);
    gl.uniform4f(sewn.u.CAST, light[0] / 0.905 * g.cast * px / w, light[1] / 0.905 * g.cast * px / h, 0.36 + 0.14 * round, round);
    gl.uniform4f(sewn.u.THREAD, floss[0], floss[1], floss[2], floss[3]);
    gl.uniform4f(sewn.u.EDGE, edge[0], edge[1], edge[2], edge[3]);
    gl.uniform3f(sewn.u.KEY, c.key[0], c.key[1], c.key[2]);
    gl.uniform3f(sewn.u.FILL, c.fill[0], c.fill[1], c.fill[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    return true;
  };

  /* a mask that will not be drawn again gives its texture back */
  t.forget = function (mask) {
    var m = kept.get(mask);
    if (!m) return;
    if (m.t) gl.deleteTexture(m.t);
    held -= m.bytes;
    kept.delete(mask);
  };

  t.free = function () {
    if (freed) return;
    freed = dead = true;
    if (gl.canvas && gl.canvas.removeEventListener) gl.canvas.removeEventListener('webglcontextlost', gone);
    if (!lost) {
      kept.forEach(function (m) { if (m.t) gl.deleteTexture(m.t); });
      scrap(gl, PSC, progs);
      gl.deleteFramebuffer(frame);
      gl.deleteVertexArray(vao);
    }
    kept.clear();
    held = 0;
  };

  return t;
}

window.Knit = {
  gauge: function () { var g = gauge(); return { w: g.w, h: g.h }; },
  length: length,
  fit: fit,
  scene: scene,
  point: point,
  moving: moving,
  pass: pass,
  reach: reach,
  ink: ink,
  thread: thread
};

})();
