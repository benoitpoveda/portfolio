/* =============================================================================
 * melt-background.js — Fond à distorsion temporelle (feedback WebGL)
 * -----------------------------------------------------------------------------
 * Effet : le décor de fond "fond" autour du curseur, est étiré dans le sens du
 * geste, puis se résorbe tout seul (mémoire temporelle via un champ de chaleur
 * en ping-pong). Aucune dépendance. ES module.
 *
 * PRINCIPE D'INTÉGRATION
 *   Ce module crée et gère SON PROPRE <canvas> plein cadre, posé EN FOND
 *   (z-index bas, pointer-events:none). Le globe et la navigation restent des
 *   éléments à part, NETS, posés AU-DESSUS. L'effet ne touche que le décor.
 *
 * USAGE MINIMAL
 *   import { MeltBackground } from './melt-background.js';
 *   const fx = new MeltBackground({ mount: document.body });
 *   // ... plus tard, si besoin :
 *   fx.destroy();
 *
 * USAGE AVEC TON DÉCOR
 *   // a) tu fournis une fonction qui peint le décor (recommandé) :
 *   new MeltBackground({ mount, draw: (ctx, w, h) => { ...ton fond... } });
 *   // b) ou une image déjà prête (capture / asset) :
 *   new MeltBackground({ mount, image: '/bg.jpg' });
 *
 * OPTIONS (toutes facultatives)
 *   mount      : élément hôte du canvas (défaut document.body)
 *   draw       : (ctx,w,h)=>void  — peint le décor sur un canvas 2D off-screen
 *   image      : string | HTMLImageElement | HTMLCanvasElement — décor en image
 *   zIndex     : z-index du canvas de fond (défaut "0")
 *   decay      : persistance/mémoire 0.80–0.99 (défaut 0.94)  ← cœur de l'effet
 *   amp        : intensité du déplacement (défaut 0.08)
 *   radius     : rayon du pinceau sous la souris (défaut 0.16)
 *   scale      : grain de la turbulence (défaut 4)
 *   idle       : point virtuel qui anime quand la souris est immobile (défaut true)
 *   respectReducedMotion : coupe l'animation si l'OS le demande (défaut true)
 * ========================================================================== */

