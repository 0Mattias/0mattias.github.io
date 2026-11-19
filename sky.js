/* 0mattias.github.io · the meadow
   Lying in the grass of an alpine meadow above Zermatt, chin on your
   hands, looking across the valley at the Matterhorn. The land is a
   heightfield traced once per size and shaded for all three looks at
   once: the meadow under the eye falling away into the valley, eroded
   ranges beyond it, a snow massif on the left, and the horn, four faces
   meeting in sharp ridges, fluted by couloirs that hold the snow. Haze
   lies between the ranges by their distance, the last sun lights only
   the high ground at dusk, and every edge against the sky takes four
   rays so the skylines come out clean. Over it, every frame: the sky
   of each look, two decks of cumulus lit at three scales under a veil
   of cirrus, parting about the summit, cloud shadows passing over the
   slopes; at night the moon at tonight's real phase, stars and the
   Milky Way rising out of the gap, and a meteor now and then. In front, the meadow itself: tussocks of grass,
   seed stalks and flowers in drifts, grown on the ground function and
   bent at every vertex by a steady breeze whose waves run across them,
   drawn in three planes of focus so the nearest blades blur to soft
   streaks. Seeds and pollen drift in the light by day and fireflies
   glow in the grass at night. A phone sits up a little and turns toward the horn so it
   stands whole above the words. WebGL2, no libraries, no build step. */

'use strict';

/* The meadow begins once the page's first paint has reached the screen,
   or after a moment where the browser does not say, so the words and the
   picture under them are up before the GPU is asked for anything: a
   browser that draws the page and the canvas on the same GPU thread would
   otherwise hold the first paint behind the context and its programs. */
(function (begin) {
  function go() {
    if (!begin) return;
    setTimeout(begin, 0);
    begin = null;
  }
  try {
    if (performance.getEntriesByName('first-contentful-paint').length) go();
    else new PerformanceObserver(function (list, seen) {
      seen.disconnect();
      go();
    }).observe({ type: 'paint' });
  } catch (err) {}
  setTimeout(go, 1000);
})(function () {

var root = document.documentElement;
var hero = document.querySelector('.letterhead');
var canvas = document.getElementById('sky');
var buttons = Array.prototype.slice.call(document.querySelectorAll('.looks button'));
if (!hero || !canvas) return;

var reduced = matchMedia('(prefers-reduced-motion: reduce)');
var DEG = Math.PI / 180;

/* ------------------------------------------------------------ the world */
/* metres; x to the right, z away from the eye, y up. The eye lies a
   hand's height above a meadow at 2300 m; the horn stands 8 km away
   across the valley. */

var EYE = [0, 2300.34, 0];
var HORN = [8000 * Math.sin(19 * DEG), 8000 * Math.cos(19 * DEG)];
var HORN_H = 4478;
var RIDGE = Math.atan2(-HORN[0], -HORN[1]) + 14 * DEG;
var E1 = [Math.sin(RIDGE - Math.PI / 4), Math.cos(RIDGE - Math.PI / 4)];
var E2 = [Math.sin(RIDGE + Math.PI / 4), Math.cos(RIDGE + Math.PI / 4)];
/* the summit leans a little to the left, as the horn does from Zermatt */
var LEAN = [-130 * Math.cos(19 * DEG), 130 * Math.sin(19 * DEG)];
/* the grass is laid out over a wedge before the eye this wide (the
   tangent of its half angle), enough for any frame */
var TANG = 1.25;

function dirAzEl(az, el) {
  az *= DEG; el *= DEG;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
}

function norm3(v) {
  var l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/* the galaxy: its core sits low in the gap under the words and its
   plane climbs up behind the horn */
var GAL_C = dirAzEl(1, 1);
var GAL_N = norm3(cross3(GAL_C, dirAzEl(48, 52)));
var GAL_V = cross3(GAL_N, GAL_C);

/* ------------------------------------------------------------- colour */

function srgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function acesInv(y) {
  var a = 2.43 * y - 2.51, b = 0.59 * y - 0.03, c = 0.14 * y;
  return (-b - Math.sqrt(Math.max(b * b - 4 * a * c, 0))) / (2 * a);
}

function scene(hex) {
  return srgb(hex).map(function (v) { return acesInv(Math.pow(v, 2.2)); });
}

var LOOKS = { day: { d: 1, u: 0, n: 0 }, dusk: { d: 0, u: 1, n: 0 } };
var THEME = { day: srgb('#6282b6'), dusk: srgb('#495282'), night: srgb('#2d313e') };

/* each look: the light (sun, or the moon at night) and its colour, the
   sky's zenith and horizon, the glow about the light, the far horizon's
   tint, the sky and ground light on the land, the haze, the line the
   last sun climbs at dusk, the halo and the sky's gradient; the clouds;
   the grass's light */
var PAL = {
  day: {
    sun: dirAzEl(-72, 31), sunc: [2.7, 2.52, 2.2],
    zen: scene('#3767b2'), hor: scene('#adc4de'), glow: [0.9, 0.78, 0.6], belt: [0, 0, 0],
    amb: [0.30, 0.40, 0.60], bnc: [0.14, 0.13, 0.08],
    fog: [1.6e-5, 1 / 1700, 0.9, 0], alp: [0, 0, 0, 0],
    halo: [0.10, 3, 0.30, 18], sky2: [5.0, 0, 0, 1],
    glowc: [0.8, 0.76, 0.64], clit: [1.0, 0.82, 0.6], cmid: scene('#d3c9c4'), cshd: scene('#9da0b8'), cover: 0.26,
    gsun: 1.0, gamb: [0.25, 0.33, 0.45], gtrn: [0.8, 1.0, 0.35], expo: 1.0
  },
  dusk: {
    sun: dirAzEl(-64, 1.6), sunc: [6.2, 2.3, 2.15],
    zen: scene('#2b4382'), hor: scene('#dba88c'), glow: [1.0, 0.55, 0.32], belt: scene('#8a86b6'),
    amb: [0.12, 0.15, 0.31], bnc: [0.04, 0.035, 0.05],
    fog: [2.0e-5, 1 / 1700, 0.9, 0], alp: [3000, 260, 1, 0],
    halo: [0.10, 2, 0.30, 9], sky2: [15.0, 0.75, 0.8, 0],
    glowc: [0.9, 0.52, 0.34], clit: [0.86, 0.6, 0.55], cmid: scene('#6f6890'), cshd: scene('#3e4675'), cover: 0.24,
    gsun: 0.12, gamb: [0.09, 0.11, 0.21], gtrn: [1.0, 0.55, 0.35], expo: 1.0
  },
  night: {
    sun: dirAzEl(-75, 28), sunc: [0.26, 0.31, 0.46],
    zen: scene('#0a1024'), hor: scene('#1b2439'), glow: [0.33, 0.37, 0.48], belt: [0, 0, 0],
    amb: [0.020, 0.028, 0.052], bnc: [0.004, 0.004, 0.007],
    fog: [1.6e-5, 1 / 1700, 0.6, 0], alp: [0, 0, 0, 0],
    halo: [0.012, 6, 0.10, 60], sky2: [5.0, 0, 0, 0],
    glowc: [0.33, 0.37, 0.48], clit: scene('#5f6a86'), cmid: scene('#2a3149'), cshd: scene('#0b0f1e'), cover: 0.05,
    gsun: 0.35, gamb: [0.012, 0.018, 0.035], gtrn: [0.3, 0.4, 0.5], expo: 1.0
  }
};

/* the moon's disc stands in the upper left; its light is laid on the
   land from further round to the side, so the snow takes it */
var MOON = dirAzEl(-20, 18);
var MOON_R = 0.8 * DEG;
PAL.day.orb = PAL.day.sun;
PAL.dusk.orb = PAL.dusk.sun;
PAL.night.orb = MOON;

/* -------------------------------------------------------------- looks */
/* The whole page wears the look, not just the picture. A script in the
   head has already chosen it, from this visit or the address, so the
   first paint is right; a button turns it, and the page's colours turn
   with the sky and over the same time. */

var look = 'day', tr = null, turning = 0;
var wCur = { d: 1, u: 0, n: 0 }, wFrom = wCur;
var themeMeta = document.querySelector('meta[name="theme-color"]');

function themeColor(w) {
  /* another place on show keeps the colour its own (places.js) */
  var at = root.getAttribute('data-place');
  if (!themeMeta || (at && at !== 'meadow')) return;
  var c = [0, 1, 2].map(function (i) {
    return Math.round(255 * (THEME.day[i] * w.d + THEME.dusk[i] * w.u + THEME.night[i] * w.n));
  });
  themeMeta.setAttribute('content', 'rgb(' + c.join(',') + ')');
}

function setLook(name, instant) {
  look = name;
  buttons.forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-look') === name));
  });
  var to = LOOKS[name];
  var dist = Math.max(Math.abs(to.d - wCur.d), Math.abs(to.u - wCur.u), Math.abs(to.n - wCur.n));
  var dur = instant || reduced.matches ? 0 : 600 + 900 * dist;
  if (!dur || !view || slow || dist < 0.002) {
    wCur = { d: to.d, u: to.u, n: to.n };
    tr = null;
    themeColor(wCur);
  } else {
    wFrom = { d: wCur.d, u: wCur.u, n: wCur.n };
    tr = { t0: performance.now(), dur: dur };
  }
  /* the links' own quick fades would chase the page's slow one, so they
     wait it out */
  clearTimeout(turning);
  root.classList.toggle('turning', dur > 0);
  if (dur > 0) turning = setTimeout(function () { root.classList.remove('turning'); }, dur + 100);
  root.style.setProperty('--turn', Math.round(dur) + 'ms');
  root.setAttribute('data-look', name);
  if (gl) wake();
}

buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    var n = b.getAttribute('data-look');
    if (n === look) return;
    try { sessionStorage.setItem('look', n); } catch (err) {}
    setLook(n, false);
  });
});

/* only a look named above will do: an address can ask for any word, and
   some (constructor, toString) every object answers to */
var initial = root.getAttribute('data-look');
if (!LOOKS.hasOwnProperty(initial)) {
  try { initial = new URLSearchParams(location.search).get('look') || sessionStorage.getItem('look'); } catch (err) {}
  if (!LOOKS.hasOwnProperty(initial)) initial = 'day';
}
setLook(initial, true);
root.classList.add('sky');

/* ------------------------------------------------------------- canvas */
/* Without WebGL2, or with only a software one that would choke on the
   picture, the page keeps its poster of the look, and the buttons still
   turn it */

var gl = null;
try {
  gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', failIfMajorPerformanceCaveat: true
  });
} catch (err) {}
if (gl && soft()) gl = null;
if (!gl) {
  meadowAlone();
  /* nor does the poster wait, hidden, on a place the address asked for
     (?scene=) and none can draw */
  root.classList.remove('afar');
  if (root.getAttribute('data-place')) root.setAttribute('data-place', 'meadow');
  poster();
  return;
}

/* a renderer in software, as a browser without a GPU falls back on */
function soft() {
  var r = String(gl.getParameter(gl.RENDERER));
  if (/^webkit webgl$/i.test(r)) {
    var info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) r = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
}

var HDR = !!gl.getExtension('EXT_color_buffer_float');
if (!HDR) meadowAlone();

/* The other places ask more of the GPU than the meadow does: their stage
   (scenes/stage.js) wants all of the above and buffers of floats besides.
   Where it could not run, the control that turns to them is never
   offered, rather than fetch a place and go at the first press: it is
   hidden here, before the page shows it, and the page marked, so that
   places.js leaves it hidden should it start after this */
function meadowAlone() {
  root.classList.add('flat');
  var box = document.querySelector('.places');
  if (box) box.hidden = true;
}

/* -------------------------------------------------------------- the bar */
/* While the picture is made, a hairline under the words fills as it
   comes: the programs, then the land traced and shaded. It fades as the
   picture comes up. */

var bar = null, fill = null, filled = 0, barred = false;
var began = performance.now();

/* it starts with the build: at once, or, on a page opened on another
   place (?scene=), once the meadow is first turned to */
function startBar() {
  if (bar || barred) return;
  bar = document.createElement('span');
  fill = document.createElement('i');
  bar.className = 'load';
  bar.setAttribute('aria-hidden', 'true');
  bar.appendChild(fill);
  (hero.querySelector('.words') || hero).appendChild(bar);
  began = performance.now();
  progress(0.06);
}
if ((root.getAttribute('data-place') || 'meadow') === 'meadow') startBar();

function progress(p) {
  if (!fill || !(p > filled)) return;
  filled = Math.min(p, 1);
  fill.style.transform = 'scaleX(' + filled.toFixed(3) + ')';
}

/* the bar runs out to its end, and fades from wherever its own fade in
   had got to */
function ready() {
  barred = true;
  if (!bar) return;
  progress(1);
  var b = bar;
  bar = fill = null;
  setTimeout(function () {
    if (!b.animate) {
      b.remove();
      return;
    }
    b.animate([{ opacity: getComputedStyle(b).opacity }, { opacity: 0 }], {
      duration: 600, easing: 'ease', fill: 'forwards'
    }).onfinish = function () { b.remove(); };
  }, reduced.matches ? 0 : 320);
}

/* ------------------------------------------------------------ shaders */

function taps(rings) {
  var out = [];
  rings.forEach(function (ring) {
    for (var i = 0; i < ring[0]; i++) {
      var a = i / ring[0] * Math.PI * 2 + ring[2];
      out.push('vec2(' + (Math.cos(a) * ring[1]).toFixed(4) + ',' + (Math.sin(a) * ring[1]).toFixed(4) + ')');
    }
  });
  return out;
}

var TAPS = taps([[1, 0, 0], [5, 0.16, 0.7], [8, 0.38, 0.3], [10, 0.55, 0.5], [12, 0.72, 0], [20, 0.87, 0.4], [16, 1, 0.15]]);
var TAPS32 = taps([[1, 0, 0], [6, 0.34, 0.2], [10, 0.68, 0.5], [15, 1, 0.1]]);

var VERT = `#version 300 es
out vec2 uv;
void main() {
  vec2 v = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  uv = v;
  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);
}`;

var HEAD = `#version 300 es
precision highp float;
precision highp int;
` + (HDR ? '#define HDR 1\n' : '');

var NOISE = `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p))) * uvec2(1597334673u, 3812015801u);
  uint n = (q.x ^ q.y) * 1597334673u;
  return float(n) * (1.0 / 4294967295.0);
}
float hash3(vec3 p) {
  uvec3 q = uvec3(ivec3(floor(p))) * uvec3(1597334673u, 3812015801u, 2798796415u);
  uint n = (q.x ^ q.y ^ q.z) * 1597334673u;
  return float(n) * (1.0 / 4294967295.0);
}
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 noised(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(-1.0 + 2.0 * (a + k1 * u.x + k2 * u.y + k4 * u.x * u.y), 2.0 * du * vec2(k1 + k4 * u.y, k2 + k4 * u.x));
}
const mat2 RT = mat2(0.8, 0.6, -0.6, 0.8);
float fbm5(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vn(p); p = RT * p * 2.07 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vn(p); p = RT * p * 2.07 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float vn3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm3d(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vn3(p); p *= 2.13; a *= 0.5; }
  return v;
}
vec3 camDir(vec2 uv, vec4 cam) {
  vec2 p = uv * 2.0 - 1.0;
  vec3 d = normalize(vec3(p.x * cam.x, p.y * cam.y, 1.0));
  float cp = cos(cam.z), sp = sin(cam.z);
  vec3 dir = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(cam.w), sy = sin(cam.w);
  return vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy);
}
vec4 project(vec3 rel, vec4 cam, vec2 clip) {
  float cy = cos(cam.w), sy = sin(cam.w);
  vec3 d1 = vec3(rel.x * cy - rel.z * sy, rel.y, rel.x * sy + rel.z * cy);
  float cp = cos(cam.z), sp = sin(cam.z);
  vec3 d0 = vec3(d1.x, d1.y * cp - d1.z * sp, d1.y * sp + d1.z * cp);
  float n = clip.x, f = clip.y;
  return vec4(d0.x / cam.x, d0.y / cam.y, (d0.z * (f + n) - 2.0 * f * n) / (f - n), d0.z);
}
`;

/* the meadow under the eye, falling away into the valley. The grass
   roots itself on the same function, so blade and ground agree */
var MEADOW = `
float hum(vec2 p) {
  return 0.07 * sin(p.x * 0.83 + p.y * 0.37) * sin(p.y * 0.61 - p.x * 0.29)
       + 0.035 * sin(p.x * 2.1 - p.y * 1.3 + 1.0) * sin(p.y * 1.7 + p.x * 0.9);
}
float meadowH(vec2 p) {
  float z = p.y + 170.0 * (vn(vec2(p.x * 0.0011 + 3.0, 4.7)) - 0.5) * smoothstep(120.0, 600.0, p.y);
  float u = clamp((z - 70.0) / 1500.0, 0.0, 1.0);
  float s = u * u * u * (u * (u * 6.0 - 15.0) + 10.0);
  return 2300.0 - 0.012 * p.y - 590.0 * s + hum(p) * (1.0 - smoothstep(25.0, 90.0, p.y));
}
`;

