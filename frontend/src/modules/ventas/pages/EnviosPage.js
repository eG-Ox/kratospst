import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usuariosService, ventasService } from '../../../core/services/apiServices';
import '../styles/EnviosPage.css';

const getToday = () => new Date().toISOString().slice(0, 10);

const estadosEnvio = ['PENDIENTE', 'ENVIADO', 'CANCELADO', 'VISITA'];

const estadosRastreo = ['EN TRANSITO', 'DESTINO', 'ENTREGADO'];

const EnviosPage = () => {
  const [ventas, setVentas] = useState([]);
  const [usuariosVentas, setUsuariosVentas] = useState([]);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const ventasRequestRef = useRef(0);
  const detalleRequestRef = useRef(0);

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const resp = await usuariosService.listar();
        const data = Array.isArray(resp.data) ? resp.data : [];
        setUsuariosVentas(data);
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };
    cargarUsuarios();
  }, []);

  const cargarVentas = useCallback(async () => {
    const requestId = ++ventasRequestRef.current;
    try {
      const resp = await ventasService.listar({ include_detalle: false, limite: 400 });
      if (requestId !== ventasRequestRef.current) return;
      setVentas(resp.data || []);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    }
  }, []);

  const patchVenta = useCallback((id, patch) => {
    setVentas((prev) =>
      (prev || []).map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    setDetalleVenta((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  const persistirCamposEnvio = useCallback(
    async (venta) => {
      if (!venta?.id) return;
      try {
        await ventasService.actualizarEnvio(venta.id, {
          ticket: venta.ticket || '',
          guia: venta.guia || '',
          retiro: venta.retiro || '',
          rastreoEstado: venta.rastreoEstado || 'EN TRANSITO'
        });
      } catch (err) {
        console.error('Error actualizando envio:', err);
        cargarVentas();
      }
    },
    [cargarVentas]
  );

  const handleEstadoEnvio = useCallback((venta, nuevoEstado) => {
    const pedidoListo = (venta.estadoPedido || 'PICKING') === 'PEDIDO_LISTO';
    if (!pedidoListo && (nuevoEstado === 'ENVIADO' || nuevoEstado === 'CANCELADO')) {
      alert('El pedido debe estar en PEDIDO_LISTO para enviar o cancelar.');
      return;
    }
    const now = getToday();
    const changes = { estadoEnvio: nuevoEstado };

    if (nuevoEstado === 'ENVIADO' || nuevoEstado === 'VISITA') {
      changes.fechaDespacho = venta.fechaDespacho || now;
    }

    if (nuevoEstado === 'CANCELADO') {
      changes.fechaCancelacion = venta.fechaCancelacion || now;
      changes.rastreoEstado = 'ENTREGADO';
    }

    patchVenta(venta.id, changes);
    ventasService
      .actualizarEstado(venta.id, changes)
      .then(() => cargarVentas())
      .catch((err) => {
        console.error('Error actualizando estado de envio:', err);
        cargarVentas();
      });
  }, [cargarVentas, patchVenta]);

  const abrirDetalle = useCallback(async (venta) => {
    if (!venta?.id) return;
    const requestId = ++detalleRequestRef.current;
    setDetalleVenta(venta);
    setDetalleCargando(true);
    try {
      const resp = await ventasService.obtener(venta.id);
      if (requestId !== detalleRequestRef.current) return;
      setDetalleVenta(resp?.data || venta);
    } catch (err) {
      console.error('Error cargando detalle de venta en envios:', err);
      if (requestId === detalleRequestRef.current) {
        setDetalleVenta(venta);
      }
    } finally {
      if (requestId === detalleRequestRef.current) {
        setDetalleCargando(false);
      }
    }
  }, []);

  const cerrarDetalle = useCallback(() => {
    detalleRequestRef.current += 1;
    setDetalleVenta(null);
    setDetalleCargando(false);
  }, []);

  const ventasEnvio = useMemo(() => {
    return (ventas || []).filter(
      (venta) => venta.estadoEnvio === 'PENDIENTE' || venta.estadoEnvio === 'ENVIADO'
    );
  }, [ventas]);

  return (
    <div className="envios-container">
      <div className="page-header">
        <div className="page-header__title">
          <h5>Control de Envios</h5>
          <span className="page-header__subtitle">Pendientes y enviados</span>
        </div>
        <div className="page-header__actions">
          <span className="status-pill">Registros: {ventasEnvio.length}</span>
        </div>
      </div>

      <div className="table-container">
        {ventasEnvio.length === 0 ? (
          <div className="empty-message">No hay envios pendientes o enviados.</div>
        ) : (
          <table className="envios-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Agencia</th>
                <th>Destino</th>
                <th>Estado envio</th>
                <th>Estado pedido</th>
                <th>Fecha despacho</th>
                <th>Ticket</th>
                <th>Guia</th>
                <th>Retiro</th>
                <th>Estado rastreo</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {ventasEnvio.map((venta) => {
                const vendedor = usuariosVentas.find(
                  (user) => String(user.id) === String(venta.vendedorId)
                );
                const agenciaLabel =
                  venta.agencia === 'OTROS' ? `${venta.agencia} (${venta.agenciaOtro})` : venta.agencia;
                return (
                  <tr key={venta.id}>
                    <td>{venta.documento}</td>
                    <td>{venta.clienteNombre || '-'}</td>
                    <td>{vendedor?.nombre || venta.vendedorId}</td>
                    <td>{agenciaLabel}</td>
                    <td>{venta.destino || '-'}</td>
                    <td>
                      <select
                        value={venta.estadoEnvio}
                        onChange={(e) => handleEstadoEnvio(venta, e.target.value)}
                        className={`estado-select ${venta.estadoEnvio.toLowerCase()}`}
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
                    <td>
                      <span className={`pedido-pill ${String(venta.estadoPedido || 'PICKING').toLowerCase()}`}>
                        {venta.estadoPedido || 'PICKING'}
                      </span>
                    </td>
                    <td>{venta.fechaDespacho || '-'}</td>
                    <td>
                      <input
                        type="text"
                        value={venta.ticket || ''}
                        disabled={venta.estadoEnvio !== 'ENVIADO'}
                        onChange={(e) => patchVenta(venta.id, { ticket: e.target.value })}
                        onBlur={(e) => persistirCamposEnvio({ ...venta, ticket: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={venta.guia || ''}
                        disabled={venta.estadoEnvio !== 'ENVIADO'}
                        onChange={(e) => patchVenta(venta.id, { guia: e.target.value })}
                        onBlur={(e) => persistirCamposEnvio({ ...venta, guia: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={venta.retiro || ''}
                        disabled={venta.estadoEnvio !== 'ENVIADO'}
                        onChange={(e) => patchVenta(venta.id, { retiro: e.target.value })}
                        onBlur={(e) => persistirCamposEnvio({ ...venta, retiro: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={venta.rastreoEstado || 'EN TRANSITO'}
                        disabled={venta.estadoEnvio === 'CANCELADO'}
                        onChange={(e) => {
                          const rastreoEstado = e.target.value;
                          patchVenta(venta.id, { rastreoEstado });
                          persistirCamposEnvio({ ...venta, rastreoEstado });
                        }}
                      >
                        {estadosRastreo.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn icon-btn--view"
                        onClick={() => abrirDetalle(venta)}
                        title="Detalle"
                        aria-label="Detalle"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 5c4.5 0 8.3 2.7 10 6.5C20.3 15.3 16.5 18 12 18S3.7 15.3 2 11.5C3.7 7.7 7.5 5 12 5zm0 2c-3.2 0-6 1.7-7.6 4.5C6 14.3 8.8 16 12 16s6-1.7 7.6-4.5C18 8.7 15.2 7 12 7zm0 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {detalleVenta && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Detalle pedido #{detalleVenta.id}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={cerrarDetalle}
                aria-label="Cerrar"
              >
                X
              </button>
            </div>
            <div className="modal-body">
              {detalleCargando ? (
                <div className="loading">Cargando detalle...</div>
              ) : (
                <div className="envios-detalle-grid">
                  <div className="envios-detalle-card">
                    <h3>Productos</h3>
                    {(detalleVenta.productos || []).length === 0 ? (
                      <div className="empty-message">Sin productos.</div>
                    ) : (
                      <ul className="envios-detalle-list">
                        {(detalleVenta.productos || []).map((item) => (
                          <li key={item.id}>
                            {item.codigo} {item.descripcion} x{item.cantidad}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="envios-detalle-card">
                    <h3>Requerimientos</h3>
                    {(detalleVenta.requerimientos || []).length === 0 ? (
                      <div className="empty-message">Sin requerimientos.</div>
                    ) : (
                      <ul className="envios-detalle-list">
                        {(detalleVenta.requerimientos || []).map((item) => (
                          <li key={item.id}>
                            {item.codigo} {item.descripcion} x{item.cantidad}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="envios-detalle-card">
                    <h3>Regalos</h3>
                    {[
                      ...(detalleVenta.regalos || []),
                      ...(detalleVenta.regaloRequerimientos || [])
                    ].length === 0 ? (
                      <div className="empty-message">Sin regalos.</div>
                    ) : (
                      <ul className="envios-detalle-list">
                        {[
                          ...(detalleVenta.regalos || []),
                          ...(detalleVenta.regaloRequerimientos || [])
                        ].map((item) => (
                          <li key={item.id}>
                            {item.codigo} {item.descripcion} x{item.cantidad}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnviosPage;
