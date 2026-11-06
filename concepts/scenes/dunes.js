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

/* a tree as capsules: a trunk with two roots splayed over the clay, and
   three or four limbs of three gnarled segments, each with a branch off
   its two joints and a snag forking at its tip, and a twig off each
   branch. A fallen one is the same pieces laid on the ground */
const int NC = 43;
vec4 cA[NC], cB[NC];
vec4 limbB[4];
int nLimb;

float capD(vec3 p, vec4 a, vec4 b) {
  vec3 pa = p - a.xyz, ba = b.xyz - a.xyz;
  float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(a.w, b.w, h);
}

/* one limb from p along dir: segments, branches and twigs into slot j */
void buildLimb(int i, vec3 p, vec3 dir, float len, float r, float s, float up) {
  vec3 lo = p, hi = p;
  int j = 3 + i * 10;
  for (int k = 0; k < 3; k++) {
    vec3 g = hash33(vec3(s + float(i) * 3.1, float(k), 8.7)) - 0.5;
    dir = normalize(dir + g * 1.05 + vec3(0.0, up, 0.0));
    float sl = len * (k == 0 ? 0.4 : (k == 1 ? 0.33 : 0.27));
    vec3 q = p + dir * sl;
    float r1 = k == 2 ? 0.025 : r * 0.72;
    cA[j + k] = vec4(p, r);
    cB[j + k] = vec4(q, r1);
    lo = min(lo, q);
    hi = max(hi, q);
    vec3 side = normalize(cross(dir, vec3(g.z + 0.3, 1.0, g.x - 0.2)));
    float sd = g.y > 0.0 ? 1.0 : -1.0;
    vec3 td = normalize(dir * (k == 2 ? 0.9 : 0.4) + side * sd * (k == 2 ? 0.6 : 1.0) + vec3(0.0, up * 1.3, 0.0));
    vec3 o = k == 2 ? mix(p, q, 0.5) : q;
    float bl = sl * (k == 2 ? 0.6 : 0.6 + 0.7 * abs(g.x));
    vec3 tq = o + td * bl;
    float rb = (k == 2 ? r * 0.6 : r1) * 0.55;
    cA[j + 3 + k] = vec4(o, rb);
    cB[j + 3 + k] = vec4(tq, 0.016);
    lo = min(lo, tq);
    hi = max(hi, tq);
    {
      vec3 m = mix(o, tq, 0.45);
      vec3 sd2 = normalize(td + cross(td, side) * (g.z > 0.0 ? 1.1 : -1.1) + vec3(0.0, 0.25, 0.0));
      vec3 sq = m + sd2 * bl * (0.35 + 0.3 * abs(g.z));
      cA[j + 6 + k] = vec4(m, rb * 0.5);
      cB[j + 6 + k] = vec4(sq, 0.012);
      lo = min(lo, sq);
      hi = max(hi, sq);
    }
    if (k == 1) {
      /* a twig off the middle of the limb, to the other side */
      vec3 m = mix(p, q, 0.5);
      vec3 td2 = normalize(dir * 0.5 - side * (g.y > 0.0 ? 1.0 : -1.0) + vec3(0.0, 0.35, 0.0));
      vec3 eq = m + td2 * sl * (0.45 + 0.4 * abs(g.z));
      cA[j + 9] = vec4(m, mix(r, r1, 0.5) * 0.45);
      cB[j + 9] = vec4(eq, 0.014);
      lo = min(lo, eq);
      hi = max(hi, eq);
    }
    p = q;
    r = r1;
  }
  limbB[i] = vec4(0.5 * (lo + hi), 0.5 * length(hi - lo) + r * 2.0 + 0.15);
}

