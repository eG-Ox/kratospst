const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'Fecha no disponible';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return 'Fecha no disponible';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const padCorrelativo = (value) => String(value || 0).padStart(5, '0');

const buildHtmlCotizacion = ({ venta, detalles, esCotizacion, subtotalRegular, descuento, total }) => {
  const staticBase = '/static';
  const clienteNombre = venta.cliente_nombre || '';
  const clienteApellido = venta.cliente_apellido || '';
  const clienteRazon = venta.razon_social || '';
  const clienteDisplay = clienteRazon || `${clienteNombre} ${clienteApellido}`.trim();
  const clienteDocumento = venta.cliente_ruc || venta.cliente_dni || '—';
  const notas = venta.nota || '';
  const fecha = formatDate(venta.fecha);
  const fechaCompleta = formatDateTime(venta.fecha);
  const documentType = (venta.tipo || 'VENTA').toUpperCase();
  const correlativo = padCorrelativo(venta.correlativo);

  const rowsHtml = detalles
    .map((item) => {
      const isKit = item.almacen_origen === 'kit';
      const descripcion = isKit ? `Kit<br>${escapeHtml(item.descripcion || '')}` : escapeHtml(item.descripcion || '');
      const marca = isKit ? 'Kit' : escapeHtml(item.marca || '');
      const precioRegular = Number(item.precio_regular || 0);
      const precioFinal = Number(item.precio_unitario || 0);
      const precioCell = esCotizacion
        ? `<div style="font-size: 0.7rem; color: #666;">Regular: S/. ${precioRegular.toFixed(2)}</div>
           <div style="font-weight: bold;">Final: S/. ${precioFinal.toFixed(2)}</div>`
        : `S/. ${precioFinal.toFixed(2)}`;

      return `
        <tr>
          <td>${escapeHtml(item.codigo || '')}</td>
          <td>${descripcion}</td>
          <td>${marca}</td>
          <td style="text-align:center;">${escapeHtml(item.cantidad || 0)}</td>
          <td>${precioCell}</td>
        </tr>
      `;
    })
    .join('');

  const subtotalLine = esCotizacion
    ? `<tr><td>Subtotal:</td><td>S/. ${subtotalRegular.toFixed(2)}</td></tr>`
    : `<tr><td>Subtotal:</td><td>S/. ${Number(venta.total || 0).toFixed(2)}</td></tr>`;

  const descuentoLine =
    esCotizacion && descuento > 0
      ? `<tr><td>Descuento:</td><td style="color:#0a0a0a;">- S/. ${descuento.toFixed(2)}</td></tr>`
      : '';

  const totalLine = esCotizacion
    ? `<tr class="summary-total"><td>TOTAL:</td><td>S/. ${total.toFixed(2)}</td></tr>`
    : `<tr class="summary-total"><td>TOTAL:</td><td>S/. ${Number(venta.total || 0).toFixed(2)}</td></tr>`;

  const notasHtml = notas
    ? `<div class="notes-full-width">
        <div class="observations-section">
          <div class="observations-title">Notas Adicionales</div>
          <div class="observations-content">${escapeHtml(notas)}</div>
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentType} #${venta.id || 'N/A'} - KRATOS MAQUINARIAS</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    @page { size: A4; margin: 6mm 8mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; line-height: 1.1; color: #1f2937; background: #fff; font-size: 0.7rem; }
    .control-buttons { position: fixed; top: 15px; right: 15px; z-index: 1000; display: flex; flex-direction: column; gap: 8px; }
    .pdf-download-btn, .brand-toggle-btn { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 3px 8px rgba(15, 23, 42, 0.25); font-size: 0.7rem; }
    .brand-toggle-btn.active { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); }
    .invoice-container { width: 100%; max-width: 210mm; margin: auto; padding: 2px; background: white; min-height: 280mm; max-height: 290mm; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .watermark-logo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 1; width: 400%; height: 250px; background-image: url('${staticBase}/img/KRATOS_LOGO.PNG'); background-size: contain; background-repeat: no-repeat; background-position: center; pointer-events: none; max-width: 100%; max-height: 100%; }
    .brands-logos-only { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding: 0 2px; }
    .brand-logo-color { height: 12px; object-fit: contain; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 2px solid #0f172a; background: white; position: relative; }
    .company-info { max-width: 58%; }
    .company-logo { width: 75px; margin-bottom: 4px; }
    .company-name { font-size: 0.85rem; font-weight: 700; margin-bottom: 3px; color: #000; }
    .company-details { font-size: 0.6rem; color: #333; line-height: 1.2; }
    .company-details div { margin-bottom: 1px; }
    .company-details strong { color: #000; }
    .document-info { text-align: right; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 8px; border-radius: 4px; min-width: 160px; border: 2px solid #0f172a; }
    .document-type { font-size: 0.8rem; font-weight: 700; }
    .document-number { font-size: 0.75rem; margin-top: 2px; font-weight: 700; }
    .document-date { font-size: 0.65rem; margin-top: 2px; font-weight: 600; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px; padding: 6px; background: #f8fafc; font-size: 0.6rem; position: relative; }
    .info-column h3 { font-size: 0.65rem; margin-bottom: 3px; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 1px; color: #000; font-weight: 700; text-transform: uppercase; }
    .info-row { display: flex; margin-bottom: 2px; align-items: center; }
    .info-label { min-width: 70px; font-weight: 700; color: #000; }
    .info-value { flex: 1; color: #000; font-weight: 500; }
    .products-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 0.6rem; border-radius: 4px; overflow: hidden; border: 2px solid #0f172a; background: white; position: relative; }
    .products-table th { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white !important; padding: 6px 4px; text-align: left; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #0f172a; font-size: 0.55rem; }
    .products-table td { padding: 4px; border-bottom: 1px solid #e5e7eb; background: white; color: #000; font-weight: 500; vertical-align: top; }
    .products-table tr:nth-child(even) td { background: #f9fafb; }
    .products-table td:last-child, .products-table th:last-child { text-align: right; font-weight: 700; color: #000; }
    .products-table td:nth-child(4), .products-table th:nth-child(4) { text-align: center; }
    .products-table.hide-brand th:nth-child(3), .products-table.hide-brand td:nth-child(3) { display: none; }
    .products-table.hide-brand th:nth-child(2), .products-table.hide-brand td:nth-child(2) { width: 60%; }
    .observations-section { margin-bottom: 8px; padding: 6px; background: white; color: #000; border-radius: 4px; font-size: 0.65rem; border: 1.5px solid #0f172a; position: relative; }
    .observations-title { font-weight: 700; margin-bottom: 4px; text-transform: uppercase; color: #000; font-size: 0.6rem; }
    .observations-content { line-height: 1.2; font-weight: 500; color: #000; }
    .bottom-section { margin-top: auto; }
    .notes-full-width { width: 100%; margin-bottom: 12px; }
    .payment-summary-section { display: grid; grid-template-columns: 1fr 200px; gap: 10px; }
    .payment-info { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1.5px solid #0f172a; border-radius: 4px; padding: 6px; font-size: 0.6rem; position: relative; height: fit-content; }
    .payment-title { font-weight: 700; margin-bottom: 6px; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 2px; color: #000; text-transform: uppercase; font-size: 0.6rem; }
    .banks-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 3px; }
    .bank-section { padding: 3px 4px; border-radius: 3px; font-size: 0.5rem; border: 1px solid; display: flex; align-items: center; gap: 4px; min-height: 24px; }
    .bank-section.bcp { background: white; border-color: #0369a1; border-left: 2px solid #0369a1; }
    .bank-section.bcp-soles { background: white; border-color: #0369a1; border-left: 2px solid #0369a1; }
    .bank-section.bbva { background: white; border-color: #1e40af; border-left: 2px solid #1e40af; }
    .bank-section.yape { background: white; border-color: #16a34a; border-left: 2px solid #16a34a; }
    .bank-logo { width: 24px; height: 14px; object-fit: contain; flex-shrink: 0; margin-left: auto; }
    .bank-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .bank-cta { font-weight: 700; color: #000; white-space: nowrap; font-size: 0.52rem; }
    .bank-cci { font-weight: 600; color: #333; white-space: nowrap; font-size: 0.48rem; }
    .summary-section { border: 2px solid #0f172a; border-radius: 8px; font-size: 0.65rem; background: white; position: relative; height: fit-content; align-self: start; }
    .summary-table { width: 100%; border-collapse: collapse; }
    .summary-table td { padding: 6px 8px; border-bottom: 1px solid #ccc; }
    .summary-table td:first-child { font-weight: 700; color: #000; }
    .summary-table td:last-child { text-align: right; font-weight: 700; color: #000; }
    .summary-total { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white !important; font-weight: 700; font-size: 0.8rem; }
    .summary-total td { color: white !important; border-bottom: none; padding: 8px; }
    .footer { text-align: center; font-size: 0.65rem; color: #333; border-top: 2px solid #1e3a8a; margin-top: 12px; padding-top: 8px; background: white; position: relative; }
    .footer p:first-child { font-weight: 700; color: #000; margin-bottom: 3px; }
    @media print {
      body { font-size: 0.7rem; }
      .invoice-container { box-shadow: none; padding: 0; max-width: none; margin: 0; }
      .control-buttons { display: none !important; }
      .watermark-logo { opacity: 0.06 !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .products-table th, .summary-total, .document-info { background: #0f172a !important; color: white !important; }
      .products-table th { color: white !important; }
      .header, .info-section, .products-table, .summary-section, .payment-info, .footer { border-color: #0f172a !important; background: white !important; }
      .observations-section { background: white !important; color: #1e40af !important; border-color: #0f172a !important; }
      .observations-title { color: #1e3a8a !important; }
      .observations-content { color: #1e40af !important; }
      .footer { page-break-after: always; }
    }
    .header, .info-section, .products-table, .observations-section, .payment-info, .summary-section, .footer { background: white; position: relative; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
<div class="control-buttons">
  <button class="pdf-download-btn" onclick="downloadPDF()">📄 Guardar como PDF</button>
  <button class="brand-toggle-btn" onclick="toggleBrandColumn()">🏷️ Ocultar Marca</button>
</div>

<div class="invoice-container" id="invoice-content">
  <div class="watermark-logo"></div>
  <div class="header">
    <div class="company-info">
      <img src="${staticBase}/img/KRATOS_LOGO.PNG" alt="Logo" class="company-logo">
      <div class="company-name">KRATOS MAQUINARIAS E.I.R.L</div>
      <div class="company-details">
        <div><strong>RUC:</strong> 20610448926</div>
        <div><strong>DIRECCION:</strong> Jr. Restauracion N.º 505, Breña, Lima</div>
        <div><strong>Teléfono:</strong> 995 634 841</div>
        <div><strong>Email:</strong> ventas@kratosmaquinarias.com</div>
      </div>
    </div>
    <div class="document-info">
      <div class="document-type">${documentType}</div>
      <div class="document-number">N°: ${escapeHtml(venta.serie || '')}-${correlativo}</div>
      <div class="document-date">${fecha}</div>
    </div>
  </div>

  <div class="brands-logos-only">
    <img src="${staticBase}/img/LOGOS PDF/FERTON.png" alt="FERTON" class="brand-logo-color">
    <img src="${staticBase}/img/LOGOS PDF/HONDA.png" alt="HONDA" class="brand-logo-color">
    <img src="${staticBase}/img/LOGOS PDF/KARCHER.png" alt="KARCHER" class="brand-logo-color">
    <img src="${staticBase}/img/LOGOS PDF/big red.png" alt="Big Red" class="brand-logo-color">
    <img src="${staticBase}/img/LOGOS PDF/campbell.png" alt="Campbell" class="brand-logo-color">
    <img src="${staticBase}/img/LOGOS PDF/khomander.png" alt="Khomander" class="brand-logo-color">
    <img src="${staticBase}/img/LOGOS PDF/bonelly.png" alt="Bonelly" class="brand-logo-color">
    <img src="${staticBase}/img/LOGOS PDF/WARC.png" alt="WARC" class="brand-logo-color">
  </div>

  <div class="info-section">
    <div class="info-column">
      <h3>Cliente</h3>
      <div class="info-row"><span class="info-label">Nombre:</span><span class="info-value">${escapeHtml(clienteDisplay)}</span></div>
      <div class="info-row"><span class="info-label">RUC:</span><span class="info-value">${escapeHtml(clienteDocumento)}</span></div>
      <div class="info-row"><span class="info-label">Direccion:</span><span class="info-value">${escapeHtml(venta.cliente_direccion || '—')}</span></div>
      <div class="info-row"><span class="info-label">Telefono:</span><span class="info-value">${escapeHtml(venta.cliente_telefono || '—')}</span></div>
    </div>
    <div class="info-column">
      <h3>Vendedor</h3>
      <div class="info-row"><span class="info-label">Vendedor:</span><span class="info-value">${escapeHtml(venta.vendedor_nombre || '')}</span></div>
      <div class="info-row"><span class="info-label">Celular:</span><span class="info-value">${escapeHtml(venta.vendedor_celular || '—')}</span></div>
    </div>
  </div>

  <table class="products-table" id="productsTable">
    <thead>
      <tr>
        <th>Codigo</th>
        <th>Descripcion</th>
        <th>Marca</th>
        <th style="text-align:center;">Cant.</th>
        <th>Precio Unit.</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="bottom-section">
    ${notasHtml}
    <div class="payment-summary-section">
      <div class="payment-info">
        <div class="payment-title">Informacion de Pago</div>
        <div class="banks-grid">
          <div class="bank-section bcp">
            <img src="${staticBase}/img/LOGOS PDF/BCP.png" alt="BCP" class="bank-logo">
            <div class="bank-info">
              <span class="bank-cta">Soles: 192-99279-14057</span>
              <span class="bank-cci">CCI:  00219200992791405730</span>
            </div>
          </div>
          <div class="bank-section bbva">
            <img src="${staticBase}/img/LOGOS PDF/BBVA.png" alt="BBVA" class="bank-logo">
            <div class="bank-info">
              <span class="bank-cta">Soles: 001101640200783975</span>
              <span class="bank-cci">CCI: -</span>
            </div>
          </div>
          <div class="bank-section bcp-soles">
            <img src="${staticBase}/img/LOGOS PDF/BCP.png" alt="BCP" class="bank-logo">
            <div class="bank-info">
              <span class="bank-cta">Dolares: 193-99525-55166</span>
              <span class="bank-cci">CCI:  00219300995255516611</span>
            </div>
          </div>
          <div class="bank-section yape">
            <img src="${staticBase}/img/LOGOS PDF/yape.png" alt="YAPE" class="bank-logo">
            <div class="bank-info">
              <span class="bank-cta">933 912 288</span>
              <span class="bank-cci">A NOMBRE KRATOS MAQUINARIAS</span>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <table class="summary-table">
          ${subtotalLine}
          ${descuentoLine}
          ${totalLine}
        </table>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Gracias por su confianza</p>
    <p>Documento generado electronicamente - ${fechaCompleta}</p>
  </div>
</div>

<script>
  function toggleBrandColumn() {
    const table = document.getElementById('productsTable');
    const button = document.querySelector('.brand-toggle-btn');
    if (table.classList.contains('hide-brand')) {
      table.classList.remove('hide-brand');
      button.textContent = '🏷️ Ocultar Marca';
      button.classList.remove('active');
    } else {
      table.classList.add('hide-brand');
      button.textContent = '🏷️ Mostrar Marca';
      button.classList.add('active');
    }
  }

  async function downloadPDF() {
    try {
      const button = document.querySelector('.pdf-download-btn');
      button.textContent = '⏳ Generando PDF...';
      button.disabled = true;
      const controlButtons = document.querySelector('.control-buttons');
      controlButtons.style.display = 'none';
      const element = document.getElementById('invoice-content');
      const canvas = await html2canvas(element, {
        scale: 1.8,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const xOffset = 5;
      const yOffset = 5;
      const finalImgWidth = imgWidth - 10;
      const finalImgHeight = imgHeight;
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalImgWidth, finalImgHeight);
      const clienteNombre = '${escapeHtml(clienteDisplay)}'.trim();
      const numeroDoc = '${escapeHtml(venta.serie || '')}-${correlativo}';
      const clienteLimpio = clienteNombre
        .replace(/[^a-zA-Z0-9\\s]/g, '')
        .replace(/\\s+/g, '_')
        .toUpperCase();
      const filename = clienteLimpio
        ? clienteLimpio + '_' + numeroDoc + '.pdf'
        : 'COTIZACION_' + numeroDoc + '.pdf';
      pdf.save(filename);
      controlButtons.style.display = '';
      button.textContent = '📄 Guardar como PDF';
      button.disabled = false;
    } catch (error) {
      const controlButtons = document.querySelector('.control-buttons');
      const button = document.querySelector('.pdf-download-btn');
      controlButtons.style.display = '';
      button.textContent = '📄 Guardar como PDF';
      button.disabled = false;
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  }
</script>
</body>
</html>`;
};

