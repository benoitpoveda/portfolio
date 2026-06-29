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
- [x] **Domaine confirmé : `www.povedaben.fr`** (`povedaben.fr` enregistré chez OVH,
  DNS chez OVH). `site:` mis à jour. Domaine rattaché au projet Pages côté Cloudflare.
  ⏳ En attente : ajouter le CNAME `www → portfolio-35b.pages.dev` chez OVH (voir bas de page).

## 🟠 Important — SEO / partage / crédibilité

- [x] **Image OpenGraph créée.** `public/og.png` (1200×630, aux couleurs du Portail) +
  balises `og:image` / `twitter:image` (+ width/height/alt) dans `BaseLayout.astro`.
- [x] **Vrai PDF du CV.** `public/benoit-poveda-cv.pdf` (généré depuis `/cv` via chromium
  headless, A4 1 page). Les CTA « Télécharger le CV » pointent dessus (`download`) ;
  la page HTML `/cv` reste accessible (« Voir en ligne » dans la carte contact).
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

## 🌐 Domaine `www.povedaben.fr` — dernière étape (action OVH)
Domaine rattaché au projet Pages côté Cloudflare (statut `initializing`). Pour finaliser,
**ajouter UN enregistrement DNS chez OVH** (zone DNS de `povedaben.fr`) :

```
Type   : CNAME
Sous-domaine / nom : www
Cible / target     : portfolio-35b.pages.dev.
TTL    : défaut
```

⚠️ Si un enregistrement `www` existe déjà (il pointe vers le parking OVH `213.186.33.5`),
le **remplacer** par ce CNAME. Après propagation (qq min → qq h), Cloudflare provisionne
le TLS automatiquement et `https://www.povedaben.fr` sert le portfolio.
Bonus : rediriger l'apex `povedaben.fr` → `www.povedaben.fr` (fonction redirection OVH).
