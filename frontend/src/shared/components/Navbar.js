import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ usuario, onLogout }) => {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const navGroups = [
    {
      title: 'General',
      items: [{ to: '/dashboard', label: 'Dashboard' }]
    },
    {
      title: 'Inventario',
      items: [
        { to: '/productos', label: 'Productos' },
        { to: '/tipos-maquinas', label: 'Tipos de Máquinas' },
        { to: '/inventario-general', label: 'Inventario General' },
        { to: '/inventario', label: 'Gestor Inventario' },
        { to: '/historial', label: 'Historial' }
      ]
    },
    {
      title: 'Cotizaciones',
      items: [
        { to: '/kits', label: 'Kits' },
        { to: '/cotizaciones', label: 'Cotizaciones' },
        { to: '/cotizaciones-historial', label: 'Historial Cotizaciones' }
      ]
    },
    {
      title: 'Clientes',
      items: [{ to: '/clientes', label: 'Clientes' }]
    },
    {
      title: 'Gestor de Cuentas',
      items: [
        { to: '/usuarios', label: usuario?.rol === 'admin' ? 'Usuarios' : 'Mi Perfil' },
        { to: '/permisos', label: 'Permisos' }
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    onLogout();
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar">
        <button
          className="menu-toggle"
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="navbar-brand">
          <img src="/static/img/KRATOS_LOGO.PNG" alt="Kratos" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-title">Kratos</span>
            <span className="brand-subtitle">Inventario</span>
          </div>
        </div>

        <div className="navbar-user">
          <span className="usuario-nombre">{usuario?.nombre}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className={`side-menu ${menuAbierto ? 'open' : ''}`}>
        <div className="side-menu__header">
          <span>Menú</span>
          <button type="button" className="btn-icon" onClick={() => setMenuAbierto(false)}>
            X
          </button>
        </div>
        <div className="side-menu__links">
          {navGroups.map((group) => (
            <div className="side-menu__group" key={group.title}>
              <div className="side-menu__group-title">{group.title}</div>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="nav-link"
                  onClick={() => setMenuAbierto(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      {menuAbierto && <div className="side-menu__backdrop" onClick={() => setMenuAbierto(false)} />}
    </>
  );
};

export default Navbar;



