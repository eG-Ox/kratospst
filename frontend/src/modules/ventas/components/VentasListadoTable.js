import React from 'react';

const VentasListadoTable = ({
  ventasListado,
  usuariosVentas,
  estadosEnvio,
  ventasHasMore,
  ventasLoading,
  onCargarMas,
  onEstadoEnvioChange,
  onAbrirEdicion,
  onAbrirDetalle,
  onAbrirRotulo,
  onEliminar
}) => (
  <div className="ventas-table-section">
    <div className="table-container">
      {ventasListado.length === 0 ? (
        <div className="empty-message">No hay ventas registradas.</div>
      ) : (
        <table className="ventas-table compact">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Cliente</th>
              <th>Telefono</th>
              <th>Vendedor</th>
              <th>Agencia</th>
              <th>Destino</th>
              <th>Fecha venta</th>
              <th>Estado pedido</th>
              <th>Estado envio</th>
              <th>Fecha despacho</th>
              <th>Fecha cancelacion</th>
              <th>P. Venta</th>
              <th>Adelanto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ventasListado.map((venta) => {
              const vendedor = usuariosVentas.find(
                (user) => String(user.id) === String(venta.vendedorId)
              );
              const agenciaLabel =
                venta.agencia === 'OTROS' ? `${venta.agencia} (${venta.agenciaOtro})` : venta.agencia;
              return (
                <tr key={venta.id}>
                  <td>{venta.documento}</td>
                  <td>{venta.clienteNombre || '-'}</td>
                  <td>{venta.clienteTelefono || '-'}</td>
                  <td>{vendedor?.nombre || venta.vendedorId}</td>
                  <td>{agenciaLabel}</td>
                  <td>{venta.destino || '-'}</td>
                  <td>{venta.fechaVenta || '-'}</td>
                  <td>
                    <span className={`pedido-pill ${String(venta.estadoPedido || 'PICKING').toLowerCase()}`}>
                      {venta.estadoPedido || 'PICKING'}
                    </span>
                  </td>
                  <td>
                    <select
                      className={`estado-select ${(venta.estadoEnvio || 'pendiente').toLowerCase()}`}
                      value={venta.estadoEnvio || 'PENDIENTE'}
                      onChange={(e) => onEstadoEnvioChange(venta, e.target.value)}
                    >
                      {estadosEnvio.map((estado) => (
                        <option
                          key={estado}
                          value={estado}
                          disabled={
                            (estado === 'ENVIADO' || estado === 'CANCELADO') &&
                            (venta.estadoPedido || 'PICKING') !== 'PEDIDO_LISTO'
                          }
                        >
                          {estado}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{venta.fechaDespacho || '-'}</td>
                  <td>{venta.fechaCancelacion || '-'}</td>
                  <td>S/ {Number(venta.pVenta || 0).toFixed(2)}</td>
                  <td>{venta.adelanto || '-'}</td>
                  <td>
                    <div className="venta-actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn--edit"
                        onClick={() => onAbrirEdicion(venta)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 17.5V20h2.5L17.9 8.6l-2.5-2.5L4 17.5z" />
                          <path d="M20.7 7.2a1 1 0 0 0 0-1.4l-2.5-2.5a1 1 0 0 0-1.4 0l-1.7 1.7 2.5 2.5 1.7-1.7z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--view"
                        onClick={() => onAbrirDetalle(venta)}
                        title="Detalle"
                        aria-label="Detalle"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 5c4.5 0 8.3 2.7 10 6.5C20.3 15.3 16.5 18 12 18S3.7 15.3 2 11.5C3.7 7.7 7.5 5 12 5zm0 2c-3.2 0-6 1.7-7.6 4.5C6 14.3 8.8 16 12 16s6-1.7 7.6-4.5C18 8.7 15.2 7 12 7zm0 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--view"
                        onClick={() => onAbrirRotulo(venta)}
                        title="Rotulo"
                        aria-label="Rotulo"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 4h9l7 8-7 8H4V4zm8.6 4.2L9 11.8l3.6 3.6 1.4-1.4-2.2-2.2 2.2-2.2-1.4-1.4z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--delete"
                        onClick={() => onEliminar(venta.id)}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 7h12l-1 14H7L6 7z" />
                          <path d="M9 7V5h6v2h4v2H5V7h4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
    {ventasHasMore && (
      <div className="table-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCargarMas}
          disabled={ventasLoading}
        >
          {ventasLoading ? 'Cargando...' : 'Cargar mas'}
        </button>
      </div>
    )}
  </div>
);

export default VentasListadoTable;
