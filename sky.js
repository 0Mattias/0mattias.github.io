/* 0mattias.github.io · the sky
   An autumn oak against the sky, photographed rather than drawn: a
   21-degree lens looks up through the crown at two decks of cumulus
   under a faint veil of cirrus, each mass a body of low noise rounded
   into puffs by a billow term,
   with a soft rim rather than a cut edge, so it reads defocused, and
   lit at three scales, the mass, the puffs and the grain, by how its
   density falls toward the sun, so each cloud keeps a lit side and a
   shadow side, the puffs facing the light are bright, the bases hang
   dark by day and catch the low sun at dusk, and a thin lining glows
   at the rim on the sun's side; a moon at
   tonight's real phase that dissolves into the sky on its shadow side,
   stars once it is dark. The oak is grown by a small L-system, three
   limbs reaching in from the right and one from the lower left, each
   forking once and dividing into twigs, and hung with dense sprays of
   russet, rust and old gold: sprays lie over the limbs and boughs
   themselves, shaded ones sit deep along the twigs, bright ones ride
   the tips, and the left limb keeps a bare stretch of wood for the
   cricket. The wind is a noise signal with
   real lulls and gusts: it runs through the crown, carries the clouds
   slowly leftward as one piece (nothing is kept clear: a cloud may
   pass behind the words or over the moon), and when it rises leaves
   let go of the clusters and blow down through the picture, some
   flipping end over end the whole way; by day a jet crosses the high
   sky now and then and its contrail
   widens and dissolves behind it. At night the wind drops: the clouds
   stand, the crown goes still, no leaf falls, a meteor falls instead,
   and a cricket sits on the left limb and chirps, wings raised and
   shivering. The crown and the sky render to their own targets and are
   defocused through a 72-tap bokeh disc (the sky less, bright spots
   bloom); the lens is focused a little short of the tree, so the
   leaves falling through that plane stay sharp, and the cricket is
   drawn in that plane too so it keeps its legs; all of it is
   composited under an ACES grade, a vignette and film grain. Phones
   turn the camera toward the tree: the limbs hang in from the upper
   right at full size and the moon stands to the left of the words.
   Three looks, each with its own prebuilt foliage, blended by weight
   so a switch crossfades at once and a click mid-fade bends the fade:
   the page opens in daylight, and the dots at the bottom left move
   the sun. WebGL2, no libraries, no build step. */

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

var SKY_RES = 0.5;
var HALF = 0.5;
var FOV = 21 * Math.PI / 180;
var PITCH = 14 * Math.PI / 180;
var MOON_R = 2.05 * Math.PI / 180;

