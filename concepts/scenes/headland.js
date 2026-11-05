/* concepts/scenes/headland.js · the headland

   Standing at the end of a narrow spur of cliff top on the Atlantic
   coast, a stride from the drop, looking along the line of the cliffs to
   the point, some 850 m off, where a lighthouse stands: a white tower
   with a red band and a dark lantern, its keepers' houses under slate
   and the white wall of the compound about them. The coast bows gently
   out to sea and is cut into a run of buttresses, each a long face that
   swings out to a nose and falls back steeply behind it, so the faces
   stack one behind another into the distance and each turns a little
   differently to the light. The faces are sheer and banded, hard beds
   of sandstone standing proud of the softer shale and here and there
   cut back into deep notches whose ledges hold grass; they are worn
   into rounded buttresses between sharp gullies, grained finer than the
   surface is traced, streaked pale below the birds' ledges and touched
   with lichen high up, dark and weed-black where the sea wets them. Sea
   caves open at the foot of some, scree slumps into fans at others, and
   at the top the beds crumble back raggedly under a lip of overhanging
   turf. Past the last buttress the headland swings out and the land
   stops at a cap, and beyond it an island lies far out in the haze.

   The sea is a plane given three long trains of westerly swell and a
   wind sea over them; each fades as it shrinks under a pixel and hands
   its slope to the glints, so the sun's path widens toward the eye as a
   real one does. White water works at the foot of every cliff, flaring
   as each swell comes in, with lace drawn out along the coast and spray
   hanging low over it. Haze thickens toward the horizon and toward the
   light, and the edges of the land against sky and sea are softened by
   how near each ray passed them.

   The cumulus are drawn as sheets turned to the eye on a drifting grid,
   so they keep true perspective, crowding small toward the horizon;
   each is a heap on a flat base with a billowed top, lit by the slope
   of its billows and the cloud between it and the light. By day the
   Atlantic light comes from high over the sea off the left shoulder,
   the clouds' shadows cross the water and small facets of the wind sea
   sparkle as they tilt to the sun. At dusk the sun stands just above
   the horizon on the left, laying a path of gold on the sea; the faces
   and noses that turn to it burn orange while the rest go blue, and the
   clouds catch gold and rose on their sunward sides. At night the moon
   hangs low over the water with its path below it, the clouds hang dim
   and grey-blue, the cliffs stand dark with the moon just finding their
   noses, the stars are out, and the lighthouse is lit: two beams turn
   once every ten seconds through the damp air, each a cone whose
   scattered light is integrated across it at the ray's nearest pass,
   flaring as they swing toward the eye. A wide frame looks across the
   water with the cliffs on the right; a tall one lowers its horizon so
   the words stand in the sky and the cliffs recede below them.
   WebGL2, no libraries, no build step. */

