/*
    Site scripts: year stamp, gallery lightbox, and the bettermemory
    verdict walkthrough. Everything degrades to plain HTML without it.
*/

document.addEventListener('DOMContentLoaded', () => {

    /* ── Footer year ── */

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ── Lightbox ── */

    const galleryLinks = Array.from(document.querySelectorAll('.gallery a'));
    if (galleryLinks.length) {
        let overlay = null, img = null, captionEl = null, countEl = null;
        let current = 0, lastFocus = null;

        const captionFor = (a) => {
            const figure = a.closest('figure');
            const fc = figure && figure.querySelector('figcaption');
            return fc ? fc.textContent : '';
        };

        const show = (i) => {
            current = (i + galleryLinks.length) % galleryLinks.length;
            const a = galleryLinks[current];
            const thumb = a.querySelector('img');
            img.src = a.href;
            img.alt = thumb ? thumb.alt : '';
            captionEl.textContent = captionFor(a);
            countEl.textContent = (current + 1) + ' of ' + galleryLinks.length;
            [current - 1, current + 1].forEach(n => {
                const neighbour = galleryLinks[(n + galleryLinks.length) % galleryLinks.length];
                new Image().src = neighbour.href;
            });
        };

        const close = () => {
            overlay.remove();
            if (lastFocus) lastFocus.focus();
        };

        const onKey = (e) => {
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') show(current - 1);
            else if (e.key === 'ArrowRight') show(current + 1);
            else if (e.key === 'Tab') {
                const buttons = overlay.querySelectorAll('button');
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
                else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
            }
        };

        const build = () => {
            overlay = document.createElement('div');
            overlay.className = 'lb-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Photo viewer');
            overlay.innerHTML =
                '<div class="lb-frame">' +
                '<img class="lb-img" alt="">' +
                '<div class="lb-bar">' +
                '<span class="lb-caption"></span>' +
                '<span class="lb-count"></span>' +
                '<button type="button" class="lb-prev">&laquo; prev</button>' +
                '<button type="button" class="lb-next">next &raquo;</button>' +
                '<button type="button" class="lb-close">close</button>' +
                '</div></div>';
            img = overlay.querySelector('.lb-img');
            captionEl = overlay.querySelector('.lb-caption');
            countEl = overlay.querySelector('.lb-count');
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            overlay.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
            overlay.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
            overlay.querySelector('.lb-close').addEventListener('click', close);
            overlay.addEventListener('keydown', onKey);
        };

        const open = (i) => {
            if (!overlay) build();
            lastFocus = document.activeElement;
            document.body.appendChild(overlay);
            show(i);
            overlay.querySelector('.lb-close').focus();
        };

        galleryLinks.forEach((a, i) => {
            a.addEventListener('click', e => { e.preventDefault(); open(i); });
        });
    }

    /* ── bettermemory verdict walkthrough ── */

    const demoOut = document.getElementById('bm-demo');
    const demoSay = document.getElementById('bm-demo-say');
    const demoControls = document.getElementById('bm-demo-controls');
    if (demoOut && demoSay && demoControls) {
        demoControls.hidden = false;
        demoSay.hidden = false;

        const BEATS = [
            {
                say: 'An agent saves a fact about the codebase. Today, the fact is true.',
                fields: [
                    ['"staleness_verdict"', '"fresh"', 'ok'],
                    ['"last_verified_at"', '"today"', null]
                ]
            },
            {
                say: 'Three weeks pass and 28 commits land in the repo. Nothing has re-checked the fact, so the verdict stops vouching for it.',
                fields: [
                    ['"staleness_verdict"', '"spot_check_recommended"', 'warn'],
                    ['"commit_drift_count"', '28', null]
                ]
            },
            {
                say: 'One of those commits moved the file. The fact is wrong now, and the search hit arrives saying exactly that.',
                fields: [
                    ['"staleness_verdict"', '"spot_check_required"', 'hot'],
                    ['"path_drift"', '{ "missing": ["src/auth/middleware.py"] }', null],
                    ['"commit_drift_count"', '31', null]
                ]
            },
            {
                say: 'The agent re-reads the repo, fixes the path, and calls memory_verify. Fresh again, and this time it is earned.',
                fields: [
                    ['"staleness_verdict"', '"fresh"', 'ok'],
                    ['"last_verified_at"', '"just now"', null]
                ]
            }
        ];

        const nextBtn = demoControls.querySelector('[data-act="next"]');
        const resetBtn = demoControls.querySelector('[data-act="reset"]');
        let beat = 0;
        let prevPlain = null;

        const render = () => {
            const b = BEATS[beat];
            demoSay.innerHTML = '<span class="stepnum">step ' + (beat + 1) + ' of ' + BEATS.length + '</span>' + b.say;

            const plain = ['  "snippet": "Auth middleware lives in src/auth/middleware.py"', '  "relevance": "high"'];
            const marked = plain.slice();
            b.fields.forEach(f => {
                plain.push('  ' + f[0] + ': ' + f[1]);
                const value = f[2] ? '<b class="' + f[2] + '">' + f[1] + '</b>' : f[1];
                marked.push('  ' + f[0] + ': ' + value);
            });

            /* Lines that changed since the previous beat flash like the
               emulator's register highlight. First render flashes nothing. */
            const lines = marked.map((line, i) =>
                prevPlain && plain[i] !== prevPlain[i] ? '<span class="chg">' + line + '</span>' : line);
            demoOut.innerHTML = '{\n' + lines.join(',\n') + '\n}';
            prevPlain = plain;

            nextBtn.disabled = beat === BEATS.length - 1;
            resetBtn.disabled = beat === 0;
        };

        demoControls.addEventListener('click', e => {
            const act = e.target.getAttribute('data-act');
            if (!act) return;
            if (act === 'next' && beat < BEATS.length - 1) beat += 1;
            if (act === 'reset') beat = 0;
            render();
        });

        render();
    }

});
