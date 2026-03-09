import React, { useEffect, useMemo, useState } from 'react';
import VentasModalShell from './VentasModalShell';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => `S/ ${toNumber(value).toFixed(2)}`;

const formatUpper = (value, fallback = '-') => {
  const text = String(value || '').trim();
  return text ? text.toUpperCase() : fallback;
};

const buildBadgeClass = (estado) => String(estado || '').trim().toLowerCase();

const sumCantidad = (items = []) =>
  items.reduce((acc, item) => acc + toNumber(item?.cantidad || 0), 0);

const DetailTableCard = ({
  title,
  items = [],
  emptyMessage,
  headers = [],
  renderRow,
  footerText = null
}) => (
  <div className="ventas-card detalle-venta-card">
    <div className="detalle-venta-card__header">
      <h3>{title}</h3>
      <div className="detalle-venta-card__meta">
        <span className="detalle-venta-pill">{items.length} items</span>
        <span className="detalle-venta-pill">{sumCantidad(items)} uds</span>
      </div>
    </div>
    <div className="table-container">
      {items.length === 0 ? (
        <div className="empty-message">{emptyMessage}</div>
      ) : (
        <table className="ventas-table compact detalle-venta-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>{items.map(renderRow)}</tbody>
        </table>
      )}
    </div>
    {footerText && <div className="detalle-venta-card__footer">{footerText}</div>}
  </div>
);

