import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './shared/components/Navbar';
import ProtectedRoute from './shared/components/ProtectedRoute';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { authService, permisosService } from './core/services/apiServices';
import RequerimientosPage from './modules/ventas/pages/RequerimientosPage';
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
const PickingPage = lazy(() => import('./modules/picking/pages/PickingPage'));
const RotulosPage = lazy(() => import('./modules/rotulos/pages/RotulosPage'));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
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

  const cargarPermisos = async () => {
    try {
      const permisosResp = await permisosService.misPermisos();
      return Array.isArray(permisosResp?.data) ? permisosResp.data : [];
    } catch (_) {
      return [];
    }
  };

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const usuarioGuardado = localStorage.getItem('usuario');
      if (usuarioGuardado && usuarioGuardado !== 'undefined') {
        try {
          const parsed = JSON.parse(usuarioGuardado);
          if (mounted) {
            setUsuario(parsed);
          }
        } catch (error) {
          localStorage.removeItem('usuario');
        }
      }

      try {
        const resp = await authService.obtenerUsuarioActual();
        if (!mounted || !resp?.data) return;
        setIsAuthenticated(true);
        setUsuario(resp.data);
        localStorage.setItem('usuario', JSON.stringify(resp.data));
        const permisos = await cargarPermisos();
        if (mounted) {
          setUserPermissions(permisos);
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('usuario');
        }
        if (mounted) {
          setIsAuthenticated(false);
          setUsuario(null);
          setUserPermissions([]);
        }
      } finally {
        if (mounted) {
          setAuthChecked(true);
        }
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
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

  const handleLoginSuccess = async (usuarioData) => {
    setIsAuthenticated(true);
    setUsuario(usuarioData);
    const permisos = await cargarPermisos();
    setUserPermissions(permisos);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsuario(null);
    setUserPermissions([]);
    localStorage.removeItem('usuario');
  };

  const userPermissionsSet = useMemo(() => new Set(userPermissions), [userPermissions]);

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

  const protectedRouteProps = {
    isAuthenticated,
    authChecked,
    usuario,
    userPermissions: userPermissionsSet
  };

  return (
    <ErrorBoundary>
      <Router>
        {isAuthenticated && (
          <Navbar
            usuario={usuario}
            permisos={userPermissions}
            onLogout={handleLogout}
          />
        )}
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
                <ProtectedRoute {...protectedRouteProps}>
                  <DashboardPage usuario={usuario} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/productos"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="productos.ver">
                  <ProductosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tipos-maquinas"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="tipos_maquinas.ver">
                  <TiposMaquinasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="movimientos.ver">
                  <GestorInventarioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario-general"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="inventario_general.ver">
                  <InventarioGeneralPage />
                </ProtectedRoute>
              }
            />
            <Route path="/ingresos" element={<Navigate to="/inventario" />} />
            <Route path="/salidas" element={<Navigate to="/inventario" />} />
            <Route
              path="/kits"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="kits.ver">
                  <KitsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cotizaciones"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="cotizaciones.ver">
                  <CotizacionesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cotizaciones-historial"
              element={
                <ProtectedRoute
                  {...protectedRouteProps}
                  requiredPermissions="cotizaciones.historial.ver"
                >
                  <HistorialCotizacionesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="clientes.ver">
                  <ClientesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute {...protectedRouteProps}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backups"
              element={
                <ProtectedRoute {...protectedRouteProps} allowedRoles="admin">
                  <BackupsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/permisos"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="permisos.editar">
                  <PermisosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/historial"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="historial.ver">
                  <HistorialPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ventas"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="ventas.ver">
                  <VentasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ventas-envios"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="ventas.ver">
                  <EnviosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ventas-detalle"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="ventas.ver">
                  <VentasDetallePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ventas-requerimientos"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="ventas.ver">
                  <RequerimientosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/picking"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="picking.ver">
                  <PickingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rotulos"
              element={
                <ProtectedRoute {...protectedRouteProps} requiredPermissions="clientes.ver">
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

