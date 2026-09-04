/* 0mattias.github.io · the sky
   An autumn oak against the sky, photographed rather than drawn: a
   21-degree lens looks up through the crown at a cloud deck lit from
   the sun's side, a moon at tonight's real phase that dissolves into
   the sky on its shadow side, stars once it is dark. The oak is grown
   by a small L-system and hung with russet, rust and old gold; gusts
   run through the crown, a leaf lets go now and then and tumbles or
   twirls down on the wind past a twig that sits in the focus plane;
   by day a jet crosses the high sky now and then and its contrail
   widens and dissolves behind it, by night a meteor falls. Sky, near
   foliage and the focus plane render
   to their own targets, each is defocused through a 72-tap bokeh disc
   (bright spots bloom), then composited under an ACES grade, a
   vignette and film grain. Three looks, each with its own prebuilt
   foliage so a switch crossfades at once: the page opens on the
   sunset, and the dots at the bottom left move the sun. WebGL2, no
   libraries, no build step. */

'use strict';

(function () {

var hero = document.querySelector('.letterhead');
var words = document.querySelector('.letterhead .words');
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

var SKY_RES = 0.4;
var HALF = 0.5;
var FOV = 21 * Math.PI / 180;
var PITCH = 14 * Math.PI / 180;
var MOON_R = 2.05 * Math.PI / 180;

var LOOKS = { day: { d: 1, u: 0, n: 0 }, dusk: { d: 0, u: 1, n: 0 }, night: { d: 0, u: 0, n: 1 } };
var FLAT = { day: '#648bba', dusk: '#b07f8a', night: '#141b30' };
var THEME = { day: '#5482bd', dusk: '#5e6fae', night: '#0a1024' };

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

var PAL = {
  day: {
    zen: scene('#5a83b8'), hor: scene('#adbfd4'), dmid: scene('#e2b598'), dfar: scene('#b6a8bf'),
    glow: [0.8, 0.76, 0.64], clit: [1.04, 1.03, 1.0], cshd: scene('#8fa1ba'),
    blit: scene('#6e6155'), bdrk: scene('#1c1815'),
    leaf: [['#8e4a2c', '#3e1f12'], ['#c07838', '#5c3315'], ['#c39c44', '#6a541c']],
    cover: 0.55, expo: 1.0, mgain: 1.0
  },
  dusk: {
    zen: scene('#7180b5'), hor: scene('#d8b09a'), dmid: scene('#e5a778'), dfar: scene('#b79cb4'),
    glow: [1.0, 0.62, 0.36], clit: [1.08, 0.91, 0.78], cshd: scene('#9c8db0'),
    blit: scene('#735646'), bdrk: scene('#1a1310'),
    leaf: [['#a8522c', '#4a2214'], ['#d0803a', '#603315'], ['#d1a548', '#6a501c']],
    cover: 0.56, expo: 1.0, mgain: 1.0
  },
  night: {
    zen: scene('#0a1024'), hor: scene('#1b2439'), dmid: scene('#1e2740'), dfar: scene('#141b30'),
    glow: [0.33, 0.37, 0.48], clit: scene('#5f6a86'), cshd: scene('#0b0f1e'),
    blit: scene('#22273a'), bdrk: scene('#030407'),
    leaf: [['#2e242a', '#08050a'], ['#3b3134', '#0b0808'], ['#403a2e', '#0d0b07']],
    cover: 0.5, expo: 1.0, mgain: 1.0
  }
};

var LEAF = {};
['day', 'dusk', 'night'].forEach(function (k) {
  LEAF[k] = PAL[k].leaf.map(function (h) { return h.map(scene); });
});

var MOON = (function () {
  var el = 20 * Math.PI / 180, az = 3 * Math.PI / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
})();

function norm3(v) {
  var l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/* ------------------------------------------------------------ shaders */

var TAPS = [];
[[1, 0, 0], [5, 0.16, 0.7], [8, 0.38, 0.3], [10, 0.55, 0.5], [12, 0.72, 0], [20, 0.87, 0.4], [16, 1, 0.15]].forEach(function (ring) {
  for (var i = 0; i < ring[0]; i++) {
    var a = i / ring[0] * Math.PI * 2 + ring[2];
    TAPS.push('vec2(' + (Math.cos(a) * ring[1]).toFixed(4) + ',' + (Math.sin(a) * ring[1]).toFixed(4) + ')');
  }
});

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
in vec2 uv;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

var NOISE = `
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
`;

var SKY = HEAD + `
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
uniform vec2 R;
uniform float T, NIGHT, DUSK, COVER, SHEL, SCALE;
uniform vec4 CAM, BOX;
uniform vec3 SUN, ZEN, HOR, DMID, DFAR, GLOW, CLIT, CSHD;
uniform vec2 LD;
` + NOISE + `

vec3 skyColor(vec3 dir) {
  vec3 col = mix(HOR, ZEN, smoothstep(-0.02, 0.55, dir.y));
  vec3 sunH = normalize(vec3(SUN.x, 0.0, SUN.z) + vec3(1e-5));
  vec3 dirH = normalize(vec3(dir.x, 0.0, dir.z) + vec3(1e-5));
  float az = smoothstep(-0.4, 1.0, dot(dirH, sunH));
  vec3 hor = mix(DFAR, HOR, az);
  vec3 band = mix(mix(DFAR, DMID, 0.35), DMID, az);
  vec3 dc = mix(hor, band, smoothstep(-0.01, 0.07, dir.y));
  dc = mix(dc, ZEN, smoothstep(0.02, 0.17 + 0.10 * az, dir.y));
  col = mix(col, dc, DUSK);
  float sd = max(dot(dir, SUN), 0.0);
  col += GLOW * pow(sd, 14.0) * (mix(0.22, 0.06, NIGHT) + 0.28 * DUSK);
  col += GLOW * pow(sd, 4.0) * 0.14 * DUSK;
  col += GLOW * pow(sd, 40.0) * 0.6 * DUSK;
  col *= 1.0 + 0.011 * sin(dir.x * 4.1 + dir.y * 6.3) * sin(dir.y * 3.7 - dir.x * 2.3)
             + 0.006 * sin(dir.x * 11.0) * sin(dir.y * 9.0);
  return col;
}

float cloudField(vec2 p, vec2 drift, float seed) {
  float base = fbm5(p * 2.1 + drift + seed);
  float fine = 0.14 * (fbm5(p * 3.8 - drift * 1.4 + 4.0 + seed) - 0.5);
  float billow = 1.0 - abs(2.0 * fbm3(p * 7.5 + drift * 0.6 + 9.0 + seed) - 1.0);
  float grain = 0.05 * (fbm3(p * 18.0 + drift * 0.3 + 23.0 + seed) - 0.5);
  return 0.48 + (base - 0.48) * 1.35 + fine + 0.12 * (billow - 0.5) + grain;
}

float boxDist(vec2 p, vec4 r, vec2 s) {
  if (r.z <= r.x) return 1e3;
  vec2 c = 0.5 * (r.xy + r.zw) * s, h = 0.5 * (r.zw - r.xy) * s;
  float rad = min(min(h.x, h.y), 0.12);
  vec2 d = abs(p - c) - (h - rad);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - rad;
}

vec4 deck(vec3 dir, vec2 p0, vec2 drift, vec2 sc, float seed, float th0, float shelter) {
  vec2 p = p0 * sc;
  float weather = fbm3(p * 1.3 + seed * 3.1 + drift * 0.5);
  float th = th0 + 0.15 * (0.5 - weather) + shelter;
  float f = cloudField(p, drift, seed);
  float dens = smoothstep(th, th + 0.34, f);
  if (dens <= 0.0) return vec4(0.0);
  float thick = smoothstep(th + 0.14, th + 0.55, f);
  float fl = cloudField(p + LD * 0.045, drift, seed);
  float fl2 = cloudField(p + LD * 0.12, drift, seed);
  float shade = clamp(0.5 + (f - fl) * 7.0 + (f - fl2) * 3.0, 0.0, 1.0);
  shade = shade * shade * (3.0 - 2.0 * shade);
  vec3 col = mix(CSHD, CLIT, shade);
  col = mix(col, CSHD * 0.8, thick * 0.5 * (1.0 - shade));
  float fringe = dens * (1.0 - thick);
  col += CLIT * fringe * shade * 0.35;
  float gm = pow(max(dot(dir, SUN), 0.0), mix(24.0, 48.0, NIGHT));
  col += GLOW * gm * mix(0.55, 0.50, NIGHT) * (1.0 - thick * 0.8) * (1.0 - 0.7 * DUSK);
  return vec4(col, dens * (0.55 + 0.45 * thick));
}

void main() {
  vec3 dir = camDir(uv, CAM);
  vec3 col = skyColor(dir);
  float cov = 0.0;
  if (dir.y > -0.05) {
    vec2 p0 = dir.xz / (max(dir.y, 0.0) + 0.5) * 0.85;
    vec2 drift = T * vec2(0.005, 0.002);
    float th0 = mix(0.62, 0.40, COVER);
    vec2 s = vec2(R.x / R.y, 1.0);
    vec2 warp = (vec2(fbm3(p0 * 1.6 + drift + 5.0), fbm3(p0 * 1.6 + drift + 19.0)) - 0.5) * 0.08
              + (vec2(fbm3(p0 * 4.5 + drift * 1.2 + 83.0), fbm3(p0 * 4.5 + drift * 1.2 + 97.0)) - 0.5) * 0.04;
    float shelter = SHEL * (1.0 - smoothstep(-0.04, 0.42, boxDist(uv * s + warp, BOX, s)));
    vec4 far = deck(dir, p0, drift * 0.6, vec2(2.2, 4.8), 5.0, th0 + 0.08, shelter);
    vec4 near = deck(dir, p0, drift, vec2(1.0, 1.0), 0.0, th0, shelter);
    col = mix(col, far.rgb, far.a * 0.5);
    col = mix(col, near.rgb, near.a);
    cov = min(near.a + far.a * 0.5 * (1.0 - near.a), 1.0);
  }
  o0 = vec4(col * SCALE, 1.0);
  o1 = vec4(cov, 0.0, 0.0, 1.0);
}`;

var BOKEH = HEAD + `
out vec4 o;
uniform sampler2D SRC;
uniform vec2 TEXEL;
uniform float RAD, BOOST, SCALE;
const vec2 K[72] = vec2[72](` + TAPS.join(',') + `);
void main() {
  float kang = hash12(uv * 517.3) * 6.2831853;
  float kc = cos(kang), ks = sin(kang);
  mat2 ROT = mat2(kc, ks, -ks, kc);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 72; i++) {
    vec4 s = texture(SRC, uv + (ROT * K[i]) * RAD * TEXEL);
    s.rgb *= 1.0 + BOOST * smoothstep(1.15, 2.6, dot(s.rgb, vec3(0.3333)) / SCALE) * 0.7;
    acc += vec4(s.rgb * s.a, s.a);
  }
  o = acc / 72.0;
}`;

var COMP = HEAD + `
out vec4 o;
uniform sampler2D SKYB, FGB, MIDB, COVT;
uniform float T, G, NIGHT, DUSK, EXPO, SCALE, MOONR, PH, MGAIN, CTON, CTP, CTAGE, METON, METP, METS, METL;
uniform vec2 R;
uniform vec4 CAM, CT, MET;
uniform vec3 BLIT, BDRK, LL0, LL1, LL2, LD0, LD1, LD2, SUN, MOON;
` + NOISE + `
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 leafCol(float hue, float lit) {
  vec3 l = hue < 0.5 ? mix(LL0, LL1, hue * 2.0) : mix(LL1, LL2, hue * 2.0 - 1.0);
  vec3 d = hue < 0.5 ? mix(LD0, LD1, hue * 2.0) : mix(LD1, LD2, hue * 2.0 - 1.0);
  return mix(d, l, lit);
}
vec4 layerCol(vec4 t, vec3 bg, float wrap) {
  float cov = clamp(t.a, 0.0, 1.0);
  float lit = clamp(t.r / max(t.a, 1e-4), 0.0, 1.0);
  float leaf = clamp(t.g / max(t.a, 1e-4), 0.0, 1.0);
  float hue = clamp(t.b / max(t.a, 1e-4), 0.0, 1.0);
  vec3 c = mix(mix(BDRK, BLIT, lit), leafCol(hue, lit), leaf);
  c = mix(c, bg, 0.06);
  c += bg * wrap * (1.0 - cov);
  return vec4(c, cov);
}
void main() {
  vec3 dir = camDir(uv, CAM);
  vec4 bgB = texture(SKYB, uv);
  vec3 bg = bgB.rgb / max(bgB.a, 1e-4) / SCALE;
  float cloud = texture(COVT, uv).r;

  if (NIGHT > 0.001) {
    vec2 ae = vec2(atan(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0))) * 114.6;
    vec2 c = floor(ae);
    vec2 f = fract(ae) - 0.5;
    float hs = hash3(vec3(c, 1.0));
    vec2 off = vec2(hash3(vec3(c, 7.3)), hash3(vec3(c, 13.9))) - 0.5;
    float mag = fract(hs * 41.7);
    float rad = 0.028 + 0.035 * mag * mag;
    float dd = length(f - off * 0.7);
    float core = smoothstep(rad, rad * 0.25, dd);
    float skirt = smoothstep(rad * 4.0, 0.0, dd) * 0.08 * mag * mag;
    float star = (core + skirt) * step(0.955, hs);
    float tw = 0.93 + 0.07 * sin(T * (0.8 + 1.2 * hs) + hs * 80.0);
    float bright = (0.16 + 0.9 * mag * mag) * tw;
    float g = pow(max(dot(dir, SUN), 0.0), 14.0);
    float dark = smoothstep(0.12, 0.03, dot(bg, vec3(0.3333)));
    bg += mix(vec3(0.78, 0.85, 1.0), vec3(1.0, 0.95, 0.85), fract(hs * 9.1))
        * star * bright * 1.3 * NIGHT * dark * smoothstep(-0.02, 0.2, dir.y) * (1.0 - g * 0.85);
  }

  if (CTON > 0.5 && NIGHT < 0.99) {
    vec2 ae = vec2(atan(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0)));
    vec2 ab = CT.zw - CT.xy;
    float s = clamp(dot(ae - CT.xy, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
    float head = min(CTP, 1.0);
    vec2 nrm = normalize(vec2(-ab.y, ab.x));
    float sd = dot(ae - (CT.xy + ab * s), nrm);
    if (s < head) {
      float age = (CTP - s) * CTAGE;
      float grow = clamp(age / 45.0, 0.0, 1.0);
      float sig = 0.00025 + 0.0009 * grow;
      float sep = 0.0006 + 0.0003 * grow;
      float lines = exp(-(sd - sep) * (sd - sep) / (2.0 * sig * sig)) + exp(-(sd + sep) * (sd + sep) / (2.0 * sig * sig));
      float rag = 0.7 + 0.3 * vn(vec2(s * 400.0, age * 0.08));
      float fade = (1.0 - smoothstep(18.0, 50.0, age)) * smoothstep(0.0, 0.004, head - s);
      float ct = min(lines, 1.0) * rag * fade * (0.5 - 0.25 * grow) * (1.0 - NIGHT) * (1.0 - cloud * 0.9);
      vec3 ctCol = mix(vec3(1.0, 0.99, 0.97), vec3(1.0, 0.8, 0.7), DUSK * 0.7);
      bg = mix(bg, ctCol * 0.95, ct);
    }
    if (CTP <= 1.0) {
      vec2 hp = CT.xy + ab * CTP;
      float dh = length(ae - hp);
      bg += vec3(0.95, 0.95, 1.0) * exp(-dh * dh / (2.0 * 0.0003 * 0.0003)) * 0.5 * (1.0 - NIGHT);
    }
  }

  if (METON > 0.5 && NIGHT > 0.01) {
    vec2 ae = vec2(atan(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0)));
    float p = METP;
    vec2 hp = MET.xy + MET.zw * METS * p * METL;
    float len = min(METS * p * METL, 0.045 + 0.04 * p);
    vec2 tail = hp - MET.zw * len;
    vec2 seg = hp - tail;
    float q = clamp(dot(ae - tail, seg) / max(dot(seg, seg), 1e-9), 0.0, 1.0);
    float d = length(ae - (tail + seg * q));
    float sigma = 0.0006 + 0.0006 * (1.0 - q);
    float streak = exp(-d * d / (2.0 * sigma * sigma)) * pow(q, 1.7);
    float fade = (1.0 - smoothstep(0.55, 1.0, p)) * smoothstep(0.0, 0.08, p);
    float dh = length(ae - hp);
    float glint = exp(-dh * dh / (2.0 * 0.0009 * 0.0009));
    bg += (vec3(0.85, 0.92, 1.0) * streak * 1.4 + vec3(1.0) * glint * 1.1) * fade * NIGHT * (1.0 - cloud * 0.85);
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
      vec3 L = normalize(vec3(sin(ph) * 0.9, abs(sin(ph)) * 0.44, -cos(ph)));
      float litRaw = dot(n, L);
      float lit = smoothstep(-0.22, 0.58, litRaw);
      lit = lit * lit * (3.0 - 2.0 * lit);
      float m = fbm3d(n * 3.1 + 7.0), m2 = fbm3d(n * 1.6 + 2.0);
      float mare = 0.30 * smoothstep(0.44, 0.66, m) + 0.16 * smoothstep(0.48, 0.72, m2);
      float term = smoothstep(-0.15, 0.15, litRaw) * smoothstep(0.75, 0.35, litRaw);
      float craters = (0.07 + 0.10 * term) * smoothstep(0.50, 0.85, fbm3d(n * 17.0 + 3.0)) + 0.06 * fbm3d(n * 9.0);
      float highland = 0.11 * smoothstep(0.52, 0.72, fbm3d(n * 2.3 + 13.0)) + 0.05 * smoothstep(0.58, 0.80, fbm3d(n * 5.1 + 27.0));
      float detail = 1.0 - mare - craters + highland;
      vec3 daySurf = mix(bg, vec3(0.50, 0.50, 0.52), 0.8);
      vec3 nightSurf = vec3(0.30, 0.29, 0.26) * MGAIN;
      vec3 surf = mix(daySurf, nightSurf, NIGHT) * detail;
      float rim = pow(1.0 - abs(edge), 1.6);
      surf = mix(surf, surf * vec3(1.13, 1.12, 1.09), rim);
      surf = mix(surf, mix(surf, bg, 0.30), (1.0 - rim) * (1.0 - NIGHT));
      float limb = smoothstep(0.0, mix(0.34, 0.24, NIGHT), abs(edge));
      float alpha = smoothstep(0.02, mix(0.16, 0.12, NIGHT), abs(edge)) * lit * (limb * 0.97 + 0.03);
      bg = mix(bg, surf, alpha * (1.0 - cloud * 0.9));
    }
  }

  vec4 m = layerCol(texture(MIDB, uv), bg, 0.32);
  vec3 col = mix(bg, m.rgb, m.a);
  vec4 f = layerCol(texture(FGB, uv), col, 0.22);
  float cov = f.a;
  col = mix(col, f.rgb, cov);
  col += max(bg - 1.15, 0.0) * 0.30 * (1.0 - cov) * (1.0 - m.a);
  col = aces(col * EXPO);
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.88);
  col = col * 0.955 + 0.012 + mix(vec3(0.0074, 0.006, 0.006), vec3(0.0, 0.0015, 0.006), NIGHT) + DUSK * vec3(0.005, 0.002, 0.0);
  float d2 = distance(uv, vec2(0.5));
  col *= 1.0 - smoothstep(0.42, 0.86, d2) * mix(0.15, 0.20, NIGHT);
  float g = hash12(uv * 913.0 + G * 517.0) - 0.5;
  col += g * 0.028 * (1.0 - NIGHT * 0.45) * (0.15 + 0.85 * smoothstep(0.0, 0.1, dot(col, vec3(0.333))));
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

function program(fragSrc, names) {
  var vs = compile(gl.VERTEX_SHADER, VERT);
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

var skyProg = program(SKY, ['R', 'T', 'NIGHT', 'DUSK', 'COVER', 'SHEL', 'SCALE', 'CAM', 'BOX', 'SUN', 'ZEN', 'HOR', 'DMID', 'DFAR', 'GLOW', 'CLIT', 'CSHD', 'LD']);
var bokehProg = program(BOKEH, ['SRC', 'TEXEL', 'RAD', 'BOOST', 'SCALE']);
var compProg = program(COMP, ['SKYB', 'FGB', 'MIDB', 'COVT', 'T', 'G', 'NIGHT', 'DUSK', 'EXPO', 'SCALE', 'MOONR', 'PH', 'MGAIN', 'R', 'CAM', 'BLIT', 'BDRK', 'LL0', 'LL1', 'LL2', 'LD0', 'LD1', 'LD2', 'SUN', 'MOON', 'CTON', 'CTP', 'CTAGE', 'CT', 'METON', 'METP', 'METS', 'METL', 'MET']);
if (!skyProg || !bokehProg || !compProg) return;

var SCALE = HDR ? 1.0 : 0.5;

function layerTex() {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function storage(t, w, h, hdr) {
  gl.bindTexture(gl.TEXTURE_2D, t);
  if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
}

function target(w, h, hdr, withCov) {
  var r = { tex: layerTex(), fbo: gl.createFramebuffer(), w: w, h: h, cov: null };
  storage(r.tex, w, h, hdr);
  gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, r.tex, 0);
  if (withCov) {
    r.cov = layerTex();
    storage(r.cov, w, h, false);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, r.cov, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return r;
}

function drop(r) {
  if (!r) return;
  gl.deleteTexture(r.tex);
  if (r.cov) gl.deleteTexture(r.cov);
  gl.deleteFramebuffer(r.fbo);
}

var skyT = null, skyB = null, fgB = null, midB = null;
var fgTex = layerTex();
var midTex = layerTex();
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

var fg = document.createElement('canvas');
var fgctx = fg.getContext('2d');
var mid = document.createElement('canvas');
var midctx = mid.getContext('2d');

/* ------------------------------------------------------------ the oak */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seg(ctx, x0, y0, cx, cy, x1, y1, wid, lx, ly) {
  var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  var nx = -dy / len, ny = dx / len;
  var s = (nx * lx + ny * ly) >= 0 ? 1 : -1;
  if (wid >= 2.2) {
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, hw = wid / 2;
    var gr = ctx.createLinearGradient(mx + nx * s * hw, my + ny * s * hw, mx - nx * s * hw, my - ny * s * hw);
    gr.addColorStop(0, 'rgb(235,0,0)');
    gr.addColorStop(0.45, 'rgb(120,0,0)');
    gr.addColorStop(1, 'rgb(28,0,0)');
    ctx.strokeStyle = gr;
  } else {
    ctx.strokeStyle = 'rgb(110,0,0)';
  }
  ctx.lineWidth = Math.max(wid, 1.0);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  if (wid >= 4) {
    ctx.strokeStyle = 'rgb(40,0,0)';
    ctx.lineWidth = Math.max(wid * 0.09, 0.7);
    ctx.globalAlpha = 0.45;
    for (var k = -1; k <= 1; k += 2) {
      var o = k * wid * 0.22;
      ctx.beginPath();
      ctx.moveTo(x0 + nx * o, y0 + ny * o);
      ctx.quadraticCurveTo(cx + nx * o, cy + ny * o, x1 + nx * o, y1 + ny * o);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function leafWidth(t, size, k) {
  var env = Math.pow(t, 0.5) * Math.pow(1 - t, 0.45) / 0.52;
  var lobe = 0.62 + 0.38 * Math.pow(Math.abs(Math.sin(Math.PI * (4.0 + k) * t + k * 2.0)), 0.6);
  return size * 0.62 * env * lobe;
}

function drawLeaf(ctx, x, y, size, rot, hue, lx, ly, k, squash, shade) {
  var facing = Math.cos(rot) * lx + Math.sin(rot) * ly;
  var lit = (0.5 + 0.5 * facing) * (shade === undefined ? 1 : shade);
  var b = Math.round(hue * 255);
  var side = (-Math.sin(rot) * lx + Math.cos(rot) * ly) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, squash);
  ctx.strokeStyle = 'rgb(70,0,0)';
  ctx.lineWidth = Math.max(size * 0.07, 0.7);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size * 1.3, 0);
  ctx.stroke();
  var w = size * 0.62;
  var gr = ctx.createLinearGradient(0, -w * side, 0, w * side);
  gr.addColorStop(0, 'rgb(' + Math.round(70 + 165 * lit) + ',255,' + b + ')');
  gr.addColorStop(1, 'rgb(' + Math.round(30 + 90 * lit) + ',255,' + b + ')');
  ctx.fillStyle = gr;
  ctx.beginPath();
  var n = 32, i, t;
  ctx.moveTo(-size, 0);
  for (i = 1; i <= n; i++) { t = i / n; ctx.lineTo(-size + 2 * size * t, -leafWidth(t, size, k)); }
  for (i = n - 1; i >= 1; i--) { t = i / n; ctx.lineTo(-size + 2 * size * t, leafWidth(t, size, k)); }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgb(' + Math.round(40 + 70 * lit) + ',255,' + b + ')';
  ctx.lineWidth = Math.max(size * 0.045, 0.5);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size * 0.9, 0);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function makeCluster(size, n, rnd, lx, ly) {
  var cs = Math.ceil(size * 6.5);
  var c = document.createElement('canvas');
  c.width = cs; c.height = cs;
  var ctx = c.getContext('2d');
  for (var i = 0; i < n; i++) {
    var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * size * 2.0;
    var depth = 0.35 + 0.65 * (i / Math.max(1, n - 1));
    drawLeaf(ctx, cs / 2 + Math.cos(a) * r, cs / 2 + Math.sin(a) * r, size * (0.7 + 0.6 * rnd()), rnd() * Math.PI * 2, rnd(), lx, ly, rnd(), 0.75 + 0.25 * rnd(), depth);
  }
  return { c: c, cs: cs };
}

function oak(ctx, x, y, ang, len, wid, depth, rnd, lx, ly, leafSize, out, lf) {
  if (depth <= 0 || len < 2) return;
  var bend = (rnd() - 0.5) * 0.9;
  var ex = x + Math.cos(ang) * len, ey = y - Math.sin(ang) * len;
  var cx = x + Math.cos(ang + bend) * len * 0.5, cy = y - Math.sin(ang + bend) * len * 0.5;
  seg(ctx, x, y, cx, cy, ex, ey, wid, lx, ly);
  var nSide = depth > 4 ? (rnd() < 0.7 ? 1 : 2) : (rnd() < 0.55 ? 1 : 0);
  for (var i = 0; i < nSide; i++) {
    var t = 0.3 + rnd() * 0.6, s = 1 - t;
    var px = s * s * x + 2 * s * t * cx + t * t * ex;
    var py = s * s * y + 2 * s * t * cy + t * t * ey;
    var side = rnd() < 0.5 ? 1 : -1;
    oak(ctx, px, py, ang + side * (0.6 + rnd() * 0.7), len * (0.5 + rnd() * 0.3), wid * 0.6, depth - 1, rnd, lx, ly, leafSize, out, lf);
  }
  var next = ang + bend * 0.7 + (rnd() - 0.5) * 0.8;
  oak(ctx, ex, ey, next, len * (0.72 + rnd() * 0.16), wid * 0.78, depth - 1, rnd, lx, ly, leafSize, out, lf);
  if (depth <= 3) {
    out.push({ x: ex, y: ey, sprite: makeCluster(leafSize * (0.8 + 0.4 * rnd()), Math.max(3, Math.round((7 + rnd() * 7) * lf)), rnd, lx, ly), ph: rnd() * 6.2832 });
  }
}

var sets = { day: null, dusk: null, night: null };
var leaves = [];
var lightNow = [-0.85, 0.5];
var LEAF_N = { near: 5, mid: 14 };

function buildForeground(lx, ly) {
  var w = fg.width, h = fg.height;
  var portrait = h > w;
  var d = Math.min(h, w * 0.9) * (portrait ? 0.72 : 1);
  var lean = portrait ? -0.1 : 0;
  var rnd = mulberry32(20261031);
  var clusters = [];
  var specs = [
    [w * 1.05, h * 0.50, Math.PI * (0.85 + lean), d * 0.20, d * 0.030, 7],
    [w * 0.95, h * 1.05, Math.PI * (0.62 - lean), d * 0.17, d * 0.026, 7],
    [w * 1.02, h * 0.08, Math.PI * (1.18 - lean), d * 0.13, d * 0.018, 6]
  ];
  var systems = specs.map(function (sp, i) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var out = [];
    oak(ctx, sp[0], sp[1], sp[2], sp[3], sp[4], sp[5], rnd, lx, ly, d * 0.012, out, 1);
    out.forEach(function (cl) { cl.sys = i; clusters.push(cl); });
    return { c: c, ax: sp[0], ay: sp[1], k: 1 + 0.3 * i, ph: i * 1.7 };
  });
  var tc = document.createElement('canvas');
  tc.width = w; tc.height = h;
  var tctx = tc.getContext('2d');
  tctx.lineCap = 'round';
  tctx.lineJoin = 'round';
  var tout = [];
  var dd = Math.min(h, w * 0.9);
  oak(tctx, -w * 0.02, h * 0.82, Math.PI * 0.08, dd * 0.11, dd * 0.011, 4, rnd, lx, ly, dd * 0.008, tout, 0.45);
  return { systems: systems, clusters: clusters, twig: { c: tc, clusters: tout, ax: -w * 0.02, ay: h * 0.82 } };
}

function ensureSet(name) {
  if (!sets[name]) {
    var ls = lightScreen(LOOKS[name]);
    sets[name] = buildForeground(ls[0], ls[1]);
  }
  return sets[name];
}

var prebuild = 0;

function scheduleSets() {
  if (prebuild) clearTimeout(prebuild);
  prebuild = setTimeout(function () {
    prebuild = 0;
    var missing = ['day', 'dusk', 'night'].filter(function (n) { return !sets[n]; });
    if (!missing.length) return;
    ensureSet(missing[0]);
    scheduleSets();
  }, 350);
}

function seedLeaves() {
  leaves = [];
  var r2 = mulberry32(20261101);
  for (var n = 0; n < LEAF_N.near + LEAF_N.mid; n++) leaves.push(spawn({ layer: n < LEAF_N.near ? 'near' : 'mid' }, r2, true));
}

/* ------------------------------------------------------------- leaves */

function spawn(lf, rnd, anywhere) {
  var w = fg.width, h = fg.height;
  var d = Math.min(h, w * 0.9);
  if (anywhere) {
    lf.x = w * (rnd() * 1.2 - 0.1);
    lf.y = h * (rnd() * 1.1 - 0.1);
  } else if (rnd() < 0.55) {
    lf.x = w * (rnd() * 1.5 - 0.15);
    lf.y = -h * (0.08 + rnd() * 0.3);
  } else {
    lf.x = w * (1.03 + rnd() * 0.15);
    lf.y = h * (rnd() * 0.7 - 0.1);
  }
  lf.size = d * (lf.layer === 'near' ? 0.026 : 0.016) * (0.75 + 0.5 * rnd());
  lf.hue = rnd();
  lf.k = rnd();
  lf.rot = rnd() * Math.PI * 2;
  lf.spin = (rnd() - 0.5) * 3.0;
  lf.tw = 0;
  lf.twTotal = 0;
  lf.twDir = 1;
  lf.twAt = 4 + 18 * rnd();
  lf.ph = rnd() * Math.PI * 2;
  lf.fall = h * (lf.layer === 'near' ? 0.085 : 0.06) * (0.8 + 0.4 * rnd());
  lf.vx = 0;
  lf.vy = 0;
  lf.side = 0.5 + rnd();
  lf.age = anywhere ? 1 : 0;
  return lf;
}

var leafRnd = mulberry32(7);

function stepLeaves(t, dt) {
  var w = fg.width, h = fg.height;
  var gust = 0.5 + 0.5 * Math.sin(t * 0.37) + 0.25 * Math.sin(t * 1.1 + 2.0);
  for (var i = 0; i < leaves.length; i++) {
    var lf = leaves[i];
    var near = lf.layer === 'near' ? 1.4 : 1.0;
    var flutter = Math.sin(t * 2.6 + lf.ph);
    var twirling = lf.tw > 0;
    lf.vx = -(w * (0.04 + 0.05 * gust) * near + w * 0.025 * flutter * lf.side * (twirling ? 1.6 : 1.0));
    lf.vy = lf.fall * (0.75 + 0.35 * Math.sin(t * 3.1 + lf.ph * 1.3)) * (twirling ? 0.8 : 1.0);
    lf.x += lf.vx * dt;
    lf.y += lf.vy * dt;
    if (twirling) {
      var step = 7.5 * dt;
      lf.rot += lf.twDir * step;
      lf.tw -= step;
      if (lf.tw <= 0) { lf.tw = 0; lf.twAt = lf.age + 10 + 16 * leafRnd(); }
    } else {
      lf.rot += (lf.spin + 1.5 * flutter) * dt;
      if (lf.age > lf.twAt) {
        lf.twTotal = Math.PI * 2 * (leafRnd() < 0.55 ? 1 : 2);
        lf.tw = lf.twTotal;
        lf.twDir = leafRnd() < 0.5 ? -1 : 1;
      }
    }
    lf.age += dt;
    if (lf.y > h * 1.1 || lf.x < -w * 0.1) spawn(lf, leafRnd, false);
  }
}

function drawLeaves(ctx, layer, t, px, py) {
  for (var i = 0; i < leaves.length; i++) {
    var lf = leaves[i];
    if (lf.layer !== layer) continue;
    var fade = Math.min(1, lf.age / 0.6);
    var squash = lf.tw > 0 ? 0.2 + 0.8 * Math.abs(Math.cos(lf.twTotal - lf.tw)) : 0.72 + 0.28 * Math.abs(Math.cos(t * 1.7 + lf.ph));
    ctx.globalAlpha = fade * 0.35;
    drawLeaf(ctx, lf.x + px - lf.vx * 0.02, lf.y + py - lf.vy * 0.02, lf.size, lf.rot, lf.hue, lightNow[0], lightNow[1], lf.k, squash);
    ctx.globalAlpha = fade;
    drawLeaf(ctx, lf.x + px, lf.y + py, lf.size, lf.rot, lf.hue, lightNow[0], lightNow[1], lf.k, squash);
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------- foreground */

function drawSet(set, alpha, t, px, py) {
  var w = fg.width, h = fg.height;
  fgctx.globalAlpha = alpha;
  var sways = set.systems.map(function (sy) {
    return (Math.sin(t * 0.35 + sy.ph) * 0.006 + Math.sin(t * 0.9 + sy.ph * 2.0) * 0.002) * sy.k;
  });
  var i, sy, cl, cs, ca, sa, rx, ry;
  for (i = 0; i < set.systems.length; i++) {
    sy = set.systems[i];
    fgctx.save();
    fgctx.translate(sy.ax + px, sy.ay + py);
    fgctx.rotate(sways[i]);
    fgctx.translate(-sy.ax, -sy.ay);
    fgctx.drawImage(sy.c, 0, 0);
    fgctx.restore();
  }
  for (i = 0; i < set.clusters.length; i++) {
    cl = set.clusters[i];
    sy = set.systems[cl.sys];
    ca = Math.cos(sways[cl.sys]); sa = Math.sin(sways[cl.sys]);
    rx = sy.ax + (cl.x - sy.ax) * ca - (cl.y - sy.ay) * sa;
    ry = sy.ay + (cl.x - sy.ax) * sa + (cl.y - sy.ay) * ca;
    var burst = 0.5 + 0.5 * Math.sin(t * 0.55 - (cl.x + cl.y) * 0.004 + cl.ph);
    var amp = cl.sprite.cs * 0.022 * (0.25 + 0.75 * burst);
    cs = cl.sprite.cs;
    fgctx.save();
    fgctx.translate(rx + px + amp * Math.sin(t * (2.2 + cl.ph * 0.3) + cl.ph), ry + py + amp * 0.6 * Math.sin(t * 3.1 + cl.ph * 2.0));
    fgctx.rotate(sways[cl.sys] + 0.06 * burst * Math.sin(t * 1.7 + cl.ph));
    fgctx.drawImage(cl.sprite.c, -cs / 2, -cs / 2);
    fgctx.restore();
  }
  fgctx.globalAlpha = 1;

  var twig = set.twig;
  var tsway = Math.sin(t * 0.5 + 0.7) * 0.004;
  midctx.globalAlpha = alpha;
  midctx.save();
  midctx.translate(twig.ax + px * 0.5, twig.ay + py * 0.5);
  midctx.rotate(tsway);
  midctx.translate(-twig.ax, -twig.ay);
  midctx.drawImage(twig.c, 0, 0);
  midctx.restore();
  ca = Math.cos(tsway); sa = Math.sin(tsway);
  for (i = 0; i < twig.clusters.length; i++) {
    cl = twig.clusters[i];
    rx = twig.ax + (cl.x - twig.ax) * ca - (cl.y - twig.ay) * sa;
    ry = twig.ay + (cl.x - twig.ax) * sa + (cl.y - twig.ay) * ca;
    cs = cl.sprite.cs;
    midctx.save();
    midctx.translate(rx + px * 0.5 + cs * 0.015 * Math.sin(t * 2.4 + cl.ph), ry + py * 0.5 + cs * 0.01 * Math.sin(t * 3.3 + cl.ph));
    midctx.rotate(tsway + 0.04 * Math.sin(t * 1.9 + cl.ph));
    midctx.drawImage(cl.sprite.c, -cs / 2, -cs / 2);
    midctx.restore();
  }
  midctx.globalAlpha = 1;
}

function drawForeground(t, px, py, from, to, k) {
  var w = fg.width, h = fg.height;
  fgctx.clearRect(0, 0, w, h);
  midctx.clearRect(0, 0, w, h);
  drawSet(sets[from], 1, t, px, py);
  if (to !== from && k > 0) drawSet(ensureSet(to), k, t, px, py);
  drawLeaves(fgctx, 'near', t, px, py);
  drawLeaves(midctx, 'mid', t, px * 0.5, py * 0.5);
  gl.bindTexture(gl.TEXTURE_2D, fgTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fg);
  gl.bindTexture(gl.TEXTURE_2D, midTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mid);
}

/* ----------------------------------------------------- sky events */

var jet = { on: false, a: [0, 0], b: [0, 0], t0: 0, dur: 45, next: 25 };
var meteor = { on: false, a: [0, 0], d: [0, 0], t0: 0, life: 0.7, speed: 0.3, next: 8, again: 0 };
var evRnd = mulberry32(31);

function stepEvents(t, w) {
  if (!jet.on && w.n < 0.5 && t > jet.next) {
    var ltr = evRnd() < 0.5;
    var el0 = 0.29 + evRnd() * 0.04, el1 = el0 + (evRnd() - 0.5) * 0.04;
    jet.a = [ltr ? -0.34 : 0.34, el0];
    jet.b = [ltr ? 0.34 : -0.34, el1];
    jet.t0 = t;
    jet.dur = 40 + 25 * evRnd();
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
    meteor.a = [(evRnd() - 0.5) * 0.5, 0.2 + evRnd() * 0.2];
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
  return [0, 1, 2].map(function (i) { return a[i] * w.d + b[i] * w.u + c[i] * w.n; });
}

function blendLeaf(hue, which, w) {
  var a = LEAF.day[hue][which], b = LEAF.dusk[hue][which], c = LEAF.night[hue][which];
  return [0, 1, 2].map(function (i) { return a[i] * w.d + b[i] * w.u + c[i] * w.n; });
}

function sunDir(w) {
  var day = [-0.439, 0.643, 0.627], dusk = [-0.422, -0.026, 0.906];
  return norm3([0, 1, 2].map(function (i) { return day[i] * w.d + dusk[i] * w.u + MOON[i] * w.n; }));
}

function lightScreen(w) {
  var v = [-0.6 * w.d - 0.85 * w.u + 0.7 * w.n, -0.8 * w.d + 0.5 * w.u - 0.7 * w.n];
  var l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}

/* --------------------------------------------------------------- state */

var look = 'dusk', prev = 'dusk', tr = null;
var wCur = { d: 0, u: 1, n: 0 }, wFrom = wCur;
var mx = 0, my = 0, tx = 0, ty = 0;
var running = false, raf = 0, last = 0, frameNo = 0;
var visible = !document.hidden, inView = true;
var box = [0, 0, 0, 0];

function setLook(name, instant) {
  look = name;
  buttons.forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-look') === name));
  });
  hero.style.backgroundColor = FLAT[name];
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME[name]);
  if (instant || reduced.matches || name === prev) {
    prev = name;
    wCur = { d: LOOKS[name].d, u: LOOKS[name].u, n: LOOKS[name].n };
    tr = null;
  } else {
    wFrom = { d: wCur.d, u: wCur.u, n: wCur.n };
    tr = { t0: performance.now(), dur: 1500 };
  }
  if (fg.width > 1) ensureSet(name);
  wake();
}

function measure() {
  if (!words) return;
  var hr = hero.getBoundingClientRect(), wr = words.getBoundingClientRect();
  if (!hr.width || !hr.height) return;
  var px = 0.07 * hr.height, py = 0.05 * hr.height;
  box = [
    (wr.left - hr.left - px) / hr.width,
    1 - (wr.bottom - hr.top + py) / hr.height,
    (wr.right - hr.left + px) / hr.width,
    1 - (wr.top - hr.top - py) / hr.height
  ];
}

function u3(loc, v) { gl.uniform3f(loc, v[0], v[1], v[2]); }

function bokeh(src, texelW, texelH, dst, rad, boost) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
  gl.viewport(0, 0, dst.w, dst.h);
  gl.bindTexture(gl.TEXTURE_2D, src);
  gl.uniform2f(bokehProg.u.TEXEL, 1 / texelW, 1 / texelH);
  gl.uniform1f(bokehProg.u.RAD, rad);
  gl.uniform1f(bokehProg.u.BOOST, boost);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function draw(now) {
  var k = 1;
  if (tr) {
    k = Math.min(1, (now - tr.t0) / tr.dur);
    k = k * k * (3 - 2 * k);
    var to = LOOKS[look];
    wCur = { d: wFrom.d + (to.d - wFrom.d) * k, u: wFrom.u + (to.u - wFrom.u) * k, n: wFrom.n + (to.n - wFrom.n) * k };
    if (k >= 1) { tr = null; prev = look; }
  }
  var still = reduced.matches;
  var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  var l = still ? 1 : 1 - Math.exp(-(now - last) / 160);
  mx += (tx - mx) * l;
  my += (ty - my) * l;
  var t = still ? 1000 : now / 1000;
  var w = wCur;
  lightNow = lightScreen(w);
  var sun = sunDir(w);
  var ld = [sun[0], sun[2]];
  var ll = Math.hypot(ld[0], ld[1]) || 1;
  ld = [ld[0] / ll, ld[1] / ll];
  var aspect = canvas.width / canvas.height;
  var tanH = Math.tan(FOV / 2);
  var cam = [tanH * aspect, tanH, PITCH + my * 0.008 + (still ? 0 : 0.0025 * Math.sin(t * 0.23)), mx * 0.010 + (still ? 0 : 0.003 * Math.sin(t * 0.17 + 1.0))];

  if (!still) { stepLeaves(t, dt); stepEvents(t, w); }
  drawForeground(still ? 0 : t, -mx * fg.width * 0.012, my * fg.height * 0.012, tr ? prev : look, look, tr ? k : 1);
  var jp = jet.on ? (t - jet.t0) / jet.dur : 0;
  var mp = meteor.on ? Math.min(1, (t - meteor.t0) / meteor.life) : 0;

  gl.bindFramebuffer(gl.FRAMEBUFFER, skyT.fbo);
  gl.viewport(0, 0, skyT.w, skyT.h);
  gl.useProgram(skyProg.p);
  var u = skyProg.u;
  gl.uniform2f(u.R, skyT.w, skyT.h);
  gl.uniform1f(u.T, t);
  gl.uniform1f(u.NIGHT, w.n);
  gl.uniform1f(u.DUSK, w.u);
  gl.uniform1f(u.COVER, blend('cover', w));
  gl.uniform1f(u.SHEL, 0.30);
  gl.uniform1f(u.SCALE, SCALE);
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  gl.uniform4f(u.BOX, box[0], box[1], box[2], box[3]);
  u3(u.SUN, sun);
  u3(u.ZEN, blend('zen', w));
  u3(u.HOR, blend('hor', w));
  u3(u.DMID, blend('dmid', w));
  u3(u.DFAR, blend('dfar', w));
  u3(u.GLOW, blend('glow', w));
  u3(u.CLIT, blend('clit', w));
  u3(u.CSHD, blend('cshd', w));
  gl.uniform2f(u.LD, ld[0], ld[1]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.useProgram(bokehProg.p);
  gl.uniform1i(bokehProg.u.SRC, 0);
  gl.uniform1f(bokehProg.u.SCALE, SCALE);
  gl.activeTexture(gl.TEXTURE0);
  bokeh(skyT.tex, skyT.w, skyT.h, skyB, 4.5, 1.0);
  bokeh(fgTex, fg.width, fg.height, fgB, 6.5, 0.0);
  bokeh(midTex, mid.width, mid.height, midB, 1.7, 0.0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(compProg.p);
  u = compProg.u;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, skyB.tex);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fgB.tex);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, midB.tex);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, skyT.cov);
  gl.uniform1i(u.SKYB, 0);
  gl.uniform1i(u.FGB, 1);
  gl.uniform1i(u.MIDB, 2);
  gl.uniform1i(u.COVT, 3);
  gl.uniform1f(u.G, still ? 0.37 : (frameNo++ % 977) * 0.013);
  gl.uniform1f(u.T, t);
  gl.uniform2f(u.R, canvas.width, canvas.height);
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  gl.uniform1f(u.NIGHT, w.n);
  gl.uniform1f(u.DUSK, w.u);
  gl.uniform1f(u.EXPO, blend('expo', w));
  gl.uniform1f(u.SCALE, SCALE);
  gl.uniform1f(u.MOONR, MOON_R);
  gl.uniform1f(u.PH, P);
  gl.uniform1f(u.MGAIN, blend('mgain', w));
  u3(u.SUN, sun);
  u3(u.MOON, MOON);
  gl.uniform1f(u.CTON, jet.on ? 1 : 0);
  gl.uniform1f(u.CTP, jp);
  gl.uniform1f(u.CTAGE, jet.dur);
  gl.uniform4f(u.CT, jet.a[0], jet.a[1], jet.b[0], jet.b[1]);
  gl.uniform1f(u.METON, meteor.on ? 1 : 0);
  gl.uniform1f(u.METP, mp);
  gl.uniform1f(u.METS, meteor.speed);
  gl.uniform1f(u.METL, meteor.life);
  gl.uniform4f(u.MET, meteor.a[0], meteor.a[1], meteor.d[0], meteor.d[1]);
  u3(u.BLIT, blend('blit', w));
  u3(u.BDRK, blend('bdrk', w));
  for (var li = 0; li < 3; li++) {
    u3(u['LL' + li], blendLeaf(li, 0, w));
    u3(u['LD' + li], blendLeaf(li, 1, w));
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  canvas.classList.add('drawn');
}

function frame(now) {
  raf = 0;
  if (!running) return;
  var busy = tr || meteor.on || Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002;
  if (now - last >= (busy ? 0 : 30)) { draw(now); last = now; }
  raf = requestAnimationFrame(frame);
}

function wake() {
  if (!skyT) return;
  if (reduced.matches) { draw(performance.now()); return; }
  if (!running && visible && inView) {
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function sleep() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

function resize() {
  var w = hero.clientWidth, h = hero.clientHeight;
  if (!w || !h) return;
  var scale = Math.min(window.devicePixelRatio || 1, 1.5);
  if (w * scale > 2000) scale = 2000 / w;
  var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
    var hw = Math.max(1, Math.round(cw * HALF)), hh = Math.max(1, Math.round(ch * HALF));
    var sw = Math.max(1, Math.round(cw * SKY_RES)), sh = Math.max(1, Math.round(ch * SKY_RES));
    drop(skyT); drop(skyB); drop(fgB); drop(midB);
    skyT = target(sw, sh, HDR, true);
    skyB = target(hw, hh, HDR, false);
    fgB = target(hw, hh, false, false);
    midB = target(hw, hh, false, false);
    fg.width = hw;
    fg.height = hh;
    mid.width = hw;
    mid.height = hh;
    sets = { day: null, dusk: null, night: null };
    seedLeaves();
    ensureSet(look);
    if (tr) ensureSet(prev);
    scheduleSets();
  }
  measure();
  draw(performance.now());
  if (!reduced.matches) wake();
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
  tx = ((ev.clientX - r.left) / r.width - 0.5) * 2;
  ty = ((ev.clientY - r.top) / r.height - 0.5) * -2;
  wake();
});

hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; wake(); });

document.addEventListener('visibilitychange', function () {
  visible = !document.hidden;
  if (visible) wake(); else sleep();
});

if ('IntersectionObserver' in window) {
  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    if (inView) wake(); else sleep();
  }, { threshold: 0.01 }).observe(hero);
}

if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
else addEventListener('resize', resize);

reduced.addEventListener('change', function () { sleep(); resize(); });

canvas.addEventListener('webglcontextlost', function (ev) {
  ev.preventDefault();
  sleep();
  canvas.classList.remove('drawn');
});

canvas.addEventListener('webglcontextrestored', function () { location.reload(); });

var initial = 'dusk';
try { initial = sessionStorage.getItem('look') || initial; } catch (err) {}
try { initial = new URLSearchParams(location.search).get('look') || initial; } catch (err) {}
if (!LOOKS[initial]) initial = 'day';
document.documentElement.classList.add('sky');
setLook(initial, true);
resize();

})();
