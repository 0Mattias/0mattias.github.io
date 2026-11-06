/* concepts/stage.js · the stage a concept scene plays on

   The page side of every concept: the three looks and the turn between
   them, the canvas and the size it is drawn at, the frame loop, the
   pointer, and the still the page keeps where the picture cannot run. A
   scene file loaded before this one leaves itself on window.CONCEPT; this
   compiles its fragment shader between a common head and a common finish
   and draws it over the whole canvas each frame.

   A scene's shader defines   vec3 scene(vec2 fragCoord)
   and returns linear, unclamped radiance. The camera takes it from
   there as the meadow's does: the picture is drawn into a buffer of
   high range, then focused (a bokeh disc as wide as each pixel is out of
   focus), bloomed (bright light spreads into a glow), exposed, toned
   (ACES), graded, vignetted, grained, encoded and dithered. Where the
   browser cannot draw into such a buffer, the picture is toned and
   graded in one pass, without focus or bloom.

   For focus, a scene sets three globals at its primary hit:
     gDepth     metres from the eye to what the pixel shows (sky: 1e6)
     gFocus     metres to the plane in focus
     gAperture  how far out of focus a pixel goes, as a share of the
                frame's height per unit of (1 - gFocus / gDepth)
   Left as they are (gAperture 0), the whole frame is sharp.

   It may read:
     uRes    the canvas, in pixels
     uTime   seconds
     uLook   the weights of day, dusk and night, summing to one. They turn
             smoothly when a look is chosen, so every light in a scene is a
             blend of its three by these weights
     uPoint  the pointer over the hero, -1..1 each way, smoothed
     uMoon   tonight's phase, 0 new, 0.5 full
   and the noise and helpers in COMMON below.

   window.CONCEPT = {
     id, theme: { day, dusk, night },   the sky's colour behind the page
     frag,                              the GLSL
     scale   (0.75)   pixels drawn per CSS pixel, before the density cap
     budget  (1.4e6)  most pixels drawn in all
     fps     (30)     frames a second while it moves
     t0      (0)      seconds on the clock at the start
     camera  {        the lens and the grade; a value given per look is
                      blended by the look weights
       expo   [1, 1, 1]            exposure, day, dusk, night
       bloom  [0.05, 0.07, 0.09]   how much of the bright light glows
       thresh (1.0)                radiance, after exposure, that glows
       sat    [0.92, 0.9, 0.72]    share of the colour kept
       vig    [0.14, 0.16, 0.2]    darkening toward the corners
       grain  (0.024)              film grain
       blur   (0.012)              widest bokeh, a share of the height
     }
   }

   WebGL2, no libraries, no build step. */

