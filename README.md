# Portfolio — Benoît Poveda

Site vitrine / portfolio (recherche d'emploi : administrateur systèmes / infrastructure).
Thème **cyanotype** « planche scientifique » (inspiration Nous Research).
Construit avec [Astro](https://astro.build) — sortie 100 % statique, CSS sur-mesure, zéro framework UI.

## Pages

| Route | Page |
|---|---|
| `/` | **Portail orbital** — accueil immersif : globe gravé animé en `<canvas>`, 5 satellites cliquables → modales « dossier ». |
| `/portfolio` | **Site scrollable** sobre (hero, profil, parcours, labo & projets, stack, contact). La « vue lecture ». |
| `/cv` | **CV A4 imprimable** — bouton Imprimer / PDF. |
| `404` | Page d'erreur thématisée. |

Les pages se lient entre elles (boutons « Télécharger le CV », lien « Vue lecture / classique »).

## Démarrer

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # génère dist/ (statique)
pnpm preview    # sert dist/ localement
pnpm check      # vérification TypeScript / Astro
```

Node ≥ 18 · pnpm.

## Où modifier le contenu

- **Textes** (hero, profil, parcours, projets, stack, contact) → `src/data/content.ts`
- **Coordonnées & liens** (email, GitHub, LinkedIn, téléphone, statut) → `src/data/site.ts`
- **Couleurs / typo / espacements** (design tokens) → `src/styles/tokens.css`
- **CV** → `src/pages/cv.astro` (contenu propre au CV ; coordonnées tirées de `site.ts`)
- **Portail (animation/canvas)** → `src/scripts/portail.ts` ; **reveal au scroll** → `src/scripts/reveal.ts`

## Réglages à connaître

- **Email affiché** : `povedaben@proton.me` (changer dans `site.ts → email`). Les sources du design
  divergeaient (Proton / Gmail / pm.me) ; l'adresse Proton a été retenue.
- **Téléphone** : **masqué** sur le site public (`site.showPhoneOnSite = false`, garde-fou anti-scraping),
  mais présent sur le CV. Passer à `true` pour l'afficher partout.
- **Photo** : monogramme « BP » par défaut. Pour une vraie photo dans le CV, remplacer `<span>BP</span>`
  (classe `.ph`) par `<img src="/photo.jpg" alt="Benoît Poveda">` dans `src/pages/cv.astro`
  (un filtre N&B / duotone est appliqué). Déposer l'image dans `public/`.
- **Domaine** : `https://www.povedaben.fr` dans `astro.config.mjs` (`site`) — pilote les URLs
  canoniques / OpenGraph / sitemap. Déployé sur Cloudflare Pages (auto-deploy depuis `main`).

## Déploiement

Sortie statique (`dist/`), déployable tel quel sur Netlify, Vercel, GitHub Pages, Cloudflare Pages…

```bash
pnpm build      # puis publier le dossier dist/
```

## Accessibilité & comportements

- Respecte `prefers-reduced-motion` (animations gelées).
- Reveal au scroll avec **failsafe** (le contenu ne reste jamais invisible).
- Modales du Portail : focus piégé (Tab), `Échap` pour fermer, focus restitué à l'ouverture/fermeture.
- Polices via Google Fonts : Archivo (titres/corps), Space Mono (labels/data), Cormorant Garamond (Portail).

## Source de design

Designs hi-fi issus du projet **Claude Design** « Portfolio avec thème Hermès ».
Les fichiers `.dc.html` d'origine sont des prototypes (runtime `support.js`) — ce dépôt en est la
**ré-implémentation** Astro (les prototypes ne sont pas embarqués).
