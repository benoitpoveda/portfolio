# Mini-fusées du portail — design

Date : 2026-07-05 · Statut : validé par Benoît (fréquence « discret », booster « oui, parfois »)

## Objectif

Un clin d'œil animé sur l'écran du portail : de minuscules fusées type SpaceX décollent
du globe gravé à intervalles aléatoires et filent « vers l'infini et l'au-delà ».
Ton : jouet discret, pas d'attraction foraine — le site reste un portfolio de recrutement.

## Style (thème « hermes » = gravure cyanotype)

- Même langage que le globe : trait fin, encre `rgba(238,243,255,α)` (constante `INK`
  de `portail.ts`), aucun aplat, aucun dégradé coloré.
- Fusée ~12 px (échelle relative au rayon R du globe) : corps aiguille, coiffe,
  deux ailerons, flamme courte qui vacille — vacillement **déterministe** (fonction du
  temps de vol, pas de `Math.random()` par frame, cohérent avec `drawPlateGrain`).
- Traînée : pointillés gravés (dash identique à l'axe des pôles, `[R*0.018, R*0.026]`),
  alpha décroissant vers l'arrière.
- Panache de décollage et d'atterrissage : 2-3 cercles gravés qui s'élargissent et
  s'estompent en ~1 s.
- **Aucun turquoise** : la règle « UN seul geste turquoise par écran » est déjà
  consommée par le hover des satellites.

## Comportement

- Décollage : point aléatoire du limbe (bord du disque), en excluant un secteur de
  ±25° autour du plein bas (zone de l'indice « cliquez sur un satellite »).
- Vol : montée radiale ~15 % du trajet, puis gravity-turn (courbe de Bézier
  quadratique), accélération ease-in ; la fusée s'oriente selon la tangente.
- Fin de vie : rétrécit et fond (alpha → 0) vers ~0,5·min(W,H) du centre.
- Booster (~1 vol sur 3, tiré au sort au spawn) : séparation à ~45 % du vol ;
  l'étage supérieur continue et accélère ; le booster bascule (flip), redescend en
  arc vers un point du limbe proche du pas de tir, rétro-flamme sur la fin,
  panache à la pose, puis disparaît en ~0,8 s.
- Cadence : premier décollage ~2,5 s après chargement ; ensuite intervalle aléatoire
  8–15 s ; **max 2 missions simultanées** (une mission = fusée + son éventuel booster).

## Intégration système

- Module isolé `src/scripts/rockets.ts`, sans dépendance à l'état du portail :
  `createRockets()` → `{ update(dt: number): void, draw(ctx, geom): void }`
  où `geom = { cx, cy, R, S }` est passé à chaque frame (resize-proof : tout est
  relatif au limbe, rien n'est mémorisé en pixels absolus).
- Branchement dans `portail.ts` : `update(dt)` appelé dans `loop()` **uniquement quand
  `!frozen`** (donc pause complète si modale ouverte ou reduced-motion) ; `draw(ctx, …)`
  appelé dans `draw()` après `drawGlobe` (fusées au-dessus du globe, sous les
  satellites DOM). Le spawn est piloté par un compte à rebours dans `update` —
  pas de `setTimeout`, donc l'onglet caché (rAF coupé) suspend tout naturellement.
- `prefers-reduced-motion` : le gel existant suffit (jamais d'update ⇒ jamais de
  spawn) ; à l'activation en cours de vol, les fusées restent figées comme le globe —
  comportement identique aux satellites.
- Performance : ≤ 2 missions × (fusée + traînée ~30 points + panache) ; état en
  tableaux réutilisés, pas d'allocation notable par frame.

## Hors périmètre

Pas d'interaction (clic/hover) sur les fusées, pas de son, pas de fusées sur la vue
classique ni le CV, pas de paramétrage exposé.

## Vérification

Le repo n'a pas d'infra de test. Vérification : `pnpm check` (types), `pnpm build`,
contrôle visuel sur le dev server (captures : décollage, séparation, retour booster),
test manuel reduced-motion + modale ouverte (gel), redimensionnement fenêtre.
