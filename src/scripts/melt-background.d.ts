/**
 * Déclarations de types pour `melt-background.js` (moteur WebGL sans dépendance).
 * Voir le module .js pour la documentation complète des options.
 */

export type MeltDecor = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export interface MeltOptions {
  /** Élément hôte du canvas (le canvas est `prepend` en fond). */
  mount?: HTMLElement;
  /** Peint le décor sur un canvas 2D off-screen à la résolution exacte. */
  draw?: MeltDecor;
  /** Décor sous forme d'image au lieu d'une fonction `draw`. */
  image?: string | HTMLImageElement | HTMLCanvasElement;
  zIndex?: string | number;
  /** Persistance / mémoire 0.80–0.99 (cœur de l'effet). */
  decay?: number;
  /** Intensité du déplacement. */
  amp?: number;
  /** Rayon du pinceau sous la souris. */
  radius?: number;
  /** Grain de la turbulence. */
  scale?: number;
  /** Point virtuel qui anime quand la souris est immobile. */
  idle?: boolean;
  /** Coupe l'animation si l'OS demande `prefers-reduced-motion`. */
  respectReducedMotion?: boolean;
}

export interface PortfolioDecorConfig {
  name?: [string, string];
  colorTop?: string;
  colorBottom?: string;
  ink?: string;
  line?: string;
  serif?: string;
  globe?: boolean;
}

export function createPortfolioDecor(cfg?: PortfolioDecorConfig): MeltDecor;

export class MeltBackground {
  constructor(options?: MeltOptions);
  setOptions(o: Partial<MeltOptions>): void;
  /** Repeint le décor (utile après le chargement d'une police web). */
  redraw(): void;
  setImage(src: string | HTMLImageElement | HTMLCanvasElement): void;
  destroy(): void;
}

export default MeltBackground;
