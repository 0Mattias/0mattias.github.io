/* concepts/scenes/fjord.js · the fjord

   Afloat at dead calm a hand above the water, near the inner end of a
   Norwegian fjord, looking down its length. The land is one heightfield
   laid over the fjord's plan: the narrow reach the eye floats in, its
   walls standing sheer out of the water and ending in two headlands; the
   wider fjord beyond them, running on for fifteen kilometres; two spurs
   reaching out from either side toward the bend, each lower than the one
   behind, and the far bank closing it. Every wall is the same section, a
   sheer foot, a wooded slope where there is one, the upper cliff and the
   rounded shoulder of the uplands with their humps behind, pushed in and
   out along the shore so that buttresses and gullies run down it, broken
   by ledges and joints that vary with height, so the cliffs read as
   fractured rock and not as streaks; birch and pine take the wooded
   slopes and the ledges, and snow lies on the high flats. A fall threads
   down the right wall in pitches, mostly hidden where it runs under the
   trees, with spray hanging at its foot, and a thinner one falls down
   the far left wall. Faces turned from the sun take the light the sunlit
   walls and the water throw back at them. The
   air is one model for sky and distance alike, sunlight scattered once
   by Rayleigh and Mie over an exponential atmosphere and a bluer veil of
   light scattered more than once, so the far walls fade into the same
   blue, or rose, as the sky behind them; a deck of cirrus drifts high
   over it. The water mirrors all of it with the Fresnel of water,
   broken by wavelets that are strongest under the eye and let go toward
   the bend, by a long slow swell, and by patches where a breath of wind
   roughens it, and a thin mist lies on it at dusk and by night. By day
   the sun stands high behind the left wall and lights the right one; at
   dusk it is all but down, the fjord is in shadow and only the high
   ground keeps the last of it, under a rose and lavender sky; at night
   the moon hangs in the gap and the aurora folds slowly over the bend,
   curtains pleated and doubled back on themselves, brightest and sharpest
   at their lower edge and fading upward through tall rays, densest over
   the gap and thinning away east, lighting the fjord twice, once in the
   sky and once in the water. A phone looks
   from further up the reach and nearer the left wall, so that wall
   towers over the words. WebGL2, no libraries, no build step. */

