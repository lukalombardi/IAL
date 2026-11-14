/**
 * Gravedad: quién pone atractores en el campo de partículas, y cuándo.
 *
 * El campo (particles.js) solo sabe de puntos que atraen. Acá se decide qué
 * de la página atrae:
 *
 *   - El puntero, si es fino (mouse / trackpad): un pozo débil que lo sigue.
 *     La materia se curva hacia donde mirás, sin encenderse del todo.
 *   - [data-attract]: los botones que importan. Al pasar el mouse o llegar
 *     con Tab, la materia se junta alrededor y brilla. En touch, un pulso
 *     corto al tocar, que se ve mientras la página scrollea al destino.
 *   - [data-attract-view]: elementos que atraen mientras están en pantalla
 *     (el logo del diagrama "una sola solución").
 *   - El scroll: se le avisa al campo para que acompañe con inercia.
 *
 * Todo en coordenadas de viewport. Nada acá corre si no hay campo (reduced
 * motion), y nada toca el DOM: solo escucha.
 */

const POINTER = { r: 220, k: 0.00028, glow: 0.45 };
const CTA = { k: 0.0009, glow: 1 };
const VIEW = { r: 300, k: 0.00065, glow: 0.85 };

export function initGravity(field) {
  if (!field) return;

  const fine =
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---- atractores anclados a un elemento ---------------------------------
     Guardamos el elemento, no la posición: al scrollear o redimensionar se
     vuelve a medir. Un getBoundingClientRect por atractor activo por evento
     de scroll, que son uno o dos a la vez.                                  */

  const anchored = new Map();

  function place(id, el, opts) {
    const rc = el.getBoundingClientRect();
    field.setAttractor(id, {
      x: rc.left + rc.width / 2,
      y: rc.top + rc.height / 2,
      r: opts.r != null ? opts.r : Math.max(rc.width, rc.height) * 0.9 + 170,
      k: opts.k,
      glow: opts.glow,
    });
    anchored.set(id, { el, opts });
  }

  function lift(id) {
    anchored.delete(id);
    field.removeAttractor(id);
  }

  function refresh() {
    anchored.forEach(({ el, opts }, id) => place(id, el, opts));
  }

  /* ---- scroll: inercia + reubicar anclados ------------------------------ */

  let lastY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      field.nudgeScroll(y - lastY);
      lastY = y;
      if (anchored.size) refresh();
    },
    { passive: true }
  );
  window.addEventListener("resize", refresh, { passive: true });

  /* ---- puntero ---------------------------------------------------------- */

  if (fine) {
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        field.setAttractor("pointer", { x: e.clientX, y: e.clientY, ...POINTER });
      },
      { passive: true }
    );
    const drop = () => field.removeAttractor("pointer");
    document.documentElement.addEventListener("mouseleave", drop);
    window.addEventListener("blur", drop);
  }

  /* ---- botones principales ---------------------------------------------- */

  document.querySelectorAll("[data-attract]").forEach((el, i) => {
    const id = "cta-" + i;
    let pulse = 0;

    if (fine) {
      el.addEventListener("pointerenter", () => place(id, el, CTA));
      el.addEventListener("pointerleave", () => lift(id));
    } else {
      // Sin hover: un pulso al tocar. Dura lo que tarda el scroll al destino.
      el.addEventListener(
        "pointerdown",
        () => {
          place(id, el, CTA);
          clearTimeout(pulse);
          pulse = setTimeout(() => lift(id), 900);
        },
        { passive: true }
      );
    }

    // Paridad con teclado: el foco visible atrae igual que el hover.
    el.addEventListener("focus", () => {
      if (el.matches(":focus-visible")) place(id, el, CTA);
    });
    el.addEventListener("blur", () => lift(id));
  });

  /* ---- mientras está en pantalla ---------------------------------------- */

  const viewed = document.querySelectorAll("[data-attract-view]");
  if (viewed.length && "IntersectionObserver" in window) {
    const ids = new Map();
    viewed.forEach((el, i) => ids.set(el, "view-" + i));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = ids.get(entry.target);
          if (entry.isIntersecting) place(id, entry.target, VIEW);
          else lift(id);
        });
      },
      { rootMargin: "-8% 0px -8% 0px", threshold: 0.5 }
    );
    viewed.forEach((el) => io.observe(el));
  }
}

/**
 * Marca con .is-inview los [data-inview] la primera vez que entran en
 * pantalla. Lo usa el diagrama de integración para dibujar sus líneas una
 * sola vez, cuando el lector llega. No es gravedad, pero es la misma
 * observación de viewport, así que vive acá.
 */
export function initInView() {
  const items = document.querySelectorAll("[data-inview]");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-inview"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );
  items.forEach((el) => io.observe(el));
}
