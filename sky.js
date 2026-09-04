/* 0mattias.github.io · the sky
   An autumn oak against the sky, photographed rather than drawn: a
   21-degree lens looks up through the crown at a cloud deck lit from
   the sun's side, a moon at tonight's real phase that dissolves into
   the sky on its shadow side, stars once it is dark. The oak is grown
   by a small L-system and hung with russet, orange and gold; its
   leaves let go and tumble down on the wind, the near ones soft, the
   mid ones passing through focus. Sky, near foliage and falling
   leaves render to their own targets, each is defocused through a
   72-tap bokeh disc (bright spots bloom), then composited under an
   ACES grade, a vignette and film grain. Three looks: the page opens
   on the sunset, and the dots at the bottom left move the sun.
   WebGL2, no libraries, no build step. */

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

var SKY_RES = 0.4;    // sky pass, as a fraction of the canvas
var HALF = 0.5;       // bokeh targets and the branch layer
var FOV = 21 * Math.PI / 180;
var PITCH = 14 * Math.PI / 180;
var MOON_R = 2.05 * Math.PI / 180;

var LOOKS = { day: 0.5, dusk: 0.76, night: 1.0 };
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
    zen: scene('#5482bd'), hor: scene('#a9bfd8'), dmid: scene('#e2b598'), dfar: scene('#b6a8bf'),
    glow: [0.9, 0.85, 0.7], clit: [1.18, 1.16, 1.12], cshd: scene('#8298b8'),
    blit: scene('#7a6b5c'), bdrk: scene('#1e1916'),
    leaf: [['#b5502e', '#5a2314'], ['#e08a3a', '#7a4218'], ['#e6be4a', '#8a6a1e']],
    cover: 0.6, expo: 1.0, mgain: 1.0
  },
  dusk: {
    zen: scene('#5e6fae'), hor: scene('#e8a97a'), dmid: scene('#f19a55'), dfar: scene('#b48aa8'),
    glow: [1.0, 0.55, 0.28], clit: [1.2, 0.86, 0.62], cshd: scene('#8c7a9c'),
    blit: scene('#7d5a45'), bdrk: scene('#1a1210'),
    leaf: [['#c8502a', '#4a1c10'], ['#f08a3c', '#6b3312'], ['#f2c04e', '#7a5a18']],
    cover: 0.5, expo: 1.0, mgain: 1.0
  },
  night: {
    zen: scene('#0a1024'), hor: scene('#1b2439'), dmid: scene('#1e2740'), dfar: scene('#141b30'),
    glow: [0.33, 0.37, 0.48], clit: scene('#6d7896'), cshd: scene('#0b0f1e'),
    blit: scene('#252a3c'), bdrk: scene('#030407'),
    leaf: [['#3a2a30', '#0a0608'], ['#4a3a3a', '#0d0909'], ['#4d4534', '#0f0d08']],
    cover: 0.6, expo: 1.0, mgain: 1.0
  }
};

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
out vec4 o;
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
`;

var SKY = HEAD + `
uniform vec2 R;
uniform float T, NIGHT, DUSK, MOONR, PH, COVER, SHEL, MGAIN, SCALE;
uniform vec4 CAM, BOX;
uniform vec3 SUN, MOON, ZEN, HOR, DMID, DFAR, GLOW, CLIT, CSHD;
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
  col *= 1.0 + 0.011 * sin(dir.x * 4.1 + dir.y * 6.3) * sin(dir.y * 3.7 - dir.x * 2.3)
             + 0.006 * sin(dir.x * 11.0) * sin(dir.y * 9.0);
  return col;
}