void buildTree(vec4 T) {
  float H = abs(T.z), s = T.w;
  vec3 r0 = hash33(vec3(s * 7.13, s * 1.71 + 3.0, 5.3));
  float a0 = r0.x * TAU;
  if (T.z < 0.0) {
    /* fallen: the trunk lies along d in three bent lengths, its root end
       resting on stubs of root, broken branches standing off it */
    float al = 0.3 + (r0.x - 0.5) * 0.7;
    vec3 d = vec3(cos(al), 0.0, sin(al)) * (r0.y > 0.5 ? 1.0 : -1.0), dz = vec3(-d.z, 0.0, d.x);
    float rb = 0.2 + 0.06 * r0.y;
    cA[0] = vec4(vec3(0.0, rb * 1.3, 0.0), rb * 1.35);
    vec3 p = d * H * 0.3 + dz * (r0.z - 0.5) * 0.8 + vec3(0.0, rb * 0.95, 0.0);
    cB[0] = vec4(p, rb);
    cA[1] = vec4(cA[0].xyz, rb * 0.8);
    cB[1] = vec4(-d * 0.7 + dz * 0.8 + vec3(0.0, 0.05, 0.0), 0.05);
    cA[2] = vec4(cA[0].xyz, rb * 0.8);
    cB[2] = vec4(-d * 0.6 - dz * 0.7 + vec3(0.0, 0.7, 0.0), 0.05);
    nLimb = 1;
    float r = rb;
    vec3 lo = vec3(-1.0), hi = p;
    for (int k = 0; k < 3; k++) {
      vec3 g = hash33(vec3(s, float(k), 1.9)) - 0.5;
      vec3 q = p + d * H * (k == 0 ? 0.3 : 0.2) + dz * g.x * 0.9;
      float r1 = k == 2 ? 0.03 : r * 0.7;
      q.y = r1 * 0.9 + max(g.y, 0.0) * 0.2;
      cA[3 + k] = vec4(p, r);
      cB[3 + k] = vec4(q, r1);
      /* a broken branch standing off the joint */
      vec3 bd = normalize(vec3(0.0, 0.35 + g.z, 0.0) + dz * (g.y > 0.0 ? 1.0 : -1.0) * 0.5 + d * 0.8);
      vec3 bq = q + bd * (0.4 + 0.9 * abs(g.z));
      cA[6 + k] = vec4(q, r1 * 0.55);
      cB[6 + k] = vec4(bq, 0.02);
      vec3 sq = mix(q, bq, 0.5) + normalize(bd + d) * 0.4;
      cA[9 + k] = vec4(mix(q, bq, 0.5), r1 * 0.3);
      cB[9 + k] = vec4(sq, 0.012);
      lo = min(lo, min(q, bq));
      hi = max(hi, max(q, bq));
      p = q;
      r = r1;
    }
    cA[12] = vec4(cB[4].xyz, 0.05);
    cB[12] = cB[4] + vec4(dz * 0.5 + vec3(0.0, 0.3, 0.0), -0.03);
    limbB[0] = vec4(0.5 * (lo + hi), 0.5 * length(hi - lo) + 0.6);
    return;
  }
  nLimb = s < 1.5 ? 4 : 3 + int(r0.y * 1.99);
  float hf = H * (0.1 + 0.18 * r0.z);
  vec3 fk = vec3((r0.x - 0.5) * 0.7, hf, (hash11(s * 9.1) - 0.5) * 0.7);
  float rb = 0.03 * H + 0.1;
  cA[0] = vec4(0.0, -0.4, 0.0, rb * 1.5);
  cB[0] = vec4(fk, rb * 0.88);
  /* two roots running over the clay from the foot */
  for (int k = 0; k < 2; k++) {
    float ra = a0 + 1.3 + float(k) * 2.6 + r0.z;
    cA[1 + k] = vec4(0.0, 0.15, 0.0, rb * 0.5);
    cB[1 + k] = vec4(cos(ra) * H * 0.14, 0.02, sin(ra) * H * 0.14, 0.035);
  }
  for (int i = 0; i < 4; i++) {
    if (i >= nLimb) break;
    vec3 h = hash33(vec3(s, float(i) + 0.5, 2.9));
    float az = a0 + (float(i) + 0.5 * (h.x - 0.5)) * TAU / float(nLimb);
    float tilt = 0.3 + 0.55 * h.y;
    vec3 dir = vec3(sin(tilt) * cos(az), cos(tilt), sin(tilt) * sin(az));
    float len = (H - hf) * (0.85 + 0.3 * h.z) / cos(tilt * 0.5);
    buildLimb(i, fk, dir, len, rb * (0.6 + 0.2 * h.x), s, 0.22);
  }
}

