import { useState } from 'react';
import { getToday } from '../utils/ventasUtils';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderItemsTable = (items, headers) => {
  if (!items || items.length === 0) return '';
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = items
    .map((item) => `<tr>${item.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `
    <table class="tabla">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
};

const useVentaImpresion = ({
  ventas,
  pendientesDia,
  usuariosVentas,
  obtenerVentaDetalle,
  ventaTieneDetalle
}) => {
  const [hojaCargando, setHojaCargando] = useState(false);

  const abrirRotulo = (venta) => {
    if (!venta) return;
    const agenciaDestino = `${venta.agencia || '-'}` + (venta.destino ? ` - ${venta.destino}` : '');
    const agenciaOtro = venta.agencia === 'OTROS' && venta.agenciaOtro ? venta.agenciaOtro : '';

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Rotulo Venta #${venta.id}</title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: 'IBM Plex Sans', sans-serif;
              display: flex;
              align-items: flex-start;
              justify-content: flex-start;
              min-height: 100vh;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              width: calc(297mm - 16mm);
              height: calc(210mm - 16mm);
              margin: 8mm;
              border: 3px solid #f5b000;
              border-radius: 8mm;
              padding: 10mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 6mm;
              text-align: center;
              position: relative;
              background: #fff;
            }
            .watermark {
              position: absolute;
              inset: 16mm 20mm;
              display: grid;
              place-items: center;
              opacity: 0.12;
              pointer-events: none;
              z-index: 0;
            }
            .watermark img { width: 100%; height: 100%; object-fit: contain; }
            .logo { width: 50mm; position: absolute; top: 8mm; left: 8mm; }
            .content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 6mm;
              padding-top: 10mm;
              z-index: 1;
            }
            .header { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
            .dni { font-size: 22mm; font-weight: 900; color: #0f3f91; letter-spacing: 0.04em; width: 100%; text-align: center; margin: 0; }
            .nombre { font-size: 30mm; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.02; margin: 0; }
            .destino { font-size: 20mm; font-weight: 900; color: #0f3f91; text-transform: uppercase; line-height: 1.08; margin: 0; }
            .agencia { font-size: 18mm; font-weight: 900; color: #0f3f91; text-transform: uppercase; line-height: 1.08; margin: 0; }
            .print-btn { position: fixed; top: 12px; right: 12px; padding: 10px 16px; border-radius: 999px; border: 1px solid #cbd5f5; background: #fff; cursor: pointer; }
            @media print {
              .print-btn { display: none; }
              body { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Imprimir</button>
          <div class="sheet">
            <div class="watermark"><img src="/static/img/KRATOS_LOGO.PNG" alt="" /></div>
            <img src="/static/img/KRATOS_LOGO.PNG" class="logo" alt="Kratos" />
            <div class="content" id="rotuloContent">
              <div class="header">
                <div class="dni" data-base="22">${(venta.documentoTipo || 'dni').toUpperCase()} ${venta.documento || '-'}</div>
              </div>
              <div class="nombre" data-base="30">${venta.clienteNombre || '-'}</div>
              <div class="destino" data-base="20">${agenciaDestino}</div>
              ${agenciaOtro ? `<div class="agencia" data-base="18">${agenciaOtro}</div>` : ''}
            </div>
          </div>
          <script>
            (function () {
              const container = document.getElementById('rotuloContent');
              if (!container) return;
              const maxHeight = () => container.parentElement.clientHeight - 28;
              const elements = Array.from(container.querySelectorAll('[data-base]'));
              elements.forEach((el) => {
                const base = Number(el.getAttribute('data-base')) || 18;
                el.style.fontSize = base + 'mm';
              });
              let guard = 80;
              while (container.scrollHeight > maxHeight() && guard-- > 0) {
                elements.forEach((el) => {
                  const current = parseFloat(el.style.fontSize);
                  const next = Math.max(current - 0.6, 10);
                  el.style.fontSize = next + 'mm';
                });
              }
            })();
          </script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Bloqueador de popups: permite abrir la pestana para imprimir el rotulo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const abrirHojaRequerimiento = async () => {
    if (hojaCargando) return;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Bloqueador de popups: permite abrir la pestana para imprimir la hoja.');
      return;
    }

    win.document.open();
    win.document.write(
      '<!doctype html><html><body style="font-family: sans-serif; padding: 20px;">Cargando hoja...</body></html>'
    );
    win.document.close();

    setHojaCargando(true);

    try {
      const pendientes = pendientesDia || [];
      const pendientesConDetalle = await Promise.all(
        pendientes.map(async (venta) => {
          if (!venta) return null;
          if (ventaTieneDetalle(venta)) return venta;
          try {
            const detalle = await obtenerVentaDetalle(venta.id);
            return detalle || null;
          } catch (err) {
            console.error('Error cargando detalle para hoja:', err);
            return null;
          }
        })
      );

      const pendientesFallidos = pendientesConDetalle.filter((venta) => !venta).length;
      const pendientesDetalle = pendientesConDetalle.filter(Boolean);
      const historialRequerimientos = new Map();
      const fechaHoja = getToday();

      const normalizarClaveReq = (item) => {
        const base = `${item?.codigo || ''} ${item?.descripcion || ''}`.trim();
        return base.toUpperCase();
      };

      const ventasOrdenadas = [...(ventas || [])].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      const ventasDetalleMap = new Map(pendientesDetalle.map((venta) => [venta.id, venta]));

      ventasOrdenadas.forEach((venta) => {
        const ventaDetalle = ventasDetalleMap.get(venta.id) || venta;
        if (!ventaTieneDetalle(ventaDetalle)) return;
        const items = [
          ...(ventaDetalle.requerimientos || []),
          ...(ventaDetalle.regaloRequerimientos || [])
        ];
        items.forEach((item) => {
          const proveedor = String(item?.proveedor || '').trim();
          const precioCompra = Number(item?.precioCompra || 0);
          if (!proveedor && !precioCompra) return;
          const key = normalizarClaveReq(item);
          if (!key || historialRequerimientos.has(key)) return;
          historialRequerimientos.set(key, {
            proveedor,
            precioCompra: precioCompra > 0 ? precioCompra : ''
          });
        });
      });

      const htmlPedidos = pendientesDetalle
        .map((venta) => {
          const vendedor = usuariosVentas.find((user) => String(user.id) === String(venta.vendedorId));
          const productosStock = venta.productos || [];
          const requerimientosCompra = venta.requerimientos || [];
          const regalosStock = venta.regalos || [];
          const regalosCompra = venta.regaloRequerimientos || [];

          const tablaStock = renderItemsTable(
            productosStock.map((item) => [
              `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
              item.cantidad || 0,
              `S/ ${Number(item.precioVenta || 0).toFixed(2)}`
            ]),
            ['Producto', 'Cantidad', 'Precio venta']
          );

          const tablaCompra = renderItemsTable(
            requerimientosCompra.map((item) => {
              const key = normalizarClaveReq(item);
              const hist = historialRequerimientos.get(key) || {};
              const proveedor = hist.proveedor || '';
              const compra = hist.precioCompra ? `S/ ${Number(hist.precioCompra || 0).toFixed(2)}` : '';
              return [
                `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
                item.cantidad || 0,
                proveedor,
                compra
              ];
            }),
            ['Producto', 'Cantidad', 'Proveedor', 'Compra']
          );

          const tablaRegalosStock = renderItemsTable(
            regalosStock.map((item) => [
              `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
              item.cantidad || 0,
              `S/ ${Number(item.precioCompra || 0).toFixed(2)}`
            ]),
            ['Regalo', 'Cantidad', 'Compra']
          );

          const tablaRegalosCompra = renderItemsTable(
            regalosCompra.map((item) => {
              const key = normalizarClaveReq(item);
              const hist = historialRequerimientos.get(key) || {};
              const proveedor = hist.proveedor || '';
              const compra = hist.precioCompra ? `S/ ${Number(hist.precioCompra || 0).toFixed(2)}` : '';
              return [
                `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
                item.cantidad || 0,
                proveedor,
                compra
              ];
            }),
            ['Regalo', 'Cantidad', 'Proveedor', 'Compra']
          );

          return `
            <section class="sheet">
              <div class="sheet-header">
                <img src="/static/img/KRATOS_LOGO.PNG" alt="Kratos" class="logo" />
                <div>
                  <h2>Hoja de requerimiento</h2>
                  <div class="subtitle">Fecha: ${escapeHtml(fechaHoja)}</div>
                </div>
              </div>
              <div class="meta">
                <div><strong>Venta ID:</strong> ${escapeHtml(venta.id)}</div>
                <div><strong>Cliente:</strong> ${escapeHtml(venta.clienteNombre || '-')}</div>
                <div><strong>Documento:</strong> ${escapeHtml(venta.documento || '-')}</div>
                <div><strong>Telefono:</strong> ${escapeHtml(venta.clienteTelefono || '-')}</div>
                <div><strong>Fecha venta:</strong> ${escapeHtml(venta.fechaVenta || '-')}</div>
                <div><strong>Agencia:</strong> ${escapeHtml(venta.agencia || '-')}</div>
                <div><strong>Destino:</strong> ${escapeHtml(venta.destino || '-')}</div>
                <div><strong>Vendedor:</strong> ${escapeHtml(vendedor?.nombre || venta.vendedorId || '-')}</div>
              </div>

              ${tablaStock ? `<h3>Productos en stock (tienda)</h3>${tablaStock}` : ''}
              ${tablaCompra ? `<h3>Productos a comprar</h3>${tablaCompra}` : ''}
              ${tablaRegalosStock ? `<h3>Regalos en stock (tienda)</h3>${tablaRegalosStock}` : ''}
              ${tablaRegalosCompra ? `<h3>Regalos a comprar</h3>${tablaRegalosCompra}` : ''}

              <div class="separator">______________________________________________</div>
            </section>
          `;
        })
        .join('');

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Hoja de requerimiento</title>
            <style>
              @page { size: A4; margin: 12mm; }
              * { box-sizing: border-box; }
              body { margin: 0; font-family: 'IBM Plex Sans', sans-serif; color: #0f172a; }
              .page { max-width: 820px; margin: 0 auto; padding: 0 10px 20px; }
              .print-btn { position: fixed; top: 12px; right: 12px; padding: 8px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #fff; cursor: pointer; }
              .sheet { padding-bottom: 6mm; page-break-inside: avoid; break-inside: avoid; }
              .sheet + .sheet { border-top: 1px dashed #cbd5f5; margin-top: 6mm; padding-top: 4mm; }
              .sheet-header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
              .logo { width: 64px; height: auto; }
              .subtitle { color: #64748b; font-size: 12px; }
              .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 10px; font-size: 11px; margin-bottom: 6px; }
              h2 { margin: 0; font-size: 16px; }
              h3 { margin: 8px 0 4px; font-size: 12px; }
              .tabla { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
              .tabla th, .tabla td { border: 1px solid #e2e8f0; padding: 4px 5px; text-align: left; vertical-align: top; }
              .tabla th:nth-child(3), .tabla td:nth-child(3) { width: 140px; }
              .tabla th:nth-child(4), .tabla td:nth-child(4) { width: 90px; }
              .separator { margin-top: 10px; text-align: center; color: #94a3b8; letter-spacing: 0.12em; font-size: 12px; }
              @media print { .print-btn { display: none; } }
            </style>
          </head>
          <body>
            <button class="print-btn" onclick="window.print()">Imprimir</button>
            <div class="page">
              ${pendientesFallidos ? `<div style="padding:10px 12px; margin: 10px 0; border: 1px solid #f1c40f; background: #fff9db; font-size: 12px;">No se pudieron cargar detalles para ${pendientesFallidos} ventas.</div>` : ''}
              ${htmlPedidos || '<div style="padding:16px">No hay ventas pendientes.</div>'}
            </div>
          </body>
        </html>
      `;

      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (error) {
      console.error('Error generando hoja de requerimiento:', error);
      win.document.open();
      win.document.write(
        '<!doctype html><html><body style="font-family: sans-serif; padding: 20px;">No se pudo generar la hoja.</body></html>'
      );
      win.document.close();
    } finally {
      setHojaCargando(false);
    }
  };

  return {
    hojaCargando,
    abrirRotulo,
    abrirHojaRequerimiento
  };
};

export default useVentaImpresion;
