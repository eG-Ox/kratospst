import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientesService, cotizacionesService } from '../../../core/services/apiServices';
import '../styles/HistorialCotizacionesPage.css';

const resolveApiBase = () => {
  const envBase = process.env.REACT_APP_API_URL;
  if (envBase && /^https?:\/\//i.test(envBase)) {
    return envBase;
  }
  if (envBase && envBase.startsWith('/')) {
    return `${window.location.origin}${envBase}`;
  }
  return 'http://localhost:5000/api';
};

const API_BASE = resolveApiBase();

const HistorialCotizacionesPage = () => {
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
      const resp = await cotizacionesService.historial(custom);
      setHistorial(resp.data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando historial de cotizaciones:', err);
      setError('Error al cargar historial de cotizaciones');
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
      const serie = `${row.serie || ''}-${row.correlativo || ''}`.toLowerCase();
      const cliente =
        row.tipo_cliente === 'natural'
          ? `${row.cliente_nombre || ''} ${row.cliente_apellido || ''}`.trim().toLowerCase()
          : (row.razon_social || '').toLowerCase();
      const accion = (row.accion || '').toLowerCase();
      return (
        serie.includes(term) ||
        cliente.includes(term) ||
        accion.includes(term) ||
        String(row.cotizacion_id || '').includes(term)
      );
    });
  }, [historial, search]);

  const abrirPdfCotizacion = (id) => {
    if (!id) return;
    const token = localStorage.getItem('token');
    const url = token
      ? `${API_BASE}/cotizaciones/pdf/${id}?token=${encodeURIComponent(token)}`
      : `${API_BASE}/cotizaciones/pdf/${id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const editarCotizacion = (id) => {
    if (!id) return;
    navigate(`/cotizaciones?edit=${id}`);
  };

  return (
    <div className="historial-cotizaciones-container">
      <div className="historial-cotizaciones-header">
        <h1>Historial de Cotizaciones</h1>
        <input
          type="text"
          placeholder="Buscar por serie, cliente o accion"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <form className="historial-cotizaciones-filtros" onSubmit={aplicarFiltros}>
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
        <div className="historial-cotizaciones-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cotizacion</th>
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
                  <td colSpan="7" className="empty-message">
                    No hay registros.
                  </td>
                </tr>
              ) : (
                historialFiltrado.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>
                      {row.serie ? `${row.serie}-${row.correlativo}` : `#${row.cotizacion_id}`}
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
                      <button type="button" onClick={() => abrirPdfCotizacion(row.cotizacion_id)}>
                        Ver
                      </button>
                      <button type="button" onClick={() => editarCotizacion(row.cotizacion_id)}>
                        Editar
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

export default HistorialCotizacionesPage;