(function () {
'use strict';

function later() {
  requestAnimationFrame(function () { setTimeout(start, 0); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later);
else later();

function start() {

var root = document.documentElement;
var hero = document.querySelector('.letterhead');
var canvas = document.getElementById('sky');
var buttons = Array.prototype.slice.call(document.querySelectorAll('.looks button'));
var S = window.CONCEPT;
if (!hero || !canvas) return;

var q = new URLSearchParams(location.search);
var STILL = q.has('still');
var reduced = matchMedia('(prefers-reduced-motion: reduce)');
var LOOKS = { day: [1, 0, 0], dusk: [0, 1, 0], night: [0, 0, 1] };
var MINQ = 0.4;

if (STILL) root.classList.add('capture');

/* ------------------------------------------------------------ looks */

function rgb(h) {
  var n = parseInt(String(h).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

var theme = S && S.theme ? S.theme : { day: '#6282b6', dusk: '#495282', night: '#2d313e' };
var TH = { day: rgb(theme.day), dusk: rgb(theme.dusk), night: rgb(theme.night) };
var themeMeta = document.querySelector('meta[name="theme-color"]');

var look = 'day', w = [1, 0, 0], wFrom = w, tr = null, turning = 0;
var gl = null, prog = null, U = {}, vao = null;
var live = false, slow = false, lost = false, failed = false, dirty = true;
var raf = 0, last = -1e9, lastP = 0, clock0 = performance.now(), frozenT = null;
var px = 0, py = 0, tx = 0, ty = 0;
var visible = !document.hidden, inView = true;
var quality = 1, probing = 0, times = [];
var PX = new Uint8Array(4);

function themeColor() {
  if (!themeMeta) return;
  var c = [0, 1, 2].map(function (i) {
    return Math.round(TH.day[i] * w[0] + TH.dusk[i] * w[1] + TH.night[i] * w[2]);
  });
  themeMeta.setAttribute('content', 'rgb(' + c.join(',') + ')');
}

function posterURL() {
  var a = innerWidth / Math.max(innerHeight, 480);
  return new URL('stills/' + (S ? S.id : '') + '-' + look + '-' + (a > 1.2 ? 'wide' : 'tall') + '.webp', location.href).href;
}

function setLook(name, instant) {
  look = name;
  buttons.forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-look') === name));
  });
  var to = LOOKS[name];
  var dist = Math.max(Math.abs(to[0] - w[0]), Math.abs(to[1] - w[1]), Math.abs(to[2] - w[2]));
  var dur = instant || reduced.matches || !live || slow || dist < 0.002 ? 0 : 700 + 900 * dist;
  if (!dur) {
    w = to.slice();
    tr = null;
  } else {
    wFrom = w.slice();
    tr = { t0: performance.now(), dur: dur };
  }
  clearTimeout(turning);
  root.classList.toggle('turning', dur > 0);
  if (dur) turning = setTimeout(function () { root.classList.remove('turning'); }, dur + 100);
  root.style.setProperty('--turn', Math.round(dur) + 'ms');
  root.setAttribute('data-look', name);
  root.style.setProperty('--sky', theme[name]);
  root.style.setProperty('--poster', 'url("' + posterURL() + '")');
  themeColor();
  wake(true);
}

function turn(now) {
  if (!tr) return;
  var k = Math.min(1, (now - tr.t0) / tr.dur);
  k = k * k * (3 - 2 * k);
  var to = LOOKS[look];
  w = [0, 1, 2].map(function (i) { return wFrom[i] + (to[i] - wFrom[i]) * k; });
  themeColor();
  if (k >= 1) tr = null;
}

buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    var n = b.getAttribute('data-look');
    if (n === look) return;
    try { sessionStorage.setItem('look', n); } catch (err) {}
    setLook(n, false);
  });
});

window.setConceptLook = function (n) {
  if (!LOOKS[n] || n === look) return;
  try { sessionStorage.setItem('look', n); } catch (err) {}
  setLook(n, false);
};

var initial = root.getAttribute('data-look');
if (!LOOKS[initial]) initial = 'day';
setLook(initial, true);
root.classList.add('sky');

/* a capture may hold the weights anywhere between the looks (?mix=d,u,n),
   to see a scene partway through a turn */
if (STILL && q.get('mix')) {
  var mix = q.get('mix').split(',').map(Number), sum = mix[0] + mix[1] + mix[2];
  if (mix.length === 3 && sum > 0) w = mix.map(function (v) { return v / sum; });
}

/* ------------------------------------------------------------ camera */

var CAM = (S && S.camera) || {};
function per(v, d) {
  if (v === undefined) v = d;
  return typeof v === 'number' ? [v, v, v] : v;
}
var CAMERA = {
  expo: per(CAM.expo, [1, 1, 1]),
  bloom: per(CAM.bloom, [0.05, 0.07, 0.09]),
  thresh: CAM.thresh === undefined ? 1.0 : CAM.thresh,
  sat: per(CAM.sat, [0.92, 0.9, 0.72]),
  vig: per(CAM.vig, [0.14, 0.16, 0.2]),
  grain: CAM.grain === undefined ? 0.024 : CAM.grain,
  blur: CAM.blur === undefined ? 0.012 : CAM.blur
};
function lw(v) { return v[0] * w[0] + v[1] * w[1] + v[2] * w[2]; }

/* ----------------------------------------------------------- shaders */

var VERT = '#version 300 es\n' +
  'void main() {\n' +
  '  vec2 v = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);\n' +
  '  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);\n' +
  '}';

var HEAD = '#version 300 es\n' +
  'precision highp float;\n' +
  'precision highp int;\n' +
  'uniform vec2 uRes;\n' +
  'uniform float uTime;\n' +
  'uniform vec3 uLook;\n' +
  'uniform vec2 uPoint;\n' +
  'uniform float uMoon;\n' +
  'out vec4 outColor;\n';

var COMMON = `
#define PI 3.14159265359
#define TAU 6.28318530718
/* where the primary ray ended and how the lens is focused, for the
   camera's depth of field; a scene sets them at its hit */
float gDepth = 1e6;
float gFocus = 1e6;
float gAperture = 0.0;
float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat(vec3 x) { return clamp(x, 0.0, 1.0); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
/* blends three looks' values by uLook */
float look3(float d, float u, float n) { return d * uLook.x + u * uLook.y + n * uLook.z; }
vec3 look3(vec3 d, vec3 u, vec3 n) { return d * uLook.x + u * uLook.y + n * uLook.z; }
vec4 look3(vec4 d, vec4 u, vec4 n) { return d * uLook.x + u * uLook.y + n * uLook.z; }

/* hashes: the float ones for small coordinates, the integer ones stay
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
  for (int i = 0; i < 12; i++) { if (i >= oct) break; v += a * noise(p); p = ROT2 * p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float fbm3(vec3 p, int oct) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 10; i++) { if (i >= oct) break; v += a * noise3(p); p = p * 2.07 + vec3(1.7, 9.2, 4.1); a *= 0.5; }
  return v;
}
`;

/* the grade the meadow wears: ACES, a little of the colour given back to
   grey (more at night, as the eye sees it), blacks lifted and tinted by
   the look, the corners darkened, and a grain that thins in the shadows */
var GRADE = `
uniform float uExpo, uSat, uVig, uGrain;
vec3 grade(vec3 c, vec2 fc) {
  c = max(c * uExpo, 0.0);
  c = clamp(c * (2.51 * c + 0.03) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
  c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, uSat);
  c = c * 0.96 + 0.01 + mix(vec3(0.006, 0.005, 0.004), vec3(0.0, 0.0015, 0.006), uLook.z) + uLook.y * vec3(0.006, 0.002, 0.0);
  vec2 uv = fc / uRes;
  c *= 1.0 - smoothstep(0.45, 0.9, distance(uv, vec2(0.5))) * uVig;
  float g = hash12(fc * 0.913 + fract(uTime * 0.37) * 517.0) - 0.5;
  c += g * uGrain * (1.0 - uLook.z * 0.45) * (0.15 + 0.85 * smoothstep(0.0, 0.1, dot(c, vec3(0.333))));
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (hash12(fc + fract(uTime * 7.31) * 113.0) - 0.5) / 255.0;
  return c;
}
`;

/* into the buffer: the radiance, and in alpha how far out of focus the
   pixel is, in pixels, signed (behind the focus +, before it -) */
var FINISH_HDR = `
void main() {
  vec3 c = scene(gl_FragCoord.xy);
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  c = clamp(c, 0.0, 30000.0);
  float coc = 0.0;
  if (gAperture > 0.0) coc = gAperture * uRes.y * (1.0 - gFocus / max(gDepth, 0.01));
  outColor = vec4(c, clamp(coc, -512.0, 512.0));
}
`;

/* straight to the canvas, where there is no buffer to draw into */
var FINISH_LDR = GRADE + `
void main() {
  vec3 c = scene(gl_FragCoord.xy);
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  outColor = vec4(grade(c, gl_FragCoord.xy), 1.0);
}
`;

var PHEAD = '#version 300 es\n' +
  'precision highp float;\n' +
  'precision highp sampler2D;\n' +
  'out vec4 outColor;\n';

/* the bloom: the bright light kept (softly, past a threshold) and halved
   down a chain of ever smaller buffers, then gathered back up, each level
   widened by a tent and laid on the one above. The first step weighs
   each tap down by its brightness, so a lone hot pixel cannot flicker */
var BLOOM_DOWN = PHEAD + `
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThresh, uExpo, uFirst;
vec3 tap(vec2 uv) {
  vec3 c = texture(uSrc, uv).rgb;
  if (uFirst > 0.5) {
    c *= uExpo;
    float l = max(c.r, max(c.g, c.b));
    float k = uThresh * 0.5;
    float s = clamp(l - uThresh + k, 0.0, 2.0 * k);
    s = s * s / (4.0 * k + 1e-4);
    c *= max(s, l - uThresh) / max(l, 1e-4);
    c /= 1.0 + max(c.r, max(c.g, c.b)) * 0.1;
  }
  return c;
}
void main() {
  vec2 uv = (floor(gl_FragCoord.xy) * 2.0 + 1.0) * uTexel;
  vec3 c = tap(uv + uTexel * vec2(-1.0, -1.0)) + tap(uv + uTexel * vec2(1.0, -1.0))
         + tap(uv + uTexel * vec2(-1.0, 1.0)) + tap(uv + uTexel * vec2(1.0, 1.0));
  outColor = vec4(c * 0.25, 1.0);
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

/* the picture through the lens: each pixel gathers a golden spiral of
   taps out to the widest disc, and takes each one whose own disc reaches
   it, as a lens spreads every point it does not focus. What lies behind a
   pixel cannot spread over it further than the pixel itself is blurred,
   so a sharp thing keeps its edge against a soft background. Then the
   bloom, and the grade */
var COMPOSITE = PHEAD + `
uniform sampler2D uHdr, uBloomT;
uniform vec2 uRes;
uniform vec3 uLook;
uniform float uTime, uMaxCoc, uBloomK;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
` + GRADE + `
void main() {
  vec2 fc = gl_FragCoord.xy, uv = fc / uRes;
  vec4 c0 = texture(uHdr, uv);
  vec3 col = c0.rgb;
  if (uMaxCoc > 0.5) {
    float k0 = clamp(c0.a, -uMaxCoc, uMaxCoc), s0 = abs(k0);
    float stp = uMaxCoc * uMaxCoc / 128.0, r = max(stp, 0.5), ang = hash12(fc) * 0.6, tot = 1.0;
    for (int i = 0; i < 72; i++) {
      if (r >= uMaxCoc) break;
      vec2 o = vec2(cos(ang), sin(ang)) * r;
      vec4 s = texture(uHdr, uv + o / uRes);
      float ks = clamp(s.a, -uMaxCoc, uMaxCoc), ss = abs(ks);
      if (ks > k0) ss = min(ss, s0 * 2.0);
      float m = smoothstep(r - 0.5, r + 0.5, ss);
      col += mix(col / tot, s.rgb, m);
      tot += 1.0;
      ang += 2.39996323;
      r += stp / r;
    }
    col /= tot;
  }
  col += texture(uBloomT, uv).rgb * uBloomK;
  outColor = vec4(grade(col, fc), 1.0);
}
`;

function shader(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function report(s, src) {
  var log = gl.getShaderInfoLog(s) || '';
  var lines = src.split('\n');
  var out = log.replace(/ERROR: 0:(\d+):/g, function (m, n) {
    return m + '\n    > ' + (lines[n - 1] || '').trim() + '\n   ';
  });
  console.error('concept shader:\n' + out);
  window.__stillError = out || 'compile failed';
}

function link(fragSrc) {
  var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, fragSrc);
  var p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  p.fs = fs;
  p.src = fragSrc;
  return p;
}

function uniforms(p, names) {
  var u = {};
  names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
  return u;
}

/* --------------------------------------------------------- the buffers */

/* the camera runs where the browser can draw into a buffer of half
   floats; the picture and the bloom's chain are made to the canvas's
   size, and made again when it changes */
var POST = null;
function canPost() {
  if (q.has('flat') || !gl.getExtension('EXT_color_buffer_float')) return false;
  var t = target(4, 4), ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(t.fb);
  gl.deleteTexture(t.tex);
  return ok;
}

function target(width, height) {
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex: tex, fb: fb, w: width, h: height };
}

function free(t) {
  if (!t) return;
  gl.deleteFramebuffer(t.fb);
  gl.deleteTexture(t.tex);
}

function buffers() {
  if (!POST) return;
  var W = canvas.width, H = canvas.height;
  if (POST.hdr && POST.hdr.w === W && POST.hdr.h === H) return;
  free(POST.hdr);
  (POST.down || []).forEach(free);
  (POST.up || []).forEach(free);
  POST.hdr = target(W, H);
  POST.down = [];
  POST.up = [];
  var lw0 = W, lh0 = H;
  for (var i = 0; i < 5; i++) {
    lw0 = Math.max(1, Math.ceil(lw0 / 2));
    lh0 = Math.max(1, Math.ceil(lh0 / 2));
    POST.down.push(target(lw0, lh0));
  }
  for (var j = 0; j < 4; j++) POST.up.push(target(POST.down[j].w, POST.down[j].h));
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/* compiled on the driver's own threads where it can, so the page stays
   free while it works; the picture starts once it is linked */
function build(then) {
  POST = canPost() ? {} : null;
  var src = HEAD + COMMON + S.frag + (POST ? FINISH_HDR : FINISH_LDR);
  var p = link(src);
  var extra = POST ? [link(BLOOM_DOWN), link(BLOOM_UP), link(COMPOSITE)] : [];
  var par = gl.getExtension('KHR_parallel_shader_compile');
  (function check() {
    if (lost) return;
    var all = [p].concat(extra);
    if (par && all.some(function (x) { return !gl.getProgramParameter(x, par.COMPLETION_STATUS_KHR); })) {
      setTimeout(check, 30);
      return;
    }
    for (var i = 0; i < all.length; i++) {
      if (!gl.getProgramParameter(all[i], gl.LINK_STATUS)) {
        if (!gl.getShaderParameter(all[i].fs, gl.COMPILE_STATUS)) report(all[i].fs, all[i].src);
        else console.error('concept link:', gl.getProgramInfoLog(all[i]));
        fail();
        return;
      }
    }
    prog = p;
    U = uniforms(p, ['uRes', 'uTime', 'uLook', 'uPoint', 'uMoon', 'uExpo', 'uSat', 'uVig', 'uGrain']);
    if (POST) {
      POST.down_p = extra[0];
      POST.up_p = extra[1];
      POST.comp_p = extra[2];
      POST.dU = uniforms(extra[0], ['uSrc', 'uTexel', 'uThresh', 'uExpo', 'uFirst']);
      POST.uU = uniforms(extra[1], ['uSrc', 'uAdd', 'uTexel', 'uSize']);
      POST.cU = uniforms(extra[2], ['uHdr', 'uBloomT', 'uRes', 'uLook', 'uTime', 'uMaxCoc', 'uBloomK', 'uExpo', 'uSat', 'uVig', 'uGrain']);
    }
    vao = gl.createVertexArray();
    then();
  })();
}

/* ------------------------------------------------------------ canvas */

try {
  gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: STILL
  });
} catch (err) {}
if (!gl || !S || !S.frag) {
  poster();
  return;
}

/* tonight's moon, 0 new, 0.5 full; a capture takes a waxing gibbous */
var moon = (function () {
  if (STILL) return +(q.get('moon') || 0.38);
  var days = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
  var m = days / 29.530588853;
  return m - Math.floor(m);
})();

/* pixels up to one and a half per point, by the scene's own scale, and no
   more than its budget; a slow GPU draws fewer */
function size() {
  var cw = hero.clientWidth, ch = hero.clientHeight;
  if (!cw || !ch) return null;
  if (STILL) {
    var s = +(q.get('scale') || 1);
    return [Math.max(1, Math.round(cw * s)), Math.max(1, Math.round(ch * s))];
  }
  var k = Math.min(window.devicePixelRatio || 1, 1.5) * (S.scale || 0.75);
  var budget = S.budget || 1.4e6;
  if (cw * ch * k * k > budget) k = Math.sqrt(budget / (cw * ch));
  k *= quality;
  return [Math.max(1, Math.round(cw * k)), Math.max(1, Math.round(ch * k))];
}

function fit() {
  var s = size();
  if (!s) return false;
  if (canvas.width !== s[0] || canvas.height !== s[1]) {
    canvas.width = s[0];
    canvas.height = s[1];
    dirty = true;
  }
  buffers();
  return true;
}

function clock(now) {
  if (STILL) return +(q.get('t') || S.t0 || 0);
  if (slow || reduced.matches) {
    if (frozenT === null) frozenT = (S.t0 || 0) + (now - clock0) / 1000;
    return frozenT;
  }
  frozenT = null;
  return (S.t0 || 0) + (now - clock0) / 1000;
}

/* the scene into the buffer (or straight to the canvas without one) */
function drawScene(now) {
  turn(now);
  var still = slow || reduced.matches || STILL;
  var l = still ? 1 : 1 - Math.exp(-Math.max(0, now - lastP) / 220);
  lastP = now;
  px += ((still ? 0 : tx) - px) * l;
  py += ((still ? 0 : ty) - py) * l;
  gl.bindFramebuffer(gl.FRAMEBUFFER, POST ? POST.hdr.fb : null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(prog);
  gl.bindVertexArray(vao);
  gl.uniform2f(U.uRes, canvas.width, canvas.height);
  gl.uniform1f(U.uTime, clock(now));
  gl.uniform3f(U.uLook, w[0], w[1], w[2]);
  gl.uniform2f(U.uPoint, px, py);
  gl.uniform1f(U.uMoon, moon);
  if (!POST) gradeUniforms(U);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function gradeUniforms(u) {
  gl.uniform1f(u.uExpo, lw(CAMERA.expo));
  gl.uniform1f(u.uSat, lw(CAMERA.sat));
  gl.uniform1f(u.uVig, lw(CAMERA.vig));
  gl.uniform1f(u.uGrain, CAMERA.grain);
}

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

/* the buffer through the camera to the canvas */
function develop(now) {
  if (!POST) return;
  var d = POST.down, u = POST.up, i, src;
  gl.bindVertexArray(vao);
  for (i = 0; i < d.length; i++) {
    src = i ? d[i - 1] : POST.hdr;
    pass(d[i], POST.down_p);
    bind(0, src.tex, POST.dU.uSrc);
    gl.uniform2f(POST.dU.uTexel, 1 / src.w, 1 / src.h);
    gl.uniform1f(POST.dU.uThresh, CAMERA.thresh);
    gl.uniform1f(POST.dU.uExpo, lw(CAMERA.expo));
    gl.uniform1f(POST.dU.uFirst, i ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  for (i = u.length - 1; i >= 0; i--) {
    src = i === u.length - 1 ? d[d.length - 1] : u[i + 1];
    pass(u[i], POST.up_p);
    bind(0, src.tex, POST.uU.uSrc);
    bind(1, d[i].tex, POST.uU.uAdd);
    gl.uniform2f(POST.uU.uTexel, 1 / src.w, 1 / src.h);
    gl.uniform2f(POST.uU.uSize, u[i].w, u[i].h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  pass(null, POST.comp_p);
  bind(0, POST.hdr.tex, POST.cU.uHdr);
  bind(1, u[0].tex, POST.cU.uBloomT);
  gl.uniform2f(POST.cU.uRes, canvas.width, canvas.height);
  gl.uniform3f(POST.cU.uLook, w[0], w[1], w[2]);
  gl.uniform1f(POST.cU.uTime, clock(now));
  gl.uniform1f(POST.cU.uMaxCoc, CAMERA.blur * canvas.height);
  gl.uniform1f(POST.cU.uBloomK, lw(CAMERA.bloom));
  gradeUniforms(POST.cU);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.activeTexture(gl.TEXTURE0);
}

function draw(now) {
  drawScene(now);
  develop(now);
}

function animating() {
  return live && visible && inView && !reduced.matches && !slow;
}

function frame(now) {
  raf = 0;
  if (lost || failed || !prog) return;
  var busy = tr || Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002;
  var gap = 1000 / (S.fps || 30) - 4;
  if (dirty || (visible && inView && busy && !slow) || (animating() && now - last >= gap)) {
    dirty = false;
    if (probing) timed(now);
    else draw(now);
    last = now;
  }
  if (tr || animating() || dirty || (busy && !slow && visible)) raf = requestAnimationFrame(frame);
}

function wake(redraw) {
  if (redraw) dirty = true;
  if (!raf && prog && !lost && !failed && !STILL) raf = requestAnimationFrame(frame);
}

/* the first frames are timed to the GPU's finish; if they run long the
   canvas is drawn smaller, and once it is as small as it goes the page
   takes the still of its look, turning between looks at once */
function timed(now) {
  var t0 = performance.now();
  draw(now);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX);
  var dt = performance.now() - t0, target = 1000 / (S.fps || 30) * 0.8, med;
  /* a frame far over budget after the first is answered at once, so a
     slow GPU is not held through a dozen of them while the page waits */
  if (probing > 1 && dt > target * 6) {
    med = dt;
  } else {
    if (probing > 3) times.push(dt);
    probing++;
    if (times.length < 8) return;
    times.sort(function (a, b) { return a - b; });
    med = times[4];
  }
  times = [];
  probing = 0;
  if (med <= target) return;
  if (quality > MINQ + 0.01) {
    quality = Math.max(MINQ, quality * Math.sqrt(target / med));
    fit();
    probing = 1;
    return;
  }
  /* too slow to move even at its smallest: the still of the look, drawn
     at full size, says more than a coarse canvas held still */
  slow = true;
  if (tr) {
    tr = null;
    w = LOOKS[look].slice();
    themeColor();
  }
  fail();
}

function reveal() {
  canvas.classList.add('drawn');
  root.classList.remove('still');
  root.classList.add('live');
  live = true;
}

/* something the picture needs is missing: the page keeps its still */
function fail() {
  failed = true;
  canvas.classList.remove('drawn');
  poster();
}

function poster() {
  root.classList.add('still');
  if (root.classList.contains('pic')) return;
  var img = new Image(), on = function () { root.classList.add('pic'); };
  img.src = posterURL();
  if (img.decode) img.decode().then(on, function () {});
  else img.onload = on;
}

/* a capture draws its one frame in strips, so no single draw holds a
   software GPU long enough to be stopped; the camera then develops the
   whole of it at once */
function capture() {
  var rows = +(q.get('rows') || 8), i = 0;
  gl.enable(gl.SCISSOR_TEST);
  (function strip() {
    var H = canvas.height, y0 = Math.floor(i * H / rows), y1 = Math.floor((i + 1) * H / rows);
    gl.scissor(0, y0, canvas.width, y1 - y0);
    drawScene(performance.now());
    gl.readPixels(0, y0, 1, 1, gl.RGBA, POST ? gl.FLOAT : gl.UNSIGNED_BYTE, POST ? new Float32Array(4) : PX);
    if (++i < rows) {
      setTimeout(strip, 0);
      return;
    }
    gl.disable(gl.SCISSOR_TEST);
    develop(performance.now());
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX);
    reveal();
    window.__still = 'done';
  })();
}

function go() {
  fit();
  if (STILL) {
    capture();
    return;
  }
  draw(performance.now());
  reveal();
  probing = 1;
  last = performance.now();
  wake(false);
}

/* ------------------------------------------------------------ wiring */

hero.addEventListener('pointermove', function (ev) {
  if (reduced.matches || slow || ev.pointerType === 'touch') return;
  var r = hero.getBoundingClientRect();
  tx = ((ev.clientX - r.left) / r.width - 0.5) * 2;
  ty = ((ev.clientY - r.top) / r.height - 0.5) * -2;
  wake(false);
});

hero.addEventListener('pointerleave', function () {
  tx = ty = 0;
  wake(false);
});

document.addEventListener('visibilitychange', function () {
  visible = !document.hidden;
  if (visible) wake(true);
});

if (window.IntersectionObserver) {
  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    if (inView) wake(true);
  }, { threshold: 0.01 }).observe(hero);
}

/* a resize draws at once, in the same frame, so the canvas never shows
   cleared */
function resized() {
  if (!prog || lost || failed || STILL) return;
  root.style.setProperty('--poster', 'url("' + posterURL() + '")');
  if (fit()) draw(performance.now());
}
if (window.ResizeObserver) new ResizeObserver(resized).observe(hero);
else addEventListener('resize', resized);

reduced.addEventListener('change', function () { wake(true); });

var lostTimer = 0;
canvas.addEventListener('webglcontextlost', function (ev) {
  ev.preventDefault();
  lost = true;
  prog = null;
  POST = null;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  canvas.classList.remove('drawn');
  lostTimer = setTimeout(poster, 2500);
});

canvas.addEventListener('webglcontextrestored', function () {
  clearTimeout(lostTimer);
  lost = false;
  build(go);
});

build(go);

}
})();
