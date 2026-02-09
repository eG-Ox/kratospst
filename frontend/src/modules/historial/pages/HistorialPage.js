import React, { useCallback, useEffect, useState } from 'react';
import { historialService } from '../../../core/services/apiServices';
import '../styles/HistorialPage.css';

const HistorialPage = () => {
  const [historial, setHistorial] = useState([]);
  const [filtros, setFiltros] = useState({
    entidad: '',
    accion: '',
    usuario_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [exportando, setExportando] = useState(false);

  const cargarHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await historialService.listar(filtros);
      setHistorial(resp.data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarHistorial();
  };

  const descargarArchivo = (data, filename) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportar = async () => {
    try {
      setExportando(true);
      const resp = await historialService.exportar(filtros);
      descargarArchivo(resp.data, 'historial.xlsx');
    } catch (err) {
      console.error('Error exportando historial:', err);
      setError('Error al exportar historial');
    } finally {
      setExportando(false);
    }
  };

  const formatJson = (value) => {
    if (!value) return '-';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch (error) {
      return value;
    }
  };

  const buildResumen = (item, modo) => {
    let antes = null;
    let despues = null;
    try {
      antes = item.antes_json ? JSON.parse(item.antes_json) : null;
      despues = item.despues_json ? JSON.parse(item.despues_json) : null;
    } catch (error) {
      return item.descripcion || '-';
    }

    if (item.entidad === 'movimientos') {
      const stockAntes = antes?.stock ?? '-';
      const stockDespues = despues?.stock ?? '-';
      const cantidad = despues?.cantidad ?? '-';
      const motivo = despues?.motivo ? ` | ${despues.motivo}` : '';
      if (modo === 'antes') return `Stock: ${stockAntes}`;
      if (modo === 'despues') return `Stock: ${stockDespues} | Cant: ${cantidad}${motivo}`;
      return `Stock ${stockAntes} → ${stockDespues} | Cant: ${cantidad}${motivo}`;
    }

    if (item.entidad === 'productos') {
      const codigo = despues?.codigo || antes?.codigo || '-';
      const stockAntes = antes?.stock ?? '-';
      const stockDespues = despues?.stock ?? '-';
      if (modo === 'antes') return `Codigo: ${codigo} | Stock: ${stockAntes}`;
      if (modo === 'despues') return `Codigo: ${codigo} | Stock: ${stockDespues}`;
      return `Codigo: ${codigo} | Stock ${stockAntes} -> ${stockDespues}`;
    }

    if (item.entidad === 'cotizaciones') {
      const totalAntes = antes?.cotizacion?.total ?? antes?.total ?? '-';
      const totalDespues = despues?.cotizacion?.total ?? despues?.total ?? '-';
      const clienteAntes = antes?.cotizacion?.cliente_id ?? antes?.cliente_id ?? '-';
      const clienteDespues = despues?.cotizacion?.cliente_id ?? despues?.cliente_id ?? '-';
      if (modo === 'antes') return `Cliente: ${clienteAntes} | Total: ${totalAntes}`;
      if (modo === 'despues') return `Cliente: ${clienteDespues} | Total: ${totalDespues}`;
      return `Cliente ${clienteAntes} → ${clienteDespues} | Total ${totalAntes} → ${totalDespues}`;
    }

    if (item.entidad === 'clientes') {
      const docAntes = antes?.dni || antes?.ruc || '-';
      const docDespues = despues?.dni || despues?.ruc || '-';
      const nombreAntes = antes?.razon_social || `${antes?.nombre || ''} ${antes?.apellido || ''}`.trim();
      const nombreDespues = despues?.razon_social || `${despues?.nombre || ''} ${despues?.apellido || ''}`.trim();
      if (modo === 'antes') return `Doc: ${docAntes} | ${nombreAntes || '-'}`;
      if (modo === 'despues') return `Doc: ${docDespues} | ${nombreDespues || '-'}`;
      return `Cliente ${docAntes} → ${docDespues} | ${nombreAntes || '-'} → ${nombreDespues || '-'}`;
    }

    if (item.entidad === 'kits') {
      const nombreAntes = antes?.nombre || '-';
      const nombreDespues = despues?.nombre || '-';
      const precioAntes = antes?.precio_total ?? '-';
      const precioDespues = despues?.precio_total ?? '-';
      if (modo === 'antes') return `Kit: ${nombreAntes} | Total: ${precioAntes}`;
      if (modo === 'despues') return `Kit: ${nombreDespues} | Total: ${precioDespues}`;
      return `Kit ${nombreAntes} → ${nombreDespues} | Total ${precioAntes} → ${precioDespues}`;
    }

    if (item.entidad === 'usuarios') {
      const nombreAntes = antes?.nombre || '-';
      const nombreDespues = despues?.nombre || '-';
      const rolAntes = antes?.rol || '-';
      const rolDespues = despues?.rol || '-';
      if (modo === 'antes') return `Usuario: ${nombreAntes} | Rol: ${rolAntes}`;
      if (modo === 'despues') return `Usuario: ${nombreDespues} | Rol: ${rolDespues}`;
      return `Usuario ${nombreAntes} → ${nombreDespues} | Rol ${rolAntes} → ${rolDespues}`;
    }

    if (item.entidad === 'tipos_maquinas') {
      const nombreAntes = antes?.nombre || '-';
      const nombreDespues = despues?.nombre || '-';
      if (modo === 'antes') return `Tipo: ${nombreAntes}`;
      if (modo === 'despues') return `Tipo: ${nombreDespues}`;
      return `Tipo ${nombreAntes} → ${nombreDespues}`;
    }

    return item.descripcion || '-';
  };

  return (
    <div className="historial-container">
      <div className="historial-header">
        <h1>Historial</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleExportar}
          disabled={exportando}
        >
          {exportando ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <form className="historial-filtros" onSubmit={handleBuscar}>
        <div className="form-group">
          <label>Entidad</label>
          <select
            value={filtros.entidad}
            onChange={(e) => setFiltros({ ...filtros, entidad: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="productos">Productos</option>
            <option value="movimientos">Movimientos</option>
            <option value="clientes">Clientes</option>
            <option value="kits">Kits</option>
            <option value="cotizaciones">Cotizaciones</option>
            <option value="usuarios">Usuarios</option>
          </select>
        </div>
        <div className="form-group">
          <label>Accion</label>
          <select
            value={filtros.accion}
            onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="crear">Crear</option>
            <option value="editar">Editar</option>
            <option value="eliminar">Eliminar</option>
            <option value="ingreso">Ingreso</option>
            <option value="salida">Salida</option>
            <option value="toggle">Toggle</option>
          </select>
        </div>
        <div className="form-group">
          <label>Usuario ID</label>
          <input
            type="text"
            value={filtros.usuario_id}
            onChange={(e) => setFiltros({ ...filtros, usuario_id: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Desde</label>
          <input
            type="date"
            value={filtros.fecha_inicio}
            onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Hasta</label>
          <input
            type="date"
            value={filtros.fecha_fin}
            onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">
          Buscar
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando historial...</div>
      ) : (
        <div className="historial-table-container">
          <table className="historial-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Entidad</th>
                <th>Accion</th>
                <th>Usuario</th>
                <th>Antes</th>
                <th>Despues</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historial.map((item) => (
                <React.Fragment key={item.id}>
                  <tr>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                    <td>{item.entidad}</td>
                    <td>{item.accion}</td>
                    <td>{item.usuario_nombre || item.usuario_id || '-'}</td>
                    <td>{buildResumen(item, 'antes')}</td>
                    <td>{buildResumen(item, 'despues')}</td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() => setExpandido(expandido === item.id ? null : item.id)}
                      >
                        {expandido === item.id ? 'Ocultar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                  {expandido === item.id && (
                    <tr className="historial-detalle">
                      <td colSpan="7">
                        <div className="detalle-grid">
                          <div>
                            <h4>Antes</h4>
                            <pre>{formatJson(item.antes_json)}</pre>
                          </div>
                          <div>
                            <h4>Despues</h4>
                            <pre>{formatJson(item.despues_json)}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistorialPage;



