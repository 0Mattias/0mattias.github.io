/* concepts/scenes/dunes.js · Erg
   Deadvlei, in the Namib at Sossusvlei: standing on the white clay pan at
   eye height, looking north across it at Big Daddy, the great red dune
   that walls it, with dead camelthorns standing in the clay between.
   Each dune is built the way wind builds one: a broad convex windward
   back, cut on its lee by a slip face, a plane at the angle of repose
   hanging from the brink. Where the two meet the crest is a knife edge,
   and because the back is curved the edge curves too, falling from the
   summit toward the pan. The sun lights the back and only grazes the slip
   face, so the dune splits into two tones along one line, as Big Daddy
   and Dune 45 do in every photograph of them. Big Daddy's summit and its
   long descending crest are one such unit; a lower one stands to the
   east, humped dunes close the pan on either side, far dunes beyond.
   The slip faces carry grainflow lobes running down from the brink, a
   little proud of the face, so the grazing sun picks out their flanks;
   the backs carry long low swells across the wind and tufts of grass at
   their feet. The pan is near-white clay, warm, cracked into plates, with
   red sand blown onto it at the dune feet. The trees are capsules: a
   flared trunk with roots over the clay, three or four gnarled limbs, a
   branch off each joint, a twig off each branch and a snag at each tip,
   each tree found by a box test first and casting its own shadow.
   Day is mid-afternoon, the sun high in the west-northwest; dusk the sun
   six degrees up in the west-southwest where it sets in summer, the pan
   and the dune's foot in the shadow of the western dunes and only the
   sand that faces the sun still burning, a warm glow along the west, the
   moon up in the east; night the Milky Way arches over the dune with its
   core low behind the eastern shoulder, and the moon lights the sand
   faintly. The air is very clear: no haze, no shimmer at the foot.
   WebGL2, no libraries, no build step. */

