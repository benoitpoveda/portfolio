# Collaboration

Ce projet est travaillé à plusieurs mains :

- **Benoît** — pilote le projet (humain).
- **Argos** (GPT) — **images & visuels** : génère / retouche les images et les dépose dans `public/`.
- **Claude** (Claude Code) — **code, mise en page, contenu, structure** ; intègre (« câble ») les
  images fournies par Argos. Travaille sur un clone local et pousse sur `origin/main`.

## Répartition (pour ne pas se marcher dessus)

| Domaine | Qui | Où |
|---|---|---|
| Images, visuels, photo, Open Graph | **Argos** | `public/` |
| Code, pages, styles | **Claude** | `src/` |
| Contenu textuel (source unique) | **Claude** | `src/data/content.ts`, `src/data/site.ts` |

> Règle d'or : **Argos ne touche qu'à `public/`** (fichiers binaires), **Claude ne touche qu'à `src/`**
> → quasiment aucun conflit possible.

## Règles Git

1. `origin/main` est la **source de vérité**.
2. **Avant de travailler** : `git pull --rebase origin main`.
   **Avant de pousser** : re-`pull --rebase` puis `push`.
3. **Jamais** de `git push --force` / `-f` sur ce repo.
4. Petits commits, messages clairs, **push fréquents** (fenêtres de divergence minuscules).
5. Ne pas réécrire des fichiers entiers produits par l'autre contributeur.
6. En cas de conflit : Claude résout côté code ; pour les images, on garde la dernière version
   validée par Benoît.

## Spécifications des images (Argos)

- Esprit **duotone bleu / cyanotype** (N&B contrasté, fond neutre). Un filtre grayscale est déjà
  appliqué en CSS sur la photo du CV.
- **Portrait** : carré, ≥ 800×800, cadrage propre (pas de selfie recadré) → `public/portrait.jpg`
  (ou `.webp`).
- **Open Graph** (optionnel) : 1200×630 → `public/og.jpg`.
- Formats web optimisés (webp/jpg/png, poids raisonnable), noms clairs et stables.
- **Interdits** : logos / illustrations de Nous Research (créer de l'original) ; turquoise criard.
- Après ajout d'une image : indiquer à Benoît **le chemin + l'usage prévu** (CV ? hero ? …) pour que
  Claude la câble.

## Garde-fous de contenu (brief)

- Posture **junior assumée**, zéro survente.
- **Ne pas inventer de compétences** (interdits car non pratiqués : Kubernetes, Terraform, Ansible,
  cloud AWS/GCP…). S'en tenir à la stack réelle (voir `src/data/content.ts`).
- Français, registre pro, phrases courtes et concrètes.
- **Un seul** geste turquoise désaturé (`#AAD2CA`) par écran.

## Où modifier quoi (rappel)

- Contenu → `src/data/content.ts`
- Coordonnées / liens / réglages → `src/data/site.ts`
- Couleurs / typo / tokens → `src/styles/tokens.css`
- Pages → `src/pages/*.astro`
- Images & assets → `public/`