float cloudField(vec2 p, vec2 drift, float seed) {
  float base = fbm5(p * 3.2 + drift + seed);
  float fine = 0.16 * (fbm5(p * 5.5 - drift * 1.4 + 4.0 + seed) - 0.5);
  float billow = 1.0 - abs(2.0 * fbm3(p * 11.0 + drift * 0.6 + 9.0 + seed) - 1.0);
  float grain = 0.06 * (fbm3(p * 26.0 + drift * 0.3 + 23.0 + seed) - 0.5);
  return 0.48 + (base - 0.48) * 1.35 + fine + 0.14 * (billow - 0.5) + grain;
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
  float dens = smoothstep(th, th + 0.18, f);
  if (dens <= 0.0) return vec4(0.0);
  float thick = smoothstep(th + 0.10, th + 0.45, f);
  float fl = cloudField(p + LD * 0.045, drift, seed);
  float shade = clamp(0.5 + (f - fl) * 9.0, 0.0, 1.0);
  shade = shade * shade * (3.0 - 2.0 * shade);
  vec3 col = mix(CSHD, CLIT, shade);
  col = mix(col, CSHD * 0.8, thick * 0.5 * (1.0 - shade));
  float fringe = dens * (1.0 - thick);
  col += CLIT * fringe * shade * 0.35;
  float gm = pow(max(dot(dir, SUN), 0.0), mix(24.0, 48.0, NIGHT));
  col += GLOW * gm * mix(0.55, 0.50, NIGHT) * (1.0 - thick * 0.8) * (1.0 - 0.7 * DUSK);
  return vec4(col, min(dens + fringe * 0.5, 1.0));
}

void main() {
  vec2 p = uv * 2.0 - 1.0;
  vec3 d = normalize(vec3(p.x * CAM.x, p.y * CAM.y, 1.0));
  float cp = cos(CAM.z), sp = sin(CAM.z);
  vec3 dir = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(CAM.w), sy = sin(CAM.w);
  dir = vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy);

  vec3 col = skyColor(dir);

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
      vec3 daySurf = mix(col, vec3(0.50, 0.50, 0.52), 0.8);
      vec3 nightSurf = vec3(0.30, 0.29, 0.26) * MGAIN;
      vec3 surf = mix(daySurf, nightSurf, NIGHT) * detail;
      float rim = pow(1.0 - abs(edge), 1.6);
      surf = mix(surf, surf * vec3(1.13, 1.12, 1.09), rim);
      surf = mix(surf, mix(surf, col, 0.30), (1.0 - rim) * (1.0 - NIGHT));
      float limb = smoothstep(0.0, mix(0.34, 0.24, NIGHT), abs(edge));
      float alpha = smoothstep(0.02, mix(0.16, 0.12, NIGHT), abs(edge)) * lit * (limb * 0.97 + 0.03);
      col = mix(col, surf, alpha);
    }
  }

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
    col = mix(col, far.rgb, far.a * 0.6);
    col = mix(col, near.rgb, near.a);
  }
  o = vec4(col * SCALE, 1.0);
}`;

var BOKEH = HEAD + `
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
uniform sampler2D SKYB, FGB, MIDB;
uniform float T, G, NIGHT, DUSK, EXPO, SCALE;
uniform vec2 R;
uniform vec4 CAM;
uniform vec3 BLIT, BDRK, LL0, LL1, LL2, LD0, LD1, LD2, SUN;
vec3 leafCol(float hue, float lit) {
  vec3 l = hue < 0.5 ? mix(LL0, LL1, hue * 2.0) : mix(LL1, LL2, hue * 2.0 - 1.0);
  vec3 d = hue < 0.5 ? mix(LD0, LD1, hue * 2.0) : mix(LD1, LD2, hue * 2.0 - 1.0);
  return mix(d, l, lit);
}
vec4 layerCol(vec4 t, vec3 bg) {
  float cov = clamp(t.a, 0.0, 1.0);
  float lit = clamp(t.r / max(t.a, 1e-4), 0.0, 1.0);
  float leaf = clamp(t.g / max(t.a, 1e-4), 0.0, 1.0);
  float hue = clamp(t.b / max(t.a, 1e-4), 0.0, 1.0);
  vec3 c = mix(mix(BDRK, BLIT, lit), leafCol(hue, lit), leaf);
  c += bg * 0.22 * (1.0 - cov);
  return vec4(c, cov);
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float hash3(vec3 p) {
  uvec3 q = uvec3(ivec3(floor(p))) * uvec3(1597334673u, 3812015801u, 2798796415u);
  uint n = (q.x ^ q.y ^ q.z) * 1597334673u;
  return float(n) * (1.0 / 4294967295.0);
}
void main() {
  vec4 bgB = texture(SKYB, uv);
  vec3 bg = bgB.rgb / max(bgB.a, 1e-4) / SCALE;

  if (NIGHT > 0.001) {
    vec2 p = uv * 2.0 - 1.0;
    vec3 d = normalize(vec3(p.x * CAM.x, p.y * CAM.y, 1.0));
    float cp = cos(CAM.z), sp = sin(CAM.z);
    vec3 dir = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
    float cy = cos(CAM.w), sy = sin(CAM.w);
    dir = vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy);
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
    float dark = smoothstep(0.09, 0.025, dot(bg, vec3(0.3333)));
    bg += mix(vec3(0.78, 0.85, 1.0), vec3(1.0, 0.95, 0.85), fract(hs * 9.1))
        * star * bright * NIGHT * dark * smoothstep(-0.02, 0.2, dir.y) * (1.0 - g * 0.85);
  }
  vec4 m = layerCol(texture(MIDB, uv), bg);
  vec3 col = mix(bg, m.rgb, m.a);
  vec4 f = layerCol(texture(FGB, uv), col);
  float cov = f.a;
  col = mix(col, f.rgb, cov);
  col += max(bg - 1.15, 0.0) * 0.30 * (1.0 - cov) * (1.0 - m.a);
  col = aces(col * EXPO);
  col = col * 0.972 + mix(vec3(0.0074, 0.006, 0.006), vec3(0.0, 0.0015, 0.006), NIGHT) + DUSK * vec3(0.005, 0.002, 0.0);
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

var skyProg = program(SKY, ['R', 'T', 'NIGHT', 'DUSK', 'MOONR', 'PH', 'COVER', 'SHEL', 'MGAIN', 'SCALE', 'CAM', 'BOX', 'SUN', 'MOON', 'ZEN', 'HOR', 'DMID', 'DFAR', 'GLOW', 'CLIT', 'CSHD', 'LD']);
var bokehProg = program(BOKEH, ['SRC', 'TEXEL', 'RAD', 'BOOST', 'SCALE']);
var compProg = program(COMP, ['SKYB', 'FGB', 'MIDB', 'T', 'G', 'NIGHT', 'DUSK', 'EXPO', 'SCALE', 'R', 'CAM', 'BLIT', 'BDRK', 'LL0', 'LL1', 'LL2', 'LD0', 'LD1', 'LD2', 'SUN']);
if (!skyProg || !bokehProg || !compProg) return;

var SCALE = HDR ? 1.0 : 0.5;

function target(w, h, hdr) {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  var f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex: t, fbo: f, w: w, h: h };
}

