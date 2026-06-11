/*
    Site scripts: year stamp, nav highlight, gallery lightbox, and the
    bettermemory verdict demo. Everything degrades to plain HTML without it.
*/

document.addEventListener('DOMContentLoaded', () => {

    /* ── Footer year ── */

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ── Nav highlight (home page only) ── */

    const navbar = document.getElementById('navbar');
    const sections = ['home', 'building', 'work', 'about', 'contact']
        .map(id => document.getElementById(id))
        .filter(Boolean);

    if (navbar && sections.length > 1) {
        const links = {};
        navbar.querySelectorAll('a[href^="#"]').forEach(a => {
            links[a.hash.slice(1)] = a;
        });

        let ticking = false;
        const spy = () => {
            ticking = false;
            const line = window.innerHeight * 0.25;
            const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
            let current = sections[0];
            if (window.scrollY > 40) {
                sections.forEach(s => {
                    if (s.getBoundingClientRect().top <= line) current = s;
                });
            }
            if (atBottom) current = sections[sections.length - 1];
            sections.forEach(s => {
                const link = links[s.id];
                if (!link) return;
                if (s === current) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        };
        window.addEventListener('scroll', () => {
            if (!ticking) { ticking = true; requestAnimationFrame(spy); }
        }, { passive: true });
        spy();
    }

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

    /* ── bettermemory verdict demo ── */

    const demoOut = document.getElementById('bm-demo');
    const demoControls = document.getElementById('bm-demo-controls');
    if (demoOut && demoControls) {
        demoControls.hidden = false;
        const state = { commits: 12, moved: true };

        const render = () => {
            let verdict, cls;
            if (state.moved) { verdict = 'spot_check_required'; cls = 'hot'; }
            else if (state.commits > 0) { verdict = 'spot_check_recommended'; cls = 'hot'; }
            else { verdict = 'fresh'; cls = 'ok'; }

            const body = [
                '  "snippet": "Auth middleware lives in src/auth/middleware.py"',
                '  "relevance": "high"',
                '  "staleness_verdict": <b class="' + cls + '">"' + verdict + '"</b>'
            ];
            if (state.moved) body.push('  "path_drift": { "missing": ["src/auth/middleware.py"] }');
            if (state.commits > 0) body.push('  "commit_drift_count": ' + state.commits);
            if (verdict === 'fresh') body.push('  "last_verified_at": "just now"');
            demoOut.innerHTML = '{\n' + body.join(',\n') + '\n}';
        };

        demoControls.addEventListener('click', e => {
            const act = e.target.getAttribute('data-act');
            if (!act) return;
            if (act === 'commits') state.commits += 12;
            if (act === 'move') state.moved = true;
            if (act === 'verify') { state.commits = 0; state.moved = false; }
            render();
        });
    }

});