window.CONCEPT = {
  id: 'fjord',
  theme: { day: '#6091c4', dusk: '#838faf', night: '#22404d' },
  t0: 40,
  frag: `
/* ------------------------------------------------------------ state */
/* metres; x to the right, y up, z down the fjord. Set once a pixel. */

float TT;          // the clock, wrapped
float PXA;         // the angle of one pixel, radians
vec3 KEY;          // toward the light: the sun by day and dusk, the moon by night
vec3 E0;           // that light above the air
vec3 KEYG;         // that light at the water, after the air
vec3 KEYC;         // that light at cloud height
vec3 MOOND;        // the moon
vec3 SKYZ, SKYH;   // the sky overhead and low down, for the light it sheds
vec3 GLOWA;        // the light the aurora sheds
float MIE;         // haze
float AIRLIT;      // how much of the fjord's air the key light reaches
float FRAMEK;      // 0 on a tall frame, 1 on a wide one
float AQ;          // the aurora's care: full in the sky, half in the water
vec3 MSL;          // the light that has scattered more than once, as a source

const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);   // Rayleigh, per metre
const vec3 BO = vec3(0.65e-6, 1.88e-6, 0.085e-6); // ozone, per metre

float sq(float x) { return x * x; }

vec3 dirAE(float az, float el) {
  az = radians(az); el = radians(el);
  return vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el));
}

/* ------------------------------------------------------------ the air */

float airmass(float mu, float c) { mu = max(mu, 0.0); return inversesqrt(mu * mu + 1.0 / (c * c)); }
float phaseR(float c) { return 0.0596831 * (1.0 + c * c); }
float phaseM(float c, float g) {
  float g2 = g * g;
  return 0.0795775 * (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5);
}

/* the key light after the air on a path rising at mu; lift < 1 for light
   that reaches air higher up, through less of it */
vec3 keyLight(float mu, float lift) {
  vec3 tau = (BR * 8000.0 * airmass(mu, 35.0) + MIE * 1332.0 * airmass(mu, 91.0)) * lift
           + BO * 25000.0 * airmass(mu, 11.3);
  return E0 * exp(-tau);
}

/* light scattered once toward the eye along a path of Rayleigh depth tR
   and Mie depth tM, by the phase of each; what has scattered more than
   once is a flatter, bluer veil, brighter low down (skyMS), which the
   distance takes in as it thickens, so sky and distance meet at the
   horizon */
vec3 scatter1(vec3 tR, float tM, float c, vec3 sun) {
  vec3 tau = tR + tM * 1.11;
  return sun * (tR * phaseR(c) + tM * phaseM(c, 0.78)) * (1.0 - exp(-tau)) / max(tau, vec3(1e-6));
}
vec3 skyMS(float mu) {
  return MSL * BR * 8000.0 * 0.0796 * (1.0 + look3(1.6, 0.3, 1.6) * sq(1.0 - mu));
}

vec3 skyRad(vec3 rd) {
  float mu = max(rd.y, 0.0);
  vec3 tR = BR * 8000.0 * airmass(mu, 35.0);
  float tM = MIE * 1200.0 * airmass(mu, 91.0);
  return scatter1(tR, tM, dot(rd, KEY), keyLight(KEY.y, mix(1.0, 0.06, pow(mu, 0.25)))) + skyMS(mu);
}

float densInt(float y0, float mu, float d, float H) {
  float a = exp(-max(y0, 0.0) / H), k = mu * d / H;
  return abs(k) < 1e-3 ? a * d * (1.0 - 0.5 * k) : a * H * (1.0 - exp(-k)) / mu;
}

/* the air between the eye and something d away; at dusk most of the
   fjord's air is in the walls' shadow and takes only the sky's light */
vec3 air(vec3 col, vec3 ro, vec3 rd, float d) {
  vec3 tR = BR * densInt(ro.y, rd.y, d, 8000.0);
  float tM = MIE * densInt(ro.y, rd.y, d, 1200.0);
  vec3 T = exp(-(tR + tM * 1.11));
  return col * T + scatter1(tR, tM, dot(rd, KEY), KEYG * AIRLIT) + skyMS(0.0) * (1.0 - T);
}

/* ------------------------------------------------------------ the land */

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * sat(dot(pa, ba) / dot(ba, ba)));
}
/* a spur of land narrowing from ra at its root to rb at its tip, so its
   crest falls toward the water as it reaches out */
float spur(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a, ba = b - a;
  float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(ra, rb, h);
}
float smin(float a, float b, float k) {
  float h = sat(0.5 + 0.5 * (b - a) / k);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/* the fjord's plan, the distance to its shore, negative on the water: the
   narrow reach the eye floats in, the wide fjord beyond its headlands, and
   the bend away to the right; spurs and bays push the shore about */
float plan(vec2 p) {
  float g = sdSeg(p, vec2(70.0, -14000.0), vec2(70.0, 1400.0)) - 720.0;
  float o = sdSeg(p, vec2(-150.0, 4300.0), vec2(250.0, 14300.0)) - 2350.0;
  float b = sdSeg(p, vec2(250.0, 14300.0), vec2(10000.0, 17600.0)) - 1900.0;
  float w = smin(g, smin(o, b, 1400.0), 300.0);
  // two promontories reaching out toward the bend, one from each side
  w = max(w, -spur(p, vec2(-3300.0, 11900.0), vec2(-800.0, 13700.0), 950.0, 110.0));
  w = max(w, -spur(p, vec2(3500.0, 10200.0), vec2(1400.0, 11500.0), 850.0, 110.0));
  w += 440.0 * noise(p * 0.00042 + vec2(3.1, 7.7)) - 220.0;
  w += 160.0 * noise(p * 0.0014 + vec2(1.3, 2.9)) - 80.0;
  return w;
}

/* the height of the wall tops: high near the eye, lower toward the bend so
   the gap opens, with humps and notches along them */
float tops(vec2 p) {
  float T = 1180.0 + 560.0 * noise(p * 0.0003 + vec2(5.2, 1.4)) - 280.0
          + 300.0 * noise(p * 0.0011 + vec2(2.0, 8.0)) - 150.0;
  T -= 280.0 * smoothstep(8000.0, 15000.0, p.y);
  return T;
}

/* the land at p, s from the shore and T at the top. Buttresses and gullies
   push the shore in and out the same at every height, so on the walls they
   run straight down; ridged, so the ribs come to an edge. Then ledges, and
   the section: a sheer foot, a wooded slope where there is one, the upper
   cliff, and the shoulder of the uplands with their humps behind */
float ground(vec2 p, float s, float T, int det) {
  s += 90.0 * noise(p * 0.0042 + 1.7) - 45.0;
  float m = smoothstep(0.15, 0.55, noise(p * 0.0008 + 11.0)) * (1.0 - smoothstep(-200.0, -900.0, p.x) * smoothstep(3200.0, 1800.0, p.y));
  float s2 = 60.0 + 330.0 * m;
  // the fractured detail is the cliffs'; the wooded slope between is smoother
  float cf = max(mix(0.3, 1.0, smoothstep(s2 - 60.0, s2 + 20.0, s)), 1.0 - smoothstep(30.0, 60.0, s));
  if (det > 0) {
    s -= (det > 1 ? 52.0 : 34.0) * (0.25 + 1.1 * noise(p * 0.0007 + 2.0)) * (0.45 + 0.8 * noise(vec2(s * 0.007, (p.x + p.y) * 0.003)))
       * sqrt(sq(noise(p * 0.011 + 5.0) - 0.5) + 0.004);
    if (det > 1) s += cf * (16.0 * noise3(vec3(p.x * 0.03, s * 0.09, p.y * 0.03) + 4.0) - 8.0);
    if (det > 2) s += cf * (6.0 * noise3(vec3(p.x * 0.09, s * 0.3, p.y * 0.09) + 2.0) - 3.0);
  }
  if (det > 1) s += (1.5 + 3.5 * noise(p * 0.0013 + 6.0)) * sin(s * 0.15 + 14.0 * noise(p * 0.0024 + 3.0));
  float h = 0.12 * smoothstep(-12.0, 45.0, s)
          + 0.26 * smoothstep(25.0, s2, s)
          + 0.44 * smoothstep(s2 - 40.0, s2 + 110.0, s)
          + 0.18 * smoothstep(s2 + 60.0, s2 + 900.0, s);
  h *= T;
  float up = smoothstep(s2 + 100.0, s2 + 1300.0, s);
  if (up > 0.0) {
    float r = 0.0, a = 0.5;
    vec2 q = p * 0.0005;
    int oc = 2 + det;
    for (int i = 0; i < 5; i++) {
      if (i >= oc) break;
      float n = 1.0 - abs(2.0 * noise(q) - 1.0);
      r += a * n * n;
      q = ROT2 * q * 2.1 + 3.3;
      a *= 0.5;
    }
    h += up * 450.0 * r;
  }
  h -= sat(-s / 60.0) * 150.0;
  return h;
}

float groundAt(vec2 p, int det) { return ground(p, plan(p), tops(p), det); }

int detAt(float t) { return t < 2500.0 ? 3 : t < 6000.0 ? 2 : t < 26000.0 ? 1 : 0; }

/* march the land; the shore's distance carries the ray across open water
   in long strides, the height above the ground over the land, and a
   crossing is narrowed by halves. A ray that misses keeps where it passed
   nearest the land, in pixels, so a skyline can be drawn soft */
float EDGEC, EDGET;
float march(vec3 ro, vec3 rd, float tmax, int steps, int dmax) {
  float t = 0.5, tp = 0.0, ec = 1e9;
  EDGEC = 0.0;
  for (int i = 0; i < 200; i++) {
    if (i >= steps) break;
    vec3 p = ro + rd * t;
    if (t > tmax || (p.y > 2150.0 && rd.y > 0.0)) break;
    float s = plan(p.xz);
    float h = ground(p.xz, s, tops(p.xz), min(detAt(t), dmax));
    float dy = p.y - h;
    if (dy < 0.0) {
      float a = tp, b = t;
      for (int k = 0; k < 6; k++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y < groundAt(q.xz, min(detAt(m), dmax))) b = m; else a = m;
      }
      return 0.5 * (a + b);
    }
    float px = dy / (t * PXA);
    if (s > 0.0 && px < ec) { ec = px; EDGET = t; }
    tp = t;
    t += max(max(0.3 * dy, (-s - 90.0) * 0.6), 0.0012 * t + 0.2);
  }
  EDGEC = sat(0.5 - ec);
  return -1.0;
}

/* the sun's (or moon's) way out from p, tested against the land in a few
   lengthening taps; the clearance over each sets a soft edge */
float shadow(vec3 p, int n) {
  float r = 1.0, d = 40.0;
  for (int i = 0; i < 10; i++) {
    if (i >= n) break;
    vec3 q = p + KEY * d;
    if (q.y > 2150.0) break;
    float h = groundAt(q.xz, 0);
    r = min(r, sat(0.5 + 30.0 * (q.y - h + 12.0) / d));
    d *= 2.05;
  }
  return r * r * (3.0 - 2.0 * r);
}

/* the falls: a thread of water over the edge of the right wall, falling
   in pitches from ledge to ledge, white where it strikes and thin between,
   and threading on down through the wood, where the trees hide most of
   it; and a thinner one far down the left side. steep is how sheer the
   rock is where it falls */
float falls(vec3 p, float steep, float fp) {
  float z0 = 1750.0 + 16.0 * sin(p.y * 0.011) + 7.0 * sin(p.y * 0.037 + 1.0);
  float pitch = noise(vec2(p.y * 0.018, 1.0));
  float w0 = (1.6 + 3.2 * (1.0 - p.y / 1150.0)) * (0.5 + pitch) * mix(0.6, 1.0, steep);
  float w = max(w0, 2.4 * fp);
  float m = mix(1.0, w0 / w, 0.5) * smoothstep(w, w * 0.2, abs(p.z - z0)) * step(200.0, p.x) * smoothstep(1100.0, 1040.0, p.y);
  float fl = noise(vec2((p.z - z0) * 0.6, p.y * 0.05 + TT * 1.6));
  float f = m * mix(smoothstep(0.45, 0.65, pitch), 0.3 + 0.7 * smoothstep(0.3, 0.7, pitch), steep) * (0.55 + 0.45 * fl);
  float z1 = 10600.0 + 22.0 * sin(p.y * 0.008);
  float p1 = noise(vec2(p.y * 0.012, 4.0));
  float w1 = max((6.0 + 8.0 * (1.0 - p.y / 1100.0)) * (0.5 + p1), 2.4 * fp);
  float m1 = smoothstep(w1, w1 * 0.3, abs(p.z - z1)) * step(p.x, -1500.0) * smoothstep(1050.0, 960.0, p.y);
  f = max(f, m1 * (0.35 + 0.65 * smoothstep(0.3, 0.7, p1)) * (0.6 + 0.4 * noise(vec2((p.z - z1) * 0.2, p.y * 0.03 + TT * 1.2))));
  return f;
}

/* the land's colour and light at p: n shades it, ng (the land's own
   normal, without the fractured detail) decides what grows and lies there */
vec3 shadeLand(vec3 p, vec3 n, vec3 ng, float t, int taps) {
  float y = p.y;
  float fp = t * PXA;
  float aa = sat(1.0 - fp / 6.0);
  // gneiss: dark grey, mottled in all three directions so nothing is drawn
  // out down the faces; foliation bands tilted across them; joints, dark
  // hairlines where a field crosses its middle; a warmer lichen cast
  float k1 = noise3(p * 0.021) * 0.65 + noise3(p * 0.075 + 3.0) * 0.35;
  vec3 alb = vec3(0.125, 0.123, 0.118) * (0.5 + 0.85 * k1);
  float fol = noise(vec2(dot(p, vec3(0.32, 1.0, 0.18)) * 0.016 + 3.0 * noise3(p * 0.004), 3.0));
  alb *= 0.8 + 0.4 * fol;
  float jf = noise3(p * vec3(0.04, 0.026, 0.04) + 7.0);
  float jw = max(0.02, fp * 0.07);
  alb *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, jw, abs(jf - 0.5))) * sat(1.0 - fp / 3.0);
  alb = mix(alb, alb * vec3(1.15, 1.04, 0.85), noise3(p * 0.008 + 1.0));
  // pale scars where rock has fallen, dark moss in the gullies
  float sc = smoothstep(0.72, 0.88, noise3(p * vec3(0.01, 0.006, 0.01) + 17.0));
  alb = mix(alb, vec3(0.27, 0.255, 0.235), sc * 0.7 * (1.0 - ng.y));
  float gl = sqrt(sq(noise(p.xz * 0.011 + 5.0) - 0.5) + 0.004);
  alb *= 1.0 - 0.4 * smoothstep(0.18, 0.42, gl);
  // a few black wet streaks, where water seeps over the edges
  float ws = noise3(vec3(p.x * 0.028, y * 0.0018, p.z * 0.028) + 11.0);
  alb = mix(alb, vec3(0.03, 0.031, 0.03), smoothstep(0.74, 0.86, ws) * (1.0 - ng.y) * 0.8);
  // birch and pine on the wooded slopes and the ledges, below the tree line
  float tl = 520.0 + 160.0 * noise(p.xz * 0.0021);
  float sz = plan(p.xz) + 90.0 * noise(p.xz * 0.0042 + 1.7) - 45.0;
  float s2 = 60.0 + 330.0 * smoothstep(0.15, 0.55, noise(p.xz * 0.0008 + 11.0)) * (1.0 - smoothstep(-200.0, -900.0, p.x) * smoothstep(3200.0, 1800.0, p.z));
  float wood = smoothstep(15.0, 45.0, sz) * (1.0 - smoothstep(s2 - 70.0, s2 - 20.0, sz)) * smoothstep(0.3, 0.45, noise(p.xz * 0.012 + 6.0) + 0.2);
  float veg = max(wood * smoothstep(0.15, 0.35, ng.y), smoothstep(0.45, 0.65, ng.y + 0.12 * noise(p.xz * 0.03)))
            * (1.0 - smoothstep(tl - 90.0, tl + 50.0, y)) * smoothstep(4.0, 14.0, y);
  float cn = noise3(p * 0.3) * 0.6 + noise3(p * 0.11) * 0.4;
  vec3 trees = mix(vec3(0.016, 0.026, 0.017), vec3(0.036, 0.05, 0.026), smoothstep(0.35, 0.75, noise(p.xz * 0.004 + 2.0)));
  trees *= mix(1.0, 0.45 + 1.1 * cn, aa);
  alb = mix(alb, trees, veg);
  // heath and bare grass above them
  float heath = smoothstep(0.55, 0.75, ng.y) * smoothstep(tl - 40.0, tl + 140.0, y);
  alb = mix(alb, vec3(0.095, 0.09, 0.06) * (0.8 + 0.4 * noise(p.xz * 0.02)), heath * 0.85);
  // snow lying on the high flats and in the hollows
  float sl = 1200.0 + 300.0 * noise(p.xz * 0.0028) - 150.0 + 140.0 * noise(p.xz * 0.017) - 70.0;
  float sn = smoothstep(sl - 60.0, sl + 60.0, y) * smoothstep(0.5, 0.78, ng.y) * smoothstep(0.3, 0.55, noise(p.xz * 0.006 + 4.0) + 0.25 * noise(p.xz * 0.03));
  alb = mix(alb, vec3(0.86, 0.88, 0.9), sn);
  // the falls, hidden where they run under the trees
  float wf = falls(p, smoothstep(0.62, 0.3, ng.y), fp) * (1.0 - 0.85 * veg);
  alb = mix(alb, vec3(0.74, 0.76, 0.78), wf * look3(0.7, 0.9, 0.9));
  // light: the key with its shadow; the sky the fjord leaves open; the
  // light the sunlit walls throw back across the water onto the faces
  // turned from the sun; and the sky and walls again off the water, most
  // near the waterline
  float nl = dot(n, KEY);
  float sh = nl > 0.0 ? shadow(p + vec3(n.x, 0.0, n.z) * 30.0 + vec3(0.0, 4.0, 0.0), taps) : 0.0;
  vec3 E = KEYG * max(nl, 0.0) * sh;
  float open = mix(0.55, 1.0, smoothstep(0.0, 1400.0, y));
  E += mix(SKYH, SKYZ, 0.5 + 0.5 * n.y) * PI * (0.5 + 0.5 * n.y) * open * look3(1.15, 1.7, 1.5);
  vec2 kh = normalize(KEY.xz + vec2(1e-4, 0.0));
  float away = sat(0.35 - 0.65 * dot(n.xz, kh));
  float litw = look3(1.0, 0.15, 0.6);
  E += KEYG * 0.075 * away * litw * (1.0 - 0.5 * n.y);
  float wfr = mix(0.32, 0.06, smoothstep(0.0, 450.0, y));
  E += (SKYH * 0.6 + SKYZ * 0.4 + KEYG * 0.02 * litw) * PI * 0.5 * wfr * (1.0 - 0.7 * n.y);
  E += GLOWA * (0.6 + 0.4 * n.y);
  return alb / PI * E;
}

/* a fractured face: a bump from noise on the three world planes, blended
   by the normal, its sign folded in so neighbouring blocks meet in edges */
vec3 rockBump(vec3 p, vec3 n, float t) {
  float fp = t * PXA;
  vec3 w = pow(abs(n), vec3(4.0));
  w /= w.x + w.y + w.z;
  vec3 g = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float f = i == 0 ? 0.11 : 0.37;
    float A = (i == 0 ? 1.3 : 0.45) * sat(1.0 - fp * f * 1.5);
    if (A <= 0.0) break;
    vec3 o = vec3(float(i) * 7.3);
    if (w.x > 0.05) { vec3 a = noised(p.zy * f + o.xy); g += w.x * vec3(0.0, a.z, a.y) * (0.5 + 0.5 * sign(a.x)) * A * f; }
    if (w.z > 0.05) { vec3 a = noised(p.xy * f + o.yz); g += w.z * vec3(a.y, a.z, 0.0) * (0.5 + 0.5 * sign(a.x)) * A * f; }
    if (w.y > 0.05) { vec3 a = noised(p.xz * f + o.xz); g += w.y * vec3(a.y, 0.0, a.z) * A * f; }
  }
  return normalize(n - g);
}

vec3 landNormal(vec3 p, float t, int det) {
  float e = max(0.6, t * 0.0012);
  float h0 = groundAt(p.xz, det);
  return normalize(vec3(h0 - groundAt(p.xz + vec2(e, 0.0), det), e, h0 - groundAt(p.xz + vec2(0.0, e), det)));
}

/* ------------------------------------------------------------ the sky */

/* a thin deck of cirrus, high, drawn out along the wind */
vec4 cirrus(vec3 rd) {
  if (rd.y < 0.015) return vec4(0.0);
  float d = 8000.0 / (rd.y + 0.035);
  vec2 p = rd.xz * d;
  vec2 q = rot(0.45) * p * vec2(0.00011, 0.00034) + vec2(TT * 0.0025, 0.0);
  q += 0.6 * vec2(noise(q * 0.7 + 5.0), noise(q * 0.7 + 9.0));
  float f = fbm(q, 5) * (0.9 + 0.15 * noise(q * vec2(2.0, 12.0)));
  float cov = look3(0.56, 0.5, 0.6);
  float a = smoothstep(cov, cov + 0.3, f) * look3(0.5, 0.6, 0.12);
  a *= smoothstep(0.02, 0.2, rd.y) * exp(-d * 0.000012);
  float c = dot(rd, KEY);
  vec3 lit = KEYC * (phaseM(c, 0.6) * 0.9 + 0.1) * look3(0.6, 1.4, 0.5) + SKYZ * look3(1.4, 0.9, 1.4);
  return vec4(lit * a, a);
}

vec3 moonDisc(vec3 rd) {
  float R = 0.0072;
  vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), MOOND)), v = cross(MOOND, u);
  vec2 q = vec2(dot(rd, u), dot(rd, v)) / R;
  float r = length(q);
  float edge = smoothstep(1.0, 1.0 - 2.0 * PXA / R, r);
  if (dot(rd, MOOND) < 0.0 || edge <= 0.0) return vec3(0.0);
  vec3 N = vec3(q, sqrt(max(1.0 - r * r, 0.0)));
  float ph = uMoon * TAU;
  vec3 L = vec3(sin(ph), 0.0, -cos(ph));
  float lit = smoothstep(-0.06, 0.12, dot(N, L));
  float mare = 0.72 + 0.28 * smoothstep(0.35, 0.65, noise(q * 2.3 + 4.0) * 0.6 + noise(q * 5.0) * 0.4);
  return vec3(1.0, 0.97, 0.9) * 2.4 * edge * (lit * mare + 0.012);
}

vec3 stars(vec3 rd) {
  vec3 c = vec3(0.0);
  for (int l = 0; l < 2; l++) {
    float sc = l == 0 ? 160.0 : 380.0;
    vec3 q = rd * sc, id = floor(q), f = q - id;
    float h = hash13(id + float(l) * 31.7);
    float thr = l == 0 ? 0.93 : 0.88;
    if (h > thr) {
      vec3 o = hash33(id + 7.0) * 0.6 + 0.2;
      float d = length(f - o) / sc;
      float k = (h - thr) / (1.0 - thr);
      float b = (l == 0 ? 0.9 : 0.3) * pow(k, 3.0) + 0.02;
      float tw = 0.75 + 0.25 * sin(TT * (1.7 + 3.0 * k) + h * 70.0);
      float r = PXA * 0.8;
      vec3 sc3 = mix(vec3(1.0, 0.82, 0.62), vec3(0.75, 0.85, 1.0), hash13(id + 3.0));
      c += sc3 * b * tw * exp(-d * d / (r * r));
    }
  }
  return c;
}

/* the aurora: curtains hung far to the north, each a thin sheet along a
   line on the ground that meanders, and loops at two scales so that it
   pleats and doubles back on itself, all of it slowly turning. The sheet's
   lower edge, near a hundred kilometres, is its brightest and sharpest
   part, a green going to white, with a thin magenta fringe under it where
   the display is strongest; rays rise from it and fade slowly over a
   hundred kilometres and more into a faint red-violet. Brighter knots and
   fainter stretches travel along it, and each curtain has its own reach
   across the sky, densest over the gap and thinning away east. The line
   of sight is followed over the ground to where it crosses each line; the
   height it has there sets the colour, and the slant of the crossing how
   much of the sheet it passes through, so a fold seen edge on gathers
   light and a slanting look smears the edge over the heights it spans */
vec2 auroraPath(float u, float k, float Z) {
  float f1 = (k < 0.5 ? 27.0 : 14.0) * (1.0 + 0.15 * sin(u * 0.0037 + TT * 0.008 + k * 3.0));
  float f2 = 4.5 * (0.8 + 0.4 * sin(u * 0.009 - TT * 0.013 + k * 1.7));
  float p1 = u * 0.045 + TT * 0.025 + k * 2.0;
  float p2 = u * 0.13 - TT * 0.05 + k * 5.0;
  return vec2(u + f1 * sin(p1) + f2 * sin(p2),
              Z + 42.0 * sin(u * 0.0095 + TT * 0.012 + k) + f1 * 0.8 * cos(p1) + f2 * cos(p2));
}

vec3 auroraAt(float u, float x, float xa, float h, float blur, float boost, float k) {
  float r1 = noise(vec2(u * 0.09 + TT * 0.05, k * 13.0));
  float r2 = noise(vec2(u * 0.33 - TT * 0.12, k * 5.0 + 2.0));
  float rays = 0.2 + 0.8 * r1 * r1 * r1 + 0.45 * r2 * r2;
  float kn = noise(vec2(x * 0.011 - TT * 0.03, k * 3.0 + 9.0));
  kn = 0.4 + 1.5 * kn * kn;
  float reach = k < 0.5 ? smoothstep(-0.62, -0.3, xa) * (1.0 - 0.93 * smoothstep(-0.1, 0.42, xa))
              : k < 1.5 ? smoothstep(-0.45, -0.25, xa) * (1.0 - smoothstep(-0.02, 0.28, xa))
              : smoothstep(-0.7, -0.4, xa) * (1.0 - smoothstep(0.05, 0.45, xa));
  float base = 98.0 + 6.0 * noise(vec2(x * 0.02 + TT * 0.015, k + 7.0));
  float y = h - base;
  float sg = sqrt(0.2 + blur * blur);
  float edge = smoothstep(-sg, sg, y);
  float yp = max(y, 0.0);
  // a fold seen edge on gathers light low down, where the sheet is
  // brightest, and less and less up through its rays
  float lift = 1.0 + (boost - 1.0) * exp(-yp / 45.0);
  float body = edge * (0.7 * exp(-yp / 22.0) + 0.3 * exp(-yp / 85.0)) * lift;
  float hem = edge * exp(-yp / (2.2 + sg)) * lift;
  float fringe = exp(-sq((y + 0.9 * sg) / (0.55 * sg))) * smoothstep(0.7, 1.6, kn);
  float top = smoothstep(150.0, 240.0, h) * exp(-max(h - 240.0, 0.0) / 90.0);
  return reach * (rays * kn * (vec3(0.1, 1.0, 0.36) * body * 0.55 + vec3(0.55, 1.0, 0.7) * hem * 1.7)
                + vec3(1.0, 0.16, 0.6) * fringe * 0.45 + vec3(0.6, 0.08, 0.42) * top * 0.3 * rays);
}

vec3 aurora(vec3 rd) {
  vec3 acc = vec3(0.0);
  float mu = max(rd.y, 0.0), hl = max(length(rd.xz), 1e-3);
  vec2 hd = rd.xz / hl;
  float te = mu / hl;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float Z = k == 0 ? mix(205.0, 400.0, FRAMEK) : k == 1 ? mix(135.0, 255.0, FRAMEK) : mix(640.0, 800.0, FRAMEK);
    float gain = k == 0 ? 1.0 : k == 1 ? 0.45 : 0.4;
    int n = int(float(k == 0 ? 44 : k == 1 ? 26 : 18) * AQ);
    float u0 = Z * hd.x / max(hd.y, 0.3) - 150.0, du = 300.0 / float(n);
    vec2 P0 = auroraPath(u0, fk, Z);
    float f0 = hd.x * P0.y - hd.y * P0.x;
    // each crossing waits for the next, so it can fade by how far the line
    // swings across the sight line between it and its neighbours: a pair
    // born where the sight line grazes a fold comes in gently as the fold
    // deepens, as soft as a ray, never as a seam
    vec3 pend = vec3(0.0);
    float pdep = 1e4, gmax = 1e4;
    for (int i = 1; i <= 44; i++) {
      if (i > n) break;
      float u = u0 + du * float(i);
      vec2 P1 = auroraPath(u, fk, Z);
      float f1 = hd.x * P1.y - hd.y * P1.x;
      if (f0 * f1 <= 0.0 && f0 != f1) {
        float a = f0 / (f0 - f1);
        vec2 P = mix(P0, P1, a);
        float r = dot(P, hd);
        if (r > 0.0) {
          float sn = abs(f1 - f0) / max(length(P1 - P0), 1e-3);
          float uc = u - du + du * a;
          float h = r * te + r * r / 12742.0;
          float win = smoothstep(0.0, 25.0, uc - u0) * smoothstep(0.0, 25.0, u0 + 300.0 - uc);
          vec3 e = auroraAt(uc, P.x, P.x / Z, h, 1.5 * te / max(sn, 0.2), 1.0 / max(sn, 0.45), fk) * gain * win / hl;
          acc += pend * smoothstep(0.0, 7.0, min(pdep, gmax));
          pend = e;
          pdep = gmax;
          gmax = 0.0;
        }
      }
      gmax = max(gmax, abs(f1));
      P0 = P1;
      f0 = f1;
    }
    acc += pend * smoothstep(0.0, 7.0, pdep);
  }
  // a faint glow low in the north, the oval beyond the horizon
  acc += vec3(0.05, 0.32, 0.14) * exp(-mu * 9.0) * smoothstep(0.2, 0.9, hd.y) * smoothstep(0.5, -0.2, hd.x / max(hd.y, 0.3)) * 0.5;
  vec3 T = exp(-(BR * 8000.0 * airmass(mu, 35.0) + MIE * 1332.0 * airmass(mu, 91.0)));
  return acc * T * 0.32;
}

/* the whole sky in a direction: the air, the cirrus, the sun, and by
   night the stars, the moon and the aurora */
vec3 sky(vec3 rd) {
  vec3 c = skyRad(rd);
  vec4 cl = cirrus(rd);
  c = c * (1.0 - cl.a) + cl.rgb;
  float sd = dot(rd, KEY);
  c += keyLight(KEY.y, 1.0) * smoothstep(0.999986, 0.999992, sd) * 40000.0 * (1.0 - uLook.z) * (1.0 - cl.a);
  if (uLook.z > 0.001) {
    float mu = max(rd.y, 0.0);
    vec3 T = exp(-(BR * 8000.0 * airmass(mu, 35.0)));
    vec3 n = stars(rd) * T * (1.0 - cl.a * 0.8) + moonDisc(rd) * T;
    n += aurora(rd) * (1.0 - cl.a * 0.5);
    c += n * uLook.z;
  }
  return c;
}

/* ------------------------------------------------------------ the water */

/* the slope of the water at p: wavelets, the finer ones let go as they
   fall under a pixel, stronger near the eye and in the wind's patches */
vec2 ripples(vec2 p, float t, out float gust) {
  gust = smoothstep(0.6, 0.82, noise(p * vec2(0.0011, 0.003) + vec2(TT * 0.0035, 0.0)));
  float fp = (t * t + t) * PXA;
  float amp = mix(1.0, 0.15, smoothstep(4.0, 120.0, t)) * (1.0 + 2.5 * gust) * look3(1.0, 0.6, 0.8);
  vec2 g = vec2(0.0);
  float f = 0.75, a = 0.012;
  vec2 q = p;
  for (int i = 0; i < 6; i++) {
    float fade = sat(1.0 - fp * f * 2.0);
    if (fade <= 0.0) break;
    vec3 nd = noised(q * f * vec2(1.0, 1.8) + vec2(0.11, 0.37) * TT * (1.0 + 0.35 * float(i)) + float(i) * 7.1);
    g += nd.yz * vec2(1.0, 1.8) * f * a * fade;
    q = ROT2 * q;
    f *= 2.03;
    a *= 0.42;
  }
  // a long, slow swell under them
  vec3 sw = noised(p * vec2(0.05, 0.11) + vec2(0.0, TT * 0.05));
  g += sw.yz * vec2(0.05, 0.11) * 0.05;
  return g * amp;
}

vec3 waterBody() {
  return (SKYZ * 0.6 + SKYH * 0.4) * vec3(0.10, 0.22, 0.20) * 0.5 + KEYG * max(KEY.y, 0.0) * vec3(0.004, 0.012, 0.011);
}

/* ------------------------------------------------------------ the mist */

vec3 mist(vec3 col, vec3 ro, vec3 rd, float d) {
  float amt = look3(0.12, 1.0, 0.8);
  float dd = min(d, 16000.0);
  float tau = 0.0, s0 = 0.0;
  for (int i = 0; i < 6; i++) {
    float s1 = dd * sq(float(i + 1) / 6.0);
    vec3 q = ro + rd * (0.5 * (s0 + s1));
    float rho = exp(-max(q.y, 0.0) / 34.0);
    float w = noise(q.xz * vec2(0.0035, 0.009) + vec2(TT * 0.012, TT * 0.004));
    rho *= 0.15 + 1.2 * smoothstep(0.35, 0.8, w);
    tau += rho * (s1 - s0);
    s0 = s1;
  }
  tau *= 0.00013 * amt;
  vec3 mc = (SKYZ * 0.6 + SKYH * 0.4) * PI * 0.22 + KEYG * AIRLIT * 0.015 + GLOWA * 0.25;
  float T = exp(-tau);
  return col * T + mc * (1.0 - T);
}

/* ------------------------------------------------------------ the frame */

vec3 scene(vec2 fc) {
  TT = mod(uTime, 1800.0);
  AQ = 1.0;
  /* the frame holds its width on wide screens, to 1.9:1, and beyond that
     its height; on tall ones it widens a little, and the eye drifts back
     up the reach and over toward the left wall, so that one wall towers
     over the phone while the gap stays above the words. The moon and the
     aurora stand a little higher there, where the words stand higher */
  float asp = uRes.x / uRes.y;
  float fk = smoothstep(0.6, 1.5, asp);
  FRAMEK = fk;
  float tv = asp >= 1.0 ? 0.64 / min(asp, 1.9) : 0.64 + 0.12 * (1.0 - asp);
  MOOND = normalize(mix(dirAE(-9.0, 36.0), dirAE(-15.0, 19.0), fk));
  KEY = normalize(dirAE(-110.0, 36.0) * uLook.x + dirAE(-124.0, 1.7) * uLook.y + MOOND * uLook.z);
  E0 = look3(vec3(9.0), vec3(24.0), vec3(0.5, 0.75, 1.5) * 0.5);
  MIE = look3(3.5e-6, 8e-6, 5e-6);
  AIRLIT = look3(1.0, 0.25, 0.8);
  KEYG = keyLight(KEY.y, 1.0);
  MSL = keyLight(max(KEY.y, 0.0) + 0.2, 0.35) * look3(0.7, 0.4, 0.85);
  KEYC = keyLight(KEY.y, 0.5);
  SKYZ = skyRad(vec3(0.0, 1.0, 0.0));
  SKYH = skyRad(normalize(vec3(-KEY.x, 0.18, -KEY.z)));
  GLOWA = vec3(0.004, 0.022, 0.012) * uLook.z;

  vec2 uv = (2.0 * fc - uRes) / uRes.y;
  float hz = mix(-0.30, -0.26, fk);
  vec3 rd = normalize(vec3(uv.x * tv, (uv.y - hz) * tv, 1.0));
  rd.yz = rot(-uPoint.y * 0.007) * rd.yz;
  rd.xz = rot(uPoint.x * 0.012) * rd.xz;
  PXA = 2.0 * tv / uRes.y;
  vec3 ro = vec3(mix(-260.0, 30.0, fk), 1.0 + 0.035 * sin(TT * 0.8), mix(-900.0, 0.0, fk));

  vec3 col;
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  float t = march(ro, rd, min(tw, 60000.0), 170, 3);
  if (t > 0.0) {
    vec3 p = ro + rd * t;
    int det = detAt(t);
    vec3 ng = landNormal(p, t, det);
    vec3 n = rockBump(p, ng, t);
    col = shadeLand(p, n, ng, t, 8);
    col = air(col, ro, rd, t);
    col = mist(col, ro, rd, t);
  } else if (rd.y < 0.0) {
    vec3 p = ro + rd * tw;
    float gust;
    vec2 g = ripples(p.xz, tw, gust);
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 r = reflect(rd, n);
    r.y = max(r.y, 0.0015) + gust * 0.03 * smoothstep(40.0, 400.0, tw);
    r = normalize(r);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    float t2 = march(p + vec3(0.0, 0.05, 0.0), r, 60000.0, 96, 2);
    vec3 rc;
    if (t2 > 0.0) {
      vec3 q = p + r * t2;
      vec3 qn = landNormal(q, t2 + tw, min(detAt(t2 + tw), 2));
      rc = shadeLand(q, qn, qn, t2 + tw, 8);
      rc = air(rc, p, r, t2);
      rc = mist(rc, p, r, t2);
    } else {
      AQ = 0.5;
      rc = mist(sky(r), p, r, 20000.0);
    }
    col = rc * F + waterBody() * (1.0 - F);
    col = air(col, ro, rd, tw);
    col = mist(col, ro, rd, tw);
  } else {
    col = sky(rd);
    if (EDGEC > 0.0) {
      float te = EDGET;
      vec3 p = ro + rd * te;
      int det = detAt(te);
      p.y = groundAt(p.xz, det);
      vec3 en = landNormal(p, te, det);
      vec3 ce = shadeLand(p, en, en, te, 8);
      ce = air(ce, ro, rd, te);
      col = mix(col, ce, EDGEC);
    }
    col = mist(col, ro, rd, 20000.0);
  }
  // spray hanging at the foot of the fall
  vec3 B = vec3(732.0, 18.0, 1756.0);
  float tb = dot(B - ro, rd);
  if (tb > 0.0 && tb < (t > 0.0 ? t : tw) + 60.0) {
    vec3 c = (ro + rd * tb - B) / vec3(60.0, 32.0, 60.0);
    float sp = exp(-dot(c, c)) * look3(0.32, 0.22, 0.18);
    vec3 spc = (SKYZ * 0.5 + SKYH * 0.5) * PI * 0.3 + KEYG * max(KEY.y, 0.0) * 0.1 * look3(1.0, 0.1, 0.5);
    col = mix(col, spc, sp);
  }
  return col;
}
`
};
