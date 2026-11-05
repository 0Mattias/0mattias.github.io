/* The gallery: a frame pair for every concept and the meadow after them,
   all turned to the look chosen at the top, which a live page then opens
   in. 1, 2 and 3 choose the look here too. */

(function () {
  var root = document.documentElement;
  var list = window.CONCEPT_LIST || [];
  var cur = window.CONCEPT_CURRENT;
  var box = document.getElementById('concepts');
  var picks = Array.prototype.slice.call(document.querySelectorAll('.pick button'));
  var LOOKS = ['day', 'dusk', 'night'];
  if (!box) return;

  var look = null;
  try { look = sessionStorage.getItem('look'); } catch (err) {}
  if (LOOKS.indexOf(look) < 0) look = matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function src(c, kind, l) {
    if (c.stills) return c.stills.replace('{look}', l).replace('-wide', kind === 'tall' ? '-tall' : '-wide');
    return 'stills/' + c.id + '-' + l + '-' + kind + '.webp';
  }

  function live(c, l) {
    return c.live ? c.live.replace('{look}', l) : 'view.html?scene=' + c.id + '&look=' + l;
  }

  var frames = [];

  function frame(c, kind) {
    var a = el('a', 'frame ' + kind);
    if (/^https?:/.test(live(c, look))) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    var img = el('img');
    img.alt = c.title + ', ' + look + (kind === 'tall' ? ', on a phone' : '');
    img.decoding = 'async';
    img.loading = 'lazy';
    if (c.id === 'meadow' && kind === 'tall') img.style.objectPosition = '83.5% 66.2%';
    img.src = src(c, kind, look);
    a.appendChild(img);
    var over = el('span', 'over');
    over.setAttribute('aria-hidden', 'true');
    over.appendChild(el('b', '', 'Mattias Rask'));
    over.appendChild(el('span', '', 'security tools · AI agents · low-level systems · Boston, MA'));
    a.appendChild(over);
    a.appendChild(el('span', 'go', 'open live ↗'));
    frames.push({ a: a, img: img, c: c, kind: kind });
    return a;
  }

  function concept(c, isCurrent) {
    var art = el('article', 'concept' + (isCurrent ? ' current' : ''));
    art.id = c.id;
    var fr = el('div', 'frames');
    fr.appendChild(frame(c, 'wide'));
    fr.appendChild(frame(c, 'tall'));
    art.appendChild(fr);
    var cap = el('div', 'caption');
    var head = el('div');
    head.appendChild(el('h2', '', c.title));
    head.appendChild(el('p', 'place', c.place));
    cap.appendChild(head);
    cap.appendChild(el('p', 'blurb', c.blurb));
    var open = el('a', 'open', isCurrent ? 'Open the live site ↗' : 'Open live preview →');
    if (isCurrent) {
      open.target = '_blank';
      open.rel = 'noopener';
    }
    cap.appendChild(open);
    art.appendChild(cap);
    frames.push({ a: open, c: c });
    return art;
  }

  list.forEach(function (c) { box.appendChild(concept(c, false)); });
  if (cur) box.appendChild(concept(cur, true));

  /* a look turns every picture, the new one fading in over the old once it
     has loaded, and the sheet's colours with it */
  function setLook(l, first) {
    look = l;
    root.setAttribute('data-look', l);
    picks.forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-look') === l)); });
    try { sessionStorage.setItem('look', l); } catch (err) {}
    frames.forEach(function (f) {
      f.a.href = live(f.c, l);
      if (!f.img || first) return;
      var next = new Image();
      next.className = 'next';
      next.alt = f.c.title + ', ' + l + (f.kind === 'tall' ? ', on a phone' : '');
      next.style.objectPosition = f.img.style.objectPosition;
      next.src = src(f.c, f.kind, l);
      var old = f.img;
      f.img = next;
      var swap = function () {
        if (f.img !== next) return;
        old.parentNode.insertBefore(next, old.nextSibling);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { next.className = ''; });
        });
        setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 500);
      };
      if (next.decode) next.decode().then(swap, swap);
      else next.onload = swap;
    });
  }

  picks.forEach(function (b) {
    b.addEventListener('click', function () { setLook(b.getAttribute('data-look'), false); });
  });

  addEventListener('keydown', function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (/^[123]$/.test(ev.key)) setLook(LOOKS[+ev.key - 1], false);
  });

  setLook(look, true);

  /* the other looks are fetched once the page is up, so a turn is quick */
  addEventListener('load', function () {
    setTimeout(function () {
      LOOKS.forEach(function (l) {
        if (l === look) return;
        list.concat(cur ? [cur] : []).forEach(function (c) {
          ['wide', 'tall'].forEach(function (k) { new Image().src = src(c, k, l); });
        });
      });
    }, 600);
  });
})();
