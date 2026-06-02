const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzdHddH54hFMPmv5afJQJ_K9SkoXJhPfphz_xnILe07q-IgduijoRRaX0XvHDfmTZCN/exec";
const STORAGE_KEY = "novafix-diagnosticos";
const SHEET_WIDTH = 816;
const SHEET_HEIGHT = 1056;

const state = {
  diagnosticos: [],
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
  state.diagnosticos = loadDiagnosticos();
  bindEvents();
  prepareFormDefaults();
  applyZoom(state.zoom);
  render();
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
    window.setTimeout(prepareFormDefaults, 0);
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
  elements.form.reset();
  prepareFormDefaults();
  setSaveStatus("");
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
  setSaveStatus("Guardando hoja...");
  elements.form.querySelector("#btnSave").disabled = true;

  state.diagnosticos = [diagnostico, ...state.diagnosticos];
  persistDiagnosticos();
  render();

  try {
    await sendToGoogleSheet(diagnostico);
    setSaveStatus("Guardado local y enviado a Google Sheets.");
  } catch (error) {
    console.error(error);
    setSaveStatus("Guardado localmente. Revisa la conexion con Google Sheets.");
  } finally {
    elements.form.querySelector("#btnSave").disabled = false;
  }

  elements.form.reset();
  prepareFormDefaults();
  showView("hojas");
}

function collectFormData() {
  const datos = fieldIds.reduce((acc, fieldId) => {
    acc[fieldId] = document.querySelector(`#${fieldId}`).value.trim();
    return acc;
  }, {});

  const now = new Date();
  datos.fechaPublicacion = formatDateTime(now);
  datos.creadoEn = now.toISOString();
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

function loadDiagnosticos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("No se pudo leer el almacenamiento local.", error);
    return [];
  }
}

function persistDiagnosticos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.diagnosticos));
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
  const estado = datos.estado || "Pendiente";
  const estadoClass = `estado-${estado.replace(/\s/g, "-")}`;

  return `
    <article class="hojaContainer">
      <div>
        <p class="fechaPublicacion">Publicacion: ${escapeHtml(datos.fechaPublicacion || "")}</p>
        <span class="material-symbols-outlined"> s</span>
      </div>
      <div class="hoja">
        <section class="encabezadoHoja">
          <img src="/public/icos/logo app.png" alt="Logo Taller" loading="lazy" class="logoHoja" />
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
    </article>
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
