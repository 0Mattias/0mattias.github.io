/* scenes/fjord.js · Nærøyfjord

   The Nærøyfjord, afloat a couple of metres above the water a kilometre
   and a half south of Bakka, looking north down the fjord. It is the
   narrowest fjord in Norway, under five hundred metres across here, and
   its walls go up to eleven and fourteen hundred metres within a
   kilometre of the water: a glacial trough. The land is one heightfield
   laid over the fjord's plan, three reaches bending gently east toward
   the mouth, with spurs pushed out in turn from either side and bays
   between, so that they stand behind one another down the fjord, each
   paler and bluer in the haze than the one before. Every wall is the same
   section, steepening as it climbs: a short apron at the water, the wooded
   wall at forty-odd degrees, a band of cliff at sixty-five or seventy,
   and the shoulder rounding over into the uplands. Avalanche gullies cut
   straight down it, and the wall's own detail, buttresses, crags and the
   rock climbing in steps, is laid over the face itself, along the shore
   and up it, so nothing is drawn out down the steep walls.

   The walls are not bare rock: birch and pine cloak them up to six or
   eight hundred metres, single crowns near the water, stacked up the
   slope as trees are seen from below, then a grain, then the dark green
   velvet they make at a distance; the gullies are kept open by the
   avalanches, grass and scrub with small scree cones at their feet, and
   the steepest steps show the grey gneiss, with heath on its ledges.
   Snow lies on the high ground and longest on the slopes turned from the
   sun. Two falls thread down the east wall in pitches, white over the
   rock and lost under the trees. Two side valleys have built fans of
   gravel out into the fjord, one on either shore, under meadow grass and
   birch; behind each the wall stands back. Low cloud hangs along the upper
   west wall.

   The air is one model for sky and distance alike, sunlight scattered
   once by Rayleigh and Mie over an exponential atmosphere and a bluer
   veil of light scattered more than once, with the fjord's own haze lying
   thicker low over the water; in so narrow a trough the walls hide much
   of the sky from each other and from the air between, and throw green
   light back across it. Fair-weather cumulus drift over the rim, and
   their shadows slide down the walls. The water is dark green glacial
   water that mirrors all of it by the Fresnel of water, broken by slow,
   faint ripples. By day it is late afternoon and the sun stands in the
   west behind the west wall, which lays its shadow across the foot of the
   east wall and lights the rest; at dusk the sun is all but down in the
   north-west, the valley lies in blue shade and only the high ground
   keeps the warm light, under peach clouds; at night the moon over the
   west wall lights the east wall faintly and the aurora folds over the
   north, curtains brightest and sharpest at their lower edge and fading
   upward through tall rays, once in the sky and once in the water. A
   phone or a tablet sees the desktop's picture, framed as the meadow
   frames it: as wide as a 3:2 frame, the lens widened up into the sky,
   and on a phone a crop of that turned toward the far end of the fjord.

   The land, the sky and what a still mirror of them would show are
   traced for the look on show every few seconds, the clouds, the mist
   and the aurora moving on between, and blended; each frame draws the
   water from them, rippled, and the clouds' shadows over the walls.
   WebGL2, no libraries, no build step. */

