/**
 * Logo IAL — trébol de 3 pétalos a 120°.
 *
 * El pétalo es una lente: punta interior (hacia el centro) y punta exterior.
 * Radio exterior 100, hundimiento interior 36, apertura ±43°, sobre un
 * viewBox de 240 unidades centrado en (0,0). Tres copias rotadas 0/120/240.
 *
 * Esta es la MISMA geometría que usa el <symbol id="ial-mark"> del HTML:
 * si cambiás una, cambiá la otra.
 */

export const PETAL_PATH =
  "M-68.2,-73.1 C-29.8,-108.9 29.8,-108.9 68.2,-73.1 C44,-23.6 -44,-23.6 -68.2,-73.1 Z";

/** Lado del viewBox del logo, en unidades SVG. */
export const LOGO_VIEWBOX = 240;

/**
 * Dibuja el logo centrado en el canvas 2D que le pases.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size  lado en px del área donde entra el logo
 */
export function paintLogo(ctx, size) {
  const scale = size / LOGO_VIEWBOX;
  const petal = new Path2D(PETAL_PATH);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 3; i += 1) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 3);
    ctx.fill(petal);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Renderiza el logo en un canvas offscreen, lee sus píxeles y devuelve los
 * puntos opacos como destinos para las partículas.
 *
 * @param {number} size   lado en px al que se rasteriza el logo
 * @param {number} count  cuántos puntos querés de vuelta
 * @returns {{x:number,y:number}[]} offsets respecto del centro del logo
 */
export function sampleLogoPoints(size, count) {
  const px = Math.max(64, Math.round(size));
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  paintLogo(ctx, px);

  let data;
  try {
    data = ctx.getImageData(0, 0, px, px).data;
  } catch {
    return [];
  }

  const half = px / 2;
  const step = 2;
  const points = [];

  for (let y = 0; y < px; y += step) {
    for (let x = 0; x < px; x += step) {
      // canal alfa del píxel
      if (data[(y * px + x) * 4 + 3] > 140) {
        points.push({ x: x - half, y: y - half });
      }
    }
  }

  if (points.length === 0) return points;

  // Fisher–Yates parcial: barajamos y recortamos a la cantidad pedida.
  for (let i = points.length - 1; i > 0; i -= 1) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = points[i];
    points[i] = points[j];
    points[j] = tmp;
  }

  if (points.length <= count) return points;
  return points.slice(0, count);
}
