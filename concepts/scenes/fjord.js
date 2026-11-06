/* concepts/scenes/fjord.js · the fjord

   The Nærøyfjord, afloat a couple of metres above the water about a
   kilometre and a half south of Bakka, looking north down the fjord. It is
   the narrowest fjord in Norway, under five hundred metres across here,
   and its walls go up to twelve and fourteen hundred metres within a
   kilometre or two of the water: a glacial trough, steep all the way and
   rounding over at the top into the uplands. The land is one heightfield
   laid over the fjord's plan, three reaches bending gently east toward the
   mouth, with spurs pushed out in turn from either side so that they
   stand behind one another down the fjord, each paler and bluer in the
   haze than the one before. Every wall is the same section, a short apron
   at the water, the steep wall and the rounded shoulder of the uplands,
   cut by avalanche gullies that run straight down it and leave pale
   scree fans at the waterline.

   The walls are not bare rock: birch and pine cloak them up to six or
   eight hundred metres, dark green velvet at a distance and single crowns
   only near the water, broken by the gullies, where grass and scrub and
   scree take over, and by the steepest steps, where the grey gneiss shows
   through in bands. Above the trees the rock comes out, heath on the
   ledges, and snow lies on the high ground and in the tops of the gullies
   into summer. Thin falls thread down the walls, white where they leave
   the rock and lost where they run under the trees. Bakka sits on its fan
   on the west shore, a handful of houses and the small white church with
   its spire at the water's edge, and Styvi's farm on a green fan across
   the fjord further on. Low cloud hangs along the walls.

   The air is one model for sky and distance alike, sunlight scattered
   once by Rayleigh and Mie over an exponential atmosphere and a bluer
   veil of light scattered more than once, with the fjord's own haze
   thicker over the water; fair-weather cumulus drift over it. The water
   is dark green glacial water that mirrors all of it by the Fresnel of
   water, broken by slow, faint ripples. By day the sun stands high in the
   south-west, behind the left wall, and lights the east wall; at dusk it
   is low in the north-west, the valley floor lies in blue shade and only
   the high ground keeps the warm light; at night the moon lights the
   walls faintly and the aurora folds over the north, curtains brightest
   and sharpest at their lower edge and fading upward through tall rays,
   once in the sky and once in the water. A phone looks from nearer the
   west wall, so that it towers over the words. WebGL2, no libraries, no
   build step. */

