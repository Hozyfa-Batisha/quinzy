/* ─── Scroll Reveal (IntersectionObserver) ──────────────────────────
   Elements with [data-reveal] get animated on viewport entry.
   Stagger delay is auto-computed by sibling index.
   Respects prefers-reduced-motion.
   ──────────────────────────────────────────────────────────────────── */

const ScrollReveal = {
  init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.classList.add('revealed');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = el.dataset.revealDelay || 0;
            setTimeout(() => {
              el.classList.add('revealed');
            }, Number(delay));
            observer.unobserve(el);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    document.querySelectorAll('[data-reveal]').forEach((el, i) => {
      /* Auto-stagger siblings in the same parent */
      const siblings = el.parentElement.querySelectorAll('[data-reveal]');
      const index = Array.from(siblings).indexOf(el);
      if (!el.dataset.revealDelay) {
        el.dataset.revealDelay = index * 80;
      }
      observer.observe(el);
    });
  },
};

window.ScrollReveal = ScrollReveal;