window.CONCEPT = {
  id: 'headland',
  theme: { day: '#6890c6', dusk: '#b5959a', night: '#1b2234' },
  t0: 12,
  frag: `
/* ------------------------------------------------------------ the world
   metres; x east (inland), z north, y up; the eye stands at the origin.
   The cliff line runs a little west of north, bowing gently out to sea,
   from a point abreast of the eye to the cap at the headland. Positions
   along it (u) and across it (v, inland positive) are taken against a
   base point opposite the eye. The eye stands on a narrow spur of the
   cliff top that juts out over the water, a stride from its end. */

const vec2 CDIR = vec2(-0.24192, 0.97030);
const vec2 CNRM = vec2(0.97030, 0.24192);
const vec2 P0 = vec2(91.21, 22.74);
const float KAPPA = 1.0 / 9000.0;
const float SC = 0.63;
const vec2 TIP = vec2(-277.77, 800.79);
const vec2 CAP_N = vec2(-0.82262, 0.56859);
const vec2 LH = vec2(-238.3, 793.6);
const vec2 SPA = vec2(125.2, 10.6);
const vec2 SPB = vec2(11.0, -20.75);

/* the looks' lights, as bearings left of north and elevations */
vec3 dirBE(float b, float e) {
  b = radians(b); e = radians(e);
  return vec3(-sin(b) * cos(e), sin(e), cos(b) * cos(e));
}

/* everything a look decides, blended once per pixel */
vec3 SUN, SUNC, SUND, MOON;
vec3 ZEN, HOR, HORA, GLOW, BELT;
vec3 AMBU, AMBH, BNC, WATER, CLC;
float HAZE, CAMT, LAMP, NIGHT;

void setup() {
  vec3 dSun = dirBE(82.0, 32.0), uSun = dirBE(54.0, 2.3), nMoon = dirBE(48.0, 4.0);
  SUN = normalize(dSun * uLook.x + uSun * uLook.y + nMoon * uLook.z);
  SUND = normalize(dSun * uLook.x + uSun * (uLook.y + uLook.z));
  MOON = nMoon;
  SUNC = look3(vec3(3.1, 2.95, 2.7), vec3(2.7, 1.3, 0.48), vec3(0.16, 0.19, 0.25));
  ZEN = look3(vec3(0.06, 0.15, 0.44), vec3(0.035, 0.06, 0.16), vec3(0.005, 0.009, 0.024));
  HOR = look3(vec3(0.40, 0.50, 0.66), vec3(1.05, 0.46, 0.18), vec3(0.022, 0.032, 0.058));
  HORA = look3(vec3(0.33, 0.46, 0.68), vec3(0.13, 0.15, 0.30), vec3(0.016, 0.024, 0.046));
  GLOW = look3(vec3(0.5, 0.45, 0.35), vec3(1.5, 0.62, 0.2), vec3(0.07, 0.075, 0.085));
  BELT = look3(vec3(0.0), vec3(0.12, 0.06, 0.08), vec3(0.0));
  AMBU = look3(vec3(0.17, 0.23, 0.36), vec3(0.065, 0.085, 0.17), vec3(0.007, 0.010, 0.020));
  AMBH = look3(vec3(0.20, 0.21, 0.24), vec3(0.085, 0.08, 0.125), vec3(0.006, 0.008, 0.013));
  BNC = look3(vec3(0.05, 0.06, 0.06), vec3(0.03, 0.02, 0.015), vec3(0.002, 0.003, 0.004));
  CLC = look3(vec3(3.0, 2.9, 2.72), vec3(2.9, 1.45, 0.8), vec3(0.16, 0.19, 0.25));
  WATER = look3(vec3(0.010, 0.034, 0.048), vec3(0.008, 0.022, 0.034), vec3(0.008, 0.026, 0.040));
  HAZE = look3(1.0 / 9000.0, 1.0 / 8500.0, 1.0 / 10000.0);
  CAMT = look3(0.5, 0.42, 0.28);
  LAMP = uLook.z + 0.1 * uLook.y;
  NIGHT = uLook.z;
}

float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float smax(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return max(a, b) + h * h * k * 0.25; }
float hg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * mu, 1.5)); }

/* ------------------------------------------------------------ the land */

/* how far out to sea the edge stands at u (negative is seaward): a gentle
   bow, then a run of buttresses, each a long face that swings out to a
   nose and drops back steeply behind it, and the headland beyond */
float edgeAt(float u) {
  u /= SC;
  float w = u / 220.0 + 0.3 + 0.3 * sin(u * 0.0047);
  float i = floor(w), f = w - i;
  float a = 24.0 + 50.0 * hash11(i * 7.13 + 1.7);
  float pr = a * pow(min(f / 0.86, 1.0), 2.6) * smoothstep(1.0, 0.86, f);
  float fade = (1.0 - 0.4 * smoothstep(650.0, 1050.0, u)) * (1.0 - smoothstep(1080.0, 1260.0, u));
  float hx = sat((u - 950.0) / 350.0);
  return SC * (-KAPPA * u * u - pr * fade - 70.0 * hx * hx * (3.0 - 2.0 * hx));
}

/* the edge: signed distance from it, positive out over the sea, and how
   far along the coast the place is (s, metres); the spur is a rounded fin
   joined on with a fillet */
float coast(vec2 xz, out float s) {
  vec2 q = xz - P0;
  float u = dot(q, CDIR), v = dot(q, CNRM);
  s = u;
  float e = edgeAt(u);
  float de = edgeAt(u + 1.0) - e;
  float d = (e - v) * inversesqrt(1.0 + de * de);
  d = smax(d, dot(xz - TIP, CAP_N), 45.0);
  vec2 pa = xz - SPA, ba = SPB - SPA;
  float sp = length(pa - ba * sat(dot(pa, ba) / dot(ba, ba))) - 24.0 + 4.0 * noise(xz * 0.06);
  return smin(d, sp, 30.0);
}

/* the height of the tops: the cliff line climbs from the eye to its
   highest a third of the way along, then steps down to the point; the
   ground rounds over at the lip and rises inland to low hills */
float landH(vec2 xz, float s, float inl) {
  inl = max(inl, 0.0);
  float e = 118.0 + 40.0 * smoothstep(50.0, 380.0, s) - 22.0 * smoothstep(530.0, 845.0, s) + 5.0 * sin(s * 0.014 + 1.2);
  float h = e - 3.0 * exp(-inl * 0.12) + 0.05 * inl;
  float m = smoothstep(60.0, 700.0, inl);
  if (m > 0.0) h += m * (0.09 * inl + 140.0 * (fbm(xz * 0.0012 + vec2(3.1, 7.7), 3) - 0.4));
  return h;
}

/* the beds: hard ones stand proud, soft ones are worn back */
float bedY(float y, float s) {
  float b = y + 5.0 * sin(s * 0.0031 + 0.7) + 0.012 * s;
  return b + 5.0 * noise(vec2(b * 0.08, s * 0.0015)) + 1.2 * noise(vec2(b * 0.31, s * 0.004 + 3.0));
}
float strata(float y, float s) {
  float l = bedY(y, s) / 5.5;
  float i = floor(l), f = l - i;
  float h = hash11(i * 3.17 + 0.5);
  float back = 0.15 + 0.9 * h * h + 1.4 * smoothstep(0.86, 0.96, h);
  return back * smoothstep(0.05, 0.5, f) * (1.0 - smoothstep(0.62, 0.97, f));
}

/* sea caves at the foot of some buttresses: an arch-shaped bore driven a
   little way into the rock */
float cave(vec3 p, float s, float d) {
  float ci = floor(s / 120.0);
  float ch = hash11(ci * 5.3 + 2.0);
  if (ch < 0.5) return 1e3;
  float sc = (ci + 0.3 + 0.4 * hash11(ci * 2.1 + 0.4)) * 120.0;
  float cw = 4.0 + 7.0 * ch, cy = 8.0 + 12.0 * hash11(ci + 7.7);
  float c = (length(vec2((s - sc) / cw, p.y / cy)) - 1.0) * min(cw, cy);
  return max(c, -d - 24.0);
}

float map(vec3 p) {
  float s;
  float d = coast(p.xz, s);
  if (d > 60.0) return d - 30.0;
  if (p.y > 430.0) return p.y - 410.0;
  float h = landH(p.xz, s, -d);
  float top = p.y - h;
  /* buttresses rounded between sharp gullies, and flutes on them */
  float rib = 1.0 - abs(2.0 * noise(vec2(s / 48.0, p.y / 320.0 + s * 0.0013)) - 1.0);
  float flute = 1.0 - abs(2.0 * noise(vec2(s / 13.0, p.y / 110.0) + 3.0) - 1.0);
  /* the upper beds crumble back unevenly, so the edge runs ragged */
  float rag = 5.0 * smoothstep(h - 16.0, h - 3.0, p.y) * smoothstep(0.35, 0.8, noise(vec2(s / 13.0, 4.0)));
  float face = d + strata(p.y, s) + 11.0 * rib * rib * rib + 4.0 * flute * flute + 0.5 * noise(rot(0.4) * vec2(s / 4.0, p.y / 9.0)) + rag;
  float cv = p.y < 24.0 ? cave(p, s, d) : 1e3;
  face = max(face, -cv);
  float r = smax(top, face, 2.0);
  /* the turf hangs a little over the lip */
  float turf = max(abs(p.y - h + 0.7) - 0.7, face - rag - 0.9 + 0.8 * noise(vec2(s / 4.0, 1.0)));
  r = min(r, turf);
  /* fallen blocks at the foot, slumped in places into fans of scree */
  float sh = 6.0 + 12.0 * smoothstep(0.55, 0.85, noise(vec2(s / 50.0, 1.7)));
  float ap = d - 0.75 * max(sh - p.y, 0.0) + 4.0 * noise(p.xz * 0.16 + p.y * 0.1) - 1.5;
  ap = max(ap, -cv);
  return min(r, max(ap, p.y - sh - 2.0));
}

vec3 normalAt(vec3 p, float t) {
  float e = max(0.03, t * 0.0011);
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) +
                   k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}

/* the land is traced by its distance; the ray's nearest pass to it, in
   pixels, is kept, so an edge against the sky or sea can be softened */
float march(vec3 ro, vec3 rd, float tmax, float pa, out bool hit, out float mr, out float tm) {
  float t = 0.2;
  hit = false;
  mr = 1e9;
  tm = 0.0;
  for (int i = 0; i < 170; i++) {
    float d = map(ro + rd * t);
    float r = d / (pa * t);
    if (r < mr && t > 30.0) { mr = r; tm = t; }
    if (r < 0.4) { hit = true; break; }
    t += d * 0.8;
    if (t > tmax) break;
  }
  if (!hit && t < tmax) hit = true;
  return t;
}

float softShadow(vec3 p, vec3 l) {
  float res = 1.0, t = 1.5;
  for (int i = 0; i < 28; i++) {
    vec3 q = p + l * t;
    if (q.y > 430.0) break;
    float h = map(q);
    res = min(res, 9.0 * h / t);
    if (res < 0.01) break;
    t += clamp(h, 2.0, 140.0);
    if (t > 2600.0) break;
  }
  return smoothstep(0.0, 1.0, res);
}

/* ------------------------------------------------------------- the sky */

float airmass(float y) {
  float e = degrees(asin(clamp(y, 0.0, 1.0)));
  return 1.0 / (max(y, 0.0) + 0.50572 * pow(e + 6.07995, -1.6364));
}

vec3 sky(vec3 rd) {
  float e = max(rd.y, 0.0);
  float mu = dot(rd, SUN);
  float side = exp(-(1.0 - dot(normalize(rd.xz + 1e-5), normalize(SUN.xz + 1e-5))) * 5.0);
  vec3 hor = mix(HORA, HOR, side);
  /* the long path near the horizon whitens and brightens the sky */
  float hb = 1.0 - exp(-(airmass(e) - 1.0) * 0.08);
  vec3 c = mix(ZEN, hor, hb);
  c *= 0.85 + 0.25 * mu * mu;
  c += GLOW * (hg(mu, 0.85) * 0.07 + hg(mu, 0.6) * 0.12 + hg(mu, 0.2) * 0.2) * (0.3 + 0.7 * hb);
  c += BELT * exp(-pow((e - 0.07) / 0.06, 2.0)) * sat(-mu * 0.8 + 0.2);
  return c;
}

/* haze over land and sea: an exponential atmosphere, its light taken
   from the sky low in the same direction */
vec3 aerial(vec3 col, vec3 ro, vec3 rd, float t) {
  float H = 650.0;
  float k = rd.y * t / H;
  float od = HAZE * t * exp(-ro.y / H) * (abs(k) > 1e-3 ? (1.0 - exp(-k)) / k : 1.0);
  vec3 ext = exp(-od * vec3(0.85, 0.95, 1.1));
  vec3 hd = normalize(vec3(rd.x, max(rd.y, 0.0) * 0.35 + 0.006, rd.z));
  return col * ext + sky(hd) * (1.0 - ext);
}

/* clouds: fair-weather cumulus drifting in off the sea, and a high veil
   above them. The cumulus stand on a grid of cells laid on the cloud
   base, which drifts with the wind; a cell may hold one cloud. They are
   far enough off that each can be drawn as a sheet turned to face the
   eye, so they keep true perspective, shrinking and crowding toward the
   horizon, without being traced through. Each sheet carries a heap with
   a flat base and a billowed, cauliflower top, shaded by the slope of
   its billows toward the light, by how much cloud stands between a
   point and the sun, and by its height over the dark base; its edges
   are worn soft. A ray walks the cells its path crosses inside the
   layer, nearest first, and lays the clouds it meets one over another */
const float CB = 1150.0, CS = 6000.0, CV = 6500.0;
const vec2 CWIND = vec2(6.0, 2.0);

/* the cloud of a cell: its centre on the base, half-width and height,
   and whether one stands there */
vec4 cuCell(vec2 id, out float H) {
  float h2 = hash12(id * 1.37 + 21.7), h3 = hash12(id + 9.3);
  float hw = 550.0 + 1750.0 * h3 * h3;
  H = hw * (0.5 + 0.3 * h2);
  vec2 off = (hash22(id + 4.4) - 0.5) * 2.0 * (0.5 * CS - hw - 100.0);
  return vec4((id + 0.5) * CS + off, hw, step(hash12(id + 88.1), CAMT));
}

float billow(vec2 p, int oct) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    v += a * abs(2.0 * noise(p) - 1.0);
    p = ROT2 * p * 2.07 + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return v;
}

/* the heap, in units of the cloud's half-width across and height up:
   a broad dome with a tower risen from one side, its outline and body
   broken into billows; positive inside */
float cuShape(vec2 q, float seed, int oct) {
  float c1 = (hash11(seed + 2.0) - 0.5) * 0.9, t1 = 0.65 + 0.45 * hash11(seed + 1.0);
  float w1 = 0.35 + 0.2 * hash11(seed + 3.0);
  float dome = 0.7 * sqrt(max(1.0 - q.x * q.x, 0.0));
  float tw = (q.x - c1) / w1;
  float tower = t1 * sqrt(max(1.0 - tw * tw, 0.0));
  float top = max(dome, tower) * (0.85 + 0.3 * noise(vec2(q.x * 2.5, seed)));
  return top - q.y + 0.34 * (billow(q * vec2(2.4, 3.0) + seed * 7.3, oct) - 0.42);
}

vec4 cumulus(vec3 ro, vec3 rd, bool lite) {
  if (rd.y < 0.006) return vec4(0.0);
  vec3 o = ro;
  o.xz -= CWIND * uTime;
  float t0 = (CB - o.y) / rd.y, t1 = min((CB + 2100.0 - o.y) / rd.y, 70000.0);
  if (t0 > t1) return vec4(0.0);
  vec2 a = o.xz + rd.xz * t0;
  float hl = length(rd.xz);
  vec2 dir = rd.xz / hl + 1e-6;
  float len = (t1 - t0) * hl;
  vec2 cell = floor(a / CS), sv = sign(dir);
  vec2 tm = ((cell + max(sv, 0.0)) * CS - a) / dir, td = abs(CS / dir);
  float run = 0.0, T = 1.0;
  vec3 acc = vec3(0.0);
  float mu = dot(rd, SUN);
  for (int i = 0; i < 12; i++) {
    float H;
    vec4 cl = cuCell(cell, H);
    if (cl.w > 0.5) {
      vec2 dh = normalize(cl.xy - o.xz);
      float den = dot(rd.xz, dh);
      float th = dot(cl.xy - o.xz, dh) / max(den, 1e-4);
      vec3 p = o + rd * th;
      vec2 rh = vec2(dh.y, -dh.x);
      vec2 q = vec2(dot(p.xz - cl.xy, rh) / cl.z, (p.y - CB) / H);
      if (den > 0.0 && abs(q.x) < 1.05 && q.y > -0.05 && q.y < 1.5) {
        float seed = hash12(cell + 61.3) * 50.0;
        float f = cuShape(q, seed, lite ? 2 : 5);
        float al = smoothstep(0.0, 0.1 + 0.08 * NIGHT, f) * smoothstep(-0.01, 0.05, q.y);
        if (al > 0.003) {
          vec3 c;
          vec3 cl3 = CLC * 0.62;
          if (lite) {
            c = cl3 * 0.6 + AMBU * 1.1;
          } else {
            /* the billows' slope, read across the sheet: across, up, and
               toward the eye as the body thickens */
            float e = 0.025;
            float fx = cuShape(q + vec2(e, 0.0), seed, 5) - f, fy = cuShape(q + vec2(0.0, e), seed, 5) - f;
            vec3 R3 = vec3(rh.x, 0.0, rh.y), C3 = -vec3(dh.x, 0.0, dh.y);
            vec3 n = normalize(-(fx * R3 + fy * vec3(0.0, 1.0, 0.0)) / e * 0.12 + C3 * (0.35 + 2.0 * sat(f)));
            vec2 sp = normalize(vec2(dot(SUN, R3), SUN.y * 2.0) + 1e-4);
            float fs = cuShape(q + sp * 0.16, seed, 3);
            float sh = exp(-max(fs - f + 0.04, 0.0) * 4.0);
            float front = sat(dot(SUN, C3) * 0.5 + 0.55);
            float lam = sat(dot(n, SUN) * 0.55 + 0.45) * sh * mix(0.4, 1.0, front);
            float bd = smoothstep(0.0, 0.5, q.y);
            vec3 amb = AMBU * (0.75 + 0.55 * bd) * (1.0 + 1.3 * NIGHT) + AMBH * 0.35 * (1.0 - bd);
            c = cl3 * lam * mix(0.4, 1.0, bd) + amb;
            /* light through the thin edges when the sun is behind */
            c += CLC * (1.0 - smoothstep(0.0, 0.18, f)) * hg(mu, 0.6) * 1.6 * (1.0 - 0.75 * NIGHT);
          }
          c = aerial(c, ro, rd, th);
          acc += T * al * c;
          T *= 1.0 - al;
          if (T < 0.02) break;
        }
      }
    }
    if (tm.x < tm.y) { run = tm.x; tm.x += td.x; cell.x += sv.x; }
    else { run = tm.y; tm.y += td.y; cell.y += sv.y; }
    if (run > len) break;
  }
  float A = 1.0 - T;
  if (A <= 0.0) return vec4(0.0);
  return vec4(acc / A, A * smoothstep(0.006, 0.03, rd.y));
}

/* the veil: thin streaks high up that catch the colour of the low sun */
vec4 veil(vec3 ro, vec3 rd) {
  if (rd.y < 0.008) return vec4(0.0);
  float t = (CV - ro.y) / rd.y;
  vec2 xz = ro.xz + rd.xz * t;
  vec2 q = rot(0.5) * xz / vec2(9000.0, 2200.0) + vec2(0.0011, 0.0028) * uTime * 0.4;
  float n = fbm(q + fbm(q * 2.0 + 7.0, 3) * 0.6, 5);
  float a = smoothstep(look3(0.62, 0.5, 0.6), 0.85, n) * look3(0.35, 0.7, 0.3);
  float mu = dot(rd, SUN);
  vec3 c = SUNC * (0.35 + hg(mu, 0.7) * 1.2) * look3(0.5, 0.9, 0.8) + AMBU * 0.9;
  c = aerial(c, ro, rd, t);
  return vec4(c, a * smoothstep(0.008, 0.08, rd.y));
}

float cloudShade(vec3 p) {
  vec3 o = p;
  o.xz -= CWIND * uTime;
  float t = (CB + 400.0 - o.y) / max(SUN.y, 0.05);
  vec2 q = o.xz + SUN.xz * t;
  float H;
  vec4 cl = cuCell(floor(q / CS), H);
  float d = length(q - cl.xy) / (0.85 * cl.z);
  return 1.0 - 0.7 * cl.w * smoothstep(1.0, 0.5, d);
}

vec3 stars(vec3 rd, float pa) {
  float az = atan(rd.x, rd.z), el = asin(sat(rd.y));
  vec3 c = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 150.0 : 320.0;
    vec2 g = vec2(az, el) * sc;
    vec2 id = floor(g);
    vec2 h = hash22(id + float(k) * 41.0);
    float b = hash12(id * 1.7 + float(k) * 13.0);
    float m = k == 0 ? pow(b, 30.0) * 5.0 : pow(b, 70.0) * 1.3;
    m *= 0.75 + 0.25 * sin(uTime * (2.0 + 4.0 * h.x) + h.y * TAU);
    vec2 dd = (fract(g) - 0.5 - (h - 0.5) * 0.8) / sc;
    c += m * exp(-dot(dd, dd) / (pa * pa) * 1.4) * mix(vec3(1.0, 0.85, 0.7), vec3(0.75, 0.85, 1.0), h.x);
  }
  return c * exp(-0.2 * airmass(rd.y));
}

vec3 moonDisc(vec3 rd, float pa) {
  float R = 0.0075;
  vec3 ax = normalize(cross(vec3(0.0, 1.0, 0.0), MOON)), ay = cross(MOON, ax);
  vec2 q = vec2(dot(rd, ax), dot(rd, ay)) / R;
  float d = length(q);
  float cov = sat((1.0 - d) * R / pa + 0.5);
  if (cov <= 0.0 || dot(rd, MOON) < 0.0) return vec3(0.0);
  vec3 nn = vec3(q, sqrt(max(1.0 - dot(q, q), 0.0)));
  float ph = uMoon * TAU;
  float lit = smoothstep(-0.04, 0.08, dot(nn, vec3(sin(ph), 0.0, -cos(ph))));
  float mar = 0.72 + 0.28 * smoothstep(0.35, 0.65, fbm(q * 1.7 + 4.0, 3));
  vec3 c = vec3(1.0, 0.88, 0.72) * 1.9 * (lit * mar * (0.6 + 0.4 * nn.z) + 0.012);
  return c * cov;
}

vec3 sunDisc(vec3 rd, float pa) {
  float R = 0.0048;
  float d = acos(clamp(dot(rd, SUND), -1.0, 1.0));
  float cov = sat((R - d) / pa + 0.5);
  float limb = sqrt(max(1.0 - (d / R) * (d / R), 0.0));
  return cov * (0.55 + 0.45 * limb) * look3(vec3(60.0, 55.0, 48.0), vec3(9.0, 3.6, 0.9), vec3(0.0));
}

/* ------------------------------------------------------------- the sea */

const vec2 SWELL = vec2(0.92, -0.39);

/* the slope of the sea, and the variance of the slopes too small to
   draw: three long trains of swell, then the wind sea as drifting sheets
   of noise drawn out across the wind */
vec2 seaSlope(vec2 p, float fp, out float var) {
  vec2 g = vec2(0.0);
  var = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float lam = 150.0 * pow(0.62, fi);
    float an = -0.42 + 0.6 * sin(fi * 2.4 + 0.3);
    vec2 dir = vec2(cos(an), sin(an));
    float k = TAU / lam;
    float st = 0.022 * (0.4 + 1.2 * noise(p / (lam * 2.5) + fi * 3.1));
    float ph = k * dot(dir, p) - sqrt(9.81 * k) * uTime + fi * 1.7;
    float fade = sat(1.5 - fp * 5.0 / lam);
    g += dir * (st * cos(ph) * fade);
    var += st * st * 0.5 * (1.0 - fade * fade);
  }
  mat2 W = rot(0.35);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float lam = 34.0 * pow(0.47, fi);
    float fade = sat(1.5 - fp * 4.0 / lam);
    if (fade <= 0.0) { var += 0.0045; continue; }
    vec2 q = W * p / lam;
    vec3 a = noised(q * vec2(0.55, 1.0) + vec2(-uTime * 1.1 / sqrt(lam), fi * 7.3));
    vec3 b = noised(rot(0.9) * q * vec2(0.6, 1.0) + vec2(uTime * 0.6 / sqrt(lam), fi * 3.1 + 5.0));
    vec2 gg = (a.yz * vec2(0.55, 1.0) + rot(-0.9) * (b.yz * vec2(0.6, 1.0))) * 0.045;
    g += (gg * W) * fade;
    var += 0.0045 * (1.0 - fade * fade);
  }
  return g;
}

float beckmann(float nh, float m2) {
  float c2 = nh * nh;
  return exp((c2 - 1.0) / (c2 * m2)) / (PI * m2 * c2 * c2);
}

float smithG(float nv, float m) {
  float c = nv / (m * sqrt(max(1.0 - nv * nv, 1e-4)));
  return c < 1.6 ? (3.535 * c + 2.181 * c * c) / (1.0 + 2.276 * c + 2.577 * c * c) : 1.0;
}

/* spray hangs low over the white water at the foot of the cliffs */
vec3 spray(vec3 col, vec3 p, float d, vec3 rd) {
  float m = exp(-max(p.y, 0.0) / 16.0) * exp(-max(d, 0.0) / 22.0) * (0.4 + 0.6 * noise(p.xz / 30.0 + vec2(uTime * 0.06, 0.0)));
  vec3 hz = sky(normalize(vec3(rd.x, 0.02, rd.z)));
  return mix(col, hz * 0.85, sat(m * 0.3));
}

vec3 shadeSea(vec3 ro, vec3 rd, float t, float pa) {
  vec3 p = ro + rd * t;
  float s;
  float d = coast(p.xz, s);
  float fp = t * pa / max(-rd.y, 0.04);
  float var;
  vec2 g = seaSlope(p.xz, fp, var);
  /* the backwash off the cliffs roughens the water at their foot */
  var += 0.012 * exp(-max(d, 0.0) / 70.0);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = -rd;
  float nv = max(dot(n, v), 0.02);
  float F = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(rd, n);
  r.y = abs(r.y) + 0.004;
  r = normalize(r);
  vec3 refl = sky(r);
  vec4 cr = vec4(0.0);
  if (r.y > 0.01) {
    cr = cumulus(p + vec3(0.0, 1.0, 0.0), r, true);
    cr.a *= 0.5 / (1.0 + var * 90.0);
  }
  refl = mix(refl, cr.rgb, cr.a);
  /* near the foot the faces stand in the reflection instead of the sky */
  float cliffH = 140.0;
  vec2 inland = CNRM;
  float toward = sat(dot(normalize(r.xz + 1e-5), inland) * 1.4 + 0.2);
  float occ = toward * sat(1.0 - max(d, 0.0) * (r.y / max(length(r.xz), 1e-3)) / cliffH);
  vec3 faceL = vec3(0.12, 0.11, 0.1) * (SUNC * sat(dot(vec3(-inland.x, 0.0, -inland.y), SUN)) * 0.7 + AMBH * 1.2);
  refl = mix(refl, faceL, occ * 0.85);

  float csh = cloudShade(p);
  float m2 = 0.004 + 2.0 * var;
  vec3 h = normalize(v + SUN);
  float nh = max(dot(n, h), 1e-3);
  float spec = beckmann(nh, m2) * smithG(nv, sqrt(m2)) * smithG(max(dot(n, SUN), 0.0), sqrt(m2)) / (4.0 * nv);
  float Fh = 0.02 + 0.98 * pow(1.0 - max(dot(v, h), 0.0), 5.0);
  vec3 col = refl * F + SUNC * spec * Fh * csh * step(0.0, SUN.y);
  /* sparkle: facets of the wind sea too small to draw, each rocking and
     catching the light for a moment as it tilts to it */
  float pw = t * pa;
  if (pw < 0.6) {
    vec2 gq = p.xz / 1.1;
    vec2 gi = floor(gq), gf = fract(gq) - 0.5;
    vec3 hh = hash33(vec3(gi, 7.0));
    float ph = hh.z * TAU + uTime * (1.5 + 2.5 * hh.x);
    vec2 sl = (hh.xy - 0.5) * 1.1 + 0.1 * vec2(sin(ph), cos(ph * 1.3)) + g;
    float al = dot(normalize(vec3(-sl.x, 1.0, -sl.y)), h);
    float spot = exp(-dot(gf, gf) * 1.21 / (pw * pw + 0.004));
    col += SUNC * Fh * smoothstep(0.9975, 1.0, al) * spot * 28.0 * (1.0 - pw / 0.6) * csh * step(0.0, SUN.y);
  }
  /* light from under the surface: deep blue-green, lighter where the
     water is churned near the cliffs */
  vec3 body = WATER * (SUNC * max(SUN.y, 0.0) * csh * 0.6 + AMBU * 1.2);
  body *= 1.0 + 2.5 * exp(-max(d, 0.0) / 60.0);
  col += body * (1.0 - F);

  /* white water at the foot, flaring with each swell, and lace drawn out
     from it */
  float fd = d < 220.0 ? map(vec3(p.x, 0.0, p.z)) : 1e3;
  if (d < 220.0) {
    float ph = dot(SWELL, p.xz) * TAU / 150.0 - sqrt(9.81 * TAU / 150.0) * uTime;
    float surge = 0.5 + 0.5 * sin(ph + s * 0.004);
    float band = exp(-max(fd, 0.0) / (3.0 + 6.0 * surge));
    vec2 lq = vec2(s / 14.0, fd / 6.0 - uTime * 0.05 + surge * 0.3);
    float r1 = 1.0 - abs(2.0 * noise(lq + noise(lq * 0.5) * 0.8) - 1.0);
    float r2 = 1.0 - abs(2.0 * noise(lq * 2.3 + 4.0) - 1.0);
    float lw = (smoothstep(0.9, 0.98, r1) + 0.6 * smoothstep(0.93, 0.99, r2)) * exp(-fd / 22.0) * 0.4;
    float foam = sat(band * (0.7 + 0.5 * surge) + lw);
    foam *= sat(1.2 - fp * 0.05);
    vec3 fc = vec3(0.85) * (SUNC * max(SUN.y, 0.0) * csh + AMBU * 1.6 + AMBH * 0.4);
    col = mix(col, fc, foam);
  }
  /* scattered whitecaps out on the open water */
  float wc = smoothstep(0.93, 0.99, noise(rot(0.35) * p.xz / vec2(9.0, 3.0) + vec2(uTime * 0.2, 0.0))) * smoothstep(0.7, 0.9, noise(p.xz / 60.0 - uTime * 0.02));
  wc *= sat(1.0 - fp / 2.0);
  col = mix(col, vec3(0.8) * (SUNC * max(SUN.y, 0.0) * csh + AMBU * 1.6), wc * 0.35);
  if (d < 200.0) col = spray(col, p, fd, rd);
  return col;
}

/* ------------------------------------------------------- the land's skin */

vec3 shadeLand(vec3 ro, vec3 rd, float t, float pa) {
  vec3 p = ro + rd * t;
  vec3 n = normalAt(p, t);
  float s;
  float d = coast(p.xz, s);
  float inl = -d;
  float h = landH(p.xz, s, inl);
  float fp = t * pa;

  /* rock: banded beds, damp at the foot, streaked down the face */
  float l = bedY(p.y, s) / 5.5;
  float bi = floor(l), bf = l - bi;
  float hard = hash11(bi * 3.17 + 0.5);
  vec3 rock = mix(vec3(0.062, 0.058, 0.055), vec3(0.105, 0.094, 0.08), smoothstep(0.55, 0.95, hard));
  rock *= 0.9 + 0.18 * hash11(bi * 1.31 + 7.0);
  rock *= 0.95 + 0.06 * sin(bf * 19.0 + hard * 6.0);
  float big = noise(vec2(s / 70.0, p.y / 45.0));
  rock *= 0.7 + 0.55 * big;
  rock = mix(rock, rock * vec3(1.15, 1.0, 0.8), smoothstep(0.4, 0.8, noise(vec2(s / 160.0, p.y / 80.0) + 11.0)));
  /* damp streaks down the face, and lichen on the upper beds */
  rock *= 1.0 - 0.35 * smoothstep(0.55, 0.85, noise(vec2(s / 6.0, p.y / 70.0 + 2.0)));
  rock = mix(rock, vec3(0.13, 0.13, 0.09), 0.3 * smoothstep(0.6, 0.9, noise(vec2(s / 12.0, p.y / 9.0))) * smoothstep(60.0, 140.0, p.y));
  rock *= 0.8 + 0.4 * noise(vec2(s / 2.0, p.y / 30.0));
  /* where the birds nest, pale streaks run down from the ledges */
  float colony = smoothstep(0.55, 0.8, noise(vec2(s / 45.0, p.y / 35.0) + 5.0)) * smoothstep(20.0, 45.0, p.y) * (1.0 - smoothstep(110.0, 150.0, p.y));
  float streak = smoothstep(0.72, 0.93, noise(vec2(s / 1.4, p.y / 60.0 + 9.0))) * smoothstep(0.35, 0.75, noise(vec2(s / 1.4 + 5.0, p.y / 11.0)));
  rock = mix(rock, vec3(0.27, 0.265, 0.24), colony * streak * 0.6);
  /* orange and grey lichen high on the face */
  float lich = smoothstep(0.8, 0.92, noise(vec2(s / 3.0, p.y / 2.5) + 2.0)) * smoothstep(0.5, 0.8, noise(vec2(s / 60.0, p.y / 40.0) + 1.0)) * smoothstep(45.0, 100.0, p.y);
  rock = mix(rock, vec3(0.17, 0.1, 0.045), lich * 0.4);
  /* a dark wet band above the water, black with weed at its foot */
  float wet = 1.0 - smoothstep(4.0, 10.0 + 4.0 * noise(vec2(s / 18.0, 3.0)), p.y);
  rock *= 1.0 - 0.55 * wet;
  rock = mix(rock, vec3(0.012, 0.016, 0.01), 0.7 * (1.0 - smoothstep(0.5, 2.5, p.y)));

  /* grass on the tops and on the ledges; fields and walls inland */
  vec3 grass = vec3(0.042, 0.078, 0.022);
  float fn = noise(p.xz / 35.0) * 0.5 + noise(p.xz / 7.0) * 0.3 + noise(p.xz / 1.6) * 0.2;
  grass *= 0.65 + 0.7 * fn;
  /* patches of rush and bent grass, paler where it is dry and grazed */
  grass = mix(grass, vec3(0.09, 0.085, 0.045), 0.4 * smoothstep(0.55, 0.85, noise(p.xz / 90.0 + 3.0)));
  grass = mix(grass, vec3(0.025, 0.045, 0.02), 0.45 * smoothstep(0.6, 0.85, noise(p.xz / 25.0 + 8.0)));
  /* bare earth where the turf breaks at the lip */
  grass = mix(grass, vec3(0.07, 0.05, 0.035), smoothstep(-1.4, -0.9, p.y - h) * (1.0 - smoothstep(-0.9, -0.5, p.y - h)) * 0.7);
  vec2 fq = rot(0.35) * (p.xz + 40.0 * vec2(noise(p.xz / 300.0), noise(p.zx / 300.0 + 5.0)));
  vec2 cs = vec2(120.0, 80.0);
  vec2 ci = floor(fq / cs), cf = fract(fq / cs);
  float fld = hash12(ci + 3.0);
  grass *= mix(vec3(1.0), mix(vec3(1.15, 1.1, 0.75), vec3(0.85, 0.95, 0.9), fld), smoothstep(30.0, 80.0, inl));
  float wd = min(min(cf.x, 1.0 - cf.x) * cs.x, min(cf.y, 1.0 - cf.y) * cs.y);
  float wall = sat(1.0 - wd / max(fp, 0.5)) * min(1.0, 0.9 / max(fp, 0.5)) * smoothstep(25.0, 60.0, inl);
  grass = mix(grass, vec3(0.09, 0.09, 0.085), wall * 0.8);
  float gw = smoothstep(0.55, 0.8, n.y) * smoothstep(28.0, 36.0, p.y);
  gw = max(gw, smoothstep(-1.5, -0.3, p.y - h) * step(0.0, inl));
  vec3 alb = mix(rock, grass, gw);

  /* tussocks on the turf, catching and losing the light */
  float tfade = sat(2.0 - fp * 0.8) * gw;
  if (tfade > 0.0) {
    vec2 tg = noised(p.xz / 2.6 + 3.0).yz + 0.5 * noised(p.xz / 0.9).yz;
    n = normalize(n + tfade * 0.35 * vec3(-tg.x, 0.0, -tg.y));
  }

  /* the rock's grain, too fine for the surface itself, laid on its light */
  float bfade = sat(1.5 - fp * 1.2) * (1.0 - gw);
  if (bfade > 0.0) {
    vec2 bq = vec2(s / 2.3, p.y / 1.6);
    vec2 g = (noised(rot(0.6) * bq + 7.0).yz * rot(0.6) + 0.5 * (noised(rot(1.9) * bq * 2.3 + 3.0).yz * rot(1.9))) * 0.08;
    vec3 ts = vec3(CDIR.x, 0.0, CDIR.y);
    n = normalize(n - bfade * (g.x * ts + g.y * vec3(0.0, 1.0, 0.0)));
  }

  /* light: the sun, the sky's dome and what the sea and land throw back */
  float sh = softShadow(p + n * 0.5, SUN);
  float csh = cloudShade(p);
  float dif = max(dot(n, SUN), 0.0) * sh * csh;
  float ao = sat(map(p + n * 4.0) / 4.0) * 0.5 + sat(map(p + n * 14.0) / 14.0) * 0.5;
  ao = 0.35 + 0.65 * ao;
  vec3 amb = mix(AMBH, AMBU, n.y * 0.5 + 0.5);
  amb += GLOW * (0.05 + 0.6 * NIGHT) * sat(dot(normalize(n.xz + 1e-5), normalize(SUN.xz + 1e-5))) * (1.0 - abs(n.y));
  /* by night the eye opens: the moon's light and the sky's are given a
     little more, so the stone still reads */
  float moonlit = 1.0 + 3.0 * NIGHT;
  vec3 col = alb * (SUNC * dif * moonlit + amb * ao * (1.0 + 1.2 * NIGHT) + BNC * sat(-n.y + 0.3) * ao * (1.0 + 3.0 * NIGHT));
  /* grass glows a little when the light comes through it toward the eye */
  col += alb * SUNC * gw * 0.6 * pow(sat(dot(rd, SUN)), 3.0) * sh * csh;
  if (p.y < 60.0) col = spray(col, p, max(d, 0.0), rd);
  return col;
}

/* ------------------------------------------------------- the lighthouse */

/* a white tower with a red band, a dark gallery, lantern and dome; its
   silhouette is found from the ray's nearest pass to the axis, so it is
   cheap and its edges are soft */
float lighthouse(vec3 ro, vec3 rd, float pa, float base, out vec3 col, out float tl) {
  col = vec3(0.0);
  tl = 1e9;
  vec2 d2 = rd.xz;
  float dd = dot(d2, d2);
  float tc = dot(LH - ro.xz, d2) / dd;
  if (tc < 0.0) return 0.0;
  vec2 cp = ro.xz + d2 * tc - LH;
  float m = length(cp);
  float y = ro.y + rd.y * tc - base;
  float fp = tc * pa;
  float r = 0.0, part = 0.0;
  if (y < 21.0) r = mix(3.2, 2.3, sat(y / 21.0));
  else if (y < 21.9) { r = 3.1; part = 1.0; }
  else if (y < 25.2) { r = 1.9; part = 2.0; }
  else if (y < 27.2) { r = 1.9 * (1.0 - 0.8 * (y - 25.2) / 2.0); part = 3.0; }
  float cov = sat((r - m) / fp + 0.5) * sat((27.2 - y) / fp + 0.5) * sat((y + 2.0) / fp);
  if (cov <= 0.0) return 0.0;
  vec2 off = cp - normalize(d2) * sqrt(max(r * r - m * m, 0.0));
  vec3 n = normalize(vec3(off.x, 0.06, off.y));
  tl = tc - sqrt(max(r * r - m * m, 0.0)) / sqrt(dd);
  vec3 alb = vec3(0.8, 0.79, 0.76);
  float band = smoothstep(12.0 - fp, 12.0, y) * (1.0 - smoothstep(15.0, 15.0 + fp, y));
  alb = mix(alb, vec3(0.42, 0.06, 0.04), band);
  if (part == 1.0 || part == 2.0) alb = vec3(0.04, 0.045, 0.05);
  if (part == 3.0) alb = vec3(0.08, 0.03, 0.025);
  float dif = max(dot(n, SUN), 0.0) * cloudShade(vec3(LH.x, base, LH.y));
  vec3 amb = mix(AMBH, AMBU, 0.5) * (0.7 + 0.5 * dot(n, -normalize(vec3(d2.x, 0.0, d2.y)) * 0.5 + 0.5));
  col = alb * (SUNC * dif * (1.0 + 1.5 * NIGHT) + amb * (1.1 + 1.5 * NIGHT));
  /* the lantern glows at night */
  if (part == 2.0) col += LAMP * vec3(2.6, 2.1, 1.3);
  return cov;
}

/* a ray against a gabled block in its own frame: walls of half extents
   b.x and b.z and height b.y, its roof rising b.w over them along its
   length; returns the distance in and the face's normal */
float block(vec3 ro, vec3 rd, vec3 c, float ang, vec4 b, out vec3 nrm) {
  mat2 R = rot(ang);
  vec3 o = ro - c, d = rd;
  o.xz = R * o.xz;
  d.xz = R * d.xz;
  float tn = -1e9, tf = 1e9;
  vec3 nn = vec3(0.0, 1.0, 0.0);
  float k = b.w / b.x;
  for (int i = 0; i < 7; i++) {
    vec3 pn = i == 0 ? vec3(1.0, 0.0, 0.0) : i == 1 ? vec3(-1.0, 0.0, 0.0) : i == 2 ? vec3(0.0, 0.0, 1.0) :
              i == 3 ? vec3(0.0, 0.0, -1.0) : i == 4 ? vec3(0.0, -1.0, 0.0) : i == 5 ? vec3(k, 1.0, 0.0) : vec3(-k, 1.0, 0.0);
    float pd = i < 2 ? b.x : i < 4 ? b.z : i == 4 ? 0.0 : b.y + b.w;
    float dn = dot(pn, d), on = dot(pn, o);
    if (abs(dn) < 1e-7) { if (on > pd) return -1.0; continue; }
    float t = (pd - on) / dn;
    if (dn < 0.0) { if (t > tn) { tn = t; nn = pn; } }
    else tf = min(tf, t);
  }
  if (tn > tf || tn < 0.0) return -1.0;
  nn = normalize(nn);
  nn.xz = nn.xz * R;
  nrm = nn;
  return tn;
}

/* the keepers' houses beside the tower under slate roofs, and the white
   wall of the compound */
vec4 station(vec3 ro, vec3 rd, float base) {
  vec3 c0 = vec3(LH.x, base, LH.y);
  float best = 1e9;
  vec3 nb = vec3(0.0);
  float kind = 0.0;
  vec3 n;
  for (int i = 0; i < 6; i++) {
    vec3 c;
    vec4 b;
    float ang = 0.62;
    if (i == 0) { c = c0 + vec3(15.0, -0.6, 7.0); b = vec4(9.0, 4.8, 3.6, 2.6); }
    else if (i == 1) { c = c0 + vec3(19.0, -0.8, -8.0); b = vec4(6.0, 4.2, 3.2, 2.2); }
    else {
      vec3 wc = c0 + vec3(10.0, -0.6, 0.0);
      vec2 o = i == 2 ? vec2(0.0, 19.0) : i == 3 ? vec2(0.0, -19.0) : i == 4 ? vec2(23.0, 0.0) : vec2(-23.0, 0.0);
      o = o * rot(0.62);
      c = wc + vec3(o.x, 0.0, o.y);
      b = i < 4 ? vec4(23.0, 1.7, 0.35, 0.0) : vec4(0.35, 1.7, 19.0, 0.0);
    }
    float t = block(ro, rd, c, ang, b, n);
    if (t > 0.0 && t < best) {
      best = t;
      nb = n;
      float y = ro.y + rd.y * t - c.y;
      kind = i < 2 ? (y > b.y - 0.05 ? 2.0 : 1.0) : 1.0;
    }
  }
  if (best > 1e8) return vec4(0.0, 0.0, 0.0, -1.0);
  vec3 alb = kind > 1.5 ? vec3(0.06, 0.065, 0.07) : vec3(0.74, 0.73, 0.7);
  vec3 col = alb * (SUNC * max(dot(nb, SUN), 0.0) * (1.0 + 1.5 * NIGHT) + mix(AMBH, AMBU, 0.5 + 0.5 * nb.y) * (1.1 + 1.5 * NIGHT));
  return vec4(col, best);
}

/* --------------------------------------------------------- the lamp */

/* light scattered out of the two beams on its way to the eye: each beam
   is a cone, and the integral across it is taken at the ray's nearest
   pass to the beam's axis */
vec3 beams(vec3 ro, vec3 rd, float tEnd, vec3 L) {
  float a0 = TAU * fract(uTime / 10.0) + 2.2;
  vec3 c = vec3(0.0);
  vec3 w0 = ro - L;
  float dw = dot(rd, w0);
  for (int k = 0; k < 2; k++) {
    float a = a0 + float(k) * PI;
    vec3 b = normalize(vec3(cos(a), -0.015, sin(a)));
    float bd = dot(rd, b), ew = dot(b, w0);
    float den = max(1.0 - bd * bd, 1e-5);
    float sr = (bd * ew - dw) / den;
    float ub = ew + sr * bd;
    float dm = length(w0 + rd * sr - b * ub);
    float w = 0.8 + 0.035 * max(ub, 0.0);
    float sg = max(sqrt(den), 0.1);
    float I = 1.772 * w * exp(-dm * dm / (w * w)) / (sg * (ub * ub + 400.0));
    I *= smoothstep(0.0, 30.0, ub) * smoothstep(-40.0, 60.0, sr) * smoothstep(-80.0, 0.0, tEnd - sr);
    float ph = hg(dot(b, -rd), 0.4) + 0.04;
    c += I * ph * exp(-sr / 9000.0);
  }
  return c * vec3(1.0, 0.86, 0.62) * 8.0e7 * HAZE;
}

vec3 lampGlow(vec3 ro, vec3 rd, float tEnd, vec3 L, float pa) {
  vec3 tl = L - ro;
  float dl = length(tl);
  tl /= dl;
  float a0 = TAU * fract(uTime / 10.0) + 2.2;
  float face = 0.0;
  for (int k = 0; k < 2; k++) {
    float a = a0 + float(k) * PI;
    vec3 b = normalize(vec3(cos(a), -0.015, sin(a)));
    float ang = acos(clamp(dot(b, -tl), -1.0, 1.0));
    face = max(face, exp(-ang * ang / 0.0035));
  }
  float s0 = dot(L - ro, rd);
  float hh = max(length(cross(rd, L - ro)), 0.4);
  float halo = (atan((tEnd - s0) / hh) + atan(s0 / hh)) / hh;
  float sn = length(cross(rd, tl));
  float vis = smoothstep(-5.0, 5.0, tEnd - dl);
  vec3 c = vec3(1.0, 0.85, 0.6) * (halo * 9000.0 * HAZE * (0.25 + 2.5 * face));
  c += vec3(1.0, 0.9, 0.75) * vis * (exp(-sn * sn / (pa * pa * 2.2)) * (3.0 + 60.0 * face) + 2.0e-6 * face / (sn * sn + 4e-6));
  return c;
}

/* an island far out on the horizon, its skyline a function of bearing,
   lost almost wholly in the haze */
float island(vec3 rd) {
  float b = degrees(atan(-rd.x, rd.z));
  float u = (b - 41.0) / 21.0;
  if (u < 0.0 || u > 1.0) return -1.0;
  float shape = pow(sin(u * PI), 0.6) * (0.5 + 0.5 * fbm(vec2(u * 8.0, 2.0), 4));
  shape *= 1.0 - 0.55 * smoothstep(0.5, 0.75, u) * (1.0 - smoothstep(0.8, 0.95, u));
  return 16000.0 * (shape * 0.03 - 0.006);
}

/* ------------------------------------------------------------ the eye */

vec3 scene(vec2 fc) {
  setup();
  float asp = uRes.x / uRes.y;
  float wide = smoothstep(0.7, 1.45, asp);
  float k = mix(2.0 * tan(radians(31.0)), max(2.0 * tan(radians(28.0)) / asp, 0.56), wide);
  float yaw = radians(mix(22.0, 31.0, wide) + uPoint.x * 0.7);
  float hz = mix(0.63, 0.31, wide);
  float pitch = -atan((0.5 - hz) * k) + radians(uPoint.y * 0.45);
  vec3 fw = vec3(-sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 rt = vec3(cos(yaw), 0.0, sin(yaw));
  vec3 up = cross(fw, rt);
  vec2 uv = (fc - 0.5 * uRes) / uRes.y;
  vec3 rd = normalize(fw + k * (uv.x * rt + uv.y * up));
  float pa = k / uRes.y;

  float s0;
  float dc = coast(vec2(0.0), s0);
  vec3 ro = vec3(0.0, landH(vec2(0.0), s0, -dc) + 1.7, 0.0);

  float tSea = rd.y < 0.0 ? ro.y / -rd.y : 1e9;
  float tTop = rd.y > 0.0 ? (430.0 - ro.y) / rd.y : 1e9;
  float tMax = min(min(tSea, tTop), 9000.0);
  bool hit;
  float mr, tm;
  float t = march(ro, rd, tMax, pa, hit, mr, tm);

  vec3 col;
  float tEnd;
  if (hit) {
    col = aerial(shadeLand(ro, rd, t, pa), ro, rd, t);
    tEnd = t;
  } else if (rd.y < 0.0) {
    col = aerial(shadeSea(ro, rd, tSea, pa), ro, rd, tSea);
    tEnd = tSea;
  } else {
    col = sky(rd);
    col += sunDisc(rd, pa);
    col += (moonDisc(rd, pa) + stars(rd, pa) * (1.0 - smoothstep(0.0, 0.03, dot(rd, MOON) - 0.99))) * NIGHT;
    vec4 cv = veil(ro, rd);
    col = mix(col, cv.rgb, cv.a);
    vec4 cl = cumulus(ro, rd, false);
    col = mix(col, cl.rgb, cl.a);
    tEnd = 1e6;
  }
  /* a ray that only grazed the land takes some of its colour */
  if (!hit && mr < 1.0) {
    col = mix(col, aerial(shadeLand(ro, rd, tm, pa), ro, rd, tm), 0.5 * (1.0 - mr) / 0.6 * step(0.4, mr));
    tEnd = min(tEnd, tm);
  }
  /* the far island stands in front of the sky and the farthest sea */
  float ih = island(rd);
  if (ih > -50.0 && tEnd > 15000.0) {
    float ey = ro.y + rd.y * 16000.0;
    float ic = sat((ih - ey) / (16000.0 * pa) + 0.5);
    if (ic > 0.0) {
      vec3 icol = vec3(0.035, 0.05, 0.035) * (SUNC * 0.25 + AMBU * 1.2);
      col = mix(col, aerial(icol, ro, rd, 16000.0), ic);
    }
  }

  /* the station on the point, looked for only by rays that pass near it */
  float sb;
  float db = coast(LH, sb);
  float base = landH(LH, sb, -db) - 0.5;
  vec2 tw = LH - ro.xz;
  float near = length(tw - rd.xz * max(dot(tw, rd.xz) / dot(rd.xz, rd.xz), 0.0));
  if (near < 60.0) {
    vec4 st = station(ro, rd, base);
    if (st.w > 0.0 && st.w < tEnd) {
      col = aerial(st.rgb, ro, rd, st.w);
      tEnd = st.w;
    }
    vec3 lc;
    float tl;
    float cov = lighthouse(ro, rd, pa, base, lc, tl);
    if (cov > 0.0 && tl < tEnd + 3.0) {
      col = mix(col, aerial(lc, ro, rd, tl), cov);
      tEnd = min(tEnd, tl);
    }
  }

  if (LAMP > 0.001) {
    vec3 L = vec3(LH.x, base + 23.5, LH.y);
    col += LAMP * (beams(ro, rd, tEnd, L) + lampGlow(ro, rd, tEnd, L, pa));
  }
  return col;
}
`
};
