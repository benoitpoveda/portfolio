/**
 * Reveal progressif au scroll pour les blocs [data-reveal].
 * Cascade : delai (index % 3) * 0.06s. Failsafe OBLIGATOIRE : tout est force
 * visible apres 1,5 s — ne jamais laisser de contenu invisible (cf. handoff).
 * Respecte prefers-reduced-motion (affiche tout immediatement).
 */
export function initReveal(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (els.length === 0) return;

  const show = (el: HTMLElement) => el.classList.add('is-visible');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(show);
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target as HTMLElement);
        obs.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.1 }
  );

  els.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 0.06}s`;
    io.observe(el);
  });

  // Failsafe : jamais de contenu invisible (reseau lent, IO capricieux, etc.).
  window.setTimeout(() => els.forEach(show), 1500);
}
