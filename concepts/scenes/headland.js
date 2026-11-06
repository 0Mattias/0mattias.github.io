/* concepts/scenes/headland.js · Neist Point

   The view everyone takes at Neist Point, the westernmost point of Skye:
   from the cliff top north of the car park, some 85 m over the sea,
   looking south-west across a bay to the peninsula of An t-Aigeach. The
   peninsula is a ridge of stacked lava flows, the trap of the Skye lava
   field: its north side falls sheer into the bay as a dark face of
   columnar basalt, worn into buttresses between gullies, streaked green
   with moss and pale below the birds' ledges, with a beach of fallen
   blocks at its foot; its top is grass that tilts away to the south. It
   rises west to its highest point, the prow, where it drops to a lower
   and flatter platform of the same flows, stepped in terraces, and on
   the far tip of that stands the lighthouse: Stevenson's white tower of
   1909 with its ochre gallery and black lantern, the flat-roofed
   keepers' houses beside it trimmed in ochre, and the white wall of the
   compound about them. Beyond is the Little Minch, and some thirty
   kilometres off, low on the horizon, the hills of South Uist.

   The sea is a plane given long trains of Atlantic swell and a wind sea
   over them, each fading as it shrinks under a pixel and handing its
   slope to the glints. The bay reflects the faces about it, found by a
   short ray. White water works at the foot of the cliffs and round the
   fallen blocks. The sky holds a broken sheet of stratocumulus, lit
   through from its sunward side.

   By day the Atlantic light comes from high in the south-west: the
   grass is bright, the north face stands in its own shade, and the sea
   is blue and glinting. At dusk the sun is setting into the sea just
   right of the lighthouse, with its path of light on the water; the
   faces are dark against it with the light raking their western edges,
   and the sky is warm. At night the moon hangs low over the Minch with
   its path below it, the stars are out, the cliffs are dark with the
   moon finding their edges, and the light is lit, its beam turning
   through the damp air. A turn from either of the sun's looks to the
   night passes through a dim twilight, never through day.
   WebGL2, no libraries, no build step. */

