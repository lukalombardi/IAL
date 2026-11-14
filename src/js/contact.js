/**
 * Contacto: copiar correo + formulario honesto.
 *
 * Sin endpoint configurado el formulario NO finge enviar: valida, arma el
 * texto y te lo deja listo para copiar o abrir en tu cliente de correo.
 * Con FORM_ENDPOINT cargado, hace el POST de verdad y reporta el resultado.
 */

import { CONTACT_EMAIL, FORM_ENDPOINT } from "./config.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------- portapapeles */

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* seguimos con el fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function flashButton(button, okLabel) {
  const original = button.dataset.label || button.textContent.trim();
  button.dataset.label = original;
  button.textContent = okLabel;
  clearTimeout(button._flash);
  button._flash = setTimeout(() => { button.textContent = original; }, 1800);
}

function initCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      const text = "value" in target ? target.value : target.textContent.trim();
      const ok = await copyText(text);
      flashButton(button, ok ? "Copiado" : "Copialo a mano");
    });
  });
}

/* ---------------------------------------------------------------- formulario */

function buildMessage({ nombre, correo, mensaje }) {
  return [
    "Hola IAL,",
    "",
    "Soy " + nombre + ".",
    "",
    mensaje,
    "",
    "Pueden responderme a: " + correo,
  ].join("\n");
}

/* Una regla por campo: así se puede validar de a uno (al salir del campo)
   o todos juntos (al enviar) sin duplicar los mensajes. */
const RULES = {
  nombre: (v) => (v.length < 2 ? "Escribí tu nombre para saber con quién hablamos." : ""),
  correo: (v) => (EMAIL_RE.test(v) ? "" : "Escribí un correo con el formato nombre@empresa.com."),
  mensaje: (v) =>
    v.length < 10 ? "Contanos un poco más: con una línea alcanza." : "",
};

function validate(values) {
  const errors = {};
  Object.keys(RULES).forEach((key) => {
    const message = RULES[key](values[key]);
    if (message) errors[key] = message;
  });
  return errors;
}

function initForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const status = document.getElementById("formStatus");
  const note = document.getElementById("formNote");
  const compose = document.getElementById("compose");
  const composeText = document.getElementById("composeText");
  const composeMail = document.getElementById("composeMail");
  const submit = document.getElementById("formSubmit");

  const fields = {
    nombre: document.getElementById("f-nombre"),
    correo: document.getElementById("f-correo"),
    mensaje: document.getElementById("f-mensaje"),
  };
  const errorNodes = {
    nombre: document.getElementById("e-nombre"),
    correo: document.getElementById("e-correo"),
    mensaje: document.getElementById("e-mensaje"),
  };

  const submitLabel = document.getElementById("formSubmitLabel");
  const hasEndpoint = Boolean(FORM_ENDPOINT);

  // Con endpoint configurado el botón sí envía, así que lo decimos.
  if (hasEndpoint) {
    if (submitLabel) submitLabel.textContent = "Enviar mensaje";
    if (note) {
      note.textContent =
        "Te respondemos al correo que dejes. No usamos tus datos para otra cosa.";
    }
  }

  /* Un campo "virgen" nunca se marca en rojo: el error aparece recién cuando
     el usuario sale del campo, y desaparece apenas vuelve a tocarlo. */
  const touched = new Set();

  function setError(key, message) {
    errorNodes[key].textContent = message;
    fields[key].setAttribute("aria-invalid", message ? "true" : "false");
  }

  function clearError(key) {
    if (errorNodes[key].textContent) setError(key, "");
  }

  function showErrors(errors) {
    Object.keys(fields).forEach((key) => setError(key, errors[key] || ""));
    const firstBad = Object.keys(fields).find((key) => errors[key]);
    if (firstBad) fields[firstBad].focus();
  }

  Object.keys(fields).forEach((key) => {
    const input = fields[key];

    // Primera salida del campo: recién ahí validamos.
    input.addEventListener("blur", () => {
      touched.add(key);
      setError(key, RULES[key](input.value.trim()));
    });

    // Volver al campo limpia el error antes de escribir nada.
    input.addEventListener("focus", () => clearError(key));

    input.addEventListener("input", () => {
      if (errorNodes[key].textContent) clearError(key);
      else if (touched.has(key)) setError(key, RULES[key](input.value.trim()));
    });
  });

  function setStatus(message, state) {
    status.textContent = message;
    if (state) status.setAttribute("data-state", state);
    else status.removeAttribute("data-state");
  }

  let sending = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    setStatus("");

    const values = {
      nombre: fields.nombre.value.trim(),
      correo: fields.correo.value.trim(),
      mensaje: fields.mensaje.value.trim(),
    };

    Object.keys(fields).forEach((key) => touched.add(key));

    const errors = validate(values);
    if (Object.keys(errors).length) {
      showErrors(errors);
      compose.hidden = true;
      return;
    }
    showErrors({});

    const body = buildMessage(values);
    const subject = "Consulta de " + values.nombre;

    if (hasEndpoint) {
      // El botón nunca se deshabilita: se marca ocupado y se ignora el
      // segundo click mientras el envío está en vuelo.
      sending = true;
      submit.setAttribute("aria-busy", "true");
      setStatus("Enviando…");
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name: values.nombre, email: values.correo, message: values.mensaje }),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        setStatus("Mensaje enviado. Te respondemos a la brevedad.");
        form.reset();
        touched.clear();
        compose.hidden = true;
      } catch {
        setStatus("El envío no salió. Te dejamos el mensaje listo para copiar.", "error");
        composeText.value = body;
        composeMail.href =
          "mailto:" + CONTACT_EMAIL +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);
        compose.hidden = false;
      } finally {
        sending = false;
        submit.removeAttribute("aria-busy");
      }
      return;
    }

    // Sin backend: armamos el texto y se lo dejamos al usuario.
    composeText.value = body;
    composeMail.href =
      "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
    compose.hidden = false;
    setStatus("Mensaje armado. Copialo o abrilo en tu correo.");
    composeText.focus();
  });
}

export function initContact() {
  const emailNode = document.getElementById("contactEmail");
  if (emailNode) emailNode.textContent = CONTACT_EMAIL;
  initCopyButtons();
  initForm();
}