var TERRAIN = `
const vec2 HORN = vec2(${HORN[0].toFixed(1)}, ${HORN[1].toFixed(1)});
const float HORN_H = ${HORN_H.toFixed(1)};
const vec2 E1 = vec2(${E1[0].toFixed(6)}, ${E1[1].toFixed(6)});
const vec2 E2 = vec2(${E2[0].toFixed(6)}, ${E2[1].toFixed(6)});
const vec2 LEAN = vec2(${LEAN[0].toFixed(3)}, ${LEAN[1].toFixed(3)});
const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);

float smax(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(a, b, h) + k * h * (1.0 - h);
}

/* erosion: each octave is damped by the slope the coarser ones built,
   so the valleys run smooth and the ridges break up */
float eroded(vec2 p, float lod) {
  vec2 q = p * (1.0 / 2200.0);
  float a = 0.0, b = 0.5, w = 2200.0;
  vec2 d = vec2(0.0);
  for (int i = 0; i < 12; i++) {
    float f = clamp(w / lod - 1.0, 0.0, 1.0);
    if (f <= 0.0) break;
    vec3 n = noised(q);
    d += n.yz;
    a += b * f * n.x / (1.0 + dot(d, d));
    b *= 0.5;
    w *= 0.5;
    q = M2 * q * 2.0;
  }
  return a;
}

float range(vec2 p, vec2 a, vec2 b, float ha, float hb, float w) {
  vec2 pa = p - a, ba = b - a;
  float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float d = length(pa - ba * k) / w;
  return 1650.0 + (mix(ha, hb, k) - 1650.0) * exp(-pow(d, 1.35));
}

/* the big shapes: the far side of the valley, low in the middle under
   the words, a snow massif on the left with a shoulder running toward
   the middle, the horn's pedestal and the ranges beyond it on the
   right, a far range closing the valley */
float macro(vec2 p) {
  float d = length(p);
  float az = atan(p.x, p.y);
  /* squared by hand: pow() is undefined for a base below nought */
  float ga = (az + 0.035) / 0.24;
  float gap = exp(-ga * ga);
  float h = 1650.0 + smoothstep(1900.0, 7000.0, d) * (1350.0 - 850.0 * gap);
  h = max(h, range(p, vec2(-14000.0, 27000.0), vec2(11000.0, 31000.0), 3500.0, 3700.0, 4200.0));
  h = smax(h, range(p, vec2(-8175.0, 7360.0), vec2(-4120.0, 10200.0), 4150.0, 3950.0, 1900.0), 250.0);
  h = smax(h, range(p, vec2(-4120.0, 10200.0), vec2(-2480.0, 12760.0), 3750.0, 3250.0, 1500.0), 250.0);
  h = smax(h, 1650.0 + 950.0 * exp(-pow(length(p - HORN) / 2300.0, 1.5)), 250.0);
  h = smax(h, range(p, vec2(6100.0, 11480.0), vec2(12020.0, 12020.0), 3950.0, 4200.0, 2200.0), 300.0);
  /* a nearer wooded ridge on the right hides the horn's foot */
  h = smax(h, range(p, vec2(500.0, 3300.0), vec2(4600.0, 4300.0), 2560.0, 2720.0, 950.0), 200.0);
  return h;
}

/* sharp crests on the high ground: ridged noise, each octave weighted by
   the one before it */
float crests(vec2 p) {
  vec2 q = p / 1100.0;
  float a = 0.0, w = 1.0, s = 0.5;
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(2.0 * vn(q) - 1.0);
    n *= n;
    a += s * n * w;
    w = clamp(n * 1.6, 0.0, 1.0);
    s *= 0.5;
    q = M2 * q * 2.03 + vec2(5.1, 1.3);
  }
  return a;
}

/* the horn: four faces meeting in sharp ridges, steepest under the
   summit, which leans a little. The ridges wander and notch, the faces
   bulge into buttresses and sink into bays, and couloirs flute them
   down their fall lines */
float sn3(vec2 p) {
  return (fbm3(p) - 0.4375) * 4.0;
}

vec2 hornFrame(vec2 p) {
  vec2 d = p - HORN;
  float rr = length(d);
  d -= LEAN * (1.0 - smoothstep(0.0, 650.0, rr));
  d += vec2(sn3(p / 950.0 + 3.0), sn3(p / 950.0 + 11.0)) * 130.0 * smoothstep(60.0, 700.0, rr);
  return vec2(dot(d, E1), dot(d, E2));
}

/* how deep a point lies in a couloir, 0 on a rib, 1 at the bottom */
float hornGully(vec2 p) {
  vec2 f = hornFrame(p);
  float au = abs(f.x) * (f.x > 0.0 ? 1.0 : 1.1), av = abs(f.y) * (f.y > 0.0 ? 0.93 : 1.06);
  bool fu = au > av;
  float lat = fu ? f.y : f.x, along = max(au, av);
  vec2 o = fu ? vec2(0.0) : vec2(17.0, 3.0);
  return (44.0 * abs(2.0 * vn(vec2(lat / 62.0, along / 260.0) + o) - 1.0)
        + 16.0 * abs(2.0 * vn(vec2(lat / 23.0, along / 95.0) + o + 9.0) - 1.0)) / 60.0;
}

float hornH(vec2 p, out float along) {
  vec2 f = hornFrame(p);
  float u = f.x, v = f.y;
  float au = abs(u) * (u > 0.0 ? 1.0 : 1.1), av = abs(v) * (v > 0.0 ? 0.93 : 1.06);
  float r = max(au, av);
  float h = HORN_H - 9.6 * (pow(r + 25.0, 0.75) - 11.18);
  float k = smoothstep(12.0, 160.0, r);
  h += 62.0 * sn3(vec2(u, v) / 380.0 + 5.0) * smoothstep(30.0, 300.0, r);
  bool fu = au > av;
  float lat = fu ? v : u;
  along = r;
  vec2 o = fu ? vec2(0.0) : vec2(17.0, 3.0);
  h -= 44.0 * abs(2.0 * vn(vec2(lat / 62.0, along / 260.0) + o) - 1.0) * k;
  h -= 16.0 * abs(2.0 * vn(vec2(lat / 23.0, along / 95.0) + o + 9.0) - 1.0) * k;
  h += 14.0 * (vn(p / 31.0) - 0.5) * k;
  return h;
}

float terrainH(vec2 p, float lod) {
  float m = meadowH(p);
  float M = macro(p);
  float amp = min(0.34 * (M - 1600.0) + 60.0, 420.0);
  if (M + amp + 260.0 < m) return m;
  float e = eroded(p, lod);
  float hi = smoothstep(2100.0, 3300.0, M);
  float H = M + amp * e + hi * 240.0 * (crests(p) - 0.35);
  vec2 dh = p - HORN;
  if (dot(dh, dh) < 2600.0 * 2600.0) {
    float along;
    float hh = hornH(p, along);
    if (hh > H - 300.0) H = smax(H, hh + 34.0 * e + 115.0 * eroded(p * 2.6 + 400.0, lod * 2.6) * smoothstep(10.0, 140.0, along), 110.0);
  }
  return smax(m, H, 40.0);
}
`;

var LOOK = `
struct Look {
  vec3 sun; vec3 orb; vec3 sunc; vec3 zen; vec3 hor; vec3 glow; vec3 belt;
  vec3 amb; vec3 bnc; vec4 fog; vec4 alp; vec4 halo; vec4 sky2;
};
uniform Look LK[3];

vec3 skyCol(Look L, vec3 rd) {
  float e = clamp(rd.y, -0.2, 1.0);
  float g = 1.0 - exp(-max(e, 0.0) * L.sky2.x);
  vec3 col = mix(L.hor, L.zen, g);
  vec2 sh = normalize(L.orb.xz + 1e-6), dh = normalize(rd.xz + 1e-6);
  float az = dot(dh, sh);
  float low = exp(-max(e, 0.0) * 7.0);
  /* away from the light the horizon cools; toward it, it burns */
  col = mix(col, L.belt, L.sky2.y * low * smoothstep(0.5, -0.4, az));
  col += L.glow * L.sky2.z * pow(max(az, 0.0), 3.0) * exp(-max(e, 0.0) * 14.0);
  float s = max(dot(rd, L.orb), 0.0);
  col += L.glow * (L.halo.x * pow(s, L.halo.y) + L.halo.z * pow(s, L.halo.w) + L.sky2.w * 1.2 * pow(s, 250.0));
  return col;
}

void fogOf(Look L, vec3 ro, vec3 rd, float t, out vec3 ext, out vec3 ins) {
  float b = L.fog.y;
  float a = L.fog.x * exp(-b * (ro.y - 2000.0));
  float k = b * rd.y;
  float fy = abs(k * t) < 1e-3 ? t : (1.0 - exp(-k * t)) / k;
  vec3 tau = a * fy * vec3(0.75, 0.9, 1.15) + t * L.fog.z * 1e-5 * vec3(0.35, 0.6, 1.0);
  ext = exp(-tau);
  vec3 hd = normalize(vec3(rd.x, max(rd.y, 0.0) * 0.4 + 0.004, rd.z));
  ins = skyCol(L, hd) * (1.0 - ext);
}
`;

var PACK = `
const float TL0 = -3.0, TL1 = 12.2;
vec2 packT(float t) {
  float v = floor(clamp((log(t) - TL0) / (TL1 - TL0), 0.0, 1.0) * 65535.0 + 0.5);
  float hi = floor(v / 256.0);
  return vec2(hi, v - hi * 256.0) / 255.0;
}
float unpackT(vec2 c) {
  float v = floor(c.x * 255.0 + 0.5) * 256.0 + floor(c.y * 255.0 + 0.5);
  return exp(TL0 + v / 65535.0 * (TL1 - TL0));
}
#ifdef HDR
vec3 enc(vec3 c) { return c; }
vec3 dec(vec3 c) { return c; }
#else
vec3 enc(vec3 c) { return sqrt(clamp(c * 0.25, 0.0, 1.0)); }
vec3 dec(vec3 c) { return c * c * 4.0; }
#endif
`;

var TRACE = `
uniform vec4 CAM;
uniform vec3 EYE;
uniform vec2 RES;
uniform float PIX;

float traceMeadow(vec3 ro, vec3 rd) {
  if (rd.y > 0.01) return -1.0;
  float t = 0.02, lt = 0.02;
  for (int i = 0; i < 220; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - meadowH(p.xz);
    if (h < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 10; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - meadowH(q.xz) < 0.0) b = m; else a = m;
      }
      return 0.5 * (a + b);
    }
    lt = t;
    t += max(h * 0.7, t * 0.008);
    if (t > 2400.0) break;
  }
  return -1.0;
}

/* how high the land can reach at p, cheaply: the big shapes plus the
   most the detail can add, the horn's own height near it */
float bound(vec2 p) {
  float M = macro(p);
  float b = M + min(0.34 * (M - 1600.0) + 60.0, 420.0) + 180.0;
  vec2 dh = p - HORN;
  if (dot(dh, dh) < 2700.0 * 2700.0) b = max(b, HORN_H + 160.0);
  return max(b, meadowH(p) + 1.0);
}

float traceFar(vec3 ro, vec3 rd, float t0, float lt0) {
  float t = t0, lt = lt0;
  float tmax = 120000.0;
  if (rd.y > 0.0) tmax = min(tmax, (4800.0 - ro.y) / rd.y);
  float h = 1e9;
  for (int i = 0; i < 520; i++) {
    if (t > tmax) return -1.0;
    vec3 p = ro + rd * t;
    float above = p.y - bound(p.xz);
    if (above > 20.0) {
      lt = t;
      t += max(above * 0.45, t * PIX);
      continue;
    }
    h = p.y - terrainH(p.xz, max(t * PIX * 2.0, 0.5));
    if (h < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 10; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - terrainH(q.xz, max(m * PIX * 2.0, 0.5)) < 0.0) b = m; else a = m;
      }
      return 0.5 * (a + b);
    }
    if (h < t * PIX * 0.2) return t;
    lt = t;
    t += max(h * 0.34, t * PIX * 0.6);
  }
  return h < t * 0.01 ? t : -1.0;
}

float trace(vec3 ro, vec3 rd) {
  float t = traceMeadow(ro, rd);
  return t > 0.0 ? t : traceFar(ro, rd, 700.0, 700.0);
}
`;

var PRE = HEAD + NOISE + MEADOW + TERRAIN + PACK + TRACE + `
out vec4 o;
void main() {
  vec3 rd = camDir(gl_FragCoord.xy / RES, CAM);
  float t = trace(EYE, rd);
  o = vec4(packT(t > 0.0 ? t : 2e5), 0.0, 1.0);
}`;

/* the land, shaded once for each look: every pixel is a ray into the
   heightfield; pixels on an edge (a ridge against the sky, a near crest
   against a far one) take four rays, so the skylines come out clean.
   Once the picture is up, a second pass goes back over the horn, where
   the eye rests, and gives every pixel of it four rays too */
