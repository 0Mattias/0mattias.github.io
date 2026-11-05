/* The preview's bar over a concept page: the concept before and after
   this one, where it is, and the way back to all of them. The arrow keys
   turn through the concepts, keeping the look; 1, 2 and 3 choose day, dusk
   and night. Leaving the bar out (?bare) shows the page as it would ship. */

(function () {
  var list = window.CONCEPT_LIST || [];
  var id = window.CONCEPT_ID;
  var hero = document.querySelector('.letterhead');
  var q = new URLSearchParams(location.search);
  var i = list.findIndex(function (c) { return c.id === id; });
  if (!hero) return;
  var here = list[i] || { title: id };
  document.title = here.title + ' · Mattias Rask · concept';

  function link(c) {
    return 'view.html?scene=' + c.id + (q.has('bare') ? '&bare' : '');
  }
  var prev = list[(i + list.length - 1) % list.length], next = list[(i + 1) % list.length];

  if (i >= 0 && !q.has('bare') && !q.has('still')) {
    var bar = document.createElement('nav');
    bar.className = 'tour';
    bar.setAttribute('aria-label', 'Concepts');
    bar.innerHTML =
      '<a class="step" href="' + link(prev) + '" title="' + prev.title + ' (←)" aria-label="Previous concept: ' + prev.title + '">‹</a>' +
      '<span class="here"><b></b><i>' + (i + 1) + ' / ' + list.length + '</i></span>' +
      '<a class="step" href="' + link(next) + '" title="' + next.title + ' (→)" aria-label="Next concept: ' + next.title + '">›</a>' +
      '<span class="sep" aria-hidden="true"></span>' +
      '<a class="all" href="index.html">all concepts</a>';
    bar.querySelector('b').textContent = here.title;
    hero.appendChild(bar);
  }

  addEventListener('keydown', function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var t = ev.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    if (ev.key === 'ArrowLeft' && i >= 0) location.href = link(prev);
    else if (ev.key === 'ArrowRight' && i >= 0) location.href = link(next);
    else if (window.setConceptLook && /^[123]$/.test(ev.key)) window.setConceptLook(['day', 'dusk', 'night'][+ev.key - 1]);
  });
})();
