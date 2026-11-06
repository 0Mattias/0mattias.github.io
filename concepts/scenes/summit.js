/* concepts/scenes/summit.js · above the clouds
   Mount Fuji from the main ridge of the Southern Alps, the Akaishi
   Mountains, as the photographs from Mae-Ogochi, Shiomi and Tsubakuro
   show it: the eye stands at 2,950 metres near Ogochi-dake and looks
   east-south-east, bearing 110 degrees, fifty-four kilometres to the
   mountain over a sea of stratocumulus whose tops lie near 2,050 metres.
   The frame is a long lens, as theirs are, so the cone stands broad and
   low out of the cloud, four and a half times as wide as it is high over
   the deck, its summit two thirds of a degree over the eye.
   Fuji is drawn to its outline in those photographs: the north flank on
   the left starting at 0.65 under a shoulder and flaring out to a quarter
   by the cloud, the south-west flank on the right steeper and straighter,
   0.70 easing to 0.53; the summit a flat crater rim eight hundred metres
   across with its named tops where they stand on it, Hakusan-dake on the
   left, Kengamine highest on the right, Izu-dake behind, a low notch
   between. The Osawa-kuzure, the great ravine of the west face, runs down
   right of the middle with a dotted line of snow in it. The Hoei crater,
   on the south-east, is behind the right-hand skyline from here, as the
   photographs show. Radial gullies score the upper slopes, and in early
   July the last snow lies in some of them: a run of long streaks down the
   north-west flank on the left, one long one down the face just left of
   the middle, a few short ones on the sunny side. Fifty kilometres of air
   turn it the deep blue of the photographs, and a hazier layer under
   2,900 metres pales its lower half.
   The cloud is a height field traced from its top: cells a few hundred
   metres across heaped of rounded puffs, a bank of them twenty-six
   kilometres out, heaps of cumulus here and there, lying thick about
   Fuji's foot. A summit of the Minobu hills over the Fuji River stands
   out of it on the left as a dark forested island, wrapped in mist where
   the cloud meets it. In the lower left is a spur of the ridge the eye
   stands on, two knolls of broken grey-brown rock on its crest and its
   flanks under mats of dwarf pine.
   By day the sun stands in the south-south-east, high on the right, the
   sky a deep blue over a pale haze on the cloud, the cloud brilliant. At
   dusk the sun is setting behind the eye, so the west face of Fuji and
   the cloud glow pink-red, the Aka-Fuji, against the blue-grey band of the
   earth's shadow with the pink belt of Venus over it. At night the moon
   is behind the eye on the right: it lights the snow streaks and silvers
   the cloud under the stars, Fuji dark against the glow low in the sky,
   and up its north flank climbers' lamps make a faint zigzag to the huts
   and the summit (the real trails lie just behind the skylines from the
   west; the lamps are brought onto the face that can be seen). While the
   looks turn between the sun and the moon the light dims and the sky goes
   to twilight blue, so a turn never flashes through day. The tall frame
   turns to Fuji and sets it under the name. WebGL2, no libraries, no
   build step. */

