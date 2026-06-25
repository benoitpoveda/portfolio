/**
 * Portail orbital — moteur Canvas (globe grave + orbites + satellites) et interactions.
 *
 * Portage fidele du prototype Portail.dc.html (DCLogic -> TS vanille) :
 *  - la geometrie de dessin (proj, hachures, drawGlobe/Orbits/LandMass/OceanEngraving,
 *    positionSats) est conservee VERBATIM ;
 *  - seule la plomberie framework (etat/rendu React-like) est reecrite en DOM statique.
 *
 * Le markup est rendu cote Astro (index.astro). Ce module se branche dessus via des
 * selecteurs data-* / id et pilote : rotation rAF, satellites, modale, menu de repli,
 * indice de 1er chargement, clavier (Esc, piege a Tab), focus, prefers-reduced-motion.
 */
import { CONTINENTS } from './continents';

/* ===== Constantes geometriques (VERBATIM prototype) ===== */
const RAD = Math.PI / 180;
const TILT = 23.5 * RAD;
const PHI0 = 14 * RAD;
const SINP0 = Math.sin(PHI0);
const COSP0 = Math.cos(PHI0);
const INK = '238,243,255';
const HORIZON_Z = -0.012;

/** Orbites : rx, ry (fraction de S), rot (deg), sp (vitesse rad/s), ph (phase). */
interface Orbit {
  rx: number;
  ry: number;
  rot: number;
  sp: number;
  ph: number;
}
const ORB: readonly Orbit[] = [
  { rx: 0.295, ry: 0.125, rot: -18, sp: 0.2, ph: 0.4 },
  { rx: 0.375, ry: 0.205, rot: 13, sp: -0.14, ph: 2.1 },
  { rx: 0.45, ry: 0.165, rot: -7, sp: 0.11, ph: 4.0 },
  { rx: 0.33, ry: 0.25, rot: 27, sp: 0.16, ph: 5.3 },
  { rx: 0.405, ry: 0.115, rot: 4, sp: -0.17, ph: 1.2 },
];

/** Reglages issus des props du prototype (defauts identiques). */
const ROTATION_SPEED = 6;
const SATELLITE_SPEED = 1;

type Point = readonly [number, number, number];
interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
interface ProjectedPoint {
  x: number;
  y: number;
  v: boolean;
  z: number;
}
interface VisiblePath {
  pts: Point[];
  clipped: boolean;
}
interface ProjectedPoly {
  paths: VisiblePath[];
  allVisible: boolean;
}

