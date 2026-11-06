/* scenes/headland.js · Neist Point

   The view everyone takes at Neist Point, the westernmost point of Skye:
   from the cliff top north of the path, some 85 m over the sea, looking
   south-west across a bay to the peninsula of An t-Aigeach. The
   peninsula is a ridge of stacked lava flows, the trap of the Skye lava
   field: its north side falls sheer into the bay as a dark face of
   columnar basalt, worn into buttresses between gullies, streaked green
   with moss and pale below the birds' ledges, with a beach of fallen
   blocks at its foot; its top is grass that tilts away to the south. It
   rises west to its highest point, the prow, where it drops to a lower
   and flatter platform of the same flows, stepped in terraces, out to
   the bare tip. Beyond is the Little Minch, and some thirty kilometres
   off, low on the horizon, the hills of South Uist.

   The sea is a plane given long trains of Atlantic swell and a wind sea
   over them, each fading as it shrinks under a pixel and handing its
   slope to the glints. The bay reflects the faces about it. White water
   works at the foot of the cliffs and round the fallen blocks. The sky
   holds a broken sheet of stratocumulus, lit through from its sunward
   side, and its shadows drift over the land and the sea.

   By day the Atlantic light comes from high in the south-west: the
   grass is bright, the north face stands in its own shade, and the sea
   is blue and glinting. At dusk the sun is setting into the sea just
   right of the tip, with its path of light on the water; the faces are
   dark against it with the light raking their western edges, and the
   sky is warm. At night the moon hangs low over the Minch with its path
   below it, the stars are out, and the cliffs are dark with the moon
   finding their edges.

   The land is traced once for each look, with what the sea needs of it;
   each frame draws the sea, its glitter and white water, and the clouds
   and their shadows.
   WebGL2, no libraries, no build step. */

