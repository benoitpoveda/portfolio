/**
 * Defilement vers les ancres de la vue lecture.
 *
 * Pourquoi ne pas se contenter de `scroll-behavior: smooth` en CSS : les
 * sections de cette page sont distantes de 800 a 3000px, et sur ces distances
 * le lissage natif de Chrome avance a vitesse quasi constante — mesure a moins
 * de 1000px parcourus en 1,7s, soit plusieurs secondes pour rejoindre le Labo.
 * Une duree FIXE tient la promesse du geste sans faire attendre.
 */

/** Duree du trajet, quelle que soit la distance. */
const DUREE_MS = 520;

const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ease-out cubique : depart franc, arrivee posee. */
const ease = (t: number): number => 1 - Math.pow(1 - t, 3);

let animation = 0;

/**
 * Amene la cible en haut de l'ecran, met a jour le hash sans empiler d'entree
 * d'historique, et deplace le focus pour que le clavier reparte de la section.
 */
export function scrollToAnchor(hash: string): void {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return;

  history.replaceState(null, '', hash);

  const depart = window.scrollY;
  const arrivee = Math.min(
    depart + target.getBoundingClientRect().top,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const delta = arrivee - depart;

  const poserLeFocus = (): void => {
    // tabindex -1 : la section devient focalisable sans entrer dans l'ordre de Tab.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };

  if (reduced() || Math.abs(delta) < 2) {
    window.scrollTo(0, arrivee);
    poserLeFocus();
    return;
  }

  cancelAnimationFrame(animation);
  const t0 = performance.now();
  const pas = (now: number): void => {
    const t = Math.min(1, (now - t0) / DUREE_MS);
    window.scrollTo(0, depart + delta * ease(t));
    if (t < 1) animation = requestAnimationFrame(pas);
    else poserLeFocus();
  };
  animation = requestAnimationFrame(pas);
}

/** Branche tous les liens internes de la page (nav, CTA, pied de page). */
export function initAnchorScroll(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    // Le menu mobile gere ses propres liens : il doit d'abord se refermer.
    if (a.hasAttribute('data-pfmenu-link')) return;
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href') ?? '';
      if (hash.length < 2 || !document.querySelector(hash)) return;
      e.preventDefault();
      scrollToAnchor(hash);
    });
  });
}
