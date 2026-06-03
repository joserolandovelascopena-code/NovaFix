const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyvwI4WLH5BMJDQgIu2Sl_3OBlf34VT4rlqx4rZb-Qm6boWhHeZyrovM8elOBRGpm8/exec";
const SHEET_WIDTH = 816;
const SHEET_HEIGHT = 1056;

const state = {
  diagnosticos: [],
  filteredStatus: "Todos",
  zoom: 85,
  refreshTimer: null,
};

const elements = {
  hojas: document.querySelector("#hojas"),
  emptyState: document.querySelector("#emptyState"),
  saveStatus: document.querySelector("#saveStatus"),
  menu: document.querySelector(".menu"),
};

function init() {
  bindEvents();
  applyZoom(state.zoom);
  loadDiagnosticosFromGoogleSheet();
  state.refreshTimer = window.setInterval(loadDiagnosticosFromGoogleSheet, 12000);
}

function bindEvents() {
  elements.menu.addEventListener("click", handleMenuAction);
  elements.hojas.addEventListener("click", handleHojaAction);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadDiagnosticosFromGoogleSheet();
    }
  });

  window.addEventListener("focus", loadDiagnosticosFromGoogleSheet);
  window.addEventListener("storage", (event) => {
    if (event.key === "novafix:diagnosticos-updated") {
      loadDiagnosticosFromGoogleSheet();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth < 900) {
      fitSheetToWidth();
    }
  });
}

async function loadDiagnosticosFromGoogleSheet() {
  setSaveStatus("Actualizando hojas...");

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=list&ts=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`Google Sheets respondio con estado ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    state.diagnosticos = Array.isArray(payload.diagnosticos)
      ? payload.diagnosticos
      : [];
    render();
    setSaveStatus(`Actualizado: ${formatDateTime(new Date())}`);
  } catch (error) {
    console.error(error);
    setSaveStatus("No se pudieron cargar las hojas.");
    render();
  }
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`El Apps Script no devolvio JSON: ${text}`);
  }
}

function handleMenuAction(event) {
  const button = event.target.closest("[data-menu-action]");

  if (!button) return;

  const action = button.dataset.menuAction;

  if (action === "refresh") {
    loadDiagnosticosFromGoogleSheet();
    return;
  }

  if (action === "filter") {
    state.filteredStatus = button.dataset.status || "Todos";
    render();
    setSaveStatus(`Filtro: ${state.filteredStatus}`);
    return;
  }

  if (action === "zoom") {
    applyZoom(Number(button.dataset.zoom));
    return;
  }

  if (action === "fit-width") {
    fitSheetToWidth();
    return;
  }

  if (action === "print-visible") {
    printDiagnosticos(getVisibleDiagnosticos());
    return;
  }

  if (action === "print-first") {
    printDiagnosticos(getVisibleDiagnosticos().slice(0, 1));
    return;
  }

  if (action === "print-status") {
    const status = button.dataset.status;
    printDiagnosticos(state.diagnosticos.filter((item) => item.estado === status));
  }
}

function handleHojaAction(event) {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  if (button.dataset.action === "print") {
    printByFolio(button.dataset.folio);
  }
}

function render() {
  const visible = getVisibleDiagnosticos();
  elements.hojas.innerHTML = visible.map(renderHoja).join("");
  elements.emptyState.classList.toggle("hidden", visible.length > 0);
}

function getVisibleDiagnosticos() {
  return state.diagnosticos
    .filter((item) => {
      return state.filteredStatus === "Todos" || item.estado === state.filteredStatus;
    })
    .sort(sortDiagnosticos);
}

function sortDiagnosticos(a, b) {
  return new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0);
}

function renderHoja(datos) {
  return `
    <article class="hojaContainer">
      <div class="hojaMeta">
        <p class="fechaPublicacion">Publicacion: ${escapeHtml(datos.fechaPublicacion || "")}</p>
        <button class="iconButton" type="button" data-action="print" data-folio="${escapeHtml(datos.folio)}" title="Imprimir esta hoja">
          <span class="material-symbols-outlined">picture_as_pdf</span>
        </button>
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
        <img src="../icos/logo app.png" alt="Logo Taller" loading="lazy" class="logoHoja" />
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

function printByFolio(folio) {
  const diagnostico = state.diagnosticos.find((item) => item.folio === folio);
  printDiagnosticos(diagnostico ? [diagnostico] : []);
}

function printDiagnosticos(diagnosticos) {
  if (!diagnosticos.length) {
    setSaveStatus("No hay hojas para imprimir con esa opcion.");
    return;
  }

  const printRoot = document.querySelector("#printRoot") || createPrintRoot();
  const originalTitle = document.title;
  let cleanupTimer;
  const cleanup = () => {
    window.clearTimeout(cleanupTimer);
    printRoot.innerHTML = "";
    document.title = originalTitle;
    window.removeEventListener("afterprint", cleanup);
  };

  printRoot.innerHTML = diagnosticos
    .map((diagnostico) => `<section class="printPage">${renderHojaDocument(diagnostico)}</section>`)
    .join("");
  document.title = `NovaFix - ${diagnosticos.length} hoja(s)`;
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
  setSaveStatus(`Zoom: ${state.zoom}%`);
}

function fitSheetToWidth() {
  const viewport = document.querySelector(".hojasViewport");
  const availableWidth = viewport.clientWidth - 36;
  const nextZoom = Math.floor((availableWidth / SHEET_WIDTH) * 100);
  applyZoom(Math.min(130, Math.max(50, nextZoom)));
}

function setSaveStatus(message) {
  elements.saveStatus.textContent = message;
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");

  if (!year || !month || !day) return escapeHtml(value);

  return `${day}/${month}/${year}`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
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

window.NovaFixHojas = {
  printByFolio,
};

init();