var LAND = HEAD + NOISE + MEADOW + TERRAIN + LOOK + PACK + TRACE + `
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
layout(location = 3) out vec4 o3;
uniform sampler2D PREB;
uniform float REFINE;

const vec2 SS[4] = vec2[4](vec2(0.125, 0.375), vec2(0.375, -0.125), vec2(-0.125, -0.375), vec2(-0.375, 0.125));

vec3 terrainNormal(vec2 p, float lod) {
  float e = max(lod * 0.5, 0.05);
  float hl = terrainH(p - vec2(e, 0.0), lod), hr = terrainH(p + vec2(e, 0.0), lod);
  float hd = terrainH(p - vec2(0.0, e), lod), hu = terrainH(p + vec2(0.0, e), lod);
  return normalize(vec3(hl - hr, 2.0 * e, hd - hu));
}

vec3 meadowNormal(vec2 p) {
  float e = 0.05;
  float hl = meadowH(p - vec2(e, 0.0)), hr = meadowH(p + vec2(e, 0.0));
  float hd = meadowH(p - vec2(0.0, e)), hu = meadowH(p + vec2(0.0, e));
  return normalize(vec3(hl - hr, 2.0 * e, hd - hu));
}

float terrainAO(vec3 p, vec3 n, float lod) {
  float occ = 0.0, w = 0.5;
  for (int i = 0; i < 4; i++) {
    float r = 30.0 * exp2(float(i) * 1.5);
    vec3 q = p + n * r;
    float d = q.y - terrainH(q.xz, max(lod, r * 0.3));
    occ += w * clamp((r - d) / r, 0.0, 1.0);
    w *= 0.75;
  }
  return clamp(1.0 - occ * 1.05, 0.0, 1.0);
}

float shadow(vec3 ro, vec3 L) {
  if (L.y < -0.05) return 0.0;
  float res = 1.0, t = 6.0;
  for (int i = 0; i < 56; i++) {
    vec3 p = ro + L * t;
    if (p.y > 4800.0) break;
    float h = p.y - terrainH(p.xz, max(t * 0.003, 6.0));
    res = min(res, 9.0 * h / t);
    if (res < -0.05) break;
    t += clamp(h * 0.45, 4.0 + t * 0.015, 900.0);
    if (t > 40000.0) break;
  }
  return smoothstep(0.0, 1.0, res);
}

/* gneiss, grey with warm and cold bands and streaked down the fall
   line; scree under the faces, pasture and larch lower down; snow where
   the ground is high and flat enough to hold it, and on the glaciers
   the blue lines of crevasses */
vec3 rockAlbedo(vec3 p, vec3 n, float lod, out float snow) {
  float y = p.y;
  float n1 = vn(p.xz / 47.0), n2 = vn(p.xz / 233.0 + 7.0), n3 = vn(p.xz / 11.0 + 3.0);
  vec2 fall = normalize(n.xz + 1e-5);
  vec2 sq = vec2(dot(p.xz, vec2(-fall.y, fall.x)) / 9.0, dot(p.xz, fall) / 140.0);
  float streak = 0.6 * vn(sq) + 0.4 * vn(sq * 2.7 + 5.0);
  vec3 rock = mix(vec3(0.055, 0.050, 0.046), vec3(0.135, 0.115, 0.095), n1 * 0.6 + n3 * 0.4);
  /* the bands lie unevenly, dip a little and break off, showing on some
     stretches of a face and not on others, and they fade out before they
     are finer than the pixels, so they never stripe the faces */
  float lay = (y + 0.22 * dot(p.xz, vec2(0.8, -0.6))) / 31.0 + 2.4 * n2 + 1.3 * vn(p.xz / 150.0 + 19.0);
  float bands = 0.65 * vn(vec2(lay, dot(p.xz, vec2(0.6, 0.8)) / 240.0)) + 0.35 * vn(vec2(lay * 2.3 + 7.0, dot(p.xz, vec2(-0.8, 0.6)) / 130.0));
  float bandK = 0.34 * smoothstep(0.3, 0.7, vn(p.xz / 520.0 + 23.0)) * (1.0 - smoothstep(0.1, 0.3, lod / 31.0));
  rock *= 1.0 + bandK * (smoothstep(0.2, 0.8, bands) - 0.5);
  rock *= 0.75 + 0.45 * streak;
  rock = mix(rock, vec3(0.20, 0.14, 0.09), 0.3 * smoothstep(0.62, 0.85, n2));
  float scree = smoothstep(0.6, 0.8, n.y) * smoothstep(3350.0, 2650.0, y);
  rock = mix(rock, vec3(0.125, 0.115, 0.10) * (0.7 + 0.6 * n3), scree * 0.7);
  float tundra = smoothstep(0.45, 0.7, vn(p.xz / 90.0 + 5.0) * 0.6 + n1 * 0.4);
  float grass = max(smoothstep(2700.0 + 150.0 * n2, 2450.0, y), tundra * smoothstep(3000.0, 2780.0, y))
              * smoothstep(0.66, 0.84, n.y + 0.1 * (n3 - 0.5));
  vec3 pasture = mix(vec3(0.055, 0.075, 0.025), vec3(0.11, 0.11, 0.042), n1);
  float shrub = smoothstep(0.5, 0.7, vn(p.xz / 70.0 + 41.0) * 0.7 + n3 * 0.3) * smoothstep(2650.0, 2300.0, y);
  pasture = mix(pasture, vec3(0.03, 0.045, 0.02), shrub * 0.75);
  vec3 col = mix(rock, pasture, grass);
  float forest = smoothstep(2380.0 + 140.0 * n2, 2180.0, y) * smoothstep(0.45, 0.65, n.y) * smoothstep(0.3, 0.48, vn(p.xz / 160.0 + 13.0) * 0.75 + n1 * 0.25);
  col = mix(col, vec3(0.016, 0.03, 0.018) * (0.7 + 0.6 * n3), forest);
  float line = 3120.0 + 280.0 * (n2 - 0.5);
  float hold = smoothstep(0.70, 0.86, n.y + 0.14 * (n1 - 0.5) + 0.08 * smoothstep(3600.0, 4300.0, y));
  snow = smoothstep(line - 120.0, line + 160.0, y) * hold;
  vec2 dh = p.xz - HORN;
  if (dot(dh, dh) < 2200.0 * 2200.0) {
    float gul = hornGully(p.xz);
    float held = smoothstep(0.42, 0.8, gul + 0.25 * (n3 - 0.5)) * smoothstep(0.25, 0.45, n.y) * smoothstep(3150.0, 3450.0, y);
    snow = max(snow, held * (0.55 + 0.45 * smoothstep(0.4, 0.7, vn(p.xz / 120.0 + 31.0))));
  }
  vec3 snowc = mix(vec3(0.78, 0.82, 0.88), vec3(0.89, 0.91, 0.94), n3);
  snowc *= mix(0.8, 1.0, smoothstep(2950.0, 3600.0, y)) * (0.86 + 0.14 * vn(p.xz / 160.0 + 21.0));
  float c = dot(p.xz, fall) / 22.0 + 3.0 * vn(p.xz / 90.0);
  float crev = smoothstep(0.86, 0.97, abs(sin(c * 3.1416))) * smoothstep(0.78, 0.88, n.y) * (1.0 - smoothstep(0.975, 0.995, n.y))
             * smoothstep(2900.0, 3100.0, y) * (1.0 - smoothstep(3700.0, 4000.0, y)) * smoothstep(0.35, 0.55, vn(p.xz / 300.0 + 2.0));
  snowc = mix(snowc, vec3(0.20, 0.27, 0.34), crev * 0.8);
  return mix(col, snowc, snow);
}

/* near the eye the ground is the shaded floor of the grass, out of
   focus and streaked; further out the eye sees only the tops, a tussocky
   mat of olive and gold dotted with flowers, which melt into a tint
   once they are smaller than a pixel */
vec3 meadowAlbedo(vec3 p, float t) {
  vec2 q = p.xz;
  float n1 = vn(q * 0.35), n2 = vn(q * 0.07 + 5.0), n3 = vn(q * 1.7 + 9.0), n4 = vn(q * 5.0 + 2.0);
  vec3 floor0 = mix(vec3(0.02, 0.036, 0.011), vec3(0.048, 0.064, 0.02), n1 * 0.5 + n3 * 0.5);
  floor0 *= 0.7 + 0.6 * vn(vec2(q.x * 25.0, q.y * 6.0));
  vec3 tops = mix(vec3(0.048, 0.07, 0.02), vec3(0.105, 0.108, 0.038), n1 * 0.4 + n2 * 0.3 + n3 * 0.3);
  tops *= 0.78 + 0.44 * n4;
  vec2 c = floor(q * 6.0);
  float h = hash(c + 17.0);
  vec2 f = fract(q * 6.0) - 0.5 - (vec2(hash(c + 7.1), hash(c + 3.3)) - 0.5) * 0.6;
  float speck = step(0.93, h) * smoothstep(0.2, 0.08, length(f));
  vec3 fc = h > 0.985 ? vec3(0.62, 0.62, 0.57) : h > 0.968 ? vec3(0.66, 0.5, 0.05) : h > 0.952 ? vec3(0.12, 0.16, 0.5) : vec3(0.5, 0.26, 0.36);
  float vis = smoothstep(0.08, 0.025, t * PIX);
  tops = mix(tops, fc, speck * vis);
  tops += vec3(0.012, 0.01, 0.004) * (1.0 - vis);
  return mix(floor0, tops, smoothstep(5.0, 16.0, t));
}

vec3 light(Look L, vec3 p, vec3 n, vec3 rd, float t, vec3 alb, float snow, float ao, float sh, bool meadow, out float dfr) {
  float ndl = dot(n, L.sun);
  float dif = max(ndl, 0.0);
  dif = mix(dif, max((ndl + 0.3) / 1.3, 0.0), snow * 0.6);
  float line = 1.0;
  if (L.alp.z > 0.0) line = smoothstep(L.alp.x - L.alp.y, L.alp.x + L.alp.y, p.y + 90.0 * (vn(p.xz / 700.0) - 0.5));
  vec3 direct = L.sunc * dif * sh * line;
  if (meadow) direct += L.sunc * sh * line * 0.35 * pow(max(dot(rd, L.sun), 0.0), 3.0);
  vec3 amb = L.amb * ao * (0.55 + 0.45 * n.y) + L.bnc * ao * (0.5 - 0.5 * n.y);
  vec3 col = alb * (direct + amb);
  vec3 hv = normalize(L.sun - rd);
  col += snow * L.sunc * sh * line * pow(max(dot(n, hv), 0.0), 24.0) * 0.08;
  vec3 ext, ins;
  fogOf(L, EYE, rd, t, ext, ins);
  vec3 outc = col * ext + ins;
  float dl = dot(alb * direct * ext, vec3(0.3, 0.5, 0.2));
  dfr = clamp(dl / max(dot(outc, vec3(0.3, 0.5, 0.2)), 1e-4), 0.0, 1.0);
  return outc;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  ivec2 lim = ivec2(RES) - 1;
  float tc = unpackT(texelFetch(PREB, px, 0).rg);
  float lc = log(tc);
  bool edge = false;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      float tn = unpackT(texelFetch(PREB, clamp(px + ivec2(i, j), ivec2(0), lim), 0).rg);
      if (abs(log(tn) - lc) > 0.04) edge = true;
    }
  }
  if (REFINE > 0.5) {
    vec3 hp = EYE + camDir(gl_FragCoord.xy / RES, CAM) * tc;
    vec2 hd = hp.xz - HORN;
    if (edge || tc > 1.5e5 || hp.y < 2900.0 || dot(hd, hd) > 2600.0 * 2600.0) discard;
  }
  int ns = edge || REFINE > 0.5 ? 4 : 1;
  vec3 c0 = vec3(0.0), c1 = vec3(0.0), c2 = vec3(0.0), df = vec3(0.0);
  float hits = 0.0, lt = 0.0, sn = 0.0, sh0 = 1.0, sh1 = 1.0, sh2 = 1.0;
  for (int s = 0; s < 4; s++) {
    if (s >= ns) break;
    vec2 f = gl_FragCoord.xy + (ns > 1 ? SS[s] : vec2(0.0));
    vec3 rd = camDir(f / RES, CAM);
    /* an edge's rays may each find a different crest, so each is traced
       from the eye; the horn's lie on one face, so each starts its search
       just short of the face the pixel found */
    float t;
    if (edge) t = trace(EYE, rd);
    else if (ns > 1) t = tc < 2400.0 ? trace(EYE, rd) : traceFar(EYE, rd, tc * 0.98, tc * 0.95);
    else t = tc > 1.5e5 ? -1.0 : tc;
    if (t <= 0.0) continue;
    vec3 p = EYE + rd * t;
    bool meadow = t < 2400.0 && p.y - meadowH(p.xz) < 0.05;
    float lod = max(t * PIX, 0.02);
    vec3 n = meadow ? meadowNormal(p.xz) : terrainNormal(p.xz, lod);
    float snow = 0.0;
    vec3 alb = meadow ? meadowAlbedo(p, t) : rockAlbedo(p, n, lod, snow);
    float ao = meadow ? 1.0 : terrainAO(p, n, lod);
    if (edge || hits < 0.5) {
      vec3 so = p + n * (0.5 + t * 0.002);
      sh0 = shadow(so, LK[0].sun);
      sh1 = shadow(so, LK[1].sun);
      sh2 = shadow(so, LK[2].sun);
    }
    float d0, d1, d2;
    c0 += light(LK[0], p, n, rd, t, alb, snow, ao, sh0, meadow, d0);
    c1 += light(LK[1], p, n, rd, t, alb, snow, ao, sh1, meadow, d1);
    c2 += light(LK[2], p, n, rd, t, alb, snow, ao, sh2, meadow, d2);
    df += vec3(d0, d1, d2);
    hits += 1.0;
    lt += log(t);
    sn += snow;
  }
  float k = 1.0 / float(ns);
  float h1 = max(hits, 1.0);
  float tt = hits > 0.0 ? exp(lt / h1) : 2e5;
  o0 = vec4(enc(c0 * k), hits * k);
  o1 = vec4(enc(c1 * k), df.y / h1);
  o2 = vec4(enc(c2 * k), df.z / h1);
  o3 = vec4(packT(tt), df.x / h1, sn / h1);
}`;

/* where the sky can be seen at all, at the sky pass's resolution, once
   the land is built: anything behind solid land nearer than the clouds
   is never drawn */
var MASK = HEAD + PACK + `
out vec4 o;
uniform sampler2D LA0, LA3;
uniform ivec2 FULL;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy) * 2;
  float need = 0.0;
  for (int j = -2; j <= 3; j++) {
    for (int i = -2; i <= 3; i++) {
      ivec2 q = clamp(c + ivec2(i, j), ivec2(0), FULL - 1);
      if (texelFetch(LA0, q, 0).a < 0.999 || unpackT(texelFetch(LA3, q, 0).rg) > 28000.0) need = 1.0;
    }
  }
  o = vec4(need, 0.0, 0.0, 1.0);
}`;

/* the sky, every frame: the clear sky of each look; a veil of cirrus;
   two decks of cumulus, each mass a body of low noise rounded into
   puffs by a billow term and lit at three scales by how its density
   falls toward the sun, so each cloud keeps a lit side and a shadow
   side, and the bases hang dark by day and catch the low sun at dusk.
   The decks lie far off, so all the land but the farthest range stands
   in front of them */
var SKY = HEAD + NOISE + LOOK + `
in vec2 uv;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
uniform vec4 CAM;
uniform vec3 EYE, W, SUN, CLIT, CMID, CSHD, GLOW;
uniform float CLT, SCALE, COVER, NIGHT, DUSK, FINE;
uniform vec2 PEAK;
uniform sampler2D MASKT;

vec3 skyAll(vec3 rd) {
  vec3 c = vec3(0.0);
  if (W.x > 0.0) c += W.x * skyCol(LK[0], rd);
  if (W.y > 0.0) c += W.y * skyCol(LK[1], rd);
  if (W.z > 0.0) c += W.z * skyCol(LK[2], rd);
  return c;
}

float bodyAt(vec2 q, float seed) {
  return fbm5(q * 3.2 + seed);
}

float reliefAt(vec2 q, float seed) {
  return fbm5(q * 5.5 + 4.0 + seed);
}

float puffsAt(vec2 q, float seed) {
  return 0.72 * (1.0 - abs(2.0 * fbm3(q * 11.0 + 9.0 + seed) - 1.0))
       + 0.28 * (1.0 - abs(2.0 * fbm3(q * 23.0 + 39.0 + seed) - 1.0));
}

float grainAt(vec2 q, float seed) {
  return fbm3(q * 26.0 + 23.0 + seed);
}

float bigAt(vec2 q, float seed) {
  return bodyAt(q, seed) + 0.16 * (reliefAt(q, seed) - 0.5);
}

float massAt(vec2 q, float seed) {
  return bigAt(q, seed) + 0.18 * (puffsAt(q, seed) - 0.5);
}

vec4 deck(vec2 p0, vec2 sunP, vec2 drift, float sc, float seed, float th, float far, float glow) {
  float k = sc * FINE;
  p0 *= k;
  sunP *= k;
  vec2 q0 = p0 + drift;
  vec2 warp = (vec2(fbm3(q0 * 1.4 + 3.0 + seed), fbm3(q0 * 1.4 + 17.0 + seed)) - 0.5) * 0.25;
  vec2 p = q0 + warp;
  float big = bigAt(p, seed);
  if (big < th - 0.19) return vec4(0.0);
  float puffs = puffsAt(p, seed);
  float grain = grainAt(p, seed);
  float f = big + 0.18 * (puffs - 0.5) + 0.06 * (grain - 0.5);
  float e = f - th;
  float dens = smoothstep(0.0, 0.09, e);
  float fringe = smoothstep(-0.06, 0.0, e) * (1.0 - dens);
  float cov = dens + fringe * 0.5;
  if (cov <= 0.001) return vec4(0.0);
  vec2 toSun = normalize(sunP - p0 + vec2(1e-5));
  float towardBig = bigAt(p + toSun * 0.045, seed) - big;
  float towardLobe = puffsAt(p + toSun * 0.012, seed) - puffs;
  float towardGrain = grainAt(p + toSun * 0.005, seed) - grain;
  float bigShade = smoothstep(0.08, -0.08, towardBig);
  float lobeShade = smoothstep(0.10, -0.10, towardLobe);
  float grainShade = smoothstep(0.06, -0.06, towardGrain);
  float sunUp = clamp(SUN.y * 2.2, 0.0, 1.0);
  float thick = smoothstep(0.0, 0.30, e);
  float under = 0.6 * smoothstep(-0.02, 0.10, massAt(p + vec2(0.0, -0.05), seed) - th)
              + 0.4 * smoothstep(-0.02, 0.14, massAt(p + vec2(0.0, -0.11), seed) - th);
  float grainK = 0.04 + 0.10 * bigShade;
  float lam = 0.10 + 0.90 * (0.45 * bigShade + (0.55 - grainK) * lobeShade + grainK * grainShade);
  float shade = max(under * mix(0.4, 1.0, sunUp), thick * 0.5 * sunUp) * (1.0 - far * 0.35);
  float belly = mix(1.0, 0.26, shade);
  float crease = smoothstep(0.55, 0.2, puffs);
  float lk = mix(0.5, clamp(lam * belly * (1.0 - 0.28 * crease), 0.0, 1.0), 0.9);
  float facing = smoothstep(0.2, 0.8, 0.5 * bigShade + 0.5 * lobeShade);
  float lining = (1.0 - smoothstep(0.0, 0.10, e)) * (0.2 + 0.8 * facing);
  float hue = smoothstep(0.36, 0.64, fbm3(q0 * 0.55 + 57.0 + seed));
  vec3 lit = CLIT * mix(vec3(1.03, 0.99, 0.93), vec3(0.98, 1.0, 1.03), hue);
  lit *= mix(vec3(1.0), vec3(1.0, 0.84, 0.66), DUSK);
  vec3 col = lk < 0.5 ? mix(CSHD, CMID, lk * 2.0) : mix(CMID, lit, lk * 2.0 - 1.0);
  col += lit * lining * 0.35 * (1.0 - 0.5 * DUSK);
  col += GLOW * lining * (0.15 + 0.25 * DUSK);
  col += GLOW * glow * mix(0.55, 0.50, NIGHT) * (1.0 - thick * 0.8) * (1.0 - 0.7 * DUSK);
  return vec4(col, cov);
}

void main() {
  if (texelFetch(MASKT, ivec2(gl_FragCoord.xy), 0).r < 0.5) {
    o0 = vec4(0.0);
    o1 = vec4(0.0);
    return;
  }
  vec3 rd = camDir(uv, CAM);
  vec3 sky = skyAll(rd);
  vec3 hz = skyAll(normalize(vec3(rd.x, 0.02, rd.z)));
  float dy = max(rd.y, 0.0);
  vec2 p0 = rd.xz / (dy + 0.5) * 0.85;
  vec2 sunP = SUN.xz / (max(SUN.y, 0.0) + 0.5) * 0.85;
  vec2 drift = CLT * vec2(-0.008, 0.0012);
  float glow = pow(max(dot(rd, SUN), 0.0), mix(24.0, 48.0, NIGHT));
  /* the decks thin out toward the horizon, where the haze takes them,
     and part about the summit, which stands clear */
  float low = 1.0 - smoothstep(0.03, 0.26, rd.y);
  vec3 sd = normalize(vec3(sin(PEAK.x), PEAK.y, cos(PEAK.x)));
  float clear = 1.0 - smoothstep(0.05, 0.16, acos(clamp(dot(rd, sd), -1.0, 1.0)));
  float th0 = mix(0.80, 0.46, COVER) + 0.10 * low + 0.3 * clear;
  vec2 pc = rd.xz / (dy + 0.5) * 0.55 + drift * 0.3;
  vec2 qs = vec2(pc.x * 0.45 + pc.y * 0.2, pc.y * 1.6 - pc.x * 0.3);
  float veil = 0.65 * fbm5(qs * 2.0 + 31.0) + 0.35 * fbm3(qs * 6.0 + 13.0);
  float patchy = smoothstep(0.40, 0.66, fbm3(pc * 0.5 + 71.0));
  float cirA = smoothstep(0.50, 0.78, veil) * 0.14 * patchy * smoothstep(0.0, 0.5, COVER) * smoothstep(0.0, 0.15, rd.y);
  vec3 cirCol = mix(CLIT, hz, 0.35) + GLOW * glow * 0.3;
  sky = mix(sky, cirCol, cirA);
  vec4 far = deck(p0, sunP, drift * 2.1, 2.1, 41.0, th0 + 0.06, 1.0, glow);
  far.rgb = mix(far.rgb, hz, 0.30 + 0.4 * low);
  vec4 near = deck(p0, sunP, drift, 1.0, 0.0, th0, 0.0, glow);
  near.rgb = mix(near.rgb, hz, 0.45 * low);
  float a = near.a + far.a * 0.8 * (1.0 - near.a);
  vec3 c = near.rgb * near.a + far.rgb * far.a * 0.8 * (1.0 - near.a);
  o0 = vec4(sky * SCALE, 1.0);
  o1 = vec4(c * SCALE, a);
}`;