var skyT = null, skyB = null, fgB = null, midB = null;

function layerTex() {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

var fgTex = layerTex();
var midTex = layerTex();
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

var fg = document.createElement('canvas');
var fgctx = fg.getContext('2d');
var mid = document.createElement('canvas');
var midctx = mid.getContext('2d');

/* ------------------------------------------------------------ branches */

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
}

function drawLeaf(ctx, x, y, size, rot, hue, lx, ly) {
  var facing = Math.cos(rot) * lx + Math.sin(rot) * ly;
  var r = Math.round(60 + 175 * (0.5 + 0.5 * facing));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = 'rgb(90,0,0)';
  ctx.lineWidth = Math.max(size * 0.09, 0.8);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(-size * 1.35, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgb(' + r + ',255,' + Math.round(hue * 255) + ')';
  ctx.beginPath();
  var n = 30, i, t, w;
  for (i = 0; i <= n; i++) {
    t = i / n;
    w = leafWidth(t, size);
    if (i === 0) ctx.moveTo(-size, 0); else ctx.lineTo(-size + 2 * size * t, -w);
  }
  for (i = n; i >= 0; i--) {
    t = i / n;
    w = leafWidth(t, size);
    ctx.lineTo(-size + 2 * size * t, w);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function leafWidth(t, size) {
  var env = Math.pow(t, 0.55) * Math.pow(1 - t, 0.4) * 1.9;
  var lobe = 0.5 + 0.5 * Math.pow(Math.abs(Math.sin(Math.PI * 4.0 * t + 0.4)), 0.7);
  return size * 0.62 * env * lobe;
}

function cluster(ctx, x, y, size, n, rnd, lx, ly) {
  for (var i = 0; i < n; i++) {
    var a = rnd() * Math.PI * 2, r = rnd() * size * 2.4;
    drawLeaf(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, size * (0.7 + 0.6 * rnd()), rnd() * Math.PI * 2, rnd(), lx, ly);
  }
}

function oak(ctx, x, y, ang, len, wid, depth, rnd, lx, ly, leafSize) {
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
    oak(ctx, px, py, ang + side * (0.6 + rnd() * 0.7), len * (0.5 + rnd() * 0.3), wid * 0.6, depth - 1, rnd, lx, ly, leafSize);
  }
  var next = ang + bend * 0.7 + (rnd() - 0.5) * 0.8;
  oak(ctx, ex, ey, next, len * (0.72 + rnd() * 0.16), wid * 0.78, depth - 1, rnd, lx, ly, leafSize);
  if (depth <= 3) cluster(ctx, ex, ey, leafSize * (0.8 + 0.4 * rnd()), 5 + Math.floor(rnd() * 9), rnd, lx, ly);
}

var systems = [];
var leaves = [];
var lightNow = [-0.85, 0.5];
var LEAF_N = { near: 16, mid: 44 };

function buildForeground(lx, ly) {
  var w = fg.width, h = fg.height;
  var portrait = h > w;
  var d = Math.min(h, w * 0.9) * (portrait ? 0.72 : 1);
  var lean = portrait ? -0.1 : 0;
  var rnd = mulberry32(20261031);
  lightNow = [lx, ly];
  var specs = [
    [w * 1.05, h * 0.50, Math.PI * (0.85 + lean), d * 0.20, d * 0.030, 7],
    [w * 0.95, h * 1.05, Math.PI * (0.62 - lean), d * 0.17, d * 0.026, 7],
    [w * 1.02, h * 0.08, Math.PI * (1.18 - lean), d * 0.13, d * 0.018, 6]
  ];
  systems = specs.map(function (sp, i) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    oak(ctx, sp[0], sp[1], sp[2], sp[3], sp[4], sp[5], rnd, lx, ly, d * 0.012);
    return { c: c, ax: sp[0], ay: sp[1], k: 1 + 0.3 * i, ph: i * 1.7 };
  });
  if (!leaves.length) {
    var r2 = mulberry32(20261101);
    for (var n = 0; n < LEAF_N.near + LEAF_N.mid; n++) leaves.push(spawn({ layer: n < LEAF_N.near ? 'near' : 'mid' }, r2, true));
  }
}

function spawn(lf, rnd, anywhere) {
  var w = fg.width, h = fg.height;
  var d = Math.min(h, w * 0.9);
  var fromCrown = rnd() < 0.6;
  lf.x = fromCrown ? w * (0.55 + rnd() * 0.55) : w * (rnd() * 1.3 - 0.1);
  lf.y = anywhere ? h * (rnd() * 1.1 - 0.1) : (fromCrown ? h * (rnd() * 0.7 - 0.1) : -h * 0.08);
  lf.size = d * (lf.layer === 'near' ? 0.026 : 0.016) * (0.75 + 0.5 * rnd());
  lf.hue = rnd();
  lf.rot = rnd() * Math.PI * 2;
  lf.spin = (rnd() - 0.5) * 3.0;
  lf.ph = rnd() * Math.PI * 2;
  lf.fall = h * (lf.layer === 'near' ? 0.11 : 0.075) * (0.8 + 0.4 * rnd());
  lf.side = 0.5 + rnd();
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
    lf.x -= (w * (0.05 + 0.06 * gust) * near + w * 0.03 * flutter * lf.side) * dt;
    lf.y += lf.fall * (0.75 + 0.35 * Math.sin(t * 3.1 + lf.ph * 1.3)) * dt;
    lf.rot += (lf.spin + 1.5 * flutter) * dt;
    if (lf.y > h * 1.1 || lf.x < -w * 0.1) spawn(lf, leafRnd, false);
  }
}