window.CONCEPT = {
  id: 'summit',
  theme: { day: '#5482cd', dusk: '#b89ab9', night: '#0f1223' },
  t0: 40,
  frag: `
#define DEG 0.0174532925

/* the world, in metres: x to the right of the line to Fuji, z along it,
   y the height over the sea. The eye stands on the ridge at EYE; Fuji's
   crater is FJ out along the line */
const float EYE = 2950.0;
const float RE = 7.4e6;          /* the earth's radius, lengthened by refraction */
const vec2 FJ = vec2(0.0, 54000.0);
const float DECK = 2040.0;       /* the cloud's mean top */
const float CTOP = 2700.0;       /* no cloud or island rises above this */
const float RIM = 420.0;         /* the crater rim's radius */

float T, ASP, WIDE, PA, KEY, SK, HOR;
vec3 LD, LC, AMB, CUP, AIRN, AIRF, CT;
vec2 DRIFT;
vec3 FA, FB;
vec2 FDIR, FNRM;
float FLEN;

float sq(float x) { return x * x; }
float smax(float a, float b, float k) {
  float h = sat(0.5 + 0.5 * (a - b) / k);
  return mix(b, a, h) + k * h * (1.0 - h);
}
vec3 dirAE(float az, float el) {
  az *= DEG; el *= DEG;
  return vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el));
}
float hg(float mu, float g) {
  return 0.0796 * (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
}
float ridged(vec2 p) { return 1.0 - abs(2.0 * noise(p) - 1.0); }
float billow(vec2 p) { float v = 2.0 * noise(p) - 1.0; return sqrt(v * v + 0.02); }
/* a billow made a puff: rounded and full on top, steep into the creases */
float puff(vec2 p) { float v = 2.0 * noise(p) - 1.0; return sqrt(sqrt(v * v + 0.025)); }
float drop(vec2 x) { return dot(x, x) / (2.0 * RE); }
float adiff(float a, float b) { float d = a - b; return d - TAU * floor(d / TAU + 0.5); }

/* ------------------------------------------------------------ the air */
/* the sky of each look, by the height over the cloud's horizon, which
   lies HOR degrees under the eye. By day a pale haze on the cloud deepens
   within a few degrees to the blue of the height. At dusk the eye looks
   away from the setting sun: the earth's shadow lies blue-grey along the
   horizon, the belt of Venus pink over it, fading up to lavender and
   blue. At night a faint glow on the horizon under a dark sky. While a
   turn dims the light, the day's and dusk's skies dim with it */

vec3 sky(vec3 rd) {
  float e = asin(clamp(rd.y, -1.0, 1.0)) / DEG;
  float x = max(e + HOR, 0.0);
  float az = atan(rd.x, rd.z);
  vec3 d = mix(vec3(0.29, 0.335, 0.48), vec3(0.18, 0.26, 0.54), 1.0 - exp(-x / 1.0));
  d = mix(d, vec3(0.085, 0.175, 0.54), smoothstep(1.0, 6.0, x));
  d = mix(d, vec3(0.045, 0.11, 0.42), smoothstep(5.0, 16.0, x));
  d *= 1.0 + 0.1 * sin(az + 0.3);
  /* the earth's shadow from the horizon to three degrees, the belt over
     it highest about six degrees up, then dusky lavender and blue */
  float sh = smoothstep(2.3, 4.2, x);
  vec3 u = mix(vec3(0.16, 0.16, 0.24), vec3(0.10, 0.11, 0.20), smoothstep(0.0, 1.6, x));
  u = mix(u, vec3(0.60, 0.23, 0.27), sh);
  u = mix(u, vec3(0.30, 0.19, 0.31), smoothstep(6.5, 11.0, x));
  u = mix(u, vec3(0.13, 0.13, 0.28), smoothstep(10.0, 18.0, x));
  /* the belt is brightest about the point opposite the sun, ten degrees
     to the right of Fuji */
  u *= 1.0 + 0.18 * cos(az - 0.17) * sh;
  /* as the light dims in a turn to night, the belt fades and the sky
     goes to the deep blue of twilight */
  u = mix(mix(vec3(0.07, 0.085, 0.17), vec3(0.03, 0.045, 0.12), smoothstep(0.0, 10.0, x)), u, KEY);
  /* a thin brighter haze along the cloud's horizon itself */
  float hz = exp(-x / 0.45);
  d += hz * vec3(0.06, 0.06, 0.06);
  u += hz * vec3(0.03, 0.03, 0.04);
  vec3 n = mix(vec3(0.024, 0.031, 0.056), vec3(0.002, 0.004, 0.015), 1.0 - exp(-x / 4.0));
  return look3(d * SK, u * SK, n);
}

/* faint layers of haze lying over the horizon behind Fuji, drawn out
   along it */
vec3 haze(vec3 rd, vec3 c) {
  float x = asin(rd.y) / DEG + HOR;
  if (x < -0.1 || x > 4.0) return c;
  float az = atan(rd.x, rd.z) / DEG;
  vec2 p = vec2(az * 0.22, x * 2.2);
  p.y += 0.25 * noise(vec2(az * 0.05, 3.0));
  float n = fbm(p * vec2(1.0, 3.0), 4);
  float m = smoothstep(0.55, 0.8, n) * exp(-sq((x - 0.7) / 0.7));
  vec3 col = vec3(0.42, 0.43, 0.50) * SK;
  return mix(c, col, m * 0.25 * uLook.x);
}

/* a thin sheet of cirrostratus six kilometres over the eye, drawn out by
   the wind into the long streaks the photographs show across the sky,
   foreshortened toward the horizon; pink at dusk, unseen at night */
vec3 cirrus(vec3 rd, vec3 c) {
  float w = look3(1.0, 0.8, 0.0);
  if (rd.y < 0.01 || w <= 0.0) return c;
  vec2 p = rd.xz / rd.y * 6.0 + vec2(0.012, 0.004) * T;
  vec2 q = vec2(dot(p, vec2(0.96, 0.28)), dot(p, vec2(-0.28, 0.96))) * vec2(0.03, 0.11);
  q.y += 0.8 * noise(q * vec2(0.4, 0.2) + 3.0);
  float f = fbm(q + vec2(0.0, 5.0), 4);
  float m = smoothstep(0.42, 0.8, f) * smoothstep(0.3, 0.6, noise(p * 0.01 + 2.0));
  m *= smoothstep(0.04, 0.09, rd.y);
  vec3 col = look3(vec3(0.62, 0.68, 0.80), vec3(0.95, 0.42, 0.45), vec3(0.0)) * SK;
  return mix(c, col, m * 0.4 * w);
}

/* what the air between lays over what is seen through it: a blue,
   strongest in the blue, the sky's own colour along the horizon, and in a
   haze under 2,900 metres a little more of it. At dusk the air before
   Fuji is still in the sun, and pink */
vec3 aerial(vec3 col, vec3 rd, float t, float y) {
  vec3 sig = look3(vec3(11.0, 14.8, 22.0), vec3(11.0, 14.8, 22.0), vec3(15.5, 17.0, 20.0)) * 1e-6;
  float hz = 1.0 + 0.5 * smoothstep(2930.0, 2850.0, y);
  vec3 tr = exp(-sig * t * hz);
  /* the photographs order their distances so: the near ranges dark, the
     far cone the deep blue; the air's glow is taken to build up over the
     first fifty kilometres */
  vec3 air = mix(AIRN * mix(0.35, 1.0, smoothstep(15000.0, 50000.0, t)), AIRF, smoothstep(45000.0, 115000.0, t));
  return col * tr + air * (1.0 - tr);
}

/* ------------------------------------------------------------ Fuji */
/* the crater rim's height about the crater by the bearing from its
   middle, a, 0 along the line from the eye and positive to the right
   (bearing a + 110 degrees). Its named tops stand where they stand:
   Kengamine, 3,776 m, on the south-west, front right from here;
   Hakusan-dake on the north, front left; Kusushi and Izu-dake behind;
   Komagatake and Mishima-dake on the south-east and south; the rim dips
   where the Osawa ravine heads, on the west */
float rimH(float a) {
  float h = 3712.0;
  h += 64.0 * exp(-sq(adiff(a, 115.0 * DEG) / (17.0 * DEG)));
  h += 44.0 * exp(-sq(adiff(a, -110.0 * DEG) / (18.0 * DEG)));
  h += 22.0 * exp(-sq(adiff(a, -65.0 * DEG) / (14.0 * DEG)));
  h += 37.0 * exp(-sq(adiff(a, -15.0 * DEG) / (16.0 * DEG)));
  h += 16.0 * exp(-sq(adiff(a, 28.0 * DEG) / (14.0 * DEG)));
  h += 22.0 * exp(-sq(adiff(a, 72.0 * DEG) / (14.0 * DEG)));
  h -= 26.0 * exp(-sq(adiff(a, 155.0 * DEG) / (9.0 * DEG)));
  return h + 10.0 * (noise(vec2(cos(a), sin(a)) * 3.0 + 4.0) - 0.5);
}

struct Fj { float r, a, wl, gv, gk; };

/* the cone: by the photographs' outline, the flank on the right (south)
   drops at 0.70 from the rim and straightens to 0.53 by the cloud; the
   one on the left (north) starts at 0.62 with a shoulder under the rim
   and flares out to a quarter by the cloud. Radial gullies score it, the
   Osawa ravine cuts the west face */
float fujiH(vec2 q, float t, out Fj F) {
  float r = length(q);
  float a = atan(q.x, q.y);
  float d = max(r - RIM, 0.0);
  float wl = smoothstep(-0.35, 0.9, -q.x / max(r, 1.0));
  float er = rimH(a);
  float hR = er - 0.70 * d / (1.0 + d / 17450.0);
  hR = smax(hR, 2200.0 - 0.14 * d, 120.0);
  float hL = er - 0.65 * d / (1.0 + d / 6400.0) + 60.0 * exp(-sq((d - 560.0) / 260.0));
  float h = mix(hR, hL, wl);
  if (r < RIM) h = er - 230.0 * pow(max(1.0 - sq(r / RIM), 0.0), 0.8);
  /* the Osawa-kuzure: two kilometres long, a few hundred metres across
     and up to 150 deep, from just under the rim */
  float lat = r * adiff(a, 155.0 * DEG + 0.00003 * d);
  float W = 200.0 - 0.045 * d;
  h -= 60.0 * smoothstep(0.0, 300.0, d) * smoothstep(2600.0, 1100.0, d) * (1.0 - smoothstep(0.1 * W, 1.4 * W, abs(lat)));
  /* the radial gullies, wandering a little as they run down */
  const float N = 76.0;
  float u = a * N / TAU + 1.4 * (noise(vec2(r / 1100.0, 0.0) + vec2(cos(a), sin(a)) * 2.0) - 0.5) + 0.5 * (noise(vec2(r / 380.0, a * 7.0)) - 0.5);
  float k = floor(u), f = fract(u) - 0.5;
  k = mod(k, N);
  float hk = hash11(k * 1.37 + 17.0);
  float gw = 14.0 + 24.0 * hk + 0.012 * d;
  float gv = exp(-sq(f * TAU * r / N / gw));
  h -= (1.0 + 3.0 * hk) * smoothstep(0.0, 250.0, d) * smoothstep(4200.0, 1800.0, d) * gv;
  /* a little grain, where it can be seen */
  float kd = smoothstep(90000.0, 50000.0, t);
  if (kd > 0.0) h += kd * 14.0 * (fbm(q / 260.0, 3) - 0.5);
  F = Fj(r, a, wl, gv, k);
  return h;
}

vec2 circ(vec2 o, vec2 d, vec2 c, float r) {
  vec2 oc = o - c;
  float a = max(dot(d, d), 1e-8), b = dot(oc, d), k = dot(oc, oc) - r * r;
  float disc = b * b - a * k;
  if (disc < 0.0) return vec2(1e9, -1e9);
  disc = sqrt(disc);
  return vec2((-b - disc) / a, (-b + disc) / a);
}

float traceFuji(vec3 ro, vec3 rd, out vec2 near) {
  near = vec2(1e9, -1.0);
  vec2 s = circ(ro.xz, rd.xz, FJ, 6500.0);
  if (s.y < 0.0) return -1.0;
  float t = max(s.x, 0.0), lt = t;
  /* a ray already under the cloud's tops where it reaches the mountain
     can only find cloud */
  vec3 pe = ro + rd * t;
  if (pe.y + drop(pe.xz) < DECK) return -1.0;
  Fj F;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    float c = p.y + drop(p.xz) - fujiH(p.xz - FJ, t, F);
    if (c < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 6; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y + drop(q.xz) - fujiH(q.xz - FJ, m, F) < 0.0) b = m; else a = m;
      }
      return b;
    }
    float cn = c / (t * PA);
    if (cn < near.x) near = vec2(cn, t);
    if (p.y > 3900.0 && rd.y > 0.0) break;
    lt = t;
    t += max(c * 1.3, t * 0.0003);
    if (t > s.y) break;
  }
  return -1.0;
}

/* the snow left in early July: in some of the gullies, longest on the
   north and west away from the summer sun, a few patches up by the rim,
   and down the floor of the Osawa */
float fujiSnow(Fj F, float h) {
  float hk = hash11(F.gk * 1.71 + 3.1), hl = hash11(F.gk * 0.73 + 9.4);
  /* which gullies hold it, as the photographs from the west show: a
     run of long streaks down the north-west flank on the left, one long
     one down the face just left of the middle, a few short ones and
     patches on the sunny south-west to the right */
  float nw = exp(-sq(adiff(F.a, -125.0 * DEG) / (20.0 * DEG)));
  float fc = exp(-sq(adiff(F.a, -163.0 * DEG) / (7.0 * DEG)));
  float p = 0.1 + 0.75 * nw + 0.6 * fc;
  float on = step(1.0 - p, hk);
  float top = 3700.0 - 90.0 * hash11(F.gk + 5.0);
  float len = mix(220.0, 760.0, hl) * (0.35 + 0.65 * max(nw, fc));
  float low = top - len;
  float run = sat((h - low) / len);
  float s = on * smoothstep(low, low + 50.0, h) * smoothstep(top, top - 40.0, h);
  s *= smoothstep(mix(0.75, 0.15, run), 0.9, F.gv);
  /* broken here and there along its length */
  s *= smoothstep(0.2, 0.32, noise(vec2(F.gk * 3.1, F.r / 210.0)));
  /* a dotted line of patches down the floor of the Osawa ravine */
  float ol = F.r * adiff(F.a, 155.0 * DEG + 0.00003 * max(F.r - RIM, 0.0));
  s = max(s, (1.0 - smoothstep(12.0, 30.0, abs(ol))) * smoothstep(3080.0, 3160.0, h) * step(h, 3660.0) * smoothstep(0.5, 0.62, noise(vec2(F.r / 70.0, 3.0))));
  /* a few patches up by the rim */
  s = max(s, smoothstep(3660.0, 3720.0, h) * smoothstep(0.74, 0.84, noise(vec2(F.a * 16.0, h / 30.0))) * 0.7);
  return s;
}

/* at night, the lamps of climbers on the Yoshida trail where it climbs
   the north-east flank, near the left skyline from here: a dotted
   zigzag, the huts of the seventh and eighth stations steadier and
   warmer, and the summit huts on the rim */
vec3 trail(Fj F, float h, float t) {
  if (h < 2300.0 || h > 3800.0) return vec3(0.0);
  float a0 = -127.0 * DEG + 0.00002 * (F.r - 2000.0);
  float lat = F.r * adiff(F.a, a0);
  float leg = 70.0;
  float zz = 75.0 * (abs(fract(h / (2.0 * leg)) * 2.0 - 1.0) * 2.0 - 1.0);
  float fp = max(t * PA * 0.6, 3.0);
  float dl = abs(lat - zz) * 0.6;
  float line = exp(-sq(dl / fp));
  float i = floor(h / 9.0);
  float on = step(0.5, hash11(i * 0.71 + floor(T * 0.15 + hash11(i) * 3.0) * 0.37));
  float dot_ = line * on * exp(-sq((fract(h / 9.0) - 0.5) * 9.0 / fp));
  vec3 c = vec3(1.0, 0.86, 0.66) * dot_ * 0.5;
  /* huts */
  float hut = 0.0;
  for (int j = 0; j < 7; j++) {
    float hh = j < 4 ? 2720.0 + 80.0 * float(j) : 3130.0 + 110.0 * float(j - 4);
    float lh = 75.0 * (abs(fract(hh / (2.0 * leg)) * 2.0 - 1.0) * 2.0 - 1.0) + 30.0;
    hut += exp(-(sq((h - hh) / fp) + sq((lat - lh) * 0.6 / fp)));
  }
  c += vec3(1.0, 0.72, 0.42) * hut * 2.4;
  /* the summit huts, on the rim behind the left top */
  float sl = F.r * adiff(F.a, -100.0 * DEG);
  c += vec3(1.0, 0.78, 0.5) * 1.2 * exp(-(sq((h - 3735.0) / fp) + sq(sl * 0.4 / fp))) * step(abs(F.r - RIM), 160.0);
  return c * smoothstep(3770.0, 3700.0, h - 30.0 * step(F.r, RIM + 160.0));
}

/* ---------------------------------------------------------- the cloud */
/* the deck as the photographs from the ridge show it. Its base rises and
   falls in broad banks drawn out across the view, rows a few kilometres
   deep that recede as layers; towers of cumulus stand a few hundred
   metres out of it here and there; and all of it is heaped of billows of
   every size, folded noise warped about so no two are alike, heaped
   higher in some reaches than in others. About Fuji's foot it lies thick
   and even. In one place, thirty kilometres out under the mountain, it
   thins and breaks, and the ridges under it show blue through the gap */

const vec2 GC = vec2(-300.0, 29500.0);

/* .x the base height, .y how high the billows heap there, .z the gap */
vec3 deckBase(vec2 x, vec2 w) {
  float b1 = noise(vec2(w.x / 12000.0, w.y / 4200.0) + vec2(2.0, 0.0));
  float b2 = noise(vec2(w.x / 6000.0, w.y / 2100.0) + vec2(7.0, 3.0));
  float base = DECK + 190.0 * (b1 - 0.5) + 80.0 * (b2 - 0.5);
  float far = smoothstep(90000.0, 55000.0, length(x));
  float foot = exp(-max(length(x - FJ) - 6500.0, 0.0) / 3500.0);
  float tw = smoothstep(0.64, 0.9, noise(w / 1800.0 + 3.0)) * (1.0 - foot) * far;
  float am = 0.4 + 0.7 * smoothstep(0.25, 0.75, noise(w / 4500.0 + 5.0)) + 1.1 * tw;
  base += 110.0 * tw;
  base = mix(base, DECK + 60.0, foot);
  am = mix(am, 0.5, foot);
  vec2 g = (x - GC) / vec2(2300.0, 4200.0);
  float gap = 0.0;
  return vec3(base, am, gap);
}

/* the lobes of the cloud: a union of spherical caps on a jittered grid,
   each cell holding one of its own radius and height, s the cell's size
   in metres. Where two meet they are joined by a soft fold, not a crease.
   .x the height over the base, .y how high up its own lobe the point is,
   1 on its crown and 0 where it meets the next */
vec2 lobes(vec2 p, float s, vec2 rr, vec2 pk, float seed) {
  vec2 g = p / s;
  vec2 i = floor(g), f = fract(g);
  /* only the upper part of each sphere shows over the floor, so no lobe
     stands on a vertical wall */
  float h = pk.x - 0.42 * rr.y, u = 0.0, best = -1e4;
  float k = 0.2 * rr.x;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 c = vec2(float(x), float(y));
    vec3 r = hash33(vec3(i + c, seed));
    vec2 d = (c + 0.15 + 0.7 * r.xy - f) * s;
    float R = mix(rr.x, rr.y, r.z);
    float top = mix(pk.x, pk.y, hash12(i + c + seed * 1.7));
    float z = sqrt(max(R * R - dot(d, d), 0.0));
    float cap = top - R + z;
    if (cap > best) { best = cap; u = z / R; }
    h = smax(h, cap, k);
  }
  return vec2(h, u);
}

float cloudH(vec2 x, float fp, out float ao) {
  vec2 w = x + DRIFT;
  vec3 B = deckBase(x, w);
  /* far out the deck flattens into a smooth bright band */
  float far = mix(1.0, 0.2, smoothstep(18000.0, 42000.0, length(x)));
  /* big lobes of three to six hundred metres on the banks and towers */
  vec2 L1 = lobes(w, 400.0, vec2(170.0, 320.0), vec2(20.0, 150.0), 3.0);
  float h = B.x + B.y * far * L1.x;
  ao = L1.y;
  /* and small ones of sixty to a hundred and fifty on those */
  float k2 = smoothstep(60.0, 25.0, fp);
  if (k2 > 0.0) {
    vec2 L2 = lobes(w + 37.0, 105.0, vec2(42.0, 80.0), vec2(0.0, 24.0), 7.0);
    h += k2 * B.y * far * smax(L2.x, 0.0, 6.0);
    ao *= mix(1.0, 0.45 + 0.55 * L2.y, k2);
  }
  ao = mix(ao, 0.6, 1.0 - far);
  return -smax(-h, -(CTOP - 15.0), 25.0);
}

/* fine lumps, for the shading only: none, the small lobes carry it */
float cloudFine(vec2 x, float fp) { return 0.0; }

/* the ridges under the gap, forested, crests across the view */
float terrainH(vec2 x) {
  float h = 900.0;
  if (abs(x.y - GC.y) < 4500.0 && abs(x.x - GC.x) < 3000.0) {
    for (int k = 0; k < 2; k++) {
      float z0 = GC.y + (k == 0 ? -1200.0 : 1600.0) + 600.0 * (noise(vec2(x.x / 2500.0, float(k) * 7.0)) - 0.5);
      float crest = (k == 0 ? 1900.0 : 2000.0) + 120.0 * (noise(vec2(x.x / 700.0, float(k) * 3.0 + 1.0)) - 0.5) + 35.0 * (ridged(vec2(x.x / 220.0, float(k))) - 0.5);
      float dz = abs(x.y - z0);
      h = max(h, crest - 0.5 * dz + 4.0 * noise(x / 15.0));
    }
  }
  return h;
}

float farH(vec2 x, float fp, out float mat, out float cav) {
  float c = cloudH(x, fp, cav);
  float g = terrainH(x);
  mat = g - c;
  return max(c, g) - drop(x);
}

float traceFar(vec3 ro, vec3 rd, float tmax, out float mat, out vec2 nearL) {
  mat = -1.0;
  nearL = vec2(1e9, -1.0);
  /* where the ray, over the curve of the earth, comes under the highest
     cloud and where it rises out again; a ray over the horizon never
     does */
  float A = 0.5 / RE;
  float disc = rd.y * rd.y - 4.0 * A * (ro.y - CTOP);
  if (rd.y >= 0.0 || disc < 0.0) return -1.0;
  disc = sqrt(disc);
  float t = max((-rd.y - disc) / (2.0 * A), 200.0);
  float t1 = min(tmax, (-rd.y + disc) / (2.0 * A));
  if (t > t1) return -1.0;
  float lt = t, cav, c = 1e9;
  float fk = PA / max(-rd.y, 0.008);
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    c = p.y - farH(p.xz, t * fk, mat, cav);
    /* how near the ray passes over an island standing out of the cloud,
       in pixels, for its skyline */
    if (mat > -40.0) {
      float cl = (c + max(-mat, 0.0)) / (t * PA);
      if (cl < nearL.x) nearL = vec2(cl, t);
    }
    if (c < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 5; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - farH(q.xz, m * fk, mat, cav) < 0.0) b = m; else a = m;
      }
      return b;
    }
    lt = t;
    /* far out, where the deck's detail has gone under a pixel, it is
       crossed in bolder steps */
    t += max(c / (mix(1.0, 0.3, smoothstep(14000.0, 45000.0, t)) + max(-rd.y, 0.0)), mat > -40.0 ? t * PA * 2.0 : t * mix(0.0012, 0.0025, smoothstep(25000.0, 40000.0, t)) + 1.0);
    if (t > t1) return -1.0;
  }
  /* a ray still skimming the tops when the steps run out has found the
     cloud, near enough */
  return c < 25.0 + 0.0015 * t ? t : -1.0;
}

/* ------------------------------------------------------- the islands */
/* the tops of two ranges between, standing out of the cloud one behind
   the other on the left: the nearer Minobu hills twenty-four kilometres
   out and the Tenshi range beyond at thirty-six. From so far each is its
   skyline: the crest's heights along it, a few tops and rocky notches,
   and the ragged line of the forest on it */
float islandY(float x, float c, float hw, float top, float seed) {
  float u = (x - c) / hw;
  float y = top - 300.0 * u * u - 40.0 * u;
  y += 190.0 * (noise(vec2(x / 650.0, seed)) - 0.5) + 85.0 * (ridged(vec2(x / 240.0, seed + 1.0)) - 0.6) + 26.0 * (noise(vec2(x / 70.0, seed + 4.0)) - 0.5);
  return y + 7.0 * noise(vec2(x / 13.0, seed + 2.0)) + 4.0 * noise(vec2(x / 5.0, seed + 3.0));
}

/* a ray against an island's plane: .x its coverage, .y the distance,
   .z how far under the skyline it passes, .w where along it */
vec4 island(vec3 ro, vec3 rd, float d, float c, float hw, float top, float seed) {
  if (rd.z <= 0.0) return vec4(0.0);
  float t = (d - ro.z) / rd.z;
  float x = ro.x + rd.x * t;
  if (abs(x - c) > hw * 1.25) return vec4(0.0);
  float yr = ro.y + rd.y * t + drop(vec2(x, d));
  float dd = islandY(x, c, hw, top, seed) - yr;
  return vec4(sat(dd / (t * PA) + 0.5), t, dd, x);
}

vec3 shadeIsland(vec3 ro, vec3 rd, vec4 I, float d, float seed) {
  float x = I.w, yr = ro.y + rd.y * I.y + drop(vec2(x, d));
  /* forest, mottled the same every way */
  float m = 0.6 * noise(vec2(x, yr) / 45.0 + seed) + 0.4 * noise(vec2(x, yr) / 14.0);
  vec3 alb = vec3(0.022, 0.034, 0.026) * (0.6 + 0.8 * m);
  vec3 col = alb * (LC / PI * 0.5 + AMB * 0.9);
  /* lower down it recedes into the mist over the cloud, and wisps of
     cloud trail along its foot */
  float ao;
  float ch = cloudH(vec2(x, d), 1e4, ao) - drop(vec2(x, d));
  vec3 mist = (LC / PI * 0.6 * CT + AMB * 1.3);
  col = mix(col, look3(vec3(0.17, 0.23, 0.38), vec3(0.20, 0.15, 0.26), vec3(0.008, 0.011, 0.022)) * look3(SK, SK, 1.0), smoothstep(60.0, 400.0, I.z) * 0.4);
  float wisp = (1.0 - smoothstep(0.0, 45.0, yr - ch)) * smoothstep(0.5, 0.8, noise(vec2(x / 110.0 + T * 0.004, yr / 14.0)) * (0.6 + 0.6 * noise(vec2(x / 600.0, 3.0))));
  return mix(col, mist, wisp * 0.75);
}

/* the next ridge back beyond the spur, two and a half kilometres off,
   stepping down into the haze where it meets the cloud. Its skyline is
   laid into each frame's corner as the spur is: P is where it passes,
   in degrees, and how steeply it falls to the right */
const float DB = 6000.0;
float ridgeBEl(float az) {
  vec3 P = mix(vec3(-5.15, -3.1, -0.75), vec3(-9.0, -2.25, -0.33), WIDE);
  float a = az / DEG, d = a - P.x;
  float e = P.y * DEG + mix(-0.1, P.z, smoothstep(-0.8, 0.8, d)) * d * DEG;
  float xm = az * DB;
  e += (70.0 * (noise(vec2(xm / 600.0, 5.0)) - 0.5) + 28.0 * (ridged(vec2(xm / 180.0, 6.0)) - 0.5)) / DB;
  return e + (5.0 * noise(vec2(xm / 16.0, 7.0)) + 2.5 * noise(vec2(xm / 6.0, 8.0))) / DB;
}

vec3 shadeRidgeB(vec3 rd, float dd) {
  float az = atan(rd.x, rd.z);
  vec2 f = vec2(az * DB, asin(rd.y) * DB);
  float m = 0.5 * noise(f / 14.0) + 0.3 * noise(f / 5.0 + 3.0) + 0.2 * noise(f / 60.0);
  vec3 alb = vec3(0.012, 0.02, 0.015) * (0.5 + 1.0 * m);
  vec3 col = alb * (LC / PI * 0.4 + AMB * 0.9);
  col = mix(col, look3(vec3(0.15, 0.21, 0.35), vec3(0.18, 0.13, 0.22), vec3(0.007, 0.01, 0.02)) * look3(SK, SK, 1.0), 0.15 + 0.6 * smoothstep(20.0, 500.0, dd));
  return col;
}

/* ---------------------------------------------------------- the ridge */
/* a spur of the ridge the eye stands on, crossing the lower left: its
   crest broken grey-brown rock, its flanks under dwarf pine. s runs
   along the crest from FA, n out from it toward the eye */

struct Rg { float s, n, an; };

float ridgeBase(vec2 x, out Rg R) {
  vec2 d = x - FA.xz;
  float s = dot(d, FDIR), n = dot(d, FNRM);
  /* the crest falls from FA to FB and on beyond it; back toward the eye
     it levels off */
  float kS = (FB.y - FA.y) / FLEN;
  float cy = FA.y - 0.08 * s + (kS + 0.08) * 25.0 * log(1.0 + exp(s / 25.0));
  cy += 7.0 * (noise(vec2(s / 70.0, 1.0)) - 0.5);
  /* two rocky knolls on the crest */
  cy += 9.0 * exp(-sq((s - 55.0) / 26.0)) + 6.0 * exp(-sq((s - 175.0) / 20.0));
  float an = sqrt(n * n + 16.0) - 4.0;
  float fall = n > 0.0 ? an * 0.95 : an * 0.7;
  float rib = ridged(vec2(s / 60.0, n / 80.0) + 2.0);
  R = Rg(s, n, an);
  return cy - fall + 5.0 * (rib - 0.5) * sat(an / 12.0);
}

/* broken rock: blocks of no set shape, each set out or back and tilted
   its own way, the joints between them grooved. Returns the offset */
float facets(vec2 f, vec2 cell, float amp) {
  vec2 p = f / cell;
  vec2 i = floor(p), fr = fract(p);
  float d1 = 9.0, d2 = 9.0;
  vec2 best = vec2(0.0), bc = vec2(0.0);
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 r = g + hash22(i + g) - fr;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; best = i + g; bc = r; }
    else if (d < d2) d2 = d;
  }
  vec3 hs = hash33(vec3(best, 7.0));
  vec2 lp = -bc * cell;
  float h = (hs.x - 0.5) * amp + lp.x * (hs.y - 0.5) * 0.35 + lp.y * (hs.z - 0.6) * 0.35;
  h -= amp * 0.35 * (1.0 - smoothstep(0.0, 0.14, sqrt(d2) - sqrt(d1)));
  return h;
}

/* the dwarf pine: low mats of rounded clumps */
float mats(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float h = 0.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 c = g + hash22(i + g) - f;
    float rr = 0.6 + 0.4 * hash12(i + g + 7.0);
    h = max(h, sqrt(max(rr * rr - dot(c, c), 0.0)));
  }
  return h;
}

float rockMask(Rg R) {
  float m = smoothstep(0.8, 0.86, noise(vec2(R.s, R.n) / 14.0 + 3.0));
  m = max(m, exp(-R.an / 2.0) * smoothstep(0.62, 0.72, noise(vec2(R.s / 9.0, 2.0))));
  return sat(m);
}

float ridgeH(vec2 x, float t, out float rock) {
  Rg R;
  float h = ridgeBase(x, R);
  rock = rockMask(R);
  float k1 = smoothstep(2500.0, 900.0, t);
  vec2 f = vec2(R.s, h * 1.2);
  float rk = facets(f, vec2(6.0, 4.0), 2.2) + 0.8;
  if (k1 > 0.0) rk += k1 * facets(f * 1.1 + 40.0, vec2(2.2, 1.6), 0.7);
  float pm = 1.15 * mats(x / 2.6) + 0.6 * mats(x / 7.0 + 3.0);
  return h + mix(pm, rk, rock);
}

float traceRidge(vec3 ro, vec3 rd, out vec2 near) {
  near = vec2(1e9, -1.0);
  vec2 o = ro.xz - FA.xz;
  vec2 os = vec2(dot(o, FDIR), dot(o, FNRM)), ds = vec2(dot(rd.xz, FDIR), dot(rd.xz, FNRM));
  vec2 inv = 1.0 / (abs(ds) + 1e-6) * sign(ds + 1e-9);
  vec2 ta = (vec2(-300.0, -80.0) - os) * inv, tb = (vec2(FLEN + 400.0, 260.0) - os) * inv;
  vec2 tn = min(ta, tb), tf = max(ta, tb);
  float t0 = max(max(tn.x, tn.y), 30.0), t1 = min(min(tf.x, tf.y), 3000.0);
  if (t1 <= t0) return -1.0;
  float t = t0, lt = t0, rk;
  /* how fast the clearance closes along the ray over the near face,
     which is nearly a plane, with a margin for its ribs and the rock; an
     overshoot is caught, since the ray stays under the face once it has
     passed into it */
  float kS = (FB.y - FA.y) / FLEN;
  float rate = max(-rd.y - 0.95 * ds.y + max(kS * ds.x, -0.08 * ds.x), 0.0) + 0.15;
  Rg R;
  for (int i = 0; i < 72; i++) {
    vec3 p = ro + rd * t;
    float c = p.y - ridgeBase(p.xz, R) - 3.5;
    float st = c / rate;
    if (c < 0.3) {
      c = p.y - ridgeH(p.xz, t, rk);
      st = c / (rate + 0.35);
      if (c < t * PA * 0.4) c = -1.0;
    }
    if (c < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 5; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - ridgeH(q.xz, m, rk) < 0.0) b = m; else a = m;
      }
      return b;
    }
    float cn = c / (t * PA);
    if (cn < near.x) near = vec2(cn, t);
    lt = t;
    t += max(st, t * PA);
    if (t > t1) break;
  }
  return -1.0;
}

/* ----------------------------------------------------------- shadows */

/* Fuji's shadow on the cloud, the cone taken as it is from a distance */
float fujiShadow(vec3 p) {
  vec2 lh = normalize(LD.xz + 1e-6);
  float tl = LD.y / max(length(LD.xz), 1e-4);
  vec2 dq = FJ - p.xz;
  float al = dot(dq, lh);
  if (al < 0.0) return 1.0;
  float off = length(dq - lh * al);
  float y = p.y + al * tl;
  float girth = max(3776.0 - y, 0.0) / 0.62 + RIM;
  return smoothstep(girth * 0.85, girth * 1.1 + 150.0, off);
}

float cloudShadow(vec3 p, float far) {
  /* started clear of the surface, so the hit's own small error does not
     speckle it */
  float s = 1.0, t = 70.0, cav;
  p.y += 10.0;
  int n = far > 20000.0 ? 5 : 8;
  vec3 l = normalize(vec3(LD.x, max(LD.y, 0.03), LD.z));
  for (int i = 0; i < 8; i++) {
    vec3 q = p + l * t;
    if (q.y > CTOP || i >= n) break;
    float h = cloudH(q.xz, 1e4, cav) - drop(q.xz);
    s = min(s, sat(0.5 + (q.y - h) / (0.14 * t + 30.0)));
    t *= 1.85;
  }
  return s;
}

/* ------------------------------------------------------------- shading */

/* the differences are taken a pixel's reach apart each way: across the
   view a pixel, along it the foreshortened reach */
vec3 farNormal(vec3 p, float t, float fp, out float mat, out float cav) {
  float ex = max(1.5, t * PA * 1.2), ez = max(ex, fp);
  vec3 hh;
  for (int k = 0; k < 3; k++) {
    vec2 x = p.xz + (k == 0 ? vec2(ex, 0.0) : (k == 1 ? vec2(0.0, ez) : vec2(0.0)));
    float h = farH(x, fp, mat, cav);
    hh[k] = h + (mat > 0.0 ? 0.0 : cloudFine(x, fp));
  }
  /* the cloud's light diffuses under its skin, so its shading is softer
     than a hard surface's: the slopes are taken at two thirds */
  return normalize(vec3((hh.z - hh.x) / ex * (mat > 0.0 ? 1.0 : 1.0), 1.0, (hh.z - hh.y) / ez * (mat > 0.0 ? 1.0 : 1.0)));
}

/* cloud is lit as cloud and not as a surface: the light wraps round it,
   since it diffuses inside; the sides away from the sun glow with what
   comes through, and are never dark holes; the sunlit tops turning away
   from the eye take a silver edge; and the troughs between the billows,
   where less of the sky reaches, go a soft blue-grey. ao is 1 on the
   tops and 0 deep in the troughs */
vec3 shadeCloud(vec3 ro, vec3 rd, float t, vec3 n, float ao) {
  vec3 p = ro + rd * t;
  float sh = mix(0.5, 1.0, cloudShadow(p, t)) * fujiShadow(p);
  vec3 l = normalize(vec3(LD.x, max(LD.y, 0.02), LD.z));
  float dif = pow(sat(dot(n, l) * 0.5 + 0.5), 1.5);
  vec3 sun = LC / PI * dif * sh * (0.42 + 0.58 * ao);
  /* light through a lobe's thin edge where it stands against the deck
     behind it */
  float rim = pow(1.0 - sat(dot(n, -rd)), 4.0) * smoothstep(0.8, 0.3, n.y);
  sun += LC / PI * 0.22 * rim * sh * ao;
  vec3 col = sun * CT;
  col += AMB * (0.5 + 0.5 * n.y) * (0.4 + 0.6 * ao) * 1.15;
  return col;
}

/* the islands and the ranges seen in the gaps: forest, dark */
vec3 shadeLand(vec3 ro, vec3 rd, float t, vec3 n, float mat) {
  vec3 p = ro + rd * t;
  float y = p.y + drop(p.xz);
  vec3 alb = vec3(0.032, 0.05, 0.036) * (0.6 + 0.5 * noise(p.xz / 160.0) + 0.3 * noise(p.xz / 35.0));
  /* under the deck the light is the cloud's grey, and the air in the
     valleys between the banks is thick with haze, the more the deeper */
  float under = smoothstep(DECK - 60.0, DECK - 400.0, y);
  float dif = max(dot(n, LD), 0.0) * (1.0 - 0.7 * under);
  vec3 c = alb * (LC / PI * dif + AMB * (0.6 + 0.4 * n.y));
  float vh = sat((DECK - y) / 700.0) * (0.35 + 0.65 * smoothstep(12000.0, 40000.0, t));
  return mix(c, look3(vec3(0.16, 0.24, 0.40), vec3(0.20, 0.13, 0.20), vec3(0.006, 0.009, 0.018)) * look3(SK, SK, 1.0), vh * 0.85);
}

vec3 shadeFuji(vec3 ro, vec3 rd, float t, vec3 n, Fj F) {
  vec3 p = ro + rd * t;
  float h = p.y + drop(p.xz);
  /* black and red-brown scoria high up, forest under the tree line */
  vec3 alb = mix(vec3(0.11, 0.07, 0.058), vec3(0.07, 0.055, 0.05), noise(p.xz / 500.0));
  /* by moonlight the eye sees no colour in the rock */
  alb = mix(alb, vec3(luma(alb)), uLook.z);
  alb = mix(vec3(0.025, 0.035, 0.025), alb, smoothstep(2350.0, 2550.0, h));
  float s = fujiSnow(F, h);
  alb = mix(alb, vec3(0.8, 0.83, 0.88), s);
  vec3 col = alb * (LC / PI * max(dot(n, LD), 0.0) + AMB * (0.55 + 0.45 * n.y) + CUP * 0.05);
  col += uLook.z * trail(F, h, t);
  return col;
}

vec3 shadeRidge(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  float rk;
  float e = max(0.06, t * PA);
  vec3 hh;
  for (int k = 0; k < 3; k++) hh[k] = ridgeH(p.xz + (k == 0 ? vec2(e, 0.0) : (k == 1 ? vec2(0.0, e) : vec2(0.0))), t, rk);
  vec3 n = normalize(vec3(hh.z - hh.x, e, hh.z - hh.y));
  vec3 ng = n;
  float var = noise3(p * 0.4);
  /* dwarf pine: dark green needles, the tops of the clumps catching the
     light, deep shade between them */
  float pm = mats(p.xz / 2.6);
  float needles = noise(p.xz * 3.1) * 0.6 + noise(p.xz * 7.3) * 0.4;
  vec3 pine = mix(vec3(0.0025, 0.0045, 0.0035), vec3(0.009, 0.015, 0.009), smoothstep(0.15, 0.9, pm)) * (0.65 + 0.7 * needles);
  pine *= 0.8 + 0.4 * noise(p.xz / 9.0);
  /* rock: grey-brown, lighter where weathered */
  vec3 rockc = mix(vec3(0.075, 0.068, 0.06), vec3(0.13, 0.118, 0.10), smoothstep(0.35, 0.8, noise3(p * 0.11 + 3.0)));
  rockc *= 0.7 + 0.6 * var;
  vec3 alb = mix(pine, rockc, rk);
  vec3 pp = p * 1.6;
  float b0 = noise3(pp);
  vec3 bump = vec3(noise3(pp + vec3(0.3, 0.0, 0.0)), noise3(pp + vec3(0.0, 0.3, 0.0)), noise3(pp + vec3(0.0, 0.0, 0.3))) - b0;
  n = normalize(n - 1.2 * bump);
  float nl = max(dot(n, LD), 0.0);
  float ao = mix(0.45 + 0.55 * smoothstep(0.0, 0.8, pm), 1.0, rk);
  vec3 col = alb * (LC / PI * nl * ao + AMB * (0.5 + 0.5 * n.y) * ao + CUP * sat(0.5 - 0.5 * n.y) * 0.5);
  float rim = pow(1.0 - sat(dot(ng, -rd)), 4.0);
  col += rim * alb * AMB * 1.2;
  return col;
}

/* ------------------------------------------------------- the night sky */

vec3 stars(vec3 rd) {
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 170.0 : 420.0;
    vec3 c = floor(rd * sc);
    vec3 h = hash33(c + float(k) * 17.0);
    float on = step(k == 0 ? 0.94 : 0.975, h.x);
    vec3 sd = normalize(c + 0.25 + 0.5 * hash33(c + 5.3));
    float d = length(rd - sd);
    float b = on * (k == 0 ? 0.3 + 3.5 * pow(h.y, 6.0) : 0.1 + 0.25 * h.y);
    float r = PA * 0.8;
    float tw = 0.75 + 0.25 * sin(T * (2.0 + 3.0 * h.z) + h.y * 40.0);
    vec3 tint = mix(vec3(1.0, 0.82, 0.65), vec3(0.75, 0.85, 1.0), h.z);
    acc += b * tw * tint * exp(-d * d / (r * r));
  }
  /* fainter near the horizon, through more air */
  return acc * smoothstep(-0.2, 3.0, asin(rd.y) / DEG + HOR);
}

/* ------------------------------------------------------------ the frame */

/* a long lens. A wide frame puts Fuji's summit to the right of the name
   and a little over it; a tall one turns to Fuji and puts it under the
   name. th is the tangent of half the frame's height */
vec3 camera(vec2 fc, out vec3 ro, out float th) {
  th = mix(0.18, 0.07, WIDE);
  vec2 sF = mix(vec2(0.04, -0.15), vec2(0.95, 0.22), WIDE);
  float eS = atan((3776.0 - EYE - drop(FJ)) / FJ.y);
  float pitch = eS - atan(sF.y * th) + uPoint.y * 0.06 * DEG;
  float yaw = -atan(sF.x * th) + uPoint.x * 0.12 * DEG;
  vec2 uv = (fc - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 d = normalize(vec3(uv * th, 1.0));
  float cp = cos(pitch), sp = sin(pitch);
  d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  ro = vec3(uPoint.x * 3.0, EYE + uPoint.y * 0.8, 0.0);
  PA = 2.0 * th / uRes.y;
  return d;
}

void setup() {
  ASP = uRes.x / uRes.y;
  WIDE = smoothstep(0.8, 1.45, ASP);
  T = mod(uTime, 32768.0);
  DRIFT = vec2(-2.1, 0.8) * T;
  HOR = sqrt(2.0 * (EYE - DECK) / RE) / DEG;
  /* the sun high in the south by day; at dusk setting behind the eye, a
     little to the left; the moon behind on the right at night */
  vec3 sunD = dirAE(55.0, 40.0), sunU = dirAE(-170.0, 0.6), moonN = dirAE(120.0, 34.0);
  LD = normalize(look3(sunD, sunU, moonN));
  /* while the sun's weight hands over to the moon's, the light dims, so a
     turn to night passes through dusk and never through a flash of day */
  KEY = max(0.0, 1.0 - 3.8 * (uLook.x + uLook.y) * uLook.z);
  SK = 0.18 + 0.82 * KEY;
  LC = look3(vec3(5.6, 5.35, 4.9), vec3(20.0, 7.0, 4.6) * KEY, vec3(0.8, 1.1, 1.75)) * KEY;
  AMB = look3(vec3(0.14, 0.18, 0.30), mix(vec3(0.03, 0.04, 0.08), vec3(0.075, 0.08, 0.19), KEY), vec3(0.012, 0.017, 0.034)) * look3(SK, SK, 1.0);
  CUP = look3(vec3(1.5, 1.5, 1.55), mix(vec3(0.15, 0.18, 0.3), vec3(0.6, 0.38, 0.36), KEY), vec3(0.08, 0.1, 0.15)) * (0.2 + 0.8 * KEY);
  AIRN = look3(vec3(0.045, 0.16, 0.42), mix(vec3(0.03, 0.05, 0.12), vec3(0.16, 0.07, 0.10), KEY), vec3(0.005, 0.011, 0.03)) * look3(SK, SK, 1.0);
  CT = look3(vec3(1.25), vec3(0.62, 0.78, 0.98), vec3(0.85));
  AIRF = look3(vec3(0.30, 0.34, 0.47), vec3(0.14, 0.14, 0.21), vec3(0.008, 0.013, 0.033)) * look3(SK, SK, 1.0);
  /* the spur, laid into the corner of each frame */
  FA = mix(vec3(-69.7, 2928.5, 645.9), vec3(-130.4, 2934.9, 636.6), WIDE);
  FB = mix(vec3(3.1, 2806.3, 888.5), vec3(-99.1, 2870.2, 941.4), WIDE);
  FDIR = normalize(FB.xz - FA.xz);
  FNRM = vec2(FDIR.y, -FDIR.x);
  FLEN = length(FB.xz - FA.xz);
}

vec3 scene(vec2 fc) {
  setup();
  vec3 ro;
  float th;
  vec3 rd = camera(fc, ro, th);
  vec2 nearR = vec2(1e9, -1.0), nearF = vec2(1e9, -1.0);
  float tR = -1.0;
  if (rd.y < -0.012 && rd.x < 0.04) tR = traceRidge(ro, rd, nearR);
  float aR = tR > 0.0 ? 1.0 : (nearR.x < 1.0 ? 0.5 * (1.0 - nearR.x) : 0.0);
  float tRs = tR > 0.0 ? tR : nearR.y;
  vec3 col = vec3(0.0);
  /* the ridge beyond the spur, and the islands, before what lies behind */
  float az = atan(rd.x, rd.z), el = asin(clamp(rd.y, -1.0, 1.0));
  float ddB = (ridgeBEl(az) - el) * DB;
  float aB = sat(ddB / (DB * PA) + 0.5);
  vec4 I1 = island(ro, rd, 24000.0, -2760.0, 1150.0, 2370.0, 1.0);
  vec4 I2 = island(ro, rd, 36000.0, -5100.0, 1600.0, 2320.0, 4.0);
  if (aR < 1.0 && aB < 1.0) {
    float tF = traceFuji(ro, rd, nearF);
    float aF = tF > 0.0 ? 1.0 : (nearF.x < 1.0 ? 0.5 * (1.0 - nearF.x) : 0.0);
    float tFs = tF > 0.0 ? tF : nearF.y;
    float mat;
    vec2 nearL;
    float tC = traceFar(ro, rd, I1.x >= 1.0 ? I1.y : (I2.x >= 1.0 ? I2.y : (tF > 0.0 ? tF : 1e9)), mat, nearL);
    if (tC > 0.0) {
      float m, cav;
      vec3 p = ro + rd * tC;
      vec3 n = farNormal(p, tC, tC * PA / max(-rd.y, 0.008), m, cav);
      /* where the cloud meets the ridges in the gap it wraps them in mist */
      vec3 cc = shadeCloud(ro, rd, tC, n, cav);
      if (m > -15.0) cc = mix(cc, shadeLand(ro, rd, tC, n, m), smoothstep(-15.0, 30.0, m));
      col = aerial(cc, rd, tC, p.y + drop(p.xz));
      /* a ray that passed within a pixel over a ridge's skyline in the
         gap takes part of its colour */
      if (m < -15.0 && nearL.x < 1.0 && nearL.y < tC - 300.0) {
        vec3 pl = ro + rd * nearL.y;
        vec3 lc = shadeLand(ro, rd, nearL.y, vec3(0.0, 1.0, 0.0), 1.0);
        col = mix(col, aerial(lc, rd, nearL.y, pl.y), 0.5 * (1.0 - nearL.x));
      }
    } else {
      col = cirrus(rd, haze(rd, sky(rd)));
      if (uLook.z > 0.0) col += uLook.z * stars(rd);
      if (aF > 0.0) {
        Fj F;
        vec3 p = ro + rd * tFs;
        vec2 q = p.xz - FJ;
        float e = max(4.0, tFs * PA);
        vec3 hh;
        Fj G;
        hh.x = fujiH(q + vec2(e, 0.0), tFs, G);
        hh.y = fujiH(q + vec2(0.0, e), tFs, G);
        hh.z = fujiH(q, tFs, F);
        vec3 n = normalize(vec3(hh.z - hh.x, e, hh.z - hh.y));
        vec3 fc2 = aerial(shadeFuji(ro, rd, tFs, n, F), rd, tFs, p.y + drop(p.xz));
        col = mix(col, fc2, aF);
      }
    }
    float tCe = tC > 0.0 ? tC : 1e9;
    if (I2.x > 0.0 && I2.y < tCe) col = mix(col, aerial(shadeIsland(ro, rd, I2, 36000.0, 4.0), rd, I2.y, 2300.0), I2.x);
    if (I1.x > 0.0 && I1.y < tCe) col = mix(col, aerial(shadeIsland(ro, rd, I1, 24000.0, 1.0), rd, I1.y, 2300.0), I1.x);
  }
  if (aB > 0.0) col = mix(col, aerial(shadeRidgeB(rd, ddB), rd, DB, EYE), aB);
  if (aR > 0.0) col = mix(col, aerial(shadeRidge(ro, rd, tRs), rd, tRs, EYE), aR);
  return col;
}
`
};