/* a bokeh disc, gathered over rings of taps turned at random per pixel */
function bokehSrc(k) {
  var n = k.length;
  return HEAD + NOISE + `
in vec2 uv;
out vec4 o;
uniform sampler2D SRC;
uniform vec2 TEXEL;
uniform float RAD;
const vec2 K[${n}] = vec2[${n}](` + k.join(',') + `);
void main() {
  float kang = hash12(uv * 517.3) * 6.2831853;
  float kc = cos(kang), ks = sin(kang);
  mat2 ROT = mat2(kc, ks, -ks, kc);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < ${n}; i++) acc += texture(SRC, uv + (ROT * K[i]) * RAD * TEXEL);
  o = acc / ${n}.0;
}`;
}

/* the meadow: blades of grass, seed stalks and flower stems grown on
   the ground function, bent by a wind that runs across the grass in
   gusts; every vertex bends with it */
var STALK = `
uniform float T, WENV;
uniform vec2 WIND;
float gust(vec2 p, float t) {
  vec2 q = p * vec2(0.42, 0.55) - vec2(t * 1.05, t * 0.12);
  return 0.62 * vn(q) + 0.38 * vn(q * 2.3 + 11.7);
}
vec3 stalk(vec4 a0, vec4 a1, vec4 a2, float s, out vec3 tng) {
  vec2 root = a0.xy;
  float h = a0.z;
  float y0 = meadowH(root);
  float g = gust(root, T);
  float flex = a2.y, ph = a1.w;
  float bend = flex * (0.05 + WENV * (0.16 + 0.9 * g * g))
             + flex * 0.04 * sin(T * (1.6 + 0.9 * fract(ph * 7.0)) + ph * 6.2832) * (0.25 + WENV);
  vec2 lean = vec2(cos(a1.x), sin(a1.x)) * a1.y;
  vec2 off = lean + WIND * bend;
  vec3 P0 = vec3(root.x, y0, root.y);
  vec3 P2 = P0 + normalize(vec3(off.x, 1.0, off.y)) * h;
  P2.y = max(P2.y - a2.z * h * 0.25 * length(off), y0 + 0.06 * h);
  vec3 P1 = P0 + vec3(off.x * 0.3, 0.6, off.y * 0.3) * h;
  vec3 a = mix(P0, P1, s), b = mix(P1, P2, s);
  tng = normalize(b - a);
  return mix(a, b, s);
}
`;

var SEG = 7;

var BLADE_VS = HEAD + NOISE + MEADOW + STALK + `
layout(location = 0) in vec4 A0;
layout(location = 1) in vec4 A1;
layout(location = 2) in vec4 A2;
uniform vec4 CAM;
uniform vec3 EYEG;
uniform vec2 CLIP;
uniform float PIXR;
out vec3 vP;
out vec3 vN;
out vec2 vS;
flat out vec4 vA;
void main() {
  int seg = gl_VertexID >> 1;
  float side = float(gl_VertexID & 1) * 2.0 - 1.0;
  float s = float(seg) / ${SEG}.0;
  vec3 tng;
  vec3 pos = stalk(A0, A1, A2, s, tng);
  float kind = A2.x;
  float yaw = A1.x;
  vec3 wv = vec3(-sin(yaw), 0.0, cos(yaw));
  float tw = A2.w * 1.6 * s;
  wv = normalize(wv * cos(tw) + cross(tng, wv) * sin(tw));
  float prof;
  if (kind < 0.5) prof = (1.0 - s * s * s) * (0.6 + 0.4 * smoothstep(0.0, 0.2, s));
  else if (kind < 1.5) prof = 0.32 + 1.5 * smoothstep(0.6, 0.78, s) * (1.0 - smoothstep(0.86, 1.0, s));
  else prof = 0.7 - 0.2 * s;
  float dist = length(pos - EYEG);
  float w = max(A0.w * prof, dist * PIXR * 0.6 * step(0.02, prof));
  pos += wv * side * w * 0.5;
  vec3 n = normalize(cross(tng, wv));
  n = normalize(n + wv * side * 0.35);
  vP = pos;
  vN = n;
  vS = vec2(s, side);
  vA = vec4(A1.z, kind, A2.w, A0.z);
  gl_Position = project(pos - EYEG, CAM, CLIP);
}`;

var BLADE_FS = HEAD + `
in vec3 vP;
in vec3 vN;
in vec2 vS;
flat in vec4 vA;
uniform vec3 EYEG, LDIR, LCOL, AMB, TRN;
uniform float GSCALE;
out vec4 o;
void main() {
  vec3 V = normalize(EYEG - vP);
  vec3 N = normalize(vN);
  if (dot(N, V) < 0.0) N = -N;
  float s = vS.x, tint = vA.x, kind = vA.y, rnd = vA.z;
  vec3 base = mix(vec3(0.028, 0.048, 0.014), vec3(0.046, 0.066, 0.018), tint);
  vec3 tip = mix(vec3(0.125, 0.155, 0.045), vec3(0.215, 0.195, 0.07), tint);
  vec3 alb = mix(base, tip, smoothstep(0.0, 0.9, s));
  if (kind > 0.5 && kind < 1.5) alb = mix(alb, vec3(0.30, 0.24, 0.12), smoothstep(0.5, 0.7, s));
  if (kind > 1.5) alb = mix(vec3(0.04, 0.07, 0.02), vec3(0.09, 0.13, 0.04), s);
  alb = mix(alb, vec3(0.26, 0.22, 0.12), step(0.46, rnd) * smoothstep(0.1, 0.8, s));
  float ndl = dot(N, LDIR);
  float dif = max(ndl, 0.0);
  float bl = pow(max(dot(-V, LDIR), 0.0), 2.0);
  float trn = max(-ndl, 0.0) * (0.25 + 0.75 * bl);
  float sh = mix(0.25, 1.0, smoothstep(0.15, 0.85, s));
  float ao = mix(0.35, 1.0, smoothstep(0.0, 0.7, s));
  vec3 Hh = normalize(LDIR + V);
  float sp = pow(max(dot(N, Hh), 0.0), 36.0) * 0.18;
  vec3 col = alb * (LCOL * (dif + trn * TRN) * sh + AMB * ao * (0.55 + 0.45 * abs(N.y)));
  col += LCOL * sp * sh;
  o = vec4(col * GSCALE, 1.0);
}`;

/* flower heads ride the tips of their stems: discs that face the sky
   (daisies, asters, buttercups, edelweiss) and bells and balls that
   face the eye (gentians, harebells, clover, dandelion clocks) */
var HEAD_VS = HEAD + NOISE + MEADOW + STALK + `
layout(location = 0) in vec4 A0;
layout(location = 1) in vec4 A1;
layout(location = 2) in vec4 A2;
layout(location = 3) in vec4 A3;
uniform vec4 CAM;
uniform vec3 EYEG, LDIR;
uniform vec2 CLIP;
out vec2 vQ;
out vec3 vP;
out vec3 vF;
flat out vec4 vK;
void main() {
  vec2 q = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vec3 tng;
  vec3 tip = stalk(A0, A1, A2, 1.0, tng);
  float kind = A3.x, size = A3.y;
  vec3 pos, nrm;
  if (kind < 3.5) {
    nrm = normalize(tng * 0.6 + vec3(0.0, 0.7, 0.0) + vec3(LDIR.x, 0.0, LDIR.z) * 0.25 + vec3(cos(A3.z), 0.0, sin(A3.z)) * A3.w);
    vec3 r = normalize(cross(nrm, vec3(0.31, 0.0, 0.95)));
    vec3 u = cross(r, nrm);
    pos = tip + (r * q.x + u * q.y) * size;
  } else {
    vec3 V = normalize(EYEG - tip);
    vec3 r = normalize(cross(tng, V));
    vec3 u = normalize(cross(V, r));
    nrm = V;
    pos = tip + (r * q.x + u * (q.y + 0.7)) * size;
  }
  vQ = q;
  vP = pos;
  vF = nrm;
  vK = vec4(kind, A3.w, A1.z, fract(A2.w * 7.31));
  gl_Position = project(pos - EYEG, CAM, CLIP);
}`;

var HEAD_FS = HEAD + `
in vec2 vQ;
in vec3 vP;
in vec3 vF;
flat in vec4 vK;
uniform vec3 EYEG, LDIR, LCOL, AMB;
uniform float GSCALE, A2C;
out vec4 o;
void main() {
  vec2 q = vQ;
  float r = length(q), a = atan(q.y, q.x);
  float kind = vK.x, rnd = vK.w;
  float m = 0.0, thin = 0.5, gloss = 0.0;
  vec3 alb = vec3(0.0);
  vec3 N = normalize(vF);
  vec3 V = normalize(EYEG - vP);
  if (dot(N, V) < 0.0 && kind < 3.5) N = -N;
  if (kind < 0.5) {
    float pet = 0.72 + 0.28 * pow(abs(cos(a * 8.0 + rnd * 6.0)), 0.6);
    m = smoothstep(pet, pet - 0.08, r);
    float disk = smoothstep(0.30, 0.25, r);
    alb = mix(vec3(0.80, 0.80, 0.76), vec3(0.72, 0.48, 0.05), disk);
    thin = 0.7 * (1.0 - disk);
  } else if (kind < 1.5) {
    float pet = 0.66 + 0.34 * pow(abs(cos(a * 10.0 + rnd * 6.0)), 0.8);
    m = smoothstep(pet, pet - 0.08, r);
    float disk = smoothstep(0.27, 0.22, r);
    alb = mix(vec3(0.40, 0.31, 0.58), vec3(0.75, 0.55, 0.08), disk);
    thin = 0.6 * (1.0 - disk);
  } else if (kind < 2.5) {
    float pet = 0.62 + 0.38 * pow(abs(cos(a * 2.5 + rnd * 6.0)), 0.45);
    m = smoothstep(pet, pet - 0.07, r);
    alb = mix(vec3(0.85, 0.62, 0.04), vec3(0.95, 0.75, 0.10), smoothstep(0.1, 0.6, r));
    thin = 0.35;
    gloss = 1.0;
  } else if (kind < 3.5) {
    float pet = 0.38 + 0.62 * pow(abs(cos(a * 4.5 + rnd * 6.0)), 2.2);
    m = smoothstep(pet, pet - 0.1, r);
    alb = mix(vec3(0.62, 0.62, 0.58), vec3(0.78, 0.76, 0.66), smoothstep(0.3, 0.0, r));
    thin = 0.25;
  } else if (kind < 4.5) {
    float y = q.y * 0.5 + 0.5;
    float w = 0.22 + 0.62 * pow(smoothstep(0.0, 1.0, y), 1.6);
    float lob = 1.0 - 0.12 * pow(abs(sin(q.x * 7.5)), 2.0) * smoothstep(0.85, 1.0, y);
    m = smoothstep(w, w - 0.08, abs(q.x)) * smoothstep(0.0, 0.05, y) * smoothstep(1.0 * lob, 0.95 * lob, y);
    alb = mix(vec3(0.03, 0.06, 0.38), vec3(0.06, 0.16, 0.62), smoothstep(0.2, 0.9, y));
    alb = mix(alb, vec3(0.02, 0.05, 0.12), smoothstep(0.08, 0.0, abs(q.x - 0.15 * sin(y * 6.0))) * 0.6);
    thin = 0.4;
  } else if (kind < 5.5) {
    vec2 b = q + vec2(0.0, 0.25);
    b = vec2(b.x * 0.97 + b.y * 0.26, -b.x * 0.26 + b.y * 0.97);
    float y = 0.5 - 0.5 * b.y;
    float w = 0.15 + 0.5 * pow(smoothstep(0.0, 1.0, y), 1.3);
    m = smoothstep(w, w - 0.08, abs(b.x)) * smoothstep(-0.05, 0.05, y) * smoothstep(1.0, 0.94, y + 0.06 * abs(sin(b.x * 9.0)));
    alb = mix(vec3(0.22, 0.20, 0.55), vec3(0.38, 0.34, 0.78), y);
    thin = 0.55;
  } else if (kind < 6.5) {
    float edge = 0.78 + 0.08 * sin(a * 9.0 + rnd * 4.0) * sin(a * 5.0);
    m = smoothstep(edge, edge - 0.08, r);
    alb = mix(vec3(0.55, 0.16, 0.30), vec3(0.85, 0.48, 0.62), 0.5 + 0.5 * sin(a * 23.0 + r * 9.0));
    N = normalize(N + (vec3(q, 0.0) * 0.6));
    thin = 0.2;
  } else {
    float fil = pow(abs(cos(a * 24.0 + rnd * 11.0)), 6.0);
    m = smoothstep(1.0, 0.72, r) * (0.62 + 0.38 * fil);
    alb = mix(vec3(0.84, 0.84, 0.82), vec3(0.30, 0.27, 0.18), smoothstep(0.2, 0.08, r));
    N = normalize(N + vec3(q, 0.0) * 0.5);
    thin = 0.95;
  }
  if (A2C < 0.5 && m < 0.5) discard;
  float ndl = dot(N, LDIR);
  float dif = max(ndl, 0.0) * 0.85 + 0.15;
  float trn = max(-ndl, 0.0) * thin * (0.4 + 0.6 * pow(max(dot(-V, LDIR), 0.0), 2.0));
  vec3 Hh = normalize(LDIR + V);
  float sp = gloss * pow(max(dot(N, Hh), 0.0), 50.0) * 0.6;
  vec3 col = alb * (LCOL * (dif + trn * 1.4) + AMB * 0.9) + LCOL * sp;
  o = vec4(col * GSCALE, A2C > 0.5 ? m : 1.0);
}`;

/* things that drift: dandelion seeds and pollen in the light by day,
   fireflies in the grass at night */
var PART_VS = HEAD + NOISE + MEADOW + `
layout(location = 0) in vec4 P0;
layout(location = 1) in vec4 P1;
uniform vec4 CAM;
uniform vec3 EYEG;
uniform vec2 CLIP;
uniform float T, DRIFT, PIXR, HALFW;
uniform vec3 VIS;
out vec4 vC;
flat out float vKind;
void main() {
  float kind = P1.x, seed = P0.w, ph = P1.w;
  float z = P0.y;
  float wide = z * HALFW + 0.4;
  vec3 pos;
  float vis, glow;
  if (kind < 1.5) {
    float x = mod(P0.x + DRIFT * P1.z + wide, 2.0 * wide) - wide;
    float y = max(P0.z + 0.12 * sin(T * 0.35 + ph * 6.3) + 0.05 * sin(T * 0.9 + ph * 2.1), 0.04);
    pos = vec3(x, meadowH(vec2(x, z)) + y, z + 0.3 * sin(T * 0.21 + ph * 4.0));
    vis = kind < 0.5 ? VIS.x : VIS.y;
    glow = 1.0;
  } else {
    float tt = T * 0.12 + ph * 50.0;
    vec2 wob = vec2(vn(vec2(tt, seed)) - 0.5, vn(vec2(seed, tt)) - 0.5) * 2.0;
    float x = P0.x + wob.x * 1.3;
    float y = P0.z + 0.25 * (vn(vec2(tt * 1.3, seed + 4.0)) - 0.5);
    pos = vec3(x, meadowH(vec2(x, z)) + y, z + wob.y * 0.8);
    float cyc = fract(T / (4.0 + 5.0 * fract(seed * 3.1)) + ph);
    glow = smoothstep(0.0, 0.08, cyc) * (1.0 - smoothstep(0.2, 0.45, cyc));
    vis = VIS.z;
  }
  vec3 rel = pos - EYEG;
  float dist = length(rel);
  float px = P1.y / max(dist, 0.05) / PIXR;
  gl_PointSize = clamp(px, 1.0, 96.0);
  vC = vec4(vis * glow, px, 0.0, 0.0);
  vKind = kind;
  gl_Position = project(rel, CAM, CLIP);
}`;

var PART_FS = HEAD + `
in vec4 vC;
flat in float vKind;
uniform vec3 LDIR, LCOL;
uniform vec3 EYEG;
uniform float GSCALE;
out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = length(q);
  if (r > 1.0 || vC.x <= 0.001) discard;
  vec3 col;
  float a;
  if (vKind < 0.5) {
    float ang = atan(q.y, q.x);
    float rays = pow(abs(cos(ang * 4.0)), 12.0) * smoothstep(1.0, 0.3, r);
    float core = smoothstep(0.35, 0.0, r);
    a = clamp(core + rays * 0.6, 0.0, 1.0) * vC.x;
    col = LCOL * 0.55 + vec3(0.06);
  } else if (vKind < 1.5) {
    a = smoothstep(1.0, 0.0, r) * 0.7 * vC.x;
    col = LCOL * 0.45;
  } else {
    a = smoothstep(1.0, 0.0, r);
    a = (a * a * 0.6 + smoothstep(0.3, 0.0, r) * 0.8) * vC.x;
    col = vec3(2.2, 3.0, 0.9);
  }
  o = vec4(col * a * GSCALE, a * (vKind > 1.5 ? 0.0 : 1.0));
}`;

