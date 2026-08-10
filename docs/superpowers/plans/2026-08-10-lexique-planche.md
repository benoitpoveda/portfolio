# Lexique « planche » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer du portfolio les marqueurs qui le font lire comme une interface générée — le compteur `SECTION 01 / 05` et le préfixe `//` sur une quarantaine de libellés — en étendant le vocabulaire de planche que le site parle déjà.

**Architecture :** Trois mouvements. (1) Les métadonnées de section, aujourd'hui en trois copies divergentes, deviennent une source unique dans `content.ts`, débarrassée du `//`. (2) Le préfixe cède la place à un cartouche de planche — une boîte cadrée portant le numéro — en tête de section, de modale et de menu. (3) Les clés de carte, alignées à la main avec des espaces insécables, passent en grille deux colonnes et lisent comme une légende de plan.

**Tech Stack :** Astro 5 (composants `.astro` avec `<style>` scopé), TypeScript, pnpm. Pas de framework de test dans ce projet : la vérification passe par `astro check`, `astro build` et des `grep` d'assertion sur le HTML produit dans `dist/`.

**Spec :** `docs/superpowers/specs/2026-08-10-lexique-planche-design.md`

## Global Constraints

- **On ne théâtralise pas les mots qu'un recruteur scanne.** `STACK`, `PREUVE`, `DOC`, `FORMATION` gardent leur libellé ; seul `NODES` est renommé, en `RELEVÉ`. Aucun autre renommage de terme métier.
- **Le CV reste un document.** `src/pages/cv.astro` perd ses `//` et ne reçoit aucun terme de thème : `Statut ·`, `Mobilité ·`. Son carré `.sh::before` et sa mise en page ne bougent pas.
- **Aucun token, aucune couleur, aucune police n'est ajouté.** Tout se fait avec les variables existantes de `src/styles/tokens.css` (`--c-cyanotype`, `--c-rule`, `--font-mono`, `--c-turquoise`…).
- **Un seul geste turquoise par écran** — règle d'or déclarée en tête de `tokens.css`. Le cartouche est cyanotype (`--c-cyanotype`), pas turquoise, sauf sur le bandeau contact sombre où le turquoise est déjà le geste en place.
- **Inchangés, ce sont les signatures du site :** `PLANCHE n / 05`, `DOSSIER · B.POVEDA`, les coordonnées, `[ PORTRAIT ] / FIG.01`, le monogramme, les satellites, la palette.
- **Le numéro de cartouche est décoratif** : toujours `aria-hidden="true"`. C'est le libellé qui porte le sens pour un lecteur d'écran.
- **Aucun `git push`.** Le dépôt déclenche un déploiement automatique au push. Tout reste local jusqu'au feu vert de Benoît.

## Commandes de vérification

Utilisées à chaque tâche :

```bash
pnpm check    # astro check — types et templates
pnpm build    # astro build — écrit dans dist/
```

