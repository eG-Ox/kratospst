import React, { useState, useEffect } from 'react';
import { movimientosService, maquinasService } from '../services/api';
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
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3>Stock Bajo</h3>
                <p className="stat-number" style={{ color: '#ef4444' }}>
                  {estadisticas?.stock_bajo || 0}
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📥</div>
              <div className="stat-content">
                <h3>Ingresos Hoy</h3>
                <p className="stat-number">{estadisticas?.ingresos_hoy.cantidad || 0}</p>
                <small>{estadisticas?.ingresos_hoy.movimientos} movimientos</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📤</div>
              <div className="stat-content">
                <h3>Salidas Hoy</h3>
                <p className="stat-number">{estadisticas?.salidas_hoy.cantidad || 0}</p>
                <small>{estadisticas?.salidas_hoy.movimientos} movimientos</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <h3>Movimientos Hoy</h3>
                <p className="stat-number">{estadisticas?.movimientos_hoy || 0}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-section">
            <h2>Últimos Movimientos</h2>
            {ultimosMovimientos.length === 0 ? (
              <div className="no-data">No hay movimientos registrados</div>
            ) : (
              <div className="movimientos-lista">
                {ultimosMovimientos.map((mov) => (
                  <div key={mov.id} className={`movimiento-item ${mov.tipo}`}>
                    <div className="movimiento-tipo">
                      {mov.tipo === 'ingreso' ? '📥' : '📤'}
                    </div>
                    <div className="movimiento-info">
                      <p className="movimiento-codigo">
                        <strong>{mov.maquina_codigo}</strong> - {mov.marca}
                      </p>
                      <p className="movimiento-usuario">{mov.usuario_nombre}</p>
                      {mov.motivo && <p className="movimiento-motivo">{mov.motivo}</p>}
                    </div>
                    <div className="movimiento-cantidad">
                      <p className={`cantidad ${mov.tipo}`}>
                        {mov.tipo === 'ingreso' ? '+' : '-'} {mov.cantidad}
                      </p>
                      <p className="movimiento-fecha">{new Date(mov.fecha).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