const VentaDetalleModal = ({ venta, cargando, error, onClose }) => {
  const safeVenta = venta || {};
  const productos = safeVenta.productos || [];
  const requerimientos = safeVenta.requerimientos || [];
  const regalos = safeVenta.regalos || [];
  const regaloRequerimientos = safeVenta.regaloRequerimientos || [];
  const totalVenta = toNumber(safeVenta.pVenta || 0);
  const adelanto = toNumber(safeVenta.adelanto || 0);
  const saldo = Math.max(totalVenta - adelanto, 0);
  const agenciaLabel =
    safeVenta.agencia === 'OTROS' ? safeVenta.agenciaOtro || 'OTROS' : safeVenta.agencia || '-';
  const tabs = useMemo(() => {
    const next = [];
    if (productos.length > 0) {
      next.push({
        id: 'productos',
        label: `Productos (${productos.length})`
      });
    }
    if (requerimientos.length > 0 || regaloRequerimientos.length > 0) {
      next.push({
        id: 'requerimientos',
        label: `Requerimientos (${requerimientos.length + regaloRequerimientos.length})`
      });
    }
    if (regalos.length > 0) {
      next.push({
        id: 'regalos',
        label: `Regalos (${regalos.length})`
      });
    }
    return next;
  }, [productos.length, regalos.length, regaloRequerimientos.length, requerimientos.length]);
  const [activeTab, setActiveTab] = useState('productos');

  useEffect(() => {
    if (!tabs.length) return;
    const exists = tabs.some((tab) => tab.id === activeTab);
    if (!exists) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, tabs]);

  if (!venta) return null;

  return (
    <VentasModalShell title={`Detalle venta #${venta.id}`} onClose={onClose}>
      {cargando ? (
        <div className="empty-message">Cargando detalle...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="detalle-venta-layout">
          <div className="ventas-card ventas-card--full detalle-venta-resumen">
            <div className="detalle-venta-resumen__grid">
              <div className="detalle-venta-kpi">
                <span>Cliente</span>
                <strong>{venta.clienteNombre || '-'}</strong>
              </div>
              <div className="detalle-venta-kpi">
                <span>Documento</span>
                <strong>{formatUpper(venta.documentoTipo)}: {venta.documento || '-'}</strong>
              </div>
              <div className="detalle-venta-kpi">
                <span>Vendedor</span>
                <strong>{venta.vendedorNombre || '-'}</strong>
              </div>
              <div className="detalle-venta-kpi">
                <span>Fecha</span>
                <strong>{venta.fechaVenta || '-'}</strong>
              </div>
              <div className="detalle-venta-kpi">
                <span>Estado envio</span>
                <strong className={`badge ${buildBadgeClass(venta.estadoEnvio)}`}>
                  {venta.estadoEnvio || '-'}
                </strong>
              </div>
              <div className="detalle-venta-kpi">
                <span>Estado pedido</span>
                <strong className={`pedido-pill ${buildBadgeClass(venta.estadoPedido)}`}>
                  {venta.estadoPedido || '-'}
                </strong>
              </div>
              <div className="detalle-venta-kpi">
                <span>Agencia / destino</span>
                <strong>
                  {agenciaLabel} / {venta.destino || '-'}
                </strong>
              </div>
              <div className="detalle-venta-kpi detalle-venta-kpi--total">
                <span>Total</span>
                <strong>{formatCurrency(totalVenta)}</strong>
                <small>
                  Adelanto: {formatCurrency(adelanto)} | Saldo: {formatCurrency(saldo)}
                </small>
              </div>
            </div>
          </div>

          <div className="detalle-venta-tabs">
            <div className="ventas-tab-buttons detalle-venta-tabs__buttons">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`ventas-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {!tabs.length && (
              <div className="ventas-card detalle-venta-card">
                <div className="empty-message">Sin items en esta venta.</div>
              </div>
            )}

            {activeTab === 'productos' && (
              <DetailTableCard
                title="Productos"
                items={productos}
                emptyMessage="Sin productos."
                headers={['Codigo', 'Descripcion', 'Cantidad', 'Precio venta', 'Subtotal']}
                renderRow={(item, index) => {
                  const subtotal = toNumber(item.cantidad) * toNumber(item.precioVenta);
                  return (
                    <tr key={item.id || `prod-${index}`}>
                      <td>{item.codigo || '-'}</td>
                      <td>{item.descripcion || '-'}</td>
                      <td>{item.cantidad}</td>
                      <td>{formatCurrency(item.precioVenta)}</td>
                      <td>{formatCurrency(subtotal)}</td>
                    </tr>
                  );
                }}
                footerText={
                  productos.length
                    ? `Subtotal productos: ${formatCurrency(
                        productos.reduce(
                          (acc, item) => acc + toNumber(item.cantidad) * toNumber(item.precioVenta),
                          0
                        )
                      )}`
                    : null
                }
              />
            )}

            {activeTab === 'requerimientos' && (
              <div className="detalle-venta-requerimientos-stack">
                {requerimientos.length > 0 && (
                  <DetailTableCard
                    title="Requerimientos"
                    items={requerimientos}
                    emptyMessage="Sin requerimientos."
                    headers={['Codigo', 'Descripcion', 'Cantidad', 'Proveedor', 'Compra']}
                    renderRow={(item, index) => (
                      <tr key={item.id || `req-${index}`}>
                        <td>{item.codigo || '-'}</td>
                        <td>{item.descripcion || '-'}</td>
                        <td>{item.cantidad}</td>
                        <td>{item.proveedor || '-'}</td>
                        <td>{formatCurrency(item.precioCompra)}</td>
                      </tr>
                    )}
                  />
                )}

                {regaloRequerimientos.length > 0 && (
                  <DetailTableCard
                    title="Regalos (requerimiento)"
                    items={regaloRequerimientos}
                    emptyMessage="Sin regalos a comprar."
                    headers={['Codigo', 'Descripcion', 'Cantidad', 'Proveedor', 'Compra']}
                    renderRow={(item, index) => (
                      <tr key={item.id || `gift-req-${index}`}>
                        <td>{item.codigo || '-'}</td>
                        <td>{item.descripcion || '-'}</td>
                        <td>{item.cantidad}</td>
                        <td>{item.proveedor || '-'}</td>
                        <td>{formatCurrency(item.precioCompra)}</td>
                      </tr>
                    )}
                  />
                )}
              </div>
            )}

            {activeTab === 'regalos' && (
              <DetailTableCard
                title="Regalos"
                items={regalos}
                emptyMessage="Sin regalos."
                headers={['Codigo', 'Descripcion', 'Cantidad', 'Precio compra']}
                renderRow={(item, index) => (
                  <tr key={item.id || `gift-${index}`}>
                    <td>{item.codigo || '-'}</td>
                    <td>{item.descripcion || '-'}</td>
                    <td>{item.cantidad}</td>
                    <td>{formatCurrency(item.precioCompra)}</td>
                  </tr>
                )}
              />
            )}
          </div>

          <div className="ventas-card ventas-card--full detalle-venta-notas">
            <h3>Observaciones</h3>
            <div className="helper-text detalle-venta-notas__text">
              {venta.notas?.trim() ? venta.notas : 'Sin observaciones.'}
            </div>
          </div>
        </div>
      )}
    </VentasModalShell>
  );
};

export default VentaDetalleModal;
