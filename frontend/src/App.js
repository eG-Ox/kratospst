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
import HistorialPage from './modules/historial/pages/HistorialPage';
import PermisosPage from './modules/permisos/pages/PermisosPage';
import InventarioGeneralPage from './modules/inventario-general/pages/InventarioGeneralPage';

// Componentes compartidos
import Navbar from './shared/components/Navbar';
import ProtectedRoute from './shared/components/ProtectedRoute';

// Estilos
import './shared/styles/variables.css';
import './shared/styles/shared.css';
import './shared/styles/animations.css';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');
    if (token && usuarioGuardado && usuarioGuardado !== 'undefined') {
      try {
        const usuarioParsed = JSON.parse(usuarioGuardado);
        setIsAuthenticated(true);
        setUsuario(usuarioParsed);
      } catch (error) {
        localStorage.removeItem('usuario');
      }
    }
    setAuthChecked(true);
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

  return (
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
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
