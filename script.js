document.addEventListener("DOMContentLoaded", () => {

    // ── Dynamic year ──
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ── Visitor counter (full disclosure: it only counts you) ──
    const counterEl = document.getElementById('counter');
    if (counterEl) {
        let visits = 0;
        try {
            visits = parseInt(localStorage.getItem('visits') || '0', 10) + 1;
            localStorage.setItem('visits', String(visits));
        } catch {
            visits = 1;
        }
        counterEl.textContent = String(1336 + visits).padStart(7, '0');
    }
});