const getNextSerieCorrelativo = async (connection, serie) => {
  const [rows] = await connection.execute(
    'SELECT MAX(correlativo) as max_correlativo FROM cotizaciones WHERE serie = ?',
    [serie]
  );
  const max = rows[0]?.max_correlativo || 0;
  return { serie, correlativo: Number(max) + 1 };
};

const normalizarProductos = (body) => {
  if (Array.isArray(body.productos)) {
    return body.productos.map((item) => ({
      producto_id: Number(item.producto_id),
      cantidad: Number(item.cantidad || 0),
      precio_unitario: Number(item.precio_unitario || 0),
      precio_regular: Number(item.precio_regular || item.precio_unitario || 0),
      almacen_origen: 'productos'
    }));
  }

  const ids = body.producto_id || body.productos || [];
  const cantidades = body.cantidad || [];
  const precios = body.precio_unitario || [];
  const preciosReg = body.precio_regular || [];
  const almacenes = body.almacen_origen || [];

  return ids.map((id, idx) => ({
    producto_id: Number(id),
    cantidad: Number(cantidades[idx] || 0),
    precio_unitario: Number(precios[idx] || 0),
    precio_regular: Number(preciosReg[idx] || precios[idx] || 0),
    almacen_origen: almacenes[idx] || 'productos'
  }));
};

