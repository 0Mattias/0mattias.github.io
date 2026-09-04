/* 0mattias.github.io · the sky
   A procedural sky behind the letterhead, shot with a wide aperture:
   value-noise cumulus lit by a short march toward the sun, a moon drawn
   at tonight's real phase, stars once it is dark, and bare branches
   grown by a small L-system and held out of focus in the foreground.
   The sky pass renders small and is defocused on the way up to the
   screen; stars and grain are laid down sharp. Three looks (day, dusk,
   night): the page opens on whichever the visitor's clock says and the
   dots at the bottom left move the sun. WebGL2, no libraries, no build
   step. */

'use strict';

(function () {

var hero = document.querySelector('.letterhead');
var canvas = document.getElementById('sky');
var caption = document.querySelector('.phase');
var buttons = Array.prototype.slice.call(document.querySelectorAll('.looks button'));
if (!hero || !canvas) return;

var gl = canvas.getContext('webgl2', {
  alpha: false, antialias: false, depth: false, stencil: false,
  powerPreference: 'low-power'
});
if (!gl) return;

var reduced = matchMedia('(prefers-reduced-motion: reduce)');

var LOW = 0.4;      // sky pass, as a fraction of the canvas
var TWIG = 0.33;    // branch layer, as a fraction of the canvas

var LOOKS = { day: 0.5, dusk: 0.76, night: 1.0 };
var FLAT  = { day: '#86a6d8', dusk: '#9e98c6', night: '#101830' };
var THEME = { day: '#7399d6', dusk: '#8592c7', night: '#0d1229' };

var TAPS = [];
for (var i = 0; i < 12; i++) {
  var r = Math.sqrt((i + 0.5) / 12), a = i * 2.39996323;
  TAPS.push('vec2(' + (r * Math.cos(a)).toFixed(4) + ',' + (r * Math.sin(a)).toFixed(4) + ')');
}

var VERT = `#version 300 es
out vec2 uv;
void main() {
  vec2 v = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  uv = v;
  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);
}`;

var NOISE = `
const float PI = 3.14159265;
const mat2 RT = mat2(0.8, 0.6, -0.6, 0.8);

float hash(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p))) * uvec2(1597334673u, 3812015801u);
  uint n = (q.x ^ q.y) * 1597334673u;
  return float(n) * (1.0 / 4294967295.0);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p, int n) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= n) break;
    v += a * noise(p);
    p = RT * p * 2.03 + 17.3;
    a *= 0.5;
  }
  return v;
}

float billow(vec2 p, int n) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= n) break;
    v += a * abs(2.0 * noise(p) - 1.0);
    p = RT * p * 2.03 + 17.3;
    a *= 0.5;
  }
  return v;
}

void weights(float e, out float kd, out float ku, out float kn) {
  kd = smoothstep(0.03, 0.55, e);
  kn = 1.0 - smoothstep(-0.55, -0.07, e);
  ku = clamp(1.0 - kd - kn, 0.0, 1.0);
}`;

var SKY = `#version 300 es
precision highp float;
precision highp int;
in vec2 uv;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
uniform vec2 R;
uniform float T;
uniform float E;
uniform vec3 SUN;
uniform vec2 LD;
uniform vec2 M;
` + NOISE + `

float density(vec2 q, float cov) {
  float m = fbm(q * 0.30, 3);
  float b = billow(q * 1.3 + 3.0, 4);
  return clamp((m * 0.9 + b * 0.36 - cov) * 2.6, 0.0, 1.0);
}

vec4 layer(vec2 q, float cov, vec2 ld, vec3 lit, vec3 shd, float step) {
  float d = density(q, cov);
  if (d <= 0.0) return vec4(0.0);
  float sh = 0.0;
  for (int i = 1; i <= 3; i++) sh += density(q + ld * float(i) * step, cov);
  float light = exp(-sh * 1.1);
  vec3 c = mix(shd, lit, light);
  c += lit * (1.0 - d) * light * 0.25;
  return vec4(c, 1.0 - exp(-d * 2.4));
}

void main() {
  vec2 p = (uv * R - 0.5 * R) / R.y;
  vec3 dir = normalize(vec3(p.x, p.y + 2.4, 1.0));
  float kd, ku, kn;
  weights(E, kd, ku, kn);

  vec3 top = kd * vec3(0.44, 0.60, 0.84) + ku * vec3(0.50, 0.55, 0.78) + kn * vec3(0.045, 0.06, 0.15);
  vec3 low = kd * vec3(0.66, 0.76, 0.90) + ku * vec3(0.74, 0.68, 0.82) + kn * vec3(0.11, 0.13, 0.26);
  vec3 col = mix(low, top, smoothstep(0.0, 1.0, uv.y));

  float sd = max(dot(dir, SUN), 0.0);
  vec3 sunCol = kd * vec3(1.0, 0.96, 0.88) + ku * vec3(1.0, 0.74, 0.50) + kn * vec3(0.3, 0.35, 0.5);
  float sunVis = smoothstep(-0.25, 0.02, E);
  col += sunCol * (0.16 * pow(sd, 3.0) + 0.12 * pow(sd, 12.0)) * sunVis * (kd + 1.6 * ku + 0.3 * kn);

  vec3 litA = kd * vec3(1.0, 0.99, 0.97) + ku * vec3(1.0, 0.86, 0.68) + kn * vec3(0.42, 0.46, 0.60);
  vec3 shdA = kd * vec3(0.62, 0.69, 0.85) + ku * vec3(0.60, 0.55, 0.72) + kn * vec3(0.06, 0.07, 0.13);

  vec2 base = p * (1.0 + 0.6 * (0.5 - p.y));
  float center = 1.0 - smoothstep(0.12, 0.62, length((p - vec2(0.0, -0.02)) * vec2(0.9, 1.5)));
  float covA = 0.50 - 0.03 * kd + 0.04 * kn + 0.10 * center;
  vec2 qA = base * 5.5 + M * 0.05 + vec2(T * 0.008, T * 0.002);
  qA += 0.3 * vec2(fbm(qA * 0.35 + T * 0.003, 2), fbm(qA * 0.35 + 9.0 - T * 0.002, 2)) - 0.1;
  vec4 cA = layer(qA, covA, LD, litA, shdA, 0.10);

  vec2 qB = base * 11.0 * vec2(0.6, 1.3) + M * 0.025 + vec2(T * 0.015, T * 0.004) + 40.0;
  vec4 cB = layer(qB, 0.58, LD, mix(litA, vec3(1.0), 0.15), mix(shdA, litA, 0.5), 0.06);
  cB.a *= 0.5;

  vec3 crgb = cB.rgb * cB.a * (1.0 - cA.a) + cA.rgb * cA.a;
  float ca = cB.a * (1.0 - cA.a) + cA.a;
  o0 = vec4(col, 1.0);
  o1 = vec4(crgb, ca);
}`;

var COMP = `#version 300 es
precision highp float;
precision highp int;
in vec2 uv;
out vec4 o;
uniform vec2 R;
uniform vec2 SR;
uniform vec2 WR;
uniform float T;
uniform float E;
uniform float G;
uniform float P;
uniform vec2 M;
uniform sampler2D SKYT;
uniform sampler2D CLOUDT;
uniform sampler2D TWIGT;
const vec2 D[12] = vec2[12](` + TAPS.join(',') + `);
` + NOISE + `

void main() {
  vec2 p = (uv * R - 0.5 * R) / R.y;
  float asp = R.x / R.y;
  float kd, ku, kn;
  weights(E, kd, ku, kn);

  vec4 s = texture(SKYT, uv) * 0.25;
  vec4 c = texture(CLOUDT, uv) * 0.25;
  for (int i = 0; i < 12; i++) {
    vec2 d = uv + D[i] * 3.0 / SR;
    s += texture(SKYT, d) * 0.0625;
    c += texture(CLOUDT, d) * 0.0625;
  }
  vec3 col = s.rgb;

  float starVis = (1.0 - smoothstep(-0.30, 0.0, E)) * smoothstep(-0.55, 0.3, p.y);
  if (starVis > 0.001) {
    float cell = R.y / 90.0;
    vec2 sp = gl_FragCoord.xy / cell + M * 0.4;
    vec2 ci = floor(sp), cf = fract(sp);
    float h0 = hash(ci), h1 = hash(ci + 101.0), h2 = hash(ci + 202.0), h3 = hash(ci + 303.0);
    vec2 sc = vec2(h1, h2) * 0.8 + 0.1;
    float dd = length(cf - sc) * cell;
    float br = step(0.90, h0) * (0.35 + 0.65 * h3);
    float tw = 0.75 + 0.25 * sin(T * (0.6 + h3 * 1.5) + h1 * 40.0);
    vec3 sCol = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.93, 0.85), h2);
    col += sCol * br * tw * exp(-dd * dd * 0.9) * starVis * 0.9;
  }

  float mr = 0.085;
  vec2 mp = vec2(0.30 * asp, 0.27) + M * 0.01;
  vec2 q = (p - mp) / mr;
  float rr = dot(q, q);
  float rad = sqrt(rr);
  float ph = P * 2.0 * PI;
  float ew = 4.0 / (mr * R.y);
  float disc = 1.0 - smoothstep(1.0 - ew, 1.0 + ew * 0.5, rad);
  if (disc > 0.0) {
    vec3 n = vec3(q, sqrt(max(1.0 - rr, 0.0)));
    vec3 L = vec3(sin(ph), 0.0, -cos(ph));
    float lit = smoothstep(-0.10, 0.38, dot(n, L));
    float mar = fbm(q * 1.4 + 5.0, 5);
    float alb = mix(0.68, 1.0, smoothstep(0.30, 0.62, mar)) * (1.0 - 0.15 * rr);
    vec3 moonCol = vec3(1.0, 0.98, 0.94) * alb;
    vec3 litCol = mix(col, moonCol, 0.5 * kd + 0.85 * ku + kn);
    vec3 darkCol = mix(col, vec3(0.02, 0.025, 0.05) + moonCol * 0.06, 0.22 * kn);
    col = mix(col, mix(darkCol, litCol, lit), disc);
  }

  col = col * (1.0 - c.a) + c.rgb;

  float illum = 0.5 - 0.5 * cos(ph);
  float halo = exp(-max(rad - 1.0, 0.0) * 1.8) * (0.30 * kn + 0.12 * ku) * (0.3 + 0.7 * illum);
  halo += exp(-max(rad - 1.0, 0.0) * 0.3) * 0.05 * kn * illum;
  col += vec3(1.0, 0.98, 0.94) * halo;

  vec2 tuv = uv - M * vec2(0.012, 0.008);
  float tw = texture(TWIGT, tuv).a * 0.25;
  for (int i = 0; i < 12; i++) tw += texture(TWIGT, tuv + D[i] * 3.2 / WR).a * 0.0625;
  vec3 twigCol = kd * vec3(0.19, 0.17, 0.17) + ku * vec3(0.24, 0.18, 0.22) + kn * vec3(0.02, 0.02, 0.04);
  col = mix(col, twigCol, tw * 0.82);

  col += (hash(gl_FragCoord.xy + G) - 0.5) * 0.035;
  col *= 1.0 - 0.16 * smoothstep(0.35, 1.25, length(p * vec2(0.85, 1.3)));
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
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

var skyProg = program(SKY, ['R', 'T', 'E', 'SUN', 'LD', 'M']);
var compProg = program(COMP, ['R', 'SR', 'WR', 'T', 'E', 'G', 'P', 'M', 'SKYT', 'CLOUDT', 'TWIGT']);
if (!skyProg || !compProg) return;

function texture() {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

var skyTex = texture();
var cloudTex = texture();
var twigTex = texture();
var fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, skyTex, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, cloudTex, 0);
gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

var twigs = document.createElement('canvas');
var tctx = twigs.getContext('2d');
var skyW = 1, skyH = 1;

/* ------------------------------------------------------------ branches */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function grow(ctx, x, y, ang, len, wid, depth, rnd) {
  if (depth <= 0 || len < 1.5) return;
  var bend = (rnd() - 0.5) * 0.6 + (Math.PI / 2 - ang) * 0.06;
  var ex = x + Math.cos(ang) * len, ey = y - Math.sin(ang) * len;
  var cx = x + Math.cos(ang + bend) * len * 0.5, cy = y - Math.sin(ang + bend) * len * 0.5;
  ctx.lineWidth = Math.max(wid, 0.6);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  if (rnd() < (depth > 3 ? 0.75 : 0.5)) {
    var t = 0.3 + rnd() * 0.6, s = 1.0 - t;
    var px = s * s * x + 2.0 * s * t * cx + t * t * ex;
    var py = s * s * y + 2.0 * s * t * cy + t * t * ey;
    var side = rnd() < 0.5 ? 1 : -1;
    grow(ctx, px, py, ang + side * (0.45 + rnd() * 0.6), len * (0.35 + rnd() * 0.35), wid * 0.55, depth - 1, rnd);
  }
  var next = ang + bend * 0.5 + (rnd() - 0.5) * 0.5;
  grow(ctx, ex, ey, next, len * (0.70 + rnd() * 0.15), wid * 0.74, depth - 1, rnd);
  if (depth > 2 && rnd() < 0.35) {
    grow(ctx, ex, ey, next + (rnd() < 0.5 ? 1 : -1) * (0.4 + rnd() * 0.4), len * (0.5 + rnd() * 0.2), wid * 0.6, depth - 2, rnd);
  }
}

function drawTwigs(sway) {
  var w = twigs.width, h = twigs.height;
  var portrait = h > w;
  var d = Math.min(h, w * 0.9) * (portrait ? 0.72 : 1);
  var lean = portrait ? -0.1 : 0;
  var ctx = tctx;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  var rnd = mulberry32(20260904);
  grow(ctx, w * 1.03, h * 0.56, Math.PI * (0.82 + lean) + sway, d * 0.17, d * 0.012, 8, rnd);
  grow(ctx, w * 0.90, h * 1.05, Math.PI * (0.60 - lean) + sway * 1.3, d * 0.15, d * 0.011, 8, rnd);
  grow(ctx, w * 1.02, h * 0.06, Math.PI * (1.15 - lean) + sway * 0.8, d * 0.10, d * 0.008, 6, rnd);
  gl.bindTexture(gl.TEXTURE_2D, twigTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, twigs);
}

/* ---------------------------------------------------------------- moon */

function phase(date) {
  var d = (date - Date.UTC(2000, 0, 6, 18, 14)) / 86400000 / 29.530588853;
  return d - Math.floor(d);
}

function phaseName(p) {
  if (p < 0.02 || p > 0.98) return 'new moon';
  if (p < 0.23) return 'waxing crescent';
  if (p < 0.27) return 'first quarter';
  if (p < 0.48) return 'waxing gibbous';
  if (p < 0.52) return 'full moon';
  if (p < 0.73) return 'waning gibbous';
  if (p < 0.77) return 'last quarter';
  return 'waning crescent';
}

var P = phase(new Date());

/* ----------------------------------------------------------------- sun */

function sunDir(t) {
  var e = Math.sin((t - 0.25) * 2 * Math.PI);
  var el = e * 0.9;
  var az = -0.45 - (t - 0.5) * 1.5;
  var sx = Math.sin(az), sy = Math.sin(el) - 0.25;
  var sl = Math.hypot(sx, sy) || 1;
  var w = Math.min(1, Math.max(0, (e + 0.2) / 0.15));
  var lx = (sx / sl) * w + 0.7 * (1 - w), ly = (sy / sl) * w + 0.7 * (1 - w);
  var ll = Math.hypot(lx, ly) || 1;
  return {
    dir: [sx * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)],
    e: e,
    ld: [lx / ll, ly / ll]
  };
}

/* --------------------------------------------------------------- state */

var look, cur, tw = null;
var mx = 0, my = 0, tx = 0, ty = 0;
var running = false, raf = 0, last = 0, frameNo = 0;
var visible = !document.hidden, inView = true;

function byClock() {
  var h = new Date().getHours();
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 21) || (h >= 5 && h < 7)) return 'dusk';
  return 'night';
}

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
  wake();
}

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
  var s = sunDir(cur);

  if (!still) drawTwigs(Math.sin(t * 0.35) * 0.006 + Math.sin(t * 0.9 + 1.0) * 0.002);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, skyW, skyH);
  gl.useProgram(skyProg.p);
  gl.uniform2f(skyProg.u.R, skyW, skyH);
  gl.uniform1f(skyProg.u.T, t);
  gl.uniform1f(skyProg.u.E, s.e);
  gl.uniform3f(skyProg.u.SUN, s.dir[0], s.dir[1], s.dir[2]);
  gl.uniform2f(skyProg.u.LD, s.ld[0], s.ld[1]);
  gl.uniform2f(skyProg.u.M, mx, my);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(compProg.p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, skyTex);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, cloudTex);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, twigTex);
  gl.uniform1i(compProg.u.SKYT, 0);
  gl.uniform1i(compProg.u.CLOUDT, 1);
  gl.uniform1i(compProg.u.TWIGT, 2);
  gl.uniform1f(compProg.u.P, P);
  gl.uniform2f(compProg.u.R, canvas.width, canvas.height);
  gl.uniform2f(compProg.u.SR, skyW, skyH);
  gl.uniform2f(compProg.u.WR, twigs.width, twigs.height);
  gl.uniform1f(compProg.u.T, t);
  gl.uniform1f(compProg.u.E, s.e);
  gl.uniform1f(compProg.u.G, still ? 0 : (frameNo++ % 977) * 13.7);
  gl.uniform2f(compProg.u.M, mx, my);
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
  var scale = Math.min(window.devicePixelRatio || 1, 1.5);
  if (w * scale > 2000) scale = 2000 / w;
  var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
    skyW = Math.max(1, Math.round(cw * LOW));
    skyH = Math.max(1, Math.round(ch * LOW));
    gl.bindTexture(gl.TEXTURE_2D, skyTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, skyW, skyH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, cloudTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, skyW, skyH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    twigs.width = Math.max(1, Math.round(cw * TWIG));
    twigs.height = Math.max(1, Math.round(ch * TWIG));
    drawTwigs(0);
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

var initial = byClock();
try { initial = sessionStorage.getItem('look') || initial; } catch (err) {}
try { initial = new URLSearchParams(location.search).get('look') || initial; } catch (err) {}
if (!LOOKS[initial]) initial = 'day';
cur = LOOKS[initial];
document.documentElement.classList.add('sky');
if (caption) {
  var name = phaseName(P);
  caption.textContent = name + (/moon$/.test(name) ? '' : ' moon') + ' · ' + Math.round((1 - Math.cos(P * 2 * Math.PI)) * 50) + '%';
}
setLook(initial, true);
resize();

})();
