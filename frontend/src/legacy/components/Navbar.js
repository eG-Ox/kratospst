import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/api';
import '../../styles/Navbar.css';

const Navbar = ({ usuario, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch (error) {
      // Even if backend logout fails, clear local session for UX consistency.
    }
    localStorage.removeItem('usuario');
    onLogout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          <span className="brand-icon">📦</span>
          Inventario
        </Link>

        <ul className="navbar-menu">
          <li>
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
              📊 Dashboard
            </Link>
          </li>
          <li>
            <Link to="/productos" className={`nav-link ${isActive('/productos')}`}>
              🏭 Productos
            </Link>
          </li>
          <li>
            <Link to="/ingresos" className={`nav-link ${isActive('/ingresos')}`}>
              📥 Ingresos
            </Link>
          </li>
          <li>
            <Link to="/salidas" className={`nav-link ${isActive('/salidas')}`}>
              📤 Salidas
            </Link>
          </li>
          <li>
            <Link to="/kits" className={`nav-link ${isActive('/kits')}`}>
              📋 Kits
            </Link>
          </li>
          <li>
            <Link to="/cotizaciones" className={`nav-link ${isActive('/cotizaciones')}`}>
              💰 Cotizaciones
            </Link>
          </li>
        </ul>

        <div className="navbar-user">
          <span className="user-info">
            👤 {usuario?.nombre || 'Usuario'}
            <small>{usuario?.rol === 'admin' ? '(Admin)' : '(Operario)'}</small>
          </span>
          <button className="btn-logout" onClick={handleLogout} disabled={loggingOut}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
