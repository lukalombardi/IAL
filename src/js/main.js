/* El CSS entra por <link> en index.html, no por import:
   así bloquea el primer pintado y la intro nunca muestra la página
   armada para después esconderla. */

import { initNav } from "./nav.js";
import { initContact } from "./contact.js";
import { initPointerGlow } from "./pointer.js";
import { initGravity, initInView } from "./gravity.js";

const root = document.documentElement;

/* ---- cosas que pasan siempre, haya o no animación ---------------------- */

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

initNav();
initContact();
initPointerGlow();
initInView();

/* ---- intro ------------------------------------------------------------- */
/* El script del <head> puso .is-intro solo si no hay prefers-reduced-motion.
   Si no está, la página ya se ve completa y acá no hacemos nada más.        */

if (root.classList.contains("is-intro")) {
  const canvas = document.getElementById("field");
  const introLogo = document.getElementById("introLogo");
  const brandMark = document.getElementById("brandMark");
  const skipButton = document.getElementById("introSkip");

  if (canvas && introLogo && brandMark) {
    import("./intro.js")
      .then(({ runIntro }) => {
        // El campo sobrevive a la intro como fondo; la gravedad lo usa.
        const field = runIntro({ canvas, introLogo, skipButton, brandMark });
        initGravity(field);
      })
      .catch(() => {
        // Si la intro no carga, la página igual queda completa y legible.
        root.classList.remove("is-intro", "is-landing");
      });
  } else {
    root.classList.remove("is-intro");
  }
}
