/**
 * ⚠️ PANNEAU DE RÉGLAGE TEMPORAIRE — à SUPPRIMER une fois les valeurs choisies.
 *
 * Affiche un panneau flottant avec 4 sliders (decay / amp / radius / scale) qui
 * pilotent l'effet melt en direct via `fx.setOptions(...)`. Le bouton « Copier »
 * met les valeurs dans le presse-papier et les logge en console.
 *
 * POUR RETIRER : supprimer ce fichier + les 2 lignes correspondantes dans
 * src/pages/index.astro (import + appel `mountMeltPanel`).
 */
import type { MeltBackground } from './melt-background.js';

interface Param {
  key: 'decay' | 'amp' | 'radius' | 'scale';
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
}

const PARAMS: Param[] = [
  { key: 'decay', label: 'Persistance (mémoire)', min: 0.70, max: 0.995, step: 0.005, digits: 3 },
  { key: 'amp', label: 'Intensité', min: 0.005, max: 0.30, step: 0.001, digits: 3 },
  { key: 'radius', label: 'Rayon du pinceau', min: 0.04, max: 0.5, step: 0.01, digits: 2 },
  { key: 'scale', label: 'Grain de la turbulence', min: 1.5, max: 12, step: 0.1, digits: 1 },
];

type Settings = Record<Param['key'], number>;

export function mountMeltPanel(fx: MeltBackground, initial: Settings): void {
  const values: Settings = { ...initial };

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed', top: '88px', right: '14px', zIndex: '100000',
    width: '250px', padding: '14px 16px 16px',
    background: 'rgba(10,15,40,0.86)', color: '#cdd6ff',
    border: '1px solid rgba(122,162,255,0.45)', borderRadius: '10px',
    font: "12px/1.4 ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace",
    boxShadow: '0 18px 50px rgba(5,10,60,0.5)', backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)', userSelect: 'none',
  } as Partial<CSSStyleDeclaration>);

  const head = document.createElement('div');
  Object.assign(head.style, {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '12px', letterSpacing: '0.04em',
  } as Partial<CSSStyleDeclaration>);
  const title = document.createElement('span');
  title.textContent = '⚙ MELT · réglage temp.';
  Object.assign(title.style, { fontWeight: '700', color: '#9fc0ff' } as Partial<CSSStyleDeclaration>);
  const close = document.createElement('button');
  close.textContent = '✕';
  Object.assign(close.style, {
    background: 'none', border: '1px solid rgba(122,162,255,0.4)', color: '#cdd6ff',
    width: '22px', height: '22px', borderRadius: '5px', cursor: 'pointer', lineHeight: '1',
  } as Partial<CSSStyleDeclaration>);
  close.title = 'Masquer le panneau';
  close.addEventListener('click', () => panel.remove());
  head.append(title, close);
  panel.append(head);

  for (const p of PARAMS) {
    const row = document.createElement('div');
    row.style.marginBottom = '12px';

    const lab = document.createElement('label');
    Object.assign(lab.style, {
      display: 'flex', justifyContent: 'space-between', marginBottom: '5px',
      color: '#8a93cf', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em',
    } as Partial<CSSStyleDeclaration>);
    const name = document.createElement('span');
    name.textContent = p.label;
    const val = document.createElement('span');
    val.style.color = '#cdd6ff';
    val.textContent = values[p.key].toFixed(p.digits);
    lab.append(name, val);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(p.min);
    input.max = String(p.max);
    input.step = String(p.step);
    input.value = String(values[p.key]);
    Object.assign(input.style, { width: '100%', accentColor: '#7aa2ff', cursor: 'pointer' } as Partial<CSSStyleDeclaration>);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      values[p.key] = v;
      val.textContent = v.toFixed(p.digits);
      fx.setOptions({ [p.key]: v });
    });

    row.append(lab, input);
    panel.append(row);
  }

  const copy = document.createElement('button');
  copy.textContent = 'Copier les valeurs';
  Object.assign(copy.style, {
    width: '100%', padding: '8px', marginTop: '2px', cursor: 'pointer',
    background: '#7aa2ff', color: '#070a1c', border: '0', borderRadius: '6px',
    font: 'inherit', fontWeight: '700',
  } as Partial<CSSStyleDeclaration>);
  copy.addEventListener('click', () => {
    const text = PARAMS.map((p) => `${p.key}: ${values[p.key].toFixed(p.digits)}`).join(', ');
    // eslint-disable-next-line no-console
    console.log('[MELT settings]', text);
    navigator.clipboard?.writeText(text).then(
      () => { copy.textContent = '✓ Copié ! (voir console)'; window.setTimeout(() => (copy.textContent = 'Copier les valeurs'), 1400); },
      () => { copy.textContent = 'Voir la console'; },
    );
  });
  panel.append(copy);

  document.body.append(panel);
}
