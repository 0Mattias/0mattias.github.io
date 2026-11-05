/* concepts/scenes/summit.js · above the clouds
   On a summit ridge at four thousand metres, looking out over a sea of
   cloud that lies seven hundred metres below and runs to the horizon,
   where the earth's curve takes it a little under the level of the eye.
   The deck is a height field traced down from its top: domes of cloud a
   few hundred metres across, a few standing up as turrets, smaller lumps
   riding on them, banked up against the peaks, drifting on the wind and
   slowly swelling and settling. It is lit as cloud is and not as ground:
   a soft wrapped light, the light gathered under its skin showing
   through the shaded sides, darker and bluer into the creases between
   the billows, a little powder on the crests, the thin crests bright
   toward the sun, and the shadows of its own billows and of the peaks
   laid across it. Through it stand a pyramid of three faces nine
   kilometres off, a crown of two summits to the left and two far tops
   on the horizon, worn into ribs and couloirs and banded with rock; and
   below the eye on the left a spur of the ridge, its teeth against the
   cloud and its face in buttresses with snow in the couloirs. By day
   the sky is the deep blue of the height over a brilliant deck; at dusk
   the sun stands just over the cloud, its light grazing the tops and the
   pyramid's long shadow reaching across the deck toward the eye, the
   sky pink and gold, with the earth's shadow and the belt of Venus low
   on the side away from it; at night the moon lays a glittering path
   across the tops, under the stars and a faint Milky Way. Thin veils of
   cloud drift over the deck below. A phone turns toward the pyramid and
   sits up a little, the spur swung into its corner. WebGL2, no
   libraries, no build step. */