const calcularTotales = (items) => {
  let subtotal = 0;
  let descuento = 0;

  items.forEach((item) => {
    const regular = Number(item.precio_regular || 0);
    const final = Number(item.precio_unitario || 0);
    const cantidad = Number(item.cantidad || 0);
    subtotal += regular * cantidad;
    if (regular > final) {
      descuento += (regular - final) * cantidad;
    }
  });

  const total = Math.max(subtotal - descuento, 0);
  return { subtotal, descuento, total };
};

exports.formularioCotizaciones = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [clientes] = await connection.execute(
      `SELECT id, tipo_cliente, dni, ruc, nombre, apellido, razon_social
       FROM clientes ORDER BY id DESC`
    );
    const [tipos] = await connection.execute(
      'SELECT id, nombre FROM tipos_maquinas ORDER BY nombre'
    );
    const [ultimas] = await connection.execute(
      `SELECT id, fecha, total, descuento, serie, correlativo
       FROM cotizaciones
       ORDER BY id DESC LIMIT 10`
    );
    connection.release();

    res.json({ clientes, tipos, ultimas });
  } catch (error) {
    console.error('Error obteniendo formulario:', error);
    res.status(500).json({ error: 'Error al obtener datos de cotizacion' });
  }
};

exports.listarCotizaciones = async (req, res) => {
  const { cliente_id, usuario_id, fecha_inicio, fecha_fin } = req.query;
  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT c.id, c.fecha, c.total, c.descuento, c.serie, c.correlativo,
        c.usuario_id, c.cliente_id,
        cl.tipo_cliente, cl.nombre as cliente_nombre, cl.apellido as cliente_apellido, cl.razon_social
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE 1=1
    `;
    const params = [];
    if (cliente_id) {
      query += ' AND c.cliente_id = ?';
      params.push(cliente_id);
    }
    if (usuario_id) {
      query += ' AND c.usuario_id = ?';
      params.push(usuario_id);
    }
    if (fecha_inicio) {
      query += ' AND c.fecha >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND c.fecha <= ?';
      params.push(fecha_fin);
    }
    query += ' ORDER BY c.fecha DESC';
    const [rows] = await connection.execute(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando cotizaciones:', error);
    res.status(500).json({ error: 'Error al listar cotizaciones' });
  }
};

exports.listarHistorialCotizaciones = async (req, res) => {
  const { cliente_id, usuario_id, fecha_inicio, fecha_fin, limite = 50, pagina = 1 } = req.query;
  const limitValue = Number.parseInt(limite, 10);
  const pageValue = Number.parseInt(pagina, 10);
  const safeLimit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 50;
  const safePage = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const offset = (safePage - 1) * safeLimit;

  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT
        h.id,
        h.cotizacion_id,
        h.usuario_id,
        h.accion,
        h.descripcion,
        h.created_at,
        u.nombre as usuario_nombre,
        c.serie,
        c.correlativo,
        c.total,
        c.cliente_id,
        cl.tipo_cliente,
        cl.nombre as cliente_nombre,
        cl.apellido as cliente_apellido,
        cl.razon_social
      FROM historial_cotizaciones h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN cotizaciones c ON h.cotizacion_id = c.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE 1=1
    `;
    const params = [];

    if (cliente_id) {
      query += ' AND c.cliente_id = ?';
      params.push(cliente_id);
    }
    if (usuario_id) {
      query += ' AND h.usuario_id = ?';
      params.push(usuario_id);
    }
    if (fecha_inicio) {
      query += ' AND h.created_at >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND h.created_at <= ?';
      params.push(fecha_fin);
    }

    query += ` ORDER BY h.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    const [rows] = await connection.execute(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando historial de cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener historial de cotizaciones' });
  }
};

exports.obtenerCotizacion = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [cotizaciones] = await connection.execute(
      'SELECT * FROM cotizaciones WHERE id = ?',
      [req.params.id]
    );
    if (!cotizaciones.length) {
      connection.release();
      return res.status(404).json({ error: 'Cotizacion no encontrada' });
    }
    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion, m.marca
       FROM detalle_cotizacion d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.cotizacion_id = ?`,
      [req.params.id]
    );
    connection.release();
    res.json({ cotizacion: cotizaciones[0], detalles });
  } catch (error) {
    console.error('Error obteniendo cotizacion:', error);
    res.status(500).json({ error: 'Error al obtener cotizacion' });
  }
};

