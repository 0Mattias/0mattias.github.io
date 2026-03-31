document.addEventListener("DOMContentLoaded", () => {

    // ── Dynamic Year ──
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ── Scramble Decode Effect ──
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$&";
    const heroTitle = document.querySelector("[data-scramble]");

    if (heroTitle) {
        const lines = heroTitle.innerHTML.split(/<br\s*\/?>/i);
        let charIndex = 0;

        heroTitle.innerHTML = lines.map(line =>
            line.split('').map(c => {
                if (c === ' ' || c === '\n') return c;
                return `<span class="char" data-char="${c}" style="animation-delay:${charIndex++ * 15}ms">${c}</span>`;
            }).join('')
        ).join('<br>');

        const chars = heroTitle.querySelectorAll('.char');
        chars.forEach((el, i) => {
            const original = el.dataset.char;
            let ticks = 0;
            const max = 4 + Math.random() * 8;

            const iv = setInterval(() => {
                el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
                if (++ticks >= max) {
                    clearInterval(iv);
                    el.textContent = original;
                }
            }, 25 + i * 1.2);
        });
    }

    // ── Scroll Reveal ──
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => entry.target.classList.add('visible'), +delay);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(el => observer.observe(el));

    // ── Nav: Hide on scroll down, show on scroll up ──
    const nav = document.getElementById('nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 100);
        nav.classList.toggle('hidden', y > lastScroll && y > 400);
        lastScroll = y;
    }, { passive: true });

    // ── Mobile Nav Toggle ──
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            navLinks.classList.toggle('open');
            document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                toggle.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // ── Cursor Glow ──
    const glow = document.querySelector('.cursor-glow');
    if (glow && window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', e => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        }, { passive: true });
    } else if (glow) {
        glow.style.display = 'none';
    }

    // ── Count-Up Animation ──
    const countEls = document.querySelectorAll('[data-count]');
    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = +el.dataset.count;
                let current = 0;
                const step = () => {
                    current += Math.ceil(target / 20);
                    if (current >= target) {
                        el.textContent = target;
                        return;
                    }
                    el.textContent = current;
                    requestAnimationFrame(step);
                };
                step();
                countObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    countEls.forEach(el => countObserver.observe(el));
});
