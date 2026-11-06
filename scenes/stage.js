/* scenes/stage.js · the stage every place but the meadow plays on

   A place is a fragment shader that would take far more than a frame to
   draw in full: rays marched through cliffs, dunes, walls of rock and
   decks of cloud. So, as the meadow does, the stage traces each place
   once for each look into buffers of its own, a band of rows at a time
   between frames, and draws every frame from them: what holds still (the
   land and its light, the sky) is read back, and what moves quickly
   (water and its glitter, cloud shadows passing over the land, the
   stars' twinkle) is drawn fresh over it each frame. A place whose slow
   parts move as well, a sea of cloud drifting, is traced again and again
   for the look on show, a few rows each frame, and the frames between
   two traces are blended from them, so it moves on without a seam and
   without the cost of a whole trace falling in any one frame.

   A scene leaves itself on window.PLACE:
     id, theme: { day, dusk, night }   the sky's colour behind the page
     frag     the GLSL, which defines
                void bake(vec2 fc, out vec4 C, out vec4 D)
                  traced for one look at a time, uLook that look and uTime
                  the time traced: C holds that look's light, packed as
                  the scene likes; D what is the same in every look and at
                  every time (depth, masks), as the scene likes
                vec3 frame(vec2 fc)
                  drawn every frame, uLook the looks' weights and uTime the
                  clock: bakeC(px) reads C blended by those weights,
                  bakeD(px) and bakeDi(px) read D, filtered or not. It
                  returns linear light, and sets gDepth, gFocus and
                  gAperture for the lens. uSlow is the time on show of
                  what was traced
     period   (0)       seconds between traces of the slow parts; 0 holds
                        them still
     t0       (0)       the scene's clock at the start
     budget   (2.2e6)   most pixels traced
     camera   { expo, bloom, thresh, sat, vig, lift, grain, blur }: the
              lens and grade, as the meadow's; a value given per look is
              blended by the looks' weights
   fc counts pixels of the frame on show and RES is its size. What is
   traced reaches a little past it on every side, so the camera can turn
   with the pointer and drift without an edge coming into view.

   places.js makes a stage for a place as a visitor turns to it:
   PlaceStage(scene, { canvas, hero, progress(p), tint(w) }) returns
     ready         a promise, settled once the picture can be shown
     activate()    trace, draw and move; a promise, settled once it is
                   drawn in the look on show
     deactivate()  sleep, keeping the last frame; a first trace not yet
                   done waits where it is
     destroy()     give the GPU back
     onlost        called if the GPU takes the context away
   progress(p) hears how far the first trace has got, from 0 to 1, and
   tint(w) the looks' weights whenever a frame drawn changes them

   WebGL2, no libraries, no build step. */