window.CONCEPT = {
  id: 'fjord',
  theme: { day: '#5f8cc0', dusk: '#7a7fa6', night: '#1c2f3a' },
  t0: 40,
  frag: `
/* ------------------------------------------------------------ state */
/* metres; x east (right), y up, z north (down the fjord). Set once a pixel. */

float TT;          // the clock, wrapped
int ZERO;          // nought, which the compiler cannot know, so loops stay loops
float PXA;         // the angle of one pixel, radians
vec3 KEY;          // toward the light: the sun by day and dusk, the moon by night
vec3 E0;           // that light above the air
vec3 KEYG;         // that light at the water, after the air
vec3 KEYC;         // that light at cloud height
vec3 MOOND;        // the moon
vec3 SKYZ, SKYH;   // the sky overhead and low down, for the light it sheds
vec3 GLOWA;        // the light the aurora sheds
float MIE;         // the sky's haze
float HAZE;        // the fjord's own haze, thicker, near the water
float AIRLIT;      // how much of the fjord's air the key light reaches
float FRAMEK;      // 0 on a tall frame, 1 on a wide one
float AQ;          // the aurora's care: full in the sky, half in the water
float KEYS;        // how far the key light has passed from the sun to the moon
float TWI;         // twilight, where the sun hands the sky over to the moon
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
  return sun * (tR * phaseR(c) + tM * phaseM(c, 0.76)) * (1.0 - exp(-tau)) / max(tau, vec3(1e-6));
}
vec3 skyMS(float mu) {
  return MSL * BR * 8000.0 * 0.0796 * (1.0 + look3(1.6, 0.3, 1.6) * sq(1.0 - mu));
}

/* the sky when neither sun nor moon lights it, while one hands over to the
   other: dim, violet low down and deep blue overhead */
vec3 twilight(float mu) {
  return TWI * mix(vec3(0.06, 0.05, 0.085), vec3(0.016, 0.024, 0.06), sqrt(mu));
}

vec3 skyRad(vec3 rd) {
  float mu = max(rd.y, 0.0);
  vec3 tR = BR * 8000.0 * airmass(mu, 35.0);
  float tM = MIE * 1200.0 * airmass(mu, 91.0);
  return scatter1(tR, tM, dot(rd, KEY), keyLight(KEY.y, mix(1.0, 0.06, pow(mu, 0.25)))) + skyMS(mu) + twilight(mu);
}

float densInt(float y0, float mu, float d, float H) {
  float a = exp(-max(y0, 0.0) / H), k = mu * d / H;
  return abs(k) < 1e-3 ? a * d * (1.0 - 0.5 * k) : a * H * (1.0 - exp(-k)) / mu;
}

/* the air between the eye and something d away: the open air, and the
   fjord's own haze, which lies thickest low over the water, so each spur
   down the fjord stands paler and bluer than the one before. In the
   walls' shadow the haze takes only the sky's light */
void air(vec3 ro, vec3 rd, float d, out vec3 T, out vec3 S) {
  vec3 tR = BR * densInt(ro.y, rd.y, d, 8000.0);
  float tM = MIE * densInt(ro.y, rd.y, d, 1200.0) + HAZE * densInt(ro.y, rd.y, d, 700.0);
  T = exp(-(tR + tM * 1.11));
  vec3 veil = (skyMS(0.0) * 0.35 + (SKYH * 0.6 + SKYZ * 0.4) * look3(0.4, 0.45, 0.5)) * vec3(1.0, 0.97, 0.85) + twilight(0.0);
  S = scatter1(tR, tM, dot(rd, KEY), KEYG * AIRLIT) + veil * (1.0 - T);
}

/* ------------------------------------------------------------ the land */

float smin(float a, float b, float k) {
  float h = sat(0.5 + 0.5 * (b - a) / k);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/* the nearest point of one reach of the fjord's centre line: its distance,
   how far along the fjord, and which side, -1 west, +1 east */
vec2 PLT;   // the direction of the nearest reach, at the last plan()
float SPUR; // how far the shore stands out there, at the last plan()
void reach(vec2 p, vec2 a, vec2 b, float u0, inout vec3 best) {
  vec2 ba = b - a, pa = p - a;
  float L = length(ba);
  vec2 tg = ba / L;
  float h = clamp(dot(pa, tg), 0.0, L);
  float d = length(pa - tg * h);
  if (d < best.x) { best = vec3(d, u0 + h, tg.y * pa.x - tg.x * pa.y >= 0.0 ? 1.0 : -1.0); PLT = tg; }
}

/* the fjord's plan at p: x the distance from the shore, positive on land;
   y how far along the fjord; z the side. Three reaches, bending east
   toward the mouth; spurs push the shore out in turn from either side */
vec3 plan(vec2 p) {
  vec3 b = vec3(1e9, 0.0, 1.0);
  reach(p, vec2(0.0, -9000.0), vec2(0.0, 2600.0), -9000.0, b);
  reach(p, vec2(0.0, 2600.0), vec2(760.0, 8600.0), 2600.0, b);
  reach(p, vec2(760.0, 8600.0), vec2(4600.0, 11400.0), 8648.0, b);
  float u = b.y, sd = b.z;
  SPUR = sd < 0.0
    ? 150.0 * exp(-sq((u - 2350.0) / 330.0)) + 270.0 * exp(-sq((u - 4900.0) / 480.0)) + 260.0 * exp(-sq((u - 7600.0) / 560.0))
      - 120.0 * exp(-sq((u - 3600.0) / 500.0)) - 120.0 * exp(-sq((u - 6300.0) / 500.0))
    : 70.0 * exp(-sq((u - 600.0) / 300.0)) + 240.0 * exp(-sq((u - 3650.0) / 430.0)) + 290.0 * exp(-sq((u - 6300.0) / 560.0))
      - 110.0 * exp(-sq((u - 2000.0) / 450.0)) - 130.0 * exp(-sq((u - 5000.0) / 520.0));
  float s = b.x - 240.0 + SPUR + 80.0 * noise(vec2(u * 0.0017, sd * 5.0 + 3.0)) - 40.0;
  return vec3(s, u, sd);
}

/* the height of the rim above each stretch of wall */
float rimH(vec2 p, float u, int det) {
  float T = 1010.0 - 0.35 * SPUR + 330.0 * noise(p * 0.00042 + vec2(5.2, 1.4)) + (det > 0 ? 150.0 * noise(p * 0.0013 + 2.0) : 75.0);
  return T - 240.0 * smoothstep(7000.0, 10500.0, u);
}

/* the section, steepening as it climbs: a short apron at the water, the
   wooded wall at forty-odd degrees, a band of cliff at sixty-five or
   seventy, and the shoulder rounding over at the top. cb moves the height
   from the wooded wall into the cliff */
float wallProfile(float s, float T, float cb) {
  float c0 = 560.0 - 80.0 * cb;
  float a = sat(s / 150.0);
  return T * (0.07 * a * (2.0 - a) + (0.40 - 0.12 * cb) * smoothstep(60.0, c0 + 40.0, s)
            + (0.40 + 0.12 * cb) * smoothstep(c0 - 120.0, c0 + 230.0, s) + 0.13 * smoothstep(c0 + 100.0, c0 + 620.0, s));
}
float cliffBand(float u, float sd) { return noise(vec2(u * 0.0011 + 3.0, sd * 2.0 + 1.0)); }

/* the gullies: channels straight down the wall wherever a slow noise
   along the shore crosses its middle, wandering a little as they go;
   x the channel, y the wider fan it spreads at its foot */
vec2 gullies(float u, float s, float sd) {
  float w = u * 0.0046 + 1.4 * noise(vec2(s * 0.0026, u * 0.0012 + sd * 3.0)) + sd * 17.0;
  float v = noise(vec2(w, sd * 9.0 + 0.5)) - 0.5;
  float g = sat(1.0 - abs(v) / 0.11);
  float f = sat(1.0 - abs(v) / 0.24);
  return vec2(g * g, f * f);
}


/* the falls, each its own channel down one wall: u along the fjord, side,
   and its path wandering as it comes down */
float fallOff(float u, float s, float sd) {
  float a = sd > 0.0 ? u - 2050.0 - 14.0 * sin(s * 0.007) - 6.0 * sin(s * 0.023 + 1.0) : 1e4;
  float b = sd < 0.0 && s > 380.0 ? u - 4300.0 - 18.0 * sin(s * 0.006 + 2.0) : 1e4;
  return min(abs(a), abs(b));
}

/* the alluvial fans the farms stand on: Bakka on the west shore, Styvi on
   the east, each a low cone spread out into the water */
const vec3 BAKKA = vec3(-352.0, 1450.0, 190.0);   // apex x, z, radius
const vec3 STYVI = vec3(380.0, 2950.0, 165.0);
float FANK;   // how near a fan, at the last fanH()
float fanH(vec2 p) {
  float a = length((p - BAKKA.xy) * vec2(1.0, 0.8)) / BAKKA.z;
  float b = length((p - STYVI.xy) * vec2(1.0, 0.85)) / STYVI.z;
  FANK = sat(1.25 - min(a, b));
  if (FANK <= 0.0) return -100.0;
  float h1 = 28.0 * (1.0 - pow(a, 0.8)) - 1.0;
  float h2 = 24.0 * (1.0 - pow(b, 0.8)) - 1.0;
  return max(h1, h2);
}

float GSH;   // the gully at the last ground(), for the shading

float ground(vec2 p, vec3 pl, int det) {
  float s = pl.x, u = pl.y, sd = pl.z;
  // behind a farm's fan the wall stands back, at the mouth of the side
  // valley that built it, and the shore is the fan's own
  float hf = fanH(p);
  float kf = FANK * FANK;
  s -= 130.0 * kf;
  vec2 g = gullies(u, s, sd) * (1.0 - kf);
  GSH = g.x;
  // the big gullies, deepening as they climb, and the fans at their feet
  s -= g.x * 70.0 * smoothstep(20.0, 380.0, s) * (1.0 - 0.4 * smoothstep(900.0, 1500.0, s));
  s += g.y * 46.0 * (1.0 - smoothstep(-40.0, 170.0, s));
  s -= 26.0 * exp(-sq(fallOff(u, s, sd) / 22.0)) * smoothstep(20.0, 300.0, s);
  float T = rimH(p, u, det);
  float cb = cliffBand(u, sd);
  // the face's own detail is laid over the face, along the shore and up
  // it, so that nothing is drawn out down the steep walls: buttresses and
  // bays, ridged, wandering as they climb; crags; and where the face is
  // steep, the rock climbing in steps
  float h0 = wallProfile(s, T, cb);
  vec2 f = vec2(u + sd * 300.0, h0 * 1.1);
  float bn = noise(f * vec2(0.0045, 0.0011) + vec2(sd * 4.0, 0.0));
  float bt = mix(bn, 1.0 - abs(2.0 * bn - 1.0), 0.6);
  s += (90.0 * bt - 50.0) * (1.0 - kf);
  if (det > 0) {
    float cn = noise(f * vec2(0.012, 0.006) + 1.3);
    s += 30.0 * mix(cn, 1.0 - abs(2.0 * cn - 1.0), 0.4) - 15.0;
  }
  if (det > 1) s += 14.0 * noise(f * 0.03 + 4.1) - 7.0;
  if (det > 2) s += 5.0 * noise(f * 0.09 + 2.7) - 2.5;
  float band = smoothstep(250.0, 500.0, h0) * (1.0 - smoothstep(1000.0, 1200.0, h0));
  if (det > 1) {
    float k = h0 / 46.0 + 2.5 * noise(f * vec2(0.004, 0.008));
    s += band * 9.0 * smoothstep(0.35, 0.7, noise(f * 0.008 + 6.0)) * (smoothstep(0.3, 0.7, fract(k)) - fract(k));
  }
  float h = wallProfile(s, T, cb);
  // the uplands behind the rim, rounded humps and knolls
  float up = smoothstep(450.0, 1500.0, s);
  if (up > 0.0) {
    float r = 0.0, a = 0.5;
    vec2 q = p * 0.0006;
    for (int i = 0; i < 4; i++) {
      if (i > det) break;
      float n = 1.0 - abs(2.0 * noise(q) - 1.0);
      r += a * n * n;
      q = ROT2 * q * 2.1 + 3.3;
      a *= 0.5;
    }
    h += up * 420.0 * r;
  }
  h -= sat(-s / 50.0) * 160.0;
  return max(h, hf);
}

float groundAt(vec2 p, int det) { return ground(p, plan(p), det); }

int detAt(float t) { return t < 1600.0 ? 3 : t < 5000.0 ? 2 : t < 22000.0 ? 1 : 0; }

/* march the land; over the water the shore's distance, and the height the
   walls cannot reach that close to it, carry the ray in long strides; the
   height above the ground over the land; a crossing is narrowed by halves.
   A ray that misses keeps where it passed nearest the land, in pixels, so
   a skyline can be drawn soft */
float EDGEC, EDGET;
float march(vec3 ro, vec3 rd, float tmax, int steps, int dmax, float grow) {
  float t = 1.0, tp = 0.0, ec = 1e9, a = 0.0, b = 0.0, dyl = 1e9;
  int bis = 0;
  EDGEC = 0.0;
  float hl = length(rd.xz);
  vec2 hd = rd.xz / max(hl, 1e-5);
  for (int i = ZERO; i < 190; i++) {
    if (bis == 0 && i >= steps) break;
    float tt = bis > 0 ? 0.5 * (a + b) : t;
    vec3 p = ro + rd * tt;
    if (bis == 0 && (t > tmax || (p.y > 2100.0 && rd.y > 0.0))) { dyl = 1e9; break; }
    vec3 pl = plan(p.xz);
    float dy = p.y - ground(p.xz, pl, min(detAt(tt), dmax));
    if (bis > 0) {
      if (dy < 0.0) b = tt; else a = tt;
      bis++;
      if (bis > 6) return 0.5 * (a + b);
      continue;
    }
    if (dy < 0.0) { bis = 1; a = tp; b = t; continue; }
    dyl = dy;
    float px = dy / (t * PXA);
    if (pl.x > -60.0 && px < ec) { ec = px; EDGET = t; }
    tp = t;
    // over the water: the walls rise no faster than this, so a point this
    // high and this far out is that far from them; and a ray running down
    // the fjord closes on its shores only as fast as it crosses the reach,
    // or the shore bends toward it
    float reachOut = -pl.x - 150.0 + 0.45 * max(p.y - 40.0, 0.0);
    float close = hl * (abs(hd.x * PLT.y - hd.y * PLT.x) + 0.36) + 0.45 * abs(rd.y);
    t += max(max((0.3 + 0.12 * smoothstep(1500.0, 8000.0, t)) * dy, reachOut * 0.9 / close), grow * t + 0.25);
  }
  EDGEC = sat(0.5 - ec);
  // a ray that ran out of steps low over the land is taken as a hit
  if (t < tmax && dyl < grow * 20.0 * t + 15.0) return t;
  return -1.0;
}

/* the light's way out from p, tested against the land in a few
   lengthening taps; the clearance over each sets a soft edge */
float shadow(vec3 p, int n) {
  float r = 1.0, d = 30.0;
  for (int i = ZERO; i < 10; i++) {
    if (i >= n) break;
    vec3 q = p + KEY * d;
    if (q.y > 2100.0) break;
    float h = groundAt(q.xz, 0);
    r = min(r, sat(0.5 + 24.0 * (q.y - h + 10.0) / d));
    d *= 2.1;
  }
  return r * r * (3.0 - 2.0 * r);
}

vec3 landNormal(vec3 p, float t, int det, out float h0) {
  float e = max(0.6, t * 0.0012);
  float h[3];
  for (int i = ZERO; i < 3; i++) h[i] = groundAt(p.xz + (i == 1 ? vec2(e, 0.0) : i == 2 ? vec2(0.0, e) : vec2(0.0)), det);
  h0 = h[0];
  return normalize(vec3(h[0] - h[1], e, h[0] - h[2]));
}

/* ------------------------------------------------------------ the land's skin */

/* the crowns of the trees, one to a cell of a jittered grid laid on the
   wall (q, in crowns), of many sizes and with gaps between; where crowns
   overlap the lower one stands in front, as trees do up a slope seen from
   below. Each is a dome lit on its side toward the light (l, in the same
   plane). Returns the light on it, about one on the mean, and which tree
   it is */
vec2 crowns(vec2 q, vec2 l) {
  vec2 i = floor(q), f = fract(q);
  float best = 1e9, k = 0.16, id = 0.5;
  vec3 L = normalize(vec3(l, 0.7));
  for (int j = -1; j <= 1; j++) {
    for (int c = -1; c <= 1; c++) {
      vec2 g = vec2(float(c), float(j));
      vec3 h = hash33(vec3(i + g, 3.7));
      if (h.z < 0.12) continue;
      vec2 o = g + h.xy - f;
      float r = 0.42 + 0.5 * fract(h.z * 7.13);
      vec2 e = o * vec2(1.0, 0.8) / r;
      float d = dot(e, e);
      float z = g.y + h.y - r;
      if (d < 1.0 && z < best) {
        best = z;
        vec3 nn = vec3(-e, sqrt(1.0 - d));
        float lit = max(dot(nn, L), 0.0);
        k = (0.22 + 1.0 * lit) * (0.75 + 0.5 * fract(h.z * 31.7)) * (0.7 + 0.3 * sqrt(1.0 - d));
        id = fract(h.z * 17.3 + h.x * 5.1);
      }
    }
  }
  return vec2(k * 1.45, id);
}

/* the land's colour and light at p: n shades it, ng (the land's own
   normal, without the skin's detail) decides what grows and lies there */
vec3 shadeLand(vec3 p, vec3 n, vec3 ng, float t, float sh, bool near) {
  float y = p.y;
  float fp = t * PXA;
  vec3 pl = plan(p.xz);
  vec2 tg = PLT;
  float s = pl.x, u = pl.y, sd = pl.z;
  vec2 gg = gullies(u, s, sd);
  float slope = ng.y;
  float m1 = noise(p.xz * 0.0045 + 3.0);
  float m2 = noise(p.xz * 0.017 + 7.0);
  float m3 = noise(p.xz * 0.05 + 1.0);

  // gneiss: grey, mottled, banded across the faces, warmer where lichen
  // takes it, black where water seeps over
  float k1 = noise3(p * 0.012) * 0.6 + noise3(p * 0.047 + 3.0) * 0.4;
  vec3 alb = vec3(0.085, 0.088, 0.087) * (0.55 + 0.8 * k1);
  alb *= 0.8 + 0.4 * noise(vec2(y * 0.028 + 2.5 * noise3(p * 0.003), sd * 4.0));
  alb = mix(alb, alb * vec3(1.06, 1.04, 0.94), noise3(p * 0.007 + 1.0));
  float ws = noise3(vec3(p.x * 0.03, y * 0.002, p.z * 0.03) + 11.0);
  alb = mix(alb, vec3(0.03, 0.031, 0.03), smoothstep(0.7, 0.85, ws) * (1.0 - slope) * 0.75);

  // ledges: grass and heath catch on every step of the rock
  float led = smoothstep(0.35, 0.6, noise(vec2(y * 0.045 + 3.0 * noise(p.xz * 0.004), u * 0.004 + sd)));
  float ledge = max(smoothstep(0.4, 0.58, slope), led * smoothstep(0.16, 0.3, slope));
  vec3 heath = mix(vec3(0.05, 0.068, 0.026), vec3(0.075, 0.072, 0.04), m2);
  alb = mix(alb, heath, ledge * smoothstep(1300.0, 1100.0, y));

  // the forest: birch and pine up to the tree line, on all but the
  // steepest steps, and not down the gullies, which avalanches keep open
  float tl = 720.0 + 260.0 * noise(p.xz * 0.0011) - 130.0;
  float steepOk = smoothstep(0.36, 0.48, slope + 0.14 * (m2 - 0.5) + 0.08 * (m3 - 0.5));
  float aval = smoothstep(0.3, 0.7, gg.x) * smoothstep(30.0, 160.0, y);
  float forest = steepOk * (1.0 - smoothstep(tl - 160.0, tl + 30.0, y + 120.0 * (m3 - 0.5))) * (1.0 - 0.9 * aval) * smoothstep(0.8, 2.5, y);
  // birch low down and along the gullies, pine and spruce on the ribs
  float bf = sat(0.25 + 0.5 * m1 + 0.35 * (1.0 - smoothstep(60.0, 420.0, y)) + 0.4 * gg.y - 0.25 * smoothstep(400.0, 700.0, y));
  vec3 pine = vec3(0.012, 0.024, 0.012), birch = vec3(0.032, 0.06, 0.014);
  vec3 trees = mix(pine, birch, bf);
  // single crowns near the water, a grain where they shrink to a pixel
  // or two, and beyond that the velvet they make
  float cw = 4.6;
  float ca = sat(1.6 - fp / (0.3 * cw));
  if (ca > 0.0) {
    vec2 q = vec2(u, y * 1.25) / cw;
    vec2 l = normalize(vec2(dot(KEY.xz, tg), KEY.y + 0.25));
    vec2 c = crowns(q, l);
    vec3 one = mix(pine, birch, step(1.0 - bf, c.y)) * (0.85 + 0.3 * fract(c.y * 17.0));
    trees = mix(trees, one * c.x, ca);
  }
  float grain = sat(1.0 - fp / (2.5 * cw)) * (1.0 - ca);
  trees *= 1.0 + grain * (noise(vec2(u, y * 1.25) / cw * 1.3) - 0.5) * 0.9;
  trees *= 0.85 + 0.3 * m2;
  // the gullies: grass and scrub, scree low down and snow high up
  vec3 grass = mix(vec3(0.055, 0.09, 0.025), vec3(0.08, 0.1, 0.04), m2);
  alb = mix(alb, grass, aval * smoothstep(0.3, 0.45, slope) * 0.8);
  alb = mix(alb, trees, forest);
  float scree = smoothstep(0.3, 0.8, gg.x) * (1.0 - smoothstep(10.0, 70.0 + 50.0 * m3, y)) * smoothstep(0.6, 0.8, noise(vec2(u * 0.006, sd)));
  alb = mix(alb, vec3(0.2, 0.198, 0.19) * (0.8 + 0.35 * noise(p.xz * 0.1)), scree * 0.8);

  // the farms' fans: mown grass, a few trees
  float fan = smoothstep(-2.5, -0.3, fanH(p.xz) - y) * smoothstep(0.8, 0.92, slope);
  alb = mix(alb, mix(vec3(0.09, 0.15, 0.035), vec3(0.11, 0.16, 0.05), m2), fan * 0.92);

  // snow on the high ground and in the tops of the gullies
  float sl = 1130.0 + 200.0 * noise(p.xz * 0.0024) - 100.0;
  // longest on the ground turned from the sun, north and east
  float shade = dot(normalize(ng.xz + vec2(1e-4, 0.0)), vec2(0.6, 0.8)) * (1.0 - slope);
  float sn = smoothstep(sl - 50.0, sl + 50.0, y + 260.0 * gg.x + 220.0 * shade) * smoothstep(0.42, 0.7, slope + 0.5 * gg.x)
           * smoothstep(0.5, 0.66, 0.55 * noise(p.xz * 0.006 + 4.0) + 0.3 * noise(p.xz * 0.025) + 0.15 * noise(vec2(u * 0.03, y * 0.02)) + 0.2 * gg.x);
  alb = mix(alb, vec3(0.86, 0.88, 0.9), sn);

  // the falls: white over the rock, lost under the trees
  float fo = fallOff(u, s, sd);
  float fw0 = 3.0 + 3.0 * (1.0 - slope);
  float fw = max(fw0, 2.2 * fp);
  float fl = smoothstep(fw, fw * 0.3, fo) * smoothstep(5.0, 30.0, y) * smoothstep(1060.0, 960.0, y);
  fl *= min(1.0, 1.3 * fw0 / fw) * (0.6 + 0.4 * noise(vec2(fo * 0.5, y * 0.05 + TT * 1.4)));
  fl *= smoothstep(0.35, 0.6, noise(vec2(y * 0.012, sd * 3.0 + 1.0)) + 0.4 * (1.0 - slope));
  fl *= 1.0 - 0.85 * forest * smoothstep(0.42, 0.6, slope);
  alb = mix(alb, vec3(0.78, 0.8, 0.82), sat(fl));

  // the shore: a band of bare, pale rock where the tide and the waves keep
  // the trees off
  float shore = 1.0 - smoothstep(0.6, 1.2 + 1.2 * m2, y);
  alb = mix(alb, mix(vec3(0.05, 0.05, 0.045), vec3(0.15, 0.145, 0.135), smoothstep(0.3, 0.9, y)) * (0.7 + 0.5 * noise(p.xz * 0.2)), shore);

  // light: the key with its shadow; the sky the fjord leaves open; the
  // light the sunlit walls throw back across the water onto the faces
  // turned from the sun; and the sky and walls again off the water, most
  // near the waterline. A canopy is lit more evenly than bare rock
  n = normalize(mix(n, ng, 0.75 * forest));
  float nl = dot(n, KEY);
  float wrap = forest * 0.25;
  float nlw = (nl + wrap) / (1.0 + wrap);
  vec3 E = KEYG * max(nlw, 0.0) * sh;
  // hollows see less of the sky than ribs: the height against its
  // neighbours' mean
  float ao = 1.0;
  if (t < 9000.0 && near) {
    float E2 = 34.0, lap = 0.0;
    for (int i = ZERO; i < 5; i++) {
      vec2 o = i == 0 ? vec2(0.0) : vec2(i == 1 ? E2 : i == 2 ? -E2 : 0.0, i == 3 ? E2 : i == 4 ? -E2 : 0.0);
      lap += groundAt(p.xz + o, 0) * (i == 0 ? -4.0 : 1.0);
    }
    ao = mix(1.0, clamp(1.0 - lap * 0.0055, 0.35, 1.25), smoothstep(9000.0, 5000.0, t));
  }
  float open = mix(0.28, 0.9, smoothstep(0.0, 1200.0, y)) * ao;
  E += mix(SKYH, SKYZ, 0.5 + 0.5 * n.y) * PI * (0.5 + 0.5 * n.y) * open * look3(1.0, 2.3, 1.8);
  vec2 kh = normalize(KEY.xz + vec2(1e-4, 0.0));
  float away = sat(0.35 - 0.65 * dot(n.xz, kh));
  float litw = look3(1.0, 0.12, 0.6);
  E += KEYG * vec3(0.045, 0.085, 0.03) * away * litw * (1.0 - 0.5 * n.y) * ao * (1.2 - open);
  float wfr = mix(0.3, 0.05, smoothstep(0.0, 400.0, y));
  E += (SKYH * 0.6 + SKYZ * 0.4 + KEYG * 0.02 * litw) * PI * 0.5 * wfr * (1.0 - 0.7 * n.y);
  E += GLOWA * (0.6 + 0.4 * n.y);
  return alb / PI * E;
}

/* a fractured face: a bump from noise on the three world planes, blended
   by the normal; strongest on bare rock, softer under the canopy */
vec3 rockBump(vec3 p, vec3 n, float t) {
  float fp = t * PXA;
  vec3 w = pow(abs(n), vec3(4.0));
  w /= w.x + w.y + w.z;
  vec3 g = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float f = i == 0 ? 0.06 : 0.21;
    float A = (i == 0 ? 1.1 : 0.45) * sat(1.0 - fp * f * 1.5);
    if (A <= 0.0) break;
    vec3 o = vec3(float(i) * 7.3);
    if (w.x > 0.05) { vec3 a = noised(p.zy * f + o.xy); g += w.x * vec3(0.0, a.z, a.y) * A * f; }
    if (w.z > 0.05) { vec3 a = noised(p.xy * f + o.yz); g += w.z * vec3(a.y, a.z, 0.0) * A * f; }
    if (w.y > 0.05) { vec3 a = noised(p.xz * f + o.xz); g += w.y * vec3(a.y, 0.0, a.z) * A * f; }
  }
  return normalize(n - g);
}

/* ------------------------------------------------------------ the buildings */

/* each a box with a gable roof, ridge along its length: centre x, z,
   heading, and kind (0 white house, 1 red barn or boathouse, 2 ochre
   house, 3 the church) */
const int NB = 13;
const vec4 HOUSES[13] = vec4[](
  // Bakka, on its fan on the west shore; the church at the water
  vec4(-226.0, 1452.0, -1.5, 3.0),
  vec4(-262.0, 1400.0, 0.20, 0.0),
  vec4(-276.0, 1488.0, 1.45, 1.0),
  vec4(-300.0, 1430.0, 0.10, 2.0),
  vec4(-232.0, 1376.0, 1.60, 1.0),
  vec4(-305.0, 1520.0, 0.35, 0.0),
  vec4(-250.0, 1530.0, 1.50, 1.0),
  vec4(-326.0, 1468.0, 1.40, 0.0),
  // Styvi, on its fan across the fjord
  vec4(286.0, 2930.0, -0.15, 0.0),
  vec4(318.0, 2985.0, 1.30, 1.0),
  vec4(262.0, 2975.0, 1.45, 1.0),
  vec4(335.0, 2915.0, 0.05, 2.0),
  vec4(300.0, 3030.0, 0.20, 0.0)
);

/* a ray against a convex body of planes (n, d), inside where n.x <= d */
void clip(vec3 ro, vec3 rd, vec3 n, float d, inout float tin, inout float tout, inout vec3 nin) {
  float dn = dot(n, rd), dist = d - dot(n, ro);
  if (abs(dn) < 1e-7) { if (dist < 0.0) tout = -1.0; return; }
  float t = dist / dn;
  if (dn < 0.0) { if (t > tin) { tin = t; nin = n; } }
  else tout = min(tout, t);
}

/* a box hx by hz by hw with a gable roof rising hr more, in its own frame */
float house(vec3 ro, vec3 rd, vec3 sz, float hr, inout vec3 nrm) {
  float tin = 0.0, tout = 1e9;
  vec3 nn = vec3(0.0);
  clip(ro, rd, vec3(1.0, 0.0, 0.0), sz.x, tin, tout, nn);
  clip(ro, rd, vec3(-1.0, 0.0, 0.0), sz.x, tin, tout, nn);
  clip(ro, rd, vec3(0.0, 0.0, 1.0), sz.z, tin, tout, nn);
  clip(ro, rd, vec3(0.0, 0.0, -1.0), sz.z, tin, tout, nn);
  clip(ro, rd, vec3(0.0, -1.0, 0.0), 0.0, tin, tout, nn);
  vec3 r1 = normalize(vec3(hr, sz.x, 0.0)), r2 = normalize(vec3(-hr, sz.x, 0.0));
  float dr = (sz.y + hr) * sz.x / length(vec2(hr, sz.x));
  clip(ro, rd, r1, dr, tin, tout, nn);
  clip(ro, rd, r2, dr, tin, tout, nn);
  if (tout < tin || tout < 0.0) return -1.0;
  nrm = nn;
  return tin;
}

/* a four-sided spire over a square of half side a, its tip h up */
float spire(vec3 ro, vec3 rd, float a, float h, inout vec3 nrm) {
  float tin = 0.0, tout = 1e9;
  vec3 nn = vec3(0.0);
  float l = length(vec2(h, a));
  clip(ro, rd, vec3(h, a, 0.0) / l, a * h / l, tin, tout, nn);
  clip(ro, rd, vec3(-h, a, 0.0) / l, a * h / l, tin, tout, nn);
  clip(ro, rd, vec3(0.0, a, h) / l, a * h / l, tin, tout, nn);
  clip(ro, rd, vec3(0.0, a, -h) / l, a * h / l, tin, tout, nn);
  clip(ro, rd, vec3(0.0, -1.0, 0.0), 0.0, tin, tout, nn);
  if (tout < tin || tout < 0.0) return -1.0;
  nrm = nn;
  return tin;
}

/* the nearest building along a ray, before tmax: its distance (or -1),
   normal and colour; the roof is dark slate, the walls by kind */
float buildings(vec3 ro, vec3 rd, float tmax, out vec3 bn, out vec3 ba) {
  float best = tmax;
  bn = vec3(0.0, 1.0, 0.0);
  ba = vec3(0.0);
  // only near the two fans
  vec3 c1 = vec3(-275.0, 15.0, 1450.0), c2 = vec3(300.0, 15.0, 2970.0);
  vec3 o1 = ro - c1, o2 = ro - c2;
  float b1 = dot(o1, rd), b2 = dot(o2, rd);
  bool near1 = b1 * b1 - dot(o1, o1) + 120.0 * 120.0 > 0.0;
  bool near2 = b2 * b2 - dot(o2, o2) + 110.0 * 110.0 > 0.0;
  if (!near1 && !near2) return -1.0;
  bool hit = false;
  for (int i = 0; i < NB; i++) {
    if (i < 8 ? !near1 : !near2) continue;
    vec4 H = HOUSES[i];
    float kind = H.w;
    float yb = fanH(H.xy) - 0.6;
    mat2 R = rot(H.z);
    vec3 lo = ro - vec3(H.x, yb, H.y);
    lo.xz = R * lo.xz;
    vec3 ld = rd;
    ld.xz = R * ld.xz;
    float hs = hash11(float(i) * 7.7 + 1.0);
    vec3 sz = kind > 2.5 ? vec3(4.6, 6.4, 8.5) : kind > 0.5 && kind < 1.5 ? vec3(3.6 + hs, 5.0, 5.0 + 2.0 * hs) : vec3(3.6 + hs, 5.6, 5.0 + 2.5 * hs);
    float hr = kind > 2.5 ? 4.4 : 3.0;
    vec3 nl;
    float th = house(lo, ld, sz, hr, nl);
    vec3 wall = kind > 2.5 ? vec3(0.78, 0.78, 0.76) : kind > 0.5 && kind < 1.5 ? vec3(0.33, 0.055, 0.04) : kind > 1.5 ? vec3(0.5, 0.38, 0.2) : vec3(0.72, 0.72, 0.7);
    vec3 roof = vec3(0.07, 0.072, 0.075);
    if (th > 0.0 && th < best) {
      best = th; hit = true;
      bn = nl; ba = nl.y > 0.2 ? roof : wall;
      bn.xz = bn.xz * R;
    }
    if (kind > 2.5) {
      // the church's tower at its west end, and the spire on it
      vec3 lt = lo - vec3(0.0, 0.0, -10.5);
      th = house(lt, ld, vec3(2.4, 13.0, 2.4), 0.01, nl);
      if (th > 0.0 && th < best) { best = th; hit = true; bn = nl; ba = wall; bn.xz = bn.xz * R; }
      th = spire(lt - vec3(0.0, 13.0, 0.0), ld, 2.6, 11.0, nl);
      if (th > 0.0 && th < best) { best = th; hit = true; bn = nl; ba = roof; bn.xz = bn.xz * R; }
    }
  }
  return hit ? best : -1.0;
}

vec3 shadeBuilding(vec3 p, vec3 n, vec3 alb, float sh) {
  float nl = dot(n, KEY);
  vec3 E = KEYG * max(nl, 0.0) * sh;
  E += mix(SKYH, SKYZ, 0.5 + 0.5 * n.y) * PI * (0.45 + 0.4 * n.y) * look3(0.8, 1.2, 1.2);
  E += KEYG * vec3(0.05, 0.075, 0.04) * look3(1.0, 0.15, 0.5) * (1.0 - 0.6 * max(n.y, 0.0));
  E += GLOWA * 0.8;
  return alb / PI * E;
}

/* ------------------------------------------------------------ the sky */

/* fair-weather cumulus, a broken deck over the rim, seen from beneath:
   crisp, billowed edges, grey where they are thick, bright on the edges
   toward the sun and silvered when it is behind them. Fewer and thinner
   low over the horizon, so the gap down the fjord keeps its blue */
float cloudD(vec2 q) {
  q += 0.3 * vec2(noise(q * 0.4 + 5.0), noise(q * 0.4 + 9.0));
  // where the clouds stand, and the billows on them
  float b = 0.65 * noise(q * 0.7) + 0.35 * noise(q * 1.5 + 2.3);
  float d = 0.5 * noise(q * 3.1 + 1.7) + 0.3 * noise(q * 6.3 + 3.1) + 0.2 * noise(q * 13.0 + 4.4);
  return b + (d - 0.5) * 0.38;
}
vec4 clouds(vec3 rd) {
  if (rd.y < 0.012) return vec4(0.0);
  float t0 = 2100.0 / (rd.y + 0.015);
  vec2 q = (rd.xz * t0 + vec2(TT * 4.0, TT * 1.5)) * 0.0006;
  float cov = look3(0.55, 0.6, 0.95) + 0.12 * (1.0 - smoothstep(0.08, 0.35, rd.y));
  float f = cloudD(q);
  float a = smoothstep(cov, cov + 0.05, f) * (0.75 + 0.25 * smoothstep(cov, cov + 0.12, f));
  if (a <= 0.0) return vec4(0.0);
  vec2 lk = normalize(KEY.xz + vec2(1e-4, 0.0));
  float f2 = cloudD(q + lk * 0.05);
  float thick = smoothstep(cov + 0.02, cov + 0.22, f);
  float lit = sat(0.4 + 4.0 * (f - f2)) * (0.6 + 0.8 * noise(q * 5.0 + 2.0));
  float c = dot(rd, KEY);
  vec3 sunc = KEYC * (0.05 + 0.42 * lit * (1.0 - 0.55 * thick) + 1.3 * phaseM(c, 0.6) * (1.0 - 0.8 * thick)) * look3(0.85, 0.32, 0.5);
  vec3 amb = (SKYZ * 0.7 + SKYH * 0.3) * PI * mix(0.42, 0.2, thick) * look3(1.0, 0.5, 1.0);
  float fade = smoothstep(0.015, 0.1, rd.y) * exp(-t0 * 0.00003);
  return vec4((sunc + amb) * a * fade, a * fade);
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
   across the sky, densest over the gap and thinning away east */
vec2 auroraPath(float u, float k, float Z) {
  float f1 = (k < 0.5 ? 27.0 : 14.0) * (1.0 + 0.15 * sin(u * 0.0037 + TT * 0.008 + k * 3.0));
  float f2 = 4.5 * (0.8 + 0.4 * sin(u * 0.009 - TT * 0.013 + k * 1.7));
  float p1 = u * 0.045 + TT * 0.025 + k * 2.0;
  float p2 = u * 0.13 - TT * 0.05 + k * 5.0;
  return vec2(u + f1 * sin(p1) + f2 * sin(p2),
              Z + 42.0 * sin(u * 0.0095 + TT * 0.012 + k) + f1 * 0.8 * cos(p1) + f2 * cos(p2));
}

/* the light of a curtain at height h, split in two: low, the hem and the
   foot of the rays, which a fold seen edge on gathers in full; and high,
   the rays above, which it may brighten only a little */
void auroraAt(float u, float x, float xa, float h, float k, out vec3 low, out vec3 high) {
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
  float edge = smoothstep(-0.5, 0.5, y);
  float yp = max(y, 0.0);
  float hem = edge * exp(-yp / 2.6);
  float body = edge * (0.7 * exp(-yp / 22.0) + 0.3 * exp(-yp / 85.0));
  float fringe = exp(-sq((y + 0.5) / 0.35)) * smoothstep(0.7, 1.6, kn);
  float top = smoothstep(150.0, 240.0, h) * exp(-max(h - 240.0, 0.0) / 90.0);
  vec3 c = rays * kn * (vec3(0.1, 1.0, 0.36) * body * 0.55 + vec3(0.55, 1.0, 0.7) * hem * 1.7) + vec3(1.0, 0.16, 0.6) * fringe * 0.45;
  float lw = exp(-yp / 45.0);
  low = reach * c * lw;
  high = reach * (c * (1.0 - lw) + vec3(0.6, 0.08, 0.42) * top * 0.3 * rays);
}

/* each curtain's line is walked in short steps, and every point of it near
   the line of sight adds its light through the sheet's thickness: a sight
   line crossing the sheet square on gathers it once, one running along a
   fold gathers it many times, and nothing changes abruptly between */
vec3 aurora(vec3 rd) {
  vec3 acc = vec3(0.0);
  float mu = max(rd.y, 0.0), hl = max(length(rd.xz), 1e-3);
  vec2 hd = rd.xz / hl;
  float te = mu / hl;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float Z = k == 0 ? mix(205.0, 400.0, FRAMEK) : k == 1 ? mix(135.0, 255.0, FRAMEK) : mix(640.0, 800.0, FRAMEK);
    float gain = k == 0 ? 1.0 : k == 1 ? 0.45 : 0.4;
    float sg = (k == 2 ? 6.0 : 4.0) / AQ;
    float span = k == 1 ? 100.0 : 120.0;
    int n = int(float(k == 0 ? 120 : k == 1 ? 80 : 60) * AQ);
    float du = 2.0 * span / float(n);
    float u0 = Z * hd.x / max(hd.y, 0.3) - span;
    vec2 Pp = auroraPath(u0, fk, Z);
    vec3 L = vec3(0.0), U = vec3(0.0);
    float W = 0.0;
    for (int i = 1; i <= 120; i++) {
      if (i > n) break;
      float u = u0 + du * float(i);
      vec2 P = auroraPath(u, fk, Z);
      float f = hd.x * P.y - hd.y * P.x;
      float r = dot(P, hd);
      if (abs(f) < 2.5 * sg && r > 0.0) {
        float kern = exp(-sq(f / sg)) * length(P - Pp) / (sg * 1.7725)
                   * smoothstep(0.0, 25.0, u - u0) * smoothstep(0.0, 25.0, u0 + 2.0 * span - u);
        vec3 lo, hi;
        auroraAt(u, P.x, P.x / Z, r * te + r * r / 12742.0, fk, lo, hi);
        L += lo * kern;
        U += hi * kern;
        W += kern;
      }
      Pp = P;
    }
    acc += gain * (L + U * min(W, 1.3) / max(W, 1e-3)) / hl;
  }
  // a faint glow low in the north, the oval beyond the horizon
  acc += vec3(0.05, 0.32, 0.14) * exp(-mu * 9.0) * smoothstep(0.2, 0.9, hd.y) * smoothstep(0.5, -0.2, hd.x / max(hd.y, 0.3)) * 0.5;
  vec3 T = exp(-(BR * 8000.0 * airmass(mu, 35.0) + MIE * 1332.0 * airmass(mu, 91.0)));
  return acc * T * 0.4;
}

/* the whole sky in a direction: the air, the clouds, the sun, and by
   night the stars, the moon and the aurora */
float JIT;
vec3 sky(vec3 rd) {
  vec3 c = skyRad(rd);
  vec4 cl = clouds(rd);
  float sd = dot(rd, KEY);
  c += keyLight(KEY.y, 1.0) * smoothstep(0.999986, 0.999992, sd) * 40000.0 * (1.0 - KEYS);
  if (uLook.z > 0.001) {
    float mu = max(rd.y, 0.0);
    vec3 T = exp(-(BR * 8000.0 * airmass(mu, 35.0)));
    vec3 n = stars(rd) * T + moonDisc(rd) * T + aurora(rd);
    c += n * uLook.z;
  }
  return c * (1.0 - cl.a) + cl.rgb;
}

/* ------------------------------------------------------------ the water */

/* the slope of the water at p: slow faint wavelets, the finer ones let go
   as they fall under a pixel, and patches where a breath of wind
   roughens it */
vec2 ripples(vec2 p, float t, out float gust) {
  gust = smoothstep(0.62, 0.85, noise(p * vec2(0.0011, 0.003) + vec2(TT * 0.0035, 0.0)));
  float fp = (t * t + t) * PXA;
  float amp = mix(1.0, 0.25, smoothstep(4.0, 150.0, t)) * (0.6 + 2.2 * gust) * look3(1.0, 0.6, 0.7);
  vec2 g = vec2(0.0);
  float f = 0.6, a = 0.0045;
  vec2 q = p;
  for (int i = 0; i < 6; i++) {
    float fade = sat(1.0 - fp * f * 2.0);
    if (fade <= 0.0) break;
    vec3 nd = noised(q * f * vec2(1.0, 2.2) + vec2(0.09, 0.3) * TT * (1.0 + 0.35 * float(i)) + float(i) * 7.1);
    g += nd.yz * vec2(1.0, 2.2) * f * a * fade;
    q = ROT2 * q;
    f *= 2.03;
    a *= 0.42;
  }
  // a long, slow swell under them
  vec3 sw = noised(p * vec2(0.04, 0.1) + vec2(0.0, TT * 0.05));
  g += sw.yz * vec2(0.04, 0.1) * 0.04;
  return g * amp;
}

/* the glacial water's own colour, a deep green-teal */
vec3 waterBody() {
  return (SKYZ * 0.6 + SKYH * 0.4) * vec3(0.05, 0.13, 0.11) * 0.5 + KEYG * max(KEY.y, 0.0) * vec3(0.002, 0.008, 0.007);
}

/* ------------------------------------------------------------ the mist */

/* low cloud hanging along the walls, a broken band a few hundred metres
   up, thickest close to the slopes; and a thin mist on the water at dusk
   and by night */
vec4 lowCloud(vec3 ro, vec3 rd, float tmax, float jit, int n) {
  float y0 = 330.0, y1 = 900.0;
  float ta = 0.0, tb = tmax;
  if (abs(rd.y) > 1e-4) {
    float t0 = (y0 - ro.y) / rd.y, t1 = (y1 - ro.y) / rd.y;
    ta = max(min(t0, t1), 0.0);
    tb = min(max(t0, t1), tmax);
  }
  tb = min(tb, ta + 9000.0);
  if (tb <= ta) return vec4(0.0, 0.0, 0.0, 1.0);
  float amt = look3(1.0, 0.8, 0.45);
  float T = 1.0;
  vec3 L = vec3(0.0);
  float dt = (tb - ta) / float(n);
  vec3 lc = KEYC * look3(0.5, 0.9, 0.35) * AIRLIT + (SKYZ * 0.6 + SKYH * 0.4) * PI * 0.35 + GLOWA * 0.6;
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    float tt = ta + dt * (float(i) + jit);
    vec3 q = ro + rd * tt;
    vec3 pl = plan(q.xz);
    float hw = wallProfile(pl.x, 1100.0, 0.5);
    float near = exp(-sq((q.y - hw - 40.0) / 160.0)) * smoothstep(-60.0, 120.0, pl.x);
    float band = smoothstep(y0, y0 + 140.0, q.y) * smoothstep(y1, y1 - 260.0, q.y);
    vec2 w = q.xz * vec2(0.0016, 0.0009) + vec2(TT * 0.004, TT * 0.0015);
    float nz = noise(w) * 0.65 + noise(w * 2.7 + 3.0) * 0.35;
    float pat = smoothstep(0.5, 0.75, noise(vec2(pl.y * 0.0006 + 1.3, pl.z * 3.0))) * (1.0 - smoothstep(2600.0, 4200.0, pl.y));
    float rho = near * band * pat * smoothstep(0.45, 0.75, nz) * 0.0016 * amt;
    float a = 1.0 - exp(-rho * dt);
    float top = smoothstep(y0, y1, q.y);
    L += T * a * lc * (0.7 + 0.5 * top);
    T *= 1.0 - a;
  }
  return vec4(L, T);
}

vec4 mist(vec3 ro, vec3 rd, float d) {
  float amt = look3(0.1, 0.9, 0.7);
  float dd = min(d, 14000.0);
  float tau = 0.0, s0 = 0.0;
  for (int i = ZERO; i < 5; i++) {
    float s1 = dd * sq(float(i + 1) / 5.0);
    vec3 q = ro + rd * (0.5 * (s0 + s1));
    float rho = exp(-max(q.y, 0.0) / 30.0);
    float w = noise(q.xz * vec2(0.0035, 0.009) + vec2(TT * 0.012, TT * 0.004));
    rho *= 0.15 + 1.2 * smoothstep(0.35, 0.8, w);
    tau += rho * (s1 - s0);
    s0 = s1;
  }
  tau *= 0.00012 * amt;
  vec3 mc = (SKYZ * 0.6 + SKYH * 0.4) * PI * 0.22 + KEYG * AIRLIT * 0.015 + GLOWA * 0.25;
  float T = exp(-tau);
  return vec4(mc * (1.0 - T), T);
}

/* ------------------------------------------------------------ the frame */

vec3 scene(vec2 fc) {
  TT = mod(uTime, 1800.0);
  AQ = 1.0;
  /* the frame holds its width on wide screens, to 1.9:1, and beyond that
     its height; on tall ones it widens a little, and the eye drifts back
     and over toward the west wall, so that it towers over the phone while
     the gap stays above the words */
  float asp = uRes.x / uRes.y;
  float fk = smoothstep(0.6, 1.5, asp);
  FRAMEK = fk;
  float tv = asp >= 1.0 ? 0.62 / min(asp, 1.9) : 0.62 + 0.12 * (1.0 - asp);
  MOOND = normalize(mix(dirAE(-9.0, 31.0), dirAE(-25.0, 20.0), fk));
  /* the sun's way is blended over day and dusk only; the moon is a light
     of its own. Where one hands over to the other the light dips nearly
     to dark, as the sun sets before the moon takes the sky, and swings
     across while it is dim; twilight holds the sky meanwhile */
  vec3 sunD = normalize(dirAE(-84.0, 34.0) * uLook.x + dirAE(-56.0, 2.6) * uLook.y + vec3(0.0, 1e-6, 0.0));
  float dip = max(0.0, 1.0 - 3.8 * (uLook.x + uLook.y) * uLook.z);
  TWI = 1.0 - dip;
  KEYS = smoothstep(0.3, 0.7, uLook.z);
  KEY = normalize(mix(sunD, MOOND, KEYS));
  E0 = look3(vec3(9.0), vec3(24.0), vec3(0.5, 0.75, 1.5) * 1.5) * dip;
  MIE = look3(3.5e-6, 1.2e-5, 5e-6);
  HAZE = look3(1.6e-5, 2.6e-5, 1.6e-5);
  AIRLIT = look3(0.4, 0.2, 0.6);
  KEYG = keyLight(KEY.y, 1.0);
  MSL = keyLight(max(KEY.y, 0.0) + 0.2, 0.35) * look3(0.7, 0.4, 0.85);
  KEYC = keyLight(KEY.y, 0.5);
  SKYZ = skyRad(vec3(0.0, 1.0, 0.0));
  SKYH = skyRad(normalize(vec3(-KEY.x, 0.18, -KEY.z)));
  GLOWA = vec3(0.004, 0.022, 0.012) * uLook.z;

  vec2 uv = (2.0 * fc - uRes) / uRes.y;
  float hz = mix(-0.27, -0.31, fk);
  vec3 rd = normalize(vec3(uv.x * tv, (uv.y - hz) * tv, 1.0));
  rd.xz = rot(mix(-0.045, 0.012, fk)) * rd.xz;
  rd.yz = rot(-uPoint.y * 0.007) * rd.yz;
  rd.xz = rot(uPoint.x * 0.012) * rd.xz;
  PXA = 2.0 * tv / uRes.y;
  vec3 ro = vec3(mix(-150.0, 10.0, fk), 2.4 + 0.04 * sin(TT * 0.8), mix(950.0, 0.0, fk));
  float jit = hash12(fc + fract(TT) * 17.0);
  JIT = jit;

  ZERO = int(min(uTime, 0.0));

  /* the eye's ray, and if it meets the water, the ray the water throws
     back; what lies between along each is gathered as it goes, as light
     added (acc) and light let through (thr) */
  vec3 acc = vec3(0.0), thr = vec3(1.0);
  vec3 o = ro, d = rd;
  int kind = 0;            // what the last ray met: 0 sky, 1 land, 2 a building
  float th = 0.0, tl = 0.0;
  vec3 bn = vec3(0.0, 1.0, 0.0), ba = vec3(0.0);
  bool refl = false;
  for (int k = ZERO; k < 2; k++) {
    float tw = (!refl && d.y < 0.0) ? -o.y / d.y : 1e9;
    float t = march(o, d, min(tw, 60000.0), refl ? 80 : 176, refl ? 1 : 3, refl ? 0.008 : 0.0013);
    float tend = t > 0.0 ? t : tw < 1e8 ? tw : 30000.0;
    vec3 nb, ab;
    float tbl = buildings(o, d, tend, nb, ab);
    kind = tbl > 0.0 ? 2 : t > 0.0 ? 1 : 0;
    if (kind == 2) { tend = tbl; bn = nb; ba = ab; }
    th = tend;
    bool water = kind == 0 && tw < 1e8;
    // the air, the low cloud and the mist along the way; the sky holds
    // its own air
    float seg = kind > 0 || water ? tend : 20000.0;
    vec3 T = vec3(1.0), S = vec3(0.0);
    if (kind > 0 || water) air(o, d, seg, T, S);
    vec4 lc = lowCloud(o, d, kind > 0 || water ? tend : 30000.0, jit, refl ? 3 : 7);
    vec4 mi = mist(o, d, seg);
    S = (S * lc.a + lc.rgb) * mi.a + mi.rgb;
    T *= lc.a * mi.a;
    acc += thr * S;
    thr *= T;
    if (!water) break;
    // the water: dark green glacial water under the mirror of everything
    // else, broken by the ripples, by the Fresnel of water
    vec3 p = o + d * tw;
    float gust;
    vec2 g = ripples(p.xz, tw, gust);
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 r = reflect(d, n);
    r.y = max(r.y, 0.0015) + gust * 0.02 * smoothstep(40.0, 400.0, tw);
    r = normalize(r);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(-d, n), 0.0), 5.0);
    acc += thr * waterBody() * (1.0 - F);
    thr *= F;
    o = p + vec3(0.0, 0.05, 0.0);
    d = r;
    tl = tw;
    refl = true;
    AQ = 0.5;
  }

  /* what the last ray met, shaded once: a building, the land, or the sky,
     with the land drawn softly into it where a skyline passes within a
     pixel */
  vec3 c = vec3(0.0);
  float w = kind == 1 ? 1.0 : kind == 0 ? EDGEC : 0.0;
  if (kind == 0) c = sky(d);
  vec3 p = o + d * th, n = bn, ng = bn;
  float te = th;
  int det = 3;
  if (w > 0.0) {
    te = kind == 1 ? th : EDGET;
    p = o + d * te;
    det = min(detAt(te + tl), refl ? 1 : 3);
    float h0;
    ng = landNormal(p, te + tl, det, h0);
    if (kind == 0) p.y = h0;
    n = refl ? ng : rockBump(p, ng, te + tl);
  }
  if (kind > 0 || w > 0.0) {
    float sh = 0.0;
    vec3 ps = kind == 2 ? p + n * 0.5 + vec3(0.0, 1.0, 0.0) : p + vec3(n.x, 0.0, n.z) * 25.0 + vec3(0.0, 4.0, 0.0);
    if (dot(n, KEY) > -0.25) sh = shadow(ps, refl ? 4 : 7);
    if (kind == 2) c = shadeBuilding(p, n, ba, sh);
    else {
      vec3 cl = shadeLand(p, n, ng, te + tl, sh, !refl);
      if (kind == 0) {
        vec3 T, S;
        air(o, d, te, T, S);
        cl = cl * T + S;
      }
      c = mix(c, cl, w);
    }
  }
  return acc + thr * c;
}
`
};
