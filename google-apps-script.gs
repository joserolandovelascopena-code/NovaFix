const SHEET_NAME = "NovaFix_Diagnosticos";

const HEADERS = [
  "Folio",
  "Fecha",
  "Hora",
  "Usuario Responsable",
  "Ubicacion",
  "ID Equipo",
  "Marca Modelo",
  "Sistema Operativo",
  "Problema",
  "Diagnostico",
  "Solucion",
  "Estado",
  "Tecnico a Cargo",
  "Fecha de Cierre",
  "Visto Bueno Encargado",
  "Observaciones",
  "Fecha de Publicacion",
  "Creado En",
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || "list";

  if (action === "list") {
    return jsonResponse({
      ok: true,
      diagnosticos: getDiagnosticos(),
    });
  }

  return jsonResponse({
    ok: true,
    message: "NovaFix funcionando",
  });
}

function doPost(e) {
  const datos = JSON.parse(e.postData.contents);
  const action = datos.action || "create";
  const hoja = getSheet();

  if (action === "delete") {
    deleteDiagnostico(hoja, datos.folio);
    return jsonResponse({ ok: true });
  }

  if (action === "update") {
    updateDiagnostico(hoja, datos);
    return jsonResponse({ ok: true });
  }

  hoja.appendRow([
    datos.folio || "",
    datos.fecha || "",
    datos.hora || "",
    datos.usuarioResponsable || "",
    datos.ubicacion || "",
    datos.idEquipo || "",
    datos.marcaModelo || "",
    datos.sistemaOperativo || "",
    datos.problema || "",
    datos.diagnostico || "",
    datos.solucion || "",
    datos.estado || "",
    datos.tecnicoCargo || "",
    datos.fechaCierre || "",
    datos.vistoBueno || "",
    datos.observaciones || "",
    datos.fechaPublicacion || "",
    datos.creadoEn || new Date().toISOString(),
  ]);

  return jsonResponse({ ok: true });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = spreadsheet.getSheetByName(SHEET_NAME);

  if (!hoja) {
    hoja = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders(hoja);
  return hoja;
}

function getDiagnosticos() {
  const hoja = getSheet();
  const lastRow = hoja.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  return hoja
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getValues()
    .map(rowToDiagnostico)
    .filter((diagnostico) => diagnostico.folio);
}

function rowToDiagnostico(row) {
  return {
    folio: row[0] || "",
    fecha: dateToInputValue(row[1]),
    hora: timeToInputValue(row[2]),
    usuarioResponsable: row[3] || "",
    ubicacion: row[4] || "",
    idEquipo: row[5] || "",
    marcaModelo: row[6] || "",
    sistemaOperativo: row[7] || "",
    problema: row[8] || "",
    diagnostico: row[9] || "",
    solucion: row[10] || "",
    estado: row[11] || "",
    tecnicoCargo: row[12] || "",
    fechaCierre: dateToInputValue(row[13]),
    vistoBueno: row[14] || "",
    observaciones: row[15] || "",
    fechaPublicacion: row[16] || "",
    creadoEn: row[17] || "",
  };
}

function updateDiagnostico(hoja, datos) {
  const rowNumber = findRowByFolio(hoja, datos.originalFolio || datos.folio);

  if (!rowNumber) {
    throw new Error("No se encontro la hoja con folio " + datos.folio);
  }

  hoja.getRange(rowNumber, 1, 1, HEADERS.length).setValues([
    [
      datos.folio || "",
      datos.fecha || "",
      datos.hora || "",
      datos.usuarioResponsable || "",
      datos.ubicacion || "",
      datos.idEquipo || "",
      datos.marcaModelo || "",
      datos.sistemaOperativo || "",
      datos.problema || "",
      datos.diagnostico || "",
      datos.solucion || "",
      datos.estado || "",
      datos.tecnicoCargo || "",
      datos.fechaCierre || "",
      datos.vistoBueno || "",
      datos.observaciones || "",
      datos.fechaPublicacion || "",
      datos.creadoEn || new Date().toISOString(),
    ],
  ]);
}

function deleteDiagnostico(hoja, folio) {
  const rowNumber = findRowByFolio(hoja, folio);

  if (!rowNumber) {
    throw new Error("No se encontro la hoja con folio " + folio);
  }

  hoja.deleteRow(rowNumber);
}

function findRowByFolio(hoja, folio) {
  if (!folio) return null;

  const lastRow = hoja.getLastRow();

  if (lastRow <= 1) {
    return null;
  }

  const folios = hoja.getRange(2, 1, lastRow - 1, 1).getValues();
  const index = folios.findIndex((row) => String(row[0]) === String(folio));

  return index >= 0 ? index + 2 : null;
}

function dateToInputValue(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
  }

  return String(value);
}

function timeToInputValue(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }

  return String(value);
}

function ensureHeaders(hoja) {
  if (hoja.getLastRow() > 0) {
    return;
  }

  hoja.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  hoja.setFrozenRows(1);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