float treeD(vec3 p) {
  float d = capD(p, cA[0], cB[0]);
  d = smin(d, min(capD(p, cA[1], cB[1]), capD(p, cA[2], cB[2])), 0.12);
  for (int i = 0; i < 4; i++) {
    if (i >= nLimb) break;
    if (length(p - limbB[i].xyz) - limbB[i].w > d) continue;
    int j = 3 + i * 10;
    float l = capD(p, cA[j], cB[j]);
    for (int k = 1; k < 10; k++) l = min(l, capD(p, cA[j + k], cB[j + k]));
    d = smin(d, l, 0.08);
  }
  return d;
}

/* the span of a ray inside a tree's box */
vec2 treeBox(vec3 ro, vec3 rd, vec4 T) {
  float H = abs(T.z);
  float R = T.z < 0.0 ? H * 0.9 : H * 0.85;
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
  float wid = 0.065 + 0.07 * exp(-l * l * 5.0);
  band = exp(-b * b / (wid * wid));
  float bulge = exp(-(l * l + b * b * 3.5) / 0.02);
  /* star clouds, drawn out along the band */
  float cl = fbm(g * vec2(7.0, 16.0) + 3.1, 5);
  float clouds = (0.3 + 0.7 * smoothstep(0.32, 0.7, cl)) * (0.7 + 0.35 * noise(g * vec2(30.0, 60.0)) + 0.3 * noise(g * vec2(90.0, 160.0)));
  /* the rift: a dark lane wandering along the plane, broken here and
     there, and finer lanes of dust along the band */
  float off = 0.018 * sin(l * 4.0 + 0.7) + 0.022 * (fbm(vec2(l * 6.0, 1.7), 3) - 0.5);
  float rw = 0.014 + 0.012 * noise(vec2(l * 9.0, 4.0)) + 0.01 * exp(-l * l * 8.0);
  float rift = smoothstep(1.0, 0.45, abs(b - off) / rw) * smoothstep(0.05, 0.18, abs(l)) * smoothstep(0.32, 0.55, fbm(vec2(l * 5.0, 8.0), 3));
  float fil = 1.0 - abs(2.0 * fbm(g * vec2(9.0, 26.0) + 5.0, 4) - 1.0);
  float lanes = smoothstep(0.88, 0.97, fil) * band;
  float dust = sat(rift * 0.9 + lanes * 0.35);
  float m = band * 0.95 * clouds + exp(-b * b / 0.06) * 0.06 + bulge * (1.3 + 1.2 * clouds);
  vec3 col = mix(vec3(0.66, 0.76, 1.0), vec3(1.0, 0.84, 0.62), sat(bulge * 1.3 + 0.25 * band)) * m;
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
  float back = noise(vec2(u * 0.008, v * 0.02) + 9.0) * 0.6 + noise(p.xz * vec2(0.05, 0.012)) * 0.4;
  alb *= 1.0 + 0.12 * (back - 0.5) * (1.0 - steep);
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

/* the clay: near white and a little warm, whiter in some places and
   dustier in others; broken into plates a few metres across with sand
   in the gaps, and those into small plates by fine cracks; red sand
   blown onto it at the dune feet and in drifts */
vec3 panAlbedo(vec3 p, float fp, float near) {
  vec3 alb = vec3(0.84, 0.665, 0.48);
  float big = fbm(p.xz * 0.009 + 7.0, 3);
  float mid = noise(p.xz * 0.07) * 0.6 + noise(p.xz * 0.27) * 0.4;
  alb *= (0.74 + 0.42 * big) * (0.94 + 0.12 * mid);
  alb = mix(alb, alb * vec3(1.0, 0.93, 0.86), smoothstep(0.55, 0.3, big));
  vec3 sandC = vec3(0.6, 0.25, 0.12);
  /* the big plates: their gaps hold sand */
  float lb = smoothstep(0.25, 0.06, fp);
  if (lb > 0.0) {
    vec2 c = cells(p.xz / 2.2 + 0.3 * vec2(noise(p.xz * 0.4), noise(p.xz * 0.4 + 5.0)));
    float gap = (1.0 - smoothstep(0.004, 0.022 + fp * 0.4, c.x)) * smoothstep(0.35, 0.65, noise(p.xz * 0.5 + 3.0));
    alb *= mix(1.0, 0.97 + 0.05 * c.y, lb);
    alb = mix(alb, alb * vec3(0.88, 0.83, 0.79), gap * lb * smoothstep(0.004, 0.03, fp));
    /* the plates curl up a little at their edges, catching the light */
    alb *= 1.0 + 0.05 * lb * smoothstep(0.1, 0.03, c.x) * (1.0 - gap);
  }
  alb *= mix(1.0, 0.96, (1.0 - lb) * smoothstep(0.1, 0.4, fp));
  /* the fine cracks */
  float lf = smoothstep(0.035, 0.008, fp);
  if (lf > 0.0) {
    vec2 c = cells(p.xz / 0.32 + 0.15 * vec2(noise(p.xz * 3.0), noise(p.xz * 3.0 + 4.0)));
    float crack = 1.0 - smoothstep(0.0, 0.012 + fp * 0.6, c.x - 0.003);
    alb *= mix(1.0, (0.97 + 0.05 * c.y) * (1.0 - 0.28 * crack), lf);
  }
  /* red sand blown onto the clay */
  float drift = smoothstep(0.58, 0.82, noise(p.xz * 0.016 + 2.0) * 0.65 + noise(p.xz * vec2(0.09, 0.05)) * 0.35);
  float sand = max(near, drift * 0.55);
  alb = mix(alb, sandC * (0.9 + 0.2 * mid), sat(sand) * 0.8);
  /* tufts of grass where the sand has gathered */
  vec2 gc = floor(p.xz / 7.0);
  vec3 gh = hash33(vec3(gc, 5.7));
  float tuft = step(gh.z, 0.35 * near) * sat((0.25 + 0.5 * gh.x - length(p.xz - (gc + 0.2 + 0.6 * gh.xy) * 7.0)) / max(fp, 0.03) + 0.5);
  float tf = mix(0.35 * near * 0.02, tuft, smoothstep(2.0, 0.6, fp));
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
    vec3 w1 = noised(wq * vec2(0.004, 0.016) + 4.0), w2 = noised(wq * vec2(0.012, 0.06) + 1.0);
    vec2 gw = w1.yz * vec2(0.004, 0.016) * 3.0 + w2.yz * vec2(0.012, 0.06) * 0.5 * smoothstep(3.0, 0.8, fp);
    gw = gw * rot(0.6);
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
    float near = smoothstep(-30.0, -2.0, f) * (0.55 + 0.45 * noise(p.xz * 0.05)) + 0.35 * smoothstep(-8.0, -1.0, f);
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

/* the dead wood: grey-brown, sun-baked, darker in the cracks */
vec3 shadeTree(vec3 ro, vec3 rd, float t, float pix, int i) {
  vec4 T = TREES[i];
  buildTree(T);
  vec3 base = vec3(T.x, 0.0, T.y);
  vec3 p = ro + rd * t;
  vec3 lp = p - base;
  float e = max(0.004, t * pix * 0.5);
  vec2 k = vec2(1.0, -1.0);
  vec3 n = normalize(k.xyy * treeD(lp + k.xyy * e) + k.yyx * treeD(lp + k.yyx * e) + k.yxy * treeD(lp + k.yxy * e) + k.xxx * treeD(lp + k.xxx * e));
  float grain = noise(vec2(atan(n.x, n.z) * 9.0, lp.y * 1.5)) * 0.6 + noise(lp.xz * 9.0 + lp.y * 2.0) * 0.4;
  float groove = smoothstep(0.55, 0.8, noise(vec2(atan(n.x, n.z) * 14.0 + lp.y * 0.8, lp.y * 0.6)));
  vec3 alb = vec3(0.2, 0.17, 0.145) * (0.75 + 0.5 * grain) * (1.0 - 0.45 * groove * smoothstep(0.08, 0.004, t * pix));
  alb *= mix(0.55, 1.0, smoothstep(0.0, 0.4, lp.y));
  float sh = 1.0;
  if (dot(n, gL) > 0.0 && gWS > 0.001) sh = duneShadow(p, gL, t * pix);
  vec3 L = lightAt(p, n, sh, 1.0, 0.8);
  /* the bright clay lights the wood from below */
  vec3 ePan = gSunE * max(gL.y, 0.0) * sh + gSkyE + gMoonE * max(gM.y, 0.0);
  L += vec3(0.78, 0.64, 0.5) * ePan * (0.5 - 0.5 * n.y) * 0.8;
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
  gMoonE = vec3(0.5, 0.54, 0.6) * gWM;

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
  col = mix(col, vec3(luma(col)) * vec3(0.55, 0.75, 1.3), 0.75 * gWM);
  return col + lights;
}
`
};
