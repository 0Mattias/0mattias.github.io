/* concepts/scenes/dunes.js · Erg
   v2 work in progress */

window.CONCEPT = {
  id: 'dunes',
  theme: { day: '#2a5a9e', dusk: '#3d3a68', night: '#0d1322' },
  t0: 20,
  frag: `
const float RE = 6360e3;
const float ALT = 700.0;
const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const vec3 BO = vec3(2.0e-6, 5.6e-6, 0.26e-6);
const float BMS = 7.0e-6;
const float BME = 7.7e-6;
const float HR = 8000.0;
const float HM = 900.0;
const float EYE = 120.0;
#define DBG 0

vec3 azel(float az, float el) {
  az = radians(az); el = radians(el);
  return normalize(vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el)));
}

float smax(float a, float b, float k) {
  float h = sat(0.5 + 0.5 * (a - b) / k);
  return mix(b, a, h) + k * h * (1.0 - h);
}

/* ------------------------------------------------------------ the sand */

const vec2 RD = vec2(-0.13917, 0.99027);
const vec2 RN = vec2(0.99027, 0.13917);
const vec2 CD = vec2(0.92718, 0.37461);
const vec2 STAR1 = vec2(1050.0, 2600.0);
const vec2 PAN = vec2(110.0, 1520.0);

/* the cross ridges come and go, and leave the near ground open */
float crossMask(vec2 p) {
  return smoothstep(0.0, 0.6, sin(dot(p, RD) * 0.0011 + 1.3) + 0.5 * sin(dot(p, RN) * 0.0017)) * smoothstep(900.0, 1800.0, length(p));
}

/* a field of long sinuous ridges: d runs along them, the slip faces on
   the side away from dn. Crest k wanders across the field as it goes and
   rises and falls along its length */
vec3 crestR(float k, float seed) {
  return vec3(hash11(k * 1.37 + seed), hash11(k * 2.71 + seed + 3.1), hash11(k * 0.93 + seed + 7.7));
}
float crestU(float k, vec3 r, float v, float sp) {
  return k * sp + 0.16 * sp * sin(v * 0.0019 + r.x * TAU) + 0.07 * sp * sin(v * 0.0053 + r.y * TAU) + 20.0 * sin(v * 0.016 + r.z * TAU);
}
float crestH(vec3 r, float v, float hb) {
  return hb * (0.7 + 0.6 * r.z) * (0.74 + 0.2 * sin(v * 0.0014 + r.y * TAU) + 0.12 * sin(v * 0.0041 + r.x * TAU));
}

/* info: x lee side, y distance from the crest, z along the crest */
float ridges(vec2 p, vec2 d, float sp, float hb, float off, float seed, out vec3 info) {
  vec2 dn = vec2(d.y, -d.x);
  float u = dot(p, dn) + off, v = dot(p, d);
  float k0 = floor(u / sp + 0.5);
  float h = -1e5;
  info = vec3(0.0, 1e4, v);
  for (int j = -1; j <= 1; j++) {
    float k = k0 + float(j);
    vec3 cr = crestR(k, seed);
    float H = crestH(cr, v, hb);
    float s = u - crestU(k, cr, v, sp);
    float r;
    if (s < 0.0) r = H + s * 0.65;
    else {
      float t = min(s / (H * 3.6), 1.0);
      r = H * (1.0 - t) * (1.0 - t) * (1.0 + 0.5 * t);
    }
    if (r > h) {
      h = r;
      info = vec3(step(s, 0.0), abs(s), v + seed * 100.0);
    }
  }
  return h;
}

/* how much of the sun clears the crests of one field on its way to p:
   for each crest ahead, where the light's path crosses it (found by
   bisection, the crest being somewhere in its wander band) and how high
   it stands there. Exact for the long low-sun shadows, with no march */
float crestLight(vec3 p, vec2 sh, float tanE, vec2 d, float sp, float hb, float off, float seed, float cross) {
  vec2 dn = vec2(d.y, -d.x);
  float su = dot(sh, dn), sv = dot(sh, d);
  if (abs(su) < 0.25) return 1.0;
  float u0 = dot(p.xz, dn) + off, v0 = dot(p.xz, d);
  float dir = sign(su), A = 0.23 * sp + 20.0;
  float k0 = floor(u0 / sp + 0.5);
  float res = 1.0;
  for (int j = -1; j < 4; j++) {
    float k = k0 + dir * float(j);
    float a = (k * sp - A - u0) / su, b = (k * sp + A - u0) / su;
    float lo = min(a, b), hi = max(a, b);
    if (hi < 1.0) continue;
    lo = max(lo, 0.0);
    vec3 cr = crestR(k, seed);
    for (int i = 0; i < 6; i++) {
      float m = 0.5 * (lo + hi);
      float f = (u0 + su * m - crestU(k, cr, v0 + sv * m, sp)) * dir;
      if (f < 0.0) lo = m; else hi = m;
    }
    float tau = 0.5 * (lo + hi);
    if (tau < 2.0) continue;
    vec2 q = p.xz + sh * tau;
    float H = crestH(cr, v0 + sv * tau, hb);
    if (cross > 0.5) H *= crossMask(q);
    res = min(res, (p.y + tau * tanE - H) / (tau * 0.014) + 0.5);
  }
  return res;
}

/* small dunes riding on the flanks of the great ones, oblique to them */
const vec2 SD = vec2(0.70711, 0.70711);
const vec2 SN = vec2(0.70711, -0.70711);
float secondary(vec2 p, out float lee, out float dc) {
  float u = dot(p, SN), v = dot(p, SD);
  float k0 = floor(u / 210.0 + 0.5);
  float h = 0.0;
  lee = 0.0;
  dc = 1e4;
  for (int j = -1; j <= 1; j++) {
    float k = k0 + float(j);
    float r1 = hash11(k * 3.17 + 1.3), r2 = hash11(k * 1.91 + 5.1);
    float c = k * 210.0 + 45.0 * sin(v * 0.009 + r1 * TAU) + 14.0 * sin(v * 0.031 + r2 * TAU);
    float H = 13.0 * (0.6 + 0.8 * r2) * sat(0.6 + 0.6 * sin(v * 0.006 + r1 * 9.0));
    float s = u - c;
    float r = s < 0.0 ? H + s * 0.62 : H * (1.0 - sat(s / (H * 3.2))) * (1.0 - sat(s / (H * 3.2)));
    if (r > h) {
      h = r;
      lee = step(s, 0.0);
      dc = abs(s);
    }
  }
  return h;
}

/* a star dune: arms falling away from one summit, each a knife edge with
   its slip face on one side */
float star(vec2 p, vec2 c, float H, float R, float a0, float seed, inout vec3 info) {
  vec2 q = p - c;
  float r = length(q);
  if (r > R) return -1e5;
  float th = atan(q.x, q.y);
  float best = -1e5;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ai = a0 + fi * 1.5708 + (hash11(seed + fi) - 0.5) * 0.8;
    ai += 0.9 * (r / R) * (hash11(seed + fi * 3.7) - 0.5) + 0.12 * sin(r * 0.006 + fi);
    float dp = mod(th - ai + PI, TAU) - PI;
    float al = r * cos(dp), s = r * sin(dp);
    if (al <= 0.0) continue;
    float Ri = R * (0.55 + 0.45 * hash11(seed + fi * 5.3));
    float x = min(al / Ri, 1.0);
    float hc = H * (1.0 - x) * (1.0 - 0.45 * x);
    float lee = hash11(seed + fi * 7.1) > 0.5 ? 1.0 : -1.0;
    float ss = s * lee;
    float h = hc - (ss < 0.0 ? 0.67 : 0.36) * abs(s);
    if (h > best) {
      best = h;
      info = vec3(step(ss, 0.0), abs(s), al + fi * 1000.0);
    }
  }
  return best;
}


/* info: x lee side, y distance from the crest, z along the crest, w the pan */
float field(vec2 p, float lod, out vec4 info) {
  vec3 i1, i3;
  float h = ridges(p, RD, 860.0, 100.0, 230.0, 0.31, i1);
  float cm = crossMask(p);
  if (cm > 0.0) {
    float hc = ridges(p, CD, 1500.0, 70.0, 400.0, 5.7, i3);
    if (hc * cm > h) i1 = i3;
    h = mix(h, smax(h, hc, 18.0), cm);
  }
  vec3 i2 = i1;
  float hs = star(p, STAR1, 290.0, 1500.0, 0.4, 11.0, i2);
  if (hs > h) i1 = i2;
  h = smax(h, hs, 25.0);
  /* the small dunes, left out where they would be under a pixel */
  float m = smoothstep(8.0, 45.0, h) * (1.0 - smoothstep(0.6, 0.85, 1.0 - i1.y / 320.0)) * smoothstep(9000.0, 4500.0, lod);
  if (m > 0.0) {
    float sl, sc;
    float h2 = secondary(p, sl, sc);
    h += h2 * m;
    if (h2 * m > 3.0 && sc < i1.y) i1.x = sl;
  }
  float fl = 3.0 * noise(p * 0.004) + 1.5 * noise(p * 0.017);
  h = smax(h, fl, 14.0);
  vec2 pq = vec2(dot(p - PAN, RN), dot(p - PAN, RD));
  float e = length(pq / vec2(115.0, 250.0)) + 0.22 * (noise(p * 0.012) - 0.5) + 0.08 * (noise(p * 0.05) - 0.5);
  float pan = 1.0 - smoothstep(0.75, 1.1, e);
  float lev = 1.0 - smoothstep(0.9, 2.0, e);
  h = mix(h, -1.0 + 0.2 * noise(p * 0.03), max(pan, lev * 0.85));
  info = vec4(i1, 1.0 - smoothstep(0.9, 1.0, e));
  return h;
}

float terrain(vec2 p, float lod) {
  vec4 i;
  return field(p, lod, i);
}

/* ------------------------------------------------------------- the air */

float phaseR(float c) { return 0.0596831 * (1.0 + c * c); }
/* dust: a sharp forward lobe and a broad one, so the low sky toward the
   sun warms over a wide arc */
float phaseM(float c) {
  float g = 0.8, g2 = g * g, b = 0.35, b2 = b * b;
  float sharp = 0.1193662 * (1.0 - g2) * (1.0 + c * c) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * c, 1.5));
  float broad = 0.0795775 * (1.0 - b2) / pow(1.0 + b2 - 2.0 * b * c, 1.5);
  return 0.7 * sharp + 0.3 * broad;
}

vec2 sunDepth(float h, float mu) {
  float dip = sqrt(max(2.0 * h / RE, 0.0));
  float m = max(mu + 0.5 * dip, 0.0);
  float vis = smoothstep(-dip - 0.006, -dip + 0.002, mu);
  return vec2(HR * exp(-h / HR) / (m + 0.0283), HM * exp(-(h - ALT) / HM) / (m + 0.0095)) + (1.0 - vis) * 1e7;
}

void atmo(vec3 rd, vec3 L, float tEnd, out vec3 ins, out vec3 tr) {
  float r0 = RE + ALT + EYE;
  float mu = rd.y;
  float RT = RE + 60e3;
  float b = r0 * mu;
  float tTop = -b + sqrt(b * b - r0 * r0 + RT * RT);
  float tm = min(tTop, tEnd);
  float c = dot(rd, L);
  vec3 sR = vec3(0.0), sM = vec3(0.0);
  float odR = 0.0, odM = 0.0;
  for (int i = 0; i < 8; i++) {
    float f0 = float(i) / 8.0, f1 = float(i + 1) / 8.0;
    float t0 = tm * f0 * f0, t1 = tm * f1 * f1;
    float t = 0.5 * (t0 + t1), dt = t1 - t0;
    vec3 pos = vec3(0.0, r0, 0.0) + rd * t;
    float rr = length(pos);
    float h = rr - RE;
    float dR = exp(-h / HR), dM = exp(-(h - ALT) / HM);
    float hR = odR + dR * dt * 0.5, hM = odM + dM * dt * 0.5;
    vec2 sd = sunDepth(h, dot(pos, L) / rr);
    vec3 T = exp(-(BR + BO) * (hR + sd.x) - BME * (hM + sd.y));
    sR += T * dR * dt;
    sM += T * dM * dt;
    odR += dR * dt;
    odM += dM * dt;
  }
  float pol = 1.0 - 0.55 * (1.0 - c * c) / (1.0 + c * c);
  ins = sR * BR * phaseR(c) * pol + sM * BMS * phaseM(c);
  ins += (sR * BR + sM * BMS) * 0.03;
  tr = exp(-(BR + BO) * odR - BME * odM);
}

vec3 sunAt(vec3 L, float h) {
  vec2 sd = sunDepth(ALT + h, L.y);
  return exp(-(BR + BO) * sd.x - BME * sd.y);
}

/* ---------------------------------------------------------- night sky */

/* stars in three magnitudes on cells of the sphere, the faint ones
   gathering in the Milky Way; each twinkles a little, more near the
   horizon where the air is thicker */
vec3 starsAt(vec3 rd, float pix, float mw) {
  vec3 col = vec3(0.0);
  float sig = max(pix, 6e-4) * 0.75;
  for (int l = 0; l < 4; l++) {
    float fl = float(l);
    float sc = fl == 0.0 ? 70.0 : (fl == 1.0 ? 160.0 : (fl == 2.0 ? 360.0 : 820.0));
    vec3 cell = floor(rd * sc);
    vec3 h = hash33(cell + fl * 17.31);
    float occ = fl == 0.0 ? 0.16 : (fl == 1.0 ? 0.35 : (fl == 2.0 ? 0.2 + 0.8 * mw : 0.95 * mw));
    if (h.x > occ) continue;
    vec3 sp = normalize(cell + 0.25 + 0.5 * hash33(cell * 1.7 + fl * 5.0));
    float d = length(rd - sp) / sig;
    float m = hash13(cell * 2.31 + 4.0 + fl);
    float flux = fl == 0.0 ? 1.5 * pow(m, 6.0) + 0.05 : (fl == 1.0 ? 0.09 * pow(m, 3.0) + 0.012 : (fl == 2.0 ? 0.022 * m : 0.012 * m));
    float tw = 1.0 + (0.18 + 0.5 * sat(1.0 - rd.y * 5.0)) * sin(uTime * (1.7 + 4.0 * h.y) + h.z * TAU) * step(fl, 1.5);
    vec3 tint = mix(vec3(1.0, 0.78, 0.55), vec3(0.72, 0.84, 1.0), smoothstep(0.2, 0.8, h.y));
    col += tint * flux * tw * exp(-0.5 * d * d);
  }
  return col;
}

/* the Milky Way: a band along the galactic plane, its core low over the
   great dune, star clouds and the dark rift through them */
vec3 milky(vec3 rd, out float band) {
  vec3 GCORE = azel(26.0, 12.5);
  vec3 GAL = normalize(cross(GCORE, azel(-2.0, 19.0)));
  float b = dot(rd, GAL);
  vec3 cp = normalize(GCORE - GAL * dot(GCORE, GAL));
  vec3 ip = normalize(rd - GAL * b);
  float l = acos(clamp(dot(ip, cp), -1.0, 1.0));
  float wid = 0.085 + 0.05 * exp(-l * l * 4.0);
  band = exp(-b * b / (wid * wid));
  float halo = exp(-b * b / 0.05);
  float bulge = exp(-(l * l + b * b * 2.6) / 0.012);
  float clouds = fbm3(rd * 22.0, 4);
  float knots = smoothstep(0.4, 0.75, clouds) * (0.7 + 0.6 * fbm3(rd * 6.0 + 9.0, 2));
  float rift = smoothstep(0.4, 0.62, fbm3(rd * 6.0 + vec3(3.0, 1.0, 7.0), 3))
             * exp(-pow(b - 0.012 - 0.01 * sin(l * 6.0), 2.0) / (0.0005 + 0.0015 * l)) * smoothstep(0.04, 0.2, l);
  float m = band * (0.55 + 0.8 * exp(-l * l * 3.0)) * (0.65 + 0.6 * knots) + halo * 0.12;
  vec3 c = vec3(0.72, 0.78, 1.0) * m + vec3(1.0, 0.9, 0.74) * bulge * (2.0 + 1.5 * knots);
  return c * (1.0 - 0.85 * rift);
}

/* the moon at tonight's phase, lit from the side the sun has gone down */
vec3 moonDisc(vec3 rd, vec3 M, vec3 S, float pix) {
  float R = 0.0047;
  vec3 mx = normalize(cross(vec3(0.0, 1.0, 0.0), M));
  vec3 my = cross(M, mx);
  vec2 q = vec2(dot(rd, mx), dot(rd, my)) / R;
  float r = length(q);
  if (r > 1.5) return vec3(0.0);
  float cover = 1.0 - smoothstep(1.0 - pix / R, 1.0 + pix / R, r);
  vec3 nrm = vec3(q, sqrt(max(1.0 - r * r, 0.0)));
  vec2 sd = normalize(vec2(dot(S, mx), dot(S, my)) + 1e-4);
  float ph = uMoon * TAU;
  vec3 sdir = vec3(sd * sin(ph), -cos(ph));
  float lit = smoothstep(-0.04, 0.08, dot(nrm, sdir));
  float maria = smoothstep(0.45, 0.62, fbm(q * 1.6 + 3.7, 4));
  float alb = 0.9 - 0.32 * maria + 0.08 * noise(q * 9.0);
  return vec3(1.0, 0.97, 0.92) * cover * (alb * lit * 3.2 + 0.03);
}

/* ---------------------------------------------------------- the camera */

/* time folded into a period, so the clock can run forever */
float loopT(float period) { return mod(uTime, period) / period * TAU; }

/* a drone holding station over the sand: a slow drift of a few tens of
   metres, a breath of sway, the pointer turning it half a degree. A wide
   frame holds its width of view; a tall one holds its height and turns
   toward the great dune so it stays in the picture */
vec3 camRay(vec2 fc, out vec3 ro, out float pix) {
  float asp = uRes.x / uRes.y;
  float wide = smoothstep(0.7, 1.5, asp);
  float tanH = 0.62;
  float tanV = min(tanH / asp, 0.42);
  float hY = mix(0.62, 0.57, wide);
  vec2 q = (fc - 0.5 * uRes) / (0.5 * uRes.y);
  float yaw = radians(mix(14.0, 0.0, wide)) + uPoint.x * 0.012 + 0.0025 * sin(loopT(310.0));
  float pitch = radians(-2.5) + uPoint.y * 0.006 + 0.0012 * sin(loopT(230.0));
  float sh = -tan(pitch) / tanV - (1.0 - 2.0 * hY);
  vec3 r = normalize(vec3(q.x * tanV, (q.y + sh) * tanV, 1.0));
  r.yz = rot(pitch) * r.yz;
  r.xz = rot(yaw) * r.xz;
  ro = vec3(14.0 * sin(loopT(260.0)) + uPoint.x * 3.0, EYE + 3.0 * sin(loopT(170.0)), 20.0 * sin(loopT(410.0)));
  pix = 2.0 * tanV / uRes.y;
  return r;
}

/* the ray into the heightfield: steps by the height above the sand over
   the steepest the sand can rise (a slip face, 34 degrees), never finer
   than a fraction of a pixel's reach, refined by bisection. It
   keeps its closest pass over the sand too, in pixels (for the edge of a
   skyline) and in metres (for sand blowing off a crest) */
float hAt(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  return p.y + t * t / (2.0 * RE) - terrain(p.xz, t);
}

float march(vec3 ro, vec3 rd, float pix, out float rmin, out float tr, out float hmin, out float th) {
  float tmax = 45000.0;
  if (rd.y > 0.0) tmax = min(tmax, (310.0 - ro.y) / rd.y);
  float t = 1.0, lt = 1.0, t0 = 1.0, h0 = 1e9, h1 = 1e9;
  float bestR = 2.0, bA = 0.0, bB = 0.0;
  float lip = 0.9 / (abs(rd.y) + 0.7 * length(rd.xz));
  float hitT = -1.0, a = 0.0, b = 0.0;
  rmin = 1e9; tr = 0.0; hmin = 1e9; th = 0.0;
  for (int i = 0; i < 180; i++) {
    float h = hAt(ro, rd, t);
    if (h < 0.0) { a = lt; b = t; hitT = t; break; }
    /* the closest pass over a crest between samples, kept to look at
       once the march is done */
    if (h1 < h0 && h1 < h && h1 < bestR * lt * pix) { bestR = h1 / (lt * pix); bA = t0; bB = t; }
    float r = h / (t * pix);
    if (r < rmin) { rmin = r; tr = t; }
    if (h < hmin) { hmin = h; th = t; }
    t0 = lt; h0 = h1; h1 = h;
    lt = t;
    t += max(h * lip, t * (0.003 + t * 1.2e-6));
    if (t > tmax) break;
  }
  /* the closest pass may touch the crest the steps stepped over: search
     between its samples for the lowest point */
  if (bB > 0.0) {
    float lo = bA, hi = bB;
    for (int k = 0; k < 5; k++) {
      float m1 = mix(lo, hi, 0.382), m2 = mix(lo, hi, 0.618);
      float g1 = hAt(ro, rd, m1), g2 = hAt(ro, rd, m2);
      if (g1 < 0.0) { a = lo; b = m1; hitT = m1; break; }
      if (g2 < 0.0) { a = m1; b = m2; hitT = m2; break; }
      if (g1 < g2) hi = m2; else lo = m1;
    }
    if (hitT < 0.0 || hitT > bB) {
      float tm = 0.5 * (lo + hi), hm = hAt(ro, rd, tm);
      if (hm > 0.0 && hm / (tm * pix) < rmin) { rmin = hm / (tm * pix); tr = tm; }
    }
  }
  if (hitT > 0.0) {
    for (int j = 0; j < 6; j++) {
      float m = 0.5 * (a + b);
      if (hAt(ro, rd, m) < 0.0) b = m; else a = m;
    }
    return 0.5 * (a + b);
  }
  return rd.y < 0.0 && t < tmax ? t : -1.0;
}

/* the light reaching p: the great crests analytically, the star dune by
   a few samples along the light's path past it, and the near sand by a
   short march for the small dunes and the curve of the ground itself */
float shadow(vec3 p, vec3 L, float lod) {
  vec2 sh = normalize(L.xz + 1e-6);
  float tanE = L.y / max(length(L.xz), 1e-4);
  float res = crestLight(p, sh, tanE, RD, 860.0, 100.0, 230.0, 0.31, 0.0);
  res = min(res, crestLight(p, sh, tanE, CD, 1500.0, 70.0, 400.0, 5.7, 1.0));
  vec2 sc = STAR1 - p.xz;
  float tc = dot(sc, sh), lat = abs(sc.x * sh.y - sc.y * sh.x);
  if (lat < 1500.0 && tc > -1500.0) {
    float t0 = max(tc - 1500.0, 2.0), t1 = tc + 1500.0;
    vec3 inf;
    for (int i = 0; i < 10; i++) {
      float t = mix(t0, t1, (float(i) + 0.5) / 10.0);
      if (t < 2.0) continue;
      float H = star(p.xz + sh * t, STAR1, 290.0, 1500.0, 0.4, 11.0, inf);
      res = min(res, (p.y + t * tanE - H) / (t * 0.014) + 0.5);
    }
  }
  float t = 1.5;
  for (int i = 0; i < 24; i++) {
    vec3 q = p + L * t;
    float h = q.y - terrain(q.xz, lod);
    res = min(res, 90.0 * h / t);
    if (res < 0.0 || q.y > 330.0) break;
    t += max(h * 0.7, 1.5 + t * 0.12);
  }
  return smoothstep(0.0, 1.0, res);
}

vec3 normalAt(vec2 p, float e, float lod) {
  float hx = terrain(p + vec2(e, 0.0), lod) - terrain(p - vec2(e, 0.0), lod);
  float hz = terrain(p + vec2(0.0, e), lod) - terrain(p - vec2(0.0, e), lod);
  return normalize(vec3(-hx, 2.0 * e, -hz));
}

/* the sky's light on a surface facing n, for one light: the zenith and
   the horizon toward and away from the light, the horizon only as far as
   the dunes around leave it open (hv) */
vec3 skyLight(vec3 L, vec3 n, float hv) {
  vec3 zi, zt, hi, ht, si, st;
  vec2 lh = normalize(L.xz + 1e-5);
  atmo(vec3(0.0, 1.0, 0.0), L, 1e9, zi, zt);
  atmo(normalize(vec3(-lh.x, 0.1, -lh.y)), L, 1e9, hi, ht);
  vec2 ls = rot(1.1) * lh;
  atmo(normalize(vec3(ls.x, 0.25, ls.y)), L, 1e9, si, st);
  vec3 hor = mix(hi, si, 0.5 + 0.5 * dot(n.xz, lh));
  float up = 0.5 + 0.5 * n.y;
  return PI * (zi * up * 0.75 + hor * (0.35 + 0.25 * (1.0 - n.y)) * hv);
}

/* ----------------------------------------------------------- the vlei */

/* the clay pan, and the dead camelthorns standing in it, one at most to
   a cell, each a black trunk and a flat spread of bare branches */
const float TC = 40.0;
float panMask(vec2 p) {
  vec2 pq = vec2(dot(p - PAN, RN), dot(p - PAN, RD));
  float e = length(pq / vec2(115.0, 250.0)) + 0.22 * (noise(p * 0.012) - 0.5) + 0.08 * (noise(p * 0.05) - 0.5);
  return 1.0 - smoothstep(0.75, 1.1, e);
}
vec3 treeIn(vec2 c) {
  vec3 h = hash33(vec3(c, 3.7));
  vec2 pos = (c + 0.25 + 0.5 * h.xy) * TC;
  float ok = step(h.z, 0.6) * step(0.6, panMask(pos));
  return vec3(pos, ok * (4.5 + 3.0 * hash12(c * 1.3 + 2.0)));
}
/* how much of a tree covers a line of sight passing sd metres to one
   side of its foot, hy metres up: a leaning trunk forking into a few
   bare limbs that spread wide and flat, seen as a silhouette */
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * sat(dot(pa, ba) / dot(ba, ba)));
}
float treeCover(vec3 tr, float hy, float sd, float fp, vec2 seed) {
  float H = tr.z;
  if (H <= 0.0 || hy < -0.5 || hy > 1.15 * H) return 0.0;
  vec3 r = hash33(vec3(seed, 1.9));
  float fx = (r.x < 0.5 ? -1.0 : 1.0) * (0.8 + 0.5 * r.y) * H;
  vec2 q = vec2(sd / fx, hy / H);
  vec2 f = vec2(0.08 * (r.z - 0.5), 0.42 + 0.1 * r.y);
  float w = fp / H;
  float c = sat((0.075 - seg(q, vec2(0.0), f) * abs(fx) / H) / w + 0.5);
  float d = min(min(seg(q, f, vec2(-0.55, 0.95)), seg(q, f, vec2(0.62, 0.88))), seg(q, f, vec2(0.12, 1.02)));
  d = min(d, min(seg(q, vec2(-0.3, 0.72), vec2(-0.78, 0.8)), seg(q, vec2(0.36, 0.68), vec2(0.82, 0.74))));
  c = max(c, sat((0.04 - d * abs(fx) / H) / w + 0.5));
  return c;
}
/* the trees' own shadows across the clay, toward the light */
float treeShade(vec3 p, vec2 sh, float tanE, float fp) {
  float res = 1.0;
  float reach = min(8.0 / max(tanE, 0.05), 160.0);
  vec2 lc = vec2(-1e5);
  for (int i = 0; i < 6; i++) {
    vec2 c = floor((p.xz + sh * reach * float(i) / 5.0) / TC);
    if (c == lc) continue;
    lc = c;
    vec3 tr = treeIn(c);
    vec2 dv = tr.xy - p.xz;
    float along = dot(dv, sh);
    if (along <= 0.0) continue;
    float d = dv.x * sh.y - dv.y * sh.x;
    res = min(res, 1.0 - treeCover(tr, p.y + 1.0 + along * tanE, d, max(fp, along * 0.01), c));
  }
  return res;
}
/* the trees standing between the eye and the clay it sees */
vec4 treesOnRay(vec3 ro, vec3 rd, float t, float pix) {
  float ty = max((ro.y + 1.0 - 8.0) / max(-rd.y, 1e-3), 0.0);
  vec2 rh = rd.xz / max(length(rd.xz), 1e-5);
  float kxz = length(rd.xz);
  vec2 lc = vec2(-1e5);
  for (int i = 0; i < 6; i++) {
    float tt = mix(ty, t, float(i) / 5.0);
    vec2 c = floor((ro.xz + rd.xz * tt) / TC);
    if (c == lc) continue;
    lc = c;
    vec3 tr = treeIn(c);
    if (tr.z <= 0.0) continue;
    vec2 dv = tr.xy - ro.xz;
    float along = dot(dv, rh);
    float tc = along / kxz;
    float d = dv.x * rh.y - dv.y * rh.x;
    float cov = treeCover(tr, ro.y + rd.y * tc + 1.0, d, tc * pix * 1.3, c);
    if (cov > 0.0) return vec4(tc, cov, 0.0, 0.0);
  }
  return vec4(0.0);
}

/* ----------------------------------------------------------- the light */

vec3 gSun, gMoon;
float gWS, gWM, gEs, gEm, gGain;

/* the sky light, sunlight and moonlight at a point, for both lights */
void lightsAt(vec3 p, vec3 n, out vec3 sunC, out vec3 skyC) {
  sunC = vec3(0.0);
  skyC = vec3(0.0);
  float hv = sat(0.3 + p.y / 110.0);
  if (gWS > 0.001) {
    sunC += sunAt(gSun, p.y) * gEs * gWS;
    skyC += skyLight(gSun, n, hv * look3(1.0, 0.4, 1.0)) * gEs * gWS;
  }
  if (gWM > 0.001) {
    sunC += sunAt(gMoon, p.y) * gEm * gWM * 3.2;
    skyC += skyLight(gMoon, n, hv) * gEm * gWM;
  }
  skyC *= mix(1.0, gGain, look3(0.5, 0.0, 0.5));
}

vec3 keyDir() { return normalize(gSun * gWS * gEs * 0.2 + gMoon * gWM * gEm); }

/* the air between the eye and t: inscattered light of both lights and
   what is left of the light behind */
vec3 airTo(vec3 rd, float t, out vec3 trans) {
  vec3 ins = vec3(0.0), tr = vec3(1.0), ins2 = vec3(0.0), tr2 = vec3(1.0);
  if (gWS > 0.001) atmo(rd, gSun, t, ins, tr);
  if (gWM > 0.001) atmo(rd, gMoon, t, ins2, tr2);
  trans = gWS > 0.001 ? tr : tr2;
  vec3 air = (ins * gEs * gWS + ins2 * gEm * gWM) * gGain;
  /* the belt of Venus: the low sky away from the sun flushed pink with
     reddened light scattered back */
  vec2 ah = normalize(rd.xz + 1e-5), sh0 = normalize(gSun.xz + 1e-5);
  float anti = pow(sat(0.5 - 0.5 * dot(ah, sh0)), 3.0);
  vec3 belt = vec3(1.0, 0.42, 0.5) * anti * exp(-pow((max(rd.y, 0.0) - 0.07) / 0.075, 2.0)) * 0.11 * uLook.y;
  return air + belt * (t > 1e8 ? 1.0 : 1.0 - trans.g);
}

/* sand lifted off a crest by the wind and streaming down over the slip
   face: thin streamers a few metres long, running with the wind, coming
   and going in gusts. along runs the crest, down away from it, above is
   the height over the sand. Two drifting copies cross-fade so the loop
   in time never shows */
float spindrift(float along, float down, float above) {
  float ph = fract(uTime / 24.0);
  vec2 q = vec2(along * 0.32, down * 0.06 + max(above, 0.0) * 0.12);
  float n1 = noise(q - vec2(0.0, ph * 24.0 * 0.35));
  float n2 = noise(q + vec2(17.3, 5.1) - vec2(0.0, (ph - 1.0) * 24.0 * 0.35));
  float n = mix(n1, n2, smoothstep(0.0, 1.0, ph));
  float gust = sat(0.35 + 0.65 * sin(along * 0.011 + loopT(29.0)) + 0.3 * sin(along * 0.037 - loopT(11.0)));
  return smoothstep(0.5, 0.85, n) * gust * exp(-down / 7.0) * exp(-max(above, 0.0) / 2.2);
}

/* ----------------------------------------------------------- the sand */

vec3 shade(vec3 ro, vec3 rd, float t, float pix) {
  vec3 p = ro + rd * t;
  vec4 info;
  p.y = field(p.xz, t, info);
  float fpm = t * pix;
  vec3 n = normalAt(p.xz, max(0.25, fpm), t);
  /* the sand's own slow undulation, finer than the heightfield carries */
  float dA = smoothstep(4.5, 1.0, fpm);
  if (dA > 0.0) {
    vec2 w = vec2(dot(p.xz, RN), dot(p.xz, RD));
    vec3 n1 = noised(w * vec2(0.03, 0.006) + 3.1);
    vec3 n2 = noised(w * vec2(0.1, 0.02) + 7.7);
    vec2 gw = n1.yz * vec2(0.03, 0.006) * 0.6 + n2.yz * vec2(0.1, 0.02) * 0.14 * smoothstep(1.6, 0.5, fpm);
    vec2 gr = RN * gw.x + RD * gw.y;
    n = normalize(n - vec3(gr.x, 0.0, gr.y) * dA * (1.0 - info.w) * (1.0 - 0.8 * info.x));
  }

  /* red on the dunes, a little darker down the slip faces where the
     avalanches run; paler and duller on the corridor floor; the clay of
     the pan almost white */
  float lee = info.x, pan = info.w;
  float flo = (1.0 - smoothstep(3.0, 14.0, p.y)) * (1.0 - pan);
  float mott = noise(p.xz * 0.011) * 0.6 + noise(p.xz * 0.05) * 0.4;
  vec3 alb = vec3(0.43, 0.165, 0.085) * (0.9 + 0.2 * mott);
  alb = mix(alb, vec3(0.4, 0.148, 0.075), lee);
  float streak = noise(vec2(info.z * 0.09, info.y * 0.012));
  alb *= 1.0 - lee * 0.18 * smoothstep(0.3, 0.8, streak);
  alb = mix(alb, vec3(0.44, 0.22, 0.12) * (0.85 + 0.3 * mott), flo * 0.8);
  /* tufts of grass dotted over the corridor floor */
  vec2 gc = floor(p.xz / 16.0);
  vec3 gh = hash33(vec3(gc, 9.1));
  float tuft = step(gh.z, 0.1) * sat((0.9 * gh.x + 0.4 - length(p.xz - (gc + 0.2 + 0.6 * gh.xy) * 16.0)) / fpm + 0.5);
  alb *= 1.0 - 0.55 * tuft * flo;
  float rim = smoothstep(0.0, 0.5, pan) * (1.0 - smoothstep(0.5, 1.0, pan));
  alb = mix(alb, vec3(0.6, 0.53, 0.44) * (0.9 + 0.15 * noise(p.xz * 0.09)) * (1.0 - 0.3 * rim), pan);

  /* wind ripples across the windward sand and the floor, fading as they
     fall under a pixel */
  float g = fpm / max(abs(dot(rd, n)), 0.2);
  float rip = (1.0 - lee) * (1.0 - pan) * smoothstep(0.42, 0.16, g);
  if (rip > 0.0) {
    float ph = dot(p.xz, RN) * (TAU / 1.7) + 9.0 * noise(p.xz * 0.04) + 2.5 * noise(p.xz * 0.23);
    float sl = (sin(ph) + 0.35 * sin(2.0 * ph)) * 0.22 * rip;
    n = normalize(n + vec3(RN.x, 0.0, RN.y) * sl);
  }

  vec3 L = keyDir();
  float dif = max(dot(n, L), 0.0);
  float sh = dif > 0.0 ? shadow(p + n * 0.6, L, t) : 0.0;
  vec2 lh = normalize(L.xz + 1e-5);
  float tanE = L.y / max(length(L.xz), 1e-4);
  if (pan > 0.01 && sh > 0.0) sh *= treeShade(p, lh, tanE, fpm);
  vec3 sunC, skyC;
  lightsAt(p, n, sunC, skyC);
  /* the hollows see less of the sky */
  float ao = 1.0;
  if (fpm < 6.0) {
    float r = 35.0;
    float av = 0.25 * (terrain(p.xz + vec2(r, 0.0), t) + terrain(p.xz - vec2(r, 0.0), t) + terrain(p.xz + vec2(0.0, r), t) + terrain(p.xz - vec2(0.0, r), t));
    ao = mix(sat(1.0 + (p.y - av) / 30.0), 1.0, smoothstep(2.0, 6.0, fpm));
    ao = 0.55 + 0.45 * ao;
  }
  /* light thrown back by the sunlit sand around */
  vec3 bounce = sunC * max(L.y, 0.0) * vec3(0.42, 0.18, 0.08) * (0.55 + 0.45 * (1.0 - n.y)) * 0.6;
  vec3 col = alb * (sunC * dif * sh + (skyC + bounce) * ao) / PI;

  /* sand streaming off the crest above a slip face */
  float sd = lee * spindrift(info.z, info.y, 0.0) * smoothstep(2.5, 0.5, fpm);
  float fwd = 0.35 + 2.5 * pow(sat(dot(rd, L)), 6.0);
  col += sd * 0.45 * vec3(0.5, 0.3, 0.2) * (sunC * fwd + skyC * 0.25) / PI;

  /* a dead tree standing in front */
  if (pan > 0.0 || info.w > 0.0) {
    vec4 tr = treesOnRay(ro, rd, t, pix);
    if (tr.y > 0.0) {
      vec3 tc = vec3(0.035, 0.026, 0.02) * (sunC * 0.3 * max(L.y, 0.2) + skyC * 0.5) / PI;
      col = mix(col, tc, tr.y);
    }
  }

  vec3 trans;
  vec3 air = airTo(rd, t, trans);
  return col * trans + air;
}

/* the sky; the stars, the Milky Way and the moon go to lights, added
   after the night's grade so they keep their colour */
vec3 skyCol(vec3 rd, float pix, out vec3 lights) {
  vec3 trans;
  vec3 col = airTo(rd, 1e9, trans);
  float sd = length(rd - gSun);
  col += smoothstep(0.0052, 0.0044, sd) * sunAt(gSun, 0.0) * gEs * 400.0 * gWS;
  lights = vec3(0.0);
  if (gWM > 0.001) {
    float band;
    vec3 mw = milky(rd, band);
    vec3 night = starsAt(rd, pix, band) + mw * 0.095;
    lights = night * trans * gWM * smoothstep(0.0, 0.04, rd.y);
    lights += moonDisc(rd, gMoon, gSun, pix) * gWM;
  }
  return col;
}

vec3 scene(vec2 fc) {
  vec3 ro;
  float pix;
  vec3 rd = camRay(fc, ro, pix);

  gSun = normalize(look3(azel(105.0, 30.0), azel(108.0, 3.0), azel(108.0, -8.0)));
  gMoon = azel(-29.0, 10.0);
  gWS = uLook.x + uLook.y;
  gWM = uLook.z;
  gEs = look3(6.5, 40.0, 0.0);
  gEm = 1.7;
  gGain = look3(1.2, 0.55, 0.75);

  float rmin, tr, hmin, th;
  float t = march(ro, rd, pix, rmin, tr, hmin, th);
  vec3 col, lights = vec3(0.0);
  if (t < 0.0) {
    col = skyCol(rd, pix, lights);
    /* a skyline that the ray only just cleared: part of the pixel is sand */
    float cov = sat(0.5 - rmin);
    if (cov > 0.0) {
      col = mix(col, shade(ro, rd, max(tr - max(3.0, tr * pix * 4.0), 1.0), pix), cov);
      lights *= 1.0 - cov;
    }
    /* sand blowing off a crest seen against the sky */
    if (hmin < 20.0) {
      vec4 info;
      vec3 q = ro + rd * th;
      field(q.xz, th, info);
      float sd = spindrift(info.z, info.y, hmin) * smoothstep(2.5, 0.5, th * pix);
      vec3 sunC, skyC;
      lightsAt(q, vec3(0.0, 1.0, 0.0), sunC, skyC);
      float fwd = 0.35 + 2.5 * pow(sat(dot(rd, keyDir())), 6.0);
      col += sd * 0.45 * vec3(0.5, 0.3, 0.2) * (sunC * fwd + skyC * 0.25) / PI;
    }
  } else {
    col = shade(ro, rd, t, pix);
  }
  col *= look3(vec3(1.0), vec3(0.76, 0.92, 1.5), vec3(0.8, 0.95, 1.3));
  col = max(mix(vec3(luma(col)), col, 1.0 + 0.15 * uLook.x + 0.12 * uLook.y), 0.0);
  vec3 grey = vec3(luma(col));
  col = mix(col, grey * vec3(0.5, 0.72, 1.35), 0.85 * gWM);
  return col + lights * vec3(0.9, 0.95, 1.08);
}
`
};