Assertion de fin de chantier, sur le HTML réellement produit (les commentaires de
code n'y figurent pas, donc aucun faux positif) :

```bash
grep -rn '//' dist --include='*.html' | grep -vE 'https?://'
```

Attendu en fin de Task 6 : **aucune ligne**.

---

### Task 1 : Source unique de vérité, sans `//`

Les métadonnées de section existent en trois exemplaires — `content.ts:9`,
`index.astro:18` (`SAT_META`), `portail.ts:118` (`META`) — et ont déjà divergé
(`// LABO & PROJETS` d'un côté, `// LABO` de l'autre). Cette tâche les fusionne
dans `content.ts` et en retire le `//`. Elle touche les quatre fichiers d'un seul
tenant, parce que supprimer le champ `mono` casse ses consommateurs
immédiatement : la tâche n'est verte qu'une fois les trois migrés.

**Files:**
- Modify: `src/data/content.ts:8-15` (bloc `sections`), `:36`, `:56`, `:103`, `:184`, `:201` (champs `mono`), `:108`, `:117`, `:126`, `:135`, `:144`, `:156`, `:168` (champs `cat`)
- Modify: `src/pages/index.astro:4` (import), `:17-24` (`SAT_META`), `:47-70` (satellites)
- Modify: `src/pages/portfolio.astro:3` (import), `:146`, `:181`, `:211`, `:250`, `:274` (libellés d'en-tête)
- Modify: `src/scripts/portail.ts:13-14` (imports), `:117-124` (`META`), `:156-159` (`syncModal`)

**Interfaces:**
- Consumes: rien (première tâche)
- Produces:
  - `sections: readonly { id, nav, num, label, short, title, desc }[]` — exporté par `src/data/content.ts`, tous les champs `string`
  - `section: { profil, parcours, labo, stack, contact }` — accès par identifiant aux mêmes objets, exporté par `src/data/content.ts`
  - les objets `profil`, `parcours`, `labo`, `stack`, `contact` **n'ont plus de champ `mono`**
  - les 7 objets de `labo.cards` ont un champ `cat` sans préfixe `//`

- [ ] **Step 1 : Constater l'état de départ**

```bash
pnpm build
grep -c '// PROFIL\|// PARCOURS\|// LABO\|// STACK\|// CONTACT' dist/index.html dist/portfolio/index.html
```

Attendu : des occurrences non nulles dans les deux fichiers. C'est ce que la
tâche fait disparaître.

- [ ] **Step 2 : Enrichir le bloc `sections` de `content.ts`**

Remplacer intégralement `src/data/content.ts:8-15` par :

```ts
/* ---- Sections — SOURCE UNIQUE ----------------------------------------
   Le Portail (satellites, menu, modale), la vue lecture (en-tetes, menu)
   et portail.ts lisaient chacun leur propre copie de ces metadonnees ;
   elles avaient deja diverge (« LABO & PROJETS » ici, « LABO » ailleurs).
   Tout part desormais d'ici.
     num   : numero de planche, affiche dans le cartouche
     label : intitule long — en-tetes de section, menus, modale
     short : intitule court — satellite du Portail, ou la place manque
     title : titre de la tete de modale du Portail
     desc  : sous-titre de la tete de modale du Portail
   ---------------------------------------------------------------------- */
export const sections = [
  { id: 'profil',   nav: 'Profil',   num: '01', label: 'PROFIL',         short: 'PROFIL',   title: 'PROFIL',          desc: 'PORTRAIT & DÉMARCHE' },
  { id: 'parcours', nav: 'Parcours', num: '02', label: 'PARCOURS',       short: 'PARCOURS', title: 'PARCOURS',        desc: 'TRAJECTOIRE PROFESSIONNELLE' },
  { id: 'labo',     nav: 'Labo',     num: '03', label: 'LABO & PROJETS', short: 'LABO',     title: 'LABORATOIRE',     desc: 'HOMELAB & INFRASTRUCTURE' },
  { id: 'stack',    nav: 'Stack',    num: '04', label: 'STACK',          short: 'STACK',    title: 'STACK TECHNIQUE', desc: 'COMPÉTENCES & OUTILS' },
  { id: 'contact',  nav: 'Contact',  num: '05', label: 'CONTACT',        short: 'CONTACT',  title: 'CONTACT',         desc: 'COORDONNÉES & LIENS' },
] as const;

/** Acces par identifiant — evite un `.find()` dans chaque page. */
export const section = {
  profil: sections[0],
  parcours: sections[1],
  labo: sections[2],
  stack: sections[3],
  contact: sections[4],
} as const;
```

- [ ] **Step 3 : Supprimer les champs `mono` devenus redondants**

Supprimer ces cinq lignes de `src/data/content.ts` (leur contenu vit désormais
dans `sections[].label`) :

```ts
  mono: '// PROFIL',            // dans `profil`
  mono: '// PARCOURS',          // dans `parcours`
  mono: '// LABO & PROJETS',    // dans `labo`
  mono: '// STACK',             // dans `stack`
  mono: '// CONTACT',           // dans `contact`
```

- [ ] **Step 4 : Retirer le `//` des 7 catégories de cartes**

Dans `labo.cards`, remplacer chaque valeur de `cat` :

```ts
cat: 'EN ENTREPRISE · EN PRODUCTION',   // ×2 (Quality Gate, Clyo Labels)
cat: 'EN ENTREPRISE · AUTOMATISATION',  // Clyo Deploy Tool
cat: 'VIRTUALISATION',                  // Home Server
cat: 'DONNÉES',                         // Sauvegardes & stockage
cat: 'RÉSEAU & SÉCURITÉ',               // Accès distant
cat: 'OBSERVABILITÉ',                   // Supervision
```

- [ ] **Step 5 : Faire dériver le Portail de la source unique**

Dans `src/pages/index.astro`, ajouter `sections` à l'import ligne 4 :

```ts
import { sections, profil, parcours, labo, stack, contact } from '../data/content';
```

Supprimer entièrement le bloc `SAT_META` (lignes 17-24, commentaire compris).

Remplacer le bloc satellite `src/pages/index.astro:47-70` — seules trois lignes
changent, `SAT_META` → `sections`, l'`aria-label` qui n'a plus besoin de retirer
le préfixe, et le libellé qui prend la forme courte :

```astro
      {sections.map((s) => (
        <button
          class="po-sat"
          type="button"
          data-sat={s.id}
          aria-label={`Ouvrir la section ${s.label}`}
        >
```

et, plus bas dans le même bloc :

```astro
          <span class="po-sat-label" data-sat-label>{s.short}</span>
```

Puis, dans le menu de repli (`index.astro:125`), remplacer `SAT_META.map` par
`sections.map`. Les champs lus par ce bloc — `s.num`, `s.label` — existent tels
quels dans la nouvelle source, le reste du markup ne bouge pas.

- [ ] **Step 6 : Faire dériver `portail.ts` de la source unique**

Dans `src/scripts/portail.ts`, ajouter l'import après la ligne 14 :

```ts
import { sections } from '../data/content';
```

Remplacer le bloc `META` (lignes 117-124) par :

```ts
  /** Numero + intitule + sous-titre par section — derive de la source unique. */
  const META: Record<string, { num: string; label: string; title: string; desc: string }> =
    Object.fromEntries(
      sections.map((s) => [s.id, { num: s.num, label: s.label, title: s.title, desc: s.desc }]),
    );
```

Dans `syncModal` (lignes 156-159), le contournement qui retirait le `//` à la
volée n'a plus d'objet. Remplacer les trois lignes :

```ts
    const m = (open && META[open]) || { num: '', label: '', title: '', desc: '' };
    if (modalLabel) modalLabel.setAttribute('aria-label', m.label);
```

- [ ] **Step 7 : Faire dériver la vue lecture de la source unique**

Dans `src/pages/portfolio.astro`, ajouter `section` à l'import ligne 3 :

```ts
import { sections, section, hero, profil, parcours, labo, stack, contact, footer } from '../data/content';
```

Remplacer les cinq libellés d'en-tête :

| Ligne | Avant | Après |
|---|---|---|
| 146 | `{profil.mono}` | `{section.profil.label}` |
| 181 | `{parcours.mono}` | `{section.parcours.label}` |
| 211 | `{labo.mono}` | `{section.labo.label}` |
| 250 | `{stack.mono}` | `{section.stack.label}` |
| 274 | `{contact.mono}` | `{section.contact.label}` |

Dans le menu mobile (`portfolio.astro:91`), remplacer `{s.mono}` par `{s.label}`.

- [ ] **Step 8 : Vérifier que le build passe et que les `//` de section ont disparu**

```bash
pnpm check && pnpm build
grep -c '// PROFIL\|// PARCOURS\|// LABO\|// STACK\|// CONTACT' dist/index.html dist/portfolio/index.html
```

Attendu : `pnpm check` sans erreur, build réussi, et `grep -c` renvoie `0` pour
les deux fichiers. Vérifier aussi qu'aucune référence orpheline ne subsiste :

```bash
grep -rn '\.mono\|SAT_META' src/ && echo "RESTE DES REFERENCES" || echo "OK — aucune reference orpheline"
```

Attendu : `OK — aucune reference orpheline`.

- [ ] **Step 9 : Commit**

```bash
git add src/data/content.ts src/pages/index.astro src/pages/portfolio.astro src/scripts/portail.ts
git commit -m "refactor(contenu): source unique des sections, sans prefixe //

Les metadonnees de section vivaient en trois copies (content.ts, SAT_META
dans index.astro, META dans portail.ts) et avaient deja diverge : « LABO &
PROJETS » ici, « LABO » la. Elles ne vivent plus qu'une fois.

Le prefixe « // » quitte la donnee. Effet de bord : le contournement de
portail.ts qui le retirait a la volee pour les lecteurs d'ecran disparait.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2 : Cartouche de planche dans la vue lecture

Le carré plein de 9 px qui ouvre chaque en-tête de section devient une boîte
cadrée portant le numéro de planche.

```
┌────┐
│ 03 │  LABO & PROJETS ───────────────────────────
└────┘
```

**Files:**
- Modify: `src/pages/portfolio.astro:144-148`, `:179-183`, `:209-213`, `:248-252` (markup des en-têtes), `:274` (bandeau contact), `~:1022` (CSS `.pf-contact-eyebrow`), bloc CSS `.pf-shead-sq`

**Interfaces:**
- Consumes: `section.<id>.num` et `section.<id>.label` (Task 1)
- Produces: classes CSS `.pf-shead-num` et `.pf-contact-num`, utilisables par les tâches suivantes ; `.pf-shead-sq` n'existe plus

- [ ] **Step 1 : Constater l'état de départ**

```bash
grep -c 'pf-shead-sq' src/pages/portfolio.astro
```

Attendu : `5` — quatre usages dans le markup, un dans le CSS.

- [ ] **Step 2 : Remplacer le markup des quatre en-têtes de section**

Aux lignes 144-148, 179-183, 209-213 et 248-252, le bloc a partout la même
forme. Remplacer le `<span class="pf-shead-sq">` par le cartouche, en reprenant
le numéro depuis la source unique. Pour Profil :

```astro
        <div class="pf-shead" data-reveal>
          <span class="pf-shead-num" aria-hidden="true">{section.profil.num}</span>
          <span class="pf-shead-label">{section.profil.label}</span>
          <span class="pf-shead-rule" aria-hidden="true"></span>
        </div>
```

Idem pour Parcours (`section.parcours`), Labo (`section.labo`) et Stack
(`section.stack`) — même structure, seul l'identifiant change.

- [ ] **Step 3 : Remplacer la règle CSS `.pf-shead-sq`**

Dans le `<style>` de `portfolio.astro`, remplacer le bloc `.pf-shead-sq` :

```css
  /* Cartouche de planche : le numero cadre d'un filet, comme sur un plan.
     Remplace le carre plein — meme encre, meme gabarit vertical. */
  .pf-shead-num {
    flex: none;
    display: grid;
    place-items: center;
    min-width: 30px;
    padding: 3px 5px 2px;
    border: 1.5px solid var(--c-cyanotype);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.06em;
    color: var(--c-cyanotype);
  }
```

Le `gap: 11px` et le `align-items: center` de `.pf-shead` conviennent tels quels
au nouveau gabarit : ne pas y toucher.

- [ ] **Step 4 : Donner son cartouche au bandeau contact**

Le bandeau contact est sombre et son geste en place est le turquoise, pas le
cyanotype. Il reçoit donc la même structure avec sa propre encre, pour que la
planche 05 soit numérotée comme les quatre autres.

Remplacer `src/pages/portfolio.astro:274` :

```astro
        <div class="pf-contact-eyebrow" data-reveal>
          <span class="pf-contact-num" aria-hidden="true">{section.contact.num}</span>
          <span>{section.contact.label}</span>
        </div>
```

Et compléter le CSS `.pf-contact-eyebrow` (vers la ligne 1022) :

```css
  .pf-contact-eyebrow {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--c-turquoise);
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .pf-contact-num {
    flex: none;
    display: grid;
    place-items: center;
    min-width: 30px;
    padding: 3px 5px 2px;
    border: 1.5px solid var(--c-turquoise);
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.06em;
  }
```

- [ ] **Step 5 : Vérifier**

```bash
pnpm check && pnpm build
grep -c 'pf-shead-sq' src/pages/portfolio.astro || echo "OK — plus aucun carre plein"
grep -o 'pf-shead-num[^<]*<[^>]*>[0-9]*' dist/portfolio/index.html | head
```

Attendu : `pnpm check` sans erreur, `pf-shead-sq` absent, et les numéros `01` à
`04` présents dans le HTML produit.

- [ ] **Step 6 : Contrôle visuel**

```bash
pnpm dev
```

Ouvrir `/portfolio` et vérifier à l'œil : les cinq cartouches sont alignés
verticalement avec leur libellé, la boîte n'écrase pas le texte, le filet part
bien du bord droit du libellé, et le rendu tient en largeur étroite (réduire la
fenêtre sous 480 px). Arrêter le serveur ensuite.

- [ ] **Step 7 : Commit**

```bash
git add src/pages/portfolio.astro
git commit -m "feat(vue-lecture): cartouche de planche en tete de section

Le carre plein de 9px cede la place a une boite cadree portant le numero
de planche — le geste d'un plan, pas d'un template. Le bandeau contact
recoit le meme cartouche a l'encre turquoise, qui est deja son geste.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3 : Cartouche et `PLANCHES` dans le Portail

La tête de modale affiche `SECTION 03 / 05` au-dessus du titre, alors que son
pied affiche déjà `PLANCHE 03 / 05 · B.POVEDA`. Le texte redondant disparaît au
profit du cartouche.

**Files:**
- Modify: `src/pages/index.astro:121` (titre du menu), `:159-164` (tête de modale), bloc CSS `.po-modal-section`, bloc CSS `.po-modal-head`
- Modify: `src/pages/portfolio.astro:83` (titre du menu mobile)

**Interfaces:**
- Consumes: `[data-modal-num]` — `portail.ts:160-162` écrit le numéro courant dans **tous** les éléments portant cet attribut ; le cartouche doit le conserver pour rester synchronisé au feuilletage
- Produces: classe CSS `.po-modal-num` ; `.po-modal-section` n'existe plus

- [ ] **Step 1 : Constater l'état de départ**

```bash
pnpm build
grep -o 'SECTION <span data-modal-num[^/]*/span> / 05' dist/index.html
grep -c '// SECTIONS' dist/index.html dist/portfolio/index.html
```

Attendu : le compteur `SECTION … / 05` est présent, et `// SECTIONS` apparaît une
fois dans chaque page.

- [ ] **Step 2 : Remplacer la tête de modale**

Remplacer `src/pages/index.astro:159-164` :

```astro
          <div class="po-modal-head">
            <div class="po-modal-headline">
              <span class="po-modal-num" aria-hidden="true" data-modal-num></span>
              <div>
                <h2 class="po-modal-title" data-modal-title></h2>
                <div class="po-modal-desc" data-modal-desc></div>
              </div>
            </div>
```

Le `<div>` ouvrant d'origine est remplacé par `.po-modal-headline` ; le bouton de
fermeture qui suit (`po-modal-x`, ligne 165) et la balise fermante du bloc ne
bougent pas.

Le cartouche garde `data-modal-num` : `portail.ts` met à jour tous les éléments
portant cet attribut, donc le numéro suit le feuilletage ← / → comme le fait déjà
celui du pied de modale.

- [ ] **Step 3 : Remplacer la règle CSS `.po-modal-section`**

Dans le `<style>` de `index.astro`, remplacer le bloc `.po-modal-section` (vers
la ligne 919) par :

```css
  .po-modal-headline {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    min-width: 0;
  }
  /* Meme cartouche que la vue lecture, a l'echelle de la modale. */
  .po-modal-num {
    flex: none;
    display: grid;
    place-items: center;
    min-width: 32px;
    padding: 4px 5px 3px;
    border: 1.5px solid var(--c-cyanotype);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.06em;
    color: var(--c-cyanotype);
  }
```

- [ ] **Step 4 : Renommer les titres de menu**

Dans `src/pages/index.astro:121` :

```astro
          <span class="po-menu-title">PLANCHES</span>
```

Dans `src/pages/portfolio.astro:83` :

```astro
          <span class="pf-menu-title">PLANCHES</span>
```

- [ ] **Step 5 : Vérifier**

```bash
pnpm check && pnpm build
grep -c 'SECTION <span data-modal-num' dist/index.html || echo "OK — compteur retire"
grep -c '// SECTIONS' dist/index.html dist/portfolio/index.html || echo "OK — titres de menu renommes"
grep -c 'PLANCHES' dist/index.html dist/portfolio/index.html
```

Attendu : le compteur `SECTION … / 05` a disparu, `// SECTIONS` aussi, et
`PLANCHES` apparaît une fois par page.

- [ ] **Step 6 : Contrôle visuel du feuilletage**

```bash
pnpm dev
```

Sur `/` : ouvrir un satellite, vérifier que le cartouche affiche le bon numéro,
puis feuilleter avec les boutons ← et → du pied de modale. Le cartouche de tête
et le compteur de pied doivent avancer ensemble. Ouvrir le menu et vérifier qu'il
s'intitule `PLANCHES`. Arrêter le serveur ensuite.

- [ ] **Step 7 : Commit**

```bash
git add src/pages/index.astro src/pages/portfolio.astro
git commit -m "feat(portail): cartouche en tete de modale, menus intitules PLANCHES

« SECTION 03 / 05 » doublait le « PLANCHE 03 / 05 » du pied de modale. Le
texte cede la place au cartouche, qui garde data-modal-num et suit donc le
feuilletage. Les deux menus s'intitulent PLANCHES — le mot que le site
emploie deja pour ses ecrans.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4 : Légende deux colonnes et `NODES` → `RELEVÉ`

Les clés de carte sont alignées à la main avec des espaces insécables
(`STACK&nbsp;//`, `DOC&nbsp;&nbsp; //`). L'alignement devient typographique.

```
STACK    React / Vite · FastAPI · Docker Compose
PREUVE   De l'idée à la production · TLS · durcissement
RELEVÉ   230 articles · ~150 h gagnées
DOC      docs/stockage-zfs.md →
```

**Files:**
- Modify: `src/pages/portfolio.astro:225-237` (métadonnées de carte), bloc CSS `.pf-card-meta`, `:265-267` (ligne formation), bloc CSS `.pf-formation`
- Modify: `src/pages/index.astro:218-232` (métadonnées de carte), bloc CSS `.po-card-meta`

**Interfaces:**
- Consumes: `labo.cards[].stack`, `.preuve`, `.nodes`, `.doc` (inchangés — seul le libellé affiché change, pas le nom du champ)
- Produces: rien de nouveau pour les tâches suivantes

- [ ] **Step 1 : Constater l'état de départ**

```bash
grep -c 'NODES' dist/index.html dist/portfolio/index.html
grep -c '&nbsp;//' src/pages/portfolio.astro
```

Attendu : `NODES` présent dans les deux pages, et des alignements manuels dans la
vue lecture.

- [ ] **Step 2 : Passer les métadonnées de carte en grille — vue lecture**

Remplacer `src/pages/portfolio.astro:225-237`. Les `<div>` de ligne disparaissent
pour que les paires clé/valeur soient enfants directs de la grille :

```astro
                <div class="pf-card-meta">
                  <span class="pf-k">STACK</span>
                  <span class="pf-v">{card.stack}</span>
                  <span class="pf-k">PREUVE</span>
                  <span class="pf-v">{card.preuve}</span>
                  {card.nodes && (
                    <>
                      <span class="pf-k">RELEVÉ</span>
                      <span class="pf-v" set:html={mark(card.nodes, '~12 VM & conteneurs')}></span>
                    </>
                  )}
                  {card.doc && (
                    <>
                      <span class="pf-k">DOC</span>
                      <span class="pf-v">
                        <a class="pf-card-link" href={card.doc.href} target="_blank" rel="noopener">{card.doc.label} →</a>
                      </span>
                    </>
                  )}
                </div>
```

- [ ] **Step 3 : Adapter le CSS `.pf-card-meta`**

Remplacer le bloc `.pf-card-meta` :

```css
  /* Legende de plan : deux colonnes alignees typographiquement. L'ancienne
     version calait les cles a la main avec des &nbsp;. */
  .pf-card-meta {
    margin-top: auto;
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 14px;
    row-gap: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.5;
    padding-top: 14px;
    border-top: 1px dashed var(--c-rule);
  }
```

`margin-top: auto` reste valide : la carte parente est un conteneur flex, et
cette propriété s'applique à l'élément quel que soit son propre `display`. Les
règles `.pf-k` et `.pf-v` ne changent pas.

- [ ] **Step 4 : Passer les métadonnées de carte en grille — Portail**

Remplacer `src/pages/index.astro:218-232` :

```astro
                    <div class="po-card-meta">
                      <span class="po-card-k">STACK</span>
                      <span>{card.stack}</span>
                      <span class="po-card-k">PREUVE</span>
                      <span>{card.preuve}</span>
                      {card.nodes && (
                        <>
                          <span class="po-card-k">RELEVÉ</span>
                          <span>{card.nodes}</span>
                        </>
                      )}
                      {card.doc && (
                        <>
                          <span class="po-card-k">DOC</span>
                          <span>
                            <a class="po-card-link" href={card.doc.href} target="_blank" rel="noopener">
                              {card.doc.label} →
                            </a>
                          </span>
                        </>
                      )}
                    </div>
```

- [ ] **Step 5 : Adapter le CSS `.po-card-meta`**

Remplacer le bloc `.po-card-meta` :

```css
  .po-card-meta {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 12px;
    row-gap: 4px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--c-text-2);
    letter-spacing: 0.03em;
  }
```

La règle `.po-card-k` ne change pas.

- [ ] **Step 6 : Aligner la ligne formation sur la même grammaire**

Remplacer `src/pages/portfolio.astro:265-267` :

```astro
        <div class="pf-formation" data-reveal>
          <span class="pf-formation-k">FORMATION</span> {parcours.formation}
        </div>
```

- [ ] **Step 7 : Vérifier**

```bash
pnpm check && pnpm build
grep -c 'NODES' dist/index.html dist/portfolio/index.html || echo "OK — NODES retire"
grep -c 'RELEVÉ</span>' dist/index.html dist/portfolio/index.html
grep -c '&nbsp;//' src/pages/portfolio.astro || echo "OK — plus d'alignement manuel"
```

Attendu : `NODES` absent, `RELEVÉ` présent dans les deux pages, aucun alignement
par espaces insécables.

- [ ] **Step 8 : Contrôle visuel des cartes**

```bash
pnpm dev
```

Sur `/portfolio`, section Labo : vérifier que les clés sont alignées à gauche sur
une même colonne, que les valeurs longues (la stack de Quality Gate) passent à la
ligne sans casser l'alignement, et que le surlignage turquoise de `~12 VM &
conteneurs` est toujours là. Vérifier la même chose dans la modale Labo du
portail. Réduire la fenêtre sous 480 px pour contrôler que la colonne de valeurs
reste lisible. Arrêter le serveur ensuite.

- [ ] **Step 9 : Commit**

```bash
git add src/pages/index.astro src/pages/portfolio.astro
git commit -m "feat(cartes): legende deux colonnes, NODES devient RELEVE

Les cles etaient calees a la main avec des &nbsp; ; elles passent en
grille, l'alignement devient typographique et le bloc lit comme une
legende de plan. NODES ne voulait rien dire ici : un releve decrit bien
« 230 articles » ou « ~12 VM ».

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5 : Libellés résiduels

Ce qui reste : les ancres de la barre de nav, les deux boutons `// Menu`, les
deux blocs de relevé `DISPO` / `OBJECTIF`, et la page 404. Les flèches
décoratives des menus passent en apparition au survol et au focus.

**Files:**
- Modify: `src/pages/portfolio.astro:61` (ancres), `:73` (bouton Menu), `:133-136` (bloc relevé), bloc CSS `.pf-releve`, bloc CSS `.pf-menu-arrow`
- Modify: `src/pages/index.astro:87` (bouton Menu), `:103-106` (bloc statut), `:110` (coordonnées), bloc CSS `.po-status`, bloc CSS `.po-menu-arrow`
- Modify: `src/pages/404.astro:9`

**Interfaces:**
- Consumes: `sections[].nav` (Task 1), `site.status.dispo`, `site.status.focus`, `site.locationLong`
- Produces: classe CSS `.po-status-k` ; `.pf-releve-k` conservée

- [ ] **Step 1 : Constater l'état de départ**

```bash
pnpm build
grep -c '// Menu\|// ERREUR\|>// ' dist/index.html dist/portfolio/index.html dist/404.html
```

Attendu : des occurrences dans les trois pages.

- [ ] **Step 2 : Nettoyer la barre de nav et son bouton**

Dans `src/pages/portfolio.astro:61` :

```astro
          <a href={`#${s.id}`}>{s.nav}</a>
```

Dans `src/pages/portfolio.astro:73` et `src/pages/index.astro:87`, remplacer le
libellé du bouton `// Menu` par :

```astro
          Menu
```

Le commentaire CSS de `portfolio.astro` qui mentionne « reprend le `// Menu` du
Portail » devient faux : le corriger en « reprend le bouton Menu du Portail ».

- [ ] **Step 3 : Passer le relevé de la vue lecture en légende**

Remplacer `src/pages/portfolio.astro:133-136` :

```astro
          <div class="pf-releve">
            <span class="pf-releve-k">DISPO</span>
            <span>ouvert aux opportunités · Nice / Sophia / Monaco</span>
            <span class="pf-releve-k">OBJECTIF</span>
            <span>administrateur systèmes / infrastructure</span>
          </div>
```

Et adapter son CSS — la règle `.pf-releve div + div` n'a plus d'objet, la
supprimer :

```css
  .pf-releve {
    border: 1px solid var(--c-rule);
    border-radius: 12px;
    padding: 16px;
    background: var(--c-panel-cool);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.6;
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 14px;
    row-gap: 8px;
  }
  .pf-releve-k {
    color: var(--c-cyanotype);
    font-weight: 700;
  }
```

- [ ] **Step 4 : Passer le statut du Portail en légende**

Remplacer `src/pages/index.astro:103-106` :

```astro
      <div class="po-status">
        <span class="po-status-k">DISPO</span>
        <span>{site.status.dispo}</span>
        <span class="po-status-k">OBJECTIF</span>
        <span>{site.status.focus}</span>
      </div>
```

Et son CSS :

```css
  .po-status {
    font-family: var(--font-mono);
    font-size: 10.5px;
    line-height: 1.5;
    letter-spacing: 0.07em;
    color: #c3cfe8;
    margin-top: 13px;
    text-transform: uppercase;
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 12px;
    row-gap: 5px;
  }
  .po-status-k {
    opacity: 0.72;
  }
```

- [ ] **Step 5 : Nettoyer les coordonnées du Portail**

Remplacer `src/pages/index.astro:109-111` :

```astro
    <div class="po-coords">
      LAT 43.70°N · LON 7.27°E<br />RELEVÉ ORBITAL · {site.location}
    </div>
```

- [ ] **Step 6 : Renommer le libellé de la page 404**

Remplacer `src/pages/404.astro:9` :

```astro
      <p class="nf-label">PLANCHE INTROUVABLE · 404</p>
```

Le texte de la ligne 11 — « Cette planche n'existe pas (ou plus). » — parle déjà
la même langue : ne pas y toucher.

- [ ] **Step 7 : Faire apparaître les flèches de menu au survol**

Dans les blocs CSS `.pf-menu-arrow` (`portfolio.astro`) et `.po-menu-arrow`
(`index.astro`), ajouter la transition d'opacité. Elles restent dans le DOM en
`aria-hidden`, donc la mise en page ne saute pas :

```css
    opacity: 0;
    transition: opacity 0.18s var(--ease-reveal);
```

Et la révélation, à ajouter juste après chaque bloc (adapter le préfixe `pf-` /
`po-` et le nom de l'item : `.pf-menu-item` / `.pf-menu-out` côté vue lecture,
`.po-menu-item` côté portail) :

```css
  .pf-menu-item:hover .pf-menu-arrow,
  .pf-menu-item:focus-visible .pf-menu-arrow,
  .pf-menu-out:hover .pf-menu-arrow,
  .pf-menu-out:focus-visible .pf-menu-arrow {
    opacity: 1;
  }
```

- [ ] **Step 8 : Vérifier**

```bash
pnpm check && pnpm build
grep -rn '//' dist --include='*.html' | grep -vE 'https?://' | grep -v 'cv/index.html'
```

Attendu : plus aucune ligne hors `/cv`, qui est traité à la tâche suivante.

- [ ] **Step 9 : Contrôle visuel**

```bash
pnpm dev
```

Vérifier : la barre de nav de `/portfolio` (ancres sans préfixe, toujours
lisibles), le bloc relevé aligné en deux colonnes, le bloc statut du portail
idem, `/404` , et le survol d'un item de menu qui fait apparaître la flèche.
Naviguer au clavier dans le menu pour confirmer que la flèche apparaît aussi au
focus. Arrêter le serveur ensuite.

- [ ] **Step 10 : Commit**

```bash
git add src/pages/index.astro src/pages/portfolio.astro src/pages/404.astro
git commit -m "feat(libelles): retirer les // restants, releves en deux colonnes

Ancres de nav, boutons Menu, blocs DISPO/OBJECTIF, coordonnees et page
404. Les deux blocs de releve passent en grille comme les cartes. Les
fleches decoratives des menus n'apparaissent plus qu'au survol et au
focus — elles restent dans le DOM pour ne pas faire sauter la mise en page.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6 : CV neutralisé et revue finale

Le CV reste un document : il perd ses `//` et ne reçoit aucun terme de thème.

**Files:**
- Modify: `src/pages/cv.astro:77-78`

**Interfaces:**
- Consumes: `site.locationLong`
- Produces: rien

- [ ] **Step 1 : Neutraliser les deux libellés du CV**

Remplacer `src/pages/cv.astro:77-78` :

```astro
          <b>Statut</b> · ouvert aux opportunités<br />
          <b>Mobilité</b> · {site.locationLong}
```

Le reste de la feuille ne bouge pas : son carré `.sh::before`, sa mise en page et
ses couleurs propres restent tels quels.

- [ ] **Step 2 : Vérifier l'assertion de fin de chantier**

```bash
pnpm check && pnpm build
grep -rn '//' dist --include='*.html' | grep -vE 'https?://'
```

Attendu : **aucune ligne**. C'est le critère de réussite du chantier.

- [ ] **Step 3 : Vérifier qu'aucun `RELEVÉ` n'a fui vers le CV**

```bash
grep -c 'PLANCHE\|RELEVÉ\|NOMENCLATURE\|CALQUE' dist/cv/index.html || echo "OK — le CV reste un document"
```

Attendu : `OK — le CV reste un document`.

- [ ] **Step 4 : Revue visuelle complète**

```bash
pnpm dev
```

Parcourir les quatre pages — `/`, `/portfolio`, `/cv`, `/404` — en largeur pleine
puis sous 480 px. Sur le portail, ouvrir chaque satellite et feuilleter les cinq
planches avec ← et →. Vérifier qu'aucun libellé n'est tronqué, qu'aucun cartouche
ne déborde, et que la règle d'un seul geste turquoise par écran tient toujours.
Arrêter le serveur ensuite.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/cv.astro
git commit -m "chore(cv): retirer les // du bloc statut

Le CV est lu vite, par des humains presses et parfois par un ATS. Il perd
son prefixe et ne recoit aucun terme de theme : il reste un document.

Le PDF telechargeable (public/benoit-poveda-cv.pdf) est desormais decale
d'une version — il devra etre reimprime depuis /cv.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6 : Signaler les deux actions manuelles restantes**

Ne pas les exécuter — les annoncer à Benoît :

1. **Réimprimer `public/benoit-poveda-cv.pdf` depuis `/cv`.** Le PDF actuel
   affiche encore `STATUT //` et `MOBILITÉ //`.
2. **Le push reste à sa main.** Le dépôt déclenche un déploiement automatique ;
   rien n'est poussé par ce chantier.

---

## Self-Review

**Couverture de la spec :**

| Exigence de la spec | Tâche |
|---|---|
| Lexique : sections sans `//` + cartouche | 1, 2, 3 |
| `// SECTIONS` → `PLANCHES` (×2) | 3 |
| `SECTION 03 / 05` supprimé | 3 |
| `NODES` → `RELEVÉ` | 4 |
| `STACK` / `PREUVE` / `DOC` / `FORMATION` sans `//` | 4 |
| 7 `cat` de cartes sans `//` | 1 |
| `DISPO` / `OBJECTIF` en légende (les 2 pages) | 5 |
| `// RELEVÉ ORBITAL` → `RELEVÉ ORBITAL` | 5 |
| `// ERREUR 404` → `PLANCHE INTROUVABLE · 404` | 5 |
| CV : `STATUT //` / `MOBILITÉ //` neutralisés | 6 |
| Source unique de vérité | 1 |
| Suppression du contournement `portail.ts:159` | 1 |
| Cartouche `.pf-shead-num` | 2 |
| Légende deux colonnes | 4 |
| Flèches au survol | 5 |
| PDF du CV à réimprimer | 6 |

**Ajouts au périmètre de la spec**, découverts en lisant le code et couverts par
la règle « retirer le `//` partout » : les 5 ancres de nav (`portfolio.astro:61`)
et les 2 boutons `// Menu` (`index.astro:87`, `portfolio.astro:73`), traités en
Task 5. Les ancres reçoivent le mot nu plutôt que le numéro de planche : une
barre de nav se lit d'un coup d'œil, les numéros restent réservés aux en-têtes,
menus et modale.

**Cohérence des noms** — vérifiée : `section.<id>.num` / `.label` / `.short` /
`.title` / `.desc` sont produits en Task 1 et consommés à l'identique en Tasks 2,
3 et 5. `.pf-shead-num`, `.pf-contact-num`, `.po-modal-num` et `.po-status-k`
sont chacun définis dans la tâche qui les introduit. `data-modal-num` est
conservé sur le cartouche de modale, faute de quoi le feuilletage cesserait de le
mettre à jour.