window.CONCEPT = {
  id: 'summit',
  theme: { day: '#3c6ebc', dusk: '#58539b', night: '#181e37' },
  t0: 40,
  frag: `
#define DEG 0.0174532925

/* the world, in metres: x to the right of a wide frame's view, z out
   along it, y up from the cloud sea's mean top. The eye stands on the
   ridge, this high over the cloud */
const float EYE = 680.0;
const float FOOT = EYE - 1.7;
const float RE = 7.4e6;          /* the earth's radius, lengthened by refraction */
const float TOPC = 400.0;        /* no cloud rises above this */

float T, PA, ASP, WIDE, CIRR, KEY;
vec3 LD, LP, LC, AMB, CUP;
vec2 DRIFT;
vec3 SUN_D, SUN_U, MOON_D;
mat2 RROT;

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

/* ------------------------------------------------------------ the air */
/* the sky of each look is shaped as the air shapes it: the zenith deep
   and dark at this height, the horizon brightening by the air's depth
   along the line of sight, an aureole about the light by a Mie lobe and
   a wider glow low down, a haze lying on the cloud. At dusk the side
   away from the sun takes the earth's shadow and the belt of Venus.
   Colours are each look's own, blended. */

float airmass(float s) {
  float e = max(asin(clamp(s, -1.0, 1.0)) / DEG, -1.6);
  return 1.0 / (sin(e * DEG) + 0.50572 * pow(e + 6.07995, -1.6364));
}

vec3 sky(vec3 rd) {
  float s = rd.y;
  float e = asin(clamp(s, -1.0, 1.0)) / DEG;
  vec2 ah = normalize(rd.xz + 1e-5), lh = normalize(LP.xz + 1e-5);
  float az = dot(ah, lh);
  float mu = dot(rd, LP);
  /* elevation over the cloud's own horizon, which lies 0.8 degrees down;
     the broad gradient is the air's scattering saturating with its depth
     along the ray, the narrow one a haze lying on the cloud */
  float ep = max(e + 0.8, 0.0);
  float kr = look3(0.1, 0.115, 0.1);
  float t1 = (1.0 - exp(-kr * airmass(sin(ep * DEG)))) / (1.0 - exp(-kr * 38.0));
  float t2 = exp(-ep / look3(2.2, 3.0, 2.6));
  vec3 zen = look3(vec3(0.030, 0.085, 0.300), vec3(0.036, 0.056, 0.205), vec3(0.006, 0.010, 0.030));
  vec3 mid = look3(vec3(0.120, 0.250, 0.620), vec3(0.290, 0.165, 0.310), vec3(0.014, 0.022, 0.055));
  vec3 horS = look3(vec3(0.520, 0.680, 0.900), vec3(1.050, 0.340, 0.085), vec3(0.036, 0.047, 0.078));
  vec3 horA = look3(vec3(0.450, 0.620, 0.880), vec3(0.500, 0.280, 0.320), vec3(0.030, 0.040, 0.068));
  float toS = pow(sat(0.5 + 0.5 * az), look3(2.0, 5.0, 2.0));
  vec3 hor = mix(horA, horS, toS);
  vec3 c = mix(zen, mid, t1);
  c = mix(c, hor, t2);
  /* the glow about the light: a tight aureole, and a broad warm sweep
     low down on its side of the sky */
  vec3 gc = look3(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.42, 0.11), vec3(0.6, 0.7, 0.9));
  c += gc * hg(mu, 0.85) * look3(0.025, 0.06, 0.004) * KEY;
  c += gc * pow(max(mu, 0.0), 8.0) * exp(-ep / 7.0) * look3(0.08, 0.8, 0.01) * KEY;
  /* a thin bright haze on the cloud's horizon */
  c += exp(-abs(e + 0.8) / 0.9) * look3(vec3(0.10, 0.12, 0.14), vec3(0.20, 0.10, 0.06), vec3(0.006, 0.008, 0.012)) * (0.5 + 0.5 * toS);
  /* away from a low sun: the earth's shadow along the horizon and the
     belt of Venus over it */
  float side = smoothstep(0.85, -0.3, az);
  float band = smoothstep(3.5, -0.8, e) * side;
  float belt = exp(-sq((e - 5.5) / 4.5)) * side;
  c = mix(c, vec3(0.16, 0.17, 0.30), uLook.y * band * 0.6);
  c += uLook.y * belt * vec3(0.40, 0.14, 0.18);
  /* by day the sky pales a little toward the sun's side */
  c += uLook.x * vec3(0.07, 0.085, 0.1) * pow(max(mu, 0.0), 3.0) * (1.0 - t2) * KEY;
  return c;
}

/* a few strands of cirrus, a sheet eight kilometres up, drawn out along
   the wind and drifting slowly; kept well above the name */
vec3 cirrus(vec3 rd, vec3 c) {
  float w = look3(0.4, 0.25, 0.0);
  if (rd.y < 0.05 || w <= 0.0) return c;
  float m = smoothstep(CIRR, CIRR + 6.0 * DEG, asin(rd.y));
  if (m <= 0.0) return c;
  vec2 p = rd.xz / rd.y * 8.0 + vec2(0.012, 0.004) * T;
  vec2 q = vec2(dot(p, vec2(0.87, 0.49)), dot(p, vec2(-0.49, 0.87))) * vec2(0.35, 2.6);
  q.y += 0.9 * noise(q * vec2(0.4, 0.15));
  float f = fbm(q + vec2(0.0, 3.0), 3);
  float d = smoothstep(0.55, 0.78, f) * smoothstep(0.5, 0.75, noise(p * 0.11 + 7.0));
  vec3 lit = LC / PI * (0.3 + 0.9 * hg(dot(rd, LP), 0.7)) + AMB * 1.5;
  return mix(c, lit, d * m * w);
}

/* x z, summit over the cloud, faces' reach */
const vec4 P0 = vec4(3249.0, 8927.0, 1560.0, 1450.0);
const vec4 Q0 = vec4(140.0 * DEG, 0.8, 1.0, 1.12);
const vec4 P1 = vec4(-7491.0, 14702.0, 1060.0, 1500.0);
const vec4 Q1 = vec4(170.0 * DEG, 0.95, 1.0, 0.85);
const vec4 P1B = vec4(-9700.0, 15100.0, 900.0, 1350.0);
const vec4 Q1B = vec4(205.0 * DEG, 0.9, 1.1, 1.0);
const vec4 P2 = vec4(-5606.0, 45657.0, 1480.0, 3000.0);
const vec4 Q2 = vec4(190.0 * DEG, 0.66, 1.0, 0.92);
const vec4 P3 = vec4(8628.0, 61397.0, 1750.0, 3600.0);
const vec4 Q3 = vec4(165.0 * DEG, 0.66, 0.9, 1.0);


/* ---------------------------------------------------------- the cloud */
/* the deck's tops: cells a few hundred metres across, each a dome,
   swelling and settling slowly, a few standing up as turrets; smaller
   lumps ride on the domes, and the whole deck lifts and sags over
   kilometres */

float domes(vec2 p, float ph) {
  vec2 i = floor(p), f = fract(p);
  float h = -0.6;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = hash22(i + g);
    float s = hash12(i + g + 31.7);
    vec2 c = g + 0.5 + 0.7 * (o - 0.5) - f;
    float rad = 0.5 + 0.42 * s;
    float b = (0.8 + 0.2 * sin(ph * (0.6 + 0.5 * o.x) + 6.28 * o.y)) * (1.0 + 1.4 * smoothstep(0.9, 1.0, s));
    h = smax(h, (rad - dot(c, c) / rad) * b, 0.08);
  }
  return h;
}

float cloudH(vec2 x, float t, out float cav) {
  vec2 w = x + DRIFT;
  float sw = (noise(w / 9000.0) - 0.5) * 70.0 + (noise(w / 3100.0 + 5.0) - 0.5) * 30.0;
  vec2 q = w / vec2(540.0, 470.0);
  q += 0.35 * vec2(noise(q * 0.35), noise(q * 0.35 + 9.1));
  float d1 = domes(q, T * 0.05);
  float h = sw + 105.0 * d1;
  /* the deck banks up against the peaks */
  float b0 = length(x - P0.xy) / P0.w, b1 = length(x - P1.xy) / P1.w;
  float bd = 0.6 + 0.6 * min(d1, 1.0);
  h += 125.0 * exp(-max(b0 - 1.0, 0.0) * 1.1) * bd + 50.0 * exp(-max(b1 - 0.6, 0.0) * 1.3) * bd;
  float k2 = smoothstep(42000.0, 14000.0, t);
  float d2 = 0.5;
  if (k2 > 0.0) {
    vec2 q2 = w / 150.0 + vec2(T * 0.004, 0.0);
    d2 = 0.65 * billow(q2) + 0.35 * billow(q2 * 2.1 + 3.7);
    h += 38.0 * k2 * (d2 - 0.45) * (0.45 + 0.6 * sat(d1));
  }
  cav = sat(0.6 - d1) * 1.3 * (0.6 + 0.4 * (1.0 - d2));
  /* the rare turret banked against a peak is held under the deck's lid */
  return -smax(-h, -385.0, 25.0);
}

/* fine lumps, for the shading only */
float cloudFine(vec2 x, float t) {
  float k = smoothstep(9000.0, 2000.0, t);
  if (k <= 0.0) return 0.0;
  vec2 w = (x + DRIFT) / 45.0;
  return k * (7.0 * billow(w) + 1.8 * billow(w * 2.3 + 1.3));
}

/* ---------------------------------------------------------- the peaks */
/* each peak is three faces meeting in sharp aretes, steeper toward the
   summit, the faces worn into ribs and couloirs that run down their
   fall lines and stop short of the aretes. q is in units of the faces'
   reach; the aretes reach twice as far */

float horn(vec2 x, vec4 P, vec4 Q, float t, float y, out float rib) {
  vec2 q = (x - P.xy) / P.w;
  /* the aretes bend a little, as worn ones do */
  q += 0.09 * (vec2(noise(q * 1.6 + P.xy * 0.003), noise(q * 1.6 + 7.3)) - 0.5);
  float a0 = Q.x;
  vec2 n0 = vec2(sin(a0), cos(a0));
  vec2 n1 = vec2(sin(a0 + 2.0944), cos(a0 + 2.0944));
  vec2 n2 = vec2(sin(a0 + 4.1888), cos(a0 + 4.1888));
  float d0 = dot(q, n0) * Q.z, d1 = dot(q, n1), d2 = dot(q, n2) * Q.w;
  float D = max(max(d0, d1), d2);
  vec2 nf = d0 >= max(d1, d2) ? n0 : (d1 >= d2 ? n1 : n2);
  float second = d0 >= max(d1, d2) ? max(d1, d2) : (d1 >= d2 ? max(d0, d2) : max(d0, d1));
  float u = dot(q, vec2(nf.y, -nf.x));
  float h = P.z * (1.0 - pow(max(D, 1e-4), Q.y));
  rib = 0.5;
  if (y - h > P.z * 0.28) return h + P.z * 0.25;
  float k = smoothstep(P.w * 40.0, P.w * 6.0, t);
  float rq = length(q), ang = atan(q.x, q.y);
  /* the aretes: shoulders, notches and gendarmes along them */
  float ar = 1.0 - smoothstep(0.0, 0.14, D - second);
  float sk = noise(vec2(rq * 3.2, ang * 1.5) + P.xy * 0.01);
  sk += 0.5 * noise(vec2(rq * 8.0, ang * 3.0) + 4.0);
  h += P.z * ar * sat(rq * 4.0) * (0.09 * sk - 0.03 * k * ridged(vec2(rq * 14.0, ang * 3.0)));
  /* ribs of rock and couloirs of snow down the faces */
  float g = ridged(vec2(u * 7.0, D * 1.6) + P.xy * 0.01);
  g = 0.6 * g + 0.4 * k * ridged(vec2(u * 19.0, D * 4.0) + 3.0);
  rib = g;
  h += P.z * (0.06 * (g - 0.55) * sat((D - second) * 8.0) * sat(D * 6.0) + 0.05 * (fbm(q * 2.3 + P.xy * 0.001, 3) - 0.5));
  return h;
}

/* the great peak, drawn by hand: three faces of unequal steepness and
   hollow, so the arete to the left runs long and gentle and the others
   short; the top hooks over a little; a shoulder stands on the long
   arete; the aretes wander and are notched. The faces are stepped by
   bands of rock with ledges over them where the snow lies, and ribbed
   down the fall line, couloirs between the ribs */
float bigPeak(vec2 x, float t, float y, out float rib) {
  float H = P0.z;
  vec2 q = (x - P0.xy) / P0.w;
  float r0 = length(q);
  q -= vec2(-0.12, 0.05) * sq(sat(1.0 - r0 * 2.0));
  /* the aretes wander: the one toward the eye most, bending as it falls */
  q += 0.13 * (vec2(noise(q * 1.25 + 2.0), noise(q * 1.25 + 7.3)) - 0.5);
  q += vec2(0.766, 0.643) * 0.16 * (noise(vec2(r0 * 3.2, 1.7)) - 0.5) * sat(r0 * 3.0);
  q += 0.045 * (vec2(noise(q * 3.3), noise(q * 3.3 + 4.1)) - 0.5);
  vec2 n0 = vec2(0.643, -0.766), n1 = vec2(-0.985, -0.174), n2 = vec2(0.342, 0.940);
  float d0 = dot(q, n0) * 1.1, d1 = dot(q, n1) * 1.0, d2 = dot(q, n2) * 0.9;
  float f0 = 1.0 - pow(max(d0, 1e-4), 0.82);
  float f1 = 1.0 - pow(max(d1, 1e-4), 0.68);
  float f2 = 1.0 - pow(max(d2, 1e-4), 0.76);
  float lo = min(min(f0, f1), f2);
  /* far above its plain faces nothing it carries can reach the ray */
  rib = 0.5;
  if (y - H * lo > 420.0) return H * lo + 380.0;
  float mid = max(min(f0, f1), min(max(f0, f1), f2));
  vec2 nf = lo == f0 ? n0 : (lo == f1 ? n1 : n2);
  float h = H * lo;
  float k = smoothstep(P0.w * 40.0, P0.w * 6.0, t);
  float rq = length(q), ang = atan(q.x, q.y);
  /* notches and gendarmes along the aretes */
  float ar = 1.0 - smoothstep(0.0, 0.07, mid - lo);
  float sk = noise(vec2(rq * 3.0, ang * 1.5) + 4.0) + 0.6 * noise(vec2(rq * 7.5, ang * 3.0) + 9.0);
  h += H * ar * sat(rq * 5.0) * (0.06 * sk - 0.05 * smoothstep(0.55, 0.85, noise(vec2(rq * 5.0, ang * 2.0) + 1.0)) - 0.025 * k * ridged(vec2(rq * 14.0, ang * 3.0)));
  /* a shoulder on the long arete; on the short one a notch, and a
     gendarme standing beyond it */
  vec2 qs = q - 0.85 * vec2(-0.669, 0.743);
  h = smax(h, H * (0.56 - 1.2 * length(qs * vec2(1.0, 1.3))) + 30.0 * noise(qs * 9.0), 40.0);
  vec2 qn = q - 0.36 * vec2(0.985, 0.174), qg = q - 0.56 * vec2(0.985, 0.174);
  h -= H * 0.085 * exp(-dot(qn, qn) / 0.005);
  h = smax(h, H * (0.75 - 3.0 * length(qg)) + 20.0 * noise(qg * 14.0), 25.0);
  /* ribs and couloirs down the fall line */
  float u = dot(q, vec2(nf.y, -nf.x));
  float g = ridged(vec2(u * 8.0, (1.0 - lo) * 1.7) + 3.0);
  g = 0.6 * g + 0.4 * k * ridged(vec2(u * 20.0, (1.0 - lo) * 4.0) + 6.0);
  rib = g;
  h += H * 0.055 * (g - 0.55) * (1.0 - ar) * sat((1.0 - lo) * 5.0);
  h += H * 0.04 * (fbm(q * 2.4 + 1.0, 3) - 0.5);
  /* bands of rock: a steeper step in some of them, a ledge over it,
     broken off across the face */
  float by = h + 90.0 * noise(q * 2.2 + 1.0) + 0.14 * (x.x - P0.x);
  float fb = fract(by / 260.0);
  float bm = smoothstep(0.5, 0.75, noise(vec2(by / 260.0, u * 2.2) + 5.0));
  h += 260.0 * 0.22 * bm * (smoothstep(0.4, 0.6, fb) - fb) * sat((1.0 - lo) * 6.0) * (1.0 - ar);
  return h;
}

float reach(vec4 P) { return P.w * 2.6; }

bool inside(vec2 x, vec4 P) {
  vec2 d = x - P.xy;
  return dot(d, d) < sq(reach(P));
}

float peaksH(vec2 x, float t, float y, out float rib, out float pk) {
  float h = -1e4, r = 0.0;
  rib = 0.0; pk = 0.0;
  if (inside(x, P0)) { h = bigPeak(x, t, y, r); rib = r; pk = 1.0; }
  if (inside(x, P1) || inside(x, P1B)) {
    float r2;
    float a = horn(x, P1, Q1, t, y, r);
    float b = horn(x, P1B, Q1B, t, y, r2);
    float m = smax(a, b, 60.0);
    if (m > h) { h = m; rib = a > b ? r : r2; }
    pk = 1.0;
  }
  if (inside(x, P2)) { float a = horn(x, P2, Q2, t, y, r); if (a > h) { h = a; rib = r; } pk = 1.0; }
  if (inside(x, P3)) { float a = horn(x, P3, Q3, t, y, r); if (a > h) { h = a; rib = r; } pk = 1.0; }
  return h;
}

float farH(vec2 x, float t, float y, out float mat, out float pk, out float cav, out float rib) {
  float c = cloudH(x, t, cav);
  float m = peaksH(x, t, y + dot(x, x) / (2.0 * RE), rib, pk);
  mat = m - c;
  return max(c, m) - dot(x, x) / (2.0 * RE);
}

vec2 circ(vec2 o, vec2 d, vec2 c, float r) {
  vec2 oc = o - c;
  float a = max(dot(d, d), 1e-8), b = dot(oc, d), k = dot(oc, oc) - r * r;
  float disc = b * b - a * k;
  if (disc < 0.0) return vec2(1e9, -1e9);
  disc = sqrt(disc);
  return vec2((-b - disc) / a, (-b + disc) / a);
}

void span(vec3 ro, vec3 rd, vec4 P, inout float t0, inout float t1) {
  vec2 s = circ(ro.xz, rd.xz, P.xy, reach(P));
  if (s.y < 0.0) return;
  float top = P.z * 1.08 - dot(P.xy, P.xy) / (2.0 * RE);
  s.x = max(s.x, 0.0);
  if (ro.y + rd.y * s.x > top && ro.y + rd.y * s.y > top) return;
  t0 = min(t0, s.x);
  t1 = max(t1, s.y);
}

float traceFar(vec3 ro, vec3 rd, out float mat, out vec2 near) {
  float t0 = 1e9, t1 = -1.0;
  if (rd.y < 0.0) { t0 = (TOPC - ro.y) / rd.y; t1 = 140000.0; }
  span(ro, rd, P0, t0, t1);
  span(ro, rd, P1, t0, t1);
  span(ro, rd, P1B, t0, t1);
  span(ro, rd, P2, t0, t1);
  span(ro, rd, P3, t0, t1);
  near = vec2(1e9, -1.0);
  mat = -1.0;
  if (t1 < t0) return -1.0;
  float t = t0, lt = t0;
  float pk, cav, rib;
  for (int i = 0; i < 120; i++) {
    vec3 p = ro + rd * t;
    float h = farH(p.xz, t, p.y, mat, pk, cav, rib);
    float c = p.y - h;
    if (c < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 5; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - farH(q.xz, m, -1e9, mat, pk, cav, rib) < 0.0) b = m; else a = m;
      }
      return b;
    }
    float cn = c / (t * PA);
    if (pk > 0.0 && cn < near.x) near = vec2(cn, t);
    lt = t;
    t += max(c / (mix(0.5, 1.6, pk) + max(-rd.y, 0.0)), t * 0.0018 + 0.5);
    if (t > t1) break;
  }
  return rd.y < -0.02 ? t : -1.0;
}

/* ---------------------------------------------------------- the ridge */
/* the ridge the eye stands on runs off to the left and swings forward
   into a spur, three hundred metres off: its crest a row of teeth and
   notches against the cloud, a rocky top, then a break where it falls
   away to the cloud. Its face toward the eye is steep bedded rock in
   buttresses, with snow in the couloirs between them and a cornice
   along the crest. s runs along the crest, n out from it toward the eye */

const vec2 RA = vec2(-330.0, 140.0);
const vec2 RDIR = vec2(0.8526, 0.5225);
const vec2 RNRM = vec2(0.5225, -0.8526);

/* the crest's own line, s along it: rising out of the frame to the
   left toward the summit the eye stands on, then breaking off in steps */
float crestY(float s) {
  float y = -18.0 + 0.05 * max(180.0 - s, 0.0);
  float b = max(s - 262.0, 0.0);
  y -= 1.35 * b + 0.004 * b * b;
  y += 7.0 * smoothstep(0.0, 6.0, b) * (1.0 - smoothstep(10.0, 16.0, b));
  y += 6.0 * smoothstep(26.0, 30.0, b) * (1.0 - smoothstep(36.0, 42.0, b));
  return y + 0.7 * noise(vec2(s / 3.0, 1.0));
}

/* a gendarme on the crest: a tower whose sides lean in as they rise,
   its top tilted; w and wl its half length along the crest and across */
float tower(float s, float an, float s0, float w, float H, float tilt, float wl) {
  return H + tilt * (s - s0) - 2.6 * max(abs(s - s0) - w, 0.0) - 2.2 * max(an - wl, 0.0);
}

/* fractured rock: the face broken into blocks of no set shape, each a
   plane set out or back from the face and tilted its own way, a few
   laid back as ledges; the joints between them worn into grooves. f is
   on the face, across it and down it by height. Returns the offset, and
   in .y how much the block is a ledge */
vec2 facets(vec2 f, vec2 cell, float amp) {
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
  float led = step(0.8, hs.y);
  vec2 lp = -bc * cell;
  float ty = mix((hs.z - 0.55) * 0.7, -0.8, led);
  float h = (hs.x - 0.5) * amp + lp.x * (hs.y - 0.5) * 0.5 + lp.y * ty;
  float joint = sqrt(d2) - sqrt(d1);
  h -= amp * 0.3 * (1.0 - smoothstep(0.0, 0.14, joint));
  return vec2(h, led * smoothstep(0.05, 0.2, joint));
}

float ridgeH(vec2 x, float t, float fine, out float snow) {
  vec2 q = RROT * x - RA;
  float s = dot(q, RDIR), n = dot(q, RNRM);
  float k1 = smoothstep(1000.0, 250.0, t), k2 = smoothstep(400.0, 120.0, t);
  float an = sqrt(n * n + 1.0) - 1.0;
  float fall = mix(1.05, 1.45, smoothstep(-2.0, 2.0, n));
  float cy = crestY(s);
  float face = cy - fall * an;
  vec2 f = vec2(s, face * 1.2);
  /* a few gendarmes on the crest, the highest the spur's top */
  float g = max(max(tower(s, an, 191.0, 1.8, 3.0, 0.3, 1.6), tower(s, an, 207.0, 3.5, 1.6, -0.1, 2.2)),
                max(tower(s, an, 221.0, 2.0, 5.0, 0.45, 1.8), tower(s, an, 236.0, 3.0, 8.5, -0.3, 2.6)));
  g = max(g, tower(s, an, 251.0, 1.5, 4.2, 0.6, 1.5));
  g = smax(g, 0.0, 0.6);
  /* two couloirs, wandering and narrowing down the face, dying out */
  float c2 = abs(s - 244.0 - 9.0 * noise(vec2(f.y / 26.0, 4.0))) / (2.0 + 3.0 * noise(vec2(f.y / 14.0, 2.0)));
  float coul = (1.0 - smoothstep(0.4, 1.0, c2)) * smoothstep(2.0, 7.0, an) * smoothstep(0.3, 0.55, noise(vec2(s / 25.0, f.y / 22.0) + 3.0));
  /* fractured gneiss, in large blocks and small */
  vec2 fa = facets(f + vec2(0.0, 0.25 * s), vec2(9.0, 5.5), 2.6);
  vec2 fb = k1 * fine > 0.0 ? facets(f * 1.1 + 40.0, vec2(3.2, 2.2), 0.9) * k1 : vec2(0.0);
  float rk = face + g + (fa.x + fb.x) * smoothstep(-1.0, 1.0, an) - 2.2 * coul;
  rk += 1.0 * (noise(f / 7.0) - 0.5) + k2 * 0.15 * noise(f / 0.8);
  /* snow along stretches of the crest between the towers, on the
     ledges, and in the couloirs */
  float cor = exp(-an / 2.6) * (1.0 - smoothstep(0.5, 1.5, g)) * smoothstep(0.25, 0.5, noise(vec2(s / 10.0, 3.0)));
  float led = max(fa.y, fb.y * 0.6) * smoothstep(0.35, 0.6, noise(f / 11.0 + 5.0));
  snow = sat(max(max(cor, led), coul * smoothstep(0.45, 0.65, noise(f / vec2(5.0, 9.0) + 2.0) + 0.25 * fa.x)));
  return FOOT + rk + 0.4 * snow;
}

float traceRidge(vec3 ro, vec3 rd, out vec2 near) {
  near = vec2(1e9, -1.0);
  /* the spur's slab: along the crest from 120 m to 380 m, out from it
     from 40 m behind to 170 m toward the eye */
  vec2 o = RROT * ro.xz - RA, d = RROT * rd.xz;
  vec2 os = vec2(dot(o, RDIR), dot(o, RNRM)), ds = vec2(dot(d, RDIR), dot(d, RNRM));
  vec2 inv = 1.0 / (abs(ds) + 1e-6) * sign(ds + 1e-9);
  vec2 ta = (vec2(120.0, -40.0) - os) * inv, tb = (vec2(380.0, 170.0) - os) * inv;
  vec2 tn = min(ta, tb), tf = max(ta, tb);
  float t0 = max(max(tn.x, tn.y), 20.0), t1 = min(min(tf.x, tf.y), 900.0);
  if (t1 <= t0) return -1.0;
  float t = t0, lt = t0, sn;
  for (int i = 0; i < 90; i++) {
    vec3 p = ro + rd * t;
    float c = p.y - ridgeH(p.xz, t, 0.0, sn);
    if (c < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 5; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - ridgeH(q.xz, m, 1.0, sn) < 0.0) b = m; else a = m;
      }
      return b;
    }
    float cn = c / (t * PA);
    if (cn < near.x) near = vec2(cn, t);
    lt = t;
    t += max(c * 0.4, 0.003 * t + 0.03);
    if (t > t1 || p.y < FOOT - 500.0) break;
  }
  return -1.0;
}

/* ----------------------------------------------------------- shadows */

/* the peaks' shadows on the cloud, each peak taken as the cone it is
   from a distance: the ray toward the light passes its axis at some
   height and some offset, and is in shadow if the offset is inside the
   peak's girth there */
float coneShadow(vec3 p, vec4 P, vec4 Q) {
  vec2 lh = normalize(LD.xz + 1e-6);
  float tl = LD.y / max(length(LD.xz), 1e-4);
  vec2 dq = P.xy - p.xz;
  float al = dot(dq, lh);
  if (al < 0.0) return 1.0;
  float off = length(dq - lh * al);
  float y = p.y + al * tl + dot(P.xy, P.xy) / (2.0 * RE);
  float f = sat(1.0 - y / P.z);
  float girth = P.w * 1.25 * pow(f, 1.0 / Q.y);
  return smoothstep(girth * 0.55, girth * 1.25 + (120.0 + al * 0.006) * sat(f * 8.0) + 0.01, off);
}

float peakShadow(vec3 p) {
  return coneShadow(p, P0, Q0) * coneShadow(p, P1, Q1) * coneShadow(p, P1B, Q1B) * coneShadow(p, P2, Q2) * coneShadow(p, P3, Q3);
}

/* the cloud's own shadow: a short ray toward the light over the domes,
   shorter where the cloud is far enough that its detail is gone */
float cloudShadow(vec3 p, float far) {
  float s = 1.0, t = 20.0, cav;
  int n = far > 6000.0 ? 5 : 9;
  for (int i = 0; i < 9; i++) {
    vec3 q = p + LD * t;
    if (q.y > TOPC || i >= n) break;
    float h = cloudH(q.xz, 50000.0, cav) - dot(q.xz, q.xz) / (2.0 * RE);
    s = min(s, sat(0.5 + (q.y - h) / (0.09 * t + 14.0)));
    t *= 1.85;
  }
  return s;
}

float ridgeShadow(vec3 p) {
  float s = 1.0, t = 0.8, sn;
  for (int i = 0; i < 9; i++) {
    vec3 q = p + LD * t;
    float h = ridgeH(q.xz, 1500.0, 0.0, sn);
    s = min(s, sat(0.5 + (q.y - h) / (0.06 * t + 0.15)));
    t *= 1.95;
    if (q.y > FOOT + 10.0) break;
  }
  return s;
}

/* ------------------------------------------------------------- shading */

/* the air between the eye and what it sees: the far cloud fades into
   the horizon's own light, and into a thin haze lying on it */
vec3 aerial(vec3 col, vec3 ro, vec3 rd, float t) {
  vec3 sig = look3(vec3(0.4, 0.6, 1.0), vec3(0.36, 0.42, 0.6), vec3(0.5, 0.65, 1.0)) * 1.1e-5;
  float te = rd.y < 0.0 ? max(0.0, (ro.y - 400.0) / -rd.y) : 1e9;
  float hz = max(t - te, 0.0);
  vec3 tr = exp(-sig * t - hz * 0.9e-5);
  vec3 hd = normalize(vec3(rd.x, -0.006, rd.z));
  vec3 ins = sky(hd);
  return col * tr + ins * (1.0 - tr);
}

vec3 shadeCloud(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  float mat, pk, cav, rib;
  float e = max(2.0, t * PA * 1.2);
  float hx = farH(p.xz + vec2(e, 0.0), t, -1e9, mat, pk, cav, rib) + cloudFine(p.xz + vec2(e, 0.0), t);
  float hz = farH(p.xz + vec2(0.0, e), t, -1e9, mat, pk, cav, rib) + cloudFine(p.xz + vec2(0.0, e), t);
  float h0 = farH(p.xz, t, -1e9, mat, pk, cav, rib) + cloudFine(p.xz, t);
  vec3 n = normalize(vec3(h0 - hx, e, h0 - hz));
  float psh = peakShadow(p);
  float csh = mix(0.22, 1.0, cloudShadow(p, t));
  float mu = dot(rd, LP);
  /* light into the cloud's skin: a soft wrapped diffuse, darker into
     the creases between the billows, where the light has come further
     through the cloud and the sky's blue is left */
  float dif = sat((dot(n, LD) + 0.25) / 1.25);
  vec3 sun = LC / PI * (dif * csh + look3(0.08, 0.16, 0.1) * (0.35 + 0.65 * csh) * (1.0 - 0.6 * cav));
  sun *= exp(-cav * vec3(0.7, 0.5, 0.32));
  /* powder: the crests facing the light are a little darker than the
     light that has gathered in the cloud below them */
  sun *= 1.0 - 0.25 * (1.0 - cav) * sat(dot(n, LD)) * (1.0 - sat(mu));
  /* the light through the cloud's thin crests, toward the sun */
  sun += LC * csh * hg(mu, 0.6) * 0.22 * (1.0 - cav);
  /* a path under the moon or the low sun: the deck's mean surface
     makes the broad lane, and the crests tilted to the light glitter in
     it */
  vec3 hv = normalize(LP - rd);
  float a2 = 0.035;
  float D = a2 / (PI * sq(hv.y * hv.y * (a2 - 1.0) + 1.0));
  float nh = sat(dot(n, hv));
  float gl = smoothstep(0.93, 0.995, nh) * (0.4 + 0.6 * noise((p.xz + DRIFT) / 7.0));
  float clear = smoothstep(-20.0, -80.0, mat);
  sun += LC * csh * D * look3(0.0, 0.05, 0.07) * (0.25 + 2.5 * gl) * (1.0 - 0.6 * cav) * clear;
  vec3 col = sun * psh;
  col += AMB * (0.3 + 0.7 * n.y * n.y) * (1.0 - look3(0.65, 0.55, 0.55) * cav) + CUP * 0.1 * cav;
  return col;
}

vec3 shadePeak(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  float mat, pk, cav, rib;
  float e = max(1.5, t * PA);
  float hx = farH(p.xz + vec2(e, 0.0), t, -1e9, mat, pk, cav, rib);
  float hz = farH(p.xz + vec2(0.0, e), t, -1e9, mat, pk, cav, rib);
  float h0 = farH(p.xz, t, -1e9, mat, pk, cav, rib);
  vec3 n = normalize(vec3(h0 - hx, e, h0 - hz));
  /* snow where it can lie: on the ledges and in the couloirs; rock on
     the steps, the ribs and wherever it is steep */
  float rock = smoothstep(0.62, 0.42, n.y);
  rock = max(rock, smoothstep(0.85, 0.65, n.y) * smoothstep(0.55, 0.8, rib));
  rock *= 0.75 + 0.25 * noise(p.xz / 60.0);
  vec3 alb = mix(vec3(0.82, 0.85, 0.9), vec3(0.1, 0.092, 0.088), rock);
  float sh = peakShadow(p + vec3(0.0, 40.0, 0.0));
  vec3 col = alb * (LC / PI * max(dot(n, LD), 0.0) * sh + AMB * (0.6 + 0.4 * n.y) + CUP * sat(0.4 - 0.6 * n.y));
  /* the cloud laps up the lower slopes in torn wisps, furthest up the
     couloirs, lit as the deck is */
  float torn = fbm3(vec3((p.x + DRIFT.x * 1.4) / 120.0, p.y / 55.0, (p.z + DRIFT.y * 1.4) / 120.0), 3);
  float w = smoothstep(0.35, 0.7, torn + ((0.6 - rib) * 150.0 + 50.0 - mat) / 220.0) + smoothstep(70.0, 0.0, mat);
  /* wisps against a face turned from the light are in its shadow */
  float ps = min(peakShadow(p), smoothstep(-0.15, 0.25, dot(n, LD)));
  vec3 ct = LC / PI * (0.62 * sat((LD.y + 0.25) / 1.25) + 0.12) * ps + AMB * 0.85 + LC * hg(dot(rd, LP), 0.6) * 0.1 * ps;
  col = mix(col, ct, sat(w) * 0.92);
  return col;
}

vec3 shadeRidge(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  float sn;
  float e = max(0.08, t * PA);
  float hx = ridgeH(p.xz + vec2(e, 0.0), t, 1.0, sn);
  float hz = ridgeH(p.xz + vec2(0.0, e), t, 1.0, sn);
  float h0 = ridgeH(p.xz, t, 1.0, sn);
  vec3 n = normalize(vec3(h0 - hx, e, h0 - hz));
  vec3 ng = n;
  /* grain and colour from the rock's own place in space, the same on
     every face of a block */
  vec3 pp = p * 1.3;
  float b0 = noise3(pp);
  vec3 bump = vec3(noise3(pp + vec3(0.35, 0.0, 0.0)), noise3(pp + vec3(0.0, 0.35, 0.0)), noise3(pp + vec3(0.0, 0.0, 0.35))) - b0;
  n = normalize(n - (1.0 - sn) * 1.6 * bump);
  float var = noise3(p * 0.35);
  vec3 rockc = mix(vec3(0.062, 0.061, 0.06), vec3(0.09, 0.078, 0.066), smoothstep(0.6, 0.85, noise3(p * 0.07 + 3.0)));
  rockc *= 0.6 + 0.75 * var;
  vec3 alb = mix(rockc, vec3(0.86, 0.89, 0.94), sn);
  float nl = max(dot(n, LD), 0.0);
  float sh = nl > 0.0 ? ridgeShadow(p + n * 0.05) : 0.0;
  vec3 col = alb * (LC / PI * nl * sh + AMB * (0.5 + 0.5 * n.y) + CUP * sat(0.5 - 0.5 * n.y));
  /* edges turned from the eye catch the sky behind them */
  float rim = pow(1.0 - sat(dot(ng, -rd)), 4.0);
  col += rim * alb * (AMB * 1.5 + LC * 0.04 * sat(dot(ng, LD) + 0.4));
  return col;
}

/* thin veils of cloud drifting over the deck, faster than it, drawn
   out along the wind; seen edge on they thicken */
vec4 wisps(vec3 ro, vec3 rd, float tHit) {
  /* only where the eye looks down on them steeply enough to see their
     shapes; nearer the horizon they would only alias into lines */
  if (rd.y > -0.035) return vec4(0.0);
  float t = (ro.y - 210.0) / -rd.y;
  if (t > tHit) return vec4(0.0);
  vec2 x = ro.xz + rd.xz * t + DRIFT * 1.7;
  vec2 w = vec2(dot(x, vec2(0.93, -0.36)), dot(x, vec2(0.36, 0.93))) / vec2(900.0, 260.0);
  float d = fbm(w, 3) + 0.06 * noise(w * 8.3);
  d = smoothstep(0.5, 0.76, d) * smoothstep(0.35, 0.6, noise(w * 0.23 + 4.0));
  float a = (1.0 - exp(-d * 0.05 / -rd.y)) * smoothstep(-0.035, -0.06, rd.y);
  a = min(a, 0.42) * smoothstep(300.0, 2500.0, tHit - t);
  vec3 p = ro + rd * t;
  float mu = dot(rd, LP);
  vec3 c = LC / PI * (0.55 + 0.8 * hg(mu, 0.55)) * peakShadow(p) + AMB * 1.1;
  return vec4(c, a);
}

/* ------------------------------------------------------- the night sky */

vec3 stars(vec3 rd) {
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 150.0 : 380.0;
    vec3 c = floor(rd * sc);
    vec3 h = hash33(c + float(k) * 17.0);
    float on = step(k == 0 ? 0.955 : 0.985, h.x);
    vec3 sd = normalize(c + 0.25 + 0.5 * hash33(c + 5.3));
    float d = length(rd - sd);
    float b = on * (k == 0 ? 0.25 + 3.0 * pow(h.y, 6.0) : 0.12 + 0.3 * h.y);
    float r = PA * 0.75;
    float tw = 0.8 + 0.2 * sin(T * (2.0 + 3.0 * h.z) + h.y * 40.0);
    vec3 tint = mix(vec3(1.0, 0.82, 0.65), vec3(0.75, 0.85, 1.0), h.z);
    acc += b * tw * tint * exp(-d * d / (r * r));
  }
  return acc;
}

vec3 milky(vec3 rd) {
  vec3 G = vec3(-0.694, -0.576, 0.434);
  float b = dot(rd, G);
  float band = exp(-b * b / 0.018);
  float n = fbm3(rd * 7.0, 4);
  float dust = smoothstep(0.42, 0.68, fbm3(rd * 13.0 + 3.0, 3)) * exp(-sq((b - 0.012) / 0.035));
  float core = exp(-sq(dot(rd, normalize(vec3(0.62, 0.12, 0.78))) - 1.0) * 30.0);
  return band * (0.3 + 0.7 * n) * (1.0 - 0.8 * dust) * (vec3(0.014, 0.016, 0.024) + core * vec3(0.012, 0.010, 0.008));
}

vec3 moon(vec3 rd) {
  vec3 m = MOON_D;
  float r = 0.5 * DEG;
  vec3 ux = normalize(vec3(m.z, 0.0, -m.x));
  vec3 uy = cross(m, ux);
  vec2 q = vec2(dot(rd, ux), dot(rd, uy)) / r;
  float d = length(q);
  float ph = uMoon * TAU;
  vec3 nrm = vec3(q, sqrt(max(1.0 - d * d, 0.0)));
  float lit = smoothstep(-0.04, 0.08, dot(nrm, vec3(sin(ph), 0.0, -cos(ph))));
  float mar = 0.75 + 0.25 * smoothstep(0.35, 0.65, fbm(q * 1.6 + 3.0, 4));
  float disc = 1.0 - smoothstep(1.0 - 1.5 * PA / r, 1.0, d);
  vec3 c = disc * (lit * mar * vec3(5.0, 4.9, 4.6) + 0.015);
  float dm = max(dot(rd, m), 0.0);
  c += vec3(0.05, 0.055, 0.07) * pow(dm, 8000.0) + vec3(0.012, 0.015, 0.022) * pow(dm, 900.0);
  return c;
}

vec3 sunDisc(vec3 rd, vec3 s, vec3 col) {
  float r = 0.34 * DEG;
  float d = length(rd - s) / r;
  float disc = 1.0 - smoothstep(1.0 - 1.5 * PA / r, 1.0, d);
  float limb = 0.6 + 0.4 * sqrt(max(1.0 - d * d, 0.0));
  return disc * limb * col;
}

/* ------------------------------------------------------------ the frame */

vec3 camera(vec2 fc, out vec3 ro) {
  float th = mix(tan(32.0 * DEG), tan(36.0 * DEG) / ASP, WIDE);
  float hy = mix(0.6, 0.575, WIDE);
  float pitch = atan((2.0 * hy - 1.0) * th) + uPoint.y * 0.35 * DEG;
  float yaw = mix(13.0, 0.0, WIDE) * DEG + uPoint.x * 0.6 * DEG;
  vec2 uv = (fc - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 d = normalize(vec3(uv * th, 1.0));
  float cp = cos(pitch), sp = sin(pitch);
  d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  ro = vec3(uPoint.x * 1.5, EYE + uPoint.y * 0.4, 0.0);
  PA = 2.0 * th / uRes.y;
  return d;
}

void setup() {
  ASP = uRes.x / uRes.y;
  WIDE = smoothstep(0.8, 1.45, ASP);
  /* the clock wraps every nine hours, so positions stay precise */
  T = mod(uTime, 32768.0);
  DRIFT = vec2(-2.1, 0.8) * T;
  SUN_D = dirAE(80.0, 32.0);
  SUN_U = dirAE(mix(27.5, 33.0, WIDE), 1.0);
  float th = mix(tan(32.0 * DEG), tan(36.0 * DEG) / ASP, WIDE);
  float top = (atan(0.15 * th) + atan(th)) / DEG;
  /* the name stands 8 % of the half-height over the middle */
  CIRR = atan((2.0 * mix(0.6, 0.575, WIDE) - 1.0) * th) + atan(0.08 * th) + 10.0 * DEG;
  MOON_D = dirAE(mix(4.0, -9.0, WIDE), min(mix(30.0, 22.0, WIDE), top - 5.0));
  /* the moon's light is laid on from further round than its disc, so
     the snow faces toward the eye take it; its path stays under it */
  LP = normalize(look3(SUN_D, SUN_U, MOON_D));
  LD = normalize(look3(SUN_D, SUN_U, dirAE(-32.0, 30.0)));
  /* while the sun's weight hands over to the moon's the light is a blend
     of both directions; it is dimmed there, so a turn to night passes
     through dusk and never through a flash of day */
  KEY = max(0.0, 1.0 - 3.8 * (uLook.x + uLook.y) * uLook.z);
  LC = look3(vec3(5.6, 5.35, 4.9), vec3(7.5, 3.3, 1.0), vec3(0.75, 0.95, 1.4)) * KEY;
  AMB = look3(vec3(0.12, 0.17, 0.30), vec3(0.06, 0.06, 0.12), vec3(0.02, 0.029, 0.058));
  CUP = look3(vec3(1.6, 1.6, 1.65), vec3(0.5, 0.32, 0.28), vec3(0.15, 0.19, 0.28)) * (0.2 + 0.8 * KEY);
  RROT = rot(mix(-26.0, 0.0, WIDE) * DEG);
}

vec3 scene(vec2 fc) {
  setup();
  vec3 ro;
  vec3 rd = camera(fc, ro);
  vec3 col;
  vec2 nearR = vec2(1e9, -1.0), nearF = vec2(1e9, -1.0);
  float tR = -1.0;
  float raz = atan(rd.x, rd.z) - mix(13.0, 0.0, WIDE) * DEG;
  if (rd.y < -0.02 && raz < 6.0 * DEG) tR = traceRidge(ro, rd, nearR);
  if (tR > 0.0) {
    col = shadeRidge(ro, rd, tR);
  } else {
    float mat;
    float tF = traceFar(ro, rd, mat, nearF);
    if (tF > 0.0) {
      col = mat > 0.0 ? shadePeak(ro, rd, tF) : shadeCloud(ro, rd, tF);
      if (mat <= 0.0) {
        vec4 wv = wisps(ro, rd, tF);
        col = mix(col, wv.rgb, wv.a);
      }
      col = aerial(col, ro, rd, tF);
    } else {
      col = cirrus(rd, sky(rd));
      col += KEY * (uLook.y * sunDisc(rd, SUN_U, vec3(30.0, 14.0, 4.0)) + uLook.x * sunDisc(rd, SUN_D, vec3(80.0, 76.0, 70.0)));
      /* the night's own sky, skipped only where its weight is nil */
      if (uLook.z > 0.0) col += uLook.z * (moon(rd) + (stars(rd) + milky(rd)) * smoothstep(-0.01, 0.08, rd.y));
      /* a peak's edge against the sky, within a pixel: blend it in */
      if (nearF.x < 1.0) col = mix(col, aerial(shadePeak(ro, rd, nearF.y), ro, rd, nearF.y), 0.5 * (1.0 - nearF.x));
    }
    /* the spur's crest, within a pixel */
    if (nearR.x < 1.0) col = mix(col, shadeRidge(ro, rd, nearR.y), 0.5 * (1.0 - nearR.x));
  }
  return col;
}
`
};
