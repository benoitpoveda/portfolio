/**
 * Distorsion temporelle du FOND du Portail — branchement du moteur melt.
 *
 * L'effet s'applique UNIQUEMENT au décor de fond bleu (le dégradé électrique +
 * le filigrane géant « BENOÎT POVEDA »). Le globe, les satellites et la nav sont
 * des éléments séparés posés AU-DESSUS (`.po-stage` z-index 5+) : ils restent nets.
 *
 * Le canvas melt est `prepend` dans `.po-root` (z-index 0), donc DERRIÈRE les
 * surcouches `::before`/`::after` (scanlines + vignette) qui, elles, restent
 * statiques et nettes par-dessus le fond qui ondule.
 *
 * Le décor reproduit fidèlement les valeurs réelles du thème (tokens.css) :
 *  - dégradé 135° : #1c2bd6 → #1e2deb → #111aa5
 *  - halos radiaux du fond `.po-root`
 *  - filigrane « BENOÎT POVEDA » en Cormorant Garamond, rgba(238,243,255,.07)
 */
import { MeltBackground, type MeltDecor } from './melt-background.js';

const INK = '238,243,255';

/** Distance du point (px,py) au coin le plus éloigné — pour caler les halos radiaux. */
function farthestCorner(px: number, py: number, w: number, h: number): number {
  return Math.max(
    Math.hypot(px, py),
    Math.hypot(w - px, py),
    Math.hypot(px, h - py),
    Math.hypot(w - px, h - py),
  );
}

/** Peint le décor à la résolution exacte du canvas (w/h en pixels device). */
const drawPortalDecor: MeltDecor = (ctx, w, h) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 1) Dégradé bleu électrique 135° (var(--grad-portal)).
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1c2bd6');
  g.addColorStop(0.45, '#1e2deb');
  g.addColorStop(1, '#111aa5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 2) Halos radiaux discrets (repris du background de .po-root).
  const halos: ReadonlyArray<readonly [number, number, number, string]> = [
    [0.48, 0.42, 0.28, `rgba(${INK},0.105)`],
    [0.75, 0.18, 0.24, 'rgba(170,210,202,0.09)'],
    [0.20, 0.86, 0.30, `rgba(${INK},0.06)`],
  ];
  for (const [fx, fy, frac, col] of halos) {
    const px = fx * w;
    const py = fy * h;
    const r = frac * farthestCorner(px, py, w, h);
    const rg = ctx.createRadialGradient(px, py, 0, px, py, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }

  // 3) Micro-gravure horizontale très discrète : donne de la matière au
  //    « fond qui fond » loin du nom (sinon un dégradé lisse ne montre rien).
  ctx.strokeStyle = `rgba(${INK},0.025)`;
  ctx.lineWidth = 1;
  const step = Math.max(2, Math.round(5 * dpr));
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // 4) Filigrane géant « BENOÎT POVEDA » (mêmes réglages que .po-wm-name :
  //    Cormorant Garamond 700, clamp(92px, 22vw, 390px), line-height .74,
  //    letter-spacing -.055em, couleur rgba(238,243,255,.07)).
  const cssW = w / dpr;
  const fontCss = Math.max(92, Math.min(390, 0.22 * cssW));
  const font = fontCss * dpr;
  ctx.fillStyle = `rgba(${INK},0.07)`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(font)}px 'Cormorant Garamond', Georgia, 'Times New Roman', serif`;
  // letterSpacing sur canvas : navigateurs récents ; ignoré (try/catch) sinon.
  const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  try { ctxAny.letterSpacing = `${(-0.055 * font).toFixed(1)}px`; } catch { /* noop */ }
  const gap = font * 0.74;
  ctx.fillText('BENOÎT', w / 2, h / 2 - gap / 2);
  ctx.fillText('POVEDA', w / 2, h / 2 + gap / 2);
  try { ctxAny.letterSpacing = '0px'; } catch { /* noop */ }
};

/**
 * Réglages finaux de l'effet (figés après réglage en direct) :
 *  - decay  0.765 → « resistance » : mémoire/persistance de la trace
 *  - amp    0.100 → « intensity »  : intensité du déplacement
 *  - radius 0.15  → « rayon »      : taille du pinceau sous le curseur
 *  - scale  6.0   → « grain »      : finesse de la turbulence
 */
export const MELT_SETTINGS = {
  decay: 0.765,
  amp: 0.1,
  radius: 0.15,
  scale: 6,
};

export function initPortalMelt(): MeltBackground | null {
  const mount = document.querySelector<HTMLElement>('[data-portal-root]');
  if (!mount) return null;

  const create = (): MeltBackground => {
    const inst = new MeltBackground({
      mount,
      zIndex: '0', // sous le stage (globe/nav, z-index 5+) et sous ::before/::after
      draw: drawPortalDecor,
      idle: false, // pas de souris virtuelle : l'effet ne joue qu'au survol réel
      ...MELT_SETTINGS,
    });
    // La police web (Cormorant Garamond) peut arriver après le 1er rendu :
    // on repeint le décor une fois les polices prêtes pour un nom net et fidèle.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => inst.redraw()).catch(() => { /* noop */ });
    }
    return inst;
  };

  let fx = create();

  // Nettoyage sur VRAIE fermeture uniquement (pagehide non persisté) — jamais sur
  // beforeunload : quand la page part en bfcache puis revient (retour arrière),
  // le canvas détruit ne serait jamais recréé → fond disparu.
  window.addEventListener('pagehide', (e) => {
    if (!e.persisted) fx.destroy();
  });

  // Retour depuis le bfcache : on relance la boucle ; si le contexte WebGL a été
  // perdu pendant la mise en cache, on recrée le fond de zéro.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    if (!fx.resume()) {
      fx.destroy();
      fx = create();
    }
  });

  return fx;
}