(function () {
'use strict';

var LOOKS = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
var INDEX = { day: 0, dusk: 1, night: 2 };
var reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------ shaders */

var VERT = '#version 300 es\n' +
  'void main() {\n' +
  '  vec2 v = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);\n' +
  '  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);\n' +
  '}';

var HEAD = '#version 300 es\n' +
  'precision highp float;\n' +
  'precision highp int;\n' +
  'precision highp sampler2D;\n' +
  'uniform vec2 uRes;\n' +
  'uniform vec4 uView;\n' +
  'uniform float uTime;\n' +
  'uniform float uSlow;\n' +
  'uniform vec3 uLook;\n' +
  'uniform vec3 uK;\n' +
  'uniform vec2 uPoint;\n' +
  'uniform float uMoon;\n' +
  'uniform sampler2D uC0, uC1, uC2, uN0, uN1, uN2, uD;\n';

var COMMON = `
#define PI 3.14159265359
#define TAU 6.28318530718
/* the frame on show: its size in pixels */
#define RES (uView.zw)
/* nought, which the compiler cannot know: a loop counted from it stays a
   loop, rather than being unrolled with everything it calls copied out
   into each turn, which would leave a place's programs taking seconds to
   build on some GPUs, the whole page held up meanwhile */
#define ZERO min(int(uRes.x), 0)
/* where the primary ray ended and how the lens is focused, for the
   camera's depth of field; a scene sets them */
float gDepth = 1e6;
float gFocus = 1e6;
float gAperture = 0.0;
float sq(float x) { return x * x; }
float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat(vec3 x) { return clamp(x, 0.0, 1.0); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
/* blends three looks' values by uLook */
float look3(float d, float u, float n) { return d * uLook.x + u * uLook.y + n * uLook.z; }
vec3 look3(vec3 d, vec3 u, vec3 n) { return d * uLook.x + u * uLook.y + n * uLook.z; }
vec4 look3(vec4 d, vec4 u, vec4 n) { return d * uLook.x + u * uLook.y + n * uLook.z; }

/* what was traced, at a pixel of the frame on show: C blended by the
   looks' weights (and, for slow parts, between two traces by uK); D as
   it is, filtered or the one texel */
vec4 lookC(sampler2D a, sampler2D b, float k, vec2 uv) {
  vec4 c = texture(a, uv);
  if (k > 0.0) c = mix(c, texture(b, uv), k);
  return c;
}
vec4 bakeC(vec2 px) {
  vec2 uv = (px + uView.xy) / uRes;
  vec4 c = vec4(0.0);
  if (uLook.x > 0.0) c += lookC(uC0, uN0, uK.x, uv) * uLook.x;
  if (uLook.y > 0.0) c += lookC(uC1, uN1, uK.y, uv) * uLook.y;
  if (uLook.z > 0.0) c += lookC(uC2, uN2, uK.z, uv) * uLook.z;
  return c;
}
vec4 bakeD(vec2 px) { return texture(uD, (px + uView.xy) / uRes); }
vec4 bakeDi(vec2 px) { return texelFetch(uD, ivec2(clamp(floor(px + uView.xy), vec2(0.0), uRes - 1.0)), 0); }

/* hashes: the float ones for small coordinates; the integer ones stay
   exact far from the origin */
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float ihash(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p))) * uvec2(1597334673u, 3812015801u);
  uint n = (q.x ^ q.y) * 1597334673u;
  return float(n) * (1.0 / 4294967295.0);
}
float ihash3(vec3 p) {
  uvec3 q = uvec3(ivec3(floor(p))) * uvec3(1597334673u, 3812015801u, 2798796415u);
  uint n = (q.x ^ q.y ^ q.z) * 1597334673u;
  return float(n) * (1.0 / 4294967295.0);
}

/* value noise, 0..1 */
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ihash(i), ihash(i + vec2(1.0, 0.0)), f.x),
             mix(ihash(i + vec2(0.0, 1.0)), ihash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(ihash3(i), ihash3(i + vec3(1, 0, 0)), f.x), mix(ihash3(i + vec3(0, 1, 0)), ihash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(ihash3(i + vec3(0, 0, 1)), ihash3(i + vec3(1, 0, 1)), f.x), mix(ihash3(i + vec3(0, 1, 1)), ihash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
/* value noise -1..1 with its gradient in .yz */
vec3 noised(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = ihash(i), b = ihash(i + vec2(1.0, 0.0)), c = ihash(i + vec2(0.0, 1.0)), d = ihash(i + vec2(1.0, 1.0));
  float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return vec3(-1.0 + 2.0 * (a + k1 * u.x + k2 * u.y + k4 * u.x * u.y), 2.0 * du * vec2(k1 + k4 * u.y, k2 + k4 * u.x));
}
const mat2 ROT2 = mat2(0.8, 0.6, -0.6, 0.8);
float fbm(vec2 p, int oct) {
  float v = 0.0, a = 0.5;
  for (int i = ZERO; i < 12; i++) { if (i >= oct) break; v += a * noise(p); p = ROT2 * p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float fbm3(vec3 p, int oct) {
  float v = 0.0, a = 0.5;
  for (int i = ZERO; i < 10; i++) { if (i >= oct) break; v += a * noise3(p); p = p * 2.07 + vec3(1.7, 9.2, 4.1); a *= 0.5; }
  return v;
}
`;

/* a trace of one look: its light and what is the same in every look,
   both kept finite, since one NaN would spread through every frame drawn
   from them */
var BAKE_MAIN = `
layout(location = 0) out vec4 oC;
layout(location = 1) out vec4 oD;
void main() {
  vec4 c = vec4(0.0), d = vec4(0.0);
  bake(gl_FragCoord.xy - uView.xy, c, d);
  if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0);
  if (any(isnan(d)) || any(isinf(d))) d = vec4(0.0);
  oC = clamp(c, -60000.0, 60000.0);
  oD = clamp(d, -60000.0, 60000.0);
}
`;

/* a frame: its light, and in alpha how far out of focus the pixel is, in
   pixels, signed: behind the focus +, before it - */
var FRAME_MAIN = `
out vec4 outColor;
void main() {
  vec3 c = frame(gl_FragCoord.xy - uView.xy);
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  c = clamp(c, 0.0, 30000.0);
  float coc = 0.0;
  if (gAperture > 0.0) coc = gAperture * RES.y * (1.0 - gFocus / max(gDepth, 0.01));
  if (isnan(coc)) coc = 0.0;
  outColor = vec4(c, clamp(coc, -512.0, 512.0));
}
`;

var PHEAD = '#version 300 es\n' +
  'precision highp float;\n' +
  'precision highp sampler2D;\n' +
  'out vec4 outColor;\n';

/* the bloom: the bright light kept, softly past a threshold, and halved
   down a chain of smaller buffers, then gathered back up, each level
   widened by a tent and laid on the one above. The first step weighs
   each tap down by its brightness, so a lone hot pixel cannot flicker.
   The chain's alpha carries the widest blur of anything near the lens
   about each place, so a sharp pixel knows when a blurred one in front of
   it spreads over it */
var BLOOM_DOWN = PHEAD + `
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThresh, uExpo, uFirst;
vec4 tap(vec2 uv) {
  vec4 s = texture(uSrc, uv);
  vec3 c = s.rgb;
  float a = s.a;
  if (uFirst > 0.5) {
    c *= uExpo;
    float l = max(c.r, max(c.g, c.b));
    float k = uThresh * 0.5;
    float q = clamp(l - uThresh + k, 0.0, 2.0 * k);
    q = q * q / (4.0 * k + 1e-4);
    c *= max(q, l - uThresh) / max(l, 1e-4);
    c /= 1.0 + max(c.r, max(c.g, c.b)) * 0.1;
    a = max(-s.a, 0.0);
  }
  return vec4(c, a);
}
void main() {
  vec2 uv = (floor(gl_FragCoord.xy) * 2.0 + 1.0) * uTexel;
  vec4 a = tap(uv + uTexel * vec2(-1.0, -1.0)), b = tap(uv + uTexel * vec2(1.0, -1.0));
  vec4 c = tap(uv + uTexel * vec2(-1.0, 1.0)), d = tap(uv + uTexel * vec2(1.0, 1.0));
  outColor = vec4((a.rgb + b.rgb + c.rgb + d.rgb) * 0.25, max(max(a.a, b.a), max(c.a, d.a)));
}
`;

var BLOOM_UP = PHEAD + `
uniform sampler2D uSrc, uAdd;
uniform vec2 uTexel, uSize;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec3 c = texture(uSrc, uv).rgb * 4.0;
  c += (texture(uSrc, uv + uTexel * vec2(-1.0, 0.0)).rgb + texture(uSrc, uv + uTexel * vec2(1.0, 0.0)).rgb
      + texture(uSrc, uv + uTexel * vec2(0.0, -1.0)).rgb + texture(uSrc, uv + uTexel * vec2(0.0, 1.0)).rgb) * 2.0;
  c += texture(uSrc, uv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uSrc, uv + uTexel * vec2(1.0, -1.0)).rgb
     + texture(uSrc, uv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uSrc, uv + uTexel * vec2(1.0, 1.0)).rgb;
  outColor = vec4(c / 16.0 + texture(uAdd, uv).rgb, 1.0);
}
`;

/* the grade the meadow wears: ACES, a little of the colour given back to
   grey (more at night, as the eye sees it), blacks lifted and tinted by
   the look, the corners darkened, and a grain that thins in the shadows */
var GRADE = `
uniform float uExpo, uSat, uVig, uGrain, uLift, uSeed;
float ghash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 grade(vec3 c, vec2 fc, vec2 res) {
  c = max(c * uExpo, 0.0);
  c = clamp(c * (2.51 * c + 0.03) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
  c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, uSat);
  c = c * (1.0 - 4.0 * uLift) + uLift * (1.0 + 100.0 * (mix(vec3(0.006, 0.005, 0.004), vec3(0.0, 0.0015, 0.006), uLook.z) + uLook.y * vec3(0.006, 0.002, 0.0)));
  vec2 uv = fc / res;
  c *= 1.0 - smoothstep(0.45, 0.9, distance(uv, vec2(0.5))) * uVig;
  float g = ghash(fc * 0.913 + uSeed * 517.0) - 0.5;
  c += g * uGrain * (1.0 - uLook.z * 0.45) * (0.15 + 0.85 * smoothstep(0.0, 0.1, dot(c, vec3(0.333))));
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (ghash(fc + uSeed * 113.0) - 0.5) / 255.0;
  return c;
}
`;

/* the picture through the lens, read where the camera now points (uOff
   moves it within the traced margin). A sharp pixel is read through a
   cubic, held within its four texels so it cannot ring, and so the
   drift never softens it. One out of focus, or near one in front of the
   focus that is, gathers a golden spiral of taps out to its disc and
   takes each one whose own disc reaches it, as a lens spreads every point
   it does not focus; what lies behind a pixel spreads over it no further
   than twice its own blur, so a sharp thing keeps its edge against a soft
   background. Then the bloom and the grade */
var COMPOSITE = PHEAD + `
uniform sampler2D uHdr, uBloomT, uNear;
uniform vec2 uRes, uSrc, uOff;
uniform vec3 uLook;
uniform float uMaxCoc, uBloomK;
` + GRADE + `
vec3 cubic(vec2 p) {
  vec2 tc = floor(p - 0.5) + 0.5, f = p - tc;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (tc - 1.0) / uSrc, t3 = (tc + 2.0) / uSrc, t12 = (tc + w2 / w12) / uSrc;
  float a = w12.x * w0.y, b = w0.x * w12.y, c = w12.x * w12.y, d = w3.x * w12.y, e = w12.x * w3.y;
  vec3 r = texture(uHdr, vec2(t12.x, t0.y)).rgb * a + texture(uHdr, vec2(t0.x, t12.y)).rgb * b + texture(uHdr, t12).rgb * c
         + texture(uHdr, vec2(t3.x, t12.y)).rgb * d + texture(uHdr, vec2(t12.x, t3.y)).rgb * e;
  r /= a + b + c + d + e;
  ivec2 i = clamp(ivec2(floor(p - 0.5)), ivec2(0), ivec2(uSrc) - 2);
  vec3 t00 = texelFetch(uHdr, i, 0).rgb, t10 = texelFetch(uHdr, i + ivec2(1, 0), 0).rgb;
  vec3 t01 = texelFetch(uHdr, i + ivec2(0, 1), 0).rgb, t11 = texelFetch(uHdr, i + ivec2(1, 1), 0).rgb;
  return clamp(r, min(min(t00, t10), min(t01, t11)), max(max(t00, t10), max(t01, t11)));
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 sp = fc + uOff;
  vec2 uv = sp / uSrc;
  vec3 col = cubic(sp);
  if (uMaxCoc > 0.5) {
    vec4 c0 = texture(uHdr, uv);
    float k0 = clamp(c0.a, -uMaxCoc, uMaxCoc), s0 = abs(k0);
    float rad = min(max(s0, texture(uNear, uv).a), uMaxCoc);
    if (rad > 0.6) {
      float n = clamp(rad * rad * 0.35, 8.0, 72.0);
      float stp = rad * rad / (2.0 * n);
      float r = max(stp, 0.5), ang = 0.0, tot = 1.0;
      vec3 g = c0.rgb;
      for (int i = 0; i < 72; i++) {
        if (r >= rad) break;
        vec4 s = texture(uHdr, uv + vec2(cos(ang), sin(ang)) * r / uSrc);
        float ks = clamp(s.a, -uMaxCoc, uMaxCoc), ss = abs(ks);
        if (ks > k0) ss = min(ss, s0 * 2.0);
        g += mix(g / tot, s.rgb, smoothstep(r - 0.5, r + 0.5, ss));
        tot += 1.0;
        ang += 2.39996323;
        r += stp / r;
      }
      col = mix(col, g / tot, smoothstep(0.6, 1.6, rad));
    }
  }
  col += texture(uBloomT, uv).rgb * uBloomK;
  outColor = vec4(grade(col, fc, uRes), 1.0);
}
`;

/* -------------------------------------------------------------- stage */

window.PlaceStage = function (S, host) {

var canvas = host.canvas;
var hero = host.hero || canvas.parentNode;
var root = document.documentElement;
var say = host.progress || function () {};
var tint = host.tint || null, tinted = null;
var api = { onlost: null };
var settle = {};
api.ready = new Promise(function (ok, no) { settle.ok = ok; settle.no = no; });
api.ready.catch(function () {});

var gl = null, failed = false, lost = false, destroyed = false, failure = '';
var whenDrawn = [];

function fail(why) {
  failed = true;
  failure = failure || why;
  var e = new Error(why);
  if (settle.no) settle.no(e);
  settle.ok = settle.no = null;
  var q = whenDrawn;
  whenDrawn = [];
  q.forEach(function (f) { f.no(e); });
}

try {
  gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true
  });
} catch (err) {}
if (!gl || soft() || !gl.getExtension('EXT_color_buffer_float') || !S || !S.frag) {
  fail('unsupported');
  api.activate = function () { return Promise.reject(new Error('unsupported')); };
  api.deactivate = api.destroy = function () {};
  return api;
}

/* a renderer in software, as a browser without a GPU falls back on */
function soft() {
  var r = String(gl.getParameter(gl.RENDERER));
  var info = gl.getExtension('WEBGL_debug_renderer_info');
  if (info) r += ' ' + String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
}

/* --------------------------------------------------------- the camera */

var CAM = S.camera || {};
function per(v, d) {
  if (v === undefined) v = d;
  return typeof v === 'number' ? [v, v, v] : v;
}
var LENS = {
  expo: per(CAM.expo, [1, 1, 1]),
  bloom: per(CAM.bloom, [0.05, 0.07, 0.09]),
  thresh: CAM.thresh === undefined ? 1.0 : CAM.thresh,
  sat: per(CAM.sat, [0.92, 0.9, 0.72]),
  vig: per(CAM.vig, [0.14, 0.16, 0.2]),
  lift: per(CAM.lift, [0.003, 0.004, 0.0015]),
  grain: CAM.grain === undefined ? 0.022 : CAM.grain,
  blur: CAM.blur === undefined ? 0.012 : CAM.blur
};
function lw(v) { return v[0] * w[0] + v[1] * w[1] + v[2] * w[2]; }

/* tonight's moon, 0 new, 0.5 full */
var moon = (function () {
  var m = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853;
  return m - Math.floor(m);
})();

/* ------------------------------------------------------------- state */

var active = false, shown = false, slow = false, fps = 60;
var visible = !document.hidden, inView = true, dirty = true;
var raf = 0, last = -1e9, lastP = 0, tick = -1;
/* the scene's clock runs only while it is on show, so a place turned
   back to picks up where it left off */
var clock = 0;
/* the time on show of what is traced, which runs while the slow parts
   move and holds while a look is turned */
var tShow = 0;
var period = S.period || 0;
var px = 0, py = 0, tx = 0, ty = 0;
var look = INDEX[root.getAttribute('data-look')];
if (look === undefined) look = 0;
var w = LOOKS[look].slice(), wFrom = w.slice(), tr = null;
var waiting = -1, waitJob = null, firstJob = null;

var P = null, U = {}, vao = null, dummy = null;
var size = null;
/* what is the same in every look, written by every trace */
var D = null;
/* spare buffers to trace into */
var pool = [];
/* each look as it is on show: X traced at tx, and for a place whose slow
   parts move, Y traced at ty, blended by k */
var LS = [null, null, null];
/* traces under way, the most wanted first: { look, buf, t, y, prio } */
var jobs = [];
/* the next trace of the look on show, for slow parts that move */
var cyc = null;
/* how long a row takes to trace, by look */
var rowMs = [0, 0, 0];
var HDR = null, DOWN = [], UP = [];

/* ------------------------------------------------------------ programs */

function compile(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function link(fragSrc) {
  var p = gl.createProgram();
  var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  p.fs = fs;
  p.src = fragSrc;
  return p;
}

function report(p) {
  if (!gl.getShaderParameter(p.fs, gl.COMPILE_STATUS)) {
    var lines = p.src.split('\n');
    var log = (gl.getShaderInfoLog(p.fs) || '').replace(/ERROR: 0:(\d+):/g, function (m, n) {
      return m + '\n    > ' + (lines[n - 1] || '').trim() + '\n   ';
    });
    console.error('place shader (' + S.id + '):\n' + log);
  } else console.error('place link (' + S.id + '):', gl.getProgramInfoLog(p));
}

function locs(p, names) {
  var u = {};
  names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
  return u;
}

var SCENE_U = ['uRes', 'uView', 'uTime', 'uSlow', 'uLook', 'uK', 'uPoint', 'uMoon', 'uC0', 'uC1', 'uC2', 'uN0', 'uN1', 'uN2', 'uD'];

/* compiled on the driver's own threads where it can, so the page stays
   free while it works */
function build(then) {
  var src = HEAD + COMMON + S.frag;
  var progs = {
    bake: link(src + BAKE_MAIN),
    frame: link(src + FRAME_MAIN),
    down: link(BLOOM_DOWN),
    up: link(BLOOM_UP),
    comp: link(COMPOSITE)
  };
  var all = Object.keys(progs).map(function (k) { return progs[k]; });
  var par = gl.getExtension('KHR_parallel_shader_compile');
  var t0 = performance.now();
  (function check() {
    if (lost || destroyed) return;
    if (par && all.some(function (p) { return !gl.getProgramParameter(p, par.COMPLETION_STATUS_KHR); })) {
      say(0.05 + 0.35 * (1 - Math.exp((t0 - performance.now()) / 1500)));
      setTimeout(check, 32);
      return;
    }
    for (var i = 0; i < all.length; i++) {
      if (!gl.getProgramParameter(all[i], gl.LINK_STATUS)) {
        report(all[i]);
        fail('shader');
        return;
      }
    }
    P = progs;
    U.bake = locs(P.bake, SCENE_U);
    U.frame = locs(P.frame, SCENE_U);
    U.down = locs(P.down, ['uSrc', 'uTexel', 'uThresh', 'uExpo', 'uFirst']);
    U.up = locs(P.up, ['uSrc', 'uAdd', 'uTexel', 'uSize']);
    U.comp = locs(P.comp, ['uHdr', 'uBloomT', 'uNear', 'uRes', 'uSrc', 'uOff', 'uLook', 'uMaxCoc', 'uBloomK', 'uExpo', 'uSat', 'uVig', 'uGrain', 'uLift', 'uSeed']);
    vao = gl.createVertexArray();
    dummy = texture(1, 1);
    say(0.42);
    then();
  })();
}

/* ------------------------------------------------------------- buffers */

function texture(width, height) {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function target(width, height, texs) {
  var fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  texs.forEach(function (t, i) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
  });
  gl.drawBuffers(texs.map(function (t, i) { return gl.COLOR_ATTACHMENT0 + i; }));
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) fail('framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb: fb, tex: texs[0], w: width, h: height };
}

function single(width, height) {
  return target(width, height, [texture(width, height)]);
}

function free(t) {
  if (!t) return;
  gl.deleteFramebuffer(t.fb);
  gl.deleteTexture(t.tex);
}

/* a buffer to trace one look into, writing D beside it */
function buffer() {
  var b = pool.pop();
  if (b) return b;
  if (!D) D = texture(size.W, size.H);
  return target(size.W, size.H, [texture(size.W, size.H), D]);
}

function release(b) {
  if (!b) return;
  if (pool.length < 2) pool.push(b);
  else free(b);
}

/* the frame on show at up to one and a half pixels a point, no more than
   the scene's budget; the traced frame a margin wider on every side */
function measure() {
  var cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (!cw || !ch) return null;
  var k = Math.min(window.devicePixelRatio || 1, 1.5);
  var budget = S.budget || 2.2e6;
  if (cw * ch * k * k > budget) k = Math.sqrt(budget / (cw * ch));
  var vw = Math.max(1, Math.round(cw * k)), vh = Math.max(1, Math.round(ch * k));
  var m = Math.ceil(0.025 * Math.max(vw, vh)) + 2;
  return { vw: vw, vh: vh, mx: m, my: m, W: vw + 2 * m, H: vh + 2 * m };
}

function dropTraces() {
  jobs.forEach(function (j) { free(j.buf); });
  jobs = [];
  cyc = waitJob = firstJob = null;
  LS.forEach(function (s) {
    if (!s) return;
    free(s.X);
    if (s.Y) free(s.Y);
  });
  LS = [null, null, null];
  pool.forEach(free);
  pool = [];
  if (D) gl.deleteTexture(D);
  D = null;
}

function frameTargets() {
  free(HDR);
  DOWN.forEach(free);
  UP.forEach(free);
  HDR = single(size.W, size.H);
  DOWN = [];
  UP = [];
  var w0 = size.W, h0 = size.H;
  for (var i = 0; i < 5; i++) {
    w0 = Math.max(1, Math.ceil(w0 / 2));
    h0 = Math.max(1, Math.ceil(h0 / 2));
    DOWN.push(single(w0, h0));
  }
  for (var j = 0; j < 4; j++) UP.push(single(DOWN[j].w, DOWN[j].h));
}

/* ------------------------------------------------------------- tracing */

function at(s) { return s.Y ? s.tx + s.k * (s.ty - s.tx) : s.tx; }
function same(a, b) { return Math.abs(a - b) < 1e-4; }

/* the samplers a scene reads; while tracing, none of what is being
   written may be bound, so all of them are left empty */
function bindScene(u, live) {
  gl.uniform2f(u.uRes, size.W, size.H);
  gl.uniform4f(u.uView, size.mx, size.my, size.vw, size.vh);
  gl.uniform1f(u.uMoon, moon);
  var k = [0, 0, 0];
  for (var i = 0; i < 3; i++) {
    var s = live ? LS[i] : null;
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, s ? s.X.tex : dummy);
    gl.activeTexture(gl.TEXTURE3 + i);
    gl.bindTexture(gl.TEXTURE_2D, s && s.Y ? s.Y.tex : dummy);
    if (s && s.Y) k[i] = s.k;
  }
  gl.activeTexture(gl.TEXTURE6);
  gl.bindTexture(gl.TEXTURE_2D, live && D ? D : dummy);
  gl.uniform1i(u.uC0, 0);
  gl.uniform1i(u.uC1, 1);
  gl.uniform1i(u.uC2, 2);
  gl.uniform1i(u.uN0, 3);
  gl.uniform1i(u.uN1, 4);
  gl.uniform1i(u.uN2, 5);
  gl.uniform1i(u.uD, 6);
  gl.uniform3f(u.uK, k[0], k[1], k[2]);
  gl.activeTexture(gl.TEXTURE0);
}

/* rows y0 to y1 of a job */
function trace(j, y0, y1) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, j.buf.fb);
  gl.viewport(0, 0, size.W, size.H);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, y0, size.W, y1 - y0);
  gl.useProgram(P.bake);
  gl.bindVertexArray(vao);
  bindScene(U.bake, false);
  gl.uniform1f(U.bake.uTime, (S.t0 || 0) + j.t);
  gl.uniform1f(U.bake.uSlow, (S.t0 || 0) + j.t);
  gl.uniform3f(U.bake.uLook, LOOKS[j.look][0], LOOKS[j.look][1], LOOKS[j.look][2]);
  gl.uniform2f(U.bake.uPoint, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.SCISSOR_TEST);
}