function drawLeaves(ctx, layer, px, py) {
  for (var i = 0; i < leaves.length; i++) {
    var lf = leaves[i];
    if (lf.layer !== layer) continue;
    drawLeaf(ctx, lf.x + px, lf.y + py, lf.size, lf.rot, lf.hue, lightNow[0], lightNow[1]);
  }
}

function drawForeground(t, px, py) {
  var w = fg.width, h = fg.height;
  fgctx.clearRect(0, 0, w, h);
  for (var i = 0; i < systems.length; i++) {
    var s = systems[i];
    var sway = (Math.sin(t * 0.35 + s.ph) * 0.006 + Math.sin(t * 0.9 + s.ph * 2.0) * 0.002) * s.k;
    fgctx.save();
    fgctx.translate(s.ax + px, s.ay + py);
    fgctx.rotate(sway);
    fgctx.translate(-s.ax, -s.ay);
    fgctx.drawImage(s.c, 0, 0);
    fgctx.restore();
  }
  drawLeaves(fgctx, 'near', px, py);
  gl.bindTexture(gl.TEXTURE_2D, fgTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fg);
  midctx.clearRect(0, 0, w, h);
  drawLeaves(midctx, 'mid', px * 0.5, py * 0.5);
  gl.bindTexture(gl.TEXTURE_2D, midTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mid);
}

