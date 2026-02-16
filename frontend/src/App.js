import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './shared/components/Navbar';
import ProtectedRoute from './shared/components/ProtectedRoute';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { authService } from './core/services/apiServices';
import './shared/styles/variables.css';
import './shared/styles/shared.css';
import './shared/styles/animations.css';
import './App.css';

// Modulos (lazy por ruta para reducir carga inicial)
const LoginPage = lazy(() => import('./modules/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));
const ProductosPage = lazy(() => import('./modules/productos/pages/ProductosPage'));
const TiposMaquinasPage = lazy(() => import('./modules/tipos-maquinas/pages/TiposMaquinasPage'));
const GestorInventarioPage = lazy(() => import('./modules/movimientos/pages/GestorInventarioPage'));
const KitsPage = lazy(() => import('./modules/kits/pages/KitsPage'));
const CotizacionesPage = lazy(() => import('./modules/cotizaciones/pages/CotizacionesPage'));
const HistorialCotizacionesPage = lazy(() => import('./modules/cotizaciones/pages/HistorialCotizacionesPage'));
const ClientesPage = lazy(() => import('./modules/clientes/pages/ClientesPage'));
const UsuariosPage = lazy(() => import('./modules/usuarios/pages/UsuariosPage'));
const BackupsPage = lazy(() => import('./modules/backups/pages/BackupsPage'));
const HistorialPage = lazy(() => import('./modules/historial/pages/HistorialPage'));
const PermisosPage = lazy(() => import('./modules/permisos/pages/PermisosPage'));
const InventarioGeneralPage = lazy(() => import('./modules/inventario-general/pages/InventarioGeneralPage'));
const VentasPage = lazy(() => import('./modules/ventas/pages/VentasPage'));
const EnviosPage = lazy(() => import('./modules/ventas/pages/EnviosPage'));
const VentasDetallePage = lazy(() => import('./modules/ventas/pages/VentasDetallePage'));
const RequerimientosPage = lazy(() => import('./modules/ventas/pages/RequerimientosPage'));
const PickingPage = lazy(() => import('./modules/picking/pages/PickingPage'));
const RotulosPage = lazy(() => import('./modules/rotulos/pages/RotulosPage'));

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
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado && usuarioGuardado !== 'undefined') {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch (error) {
        localStorage.removeItem('usuario');
      }
    }

    authService.obtenerUsuarioActual()
      .then((resp) => {
        if (resp?.data) {
          setIsAuthenticated(true);
          setUsuario(resp.data);
          localStorage.setItem('usuario', JSON.stringify(resp.data));
        }
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          localStorage.removeItem('usuario');
          setIsAuthenticated(false);
          setUsuario(null);
        }
      })
      .finally(() => setAuthChecked(true));
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

  const routeFallback = (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-spinner" />
        <h2>Cargando modulo...</h2>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <Router>
        {isAuthenticated && <Navbar usuario={usuario} onLogout={handleLogout} />}
        <Suspense fallback={routeFallback}>
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
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
