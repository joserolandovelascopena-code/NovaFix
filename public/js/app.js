const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyvwI4WLH5BMJDQgIu2Sl_3OBlf34VT4rlqx4rZb-Qm6boWhHeZyrovM8elOBRGpm8/exec";
const SHEET_WIDTH = 816;
const SHEET_HEIGHT = 1056;
const toastTimers = new WeakMap();

const state = {
  diagnosticos: [],
  editingFolio: null,
  toastCounter: 0,
  zoom: 85,
  filters: {
    query: "",
    estado: "Todos",
    orden: "recientes",
  },
};

const views = {
  hojas: document.querySelector(".hojasDiag"),
  form: document.querySelector(".datas"),
};

const elements = {
  navHome: document.querySelector(".home"),
  navAgregar: document.querySelector(".agregar"),
  crearHojaBtn: document.querySelector("#crearHojaBtn"),
  focusHojasBtn: document.querySelector("#focusHojasBtn"),
  exitFocusBtn: document.querySelector("#exitFocusBtn"),
  volverHojasBtn: document.querySelector("#volverHojasBtn"),
  form: document.querySelector("#diagnosticoForm"),
  hojas: document.querySelector("#hojas"),
  emptyState: document.querySelector("#emptyState"),
  buscar: document.querySelector("#buscarHojas"),
  filtroEstado: document.querySelector("#filtroEstado"),
  orden: document.querySelector("#ordenHojas"),
  zoomRange: document.querySelector("#zoomRange"),
  zoomValue: document.querySelector("#zoomValue"),
  zoomIn: document.querySelector("#zoomIn"),
  zoomOut: document.querySelector("#zoomOut"),
  fitWidth: document.querySelector("#fitWidth"),
  saveStatus: document.querySelector("#saveStatus"),
  totalHojas: document.querySelector("#totalHojas"),
  pendientesHojas: document.querySelector("#pendientesHojas"),
  procesoHojas: document.querySelector("#procesoHojas"),
  finalizadasHojas: document.querySelector("#finalizadasHojas"),
};

const fieldIds = [
  "folio",
  "fecha",
  "hora",
  "usuarioResponsable",
  "ubicacion",
  "idEquipo",
  "marcaModelo",
  "sistemaOperativo",
  "problema",
  "diagnostico",
  "solucion",
  "estado",
  "tecnicoCargo",
  "fechaCierre",
  "vistoBueno",
  "observaciones",
];

function init() {
  bindEvents();
  prepareFormDefaults();
  applyZoom(state.zoom);
  render();
  loadDiagnosticosFromGoogleSheet();
  textCompleteInput();
}

function bindEvents() {
  elements.navHome.addEventListener("click", () => showView("hojas"));
  elements.navAgregar.addEventListener("click", () => showNewForm());
  elements.crearHojaBtn.addEventListener("click", () => showNewForm());
  elements.focusHojasBtn.addEventListener("click", () => setFocusMode(true));
  elements.exitFocusBtn.addEventListener("click", () => setFocusMode(false));
  elements.volverHojasBtn.addEventListener("click", () => showView("hojas"));

  elements.form.addEventListener("submit", handleSubmit);
  elements.form.addEventListener("reset", () => {
    state.editingFolio = null;
    window.setTimeout(() => {
      prepareFormDefaults();
      textCompleteInput();
      setFormMode("create");
    }, 0);
    setSaveStatus("");
  });

  elements.buscar.addEventListener("input", (event) => {
    state.filters.query = event.target.value.trim().toLowerCase();
    render();
  });

  elements.filtroEstado.addEventListener("change", (event) => {
    state.filters.estado = event.target.value;
    render();
  });

  elements.orden.addEventListener("change", (event) => {
    state.filters.orden = event.target.value;
    render();
  });

  elements.zoomRange.addEventListener("input", (event) => {
    applyZoom(Number(event.target.value));
  });

  elements.zoomIn.addEventListener("click", () => applyZoom(state.zoom + 5));
  elements.zoomOut.addEventListener("click", () => applyZoom(state.zoom - 5));
  elements.fitWidth.addEventListener("click", fitSheetToWidth);

  elements.hojas.addEventListener("click", handleHojaAction);
}

