# Audit du portfolio — 2026-06-26 (mis à jour 2026-06-29)

> **Statut : la quasi-totalité des fixes a été appliquée le 2026-06-29.**
> Déployé sur Cloudflare Pages (auto-deploy GitHub branché). Reste 2 points qui
> demandent une décision/asset de ta part (domaine, vrai PDF) — voir plus bas.

## Méthode
Lecture intégrale du code (4 pages, 6 scripts, layout, tokens) + `astro check` (**0 erreur / 0 warning**) + build de prod (**OK**, 4 pages statiques).

## Verdict
Code de **très bonne qualité** (accessible, commenté, robuste). Bloquant levé, items SEO/social traités. **Cloudflare Pages = bon choix** (sortie statique, aucun adaptateur).

---

## 🔴 Bloquant — avant toute mise en ligne

- [x] **Panneau de réglage « melt » temporaire retiré.** Valeurs finales figées dans
  `MELT_SETTINGS` (`portal-melt.ts`) : decay 0.765 / amp 0.10 / radius 0.15 / scale 6.
  Fichier `portal-melt-panel.ts` supprimé, import + appel retirés de `index.astro`.
- [ ] **Confirmer le domaine.** `astro.config.mjs` → `site: 'https://benoitpoveda.fr'`.
  ⚠️ **À CONFIRMER** : c'est ce domaine qui pilote canonical / OpenGraph / sitemap.
  Tant que `benoitpoveda.fr` n'est pas branché sur le projet Pages, l'aperçu OG et le
  canonical pointent vers une URL qui ne résout pas encore.

## 🟠 Important — SEO / partage / crédibilité

- [x] **Image OpenGraph créée.** `public/og.png` (1200×630, aux couleurs du Portail) +
  balises `og:image` / `twitter:image` (+ width/height/alt) dans `BaseLayout.astro`.
- [x] **Libellés « CV (PDF) » corrigés.** Reformulés en « Voir le CV » (la page `/cv` est
  une page HTML optimisée impression A4 → Ctrl+P = PDF). *(Option : déposer un vrai
  `benoit-poveda-cv.pdf` dans `/public` si tu veux un téléchargement direct.)*
- [x] **Sitemap ajouté.** `@astrojs/sitemap` → `/sitemap-index.xml` + `Sitemap:` dans `robots.txt`.
- [x] **`<h1>` sur la home.** `.po-name` est passé de `<div>` à `<h1>` (SEO + a11y).
- [x] **Polices auto-hébergées (Fontsource).** Plus de `fonts.googleapis.com` (perf + RGPD),
  sur les 3 pages (home, portfolio, cv). Archivo 400→900, Space Mono 400/700, Cormorant 700.

## 🟡 Confort / robustesse

- [x] **`.nvmrc`** ajouté (`22`).
- [x] **`pnpm-workspace.yaml`** : clé standard `onlyBuiltDependencies` (au lieu de `allowBuilds`).
- [x] **`public/_headers`** : en-têtes sécu (X-Content-Type-Options, Referrer-Policy,
  X-Frame-Options, Permissions-Policy, HSTS) + cache long immuable sur `/_astro/*`.
- [x] **Pause des boucles rAF sur `document.hidden`** (globe + melt) via `visibilitychange`.
- [x] **`© {année}` calculé** (plus de `2026` en dur).
- [x] **Descriptions meta distinctes** pour `/` et `/portfolio`.
- [ ] `_handoff/` (local, non suivi par git) — désordre local, supprimable. RAS.

## ✅ Déjà solide (gardé)
Reduced-motion (CSS + JS + freeze anim), piège à Tab + restitution focus, `aria-label` partout,
fallback 2D si pas de WebGL, reveal failsafe 1,5 s, DPR plafonné à 2, rendu déterministe,
contenu centralisé (`site.ts` / `content.ts`), `astro check` 0 erreur.

---

## ❓ Reste à décider (toi)
1. **Domaine final** : `benoitpoveda.fr` confirmé ? Si oui → le brancher en *custom domain*
   sur le projet Cloudflare Pages `portfolio` (DNS OVH → CNAME, ou nameservers → Cloudflare).
2. **Vrai PDF du CV** : garder « Voir le CV » (page HTML imprimable), ou déposer un
   `benoit-poveda-cv.pdf` dans `/public` et repointer les liens dessus ?