/* ---------------------------------------------------------------- moon */

function phase(date) {
  var d = (date - Date.UTC(2000, 0, 6, 18, 14)) / 86400000 / 29.530588853;
  return d - Math.floor(d);
}

var P = phase(new Date());

/* --------------------------------------------------------------- looks */

function weights(t) {
  var e = Math.sin((t - 0.25) * 2 * Math.PI);
  var ss = function (a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  var kd = ss(0.03, 0.55, e);
  var kn = 1 - ss(-0.55, -0.07, e);
  var ku = Math.min(1, Math.max(0, 1 - kd - kn));
  return { d: kd, u: ku, n: kn, e: e };
}

function blend(key, w) {
  var a = PAL.day[key], b = PAL.dusk[key], c = PAL.night[key];
  if (typeof a === 'number') return a * w.d + b * w.u + c * w.n;
  return [0, 1, 2].map(function (i) { return a[i] * w.d + b[i] * w.u + c[i] * w.n; });
}

var LEAF = { day: PAL.day.leaf.map(function (h) { return h.map(scene); }), dusk: PAL.dusk.leaf.map(function (h) { return h.map(scene); }), night: PAL.night.leaf.map(function (h) { return h.map(scene); }) };

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

var look, cur, tw = null;
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
  var to = LOOKS[name];
  if (instant || reduced.matches) { cur = to; tw = null; }
  else tw = { from: cur, to: to, t0: performance.now(), dur: 900 + 2200 * Math.abs(to - cur) / 0.5 };
  var ls = lightScreen(weights(to));
  if (fg.width > 1) buildForeground(ls[0], ls[1]);
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

function draw(now) {
  if (tw) {
    var k = Math.min(1, (now - tw.t0) / tw.dur);
    k = k * k * (3 - 2 * k);
    cur = tw.from + (tw.to - tw.from) * k;
    if (k >= 1) tw = null;
  }
  var still = reduced.matches;
  var l = still ? 1 : 1 - Math.exp(-(now - last) / 160);
  mx += (tx - mx) * l;
  my += (ty - my) * l;
  var t = still ? 1000 : now / 1000;
  var w = weights(cur);
  var sun = sunDir(w);
  var ld = [sun[0], sun[2]];
  var ll = Math.hypot(ld[0], ld[1]) || 1;
  ld = [ld[0] / ll, ld[1] / ll];
  var aspect = canvas.width / canvas.height;
  var tanH = Math.tan(FOV / 2);

  if (!still) stepLeaves(t, Math.min(0.05, Math.max(0, (now - last) / 1000)));
  drawForeground(still ? 0 : t, -mx * fg.width * 0.012, my * fg.height * 0.012);

  gl.bindFramebuffer(gl.FRAMEBUFFER, skyT.fbo);
  gl.viewport(0, 0, skyT.w, skyT.h);
  gl.useProgram(skyProg.p);
  var u = skyProg.u;
  gl.uniform2f(u.R, skyT.w, skyT.h);
  gl.uniform1f(u.T, t);
  gl.uniform1f(u.NIGHT, w.n);
  gl.uniform1f(u.DUSK, w.u);
  gl.uniform1f(u.MOONR, MOON_R);
  gl.uniform1f(u.PH, P);
  gl.uniform1f(u.COVER, blend('cover', w));
  gl.uniform1f(u.SHEL, 0.30);
  gl.uniform1f(u.MGAIN, blend('mgain', w));
  gl.uniform1f(u.SCALE, SCALE);
  gl.uniform4f(u.CAM, tanH * aspect, tanH, PITCH + my * 0.008, mx * 0.010);
  gl.uniform4f(u.BOX, box[0], box[1], box[2], box[3]);
  u3(u.SUN, sun);
  u3(u.MOON, MOON);
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
  u = bokehProg.u;
  gl.uniform1i(u.SRC, 0);
  gl.uniform1f(u.SCALE, SCALE);
  gl.activeTexture(gl.TEXTURE0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, skyB.fbo);
  gl.viewport(0, 0, skyB.w, skyB.h);
  gl.bindTexture(gl.TEXTURE_2D, skyT.tex);
  gl.uniform2f(u.TEXEL, 1 / skyT.w, 1 / skyT.h);
  gl.uniform1f(u.RAD, 3.2);
  gl.uniform1f(u.BOOST, 1.0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fgB.fbo);
  gl.viewport(0, 0, fgB.w, fgB.h);
  gl.bindTexture(gl.TEXTURE_2D, fgTex);
  gl.uniform2f(u.TEXEL, 1 / fg.width, 1 / fg.height);
  gl.uniform1f(u.RAD, 5.0);
  gl.uniform1f(u.BOOST, 0.0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, midB.fbo);
  gl.viewport(0, 0, midB.w, midB.h);
  gl.bindTexture(gl.TEXTURE_2D, midTex);
  gl.uniform1f(u.RAD, 1.6);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

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
  gl.uniform1i(u.SKYB, 0);
  gl.uniform1i(u.FGB, 1);
  gl.uniform1i(u.MIDB, 2);
  gl.uniform1f(u.G, still ? 0.37 : (frameNo++ % 977) * 0.013);
  gl.uniform1f(u.T, t);
  gl.uniform2f(u.R, canvas.width, canvas.height);
  gl.uniform4f(u.CAM, tanH * aspect, tanH, PITCH + my * 0.008, mx * 0.010);
  u3(u.SUN, sun);
  gl.uniform1f(u.NIGHT, w.n);
  gl.uniform1f(u.DUSK, w.u);
  gl.uniform1f(u.EXPO, blend('expo', w));
  gl.uniform1f(u.SCALE, SCALE);
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
  var busy = tw || Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002;
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
    [skyT, skyB, fgB].forEach(function (r) { if (r) { gl.deleteTexture(r.tex); gl.deleteFramebuffer(r.fbo); } });
    skyT = target(sw, sh, HDR);
    skyB = target(hw, hh, HDR);
    fgB = target(hw, hh, false);
    if (midB) { gl.deleteTexture(midB.tex); gl.deleteFramebuffer(midB.fbo); }
    midB = target(hw, hh, false);
    fg.width = hw;
    fg.height = hh;
    mid.width = hw;
    mid.height = hh;
    leaves = [];
    var ls = lightScreen(weights(LOOKS[look] || cur));
    buildForeground(ls[0], ls[1]);
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
cur = LOOKS[initial];
document.documentElement.classList.add('sky');
setLook(initial, true);
resize();

})();