/* a look traced whole at time t; then(j) once it is */
function traceLook(i, t, prio, then) {
  var j = { look: i, buf: buffer(), t: t, y: 0, prio: prio, then: then, done: false };
  jobs.push(j);
  jobs.sort(function (a, b) { return b.prio - a.prio; });
  return j;
}

function cancel(j) {
  if (!j) return;
  var k = jobs.indexOf(j);
  if (k >= 0) jobs.splice(k, 1);
  release(j.buf);
  j.buf = null;
}

/* trace for about ms milliseconds of the GPU's time. With sync, each band
   is waited on and timed, as while the picture is first made; otherwise
   the rows are counted from what earlier bands took, so a frame on show
   never waits on the GPU */
var PXF = new Float32Array(4);
function work(ms, sync, minPrio) {
  var spent = 0;
  while (jobs.length && spent < ms && jobs[0].prio >= minPrio) {
    var j = jobs[0];
    var cost = rowMs[j.look] || Math.max(rowMs[0], rowMs[1], rowMs[2]);
    var rows = cost > 0 ? Math.floor((ms - spent) / cost) : Math.ceil(size.H / 24);
    rows = Math.max(sync ? 8 : 2, Math.min(rows, size.H - j.y));
    var t0 = performance.now();
    trace(j, j.y, j.y + rows);
    if (sync) {
      gl.readPixels(0, j.y, 1, 1, gl.RGBA, gl.FLOAT, PXF);
      var dt = performance.now() - t0;
      /* the first band of a look also finishes its program on the GPU */
      if (rowMs[j.look] || j.y > 0) {
        var r = dt / rows;
        rowMs[j.look] = rowMs[j.look] ? rowMs[j.look] * 0.6 + r * 0.4 : r;
      }
      spent += dt;
    } else spent += rows * (cost || 0.05);
    j.y += rows;
    if (j.y >= size.H) {
      jobs.shift();
      j.done = true;
      if (j.then) j.then(j);
    }
  }
  return spent;
}

