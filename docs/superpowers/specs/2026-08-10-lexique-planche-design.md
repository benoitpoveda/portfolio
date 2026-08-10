# Lexique « planche » — retirer les marqueurs génériques

Date : 2026-08-10
Statut : validé, prêt pour plan d'implémentation

## Problème

Un lecteur extérieur a reconnu dans le portfolio les marqueurs visuels d'une
interface générée : le compteur `SECTION 01 / 05` au-dessus des titres, et
surtout le préfixe `//` appliqué à une quarantaine de libellés (`// PROFIL`,
`STACK //`, `NODES //`, `// SECTIONS`…).

Ces marqueurs entrent en contradiction avec le thème que le projet déclare
lui-même. `src/styles/tokens.css` ouvre sur : *« Theme cyanotype / "planche
scientifique" »*. Le portail parle déjà cette langue — `PLANCHE 02 / 05`,
`RELEVÉ ORBITAL`, `DOSSIER · B.POVEDA`, satellites, coordonnées de Nice — mais
la couche `//` la recouvre partout ailleurs.

Le travail consiste donc à retirer la couche générique et à étendre le
vocabulaire de planche déjà présent, pas à inventer un thème.

## Principe directeur

**On ne théâtralise pas les mots qu'un recruteur scanne.**

Le portfolio sert une recherche de poste. « STACK » est le mot-clé le plus
cherché sur la page ; le remplacer par « NOMENCLATURE » gagnerait en cohérence
de thème et se paierait en lisibilité. La règle retenue : retirer le `//`
partout, et ne renommer que les libellés qui ne portent aucune information pour
le lecteur.

Un seul libellé est dans ce cas : `NODES`.

## Périmètre

| Surface | Traitement |
|---|---|
| Portail (`index.astro`) | lexique planche complet |
| Vue lecture (`portfolio.astro`) | lexique planche complet |
| 404 (`404.astro`) | suit le portail |
| CV (`cv.astro`) | **neutralisé** : `//` retiré, aucun terme de thème ajouté |

Le CV est lu vite, par des humains pressés et parfois par un ATS. Il reste un
document, pas un objet de design.

## Lexique

| Aujourd'hui | Demain | Motif |
|---|---|---|
| `// PROFIL`, `// PARCOURS`, `// LABO & PROJETS`, `// STACK`, `// CONTACT` | `PROFIL`… + cartouche `01`…`05` | le `//` part, le numéro passe dans le cartouche |
| `// SECTIONS` (2 menus) | `PLANCHES` | le site appelle déjà ses écrans des planches |
| `SECTION 03 / 05` (tête de modale) | supprimé, remplacé par le cartouche | le pied de modale dit déjà `PLANCHE 03 / 05` |
| `NODES //` | `RELEVÉ` | seul libellé creux ; un relevé décrit bien « 230 articles », « ~12 VM » |
| `STACK //`, `PREUVE //`, `DOC //`, `FORMATION //` | `STACK`, `PREUVE`, `DOC`, `FORMATION` | mots conservés, `//` retiré |
| `// EN ENTREPRISE · EN PRODUCTION` (7 cartes) | sans `//` | |
| `DISPO //`, `OBJECTIF //` | alignés en légende, sans `//` | |
| `// RELEVÉ ORBITAL · NICE` | `RELEVÉ ORBITAL · NICE` | déjà propre au site |
| `// ERREUR 404` | `PLANCHE INTROUVABLE · 404` | |
| `STATUT //`, `MOBILITÉ //` (CV) | `Statut ·`, `Mobilité ·` | registre document |

Inchangés, parce qu'ils constituent déjà la signature du site : `PLANCHE n / 05`,
`DOSSIER · B.POVEDA`, les coordonnées, le monogramme, les satellites, la palette,
les polices.

## Geste typographique

### Cartouche de planche

`.pf-shead-sq` — un carré plein de 9 px — devient `.pf-shead-num`, une boîte
cadrée d'un filet cyanotype qui porte le numéro de planche. Le filet horizontal
de l'en-tête ne bouge pas.

```
┌────┐
│ 03 │  LABO & PROJETS ───────────────────────────
└────┘
```