export function createPortfolioDecor(cfg = {}) {
  // Décor par défaut "façon portfolio" — À ADAPTER aux couleurs/typo réelles.
  const o = Object.assign({
    name: ['BENOÎT', 'POVEDA'],
    colorTop: '#2e2fb8', colorBottom: '#23239a',
    ink: 'rgba(255,255,255,0.07)', line: 'rgba(255,255,255,0.05)',
    serif: 'Georgia, "Times New Roman", serif', globe: false,
  }, cfg);
  return (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.colorTop); g.addColorStop(1, o.colorBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = o.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(h * 0.32)}px ${o.serif}`;
    if (o.name[0]) ctx.fillText(o.name[0], w * 0.5, h * 0.27);
    if (o.name[1]) ctx.fillText(o.name[1], w * 0.5, h * 0.73);

    ctx.strokeStyle = o.line; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 4) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }

    if (o.globe) {
      const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.32;
      ctx.strokeStyle = 'rgba(220,230,255,0.85)'; ctx.lineWidth = Math.max(1, h / 520);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    }
  };
}

export class MeltBackground {
  constructor(options = {}) {
    if (typeof window === 'undefined') return; // garde SSR (Next/Astro/etc.)
    this.o = Object.assign({
      mount: document.body, zIndex: '0',
      decay: 0.94, amp: 0.08, radius: 0.16, scale: 4,
      idle: true, respectReducedMotion: true,
      draw: null, image: null,
    }, options);

    this.mouse = { x: 0.5, y: 0.55 };
    this.target = { x: 0.5, y: 0.55 };
    this.prevMouse = { x: 0.5, y: 0.55 };
    this.vel = { x: 0, y: 0 };
    this.lastMove = 0; this.idleAngle = 0;
    this.img = { w: 1, h: 1 }; this.hasBg = false;
    this.t0 = (performance || Date).now();

    this.reduced = this.o.respectReducedMotion &&
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._buildCanvas();
    try { this._initGL(); } catch (e) { this._fallback(e); return; }
    this._decorFn = this.o.draw || createPortfolioDecor();
    this._bindEvents();

    if (this.o.image) this.setImage(this.o.image);
    else this._redrawDecor();

    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  /* ---------- canvas plein cadre, en fond, non bloquant ---------- */
  _buildCanvas() {
    const c = document.createElement('canvas');
    Object.assign(c.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      display: 'block', zIndex: String(this.o.zIndex), pointerEvents: 'none',
    });
    const host = this.o.mount;
    // si l'hôte est statique, on le rend "positionné" pour l'inset:0
    const pos = getComputedStyle(host).position;
    if (host === document.body || pos === 'static') host.style.position ||= 'relative';
    host.prepend(c);
    this.canvas = c; this.host = host;
  }

  _fallback(err) {
    // pas de WebGL : on peint le décor en 2D, sans animation (dégradé gracieux)
    console.warn('[MeltBackground] WebGL indisponible, fond statique :', err && err.message);
    const c = this.canvas, ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.width = Math.round(this.host.clientWidth * dpr);
    const h = c.height = Math.round(this.host.clientHeight * dpr);
    (this.o.draw || createPortfolioDecor())(ctx, w, h);
  }

  /* ---------- shaders + ressources GL ---------- */
  _sh(t, src) { const gl = this.gl, s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  _prog(vs, fs) { const gl = this.gl, p = gl.createProgram();
    gl.attachShader(p, this._sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, this._sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }

  _initGL() {
    const gl = this.canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('contexte webgl nul');
    this.gl = gl;

    const VS = `attribute vec2 aPos; varying vec2 vUv;
      void main(){ vUv = aPos*0.5+0.5; gl_Position=vec4(aPos,0.0,1.0); }`;

    const HEAT = `precision highp float; varying vec2 vUv;
      uniform sampler2D uPrev; uniform vec2 uMouse; uniform float uRadius,uDecay,uStrength,uAspect;
      void main(){
        float prev = texture2D(uPrev, vUv).r;
        vec2 d = (vUv - uMouse) * vec2(uAspect,1.0);
        float brush = smoothstep(uRadius, 0.0, length(d)) * uStrength;
        gl_FragColor = vec4(vec3(max(prev*uDecay, brush)), 1.0);
      }`;

    const COMP = `precision highp float; varying vec2 vUv;
      uniform sampler2D uBg, uHeat; uniform float uTime,uAmp,uScale; uniform vec2 uCanvas,uImage,uVel;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
      float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p);
        float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.0-2.0*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
      float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*vnoise(p); p*=2.02; a*=0.5; } return v; }
      vec2 cover(vec2 uv){ vec2 r=vec2(
        min((uCanvas.x/uCanvas.y)/(uImage.x/uImage.y),1.0),
        min((uCanvas.y/uCanvas.x)/(uImage.y/uImage.x),1.0));
        return vec2(uv.x*r.x+(1.0-r.x)*0.5, uv.y*r.y+(1.0-r.y)*0.5); }
      void main(){
        float h = texture2D(uHeat, vUv).r;
        vec2 p = vUv*uScale + vec2(uTime*0.06, uTime*0.045);
        vec2 flow = (vec2(fbm(p), fbm(p+19.7)) - 0.5) * 2.0;
        flow *= vec2(1.8, 0.9);
        vec2 disp = flow + uVel * 22.0;
        gl_FragColor = vec4(texture2D(uBg, cover(vUv + disp * h * uAmp)).rgb, 1.0);
      }`;

    this.pHeat = this._prog(VS, HEAT);
    this.pComp = this._prog(VS, COMP);

    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const p of [this.pHeat, this.pComp]) {
      const l = gl.getAttribLocation(p, 'aPos');
      gl.useProgram(p); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    }
    // cache des uniformes
    this.uH = this._uniforms(this.pHeat, ['uPrev', 'uMouse', 'uRadius', 'uDecay', 'uStrength', 'uAspect']);
    this.uC = this._uniforms(this.pComp, ['uBg', 'uHeat', 'uTime', 'uAmp', 'uScale', 'uCanvas', 'uImage', 'uVel']);

    this.bg = gl.createTexture(); this._texParams(this.bg);
    gl.clearColor(0.04, 0.06, 0.18, 1);
  }
  _uniforms(p, names) { const gl = this.gl, m = {}; names.forEach(n => m[n] = gl.getUniformLocation(p, n)); return m; }
  _texParams(tex) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); }

  _makeTarget(w, h) {
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this._texParams(tex);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  }

  /* ---------- API publique ---------- */
  setOptions(o) { Object.assign(this.o, o); }

  // Repeint le décor (utile après le chargement d'une police web, p.ex.).
  redraw() { this._redrawDecor(); }

  setImage(src) {
    if (typeof src === 'string') {
      const img = new Image();
      if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
      img.onload = () => this._uploadBg(img, img.naturalWidth, img.naturalHeight);
      img.onerror = () => console.warn('[MeltBackground] image illisible (CORS ?)');
      img.src = src;
    } else this._uploadBg(src, src.naturalWidth || src.width, src.naturalHeight || src.height);
  }

  _uploadBg(source, w, h) {
    if (!this.gl) return;
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.bg);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    this.img = { w: w || 1, h: h || 1 }; this.hasBg = true;
  }

  // (re)peint le décor via la fonction draw, à la résolution exacte du canvas
  _redrawDecor() {
    if (this.o.image) return;        // mode image : rien à redessiner
    const c = document.createElement('canvas');
    c.width = Math.max(2, this.canvas.width); c.height = Math.max(2, this.canvas.height);
    const ctx = c.getContext('2d');
    this._decorFn(ctx, c.width, c.height);
    this._uploadBg(c, c.width, c.height);
  }

  /* ---------- entrées / dimensionnement ---------- */
  _bindEvents() {
    // canvas en pointer-events:none → on écoute la souris sur la fenêtre
    this._onMove = e => {
      const r = this.canvas.getBoundingClientRect();
      this.target.x = (e.clientX - r.left) / r.width;
      this.target.y = 1 - (e.clientY - r.top) / r.height;
      this.lastMove = (performance || Date).now();
    };
    window.addEventListener('pointermove', this._onMove, { passive: true });

    this._resize();
    if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this.host); }
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round((this.host.clientWidth || window.innerWidth) * dpr));
    const h = Math.max(2, Math.round((this.host.clientHeight || window.innerHeight) * dpr));
    if (this.canvas.width === w && this.canvas.height === h && this.A) return;
    this.canvas.width = w; this.canvas.height = h;
    if (this.gl) {
      const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);  // chaleur en demi-résolution
      this.A = this._makeTarget(hw, hh); this.B = this._makeTarget(hw, hh);
      this._redrawDecor();  // le décor doit suivre la nouvelle taille
    } else {
      this._fallback();     // mode 2D statique
    }
  }

  /* ---------- boucle ---------- */
  _loop() {
    const gl = this.gl, o = this.o, now = (performance || Date).now(), time = (now - this.t0) / 1000;

    // point actif : souris, sinon orbite virtuelle (si idle activé)
    let tx = this.target.x, ty = this.target.y;
    if (this.o.idle && now - this.lastMove > 1500) {
      this.idleAngle += 0.012;
      tx = 0.5 + 0.26 * Math.cos(this.idleAngle * 0.9);
      ty = 0.58 + 0.16 * Math.sin(this.idleAngle * 1.3);
    }
    this.mouse.x += (tx - this.mouse.x) * 0.18;
    this.mouse.y += (ty - this.mouse.y) * 0.18;
    this.vel.x += ((this.mouse.x - this.prevMouse.x) - this.vel.x) * 0.35;
    this.vel.y += ((this.mouse.y - this.prevMouse.y) - this.vel.y) * 0.35;
    this.prevMouse.x = this.mouse.x; this.prevMouse.y = this.mouse.y;

    const aspect = this.canvas.width / this.canvas.height;
    const strength = this.reduced ? 0.0 : 1.0;   // accessibilité : pas de mouvement

    // passe 1 — chaleur
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.B.fb);
    gl.viewport(0, 0, this.B.w, this.B.h);
    gl.useProgram(this.pHeat);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.A.tex);
    gl.uniform1i(this.uH.uPrev, 0);
    gl.uniform2f(this.uH.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uH.uRadius, o.radius);
    gl.uniform1f(this.uH.uDecay, o.decay);
    gl.uniform1f(this.uH.uStrength, strength);
    gl.uniform1f(this.uH.uAspect, aspect);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const tmp = this.A; this.A = this.B; this.B = tmp;

    // passe 2 — composition à l'écran
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.hasBg) {
      gl.useProgram(this.pComp);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.bg);
      gl.uniform1i(this.uC.uBg, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.A.tex);
      gl.uniform1i(this.uC.uHeat, 1);
      gl.uniform1f(this.uC.uTime, time);
      gl.uniform1f(this.uC.uAmp, o.amp);
      gl.uniform1f(this.uC.uScale, o.scale);
      gl.uniform2f(this.uC.uCanvas, this.canvas.width, this.canvas.height);
      gl.uniform2f(this.uC.uImage, this.img.w, this.img.h);
      gl.uniform2f(this.uC.uVel, this.vel.x, this.vel.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    this._raf = requestAnimationFrame(this._loop);
  }

  /* ---------- nettoyage (à appeler au démontage / changement de route) ---------- */
  destroy() {
    cancelAnimationFrame(this._raf);
    if (this._onMove) window.removeEventListener('pointermove', this._onMove);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._ro) this._ro.disconnect();
    if (this.gl) { const e = this.gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}

export default MeltBackground;