var LOOKS = { day: { d: 1, u: 0, n: 0 }, dusk: { d: 0, u: 1, n: 0 }, night: { d: 0, u: 0, n: 1 } };
var FLAT = { day: '#648bba', dusk: '#b07f8a', night: '#141b30' };
var THEME = { day: srgb('#5482bd'), dusk: srgb('#5e6fae'), night: srgb('#0a1024') };

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
    zen: scene('#5382c2'), hor: scene('#aabfd8'), dmid: scene('#e2b598'), dfar: scene('#b6a8bf'),
    glow: [0.8, 0.76, 0.64], clit: [1.0, 0.82, 0.6], cmid: scene('#d3c9c4'), cshd: scene('#9da0b8'),
    blit: scene('#6e6155'), bdrk: scene('#1c1815'),
    leaf: [['#9a4e2a', '#3e1f12'], ['#cf7f36', '#5c3315'], ['#d6ac48', '#6a541c']],
    cover: 0.64, expo: 1.0, mgain: 1.0
  },
  dusk: {
    zen: scene('#7180b5'), hor: scene('#d8b09a'), dmid: scene('#e5a778'), dfar: scene('#b79cb4'),
    glow: [1.0, 0.62, 0.36], clit: [1.08, 0.91, 0.78], cmid: scene('#c9a3a9'), cshd: scene('#9c8db0'),
    blit: scene('#735646'), bdrk: scene('#1a1310'),
    leaf: [['#b0562c', '#4a2214'], ['#dd8838', '#603315'], ['#e0b24c', '#6a501c']],
    cover: 0.64, expo: 1.0, mgain: 1.0
  },
  night: {
    zen: scene('#0a1024'), hor: scene('#1b2439'), dmid: scene('#1e2740'), dfar: scene('#141b30'),
    glow: [0.33, 0.37, 0.48], clit: scene('#5f6a86'), cmid: scene('#2a3149'), cshd: scene('#0b0f1e'),
    blit: scene('#0e1119'), bdrk: scene('#030407'),
    leaf: [['#2e242a', '#08050a'], ['#3b3134', '#0b0808'], ['#403a2e', '#0d0b07']],
    cover: 0.58, expo: 1.0, mgain: 1.0
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
uniform float CLT, NIGHT, DUSK, COVER, FINE, SCALE, FOOT;
uniform vec4 CAM;
uniform vec3 SUN, MOON, ZEN, HOR, DMID, DFAR, GLOW, CLIT, CMID, CSHD;
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

/* the field: broad masses, a finer relief on them, a billow term that
   rounds each mass into puffs, and a grain, every term sampled at the
   same drifted point, so the whole deck translates as one piece and a
   cloud keeps its shape across the frame. The lens is long and the
   frame sees a small patch of the deck, so the masses are fine in deck
   units: several show across a wide frame, none fills it */
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

float field(vec2 q, float seed, out float big, out float puffs, out float grain) {
  big = bigAt(q, seed);
  puffs = puffsAt(q, seed);
  grain = grainAt(q, seed);
  return big + 0.18 * (puffs - 0.5) + 0.06 * (grain - 0.5);
}

vec4 deck(vec2 p0, vec2 sunP, vec2 drift, float sc, float seed, float th, float far, float glow) {
  float k = sc * FINE;
  p0 *= k;
  sunP *= k;
  vec2 q0 = p0 + drift;
  /* the deck is advected: its cells bend and curl */
  vec2 warp = (vec2(fbm3(q0 * 1.4 + 3.0 + seed), fbm3(q0 * 1.4 + 17.0 + seed)) - 0.5) * 0.25;
  vec2 p = q0 + warp;
  float big, puffs, grain;
  float f = field(p, seed, big, puffs, grain);
  float e = f - th;
  /* a soft rim, not a cut: the density ramps up over a good part of
     the field, so every edge reads defocused, and a fringe of thin
     cloud hangs beyond it */
  float dens = smoothstep(0.0, 0.09, e);
  float fringe = smoothstep(-0.06, 0.0, e) * (1.0 - dens);
  float cov = dens + fringe * 0.5;
  if (cov <= 0.001) return vec4(0.0);
  /* light and shade at three scales, each judged by how the density
     changes toward the sun: density falling toward the sun is a lit
     face, rising is a hollow in another puff's shadow. The mass keeps
     one lit side and one shadow side, each puff turns toward the light,
     and flat cloud stays at its mid tone */
  vec2 toSun = normalize(sunP - p0 + vec2(1e-5));
  float towardBig = bigAt(p + toSun * 0.045, seed) - big;
  float towardLobe = puffsAt(p + toSun * 0.012, seed) - puffs;
  float towardGrain = grainAt(p + toSun * 0.005, seed) - grain;
  float bigShade = smoothstep(0.08, -0.08, towardBig);
  float lobeShade = smoothstep(0.10, -0.10, towardLobe);
  float grainShade = smoothstep(0.06, -0.06, towardGrain);
  float sunUp = clamp(SUN.y * 2.2, 0.0, 1.0);
  float thick = smoothstep(0.0, 0.30, e);
  /* the lens looks along the clouds, not up at them: what sits under
     more cloud is its base, dark by day, brushed by a low sun; two
     samples up the sky let the base deepen gradually */
  float under = 0.6 * smoothstep(-0.02, 0.10, massAt(p + vec2(0.0, -0.05), seed) - th)
              + 0.4 * smoothstep(-0.02, 0.14, massAt(p + vec2(0.0, -0.11), seed) - th);
  /* the grain only shows where the light rakes it: the shadow side is
     lit by the sky alone and stays smooth */
  float grainK = 0.04 + 0.10 * bigShade;
  float lam = 0.10 + 0.90 * (0.45 * bigShade + (0.55 - grainK) * lobeShade + grainK * grainShade);
  float shade = max(under * mix(0.4, 1.0, sunUp), thick * 0.5 * sunUp) * (1.0 - far * 0.35);
  float belly = mix(1.0, 0.26, shade);
  float crease = smoothstep(0.55, 0.2, puffs);
  float lk = mix(0.5, clamp(lam * belly * (1.0 - 0.28 * crease), 0.0, 1.0), 0.9);
  /* the rim lights up where the edge faces the sun and the thin cloud
     there scatters its light forward; the shadow side keeps a bare edge */
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
  vec3 dir = camDir(uv, CAM);
  vec3 col = skyColor(dir);
  float dy = max(dir.y, 0.0);
  vec2 p0 = dir.xz / (dy + 0.5) * 0.85;
  vec2 sunP = SUN.xz / (max(SUN.y, 0.0) + 0.5) * 0.85;
  vec2 drift = CLT * vec2(0.008, 0.0012);
  float glow = pow(max(dot(dir, SUN), 0.0), mix(24.0, 48.0, NIGHT));
  float th0 = mix(0.80, 0.46, COVER) + FOOT * (1.0 - smoothstep(0.0, 0.5, uv.y));
  /* cirrus: a thin veil far above the decks, drawn out along the wind
     into streaks, in patches, and so high that it barely moves */
  vec2 pc = dir.xz / (dy + 0.5) * 0.55 + drift * 0.3;
  vec2 qs = vec2(pc.x * 0.45 + pc.y * 0.2, pc.y * 1.6 - pc.x * 0.3);
  float veil = 0.65 * fbm5(qs * 2.0 + 31.0) + 0.35 * fbm3(qs * 6.0 + 13.0);
  float patchy = smoothstep(0.40, 0.66, fbm3(pc * 0.5 + 71.0));
  float cirA = smoothstep(0.50, 0.78, veil) * 0.14 * patchy * smoothstep(0.0, 0.5, COVER) * smoothstep(-0.02, 0.15, dir.y);
  vec3 cirCol = mix(CLIT, HOR, 0.35) + GLOW * glow * 0.3;
  col = mix(col, cirCol, cirA);
  /* the far deck drifts at the near deck's pace, so the two never slide
     past each other and the picture moves as one; it sits behind the
     near deck, paler and a little translucent, the way distance reads.
     Nothing is kept clear: a cloud may pass behind the words or over
     the moon */
  vec4 far = deck(p0, sunP, drift * 2.1, 2.1, 41.0, th0 + 0.06, 1.0, glow);
  far.rgb = mix(far.rgb, HOR, 0.30);
  vec4 near = deck(p0, sunP, drift, 1.0, 0.0, th0, 0.0, glow);
  float a = near.a + far.a * 0.8 * (1.0 - near.a);
  if (a > 0.0) col = mix(col, (near.rgb * near.a + far.rgb * far.a * 0.8 * (1.0 - near.a)) / a, a);
  float cov = min(a + cirA * 0.5 * (1.0 - a), 1.0) * smoothstep(-0.05, 0.02, dir.y);
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
uniform vec4 FGMAP, MIDMAP;
uniform float T, G, NIGHT, DUSK, EXPO, SCALE, MOONR, PH, MGAIN, STARS, CTON, CTP, CTAGE, METON, METP, METS, METL;
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
    float rad = (0.028 + 0.035 * mag * mag) * (0.8 + 0.2 * STARS);
    float dd = length(f - off * 0.7);
    float core = smoothstep(rad, rad * 0.25, dd);
    float skirt = smoothstep(rad * 4.0, 0.0, dd) * 0.08 * mag * mag;
    float star = (core + skirt) * step(1.0 - 0.045 * STARS, hs);
    float tw = 0.93 + 0.07 * sin(T * (0.8 + 1.2 * hs) + hs * 80.0);
    float bright = (0.16 + 0.9 * mag * mag) * tw;
    float g = pow(max(dot(dir, SUN), 0.0), 14.0);
    float dark = smoothstep(0.12, 0.03, dot(bg, vec3(0.3333)));
    bg += mix(vec3(0.78, 0.85, 1.0), vec3(1.0, 0.95, 0.85), fract(hs * 9.1))
        * star * bright * 1.3 * NIGHT * dark * smoothstep(-0.02, 0.2, dir.y) * (1.0 - g * 0.85);
  }

  if (CTON > 0.5) {
    vec2 ae = vec2(atan(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0)));
    vec2 ab = CT.zw - CT.xy;
    float s = clamp(dot(ae - CT.xy, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
    float head = min(CTP, 1.0);
    float L = max(length(ab), 1e-6);
    vec2 fwd = ab / L;
    vec2 nrm = vec2(-fwd.y, fwd.x);
    float sd = dot(ae - (CT.xy + ab * s), nrm);
    float back = 0.0011 * JS / L;
    if (s < head - back) {
      float age = (CTP - s) * CTAGE;
      float grow = clamp(age / 45.0, 0.0, 1.0);
      float sig = 0.00025 + 0.0009 * grow;
      float sep = 0.0006 + 0.0003 * grow;
      float lines = exp(-(sd - sep) * (sd - sep) / (2.0 * sig * sig)) + exp(-(sd + sep) * (sd + sep) / (2.0 * sig * sig));
      float rag = 0.7 + 0.3 * vn(vec2(s * 400.0, age * 0.08));
      float fade = (1.0 - smoothstep(18.0, 50.0, age)) * smoothstep(0.0, 0.003, head - back - s);
      float ct = min(lines, 1.0) * rag * fade * (0.5 - 0.25 * grow) * (1.0 - NIGHT) * (1.0 - cloud * 0.9);
      vec3 ctCol = mix(vec3(1.0, 0.99, 0.97), vec3(1.0, 0.8, 0.7), DUSK * 0.7);
      bg = mix(bg, ctCol * 0.95, ct);
    }
    if (CTP <= 1.0) {
      vec2 rel = ae - (CT.xy + ab * CTP);
      vec2 q = vec2(dot(rel, fwd), dot(rel, nrm)) * 1000.0;
      float dj = jetSdf(q);
      float body = 1.0 - smoothstep(-0.12, 0.12, dj);
      vec3 jetCol = mix(vec3(0.72, 0.74, 0.80), vec3(1.0, 0.86, 0.76), DUSK * 0.8);
      bg = mix(bg, jetCol, body * (1.0 - NIGHT) * (1.0 - cloud * 0.9));
      float lk = mix(0.12, 1.0, NIGHT) * (1.0 - cloud * 0.9);
      float sp = fract(T / 1.25);
      float strobe = (sp < 0.045 || (sp > 0.11 && sp < 0.155)) ? 1.0 : 0.0;
      float bp = fract(T / 0.92 + 0.37);
      float beacon = smoothstep(0.0, 0.04, bp) * (1.0 - smoothstep(0.08, 0.14, bp));
      vec2 wl = vec2(-0.5, 0.55) * JS, wr = vec2(-0.5, -0.55) * JS;
      bg += vec3(1.0, 0.98, 0.95) * 2.6 * strobe * spot(q, vec2(-0.3 * JS, 0.0), 0.36) * lk;
      bg += vec3(1.0, 0.12, 0.08) * 1.3 * beacon * spot(q, vec2(0.1 * JS, 0.0), 0.32) * lk;
      bg += vec3(1.0, 0.15, 0.1) * 0.22 * spot(q, wl, 0.28) * lk;
      bg += vec3(0.2, 1.0, 0.35) * 0.22 * spot(q, wr, 0.28) * lk;
      bg += vec3(1.0) * 0.15 * spot(q, vec2(-1.1 * JS, 0.0), 0.28) * lk;
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

  vec4 m = layerCol(texture(MIDB, uv * MIDMAP.xy + MIDMAP.zw), bg, 0.32);
  vec3 col = mix(bg, m.rgb, m.a);
  vec4 f = layerCol(texture(FGB, uv * FGMAP.xy + FGMAP.zw), col, 0.22);
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

var skyProg = program(SKY, ['R', 'CLT', 'NIGHT', 'DUSK', 'COVER', 'FINE', 'SCALE', 'FOOT', 'CAM', 'SUN', 'MOON', 'ZEN', 'HOR', 'DMID', 'DFAR', 'GLOW', 'CLIT', 'CMID', 'CSHD', 'LD']);
var bokehProg = program(BOKEH, ['SRC', 'TEXEL', 'RAD', 'BOOST', 'SCALE']);
var compProg = program(COMP, ['SKYB', 'FGB', 'MIDB', 'COVT', 'FGMAP', 'MIDMAP', 'T', 'G', 'NIGHT', 'DUSK', 'EXPO', 'SCALE', 'MOONR', 'PH', 'MGAIN', 'STARS', 'CAM', 'BLIT', 'BDRK', 'LL0', 'LL1', 'LL2', 'LD0', 'LD1', 'LD2', 'SUN', 'MOON', 'CTON', 'CTP', 'CTAGE', 'CT', 'METON', 'METP', 'METS', 'METL', 'MET']);
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
var scratch = document.createElement('canvas');
var sctx = scratch.getContext('2d');

/* ------------------------------------------------------------ the oak */

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

function windAt(t) {
  var g = 0.55 * vnoise(t * 0.09 + 3.7) + 0.45 * vnoise(t * 0.33 + 41.2);
  g = Math.max(0, Math.min(1, (g - 0.2) / 0.6));
  return g * g * (3 - 2 * g);
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
  var lobes = 0.86 + 0.14 * Math.cos(6.2832 * (3.0 + k) * t + k * 2.0);
  return size * 0.62 * env * lobes;
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
  gr.addColorStop(0, 'rgb(' + Math.round(60 + 160 * lit) + ',255,' + b + ')');
  gr.addColorStop(1, 'rgb(' + Math.round(38 + 110 * lit) + ',255,' + b + ')');
  ctx.fillStyle = gr;
  ctx.beginPath();
  var n = 30, i, t;
  ctx.moveTo(-size, 0);
  for (i = 1; i <= n; i++) { t = i / n; ctx.lineTo(-size + 2 * size * t, -leafWidth(t, size, k)); }
  for (i = n - 1; i >= 1; i--) { t = i / n; ctx.lineTo(-size + 2 * size * t, leafWidth(t, size, k)); }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgb(' + Math.round(95 + 150 * lit) + ',255,' + b + ')';
  ctx.lineWidth = Math.max(size * 0.045, 0.5);
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size * 0.9, 0);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* A spray: the leaves of one twig end, most of them fanning out from
   the middle with their blades pointing outward, the rest lying across
   at any angle, the ones behind drawn first and darker. A spray has one
   hue with a spread around it, so a branch turns as a whole. */

function makeCluster(size, n, rnd, lx, ly, hue0, shade0) {
  var R = size * 2.0;
  var cs = Math.ceil(size * 8.8);
  var c = document.createElement('canvas');
  c.width = cs; c.height = cs;
  var ctx = c.getContext('2d');
  var ea = rnd() * Math.PI, sq = 0.62 + 0.38 * rnd(), ec = Math.cos(ea), es = Math.sin(ea);
  for (var i = 0; i < n; i++) {
    var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R;
    var spray = rnd() < 0.7;
    var rot = spray ? a + (rnd() - 0.5) * 0.9 : rnd() * Math.PI * 2;
    var px = Math.cos(a) * r, py = Math.sin(a) * r * sq;
    var ox = px * ec - py * es, oy = px * es + py * ec;
    var x = cs / 2 + ox, y = cs / 2 + oy;
    if (spray) { x += Math.cos(rot) * size * 0.5; y += Math.sin(rot) * size * 0.5; }
    /* the spray has a lit side and a shadow side of its own */
    var clump = 0.6 + 0.4 * (0.5 + 0.5 * (ox * lx + oy * ly) / R);
    var depth = (0.45 + 0.55 * (i / Math.max(1, n - 1))) * shade0 * clump;
    var hue = Math.min(1, Math.max(0, hue0 + (rnd() - 0.5) * 0.3));
    drawLeaf(ctx, x, y, size * (0.7 + 0.6 * rnd()), rot, hue, lx, ly, rnd(), 0.7 + 0.3 * rnd(), depth);
  }
  return { c: c, cs: cs };
}

/* The sprays come from a bank, two dozen bright ones for the twig tips
   and a dozen shaded ones for deep in the crown, so a set builds in a
   few tens of milliseconds; each placement turns and scales its sprite
   a little. */

function makeBank(rnd, lx, ly) {
  var base = D * 0.0115;
  function series(n, shade, sizes) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      var hue0 = rnd();
      var size = base * (sizes[0] + (sizes[1] - sizes[0]) * rnd());
      arr.push(makeCluster(size, 12 + Math.round(rnd() * 10), rnd, lx, ly, hue0, shade[0] + (shade[1] - shade[0]) * rnd()));
    }
    return arr;
  }
  return { rnd: mulberry32(20261105), boughs: [], inner: series(12, [0.5, 0.7], [0.8, 1.1]), deep: series(12, [0.62, 0.8], [0.8, 1.15]), mid: series(16, [0.76, 0.92], [0.8, 1.2]), outer: series(20, [0.9, 1.0], [0.8, 1.25]) };
}

function stamp(ctx, sp, x, y, rot, sc) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.drawImage(sp.c, -sp.cs / 2, -sp.cs / 2);
  ctx.restore();
}

function pointOn(x0, y0, cx, cy, x1, y1, t) {
  var s = 1 - t;
  return [s * s * x0 + 2 * s * t * cx + t * t * x1, s * s * y0 + 2 * s * t * cy + t * t * y1];
}

function oak(ctx, x, y, ang, len, wid, depth, rnd, lx, ly, bank, out, trunk) {
  if (depth <= 0 || len < 2) return;
  var bend = (rnd() - 0.5) * 0.9;
  var ex = x + Math.cos(ang) * len, ey = y - Math.sin(ang) * len;
  var cx = x + Math.cos(ang + bend) * len * 0.5, cy = y - Math.sin(ang + bend) * len * 0.5;
  seg(ctx, x, y, cx, cy, ex, ey, wid, lx, ly);
  if (trunk) trunk.push({ x0: x, y0: y, cx: cx, cy: cy, x1: ex, y1: ey, wid: wid });
  var nSide = depth > 3 ? (rnd() < 0.55 ? 1 : 2) : (rnd() < 0.65 ? 1 : 0);
  for (var i = 0; i < nSide; i++) {
    var p = pointOn(x, y, cx, cy, ex, ey, 0.3 + rnd() * 0.6);
    var side = rnd() < 0.5 ? 1 : -1;
    oak(ctx, p[0], p[1], ang + side * (0.55 + rnd() * 0.7), len * (0.5 + rnd() * 0.3), wid * 0.6, depth - 1, rnd, lx, ly, bank, out, null);
  }
  var next = ang + bend * 0.7 + (rnd() - 0.5) * 0.8;
  if (depth === 5 && rnd() < 0.7) {
    /* the limb forks once into two boughs of nearly equal weight */
    var fs = rnd() < 0.5 ? 1 : -1;
    oak(ctx, ex, ey, next - fs * (0.4 + rnd() * 0.35), len * (0.7 + rnd() * 0.15), wid * 0.66, depth - 1, rnd, lx, ly, bank, out, null);
    next += fs * (0.2 + rnd() * 0.2);
  }
  oak(ctx, ex, ey, next, len * (0.72 + rnd() * 0.16), wid * 0.78, depth - 1, rnd, lx, ly, bank, out, trunk);
  if (depth <= 3 && rnd() < 0.55) {
    /* a shaded spray deep in the crown, baked onto the limb along the twig */
    var q = pointOn(x, y, cx, cy, ex, ey, 0.3 + rnd() * 0.5);
    var sp = bank.inner[Math.floor(rnd() * bank.inner.length)];
    stamp(ctx, sp, q[0], q[1], (rnd() - 0.5) * 0.6, 0.85 + 0.3 * rnd());
  }
  if (depth <= 2 || (depth === 3 && rnd() < 0.6)) {
    /* the sprays brighten toward the twig tips: the outer crown is backlit, the inside shades itself */
    var tier = depth === 1 ? bank.outer : depth === 2 ? bank.mid : bank.deep;
    out.push({ x: ex, y: ey, sprite: tier[Math.floor(rnd() * tier.length)], rot: (rnd() - 0.5) * 0.5, sc: 0.9 + 0.25 * rnd(), ph: rnd() * 6.2832 });
  }
  /* bushy: sprays lie over the wood itself, spaced along every limb and
     bough and doubled up on the twigs, so no stretch of branch runs bare
     through the crown. They come from the bank's own stream, so the
     limbs keep their shape, and buildForeground stamps them, keeping the
     left limb's base clear for the cricket. */
  var r2 = bank.rnd;
  var dx = ex - x, dy = ey - y, sl = Math.hypot(dx, dy) || 1;
  var nx = -dy / sl, ny = dx / sl;
  var n = depth >= 4 ? Math.max(1, Math.round(len / (D * 0.05))) : (r2() < 0.6 ? 1 : 0);
  for (var b = 0; b < n; b++) {
    var tb = depth >= 4 ? (b + 0.2 + 0.6 * r2()) / n : 0.25 + 0.6 * r2();
    var qb = pointOn(x, y, cx, cy, ex, ey, tb);
    var off = (r2() - 0.5) * 0.5;
    var tb2 = depth >= 4 ? (r2() < 0.7 ? bank.mid : bank.deep) : bank.inner;
    var spb = tb2[Math.floor(r2() * tb2.length)];
    bank.boughs.push({ x: qb[0] + nx * off * spb.cs, y: qb[1] + ny * off * spb.cs, sprite: spb, rot: (r2() - 0.5) * 0.6, sc: (depth >= 6 ? 1.0 : 0.85) + 0.3 * r2() });
  }
  if (depth <= 3 && r2() < 0.35) {
    out.push({ x: ex, y: ey, sprite: bank.mid[Math.floor(r2() * bank.mid.length)], rot: (r2() - 0.5) * 0.5, sc: 0.9 + 0.25 * r2(), ph: r2() * 6.2832 });
  }
}

/* -------------------------------------------------------------- layout */
/* The oak is four limbs of one tree: three reach in from the right and
   one from the lower left, and the cricket perches on the second bare
   stretch of that one. Every limb is placed in frame fractions, so a
   phone rearranges the picture rather than shrinking it: the camera
   has turned toward the tree, the right-hand limbs hang in from the
   top and the moon stands to the left of the words. D is the scale of
   the picture, the height of a landscape frame or the width of a
   portrait one, and everything grown here is sized from it. */

var sets = { day: null, dusk: null, night: null };
var leaves = [];
var lightNow = [-0.85, 0.5];
var LEAF_N = { near: 7, mid: 16 };
var FW = 1, FH = 1, D = 1, MX = 0, MY = 0, FBLUR = 4.0, MBLUR = 3.0, FOVK = 1, YAW0 = 0, STARS = 1, FOOT = 0;
var LIMBS = [];

function layout(portrait) {
  var w = FW, h = FH, d = D, ox = MX, oy = MY;
  var ys = portrait ? [0.16, 0.30, -0.02] : [0.50, 1.05, 0.08];
  LIMBS = [
    { x: ox + w * 1.05, y: oy + h * ys[0], ang: Math.PI * 0.85, len: d * 0.20, wid: d * 0.030, depth: 7, k: 1.0, ph: 0 },
    { x: ox + w * (portrait ? 1.04 : 0.95), y: oy + h * ys[1], ang: Math.PI * 0.62, len: d * 0.17, wid: d * 0.026, depth: 7, k: 1.3, ph: 1.7 },
    { x: ox + w * 1.02, y: oy + h * ys[2], ang: Math.PI * 1.18, len: d * 0.13, wid: d * 0.018, depth: 6, k: 1.6, ph: 3.4 },
    { x: ox - w * 0.04, y: oy + h * 0.84, ang: Math.PI * 0.06, len: d * 0.16, wid: d * 0.026, depth: 6, k: 1.1, ph: 5.1, seed: 20261104 }
  ];
}

function perchOn(sg, u) {
  var s = 1 - u;
  var x = s * s * sg.x0 + 2 * s * u * sg.cx + u * u * sg.x1;
  var y = s * s * sg.y0 + 2 * s * u * sg.cy + u * u * sg.y1;
  var tx = 2 * s * (sg.cx - sg.x0) + 2 * u * (sg.x1 - sg.cx);
  var ty = 2 * s * (sg.cy - sg.y0) + 2 * u * (sg.y1 - sg.cy);
  var l = Math.hypot(tx, ty) || 1;
  tx /= l; ty /= l;
  var nx = -ty, ny = tx;
  if (ny > 0) { nx = -nx; ny = -ny; }
  var r = sg.wid * 0.5 * 0.85;
  return { x: x + nx * r, y: y + ny * r, ang: Math.atan2(ty, tx) };
}

function buildForeground(lx, ly) {
  var rnd = mulberry32(20261031);
  var bank = makeBank(rnd, lx, ly);
  var clusters = [], trunk = [], last = LIMBS.length - 1;
  var systems = LIMBS.map(function (sp, i) {
    var c = document.createElement('canvas');
    c.width = fg.width; c.height = fg.height;
    var ctx = c.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var out = [];
    bank.boughs = [];
    oak(ctx, sp.x, sp.y, sp.ang, sp.len, sp.wid, sp.depth, sp.seed ? mulberry32(sp.seed) : rnd, lx, ly, bank, out, i === last ? trunk : null);
    /* the cricket's stretch of the left limb stays bare wood */
    var keep = i === last ? perchOn(trunk[1] || trunk[0], 0.5) : null;
    bank.boughs.forEach(function (b) {
      if (keep && Math.hypot(b.x - keep.x, b.y - keep.y) < D * 0.075 + b.sprite.cs * 0.5 * b.sc) return;
      stamp(ctx, b.sprite, b.x, b.y, b.rot, b.sc);
    });
    out.forEach(function (cl) { cl.sys = i; clusters.push(cl); });
    return { c: c, ax: sp.x, ay: sp.y, k: sp.k, ph: sp.ph };
  });
  var perch = perchOn(trunk[1] || trunk[0], 0.5);
  perch.sys = last;
  return { systems: systems, clusters: clusters, perch: perch, cs: D * 0.06 };
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

function spawn(lf, rnd, anywhere, set) {
  var w = FW, h = FH, ox = MX, oy = MY;
  var d = D;
  lf.on = true;
  lf.wait = 0;
  if (anywhere) {
    lf.x = ox + w * (rnd() * 1.2 - 0.1);
    lf.y = oy + h * (rnd() * 1.1 - 0.1);
  } else if (lf.layer === 'near' && set && set.clusters.length && rnd() < 0.6) {
    var cl = set.clusters[Math.floor(rnd() * set.clusters.length)];
    lf.x = cl.x + (rnd() - 0.5) * cl.sprite.cs * 0.5;
    lf.y = cl.y + (rnd() - 0.5) * cl.sprite.cs * 0.5;
  } else if (rnd() < 0.55) {
    lf.x = ox + w * (rnd() * 1.5 - 0.15);
    lf.y = oy - h * (0.08 + rnd() * 0.3);
  } else {
    lf.x = ox + w * (1.03 + rnd() * 0.15);
    lf.y = oy + h * (rnd() * 0.7 - 0.1);
  }
  lf.size = d * (lf.layer === 'near' ? 0.026 : 0.016) * (0.75 + 0.5 * rnd());
  lf.hue = rnd();
  lf.k = rnd();
  lf.rot = rnd() * Math.PI * 2;
  lf.spin = (rnd() - 0.5) * 3.0;
  lf.flip = rnd() < 0.38;
  lf.flipRate = (rnd() < 0.5 ? -1 : 1) * (5.6 + 0.8 * rnd());
  lf.flipA = rnd() * Math.PI * 2;
  lf.ph = rnd() * Math.PI * 2;
  lf.fall = h * (lf.layer === 'near' ? 0.085 : 0.06) * (0.8 + 0.4 * rnd());
  lf.vx = 0;
  lf.vy = 0;
  lf.side = 0.5 + rnd();
  lf.age = anywhere ? 1 : 0;
  return lf;
}

var leafRnd = mulberry32(7);

function stepLeaves(t, dt, env, set) {
  var w = FW, h = FH;
  for (var i = 0; i < leaves.length; i++) {
    var lf = leaves[i];
    if (!lf.on) {
      lf.wait -= dt * (0.15 + 1.6 * env * env);
      if (lf.wait <= 0) spawn(lf, leafRnd, false, set);
      continue;
    }
    var near = lf.layer === 'near' ? 1.4 : 1.0;
    var flutter = Math.sin(t * 2.6 + lf.ph);
    lf.vx = -(w * (0.03 + 0.07 * env) * near + w * 0.025 * flutter * lf.side * (lf.flip ? 1.6 : 1.0));
    lf.vy = lf.fall * (0.75 + 0.35 * Math.sin(t * 3.1 + lf.ph * 1.3)) * (lf.flip ? 0.8 : 1.0) * (1.05 - 0.35 * env);
    lf.x += lf.vx * dt;
    lf.y += lf.vy * dt;
    if (lf.flip) {
      lf.rot += lf.flipRate * dt;
      lf.flipA += Math.abs(lf.flipRate) * dt;
    } else {
      lf.rot += (lf.spin + 1.5 * flutter) * dt;
    }
    lf.age += dt;
    if (lf.y > MY + h * 1.1 || lf.x < MX - w * 0.1) { lf.on = false; lf.wait = 0.3 + 2.5 * leafRnd(); }
  }
}

function drawLeaves(ctx, layer, t, px, py, vis) {
  if (vis <= 0.002) return;
  for (var i = 0; i < leaves.length; i++) {
    var lf = leaves[i];
    if (lf.layer !== layer || !lf.on) continue;
    var fade = Math.min(1, lf.age / 0.6) * vis;
    var squash = lf.flip ? 0.2 + 0.8 * Math.abs(Math.cos(lf.flipA)) : 0.72 + 0.28 * Math.abs(Math.cos(t * 1.7 + lf.ph));
    ctx.globalAlpha = fade;
    drawLeaf(ctx, lf.x + px, lf.y + py, lf.size, lf.rot, lf.hue, lightNow[0], lightNow[1], lf.k, squash);
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------ cricket */

function smooth01(a, b, x) {
  var k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

function chirpPulse(x) {
  if (x < 0 || x > 0.42) return 0;
  return smooth01(0.0, 0.08, x) * (1 - smooth01(0.30, 0.42, x));
}

function cricketPose(t) {
  var u = (t + 1.7) % 2.6;
  var quiet = vnoise(t * 0.07 + 77.0) < 0.3 ? 0 : 1;
  var lift = Math.max(chirpPulse(u), chirpPulse(u - 0.55)) * quiet;
  return { lift: lift, chirp: lift > 0.5 ? 1 : 0 };
}

function ink(v) { return 'rgb(' + Math.round(v * 255) + ',0,128)'; }

function cricketLegs(ctx, s, ox, oy, v) {
  ctx.strokeStyle = ink(v);
  ctx.lineWidth = Math.max(s * 0.13, 1);
  ctx.beginPath();
  ctx.moveTo(ox - s * 0.06, oy - s * 0.32);
  ctx.lineTo(ox - s * 0.40, oy - s * 0.72);
  ctx.stroke();
  ctx.lineWidth = Math.max(s * 0.08, 1);
  ctx.beginPath();
  ctx.moveTo(ox - s * 0.40, oy - s * 0.72);
  ctx.lineTo(ox - s * 0.56, oy);
  ctx.lineTo(ox - s * 0.40, oy + s * 0.01);
  ctx.stroke();
  ctx.lineWidth = Math.max(s * 0.05, 1);
  ctx.beginPath();
  ctx.moveTo(ox + s * 0.12, oy - s * 0.24);
  ctx.lineTo(ox + s * 0.02, oy - s * 0.08);
  ctx.lineTo(ox - s * 0.06, oy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + s * 0.32, oy - s * 0.22);
  ctx.lineTo(ox + s * 0.40, oy - s * 0.08);
  ctx.lineTo(ox + s * 0.46, oy);
  ctx.stroke();
}

function cricketWing(ctx, s, ang, v) {
  ctx.save();
  ctx.translate(s * 0.26, -s * 0.45);
  ctx.rotate(ang);
  ctx.fillStyle = ink(v);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-s * 0.36, -s * 0.20, -s * 0.84, -s * 0.10);
  ctx.quadraticCurveTo(-s * 0.94, s * 0.02, -s * 0.78, s * 0.12);
  ctx.quadraticCurveTo(-s * 0.34, s * 0.16, 0, s * 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCricket(ctx, s, t, alpha) {
  if (alpha <= 0.002) return;
  var pose = cricketPose(t);
  var wave = Math.sin(t * 0.9) * 0.05 + Math.sin(t * 2.3 + 1.0) * 0.02;
  var pump = 1 + 0.05 * pose.chirp * Math.sin(t * 83.0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.translate(0, -s * 0.05 * pose.lift);
  ctx.rotate(-0.12 * pose.lift);
  cricketLegs(ctx, s, s * 0.06, s * 0.02, 0.16);
  ctx.fillStyle = ink(0.05);
  ctx.beginPath();
  ctx.ellipse(-s * 0.14, -s * 0.29, s * 0.38, s * 0.19 * pump, 0, 0, 6.2832);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.20, -s * 0.30, s * 0.19, s * 0.18, 0, 0, 6.2832);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.44, -s * 0.27, s * 0.13, 0, 6.2832);
  ctx.fill();
  ctx.strokeStyle = ink(0.08);
  ctx.lineWidth = Math.max(s * 0.045, 1);
  ctx.beginPath();
  ctx.moveTo(-s * 0.50, -s * 0.27);
  ctx.lineTo(-s * 0.80, -s * 0.16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.50, -s * 0.31);
  ctx.lineTo(-s * 0.78, -s * 0.38);
  ctx.stroke();
  cricketLegs(ctx, s, 0, 0, 0.05);
  var wa = pose.lift * 1.05;
  if (pose.chirp) {
    ctx.globalAlpha = alpha * 0.45;
    cricketWing(ctx, s, wa - 0.1, 0.30);
    cricketWing(ctx, s, wa + 0.1, 0.30);
    ctx.globalAlpha = alpha * 0.7;
    cricketWing(ctx, s, wa + 0.12 * Math.sin(t * 97.0), 0.30);
    ctx.globalAlpha = alpha;
  } else {
    cricketWing(ctx, s, wa, 0.30);
  }
  ctx.strokeStyle = ink(0.1);
  ctx.lineWidth = Math.max(s * 0.065, 1.4);
  ctx.beginPath();
  ctx.moveTo(s * 0.54, -s * 0.34);
  ctx.quadraticCurveTo(s * 0.95, -s * 0.90, s * 1.45, -s * (0.98 + wave * 2.0));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.55, -s * 0.30);
  ctx.quadraticCurveTo(s * 1.05, -s * 0.55, s * 1.50, -s * (0.50 - wave * 1.5));
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------- foreground */

function sway(sy, t, breeze) {
  return (Math.sin(t * 0.35 + sy.ph) * 0.006 + Math.sin(t * 0.9 + sy.ph * 2.0) * 0.002) * sy.k * breeze;
}

function drawSet(set, ctx, t, px, py, breeze) {
  var sways = set.systems.map(function (sy) { return sway(sy, t, breeze); });
  var i, sy, cl, cs, ca, sa, rx, ry;
  for (i = 0; i < set.systems.length; i++) {
    sy = set.systems[i];
    ctx.save();
    ctx.translate(sy.ax + px, sy.ay + py);
    ctx.rotate(sways[i]);
    ctx.translate(-sy.ax, -sy.ay);
    ctx.drawImage(sy.c, 0, 0);
    ctx.restore();
  }
  for (i = 0; i < set.clusters.length; i++) {
    cl = set.clusters[i];
    sy = set.systems[cl.sys];
    ca = Math.cos(sways[cl.sys]); sa = Math.sin(sways[cl.sys]);
    rx = sy.ax + (cl.x - sy.ax) * ca - (cl.y - sy.ay) * sa;
    ry = sy.ay + (cl.x - sy.ax) * sa + (cl.y - sy.ay) * ca;
    var burst = 0.5 + 0.5 * Math.sin(t * 0.55 - (cl.x + cl.y) * 0.004 + cl.ph);
    var amp = cl.sprite.cs * 0.022 * (0.25 + 0.75 * burst) * breeze;
    cs = cl.sprite.cs;
    ctx.save();
    ctx.translate(rx + px + amp * Math.sin(t * (2.2 + cl.ph * 0.3) + cl.ph), ry + py + amp * 0.6 * Math.sin(t * 3.1 + cl.ph * 2.0));
    ctx.rotate(sways[cl.sys] + cl.rot + 0.06 * burst * breeze * Math.sin(t * 1.7 + cl.ph));
    ctx.scale(cl.sc, cl.sc);
    ctx.drawImage(cl.sprite.c, -cs / 2, -cs / 2);
    ctx.restore();
  }
}

/* The cricket is drawn once, into the focus-plane layer so its legs
   survive, but rides the left limb's sway and parallax so it stays on
   its perch. The sets share one geometry, so any of them can place it. */

function drawCricketOn(set, ctx, t, px, py, breeze, night) {
  var sy = set.systems[set.perch.sys];
  ctx.save();
  ctx.translate(sy.ax + px, sy.ay + py);
  ctx.rotate(sway(sy, t, breeze));
  ctx.translate(set.perch.x - sy.ax, set.perch.y - sy.ay);
  ctx.rotate(set.perch.ang);
  drawCricket(ctx, set.cs, t, smooth01(0.55, 0.95, night));
  ctx.restore();
}

function drawForeground(t, px, py, w, wind, night, env) {
  var i, sum = 0, active = [];
  if (w.d > 0.002) active.push(['day', w.d]);
  if (w.u > 0.002) active.push(['dusk', w.u]);
  if (w.n > 0.002) active.push(['night', w.n]);
  for (i = 0; i < active.length; i++) sum += active[i][1];
  var breeze = (0.05 + 0.95 * wind) * (0.35 + 0.65 * env);
  fgctx.clearRect(0, 0, fg.width, fg.height);
  if (active.length === 1) {
    drawSet(ensureSet(active[0][0]), fgctx, t, px, py, breeze);
  } else {
    /* the looks share one geometry, so adding the sets by weight is an
       exact blend of their shading that leaves every edge's coverage
       alone; laying one over another would thicken the edges as the
       fade ran and let them go at its end */
    fgctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < active.length; i++) {
      sctx.clearRect(0, 0, scratch.width, scratch.height);
      drawSet(ensureSet(active[i][0]), sctx, t, px, py, breeze);
      fgctx.globalAlpha = active[i][1] / sum;
      fgctx.drawImage(scratch, 0, 0);
    }
    fgctx.globalAlpha = 1;
    fgctx.globalCompositeOperation = 'source-over';
  }
  drawLeaves(fgctx, 'near', t, px, py, wind);
  midctx.clearRect(0, 0, mid.width, mid.height);
  if (night > 0.001) drawCricketOn(ensureSet(active[0][0]), midctx, t, px, py, breeze, night);
  drawLeaves(midctx, 'mid', t, px * 0.5, py * 0.5, wind);
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
  if (!jet.on && t > jet.next) {
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

var look = 'day', tr = null;
var wCur = { d: 1, u: 0, n: 0 }, wFrom = wCur;
var mx = 0, my = 0, tx = 0, ty = 0;
var running = false, raf = 0, last = 0, frameNo = 0;
var visible = !document.hidden, inView = true;
/* the drift starts part way in, at a point set on first layout (see
   resize) where the clouds frame the words rather than crowd one
   corner */
var cloudT = -1, fine = 1, coverBoost = 0;
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
  if (LIMBS.length) ensureSet(name);
  var to = LOOKS[name];
  var dist = Math.max(Math.abs(to.d - wCur.d), Math.abs(to.u - wCur.u), Math.abs(to.n - wCur.n));
  if (instant || reduced.matches || dist < 0.002) {
    wCur = { d: to.d, u: to.u, n: to.n };
    tr = null;
    themeColor(wCur);
  } else {
    /* the fade starts from wherever the weights are now, after the set
       is built so its first frame is not late, and a short way back
       takes a short time: a click mid-fade bends the fade rather than
       restarting or skipping it */
    wFrom = { d: wCur.d, u: wCur.u, n: wCur.n };
    tr = { t0: performance.now(), dur: 600 + 900 * dist };
  }
  wake();
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
  var wind = 1 - w.n;
  var env = still ? 0.5 : windAt(t);
  if (!still) cloudT += dt * wind;
  lightNow = lightScreen(w);
  var sun = sunDir(w);
  var ld = [sun[0], sun[2]];
  var ll = Math.hypot(ld[0], ld[1]) || 1;
  ld = [ld[0] / ll, ld[1] / ll];
  var aspect = canvas.width / canvas.height;
  var tanH = Math.tan(FOV * FOVK / 2);
  /* the pointer turns the camera a little and moves the crown the other
     way, so the sky and the moon slide behind the boughs as the viewer
     shifts; the still frame holds the camera and lets it breathe */
  var cam = [tanH * aspect, tanH, PITCH + my * 0.008 + (still ? 0 : 0.0025 * Math.sin(t * 0.23)), YAW0 + mx * 0.010 + (still ? 0 : 0.003 * Math.sin(t * 0.17 + 1.0))];

  if (!still) { stepLeaves(t, dt, env, sets[look]); stepEvents(t, w); }
  drawForeground(still ? 0 : t, -mx * FW * 0.012, my * FH * 0.012, w, wind, w.n, env);
  var jp = jet.on ? (t - jet.t0) / jet.dur : 0;
  var mp = meteor.on ? Math.min(1, (t - meteor.t0) / meteor.life) : 0;

  gl.bindFramebuffer(gl.FRAMEBUFFER, skyT.fbo);
  gl.viewport(0, 0, skyT.w, skyT.h);
  gl.useProgram(skyProg.p);
  var u = skyProg.u;
  gl.uniform2f(u.R, skyT.w, skyT.h);
  gl.uniform1f(u.CLT, cloudT);
  gl.uniform1f(u.NIGHT, w.n);
  gl.uniform1f(u.DUSK, w.u);
  gl.uniform1f(u.COVER, Math.min(1, Math.max(0, blend('cover', w) + coverBoost)));
  gl.uniform1f(u.FINE, fine);
  gl.uniform1f(u.FOOT, FOOT);
  gl.uniform1f(u.SCALE, SCALE);
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  u3(u.SUN, sun);
  u3(u.MOON, MOON);
  u3(u.ZEN, blend('zen', w));
  u3(u.HOR, blend('hor', w));
  u3(u.DMID, blend('dmid', w));
  u3(u.DFAR, blend('dfar', w));
  u3(u.GLOW, blend('glow', w));
  u3(u.CLIT, blend('clit', w));
  u3(u.CMID, blend('cmid', w));
  u3(u.CSHD, blend('cshd', w));
  gl.uniform2f(u.LD, ld[0], ld[1]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.useProgram(bokehProg.p);
  gl.uniform1i(bokehProg.u.SRC, 0);
  gl.uniform1f(bokehProg.u.SCALE, SCALE);
  gl.activeTexture(gl.TEXTURE0);
  bokeh(skyT.tex, skyT.w, skyT.h, skyB, 1.8, 1.0);
  bokeh(fgTex, fg.width, fg.height, fgB, FBLUR, 0.0);
  bokeh(midTex, mid.width, mid.height, midB, MBLUR, 0.0);

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
  gl.uniform4f(u.FGMAP, FW / fg.width, FH / fg.height, MX / fg.width, MY / fg.height);
  gl.uniform4f(u.MIDMAP, FW / mid.width, FH / mid.height, MX / mid.width, MY / mid.height);
  gl.uniform1f(u.G, still ? 0.37 : (frameNo++ % 977) * 0.013);
  gl.uniform1f(u.T, t);
  gl.uniform4f(u.CAM, cam[0], cam[1], cam[2], cam[3]);
  gl.uniform1f(u.NIGHT, w.n);
  gl.uniform1f(u.DUSK, w.u);
  gl.uniform1f(u.EXPO, blend('expo', w));
  gl.uniform1f(u.SCALE, SCALE);
  gl.uniform1f(u.MOONR, MOON_R);
  gl.uniform1f(u.PH, P);
  gl.uniform1f(u.MGAIN, blend('mgain', w));
  gl.uniform1f(u.STARS, STARS);
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
    var portrait = hh > hw;
    FW = hw; FH = hh;
    D = portrait ? hw : Math.min(hh, Math.round(hw * 0.9));
    FBLUR = 4.0 * D / hh;
    MBLUR = 3.0 * D / hh;
    FOVK = portrait ? 1.15 : 1;
    YAW0 = portrait ? 5 * Math.PI / 180 : 0;
    STARS = portrait ? 2.2 : 1;
    FOOT = portrait ? 0.12 : 0.06;
    MX = Math.round(hw * 0.05); MY = Math.round(hh * 0.05);
    fg.width = mid.width = scratch.width = hw + 2 * MX;
    fg.height = mid.height = scratch.height = hh + 2 * MY;
    layout(portrait);
    drop(skyT); drop(skyB); drop(fgB); drop(midB);
    skyT = target(sw, sh, HDR, true);
    skyB = target(hw, hh, HDR, false);
    fgB = target(fg.width, fg.height, false, false);
    midB = target(mid.width, mid.height, false, false);
    var ar = cw / ch;
    var narrow = Math.min(1, Math.max(0, (16 / 9 - ar) / (16 / 9 - 1)));
    fine = portrait ? 1.1 : 1 + 0.8 * narrow;
    coverBoost = portrait ? 0.06 : -0.18 * narrow;
    /* the drift starts where the sky frames the words: on a desktop a
       cumulus arches over the top left with the moon clear of it, more
       cloud shows through the crown and a low one sits at the right
       foot; a phone, turned toward the tree, sees cloud beside the
       moon and cloud at the foot */
    if (cloudT < 0) cloudT = 140;
    sets = { day: null, dusk: null, night: null };
    seedLeaves();
    scheduleSets();
  }
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

var initial = 'day';
try { initial = sessionStorage.getItem('look') || initial; } catch (err) {}
try { initial = new URLSearchParams(location.search).get('look') || initial; } catch (err) {}
if (!LOOKS[initial]) initial = 'day';
document.documentElement.classList.add('sky');
setLook(initial, true);
resize();

})();