window.CONCEPT = {
  id: 'headland',
  theme: { day: '#c3ceda', dusk: '#ead6b9', night: '#2f384d' },
  t0: 12,
  frag: `
/* ------------------------------------------------------------ the world
   metres; x east, z north, y up. The peninsula is laid out in its own
   frame: u runs along it from the lighthouse east-north-east to the
   neck, v across it, north positive. */

const vec2 AX = vec2(0.96593, 0.25882);
const vec2 NX = vec2(-0.25882, 0.96593);
vec2 toPen(vec2 p) { return vec2(dot(p, AX), dot(p, NX)); }
vec2 fromPen(vec2 q) { return q.x * AX + q.y * NX; }

/* the viewpoint, on the cliff top above the bay, a few steps back from
   the edge; the mainland's coast runs through it north-west to south-east */
const vec2 EYEQ = vec2(688.0, 273.0);
const vec2 MD = vec2(-0.45480, 0.89058);
const vec2 MN = vec2(0.89058, 0.45480);
/* the tower, near the north edge of the tip */
const vec2 LHQ = vec2(0.0, 17.0);

/* bearings clockwise from north, and elevations */
vec3 dirBE(float b, float e) {
  b = radians(b); e = radians(e);
  return vec3(sin(b) * cos(e), sin(e), cos(b) * cos(e));
}

/* everything a look decides, blended once per pixel. The sun's looks are
   weighed down by DIP while the night comes in or goes, so a turn between
   them passes through a dim twilight */
vec3 SUN, SUNC, SUND, MOON, W3, SUNS, SUNSC, MOONC;
vec3 ZEN, HOR, HORA, GLOW;
vec3 AMBU, AMBH, BNC, WATER, CLC, DISC, SKYI, GNDI;
float HAZE, LAMP, NIGHT, DIP;

vec3 L3(vec3 d, vec3 u, vec3 n) { return d * W3.x + u * W3.y + n * W3.z; }

void setup() {
  DIP = max(0.0, 1.0 - 3.8 * (uLook.x + uLook.y) * uLook.z);
  W3 = vec3(uLook.xy * DIP, uLook.z);
  vec3 dSun = dirBE(196.0, 36.0), uSun = dirBE(238.5, 1.7);
  MOON = dirBE(238.0, 3.8);
  SUN = normalize(dSun * uLook.x + uSun * uLook.y + MOON * uLook.z);
  SUND = normalize(dSun * uLook.x + uSun * (uLook.y + uLook.z));
  SUNC = L3(vec3(3.2, 3.0, 2.75), vec3(3.0, 1.45, 0.5), vec3(0.17, 0.2, 0.27));
  /* the sea's glitter takes the sun and the moon each from its own place,
     so a turn between them never lays a path where neither stands */
  SUNS = normalize(dSun * uLook.x + uSun * uLook.y + vec3(0.0, 1e-4, 0.0));
  SUNSC = L3(vec3(3.2, 3.0, 2.75), vec3(3.0, 1.45, 0.5), vec3(0.0));
  MOONC = vec3(0.17, 0.2, 0.27) * uLook.z;
  ZEN = L3(vec3(0.10, 0.20, 0.46), vec3(0.11, 0.1, 0.17), vec3(0.004, 0.0075, 0.02));
  HOR = L3(vec3(0.50, 0.58, 0.70), vec3(1.35, 0.72, 0.32), vec3(0.02, 0.03, 0.055));
  HORA = L3(vec3(0.42, 0.53, 0.70), vec3(0.42, 0.26, 0.27), vec3(0.015, 0.023, 0.045));
  GLOW = L3(vec3(0.5, 0.45, 0.35), vec3(2.4, 1.1, 0.35), vec3(0.06, 0.065, 0.075));
  AMBU = L3(vec3(0.20, 0.27, 0.40), vec3(0.09, 0.09, 0.16), vec3(0.007, 0.010, 0.020));
  AMBH = L3(vec3(0.3, 0.31, 0.33), vec3(0.14, 0.10, 0.12), vec3(0.006, 0.008, 0.013));
  SKYI = L3(vec3(0.46, 0.52, 0.62), vec3(0.2, 0.16, 0.22), vec3(0.02, 0.028, 0.05));
  GNDI = L3(vec3(0.06, 0.07, 0.065), vec3(0.045, 0.032, 0.03), vec3(0.002, 0.003, 0.004));
  BNC = L3(vec3(0.05, 0.06, 0.05), vec3(0.03, 0.02, 0.015), vec3(0.002, 0.003, 0.004));
  CLC = L3(vec3(2.9, 2.85, 2.75), vec3(3.0, 1.35, 0.6), vec3(0.15, 0.18, 0.24));
  DISC = L3(vec3(60.0, 56.0, 50.0), vec3(60.0, 34.0, 12.0), vec3(0.0));
  WATER = look3(vec3(0.02, 0.026, 0.032), vec3(0.008, 0.016, 0.028), vec3(0.008, 0.024, 0.038));
  HAZE = look3(1.0 / 16000.0, 1.0 / 14000.0, 1.0 / 12000.0);
  LAMP = uLook.z + 0.12 * uLook.y;
  NIGHT = uLook.z;
}

/* the light of the sky's dome and of the sea and land below it, on a
   surface facing n; the sky toward the sun is the brighter */
vec3 ambient(vec3 n) {
  float u = 0.5 + 0.5 * n.y;
  vec3 a = SKYI * u + GNDI * (1.0 - u);
  return a + GLOW * 0.12 * sat(dot(normalize(n.xz + 1e-5), normalize(SUN.xz + 1e-5))) * (1.0 - abs(n.y));
}

float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float smax(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return max(a, b) + h * h * k * 0.25; }
float hg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * mu, 1.5)); }

/* ------------------------------------------------------------ the land */

/* the peninsula's north edge at u: the platform's cliffs west of the
   prow, the face of An t-Aigeach east of it; and its south edge */
float edgeN(float u) {
  float pl = 33.0 + 9.0 * sin(u * 0.052 + 0.9) + 3.0 * sin(u * 0.13 + 2.0) - 8.0 * exp(-pow((u - 300.0) / 22.0, 2.0));
  float rg = 56.0 + 0.03 * (u - 360.0) + 12.0 * exp(-pow((u - 390.0) / 30.0, 2.0)) + 17.0 * exp(-pow((u - 468.0) / 28.0, 2.0)) + 26.0 * exp(-pow((u - 565.0) / 42.0, 2.0)) + 2.0 * sin(u * 0.11);
  return mix(pl, rg, smoothstep(325.0, 360.0, u));
}
float edgeS(float u) {
  return -130.0 - 25.0 * sin(u * 0.0065 + 0.4) - 7.0 * sin(u * 0.031 + 1.0);
}

/* the footprint: distance from the edge, positive out over the sea, and
   how far along the coast the place is (s) */
float penD(vec2 q, out float s) {
  float n0 = edgeN(q.x), n1 = edgeN(q.x + 2.0);
  float dn = (q.y - n0) * inversesqrt(1.0 + 0.25 * (n1 - n0) * (n1 - n0));
  float ds = edgeS(q.x) - q.y;
  float dt = (-64.0 - q.x + 0.0042 * q.y * q.y + 4.0 * sin(q.y * 0.09)) * 0.8;
  s = q.x + 0.6 * max(-q.x, 0.0) * sign(q.y);
  return smax(smax(dn, ds, 30.0), dt, 36.0);
}
float mainD(vec2 q, out float s) {
  vec2 r = q - EYEQ;
  s = dot(r, MD);
  float w = smoothstep(40.0, 160.0, abs(s));
  return -dot(r, MN) - 5.0 + w * (7.0 * sin(s * 0.027 + 0.5) + 4.0 * sin(s * 0.083));
}

/* the tops. An t-Aigeach is highest at the prow and falls east toward the
   neck; at the prow its crest is the edge of the face, and eastward it
   draws back from it, leaving a slope of grass that steepens as it rolls
   over to the face; the top tilts away to the south. West of the prow
   the ridge drops to a shoulder and then to the platform, which rises
   gently from the tip. Every top rounds over at its edge. The mainland
   rises inland from the viewpoint */
float ridgeTop(vec2 q) {
  float crest = 79.0 - 21.0 * (1.0 - exp(-max(q.x - 366.0, 0.0) / 45.0)) - 12.0 * smoothstep(480.0, 980.0, q.x) + 1.0 * sin(q.x * 0.04);
  float vc = edgeN(q.x) - 5.0 - 55.0 * smoothstep(372.0, 520.0, q.x);
  float dv = q.y - vc;
  float hn = 0.36 * dv + 0.0012 * dv * dv;
  float hs = mix(0.6, 0.3, smoothstep(370.0, 480.0, q.x)) * (sqrt(dv * dv + 25.0) - 5.0);
  /* the summit is a point over the arete, falling to the prow's west face */
  float w = 0.4 * max(366.0 - q.x, 0.0);
  return crest - (dv > 0.0 ? hn : hs) - w + 1.2 * noise(q / 18.0);
}
float platTop(vec2 q) {
  return 25.0 + 9.0 * smoothstep(-20.0, 360.0, q.x) + 0.03 * min(q.y - edgeN(q.x), 0.0) + 1.5 * noise(q / 35.0);
}
float mainTop(vec2 q, float inl) {
  return 80.0 + 0.07 * max(inl, 0.0);
}

/* a run of blocks along s, each w wide and standing out by its own amount
   up to 1, with steep sides between them */
float blocks(float s, float w, float seed) {
  float x = s / w, i = floor(x), f = x - i;
  return mix(hash11(i * 1.37 + seed), hash11((i + 1.0) * 1.37 + seed), smoothstep(0.75, 1.0, f));
}

/* the faces. The flows are some 11 m thick, and where amt is more than
   nothing each stands back a little from the one below, so the face
   climbs in steps. Within a flow the rock is jointed into columns,
   standing out or broken back each by its own amount and gathered into
   slabs; col says how strongly. The face is carved into broad buttresses
   between narrow gullies that run its whole height. This is added to the
   footprint's distance */
float faceOff(float y, float s, float amt, float col) {
  float l = (y + 6.0 * noise(vec2(s / 70.0, 1.7)) + 2.5 * sin(s * 0.012 + 0.5)) / 11.0;
  float i = floor(l), f = l - i;
  float st = hash11(i * 7.13 + floor(s / 55.0) * 1.7);
  float back = amt * (i * 0.6 + 2.2 * st * st * smoothstep(0.86, 0.98, f));
  float g1 = 1.0 - abs(2.0 * noise(vec2(s / 42.0, y / 300.0 + 3.0)) - 1.0);
  /* the columns run on through several flows where col is small */
  float ic = floor(i * col);
  float sw = s + 5.0 * noise(vec2(s / 23.0, ic));
  float sl = blocks(sw + 3.0 * ic, 17.0, 4.1 + ic * 0.37);
  float cg = blocks(sw, 6.3, 9.7 + ic * 1.31);
  /* the colonnade at the foot of a flow stands in tall columns; the
     entablature over it is broken small and blocky */
  float ent = smoothstep(0.35, 0.5, f);
  float co = mix(blocks(sw, 2.1, 2.3 + ic * 13.1), blocks(sw + 0.7 * floor(y / 1.7), 1.6, 5.1 + floor(y / 1.7) * 3.3), ent * col);
  return back - 4.0 * (1.0 - g1 * g1) + 5.0 * pow(g1, 12.0) - (1.5 + 1.5 * col) * sl - 1.6 * col * cg - (0.45 + 0.55 * col) * co + 4.0;
}

/* the edge of a top: the turf rounds over and the highest beds break
   back raggedly under it */
float lip(float y, float top, float s) {
  return 0.8 * smoothstep(top - 8.0, top - 1.5, y) * noise(vec2(s / 6.0, 2.0));
}

float map(vec3 p) {
  if (p.y > 100.0) return p.y - 96.0;
  vec2 q = toPen(p.xz);
  float sp, sm;
  float dp = penD(q, sp), dm = mainD(q, sm);
  float df = min(dp, dm);
  if (df > 45.0) return max(df - 34.0, p.y - 96.0);
  dp += 3.0 * (noise(q / 9.0) - 0.5);
  dm += 3.0 * (noise(q / 9.0 + 4.0) - 0.5);
  df = min(dp, dm);
  /* the rock of the faces is lumpy at every scale; the tops are not */
  float lump = df < 16.0 ? 1.6 * (noise3(p * 0.2) - 0.5) + 0.6 * (noise(p.xz * 0.55 + p.y * 0.4) - 0.5) : 0.0;
  float r = 1e4;
  if (dp < 45.0) {
    /* An t-Aigeach: one great face, its flows hardly stepped. Well back
       from any edge only the top matters */
    if (q.x > 330.0) {
      float rt = ridgeTop(q);
      float dw = 358.0 + 4.0 * sin(q.y * 0.05) - q.x;
      float ridge;
      if (max(dp, dw) < -22.0) ridge = p.y - rt;
      else {
        float amt = 0.15 + 0.6 * smoothstep(480.0, 760.0, q.x) * noise(vec2(q.x / 110.0, 2.0));
        float g2 = 1.0 - abs(2.0 * noise(vec2(sp / 19.0, p.y / 160.0 + 5.0)) - 1.0);
        float fo = faceOff(p.y, sp, amt, 0.3) + lip(p.y, rt, sp) + lump + 8.0 * pow(g2, 8.0) - 2.5 * (1.0 - g2 * g2);
        /* the edge breaks raggedly: notches and knobs where the turf gives
           way to the rock */
        float rim = (0.6 + 4.5 * smoothstep(0.4, 0.8, noise(vec2(sp / 7.0, 1.3)) + 0.3 * noise(vec2(sp / 2.2, 4.0)))) * exp(min(dp + fo, 0.0) / 4.0);
        ridge = smax(p.y - rt + rim, smax(dp + fo, dw + 0.5 * fo, 3.0), 1.0);
      }
      r = ridge;
    } else r = 352.0 - q.x;
    /* the shoulder under the prow's west face */
    vec2 sq = (q - vec2(340.0, 44.0)) / vec2(17.0, 13.0);
    float dsh = (length(sq) - 1.0) * 13.0;
    if (dsh < 30.0) {
      float sht = 46.0 + 2.0 * noise(q / 9.0);
      r = min(r, smax(p.y - sht + 2.0 * exp(min(dsh, 0.0) / 5.0), dsh + faceOff(p.y, sp + 77.0, 0.6, 1.0), 1.0));
    } else r = min(r, dsh - 12.0);
    /* the platform: its upper level, and a lower terrace of the flow
       beneath along its north edge */
    if (q.x < 400.0) {
      float pt = platTop(q);
      float plat;
      if (dp < -22.0) plat = p.y - pt;
      else {
        float th = 17.0 + 5.0 * noise(vec2(q.x / 40.0, 9.0));
        float terr = 11.0 * smoothstep(th - 1.0, th + 1.0, p.y) * smoothstep(0.45, 0.7, noise(vec2(q.x / 45.0, 5.0))) * (1.0 - smoothstep(330.0, 370.0, q.x));
        float fp = faceOff(p.y + 5.0, sp + 300.0, 1.6, 1.0) + terr + lip(p.y, pt, sp) + lump;
        plat = smax(p.y - pt + 2.0 * exp(min(dp + fp, 0.0) / 3.5), dp + fp, 1.0);
      }
      r = min(r, smax(plat, q.x - 380.0, 4.0));
    } else r = min(r, q.x - 386.0);
  } else r = dp - 34.0;
  if (dm < 45.0) {
    float mt = mainTop(q, -dm);
    float fm = dm < -22.0 ? 0.0 : faceOff(p.y, sm + 900.0, 1.1, 0.8) + lip(p.y, mt, sm) + lump;
    r = min(r, smax(p.y - mt + 3.0 * exp(min(dm, 0.0) / 5.0), dm + fm, 1.0));
  } else r = min(r, dm - 34.0);
  /* blocks fallen from the faces, heaped at their foot into a beach of
     boulders, widest in the bay east of the prow */
  if (p.y < 10.0) {
    float sh = 2.0 + 6.0 * noise(vec2((sp + sm) / 45.0, 1.3));
    float bay = 10.0 * smoothstep(350.0, 395.0, q.x) * (1.0 - smoothstep(620.0, 700.0, q.x)) * step(0.0, q.y);
    float ap = df + 6.0 - (1.6 + bay * 0.25) * max(sh - p.y, 0.0) + 2.6 * noise(p.xz * 0.3 + p.y * 0.2) - 1.3 - bay * 0.5;
    r = min(r, max(ap, p.y - sh - 1.0));
  }
  return r;
}

vec3 normalAt(vec3 p, float t) {
  float e = max(0.04, t * 0.0009);
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) +
                   k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}

float march(vec3 ro, vec3 rd, float tmax, float pa, out bool hit) {
  float t = 0.5, d = 1e4;
  hit = false;
  for (int i = 0; i < 170; i++) {
    d = map(ro + rd * t);
    if (d < 0.35 * pa * t + 0.01) { hit = true; break; }
    t += d * 0.7;
    if (t > tmax) break;
  }
  /* a ray still close to the land when its steps run out has met it */
  if (!hit && t < tmax && d < 1.0 + 0.004 * t) hit = true;
  return t;
}

float softShadow(vec3 p, vec3 l) {
  float res = 1.0, t = 1.0;
  for (int i = 0; i < 16; i++) {
    vec3 q = p + l * t;
    if (q.y > 100.0) break;
    float h = map(q);
    res = min(res, 8.0 * h / t);
    if (res < 0.01) break;
    t += clamp(h * 1.2, 2.0, 90.0);
    if (t > 1600.0) break;
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
  float side = exp(-(1.0 - dot(normalize(rd.xz + 1e-5), normalize(SUN.xz + 1e-5))) * look3(4.0, 9.0, 4.0));
  vec3 hor = mix(HORA, HOR, side);
  float hb = 1.0 - exp(-(airmass(e) - 1.0) * 0.1);
  vec3 c = mix(ZEN, hor, pow(hb, look3(1.0, 1.7, 1.0)));
  c *= 0.85 + 0.25 * mu * mu;
  c += GLOW * (hg(mu, 0.85) * 0.07 + hg(mu, 0.6) * 0.12 + hg(mu, 0.2) * 0.2) * (0.3 + 0.7 * hb);
  return c;
}

/* haze over land and sea: an exponential atmosphere, its light taken from
   the sky low in the same direction */
vec3 aerial(vec3 col, vec3 ro, vec3 rd, float t) {
  float H = 700.0;
  float k = rd.y * t / H;
  float od = HAZE * t * exp(-ro.y / H) * (abs(k) > 1e-3 ? (1.0 - exp(-k)) / k : 1.0);
  vec3 ext = exp(-od * vec3(0.85, 0.95, 1.1));
  vec3 hd = normalize(vec3(rd.x, max(rd.y, 0.0) * 0.35 + 0.006, rd.z));
  return col * ext + sky(hd) * (1.0 - ext);
}

/* stratocumulus: a broken sheet about 1.6 km up, its cells drawn out
   across the wind, so toward the horizon they close into long rolls.
   Each is lit through from its sunward side and dims where it is thick
   or where cloud stands between it and the light */
const float CLH = 1600.0;
float clN(vec2 p, int oct) {
  vec2 q = rot(0.45) * p / vec2(5600.0, 2400.0) + vec2(uTime * 0.0004, 0.0);
  float w = noise(q * 0.6 + vec2(4.1, 2.3));
  return fbm(q + vec2(w * 0.8, 0.0), oct);
}
float clCov() { return look3(0.565, 0.6, 0.63); }
vec4 clouds(vec3 ro, vec3 rd) {
  if (rd.y < 0.003) return vec4(0.0);
  float t = (CLH - ro.y) / rd.y;
  vec2 p = ro.xz + rd.xz * t;
  float cv = clCov();
  float n = clN(p, 4);
  float d = smoothstep(cv, cv + 0.2, n);
  if (d <= 0.0) return vec4(0.0);
  float a = 1.0 - exp(-d * 5.0 / max(rd.y * 8.0, 0.25));
  vec2 sd = normalize(SUN.xz + 1e-5);
  float n1 = smoothstep(cv, cv + 0.2, clN(p + sd * 300.0, 3));
  float n2 = smoothstep(cv, cv + 0.2, clN(p + sd * 800.0, 3));
  float od = d * 0.9 + n1 * 1.0 + n2 * 0.7;
  float mu = dot(rd, SUN);
  float tr = exp(-od * 1.3);
  vec3 c = CLC * (0.10 + 0.55 * tr + 0.9 * hg(mu, 0.65) * (1.0 - d * 0.6) * tr);
  c += AMBU * (1.1 - 0.5 * d) + AMBH * 0.25;
  c = aerial(c, ro, rd, min(t, 60000.0));
  return vec4(c, a * smoothstep(0.003, 0.02, rd.y));
}

float cloudShade(vec3 p) {
  float t = (CLH - p.y) / max(SUN.y, 0.06);
  vec2 q = p.xz + SUN.xz * t;
  float cv = clCov();
  return 1.0 - 0.65 * smoothstep(cv, cv + 0.2, clN(q, 2)) * (1.0 - NIGHT);
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
  return c * exp(-0.25 * airmass(rd.y));
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
  return cov * (0.55 + 0.45 * limb) * DISC * DIP * exp(-0.06 * airmass(SUND.y));
}

/* the Outer Hebrides, thirty-odd kilometres west over the Little Minch:
   South Uist's hills, Hecla and Beinn Mhor, west-south-west of the
   point, the island's long low back either side, and the low land of
   Benbecula and North Uist running north beyond. Given as the height
   of the skyline over the sea horizon, in radians, by bearing */
float hebrides(float b) {
  float h = 0.0;
  h = max(h, 520.0 * exp(-pow((b - 242.6) / 1.5, 2.0)));
  h = max(h, 470.0 * exp(-pow((b - 240.6) / 1.1, 2.0)));
  h = max(h, 330.0 * exp(-pow((b - 245.3) / 1.6, 2.0)));
  h = max(h, 260.0 * exp(-pow((b - 238.4) / 1.3, 2.0)));
  h = max(h, 150.0 * smoothstep(233.0, 237.0, b) * (1.0 - smoothstep(249.0, 256.0, b)));
  h = max(h, 60.0 * smoothstep(254.0, 260.0, b) * (1.0 - smoothstep(282.0, 286.0, b)));
  h = max(h, 240.0 * exp(-pow((b - 290.0) / 3.0, 2.0)) + 90.0 * smoothstep(283.0, 287.0, b) * (1.0 - smoothstep(305.0, 312.0, b)));
  h *= 0.9 + 0.15 * noise(vec2(b * 1.3, 4.0));
  return (h * 0.7 - 30.0) / 33000.0;
}

/* ------------------------------------------------------------- the sea */

/* the slope of the sea and the variance of the slopes too small to draw:
   three long trains of Atlantic swell from the west, then the wind sea as
   drifting sheets of noise drawn out across the wind */
vec2 seaSlope(vec2 p, float fp, out float var) {
  vec2 g = vec2(0.0);
  var = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float lam = 140.0 * pow(0.62, fi);
    float an = 0.35 + 0.5 * sin(fi * 2.4 + 0.3);
    vec2 dir = vec2(cos(an), sin(an));
    float k = TAU / lam;
    float st = 0.012 * (0.4 + 1.2 * noise(p / (lam * 2.5) + fi * 3.1));
    float ph = k * dot(dir, p) - sqrt(9.81 * k) * uTime + fi * 1.7;
    float fade = sat(1.5 - fp * 5.0 / lam);
    g += dir * (st * cos(ph) * fade);
    var += st * st * 0.5 * (1.0 - fade * fade);
  }
  mat2 W = rot(0.5);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float lam = 14.0 * pow(0.5, fi);
    float fade = sat(1.5 - fp * 4.0 / lam);
    if (fade <= 0.0) { var += 0.0045; continue; }
    vec2 q = W * p / lam;
    vec3 a = noised(q * vec2(0.55, 1.0) + vec2(-uTime * 1.1 / sqrt(lam), fi * 7.3));
    vec3 b = noised(rot(0.9) * q * vec2(0.6, 1.0) + vec2(uTime * 0.6 / sqrt(lam), fi * 3.1 + 5.0));
    vec2 gg = (a.yz * vec2(0.4, 1.0) + rot(-0.9) * (b.yz * vec2(0.45, 1.0))) * (0.013 + 0.008 * fi);
    g += (gg * W) * fade;
    var += 0.0045 * (1.0 - fade * fade);
  }
  /* and the finest chop, never drawn */
  var += 0.0045;
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

/* the land's colour, cheaply, for the bay's reflection of it */
vec3 landQuick(vec3 p, vec3 rd) {
  vec2 q = toPen(p.xz);
  float s;
  float dp = penD(q, s);
  float top = max(dp < 0.0 ? max(ridgeTop(q), platTop(q)) : 0.0, 0.0);
  float g = smoothstep(-2.5, -0.5, p.y - top) * step(dp, 0.0);
  vec3 alb = mix(vec3(0.06, 0.055, 0.05), vec3(0.04, 0.07, 0.02), g);
  vec2 face = normalize(-rd.xz);
  float lit = max(dot(vec3(face.x, 0.0, face.y), SUN), 0.0) * (1.0 - g) + max(SUN.y, 0.0) * g;
  return alb * (SUNC * lit * 0.8 + ambient(vec3(face.x, 0.0, face.y) * (1.0 - g) + vec3(0.0, g, 0.0))) * (1.0 + 2.0 * NIGHT);
}

/* one light off the sea: its glitter, and the sparkle of single facets */
vec3 seaGlint(vec3 n, vec3 v, vec3 L, vec3 C, float m2, float nv, float fl, vec2 sl, float spot) {
  if (L.y <= 0.0 || dot(C, C) < 1e-8) return vec3(0.0);
  vec3 h = normalize(v + L);
  float nh = max(dot(n, h), 1e-3);
  float spec = beckmann(nh, m2) * smithG(nv, sqrt(m2)) * smithG(max(dot(n, L), 0.0), sqrt(m2)) / (4.0 * nv);
  float Fh = 0.02 + 0.98 * pow(1.0 - max(dot(v, h), 0.0), 5.0);
  float al = dot(normalize(vec3(-sl.x, 1.0, -sl.y)), h);
  return C * Fh * (spec * fl + smoothstep(0.9975, 1.0, al) * spot);
}

vec3 shadeSea(vec3 ro, vec3 rd, float t, float pa) {
  vec3 p = ro + rd * t;
  vec2 q = toPen(p.xz);
  float sp, sm;
  float d = min(penD(q, sp), mainD(q, sm));
  float fp = t * pa / max(-rd.y, 0.04);
  float var;
  vec2 g = seaSlope(p.xz, fp, var);
  /* the backwash off the cliffs roughens the water at their foot */
  var += 0.01 * exp(-max(d, 0.0) / 50.0);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = -rd;
  float nv = max(dot(n, v), 0.02);
  /* the facets too small to draw tilt toward the eye and up the sky, so a
     rough sea is darker than a mirror toward the horizon */
  float sig = sqrt(var);
  float F = 0.02 + 0.98 * pow(1.0 - sat(nv + 0.8 * sig), 5.0);
  vec3 r = reflect(rd, n);
  r.y = abs(r.y) + 0.004 + 0.7 * sig;
  r = normalize(r);
  vec3 refl = sky(r);
  refl = mix(refl, vec3(luma(refl)), 0.4 * uLook.x);
  /* the faces about the bay stand in its reflection: a short ray finds
     them */
  if (d < 320.0) {
    float rt = 1.0;
    for (int i = 0; i < 12; i++) {
      vec3 rp = p + r * rt;
      if (rp.y > 98.0) break;
      float h = map(rp);
      if (h < 0.02 * rt + 0.3) {
        float brk = smoothstep(0.2, 0.8, noise(p.xz * vec2(0.12, 0.6) + g * 40.0));
        refl = mix(refl, landQuick(rp, r) * 0.8, 0.55 * brk / (1.0 + var * 40.0));
        break;
      }
      rt += max(h * 1.2, 1.5);
      if (rt > 500.0) break;
    }
  }
  /* the cliffs' shadow on the water, found by a few steps toward the light */
  float csh = cloudShade(p);
  if (d < 160.0 && SUN.y > 0.0) {
    float lt = 1.0;
    for (int i = 0; i < 3; i++) {
      float ts = 10.0 + 45.0 * float(i * i);
      vec3 sp3 = p + SUN * ts;
      if (sp3.y > 85.0) break;
      lt = min(lt, sat(map(sp3) / 3.0 + 0.3));
    }
    csh *= lt;
  }
  float m2 = 0.003 + 2.0 * var;
  /* the glitter is granular: facets too small to draw catch the light in
     flecks, drawn out across the line of sight by perspective; and near at
     hand single facets sparkle as they tilt to the light */
  vec2 gq = rot(atan(rd.x, rd.z)) * p.xz;
  float fl = noise(gq * vec2(0.9, 0.18) / (0.6 + 0.4 * t * pa) + vec2(uTime * 1.3, 0.0));
  fl = 0.15 + 2.6 * fl * fl * fl;
  float pw = t * pa, spot = 0.0;
  vec2 sl = vec2(0.0);
  if (pw < 0.7) {
    vec2 fq = p.xz / 1.1;
    vec2 gi = floor(fq), gf = fract(fq) - 0.5;
    vec3 hh = hash33(vec3(gi, 7.0));
    float ph = hh.z * TAU + uTime * (1.5 + 2.5 * hh.x);
    sl = (hh.xy - 0.5) * 0.5 + 0.06 * vec2(sin(ph), cos(ph * 1.3)) + g;
    spot = exp(-dot(gf, gf) * 1.21 / (pw * pw + 0.004)) * 18.0 * (1.0 - pw / 0.7);
  }
  vec3 col = refl * F + (seaGlint(n, v, SUNS, SUNSC, m2, nv, fl, sl, spot) + seaGlint(n, v, MOON, MOONC, m2, nv, fl, sl, spot)) * csh;
  /* light from under the surface: blue-green, lighter over the shelf of
     fallen rock near the cliffs */
  vec3 body = WATER * (SUNC * max(SUN.y, 0.0) * csh * 0.6 + AMBU * 1.2);
  body *= 1.0 + 0.6 * exp(-max(d, 0.0) / 15.0);
  col += body * (1.0 - F);

  /* white water at the foot of the faces and round the blocks, flaring
     as each swell comes in, and lace drawn out from it */
  if (d < 120.0) {
    float fd = map(vec3(p.x, 0.0, p.z));
    float ph = dot(vec2(0.94, 0.34), p.xz) * TAU / 140.0 - sqrt(9.81 * TAU / 140.0) * uTime;
    float surge = 0.5 + 0.5 * sin(ph + (sp + sm) * 0.004);
    float band = exp(-max(fd, 0.0) / (0.7 + 1.8 * surge)) * smoothstep(0.45, 0.8, noise(p.xz / 3.0 + vec2(uTime * 0.25, -uTime * 0.1)) + 0.35 * surge - 0.15);
    vec2 lq = vec2((sp + sm) / 11.0, fd / 5.0 - uTime * 0.05 + surge * 0.3);
    float r1 = 1.0 - abs(2.0 * noise(lq + noise(lq * 0.5) * 0.8) - 1.0);
    float lw = smoothstep(0.9, 0.98, r1) * exp(-max(fd, 0.0) / 6.0) * 0.3;
    float foam = sat(band * 0.65 + lw * 0.5);
    foam *= sat(1.2 - fp * 0.06);
    vec3 fc = vec3(0.75) * (SUNC * max(SUN.y, 0.0) * csh + SKYI * 0.8);
    col = mix(col, fc, foam);
  }
  return col;
}

/* ------------------------------------------------------- the land's skin */

vec3 shadeLand(vec3 ro, vec3 rd, float t, float pa) {
  vec3 p = ro + rd * t;
  vec3 n = normalAt(p, t);
  vec2 q = toPen(p.xz);
  float sp, sm;
  float dp = penD(q, sp), dm = mainD(q, sm);
  float s = dp < dm ? sp : sm + 900.0;
  float top = dp < dm ? (q.x > 358.0 ? max(ridgeTop(q), platTop(q)) : platTop(q)) : mainTop(q, -dm);
  float fp = t * pa;

  /* where the turf holds, and where the rock shows */
  float gw = smoothstep(0.66, 0.82, n.y) * smoothstep(9.0, 14.0, p.y) * smoothstep(0.35, 0.6, noise(vec2(s / 12.0, p.y / 6.0)) + 0.4 * smoothstep(-8.0, -2.0, p.y - top));
  gw = max(gw, smoothstep(-3.0, -0.6, p.y - top) * smoothstep(0.25, 0.55, n.y));
  /* outcrops break through the turf on the steeper ground */
  gw *= 1.0 - 0.85 * smoothstep(0.6, 0.78, noise(p.xz / 6.0 + 1.0) + 0.25 * (1.0 - n.y)) * smoothstep(-0.5, -5.0, p.y - top);
  float l = (p.y + 6.0 * noise(vec2(s / 70.0, 1.7)) + 2.5 * sin(s * 0.012 + 0.5)) / 11.0;
  float fi = floor(l), ff = l - fi;
  float rg = smoothstep(345.0, 375.0, q.x) * step(dp, dm);
  float colA = mix(1.0, 0.3, rg);
  vec3 rock = vec3(0.0), grass = vec3(0.0);
  if (gw < 0.999) {
    /* basalt: dark grey-brown, each flow a little different and banded
     where the flows meet, the columns' faces each a shade apart; olive moss
     down the faces in long streaks, wetter and darker low down */
    rock = vec3(0.12, 0.092, 0.066) * (1.0 + colA * 0.3 * (hash11(fi * 3.7 + 1.0) - 0.5));
    rock = mix(rock, vec3(0.11, 0.075, 0.062), 0.6 * hash11(fi * 1.3 + 4.0) * noise(vec2(s / 80.0, 1.0)));
    float vs = noise(vec2(s / 2.5, p.y / 26.0)) * 0.6 + noise(vec2(s / 7.0, p.y / 60.0) + 4.0) * 0.4;
    rock *= 0.6 + 0.8 * vs;
    float fc = floor(fi * colA);
    rock *= 0.72 + 0.35 * blocks(s, 2.1, 2.3 + fc * 13.1) + 0.3 * blocks(s + 3.0 * fc, 17.0, 4.1 + fc * 0.37);
    /* fine grit: lichen spots and broken faces too small to draw */
    rock *= 0.75 + 0.5 * hash12(floor(vec2(s, p.y) / max(0.6, fp * 1.5)));
    rock *= 1.0 - 0.2 * colA * smoothstep(0.9, 1.0, ff) * hash11(fi * 7.13 + floor(s / 55.0) * 1.7);
    /* broad tones down the face: dark where it seeps, lighter where dry */
    float zone = noise(vec2(s / 30.0, p.y / 120.0) + 2.0);
    rock *= 0.55 + 0.9 * zone;
    /* moss and lichen, olive and yellow-green, thickest low on the faces
       that stay wet, in long streaks down them */
    float mz = smoothstep(0.3, 0.7, noise(vec2(s / 38.0, p.y / 45.0) + 7.0)) * (1.0 - smoothstep(top - 25.0, top - 5.0, p.y) * 0.6);
    float moss = mz * smoothstep(0.3, 0.65, noise(vec2(s / 3.5, p.y / 22.0) + 3.0));
    rock = mix(rock, mix(vec3(0.07, 0.078, 0.03), vec3(0.11, 0.11, 0.035), noise(vec2(s / 9.0, p.y / 9.0))), moss * 0.9);
    rock *= 1.0 + 0.3 * smoothstep(0.3, 0.75, noise(vec2(s / 20.0, p.y / 50.0) + 9.0)) * (1.0 - moss);
    /* where the birds nest, pale streaks run down from the ledges */
    float colony = smoothstep(0.55, 0.8, noise(vec2(s / 50.0, p.y / 30.0) + 5.0)) * smoothstep(10.0, 22.0, p.y) * (1.0 - smoothstep(top - 12.0, top - 4.0, p.y));
    float streak = smoothstep(0.65, 0.9, noise(vec2(s / 1.1, p.y / 35.0 + 9.0))) * smoothstep(0.3, 0.7, noise(vec2(s / 1.1 + 5.0, p.y / 8.0)));
    rock = mix(rock, vec3(0.3, 0.29, 0.27), colony * streak * 0.6);
    /* yellow and grey lichen in the splash zone, a dark wet band below it
       and black weed at the foot */
    float splash = smoothstep(3.0, 6.0, p.y) * (1.0 - smoothstep(9.0, 16.0, p.y));
    rock = mix(rock, vec3(0.2, 0.15, 0.06), splash * 0.5 * smoothstep(0.5, 0.8, noise(vec2(s / 3.0, p.y / 2.0))));
    float wet = 1.0 - smoothstep(1.5, 4.5 + 2.0 * noise(vec2(s / 18.0, 3.0)), p.y);
    rock *= 1.0 - 0.6 * wet;
    /* the fallen blocks are paler, dried and lichened */
    float blk = smoothstep(10.0, 5.0, p.y) * smoothstep(-6.0, 2.0, min(dp, dm));
    rock = mix(rock, vec3(0.15, 0.14, 0.125) * (0.6 + 0.7 * noise(p.xz * 0.5)), blk * 0.85);
  }
  if (gw > 0.001) {
    /* grass on the tops and the ledges: bright where it is grazed short,
       olive and browner where it is long or steep, broken by outcrops */
    grass = vec3(0.072, 0.086, 0.034);
    float gn = noise(p.xz / 25.0) * 0.35 + noise(p.xz / 5.0) * 0.4 + noise(p.xz / 1.6) * 0.25;
    grass *= 0.55 + 0.9 * gn;
    grass = mix(grass, vec3(0.1, 0.092, 0.048), 0.55 * smoothstep(0.38, 0.75, noise(p.xz / 45.0 + 3.0)));
    /* rush and long grass in darker patches */
    grass = mix(grass, vec3(0.036, 0.044, 0.022), 0.55 * smoothstep(0.55, 0.8, noise(p.xz / 11.0 + 8.0)));
    grass = mix(grass, vec3(0.1, 0.09, 0.05), smoothstep(0.92, 0.6, n.y) * 0.7);
    /* sheep tracks across the slopes */
    grass *= 1.0 - 0.25 * smoothstep(0.55, 0.75, noise(vec2(p.y * 1.3, s / 30.0))) * smoothstep(0.95, 0.75, n.y);
  }
  vec3 alb = mix(rock, grass, gw);
  /* the platform's turf is broken everywhere by low outcrops of the flow
     beneath, grey with lichen */
  float oc = smoothstep(0.7, 0.8, noise(p.xz / 9.0 + 7.0) + 0.25 * noise(p.xz / 2.5)) * gw * step(q.x, 340.0) * step(dp, dm);
  alb = mix(alb, vec3(0.13, 0.13, 0.12) * (0.7 + 0.6 * noise(p.xz * 1.3)), oc * 0.75);

  /* tussocks on the turf, catching and losing the light */
  float tfade = sat(2.0 - fp * 1.2) * gw;
  if (tfade > 0.0) {
    vec2 tg = noised(p.xz / 3.0 + 3.0).yz + 0.5 * noised(p.xz / 1.1).yz;
    n = normalize(n + tfade * 0.12 * vec3(-tg.x, 0.0, -tg.y));
  }

  /* the rock's grain, too fine for the surface itself, laid on its light:
     the columns' faces and the cracks across them */
  float bfade = sat(1.8 - fp * 1.2) * (1.0 - gw * 0.7);
  float cav = 1.0;
  if (bfade > 0.0) {
    vec2 bq = vec2(s, p.y);
    vec3 b1 = noised(bq / vec2(4.0, 9.0) + 1.0), b2 = noised(bq / vec2(1.4, 3.0) + 7.0), b3 = noised(bq / vec2(0.6, 1.1) + 3.0);
    vec2 gg = b1.yz / vec2(4.0, 9.0) * 0.7 + b2.yz / vec2(1.4, 3.0) * 0.28 + b3.yz / vec2(0.6, 1.1) * 0.1;
    vec3 tq = normalize(vec3(n.z, 0.0, -n.x) + 1e-5);
    vec3 yq = normalize(vec3(0.0, 1.0, 0.0) - n * n.y);
    n = normalize(n - bfade * (gg.x * tq + gg.y * yq));
    /* the hollows of the rough rock hold shadow, and the joints between
       the columns run down the face as dark seams */
    float hgt = b1.x * 0.6 + b2.x * 0.3 + b3.x * 0.15;
    float jx = fract((s + 5.0 * noise(vec2(s / 23.0, fi * colA))) / 2.1);
    float jt = (1.0 - smoothstep(0.0, 0.07 + fp * 0.1, min(jx, 1.0 - jx))) * colA * (1.0 - smoothstep(0.35, 0.5, ff) * 0.7);
    cav = mix(1.0, (0.35 + 0.65 * smoothstep(-0.7, 0.6, hgt)) * (1.0 - 0.55 * jt), bfade * (1.0 - gw));
  }

  /* light: the sun, the sky's dome and what the sea and land throw back;
     the shadow ray is cast only where the light could reach */
  float ndl = dot(n, SUN);
  float sh = ndl > 0.0 || (gw > 0.05 && dot(rd, SUN) > 0.6) ? softShadow(p + n * 0.6, SUN) : 0.0;
  float csh = cloudShade(p);
  float dif = max(ndl, 0.0) * sh * csh;
  float ao = 0.3 + 0.7 * sat(map(p + n * 6.0) / 6.0);
  vec3 amb = ambient(n);
  amb += GLOW * 0.5 * NIGHT * sat(dot(normalize(n.xz + 1e-5), normalize(SUN.xz + 1e-5))) * (1.0 - abs(n.y));
  /* by night the eye opens: the moon's light and the sky's are given a
     little more, so the stone still reads */
  float moonlit = 1.0 + 2.5 * NIGHT;
  vec3 col = alb * cav * (SUNC * dif * moonlit + amb * ao * (1.0 + 2.5 * NIGHT) + BNC * sat(-n.y + 0.3) * ao * (1.0 + 3.0 * NIGHT));
  /* grass lit from behind glows a little */
  col += alb * SUNC * gw * 0.5 * pow(sat(dot(rd, SUN)), 4.0) * sh * csh;
  return col;
}

/* ------------------------------------------------------- the lighthouse */

/* Stevenson's tower: a white shaft, its head corbelled out in ochre
   under the gallery, the lantern's glazing dark between its bars and its
   dome black. Its silhouette is found from the ray's nearest pass to the
   axis, so it is cheap and its edges are soft */
float tower(vec3 ro, vec3 rd, float pa, vec3 base, out vec3 col, out float tl) {
  col = vec3(0.0);
  tl = 1e9;
  vec2 d2 = rd.xz;
  float dd = dot(d2, d2);
  float tc = dot(base.xz - ro.xz, d2) / dd;
  if (tc < 0.0) return 0.0;
  vec2 cp = ro.xz + d2 * tc - base.xz;
  float m = length(cp);
  float y = ro.y + rd.y * tc - base.y;
  float fp = tc * pa;
  float r = 0.0;
  int part = 0;
  if (y < 13.6) r = mix(2.25, 1.85, sat(y / 13.6));
  else if (y < 15.3) { r = mix(1.85, 2.35, smoothstep(13.6, 15.0, y)); part = 1; }
  else if (y < 16.2) { r = 2.4; part = 2; }
  else if (y < 18.3) { r = 1.5; part = 3; }
  else if (y < 19.4) { r = 1.55 * sqrt(max(1.0 - (y - 18.3) / 1.1, 0.0)) + 0.15; part = 4; }
  else if (y < 19.9) { r = 0.3; part = 4; }
  float cov = sat((r - m) / fp + 0.5) * sat((19.9 - y) / fp + 0.5) * sat((y + 1.0) / fp);
  if (cov <= 0.0) return 0.0;
  float ins = sqrt(max(r * r - m * m, 0.0));
  vec2 off = cp - normalize(d2) * ins;
  vec3 n = normalize(vec3(off.x, 0.08, off.y));
  tl = tc - ins / sqrt(dd);
  vec3 alb = vec3(0.78, 0.77, 0.74);
  if (part == 1) alb = vec3(0.6, 0.42, 0.2);
  if (part == 2) alb = vec3(0.05, 0.05, 0.05);
  if (part == 3) alb = vec3(0.03, 0.035, 0.04);
  if (part == 4) alb = vec3(0.025);
  /* a plinth of ochre at the foot, and the small windows up the shaft */
  if (part == 0) {
    alb = mix(alb, vec3(0.6, 0.42, 0.2), 1.0 - smoothstep(0.5, 0.5 + fp, y));
    float wy = fract(y / 4.4 + 0.3);
    float ang = atan(off.y, off.x);
    float wx = fract(ang / TAU * 3.0 + 0.2);
    alb = mix(alb, vec3(0.05), step(abs(wy - 0.5), 0.12) * step(abs(wx - 0.5), 0.05) * step(2.0, y) * sat(1.0 - fp));
  }
  float dif = max(dot(n, SUN), 0.0) * cloudShade(base);
  vec3 amb = ambient(n);
  col = alb * (SUNC * dif * (1.0 + 1.5 * NIGHT) + amb * (1.0 + 1.5 * NIGHT));
  /* glass catches the sky; the lantern glows when the light is lit */
  if (part == 3) col += 0.12 * sky(reflect(rd, n)) + LAMP * vec3(2.4, 1.9, 1.2);
  return cov;
}

/* the station's other buildings and walls, as boxes in the peninsula's
   frame: (u, v) centre, half extents, height */
float boxHit(vec3 ro, vec3 rd, vec3 c, vec3 hb, out vec3 nrm) {
  vec3 o = ro - c;
  vec3 m = 1.0 / rd;
  vec3 k = abs(m) * hb;
  vec3 t1 = -m * o - k, t2 = -m * o + k;
  float tn = max(max(t1.x, t1.y), t1.z), tf = min(min(t2.x, t2.y), t2.z);
  if (tn > tf || tf < 0.0 || tn < 0.0) return -1.0;
  nrm = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
  return tn;
}

/* the keepers' houses: single storey, flat roofs behind a parapet, white
   harl with ochre dressings round the windows, at the corners and along
   the cornice, and ochre chimney stacks; the compound's white wall about
   them, and the long wall that runs back along the path */
vec4 station(vec3 ro, vec3 rd, float base, float fpx) {
  vec2 o2 = toPen(ro.xz), d2 = toPen(rd.xz);
  vec3 o = vec3(o2.x, ro.y - base, o2.y), d = vec3(d2.x, rd.y, d2.y);
  float best = 1e9;
  vec3 nb = vec3(0.0), hp = vec3(0.0);
  int kind = 0;
  vec3 nn;
  for (int i = 0; i < 11; i++) {
    vec3 c, hb;
    int kd = 1;
    if (i == 0) { c = vec3(25.0, 2.8, 12.0); hb = vec3(19.0, 2.8, 4.6); }
    else if (i == 1) { c = vec3(6.5, 2.0, 17.0); hb = vec3(4.2, 2.0, 3.2); }
    else if (i == 2) { c = vec3(33.0, 2.5, 22.0); hb = vec3(6.5, 2.5, 5.0); }
    else if (i == 3) { c = vec3(16.0, 6.3, 12.3); hb = vec3(0.45, 0.8, 0.9); kd = 2; }
    else if (i == 4) { c = vec3(30.0, 6.3, 12.3); hb = vec3(0.45, 0.8, 0.9); kd = 2; }
    else if (i == 5) { c = vec3(42.0, 6.3, 11.0); hb = vec3(0.45, 0.8, 0.9); kd = 2; }
    else if (i == 6) { c = vec3(23.0, 1.0, 30.0); hb = vec3(29.0, 1.0, 0.45); kd = 3; }
    else if (i == 7) { c = vec3(23.0, 1.0, -1.5); hb = vec3(29.0, 1.0, 0.45); kd = 3; }
    else if (i == 8) { c = vec3(52.0, 1.0, 14.0); hb = vec3(0.45, 1.0, 16.0); kd = 3; }
    else if (i == 9) { c = vec3(130.0, 0.9, 4.0); hb = vec3(78.0, 0.9, 0.45); kd = 3; }
    else { c = vec3(95.0, 1.4, 14.0); hb = vec3(3.0, 1.4, 2.2); }
    float t = boxHit(o, d, c, hb, nn);
    if (t > 0.0 && t < best) { best = t; nb = nn; kind = kd; hp = o + d * t - c + vec3(0.0, hb.y, 0.0); }
  }
  if (best > 1e8) return vec4(0.0, 0.0, 0.0, -1.0);
  vec3 alb = vec3(0.74, 0.73, 0.7);
  if (kind == 1) {
    if (nb.y > 0.5) alb = vec3(0.09, 0.09, 0.1);
    else {
      float hx = abs(nb.x) > 0.5 ? hp.z : hp.x;
      float y = hp.y;
      /* the windows, every four metres, with their ochre surrounds */
      float wx = fract(hx / 3.8 + 0.5) - 0.5;
      float yy = y;
      float win = step(abs(wx), 0.13) * step(abs(yy - 2.5), 0.75);
      float sur = step(abs(wx), 0.19) * step(abs(yy - 2.5), 0.95);
      float cor = step(yy, 0.35) + step(4.9, yy);
      alb = mix(alb, vec3(0.6, 0.42, 0.2), sat(sur + cor) * sat(1.6 - fpx * 0.5));
      alb = mix(alb, vec3(0.05, 0.05, 0.06), win * sat(1.6 - fpx * 0.5));
      alb = mix(alb, vec3(0.5, 0.4, 0.25), sat(fpx * 0.5 - 0.6) * 0.25);
    }
  }
  if (kind == 2) alb = vec3(0.6, 0.42, 0.2);
  if (kind == 3 && nb.y > 0.5) alb = vec3(0.55, 0.54, 0.5);
  vec3 nw = vec3(fromPen(nb.xz).x, nb.y, fromPen(nb.xz).y);
  float dif = max(dot(nw, SUN), 0.0) * cloudShade(ro + rd * best);
  vec3 col = alb * (SUNC * dif * (1.0 + 1.5 * NIGHT) + ambient(nw) * (1.0 + 1.5 * NIGHT));
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
    vec3 b = normalize(vec3(cos(a), -0.012, sin(a)));
    float bd = dot(rd, b), ew = dot(b, w0);
    float den = max(1.0 - bd * bd, 1e-5);
    float sr = (bd * ew - dw) / den;
    float ub = ew + sr * bd;
    float dm = length(w0 + rd * sr - b * ub);
    float w = 0.6 + 0.022 * max(ub, 0.0);
    float sg = max(sqrt(den), 0.1);
    float I = 1.772 * w * exp(-dm * dm / (w * w)) / (sg * (ub * ub + 400.0));
    I *= smoothstep(0.0, 30.0, ub) * smoothstep(80.0, 400.0, sr) * smoothstep(-80.0, 0.0, tEnd - sr);
    float ph = hg(dot(b, -rd), 0.4) + 0.04;
    c += I * ph * exp(-sr / 9000.0);
  }
  return c * vec3(1.0, 0.88, 0.68) * 0.9e7 * HAZE;
}

vec3 lampGlow(vec3 ro, vec3 rd, float tEnd, vec3 L, float pa) {
  vec3 tl = L - ro;
  float dl = length(tl);
  tl /= dl;
  float a0 = TAU * fract(uTime / 10.0) + 2.2;
  float face = 0.0;
  for (int k = 0; k < 2; k++) {
    float a = a0 + float(k) * PI;
    vec3 b = normalize(vec3(cos(a), -0.012, sin(a)));
    float ang = acos(clamp(dot(b, -tl), -1.0, 1.0));
    face = max(face, exp(-ang * ang / 0.0035));
  }
  float s0 = dot(L - ro, rd);
  float hh = max(length(cross(rd, L - ro)), 0.4);
  float halo = (atan((tEnd - s0) / hh) + atan(s0 / hh)) / hh;
  float sn = length(cross(rd, tl));
  float vis = smoothstep(-5.0, 5.0, tEnd - dl);
  vec3 c = vec3(1.0, 0.86, 0.62) * (halo * 2500.0 * HAZE * (0.25 + 2.5 * face));
  c += vec3(1.0, 0.9, 0.75) * vis * (exp(-sn * sn / (pa * pa * 2.2)) * (3.0 + 60.0 * face) + 2.0e-6 * face / (sn * sn + 4e-6));
  return c;
}

/* ------------------------------------------------------------ the eye */

vec3 scene(vec2 fc) {
  setup();
  float asp = uRes.x / uRes.y;
  float wide = smoothstep(0.75, 1.5, asp);
  float k = mix(2.0 * tan(radians(26.0)), max(2.0 * tan(radians(18.0)) / asp, 0.37), wide);
  float yaw = radians(mix(227.5, 226.3, wide) + uPoint.x * 0.6);
  float hz = mix(0.22, 0.17, wide);
  float pitch = -atan((0.5 - hz) * k) + radians(uPoint.y * 0.4);
  vec3 fw = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 rt = normalize(vec3(fw.z, 0.0, -fw.x));
  vec3 up = cross(fw, rt);
  vec2 uv = (fc - 0.5 * uRes) / uRes.y;
  vec3 rd = normalize(fw + k * (uv.x * rt + uv.y * up));
  float pa = k / uRes.y;

  vec2 eq = EYEQ + uPoint.x * vec2(-1.5, 3.0);
  vec3 ro = vec3(fromPen(eq).x, 0.0, fromPen(eq).y);
  float s0;
  float de = mainD(eq, s0);
  ro.y = mainTop(eq, -de) - 3.0 * exp(de / 5.0) + 1.7 + uPoint.y * 0.8;

  float tSea = rd.y < 0.0 ? ro.y / -rd.y : 1e9;
  float tMax = min(tSea, 4000.0);
  bool hit = false;
  float t = tMax;
  if (rd.y < 0.0) t = march(ro, rd, tMax, pa, hit);

  vec3 col;
  float tEnd;
  if (hit) {
    col = aerial(shadeLand(ro, rd, t, pa), ro, rd, t);
    tEnd = t;
  } else if (rd.y < 0.0 && tSea < 33000.0) {
    col = aerial(shadeSea(ro, rd, tSea, pa), ro, rd, tSea);
    tEnd = tSea;
  } else {
    col = sky(rd);
    col += sunDisc(rd, pa);
    col += (moonDisc(rd, pa) + stars(rd, pa) * (1.0 - smoothstep(0.0, 0.03, dot(rd, MOON) - 0.99))) * NIGHT;
    vec4 cl = clouds(ro, rd);
    col = mix(col, cl.rgb, cl.a);
    tEnd = 1e6;
    /* the hills of the Outer Hebrides, standing on the horizon */
    float b = degrees(atan(rd.x, rd.z));
    b += b < 0.0 ? 360.0 : 0.0;
    float hh = hebrides(b);
    float ic = sat((hh - rd.y) / pa + 0.5);
    if (ic > 0.0) {
      vec3 icol = vec3(0.025, 0.032, 0.03) * (SUNC * 0.15 + SKYI);
      col = mix(col, aerial(icol, ro, rd, 33000.0), ic);
    }
  }

  /* the station on the tip, looked for only by rays that pass near it */
  vec2 lq = LHQ;
  float base = platTop(lq) - 0.3;
  vec2 lw = fromPen(lq);
  vec2 tw = lw - ro.xz;
  float near = length(tw - rd.xz * max(dot(tw, rd.xz) / dot(rd.xz, rd.xz), 0.0));
  if (near < 220.0) {
    float fpx = length(tw) * pa;
    vec4 st = station(ro, rd, base, fpx);
    if (st.w > 0.0 && st.w < tEnd) {
      col = aerial(st.rgb, ro, rd, st.w);
      tEnd = st.w;
    }
    vec3 lc;
    float tl;
    float cov = tower(ro, rd, pa, vec3(lw.x, base, lw.y), lc, tl);
    if (cov > 0.0 && tl < tEnd + 3.0) {
      col = mix(col, aerial(lc, ro, rd, tl), cov);
      tEnd = min(tEnd, tl);
    }
  }

  if (LAMP > 0.001) {
    vec3 L = vec3(lw.x, base + 17.3, lw.y);
    col += LAMP * (beams(ro, rd, tEnd, L) * uLook.z + lampGlow(ro, rd, tEnd, L, pa));
  }
  return col;
}
`
};
