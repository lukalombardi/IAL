/**
 * Micro-interacción: un resplandor muy tenue que sigue al puntero dentro de
 * cada card. Solo en punteros finos (mouse/trackpad) y con un rAF compartido,
 * así no cuesta nada en scroll.
 */

export function initPointerGlow() {
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  const cards = Array.from(document.querySelectorAll(".card"));
  if (!cards.length) return;

  let pending = null;
  let frame = 0;

  const apply = () => {
    frame = 0;
    if (!pending) return;
    const { card, x, y } = pending;
    card.style.setProperty("--glow-x", x + "px");
    card.style.setProperty("--glow-y", y + "px");
    pending = null;
  };

  cards.forEach((card) => {
    card.addEventListener(
      "pointermove",
      (event) => {
        const rect = card.getBoundingClientRect();
        pending = {
          card,
          x: Math.round(event.clientX - rect.left),
          y: Math.round(event.clientY - rect.top),
        };
        if (!frame) frame = requestAnimationFrame(apply);
      },
      { passive: true }
    );

    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--glow-x");
      card.style.removeProperty("--glow-y");
    });
  });
}
