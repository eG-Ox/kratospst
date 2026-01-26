import React, { useState, useEffect } from 'react';
import { movimientosService, productosService } from '../../../core/services/apiServices';
import '../styles/DashboardPage.css';

const DashboardPage = ({ usuario }) => {
  const [estadisticas, setEstadisticas] = useState(null);
  const [ultimosMovimientos, setUltimosMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      const respEstad = await movimientosService.obtenerEstadisticas();
      setEstadisticas(respEstad.data);

      const respMovimientos = await movimientosService.obtener({ limite: 10, pagina: 1 });
      setUltimosMovimientos(respMovimientos.data);
      setError('');
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      setError('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Bienvenido, {usuario?.nombre}!</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando datos...</div>
      ) : (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon">🏭</div>
              <div className="stat-content">
                <h3>Total de Máquinas</h3>
                <p className="stat-number">{estadisticas?.total_maquinas || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Stock Total</h3>
                <p className="stat-number">{estadisticas?.total_stock || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📥</div>
              <div className="stat-content">
                <h3>Ingresos Hoy</h3>
                <p className="stat-number">{estadisticas?.ingresos_hoy?.cantidad || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📤</div>
              <div className="stat-content">
                <h3>Salidas Hoy</h3>
                <p className="stat-number">{estadisticas?.salidas_hoy?.cantidad || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3>Stock Bajo</h3>
                <p className="stat-number">{estadisticas?.stock_bajo || 0}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="recent-movements">
              <h2>Últimos Movimientos</h2>
              {ultimosMovimientos.length > 0 ? (
                <table className="movements-table">
                  <thead>
                    <tr>
                      <th>Máquina</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Usuario</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosMovimientos.map((mov) => (
                      <tr key={mov.id}>
                        <td>{mov.maquina_codigo}</td>
                        <td className={`type-${mov.tipo}`}>{mov.tipo}</td>
                        <td>{mov.cantidad}</td>
                        <td>{mov.usuario_nombre}</td>
                        <td>{new Date(mov.fecha).toLocaleString('es-ES')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-message">No hay movimientos registrados</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
