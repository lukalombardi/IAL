# IAL — Landing

Sitio estático de IAL (Ismael · Agustín · Luca). HTML + CSS + JS vanilla sobre Vite.
Sin frameworks ni librerías: las partículas son Canvas 2D a mano.

**Peso del build:** ~6 kB de JS y ~5 kB de CSS (gzip), más las fuentes de Google.

---

## Correr el proyecto

```bash
npm install
```

```bash
npm run dev
```

Queda en <http://localhost:5173>.

Build de producción y chequeo local del build:

```bash
npm run build
```

```bash
npm run preview
```

---

## Estructura

```
index.html              markup + sprite SVG del logo + script de arranque
src/
  styles/
    tokens.css          TODOS los colores, tipografías, espaciados y tiempos
    base.css            reset, layout base, utilidades
    components.css      botones, cards, header, chips, intro
    sections.css        hero, servicios, integración, proyectos, equipo, contacto
    main.css            junta todo + bloque prefers-reduced-motion
  js/
    config.js           correo de contacto y endpoint del formulario
    logo.js             geometría del logo + muestreo de píxeles (getImageData)
    particles.js        campo de partículas (intro + ambiente)
    intro.js            línea de tiempo de la animación de entrada
    nav.js              header pegajoso + sección activa
    contact.js          formulario y botones de copiar
    pointer.js          resplandor de las cards
    main.js             arranque
public/favicon.svg
```

---

## Qué tocar

### Correo y formulario — `src/js/config.js`

```js
export const CONTACT_EMAIL = "hola@ial.dev";
export const FORM_ENDPOINT = "";
```

- `CONTACT_EMAIL` se usa en el bloque "Correo" y en el `mailto:`. Cambiándolo acá cambia en los dos lados.
- `FORM_ENDPOINT` vacío: **el formulario no finge enviar**. Valida, arma el mensaje y te deja
  "Copiar texto" y "Abrir en mi correo".
- Si cargás un endpoint (Formspree, Netlify Forms, tu API), el botón pasa a decir "Enviar mensaje",
  hace el `POST` de verdad y, si falla, igual te deja el texto para copiar.

Para Formspree: creás el form, copiás la URL `https://formspree.io/f/xxxxxxxx` y la pegás ahí.

### Colores y tipografía — `src/styles/tokens.css`

Todo son custom properties en `:root`: la rampa neutra (`--n-000` … `--n-1000`), el acento
(`--accent`), las superficies, los bordes, la escala tipográfica y los tiempos de animación.
No hay colores literales sueltos en el resto del CSS.

El tema es un único modo oscuro declarado (`color-scheme: dark`). No hay modo claro.

### Textos del equipo — `index.html`

Buscá `<!-- EDITABLE -->` en la sección `#equipo`. Las bios de Ismael, Agustín y Luca están
escritas como placeholders razonables: reemplazalas por las reales.

### El logo

La geometría vive en dos lugares que tienen que coincidir:

- `index.html` → `<symbol id="ial-mark">` (lo que se ve)
- `src/js/logo.js` → `PETAL_PATH` (lo que muestrean las partículas)

Es un pétalo lenticular (`viewBox -120 -120 240 240`, radio exterior 100, hundimiento interior 36)
repetido a 0° / 120° / 240°.

> Ojo con los `viewBox` anidados: los `<svg>` que hacen `<use href="#ial-mark">` usan
> `viewBox="0 0 240 240"`, y el `<symbol>` es el que lleva el sistema centrado `-120 -120 240 240`.
> Si le ponés el viewBox centrado a los dos, el logo se dibuja corrido.

### Tiempos de la animación — `src/js/intro.js`

```js
const T = { scatter: 0, converge: 520, consolidate: 2090, travel: 2400, cleanup: 3380 };
```

Milisegundos desde que carga la página. La cantidad de partículas está en `particles.js`
(`get budget()`): 1100 en desktop, 520 en mobile.

---

## Cómo funciona la intro

1. Arrancan partículas dispersas en posiciones aleatorias, con fade in escalonado.
2. El logo se rasteriza en un canvas **offscreen**, se lee con `getImageData` y cada píxel opaco
   se convierte en el destino de una partícula. Cada una viaja por una curva Bézier con easing.
3. Ya armado, el logo vectorial nítido reemplaza a las partículas, que se apagan.
4. El logo viaja al header achicándose (FLIP) y girando 120°, mientras las secciones se revelan
   con un fade/slide escalonado.
5. Terminada la intro, el mismo canvas pasa a modo ambiente: pocas partículas, deriva lenta.

Detalles que importan:

- **Las fases se miden en tiempo real** (`performance.now`), no en deltas de frame acumulados.
  Si el navegador tira frames o throttlea la pestaña, la animación sigue coincidiendo con la
  línea de tiempo en vez de quedarse atrás.
- Se **pausa sola** cuando la pestaña queda oculta (`visibilitychange`).
- Se puede **saltar** con el botón, una tecla, scroll o un click.
- El CSS entra por `<link>` y no por `import` de JS, así bloquea el primer pintado: la página
  nunca se muestra armada para después esconderse.
- Hay un **failsafe de 6 s** en el `<script>` del `<head>`: pase lo que pase con el JS, la página
  queda completa y legible.

### prefers-reduced-motion

Si está activo, no se agrega la clase `is-intro`, el módulo de la intro ni se descarga y el CSS
fuerza el estado final. La página aparece completa y armada al instante.

Nada queda en `opacity: 0` esperando scroll: el estado final de la página es siempre visible.

---

## Publicar

El sitio es estático: cualquier hosting sirve. `base: "./"` en `vite.config.js` hace que funcione
también en subcarpetas.

### Vercel

Ya está `vercel.json`. Importás el repo y Vercel detecta Vite solo
(build `npm run build`, output `dist`). O desde la terminal:

```bash
npx vercel --prod
```

### Netlify

Ya está `netlify.toml` (build `npm run build`, publish `dist`, con cache headers para `/assets/*`).

```bash
npx netlify deploy --prod
```

Si preferís arrastrar: corré `npm run build` y soltá la carpeta `dist` en Netlify Drop.

---

## Pendiente para completar

- [ ] Correo real en `src/js/config.js` (hoy `hola@ial.dev`).
- [ ] Endpoint del formulario, si quieren que envíe de verdad.
- [ ] Bios reales del equipo en `index.html`.
- [ ] Imagen para compartir en redes (`og:image`) — falta el meta y el archivo.
- [ ] Dominio y deploy.