/* a look's state replaced by a fresh trace of it */
function adopt(j) {
  var s = LS[j.look];
  if (s) {
    release(s.X);
    release(s.Y);
  }
  LS[j.look] = { X: j.buf, tx: j.t, Y: null, ty: j.t, k: 0 };
}

/* -------------------------------------------------------------- slow */

/* the slow parts of the look on show move on: it is traced again a
   period ahead of what is on show, paced so the trace is done by the time
   it is wanted, and blended toward */
function advance(dt) {
  var l = w.indexOf(1);
  if (l < 0 || !LS[l]) return;
  var s = LS[l];
  if (cyc && cyc.look !== l) {
    cancel(cyc);
    cyc = null;
  }
  if (!s.Y) {
    if (cyc && cyc.done) {
      s.Y = cyc.buf;
      s.ty = cyc.t;
      s.k = 0;
      cyc = null;
    }
  } else {
    s.k = Math.min(1, s.k + dt / Math.max(s.ty - s.tx, 0.05));
    if (s.k >= 1) {
      if (cyc && cyc.done) {
        release(s.X);
        s.X = s.Y;
        s.tx = s.ty;
        s.Y = cyc.buf;
        s.ty = cyc.t;
        s.k = 0;
        cyc = null;
      } else if (cyc) {
        /* the GPU is slower than was thought: take longer over each */
        period = Math.min(period * 1.15, 60);
      }
    }
  }
  if (!cyc) cyc = traceLook(l, (s.Y ? s.ty : s.tx) + period, 0, null);
}