Le numéro est décoratif (`aria-hidden="true"`) : c'est le libellé qui porte le
sens pour un lecteur d'écran.

Même cartouche dans la tête de modale du portail, où il remplace le texte
`SECTION 03 / 05`, et dans les deux menus, dont les numéros existent déjà
(`po-menu-num`, `pf-menu-num`).

### Légende à deux colonnes

Les clés de carte sont aujourd'hui alignées à la main avec des espaces
insécables (`STACK&nbsp;//`, `DOC&nbsp;&nbsp; //`, `portfolio.astro:226-233`).
Elles passent en grille deux colonnes : l'alignement devient typographique et le
bloc lit comme une légende de plan.

```
STACK    React / Vite · FastAPI · Docker Compose
PREUVE   De l'idée à la production · TLS · durcissement
RELEVÉ   230 articles · ~150 h gagnées
DOC      docs/stockage-zfs.md →
```

Cela suppose de supprimer les `<div>` de ligne pour que les paires clé/valeur
soient enfants directs de la grille. `.pf-card-meta` conserve son `margin-top:
auto` (valide sur un élément de conteneur flex quel que soit son propre
`display`).

### Flèches de menu

Les `→` décoratifs des items de menu passent en apparition au survol et au
focus. Ils restent dans le DOM, en `aria-hidden`, pour que la mise en page ne
saute pas.

## Source unique de vérité

Les métadonnées de section existent aujourd'hui en trois exemplaires :

- `src/data/content.ts:9` — `sections` (`id`, `nav`, `mono`)
- `src/pages/index.astro:18` — `SAT_META` (`id`, `num`, `label`)
- `src/scripts/portail.ts:118` — `META` (`num`, `label`, `title`, `desc`)

Elles ont déjà divergé : `// LABO & PROJETS` dans l'un, `// LABO` dans les
autres. Éditer les libellés à trois endroits réintroduirait la divergence.

`content.ts` devient la source unique. `sections` porte `id`, `nav`, `label`
(sans `//`), `num`, `short` (libellé court pour le satellite, d'où venait
« LABO »), `title` et `desc`. `index.astro` et `portail.ts` en dérivent.

Effet de bord bénéfique : `portail.ts:159` retire le `//` à la volée
(`m.label.replace(/^\/\/\s*/, '')`) pour ne pas le faire lire par un lecteur
d'écran. Ce contournement disparaît avec le préfixe.

Ce chantier reste borné aux données de section. Aucun autre remaniement.

## Fichiers touchés

1. `src/data/content.ts` — source unique ; `mono` → `label` sans `//` ; `cat` des 7 cartes sans `//`
2. `src/pages/index.astro` — `SAT_META` dérivé ; cartouche en tête de modale ; `PLANCHES` ; légende `DISPO` / `OBJECTIF` ; grille des clés de carte ; suppression de `SECTION n / 05`
3. `src/scripts/portail.ts` — `META` dérivé de `content.ts` ; suppression du `.replace(/^\/\/\s*/)`
4. `src/pages/portfolio.astro` — cartouche `.pf-shead-num` + CSS ; `PLANCHES` ; grille des clés ; `NODES` → `RELEVÉ` ; `FORMATION`
5. `src/pages/cv.astro` — `STATUT //` et `MOBILITÉ //`
6. `src/pages/404.astro` — `// ERREUR 404`

Aucun token, aucune couleur, aucune police n'est ajouté.

## Vérification

- `pnpm check` et `pnpm build` verts
- `aria-label` des satellites correct une fois le `//` absent de la donnée
- rendu contrôlé à l'écran sur le portail et sur la vue lecture, y compris en
  largeur étroite
- aucun `//` résiduel : `grep -rn '//\s*[A-ZÀ-Ü]' src/` ne doit plus remonter que
  de vrais commentaires de code

## Conséquences à assumer

- **Le PDF du CV devient obsolète.** `public/benoit-poveda-cv.pdf` (85 ko) est
  imprimé à la main depuis `/cv`. Modifier `cv.astro` impose de le réimprimer —
  étape manuelle, à la charge de Benoît.
- **Pas de push sans feu vert.** Le dépôt déclenche un déploiement automatique
  au push. Le travail reste local jusqu'à validation visuelle.
