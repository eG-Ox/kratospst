import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ usuario, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>📦 Inventario</h2>
      </div>

      <div className="navbar-menu">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/productos" className="nav-link">Productos</Link>
        <Link to="/tipos-maquinas" className="nav-link">Tipos de Máquinas</Link>
        <Link to="/inventario" className="nav-link">Gestor Inventario</Link>
        <Link to="/kits" className="nav-link">Kits</Link>
        <Link to="/cotizaciones" className="nav-link">Cotizaciones</Link>
        <Link to="/clientes" className="nav-link">Clientes</Link>
        <Link to="/usuarios" className="nav-link">
          {usuario?.rol === 'admin' ? 'Usuarios' : 'Mi Perfil'}
        </Link>
      </div>

      <div className="navbar-user">
        <span className="usuario-nombre">{usuario?.nombre}</span>
        <button className="btn-logout" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