/* the picture: the land shaded for each look and weighted between them,
   shadowed where the clouds pass; the sky behind it and the clouds in
   front of it or behind by their distance; the night sky;
   then the grass in three planes of focus, under an ACES grade, a
   vignette and grain */
var COMP = HEAD + NOISE + LOOK + PACK + `
in vec2 uv;
out vec4 o;
uniform sampler2D LA0, LA1, LA2, LA3, SKA, SKB, GFAR, GMID, GNEAR;
uniform vec4 CAM;
uniform vec3 EYE, W, MOON, GN, GC, GV;
uniform float T, G, SCALE, GSCALE, EXPO, MOONR, PH, STARS, CLT, MILKY;
uniform float METON, METP, METS, METL;
uniform vec4 MET;
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float cloudShade(vec3 wp, vec3 L) {
  if (L.y < 0.06) return 1.0;
  vec2 q = wp.xz + L.xz / L.y * (4900.0 - wp.y);
  q = q / 3400.0 + vec2(CLT * 0.0028, 0.0);
  float n = 0.7 * fbm3(q) + 0.3 * fbm3(q * 2.7 + 3.0);
  return 1.0 - smoothstep(0.54, 0.68, n);
}
vec3 milky(vec3 d) {
  float b = dot(d, GN);
  float along = atan(dot(d, GV), dot(d, GC));
  float core = exp(-along * along / 0.06);
  float wide = 0.045 + 0.05 * core + 0.012 * (fbm3(vec2(along * 4.0, 3.0)) - 0.45);
  float band = exp(-b * b / (wide * wide));
  vec2 q = vec2(along, b) * 32.0;
  float clouds = fbm5(q + 4.0);
  float knots = smoothstep(0.55, 0.8, fbm5(q * 2.3 + 9.0));
  float rx = (b - 0.004 - 0.02 * (fbm3(vec2(along * 6.0, 1.0)) - 0.45)) / (0.008 + 0.01 * core);
  float rift = exp(-rx * rx);
  float dust = rift * smoothstep(0.32, 0.58, fbm5(q * 1.6 + 17.0)) + 0.35 * smoothstep(0.55, 0.75, fbm5(q * 0.7 + 23.0));
  float glow = band * (0.15 + 0.85 * clouds * clouds * 2.0 + 0.6 * knots) * (1.0 - 0.85 * clamp(dust, 0.0, 1.0)) * (0.35 + 1.5 * core);
  return mix(vec3(0.6, 0.66, 0.88), vec3(1.0, 0.85, 0.68), core) * glow;
}
void main() {
  vec3 dir = camDir(uv, CAM);
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec4 a0 = texelFetch(LA0, px, 0), a1 = texelFetch(LA1, px, 0), a2 = texelFetch(LA2, px, 0), a3 = texelFetch(LA3, px, 0);
  float al = a0.a;
  vec3 sky = vec3(0.0);
  if (al < 0.999) {
  sky = texture(SKA, uv).rgb / SCALE;

  if (W.z > 0.001) {
    float dark = smoothstep(0.10, 0.02, dot(sky, vec3(0.3333)));
    float hor = smoothstep(-0.01, 0.12, dir.y);
    vec3 night = milky(dir) * MILKY;
    for (int L = 0; L < 2; L++) {
      float sc = L == 0 ? 114.6 : 260.0;
      vec2 ae = vec2(atan(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0))) * sc;
      vec2 c = floor(ae);
      vec2 f = fract(ae) - 0.5;
      float hs = hash3(vec3(c, 1.0 + float(L)));
      vec2 off = vec2(hash3(vec3(c, 7.3)), hash3(vec3(c, 13.9))) - 0.5;
      float mag = fract(hs * 41.7);
      float rad = (0.028 + 0.035 * mag * mag) * (L == 0 ? 1.0 : 1.9);
      float dd = length(f - off * 0.7);
      float core = smoothstep(rad, rad * 0.25, dd);
      float gb = dot(dir, GN) / 0.12;
      float dens = (L == 0 ? 0.045 : 0.05) * STARS * (1.0 + 2.5 * exp(-gb * gb));
      float star = core * step(1.0 - dens, hs);
      float tw = 0.9 + 0.1 * sin(T * (0.8 + 1.2 * hs) + hs * 80.0);
      float bright = (L == 0 ? (0.16 + 0.9 * mag * mag) : 0.12 + 0.2 * mag) * tw;
      night += mix(vec3(0.78, 0.85, 1.0), vec3(1.0, 0.92, 0.80), fract(hs * 9.1)) * star * bright * 1.3;
    }
    sky += night * W.z * dark * hor;
  }

  if (METON > 0.5 && W.z > 0.01) {
    vec2 ae = vec2(atan(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0)));
    float p = METP;
    vec2 hp = MET.xy + MET.zw * METS * p * METL;
    float len = min(METS * p * METL, 0.045 + 0.04 * p);
    vec2 tail = hp - MET.zw * len;
    vec2 sg = hp - tail;
    float q = clamp(dot(ae - tail, sg) / max(dot(sg, sg), 1e-9), 0.0, 1.0);
    float d = length(ae - (tail + sg * q));
    float sigma = 0.0005 + 0.0005 * (1.0 - q);
    float streak = exp(-d * d / (2.0 * sigma * sigma)) * pow(q, 1.7);
    float fade = (1.0 - smoothstep(0.55, 1.0, p)) * smoothstep(0.0, 0.08, p);
    float dh = length(ae - hp);
    float glint = exp(-dh * dh / (2.0 * 0.0007 * 0.0007));
    sky += (vec3(0.85, 0.92, 1.0) * streak * 1.4 + vec3(1.0) * glint * 1.1) * fade * W.z;
  }

  float ang = acos(clamp(dot(dir, MOON), -1.0, 1.0));
  if (ang < MOONR * 1.05) {
    vec3 ex = normalize(cross(vec3(0.0, 1.0, 0.0), MOON));
    vec3 ey = cross(MOON, ex);
    vec2 q = vec2(dot(dir, ex), dot(dir, ey)) / sin(MOONR);
    float rr = dot(q, q);
    if (rr < 1.0) {
      vec3 n = vec3(q, sqrt(1.0 - rr));
      float edge = n.z;
      float ph = PH * 6.2831853;
      vec3 Lm = normalize(vec3(sin(ph) * 0.9, abs(sin(ph)) * 0.44, -cos(ph)));
      float litRaw = dot(n, Lm);
      float lit = smoothstep(-0.22, 0.58, litRaw);
      lit = lit * lit * (3.0 - 2.0 * lit);
      float m = fbm3d(n * 3.1 + 7.0), m2 = fbm3d(n * 1.6 + 2.0);
      float mare = 0.30 * smoothstep(0.44, 0.66, m) + 0.16 * smoothstep(0.48, 0.72, m2);
      float term = smoothstep(-0.15, 0.15, litRaw) * smoothstep(0.75, 0.35, litRaw);
      float craters = (0.07 + 0.10 * term) * smoothstep(0.50, 0.85, fbm3d(n * 17.0 + 3.0)) + 0.06 * fbm3d(n * 9.0);
      float highland = 0.11 * smoothstep(0.52, 0.72, fbm3d(n * 2.3 + 13.0)) + 0.05 * smoothstep(0.58, 0.80, fbm3d(n * 5.1 + 27.0));
      float detail = 1.0 - mare - craters + highland;
      vec3 daySurf = mix(sky, vec3(0.62, 0.62, 0.64), 0.7);
      vec3 nightSurf = vec3(0.34, 0.33, 0.30);
      vec3 surf = mix(daySurf, nightSurf, W.z) * detail;
      float rim = pow(1.0 - abs(edge), 1.6);
      surf = mix(surf, surf * vec3(1.13, 1.12, 1.09), rim);
      surf = mix(surf, mix(surf, sky, 0.30), (1.0 - rim) * (1.0 - W.z));
      float limb = smoothstep(0.0, mix(0.34, 0.24, W.z), abs(edge));
      float alpha = smoothstep(0.02, mix(0.16, 0.12, W.z), abs(edge)) * lit * (limb * 0.97 + 0.03);
      sky = mix(sky, surf, alpha);
    }
  }
  }

  vec4 cl = texture(SKB, uv);
  cl.rgb /= SCALE;
  float cd = 30000.0;
  float td = unpackT(a3.rg);
  vec3 wp = EYE + dir * td;
  vec3 l0 = dec(a0.rgb), l1 = dec(a1.rgb), l2 = dec(a2.rgb);
  if (al > 0.0) {
    l0 *= 1.0 - a3.b * (1.0 - cloudShade(wp, LK[0].sun)) * 0.72;
    l2 *= 1.0 - a2.a * (1.0 - cloudShade(wp, LK[2].sun)) * 0.5;
  }
  vec3 land = W.x * l0 + W.y * l1 + W.z * l2;
  vec3 col;
  if (cd < td) col = cl.rgb + (1.0 - cl.a) * (land + (1.0 - al) * sky);
  else col = land + (1.0 - al) * (cl.rgb + (1.0 - cl.a) * sky);

  vec4 gf = texelFetch(GFAR, px, 0);
  col = gf.rgb / GSCALE + (1.0 - gf.a) * col;
  vec4 gm = texture(GMID, uv);
  col = gm.rgb / GSCALE + (1.0 - gm.a) * col;
  vec4 gn = texture(GNEAR, uv);
  col = gn.rgb / GSCALE + (1.0 - gn.a) * col;

  col = aces(col * EXPO);
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.92 - 0.3 * W.z);
  col = col * 0.96 + 0.01 + mix(vec3(0.006, 0.005, 0.004), vec3(0.0, 0.0015, 0.006), W.z) + W.y * vec3(0.006, 0.002, 0.0);
  float d2 = distance(uv, vec2(0.5));
  col *= 1.0 - smoothstep(0.45, 0.9, d2) * mix(0.14, 0.2, W.z);
  float gr = hash12(uv * 913.0 + G * 517.0) - 0.5;
  col += gr * 0.024 * (1.0 - W.z * 0.45) * (0.15 + 0.85 * smoothstep(0.0, 0.1, dot(col, vec3(0.333))));
  o = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}`;

/* ------------------------------------------------------------------ gl */

function shader(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

/* a program is linked but not waited on: with the parallel compile
   extension the driver builds them all off the main thread while the
   page settles, and the picture starts once every one is ready */
function program(fragSrc, names, vertSrc) {
  var vs = shader(gl.VERTEX_SHADER, vertSrc || VERT), fs = shader(gl.FRAGMENT_SHADER, fragSrc);
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  return { p: prog, vs: vs, fs: fs, names: names, u: null };
}

function linked(prog) {
  return !PSC || gl.getProgramParameter(prog.p, PSC.COMPLETION_STATUS_KHR);
}

function finish(prog) {
  if (!gl.getProgramParameter(prog.p, gl.LINK_STATUS)) {
    console.error(gl.getShaderInfoLog(prog.vs) || gl.getShaderInfoLog(prog.fs) || gl.getProgramInfoLog(prog.p));
    return false;
  }
  prog.u = {};
  prog.names.forEach(function (n) { prog.u[n] = gl.getUniformLocation(prog.p, n); });
  return true;
}

var LOOK_KEYS = ['sun', 'orb', 'sunc', 'zen', 'hor', 'glow', 'belt', 'amb', 'bnc', 'fog', 'alp', 'halo', 'sky2'];

function setLooks(prog) {
  gl.useProgram(prog.p);
  ['day', 'dusk', 'night'].forEach(function (name, i) {
    LOOK_KEYS.forEach(function (k) {
      var loc = gl.getUniformLocation(prog.p, 'LK[' + i + '].' + k);
      if (!loc) return;
      var v = PAL[name][k];
      if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
      else gl.uniform3f(loc, v[0], v[1], v[2]);
    });
  });
}

var TRACE_U = ['CAM', 'EYE', 'RES', 'PIX'];
var GU = ['CAM', 'EYEG', 'CLIP', 'T', 'WENV', 'WIND', 'LDIR', 'LCOL', 'AMB', 'TRN', 'GSCALE', 'PIXR'];
var preProg, landProg, maskProg, skyProg, bokehProg, bokeh32Prog, bladeProg, headProg, partProg, compProg;
var progs = [], glReady = false, failed = false;
var PSC = null, SAMPLES = 0;

var SCALE = HDR ? 1.0 : 0.5;
var GSCALE = HDR ? 1.0 : 0.5;
var CFMT = HDR ? gl.RGBA16F : gl.RGBA8;

/* the most samples up to four that the far grass's format can take */
function samplesFor(fmt) {
  var s = null, best = 0;
  try { s = gl.getInternalformatParameter(gl.RENDERBUFFER, fmt, gl.SAMPLES); } catch (err) {}
  for (var i = 0; s && i < s.length; i++) if (s[i] <= 4 && s[i] > best) best = s[i];
  return best;
}

/* everything the context holds, made at the start and again if a lost
   context comes back: the loom first, whose two small programs then link
   while the picture's queue behind them */
function initGL() {
  PSC = gl.getExtension('KHR_parallel_shader_compile');
  loom = null;
  try { if (window.Knit) loom = Knit.pass(gl); } catch (err) { loom = null; }
  knit = !!loom;
  canvas.classList.toggle('woven', knit);
  preProg = program(PRE, TRACE_U);
  landProg = program(LAND, TRACE_U.concat(['PREB', 'REFINE']));
  maskProg = program(MASK, ['LA0', 'LA3', 'FULL']);
  skyProg = program(SKY, ['CAM', 'EYE', 'W', 'SUN', 'CLIT', 'CMID', 'CSHD', 'GLOW', 'CLT', 'SCALE', 'COVER', 'NIGHT', 'DUSK', 'FINE', 'PEAK', 'MASKT']);
  bokehProg = program(bokehSrc(TAPS), ['SRC', 'TEXEL', 'RAD']);
  bokeh32Prog = program(bokehSrc(TAPS32), ['SRC', 'TEXEL', 'RAD']);
  bladeProg = program(BLADE_FS, GU, BLADE_VS);
  headProg = program(HEAD_FS, GU.concat(['A2C']), HEAD_VS);
  partProg = program(PART_FS, GU.concat(['VIS', 'HALFW', 'DRIFT']), PART_VS);
  compProg = program(COMP, ['LA0', 'LA1', 'LA2', 'LA3', 'SKA', 'SKB', 'GFAR', 'GMID', 'GNEAR', 'CAM', 'EYE', 'W', 'MOON', 'GN', 'GC', 'GV', 'T', 'G', 'SCALE', 'GSCALE', 'EXPO', 'MOONR', 'PH', 'STARS', 'CLT', 'MILKY', 'METON', 'METP', 'METS', 'METL', 'MET']);
  progs = [preProg, landProg, maskProg, skyProg, bokehProg, bokeh32Prog, bladeProg, headProg, partProg, compProg];
  glReady = false;
  warmed = 0;
  SAMPLES = samplesFor(CFMT);
}

/* true once every program has linked; a program that failed sends the
   page back to its poster. The loom is waited for as the picture's own
   programs are, so the picture is never seen unknitted; a loom that will
   never link gives the picture back to the canvas as it always was */
function glUp() {
  if (glReady) return true;
  if (failed || !progs.every(linked)) return false;
  if (loom && !loom.ready() && !loom.failed) return false;
  if (!progs.every(finish)) {
    fail();
    return false;
  }
  if (loom && loom.failed) unknit();
  glReady = true;
  return true;
}

function layerTex(filter) {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function storage(t, w, h, fmt) {
  gl.bindTexture(gl.TEXTURE_2D, t);
  if (fmt === gl.RGBA16F) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
}

/* a framebuffer with n colour textures of the given formats, and a depth
   buffer if asked; ok says whether the driver can draw to it */
function target(w, h, fmts, depth, filter) {
  var r = { fbo: gl.createFramebuffer(), w: w, h: h, tex: [], depth: null, ms: null };
  gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo);
  var bufs = [];
  fmts.forEach(function (f, i) {
    var t = layerTex(filter);
    storage(t, w, h, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
    r.tex.push(t);
    bufs.push(gl.COLOR_ATTACHMENT0 + i);
  });
  gl.drawBuffers(bufs);
  if (depth) {
    r.depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, r.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, r.depth);
  }
  r.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return r;
}

/* the far grass is drawn multisampled and resolved into a texture, where
   the format allows it */
function msTarget(w, h) {
  var r = target(w, h, [CFMT], false, gl.NEAREST);
  if (SAMPLES > 1) {
    r.ms = gl.createFramebuffer();
    r.msc = gl.createRenderbuffer();
    r.msd = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, r.msc);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, SAMPLES, CFMT, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, r.msd);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, SAMPLES, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.ms);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, r.msc);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, r.msd);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (ok) return r;
    gl.deleteFramebuffer(r.ms);
    gl.deleteRenderbuffer(r.msc);
    gl.deleteRenderbuffer(r.msd);
    r.ms = null;
    SAMPLES = 0;
  }
  r.depth = gl.createRenderbuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo);
  gl.bindRenderbuffer(gl.RENDERBUFFER, r.depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, r.depth);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return r;
}

function drop(r) {
  if (!r) return;
  r.tex.forEach(function (t) { gl.deleteTexture(t); });
  if (r.depth) gl.deleteRenderbuffer(r.depth);
  if (r.ms) { gl.deleteFramebuffer(r.ms); gl.deleteRenderbuffer(r.msc); gl.deleteRenderbuffer(r.msd); }
  gl.deleteFramebuffer(r.fbo);
}

