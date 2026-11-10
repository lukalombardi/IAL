/**
 * Intro: de materia dispersa a logo, y del centro al header.
 *
 * Línea de tiempo (ms desde el arranque):
 *    0     partículas dispersas flotando, fade in
 *  520     convergen hacia los píxeles del logo (destinos leídos con getImageData)
 * 2090     el logo nítido toma el lugar de las partículas, que se apagan
 * 2400     el logo viaja al header achicándose + se revelan las secciones
 * 3380     limpieza: el campo pasa a modo ambiente
 *
 * Se puede saltar en cualquier momento (botón, tecla, scroll o click).
 * Con prefers-reduced-motion este módulo ni se carga.
 */

import { ParticleField } from "./particles.js";
import { sampleLogoPoints } from "./logo.js";

const T = {
  scatter: 0,
  converge: 520,
  consolidate: 2090,
  travel: 2400,
  cleanup: 3380,
};

const TRAVEL_MS = 950;

export function runIntro({ canvas, introLogo, skipButton, brandMark }) {
  const root = document.documentElement;
  const field = new ParticleField(canvas);
  if (import.meta.env && import.meta.env.DEV) window.__ialField = field;
  const timers = [];
  let done = false;

  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0; };

  /* ---- revelado escalonado de las secciones ---------------------------- */

  function revealSections() {
    const items = document.querySelectorAll("[data-reveal]");
    items.forEach((el, i) => {
      el.style.transitionDelay = Math.min(i * 55, 600) + "ms";
    });
    root.classList.remove("is-intro");
  }

  /** Delays de stagger fuera: no deben arrastrarse a futuras transiciones. */
  function clearRevealDelays() {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.transitionDelay = "";
    });
  }

  /* ---- vuelo del logo al header (FLIP) --------------------------------- */

  function flyToHeader() {
    const from = introLogo.getBoundingClientRect();
    const to = brandMark.getBoundingClientRect();
    if (!from.width || !to.width) return finish();

    const scale = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    root.classList.add("is-landing");
    introLogo.style.transition =
      "transform " + TRAVEL_MS + "ms var(--ease-travel)";
    // Un tercio de vuelta mientras viaja: el trébol vuelve a caer en su eje.
    introLogo.style.transform =
      "translate(" + dx + "px, " + dy + "px) rotate(120deg) scale(" + scale + ")";
  }

  /* ---- final ----------------------------------------------------------- */

  function finish() {
    if (done) return;
    done = true;
    clearAll();

    root.classList.remove("is-intro", "is-landing");
    clearRevealDelays();

    introLogo.style.transition = "opacity 180ms linear";
    introLogo.style.opacity = "0";

    detachSkip();
    field.toAmbient();
  }

  /* ---- saltar ---------------------------------------------------------- */

  const skipEvents = ["keydown", "wheel", "touchstart", "pointerdown"];
  function onSkip(e) {
    if (e && e.type === "keydown" && e.key === "Tab") return; // tabular no salta
    finish();
  }
  function detachSkip() {
    skipEvents.forEach((n) => window.removeEventListener(n, onSkip));
    if (skipButton) skipButton.removeEventListener("click", onSkip);
  }
  skipEvents.forEach((n) =>
    window.addEventListener(n, onSkip, { passive: true, once: true })
  );
  if (skipButton) skipButton.addEventListener("click", onSkip);

  /* ---- arranque -------------------------------------------------------- */

  field.scatter();

  at(T.converge, () => {
    if (done) return;
    const rect = introLogo.getBoundingClientRect();
    const size = rect.width || 200;
    const points = sampleLogoPoints(size, field.particles.length);
    if (!points.length) return finish();
    field.converge(
      points,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      T.consolidate - T.converge - 320
    );
  });

  at(T.consolidate, () => {
    if (done) return;
    introLogo.style.transition = "opacity 280ms var(--ease-out)";
    introLogo.style.opacity = "1";
    field.dissolve(320);
  });

  at(T.travel, () => {
    if (done) return;
    flyToHeader();
    revealSections();
  });

  at(T.cleanup, () => {
    if (done) return;
    done = true;
    clearAll();
    root.classList.remove("is-intro", "is-landing");
    clearRevealDelays();
    introLogo.style.transition = "opacity 160ms linear";
    introLogo.style.opacity = "0";
    detachSkip();
    field.toAmbient();
  });

  return field;
}
