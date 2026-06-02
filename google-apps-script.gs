const SHEET_NAME = "Diagnosticos";

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

function doGet() {
  return jsonResponse({
    ok: true,
    mensaje: "NovaFix Apps Script activo. Usa POST para guardar diagnosticos.",
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error(
        "No se recibio postData. No ejecutes doPost manualmente; usa testDoPost o envia desde la app.",
      );
    }

    const datos = JSON.parse(e.postData.contents);
    const hoja = getSheet();
    ensureHeaders(hoja);

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

    return jsonResponse({
      ok: true,
      mensaje: "Guardado correctamente",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      mensaje: error.message,
    });
  }
}

function testDoPost() {
  const eventoDePrueba = {
    postData: {
      contents: JSON.stringify({
        folio: "ITIR-PRUEBA-0001",
        fecha: "2026-05-28",
        hora: "22:05",
        usuarioResponsable: "Usuario de prueba",
        ubicacion: "Laboratorio",
        idEquipo: "PC-001",
        marcaModelo: "Dell OptiPlex",
        sistemaOperativo: "Windows 11",
        problema: "Prueba de guardado desde Apps Script.",
        diagnostico: "Evento simulado correctamente.",
        solucion: "Se valida appendRow.",
        estado: "Pendiente",
        tecnicoCargo: "Tecnico de prueba",
        fechaCierre: "",
        vistoBueno: "",
        observaciones: "Fila generada por testDoPost.",
        fechaPublicacion: "28 de mayo de 2026, 10:05 p.m.",
        creadoEn: new Date().toISOString(),
      }),
    },
  };

  return doPost(eventoDePrueba);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = spreadsheet.getSheetByName(SHEET_NAME);

  if (!hoja) {
    hoja = spreadsheet.insertSheet(SHEET_NAME);
  }

  return hoja;
}

function ensureHeaders(hoja) {
  if (hoja.getLastRow() > 0) {
    return;
  }

  hoja.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  hoja.setFrozenRows(1);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
