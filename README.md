# IAL — Landing

Sitio de IAL (Ismael · Agustín · Luca). HTML + CSS + JS vanilla sobre Vite.
Sin frameworks ni librerías: las partículas son Canvas 2D a mano.

---

## Correr el proyecto

> El sitio **no está desplegado todavía**. Por ahora se trabaja en local.

### Lo único que hace falta

**Node.js 20 o más nuevo.** Nada más: ni base de datos, ni backend, ni claves.
Para ver qué versión tenés:

```bash
node -v
```

Si el comando no existe o el número es menor a 20, bajá la versión LTS de
<https://nodejs.org> (el instalador de Windows ya trae npm) y cerrá y volvé a
abrir la terminal.

### Primera vez

```bash
git clone https://github.com/lukalombardi/IAL.git
```

```bash
cd IAL
```

```bash
npm install
```

Esto crea la carpeta `node_modules`, que **no se sube al repo**: cada uno la
genera en su máquina.

### Cada vez que quieras trabajar

```bash
npm run dev
```

Abrí <http://localhost:5173>. Lo que guardes se actualiza solo en el navegador,
no hace falta recargar. Para cortar el servidor, `Ctrl + C` en la terminal.

### Antes de ponerte a tocar algo

```bash
git pull
```

Si el `pull` trae cambios en `package.json`, volvé a correr `npm install`.

### Para ver cómo queda el sitio compilado

```bash
npm run build
```

```bash
npm run preview
```

`build` genera la carpeta `dist` (tampoco se sube al repo) y `preview` la sirve
para mirarla como va a quedar publicada.

---

## Si algo no arranca

**`vite` no se reconoce como comando** — te falta el `npm install`, o lo
corriste en otra carpeta. Asegurate de estar parado dentro de `IAL`.

**`Port 5173 is in use`** — ya lo tenés abierto en otra terminal, o lo dejaste
corriendo. Cerralo, o levantalo en otro puerto:

```bash
npm run dev -- --port 5174
```

**`npm warn install-scripts ... esbuild`** — es un aviso normal de npm 12, no
un error. El proyecto compila igual; está verificado desde un clon limpio.

**La página se ve en blanco unos segundos al abrir** — es la animación de
entrada. Si no querés esperarla, tocá cualquier tecla, hacé scroll o usá el
botón "Saltar intro".

**Cambiaste un color y no pasa nada** — fijate que lo estés tocando en
`src/styles/tokens.css`. El resto del CSS no tiene colores propios, todos
salen de ahí.

---

## Trabajar en ramas

Para no pisarnos, cada cambio en su propia rama:

```bash
git checkout -b lo-que-estas-haciendo
```

Cuando esté listo, lo subís y abrís un Pull Request en GitHub para que el resto
lo mire antes de que entre a `main`:

```bash
git push -u origin lo-que-estas-haciendo
```

`node_modules` y `dist` están ignorados a propósito: se regeneran solos y, si se
suben, generan conflictos en cada commit.

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
    particles.js        campo de partículas (intro + ambiente + gravedad)
    gravity.js          quién atrae partículas: puntero, botones, logo del diagrama
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

**Reglas del sistema que conviene no romper al editar:**

- **Tres pesos y nada más**: 400 / 500 / 600 (`--fw-*`). Ninguno por encima de 600; el extra de
  presencia de la marca sale del eje de ancho de Archivo (`font-stretch`), no de un 700.
- **Piso de 12px**: la escala es 12 (meta) / 14 (secundario) / 16-17 (cuerpo) y de ahí para
  arriba. Nada de texto por debajo de 12px, y el 12px es solo para metadatos.
- **Contraste sobre `--bg`**: `--text-3` es 4.6:1 (mínimo AA para texto normal) y es el tono más
  bajo admitido para contenido. `--text-4` es 3.3:1 y está reservado para `::placeholder`.
- **Duraciones de la UI**: 100 / 150 / 200 / 300 ms (`--dur-1` … `--dur-4`). `--dur-reveal`
  (600 ms) es la única excepción y pertenece a la coreografía de entrada.
- **Área táctil de 44px** (`--hit`) en todo lo que se toca. Los botones chicos se ven chicos pero
  amplían el área con un `::after`.
- Sin `backdrop-filter`: el header opaco es del mismo negro que la página.

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

### La idea que sostiene el sitio

**"De la materia dispersa emerge el sistema."** Física (partículas, gravedad,
convergencia) que se ordena en sistema (grilla, esquema, precisión). La intro lo
cuenta una vez; el resto de la página lo repite en chico:

- El fondo tiene **gravedad**. El puntero curva la deriva de lo que pasa cerca.
  Los botones principales (`data-attract`) y el logo del diagrama de integración
  (`data-attract-view`) atraen la materia, que se acumula alrededor y se enciende.
  Con teclado pasa lo mismo al enfocar; en touch, un pulso corto al tocar.
- Al scrollear, el campo acompaña con inercia y se asienta (más cerca, más rápido).
- Las líneas del diagrama "tres piezas → una" se trazan cuando entra en pantalla.

Perillas en `src/js/gravity.js` (`POINTER`, `CTA`, `VIEW`: radio `r`, fuerza `k`,
brillo `glow`). Para que algo nuevo atraiga, alcanza con ponerle `data-attract`.
Con `prefers-reduced-motion` nada de esto corre: no hay campo.

### Tiempos de la animación — `src/js/intro.js`

```js
const T = { scatter: 0, converge: 520, consolidate: 2090, travel: 2400, cleanup: 3380 };
```

Milisegundos desde que carga la página. La cantidad de partículas está en `particles.js`
(`get budget()`): 1100 en desktop, 520 en mobile.

---

## Publicar

> **Todavía no publicamos.** Mientras la sigamos desarrollando, se trabaja en
> local con `npm run dev`. Lo que sigue queda anotado para cuando decidamos
> sacarla, y la config ya está lista.

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
