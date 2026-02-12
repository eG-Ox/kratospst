import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Módulos
import LoginPage from './modules/auth/pages/LoginPage';
import DashboardPage from './modules/dashboard/pages/DashboardPage';
import ProductosPage from './modules/productos/pages/ProductosPage';
import TiposMaquinasPage from './modules/tipos-maquinas/pages/TiposMaquinasPage';
import GestorInventarioPage from './modules/movimientos/pages/GestorInventarioPage';
import KitsPage from './modules/kits/pages/KitsPage';
import CotizacionesPage from './modules/cotizaciones/pages/CotizacionesPage';
import HistorialCotizacionesPage from './modules/cotizaciones/pages/HistorialCotizacionesPage';
import ClientesPage from './modules/clientes/pages/ClientesPage';
import UsuariosPage from './modules/usuarios/pages/UsuariosPage';
import BackupsPage from './modules/backups/pages/BackupsPage';
import HistorialPage from './modules/historial/pages/HistorialPage';
import PermisosPage from './modules/permisos/pages/PermisosPage';
import InventarioGeneralPage from './modules/inventario-general/pages/InventarioGeneralPage';
import VentasPage from './modules/ventas/pages/VentasPage';
import EnviosPage from './modules/ventas/pages/EnviosPage';
import VentasDetallePage from './modules/ventas/pages/VentasDetallePage';
import RequerimientosPage from './modules/ventas/pages/RequerimientosPage';
import PickingPage from './modules/picking/pages/PickingPage';
import RotulosPage from './modules/rotulos/pages/RotulosPage';

// Componentes compartidos
import Navbar from './shared/components/Navbar';
import ProtectedRoute from './shared/components/ProtectedRoute';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { authService } from './core/services/apiServices';

// Estilos
import './shared/styles/variables.css';
import './shared/styles/shared.css';
import './shared/styles/animations.css';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMessage] = useState(() => {
    const mensajes = [
      'Verificando credenciales...',
      'Buscando tu sesion en el almacen...',
      'Acomodando el inventario digital...',
      'Revisando permisos de bodega...',
      'Poniendo casco y guantes virtuales...'
    ];
    return mensajes[Math.floor(Math.random() * mensajes.length)];
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');
    if (token && usuarioGuardado && usuarioGuardado !== 'undefined') {
      try {
        const usuarioParsed = JSON.parse(usuarioGuardado);
        setIsAuthenticated(true);
        setUsuario(usuarioParsed);
        authService.obtenerUsuarioActual()
          .then((resp) => {
            if (resp?.data) {
              setUsuario(resp.data);
              localStorage.setItem('usuario', JSON.stringify(resp.data));
            }
          })
          .catch((err) => {
            if (err?.response?.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('usuario');
              setIsAuthenticated(false);
              setUsuario(null);
            }
          })
          .finally(() => setAuthChecked(true));
        return;
      } catch (error) {
        localStorage.removeItem('usuario');
      }
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const updateVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    updateVh();
    window.addEventListener('resize', updateVh);
    return () => window.removeEventListener('resize', updateVh);
  }, []);

  const handleLoginSuccess = (usuarioData) => {
    setIsAuthenticated(true);
    setUsuario(usuarioData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  if (!authChecked) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-spinner" />
          <h2>Un momento...</h2>
          <p>{authMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        {isAuthenticated && <Navbar usuario={usuario} onLogout={handleLogout} />}
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <DashboardPage usuario={usuario} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/productos"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <ProductosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tipos-maquinas"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <TiposMaquinasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <GestorInventarioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario-general"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <InventarioGeneralPage />
              </ProtectedRoute>
            }
          />
          <Route path="/ingresos" element={<Navigate to="/inventario" />} />
          <Route path="/salidas" element={<Navigate to="/inventario" />} />
          <Route
            path="/kits"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <KitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <CotizacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones-historial"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <HistorialCotizacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <ClientesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/backups"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <BackupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/permisos"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <PermisosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historial"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <HistorialPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <VentasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas-envios"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <EnviosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas-detalle"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <VentasDetallePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas-requerimientos"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <RequerimientosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/picking"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <PickingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rotulos"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} authChecked={authChecked}>
                <RotulosPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