exports.crearCotizacion = async (req, res) => {
  const { cliente_id, notas } = req.body;
  const items = normalizarProductos(req.body).filter((item) => item.producto_id && item.cantidad);

  if (!items.length) {
    return res.status(400).json({ error: 'Debe agregar productos a la cotizacion' });
  }

  try {
    const connection = await pool.getConnection();
    const { serie, correlativo } = await getNextSerieCorrelativo(connection, 'COT');
    const { descuento, total } = calcularTotales(items);

    const [ventaResult] = await connection.execute(
      `INSERT INTO cotizaciones
       (usuario_id, cliente_id, total, descuento, nota, serie, correlativo, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [req.usuario.id, cliente_id || null, total, descuento, notas || null, serie, correlativo]
    );

    const ventaId = ventaResult.insertId;
    for (const item of items) {
      const subtotal = Number(item.precio_unitario || 0) * Number(item.cantidad || 0);
      await connection.execute(
        `INSERT INTO detalle_cotizacion
         (cotizacion_id, producto_id, cantidad, precio_unitario, precio_regular, subtotal, almacen_origen)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.precio_regular,
          subtotal,
          item.almacen_origen || 'productos'
        ]
      );
    }

    await connection.execute(
      `INSERT INTO historial_cotizaciones (cotizacion_id, usuario_id, accion, descripcion)
       VALUES (?, ?, 'crear', 'Cotizacion creada')`,
      [ventaId, req.usuario.id]
    );

    await registrarHistorial(connection, {
      entidad: 'cotizaciones',
      entidad_id: ventaId,
      usuario_id: req.usuario.id,
      accion: 'crear',
      descripcion: 'Cotizacion creada',
      antes: null,
      despues: { id: ventaId, total, descuento, cliente_id: cliente_id || null, items }
    });

    connection.release();

    res.status(201).json({ id: ventaId, serie, correlativo });
  } catch (error) {
    console.error('Error creando cotizacion:', error);
    res.status(500).json({ error: 'Error al crear cotizacion' });
  }
};