function textCompleteInput() {
  document.getElementById("ubicacion").value = "LAB-01 (PUESTO 1)";
  document.getElementById("tecnicoCargo").value =
    `Rolando Velasco, Varia Arias, Ulises Mercado`;
}

function showView(viewName) {
  if (viewName !== "hojas") {
    setFocusMode(false);
  }

  Object.entries(views).forEach(([name, node]) => {
    node.classList.toggle("active", name === viewName);
  });

  elements.navHome.classList.toggle("active", viewName === "hojas");
  elements.navAgregar.classList.toggle("active", viewName === "form");
}

function setFocusMode(isActive) {
  views.hojas.classList.toggle("focusMode", isActive);
  elements.focusHojasBtn.setAttribute("aria-pressed", String(isActive));
  elements.focusHojasBtn.innerHTML = isActive
    ? '<span class="material-symbols-outlined">fullscreen_exit</span> Vista normal'
    : '<span class="material-symbols-outlined">fullscreen</span> Pantalla completa';
}

function showNewForm() {
  state.editingFolio = null;
  elements.form.reset();
  prepareFormDefaults();
  textCompleteInput();
  setSaveStatus("");
  setFormMode("create");
  showView("form");
  document.querySelector("#usuarioResponsable").focus();
}

function prepareFormDefaults() {
  const now = new Date();
  const fecha = document.querySelector("#fecha");
  const hora = document.querySelector("#hora");
  const folio = document.querySelector("#folio");

  if (!fecha.value) fecha.value = toInputDate(now);
  if (!hora.value) hora.value = toInputTime(now);
  if (!folio.value) folio.value = createFolio(now);
}

async function handleSubmit(event) {
  event.preventDefault();

  const diagnostico = collectFormData();
  const isEditing = Boolean(state.editingFolio);
  const toastId = showToast({
    type: "loading",
    title: isEditing ? "Actualizando hoja" : "Guardando hoja",
    message: "Sincronizando con Google Sheets...",
  });
  setSaveStatus(isEditing ? "Actualizando hoja..." : "Guardando hoja...");
  elements.form.querySelector("#btnSave").disabled = true;

  try {
    await sendToGoogleSheet({
      ...diagnostico,
      action: isEditing ? "update" : "create",
      originalFolio: state.editingFolio,
    });
    await loadDiagnosticosFromGoogleSheet({
      showErrorToast: false,
      rethrow: true,
    });
    setSaveStatus(
      isEditing
        ? "Hoja actualizada en Google Sheets."
        : "Hoja guardada en Google Sheets.",
    );
    updateToast(toastId, {
      type: "success",
      title: isEditing ? "Hoja actualizada" : "Hoja guardada",
      message: isEditing
        ? "Los cambios se guardaron correctamente."
        : "La nueva hoja ya esta en Google Sheets.",
    });
    state.editingFolio = null;
    elements.form.reset();
    prepareFormDefaults();
    showView("hojas");
  } catch (error) {
    console.error(error);
    setSaveStatus("No se pudo sincronizar con Google Sheets.");
    updateToast(toastId, {
      type: "error",
      title: "No se pudo guardar",
      message: "Revisa la conexion o el despliegue de Apps Script.",
    });
  } finally {
    elements.form.querySelector("#btnSave").disabled = false;
  }
}

function collectFormData() {
  const datos = fieldIds.reduce((acc, fieldId) => {
    acc[fieldId] = document.querySelector(`#${fieldId}`).value.trim();
    return acc;
  }, {});

  const now = new Date();
  const original = state.diagnosticos.find(
    (item) => item.folio === state.editingFolio,
  );

  datos.fechaPublicacion = original?.fechaPublicacion || formatDateTime(now);
  datos.creadoEn = original?.creadoEn || now.toISOString();
  return datos;
}

