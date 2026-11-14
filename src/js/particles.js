/**
 * Campo de partículas — "materia oscura".
 *
 * Dos vidas:
 *   1. INTRO   scatter -> converge (forman el logo) -> dissolve
 *   2. AMBIENTE  deriva lenta de fondo, barata, pausada en pestaña oculta
 *
 * En modo ambiente el campo tiene gravedad: los atractores (puntero, botones,
 * el logo del diagrama) curvan la deriva de lo que pasa cerca, lo acumulan y
 * lo encienden. Es la misma idea de la intro —materia dispersa que converge—
 * puesta en manos del que navega. Ver gravity.js para quién los pone.
 *
 * Un solo canvas, un solo rAF. Sin dependencias.
 */

const MODE = {
  IDLE: "idle",
  SCATTER: "scatter",
  CONVERGE: "converge",
  DISSOLVE: "dissolve",
  AMBIENT: "ambient",
};

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutQuart = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * Sprite de resplandor: un degradado radial frío pintado UNA vez en un canvas
 * chico. Las partículas calientes lo estampan con drawImage, que es mucho más
 * barato que un gradiente por partícula y no se ve como un cuadrado.
 */
function makeGlowSprite() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(226, 243, 255, 0.9)");
  g.addColorStop(0.22, "rgba(169, 220, 255, 0.45)");
  g.addColorStop(0.55, "rgba(169, 220, 255, 0.1)");
  g.addColorStop(1, "rgba(169, 220, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export class ParticleField {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.particles = [];
    this.mode = MODE.IDLE;
    this.raf = 0;
    this.running = false;
    // Las fases se miden en tiempo real (performance.now), NO en deltas
    // acumulados: si el navegador tira frames o throttlea la pestaña, la
    // animación tiene que seguir coincidiendo con los tiempos de la intro.
    this.phaseStart = 0;
    this.dpr = 1;
    this.w = 0;
    this.h = 0;

    /* Gravedad (solo en AMBIENT). id -> { x, y, r, k, glow } en px de viewport. */
    this.attractors = new Map();
    /* Desplazamiento de scroll todavía no aplicado: se consume con inercia. */
    this.scrollDebt = 0;
    this.glow = makeGlowSprite();

    this.onResize = this.onResize.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.tick = this.tick.bind(this);

    this.resize();
    window.addEventListener("resize", this.onResize, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /* ---------------------------------------------------------------- setup */

  get isSmall() {
    return window.innerWidth < 760;
  }

  /** Cuántas partículas tiene sentido mover en este dispositivo. */
  get budget() {
    return this.isSmall ? 520 : 1100;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  onResize() {
    const wasAmbient = this.mode === MODE.AMBIENT;
    this.resize();
    // Durante la intro no reubicamos nada: cortaría el viaje a medio camino.
    if (wasAmbient) this.seedAmbient();
  }

  onVisibility() {
    if (document.hidden) {
      this.stop();
    } else if (this.mode !== MODE.IDLE) {
      this.start();
    }
  }

  /* ---------------------------------------------------------------- bucle */

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.particles = [];
  }

  tick(now) {
    if (!this.running) return;
    // dt acotado (solo para la deriva del modo ambiente).
    const dt = Math.min(now - this.last, 48);
    this.last = now;
    this.update(dt, now);
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  }

  /* --------------------------------------------------------------- fases */

  /** Fase 1: partículas dispersas flotando en el negro. */
  scatter() {
    const n = this.budget;
    const list = new Array(n);
    const cx = this.w / 2;
    const cy = this.h / 2;
    const reach = Math.max(this.w, this.h) * 0.78;

    for (let i = 0; i < n; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const rad = reach * Math.sqrt(rand(0.12, 1));
      list[i] = {
        x: cx + Math.cos(ang) * rad,
        y: cy + Math.sin(ang) * rad,
        ox: 0,
        oy: 0,
        tx: 0,
        ty: 0,
        cx: 0,
        cy: 0,
        vx: rand(-0.012, 0.012),
        vy: rand(-0.012, 0.012),
        size: Math.random() < 0.09 ? rand(1.8, 2.6) : rand(0.7, 1.5),
        alpha: 0,
        maxAlpha: rand(0.35, 1),
        delay: rand(0, 380),
        dur: 0,
        twinkle: Math.random() * Math.PI * 2,
        bright: Math.random() < 0.08,
      };
    }

    this.particles = list;
    this.mode = MODE.SCATTER;
    this.phaseStart = performance.now();
    this.start();
  }

  /**
   * Fase 2: cada partícula viaja a su píxel del logo.
   * @param {{x:number,y:number}[]} points offsets respecto del centro del logo
   * @param {number} centerX
   * @param {number} centerY
   * @param {number} duration ms del viaje (sin contar el stagger)
   */
  converge(points, centerX, centerY, duration = 1250) {
    if (!points.length) return;
    const list = this.particles;

    for (let i = 0; i < list.length; i += 1) {
      const p = list[i];
      const target = points[i % points.length];
      p.ox = p.x;
      p.oy = p.y;
      p.tx = centerX + target.x;
      p.ty = centerY + target.y;

      // Punto de control: una curva suave en vez de una línea recta.
      const mx = (p.ox + p.tx) / 2;
      const my = (p.oy + p.ty) / 2;
      const dx = p.tx - p.ox;
      const dy = p.ty - p.oy;
      const bend = rand(-0.22, 0.22);
      p.cx = mx - dy * bend;
      p.cy = my + dx * bend;

      p.delay = rand(0, 320);
      p.dur = duration + rand(-120, 160);
      p.startAlpha = p.alpha;
    }

    this.mode = MODE.CONVERGE;
    this.phaseStart = performance.now();
  }

  /** Fase 3: se apagan mientras el logo nítido toma su lugar. */
  dissolve(duration = 320) {
    this.dissolveDur = duration;
    this.mode = MODE.DISSOLVE;
    this.phaseStart = performance.now();
    for (const p of this.particles) p.startAlpha = p.alpha;
  }

  /** Vida 2: fondo. Deriva lenta, en tres planos de profundidad. */
  toAmbient() {
    this.seedAmbient();
    this.mode = MODE.AMBIENT;
    this.phaseStart = performance.now();
    this.start();
  }

  /**
   * Tres planos: lejano (chico, tenue, lento), medio y cercano (mas grande,
   * mas brillante, mas rapido). La diferencia de velocidad y tamaño entre
   * planos es lo que hace que el fondo se lea como espacio con profundidad
   * y no como un puñado de puntos sueltos sobre negro.
   *
   * Siguen siendo fillRect sin sombras: a 320 particulas no se nota en el
   * frame budget, y se pausa solo cuando la pestaña queda oculta.
   */
  seedAmbient() {
    const n = this.isSmall ? 140 : 320;
    const list = new Array(n);

    for (let i = 0; i < n; i += 1) {
      const depth = Math.random();          // 0 = lejos, 1 = cerca
      const near = depth > 0.82;

      list[i] = {
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        depth,
        vx: rand(-0.006, 0.006) * (0.4 + depth),
        vy: rand(-0.016, -0.003) * (0.4 + depth),
        // Velocidad "prestada" por los atractores. Se amortigua sola, así que
        // cuando la gravedad se va, la partícula vuelve a su deriva.
        ex: 0,
        ey: 0,
        heat: 0,
        size: near ? rand(1.5, 2.4) : rand(0.6, 1.1) + depth * 0.5,
        alpha: 0,
        maxAlpha: 0.12 + depth * 0.46,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: rand(0.0004, 0.0016),
        bright: near && Math.random() < 0.45,
      };
    }

    this.particles = list;
  }

  /* ------------------------------------------------------------ gravedad */

  /**
   * Pone (o mueve) un atractor. Solo actúa en modo ambiente.
   * @param {string} id
   * @param {{x:number,y:number,r?:number,k?:number,glow?:number}} a
   *   x,y en px de viewport · r radio de influencia · k intensidad
   *   (px/ms²: ~0.0003 débil, ~0.0007 fuerte) · glow 0..1 cuánto enciende.
   */
  setAttractor(id, a) {
    const prev = this.attractors.get(id);
    if (prev) {
      prev.x = a.x;
      prev.y = a.y;
      if (a.r != null) prev.r = a.r;
      if (a.k != null) prev.k = a.k;
      if (a.glow != null) prev.glow = a.glow;
      return;
    }
    this.attractors.set(id, {
      x: a.x,
      y: a.y,
      r: a.r == null ? 180 : a.r,
      k: a.k == null ? 0.0003 : a.k,
      glow: a.glow == null ? 1 : a.glow,
    });
  }

  removeAttractor(id) {
    this.attractors.delete(id);
  }

  /** Avisa cuánto se scrolleó: el campo lo acompaña con inercia. */
  nudgeScroll(deltaY) {
    this.scrollDebt += deltaY;
  }

  /* -------------------------------------------------------------- update */

  update(dt, now) {
    const elapsed = now - this.phaseStart;

    switch (this.mode) {
      case MODE.SCATTER: {
        for (const p of this.particles) {
          const local = elapsed - p.delay;
          if (local > 0) p.alpha = Math.min(p.maxAlpha, local / 420);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.twinkle += 0.0016 * dt;
        }
        break;
      }

      case MODE.CONVERGE: {
        for (const p of this.particles) {
          const local = elapsed - p.delay;
          if (local <= 0) continue;
          const raw = Math.min(1, local / p.dur);
          const e = easeInOutQuart(raw);
          const inv = 1 - e;
          // Bézier cuadrática: origen -> control -> destino
          p.x = inv * inv * p.ox + 2 * inv * e * p.cx + e * e * p.tx;
          p.y = inv * inv * p.oy + 2 * inv * e * p.cy + e * e * p.ty;
          // Al llegar se afirman: suben a alfa plena.
          p.alpha = p.startAlpha + (1 - p.startAlpha) * easeOutExpo(raw);
        }
        break;
      }

      case MODE.DISSOLVE: {
        const k = Math.min(1, elapsed / (this.dissolveDur || 320));
        const fade = 1 - easeOutExpo(k);
        for (const p of this.particles) {
          p.alpha = p.startAlpha * fade;
          p.x += (p.tx - p.x) * 0.2;
          p.y += (p.ty - p.y) * 0.2;
        }
        break;
      }

      case MODE.AMBIENT: {
        const fadeIn = Math.min(1, elapsed / 900);
        const atts = this.attractors.size ? Array.from(this.attractors.values()) : null;
        // Inercia de scroll: el campo acompaña el scroll con retraso y se
        // asienta. Cada frame consume una fracción de lo que falta aplicar.
        const shift = this.scrollDebt * (1 - Math.exp(-dt / 140));
        this.scrollDebt -= shift;
        // Amortiguación de la velocidad prestada (tau ~ 650 ms).
        const damp = Math.exp(-dt / 650);
        const h = this.h;
        const w = this.w;

        for (const p of this.particles) {
          let heat = 0;

          if (atts) {
            for (let i = 0; i < atts.length; i += 1) {
              const a = atts[i];
              const dx = a.x - p.x;
              const dy = a.y - p.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= a.r * a.r) continue;
              const d = Math.sqrt(d2) || 1;
              const t = 1 - d / a.r;            // 0 en el borde, 1 en el centro
              let f = a.k * t * t;
              // Núcleo blando: cerca del centro la fuerza cae, así la materia
              // se acumula en una nube alrededor y no se clava en un punto.
              const core = a.r * 0.22;
              if (d < core) f *= d / core;
              const ux = dx / d;
              const uy = dy / d;
              // Atracción radial + un poco de órbita: entra en espiral.
              p.ex += (ux - uy * 0.45) * f * dt;
              p.ey += (uy + ux * 0.45) * f * dt;
              if (t * a.glow > heat) heat = t * a.glow;
            }
          }

          p.ex *= damp;
          p.ey *= damp;
          // Tope de velocidad: nada cruza la pantalla de un tirón.
          const sp = p.ex * p.ex + p.ey * p.ey;
          if (sp > 0.0324) {
            const s = 0.18 / Math.sqrt(sp);
            p.ex *= s;
            p.ey *= s;
          }

          p.x += (p.vx + p.ex) * dt;
          p.y += (p.vy + p.ey) * dt - shift * (0.04 + p.depth * 0.16);
          p.twinkle += p.twinkleSpeed * dt;

          if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
          else if (p.y > h + 8) { p.y = -8; p.x = Math.random() * w; }
          if (p.x < -8) p.x = w + 8;
          else if (p.x > w + 8) p.x = -8;

          const pulse = 0.65 + 0.35 * Math.sin(p.twinkle);
          p.heat = heat;
          p.alpha = Math.min(1, p.maxAlpha * pulse + heat * 0.7) * fadeIn;
        }
        break;
      }

      default:
        break;
    }
  }

  /* ---------------------------------------------------------------- draw */

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    const glow = this.glow;

    for (const p of this.particles) {
      if (p.alpha <= 0.004) continue;
      const heat = p.heat || 0;

      if (heat > 0.08 && glow) {
        // Cerca de un atractor la partícula se enciende: resplandor frío que
        // crece con el calor. Un drawImage del sprite, nada de shadowBlur.
        ctx.globalAlpha = Math.min(1, p.alpha * (0.3 + heat * 0.7));
        const g = p.size * (7 + heat * 9);
        ctx.drawImage(glow, p.x - g / 2, p.y - g / 2, g, g);
      } else if (p.bright) {
        // Halo barato: un rect más grande a alfa muy baja.
        ctx.globalAlpha = p.alpha * 0.1;
        ctx.fillStyle = "#a9dcff";
        const g = p.size * 4;
        ctx.fillRect(p.x - g / 2, p.y - g / 2, g, g);
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = heat > 0.08 || p.bright ? "#e2f3ff" : "#ffffff";
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.globalAlpha = 1;
  }
}

export { MODE };