/* ------------------------------------------------------------ the loom */
/* The meadow is knitted (knit.js). The picture is made as it always was,
   only smaller, and its last pass draws into a target the loom hands
   over instead of onto the canvas; the loom reads it one colour to a
   stitch and draws the fabric over the whole canvas, whose store is then
   the loom's to size, at the screen's own pixels, and is marked woven,
   so that the stylesheet lays that store on its box as it is (a plain
   picture it crops to cover the box). The stitches are the
   page's: the canvas is told where it lies on the page and the tile the
   stylesheet lays its relief with, so its stitches fall where the
   page's do and are those same stitches. Below the picture the cloth
   goes on in the paper's own yarn. Without a loom (knit.js did not
   come, or the context cannot hold one) or with one that never links,
   the picture goes to the canvas exactly as it did before there was
   one.

   How small the picture may be was measured, each stitch's colour from
   one live frame to the next over the grass, its flowers and drifting
   lights, the sky and the stars, in all three looks, on a phone, a
   laptop and a wide screen, against the picture at the size it used to
   have: at six px to a stitch's width, the least the loom asks for, the
   stitches change no more than they did there, so long as the grass
   nearest the eye keeps the size it had (frameTargets); drawn smaller,
   it moves through the stitches in jumps. Only the film grain, new every
   frame, is then shared by fewer px of a stitch, and stirs it by less
   than half a level. */
var PICTURE = 6;
var TILE = [24, 30];
var PAPER = { day: srgb('#f6f3ec'), dusk: srgb('#231e22'), night: srgb('#15181d') };
var loom = null, knit = false, lite = false;
/* the build whose picture the frames are drawing, and its whole frame
   while the canvas has another shape */
var framed = null, held = null;

function unknit() {
  if (loom) loom.free();
  loom = null;
  knit = false;
  canvas.classList.remove('woven');
  dropBuild(pend);
  pend = null;
}

/* the canvas's box on the page, in CSS px */
function place() {
  var r = canvas.getBoundingClientRect();
  return { x: r.left + (window.pageXOffset || 0), y: r.top + (window.pageYOffset || 0), w: r.width, h: r.height };
}

/* the fabric's share of the screen's pixels: the governor's, but never
   so few that a stitch has under six device px, the finest the loom was
   made for. A page the governor has brought to rest draws only when
   something changes, once, and then the fabric is drawn whole again,
   all its pixels and all its light */
function weft() {
  if (slow) return 1;
  var d = Math.min(window.devicePixelRatio || 1, 2);
  return Math.min(1, Math.max(quality, 6 / (Knit.gauge().w * d)));
}

/* a colour of the page's as the page shows it now, a turn of the looks
   included, or null */
function tone(style, name) {
  var s = '';
  try { s = style.getPropertyValue(name).trim(); } catch (err) {}
  var m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (m) return [m[1] / 255, m[2] / 255, m[3] / 255];
  if (/^#[0-9a-f]{6}$/i.test(s)) return srgb(s);
  return null;
}

/* the paper, for the cloth that goes on below the picture */
function paper(style, w) {
  return tone(style, '--paper') || [0, 1, 2].map(function (i) { return PAPER.day[i] * w.d + PAPER.dusk[i] * w.u + PAPER.night[i] * w.n; });
}

/* and the picture ends in a holiday sweater's yoke, in the page's two
   yarns, a snowflake standing under the middle of the name, and the
   band at the very foot of the picture, its ground running on into the
   page's paper */
var YARNS = { a: [0.639, 0.149, 0.173], b: [0.173, 0.353, 0.224] };
function sweater(style, bx) {
  return {
    yarns: [tone(style, '--yarn-a') || YARNS.a, tone(style, '--yarn-b') || YARNS.b],
    mid: bx.x + bx.w / 2
  };
}

/* While a new size is built the picture on screen holds its last frame,
   and the canvas, which follows its box at once, may by then have
   another shape. That frame is then cropped to the new shape about its
   middle, as a picture set to cover would be, and only the crop is
   knitted: the stitches stay the page's and nothing is stretched. Null
   when the picture fits the box it is drawn on */
function cropFor(bx) {
  var b = framed;
  if (!b || !b.box || (Math.abs(bx.w - b.box[0]) < 0.5 && Math.abs(bx.h - b.box[1]) < 0.5)) return null;
  var a = bx.w / bx.h, w = b.w, h = b.h;
  if (w / h > a) w = Math.max(1, Math.min(b.w, Math.round(h * a)));
  else h = Math.max(1, Math.min(b.h, Math.round(w / a)));
  return { x: (b.w - w) >> 1, y: (b.h - h) >> 1, w: w, h: h };
}

/* the whole frame is drawn here while it is cropped, and let go after */
function hold(on) {
  if (on && held && (held.w !== fw || held.h !== fh)) {
    drop(held);
    held = null;
  }
  if (on && !held) held = target(fw, fh, [gl.RGBA8], false, gl.NEAREST);
  if (!on && held) {
    drop(held);
    held = null;
  }
  return held;
}

/* the picture, drawn by now into the loom's target (or, cropped, into
   the held frame), knitted over the canvas; the canvas first takes the
   store the loom wants for its box */
function weave(bx, crop, t, still, w) {
  if (crop) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, held.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, loom.target(crop.w, crop.h));
    gl.blitFramebuffer(crop.x, crop.y, crop.x + crop.w, crop.y + crop.h, 0, 0, crop.w, crop.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  if (!(bx.w > 0 && bx.h > 0)) return;
  var st = Knit.fit(bx.w, bx.h, weft());
  if (canvas.width !== st[0] || canvas.height !== st[1]) {
    canvas.width = st[0];
    canvas.height = st[1];
  }
  var style = null;
  try { style = getComputedStyle(root); } catch (err) {}
  var drawn = loom.draw({
    cssW: bx.w, cssH: bx.h, x: bx.x, y: bx.y, time: t, still: still, lite: lite && !slow,
    look: [w.d, w.u, w.n], tile: TILE, ground: paper(style, w), sides: 'b', fade: Knit.length ? Knit.length('--fade') : 0,
    sweater: sweater(style, bx)
  });
  /* it always can once it is ready; should it not, the picture is
     shown plain rather than not at all */
  if (!drawn) {
    var pw = crop ? crop.w : fw, ph = crop ? crop.h : fh;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, loom.target(pw, ph));
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, pw, ph, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

/* the canvas follows its box at once: when its store no longer fits, the
   picture on screen is knitted again over the new box before the page is
   painted, rather than shown stretched until the next frame */
function refit() {
  if (!glReady || !framed || !landT || !view) return;
  var bx = place();
  if (!(bx.w > 0 && bx.h > 0)) return;
  var st = Knit.fit(bx.w, bx.h, weft());
  if (canvas.width === st[0] && canvas.height === st[1]) return;
  var now = performance.now();
  draw(now);
  last = Math.max(last, now);
}

/* the land of the picture on screen, and the targets every frame draws
   through, all of its size */
var landT = null, maskT = null, skyT = null, farT = null, midT = null, nearT = null, midB = null, nearB = null;

/* ------------------------------------------------------------- random */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var windRnd = mulberry32(99);
var WN = [];
for (var wi = 0; wi < 256; wi++) WN.push(windRnd());

function vnoise(x) {
  var i = Math.floor(x), f = x - i;
  f = f * f * (3 - 2 * f);
  var a = WN[i & 255], b = WN[(i + 1) & 255];
  return a + (b - a) * f;
}

/* a steady breeze: it swells and eases over half a minute or so but
   never gusts up suddenly; the waves that run across the grass are its
   own, in the shader */
function windAt(t) {
  return 0.3 + 0.22 * vnoise(t * 0.03 + 3.7);
}

/* ---------------------------------------------------------- the camera */

/* A wide frame looks down the valley with the massif on the left and
   the horn on the right and the words in the sky between them, from an
   eye lying in the grass. Every other frame is that same picture. A
   frame narrower than three to two sees as wide as one of three to two
   does, its lens widening up into the sky, and the camera tips up just
   enough to hold the horizon at the same height on the screen, so the
   grass is seen at the same slant and the horn stands in the same place
   on the right. Narrower than seven to ten the lens widens no further,
   as looking up any more would bend the clouds out of shape: the frame
   is a crop of that one's, turned toward the horn to keep it in its
   place, and the moon keeps its own up in the corner of the sky. */
var FOVY = 36 * DEG, PITCH = 6 * DEG, YAW0 = 0;
var NEAR_Z = 1.0, MID_Z = 4.0;
var BOXT = [0.5, 0.45, 0.24, 0.09];

function smooth01(a, b, x) {
  var k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

var WIDE = {
  fovy: 36 * DEG,
  pitch: 6 * DEG,
  yaw: 0,
  boxt: [0.5, 0.46, 0.24, 0.07],
  moon: dirAzEl(-20, 18),
  nightSun: dirAzEl(-75, 28)
};
var PEAK_AZ = Math.atan2(HORN[0] + LEAN[0], HORN[1] + LEAN[1]);

function layoutFor(aspect) {
  if (aspect >= 1.5) return WIDE;
  /* the tangents of the half angles: a wide frame's height of view, and
     a three to two frame's width; this frame's height and width */
  var t0 = Math.tan(WIDE.fovy / 2), t1 = t0 * 1.5;
  var th = t1 / Math.max(aspect, 0.7), tw = th * aspect;
  var pitch = Math.atan(Math.tan(WIDE.pitch) / t0 * th);
  var yaw = PEAK_AZ - Math.atan(Math.tan(PEAK_AZ) / t1 * tw);
  /* the moon stands 20 degrees left and 12 up from a wide frame's middle */
  var maz = yaw + Math.atan(Math.tan(-20 * DEG) / t1 * tw), mel = pitch + Math.atan(Math.tan(12 * DEG) / t0 * th);
  return {
    fovy: 2 * Math.atan(th),
    pitch: pitch,
    yaw: yaw,
    /* the words take more of a narrower frame's width */
    boxt: [0.5, 0.46, 0.24 + 0.2 * smooth01(1.15, 0.7, aspect), 0.07],
    moon: dirAzEl(maz / DEG, mel / DEG),
    nightSun: WIDE.nightSun
  };
}

/* a frame is set up for one layout at a time: the one on screen, or for
   a moment the one a new size is being built for */
function useLayout(L) {
  FOVY = L.fovy;
  PITCH = L.pitch;
  YAW0 = L.yaw;
  BOXT = L.boxt;
  MOON = L.moon;
  PAL.night.sun = L.nightSun;
  PAL.day.orb = PAL.day.sun;
  PAL.dusk.orb = PAL.dusk.sun;
  PAL.night.orb = MOON;
}

function camFor(w, h, pitch, yaw) {
  var tanH = Math.tan(FOVY / 2);
  return [tanH * w / h, tanH, pitch, yaw];
}

/* ------------------------------------------------------------ the grass */

var meadow = null;

function buildMeadow(w, h) {
  var rnd = mulberry32(20260930);
  var cam = camFor(w, h, PITCH, YAW0);
  var tanW = cam[0] * 1.12;
  /* the meadow is laid out once in the world, over a wedge wide enough
     for any frame, so every frame sees the same grass; what falls
     outside this one is dropped */
  var blades = [[], [], []], heads = [[], [], []], parts = [[], [], []];
  function band(z) { return z < NEAR_Z ? 0 : z < MID_Z ? 1 : 2; }
  function inView(x, z) {
    var v = view(x, 0, z);
    return v[2] > 0.05 && Math.abs(v[0]) < v[2] * tanW + 0.3;
  }
  function view(x, y, z) {
    var cy = Math.cos(YAW0), sy = Math.sin(YAW0);
    var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    var cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  }
  /* keep the grass out of the words, and the nearest blades low in the
     frame but for the edges: a blade whose tip would stand too high is
     cut down until it clears. The far grass is left alone: its tallest
     stalks stand up across the valley below the words, and a narrow
     frame, whose words take its whole width, would cut them all */
  function clip(x, z, h) {
    if (z >= MID_Z) return h;
    for (var k = 0; k < 10; k++) {
      var v = view(x, h - (EYE[1] - 2300) + 0.03, z);
      if (v[2] <= 0) return h;
      var sx = v[0] / v[2] / cam[0] * 0.5 + 0.5, sy = 0.5 - v[1] / v[2] / cam[1] * 0.5;
      var inX = Math.abs(sx - BOXT[0]) < BOXT[2] + 0.07, inY = sy < BOXT[1] + BOXT[3] + 0.05;
      var edge = Math.abs(sx - 0.5) > 0.38;
      var top = z < NEAR_Z ? (edge ? 0.36 : 0.6) : edge ? 0.3 : 0.5;
      if (!(inX && inY) && sy > top) return h;
      h *= 0.82;
    }
    return h;
  }
  function place(z, u) {
    return [u * (z * TANG + 0.3), z];
  }
  var ZMAX = 13;
  var area = ZMAX * ZMAX * TANG;
  var i, j, z, p, h;
  /* the grass grows in tussocks: a clump of blades fanning out from one
     root, a few of them gone to seed */
  var nc = Math.round(area * 26);
  var near = Math.round(4 * 4 * TANG * 26 * 3.2);
  for (i = 0; i < nc + near; i++) {
    z = i < nc ? 0.12 + (ZMAX - 0.12) * Math.sqrt(rnd()) : 0.12 + 3.88 * Math.sqrt(rnd());
    var thin = z > 9 && rnd() < (z - 9) / 4;
    p = place(z, rnd() * 2 - 1);
    var nb = 4 + Math.floor(rnd() * 9);
    var tall = 0.55 + 0.9 * rnd() * rnd();
    var tint0 = rnd(), dry0 = rnd() < 0.12;
    var keep = !thin && inView(p[0], p[1]);
    for (j = 0; j < nb; j++) {
      var ang = rnd() * Math.PI * 2, rr = 0.05 * Math.sqrt(rnd());
      var x = p[0] + Math.cos(ang) * rr, zz = p[1] + Math.sin(ang) * rr;
      var kind = rnd() < 0.07 ? 1 : 0;
      h = kind === 1 ? 0.26 + 0.3 * rnd() : (0.06 + 0.24 * Math.pow(rnd(), 1.3)) * tall;
      var bl = [x, zz, h, kind === 1 ? 0.0022 : 0.0028 + 0.0035 * rnd(),
        ang + (rnd() - 0.5) * 0.6, 0.12 + 0.34 * rnd(), Math.min(1, Math.max(0, tint0 + (rnd() - 0.5) * 0.3)), rnd(),
        kind, 0.6 + 0.8 * rnd(), 0.4 + 0.8 * rnd(), dry0 ? 0.47 : rnd() * 0.9 - 0.45];
      if (!keep) continue;
      bl[2] = clip(x, zz, h);
      Array.prototype.push.apply(blades[band(z)], bl);
    }
  }
  /* flowers grow in drifts of one kind: buttercups, daisies, clover,
     asters, harebells, gentians, dandelion clocks, now and then an
     edelweiss */
  var KW = [0.24, 0.09, 0.27, 0.05, 0.10, 0.09, 0.12, 0.04];
  var KS = [0.018, 0.015, 0.012, 0.014, 0.012, 0.013, 0.011, 0.02];
  function pick() {
    var r = rnd(), k = 0;
    while (k < 7 && r > KW[k]) { r -= KW[k]; k++; }
    return k;
  }
  var drifts = [];
  for (i = 0; i < 64; i++) drifts.push([2.0 + 16 * Math.pow(rnd(), 1.1), rnd() * 2 - 1, pick()]);
  var nf = Math.round(area * 13);
  for (i = 0; i < nf; i++) {
    var dr = drifts[Math.floor(rnd() * drifts.length)];
    z = Math.max(1.1, dr[0] * (0.7 + 0.6 * rnd()));
    p = place(z, Math.max(-1, Math.min(1, dr[1] + (rnd() - 0.5) * 0.3)));
    var kd = rnd() < 0.8 ? dr[2] : pick();
    if (kd === 7 && z < 3.5) kd = 0;
    var size = KS[kd] * (0.8 + 0.45 * rnd());
    h = 0.1 + 0.26 * rnd();
    var st = [p[0], p[1], h, 0.002, rnd() * Math.PI * 2, 0.05 + 0.15 * rnd(), rnd(), rnd(), 2, 0.5 + 0.6 * rnd(), 0.3, rnd() - 0.5];
    var fl = [kd, size, rnd() * Math.PI * 2, 0.2 + 0.25 * rnd()];
    if (!inView(p[0], p[1])) continue;
    st[2] = clip(p[0], p[1], h);
    var b = band(z);
    Array.prototype.push.apply(blades[b], st);
    Array.prototype.push.apply(heads[b], st.concat(fl));
  }
  /* seeds and pollen in the light by day, fireflies at night, all low
     over the grass */
  for (i = 0; i < 150; i++) {
    var k = i < 34 ? 0 : i < 96 ? 1 : 2;
    z = k === 2 ? 1.6 + 9 * Math.pow(rnd(), 0.9) : (k === 0 ? 2.0 : 0.8) + 11 * Math.pow(rnd(), 1.4);
    var px = (rnd() * 2 - 1) * z * tanW;
    parts[band(z)].push(px, z, k === 2 ? 0.03 + 0.27 * rnd() : 0.08 + 0.42 * rnd(), rnd() * 100,
      k, k === 0 ? 0.012 : k === 1 ? 0.004 : 0.03, k === 2 ? 0 : 0.25 + 0.6 * rnd(), rnd());
  }
  return { blades: blades, heads: heads, parts: parts };
}

function upload(m) {
  if (meadow && meadow.bufs) {
    meadow.bufs.forEach(function (b) { gl.deleteBuffer(b); });
    meadow.vb.concat(meadow.vh, meadow.vp).forEach(function (v) { gl.deleteVertexArray(v); });
  }
  var out = { src: m, bufs: [], vb: [], vh: [], vp: [], nb: [], nh: [], np: [] };
  function vao(data, stride) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.length ? data : [0]), gl.STATIC_DRAW);
    out.bufs.push(buf);
    var v = gl.createVertexArray();
    gl.bindVertexArray(v);
    for (var i = 0; i < stride / 4; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, stride * 4, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    return v;
  }
  for (var b = 0; b < 3; b++) {
    out.vb.push(vao(m.blades[b], 12)); out.nb.push(m.blades[b].length / 12);
    out.vh.push(vao(m.heads[b], 16)); out.nh.push(m.heads[b].length / 16);
    out.vp.push(vao(m.parts[b], 8)); out.np.push(m.parts[b].length / 8);
  }
  return out;
}

/* ----------------------------------------------------- the land build */
/* The land is traced once per size: a pass that finds how far each
   pixel's ray runs, then a pass that shades it for all three looks.
   Both go in strips, each sized to the time the one before it took, so
   the page never stalls on them, and the picture shows when the last
   strip lands; then the horn's own pass follows. A new size is built
   beside the picture on screen, which holds its last frame until the new
   one is ready to take its place. */

var view = null, pend = null;
var PX8 = new Uint8Array(4), PX32 = new Float32Array(4);

function makeBuild(sz) {
  var w = sz[0], h = sz[1];
  var b = {
    w: w, h: h, lay: layoutFor(w / h), phase: 0, y: 0, y1: h, x0: 0, x1: w, rows: 8, cost: 0,
    prof: new Float32Array(h), k: [0, 4, 16], done: 0, sum: 1, gw: sz[2] || w, gh: sz[3] || h
  };
  /* knitted, the box it is made for, which the canvas may leave */
  if (knit) {
    var bx = place();
    b.box = [bx.w, bx.h];
  }
  /* its grass is grown now, while the GPU has the build, so the frame
     that takes the build to the screen has less to do */
  useLayout(b.lay);
  b.grass = buildMeadow(w, h);
  if (view) useLayout(view.lay);
  b.pre = target(w, h, [gl.RGBA8], false, gl.NEAREST);
  b.land = target(w, h, [CFMT, CFMT, CFMT, CFMT], false, gl.NEAREST);
  b.mask = target(Math.max(1, Math.round(w * 0.5)), Math.max(1, Math.round(h * 0.5)), [gl.RGBA8], false, gl.NEAREST);
  if (!b.pre.ok || !b.land.ok || !b.mask.ok) {
    dropBuild(b);
    fail();
    return null;
  }
  return b;
}

function dropBuild(b) {
  if (!b) return;
  drop(b.pre);
  drop(b.land);
  drop(b.mask);
  b.pre = b.land = b.mask = null;
}

function stripPass(tgt, x0, x1, y0, rows) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fbo);
  gl.viewport(0, 0, tgt.w, tgt.h);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(x0, y0, x1 - x0, rows);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.SCISSOR_TEST);
}

