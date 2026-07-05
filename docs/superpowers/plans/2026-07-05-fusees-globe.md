# Mini-fusées du portail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Des mini-fusées gravées type SpaceX décollent du globe du portail à intervalles aléatoires et filent vers l'infini ; ~1 vol sur 3 renvoie son booster se poser sur le globe.

**Architecture:** Module autonome `src/scripts/rockets.ts` (état en unités de R + secondes, resize-proof) branché dans la boucle rAF existante de `portail.ts` : `update(dt)` sous le gel `frozen`, `draw(ctx, geom)` juste après `drawGlobe`. Trajectoires = Béziers quadratiques en coordonnées locales au globe.

**Tech Stack:** TypeScript vanille, Canvas 2D, Astro 5 (aucune dépendance ajoutée).

**Spec:** `docs/superpowers/specs/2026-07-05-fusees-globe-design.md`

## Global Constraints

- Encre unique `rgba(238,243,255,α)` — la valeur `INK` de `portail.ts` est passée à `createRockets(ink)`. **Aucun turquoise.**
- Dash des traînées identique à l'axe des pôles : `[R * 0.018, R * 0.026]`.
- Aucun `Math.random()` par frame (vacillement de flamme déterministe, fonction du temps de vol). `Math.random()` autorisé au spawn uniquement.
- Cadence « discret » : 1er décollage à 2,5 s, puis 8–15 s aléatoire, max 2 missions simultanées.
- Booster sur ~1 vol sur 3 ; séparation à u = 0,45 ; retour se poser sur le limbe.
- Pas de spawn ni d'avancement quand `frozen` (modale ouverte ou reduced-motion) : `update` n'est appelé que sous `if (!frozen)`.
- Décollage interdit dans un secteur de ±25° autour du plein bas (zone de l'indice).
- L'étage sup fond vers r = 2,7·R du centre (au-delà des orbites satellites).
- Pas d'allocation notable par frame (splice in place, tuples locaux tolérés).
- Vérification = `pnpm check` (0 erreur) + `pnpm build` + contrôle visuel dev server — le repo n'a pas d'infra de test unitaires.

---

### Task 1: Module `rockets.ts`

**Files:**
- Create: `src/scripts/rockets.ts`

**Interfaces:**
- Consumes: rien (module feuille).
- Produces: `createRockets(ink: string): Rockets` avec
  `interface Rockets { update(dt: number): void; draw(ctx: CanvasRenderingContext2D, geom: RocketGeom): void }`
  et `interface RocketGeom { cx: number; cy: number; R: number }`.
  Task 2 s'appuie exactement sur ces trois noms.

- [ ] **Step 1: Écrire le fichier complet**

```ts
/**
 * Mini-fusées du portail — clin d'œil « SpaceX » gravé (spec 2026-07-05).
 *
 * Module autonome branché par portail.ts : update(dt) fait vivre les missions
 * (compte à rebours de lancement, progression des vols), draw(ctx, geom)
 * dessine APRÈS drawGlobe — fusées au-dessus du globe, sous les satellites DOM.
 *
 * Tout l'état géométrique est en unités de R (rayon du globe) et en secondes :
 * un redimensionnement ne déforme rien, il rescale. Même encre que la planche
 * (INK est passée par portail.ts), vacillement de flamme déterministe — pas de
 * Math.random() par frame, cohérent avec drawPlateGrain.
 */

export interface RocketGeom {
  cx: number;
  cy: number;
  R: number;
}

export interface Rockets {
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, geom: RocketGeom): void;
}

const TAU = Math.PI * 2;

/* Cadence (réglage « discret » validé) */
const FIRST_LAUNCH_DELAY = 2.5;
const MIN_INTERVAL = 8;
const MAX_INTERVAL = 15;
const RETRY_WHEN_FULL = 1.5;
const MAX_MISSIONS = 2;

/* Vol */
const R_END = 2.7; // rayon (en R) où l'étage sup a fini de fondre
const FADE_FROM = 0.78; // début du fondu (fraction de la progression)
const U_SEP = 0.45; // progression (easée) de la séparation d'étage
const BOOSTER_RATE = 1 / 3;
const LAND_FADE = 0.9; // durée du fondu du booster posé (s)
const NO_LAUNCH_DOWN = (25 * Math.PI) / 180; // secteur exclu autour du plein bas

/** Montée : lente au décollage puis qui file. */
const ease = (p: number): number => Math.pow(p, 1.9);
/** Retour booster : freine à l'approche (rétro-poussée). */
const smooth = (p: number): number => p * p * (3 - 2 * p);

interface Bezier {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function bezPoint(b: Bezier, u: number): [number, number] {
  const v = 1 - u;
  return [
    v * v * b.x0 + 2 * v * u * b.x1 + u * u * b.x2,
    v * v * b.y0 + 2 * v * u * b.y1 + u * u * b.y2,
  ];
}

function bezTangent(b: Bezier, u: number): [number, number] {
  const v = 1 - u;
  return [2 * v * (b.x1 - b.x0) + 2 * u * (b.x2 - b.x1), 2 * v * (b.y1 - b.y0) + 2 * u * (b.y2 - b.y1)];
}

interface Booster {
  path: Bezier;
  t: number;
  T: number;
  landed: number; // -1 = en vol, sinon temps écoulé depuis la pose (s)
}

interface Mission {
  path: Bezier; // trajectoire de l'étage principal (unités de R)
  a: number; // angle du pas de tir sur le limbe
  curl: number; // déport angulaire total du gravity-turn (signé)
  t: number; // temps de vol écoulé (s)
  T: number; // durée de la montée (s)
  puff: number; // âge du panache de décollage (s)
  hasBooster: boolean;
  booster: Booster | null; // créé à la séparation
}

function pickLaunchAngle(): number {
  // N'importe où sur le limbe, sauf ±25° autour du plein bas (zone de l'indice).
  for (;;) {
    const a = Math.random() * TAU;
    let d = a - Math.PI / 2;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    if (Math.abs(d) > NO_LAUNCH_DOWN) return a;
  }
}

function makeMission(): Mission {
  const a = pickLaunchAngle();
  const dir = Math.random() < 0.5 ? -1 : 1;
  const curl = dir * (0.55 + Math.random() * 0.35);
  // Contrôle radial (la fusée s'élève verticalement) puis arrivée décalée en
  // aval : le gravity-turn de la spec, en une Bézier quadratique.
  const rc = 1.75;
  return {
    path: {
      x0: Math.cos(a),
      y0: Math.sin(a),
      x1: Math.cos(a) * rc,
      y1: Math.sin(a) * rc,
      x2: Math.cos(a + curl) * R_END,
      y2: Math.sin(a + curl) * R_END,
    },
    a,
    curl,
    t: 0,
    T: 6.5 + Math.random() * 2,
    puff: 0,
    hasBooster: Math.random() < BOOSTER_RATE,
    booster: null,
  };
}

function makeBooster(m: Mission): Booster {
  const [sx, sy] = bezPoint(m.path, U_SEP);
  const [tx, ty] = bezTangent(m.path, U_SEP);
  const n = Math.hypot(tx, ty) || 1;
  // Pose en aval du pas de tir, du côté du curl ; l'élan continue dans l'axe
  // de vol (contrôle) puis retombe en cloche vers le limbe.
  const aLand = m.a + m.curl * 0.55;
  return {
    path: {
      x0: sx,
      y0: sy,
      x1: sx + (tx / n) * 0.55,
      y1: sy + (ty / n) * 0.55,
      x2: Math.cos(aLand),
      y2: Math.sin(aLand),
    },
    t: 0,
    T: 4.4 + Math.random() * 0.8,
    landed: -1,
  };
}

export function createRockets(ink: string): Rockets {
  const missions: Mission[] = [];
  let countdown = FIRST_LAUNCH_DELAY;

  function update(dt: number): void {
    countdown -= dt;
    if (countdown <= 0) {
      if (missions.length < MAX_MISSIONS) {
        missions.push(makeMission());
        countdown = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
      } else {
        countdown = RETRY_WHEN_FULL;
      }
    }

    for (let i = missions.length - 1; i >= 0; i--) {
      const m = missions[i];
      m.t += dt;
      m.puff += dt;
      const u = ease(Math.min(m.t / m.T, 1));
      if (m.hasBooster && !m.booster && u >= U_SEP) m.booster = makeBooster(m);
      const b = m.booster;
      if (b) {
        if (b.landed < 0) {
          b.t += dt;
          if (b.t >= b.T) b.landed = 0;
        } else {
          b.landed += dt;
        }
      }
      const upperDone = m.t >= m.T;
      const boosterDone = !m.hasBooster || (b != null && b.landed > LAND_FADE);
      if (upperDone && boosterDone) missions.splice(i, 1);
    }
  }

  /** Corps gravé commun étage/booster : aiguille + coiffe + ailerons + flamme. */
  function drawShip(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    ang: number,
    L: number,
    alpha: number,
    fins: boolean,
    nose: boolean,
    flame: number, // longueur de flamme en fraction de L (0 = éteinte)
  ): void {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.lineCap = 'round';
    c.strokeStyle = `rgba(${ink},${alpha})`;
    c.lineWidth = Math.max(0.9, L * 0.09);
    // Corps (le nez pointe vers +x, le sens du vol).
    c.beginPath();
    c.moveTo(-L * 0.5, 0);
    c.lineTo(L * 0.35, 0);
    c.stroke();
    if (nose) {
      c.beginPath();
      c.moveTo(L * 0.5, 0);
      c.lineTo(L * 0.22, -L * 0.1);
      c.lineTo(L * 0.22, L * 0.1);
      c.closePath();
      c.fillStyle = `rgba(${ink},${alpha})`;
      c.fill();
    }
    if (fins) {
      c.lineWidth = Math.max(0.7, L * 0.07);
      c.beginPath();
      c.moveTo(-L * 0.42, 0);
      c.lineTo(-L * 0.62, -L * 0.18);
      c.moveTo(-L * 0.42, 0);
      c.lineTo(-L * 0.62, L * 0.18);
      c.stroke();
    }
    if (flame > 0) {
      c.lineWidth = Math.max(0.7, L * 0.06);
      c.strokeStyle = `rgba(${ink},${alpha * 0.62})`;
      c.beginPath();
      c.moveTo(-L * 0.58, 0);
      c.lineTo(-L * (0.58 + flame), 0);
      c.stroke();
    }
    c.restore();
  }

  /** Panache gravé : anneaux qui s'élargissent et s'estompent (décollage/pose). */
  function drawPuff(c: CanvasRenderingContext2D, x: number, y: number, age: number, R: number): void {
    for (let i = 0; i < 3; i++) {
      const p = (age - i * 0.12) / 0.8;
      if (p <= 0 || p >= 1) continue;
      c.beginPath();
      c.arc(x, y, R * (0.02 + p * 0.09), 0, TAU);
      c.strokeStyle = `rgba(${ink},${0.3 * (1 - p)})`;
      c.lineWidth = Math.max(0.6, R * 0.0024);
      c.stroke();
    }
  }

  function drawMission(c: CanvasRenderingContext2D, m: Mission, R: number): void {
    const u = ease(Math.min(m.t / m.T, 1));
    const fade = u > FADE_FROM ? Math.max(0, (1 - u) / (1 - FADE_FROM)) : 1;
    const flick = Math.sin(m.t * 31) * Math.sin(m.t * 17 + 1.3);
    const L = Math.max(9, R * 0.055);

    // Traînée pointillée (dash de l'axe des pôles), plus dense vers la fusée.
    if (u > 0.01 && fade > 0) {
      c.save();
      c.setLineDash([R * 0.018, R * 0.026]);
      c.lineWidth = Math.max(0.7, R * 0.0028);
      const STEPS = 21;
      const CHUNKS: ReadonlyArray<readonly [number, number, number]> = [
        [0, 7, 0.08],
        [7, 14, 0.16],
        [14, STEPS, 0.26],
      ];
      for (const [from, to, a] of CHUNKS) {
        c.strokeStyle = `rgba(${ink},${a * fade})`;
        c.beginPath();
        for (let k = from; k <= to; k++) {
          const [px, py] = bezPoint(m.path, (u * k) / STEPS);
          if (k === from) c.moveTo(px * R, py * R);
          else c.lineTo(px * R, py * R);
        }
        c.stroke();
      }
      c.restore();
    }

    // Panache de décollage.
    drawPuff(c, m.path.x0 * R, m.path.y0 * R, m.puff, R);

    // Étage principal (après séparation : plus court, ailerons partis avec le booster).
    if (m.t < m.T) {
      const [px, py] = bezPoint(m.path, u);
      const [tx, ty] = bezTangent(m.path, u);
      const ang = Math.atan2(ty, tx);
      const separated = m.booster != null;
      const scale = (separated ? 0.72 : 1) * (0.6 + 0.4 * fade);
      drawShip(
        c,
        px * R,
        py * R,
        ang,
        L * scale,
        0.92 * fade,
        !separated,
        true,
        0.32 + 0.16 * flick,
      );
    }

    // Booster : flip, retour en cloche, rétro-flamme, pose, fondu.
    const b = m.booster;
    if (b) {
      if (b.landed < 0) {
        const ub = smooth(Math.min(b.t / b.T, 1));
        const [px, py] = bezPoint(b.path, ub);
        const [tx, ty] = bezTangent(b.path, ub);
        // Attitude rétrograde (moteurs devant) atteinte par un flip en ~0,6 s.
        const ang = Math.atan2(ty, tx) + Math.PI * Math.min(b.t / 0.6, 1);
        const retro = ub > 0.7 ? 0.24 + 0.1 * flick : 0;
        drawShip(c, px * R, py * R, ang, L * 0.6, 0.85, true, false, retro);
      } else {
        const alpha = 0.85 * Math.max(0, 1 - b.landed / LAND_FADE);
        // Posé sur le limbe, dressé selon la radiale (nez vers l'extérieur).
        const ang = Math.atan2(b.path.y2, b.path.x2);
        drawShip(c, b.path.x2 * R, b.path.y2 * R, ang, L * 0.6, alpha, true, false, 0);
        drawPuff(c, b.path.x2 * R, b.path.y2 * R, b.landed, R);
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, geom: RocketGeom): void {
    if (!missions.length) return;
    ctx.save();
    ctx.translate(geom.cx, geom.cy);
    for (const m of missions) drawMission(ctx, m, geom.R);
    ctx.restore();
  }

  return { update, draw };
}
```

- [ ] **Step 2: Vérifier les types**

Run: `pnpm check`
Expected: `Result (17 files): - 0 errors - 0 warnings - 0 hints` (16 fichiers + le nouveau)

- [ ] **Step 3: Commit**

```bash
git add src/scripts/rockets.ts
git commit -m "feat(portail): module mini-fusees gravees (spec 2026-07-05)"
```

---

### Task 2: Branchement dans `portail.ts`

**Files:**
- Modify: `src/scripts/portail.ts:13` (import), `:93` (instanciation), `:608-612` (draw), `:647-660` (loop)

**Interfaces:**
- Consumes: `createRockets(ink: string): Rockets` de Task 1 ; `INK`, `frozen`, `cx`, `cy`, `R`, boucle `loop`/`draw` existants.
- Produces: rien (feuille d'intégration).

- [ ] **Step 1: Importer et instancier**

Après `import { CONTINENTS } from './continents';` (ligne 13) :

```ts
import { CONTINENTS } from './continents';
import { createRockets } from './rockets';
```

Dans `initPortail()`, après le bloc satellites (`const paused: boolean[] = ORB.map(() => false);`, ligne 93) :

```ts
  /* ---- Mini-fusées (module isolé, même encre que la planche) ---- */
  const rockets = createRockets(INK);
```

- [ ] **Step 2: Dessiner après le globe**

Remplacer la fonction `draw` (lignes 608-612) :

```ts
  function draw(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawGlobe(ctx);
    rockets.draw(ctx, { cx, cy, R });
  }
```

- [ ] **Step 3: Faire vivre les fusées sous le gel existant**

Dans `loop` (lignes 647-660), ajouter `rockets.update(dt);` dans le bloc `if (!frozen)` :

```ts
  function loop(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const frozen = reduced || open != null;
    if (!frozen) {
      lon0 += dt * ROTATION_SPEED;
      for (let i = 0; i < ORB.length; i++) {
        if (!paused[i]) theta[i] += dt * ORB[i].sp * SATELLITE_SPEED;
      }
      rockets.update(dt);
    }
    draw();
    positionSats();
    raf = requestAnimationFrame(loop);
  }
```

- [ ] **Step 4: Vérifier types et build**

Run: `pnpm check`
Expected: `0 errors`
Run: `pnpm build`
Expected: build Astro complet sans erreur (sortie `dist/`).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/portail.ts
git commit -m "feat(portail): decollages aleatoires des mini-fusees sur le globe"
```

---

### Task 3: Vérification visuelle

**Files:** aucun (vérification), retouches de réglage éventuelles dans `src/scripts/rockets.ts` uniquement.

**Interfaces:**
- Consumes: le site complet (Tasks 1-2).
- Produces: captures d'écran de contrôle, éventuels ajustements de constantes.

- [ ] **Step 1: Lancer le dev server**

Run: `pnpm dev` (en tâche de fond)
Expected: `Local http://localhost:4321/`

- [ ] **Step 2: Captures**

Avec l'outillage navigateur disponible (headless Chromium/Playwright, sinon contrôle manuel par Benoît) : capturer la page d'accueil à t≈4 s (décollage + panache + traînée visibles) et t≈15 s (2e mission, si booster : séparation/retour).
Expected: fusée au trait fin encre claire, traînée pointillée, aucun élément coloré nouveau, étiquettes satellites lisibles par-dessus.

- [ ] **Step 3: Contrôles comportement**

- Modale ouverte (clic satellite) : rotation ET fusées figées ; fermeture : reprise sans saut (le `dt` est borné à 0,05 s).
- `prefers-reduced-motion: reduce` (émulation devtools ou capture avec le media émulé) : aucune fusée n'apparaît jamais.
- Redimensionner la fenêtre pendant un vol : la trajectoire se remet à l'échelle sans casser.
Expected: conforme à la spec, sinon ajuster les constantes de cadence/taille dans `rockets.ts` et re-vérifier.

- [ ] **Step 4: Arrêter le serveur, commit final éventuel**

```bash
git add -A && git commit -m "fix(portail): reglages visuels mini-fusees apres controle" # seulement si retouches
```

---

## Self-Review (fait à la rédaction)

1. **Spec coverage:** style gravure/INK/dash ✓ (drawShip/drawMission), cadence discret ✓ (constantes), secteur bas exclu ✓ (pickLaunchAngle), gravity-turn ✓ (Bézier), fondu à 2,7R ✓, booster 1/3 + flip + rétro-flamme + pose + panache ✓, gel frozen/reduced-motion ✓ (Task 2 Step 3), resize-proof ✓ (unités de R), pas d'alloc par frame ✓ (splice, tuples locaux négligeables), hors périmètre respecté (aucune interaction ajoutée).
   Écart assumé vs spec : le fondu se fait à 2,7·R fixe plutôt que 0,5·min(W,H) — équivalent hors écrans très larges (R plafonné à 305), toujours au-delà des orbites satellites ; noté ici comme décision.
2. **Placeholder scan:** aucun TBD/TODO ; tout le code est complet.
3. **Type consistency:** `createRockets(ink)` / `Rockets` / `RocketGeom {cx,cy,R}` identiques entre Task 1 (Produces) et Task 2 (Consumes) ; `INK` existe bien dans portail.ts:21.