window.PLACE = {
  id: 'headland',
  theme: { day: '#c3ceda', dusk: '#ead6b9', night: '#2f384d' },
  t0: 12,
  /* the lens: focused on the prow; the low sun and its path on the sea
     bloom freely */
  camera: {
    expo: [1.0, 1.0, 1.08],
    bloom: [0.045, 0.13, 0.11],
    thresh: 0.85,
    sat: [0.9, 0.9, 0.74],
    lift: [0.003, 0.004, 0.0015],
    vig: [0.16, 0.2, 0.22],
    grain: 0.022,
    blur: 0.016
  },
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
/* the tip, near its north edge */
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
float HAZE, NIGHT, DIP;

vec3 L3(vec3 d, vec3 u, vec3 n) { return d * W3.x + u * W3.y + n * W3.z; }

/* the frame. Every frame is the wide one's picture, as the meadow's are.
   A frame of three to two or wider looks as it always has. One narrower,
   down to seven to ten, sees exactly as wide as a three to two frame:
   its lens widens and the camera tips down just enough to hold the
   horizon at the same height on the screen, so the extra view opens
   down onto the sea and the foot of the cliffs. Narrower still the lens
   widens no further, and the frame is a crop of that one, turned toward
   the tip so it keeps its place. The low sun and the moon are
   moved with it, to stand where the wide frame shows them. */
const float TV15 = 0.21661;       /* a 3:2 frame's half-height, as a tangent */
const float HOFF = 0.72;          /* the horizon over the middle, in half-heights */
const float YAW0 = 226.3;         /* the wide frame's bearing */
float FTV, FTW, FYAW, FPITCH;
void frameFor(float asp) {
  float t1 = 1.5 * TV15;
  FTV = asp >= 1.5 ? max(tan(radians(18.0)) / asp, 0.185) : t1 / max(asp, 0.7);
  FTW = FTV * asp;
  FPITCH = -atan(HOFF * FTV);
  FYAW = YAW0;
  if (asp < 0.7) {
    vec2 e = fromPen(EYEQ), l = fromPen(LHQ);
    float subj = degrees(atan(l.x - e.x, l.y - e.y));
    FYAW = subj - degrees(atan(tan(radians(subj - YAW0)) / t1 * FTW));
  }
}
/* a light the wide frame shows at bearing b and elevation e, set where a
   narrower frame shows it at the same place on its screen */
vec3 aimed(float b, float e) {
  float t1 = 1.5 * TV15, p15 = -atan(HOFF * TV15);
  if (FTV <= TV15 + 1e-4) return dirBE(b, e);
  float bb = FYAW + degrees(atan(tan(radians(b - YAW0)) / t1 * min(FTW, t1)));
  float ee = degrees(FPITCH + atan(tan(radians(e) - p15) / TV15 * FTV));
  return dirBE(bb, ee);
}

void setup() {
  DIP = max(0.0, 1.0 - 3.8 * (uLook.x + uLook.y) * uLook.z);
  W3 = vec3(uLook.xy * DIP, uLook.z);
  vec3 dSun = dirBE(196.0, 36.0), uSun = aimed(238.5, 1.7);
  MOON = aimed(238.0, 2.3);
  SUN = normalize(dSun * uLook.x + uSun * uLook.y + MOON * uLook.z);
  SUND = normalize(dSun * uLook.x + uSun * (uLook.y + uLook.z));
  SUNC = L3(vec3(3.2, 3.0, 2.75), vec3(3.0, 1.45, 0.5), vec3(0.17, 0.2, 0.27));
  /* the sea's glitter takes the sun and the moon each from its own place,
     so a turn between them never lays a path where neither stands */
  SUNS = normalize(dSun * uLook.x + uSun * uLook.y + vec3(0.0, 1e-4, 0.0));
  SUNSC = L3(vec3(3.2, 3.0, 2.75), vec3(3.0, 1.45, 0.5), vec3(0.0));
  MOONC = vec3(0.17, 0.2, 0.27) * uLook.z;
  ZEN = L3(vec3(0.10, 0.20, 0.46), vec3(0.075, 0.08, 0.16), vec3(0.004, 0.0075, 0.02));
  HOR = L3(vec3(0.50, 0.58, 0.70), vec3(0.98, 0.43, 0.16), vec3(0.02, 0.03, 0.055));
  HORA = L3(vec3(0.42, 0.53, 0.70), vec3(0.34, 0.22, 0.25), vec3(0.015, 0.023, 0.045));
  GLOW = L3(vec3(0.5, 0.45, 0.35), vec3(2.0, 0.74, 0.19), vec3(0.06, 0.065, 0.075));
  AMBU = L3(vec3(0.20, 0.27, 0.40), vec3(0.09, 0.09, 0.16), vec3(0.007, 0.010, 0.020));
  AMBH = L3(vec3(0.3, 0.31, 0.33), vec3(0.14, 0.10, 0.12), vec3(0.006, 0.008, 0.013));
  SKYI = L3(vec3(0.46, 0.52, 0.62), vec3(0.2, 0.16, 0.22), vec3(0.02, 0.028, 0.05));
  GNDI = L3(vec3(0.06, 0.07, 0.065), vec3(0.045, 0.032, 0.03), vec3(0.002, 0.003, 0.004));
  BNC = L3(vec3(0.05, 0.06, 0.05), vec3(0.03, 0.02, 0.015), vec3(0.002, 0.003, 0.004));
  CLC = L3(vec3(2.9, 2.85, 2.75), vec3(3.0, 1.35, 0.6), vec3(0.15, 0.18, 0.24));
  DISC = L3(vec3(60.0, 56.0, 50.0), vec3(60.0, 34.0, 12.0), vec3(0.0));
  WATER = look3(vec3(0.02, 0.026, 0.032), vec3(0.008, 0.016, 0.028), vec3(0.008, 0.024, 0.038));
  HAZE = look3(1.0 / 16000.0, 1.0 / 14000.0, 1.0 / 12000.0);
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
  float pl = 33.0 + 9.0 * sin(u * 0.052 + 0.9) + 3.0 * sin(u * 0.13 + 2.0) - 8.0 * exp(-sq((u - 300.0) / 22.0));
  float rg = 56.0 + 0.03 * (u - 360.0) + 12.0 * exp(-sq((u - 390.0) / 30.0)) + 17.0 * exp(-sq((u - 468.0) / 28.0)) + 26.0 * exp(-sq((u - 565.0) / 42.0)) + 2.0 * sin(u * 0.11);
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
float RSC = 1.0;
float ridgeTop(vec2 q) {
  float crest = 78.0 - 22.0 * (1.0 - exp(-pow(max(q.x - 362.0, 0.0) / 62.0, 1.5))) - 12.0 * smoothstep(480.0, 980.0, q.x) + 1.0 * sin(q.x * 0.04);
  float vc = edgeN(q.x) - 5.0 - 55.0 * smoothstep(372.0, 520.0, q.x);
  float dv = q.y - vc;
  /* under the crest a band of broken rock, then the slope of grass */
  float hn = 7.0 * smoothstep(1.0, 9.0, dv) * smoothstep(372.0, 420.0, q.x) + 0.26 * dv + 0.0012 * dv * dv;
  float hs = mix(0.42, 0.3, smoothstep(370.0, 480.0, q.x)) * (sqrt(dv * dv + 25.0) - 5.0);
  /* the summit is a point over the arete, falling to the prow's west face */
  float w = 0.006 * max(366.0 - q.x, 0.0) * max(366.0 - q.x, 0.0);
  RSC = 1.0 - 0.25 * smoothstep(14.0, 4.0, abs(dv - 5.0));
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
  float lump = df < 16.0 ? 1.8 * (noise3(p * 0.2) - 0.5) : 0.0;
  float r = 1e4;
  if (dp < 45.0) {
    /* An t-Aigeach: one great face, its flows hardly stepped. Well back
       from any edge only the top matters */
    if (q.x > 330.0) {
      float rt = ridgeTop(q);
      float dw = 358.0 + 4.0 * sin(q.y * 0.05) - q.x;
      float ridge;
      if (max(dp, dw) < -22.0) ridge = (p.y - rt) * RSC;
      else {
        float amt = 0.15 + 0.6 * smoothstep(480.0, 760.0, q.x) * noise(vec2(q.x / 110.0, 2.0));
        float g2 = 1.0 - abs(2.0 * noise(vec2(sp / 19.0, p.y / 160.0 + 5.0)) - 1.0);
        float fo = faceOff(p.y, sp, amt, 0.3) + lip(p.y, rt, sp) + lump + 8.0 * pow(g2, 8.0) - 2.5 * (1.0 - g2 * g2);
        /* the edge breaks raggedly: notches and knobs where the turf gives
           way to the rock */
        float rim = (0.6 + 4.5 * smoothstep(0.4, 0.8, noise(vec2(sp / 7.0, 1.3)) + 0.3 * noise(vec2(sp / 2.2, 4.0)))) * exp(min(dp + fo, 0.0) / 4.0);
        ridge = smax((p.y - rt + rim) * RSC, smax(dp + fo, dw + 0.5 * fo, 3.0), 1.0);
      }
      r = ridge;
    } else r = 352.0 - q.x;
    /* the shoulder under the prow's west face */
    vec2 shq = (q - vec2(340.0, 44.0)) / vec2(17.0, 13.0);
    float dsh = (length(shq) - 1.0) * 13.0;
    if (dsh < 30.0) {
      float sht = 46.0 + 2.0 * noise(q / 9.0);
      r = min(r, smax(p.y - sht + 2.0 * exp(min(dsh, 0.0) / 5.0), dsh + lump + 1.5 * blocks(sp, 2.1, 7.7) + 2.0 * blocks(sp, 6.3, 3.1), 1.0));
    } else r = min(r, dsh - 12.0);
    /* the platform: its upper level, and a lower terrace of the flow
       beneath along its north edge */
    if (q.x < 400.0) {
      float pt = platTop(q);
      float plat;
      if (dp < -22.0) plat = p.y - pt;
      else {
        float th = 17.0 + 4.0 * sin(q.x * 0.027 + 1.0);
        float terr = 11.0 * smoothstep(th - 1.0, th + 1.0, p.y) * smoothstep(0.3, 0.55, noise(vec2(q.x / 45.0, 5.0))) * (1.0 - smoothstep(330.0, 370.0, q.x));
        float fp = faceOff(p.y + 5.0, sp + 300.0, 1.6, 1.0) + terr + lip(p.y, pt, sp) + lump;
        plat = smax(p.y - pt + (0.6 + 4.0 * smoothstep(0.4, 0.8, noise(vec2(sp / 7.0, 2.9)))) * exp(min(dp + fp, 0.0) / 4.0), dp + fp, 1.0);
      }
      r = min(r, smax(plat, q.x - 380.0, 4.0));
    } else r = min(r, q.x - 386.0);
  } else r = dp - 34.0;
  if (dm < 45.0) {
    float mt = mainTop(q, -dm);
    /* the viewpoint's own cliff is never seen face on: a plain face will do */
    float fm = lump + 2.0 * noise(vec2(sm / 9.0, p.y / 12.0));
    r = min(r, smax(p.y - mt + 3.0 * exp(min(dm, 0.0) / 5.0), dm + fm, 1.0));
  } else r = min(r, dm - 34.0);
  /* blocks fallen from the faces, heaped at their foot into a beach of
     boulders, widest in the bay east of the prow */
  if (p.y < 10.0) {
    float sh = 2.0 + 6.0 * noise(vec2((sp + sm) / 45.0, 1.3));
    float bay = 10.0 * smoothstep(350.0, 395.0, q.x) * (1.0 - smoothstep(620.0, 700.0, q.x)) * step(0.0, q.y);
    float ap = df + 6.0 - (1.6 + bay * 0.25) * max(sh - p.y, 0.0) + 2.6 * noise(p.xz * 0.3 + p.y * 0.2) - 1.3 - bay * 0.5;
    if (ap < 3.0) ap += 1.6 * noise(p.xz * 0.9 + p.y * 0.7) - 0.8;
    r = min(r, max(ap, p.y - sh - 1.0));
  }
  return r;
}

/* the march from the eye, and the normal where it meets the land by
   forward differences from the distance it found there: one loop for
   both, so the land is built into the program once for them */
float march(vec3 ro, vec3 rd, float tmax, float pa, out bool hit, out vec3 nrm) {
  /* the march starts beyond the turf at the eye's own feet, so the frame
     looks out over the edge as one leaning out to take it would */
  float t = 14.0, d = 1e4, d0 = 0.0, e = 0.0;
  vec3 p = vec3(0.0);
  int k = -1;
  hit = false;
  nrm = vec3(0.0, 1.0, 0.0);
  for (int i = ZERO; i < 133; i++) {
    vec3 x = ro + rd * t;
    if (k >= 0) { x = p; x[k] += e; }
    float h = map(x);
    if (k >= 0) {
      nrm[k] = h;
      if (++k == 3) break;
      continue;
    }
    d = h;
    if (d < 0.35 * pa * t + 0.01) hit = true;
    else {
      t += d * 0.7;
      if (t > tmax) break;
      if (i < 129) continue;
      /* a ray still close to the land when its steps run out has met it */
      if (d < 1.0 + 0.004 * t) hit = true;
      else break;
    }
    p = ro + rd * t;
    e = max(0.04, t * 0.0009);
    d0 = d;
    nrm = vec3(0.0);
    k = 0;
  }
  if (hit) nrm = normalize(nrm - d0);
  return t;
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
vec3 extinction(vec3 ro, vec3 rd, float t) {
  float H = 700.0;
  float k = rd.y * t / H;
  float od = HAZE * t * exp(-ro.y / H) * (abs(k) > 1e-3 ? (1.0 - exp(-k)) / k : 1.0);
  return exp(-od * vec3(0.85, 0.95, 1.1));
}
vec3 aerial(vec3 col, vec3 ro, vec3 rd, float t) {
  vec3 ext = extinction(ro, rd, t);
  vec3 hd = normalize(vec3(rd.x, max(rd.y, 0.0) * 0.35 + 0.006, rd.z));
  /* the haze scatters the light forward, so it warms toward the sun */
  vec3 ins = sky(hd) + GLOW * hg(dot(rd, SUN), 0.7) * look3(0.12, 0.22, 0.1);
  return col * ext + ins * (1.0 - ext);
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
/* bl blurs them, for the sea's reflection: a rough sea mirrors only
   their broad shapes, their edges smeared */
vec4 clouds(vec3 ro, vec3 rd, float bl) {
  if (rd.y < 0.003) return vec4(0.0);
  float t = (CLH - ro.y) / rd.y;
  vec2 p = ro.xz + rd.xz * t;
  float cv = clCov();
  float n = clN(p, bl > 0.3 ? 2 : 4);
  float d = smoothstep(cv - 0.15 * bl, cv + 0.2 + 0.15 * bl, n);
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

/* the shadows of the clouds overhead, drifting over land and sea in soft
   patches some hundreds of metres across */
float cloudShade(vec3 p) {
  float t = (CLH - p.y) / max(SUN.y, 0.06);
  vec2 q = (p.xz + SUN.xz * t) / 950.0 + vec2(uTime * 0.0042, uTime * 0.0016) + vec2(0.35, 0.8);
  float n = fbm(q, 2);
  return 1.0 - 0.62 * smoothstep(0.5, 0.64, n) * look3(1.0, 0.45, 0.0);
}

vec3 stars(vec3 rd, float pa) {
  float az = atan(rd.x, rd.z), el = asin(sat(rd.y));
  vec3 c = vec3(0.0);
  for (int k = ZERO; k < 2; k++) {
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
  h = max(h, 520.0 * exp(-sq((b - 242.6) / 1.5)));
  h = max(h, 470.0 * exp(-sq((b - 240.6) / 1.1)));
  h = max(h, 330.0 * exp(-sq((b - 245.3) / 1.6)));
  h = max(h, 260.0 * exp(-sq((b - 238.4) / 1.3)));
  h = max(h, 150.0 * smoothstep(233.0, 237.0, b) * (1.0 - smoothstep(249.0, 256.0, b)));
  h = max(h, 60.0 * smoothstep(254.0, 260.0, b) * (1.0 - smoothstep(282.0, 286.0, b)));
  h = max(h, 240.0 * exp(-sq((b - 290.0) / 3.0)) + 90.0 * smoothstep(283.0, 287.0, b) * (1.0 - smoothstep(305.0, 312.0, b)));
  h *= 0.9 + 0.15 * noise(vec2(b * 1.3, 4.0));
  return (h * 0.7 - 30.0) / 33000.0;
}

/* ------------------------------------------------------------- the sea */

/* the slope of the sea and the variance of the slopes too small to draw.
   Five trains of Atlantic swell come in from the west, each a little off
   the others' line and its crests bent, so together they make a
   short-crested sea; over them the wind sea, drifting sheets of noise
   drawn out across the wind. The pixel's footprint on the water is drawn
   out along the line of sight, fa across it and fl along it, so each
   train fades by the footprint along its own line as its waves shrink
   under the pixel, and hands its slope to the glints */
vec2 seaSlope(vec2 p, vec2 vh, float fa, float fl, out float var) {
  vec2 g = vec2(0.0);
  var = 0.0;
  for (int i = ZERO; i < 5; i++) {
    float fi = float(i);
    float lam = 165.0 * pow(0.68, fi);
    float an = 0.42 + (0.18 + 0.1 * fi) * sin(fi * 2.4 + 0.9);
    vec2 dir = vec2(cos(an), sin(an));
    float k = TAU / lam;
    float st = 0.0105 * (0.4 + 1.2 * noise(p / (lam * 2.5) + fi * 3.1));
    float ph = k * dot(dir, p) - sqrt(9.81 * k) * uTime + fi * 1.7 + 2.2 * noise(p / (lam * 3.0) + fi * 5.3);
    float fd = length(vec2(dot(dir, vh) * fl, (dir.x * vh.y - dir.y * vh.x) * fa));
    float fade = sat(1.6 - fd * 8.0 / lam);
    g += dir * (st * cos(ph) * fade);
    var += st * st * 0.5 * (1.0 - fade * fade);
  }
  float fw = mix(fa, fl, 0.5);
  mat2 W = rot(0.5);
  for (int i = ZERO; i < 2; i++) {
    float fi = float(i);
    float lam = 14.0 * pow(0.5, fi);
    float fade = sat(1.5 - fw * 4.0 / lam);
    if (fade <= 0.0) { var += 0.0045; continue; }
    vec2 q = W * p / lam;
    vec3 a = noised(q * vec2(0.55, 1.0) + vec2(-uTime * 1.1 / sqrt(lam), fi * 7.3));
    vec3 b = noised(rot(0.9) * q * vec2(0.6, 1.0) + vec2(uTime * 0.6 / sqrt(lam), fi * 3.1 + 5.0));
    vec2 gg = (a.yz * vec2(0.4, 1.0) + rot(-0.9) * (b.yz * vec2(0.45, 1.0))) * (0.013 + 0.008 * fi);
    g += (gg * W) * fade;
    var += 0.0045 * (1.0 - fade * fade);
  }
  /* and the finest chop, never drawn */
  var += 0.009;
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

/* what the sea needs of the land, traced once for each look: the faces
   a flat sea would mirror (.rgb, and whether there are any), how much of
   the sun the cliffs leave it (.a), and how far it lies from the foot of
   the rock */
vec4 seaBake(vec3 ro, vec3 rd, float t, out float mirror, out float fd) {
  vec3 p = ro + rd * t;
  vec2 q = toPen(p.xz);
  float sp, sm;
  float d = min(penD(q, sp), mainD(q, sm));
  vec3 refl = vec3(0.0);
  mirror = 0.0;
  fd = 120.0;
  /* three questions of the land, in one loop so it is built into the
     program once for them: up to nine steps up the mirrored ray for the
     faces it meets, up to three toward the light for the cliffs' shadow
     on the water, and how far the water lies from the foot of the rock */
  vec3 r = normalize(vec3(rd.x, abs(rd.y) + 0.004, rd.z));
  float rt = 1.0, lt = 1.0;
  int ph = d < 320.0 ? 0 : 1, k = 0;
  for (int i = ZERO; i < 16; i++) {
    if (ph == 1 && !(d < 160.0 && SUN.y > 0.0)) ph = 2;
    if (ph == 2 && d >= 120.0) break;
    vec3 x = ph == 0 ? p + r * rt : ph == 1 ? p + SUN * (10.0 + 45.0 * float(k)) : vec3(p.x, 0.0, p.z);
    if (ph == 0 && x.y > 98.0) { ph = 1; k = 0; continue; }
    if (ph == 1 && x.y > 85.0) { ph = 2; continue; }
    float h = map(x);
    if (ph == 0) {
      if (h < 0.02 * rt + 0.3) { refl = landQuick(x, r) * 0.8; mirror = 1.0; ph = 1; k = 0; continue; }
      rt += max(h * 1.3, 3.0);
      if (rt > 500.0 || ++k >= 9) { ph = 1; k = 0; }
    } else if (ph == 1) {
      lt = min(lt, sat(h / 3.0 + 0.3));
      if (++k >= 3) ph = 2;
    } else {
      fd = h;
      break;
    }
  }
  return vec4(refl, lt);
}

/* the sea each frame: its swell and chop, the sky and the clouds in it
   and the faces about the bay, the glitter, the light from under it, and
   white water working at the foot of the rock */
vec3 shadeSea(vec3 ro, vec3 rd, float t, float pa, vec4 sb, vec2 fc, float fd) {
  vec3 p = ro + rd * t;
  vec2 q = toPen(p.xz);
  float sp, sm;
  float d = min(penD(q, sp), mainD(q, sm));
  float pw = t * pa, fp = pw / max(-rd.y, 0.002);
  vec2 vh = normalize(rd.xz + 1e-6), vx = vec2(-vh.y, vh.x);
  float var;
  vec2 g = seaSlope(p.xz, vh, pw, fp, var);
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
  vec4 cl = clouds(p, r, sat(sig * 6.0 - 0.3));
  refl = mix(refl, cl.rgb, cl.a);
  refl = mix(refl, vec3(luma(refl)), 0.4 * uLook.x);
  /* the faces about the bay stand in its reflection, broken by the swell:
     each facet shows them from a little aside, so their edges waver */
  if (d < 340.0) {
    vec2 off = clamp(vec2(dot(g, vx), dot(g, vh)) * 300.0 / ((t + 150.0) * pa), -24.0, 24.0);
    if (bakeDi(fc + off).y > 2.5) {
      float brk = smoothstep(0.2, 0.8, noise(p.xz * vec2(0.12, 0.6) + g * 40.0));
      refl = mix(refl, bakeC(fc + off).rgb, 0.55 * brk / (1.0 + var * 40.0));
    }
  }
  float csh = cloudShade(p) * sb.a;
  float m2 = 0.003 + 2.0 * var;
  /* the glitter is granular: facets too small to draw catch the light in
     flecks a pixel or two across, measured by the pixel's own footprint
     across and along the line of sight, coming and going; and near at
     hand single facets sparkle as they tilt to the light */
  vec2 gq = vec2(dot(p.xz, vx) / pw, dot(p.xz, vh) / fp) * 0.55;
  float fl = noise3(vec3(gq, uTime * 1.7));
  fl = 0.15 + 2.6 * fl * fl * fl;
  float spot = 0.0;
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

vec3 shadeLand(vec3 ro, vec3 rd, float t, float pa, vec3 n, out vec3 sun) {
  vec3 p = ro + rd * t;
  vec2 q = toPen(p.xz);
  float sp, sm;
  float dp = penD(q, sp), dm = mainD(q, sm);
  float s = dp < dm ? sp : sm + 900.0;
  float top = dp < dm ? (q.x > 358.0 ? max(ridgeTop(q), platTop(q)) : platTop(q)) : mainTop(q, -dm);
  float fp = t * pa;

  /* where the turf holds, and where the rock shows */
  float rg = smoothstep(345.0, 375.0, q.x) * step(dp, dm);
  float gw = smoothstep(0.66 + 0.1 * rg, 0.82 + 0.08 * rg, n.y) * smoothstep(9.0, 14.0, p.y) * smoothstep(0.35, 0.6, noise(vec2(s / 12.0, p.y / 6.0)) + 0.4 * smoothstep(-8.0, -2.0, p.y - top));
  gw = max(gw, smoothstep(-3.0, -0.6, p.y - top) * smoothstep(0.25 + 0.5 * rg, 0.55 + 0.3 * rg, n.y));
  /* outcrops break through the turf on the steeper ground */
  gw *= 1.0 - 0.85 * smoothstep(0.6, 0.78, noise(p.xz / 6.0 + 1.0) + 0.25 * (1.0 - n.y)) * smoothstep(-0.5, -5.0, p.y - top);
  float l = (p.y + 6.0 * noise(vec2(s / 70.0, 1.7)) + 2.5 * sin(s * 0.012 + 0.5)) / 11.0;
  float fi = floor(l), ff = l - fi;
  float colA = mix(1.0, 0.3, rg);
  vec3 rock = vec3(0.0), grass = vec3(0.0);
  /* the beach at the foot is boulders fallen from the faces, each its
     own shade, rounded and tipped its own way, the gaps between them in
     shadow: the nearest one's hash, its centre, and how far inside it
     the point lies */
  float blk = smoothstep(10.0, 5.0, p.y) * smoothstep(-6.0, 2.0, min(dp, dm));
  float bd = blk * sat(2.0 - fp * 2.5), gap = 1.0;
  vec3 bh = vec3(0.5);
  vec2 bt = vec2(0.0);
  if (bd > 0.0) {
    vec2 bc = p.xz / 1.7 + 0.35 * p.y + 0.6 * noise(p.xz / 7.0);
    vec2 ib = floor(bc), fb = bc - ib;
    float d1 = 8.0, d2 = 8.0;
    vec2 r1 = vec2(0.0);
    for (int k = ZERO; k < 9; k++) {
      vec2 o = vec2(float(k % 3) - 1.0, float(k / 3) - 1.0);
      vec2 r = o + 0.15 + 0.7 * hash22(ib + o) - fb;
      float dd = dot(r, r);
      if (dd < d1) { d2 = d1; d1 = dd; r1 = r; bh = hash33(vec3(ib + o, 5.0)); }
      else d2 = min(d2, dd);
    }
    float e = sqrt(d2) - sqrt(d1);
    gap = mix(1.0, 0.3 + 0.7 * smoothstep(0.0, 0.25 + 0.3 * bh.x, e), bd);
    bt = bd * (-r1 * 1.6 + (bh.yz - 0.5) * 0.5);
    bh = mix(vec3(0.5), bh, bd);
  }
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
    /* the buttresses' noses catch more of the sky, the gullies between
       them hold shadow and seep */
    float g2 = 1.0 - abs(2.0 * noise(vec2(s / 19.0, p.y / 160.0 + 5.0)) - 1.0);
    rock *= mix(1.0, (1.25 - 0.3 * g2 * g2) * (1.0 - 0.55 * pow(g2, 6.0)), rg);
    /* the face is broken into small blocks, each a shade apart */
    vec2 bc = floor(vec2(s / 1.5 + 0.6 * vs, p.y / 1.1 + 0.5 * floor(s / 1.5) + 1.3 * vs));
    rock *= mix(1.0, 0.84 + 0.32 * hash12(bc + fi * 7.0), sat(1.5 - fp));
    /* and streaked dark below the seeps */
    rock *= 1.0 - 0.45 * smoothstep(0.66, 0.88, noise(vec2(s / 2.2, p.y / 110.0) + 11.0));
    /* broad tones down the face: dark where it seeps, lighter where dry */
    float zone = noise(vec2(s / 30.0, p.y / 120.0) + 2.0);
    rock *= 0.55 + 0.9 * zone;
    /* moss and lichen, olive and yellow-green, thickest low on the faces
       that stay wet, in long streaks down them */
    float mz = smoothstep(0.3, 0.7, noise(vec2(s / 38.0, p.y / 45.0) + 7.0)) * (1.0 - smoothstep(top - 25.0, top - 5.0, p.y) * 0.6);
    float moss = mz * smoothstep(0.3, 0.65, noise(vec2(s / 3.5, p.y / 22.0) + 3.0));
    rock = mix(rock, mix(vec3(0.07, 0.078, 0.03), vec3(0.11, 0.11, 0.035), vs), moss * 0.9);
    rock *= 1.0 + 0.3 * smoothstep(0.45, 0.8, zone) * (1.0 - moss);
    /* where the birds nest, pale streaks run down from the ledges */
    float colony = smoothstep(0.55, 0.8, noise(vec2(s / 50.0, p.y / 30.0) + 5.0)) * smoothstep(10.0, 22.0, p.y) * (1.0 - smoothstep(top - 12.0, top - 4.0, p.y));
    float streak = smoothstep(0.65, 0.9, noise(vec2(s / 1.1, p.y / 35.0 + 9.0)));
    rock = mix(rock, vec3(0.3, 0.29, 0.27), colony * streak * 0.6);
    /* yellow and grey lichen in the splash zone, a dark wet band below it
       and black weed at the foot */
    float splash = smoothstep(3.0, 6.0, p.y) * (1.0 - smoothstep(9.0, 16.0, p.y));
    rock = mix(rock, vec3(0.2, 0.15, 0.06), splash * 0.5 * smoothstep(0.55, 0.8, vs));
    float wet = 1.0 - smoothstep(1.5, 4.5 + 2.0 * noise(vec2(s / 18.0, 3.0)), p.y);
    rock *= 1.0 - 0.6 * wet;
    /* the fallen blocks are paler, dried and lichened */
    rock = mix(rock, vec3(0.13, 0.12, 0.105) * (0.45 + 0.8 * bh.x) * (0.8 + 0.4 * noise(p.xz * 0.9)) * (1.0 - 0.5 * wet), blk * 0.9);
  }
  if (gw > 0.001) {
    /* grass on the tops and the ledges: bright where it is grazed short,
       olive and browner where it is long or steep, broken by outcrops */
    grass = vec3(0.08, 0.086, 0.036);
    float gn = noise(p.xz / 25.0) * 0.35 + noise(p.xz / 5.0) * 0.4 + noise(p.xz / 1.6) * 0.25;
    grass *= 0.55 + 0.9 * gn;
    grass = mix(grass, vec3(0.11, 0.096, 0.05), 0.65 * smoothstep(0.35, 0.72, noise(p.xz / 45.0 + 3.0)));
    /* rush and long grass in darker patches */
    grass = mix(grass, vec3(0.036, 0.044, 0.022), 0.55 * smoothstep(0.55, 0.8, noise(p.xz / 11.0 + 8.0)));
    grass = mix(grass, vec3(0.1, 0.09, 0.05), smoothstep(0.92, 0.6, n.y) * 0.7);
    /* the platform's turf, flat to the sun, is the same olive and tawny,
       a shade darker so it reads as the ridge's does */
    grass = mix(grass, grass * vec3(0.8, 0.74, 0.8) + vec3(0.012, 0.01, 0.004), step(q.x, 340.0) * step(dp, dm));
    /* sheep tracks across the slopes */
    grass *= 1.0 - 0.12 * smoothstep(0.55, 0.75, noise(vec2(p.y * 1.3, s / 30.0))) * smoothstep(0.95, 0.75, n.y);
  }
  vec3 alb = mix(rock, grass, gw);
  /* the platform's turf is broken everywhere by low outcrops of the flow
     beneath, grey with lichen */
  float oc = smoothstep(0.66, 0.78, noise(p.xz / 9.0 + 7.0)) * gw * step(q.x, 340.0) * step(dp, dm);
  alb = mix(alb, vec3(0.075, 0.072, 0.066) * (0.75 + 0.5 * noise(p.xz * 1.3)), oc * 0.8);

  /* tussocks on the turf, catching and losing the light */
  float tfade = sat(2.0 - fp * 1.2) * gw;
  if (tfade > 0.0) {
    vec2 tg = noised(p.xz / 3.0 + 3.0).yz + 0.5 * noised(p.xz / 1.1).yz;
    n = normalize(n + tfade * 0.12 * vec3(-tg.x, 0.0, -tg.y));
  }

  /* the rock's grain, too fine for the surface itself, laid on its light:
     the columns' faces and the cracks across them */
  float bfade = sat(1.8 - fp * 1.2) * (1.0 - gw * 0.7) * (1.0 - blk);
  float cav = gap;
  if (bfade > 0.0) {
    vec2 bq = vec2(s, p.y);
    vec3 b1 = noised(bq / vec2(4.0, 9.0) + 1.0), b2 = noised(bq / vec2(1.2, 2.6) + 7.0);
    vec2 gg = b1.yz / vec2(4.0, 9.0) * 0.7 + b2.yz / vec2(1.2, 2.6) * 0.32;
    vec3 tq = normalize(vec3(n.z, 0.0, -n.x) + 1e-5);
    vec3 yq = normalize(vec3(0.0, 1.0, 0.0) - n * n.y);
    /* each broken block tilts its own way */
    vec2 bt = hash22(floor(vec2(s / 1.5 + 0.3 * b1.x, p.y / 1.1 + 0.5 * floor(s / 1.5) + 0.6 * b1.x)) + 3.0) - 0.5;
    gg += bt * 0.5 * (1.0 - gw);
    n = normalize(n - bfade * (gg.x * tq + gg.y * yq));
    /* the hollows of the rough rock hold shadow, and the joints between
       the columns run down the face as dark seams */
    float hgt = b1.x * 0.6 + b2.x * 0.4;
    float jx = fract((s + 5.0 * noise(vec2(s / 23.0, fi * colA))) / 2.1);
    float jt = (1.0 - smoothstep(0.0, 0.07 + fp * 0.1, min(jx, 1.0 - jx))) * colA * (1.0 - smoothstep(0.35, 0.5, ff) * 0.7);
    cav *= mix(1.0, (0.35 + 0.65 * smoothstep(-0.7, 0.6, hgt)) * (1.0 - 0.55 * jt), bfade * (1.0 - gw));
  }
  n = normalize(n + vec3(bt.x, 0.0, bt.y));

  /* light: the sun, the sky's dome and what the sea and land throw back;
     the shadow ray is cast only where the light could reach */
  float ndl = dot(n, SUN);
  bool wsh = ndl > 0.0 || (gw > 0.05 && dot(rd, SUN) > 0.6);
  /* how open the ground is six metres out from it, then the march
     toward the light for its shadow: one loop for both, so the land is
     built into the program once for them */
  float ao = 1.0, res = 1.0, st = 1.0;
  vec3 ps = p + n * 0.6;
  for (int i = ZERO; i < 13; i++) {
    vec3 x = i == 0 ? p + n * 6.0 : ps + SUN * st;
    if (i > 0 && (!wsh || x.y > 100.0)) break;
    float h = map(x);
    if (i == 0) { ao = 0.3 + 0.7 * sat(h / 6.0); continue; }
    res = min(res, 8.0 * h / st);
    if (res < 0.01) break;
    st += clamp(h * 1.3, 2.5, 110.0);
    if (st > 1600.0) break;
  }
  float sh = wsh ? smoothstep(0.0, 1.0, res) : 0.0;
  float dif = max(ndl, 0.0) * sh;
  vec3 amb = ambient(n);
  amb += GLOW * 0.5 * NIGHT * sat(dot(normalize(n.xz + 1e-5), normalize(SUN.xz + 1e-5))) * (1.0 - abs(n.y));
  /* by night the eye opens: the moon's light and the sky's are given a
     little more, so the stone still reads */
  float moonlit = 1.0 + 2.5 * NIGHT;
  /* what the sun gives, which the clouds' shadows take away as they pass */
  sun = alb * cav * SUNC * dif * moonlit;
  /* grass lit from behind glows a little */
  sun += alb * SUNC * gw * 0.5 * pow(sat(dot(rd, SUN)), 4.0) * sh;
  vec3 col = sun + alb * cav * (amb * ao * (1.0 + 2.5 * NIGHT) + BNC * sat(-n.y + 0.3) * ao * (1.0 + 3.0 * NIGHT));
  /* at dusk the light just grazing a face warms it a little */
  col += alb * SUNC * uLook.y * 0.35 * (sat((ndl + 0.3) / 1.3) - max(ndl, 0.0));
  return col;
}

/* ------------------------------------------------------------ the eye */

/* the camera on the cliff top */
vec3 cam(vec2 fc, out vec3 ro, out float pa) {
  frameFor(RES.x / RES.y);
  float k = 2.0 * FTV;
  float yaw = radians(FYAW);
  float pitch = FPITCH;
  vec3 fw = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 rt = normalize(vec3(fw.z, 0.0, -fw.x));
  vec3 up = cross(fw, rt);
  vec2 uv = (fc - 0.5 * RES) / RES.y;
  pa = k / RES.y;
  vec2 eq = EYEQ;
  ro = vec3(fromPen(eq).x, 0.0, fromPen(eq).y);
  float s0;
  float de = mainD(eq, s0);
  ro.y = mainTop(eq, -de) - 3.0 * exp(de / 5.0) + 1.7;
  return normalize(fw + k * (uv.x * rt + uv.y * up));
}

/* one look's trace. The land's light, and in .a the share of it the
   clouds' shadows take; for the sea, the faces it mirrors and the cliffs'
   shadow on it; for the sky, its light without the clouds. D: how far the
   ray went, what it met (0 sky, 1 land, 2 sea, 3 sea mirroring the
   land), and how far the sea lies from the rock, or how much of the sky
   the Hebrides cover */
void bake(vec2 fc, out vec4 C, out vec4 D) {
  vec3 ro;
  float pa;
  vec3 rd = cam(fc, ro, pa);
  setup();
  float tSea = rd.y < 0.0 ? ro.y / -rd.y : 1e9;
  float tMax = min(tSea, 4000.0);
  bool hit = false;
  float t = tMax;
  vec3 n0 = vec3(0.0, 1.0, 0.0);
  if (rd.y < 0.0) t = march(ro, rd, tMax, pa, hit, n0);
  if (hit) {
    vec3 sun;
    vec3 col = shadeLand(ro, rd, t, pa, n0, sun);
    vec3 a = aerial(col, ro, rd, t);
    C = vec4(a, sat(luma(sun * extinction(ro, rd, t)) / max(luma(a), 1e-6)));
    D = vec4(t, 1.0, 0.0, 0.0);
  } else if (rd.y < 0.0 && tSea < 33000.0) {
    float mirror, fd;
    C = seaBake(ro, rd, tSea, mirror, fd);
    D = vec4(tSea, 2.0 + mirror, fd, 0.0);
  } else {
    vec3 col = sky(rd);
    /* a halo in layers close about the light, as a lens and damp air give
       it: wide and soft, then tighter, then the aureole at the disc */
    float hs = max(dot(rd, SUN), 0.0), h2 = hs * hs, h4 = h2 * h2, h16 = h4 * h4 * h4 * h4;
    col += GLOW * (0.03 * h2 * hs + 0.12 * h16 * h4 + look3(0.6, 0.9, 0.4) * pow(hs, 320.0));
    col += sunDisc(rd, pa);
    col += moonDisc(rd, pa) * NIGHT;
    /* the hills of the Outer Hebrides, standing on the horizon */
    float b = degrees(atan(rd.x, rd.z));
    b += b < 0.0 ? 360.0 : 0.0;
    float hh = hebrides(b);
    float ic = sat((hh - rd.y) / pa + 0.5);
    C = vec4(col, 0.0);
    D = vec4(1e6, 0.0, ic, 0.0);
  }
}

/* each frame: the sea, the clouds and their shadows, and the stars */
vec3 frame(vec2 fc) {
  vec3 ro;
  float pa;
  vec3 rd = cam(fc, ro, pa);
  setup();
  vec4 c = bakeC(fc);
  vec4 d = bakeDi(fc);
  vec3 col;
  float tEnd = d.x;
  if (d.y > 1.5) {
    col = aerial(shadeSea(ro, rd, d.x, pa, c, fc, d.z), ro, rd, d.x);
  } else if (d.y > 0.5) {
    float csh = cloudShade(ro + rd * d.x);
    col = c.rgb * (1.0 - c.a * (1.0 - csh));
  } else {
    col = c.rgb;
    if (NIGHT > 0.0) col += stars(rd, pa) * (1.0 - smoothstep(0.0, 0.03, dot(rd, MOON) - 0.99)) * NIGHT;
    vec4 cl = clouds(ro, rd, 0.0);
    col = mix(col, cl.rgb, cl.a);
    if (d.z > 0.0) {
      vec3 icol = vec3(0.025, 0.032, 0.03) * (SUNC * 0.15 + SKYI);
      col = mix(col, aerial(icol, ro, rd, 33000.0), d.z);
    }
    tEnd = 1e6;
  }
  /* the lens is focused on the prow */
  gFocus = 470.0;
  gAperture = 7.0e-5;
  gDepth = min(tEnd, 1e6);
  return col;
}
`
};