async function sendToGoogleSheet(datos) {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(datos),
  });

  if (response.type === "opaque") {
    return;
  }

  if (!response.ok) {
    throw new Error(`Google Sheets respondio con estado ${response.status}`);
  }
}

async function loadDiagnosticosFromGoogleSheet(options = {}) {
  const { showErrorToast = true, rethrow = false } = options;

  setSaveStatus("Cargando hojas desde Google Sheets...");

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=list`);

    if (!response.ok) {
      throw new Error(`Google Sheets respondio con estado ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    state.diagnosticos = Array.isArray(payload.diagnosticos)
      ? payload.diagnosticos
      : [];
    render();
    broadcastDiagnosticosUpdate();
    setSaveStatus("");
  } catch (error) {
    console.error(error);
    state.diagnosticos = [];
    render();
    setSaveStatus("No se pudieron cargar las hojas desde Google Sheets.");
    if (showErrorToast) {
      showToast({
        type: "error",
        title: "No se cargaron las hojas",
        message: "El Apps Script no respondio con datos validos.",
      });
    }

    if (rethrow) {
      throw error;
    }
  }
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `El Apps Script no devolvio JSON. Respuesta recibida: "${text}". Vuelve a desplegar el Web App con el codigo actualizado.`,
    );
  }
}

async function handleHojaAction(event) {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const folio = button.dataset.folio;
  const diagnostico = state.diagnosticos.find((item) => item.folio === folio);

  if (!diagnostico) return;

  if (button.dataset.action === "edit") {
    editDiagnostico(diagnostico);
    return;
  }

  if (button.dataset.action === "delete") {
    await deleteDiagnostico(diagnostico);
    return;
  }

  if (button.dataset.action === "download") {
    downloadDiagnosticoPdf(diagnostico);
  }
}

function editDiagnostico(diagnostico) {
  state.editingFolio = diagnostico.folio;

  fieldIds.forEach((fieldId) => {
    document.querySelector(`#${fieldId}`).value = diagnostico[fieldId] || "";
  });

  setFormMode("edit");
  setSaveStatus("");
  showView("form");
  document.querySelector("#usuarioResponsable").focus();
}

function setFormMode(mode) {
  const isEdit = mode === "edit";

  document.querySelector("#tituloFormulario").textContent = isEdit
    ? "Editar hoja de diagnostico"
    : "Nueva hoja de diagnostico";
  elements.form.querySelector("#btnSave").innerHTML = isEdit
    ? '<span class="material-symbols-outlined">save</span> Actualizar hoja'
    : '<span class="material-symbols-outlined">save</span> Guardar diagnostico';
}

async function deleteDiagnostico(diagnostico) {
  const confirmed = await confirmDeleteDiagnostico(diagnostico);

  if (!confirmed) return;

  const toastId = showToast({
    type: "loading",
    title: "Eliminando hoja",
    message: `Quitando ${diagnostico.folio} de Google Sheets...`,
  });
  setSaveStatus("Eliminando hoja...");

  try {
    await sendToGoogleSheet({
      action: "delete",
      folio: diagnostico.folio,
    });
    await loadDiagnosticosFromGoogleSheet({
      showErrorToast: false,
      rethrow: true,
    });
    setSaveStatus("Hoja eliminada de Google Sheets.");
    updateToast(toastId, {
      type: "success",
      title: "Hoja eliminada",
      message: `${diagnostico.folio} se elimino correctamente.`,
    });
  } catch (error) {
    console.error(error);
    setSaveStatus("No se pudo eliminar la hoja en Google Sheets.");
    updateToast(toastId, {
      type: "error",
      title: "No se pudo eliminar",
      message: "Intentalo de nuevo o revisa Google Sheets.",
    });
  }
}

function showToast({ type = "success", title, message, duration = 4200 }) {
  const container = getToastContainer();
  const id = `toast-${Date.now()}-${state.toastCounter++}`;
  const toast = document.createElement("article");
  const isLoading = type === "loading";

  toast.className = `toast toast-${type}`;
  toast.dataset.toastId = id;
  toast.innerHTML = renderToastContent({ type, title, message });
  container.appendChild(toast);

  window.requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  if (!isLoading) {
    scheduleToastDismiss(toast, duration);
  }

  return id;
}