exports.editarCotizacion = async (req, res) => {
  const { cliente_id, notas } = req.body;
  const items = normalizarProductos(req.body).filter((item) => item.producto_id && item.cantidad);
  if (!items.length) {
    return res.status(400).json({ error: 'Debe agregar productos a la cotizacion' });
  }

  try {
    const connection = await pool.getConnection();
    const [prevCot] = await connection.execute('SELECT * FROM cotizaciones WHERE id = ?', [
      req.params.id
    ]);
    if (!prevCot.length) {
      connection.release();
      return res.status(404).json({ error: 'Cotizacion no encontrada' });
    }
    const [prevDetalles] = await connection.execute(
      'SELECT * FROM detalle_cotizacion WHERE cotizacion_id = ?',
      [req.params.id]
    );

    const { descuento, total } = calcularTotales(items);

    await connection.execute(
      `UPDATE cotizaciones
       SET cliente_id = ?, total = ?, descuento = ?, nota = ?
       WHERE id = ?`,
      [cliente_id || null, total, descuento, notas || null, req.params.id]
    );

    await connection.execute('DELETE FROM detalle_cotizacion WHERE cotizacion_id = ?', [
      req.params.id
    ]);
    for (const item of items) {
      const subtotal = Number(item.precio_unitario || 0) * Number(item.cantidad || 0);
      await connection.execute(
        `INSERT INTO detalle_cotizacion
         (cotizacion_id, producto_id, cantidad, precio_unitario, precio_regular, subtotal, almacen_origen)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.params.id,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.precio_regular,
          subtotal,
          item.almacen_origen || 'productos'
        ]
      );
    }

    await registrarHistorial(connection, {
      entidad: 'cotizaciones',
      entidad_id: req.params.id,
      usuario_id: req.usuario.id,
      accion: 'editar',
      descripcion: 'Cotizacion actualizada',
      antes: { cotizacion: prevCot[0], detalles: prevDetalles },
      despues: { cotizacion: { ...prevCot[0], cliente_id: cliente_id || null, total, descuento, nota: notas || null }, detalles: items }
    });

    connection.release();
    res.json({ id: req.params.id });
  } catch (error) {
    console.error('Error editando cotizacion:', error);
    res.status(500).json({ error: 'Error al editar cotizacion' });
  }
};

exports.verCotizacion = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [ventas] = await connection.execute(
      `SELECT v.*, c.tipo_cliente, c.dni as cliente_dni, c.ruc as cliente_ruc,
        c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.razon_social,
        c.direccion as cliente_direccion, c.telefono as cliente_telefono,
        u.nombre as vendedor_nombre,
        u.telefono as vendedor_celular
       FROM cotizaciones v
       LEFT JOIN clientes c ON v.cliente_id = c.id
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [req.params.id]
    );

    if (!ventas.length) {
      connection.release();
      return res.status(404).json({ error: 'Cotizacion no encontrada' });
    }

    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion, m.marca
       FROM detalle_cotizacion d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.cotizacion_id = ?`,
      [req.params.id]
    );
    connection.release();

    const venta = ventas[0];
    const esCotizacion = true;
    const subtotalRegular = detalles.reduce(
      (acc, item) => acc + Number(item.precio_regular || 0) * Number(item.cantidad || 0),
      0
    );
    const descuento = detalles.reduce((acc, item) => {
      const regular = Number(item.precio_regular || 0);
      const final = Number(item.precio_unitario || 0);
      const cantidad = Number(item.cantidad || 0);
      return regular > final ? acc + (regular - final) * cantidad : acc;
    }, 0);
    const total = Math.max(subtotalRegular - descuento, 0);

    const html = buildHtmlCotizacion({
      venta,
      detalles,
      esCotizacion,
      subtotalRegular,
      descuento,
      total
    });
    res.send(html);
  } catch (error) {
    console.error('Error obteniendo cotizacion:', error);
    res.status(500).json({ error: 'Error al obtener cotizacion' });
  }
};

exports.pdfCotizacion = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [ventas] = await connection.execute(
      `SELECT v.*, c.tipo_cliente, c.dni as cliente_dni, c.ruc as cliente_ruc,
        c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.razon_social,
        c.direccion as cliente_direccion, c.telefono as cliente_telefono,
        u.nombre as vendedor_nombre,
        u.telefono as vendedor_celular
       FROM cotizaciones v
       LEFT JOIN clientes c ON v.cliente_id = c.id
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [req.params.id]
    );

    if (!ventas.length) {
      connection.release();
      return res.status(404).json({ error: 'Cotizacion no encontrada' });
    }

    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion, m.marca
       FROM detalle_cotizacion d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.cotizacion_id = ?`,
      [req.params.id]
    );
    connection.release();

    const venta = ventas[0];
    const esCotizacion = true;
    const subtotalRegular = detalles.reduce(
      (acc, item) => acc + Number(item.precio_regular || 0) * Number(item.cantidad || 0),
      0
    );
    const descuento = detalles.reduce((acc, item) => {
      const regular = Number(item.precio_regular || 0);
      const final = Number(item.precio_unitario || 0);
      const cantidad = Number(item.cantidad || 0);
      return regular > final ? acc + (regular - final) * cantidad : acc;
    }, 0);
    const total = Math.max(subtotalRegular - descuento, 0);

    const html = buildHtmlCotizacion({
      venta,
      detalles,
      esCotizacion,
      subtotalRegular,
      descuento,
      total
    });
    res.send(html);
  } catch (error) {
    console.error('Error generando pdf:', error);
    res.status(500).json({ error: 'Error al generar pdf' });
  }
};

exports.buscarProductos = async (req, res) => {
  const { q = '', limit = 20 } = req.query;
  const term = `%${q}%`;
  const limitValue = Number.parseInt(limit, 10);
  const safeLimit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 20;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, codigo, descripcion, marca, precio_venta, stock
      FROM maquinas
      WHERE codigo LIKE ? OR descripcion LIKE ? OR marca LIKE ?
       ORDER BY descripcion
       LIMIT ${safeLimit}`,
      [term, term, term]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, codigo, descripcion, marca, precio_venta, stock
       FROM maquinas WHERE id = ?`,
      [req.params.id]
    );
    connection.release();

    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

exports.filtrosCotizacion = async (req, res) => {
  const { tipo } = req.query;

  try {
    const connection = await pool.getConnection();
    let query = `SELECT DISTINCT marca FROM maquinas WHERE marca IS NOT NULL AND marca <> ''`;
    const params = [];
    if (tipo) {
      query += ' AND tipo_maquina_id = ?';
      params.push(tipo);
    }
    query += ' ORDER BY marca';
    const [rows] = await connection.execute(query, params);
    connection.release();

    res.json(rows.map((row) => row.marca));
  } catch (error) {
    console.error('Error obteniendo marcas:', error);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
};

exports.productosCotizacion = async (req, res) => {
  const { tipo, marca } = req.query;

  try {
    const connection = await pool.getConnection();
    let query = `SELECT id, codigo, descripcion, marca, precio_venta, stock
      FROM maquinas WHERE 1=1`;
    const params = [];
    if (tipo) {
      query += ' AND tipo_maquina_id = ?';
      params.push(tipo);
    }
    if (marca) {
      query += ' AND marca = ?';
      params.push(marca);
    }
    query += ' ORDER BY descripcion';
    const [rows] = await connection.execute(query, params);
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};
