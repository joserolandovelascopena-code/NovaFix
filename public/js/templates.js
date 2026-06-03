export function templatesHTML() {
  return;
  ` <div class="hoja">
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
      </div>`;
}