window.CONCEPT = {
  id: 'dunes',
  theme: { day: '#275fa0', dusk: '#24447e', night: '#0c0e14' },
  t0: 20,
  frag: `
const float EYE = 1.7;

vec3 azel(float az, float el) {
  az = radians(az); el = radians(el);
  return vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el));
}
float smax(float a, float b, float k) {
  float h = sat(0.5 + 0.5 * (a - b) / k);
  return mix(b, a, h) + k * h * (1.0 - h);
}
float smin(float a, float b, float k) { return -smax(-a, -b, k); }

/* ------------------------------------------------------------ the dunes */

/* a convex back: an elliptical cone rounded over its top, its four
   quarters reaching different distances */
float dome(vec2 p, vec2 c, float H, vec4 R, float a) {
  vec2 q = p - c;
  q /= vec2(q.x < 0.0 ? R.x : R.y, q.y < 0.0 ? R.z : R.w);
  float r = length(q);
  float s1 = sqrt(1.0 + a * a);
  return H * (s1 - sqrt(r * r + a * a)) / (s1 - a);
}
/* a slip face: a plane at the angle of repose falling along d from a
   brink through b at height h, the brink bowed and wandering */
float slip(vec2 p, vec2 b, vec2 d, float h, float bow, float wob) {
  vec2 q = p - b;
  float along = dot(q, vec2(-d.y, d.x));
  float s = dot(q, d) - bow * along * along + wob * sin(along * 0.011 + 1.7);
  return h - 0.66 * s;
}
/* a dune: the back where it is lower, the slip face where that is */
float unit(vec2 p, vec2 c, float H, vec4 R, float a, vec2 b, vec2 d, float h, float bow, float wob) {
  return min(dome(p, c, H, R, a), slip(p, b, d, h, bow, wob));
}

const vec2 SUMMIT = vec2(-330.0, 1350.0);
/* the slip faces of Big Daddy, its shoulder, and the two ring dunes */
const vec2 D1 = vec2(0.917, -0.4);
const vec2 D2 = vec2(0.5, -0.866);
const vec2 D3 = vec2(0.995, -0.1);
const vec2 D4 = vec2(0.95, 0.31);

float bigDaddy(vec2 p) {
  float u1 = unit(p, SUMMIT, 325.0, vec4(820.0, 2000.0, 980.0, 900.0), 0.09,
                  SUMMIT + vec2(10.0, -8.0), D1, 318.0, 0.00018, 10.0);
  float u2 = unit(p, vec2(810.0, 1760.0), 240.0, vec4(820.0, 1900.0, 900.0, 900.0), 0.12,
                  vec2(850.0, 1680.0), D2, 236.0, 0.00012, 14.0);
  return smax(u1, u2, 30.0);
}

/* the dunes closing the pan on either side: the west one turns its slip
   face to the pan, the east one its humped back */
float ringDunes(vec2 p) {
  float wh = 105.0 + 18.0 * sin(p.y * 0.006 + 1.0) + 14.0 * sin(p.y * 0.013 + 0.3) + 6.0 * sin(p.y * 0.031 + 2.0);
  float w = unit(p, vec2(-610.0, 250.0), wh, vec4(650.0, 420.0, 1500.0, 1400.0), 0.12,
                 vec2(-570.0, 250.0), D3, wh - 5.0, 0.0001, 12.0);
  float e = unit(p, vec2(560.0, 700.0), 88.0, vec4(430.0, 320.0, 1100.0, 1200.0), 0.3,
                 vec2(600.0, 700.0), D4, 86.0, 0.0002, 8.0);
  return max(w, e);
}

/* far dunes beyond: big units on a loose grid, out past the vlei's ring */
float farDunes(vec2 p) {
  float r = length(p - vec2(0.0, 900.0));
  if (r < 1900.0) return -300.0;
  vec2 g = floor(p / 1500.0);
  float h = -300.0;
  for (int j = 0; j < 4; j++) {
    vec2 c = g + vec2(float(j & 1), float(j >> 1));
    vec3 k = hash33(vec3(c, 4.2));
    vec2 cc = (c + 0.2 + 0.6 * k.xy) * 1500.0;
    float H = 110.0 + 150.0 * k.z;
    vec2 d = normalize(vec2(0.7, -0.4 + 0.6 * k.x));
    h = max(h, unit(p, cc, H, vec4(900.0, 1300.0, 800.0, 900.0) * (0.8 + 0.4 * k.y), 0.12,
                    cc + d * 20.0, d, H - 4.0, 0.00015, 10.0));
  }
  return h * smoothstep(1900.0, 2600.0, r) - 300.0 * (1.0 - smoothstep(1900.0, 2600.0, r));
}

/* a slow wander of the ground under all of it, so no edge is drawn
   with a ruler */
vec2 warp(vec2 p) {
  return p + 22.0 * vec2(noise(p * 0.0021 + 3.1), noise(p * 0.0021 + 9.7)) - 11.0;
}

/* the height of the dunes over the floor; below zero the floor shows */
float dunes(vec2 p) {
  vec2 q = warp(p);
  return max(max(bigDaddy(q), ringDunes(q)), farDunes(q));
}

/* --------------------------------------------------------------- trees */

/* the dead camelthorns: x, z, height (negative for a fallen one), seed */
const int NT = 23;
const vec4 TREES[NT] = vec4[NT](
  vec4(-10.5, 25.0, 6.6, 1.0),
  vec4(9.5, 41.0, 5.4, 2.0),
  vec4(-31.0, 92.0, 5.8, 3.0),
  vec4(26.0, 128.0, 6.4, 4.0),
  vec4(-58.0, 170.0, 4.6, 5.0),
  vec4(52.0, 215.0, 7.0, 6.0),
  vec4(-17.0, 265.0, 5.2, 7.0),
  vec4(96.0, 300.0, 6.0, 8.0),
  vec4(-104.0, 335.0, 5.6, 9.0),
  vec4(4.0, 390.0, 6.4, 10.0),
  vec4(61.0, 432.0, 4.4, 11.0),
  vec4(-150.0, 300.0, 6.2, 12.0),
  vec4(40.0, 520.0, 5.0, 13.0),
  vec4(-30.0, 470.0, 7.2, 14.0),
  vec4(30.0, 600.0, 5.4, 15.0),
  vec4(-75.0, 300.0, 5.0, 16.0),
  vec4(-120.0, 320.0, 5.4, 19.0),
  vec4(110.0, 250.0, 5.8, 20.0),
  vec4(75.0, 350.0, 4.8, 21.0),
  vec4(-40.0, 335.0, 6.0, 22.0),
  vec4(-6.0, 105.0, 5.0, 23.0),
  vec4(16.0, 33.0, -5.2, 17.0),
  vec4(-46.0, 140.0, -6.0, 18.0)
);

/* a tree as tapered capsules: a short thick trunk with two roots over
   the clay, splitting low into two to four heavy limbs that lean out and
   twist, each a chain of four kinked segments thinning to a bare tip,
   with up to two long side branches of two segments and one snag. Each
   tree takes its habit from its seed: a vase, a split near the ground,
   one dominant leaning limb, or low and wide. A fallen one is a trunk
   laid on the clay with its root plate and broken limbs */
const int NC = 39;
vec4 cA[NC], cB[NC];
vec4 limbB[4];
int nLimb;

float capD(vec3 p, vec4 a, vec4 b) {
  vec3 pa = p - a.xyz, ba = b.xyz - a.xyz;
  float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(a.w, b.w, h);
}

/* one limb from p along dir, slots 3 + 9i on: four segments, two side
   branches of two segments, a snag. The radius thins along the whole
   length to a bare tip; each joint kinks the limb by kink */
void buildLimb(int i, vec3 p, vec3 dir, float len, float r0, float s, float up, float kink) {
  int j = 3 + i * 9;
  vec3 lo = p - r0, hi = p + r0;
  vec3 jp[5];
  vec3 jd[5];
  float jr[5];
  jp[0] = p; jd[0] = dir; jr[0] = r0;
  float run = 0.0;
  for (int k = 0; k < 4; k++) {
    vec3 g = hash33(vec3(s + float(i) * 3.1, float(k), 8.7)) - 0.5;
    /* each joint kinks the limb, swinging it to one side then the other */
    vec3 sw = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + 1e-4) * ((k & 1) == 0 ? 1.0 : -1.0) * (0.25 + g.x);
    if (k > 0) dir = normalize(dir + (g + sw) * kink + vec3(0.0, up, 0.0));
    float sl = len * (k == 0 ? 0.32 : (k == 1 ? 0.28 : (k == 2 ? 0.22 : 0.18)));
    vec3 q = p + dir * sl;
    run += sl;
    float r1 = mix(r0, 0.016, pow(run / len, 0.75));
    cA[j + k] = vec4(p, k == 0 ? r0 : jr[k]);
    cB[j + k] = vec4(q, r1);
    jp[k + 1] = q; jd[k + 1] = dir; jr[k + 1] = r1;
    lo = min(lo, q);
    hi = max(hi, q);
    p = q;
  }
  /* side branches off the first and second joints, leaving at a slant
     and climbing, each kinked once */
  for (int m = 0; m < 2; m++) {
    vec3 g = hash33(vec3(s * 1.3 + float(i), float(m), 4.1)) - 0.5;
    vec3 o = jp[m + 1];
    vec3 pd = jd[m + 1];
    vec3 side = normalize(cross(pd, vec3(g.x, 1.0, g.z) + 0.2));
    float sd = g.y > 0.0 ? 1.0 : -1.0;
    vec3 bd = normalize(pd * 0.7 + side * sd * (0.55 + 0.4 * abs(g.z)) + vec3(0.0, 0.15, 0.0));
    float bl = len * (m == 0 ? 0.42 : 0.3) * (0.6 + 0.8 * abs(g.x));
    float br = jr[m + 1] * 0.62;
    vec3 q1 = o + bd * bl * 0.55;
    bd = normalize(bd + (hash33(vec3(s, float(m) + 7.0, float(i))) - 0.5) * kink + vec3(0.0, up, 0.0));
    vec3 q2 = q1 + bd * bl * 0.45;
    cA[j + 4 + m * 2] = vec4(o, br);
    cB[j + 4 + m * 2] = vec4(q1, br * 0.5);
    cA[j + 5 + m * 2] = vec4(q1, br * 0.5);
    cB[j + 5 + m * 2] = vec4(q2, 0.014);
    lo = min(lo, min(q1, q2));
    hi = max(hi, max(q1, q2));
  }
  /* a snag off the third joint */
  vec3 g = hash33(vec3(s, float(i), 6.6)) - 0.5;
  vec3 sdir = normalize(jd[3] + normalize(cross(jd[3], vec3(0.3, 1.0, g.x))) * (g.y > 0.0 ? 0.9 : -0.9) + vec3(0.0, 0.3, 0.0));
  vec3 sq = jp[3] + normalize(sdir + jd[3]) * len * (0.2 + 0.14 * abs(g.z));
  cA[j + 8] = vec4(jp[3], jr[3] * 0.75);
  cB[j + 8] = vec4(sq, 0.012);
  lo = min(lo, sq);
  hi = max(hi, sq);
  limbB[i] = vec4(0.5 * (lo + hi), 0.5 * length(hi - lo) + r0);
}

void buildTree(vec4 T) {
  float H = abs(T.z), s = T.w;
  vec3 r0 = hash33(vec3(s * 7.13, s * 1.71 + 3.0, 5.3));
  vec3 r1 = hash33(vec3(s * 3.7, 9.2, s * 0.61));
  float a0 = r0.x * TAU;
  if (T.z < 0.0) {
    /* fallen: the trunk lies along d, its root end propped on the root
       plate, sagging to the clay and lifting a little where a broken limb
       holds it, twisting as it goes; two snapped limbs stand off it */
    float al = 0.3 + (r0.x - 0.5) * 0.7;
    vec3 d = vec3(cos(al), 0.0, sin(al)) * (r0.y > 0.5 ? 1.0 : -1.0), dz = vec3(-d.z, 0.0, d.x);
    float rb = 0.24 + 0.06 * r0.y;
    cA[0] = vec4(vec3(0.0, 0.42, 0.0), rb * 1.25);
    cB[0] = vec4(d * 0.5 + vec3(0.0, 0.38, 0.0), rb * 1.05);
    cA[1] = vec4(cA[0].xyz, rb * 0.7);
    cB[1] = vec4(-d * 0.35 + dz * 0.7 - vec3(0.0, 0.05, 0.0), 0.07);
    cA[2] = vec4(cA[0].xyz, rb * 0.7);
    cB[2] = vec4(-d * 0.25 - dz * 0.8 + vec3(0.0, 0.0, 0.0), 0.06);
    nLimb = 1;
    vec3 p = cB[0].xyz;
    float r = rb * 1.05;
    vec3 lo = vec3(-1.0, 0.0, -1.0) - 1.0, hi = p + 1.0;
    for (int k = 0; k < 4; k++) {
      vec3 g = hash33(vec3(s, float(k), 1.9)) - 0.5;
      vec3 q = p + d * H * 0.22 + dz * g.x * 0.7;
      float r2 = mix(rb, 0.07, float(k + 1) / 4.0);
      q.y = r2 + (k == 2 ? 0.25 + 0.2 * g.y : 0.02);
      cA[3 + k] = vec4(p, r);
      cB[3 + k] = vec4(q, r2);
      lo = min(lo, q - 1.0);
      hi = max(hi, q + 1.0);
      p = q;
      r = r2;
    }
    /* snapped limbs: short, blunt, one propping the trunk */
    for (int m = 0; m < 2; m++) {
      vec3 g = hash33(vec3(s, float(m), 5.5)) - 0.5;
      vec3 o = cB[3 + m * 2].xyz;
      vec3 bd = normalize(d * 0.6 + dz * (m == 0 ? 1.0 : -1.0) * 0.7 + vec3(0.0, m == 0 ? 0.9 : -0.4, 0.0));
      vec3 q1 = o + bd * (0.7 + 0.5 * abs(g.x));
      q1.y = max(q1.y, 0.05);
      cA[7 + m * 2] = vec4(o, cB[3 + m * 2].w * 0.6);
      cB[7 + m * 2] = vec4(q1, 0.05);
      cA[8 + m * 2] = vec4(q1, 0.05);
      cB[8 + m * 2] = vec4(q1 + normalize(bd + d + g) * 0.3, 0.035);
    }
    cA[11] = vec4(cB[4].xyz, 0.04);
    cB[11] = vec4(cB[4].xyz + dz * 0.4 + vec3(0.0, 0.25, 0.0), 0.02);
    limbB[0] = vec4(0.5 * (lo + hi), 0.5 * length(hi - lo) + 0.6);
    return;
  }
  /* the habit: 0 a vase, 1 split near the ground, 2 one dominant limb,
     3 low and wide */
  int hab = int(r1.x * 3.99);
  if (s < 1.5) hab = 1;
  float hf = H * (hab == 0 ? 0.26 + 0.12 * r0.z : (hab == 1 ? 0.04 + 0.06 * r0.z : (hab == 2 ? 0.16 + 0.12 * r0.z : 0.1 + 0.08 * r0.z)));
  nLimb = hab == 1 ? 2 + int(r0.y * 1.99) : (hab == 2 ? 2 + int(r0.y * 1.6) : 3 + int(r0.y * 1.99));
  if (s < 1.5) nLimb = 3;
  /* the trunk leans */
  float la = r1.y * TAU, lean = (hab == 2 ? 0.18 : 0.08) + 0.12 * r1.z;
  vec3 ld = vec3(cos(la) * sin(lean), cos(lean), sin(la) * sin(lean));
  vec3 fk = ld * hf / ld.y;
  float rb = 0.034 * H + 0.11;
  cA[0] = vec4(0.0, -0.4, 0.0, rb * 1.4);
  cB[0] = vec4(fk, rb * 0.95);
  for (int k = 0; k < 2; k++) {
    float ra = a0 + 1.3 + float(k) * 2.4 + r0.z;
    cA[1 + k] = vec4(0.0, 0.2, 0.0, rb * 0.55);
    cB[1 + k] = vec4(cos(ra) * H * 0.13, 0.0, sin(ra) * H * 0.13, 0.04);
  }
  float kink = 0.85 + 0.5 * r1.z;
  for (int i = 0; i < 4; i++) {
    if (i >= nLimb) break;
    vec3 h = hash33(vec3(s, float(i) + 0.5, 2.9));
    float az = a0 + (float(i) + 0.6 * (h.x - 0.5)) * TAU / float(nLimb);
    float tilt = hab == 0 ? 0.32 + 0.3 * h.y : (hab == 1 ? 0.45 + 0.35 * h.y : (hab == 2 ? (i == 0 ? 0.1 + 0.15 * h.y : 0.6 + 0.35 * h.y) : 0.75 + 0.35 * h.y));
    vec3 dir = normalize(vec3(sin(tilt) * cos(az), cos(tilt), sin(tilt) * sin(az)) + ld - vec3(0.0, 1.0, 0.0));
    float reach = hab == 3 ? 0.75 : 1.0;
    float len = (H - hf) * reach * (0.85 + 0.3 * h.z) / max(cos(tilt * 0.7), 0.45);
    float lr = rb * (hab == 2 && i == 0 ? 0.88 : 0.58 + 0.2 * h.x);
    if (hab == 2 && i > 0) len *= 0.65;
    buildLimb(i, fk + dir * rb * 0.3, dir, len, lr, s, hab == 3 ? 0.08 : 0.17, kink);
  }
}

float treeD(vec3 p) {
  float d = capD(p, cA[0], cB[0]);
  d = smin(d, min(capD(p, cA[1], cB[1]), capD(p, cA[2], cB[2])), 0.15);
  for (int i = 0; i < 4; i++) {
    if (i >= nLimb) break;
    if (length(p - limbB[i].xyz) - limbB[i].w > d) continue;
    int j = 3 + i * 9;
    float l = capD(p, cA[j], cB[j]);
    for (int k = 1; k < 9; k++) l = min(l, capD(p, cA[j + k], cB[j + k]));
    d = smin(d, l, 0.1);
  }
  return d;
}

/* the capsule nearest p, for the grain of the wood: its axis in xyz, how
   far along it in w */
vec4 treeAxis(vec3 p) {
  float best = 1e9;
  vec4 ax = vec4(0.0, 1.0, 0.0, 0.0);
  int n = 3 + nLimb * 9;
  for (int k = 0; k < NC; k++) {
    if (k >= n) break;
    vec3 pa = p - cA[k].xyz, ba = cB[k].xyz - cA[k].xyz;
    float h = sat(dot(pa, ba) / dot(ba, ba));
    float d = length(pa - ba * h) - mix(cA[k].w, cB[k].w, h);
    if (d < best) { best = d; ax = vec4(normalize(ba), h * length(ba) + float(k) * 3.7); }
  }
  return ax;
}

/* the span of a ray inside a tree's box */
vec2 treeBox(vec3 ro, vec3 rd, vec4 T) {
  float H = abs(T.z);
  float R = T.z < 0.0 ? H * 0.95 : H * 0.95;
  vec3 lo = vec3(T.x - R, -0.5, T.y - R), hi = vec3(T.x + R, T.z < 0.0 ? 2.0 : H * 1.12, T.y + R);
  vec3 inv = 1.0 / rd;
  vec3 t0 = (lo - ro) * inv, t1 = (hi - ro) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  return vec2(max(max(tn.x, tn.y), tn.z), min(min(tf.x, tf.y), tf.z));
}

/* the nearest tree along a ray, before tmax: x its distance, y how much
   of the pixel it covers, z which tree */
vec3 traceTrees(vec3 ro, vec3 rd, float tmax, float pix) {
  vec3 best = vec3(1e9, 0.0, -1.0);
  for (int i = 0; i < NT; i++) {
    vec4 T = TREES[i];
    vec2 span = treeBox(ro, rd, T);
    span.x = max(span.x, 0.05);
    span.y = min(span.y, tmax);
    if (span.x >= span.y || span.x > best.x) continue;
    buildTree(T);
    vec3 base = vec3(T.x, 0.0, T.y);
    float t = span.x, mm = 1e9, tm = 0.0;
    bool hit = false;
    for (int k = 0; k < 64; k++) {
      float d = treeD(ro + rd * t - base);
      float m = d / (t * pix);
      if (m < mm) { mm = m; tm = t; }
      if (m < 0.2) { hit = true; break; }
      t += max(d * 0.85, t * pix * 0.3);
      if (t > span.y) break;
    }
    float cov = hit ? 1.0 : sat(0.6 - mm) / 0.6;
    if (cov > 0.0 && (hit ? t : tm) < best.x && cov >= best.y * 0.5) best = vec3(hit ? t : tm, cov, float(i));
  }
  return best;
}

/* how much light gets past the trees from p toward L */
float treeShadow(vec3 p, vec3 L) {
  float res = 1.0;
  for (int i = 0; i < NT; i++) {
    vec4 T = TREES[i];
    vec2 span = treeBox(p, L, T);
    span.x = max(span.x, 0.02);
    if (span.x >= span.y) continue;
    buildTree(T);
    vec3 base = vec3(T.x, 0.0, T.y);
    float t = span.x;
    for (int k = 0; k < 64; k++) {
      float d = treeD(p + L * t - base);
      res = min(res, d / (0.012 * t + 0.004));
      if (res < 0.0) return 0.0;
      t += max(d * 0.9, 0.004 + 0.002 * t);
      if (t > span.y) break;
    }
  }
  return smoothstep(0.0, 1.0, res);
}

/* -------------------------------------------------------------- lights */

vec3 gL, gLd, gSunE, gSkyE, gGndE, gM, gMoonE;
float gWS, gWM, gFu;

/* the sky: deep and dry, paler toward the horizon, brighter toward the
   sun; at dusk a warm glow along the west and the belt of Venus in the
   east; at night airglow near the horizon */
vec3 skyDay(vec3 rd) {
  float e = max(rd.y, 0.0);
  float c = dot(rd, gL);
  vec3 col = mix(vec3(0.006, 0.08, 0.29), vec3(0.19, 0.38, 0.72), exp(-e * 5.0));
  col *= 0.86 + 0.14 * c * c;
  col += vec3(0.30, 0.27, 0.22) * pow(sat(c), 24.0) + vec3(0.012, 0.012, 0.011) * pow(sat(c), 3.0);
  return col;
}
vec3 skyDusk(vec3 rd) {
  float e = max(rd.y, 0.0);
  vec2 ah = normalize(rd.xz + 1e-5), sh = normalize(gL.xz + 1e-5);
  float ang = acos(clamp(dot(ah, sh), -1.0, 1.0));
  float glow = exp(-ang * ang / 2.6);
  float c = dot(rd, gL);
  vec3 hor = glow < 0.4 ? mix(vec3(0.17, 0.25, 0.40), vec3(0.58, 0.44, 0.34), glow / 0.4) : mix(vec3(0.58, 0.44, 0.34), vec3(1.1, 0.6, 0.25), (glow - 0.4) / 0.6);
  vec3 col = mix(vec3(0.012, 0.050, 0.165), hor, exp(-e * mix(11.0, 4.5, glow * glow)));
  col += vec3(0.05, 0.03, 0.035) * (1.0 - glow) * exp(-pow((e - 0.06) / 0.05, 2.0));
  col += vec3(1.5, 0.75, 0.3) * pow(sat(c), 16.0) + vec3(0.2, 0.1, 0.04) * pow(sat(c), 3.0);
  return col;
}
vec3 skyNight(vec3 rd) {
  float e = max(rd.y, 0.0);
  return mix(vec3(0.0011, 0.0018, 0.0042), vec3(0.0034, 0.0038, 0.0058), exp(-e * 6.0));
}
vec3 skyBase(vec3 rd) {
  vec3 s = mix(skyDay(rd), skyDusk(rd), gFu) * gWS;
  return s + skyNight(rd) * gWM;
}

/* ---------------------------------------------------------- night sky */

vec3 starsAt(vec3 rd, float pix, float mw) {
  vec3 col = vec3(0.0);
  float sig = max(pix, 6e-4) * 0.75;
  for (int l = 0; l < 4; l++) {
    float fl = float(l);
    float sc = fl == 0.0 ? 70.0 : (fl == 1.0 ? 160.0 : (fl == 2.0 ? 360.0 : 820.0));
    vec3 cell = floor(rd * sc);
    vec3 h = hash33(cell + fl * 17.31);
    float occ = fl == 0.0 ? 0.1 : (fl == 1.0 ? 0.28 : (fl == 2.0 ? 0.18 + 0.7 * mw : 0.03 + 0.6 * mw));
    if (h.x > occ) continue;
    vec3 sp = normalize(cell + 0.25 + 0.5 * hash33(cell * 1.7 + fl * 5.0));
    float d = length(rd - sp) / sig;
    float m = hash13(cell * 2.31 + 4.0 + fl);
    float flux = fl == 0.0 ? 1.2 * pow(m, 6.0) + 0.04 : (fl == 1.0 ? 0.07 * pow(m, 3.0) + 0.01 : (fl == 2.0 ? 0.018 * m : 0.01 * m));
    float tw = 1.0 + (0.15 + 0.4 * sat(1.0 - rd.y * 5.0)) * sin(mod(uTime, 600.0) * (1.7 + 4.0 * h.y) + h.z * TAU) * step(fl, 1.5);
    vec3 tint = mix(vec3(1.0, 0.78, 0.55), vec3(0.72, 0.84, 1.0), smoothstep(0.2, 0.8, h.y));
    col += tint * flux * tw * exp(-0.5 * d * d);
  }
  return col;
}

/* the Milky Way: a band of unresolved stars, gathered into clouds, the
   warm bulge of the core low over the dune's shoulder; the Great Rift
   running along it, splitting it in two for a stretch, and finer lanes of
   dust breaking the clouds. The resolved stars thicken in the band */
vec3 milky(vec3 rd, out float band) {
  vec3 GCORE = azel(12.0, 12.0);
  vec3 GAL = normalize(cross(GCORE, azel(-48.0, 42.0)));
  vec3 GY = cross(GAL, GCORE);
  /* galactic longitude from the core and latitude, in radians */
  float b = asin(clamp(dot(rd, GAL), -1.0, 1.0));
  float l = atan(dot(rd, GY), dot(rd, GCORE));
  vec2 g = vec2(l, b);
  /* a broad soft band, brightening toward the core and its bulge */
  float wid = 0.1 + 0.07 * exp(-l * l * 4.0);
  band = exp(-b * b / (wid * wid));
  float along = 0.4 + 0.6 * exp(-l * l * 1.1);
  float bulge = exp(-(l * l + b * b * 3.0) / 0.03);
  /* star clouds: gentle broad swells, and a fine grain of clouds and
     stars too faint to part */
  float swell = 0.85 + 0.3 * fbm(g * vec2(4.0, 9.0) + 3.1, 3);
  float grain = 0.72 + 0.28 * noise(g * vec2(70.0, 120.0)) + 0.22 * noise(g * vec2(190.0, 300.0)) - 0.11;
  /* the Great Rift: one lane of dust along the plane, wandering a little,
     soft at its edges, running through the bulge */
  float off = 0.016 * sin(l * 2.6 + 0.7) + 0.02 * (fbm(vec2(l * 3.0, 1.7), 3) - 0.5) + 0.004 * (noise(g * vec2(40.0, 60.0)) - 0.5);
  float rw = 0.024 + 0.01 * fbm(vec2(l * 4.0, 4.0), 2) + 0.012 * exp(-l * l * 6.0);
  float rift = exp(-pow((b - off) / rw, 2.0)) * (0.7 + 0.3 * fbm(vec2(l * 10.0, 2.0), 2));
  /* and a few thin lanes beside it, short and broken */
  float l1 = exp(-pow((b - 0.05 - 0.02 * sin(l * 7.0)) / 0.006, 2.0)) * smoothstep(0.62, 0.78, noise(vec2(l * 11.0, 3.0)));
  float l2 = exp(-pow((b + 0.055 + 0.02 * sin(l * 5.0 + 2.0)) / 0.007, 2.0)) * smoothstep(0.64, 0.8, noise(vec2(l * 9.0, 9.0)));
  float dust = sat(rift * 0.55 + (l1 + l2) * 0.28) * smoothstep(0.0, 0.3, band);
  float m = band * along * swell * grain * 0.9 + exp(-b * b / 0.08) * 0.05 + bulge * (1.1 + 0.4 * grain);
  vec3 col = mix(vec3(0.68, 0.77, 1.0), vec3(1.0, 0.85, 0.64), sat(bulge * 1.4 + 0.3 * band * along)) * m;
  return col * (1.0 - dust);
}

/* the moon at tonight's phase, lit from the side the sun is on */
vec3 moonDisc(vec3 rd, vec3 M, vec3 S, float pix) {
  float R = 0.0046;
  vec3 mx = normalize(cross(vec3(0.0, 1.0, 0.0), M));
  vec3 my = cross(M, mx);
  vec2 q = vec2(dot(rd, mx), dot(rd, my)) / R;
  float r = length(q);
  if (r > 1.6) return vec3(0.0);
  float cover = 1.0 - smoothstep(1.0 - pix / R, 1.0 + pix / R, r);
  vec3 nrm = vec3(q, sqrt(max(1.0 - r * r, 0.0)));
  vec2 sd = normalize(vec2(dot(S, mx), dot(S, my)) + 1e-4);
  float ph = uMoon * TAU;
  vec3 sdir = vec3(sd * sin(ph), -cos(ph));
  float lit = smoothstep(-0.04, 0.08, dot(nrm, sdir));
  float maria = smoothstep(0.45, 0.62, fbm(q * 1.6 + 3.7, 4));
  float alb = 0.9 - 0.32 * maria + 0.08 * noise(q * 9.0);
  return vec3(1.0, 0.97, 0.92) * cover * (alb * lit + 0.02);
}

/* ----------------------------------------------------------- the camera */

/* eye height on the pan. A wide frame holds its width of view and puts the
   horizon a little below the middle; a tall one narrows, and turns left
   so the summit and its crest stay in the picture. The pointer turns the
   head a little and steps it sideways, so the trees slide over the dune */
vec3 camRay(vec2 fc, out vec3 ro, out float pix) {
  float asp = uRes.x / uRes.y;
  float wide = smoothstep(0.7, 1.5, asp);
  float tanV = mix(0.41, max(0.62 / asp, 0.30), wide);
  float hor = mix(0.61, 0.625, wide);
  float yaw = radians(mix(-6.5, 0.0, wide)) + uPoint.x * 0.012;
  vec2 q = (fc - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 r = normalize(vec3(q.x * tanV, (q.y - 1.0 + 2.0 * hor) * tanV + uPoint.y * 0.006, 1.0));
  r.xz = rot(yaw) * r.xz;
  ro = vec3(uPoint.x * 0.8, EYE, 0.0);
  pix = 2.0 * tanV / uRes.y;
  return r;
}

/* the ray over the dunes: steps by its height over the sand over the
   steepest the sand rises, refined by bisection; it keeps its closest
   pass over a crest, in pixels, for the edge of the skyline */
float march(vec3 ro, vec3 rd, float pix, out float rmin, out float tr) {
  float tmax = 9000.0;
  if (rd.y > 0.0) tmax = min(tmax, (340.0 - ro.y) / rd.y);
  float lip = 0.92 / (abs(rd.y) + 0.78 * length(rd.xz));
  float t = 1.0, lt = 1.0, g = 1e9;
  rmin = 1e9; tr = 0.0;
  for (int i = 0; i < 160; i++) {
    vec3 p = ro + rd * t;
    g = p.y - dunes(p.xz);
    if (g < 0.0) {
      float a = lt, b = t;
      for (int j = 0; j < 7; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - dunes(q.xz) < 0.0) b = m; else a = m;
      }
      return 0.5 * (a + b);
    }
    float r = g / (t * pix);
    if (r < rmin && t > 50.0) { rmin = r; tr = t; }
    lt = t;
    t += max(g * lip, 0.3 + t * 0.004);
    if (t > tmax) return -1.0;
  }
  /* out of steps only while skimming a crest: call it met */
  return g < 8.0 + t * pix * 8.0 ? t : -1.0;
}

/* the sun or moon reaching p past the dunes: a short march along the
   light, soft by the pixel's footprint */
float duneShadow(vec3 p, vec3 L, float fp) {
  float lip = 0.9 / (L.y + 0.78 * length(L.xz));
  float res = 1.0;
  float t = 1.0 + fp;
  for (int i = 0; i < 40; i++) {
    vec3 q = p + L * t;
    float g = q.y - dunes(q.xz);
    res = min(res, g / (t * 0.01 + fp));
    if (res < 0.0 || q.y > 340.0) break;
    t += clamp(g * lip, 0.5 + t * 0.02, 400.0);
  }
  return smoothstep(0.0, 1.0, res);
}

vec3 duneNormal(vec2 p, float e) {
  float a = max(dunes(p + vec2(e, 0.0)), 0.0), b = max(dunes(p - vec2(e, 0.0)), 0.0);
  float c = max(dunes(p + vec2(0.0, e)), 0.0), d = max(dunes(p - vec2(0.0, e)), 0.0);
  return normalize(vec3(b - a, 2.0 * e, d - c));
}

/* ------------------------------------------------------------ shading */

/* the light falling on a surface facing n at p, from the sun, the sky,
   the ground, and the moon */
vec3 lightAt(vec3 p, vec3 n, float sh, float shM, float occ) {
  float dif = max(dot(n, gL), 0.0);
  float difM = max(dot(n, gM), 0.0);
  vec3 sky = gSkyE * (0.55 + 0.45 * n.y) * occ;
  vec3 gnd = gGndE * (0.5 - 0.5 * n.y);
  return gSunE * dif * sh + sky + gnd + gMoonE * difM * shM;
}

/* the red sand: the grainflow tongues on the slip faces, the smooth
   backs, grass at the feet */
vec3 sandAlbedo(vec3 p, vec3 n, float fp) {
  vec3 alb = vec3(0.62, 0.155, 0.072);
  float mott = noise(p.xz * 0.006) * 0.6 + noise(p.xz * 0.023) * 0.4;
  alb *= 0.88 + 0.24 * mott;
  float steep = smoothstep(0.88, 0.82, n.y);
  /* along the contour and down the fall line */
  vec2 fl = normalize(n.xz + 1e-5);
  float u = dot(p.xz, vec2(-fl.y, fl.x));
  float v = p.y;
  float lod = smoothstep(4.0, 0.6, fp);
  float tongue = noise(vec2(u * 0.15, v * 0.03 + noise(vec2(u * 0.03, 3.0)) * 3.0));
  float fine = noise(vec2(u * 0.6, v * 0.08));
  float scar = noise(vec2(u * 0.02, v * 0.008) + 5.0);
  float gf = 0.22 * (smoothstep(0.5, 0.8, tongue) - 0.2) + 0.1 * (fine - 0.5) * lod + 0.12 * (scar - 0.5);
  alb *= 1.0 + gf * steep;
  /* the backs: broad soft mottling, faint streaks along the wind */
  float back = noise(p.xz * 0.0043 + 9.0) * 0.5 + noise(rot(0.7) * p.xz * 0.013) * 0.3 + noise(rot(2.1) * p.xz * 0.037) * 0.2;
  alb *= 1.0 + 0.1 * (back - 0.5) * (1.0 - steep);
  /* the backs a touch paler and duller */
  alb = mix(alb, alb * vec3(1.04, 1.12, 1.15), (1.0 - steep) * 0.6);
  /* grass on the lower slopes and the foot */
  float low = smoothstep(60.0, 5.0, p.y);
  vec2 gc = floor(p.xz / 11.0);
  vec3 gh = hash33(vec3(gc, 9.1));
  float tuft = step(gh.z, 0.22 * low) * sat((0.3 + 0.6 * gh.x - length(p.xz - (gc + 0.2 + 0.6 * gh.xy) * 11.0)) / max(fp, 0.05) + 0.5);
  float mean = 0.22 * low * 0.012;
  float tf = mix(mean, tuft, smoothstep(2.5, 0.8, fp));
  alb = mix(alb, vec3(0.07, 0.068, 0.05), sat(tf) * 0.9);
  return alb;
}

/* the edges of the cells of a jittered grid: x how far from the nearest
   edge, y the cell's own number */
vec2 cells(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0;
  vec2 id = vec2(0.0);
  for (int k = 0; k < 9; k++) {
    vec2 o = vec2(float(k % 3) - 1.0, float(k / 3) - 1.0);
    vec2 c = o + hash22(i + o) * 0.85 - f;
    float d = dot(c, c);
    if (d < d1) { d2 = d1; d1 = d; id = i + o; }
    else if (d < d2) d2 = d;
  }
  return vec2((sqrt(d2) - sqrt(d1)) * 0.5, hash12(id));
}

/* a crack along the edges of a cell field, as the pixel sees it: e how
   far from the edge in metres, w the crack's width; wider than the pixel
   it is solid, narrower it is a faint line, so it never shimmers */
float crackAA(float e, float w, float fp) {
  return smoothstep(max(w, fp) * 1.2, 0.0, e) * min(1.0, (w + 0.001) / fp);
}

/* the clay: near white and a little warm, whiter in some places and
   dustier and rougher in others; dried into plates a few tenths of a
   metre across, edged by thin dark cracks and split again by finer ones,
   their rims lifted and catching the light, each plate its own tone;
   red sand washed onto it toward the dune feet and in drifts */
vec3 panAlbedo(vec3 p, float fp, float near) {
  vec3 alb = vec3(0.84, 0.665, 0.48);
  float big = fbm(p.xz * 0.009 + 7.0, 3);
  float mid = noise(p.xz * 0.07) * 0.6 + noise(p.xz * 0.27) * 0.4;
  alb *= (0.74 + 0.42 * big) * (0.94 + 0.12 * mid);
  alb = mix(alb, alb * vec3(1.0, 0.93, 0.86), smoothstep(0.55, 0.3, big));
  /* rougher, dustier patches */
  float rough = smoothstep(0.5, 0.75, noise(p.xz * 0.22 + 11.0) * 0.7 + noise(p.xz * 0.9) * 0.3);
  alb *= 1.0 - 0.1 * rough;
  alb = mix(alb, alb * vec3(0.97, 0.95, 0.94), rough);
  vec3 sandC = vec3(0.6, 0.25, 0.12);
  /* the plates and their cracks, where they are big enough to draw */
  float lp = smoothstep(0.11, 0.035, fp);
  float mean = 0.955;
  if (lp > 0.0) {
    vec2 w = p.xz + 0.12 * vec2(noise(p.xz * 2.1), noise(p.xz * 2.1 + 5.0)) - 0.06;
    const float CS = 0.42;
    vec2 c = cells(w / CS);
    float e = c.x * CS;
    float crack = crackAA(e, 0.006 + 0.006 * noise(p.xz * 4.0), fp);
    float rim = smoothstep(0.05, 0.012, e) * (1.0 - crack) * smoothstep(0.03, 0.01, fp);
    /* finer cracks splitting some plates */
    vec2 c2 = cells(w / 0.19 + 3.7);
    float crack2 = crackAA(c2.x * 0.19, 0.0035, fp) * smoothstep(0.35, 0.6, noise(w * 1.3 + c.y * 9.0));
    float tone = 0.95 + 0.09 * c.y + 0.04 * (c2.y - 0.5);
    vec3 plate = alb * tone * (1.0 + 0.06 * rim);
    plate *= 1.0 - 0.5 * crack - 0.28 * crack2;
    /* sand caught in the wider cracks */
    plate = mix(plate, sandC * 0.8, crack * 0.25 * near);
    alb = mix(alb * mean, plate, lp);
  } else {
    alb *= mean;
  }
  /* the big plates a few metres across, their seams faint */
  float lb = smoothstep(0.25, 0.06, fp);
  if (lb > 0.0) {
    vec2 c = cells(p.xz / 2.2 + 0.3 * vec2(noise(p.xz * 0.4), noise(p.xz * 0.4 + 5.0)));
    float gap = crackAA(c.x * 2.2, 0.02, fp) * smoothstep(0.35, 0.65, noise(p.xz * 0.5 + 3.0));
    alb *= mix(1.0, 0.97 + 0.05 * c.y, lb);
    alb = mix(alb, alb * vec3(0.8, 0.74, 0.7), gap * lb);
  }
  /* red sand washed toward the dune feet, and blown into drifts */
  float drift = smoothstep(0.58, 0.82, noise(p.xz * 0.016 + 2.0) * 0.65 + noise(p.xz * vec2(0.09, 0.05)) * 0.35);
  float sand = max(near, drift * 0.55);
  alb = mix(alb, sandC * (0.9 + 0.2 * mid), sat(sand) * 0.8);
  /* tufts of grass where the sand has gathered */
  vec2 gc = floor(p.xz / 7.0);
  vec3 gh = hash33(vec3(gc, 5.7));
  float toe = smoothstep(0.55, 0.75, near);
  float tuft = step(gh.z, 0.35 * toe) * sat((0.25 + 0.5 * gh.x - length(p.xz - (gc + 0.2 + 0.6 * gh.xy) * 7.0)) / max(fp, 0.03) + 0.5);
  float tf = mix(0.35 * toe * 0.02, tuft, smoothstep(2.0, 0.6, fp));
  alb = mix(alb, mix(vec3(0.09, 0.1, 0.05), vec3(0.2, 0.19, 0.1), gh.y), sat(tf));
  return alb;
}

/* the clay or the sand the eye ray met at t */
vec3 shadeGround(vec3 ro, vec3 rd, float t, float pix, bool onDune) {
  vec3 p = ro + rd * t;
  float fp = t * pix;
  vec3 n = vec3(0.0, 1.0, 0.0);
  float f = dunes(p.xz);
  vec3 alb;
  float occ = 1.0;
  if (onDune) {
    float e = max(0.6, fp * 0.8);
    n = duneNormal(p.xz, e);
    /* the backs are not turned on a lathe: broad low swells over them */
    float back = 1.0 - smoothstep(0.88, 0.82, n.y);
    vec2 wq = rot(0.6) * p.xz;
    vec3 w1 = noised(p.xz * 0.0031 + 4.0), w2 = noised(wq * vec2(0.0055, 0.0097) + 1.0), w3 = noised(rot(1.9) * p.xz * 0.017 + 6.0);
    vec2 gw = w1.yz * 0.0031 * 9.0 + (w2.yz * vec2(0.0055, 0.0097) * 4.0) * rot(0.6) + (w3.yz * 0.017 * 0.6) * rot(1.9) * smoothstep(3.0, 0.8, fp);
    n = normalize(n - vec3(gw.x, 0.0, gw.y) * back);
    /* the slip faces: grainflow lobes running down from the brink, a
       little proud of the face, so a grazing sun picks out their flanks */
    float lob = (1.0 - back) * smoothstep(4.0, 1.2, fp);
    if (lob > 0.0) {
      vec2 cd = normalize(vec2(-n.z, n.x) + 1e-5);
      float u = dot(p.xz, cd), v = p.y + 8.0 * noise(vec2(u * 0.02, 1.0));
      u += 9.0 * noise(vec2(v * 0.03, u * 0.01 + 4.0));
      vec3 l1 = noised(vec2(u * 0.075, v * 0.016) + 2.0);
      vec3 l2 = noised(vec2(u * 0.22, v * 0.045) + 7.0);
      /* the tongues come and go down the face */
      float m = smoothstep(0.25, 0.7, noise(vec2(u * 0.03, v * 0.012) + 5.0));
      float tilt = (l1.y * 0.075 * 2.8 * (0.35 + 0.65 * m) + l2.y * 0.22 * 0.3) * lob;
      n = normalize(n + vec3(cd.x, 0.0, cd.y) * tilt);
    }
    alb = sandAlbedo(p, n, fp);
    /* the foot of a slope sees less of the sky */
    occ = 0.75 + 0.25 * smoothstep(0.0, 40.0, p.y);
  } else {
    p.y = 0.0;
    float near = pow(smoothstep(-80.0, -2.0, f), 1.6) * (0.45 + 0.4 * noise(p.xz * 0.05)) + 0.35 * smoothstep(-8.0, -1.0, f);
    alb = panAlbedo(p, fp, near);
    occ = 0.85 + 0.15 * smoothstep(-80.0, -10.0, -f);
  }
  float sh = 1.0, shM = 1.0;
  if (dot(n, gL) > 0.0 && gWS > 0.001) {
    sh = duneShadow(p + n * 0.3, gL, fp);
    if (!onDune && sh > 0.0) sh *= treeShadow(p + vec3(0.0, 0.02, 0.0), gL);
  }
  if (gWM > 0.001 && dot(n, gM) > 0.0) shM = duneShadow(p + n * 0.3, gM, fp);
  vec3 col = alb * lightAt(p, n, sh, shM, occ) / PI;
  /* a breath of air over the far sand */
  vec3 air = skyBase(normalize(vec3(rd.x, 0.02, rd.z)));
  col = mix(col, air, sat(t / 60000.0));
  return col;
}

/* the dead wood: blackened charcoal in shade, sun-bleached to a silvery
   grey-brown where it faces the sun, split along its length by fissures;
   the fallen trunks bleached paler */
vec3 shadeTree(vec3 ro, vec3 rd, float t, float pix, int i) {
  vec4 T = TREES[i];
  buildTree(T);
  vec3 base = vec3(T.x, 0.0, T.y);
  vec3 p = ro + rd * t;
  vec3 lp = p - base;
  float e = max(0.004, t * pix * 0.5);
  vec2 k = vec2(1.0, -1.0);
  vec3 n = normalize(k.xyy * treeD(lp + k.xyy * e) + k.yyx * treeD(lp + k.yyx * e) + k.yxy * treeD(lp + k.yxy * e) + k.xxx * treeD(lp + k.xxx * e));
  /* the fissures run along the wood */
  vec4 ax = treeAxis(lp);
  vec3 u1 = normalize(cross(ax.xyz, abs(ax.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 u2 = cross(ax.xyz, u1);
  float ang = atan(dot(n, u2), dot(n, u1));
  float fine = smoothstep(0.06, 0.006, t * pix);
  float fis = noise(vec2(ang * 5.0, ax.w * 1.3)) * 0.6 + noise(vec2(ang * 13.0, ax.w * 3.5)) * 0.4;
  float groove = smoothstep(0.45, 0.75, fis);
  bool fallen = T.z < 0.0;
  vec3 alb = fallen ? vec3(0.21, 0.195, 0.18) : vec3(0.088, 0.081, 0.075);
  alb *= 1.0 - (0.55 * groove - 0.12) * fine;
  alb *= 0.9 + 0.2 * noise(lp.xz * 3.0 + lp.y * 2.0);
  /* near the ground the wood is darker still, and the sand has climbed it */
  alb *= mix(0.75, 1.0, smoothstep(0.0, 0.6, lp.y));
  float sh = 1.0;
  float dif = max(dot(n, gL), 0.0);
  if (dif > 0.0 && gWS > 0.001) sh = duneShadow(p, gL, t * pix);
  /* weathered wood turns silvery toward the sun */
  float sheen = 1.0 + 0.75 * sat(dif) * sh * (1.0 - 0.5 * groove * fine);
  vec3 sky = gSkyE * (0.55 + 0.45 * n.y) * 0.75;
  vec3 ePan = gSunE * max(gL.y, 0.0) * sh + gSkyE + gMoonE * max(gM.y, 0.0);
  vec3 gnd = vec3(0.78, 0.64, 0.5) * ePan * (0.5 - 0.5 * n.y) * 0.55;
  vec3 L = gSunE * dif * sh * sheen + sky + gnd + gMoonE * max(dot(n, gM), 0.0);
  return alb * L / PI;
}

/* ------------------------------------------------------------ the frame */

vec3 scene(vec2 fc) {
  vec3 ro;
  float pix;
  vec3 rd = camRay(fc, ro, pix);

  /* the sun from the west-northwest in the afternoon, low in the west at
     dusk; while it hands over to the moon both fade, so a turn to night
     passes through dim twilight */
  float ws = uLook.x + uLook.y;
  gFu = uLook.y / max(ws, 1e-4);
  gL = normalize(mix(azel(-68.0, 37.0), azel(-110.0, 6.0), gFu));
  gWS = ws * max(0.0, 1.0 - 3.8 * ws * uLook.z);
  gWM = uLook.z;
  gSunE = mix(vec3(4.7, 4.0, 3.2), vec3(7.4, 3.4, 1.25), gFu) * gWS;
  gSkyE = mix(vec3(0.42, 0.62, 1.05), vec3(0.21, 0.27, 0.56), gFu) * gWS + vec3(0.010, 0.014, 0.026) * gWM;
  gGndE = mix(vec3(0.55, 0.38, 0.26), vec3(0.20, 0.13, 0.10), gFu) * gWS + vec3(0.004, 0.004, 0.005) * gWM;
  gM = azel(26.0, 17.0);
  gLd = azel(-110.0, -12.0);
  gMoonE = vec3(0.62, 0.66, 0.72) * gWM;

  float rmin, tr;
  float t = march(ro, rd, pix, rmin, tr);
  float tg = rd.y < 0.0 ? ro.y / -rd.y : 1e9;
  vec3 col;
  vec3 lights = vec3(0.0);
  float tEnd;
  if (t > 0.0 && t < tg) {
    col = shadeGround(ro, rd, t, pix, true);
    tEnd = t;
  } else if (tg < 1e8) {
    col = shadeGround(ro, rd, tg, pix, false);
    tEnd = tg;
  } else {
    col = skyBase(rd);
    if (gWM > 0.001) {
      float band;
      vec3 mw = milky(rd, band);
      lights = (starsAt(rd, pix, band) + mw * 0.045) * gWM * smoothstep(0.0, 0.03, rd.y);
    }
    /* the moon, pale by day, bright by night */
    vec3 md = moonDisc(rd, gM, gLd, pix);
    col += md * (gWS * 0.38 * (1.0 - gFu * 0.3) + gWM * 2.4);
    float ma = acos(clamp(dot(rd, gM), -1.0, 1.0));
    col += vec3(0.6, 0.65, 0.75) * 0.004 * exp(-ma / 0.03) * gWM;
    /* a skyline the ray only just cleared is part sand */
    float cov = sat(0.5 - rmin);
    if (cov > 0.0) {
      col = mix(col, shadeGround(ro, rd, tr, pix, true), cov);
      lights *= 1.0 - cov;
    }
    tEnd = 1e9;
  }

  /* the trees standing between the eye and what it met */
  vec3 tt = traceTrees(ro, rd, min(tEnd, 700.0), pix);
  if (tt.y > 0.0) {
    col = mix(col, shadeTree(ro, rd, tt.x, pix, int(tt.z)), tt.y);
    lights *= 1.0 - tt.y;
  }

  /* night: moonlight drains the colour and turns it blue */
  col = mix(col, vec3(luma(col)) * vec3(0.6, 0.78, 1.25), 0.55 * gWM);
  return col + lights;
}
`
};
