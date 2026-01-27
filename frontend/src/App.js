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
import ClientesPage from './modules/clientes/pages/ClientesPage';
import UsuariosPage from './modules/usuarios/pages/UsuariosPage';

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
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DashboardPage usuario={usuario} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ProductosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tipos-maquinas"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <TiposMaquinasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventario"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <GestorInventarioPage />
            </ProtectedRoute>
          }
        />
        <Route path="/ingresos" element={<Navigate to="/inventario" />} />
        <Route path="/salidas" element={<Navigate to="/inventario" />} />
        <Route
          path="/kits"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <KitsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cotizaciones"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <CotizacionesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ClientesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
