import React, { useCallback, useEffect, useState } from 'react';
import { ventasService } from '../../../core/services/apiServices';
import '../styles/RequerimientosPage.css';

const RequerimientosPage = () => {
  const [requerimientos, setRequerimientos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargarPendientes = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const resp = await ventasService.requerimientosPendientes({
        q: busqueda.trim() || undefined,
        limite: 50
      });
      const payload = resp?.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.rows)
          ? payload.rows
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      const normalizedRows = rows.map((item) => ({
        id: item?.id ?? null,
        ventaId: item?.ventaId ?? item?.venta_id ?? '',
        fechaVenta: item?.fechaVenta ?? item?.fecha_venta ?? '',
        cliente: item?.cliente ?? item?.cliente_nombre ?? '',
        codigo: item?.codigo ?? '',
        descripcion: item?.descripcion ?? '',
        cantidad: Number(item?.cantidad || 0),
        proveedor: item?.proveedor ?? '',
        precioCompra: item?.precioCompra ?? item?.precio_compra ?? '',
        precioVenta: item?.precioVenta ?? item?.precio_venta ?? ''
      }));

      setRequerimientos(normalizedRows);
    } catch (err) {
      console.error('Error cargando requerimientos:', err);
      setRequerimientos([]);
      setError(err?.response?.data?.error || 'No se pudo cargar requerimientos pendientes.');
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  useEffect(() => {
    const delay = busqueda.trim() ? 250 : 0;
    const timeout = setTimeout(() => {
      cargarPendientes();
    }, delay);
    return () => clearTimeout(timeout);
  }, [cargarPendientes, busqueda]);

  const actualizarFila = async (id, changes) => {
    try {
      setError('');
      await ventasService.actualizarRequerimiento(id, changes);
      await cargarPendientes();
    } catch (err) {
      console.error('Error actualizando requerimiento:', err);
      setError(err?.response?.data?.error || 'No se pudo actualizar el requerimiento.');
    }
  };

  const rows = Array.isArray(requerimientos) ? requerimientos : [];

  return (
    <div className="requerimientos-container">
      <div className="page-header">
        <div className="page-header__title">
          <h5>Requerimientos Pendientes</h5>
          <span className="page-header__subtitle">Completa proveedor y precios de compra</span>
        </div>
        <div className="page-header__actions">
          <input
            type="text"
            placeholder="Buscar producto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={cargarPendientes}>
            Buscar
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="table-container">
          {rows.length === 0 ? (
            <div className="empty-message">No hay requerimientos pendientes.</div>
          ) : (
            <table className="ventas-table compact">
              <thead>
                <tr>
                  <th>Venta ID</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Proveedor</th>
                  <th>Compra</th>
                  <th>Venta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((req) => (
                  <tr key={req.id}>
                    <td>{req.ventaId}</td>
                    <td>{req.fechaVenta || '-'}</td>
                    <td>{req.cliente || '-'}</td>
                    <td>{req.codigo} {req.descripcion}</td>
                    <td>{req.cantidad}</td>
                    <td>
                      <input
                        type="text"
                        value={req.proveedor || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRequerimientos((prev) =>
                            prev.map((item) => (item.id === req.id ? { ...item, proveedor: value } : item))
                          );
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={req.precioCompra || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRequerimientos((prev) =>
                            prev.map((item) =>
                              item.id === req.id ? { ...item, precioCompra: value } : item
                            )
                          );
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={req.precioVenta || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRequerimientos((prev) =>
                            prev.map((item) =>
                              item.id === req.id ? { ...item, precioVenta: value } : item
                            )
                          );
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() =>
                          actualizarFila(req.id, {
                            proveedor: req.proveedor,
                            precioCompra: req.precioCompra,
                            precioVenta: req.precioVenta
                          })
                        }
                      >
                        Guardar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default RequerimientosPage;