window.PLACE = {
  id: 'fjord',
  period: 3,
  theme: { day: '#6192c5', dusk: '#8f99ba', night: '#2e4b7e' },
  t0: 40,
  /* the meadow's lens and grade; by night more of the colour is kept, so
     the aurora stays green, and it and the moon bloom more; the blacks are
     lifted far less than the meadow's, so the shaded walls stay deep */
  camera: {
    expo: [1.0, 1.05, 1.15],
    bloom: [0.05, 0.08, 0.13],
    thresh: 0.9,
    sat: [0.95, 0.93, 0.9],
    vig: [0.14, 0.16, 0.2],
    lift: [0.003, 0.004, 0.0015],
    grain: 0.022,
    blur: 0.012
  },
  frag: `
/* ------------------------------------------------------------ state */
/* metres; x east (right), y up, z north (down the fjord). Set once a pixel. */

float TT;          // the clock, wrapped
vec3 CAM;          // the eye
bool REFL;         // shading what the water throws back, which its ripples blur
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
  float tM = MIE * densInt(ro.y, rd.y, d, 1200.0) + HAZE * densInt(ro.y, rd.y, max(d - 1600.0, 0.0), 900.0);
  T = exp(-(tR + tM * 1.11));
  float tws = dot(normalize(rd.xz + vec2(1e-4, 0.0)), normalize(KEY.xz + vec2(1e-4, 0.0)));
  vec3 warm = mix(vec3(0.9, 0.96, 1.1), look3(vec3(1.14, 1.02, 0.86), vec3(1.3, 0.98, 0.78), vec3(1.0)), smoothstep(-0.6, 0.9, tws));
  vec3 veil = (skyMS(0.0) * 0.35 + (SKYH * 0.6 + SKYZ * 0.4) * look3(0.72, 0.62, 0.5)) * vec3(1.0, 0.98, 0.9) * warm + twilight(0.0);
  // close to, the walls hide most of the sky from the air between
  S = scatter1(tR, tM, dot(rd, KEY), KEYG * AIRLIT) + veil * (1.0 - T) * mix(0.35, 1.0, smoothstep(500.0, 4000.0, d));
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
  float a = sd > 0.0 ? u - 3050.0 - 14.0 * sin(s * 0.007) - 6.0 * sin(s * 0.023 + 1.0) : 1e4;
  float b = sd > 0.0 && s > 150.0 ? u - 4850.0 - 18.0 * sin(s * 0.006 + 2.0) : 1e4;
  return min(abs(a), abs(b));
}

/* the alluvial fans the side valleys have built, one on the west shore
   and one on the east, each a low cone spread out into the water */
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
  // behind a fan the wall stands back, at the mouth of the side valley
  // that built it, and the shore is the fan's own
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
  s += (90.0 * bt - 50.0) * (1.0 - 0.6 * kf);
  if (det > 0) {
    float cn = noise(f * vec2(0.012, 0.006) + 1.3);
    s += 30.0 * mix(cn, 1.0 - abs(2.0 * cn - 1.0), 0.15) - 15.0;
  }
  if (det > 1) s += 14.0 * noise(f * 0.03 + 4.1) - 7.0;
  if (det > 2) {
    float rb = noise(f * vec2(0.013, 0.004) + vec2(2.0, 7.0));
    s += 26.0 * (1.0 - abs(2.0 * rb - 1.0)) * smoothstep(40.0, 200.0, h0) * (1.0 - smoothstep(600.0, 900.0, h0)) - 10.0;
  }
  if (det > 2) s += 5.0 * noise(f * 0.09 + 2.7) - 2.5;
  float band = smoothstep(250.0, 500.0, h0) * (1.0 - smoothstep(1000.0, 1200.0, h0));
  if (det > 1) {
    float k = h0 / 46.0 + 2.5 * noise(f * vec2(0.004, 0.008));
    s += band * 5.0 * smoothstep(0.35, 0.7, noise(f * 0.008 + 6.0)) * (smoothstep(0.3, 0.7, fract(k)) - fract(k));
  }
  float h = wallProfile(s, T, cb);
  // the uplands behind the rim, rounded humps and knolls
  float up = smoothstep(450.0, 1500.0, s);
  if (up > 0.0) {
    float r = 0.0, a = 0.5;
    vec2 q = p * 0.0006;
    for (int i = ZERO; i < 4; i++) {
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
    float gh = ground(p.xz, pl, min(detAt(tt), dmax));
    float dy = p.y - gh;
    if (bis > 0) {
      if (dy < 0.0) b = tt; else a = tt;
      bis++;
      if (bis > 6) return 0.5 * (a + b);
      continue;
    }
    if (dy < 0.0) { bis = 1; a = tp; b = t; continue; }
    // over the water the stride is taken from a floor not far under it, so
    // a ray skimming the surface cannot leap a low shore
    dy = p.y - max(gh, -70.0);
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
    t += max(max((0.32 + 0.16 * smoothstep(600.0, 4000.0, t)) * dy, reachOut * 0.9 / close), grow * t + 0.25);
  }
  EDGEC = sat(0.5 - ec);
  // a ray that ran out of steps low over the land is taken as a hit; and
  // so is one that ran out still low down the fjord, which is closed all
  // round, so that it can only be grazing a shore
  if (t < tmax && (dyl < grow * 20.0 * t + 15.0 || (dyl < 1e8 && (ro + rd * t).y < 1500.0))) return t;
  return -1.0;
}

/* the light's way out from p, tested against the land in a few
   lengthening taps; the clearance over each sets a soft edge */
float shadow(vec3 p, int n, float d) {
  float r = 1.0;
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

/* the land's normal from three taps; and near at hand five more, at the
   detail the march uses far off, for how far p lies below the mean of
   its neighbours 34 m around, which shadeLand() takes for the hollows.
   One loop for all of them, so the land is built into the program once */
float LAPV;
vec3 landNormal(vec3 p, float t, int det, out float h0, bool lap) {
  float e = max(0.6, t * 0.0012);
  float h[3];
  LAPV = 0.0;
  int n = lap && t < 9000.0 ? 8 : 3;
  for (int i = ZERO; i < 8; i++) {
    if (i >= n) break;
    int j = i - 3;
    vec2 o = i < 3 ? (i == 1 ? vec2(e, 0.0) : i == 2 ? vec2(0.0, e) : vec2(0.0))
                   : vec2(j == 1 ? 34.0 : j == 2 ? -34.0 : 0.0, j == 3 ? 34.0 : j == 4 ? -34.0 : 0.0);
    float g = groundAt(p.xz + o, i < 3 ? det : 0);
    if (i < 3) h[i] = g; else LAPV += g * (j == 0 ? -4.0 : 1.0);
  }
  h0 = h[0];
  return normalize(vec3(h[0] - h[1], e, h[0] - h[2]));
}

/* ------------------------------------------------------------ the land's skin */

float cloudShade(vec3 p);   // the deck's shadow, from the sky below
vec3 KEYPART;               // what the key light gives, at the last shadeLand()

/* the crowns of the trees, one to a cell of a jittered grid laid on the
   wall (q, in crowns), of many sizes and with gaps between, each a soft
   dome lit on its side toward the light (l, in the same plane) with the
   understorey dark between. Returns the light on it, about one on the
   mean, and which tree it is */
float GAPS;   // how open the canopy stands here
vec2 crowns(vec2 q, vec2 l) {
  q += 0.45 * vec2(noise(q * 0.8), noise(q * 0.8 + 5.3)) - 0.22;
  vec2 i = floor(q), f = fract(q);
  float d1 = 9.0, id = 0.5;
  vec2 o1 = vec2(0.0);
  for (int j = -1 + ZERO; j <= 1; j++) {
    for (int c = -1 + ZERO; c <= 1; c++) {
      vec2 g = vec2(float(c), float(j));
      vec3 h = hash33(vec3(i + g, 3.7));
      if (h.z < 0.08 + 0.55 * GAPS) continue;
      vec2 o = g + h.xy - f;
      float r = 0.55 + 0.6 * fract(h.z * 7.13);
      vec2 e = o * vec2(1.0, 0.85) / r;
      float d = dot(e, e);
      if (d < d1) { d1 = d; o1 = e; id = fract(h.z * 17.3 + h.x * 5.1); }
    }
  }
  float m = smoothstep(1.0, 0.45, d1);
  float dome = sqrt(max(1.0 - d1, 0.0));
  float lit = sat(0.55 + 0.55 * dot(-o1, l) + 0.25 * dome);
  float k = mix(0.14, (0.35 + 1.0 * lit) * (0.6 + 0.8 * fract(id * 31.7)), m);
  return vec2(k * 1.3, id);
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
  float k1 = noise3(p * 0.012) * 0.5 + noise3(p * 0.047 + 3.0) * 0.3 + noise3(p * 0.16 + 1.0) * 0.2 * sat(1.0 - fp / 3.0) + 0.1 * (1.0 - sat(1.0 - fp / 3.0));
  vec3 alb = vec3(0.105, 0.106, 0.098) * (0.5 + 0.9 * k1);
  alb *= 0.8 + 0.4 * noise(vec2(y * 0.028 + 2.5 * noise3(p * 0.003), sd * 4.0));
  alb = mix(alb, alb * vec3(1.06, 1.04, 0.94), noise3(p * 0.007 + 1.0));
  float ws = noise3(vec3(p.x * 0.03, y * 0.002, p.z * 0.03) + 11.0);
  alb = mix(alb, vec3(0.03, 0.031, 0.03), smoothstep(0.7, 0.85, ws) * (1.0 - slope) * 0.75);
  // water stains running down the steep faces, and paler, drier rock
  // between them, in the face's own coordinates
  vec3 dv0 = p - CAM;
  vec2 ang0 = dv0.xy / max(dv0.z, 1.0);
  float stx = ang0.x / (6.0 * PXA) + 2.5 * noise(vec2(u * 0.012, y * 0.002 + sd));
  float sty = ang0.y / (70.0 * PXA);
  float steep = smoothstep(0.72, 0.45, slope);
  alb = mix(alb, vec3(0.016, 0.022, 0.016), 0.75 * smoothstep(0.52, 0.8, noise(vec2(stx, sty + sd * 5.0))) * steep);
  alb *= 1.0 + 0.35 * smoothstep(0.6, 0.85, noise(vec2(stx * 1.7 + 9.0, sty * 1.3))) * steep;

  // ledges: grass and heath catch on every step of the rock
  vec2 fq0 = vec2(u, y * 1.25);
  float led = smoothstep(0.42, 0.62, noise(vec2(y * 0.045 + 3.0 * noise(p.xz * 0.004), u * 0.004 + sd))) * smoothstep(0.35, 0.6, noise(vec2(u * 0.03, y * 0.02) + 5.0));
  // the green climbs nearly to the rim, in patches broken by the rock
  float rag = noise(fq0 * 0.012 + 3.0) * 0.55 + noise(fq0 * 0.04 + 9.0) * 0.3 + noise(fq0 * 0.12) * 0.15;
  float ledge = max(smoothstep(0.3, 0.46, slope + 0.4 * (rag - 0.5)), max(led, smoothstep(0.4, 0.62, rag)) * smoothstep(0.08, 0.2, slope));
  vec3 heath = mix(vec3(0.034, 0.068, 0.02), vec3(0.06, 0.082, 0.032), m2);
  heath *= (0.55 + 0.9 * noise(fq0 * 0.35 + 2.0) * noise(fq0 * 0.11 + 6.0) * 1.6) * (0.75 + 0.5 * noise(fq0 * 0.9 + 4.0) * sat(1.0 - fp / 3.0));
  alb = mix(alb, heath, ledge * smoothstep(1300.0, 1100.0, y));

  // the forest: birch and pine up to the tree line, on all but the
  // steepest steps, and not down the gullies, which avalanches keep open
  float tl = 880.0 + 280.0 * noise(p.xz * 0.0011) - 140.0 + 160.0 * (rag - 0.5);
  float steepOk = smoothstep(0.29, 0.42, slope + 0.3 * (rag - 0.5) + 0.08 * (m3 - 0.5));
  float aval = smoothstep(0.3, 0.7, gg.x) * smoothstep(30.0, 160.0, y);
  float fo = fallOff(u, s, sd);
  float forest = steepOk * (1.0 - smoothstep(tl - 160.0, tl + 30.0, y + 120.0 * (m3 - 0.5))) * (1.0 - 0.9 * aval) * smoothstep(0.8, 2.5, y)
               * max(smoothstep(5.0, 14.0, fo), 1.0 - smoothstep(80.0, 160.0, y));
  // birch in patches, low down and along the gullies, yellow-green among
  // the darker spruce and pine that hold the ribs and the higher slopes
  vec2 fq = vec2(u, y * 1.25);
  float bp = noise(fq * 0.007 + 11.0) * 0.6 + noise(fq * 0.019 + 4.0) * 0.4;
  float bf = sat(smoothstep(0.42, 0.64, bp) * 0.85 + 0.3 * (1.0 - smoothstep(60.0, 400.0, y)) + 0.35 * gg.y - 0.3 * smoothstep(350.0, 650.0, y));
  vec3 pine = vec3(0.014, 0.03, 0.014), birch = vec3(0.034, 0.064, 0.018);
  vec3 trees = mix(pine, birch, bf);
  // clumps a few tens of metres across, and the runnels between them in
  // shade
  float cl = noise(fq * 0.03 + 7.0) * 0.65 + noise(fq * 0.09 + 2.0) * 0.35;
  trees *= (0.8 + 0.4 * cl) * (1.0 - 0.35 * smoothstep(0.15, 0.6, gg.y));
  // trees stand upright, so however steeply a slope is seen their crowns
  // stay round: they are laid out across the view, in the angle each
  // point makes at the eye, fixed to the land and not to the pointer, at
  // the size a crown has a few hundred metres off. Single crowns only on
  // the nearest slopes; a fine grain where they would shrink under a few
  // pixels; beyond that the velvet they make
  vec3 dv = p - CAM;
  vec2 ang = dv.xy / max(dv.z, 1.0);
  float ca = REFL ? 0.0 : sat(1.0 - (fp - 0.12) / 0.4);
  if (ca > 0.0) {
    vec2 q = ang * 250.0;
    GAPS = smoothstep(0.4, 0.75, noise(q * 0.22 + 3.0) * 0.6 + noise(fq * 0.03 + 8.0) * 0.4);
    vec2 c = crowns(q, normalize(KEY.xy + vec2(0.0, 0.3)));
    vec3 one = mix(pine, birch, step(1.0 - bf, c.y)) * (0.85 + 0.3 * fract(c.y * 17.0));
    trees = mix(trees, mix(trees, one * (0.8 + 0.4 * cl), 0.8) * c.x, ca);
  }
  float grain = REFL ? 0.0 : sat(1.0 - fp / 4.0) * (1.0 - ca);
  vec2 gq = ang / (2.6 * PXA);
  trees *= 1.0 + grain * ((noise(gq) * 0.6 + noise(gq * 0.4 + 5.0) * 0.4) - 0.5) * 1.2;
  // the gullies: grass and scrub, scree low down and snow high up
  vec3 grass = mix(vec3(0.055, 0.09, 0.025), vec3(0.08, 0.1, 0.04), m2);
  alb = mix(alb, grass, aval * smoothstep(0.3, 0.45, slope) * 0.8);
  alb = mix(alb, trees, forest);
  float scree = smoothstep(0.45, 0.85, gg.x) * (1.0 - smoothstep(6.0, 30.0 + 40.0 * m3, y)) * smoothstep(0.6, 0.8, noise(vec2(u * 0.006, sd)));
  alb = mix(alb, vec3(0.17, 0.168, 0.16) * (0.6 + 0.6 * noise(vec2(u, y) * 0.3)), scree * 0.8);

  // the fans: meadow grass gone to seed, with birch standing in it
  float fan = smoothstep(-2.5, -0.3, fanH(p.xz) - y) * smoothstep(0.8, 0.92, slope);
  vec3 meadow = mix(vec3(0.075, 0.11, 0.032), vec3(0.1, 0.11, 0.045), m2) * (0.8 + 0.4 * m3);
  meadow = mix(meadow, birch * (0.8 + 0.4 * cl), smoothstep(0.55, 0.75, noise(p.xz * 0.05 + 2.0)) * 0.8);
  alb = mix(alb, meadow, fan * 0.92);

  // snow on the high ground and in the tops of the gullies
  float sl = 1130.0 + 200.0 * noise(p.xz * 0.0024) - 100.0;
  // longest on the ground turned from the sun, north and east
  float shade = dot(normalize(ng.xz + vec2(1e-4, 0.0)), vec2(0.6, 0.8)) * smoothstep(0.995, 0.9, slope);
  float sn = smoothstep(sl - 50.0, sl + 50.0, y + 260.0 * gg.x + 220.0 * shade) * smoothstep(0.42, 0.7, slope + 0.5 * gg.x)
           * smoothstep(0.54, 0.64, 0.45 * noise(fq * 0.006 + 4.0) + 0.3 * noise(fq * 0.025) + 0.25 * noise(fq * 0.08 + 1.0) + 0.3 * gg.x);
  alb = mix(alb, vec3(0.86, 0.88, 0.9), sn);

  // the falls: white over the rock, lost under the trees
  // the falls: a white ribbon, brightest where it leaves a ledge and falls
  // free, fainter where it runs in its bed between, and quiet by night
  // seen along the wall a pixel spans more of the shore than its width,
  // so the ribbon is widened by that and dimmed less than in proportion
  float fw0 = 3.5 + 3.5 * (1.0 - slope);
  float cu = max(length(cross(normalize(p - CAM), vec3(tg.x, 0.0, tg.y))), 0.15);
  float fw = max(fw0, 1.6 * fp / cu);
  float fl = smoothstep(fw, fw * 0.3, fo) * smoothstep(3.0, 20.0, y) * smoothstep(1060.0, 980.0, y) * mix(0.35, 1.0, smoothstep(80.0, 160.0, y));
  float pitch = smoothstep(0.4, 0.62, noise(vec2(y * 0.018, sd * 3.0 + 1.0)) + 0.5 * (0.7 - slope));
  fl *= max(min(1.0, 1.4 * fw0 / fw), 0.5) * (0.75 + 0.25 * noise(vec2(fo * 0.2, y * 0.05 + TT * 1.4))) * mix(0.35, 1.0, pitch);
  alb = mix(alb, vec3(0.8, 0.82, 0.84), sat(fl) * look3(1.0, 0.85, 0.4));

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
  KEYPART = alb / PI * E;
  // hollows see less of the sky than ribs: the height against its
  // neighbours' mean
  float ao = 1.0;
  if (t < 9000.0 && near) {
    ao = mix(1.0, clamp(1.0 - LAPV * 0.0055, 0.35, 1.25), smoothstep(9000.0, 5000.0, t));
  }
  float open = mix(0.42, 0.92, smoothstep(0.0, 1200.0, y)) * ao;
  E += mix(SKYH, SKYZ, 0.5 + 0.5 * n.y) * PI * (0.5 + 0.5 * n.y) * open * look3(vec3(0.75), vec3(1.4, 1.7, 2.4), vec3(1.8));
  vec2 kh = normalize(KEY.xz + vec2(1e-4, 0.0));
  float away = sat(0.35 - 0.65 * dot(n.xz, kh));
  float litw = look3(1.0, 0.12, 0.6);
  E += KEYG * vec3(0.045, 0.1, 0.03) * away * litw * (1.0 - 0.5 * n.y) * ao * (1.2 - open);
  float wfr = mix(0.14, 0.03, smoothstep(0.0, 400.0, y));
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
  for (int i = ZERO; i < 2; i++) {
    float f = i == 0 ? 0.06 : 0.21;
    float A = (i == 0 ? 1.1 : 0.45) * sat(1.0 - fp * f * 1.5);
    if (A <= 0.0) break;
    vec3 o = vec3(float(i) * 7.3);
    if (w.x > 0.05) { vec3 a = noised(p.zy * f + o.xy); g += w.x * vec3(0.0, a.z, a.y) * A * f; }
    if (w.z > 0.05) { vec3 a = noised(p.xy * f + o.yz); g += w.z * vec3(a.y, a.z, 0.0) * A * f; }
    if (w.y > 0.05) { vec3 a = noised(p.xz * f + o.xz); g += w.y * vec3(a.y, 0.0, a.z) * A * f; }
  }
  // runnels down the steep faces
  float A2 = 0.5 * sat(1.0 - fp * 0.25) * (1.0 - smoothstep(0.4, 0.7, n.y));
  if (A2 > 0.0) {
    vec3 a = noised(vec2((p.x + p.z) * 0.15, p.y * 0.012));
    vec3 hz = normalize(vec3(-n.z, 0.0, n.x) + 1e-4);
    g += hz * a.y * 0.15 * A2;
  }
  return normalize(n - g);
}

/* ------------------------------------------------------------ the sky */

/* fair-weather cumulus, a broken deck over the rim, seen from beneath:
   crisp, billowed edges, grey where they are thick, bright on the edges
   toward the sun and silvered when it is behind them. Fewer and thinner
   low over the horizon, so the gap down the fjord keeps its blue */
/* the deck's field at q: x the masses where clouds stand, y the puffs
   and creases on them, z the two together, the cloud itself */
vec2 cloudWarp(vec2 q) { return q + 0.3 * vec2(noise(q * 0.4 + 5.0), noise(q * 0.4 + 9.0)); }
float cloudBig(vec2 p) { return 0.72 * noise(p * 0.55) + 0.28 * noise(p * 1.3 + 2.3); }
float cloudPuffs(vec2 p) {
  return 0.5 * abs(2.0 * noise(p * 3.1 + 1.7) - 1.0) + 0.32 * abs(2.0 * noise(p * 6.5 + 3.1) - 1.0) + 0.18 * abs(2.0 * noise(p * 13.0 + 4.4) - 1.0);
}
float cloudD(vec2 q) { vec2 p = cloudWarp(q); return cloudBig(p) + (cloudPuffs(p) - 0.45) * 0.3; }

/* the deck's shadows on the land: the clouds a point would see looking
   up at the light. Those over the east wall stand three kilometres west,
   over the uplands and out of sight, so they are a field of their own,
   cumulus-sized and drifting with the same wind, soft at the edges */
vec2 cloudQ(vec2 xz) { return (xz - CAM.xz + vec2(TT * 4.0, TT * 1.5)) * 0.00042 + vec2(6.1, 2.2); }
float cloudShade(vec3 p) {
  float up = smoothstep(0.05, 0.16, KEY.y) * (1.0 - KEYS);
  if (up <= 0.0) return 1.0;
  vec2 c = p.xz + KEY.xz / max(KEY.y, 0.05) * (2100.0 - p.y);
  vec2 q = (c + vec2(TT * 4.0, TT * 1.5)) * 0.0011 + vec2(3.3, 8.1);
  q += 0.35 * vec2(noise(q * 0.5 + 2.0), noise(q * 0.5 + 7.0));
  float f = 0.6 * noise(q) + 0.28 * noise(q * 2.3 + 4.0) + 0.12 * noise(q * 5.1 + 1.0);
  return 1.0 - 0.7 * up * smoothstep(0.6, 0.7, f);
}

/* the deck seen from beneath, shaded as the meadow's is: each mass and
   each puff on it lit on the side toward the light and shadowed on the
   side away, at both scales; the flat grey base where more of the cloud
   stands beyond the sight line (above it on the screen); creases between
   the puffs; and a bright lining on the thin edges facing the light.
   Fewer and thinner low over the horizon, so the gap keeps its blue */
vec4 clouds(vec3 rd) {
  if (rd.y < 0.012) return vec4(0.0);
  float t0 = 2100.0 / (rd.y + 0.015);
  vec2 q = cloudQ(CAM.xz + rd.xz * t0);
  float cov = look3(0.6, 0.59, 0.95) + 0.08 * (1.0 - smoothstep(0.08, 0.35, rd.y));
  vec2 p = cloudWarp(q);
  float big = cloudBig(p);
  if (big < cov - 0.2) return vec4(0.0);
  float puffs = cloudPuffs(p);
  float f = big + (puffs - 0.45) * 0.3;
  float fray = noise(q * 30.0 + 1.3) * 0.6 + noise(q * 70.0 + 7.1) * 0.4;
  float e = f + (fray - 0.5) * 0.09 - cov;
  float a = smoothstep(-0.03, 0.11, e);
  if (a <= 0.0) return vec4(0.0);
  float fade = smoothstep(0.015, 0.1, rd.y) * exp(-t0 * 0.00003);
  vec3 lit = KEYC * look3(0.85, 0.75, 0.5) * 0.17 + SKYZ * PI * 0.1;
  vec3 sk = SKYZ * PI;
  vec3 shd = mix(vec3(luma(sk)), sk, 0.35) * look3(0.72, 0.5, 0.7) + KEYC * look3(0.012, 0.02, 0.01);
  if (REFL) {
    float k = 0.55 - 0.3 * smoothstep(0.0, 0.2, e);
    return vec4(mix(shd, lit, k) * a * fade, a * fade);
  }
  vec2 vd = normalize(rd.xz + vec2(1e-4, 0.0));
  vec2 lk = normalize(KEY.xz + vec2(1e-4, 0.0));
  float bigShade = smoothstep(0.06, -0.06, cloudBig(p + lk * 0.12) - big);
  float lobeShade = smoothstep(0.08, -0.08, cloudPuffs(p + lk * 0.025) - puffs);
  // into the cloud from its edge it is thicker, and seen from below its
  // flat base; only where it thins beyond the sight line (its upper edge
  // on the screen) does the sight line meet its sunlit, billowed top
  float dpt = smoothstep(0.0, 0.07, e);
  float top = smoothstep(0.03, -0.05, cloudBig(p + vd * 0.09) + (puffs - 0.45) * 0.3 - cov);
  float thick = dpt;
  float lam = 0.1 + 0.9 * (0.4 * bigShade + 0.6 * lobeShade);
  float belly = mix(1.0, 0.2, dpt * (1.0 - 0.85 * top));
  float crease = smoothstep(0.5, 0.15, puffs);
  float lk2 = sat(lam * belly * (1.0 - 0.3 * crease));
  float facing = smoothstep(0.2, 0.8, 0.5 * bigShade + 0.5 * lobeShade);
  float lining = (1.0 - smoothstep(0.0, 0.08, e)) * (0.25 + 0.75 * facing);
  float c = dot(rd, KEY);
  vec3 col = mix(shd, lit, lk2) + KEYC * look3(0.85, 0.75, 0.5) * (0.06 * lining + 0.5 * phaseM(c, 0.6) * (1.0 - 0.8 * thick));
  return vec4(col * a * fade, a * fade);
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
  for (int l = ZERO; l < 2; l++) {
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
              Z + 70.0 * sin(u * 0.0095 + TT * 0.012 + k) + f1 * 0.8 * cos(p1) + f2 * cos(p2));
}

/* the light of a curtain at height h, split in two: low, the hem and the
   foot of the rays, which a fold seen edge on gathers in full; and high,
   the rays above, which it may brighten only a little */
void auroraAt(float u, float x, float xa, float h, float k, out vec3 low, out vec3 high) {
  float r1 = noise(vec2(u * 0.09 + TT * 0.05, k * 13.0));
  float r2 = noise(vec2(u * 0.33 - TT * 0.12, k * 5.0 + 2.0));
  float rays = 0.2 + 0.8 * r1 * r1 * r1 + 0.45 * r2 * r2;
  /* and finer rays among them, each of its own brightness and reach */
  float r3 = noise(vec2(u * 0.85 - TT * 0.21, k * 7.0 + 4.0));
  float r4 = noise(vec2(u * 0.23 + TT * 0.07, k * 9.0 + 1.0));
  rays *= 0.45 + 0.75 * r3 * r3;
  float kn = noise(vec2(x * 0.011 - TT * 0.03, k * 3.0 + 9.0));
  kn = 0.4 + 1.5 * kn * kn;
  float reach = k < 0.5 ? smoothstep(-0.62, -0.3, xa) * (1.0 - 0.93 * smoothstep(-0.1, 0.42, xa))
              : k < 1.5 ? smoothstep(-0.45, -0.25, xa) * (1.0 - smoothstep(-0.02, 0.28, xa))
              : smoothstep(-0.7, -0.4, xa) * (1.0 - smoothstep(0.05, 0.45, xa));
  float base = 97.0 + 16.0 * noise(vec2(x * 0.012 + TT * 0.015, k + 7.0)) + 4.0 * noise(vec2(x * 0.07 - TT * 0.04, k + 3.0));
  float y = h - base;
  float edge = smoothstep(-0.5, 0.5, y);
  float yp = max(y, 0.0);
  float hem = edge * exp(-yp / 3.5);
  float rh = mix(14.0, 42.0, r4);
  float body = edge * (0.7 * exp(-yp / rh) + 0.3 * exp(-yp / (rh * 3.5)));
  float fringe = exp(-sq((y + 0.5) / 0.35)) * smoothstep(0.9, 1.8, kn);
  float top = smoothstep(150.0, 240.0, h) * exp(-max(h - 240.0, 0.0) / 90.0);
  vec3 c = rays * kn * (vec3(0.1, 1.0, 0.36) * body * 0.6 + vec3(0.5, 1.0, 0.66) * hem * 0.9) + vec3(1.0, 0.16, 0.6) * fringe * 0.18;
  float lw = exp(-yp / 45.0);
  low = reach * c * lw;
  high = reach * (c * (1.0 - lw) + vec3(0.62, 0.1, 0.36) * top * 0.1 * rays);
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
  for (int k = ZERO; k < 3; k++) {
    float fk = float(k);
    float Z = k == 0 ? mix(180.0, 290.0, FRAMEK) : k == 1 ? mix(135.0, 230.0, FRAMEK) : mix(640.0, 800.0, FRAMEK);
    float gain = k == 0 ? 1.0 : k == 1 ? 0.45 : 0.4;
    float sg = (k == 2 ? 6.0 : 4.0) / AQ;
    float span = k == 1 ? 100.0 : 120.0;
    int n = int(float(k == 0 ? 120 : k == 1 ? 80 : 60) * AQ);
    float du = 2.0 * span / float(n);
    float u0 = Z * hd.x / max(hd.y, 0.3) - span;
    vec2 Pp = auroraPath(u0, fk, Z);
    vec3 L = vec3(0.0), U = vec3(0.0);
    float W = 0.0;
    for (int i = 1 + ZERO; i <= 120; i++) {
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
  vec3 sunL = keyLight(KEY.y, 1.0) * (1.0 - KEYS);
  c += sunL * smoothstep(0.999986, 0.999992, sd) * 40000.0;
  // a wide, layered glow about the sun, as a lens and the haze make it,
  // there even when the sun stands just out of the frame
  float s1 = max(sd, 0.0);
  vec3 halo = sunL * (0.016 * s1 * s1 * s1 + 0.05 * pow(s1, 16.0) + 0.6 * pow(s1, 400.0));
  if (uLook.z > 0.001) {
    float mu = max(rd.y, 0.0);
    vec3 T = exp(-(BR * 8000.0 * airmass(mu, 35.0)));
    float m1 = max(dot(rd, MOOND), 0.0);
    vec3 n = stars(rd) * T + moonDisc(rd) * T + aurora(rd)
           + vec3(0.55, 0.62, 0.8) * (0.006 * pow(m1, 12.0) + 0.05 * pow(m1, 300.0)) * (0.4 + 1.2 * uMoon);
    c += n * uLook.z;
  }
  return (c + halo) * (1.0 - cl.a) + cl.rgb + halo * cl.a * 0.6;
}

/* ------------------------------------------------------------ the water */

/* the slope of the water at p: slow faint wavelets, the finer ones let go
   as they fall under a pixel, and patches where a breath of wind
   roughens it */
vec2 ripples(vec2 p, float t, out float gust) {
  gust = smoothstep(0.62, 0.85, noise(p * vec2(0.0011, 0.003) + vec2(TT * 0.0035, 0.0)));
  float fp = (t * t + t) * PXA;
  float amp = mix(1.0, 0.3, smoothstep(4.0, 150.0, t)) * (0.7 + 0.8 * gust) * look3(1.0, 0.6, 0.7);
  vec2 g = vec2(0.0);
  float f = 0.6, a = 0.0045;
  vec2 q = p;
  for (int i = ZERO; i < 6; i++) {
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
  g += sw.yz * vec2(0.04, 0.1) * 0.006;
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
  float y0 = 480.0, y1 = 980.0;
  float ta = 0.0, tb = tmax;
  if (abs(rd.y) > 1e-4) {
    float t0 = (y0 - ro.y) / rd.y, t1 = (y1 - ro.y) / rd.y;
    ta = max(min(t0, t1), 0.0);
    tb = min(max(t0, t1), tmax);
  }
  // it lies close along the slopes: the last stretch before the land
  ta = max(ta, tb - 700.0);
  if (tb <= ta) return vec4(0.0, 0.0, 0.0, 1.0);
  float amt = look3(0.0, 0.0, 0.25);
  if (amt < 0.01) return vec4(0.0, 0.0, 0.0, 1.0);
  float T = 1.0;
  vec3 L = vec3(0.0);
  float dt = (tb - ta) / float(n);
  vec3 lc = KEYC * look3(0.5, 0.9, 0.35) * AIRLIT + (SKYZ * 0.6 + SKYH * 0.4) * PI * 0.35 + GLOWA * 0.6;
  for (int i = ZERO; i < 8; i++) {
    if (i >= n) break;
    float tt = ta + dt * (float(i) + jit);
    vec3 q = ro + rd * tt;
    vec3 pl = plan(q.xz);
    float hw = wallProfile(pl.x, 1100.0, 0.5);
    float near = exp(-sq((q.y - hw - 40.0) / 160.0)) * smoothstep(-60.0, 120.0, pl.x);
    float band = smoothstep(y0, y0 + 140.0, q.y) * smoothstep(y1, y1 - 260.0, q.y);
    vec2 w = vec2(pl.y * 0.003, q.y * 0.0042 + pl.x * 0.0015) + vec2(TT * 0.01, TT * 0.002);
    float nz = noise(w) * 0.65 + noise(w * 2.7 + 3.0) * 0.35;
    float pat = pl.z < 0.0 ? smoothstep(200.0, 700.0, pl.y) * (1.0 - smoothstep(1900.0, 2600.0, pl.y))
                           : 0.6 * (1.0 - smoothstep(900.0, 1500.0, pl.y));
    float rho = near * band * pat * smoothstep(0.46, 0.7, nz) * 0.003 * amt;
    float a = 1.0 - exp(-rho * dt);
    float top = smoothstep(y0, y1, q.y);
    L += T * a * lc * (0.7 + 0.5 * top);
    T *= 1.0 - a;
  }
  return vec4(L, T);
}

vec4 mist(vec3 ro, vec3 rd, float d) {
  float amt = look3(0.45, 0.9, 0.7);
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
  vec3 mc = (SKYZ * 0.6 + SKYH * 0.4) * PI * 0.22 + KEYG * (AIRLIT * 0.015 + 0.25 * phaseM(dot(rd, KEY), 0.7) * (1.0 - KEYS)) + GLOWA * 0.25;
  float T = exp(-tau);
  return vec4(mc * (1.0 - T), T);
}

/* ------------------------------------------------------------ the frame */

/* the camera and the light, set once a pixel. Every frame is the
   desktop's picture, framed as the meadow frames it. A frame of 3:2 and
   wider holds its width, to 1.9:1, and beyond that its height. A narrower
   one, down to 7:10, sees exactly as wide as a 3:2 frame, its lens
   widening up into the sky, and the horizon holds its height on the
   screen (the lens shifts, it does not tilt), so the water is seen at the
   same slant and the far end of the fjord stands in the same place.
   Narrower still, the lens widens no further: the frame is a crop of the
   7:10 one, turned toward the far end so that it keeps its place across
   the screen */
float TV, YAW;
vec3 setup(vec2 fc, out vec3 ro) {
  TT = mod(uTime, 1800.0);
  AQ = 1.0;
  float asp = RES.x / RES.y;
  FRAMEK = 1.0;
  const float T1 = 0.62, TV15 = 0.62 / 1.5, HZ = -0.31, YAW0 = 0.012, SUBJ = 0.025;
  float tv = T1 / clamp(asp, 0.7, 1.9);
  float yaw = SUBJ - atan(tan(SUBJ - YAW0) / T1 * min(asp * tv, T1));
  /* the moon lights the fjord from where it stands for the desktop; its
     disc is drawn, as the meadow draws its moon, at the same place on the
     screen as in a 3:2 frame, so a phone keeps it in view */
  vec3 MOONL = dirAE(-25.0, 20.0);
  MOOND = MOONL;
  if (asp < 1.5) {
    vec3 mc = MOONL;
    mc.xz = rot(-YAW0) * mc.xz;
    float xn = mc.x / mc.z / TV15 / 1.5, y15 = mc.y / mc.z / TV15 + HZ;
    MOOND = normalize(vec3(xn * asp * tv, (y15 - HZ) * tv, 1.0));
    MOOND.xz = rot(yaw) * MOOND.xz;
  }
  /* the sun's way is blended over day and dusk only; the moon is a light
     of its own. Where one hands over to the other the light dips nearly
     to dark, as the sun sets before the moon takes the sky, and swings
     across while it is dim; twilight holds the sky meanwhile */
  vec3 sunD = normalize(dirAE(-84.0, 34.0) * uLook.x + dirAE(-48.0, 2.2) * uLook.y + vec3(0.0, 1e-6, 0.0));
  float dip = max(0.0, 1.0 - 3.8 * (uLook.x + uLook.y) * uLook.z);
  TWI = 1.0 - dip;
  KEYS = smoothstep(0.3, 0.7, uLook.z);
  KEY = normalize(mix(sunD, MOONL, KEYS));
  E0 = look3(vec3(9.0), vec3(24.0), vec3(0.62, 0.78, 1.12) * 1.3) * dip;
  MIE = look3(3.5e-6, 1.2e-5, 5e-6);
  HAZE = look3(4.2e-5, 4.6e-5, 1.8e-5);
  AIRLIT = look3(0.4, 0.2, 0.6);
  KEYG = keyLight(KEY.y, 1.0);
  MSL = keyLight(max(KEY.y, 0.0) + 0.2, 0.35) * look3(0.7, 0.4, 0.85);
  KEYC = keyLight(KEY.y, 0.5);
  SKYZ = skyRad(vec3(0.0, 1.0, 0.0));
  SKYH = skyRad(normalize(vec3(-KEY.x, 0.18, -KEY.z)));
  GLOWA = vec3(0.004, 0.022, 0.012) * uLook.z;

  vec2 uv = (2.0 * fc - RES) / RES.y;
  vec3 rd = normalize(vec3(uv.x * tv, (uv.y - HZ) * tv, 1.0));
  rd.xz = rot(yaw) * rd.xz;
  PXA = 2.0 * tv / RES.y;
  ro = vec3(10.0, 2.4, 0.0);
  CAM = ro;
  REFL = false;
  TV = tv;
  YAW = yaw;
  /* the lens is focused on the walls a few hundred metres off, with a
     small stop, so that only the water within a few tens of metres goes
     soft; the same blur by angle at every aspect */
  gFocus = 700.0;
  gAperture = 1.3e-4 * 0.3483 / tv;
  return rd;
}

/* one look's trace: the eye's ray, or where it meets the water the ray
   a still mirror would throw back, with what lies between along it,
   gathered as light added (acc) and light let through (thr). C: that
   light, and on the land in .a the share of it the clouds' shadows take.
   D: how far the eye's ray went, and what it met (0 sky, 1 land, 2 water) */
void bake(vec2 fc, out vec4 C, out vec4 D) {
  vec3 ro;
  vec3 rd = setup(fc, ro);
  float jit = hash12(fc);
  JIT = jit;
  vec3 o = ro, d = rd;
  float tw = d.y < 0.0 ? -o.y / d.y : 1e9;
  /* the eye's ray, and where it meets the water the ray it mirrors: one
     march for both, so the land is built into the program once for them */
  float t = -1.0;
  bool water = false;
  float tl = 0.0;
  for (int k = ZERO; k < 2; k++) {
    if (k == 1) {
      water = t <= 0.0 && tw < 1e8;
      if (!water) break;
      o = o + d * tw + vec3(0.0, 0.05, 0.0);
      d = normalize(vec3(d.x, max(-d.y, 0.0015), d.z));
      tl = tw;
      REFL = true;
      AQ = 0.5;
    }
    t = march(o, d, k == 0 ? min(tw, 60000.0) : 60000.0, k == 0 ? 176 : 80, k == 0 ? 3 : 1, k == 0 ? 0.0013 : 0.008);
  }
  int kind = t > 0.0 ? 1 : 0;
  float th = t > 0.0 ? t : 30000.0;
  /* the air, the low cloud and the mist along the way; the sky holds its
     own air */
  vec3 thr = vec3(1.0), acc = vec3(0.0);
  vec3 T = vec3(1.0), S = vec3(0.0);
  if (kind > 0) air(o, d, th, T, S);
  vec4 lc = lowCloud(o, d, kind > 0 ? th : 30000.0, jit, water ? 3 : 8);
  vec4 mi = mist(o, d, kind > 0 ? th : 20000.0);
  S = (S * lc.a + lc.rgb) * mi.a + mi.rgb;
  T *= lc.a * mi.a;
  acc = S;
  thr = T;

  /* what the ray met, shaded once: the land or the sky, with the land
     drawn softly into it where a skyline passes within a pixel */
  vec3 c = vec3(0.0);
  float w = kind == 1 ? 1.0 : EDGEC;
  if (kind == 0) c = sky(d);
  vec3 key = vec3(0.0);
  if (w > 0.0) {
    float te = kind == 1 ? th : EDGET;
    vec3 p = o + d * te;
    int det = min(detAt(te + tl), water ? 1 : 3);
    float h0;
    vec3 ng = landNormal(p, te + tl, det, h0, !water);
    if (kind == 0) p.y = h0;
    vec3 n = water ? ng : rockBump(p, ng, te + tl);
    float sh = 0.0;
    vec3 ps = p + vec3(n.x, 0.0, n.z) * 25.0 + vec3(0.0, 4.0, 0.0);
    if (dot(n, KEY) > -0.25) sh = shadow(ps, water ? 5 : 7, water ? 70.0 : 30.0);
    vec3 cl = shadeLand(p, n, ng, te + tl, sh, !water);
    key = KEYPART;
    if (kind == 0) {
      vec3 T2, S2;
      air(o, d, te, T2, S2);
      cl = cl * T2 + S2;
      key *= T2;
    }
    c = mix(c, cl, w);
    key *= w;
  }
  vec3 col = acc + thr * c;
  float share = water ? 0.0 : sat(luma(thr * key) / max(luma(col), 1e-6));
  C = vec4(col, share);
  D = vec4(water ? tw : (kind > 0 ? th : (w > 0.5 ? EDGET : 1e6)), water ? 2.0 : float(kind), 0.0, 0.0);
}

/* each frame: the water, dark green glacial water under the mirror of
   everything else, broken by the ripples, by the Fresnel of water, and
   the shadows of the clouds sliding over the walls */
vec3 frame(vec2 fc) {
  vec3 ro;
  vec3 rd = setup(fc, ro);
  vec4 dd = bakeDi(fc);
  vec3 col;
  if (dd.y > 1.5) {
    float tw = dd.x;
    vec3 p = ro + rd * tw;
    float gust;
    vec2 g = ripples(p.xz, tw, gust);
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    /* the rippled mirror shows what the still one shows a little way off:
       where the still mirror would throw the ray the ripples throw */
    vec3 r = reflect(rd, n);
    r.y = max(r.y, 0.0015);
    vec3 rf = vec3(rd.x, -rd.y, rd.z);
    vec3 dl = r / r.z - rf / rf.z;
    dl.xz = rot(-YAW) * dl.xz;
    vec2 off = vec2(dl.x, -dl.y) / PXA;
    off = clamp(off, vec2(-40.0), vec2(40.0));
    if (bakeDi(fc + off).y < 1.5) off *= 0.0;
    vec3 R = bakeC(fc + off).rgb;
    vec3 T, S;
    air(ro, rd, tw, T, S);
    vec4 mi = mist(ro, rd, tw);
    S = S * mi.a + mi.rgb;
    T *= mi.a;
    col = S + T * (waterBody() * (1.0 - F) + F * 0.72 * R);
    gDepth = tw;
  } else {
    vec4 c = bakeC(fc);
    col = c.rgb;
    if (c.a > 0.0) col *= 1.0 - c.a * (1.0 - cloudShade(ro + rd * dd.x));
    gDepth = dd.x;
  }
  // spray hanging where the near fall meets the fjord
  vec3 B = vec3(268.0, 9.0, 3050.0);
  float tb = dot(B - ro, rd);
  if (tb > 0.0 && tb < gDepth + 60.0) {
    vec3 e = (ro + rd * tb - B) / vec3(38.0, 26.0, 38.0);
    float sp = exp(-dot(e, e)) * look3(0.3, 0.22, 0.1);
    vec3 spc = (SKYH * 0.6 + SKYZ * 0.4) * PI * 0.28 + KEYG * look3(0.05, 0.02, 0.01);
    col = mix(col, spc, sp);
  }
  return col;
}
`
};
