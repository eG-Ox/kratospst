import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientesService, comprobantesService } from '../../../core/services/apiServices';
import '../styles/HistorialComprobantesPage.css';

const padCorrelativo = (value) => String(value || 0).padStart(7, '0');

const HistorialComprobantesPage = () => {
  const [historial, setHistorial] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtros, setFiltros] = useState({
    cliente_id: '',
    usuario_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    cargarClientes();
    cargarHistorial();
  }, []);

  const cargarClientes = async () => {
    try {
      const resp = await clientesService.getAll();
      setClientes(resp.data || []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  };

  const cargarHistorial = async (custom = {}) => {
    try {
      setLoading(true);
      const resp = await comprobantesService.historial(custom);
      setHistorial(resp.data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando historial de comprobantes:', err);
      setError('Error al cargar historial de comprobantes');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async (e) => {
    e.preventDefault();
    await cargarHistorial({
      cliente_id: filtros.cliente_id || undefined,
      usuario_id: filtros.usuario_id || undefined,
      fecha_inicio: filtros.fecha_inicio || undefined,
      fecha_fin: filtros.fecha_fin || undefined
    });
  };

  const limpiarFiltros = async () => {
    setFiltros({ cliente_id: '', usuario_id: '', fecha_inicio: '', fecha_fin: '' });
    await cargarHistorial();
  };

  const historialFiltrado = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return historial;
    return historial.filter((row) => {
      const serie = `${row.serie || ''}-${padCorrelativo(row.correlativo)}`.toLowerCase();
      const tipo = String(row.tipo_comprobante || '').toLowerCase();
      const cliente =
        row.tipo_cliente === 'natural'
          ? `${row.cliente_nombre || ''} ${row.cliente_apellido || ''}`.trim().toLowerCase()
          : (row.razon_social || '').toLowerCase();
      const accion = (row.accion || '').toLowerCase();
      return (
        serie.includes(term) ||
        tipo.includes(term) ||
        cliente.includes(term) ||
        accion.includes(term) ||
        String(row.comprobante_id || '').includes(term)
      );
    });
  }, [historial, search]);

  const abrirPdfComprobante = async (id) => {
    if (!id) return;
    try {
      const resp = await comprobantesService.pdf(id);
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'text/html' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Error abriendo PDF:', err);
      setError('No se pudo abrir el PDF');
    }
  };

  const editarComprobante = (id) => {
    if (!id) return;
    navigate(`/comprobantes?edit=${id}`);
  };

  return (
    <div className="historial-comprobantes-container">
      <div className="historial-comprobantes-header">
        <h1>Historial de Comprobantes</h1>
        <input
          type="text"
          placeholder="Buscar por serie, cliente o accion"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <form className="historial-comprobantes-filtros" onSubmit={aplicarFiltros}>
        <div className="form-group">
          <label>Cliente</label>
          <select
            value={filtros.cliente_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, cliente_id: e.target.value }))}
          >
            <option value="">Todos</option>
            {clientes.map((cliente) => (
              <option key={`hc-${cliente.id}`} value={cliente.id}>
                {cliente.tipo_cliente === 'natural'
                  ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
                  : cliente.razon_social}{' '}
                ({cliente.dni || cliente.ruc})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Usuario ID</label>
          <input
            type="text"
            value={filtros.usuario_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, usuario_id: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Desde</label>
          <input
            type="date"
            value={filtros.fecha_inicio}
            onChange={(e) => setFiltros((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Hasta</label>
          <input
            type="date"
            value={filtros.fecha_fin}
            onChange={(e) => setFiltros((prev) => ({ ...prev, fecha_fin: e.target.value }))}
          />
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn-primary">
            Filtrar
          </button>
          <button type="button" className="btn-secondary" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando historial...</div>
      ) : (
        <div className="historial-comprobantes-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Comprobante</th>
                <th>Cliente</th>
                <th>Accion</th>
                <th>Usuario</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-message">
                    No hay registros.
                  </td>
                </tr>
              ) : (
                historialFiltrado.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{String(row.tipo_comprobante || 'boleta').toUpperCase()}</td>
                    <td>
                      {row.serie ? `${row.serie}-${padCorrelativo(row.correlativo)}` : `#${row.comprobante_id}`}
                    </td>
                    <td>
                      {row.tipo_cliente === 'natural'
                        ? `${row.cliente_nombre || ''} ${row.cliente_apellido || ''}`.trim()
                        : row.razon_social || '-'}
                    </td>
                    <td>{row.accion}</td>
                    <td>{row.usuario_nombre || row.usuario_id || '-'}</td>
                    <td>{Number(row.total || 0).toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn icon-btn--view"
                        onClick={() => abrirPdfComprobante(row.comprobante_id)}
                        title="Ver PDF"
                        aria-label="Ver PDF"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 5c4.5 0 8.3 2.7 10 6.5C20.3 15.3 16.5 18 12 18S3.7 15.3 2 11.5C3.7 7.7 7.5 5 12 5zm0 2c-3.2 0-6 1.7-7.6 4.5C6 14.3 8.8 16 12 16s6-1.7 7.6-4.5C18 8.7 15.2 7 12 7zm0 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--edit"
                        onClick={() => editarComprobante(row.comprobante_id)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 17.5V20h2.5L17.9 8.6l-2.5-2.5L4 17.5z" />
                          <path d="M20.7 7.2a1 1 0 0 0 0-1.4l-2.5-2.5a1 1 0 0 0-1.4 0l-1.7 1.7 2.5 2.5 1.7-1.7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistorialComprobantesPage;

