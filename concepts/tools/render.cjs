/* Render concept scenes headlessly: the hero as a visitor sees it (the
   picture with the name over it), and, with --stills, the bare picture of
   each look written to concepts/stills/ as the page's poster and the
   gallery's image.

   Chromium draws WebGL in software here when there is no GPU, so each
   frame is drawn once, in strips, with the clock held (?still).

   node concepts/tools/render.cjs [scene ...] [--looks day,dusk,night]
        [--sizes wide,tall,ultra] [--out DIR] [--t SECONDS] [--stills]
        [--moon PHASE] [--mix D,U,N] [--q QUERY]

   --mix holds the look weights between day, dusk and night, as a turn
   passes through them; the shot is named for the weights. --q adds to
   the page's query (flat: the picture without the camera's buffers).

   Scenes default to every one in concepts/list.js. Shots go to
   concepts/.renders/ unless --out says otherwise. */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..', '..');
const SIZES = {
  wide: { w: 1600, h: 900, scale: 1 },
  tall: { w: 430, h: 932, scale: 2 },
  ultra: { w: 2400, h: 1000, scale: 1 },
};
const STILL_KIND = { wide: 'wide', ultra: 'wide', tall: 'tall' };

function args() {
  const a = process.argv.slice(2), o = { scenes: [], looks: ['day', 'dusk', 'night'], sizes: ['wide', 'tall'], out: path.join(REPO, 'concepts', '.renders'), t: null, stills: false, moon: null, mix: null, q: null };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--looks') o.looks = a[++i].split(',');
    else if (k === '--sizes') o.sizes = a[++i].split(',');
    else if (k === '--out') o.out = path.resolve(a[++i]);
    else if (k === '--t') o.t = a[++i];
    else if (k === '--moon') o.moon = a[++i];
    else if (k === '--mix') o.mix = a[++i];
    else if (k === '--q') o.q = a[++i];
    else if (k === '--stills') o.stills = true;
    else o.scenes.push(k);
  }
  if (!o.scenes.length) {
    const src = fs.readFileSync(path.join(REPO, 'concepts', 'list.js'), 'utf8');
    const box = { window: {} };
    new Function('window', src)(box.window);
    o.scenes = box.window.CONCEPT_LIST.map((c) => c.id);
  }
  return o;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(REPO, p);
    if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function main() {
  const o = args();
  fs.mkdirSync(o.out, { recursive: true });
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'],
  });
  let failed = 0;
  for (const id of o.scenes) {
    for (const size of o.sizes) {
      const S = SIZES[size];
      if (!S) throw new Error('unknown size ' + size);
      const page = await browser.newPage({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      for (const look of o.looks) {
        const t0 = Date.now();
        let url = `${base}/concepts/view.html?scene=${id}&look=${look}&still&scale=${S.scale}`;
        if (o.t !== null) url += '&t=' + o.t;
        if (o.moon !== null) url += '&moon=' + o.moon;
        if (o.mix !== null) url += '&mix=' + o.mix;
        if (o.q !== null) url += '&' + o.q;
        await page.goto(url);
        let state;
        try {
          await page.waitForFunction(() => window.__still === 'done' || window.__stillError || document.documentElement.classList.contains('still'), null, { timeout: 15 * 60 * 1000, polling: 250 });
          state = await page.evaluate(() => window.__stillError || (window.__still === 'done' ? 'ok' : 'no webgl'));
        } catch (err) {
          state = 'timed out';
        }
        if (state !== 'ok') {
          failed++;
          console.log(`FAIL ${id} ${look} ${size}: ${state}\n${errors.join('\n')}`);
          continue;
        }
        const shot = path.join(o.out, `${id}-${o.mix ? 'mix' + o.mix.replace(/,/g, '-') : look}-${size}.png`);
        await page.locator('.letterhead').screenshot({ path: shot });
        let note = '';
        if (o.stills && !o.mix) {
          const data = await page.evaluate(() => document.getElementById('sky').toDataURL('image/webp', 0.82));
          const still = path.join(REPO, 'concepts', 'stills', `${id}-${look}-${STILL_KIND[size]}.webp`);
          fs.writeFileSync(still, Buffer.from(data.split(',')[1], 'base64'));
          note = `, still ${Math.round(fs.statSync(still).size / 1024)} KB`;
        }
        console.log(`${id} ${look} ${size}: ${path.relative(process.cwd(), shot)} (${((Date.now() - t0) / 1000).toFixed(1)} s${note})`);
        if (errors.length) console.log('  console: ' + errors.join('\n  console: '));
        errors.length = 0;
      }
      await page.close();
    }
  }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
