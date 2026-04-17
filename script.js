document.addEventListener("DOMContentLoaded", () => {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Dynamic Year ──
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ── Scroll Reveal ──
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('visible'), i * 60);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        reveals.forEach(el => observer.observe(el));
    } else {
        reveals.forEach(el => el.classList.add('visible'));
    }

    // ── Nav: hide on scroll down, show on scroll up ──
    const nav = document.getElementById('nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 80);
        nav.classList.toggle('hidden', y > lastScroll && y > 400);
        lastScroll = y;
    }, { passive: true });

    // ── Mobile Nav Toggle ──
    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');

    if (toggle && navLinks) {
        const setOpen = (open) => {
            toggle.classList.toggle('active', open);
            navLinks.classList.toggle('open', open);
            toggle.setAttribute('aria-expanded', String(open));
            document.body.style.overflow = open ? 'hidden' : '';
        };

        toggle.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));

        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => setOpen(false));
        });
    }
});
