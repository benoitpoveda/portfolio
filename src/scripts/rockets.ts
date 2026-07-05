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
