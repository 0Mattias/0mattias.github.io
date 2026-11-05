/* The head of a concept page: which concept and which look, chosen before
   the first paint so the page's colours are right from the start; the
   still of that concept and look is fetched to stand, softened, under the
   live picture while it is made. Then the scene and the stage that runs it
   are loaded, in that order. */

(function () {
  var d = document.documentElement;
  var list = window.CONCEPT_LIST || [];
  var q = new URLSearchParams(location.search);
  var id = q.get('scene');
  if (!/^[a-z0-9-]+$/.test(id || '')) id = list.length ? list[0].id : '';
  var look = q.get('look');
  try { look = look || sessionStorage.getItem('look'); } catch (err) {}
  if (look !== 'day' && look !== 'dusk' && look !== 'night') look = 'day';

  d.setAttribute('data-look', look);
  d.setAttribute('data-scene', id);
  d.className += ' js';
  window.CONCEPT_ID = id;

  var a = innerWidth / Math.max(innerHeight, 480);
  var still = new URL('stills/' + id + '-' + look + '-' + (a > 1.2 ? 'wide' : 'tall') + '.webp', location.href).href;
  d.style.setProperty('--poster', 'url("' + still + '")');
  if (!q.has('still')) {
    var img = new Image(), on = function () { d.classList.add('pic'); };
    img.fetchPriority = 'high';
    img.src = still;
    if (img.decode) img.decode().then(on, function () {});
    else img.onload = on;
  }

  ['scenes/' + id + '.js', 'stage.js'].forEach(function (src) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    document.head.appendChild(s);
  });
})();
