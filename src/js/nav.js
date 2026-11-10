/** Header: fondo al despegar del tope + sección activa en la nav. */

export function initNav() {
  const header = document.getElementById("header");
  const links = Array.from(document.querySelectorAll(".nav__link"));

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
