import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ventasService } from '../../../core/services/apiServices';
import '../styles/VentasDetallePage.css';

const VentasDetallePage = () => {
  const [detalle, setDetalle] = useState([]);
  const [ventaId, setVentaId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');

  const cargarDetalle = useCallback(async () => {
    try {
      const params = {};
      if (ventaId) params.venta_id = ventaId;
      if (busqueda) params.q = busqueda;
      if (tipo) params.tipo = tipo;
      const resp = await ventasService.detalle(params);
      setDetalle(resp.data || []);
    } catch (err) {
      console.error('Error cargando detalle:', err);
    }
  }, [busqueda, tipo, ventaId]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  const filas = useMemo(() => detalle || [], [detalle]);

  return (
    <div className="ventas-detalle-container">
      <div className="page-header">
        <div className="page-header__title">
          <h5>Detalle de Ventas</h5>
          <span className="page-header__subtitle">Historico por venta y producto</span>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn-secondary" onClick={cargarDetalle}>
            Actualizar
          </button>
        </div>
      </div>

      <div className="detalle-filtros">
        <div className="form-group">
          <label>Venta ID</label>
          <input
            type="text"
            value={ventaId}
            onChange={(e) => setVentaId(e.target.value.trim())}
            placeholder="Ej: 3"
          />
        </div>
        <div className="form-group">
          <label>Buscar producto</label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Codigo o descripcion"
          />
        </div>
        <div className="form-group">
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="producto">Producto</option>
            <option value="requerimiento">Requerimiento</option>
            <option value="regalo">Regalo</option>
            <option value="regalo_requerimiento">Regalo requerimiento</option>
          </select>
        </div>
        <div className="form-group form-group-actions">
          <button type="button" className="btn-primary" onClick={cargarDetalle}>
            Filtrar
          </button>
        </div>
      </div>

      <div className="table-container">
        {filas.length === 0 ? (
          <div className="empty-message">No hay registros.</div>
        ) : (
          <table className="ventas-table compact">
            <thead>
              <tr>
                <th>Venta ID</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Codigo</th>
                <th>Descripcion</th>
                <th>Cantidad</th>
                <th>Precio venta</th>
                <th>Precio compra</th>
                <th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((row, idx) => (
                <tr key={`${row.ventaId}-${row.codigo}-${idx}`}>
                  <td>{row.ventaId}</td>
                  <td>{row.fechaVenta || '-'}</td>
                  <td>{row.tipo}</td>
                  <td>{row.codigo || '-'}</td>
                  <td>{row.descripcion || '-'}</td>
                  <td>{row.cantidad}</td>
                  <td>S/ {Number(row.precioVenta || 0).toFixed(2)}</td>
                  <td>S/ {Number(row.precioCompra || 0).toFixed(2)}</td>
                  <td>{row.proveedor || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VentasDetallePage;