function useTrace(prog, cam, w, h) {
  gl.useProgram(prog.p);
  gl.uniform4f(prog.u.CAM, cam[0], cam[1], cam[2], cam[3]);
  gl.uniform3f(prog.u.EYE, EYE[0], EYE[1], EYE[2]);
  gl.uniform2f(prog.u.RES, w, h);
  gl.uniform1f(prog.u.PIX, 2 * cam[1] / h);
}

/* wait for the GPU to finish, so that a strip's time is its own and the
   next can be sized by it; a float target is read back as floats */
function settle(fbo, flt) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  if (flt) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, PX32);
  else gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX8);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/* the trace pass learns what each row costs, its strips growing to the
   frame's budget; the shading passes cost some multiple of that, learned
   as they go, so their strips are planned row by row and the costly
   rows across the mountains never land all at once. The horn's pass
   shares its frames with the moving picture, so it takes a smaller
   budget, and waits for the frame before to finish before timing its
   own strip */
function buildStep(b) {
  useLayout(b.lay);
  var cam = camFor(b.w, b.h, PITCH, YAW0);
  var shade = b.phase > 0;
  var budget = b === view ? 6 : 14;
  var rows = shade ? plan(b, budget) : Math.min(b.rows, b.y1 - b.y);
  var tgt = shade ? b.land : b.pre;
  if (shade) {
    setLooks(landProg);
    useTrace(landProg, cam, b.w, b.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, b.pre.tex[0]);
    gl.uniform1i(landProg.u.PREB, 0);
    gl.uniform1f(landProg.u.REFINE, b.phase > 1 ? 1 : 0);
  } else useTrace(preProg, cam, b.w, b.h);
  var flt = shade && CFMT === gl.RGBA16F;
  if (b === view) settle(tgt.fbo, flt);
  var t0 = performance.now();
  stripPass(tgt, b.x0, b.x1, b.y, rows);
  settle(tgt.fbo, flt);
  var ms = performance.now() - t0, i;
  if (shade) {
    var pred = 0;
    for (i = 0; i < rows; i++) pred += Math.max(b.prof[b.y + i], 0.002);
    var k = b.k[b.phase];
    b.k[b.phase] = Math.min(k * 2, Math.max(k * 0.5, 0.5 * k + 0.5 * ms / pred));
    b.done += pred;
  } else {
    b.cost += Math.min(ms, 4 * budget);
    for (i = 0; i < rows; i++) b.prof[b.y + i] = ms / rows;
    b.rows = Math.max(4, Math.min(Math.round(budget * rows / Math.max(ms, 0.5)), Math.round(b.rows * 1.5)));
  }
  b.y += rows;
  if (b !== view) progress(shade ? 0.6 + 0.38 * b.done / b.sum : 0.36 + 0.24 * b.y / b.y1);
  if (b.y >= b.y1) {
    if (b.phase === 0) for (b.sum = 0, i = 0; i < b.h; i++) b.sum += Math.max(b.prof[i], 0.002);
    if (b.phase === 1) maskPass(b);
    b.phase++;
    b.y = 0;
    if (b.phase === 2) {
      if (quality < 1 || slow) b.phase = 3;
      else hornBox(b, cam);
    }
  }
  if (b.phase > 2 && b.pre) {
    drop(b.pre);
    b.pre = null;
  }
  if (view && view !== b) useLayout(view.lay);
}

function plan(b, budget) {
  var k = b.k[b.phase], acc = 0, n = 0;
  while (b.y + n < b.y1) {
    var c = Math.max(b.prof[b.y + n], 0.002) * k;
    if (n > 0 && acc + c > budget) break;
    acc += c;
    n++;
  }
  return n;
}

/* the horn's pass covers only the part of the frame the horn can take */
function hornBox(b, cam) {
  var x0 = b.w, x1 = 0, y0 = b.h, y1 = 0;
  for (var i = 0; i < 8; i++) {
    var s = toScreen([HORN[0] + (i & 1 ? 2600 : -2600), i & 2 ? 4700 : 2900, HORN[1] + (i & 4 ? 2600 : -2600)], cam);
    if (!s) continue;
    x0 = Math.min(x0, s[0] * b.w);
    x1 = Math.max(x1, s[0] * b.w);
    y0 = Math.min(y0, s[1] * b.h);
    y1 = Math.max(y1, s[1] * b.h);
  }
  b.x0 = Math.max(0, Math.floor(x0));
  b.x1 = Math.min(b.w, Math.ceil(x1));
  b.y = Math.max(0, Math.floor(y0));
  b.y1 = Math.min(b.h, Math.ceil(y1));
  if (b.x1 <= b.x0 || b.y1 <= b.y) b.phase = 3;
}

/* where a point of the world falls in the frame, as the shaders' own
   projection puts it, 0 to 1 from the bottom left */
function toScreen(p, cam) {
  var x = p[0] - EYE[0], y = p[1] - EYE[1], z = p[2] - EYE[2];
  var cy = Math.cos(cam[3]), sy = Math.sin(cam[3]);
  var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
  var cp = Math.cos(cam[2]), sp = Math.sin(cam[2]);
  var y0 = y * cp - z1 * sp, z0 = y * sp + z1 * cp;
  if (z0 < 1) return null;
  return [x1 / z0 / cam[0] * 0.5 + 0.5, y0 / z0 / cam[1] * 0.5 + 0.5];
}

/* where the sky can be seen at all, at the sky pass's resolution, once
   the land is built */
function maskPass(b) {
  gl.useProgram(maskProg.p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, b.land.tex[0]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, b.land.tex[3]);
  gl.uniform1i(maskProg.u.LA0, 0);
  gl.uniform1i(maskProg.u.LA3, 1);
  gl.uniform2i(maskProg.u.FULL, b.w, b.h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, b.mask.fbo);
  gl.viewport(0, 0, b.mask.w, b.mask.h);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
}

/* ----------------------------------------------------------- the events */

var meteor = { on: false, a: [0, 0], d: [0, 0], t0: 0, life: 0.7, speed: 0.3, next: 8, again: 0 };
var evRnd = mulberry32(31);

/* now and then, at night, a meteor */
function stepEvents(t, w) {
  if (!meteor.on && w.n > 0.5 && t > meteor.next) {
    var ang = (200 + 140 * evRnd()) * Math.PI / 180;
    meteor.a = [(evRnd() - 0.5) * 0.6, 0.18 + evRnd() * 0.2];
    meteor.d = [Math.cos(ang), Math.sin(ang)];
    meteor.speed = 0.25 + 0.2 * evRnd();
    meteor.life = 0.5 + 0.4 * evRnd();
    meteor.t0 = t;
    meteor.on = true;
    meteor.again = evRnd() < 0.25 ? t + 1 + 2 * evRnd() : 0;
  }
  if (meteor.on && t - meteor.t0 > meteor.life) {
    meteor.on = false;
    meteor.next = meteor.again > t ? meteor.again : t + 14 + 30 * evRnd();
    meteor.again = 0;
  }
}

/* ---------------------------------------------------------------- moon */

function phase(date) {
  var d = (date - Date.UTC(2000, 0, 6, 18, 14)) / 86400000 / 29.530588853;
  return d - Math.floor(d);
}

var P = phase(new Date());

/* --------------------------------------------------------------- looks */

function blend(key, w) {
  var a = PAL.day[key], b = PAL.dusk[key], c = PAL.night[key];
  if (typeof a === 'number') return a * w.d + b * w.u + c * w.n;
  return a.map(function (_, i) { return a[i] * w.d + b[i] * w.u + c[i] * w.n; });
}

function sunDir(w, key) {
  key = key || 'sun';
  return norm3([0, 1, 2].map(function (i) { return PAL.day[key][i] * w.d + PAL.dusk[key][i] * w.u + PAL.night[key][i] * w.n; }));
}

/* --------------------------------------------------------------- state */

var raf = 0, last = 0, frameNo = 0;
var visible = !document.hidden, inView = true;
var cloudT = 120;
/* how far the breeze has carried the seeds, summed frame by frame so a
   change in its strength never jolts them */
var drift = 0;

function u3(loc, v) { gl.uniform3f(loc, v[0], v[1], v[2]); }

function bokeh(prog, src, w, h, dst, rad) {
  gl.useProgram(prog.p);
  gl.uniform1i(prog.u.SRC, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
  gl.viewport(0, 0, dst.w, dst.h);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, src);
  gl.uniform2f(prog.u.TEXEL, 1 / w, 1 / h);
  gl.uniform1f(prog.u.RAD, rad);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

var RN = 12, RM = 3;

function grassUniforms(prog, cam, eyeg, t, env, w, pixr) {
  var u = prog.u;
  gl.useProgram(prog.p);
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  u3(u.EYEG, eyeg);
  gl.uniform2f(u.CLIP, 0.03, 400);
  gl.uniform1f(u.T, t);
  gl.uniform1f(u.WENV, env);
  gl.uniform2f(u.WIND, 0.94, -0.33);
  var sun = sunDir(w);
  u3(u.LDIR, sun);
  var sc = blend('sunc', w), gs = blend('gsun', w);
  u3(u.LCOL, sc.map(function (v) { return v * gs; }));
  u3(u.AMB, blend('gamb', w));
  u3(u.TRN, blend('gtrn', w));
  gl.uniform1f(u.GSCALE, GSCALE);
  gl.uniform1f(u.PIXR, pixr);
}

function drawBand(b, tgt, cam, eyeg, t, env, w, pixr, vis, msaa) {
  var fbo = msaa && tgt.ms ? tgt.ms : tgt.fbo;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, tgt.w, tgt.h);
  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (meadow.nb[b]) {
    grassUniforms(bladeProg, cam, eyeg, t, env, w, pixr);
    gl.bindVertexArray(meadow.vb[b]);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (SEG + 1), meadow.nb[b]);
  }
  if (meadow.nh[b]) {
    grassUniforms(headProg, cam, eyeg, t, env, w, pixr);
    var a2c = msaa && tgt.ms;
    gl.uniform1f(headProg.u.A2C, a2c ? 1 : 0);
    if (a2c) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.bindVertexArray(meadow.vh[b]);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, meadow.nh[b]);
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  }
  if (meadow.np[b]) {
    grassUniforms(partProg, cam, eyeg, t, env, w, pixr);
    gl.uniform3f(partProg.u.VIS, vis[0], vis[1], vis[2]);
    gl.uniform1f(partProg.u.HALFW, cam[0] * 1.1);
    gl.uniform1f(partProg.u.DRIFT, drift);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(meadow.vp[b]);
    gl.drawArraysInstanced(gl.POINTS, 0, 1, meadow.np[b]);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }
  gl.bindVertexArray(null);
  gl.disable(gl.DEPTH_TEST);
  if (msaa && tgt.ms) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, tgt.ms);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, tgt.fbo);
    gl.blitFramebuffer(0, 0, tgt.w, tgt.h, 0, 0, tgt.w, tgt.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }
}

/* the look on its way from one to the next, eased as the page's colours
   are */
function turn(now) {
  if (!tr) return;
  var k = Math.min(1, (now - tr.t0) / tr.dur);
  k = k * k * (3 - 2 * k);
  var to = LOOKS[look];
  wCur = { d: wFrom.d + (to.d - wFrom.d) * k, u: wFrom.u + (to.u - wFrom.u) * k, n: wFrom.n + (to.n - wFrom.n) * k };
  themeColor(wCur);
  if (k >= 1) tr = null;
}

function draw(now) {
  turn(now);
  var still = reduced.matches || slow;
  var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  var t = still ? 1000 : now / 1000;
  var w = wCur;
  var wind = 1 - 0.8 * w.n;
  var env = still ? 0.4 : windAt(t) * wind;
  if (!still) cloudT += dt * (1 - w.n);
  if (!still) drift += dt * (0.6 + 0.8 * env);
  if (!still) stepEvents(t, w);
  /* knitted, the picture has a size of its own, the frame targets' */
  var W2 = knit ? fw : canvas.width, H2 = knit ? fh : canvas.height;
  var cam = camFor(W2, H2, PITCH, YAW0);
  var sun = sunDir(w);

  /* the head rises and falls with the breath: the grass shifts against
     the far land, which stays put */
  var breath = still ? 0 : 0.0025 * Math.sin(t * 1.3);
  var eyeg = [EYE[0], EYE[1] + breath, EYE[2]];

  gl.bindFramebuffer(gl.FRAMEBUFFER, skyT.fbo);
  gl.viewport(0, 0, skyT.w, skyT.h);
  gl.useProgram(skyProg.p);
  var u = skyProg.u;
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  u3(u.EYE, EYE);
  gl.uniform3f(u.W, w.d, w.u, w.n);
  u3(u.SUN, sunDir(w, 'orb'));
  u3(u.CLIT, blend('clit', w));
  u3(u.CMID, blend('cmid', w));
  u3(u.CSHD, blend('cshd', w));
  u3(u.GLOW, blend('glowc', w));
  gl.uniform1f(u.CLT, cloudT);
  gl.uniform1f(u.SCALE, SCALE);
  gl.uniform1f(u.COVER, blend('cover', w));
  gl.uniform1f(u.NIGHT, w.n);
  gl.uniform1f(u.DUSK, w.u);
  gl.uniform1f(u.FINE, 1.6);
  /* the summit, which the decks part about */
  var hd = Math.hypot(HORN[0] + LEAN[0] - EYE[0], HORN[1] + LEAN[1] - EYE[2]);
  gl.uniform2f(u.PEAK, Math.atan2(HORN[0] + LEAN[0], HORN[1] + LEAN[1]), (HORN_H - EYE[1]) / hd);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, maskT.tex[0]);
  gl.uniform1i(u.MASKT, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  var pixr = 2 * cam[1] / H2;
  /* the middle and nearest grass keep the px of the picture unknitted */
  var gpixr = knit ? 2 * cam[1] / fgh : pixr;
  var vis = [w.d + 0.5 * w.u, w.d + 0.6 * w.u, w.n];
  drawBand(2, farT, cam, eyeg, t, env, w, pixr, vis, true);
  drawBand(1, midT, cam, eyeg, t, env, w, gpixr, vis, false);
  drawBand(0, nearT, cam, eyeg, t, env, w, gpixr, vis, false);

  bokeh(bokeh32Prog, midT.tex[0], midT.w, midT.h, midB, RM);
  bokeh(bokehProg, nearT.tex[0], nearT.w, nearT.h, nearB, RN);

  var bx = null, crop = null, into = null;
  if (knit) {
    bx = place();
    crop = cropFor(bx);
    into = hold(!!crop) ? held.fbo : loom.target(W2, H2);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, into);
  gl.viewport(0, 0, W2, H2);
  gl.useProgram(compProg.p);
  u = compProg.u;
  var texs = [landT.tex[0], landT.tex[1], landT.tex[2], landT.tex[3], skyT.tex[0], skyT.tex[1], farT.tex[0], midB.tex[0], nearB.tex[0]];
  var names = ['LA0', 'LA1', 'LA2', 'LA3', 'SKA', 'SKB', 'GFAR', 'GMID', 'GNEAR'];
  texs.forEach(function (tx2, i) {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, tx2);
    gl.uniform1i(u[names[i]], i);
  });
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  u3(u.EYE, EYE);
  gl.uniform3f(u.W, w.d, w.u, w.n);
  u3(u.MOON, MOON);
  u3(u.GN, GAL_N);
  u3(u.GC, GAL_C);
  u3(u.GV, GAL_V);
  gl.uniform1f(u.T, t);
  gl.uniform1f(u.G, still ? 0.37 : (frameNo++ % 977) * 0.013);
  gl.uniform1f(u.SCALE, SCALE);
  gl.uniform1f(u.GSCALE, GSCALE);
  gl.uniform1f(u.EXPO, blend('expo', w));
  gl.uniform1f(u.MOONR, MOON_R);
  gl.uniform1f(u.PH, P);
  gl.uniform1f(u.STARS, 1);
  gl.uniform1f(u.CLT, cloudT);
  gl.uniform1f(u.MILKY, 0.05);
  var mp = meteor.on ? Math.min(1, (t - meteor.t0) / meteor.life) : 0;
  gl.uniform1f(u.METON, meteor.on ? 1 : 0);
  gl.uniform1f(u.METP, mp);
  gl.uniform1f(u.METS, meteor.speed);
  gl.uniform1f(u.METL, meteor.life);
  gl.uniform4f(u.MET, meteor.a[0], meteor.a[1], meteor.d[0], meteor.d[1]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (knit) weave(bx, crop, t, still, w);
}