/* the GPU's time a frame gives the next trace: enough to finish it in
   most of a period */
function paced(dt) {
  var cost = rowMs[look] || Math.max(rowMs[0], rowMs[1], rowMs[2]) || 0.05;
  return Math.min(6, Math.max(0.25, size.H * cost * dt / (0.7 * period)));
}

/* ------------------------------------------------------------- drawing */

function pass(t, prg) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
  gl.viewport(0, 0, t ? t.w : canvas.width, t ? t.h : canvas.height);
  gl.useProgram(prg);
}

function bind(unit, tex, loc) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(loc, unit);
}

/* where the camera points: a little toward the pointer, and drifting
   slowly about that, as a camera on a tripod does in a light wind */
function aim() {
  var m = size.mx;
  var t = clock;
  var still = slow || reduced.matches;
  var dx = still ? 0 : 0.6 * Math.sin(t * 0.131 + 0.4) + 0.4 * Math.sin(t * 0.217 + 2.1);
  var dy = still ? 0 : 0.6 * Math.sin(t * 0.097 + 1.3) + 0.4 * Math.sin(t * 0.179 + 4.0);
  return [m * (1 + 0.34 * px + 0.1 * dx), size.my * (1 + 0.22 * py + 0.08 * dy)];
}

function draw(now) {
  var still = slow || reduced.matches;
  var l = still ? 1 : 1 - Math.exp(-Math.max(0, now - lastP) / 260);
  lastP = now;
  px += ((still ? 0 : tx) - px) * l;
  py += ((still ? 0 : ty) - py) * l;

  gl.bindVertexArray(vao);
  pass(HDR, P.frame);
  bindScene(U.frame, true);
  gl.uniform1f(U.frame.uTime, (S.t0 || 0) + clock);
  gl.uniform1f(U.frame.uSlow, (S.t0 || 0) + tShow);
  gl.uniform3f(U.frame.uLook, w[0], w[1], w[2]);
  gl.uniform2f(U.frame.uPoint, px, py);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  var i, src;
  for (i = 0; i < DOWN.length; i++) {
    src = i ? DOWN[i - 1] : HDR;
    pass(DOWN[i], P.down);
    bind(0, src.tex, U.down.uSrc);
    gl.uniform2f(U.down.uTexel, 1 / src.w, 1 / src.h);
    gl.uniform1f(U.down.uThresh, LENS.thresh);
    gl.uniform1f(U.down.uExpo, lw(LENS.expo));
    gl.uniform1f(U.down.uFirst, i ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  for (i = UP.length - 1; i >= 0; i--) {
    src = i === UP.length - 1 ? DOWN[DOWN.length - 1] : UP[i + 1];
    pass(UP[i], P.up);
    bind(0, src.tex, U.up.uSrc);
    bind(1, DOWN[i].tex, U.up.uAdd);
    gl.uniform2f(U.up.uTexel, 1 / src.w, 1 / src.h);
    gl.uniform2f(U.up.uSize, UP[i].w, UP[i].h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var off = aim();
  pass(null, P.comp);
  var u = U.comp;
  bind(0, HDR.tex, u.uHdr);
  bind(1, UP[0].tex, u.uBloomT);
  bind(2, DOWN[2].tex, u.uNear);
  gl.uniform2f(u.uRes, canvas.width, canvas.height);
  gl.uniform2f(u.uSrc, size.W, size.H);
  gl.uniform2f(u.uOff, off[0], off[1]);
  gl.uniform3f(u.uLook, w[0], w[1], w[2]);
  gl.uniform1f(u.uMaxCoc, LENS.blur * size.vh);
  gl.uniform1f(u.uBloomK, lw(LENS.bloom));
  gl.uniform1f(u.uExpo, lw(LENS.expo));
  gl.uniform1f(u.uSat, lw(LENS.sat));
  gl.uniform1f(u.uVig, lw(LENS.vig));
  /* the grain is drawn per canvas pixel, so it thins as they grow, or a
     phone would see it in blocks */
  var spread = canvas.clientWidth * (window.devicePixelRatio || 1) / canvas.width;
  gl.uniform1f(u.uGrain, LENS.grain * Math.min(1, Math.pow(1.25 / Math.max(spread, 1e-3), 1.5)));
  gl.uniform1f(u.uLift, lw(LENS.lift));
  gl.uniform1f(u.uSeed, still ? 0.37 : (now * 0.00731) % 1);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.activeTexture(gl.TEXTURE0);
  if (tint && (!tinted || tinted[0] !== w[0] || tinted[1] !== w[1] || tinted[2] !== w[2])) {
    tinted = w.slice();
    tint(tinted);
  }
}

/* ------------------------------------------------------------- looks */

/* a turn to look i: at once if it is traced at the time on show, or once
   it is, the clock on the slow parts held meanwhile */
function request(i, instant) {
  if (w[i] === 1 && !tr) {
    waiting = -1;
    return;
  }
  var s = LS[i];
  if (s && same(at(s), tShow)) {
    turnTo(i, instant);
    return;
  }
  if (waitJob && waitJob.look === i && same(waitJob.t, tShow)) {
    waiting = i;
    return;
  }
  if (waitJob && w[waitJob.look] === 0) cancel(waitJob);
  waiting = i;
  waitJob = traceLook(i, tShow, 3, function (j) {
    if (waitJob === j) waitJob = null;
    adopt(j);
    if (waiting === j.look) turnTo(j.look, instant);
  });
  wake(true);
}

function turnTo(i, instant) {
  waiting = -1;
  var to = LOOKS[i];
  var dist = Math.max(Math.abs(to[0] - w[0]), Math.abs(to[1] - w[1]), Math.abs(to[2] - w[2]));
  var dur = instant || reduced.matches || slow || dist < 0.002 ? 0 : 700 + 900 * dist;
  if (!dur) {
    w = to.slice();
    tr = null;
    settled(i);
  } else {
    wFrom = w.slice();
    tr = { t0: performance.now(), dur: dur, to: i };
  }
  wake(true);
}

/* a turn over: a place whose slow parts move keeps only the look on
   show, the others traced again when turned to */
function settled(i) {
  if (!period) return;
  for (var l = 0; l < 3; l++) {
    if (l === i || !LS[l]) continue;
    release(LS[l].X);
    release(LS[l].Y);
    LS[l] = null;
  }
}

function turn(now) {
  if (!tr) return;
  var k = Math.min(1, (now - tr.t0) / tr.dur);
  k = k * k * (3 - 2 * k);
  var to = LOOKS[tr.to];
  w = [0, 1, 2].map(function (i) { return wFrom[i] + (to[i] - wFrom[i]) * k; });
  if (k >= 1) {
    w = to.slice();
    var i = tr.to;
    tr = null;
    settled(i);
  }
}

var onLook = function (ev) {
  var b = ev.target.closest && ev.target.closest('.looks button');
  if (!b) return;
  var i = INDEX[b.getAttribute('data-look')];
  if (i === undefined) return;
  look = i;
  if (P && size && shown && active) request(i, false);
};
document.addEventListener('click', onLook);

/* ------------------------------------------------------------- the loop */

function animating() {
  return active && shown && visible && inView && !reduced.matches && !slow;
}

function frame(now) {
  raf = 0;
  if (lost || failed || destroyed || !P || !size || !active) return;
  if (!shown) {
    first();
    return;
  }
  var dt = tick < 0 ? 0 : Math.min(0.1, (now - tick) / 1000);
  tick = now;
  var moving = animating();
  if (moving) clock += dt;

  if (jobs.length) {
    var top = jobs[0].prio;
    if (top >= 3) work(12, false, 3);
    else if (top >= 1) work(2.5, false, 1);
    else if (moving) work(paced(dt), false, 0);
  }
  if (period && moving && !tr && waiting < 0) advance(dt);
  turn(now);
  for (var i = 0; i < 3; i++) {
    if (w[i] > 0 && LS[i]) {
      tShow = at(LS[i]);
      break;
    }
  }

  var busy = tr || Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002;
  if (dirty || ((busy || moving) && now - last >= 1000 / fps - 3)) {
    dirty = false;
    draw(now);
    last = now;
    if (waiting < 0) drawn();
  }
  if (moving || tr || waiting >= 0 || dirty || busy || (jobs.length && jobs[0].prio >= 1)) raf = requestAnimationFrame(frame);
  else tick = -1;
}

function wake(redraw) {
  if (redraw) dirty = true;
  if (!raf && !lost && !failed && !destroyed && P && size && active) raf = requestAnimationFrame(frame);
}

function drawn() {
  var q = whenDrawn;
  whenDrawn = [];
  q.forEach(function (f) { f.ok(); });
}

/* the first trace: the look on show, band by band, each timed, so the
   page can say how far it has got; then a few frames drawn unseen and
   timed, to choose how often to draw */
var timing = [];
function first() {
  if (!LS[look]) {
    if (!firstJob || firstJob.look !== look) {
      cancel(firstJob);
      firstJob = traceLook(look, tShow, 2, function (j) {
        if (firstJob === j) firstJob = null;
        adopt(j);
      });
    }
    work(10, true, 2);
    say(0.45 + 0.47 * (firstJob ? firstJob.y / size.H : 1));
    raf = requestAnimationFrame(frame);
    return;
  }
  w = LOOKS[look].slice();
  if (!HDR || HDR.w !== size.W || HDR.h !== size.H) frameTargets();
  if (canvas.width !== size.vw || canvas.height !== size.vh) {
    canvas.width = size.vw;
    canvas.height = size.vh;
  }
  var t0 = performance.now();
  draw(t0);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  timing.push(performance.now() - t0);
  if (timing.length < 4) {
    say(0.93 + 0.015 * timing.length);
    raf = requestAnimationFrame(frame);
    return;
  }
  timing.sort(function (a, b) { return a - b; });
  var med = timing[1];
  timing = [];
  fps = med < 7 ? 60 : 30;
  slow = med > 26;
  if (period) {
    /* the slow parts take at most a few hundredths of the GPU's time */
    var whole = size.H * (rowMs[look] || 0);
    period = Math.max(S.period, whole / 1000 / 0.05);
  }
  shown = true;
  say(1);
  /* a place whose slow parts hold still has its other looks traced
     quietly, so a turn to them is at once */
  if (!period) {
    for (var i = 0; i < 3; i++) {
      if (i !== look && !LS[i]) traceLook(i, 0, 1, adopt);
    }
  }
  if (settle.ok) settle.ok(api);
  settle.ok = settle.no = null;
  dirty = true;
  if (active) raf = requestAnimationFrame(frame);
}

/* ------------------------------------------------------------- sizes */

function start() {
  size = measure();
  if (!size) {
    setTimeout(start, 120);
    return;
  }
  dropTraces();
  shown = false;
  wake(true);
}

/* a new size traces the place again for it, the last frame held on
   screen meanwhile */
var resizing = 0;
function resized() {
  if (!P || lost || failed || destroyed) return;
  var s = measure();
  if (!s || (size && s.vw === size.vw && s.vh === size.vh)) return;
  clearTimeout(resizing);
  resizing = setTimeout(function () {
    resizing = 0;
    var s2 = measure();
    if (!s2 || (size && s2.vw === size.vw && s2.vh === size.vh)) return;
    size = s2;
    dropTraces();
    tr = null;
    waiting = -1;
    shown = false;
    wake(true);
  }, shown ? 240 : 0);
}

/* ------------------------------------------------------------- wiring */

var onMove = function (ev) {
  if (reduced.matches || slow || ev.pointerType === 'touch') return;
  var r = hero.getBoundingClientRect();
  tx = ((ev.clientX - r.left) / r.width - 0.5) * 2;
  ty = ((ev.clientY - r.top) / r.height - 0.5) * -2;
  if (active) wake(false);
};
var onLeave = function () {
  tx = ty = 0;
  if (active) wake(false);
};
var onVis = function () {
  visible = !document.hidden;
  tick = -1;
  if (visible) wake(true);
};
var onMotion = function () { wake(true); };
hero.addEventListener('pointermove', onMove);
hero.addEventListener('pointerleave', onLeave);
document.addEventListener('visibilitychange', onVis);
reduced.addEventListener('change', onMotion);

var io = null, ro = null;
if (window.IntersectionObserver) {
  io = new IntersectionObserver(function (entries) {
    inView = entries[entries.length - 1].isIntersecting;
    tick = -1;
    if (inView) wake(true);
  }, { threshold: 0.01 });
  io.observe(hero);
}
if (window.ResizeObserver) {
  ro = new ResizeObserver(resized);
  ro.observe(canvas);
} else addEventListener('resize', resized);

canvas.addEventListener('webglcontextlost', function (ev) {
  ev.preventDefault();
  lost = true;
  P = null;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  fail('lost');
  if (api.onlost) api.onlost();
});

/* ------------------------------------------------------------- the api */

api.activate = function () {
  if (failed || destroyed) return Promise.reject(new Error(failure || 'destroyed'));
  active = true;
  tick = -1;
  last = -1e9;
  tinted = null;
  var i = INDEX[root.getAttribute('data-look')];
  if (i !== undefined) look = i;
  var p = new Promise(function (ok, no) { whenDrawn.push({ ok: ok, no: no }); });
  /* turned to in another look than it was left in: shown in that one
     from the first frame */
  if (shown && w[look] !== 1) {
    tr = null;
    var s = LS[look];
    if (s && same(at(s), tShow)) {
      w = LOOKS[look].slice();
      settled(look);
    } else request(look, true);
  }
  wake(true);
  return p;
};

api.deactivate = function () {
  active = false;
  tx = ty = 0;
  px = py = 0;
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
};

api.destroy = function () {
  if (destroyed) return;
  destroyed = true;
  active = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  document.removeEventListener('click', onLook);
  hero.removeEventListener('pointermove', onMove);
  hero.removeEventListener('pointerleave', onLeave);
  document.removeEventListener('visibilitychange', onVis);
  reduced.removeEventListener('change', onMotion);
  if (io) io.disconnect();
  if (ro) ro.disconnect();
  else removeEventListener('resize', resized);
  var ext = gl.getExtension('WEBGL_lose_context');
  if (ext) ext.loseContext();
  fail('destroyed');
};

/* for testing: how it chose to run, and a pose held still for a picture */
api.stats = function () {
  return { fps: fps, slow: slow, period: period, rowMs: rowMs.slice(), size: size, shown: shown, look: look, w: w.slice(), tShow: tShow, clock: clock, jobs: jobs.length };
};
api.pose = function (t) {
  clock = t;
  px = py = tx = ty = 0;
  if (P && shown) draw(performance.now());
};

build(start);
return api;

};

})();