export function initPortail(): void {
  const root = document.querySelector<HTMLElement>('[data-portal-root]');
  const stage = document.querySelector<HTMLElement>('[data-portal-stage]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-portal-canvas]');
  if (!root || !stage || !canvas) return;

  /* ---- Etat ---- */
  let open: string | null = null;
  let menuOpen = false;
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Geometrie courante (remplie par resize) ---- */
  let ctx: CanvasRenderingContext2D | null = null;
  let W = 0;
  let H = 0;
  let S = 0;
  let R = 0;
  let cx = 0;
  let cy = 0;
  let lon0 = -25;

  /* ---- Satellites ---- */
  const satEls = Array.from(document.querySelectorAll<HTMLElement>('[data-sat]'));
  const labelEls = satEls.map((el) => el.querySelector<HTMLElement>('[data-sat-label]'));
  const leaderEls = satEls.map((el) => el.querySelector<HTMLElement>('[data-sat-leader]'));
  const nodeEls = satEls.map((el) => el.querySelector<HTMLElement>('[data-sat-node]'));
  const theta: number[] = ORB.map((o) => o.ph);
  const paused: boolean[] = ORB.map(() => false);

  /* ---- Elements de modale / menu / indice ---- */
  const modal = document.querySelector<HTMLElement>('[data-modal]');
  const modalCard = document.querySelector<HTMLElement>('[data-modal-card]');
  const modalLabel = document.querySelector<HTMLElement>('[data-modal-arialabel]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-modal-close]');
  const curNumEls = Array.from(document.querySelectorAll<HTMLElement>('[data-modal-num]'));
  const curTitleEl = document.querySelector<HTMLElement>('[data-modal-title]');
  const curDescEl = document.querySelector<HTMLElement>('[data-modal-desc]');
  const sectionBodies = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-section-body]').forEach((el) => {
    const id = el.dataset.sectionBody;
    if (id) sectionBodies.set(id, el);
  });
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const hintEl = document.querySelector<HTMLElement>('[data-hint]');

  /** Numero + intitule + sous-titre par section (VERBATIM prototype : META). */
  const META: Record<string, { num: string; label: string; title: string; desc: string }> = {
    profil: { num: '01', label: '// PROFIL', title: 'PROFIL', desc: 'PORTRAIT & DÉMARCHE' },
    parcours: { num: '02', label: '// PARCOURS', title: 'PARCOURS', desc: 'TRAJECTOIRE PROFESSIONNELLE' },
    labo: { num: '03', label: '// LABO', title: 'LABORATOIRE', desc: 'HOMELAB & INFRASTRUCTURE' },
    stack: { num: '04', label: '// STACK', title: 'STACK TECHNIQUE', desc: 'COMPÉTENCES & OUTILS' },
    contact: { num: '05', label: '// CONTACT', title: 'CONTACT', desc: 'COORDONNÉES & LIENS' },
  };

  /* =========================================================
     Interactions satellites
     ========================================================= */
  function hoverSat(i: number, on: boolean): void {
    paused[i] = on;
    const el = satEls[i];
    if (el) el.style.color = on ? '#AAD2CA' : '#EAF0FF';
    const l = labelEls[i];
    if (l) {
      l.style.opacity = on ? '1' : '0.82';
      l.style.color = on ? '#D7F2EC' : 'rgba(170,210,202,.82)';
    }
    const ld = leaderEls[i];
    if (ld) ld.style.opacity = on ? '1' : '0.62';
    const nd = nodeEls[i];
    if (nd) nd.style.opacity = on ? '1' : '0.76';
  }

  /* =========================================================
     Ouverture / fermeture modale & menu
     ========================================================= */
  let lastFocused: HTMLElement | null = null;

  function syncModal(): void {
    if (!modal) return;
    const isOpen = open != null;
    modal.hidden = !isOpen;
    if (!isOpen) return;
    const m = (open && META[open]) || { num: '', label: '', title: '', desc: '' };
    if (modalLabel) modalLabel.setAttribute('aria-label', m.label);
    curNumEls.forEach((el) => {
      el.textContent = m.num;
    });
    if (curTitleEl) curTitleEl.textContent = m.title;
    if (curDescEl) curDescEl.textContent = m.desc;
    sectionBodies.forEach((el, id) => {
      el.hidden = id !== open;
    });
  }

  function openSection(id: string): void {
    lastFocused = document.activeElement as HTMLElement | null;
    open = id;
    menuOpen = false;
    syncModal();
    syncMenu();
    // Le focus part sur le bouton de fermeture (a11y, comme le prototype).
    window.setTimeout(() => closeBtn?.focus(), 40);
  }

  function closeModal(): void {
    if (open == null) return;
    open = null;
    syncModal();
    // Restitution du focus a l'element declencheur.
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  function syncMenu(): void {
    if (menu) menu.hidden = !menuOpen;
  }
  function toggleMenu(): void {
    menuOpen = !menuOpen;
    syncMenu();
  }
  function closeMenu(): void {
    menuOpen = false;
    syncMenu();
  }

  /* =========================================================
     Clavier : Esc + piege a Tab dans la modale
     ========================================================= */
  function trap(e: KeyboardEvent): void {
    const c = modalCard;
    if (!c) return;
    const f = c.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onKey(e: KeyboardEvent): void {
    if (open != null) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'Tab') {
        trap(e);
      }
    } else if (menuOpen) {
      if (e.key === 'Escape') closeMenu();
    }
  }

  /* =========================================================
     Canvas : dimensionnement
     ========================================================= */
  function resize(): void {
    const r = stage!.getBoundingClientRect();
    W = r.width;
    H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas!.width = W * dpr;
    canvas!.height = H * dpr;
    canvas!.style.width = W + 'px';
    canvas!.style.height = H + 'px';
    ctx = canvas!.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min(W, H);
    cx = W / 2;
    cy = H / 2;
    R = Math.min(0.188 * S, 305);
    draw();
    positionSats();
  }

  /* =========================================================
     Projection orthographique + clipping horizon
     ========================================================= */
  function proj(lat: number, lon: number): ProjectedPoint {
    const lam = (lon - lon0) * RAD;
    const phi = lat * RAD;
    const cp = Math.cos(phi);
    const cosc = SINP0 * Math.sin(phi) + COSP0 * cp * Math.cos(lam);
    const x = cp * Math.sin(lam);
    const y = COSP0 * Math.sin(phi) - SINP0 * cp * Math.cos(lam);
    return { x: x * R, y: -y * R, v: cosc > HORIZON_Z, z: cosc };
  }

  function asPoint(q: ProjectedPoint): Point {
    return [q.x, q.y, q.z];
  }

  function pushPoint(pts: Point[], p: Point): void {
    const lastPt = pts[pts.length - 1];
    if (lastPt && Math.hypot(lastPt[0] - p[0], lastPt[1] - p[1]) < 0.35) return;
    pts.push(p);
  }

  function horizonIntersection(a: ProjectedPoint, b: ProjectedPoint): Point {
    const denom = a.z - b.z;
    const rawT = Math.abs(denom) < 1e-6 ? 0.5 : (a.z - HORIZON_Z) / denom;
    const t = Math.max(0, Math.min(1, rawT));
    let x = a.x + (b.x - a.x) * t;
    let y = a.y + (b.y - a.y) * t;

    // Snap to the visible limb. Without this, tiny numeric drift leaves hairline chords
    // between clipped continent paths and the globe edge during rotation.
    const mag = Math.hypot(x, y);
    if (mag > 1e-6) {
      x = (x / mag) * R;
      y = (y / mag) * R;
    }
    return [x, y, HORIZON_Z];
  }

  function projectPoly(poly: ReadonlyArray<readonly number[]>): ProjectedPoly {
    const samples = poly.map((p) => proj(p[1], p[0]));
    if (samples.length < 2) return { paths: [], allVisible: false };

    const allVisible = samples.every((p) => p.v);
    if (allVisible) return { paths: [{ pts: samples.map(asPoint), clipped: false }], allVisible: true };

    const paths: VisiblePath[] = [];
    let current: Point[] = [];
    const n = samples.length;

    for (let i = 0; i < n; i++) {
      const a = samples[i];
      const b = samples[(i + 1) % n];

      if (a.v && current.length === 0) pushPoint(current, asPoint(a));

      if (a.v && b.v) {
        pushPoint(current, asPoint(b));
      } else if (a.v && !b.v) {
        pushPoint(current, horizonIntersection(a, b));
        if (current.length >= 2) paths.push({ pts: current, clipped: true });
        current = [];
      } else if (!a.v && b.v) {
        current = [];
        pushPoint(current, horizonIntersection(a, b));
        pushPoint(current, asPoint(b));
      }
    }

    if (current.length >= 2) paths.push({ pts: current, clipped: true });

    // If a visible segment wraps across the array boundary, merge the tail and head.
    if (paths.length > 1 && samples[0].v && samples[n - 1].v) {
      const tail = paths.pop();
      const head = paths.shift();
      if (tail && head) paths.unshift({ pts: [...tail.pts, ...head.pts.slice(1)], clipped: true });
    }

    return { paths, allVisible: false };
  }

  function addShortestHorizonArc(c: CanvasRenderingContext2D, from: Point, to: Point): void {
    const start = Math.atan2(from[1], from[0]);
    const end = Math.atan2(to[1], to[0]);
    let delta = end - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    c.arc(0, 0, R, start, start + delta, delta < 0);
  }

  function closedVisiblePath(c: CanvasRenderingContext2D, path: VisiblePath): void {
    c.beginPath();
    c.moveTo(path.pts[0][0], path.pts[0][1]);
    for (let i = 1; i < path.pts.length; i++) c.lineTo(path.pts[i][0], path.pts[i][1]);
    if (path.clipped) addShortestHorizonArc(c, path.pts[path.pts.length - 1], path.pts[0]);
    c.closePath();
  }

  function boxFromPoints(pts: Point[]): Box {
    return pts.reduce<Box>(
      (b, p) => ({
        minX: Math.min(b.minX, p[0]),
        minY: Math.min(b.minY, p[1]),
        maxX: Math.max(b.maxX, p[0]),
        maxY: Math.max(b.maxY, p[1]),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );
  }

  function strokeProjected(c: CanvasRenderingContext2D, pts: Point[], close = false): void {
    if (!pts || pts.length < 2) return;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (close) c.closePath();
    c.stroke();
  }

  function strokeGeoLine(c: CanvasRenderingContext2D, coords: ReadonlyArray<{ lat: number; lon: number }>): void {
    let seg: Point[] = [];
    for (const co of coords) {
      const q = proj(co.lat, co.lon);
      if (q.v) seg.push([q.x, q.y, q.z]);
      else {
        strokeProjected(c, seg);
        seg = [];
      }
    }
    strokeProjected(c, seg);
  }

  function hatchBox(
    c: CanvasRenderingContext2D,
    box: Box,
    angleDeg: number,
    spacing: number,
    alpha: number,
    width = 1,
    dash = false,
  ): void {
    const a = angleDeg * RAD;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const nx = -uy;
    const ny = ux;
    const bcx = (box.minX + box.maxX) / 2;
    const bcy = (box.minY + box.maxY) / 2;
    const span = Math.hypot(box.maxX - box.minX, box.maxY - box.minY) + R * 0.45;
    c.save();
    c.strokeStyle = `rgba(${INK},${alpha})`;
    c.lineWidth = width;
    c.lineCap = 'round';
    if (dash) c.setLineDash([R * 0.018, R * 0.026]);
    for (let off = -span; off <= span; off += spacing) {
      const x = bcx + nx * off;
      const y = bcy + ny * off;
      c.beginPath();
      c.moveTo(x - ux * span, y - uy * span);
      c.lineTo(x + ux * span, y + uy * span);
      c.stroke();
    }
    c.restore();
  }

  /* =========================================================
     Continents : hachures gravees clippees sur hemisphere visible
     ========================================================= */
  function drawLandMass(c: CanvasRenderingContext2D, poly: ReadonlyArray<readonly number[]>, index: number): void {
    const projected = projectPoly(poly);
    if (!projected.paths.length) return;

    for (let pi = 0; pi < projected.paths.length; pi++) {
      const path = projected.paths[pi];
      if (path.pts.length < 3) continue;
      const box = boxFromPoints(path.pts);

      c.save();
      closedVisiblePath(c, path);
      c.fillStyle = `rgba(${INK},0.050)`;
      c.fill();
      c.clip();

      // Direction #1: continents pleins par hachures blanches denses.
      // The path is clipped to the visible hemisphere before hatching; this prevents
      // the old diagonal chords when a continent rotates behind the globe.
      const hatchIndex = index + pi * 0.37;
      hatchBox(c, box, -18 + hatchIndex * 4, Math.max(5.5, R * 0.03), 0.78, Math.max(0.85, R * 0.0042));
      hatchBox(c, box, 34 - hatchIndex * 3, Math.max(9, R * 0.052), 0.24, Math.max(0.65, R * 0.0026), true);

      // Fine inner contour strokes: only on fully visible polygons. On clipped paths,
      // fake inset contours would reintroduce horizon-crossing artifacts.
      if (!path.clipped && projected.allVisible) {
        c.strokeStyle = `rgba(${INK},0.18)`;
        c.lineWidth = Math.max(0.55, R * 0.0022);
        for (let k = 0; k < 4; k++) {
          const inset = 1 + k * R * 0.009;
          c.beginPath();
          for (let i = 0; i < path.pts.length; i++) {
            const p = path.pts[i];
            const n = Math.hypot(p[0], p[1]) || 1;
            const x = p[0] - (p[0] / n) * inset;
            const y = p[1] - (p[1] / n) * inset;
            if (i === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
          c.closePath();
          c.stroke();
        }
      }
      c.restore();
    }

    c.save();
    c.strokeStyle = `rgba(${INK},0.98)`;
    c.lineWidth = Math.max(1.25, R * 0.006);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const path of projected.paths) strokeProjected(c, path.pts, !path.clipped && projected.allVisible);
    c.restore();
  }

  function drawOceanEngraving(c: CanvasRenderingContext2D): void {
    // Dense but quiet oceans: fine latitude/longitude + bathymetric curves.
    c.save();
    c.lineWidth = Math.max(0.55, R * 0.0022);
    for (let lat = -75; lat <= 75; lat += 7.5) {
      const coords: { lat: number; lon: number }[] = [];
      for (let lon = -180; lon <= 180; lon += 3) coords.push({ lat, lon });
      const equator = Math.abs(lat) < 0.01;
      c.strokeStyle = equator ? `rgba(${INK},0.34)` : `rgba(${INK},0.145)`;
      strokeGeoLine(c, coords);
    }
    for (let lon = -180; lon < 180; lon += 15) {
      const coords: { lat: number; lon: number }[] = [];
      for (let lat = -86; lat <= 86; lat += 3) coords.push({ lat, lon });
      c.strokeStyle = `rgba(${INK},0.115)`;
      strokeGeoLine(c, coords);
    }

    // Engraved wave / pressure curves, clipped in the globe, visually antique plate.
    c.strokeStyle = `rgba(${INK},0.065)`;
    c.lineWidth = Math.max(0.5, R * 0.002);
    for (let i = 0; i < 9; i++) {
      const rr = R * (0.28 + i * 0.072);
      c.beginPath();
      c.ellipse(R * 0.08, R * 0.02, rr * 1.06, rr * 0.42, (-18 + i * 9) * RAD, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  function drawPlateGrain(c: CanvasRenderingContext2D, rad: number): void {
    // Deterministic micro scratches; no Math.random flicker.
    c.save();
    c.strokeStyle = `rgba(${INK},0.08)`;
    c.lineWidth = 0.65;
    for (let i = 0; i < 95; i++) {
      const a = i * 137.508 * RAD;
      const rr = rad * (0.18 + ((i * 37) % 77) / 100);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      const len = rad * (0.01 + ((i * 13) % 17) / 900);
      c.beginPath();
      c.moveTo(x - len, y + len * 0.25);
      c.lineTo(x + len, y - len * 0.25);
      c.stroke();
    }
    c.restore();
  }

  /* =========================================================
     Orbites + globe (VERBATIM)
     ========================================================= */
  function drawOrbits(c: CanvasRenderingContext2D): void {
    c.save();
    c.translate(cx, cy);
    for (let i = 0; i < ORB.length; i++) {
      const o = ORB[i];
      c.save();
      c.rotate(o.rot * RAD);
      c.setLineDash(i % 2 ? [2, 9] : [1.5, 7]);
      c.lineWidth = 1;
      c.strokeStyle = `rgba(${INK},${i % 2 ? 0.18 : 0.235})`;
      c.beginPath();
      c.ellipse(0, 0, o.rx * S, o.ry * S, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    c.setLineDash([]);
    c.restore();
  }

  function drawGlobe(c: CanvasRenderingContext2D): void {
    const rad = R;
    c.save();
    c.translate(cx, cy);

    // White halo / paper burn around the globe, sitting on the electric blue.
    const halo = c.createRadialGradient(0, 0, rad * 0.55, 0, 0, rad * 2.0);
    halo.addColorStop(0, `rgba(${INK},0.18)`);
    halo.addColorStop(0.42, `rgba(${INK},0.075)`);
    halo.addColorStop(1, `rgba(${INK},0)`);
    c.fillStyle = halo;
    c.beginPath();
    c.arc(0, 0, rad * 2.0, 0, Math.PI * 2);
    c.fill();

    c.rotate(TILT);

    const AX = rad * 1.34;
    // Axis behind the globe: quiet interior line.
    c.lineWidth = Math.max(1, rad * 0.004);
    c.setLineDash([rad * 0.018, rad * 0.028]);
    c.strokeStyle = `rgba(${INK},0.20)`;
    c.beginPath();
    c.moveTo(0, -rad);
    c.lineTo(0, rad);
    c.stroke();
    c.setLineDash([]);

    // Volume: keep blue dominant, not pastel.
    const lg = c.createRadialGradient(-rad * 0.32, -rad * 0.34, rad * 0.05, rad * 0.1, rad * 0.1, rad * 1.15);
    lg.addColorStop(0, `rgba(${INK},0.13)`);
    lg.addColorStop(0.46, `rgba(${INK},0.045)`);
    lg.addColorStop(1, `rgba(5,10,120,0.16)`);
    c.beginPath();
    c.arc(0, 0, rad, 0, Math.PI * 2);
    c.fillStyle = lg;
    c.fill();

    c.save();
    c.beginPath();
    c.arc(0, 0, rad, 0, Math.PI * 2);
    c.clip();
    drawOceanEngraving(c);
    for (let i = 0; i < CONTINENTS.length; i++) drawLandMass(c, CONTINENTS[i], i);
    drawPlateGrain(c, rad);
    c.restore();

    // Limb: double etched outline, stronger than prototype wireframe.
    c.beginPath();
    c.arc(0, 0, rad, 0, Math.PI * 2);
    c.lineWidth = Math.max(1.7, rad * 0.007);
    c.strokeStyle = `rgba(${INK},0.98)`;
    c.stroke();
    c.beginPath();
    c.arc(0, 0, rad * 0.976, 0, Math.PI * 2);
    c.lineWidth = Math.max(0.7, rad * 0.0025);
    c.strokeStyle = `rgba(${INK},0.30)`;
    c.stroke();

    // Axis tips, clearly protruding at poles.
    c.setLineDash([rad * 0.018, rad * 0.026]);
    c.lineWidth = Math.max(1.25, rad * 0.005);
    c.strokeStyle = `rgba(${INK},0.88)`;
    c.beginPath();
    c.moveTo(0, -AX);
    c.lineTo(0, -rad);
    c.stroke();
    c.beginPath();
    c.moveTo(0, rad);
    c.lineTo(0, AX);
    c.stroke();
    c.setLineDash([]);
    c.lineWidth = Math.max(1, rad * 0.004);
    for (const yy of [-AX, AX]) {
      c.beginPath();
      c.moveTo(-rad * 0.028, yy);
      c.lineTo(rad * 0.028, yy);
      c.stroke();
      c.beginPath();
      c.arc(0, yy, Math.max(1.8, rad * 0.007), 0, Math.PI * 2);
      c.fillStyle = `rgba(${INK},0.92)`;
      c.fill();
    }

    c.restore();
  }

  function draw(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawOrbits(ctx);
    drawGlobe(ctx);
  }

  /* =========================================================
     Positionnement des satellites (VERBATIM)
     ========================================================= */
  function positionSats(): void {
    if (!S) return;
    for (let i = 0; i < satEls.length; i++) {
      const el = satEls[i];
      if (!el) continue;
      const o = ORB[i];
      const th = theta[i];
      const lx = o.rx * S * Math.cos(th);
      const ly = o.ry * S * Math.sin(th);
      const r = o.rot * RAD;
      const ca = Math.cos(r);
      const sa = Math.sin(r);
      const X = lx * ca - ly * sa;
      const Y = lx * sa + ly * ca;
      const depth = Math.sin(th);
      const f = (depth + 1) / 2;
      const sc = 0.8 + 0.24 * f;
      el.style.transform =
        'translate(-50%,-50%) translate(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      el.style.opacity = (0.5 + 0.5 * f).toFixed(3);
      el.style.zIndex = depth < 0 ? '8' : '16';
    }
  }

  /* =========================================================
     Boucle d'animation
     ========================================================= */
  let last = performance.now();
  let raf = 0;

  function loop(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const frozen = reduced || open != null;
    if (!frozen) {
      lon0 += dt * ROTATION_SPEED;
      for (let i = 0; i < ORB.length; i++) {
        if (!paused[i]) theta[i] += dt * ORB[i].sp * SATELLITE_SPEED;
      }
    }
    draw();
    positionSats();
    raf = requestAnimationFrame(loop);
  }

  /* =========================================================
     Branchements DOM
     ========================================================= */
  // Satellites : ouverture + hover/focus.
  satEls.forEach((el, i) => {
    const id = el.dataset.sat;
    el.addEventListener('click', () => {
      if (id) openSection(id);
    });
    el.addEventListener('mouseenter', () => hoverSat(i, true));
    el.addEventListener('mouseleave', () => hoverSat(i, false));
    el.addEventListener('focus', () => hoverSat(i, true));
    el.addEventListener('blur', () => hoverSat(i, false));
  });

  // Menu de repli : ouvrir / fermer / items / fond.
  document.querySelectorAll<HTMLElement>('[data-menu-toggle]').forEach((b) =>
    b.addEventListener('click', toggleMenu),
  );
  document.querySelectorAll<HTMLElement>('[data-menu-close]').forEach((b) =>
    b.addEventListener('click', closeMenu),
  );
  document.querySelectorAll<HTMLElement>('[data-menu-item]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.menuItem;
      if (id) openSection(id);
    }),
  );
  if (menu) {
    menu.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeMenu();
    });
  }
  // Le lien CV du menu ferme aussi le menu.
  document.querySelectorAll<HTMLElement>('[data-menu-cv]').forEach((a) =>
    a.addEventListener('click', closeMenu),
  );

  // Modale : fermeture + clic sur le fond.
  closeBtn?.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  }

  // Clavier global.
  document.addEventListener('keydown', onKey);

  // prefers-reduced-motion en direct.
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = (e: MediaQueryListEvent): void => {
    reduced = e.matches;
  };
  if (mq.addEventListener) mq.addEventListener('change', onMq);

  // ResizeObserver sur la scene (fallback resize fenetre).
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => resize());
    ro.observe(stage);
  } else {
    window.addEventListener('resize', resize);
  }

  // Indice de 1er chargement : ~5,4 s (cache si reduced-motion).
  if (hintEl) {
    if (reduced) hintEl.hidden = true;
    else window.setTimeout(() => (hintEl.hidden = true), 5400);
  }

  // Etat initial des couches pilotees par JS.
  syncModal();
  syncMenu();

  // Demarrage.
  resize();
  last = performance.now();
  raf = requestAnimationFrame(loop);

  // Nettoyage (HMR / navigation : evite les boucles rAF zombies).
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
  });
}
