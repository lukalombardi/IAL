/** Header: fondo al despegar del tope, menú en angosto y sección activa. */

/**
 * En angosto la nav se colapsa en un panel desplegable. Los destinos son los
 * mismos (una sola lista de links, no dos), así que la sección activa sigue
 * funcionando igual. Escape cierra y devuelve el foco al botón.
 */
function initNavMenu(header) {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("nav");
  if (!header || !toggle || !nav) return;

  const isOpen = () => header.getAttribute("data-nav") === "open";

  const setOpen = (open) => {
    header.setAttribute("data-nav", open ? "open" : "closed");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };

  const close = ({ restoreFocus = false } = {}) => {
    if (!isOpen()) return;
    setOpen(false);
    if (restoreFocus) toggle.focus();
  };

  setOpen(false);

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  // Elegir un destino cierra el panel.
  nav.addEventListener("click", (event) => {
    if (event.target.closest(".nav__link")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close({ restoreFocus: true });
  });

  // Tocar fuera del header cierra.
  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !header.contains(event.target)) close();
  });

  // Al pasar a ancho, el panel deja de existir: no dejamos el estado colgado.
  const wide = window.matchMedia("(min-width: 861px)");
  const onChange = (event) => { if (event.matches) close(); };
  if (wide.addEventListener) wide.addEventListener("change", onChange);
  else wide.addListener(onChange);
}

export function initNav() {
  const header = document.getElementById("header");
  const links = Array.from(document.querySelectorAll(".nav__link"));

  initNavMenu(header);

  /* ---- fondo del header ------------------------------------------------ */
  if (header) {
    let stuck = false;
    const onScroll = () => {
      const next = window.scrollY > 12;
      if (next !== stuck) {
        stuck = next;
        header.classList.toggle("is-stuck", stuck);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- sección activa --------------------------------------------------- */
  if (!links.length || !("IntersectionObserver" in window)) return;

  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const setActive = (id) => {
    links.forEach((link) => {
      const on = link.getAttribute("href") === "#" + id;
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  const visible = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      let bestId = "";
      let best = 0;
      visible.forEach((ratio, id) => {
        if (ratio > best) { best = ratio; bestId = id; }
      });
      setActive(best > 0 ? bestId : "");
    },
    {
      rootMargin: "-20% 0px -55% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    }
  );

  sections.forEach((section) => observer.observe(section));
}
