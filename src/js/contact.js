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
      flashButton(button, ok ? "Copiado" : "No se pudo");
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

function validate(values) {
  const errors = {};
  if (values.nombre.length < 2) errors.nombre = "Decinos cómo te llamás.";
  if (!EMAIL_RE.test(values.correo)) errors.correo = "Revisá el correo: no parece válido.";
  if (values.mensaje.length < 10) errors.mensaje = "Contanos un poco más (10 caracteres mínimo).";
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

  function showErrors(errors) {
    Object.keys(fields).forEach((key) => {
      const message = errors[key] || "";
      errorNodes[key].textContent = message;
      fields[key].setAttribute("aria-invalid", message ? "true" : "false");
      fields[key].setAttribute("aria-describedby", errorNodes[key].id);
    });
    const firstBad = Object.keys(errors)[0];
    if (firstBad) fields[firstBad].focus();
  }

  // Limpiamos el error del campo apenas el usuario lo corrige.
  Object.keys(fields).forEach((key) => {
    fields[key].addEventListener("input", () => {
      if (errorNodes[key].textContent) {
        errorNodes[key].textContent = "";
        fields[key].setAttribute("aria-invalid", "false");
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    const values = {
      nombre: fields.nombre.value.trim(),
      correo: fields.correo.value.trim(),
      mensaje: fields.mensaje.value.trim(),
    };

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
      submit.disabled = true;
      status.textContent = "Enviando…";
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...values, _subject: subject }),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        status.textContent = "Listo. Te respondemos a la brevedad.";
        form.reset();
        compose.hidden = true;
      } catch {
        status.textContent = "No se pudo enviar. Te dejamos el mensaje para copiar.";
        composeText.value = body;
        composeMail.href =
          "mailto:" + CONTACT_EMAIL +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);
        compose.hidden = false;
      } finally {
        submit.disabled = false;
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
    status.textContent = "Mensaje armado. Copialo o abrilo en tu correo.";
    composeText.focus();
  });
}

export function initContact() {
  const emailNode = document.getElementById("contactEmail");
  if (emailNode) emailNode.textContent = CONTACT_EMAIL;
  initCopyButtons();
  initForm();
}
