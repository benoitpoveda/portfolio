/**
 * Menu de navigation mobile de la vue lecture (/portfolio).
 *
 * Meme grammaire que le menu de repli du Portail — sections numerotees, labels
 * mono — mais construit en dialogue accessible : liens reels dans un <nav>,
 * focus piege puis restitue, Esc et bouton Retour le referment.
 *
 * Sous 760px la barre d'ancres est masquee : ce menu EST la navigation, il ne
 * peut donc pas se permettre d'etre approximatif.
 */
import { scrollToAnchor } from './anchor-scroll';

export function initPfMenu(): void {
  const panel = document.querySelector<HTMLElement>('[data-pfmenu]');
  const card = panel?.querySelector<HTMLElement>('[data-pfmenu-card]') ?? null;
  const toggles = Array.from(document.querySelectorAll<HTMLElement>('[data-pfmenu-toggle]'));
  if (!panel || !card || !toggles.length) return;

  const wide = window.matchMedia('(min-width: 761px)');

  let open = false;
  let inHistory = false;
  let lastFocused: HTMLElement | null = null;
  /** Ancre demandee pendant la fermeture : jouee une fois l'historique stabilise. */
  let pendingHash: string | null = null;

  function sync(): void {
    panel!.hidden = !open;
    toggles.forEach((t) => t.setAttribute('aria-expanded', String(open)));
    // Empeche le fond de defiler sous le panneau.
    document.documentElement.classList.toggle('pf-menu-locked', open);
  }

  /* Une seule entree d'historique pour le menu : le Retour le referme au lieu
     de quitter la page. */
  function pushOverlayState(): void {
    if (inHistory) return;
    inHistory = true;
    history.pushState({ pfMenu: true }, '');
  }
  function popOverlayState(): void {
    if (!inHistory) return;
    inHistory = false;
    history.back();
  }

  function openMenu(): void {
    if (open) return;
    lastFocused = document.activeElement as HTMLElement | null;
    open = true;
    pushOverlayState();
    sync();
    window.setTimeout(() => card!.querySelector<HTMLElement>('a[href],button')?.focus(), 40);
  }

  /** `skipHistory` : fermeture deja provoquee par l'historique, ou navigation
   *  sortante — dans les deux cas rejouer un history.back() serait faux. */
  function closeMenu(skipHistory = false): void {
    if (!open) return;
    open = false;
    sync();
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
    if (!skipHistory) popOverlayState();
  }

  /** Meme trajet que les ancres du reste de la page (duree fixe, focus pose). */
  const gotoHash = scrollToAnchor;

  /* --- Piege a Tab : le panneau couvre l'ecran, Tab ne doit pas en sortir --- */
  function trap(e: KeyboardEvent): void {
    const f = card!.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  toggles.forEach((t) => t.addEventListener('click', () => (open ? closeMenu() : openMenu())));

  panel.querySelectorAll<HTMLElement>('[data-pfmenu-close]').forEach((b) =>
    b.addEventListener('click', () => closeMenu()),
  );

  // Clic sur le fond du panneau.
  panel.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeMenu();
  });

  panel.querySelectorAll<HTMLAnchorElement>('[data-pfmenu-link]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') ?? '';
      if (href.startsWith('#')) {
        // Ancre interne : on referme d'abord (ce qui depile notre entree), puis
        // on rejoint la section — dans cet ordre, sinon le retour d'historique
        // et le saut d'ancre se marchent dessus.
        e.preventDefault();
        if (inHistory) {
          pendingHash = href; // joue par le handler popstate, une fois depile
          closeMenu();
        } else {
          closeMenu(true);
          gotoHash(href);
        }
      } else {
        // Navigation sortante : la page part, l'historique n'est plus a nous.
        closeMenu(true);
      }
    }),
  );

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    } else if (e.key === 'Tab') {
      trap(e);
    }
  });

  window.addEventListener('popstate', () => {
    inHistory = false; // l'entree vient d'etre depilee par le navigateur
    if (open) closeMenu(true);
    if (pendingHash) {
      const hash = pendingHash;
      pendingHash = null;
      // Le navigateur restaure la position de defilement de l'entree depilee
      // APRES ce handler : sauter tout de suite serait aussitot annule.
      requestAnimationFrame(() => requestAnimationFrame(() => gotoHash(hash)));
    }
  });

  // Passage en large : le bouton disparait, le panneau ne doit pas rester ouvert.
  const onWide = (e: MediaQueryList | MediaQueryListEvent): void => {
    if (e.matches && open) closeMenu();
  };
  if (wide.addEventListener) wide.addEventListener('change', onWide);

  sync();
}
