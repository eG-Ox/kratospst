import React, { useEffect, useMemo, useState } from 'react';
import { usuariosService, ventasService } from '../../../core/services/apiServices';
import '../styles/EnviosPage.css';

const getToday = () => new Date().toISOString().slice(0, 10);

const estadosEnvio = ['PENDIENTE', 'ENVIADO', 'CANCELADO', 'VISITA'];

const estadosRastreo = ['EN TRANSITO', 'DESTINO', 'ENTREGADO'];

const EnviosPage = () => {
  const [ventas, setVentas] = useState([]);
  const [usuariosVentas, setUsuariosVentas] = useState([]);

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

  const cargarVentas = async () => {
    try {
      const resp = await ventasService.listar();
      setVentas(resp.data || []);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    }
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  const actualizarVenta = async (id, changes) => {
    try {
      await ventasService.actualizarEnvio(id, changes);
      await cargarVentas();
    } catch (err) {
      console.error('Error actualizando envio:', err);
    }
  };

  const handleEstadoEnvio = (venta, nuevoEstado) => {
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

    ventasService.actualizarEstado(venta.id, changes).then(cargarVentas);
  };

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
                        onChange={(e) => actualizarVenta(venta.id, { ticket: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={venta.guia || ''}
                        disabled={venta.estadoEnvio !== 'ENVIADO'}
                        onChange={(e) => actualizarVenta(venta.id, { guia: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={venta.retiro || ''}
                        disabled={venta.estadoEnvio !== 'ENVIADO'}
                        onChange={(e) => actualizarVenta(venta.id, { retiro: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={venta.rastreoEstado || 'EN TRANSITO'}
                        disabled={venta.estadoEnvio === 'CANCELADO'}
                        onChange={(e) => actualizarVenta(venta.id, { rastreoEstado: e.target.value })}
                      >
                        {estadosRastreo.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EnviosPage;