function updateToast(
  id,
  { type = "success", title, message, duration = 4200 },
) {
  const toast = document.querySelector(`[data-toast-id="${id}"]`);

  if (!toast) {
    showToast({ type, title, message, duration });
    return;
  }

  toast.className = `toast toast-${type} visible`;
  toast.innerHTML = renderToastContent({ type, title, message });
  scheduleToastDismiss(toast, duration);
}

function renderToastContent({ type, title, message }) {
  const icon = {
    success: "check_circle",
    error: "error",
    loading: "progress_activity",
  }[type];

  return `
    <div class="toastIcon">
      <span class="material-symbols-outlined">${icon}</span>
    </div>
    <div class="toastCopy">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
    <button class="toastClose" type="button" aria-label="Cerrar notificacion">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
}

function getToastContainer() {
  let container = document.querySelector("#toastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    document.body.appendChild(container);
    container.addEventListener("click", (event) => {
      const closeButton = event.target.closest(".toastClose");

      if (closeButton) {
        dismissToast(closeButton.closest(".toast"));
      }
    });
  }

  return container;
}

function scheduleToastDismiss(toast, duration) {
  window.clearTimeout(toastTimers.get(toast));
  const timer = window.setTimeout(() => dismissToast(toast), duration);
  toastTimers.set(toast, timer);
}

function dismissToast(toast) {
  if (!toast) return;

  window.clearTimeout(toastTimers.get(toast));
  toastTimers.delete(toast);
  toast.classList.remove("visible");
  toast.addEventListener("transitionend", () => toast.remove(), {
    once: true,
  });
}

function confirmDeleteDiagnostico(diagnostico) {
  const modal = document.createElement("div");
  const folio = escapeHtml(diagnostico.folio || "esta hoja");

  modal.className = "modalOverlay";
  modal.innerHTML = `
    <section class="confirmModal" role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
      <div class="modalIcon danger">
        <span class="material-symbols-outlined">delete</span>
      </div>
      <div class="modalCopy">
        <h2 id="deleteModalTitle">Eliminar hoja</h2>
        <p>Esta accion eliminara permanentemente la hoja <strong>${folio}</strong> de Google Sheets.</p>
      </div>
      <div class="modalActions">
        <button class="secondaryAction" type="button" data-modal-action="cancel">
          Cancelar
        </button>
        <button class="dangerAction" type="button" data-modal-action="confirm">
          <span class="material-symbols-outlined">delete</span>
          Eliminar
        </button>
      </div>
    </section>
  `;

  document.body.appendChild(modal);

  const cancelButton = modal.querySelector('[data-modal-action="cancel"]');
  const confirmButton = modal.querySelector('[data-modal-action="confirm"]');

  return new Promise((resolve) => {
    const close = (result) => {
      document.removeEventListener("keydown", handleKeydown);
      modal.remove();
      resolve(result);
    };

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        close(false);
      }
    });
    cancelButton.addEventListener("click", () => close(false));
    confirmButton.addEventListener("click", () => close(true));
    document.addEventListener("keydown", handleKeydown);
    confirmButton.focus();
  });
}

function downloadDiagnosticoPdf(diagnostico) {
  const printRoot = document.querySelector("#printRoot") || createPrintRoot();
  const originalTitle = document.title;
  let cleanupTimer;
  const cleanup = () => {
    window.clearTimeout(cleanupTimer);
    printRoot.innerHTML = "";
    document.title = originalTitle;
    window.removeEventListener("afterprint", cleanup);
  };

  printRoot.innerHTML = renderHojaDocument(diagnostico);
  document.title = `${diagnostico.folio || "Hoja"} - NovaFix`;
  window.addEventListener("afterprint", cleanup);
  window.print();

  cleanupTimer = window.setTimeout(cleanup, 1500);
}

function createPrintRoot() {
  const printRoot = document.createElement("div");
  printRoot.id = "printRoot";
  document.body.appendChild(printRoot);
  return printRoot;
}

function render() {
  const filtered = getFilteredDiagnosticos();
  renderSummary();
  elements.hojas.innerHTML = filtered.map(renderHoja).join("");
  elements.emptyState.classList.toggle("hidden", filtered.length > 0);
}

function getFilteredDiagnosticos() {
  const query = state.filters.query;
  const estado = state.filters.estado;

  return state.diagnosticos
    .filter((item) => {
      const matchesEstado = estado === "Todos" || item.estado === estado;
      const searchable = [
        item.folio,
        item.usuarioResponsable,
        item.ubicacion,
        item.idEquipo,
        item.marcaModelo,
        item.sistemaOperativo,
        item.problema,
        item.diagnostico,
      ]
        .join(" ")
        .toLowerCase();

      return matchesEstado && (!query || searchable.includes(query));
    })
    .sort(sortDiagnosticos);
}

function sortDiagnosticos(a, b) {
  if (state.filters.orden === "folio") {
    return a.folio.localeCompare(b.folio);
  }

  if (state.filters.orden === "estado") {
    return a.estado.localeCompare(b.estado);
  }

  return new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0);
}

function renderSummary() {
  const total = state.diagnosticos.length;
  const pendientes = state.diagnosticos.filter(
    (item) => item.estado === "Pendiente",
  ).length;
  const proceso = state.diagnosticos.filter(
    (item) => item.estado === "En proceso",
  ).length;
  const finalizadas = state.diagnosticos.filter(
    (item) => item.estado === "Finalizado",
  ).length;

  elements.totalHojas.textContent = total;
  elements.pendientesHojas.textContent = pendientes;
  elements.procesoHojas.textContent = proceso;
  elements.finalizadasHojas.textContent = finalizadas;
}

function renderHoja(datos) {
  return `
    <article class="hojaContainer">
      <div class="hojaMeta">
        <p class="fechaPublicacion">Publicacion: ${escapeHtml(datos.fechaPublicacion || "")}</p>
        <div class="hojaActions" aria-label="Acciones de ${escapeHtml(datos.folio)}">
          <button class="iconButton" type="button" data-action="download" data-folio="${escapeHtml(datos.folio)}" title="Descargar PDF">
            <span class="material-symbols-outlined">download</span>
          </button>
          <button class="iconButton" type="button" data-action="edit" data-folio="${escapeHtml(datos.folio)}" title="Editar hoja">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="iconButton dangerButton" type="button" data-action="delete" data-folio="${escapeHtml(datos.folio)}" title="Eliminar hoja">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
      ${renderHojaDocument(datos)}
    </article>
  `;
}

function renderHojaDocument(datos) {
  const estado = datos.estado || "Pendiente";
  const estadoClass = `estado-${estado.replace(/\s/g, "-")}`;

  return `
      <div class="hoja">
        <section class="encabezadoHoja">
          <img src="./public/icos/logo app.png" alt="Logo Taller" loading="lazy" class="logoHoja" />
          <div>
            <h2>REPORTE DE INCIDENCIA TECNICA (ITIR)</h2>
            <div class="datosTop">
              <p><strong>Folio:</strong> ${escapeHtml(datos.folio)}</p>
              <p><strong>Estado:</strong> <span class="estadoChip ${estadoClass}">${escapeHtml(estado)}</span></p>
            </div>
          </div>
        </section>

        <hr />

        <section class="tablaSection">
          <h3>1. INFORMACION DEL REPORTE</h3>
          <table class="tabla">
            <tr>
              <td><strong>Fecha del Reporte:</strong></td>
              <td>${formatDate(datos.fecha)}</td>
              <td><strong>Hora:</strong></td>
              <td>${escapeHtml(datos.hora)}</td>
            </tr>
            <tr>
              <td><strong>Usuario Responsable:</strong></td>
              <td>${escapeHtml(datos.usuarioResponsable)}</td>
              <td><strong>Ubicacion:</strong></td>
              <td>${escapeHtml(datos.ubicacion)}</td>
            </tr>
          </table>
        </section>

        <section class="tablaSection">
          <h3>2. INFORMACION DEL EQUIPO</h3>
          <table class="tabla">
            <tr>
              <td><strong>ID del Equipo (Tag):</strong></td>
              <td>${escapeHtml(datos.idEquipo)}</td>
              <td><strong>Marca / Modelo:</strong></td>
              <td>${escapeHtml(datos.marcaModelo)}</td>
            </tr>
            <tr>
              <td><strong>Sistema Operativo:</strong></td>
              <td colspan="3">${escapeHtml(datos.sistemaOperativo)}</td>
            </tr>
          </table>
        </section>

        <section class="tablaSection">
          <h3>3. DESCRIPCION DEL PROBLEMA (Reportado por Usuario)</h3>
          <table class="tabla">
            <tr><td class="areaGrande">${escapeHtml(datos.problema)}</td></tr>
          </table>
        </section>

        <section class="tablaSection">
          <h3>4. DIAGNOSTICO PRELIMINAR (Analisis Tecnico)</h3>
          <table class="tabla">
            <tr><td class="areaGrande">${escapeHtml(datos.diagnostico)}</td></tr>
          </table>
        </section>

        <section class="tablaSection">
          <h3>5. SOLUCION APLICADA Y ACCIONES TOMADAS</h3>
          <table class="tabla">
            <tr><td class="areaGrande">${escapeHtml(datos.solucion)}</td></tr>
          </table>
        </section>

        <section class="tablaSection">
          <h3>6. FIRMAS Y CIERRE</h3>
          <table class="tabla">
            <tr>
              <td><strong>Tecnico a Cargo:</strong></td>
              <td>${escapeHtml(datos.tecnicoCargo)}</td>
              <td><strong>Fecha de Cierre:</strong></td>
              <td>${formatDate(datos.fechaCierre)}</td>
            </tr>
            <tr>
              <td><strong>Visto Bueno Encargado:</strong></td>
              <td colspan="3">${escapeHtml(datos.vistoBueno)}</td>
            </tr>
          </table>
        </section>

        <section class="tablaSection">
          <h3>Observaciones Finales</h3>
          <table class="tabla">
            <tr><td class="areaObservaciones">${escapeHtml(datos.observaciones)}</td></tr>
          </table>
        </section>
      </div>
  `;
}

function applyZoom(value) {
  state.zoom = Math.max(50, Math.min(130, value));
  const zoomScale = state.zoom / 100;
  document.documentElement.style.setProperty("--sheet-zoom", zoomScale);
  document.documentElement.style.setProperty(
    "--sheet-scaled-width",
    `${SHEET_WIDTH * zoomScale}px`,
  );
  document.documentElement.style.setProperty(
    "--sheet-scaled-height",
    `${SHEET_HEIGHT * zoomScale}px`,
  );
  elements.zoomRange.value = state.zoom;
  elements.zoomValue.textContent = `${state.zoom}%`;
}

function fitSheetToWidth() {
  const viewport = document.querySelector(".hojasViewport");
  const availableWidth = viewport.clientWidth - 64;
  const nextZoom = Math.floor((availableWidth / SHEET_WIDTH) * 100);
  applyZoom(Math.min(130, Math.max(50, nextZoom)));
}

function setSaveStatus(message) {
  elements.saveStatus.textContent = message;
}

function broadcastDiagnosticosUpdate() {
  try {
    window.localStorage.setItem(
      "novafix:diagnosticos-updated",
      String(Date.now()),
    );
  } catch (error) {
    console.warn("No se pudo notificar la actualizacion local.", error);
  }
}

function createFolio(date) {
  const year = date.getFullYear();
  const nextNumber = String(state.diagnosticos.length + 1).padStart(4, "0");
  return `ITIR-${year}-${nextNumber}`;
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toInputTime(date) {
  return date.toTimeString().slice(0, 5);
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();
