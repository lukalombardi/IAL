/**
 * Campo de partículas — "materia oscura".
 *
 * Dos vidas:
 *   1. INTRO   scatter -> converge (forman el logo) -> dissolve
 *   2. AMBIENTE  deriva lenta de fondo, barata, pausada en pestaña oculta
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
   * Siguen siendo fillRect sin sombras: a 230 particulas no se nota en el
   * frame budget, y se pausa solo cuando la pestaña queda oculta.
   */
  seedAmbient() {
    const n = this.isSmall ? 110 : 230;
    const list = new Array(n);

    for (let i = 0; i < n; i += 1) {
      const depth = Math.random();          // 0 = lejos, 1 = cerca
      const near = depth > 0.82;

      list[i] = {
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: rand(-0.006, 0.006) * (0.4 + depth),
        vy: rand(-0.016, -0.003) * (0.4 + depth),
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
        for (const p of this.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.twinkle += p.twinkleSpeed * dt;
          if (p.y < -8) { p.y = this.h + 8; p.x = Math.random() * this.w; }
          if (p.x < -8) p.x = this.w + 8;
          else if (p.x > this.w + 8) p.x = -8;
          const pulse = 0.65 + 0.35 * Math.sin(p.twinkle);
          p.alpha = p.maxAlpha * pulse * fadeIn;
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

    for (const p of this.particles) {
      if (p.alpha <= 0.004) continue;

      if (p.bright) {
        // Halo barato: un rect más grande a alfa muy baja. Nada de shadowBlur.
        ctx.globalAlpha = p.alpha * 0.1;
        ctx.fillStyle = "#a9dcff";
        const g = p.size * 4;
        ctx.fillRect(p.x - g / 2, p.y - g / 2, g, g);
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.bright ? "#e2f3ff" : "#ffffff";
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.globalAlpha = 1;
  }
}

export { MODE };