/* ------------------------------------------------------------ the loop */
/* Each frame: a strip of the build in progress, a strip of the horn's
   pass once the picture is up, and the picture itself, every frame while
   something moves and at a gentler pace otherwise. A still picture, for
   reduced motion or a GPU that cannot keep up, is drawn only when it
   changes. */

var slow = false, lost = false, losses = 0, lostTimer = 0;
var MINQ = 0.45, quality = 1, calibrated = false, probing = true, retunes = 0, times = [];
var warmed = 0;
var LIM = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));

/* while the hero shows another place (places.js), the meadow sleeps:
   no frames, no builds, and a resize waits until it is back */
var away = false, staleSize = false;

function animating() {
  return !!view && visible && inView && !reduced.matches && !slow && !away;
}

function frame(now) {
  raf = 0;
  if (lost || failed || away) return;
  if (!glUp()) {
    progress(0.06 + 0.2 * (1 - Math.exp((began - now) / 900)));
    if (!failed) raf = requestAnimationFrame(frame);
    return;
  }
  if (!view && !pend) rebuild();
  /* while a new size is built the picture on screen holds its last frame,
     cropped to fit, and the build has the GPU to itself */
  if (pend && warmed < 2) warm(pend, now);
  else if (pend) {
    buildStep(pend);
    calibrate();
    if (pend && pend.phase > 1) {
      var b = pend;
      pend = null;
      show(b, now);
    } else turn(now);
  } else {
    if (view && view.phase === 2) {
      buildStep(view);
      if (view.phase > 2 && !animating()) draw(now);
    }
    if (view && animating() && now > last) {
      var busy = tr || meteor.on;
      if (now - last >= (busy ? 0 : 30)) {
        if (probing) timed(now);
        else draw(now);
        last = now;
      }
    }
  }
  if (pend || (view && view.phase === 2) || animating()) raf = requestAnimationFrame(frame);
}

/* Before the first build traces anything, every program is put to use
   once, on targets like those it will draw into, the trace's in one frame
   and the picture's in the next: a driver may finish a program for the
   GPU only on its first use, which in Chrome from a cold start stalls for
   half a second, better spent while the page waits than as the picture
   fades in */
function warm(b, now) {
  useLayout(b.lay);
  if (!warmed) {
    var cam = camFor(b.w, b.h, PITCH, YAW0);
    useTrace(preProg, cam, b.w, b.h);
    stripPass(b.pre, 0, 1, 0, 1);
    setLooks(landProg);
    useTrace(landProg, cam, b.w, b.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, b.pre.tex[0]);
    gl.uniform1i(landProg.u.PREB, 0);
    gl.uniform1f(landProg.u.REFINE, 0);
    stripPass(b.land, 0, 1, 0, 1);
    gl.uniform1f(landProg.u.REFINE, 1);
    stripPass(b.land, 0, 1, 0, 1);
    settle(b.land.fbo, CFMT === gl.RGBA16F);
    maskPass(b);
    settle(b.mask.fbo, false);
    warmed = 1;
    progress(0.28);
    return;
  }
  /* knitted, the canvas is sized by the frame itself, and the loom's
     programs are put to use with the rest */
  if (!knit) {
    canvas.width = b.w;
    canvas.height = b.h;
  }
  frameTargets(b.w, b.h, b.gw, b.gh);
  framed = b;
  landT = b.land;
  maskT = b.mask;
  setLooks(skyProg);
  setLooks(compProg);
  meadow = upload(b.grass);
  draw(now);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX8);
  warmed = 2;
  progress(0.36);
}

/* the first build learns how quick the GPU is from its first pass, which
   costs about a dozen frames of the picture, and a GPU far too slow for
   the canvas gets a smaller one before the costly shading starts; the
   timing of the first frames settles the rest. A strip held up by
   something else, a driver still finishing a program, counts for no more
   than four frames' budget, so a quick GPU is not taken for a slow one */
function calibrate() {
  if (calibrated || !pend || pend.phase !== 1 || pend.y !== 0) return;
  calibrated = true;
  var est = pend.cost / 12;
  if (est > 40 && quality > MINQ) {
    quality = Math.max(MINQ, quality * Math.sqrt(16 / est));
    rebuild();
  }
}

/* the picture's first dozen frames are timed to the GPU's finish; if
   they run long the canvas shrinks, and once it is as small as it goes
   the picture holds still. Only a GPU that needed no shrinking makes the
   horn's pass */
function timed(now) {
  var t0 = performance.now();
  draw(now);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX8);
  times.push(performance.now() - t0);
  if (times.length < 12) return;
  times.sort(function (a, b) { return a - b; });
  var med = times[6];
  times = [];
  probing = false;
  if (med < 28) return;
  /* knitted, the fabric gives up first what it can best spare, the
     depth of its stitches under the eye and its finest light, which
     costs it a third; then the shrinking takes the fabric's pixels down
     with the picture's */
  if (knit && !lite) {
    lite = true;
    probing = true;
    return;
  }
  if (quality > MINQ + 0.01 && retunes < 2) {
    retunes++;
    quality = Math.max(MINQ, quality * Math.sqrt(16 / med));
    probing = true;
    rebuild();
    return;
  }
  slow = true;
  if (view.phase === 2) {
    view.phase = 3;
    drop(view.pre);
    view.pre = null;
  }
  if (tr) {
    tr = null;
    wCur = { d: LOOKS[look].d, u: LOOKS[look].u, n: LOOKS[look].n };
    themeColor(wCur);
  }
  draw(now);
}

/* a finished build takes the screen: the canvas takes its size, the
   targets every frame draws through and the grass are made for it, and
   it fades in over what was there, the picture the page opened with or
   the last frame of the size before */
var under = null, veil = 0, fw = 0, fh = 0, fgw = 0, fgh = 0;

function show(b, now) {
  var swap = !!view && canvas.classList.contains('drawn');
  if (view) {
    if (swap) {
      draw(now);
      keep();
    }
    dropBuild(view);
  }
  if (!knit && (canvas.width !== b.w || canvas.height !== b.h)) {
    canvas.width = b.w;
    canvas.height = b.h;
  }
  useLayout(b.lay);
  frameTargets(b.w, b.h, b.gw, b.gh);
  framed = b;
  landT = b.land;
  maskT = b.mask;
  setLooks(skyProg);
  setLooks(compProg);
  if (!meadow || meadow.src !== b.grass) meadow = upload(b.grass);
  view = b;
  draw(now);
  last = now;
  reveal(swap);
}

function frameTargets(cw, ch, gw, gh) {
  if (skyT && fw === cw && fh === ch && fgw === gw && fgh === gh) return;
  fw = cw;
  fh = ch;
  fgw = gw;
  fgh = gh;
  [skyT, farT, midT, nearT, midB, nearB].forEach(drop);
  var hw = Math.max(1, Math.round(cw * 0.5)), hh = Math.max(1, Math.round(ch * 0.5));
  /* the middle and nearest grass are drawn small, at half and a quarter
     of the picture on a wide canvas, and softened; a narrow canvas draws
     them larger, so their blades keep their shape under the blur. They
     are sized from the picture the canvas would have unknitted (gw by
     gh): the knitted picture is smaller, and grass drawn smaller than it
     was moves through the stitches in jumps */
  var ms = Math.min(1, Math.max(0.5, 1000 / gw)), ns = Math.min(0.5, Math.max(0.25, 500 / gw));
  var mw = Math.max(1, Math.round(gw * ms)), mh = Math.max(1, Math.round(gh * ms));
  var nw = Math.max(1, Math.round(gw * ns)), nh = Math.max(1, Math.round(gh * ns));
  skyT = target(hw, hh, [CFMT, CFMT], false);
  farT = msTarget(cw, ch);
  midT = target(mw, mh, [CFMT], true);
  nearT = target(nw, nh, [CFMT], true);
  midB = target(mw, mh, [CFMT], false);
  nearB = target(nw, nh, [CFMT], false);
  /* the softness is sized to the frame: the nearest grass is a wash,
     the middle grass soft strokes, on every frame alike */
  RN = 0.04 * gh * ns;
  RM = 0.0055 * gh * ms;
}

/* the last frame of the old size, kept on a plain canvas under the new
   one while it fades in */
function keep() {
  if (!under) {
    under = document.createElement('canvas');
    under.className = 'under';
    under.setAttribute('aria-hidden', 'true');
    canvas.parentNode.insertBefore(under, canvas);
  }
  under.width = canvas.width;
  under.height = canvas.height;
  under.classList.toggle('woven', canvas.classList.contains('woven'));
  var c = under.getContext('2d');
  if (c) c.drawImage(canvas, 0, 0);
  under.classList.add('on');
}

function reveal(swap) {
  clearTimeout(veil);
  if (swap) {
    canvas.classList.add('swap');
    canvas.style.transition = 'none';
    canvas.classList.remove('drawn');
    void canvas.offsetWidth;
    canvas.style.transition = '';
    veil = setTimeout(function () {
      canvas.classList.remove('swap');
      if (!under) return;
      under.classList.remove('on');
      under.width = under.height = 1;
    }, 800);
  }
  canvas.classList.add('drawn');
  root.classList.remove('still');
  root.classList.add('live');
  ready();
}

/* something the picture needs is missing: the page keeps its poster */
function fail() {
  failed = true;
  dropBuild(pend);
  pend = null;
  canvas.classList.remove('drawn');
  poster();
}

/* the page keeps the still of its look, faded in once it is ready; the
   head of the page has fetched it already where it matches the live
   picture's first frame */
function poster() {
  root.classList.add('still');
  ready();
  if (root.classList.contains('pic')) return;
  var m = /url\(\s*['"]?([^'")]+)/.exec(getComputedStyle(root).getPropertyValue('--poster'));
  if (!m) return;
  var img = new Image(), on = function () { root.classList.add('pic'); };
  img.src = m[1];
  if (img.decode) img.decode().then(on, on);
  else img.onload = on;
}

function wake() {
  if (lost || failed || raf || away) return;
  if (!glReady || pend || (view && view.phase === 2) || animating()) raf = requestAnimationFrame(frame);
  else if (view && visible) draw(performance.now());
}

function sleep() {
  if (raf && glReady && !pend && !(view && view.phase === 2)) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

/* the screen's pixels up to one and a half per point, and no more than
   about two and a half million in all, so a wide screen is drawn as
   finely as a laptop's; a slow GPU draws fewer. This is the picture's
   size; knitted, the canvas's own store is the loom's */
function canvasSize() {
  var w = hero.clientWidth, h = hero.clientHeight;
  if (!w || !h) return null;
  var scale = Math.min(window.devicePixelRatio || 1, 1.5);
  if (w * h * scale * scale > 2.6e6) scale = Math.sqrt(2.6e6 / (w * h));
  var full = Math.min(scale * quality, LIM / w, LIM / h);
  var sz = [Math.max(1, Math.round(w * full)), Math.max(1, Math.round(h * full))];
  if (!knit) return sz;
  /* knitted, the picture needs only so many px to a stitch; the grass
     nearest the eye keeps the size it always had (frameTargets) */
  var pic = Math.min(Math.min(scale, PICTURE / Knit.gauge().w) * quality, LIM / w, LIM / h);
  return [Math.max(1, Math.round(w * pic)), Math.max(1, Math.round(h * pic)), sz[0], sz[1]];
}

/* whether a build is of that size, its grass's included */
function sized(b, sz) {
  return b.w === sz[0] && b.h === sz[1] && b.gw === (sz[2] || sz[0]) && b.gh === (sz[3] || sz[1]);
}

/* a window being dragged rebuilds once it settles, the picture on screen
   cropped to fit until the new one takes its place */
var pending = 0;

function resize() {
  if (lost || failed) return;
  if (away) {
    staleSize = true;
    return;
  }
  if (knit) refit();
  var sz = canvasSize();
  if (!sz || (pend && sized(pend, sz))) return;
  clearTimeout(pending);
  pending = 0;
  if (view && sized(view, sz)) {
    dropBuild(pend);
    pend = null;
    return;
  }
  if (view) pending = setTimeout(function () { pending = 0; rebuild(); }, 200);
  else rebuild();
}

function rebuild() {
  var sz = canvasSize();
  if (!sz || lost || failed) return;
  dropBuild(pend);
  pend = makeBuild(sz);
  wake();
}

/* a window moved to a screen of another density is built again for it */
function watchDensity() {
  try {
    matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)').addEventListener('change', function () {
      watchDensity();
      resize();
    }, { once: true });
  } catch (err) {}
}

/* -------------------------------------------------------------- wiring */

var fallback = 0;
document.addEventListener('place', function (ev) {
  clearTimeout(fallback);
  var a = ev.detail !== 'meadow';
  if (!a) themeColor(wCur);
  if (a === away) return;
  away = a;
  if (bar) bar.style.visibility = away ? 'hidden' : '';
  if (away) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    return;
  }
  begin();
  if (!view) startBar();
  if (staleSize) {
    staleSize = false;
    resize();
  }
  wake();
});
/* a page opened on another place (?scene=) leaves the meadow asleep,
   not even its programs made, until it is turned to; should places.js
   never come to show that place, the meadow after all */
if ((root.getAttribute('data-place') || 'meadow') !== 'meadow') {
  away = true;
  fallback = setTimeout(function () {
    var box = document.querySelector('.places');
    if (box && !box.hidden) return;
    root.setAttribute('data-place', 'meadow');
    root.classList.remove('afar');
    document.dispatchEvent(new CustomEvent('place', { detail: 'meadow' }));
  }, 4000);
}

document.addEventListener('visibilitychange', function () {
  visible = !document.hidden;
  if (visible) wake(); else sleep();
});

if ('IntersectionObserver' in window && window.IntersectionObserver) {
  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    if (inView) wake(); else sleep();
  }, { threshold: 0.01 }).observe(hero);
}

if ('ResizeObserver' in window && window.ResizeObserver) new ResizeObserver(resize).observe(hero);
else addEventListener('resize', resize);

reduced.addEventListener('change', function () { sleep(); wake(); });

/* a lost context gives the picture back to the poster; it is built again
   when the context returns, and the poster stays if the context is slow
   to return or is lost a third time */
canvas.addEventListener('webglcontextlost', function (ev) {
  ev.preventDefault();
  lost = true;
  losses++;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  clearTimeout(pending);
  view = pend = null;
  landT = maskT = skyT = farT = midT = nearT = midB = nearB = null;
  meadow = null;
  glReady = false;
  /* the loom went with the context; another is asked for on the one
     that comes back */
  if (loom) loom.free();
  loom = null;
  framed = held = null;
  canvas.classList.remove('drawn');
  if (under) under.classList.remove('on');
  clearTimeout(lostTimer);
  lostTimer = setTimeout(poster, losses > 2 ? 0 : 2500);
});

canvas.addEventListener('webglcontextrestored', function () {
  if (losses > 2 || failed) return;
  clearTimeout(lostTimer);
  lost = false;
  if (!!gl.getExtension('EXT_color_buffer_float') !== HDR) {
    fail();
    return;
  }
  initGL();
  wake();
});

/* the programs are made once, when the meadow is first to be drawn */
var begun = false;
function begin() {
  if (begun) return;
  begun = true;
  initGL();
}

if (!away) begin();
watchDensity();
resize();
wake();

});
