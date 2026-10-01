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
   slopes, and now and then a jet crossing the high sky, its contrail
   widening and dissolving behind it; at night the moon at tonight's
   real phase, stars and the Milky Way rising out of the gap, and a
   meteor now and then. In front, the meadow itself: tussocks of grass,
   seed stalks and flowers in drifts, grown on the ground function and
   bent at every vertex by a steady breeze whose waves run across them,
   drawn in three planes of focus so the nearest blades blur to soft
   streaks. Seeds and pollen drift in the light by day and fireflies
   glow in the grass at night, and a hand drawn through the grass
   presses it aside along its path, the blades springing back once it
   has passed. A phone sits up a little and turns toward the horn so it
   stands whole above the words. WebGL2, no libraries, no build step. */

'use strict';

(function () {

var hero = document.querySelector('.letterhead');
var canvas = document.getElementById('sky');
var buttons = Array.prototype.slice.call(document.querySelectorAll('.looks button'));
if (!hero || !canvas) return;

var gl = canvas.getContext('webgl2', {
  alpha: false, antialias: false, depth: false, stencil: false,
  powerPreference: 'low-power'
});
if (!gl) return;

var HDR = !!gl.getExtension('EXT_color_buffer_float');
var reduced = matchMedia('(prefers-reduced-motion: reduce)');
var SAMPLES = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);
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

var LOOKS = { day: { d: 1, u: 0, n: 0 }, dusk: { d: 0, u: 1, n: 0 }, night: { d: 0, u: 0, n: 1 } };
var FLAT = { day: '#7d9fcb', dusk: '#4f5a8a', night: '#121a2e' };
var THEME = { day: srgb('#4d7bbd'), dusk: srgb('#33457f'), night: srgb('#0b1124') };

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
  float gap = exp(-pow((az + 0.035) / 0.24, 2.0));
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

float traceFar(vec3 ro, vec3 rd) {
  float t = 700.0, lt = 700.0;
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
  return t > 0.0 ? t : traceFar(ro, rd);
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
   against a far one) take four rays, so the skylines come out clean */
var LAND = HEAD + NOISE + MEADOW + TERRAIN + LOOK + PACK + TRACE + `
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
layout(location = 3) out vec4 o3;
uniform sampler2D PREB;

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
vec3 rockAlbedo(vec3 p, vec3 n, out float snow) {
  float y = p.y;
  float n1 = vn(p.xz / 47.0), n2 = vn(p.xz / 233.0 + 7.0), n3 = vn(p.xz / 11.0 + 3.0);
  vec2 fall = normalize(n.xz + 1e-5);
  vec2 sq = vec2(dot(p.xz, vec2(-fall.y, fall.x)) / 9.0, dot(p.xz, fall) / 140.0);
  float streak = 0.6 * vn(sq) + 0.4 * vn(sq * 2.7 + 5.0);
  vec3 rock = mix(vec3(0.055, 0.050, 0.046), vec3(0.135, 0.115, 0.095), n1 * 0.6 + n3 * 0.4);
  rock *= 0.78 + 0.44 * smoothstep(0.25, 0.75, vn(vec2(y / 26.0 + n2 * 3.0, p.x / 700.0)));
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
  int ns = edge ? 4 : 1;
  vec3 c0 = vec3(0.0), c1 = vec3(0.0), c2 = vec3(0.0), df = vec3(0.0);
  float hits = 0.0, lt = 0.0, sn = 0.0;
  for (int s = 0; s < 4; s++) {
    if (s >= ns) break;
    vec2 f = gl_FragCoord.xy + (edge ? SS[s] : vec2(0.0));
    vec3 rd = camDir(f / RES, CAM);
    float t;
    if (edge) t = trace(EYE, rd);
    else t = tc > 1.5e5 ? -1.0 : tc;
    if (t <= 0.0) continue;
    vec3 p = EYE + rd * t;
    bool meadow = t < 2400.0 && p.y - meadowH(p.xz) < 0.05;
    float lod = max(t * PIX, 0.02);
    vec3 n = meadow ? meadowNormal(p.xz) : terrainNormal(p.xz, lod);
    float snow = 0.0;
    vec3 alb = meadow ? meadowAlbedo(p, t) : rockAlbedo(p, n, snow);
    float ao = meadow ? 1.0 : terrainAO(p, n, lod);
    vec3 so = p + n * (0.5 + t * 0.002);
    float d0, d1, d2;
    c0 += light(LK[0], p, n, rd, t, alb, snow, ao, shadow(so, LK[0].sun), meadow, d0);
    c1 += light(LK[1], p, n, rd, t, alb, snow, ao, shadow(so, LK[1].sun), meadow, d1);
    c2 += light(LK[2], p, n, rd, t, alb, snow, ao, shadow(so, LK[2].sun), meadow, d2);
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
uniform sampler2D BRUSHT;
uniform vec4 BRUSHM;
float gust(vec2 p, float t) {
  vec2 q = p * vec2(0.42, 0.55) - vec2(t * 1.05, t * 0.12);
  return 0.62 * vn(q) + 0.38 * vn(q * 2.3 + 11.7);
}
/* how far the hand has pressed the grass aside here, read from the grid
   it is kept on (the hand, below) */
vec2 pressed(vec2 p) {
  float z = max(p.y, 0.0);
  float v = (log(BRUSHM.x + BRUSHM.y * z) - BRUSHM.z) * BRUSHM.w;
  float u = p.x / (${TANG.toFixed(3)} * z + 0.3) * 0.5 + 0.5;
  if (u <= 0.0 || u >= 1.0 || v <= 0.0 || v >= 1.0) return vec2(0.0);
  return textureLod(BRUSHT, vec2(u, v), 0.0).rg;
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
  /* a hand drawn through the grass presses it aside, and it springs
     back; each blade gives a little more or less than its neighbours */
  off += pressed(root) * (0.8 + 0.4 * fract(ph * 13.7));
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
   front of it or behind by their distance; the night sky and the jet;
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
uniform float CTON, CTP, CTAGE, JK;
uniform vec4 CT;
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
/* the jet, seen from far below: a fuselage, swept wings and a tailplane,
   in thousandths of a radian, a speck against the mountains; its lights
   and contrail are drawn as wide on the screen as at a 21-degree lens
   (JK), so they still read at this one */
float cap(vec2 p, vec2 a, vec2 b, float r0, float r1) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * h) - mix(r0, r1, h);
}
const float JS = 1.3;
float spot(vec2 q, vec2 c, float sig) {
  vec2 d = q - c;
  return exp(-dot(d, d) / (2.0 * sig * sig));
}
float jetSdf(vec2 q) {
  q /= JS;
  float d = cap(q, vec2(-1.25, 0.0), vec2(1.3, 0.0), 0.12, 0.09);
  d = min(d, cap(q, vec2(0.25, 0.0), vec2(-0.75, 1.55), 0.17, 0.05));
  d = min(d, cap(q, vec2(0.25, 0.0), vec2(-0.75, -1.55), 0.17, 0.05));
  d = min(d, cap(q, vec2(-1.05, 0.0), vec2(-1.45, 0.6), 0.09, 0.04));
  d = min(d, cap(q, vec2(-1.05, 0.0), vec2(-1.45, -0.6), 0.09, 0.04));
  return d * JS;
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
  float rift = exp(-pow((b - 0.004 - 0.02 * (fbm3(vec2(along * 6.0, 1.0)) - 0.45)) / (0.008 + 0.01 * core), 2.0));
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
      float dens = (L == 0 ? 0.045 : 0.05) * STARS * (1.0 + 2.5 * exp(-pow(dot(dir, GN) / 0.12, 2.0)));
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

  /* the jet: its contrail starts a little behind the tail as two lines
     that widen as they age and dissolve; by night only its lights show */
  if (CTON > 0.5) {
    vec2 ae = vec2(atan(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0)));
    vec2 ab = CT.zw - CT.xy;
    float s = clamp(dot(ae - CT.xy, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
    float head = min(CTP, 1.0);
    float L = max(length(ab), 1e-6);
    vec2 fwd = ab / L;
    vec2 nrm = vec2(-fwd.y, fwd.x);
    float sd = dot(ae - (CT.xy + ab * s), nrm) / JK;
    float back = 0.0011 * JS / L;
    if (s < head - back) {
      float age = (CTP - s) * CTAGE;
      float grow = clamp(age / 45.0, 0.0, 1.0);
      float sig = 0.00025 + 0.0009 * grow;
      float sep = 0.0006 + 0.0003 * grow;
      float lines = exp(-(sd - sep) * (sd - sep) / (2.0 * sig * sig)) + exp(-(sd + sep) * (sd + sep) / (2.0 * sig * sig));
      float rag = 0.7 + 0.3 * vn(vec2(s * L * 590.0 / JK, age * 0.08));
      float fade = (1.0 - smoothstep(18.0, 50.0, age)) * smoothstep(0.0, 0.002 * JK / L, head - back - s);
      float ct = min(lines, 1.0) * rag * fade * (0.5 - 0.25 * grow) * (1.0 - W.z);
      sky = mix(sky, mix(vec3(1.0, 0.99, 0.97), vec3(1.0, 0.8, 0.7), W.y * 0.7) * 0.95, ct);
    }
    if (CTP <= 1.0) {
      vec2 rel = ae - (CT.xy + ab * CTP);
      vec2 q = vec2(dot(rel, fwd), dot(rel, nrm)) * 1000.0;
      float aa = 0.12 * JK;
      float body = 1.0 - smoothstep(-aa, aa, jetSdf(q));
      sky = mix(sky, mix(vec3(0.72, 0.74, 0.80), vec3(1.0, 0.86, 0.76), W.y * 0.8), body * (1.0 - W.z));
      float lk = mix(0.12, 1.0, W.z);
      float sp = fract(T / 1.25);
      float strobe = (sp < 0.045 || (sp > 0.11 && sp < 0.155)) ? 1.0 : 0.0;
      float bp = fract(T / 0.92 + 0.37);
      float beacon = smoothstep(0.0, 0.04, bp) * (1.0 - smoothstep(0.08, 0.14, bp));
      vec2 wl = vec2(-0.5, 0.55) * JS, wr = vec2(-0.5, -0.55) * JS;
      sky += vec3(1.0, 0.98, 0.95) * 2.6 * strobe * spot(q, vec2(-0.3 * JS, 0.0), 0.36 * JK) * lk;
      sky += vec3(1.0, 0.12, 0.08) * 1.3 * beacon * spot(q, vec2(0.1 * JS, 0.0), 0.32 * JK) * lk;
      sky += vec3(1.0, 0.15, 0.1) * 0.22 * spot(q, wl, 0.28 * JK) * lk;
      sky += vec3(0.2, 1.0, 0.35) * 0.22 * spot(q, wr, 0.28 * JK) * lk;
      sky += vec3(1.0) * 0.15 * spot(q, vec2(-1.1 * JS, 0.0), 0.28 * JK) * lk;
    }
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

function compile(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function program(fragSrc, names, vertSrc) {
  var vs = compile(gl.VERTEX_SHADER, vertSrc || VERT);
  var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return null;
  }
  var u = {};
  names.forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });
  return { p: prog, u: u };
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
var preProg = program(PRE, TRACE_U);
var landProg = program(LAND, TRACE_U.concat(['PREB']));
var maskProg = program(MASK, ['LA0', 'LA3', 'FULL']);
var skyProg = program(SKY, ['CAM', 'EYE', 'W', 'SUN', 'CLIT', 'CMID', 'CSHD', 'GLOW', 'CLT', 'SCALE', 'COVER', 'NIGHT', 'DUSK', 'FINE', 'PEAK', 'MASKT']);
var bokehProg = program(bokehSrc(TAPS), ['SRC', 'TEXEL', 'RAD']);
var bokeh32Prog = program(bokehSrc(TAPS32), ['SRC', 'TEXEL', 'RAD']);
var GU = ['CAM', 'EYEG', 'CLIP', 'T', 'WENV', 'WIND', 'BRUSHT', 'BRUSHM', 'LDIR', 'LCOL', 'AMB', 'TRN', 'GSCALE', 'PIXR'];
var bladeProg = program(BLADE_FS, GU, BLADE_VS);
var headProg = program(HEAD_FS, GU.concat(['A2C']), HEAD_VS);
var partProg = program(PART_FS, GU.concat(['VIS', 'HALFW', 'DRIFT']), PART_VS);
var compProg = program(COMP, ['LA0', 'LA1', 'LA2', 'LA3', 'SKA', 'SKB', 'GFAR', 'GMID', 'GNEAR', 'CAM', 'EYE', 'W', 'MOON', 'GN', 'GC', 'GV', 'T', 'G', 'SCALE', 'GSCALE', 'EXPO', 'MOONR', 'PH', 'STARS', 'CLT', 'MILKY', 'METON', 'METP', 'METS', 'METL', 'MET', 'CTON', 'CTP', 'CTAGE', 'CT', 'JK']);
if (!preProg || !landProg || !maskProg || !skyProg || !bokehProg || !bokeh32Prog || !bladeProg || !headProg || !partProg || !compProg) return;
[landProg, skyProg, compProg].forEach(setLooks);

var SCALE = HDR ? 1.0 : 0.5;
var GSCALE = HDR ? 1.0 : 0.5;
var CFMT = HDR ? gl.RGBA16F : gl.RGBA8;

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
   buffer if asked */
function target(w, h, fmts, depth, filter) {
  var r = { fbo: gl.createFramebuffer(), w: w, h: h, tex: [], depth: null };
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
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return r;
}

/* the far grass is drawn multisampled and resolved into a texture */
function msTarget(w, h) {
  var r = target(w, h, [CFMT], false, gl.NEAREST);
  r.ms = null;
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  } else {
    r.depth = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo);
    gl.bindRenderbuffer(gl.RENDERBUFFER, r.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, r.depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  return r;
}

function drop(r) {
  if (!r) return;
  r.tex.forEach(function (t) { gl.deleteTexture(t); });
  if (r.depth) gl.deleteRenderbuffer(r.depth);
  if (r.ms) { gl.deleteFramebuffer(r.ms); gl.deleteRenderbuffer(r.msc); gl.deleteRenderbuffer(r.msd); }
  gl.deleteFramebuffer(r.fbo);
}

var preT = null, landT = null, maskT = null, skyT = null, farT = null, midT = null, nearT = null, midB = null, nearB = null;

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
   the horn on the right and the words in the sky between them. As the
   frame narrows the lens first widens and the camera drops, so the
   horn's foot rises clear of the words; narrower still it turns toward
   the horn, until on a phone the horn stands whole above the words with
   the meadow running up to them, and the moon comes round to stay in
   the picture. A tall frame looks down across a lot of meadow, so there
   the eye sits up out of the grass: the lower half shows the flowers
   rather than a wash of the nearest blades. */
var FOVY = 36 * DEG, PITCH = 6 * DEG, YAW0 = 0;
var NEAR_Z = 1.0, MID_Z = 4.0;
var BOXT = [0.5, 0.45, 0.24, 0.09];

function smooth01(a, b, x) {
  var k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

function layout(aspect) {
  var k1 = smooth01(1.5, 1.25, aspect), k2 = smooth01(1.15, 0.7, aspect);
  FOVY = (36 + 10 * k1 + 10 * k2) * DEG;
  PITCH = (6 - 6.5 * k1 - 1.5 * k2) * DEG;
  YAW0 = (19 * k2 - 2.5 * k1 * (1 - k2)) * DEG;
  BOXT = [0.5, 0.46, 0.24 + 0.2 * k2, 0.07];
  EYE[1] = 2300.34 + 0.4 * k2;
  MOON = dirAzEl(-20 + 28 * k2, 18 + 3 * k2);
  PAL.night.sun = dirAzEl(-75 + 30 * k2, 28);
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

function buildMeadow() {
  var rnd = mulberry32(20260930);
  var cam = camFor(canvas.width, canvas.height, PITCH, YAW0);
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
     cut down until it clears */
  function clip(x, z, h) {
    for (var k = 0; k < 10; k++) {
      var v = view(x, h - (EYE[1] - 2300) + 0.03, z);
      if (v[2] <= 0) return h;
      var sx = v[0] / v[2] / cam[0] * 0.5 + 0.5, sy = 0.5 - v[1] / v[2] / cam[1] * 0.5;
      var inX = Math.abs(sx - BOXT[0]) < BOXT[2] + 0.07, inY = sy < BOXT[1] + BOXT[3] + 0.05;
      var edge = Math.abs(sx - 0.5) > 0.38;
      var top = z < NEAR_Z ? (edge ? 0.36 : 0.6) : z < MID_Z ? (edge ? 0.3 : 0.5) : 0;
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
  if (meadow && meadow.bufs) meadow.bufs.forEach(function (b) { gl.deleteBuffer(b); });
  var out = { bufs: [], vb: [], vh: [], vp: [], nb: [], nh: [], np: [] };
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
   Both go in strips across a few frames, sized to the time each frame
   leaves, and the picture shows when the last strip lands. */

var build = null, ready = false;

function startBuild() {
  build = { phase: 0, y: 0, k: 1 };
  ready = false;
}

function stripPass(prog, tgt, y0, rows) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fbo);
  gl.viewport(0, 0, tgt.w, tgt.h);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, y0, tgt.w, rows);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.SCISSOR_TEST);
}

function useTrace(prog, cam) {
  gl.useProgram(prog.p);
  gl.uniform4f(prog.u.CAM, cam[0], cam[1], cam[2], cam[3]);
  gl.uniform3f(prog.u.EYE, EYE[0], EYE[1], EYE[2]);
  gl.uniform2f(prog.u.RES, canvas.width, canvas.height);
  gl.uniform1f(prog.u.PIX, 2 * cam[1] / canvas.height);
}

function buildStep() {
  var cam = camFor(canvas.width, canvas.height, PITCH, YAW0);
  var H = canvas.height, ROWS = 24;
  var t0 = performance.now();
  var done = 0;
  while (done < build.k && build.phase < 2) {
    if (build.phase === 0) {
      useTrace(preProg, cam);
      stripPass(preProg, preT, build.y, ROWS);
    } else {
      useTrace(landProg, cam);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, preT.tex[0]);
      gl.uniform1i(landProg.u.PREB, 0);
      stripPass(landProg, landT, build.y, ROWS);
    }
    build.y += ROWS;
    if (build.y >= H) { build.phase++; build.y = 0; }
    done++;
  }
  /* wait for the strips to land, and size the next batch to the time
     they took; a float target is read back as floats */
  var flt = build.phase !== 0 && CFMT === gl.RGBA16F;
  gl.bindFramebuffer(gl.FRAMEBUFFER, build.phase === 0 ? preT.fbo : landT.fbo);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, flt ? gl.FLOAT : gl.UNSIGNED_BYTE, flt ? new Float32Array(4) : new Uint8Array(4));
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  var ms = performance.now() - t0;
  if (ms < 7) build.k = Math.min(build.k * 2, 64);
  else if (ms > 14) build.k = Math.max(1, Math.floor(build.k / 2));
  if (build.phase >= 2) {
    gl.useProgram(maskProg.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, landT.tex[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, landT.tex[3]);
    gl.uniform1i(maskProg.u.LA0, 0);
    gl.uniform1i(maskProg.u.LA3, 1);
    gl.uniform2i(maskProg.u.FULL, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, maskT.fbo);
    gl.viewport(0, 0, maskT.w, maskT.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    build = null;
    ready = true;
  }
}

/* ----------------------------------------------------------- the events */

var jet = { on: false, a: [0, 0], b: [0, 0], t0: 0, dur: 45, next: 25 };
var meteor = { on: false, a: [0, 0], d: [0, 0], t0: 0, life: 0.7, speed: 0.3, next: 8, again: 0 };
var evRnd = mulberry32(31);

/* now and then a jet crosses the high sky, one way or the other, above
   the words and the summit, at the same pace across the frame whatever
   the lens; its contrail hangs on for a minute after it */
function stepEvents(t, w) {
  if (!jet.on && t > jet.next) {
    var ltr = evRnd() < 0.5;
    var el0 = Math.max(PITCH + FOVY * (0.41 - 0.08 * evRnd()), 17.5 * DEG), el1 = el0 + (evRnd() - 0.5) * 0.03;
    var half = Math.atan(Math.tan(FOVY / 2) * canvas.width / canvas.height) / Math.cos(el0) + 0.06;
    jet.a = [YAW0 + (ltr ? -half : half), el0];
    jet.b = [YAW0 + (ltr ? half : -half), el1];
    jet.t0 = t;
    jet.dur = 2 * half / (0.013 * FOVY / (21 * DEG)) * (0.85 + 0.4 * evRnd());
    jet.on = true;
  }
  if (jet.on) {
    var age = t - jet.t0;
    if (age > jet.dur + 60 || (w.n > 0.98 && age > jet.dur)) {
      jet.on = false;
      jet.next = t + 70 + 110 * evRnd();
    }
  }
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

var look = 'day', tr = null;
var wCur = { d: 1, u: 0, n: 0 }, wFrom = wCur;
var mx = 0, my = 0, tx = 0, ty = 0;
var running = false, raf = 0, last = 0, frameNo = 0, brushing = false;
var visible = !document.hidden, inView = true;
var cloudT = 120;
/* how far the breeze has carried the seeds, summed frame by frame so a
   change in its strength never jolts them */
var drift = 0;
var themeMeta = document.querySelector('meta[name="theme-color"]');

function themeColor(w) {
  if (!themeMeta) return;
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
  hero.style.backgroundColor = FLAT[name];
  var to = LOOKS[name];
  var dist = Math.max(Math.abs(to.d - wCur.d), Math.abs(to.u - wCur.u), Math.abs(to.n - wCur.n));
  if (instant || reduced.matches || dist < 0.002) {
    wCur = { d: to.d, u: to.u, n: to.n };
    tr = null;
    themeColor(wCur);
  } else {
    wFrom = { d: wCur.d, u: wCur.u, n: wCur.n };
    tr = { t0: performance.now(), dur: 600 + 900 * dist };
  }
  wake();
}

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

/* the hand: where the pointer passes over the meadow it presses the
   grass aside, out from its path and a little on along it, and once it
   has gone the blades spring back, swinging a little past upright
   before they settle. The push is kept on a grid laid over the meadow,
   its cells about a third of the hand's reach wherever they lie, so
   finer near the eye. Every point the pointer passed through since the
   last frame is laid into it as a stroke from the one before, so a
   quick sweep leaves an unbroken wake, and every cell rides a spring:
   a stiff one while the hand presses, a soft, lively one as the grass
   rises after it. A hand that rests lets the grass up again. */
var BW = 160, BH = 112, BZ0 = 0.3, BZ1 = 16, BR0 = 0.16, BR1 = 0.03;
var BL0 = Math.log(BR0 + BR1 * BZ0), BL1 = Math.log(BR0 + BR1 * BZ1);
var bD = new Float32Array(BW * BH * 2), bV = new Float32Array(BW * BH * 2), bT = new Float32Array(BW * BH * 2);
var bZ = new Float32Array(BH), bAct = null;
for (var bj = 0; bj < BH; bj++) bZ[bj] = (Math.exp(BL0 + (bj + 0.5) / BH * (BL1 - BL0)) - BR0) / BR1;
var brushTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, brushTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, BW, BH, 0, gl.RG, gl.FLOAT, bD);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

var path = [], hand = null, handK = 0, handDir = [0, 0];

function rayAt(u, v, cam) {
  var px = (u * 2 - 1) * cam[0], py = (v * 2 - 1) * cam[1];
  var l = Math.hypot(px, py, 1);
  var d = [px / l, py / l, 1 / l];
  var cp = Math.cos(cam[2]), sp = Math.sin(cam[2]);
  var e = [d[0], d[1] * cp + d[2] * sp, -d[1] * sp + d[2] * cp];
  var cy = Math.cos(cam[3]), sy = Math.sin(cam[3]);
  return [e[0] * cy + e[2] * sy, e[1], -e[0] * sy + e[2] * cy];
}

/* where the pointer at (u, v) meets the meadow, or null */
function groundAt(u, v, cam, eyeg) {
  var d = rayAt(u, v, cam);
  var den = d[1] + 0.012 * d[2];
  if (den > -1e-4) return null;
  var t = (2300 - eyeg[1] - 0.012 * eyeg[2]) / den;
  var x = eyeg[0] + d[0] * t, z = eyeg[2] + d[2] * t;
  return t > 0 && z > BZ0 && z < BZ1 - 1.5 ? [x, z] : null;
}

function bRow(z) {
  return (Math.log(BR0 + BR1 * Math.max(z, 0)) - BL0) / (BL1 - BL0) * BH - 0.5;
}

/* a stroke of the hand from a to b, at weight k, moving along dir: under
   the hand the blades go on along its path, toward its rim out to the
   side; each cell keeps the strongest push laid on it */
function stroke(a, b, k, dir) {
  var mx2 = b[0] - a[0], mz2 = b[1] - a[1], ml = mx2 * mx2 + mz2 * mz2;
  var reach = BR0 + BR1 * Math.max(a[1], b[1]);
  var x0 = Math.min(a[0], b[0]) - reach, x1 = Math.max(a[0], b[0]) + reach;
  var j0 = Math.max(0, Math.floor(bRow(Math.min(a[1], b[1]) - reach)));
  var j1 = Math.min(BH - 1, Math.ceil(bRow(Math.max(a[1], b[1]) + reach)));
  var ia = BW, ib = -1;
  for (var j = j0; j <= j1; j++) {
    var z = bZ[j], hw = TANG * z + 0.3, r = BR0 + BR1 * z;
    var i0 = Math.max(0, Math.floor((x0 / hw * 0.5 + 0.5) * BW - 0.5));
    var i1 = Math.min(BW - 1, Math.ceil((x1 / hw * 0.5 + 0.5) * BW - 0.5));
    if (i1 < i0) continue;
    ia = Math.min(ia, i0);
    ib = Math.max(ib, i1);
    for (var i = i0; i <= i1; i++) {
      var x = ((i + 0.5) / BW * 2 - 1) * hw;
      var h = ml > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * mx2 + (z - a[1]) * mz2) / ml)) : 0;
      var dx = x - a[0] - mx2 * h, dz = z - a[1] - mz2 * h;
      var d = Math.hypot(dx, dz);
      if (d >= r) continue;
      var side = d > 1e-6 ? smooth01(0, 0.45 * r, d) / d : 0;
      var px = dx * side + dir[0] * 0.7, pz = dz * side + dir[1] * 0.7;
      var pl = Math.hypot(px, pz);
      if (pl < 1e-6) continue;
      var m = 1.8 * k * (1 - smooth01(0.45 * r, r, d)) / pl;
      px *= m;
      pz *= m;
      var c = (j * BW + i) * 2;
      if (px * px + pz * pz > bT[c] * bT[c] + bT[c + 1] * bT[c + 1]) {
        bT[c] = px;
        bT[c + 1] = pz;
      }
    }
  }
  if (ib < ia) return;
  if (!bAct) bAct = [ia, ib, j0, j1];
  else bAct = [Math.min(bAct[0], ia), Math.max(bAct[1], ib), Math.min(bAct[2], j0), Math.max(bAct[3], j1)];
}

/* a damped spring of rate w and damping z stepped exactly over dt, as
   the matrix taking (offset, velocity) to their new values */
function springK(w, z, dt) {
  var wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * dt), c = Math.cos(wd * dt), s = Math.sin(wd * dt);
  return [e * (c + z * w / wd * s), e * s / wd, -e * w * w / wd * s, e * (c - z * w / wd * s)];
}

/* every cell the hand has touched moves toward what it asks of it, the
   hand's mark fades behind it, and once the wake is still the grid
   rests until the hand comes back */
function relax(dt) {
  if (!bAct) return false;
  var P = springK(34, 0.9, dt), R = springK(8.5, 0.3, dt), fade = Math.exp(-dt / 0.18);
  var live = 0, i, j, c;
  for (j = bAct[2]; j <= bAct[3]; j++) {
    for (i = bAct[0]; i <= bAct[1]; i++) {
      c = (j * BW + i) * 2;
      var tx = bT[c], tz = bT[c + 1], dx = bD[c], dz = bD[c + 1], vx = bV[c], vz = bV[c + 1];
      if (tx === 0 && tz === 0 && dx === 0 && dz === 0 && vx === 0 && vz === 0) continue;
      var K = tx * tx + tz * tz > dx * dx + dz * dz ? P : R;
      var ex = dx - tx, ez = dz - tz;
      bD[c] = tx + K[0] * ex + K[1] * vx;
      bD[c + 1] = tz + K[0] * ez + K[1] * vz;
      bV[c] = K[2] * ex + K[3] * vx;
      bV[c + 1] = K[2] * ez + K[3] * vz;
      bT[c] = tx * fade;
      bT[c + 1] = tz * fade;
      live = Math.max(live, Math.abs(bD[c]) + Math.abs(bD[c + 1]) + 0.1 * (Math.abs(bV[c]) + Math.abs(bV[c + 1])) + Math.abs(tx) + Math.abs(tz));
    }
  }
  var j0 = bAct[2], rows = bAct[3] - j0 + 1;
  if (live < 2e-3) {
    for (j = bAct[2]; j <= bAct[3]; j++) {
      for (i = bAct[0]; i <= bAct[1]; i++) {
        c = (j * BW + i) * 2;
        bD[c] = bD[c + 1] = bV[c] = bV[c + 1] = bT[c] = bT[c + 1] = 0;
      }
    }
    bAct = null;
  }
  gl.bindTexture(gl.TEXTURE_2D, brushTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, j0, BW, rows, gl.RG, gl.FLOAT, bD, j0 * BW * 2);
  return !!bAct;
}

/* lay the pointer's path since the last frame into the grid, the
   direction of travel smoothed over about half the hand's reach, and
   step the springs */
function stepBrush(dt, cam, eyeg) {
  var moved = path.length > 0;
  for (var n = 0; n < path.length; n++) {
    var g = groundAt(path[n][0], path[n][1], cam, eyeg);
    if (g && hand) {
      var reach = BR0 + BR1 * g[1];
      var hx = handDir[0] * reach * 0.5 + g[0] - hand[0], hz = handDir[1] * reach * 0.5 + g[1] - hand[1];
      var hl = Math.hypot(hx, hz);
      if (hl > 1e-6) handDir = [hx / hl, hz / hl];
      stroke(hand, g, 1, handDir);
    } else if (g) stroke(g, g, 1, handDir);
    hand = g;
  }
  path.length = 0;
  if (moved) handK = 1;
  else if (hand && handK > 0.02) {
    handK *= Math.exp(-dt / 0.35);
    stroke(hand, hand, handK, handDir);
  }
  return relax(dt);
}

function grassUniforms(prog, cam, eyeg, t, env, w, pixr) {
  var u = prog.u;
  gl.useProgram(prog.p);
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  u3(u.EYEG, eyeg);
  gl.uniform2f(u.CLIP, 0.03, 400);
  gl.uniform1f(u.T, t);
  gl.uniform1f(u.WENV, env);
  gl.uniform2f(u.WIND, 0.94, -0.33);
  if (u.BRUSHT) {
    gl.uniform1i(u.BRUSHT, 0);
    gl.uniform4f(u.BRUSHM, BR0, BR1, BL0, 1 / (BL1 - BL0));
  }
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

function draw(now) {
  if (tr) {
    var k = Math.min(1, (now - tr.t0) / tr.dur);
    k = k * k * (3 - 2 * k);
    var to = LOOKS[look];
    wCur = { d: wFrom.d + (to.d - wFrom.d) * k, u: wFrom.u + (to.u - wFrom.u) * k, n: wFrom.n + (to.n - wFrom.n) * k };
    themeColor(wCur);
    if (k >= 1) tr = null;
  }
  var still = reduced.matches;
  var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  var l = still ? 1 : 1 - Math.exp(-(now - last) / 160);
  mx += (tx - mx) * l;
  my += (ty - my) * l;
  var t = still ? 1000 : now / 1000;
  var w = wCur;
  var wind = 1 - 0.8 * w.n;
  var env = still ? 0.4 : windAt(t) * wind;
  if (!still) cloudT += dt * (1 - w.n);
  if (!still) drift += dt * (0.6 + 0.8 * env);
  if (!still) stepEvents(t, w);
  var W2 = canvas.width, H2 = canvas.height;
  var cam = camFor(W2, H2, PITCH, YAW0);
  var sun = sunDir(w);

  /* the head moves with the pointer and the breath: the grass shifts
     against the far land, which stays put */
  var breath = still ? 0 : 0.0025 * Math.sin(t * 1.3);
  var eyeg = [EYE[0] + mx * 0.03, EYE[1] + my * 0.012 + breath, EYE[2]];
  var gcam = [cam[0], cam[1], cam[2] + my * 0.004, cam[3] + mx * 0.006];
  brushing = !still && stepBrush(dt, gcam, eyeg);

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
  var vis = [w.d + 0.5 * w.u, w.d + 0.6 * w.u, w.n];
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, brushTex);
  drawBand(2, farT, gcam, eyeg, t, env, w, pixr, vis, true);
  drawBand(1, midT, gcam, eyeg, t, env, w, pixr, vis, false);
  drawBand(0, nearT, gcam, eyeg, t, env, w, pixr, vis, false);

  bokeh(bokeh32Prog, midT.tex[0], midT.w, midT.h, midB, RM);
  bokeh(bokehProg, nearT.tex[0], nearT.w, nearT.h, nearB, RN);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
  gl.uniform1f(u.CTON, jet.on ? 1 : 0);
  gl.uniform1f(u.CTP, jet.on ? (t - jet.t0) / jet.dur : 0);
  gl.uniform1f(u.CTAGE, jet.dur);
  gl.uniform4f(u.CT, jet.a[0], jet.a[1], jet.b[0], jet.b[1]);
  gl.uniform1f(u.JK, FOVY / (21 * DEG));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  canvas.classList.add('drawn');
}

function frame(now) {
  raf = 0;
  if (build) {
    buildStep();
    if (ready) {
      draw(now);
      last = now;
      running = !reduced.matches && visible && inView;
    }
    if (build || running) raf = requestAnimationFrame(frame);
    return;
  }
  if (!running) return;
  var busy = tr || brushing || meteor.on || Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002;
  if (now - last >= (busy ? 0 : 30)) { draw(now); last = now; }
  raf = requestAnimationFrame(frame);
}

function wake() {
  if (!skyT) return;
  if (build) { if (!raf) raf = requestAnimationFrame(frame); return; }
  if (reduced.matches) { if (ready) draw(performance.now()); return; }
  if (!running && visible && inView) {
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function sleep() {
  running = false;
  if (raf && !build) cancelAnimationFrame(raf);
  if (!build) raf = 0;
}

function canvasSize() {
  var w = hero.clientWidth, h = hero.clientHeight;
  if (!w || !h) return null;
  var scale = Math.min(window.devicePixelRatio || 1, 1.5);
  if (w * scale > 2000) scale = 2000 / w;
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

/* a window being dragged rebuilds once it settles, the picture
   stretching with it until then */
var pending = 0;

function resize() {
  var sz = canvasSize();
  if (!sz || (canvas.width === sz[0] && canvas.height === sz[1] && skyT)) return;
  if (ready) {
    if (pending) clearTimeout(pending);
    pending = setTimeout(function () { pending = 0; rebuild(); }, 250);
    return;
  }
  rebuild();
}

function rebuild() {
  var sz = canvasSize();
  if (!sz) return;
  var cw = sz[0], ch = sz[1];
  canvas.style.transition = 'none';
  canvas.classList.remove('drawn');
  void canvas.offsetWidth;
  canvas.style.transition = '';
  canvas.width = cw;
  canvas.height = ch;
  var hw = Math.max(1, Math.round(cw * 0.5)), hh = Math.max(1, Math.round(ch * 0.5));
  [preT, landT, maskT, skyT, farT, midT, nearT, midB, nearB].forEach(drop);
  preT = target(cw, ch, [gl.RGBA8], false, gl.NEAREST);
  landT = target(cw, ch, [CFMT, CFMT, CFMT, CFMT], false, gl.NEAREST);
  skyT = target(hw, hh, [CFMT, CFMT], false);
  maskT = target(hw, hh, [gl.RGBA8], false, gl.NEAREST);
  farT = msTarget(cw, ch);
  var qw = Math.max(1, Math.round(cw * 0.25)), qh = Math.max(1, Math.round(ch * 0.25));
  midT = target(hw, hh, [CFMT], true);
  nearT = target(qw, qh, [CFMT], true);
  midB = target(hw, hh, [CFMT], false);
  nearB = target(qw, qh, [CFMT], false);
  RN = 0.04 * qh;
  RM = 0.0055 * hh;
  layout(cw / ch);
  [landProg, skyProg, compProg].forEach(setLooks);
  meadow = upload(buildMeadow());
  startBuild();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* -------------------------------------------------------------- wiring */

buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    var n = b.getAttribute('data-look');
    if (n === look) return;
    try { sessionStorage.setItem('look', n); } catch (err) {}
    setLook(n, false);
  });
});

hero.addEventListener('pointermove', function (ev) {
  if (reduced.matches || ev.pointerType === 'touch') return;
  var r = hero.getBoundingClientRect();
  var u = (ev.clientX - r.left) / r.width, v = (ev.clientY - r.top) / r.height;
  tx = (u - 0.5) * 2;
  ty = (v - 0.5) * -2;
  /* every point the pointer passed through since the last event, not
     just the last, so a quick sweep is followed all the way */
  var evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null;
  if (!evs || !evs.length) evs = [ev];
  for (var i = 0; i < evs.length; i++) {
    path.push([(evs[i].clientX - r.left) / r.width, 1 - (evs[i].clientY - r.top) / r.height]);
  }
  if (path.length > 96) path.splice(0, path.length - 96);
  wake();
});

hero.addEventListener('pointerleave', function () {
  tx = 0;
  ty = 0;
  path.length = 0;
  hand = null;
  wake();
});

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

canvas.addEventListener('webglcontextlost', function (ev) {
  ev.preventDefault();
  sleep();
  canvas.classList.remove('drawn');
});

canvas.addEventListener('webglcontextrestored', function () { location.reload(); });

var initial = 'day';
try { initial = sessionStorage.getItem('look') || initial; } catch (err) {}
try { initial = new URLSearchParams(location.search).get('look') || initial; } catch (err) {}
if (!LOOKS[initial]) initial = 'day';
document.documentElement.classList.add('sky');
setLook(initial, true);
resize();
wake();

})();
