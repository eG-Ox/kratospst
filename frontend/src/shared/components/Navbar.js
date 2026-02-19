import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../core/services/apiServices';
import './Navbar.css';

const Navbar = ({ usuario, permisos = [], onLogout }) => {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const permisosSet = useMemo(
    () => new Set(Array.isArray(permisos) ? permisos : []),
    [permisos]
  );

  const navGroups = [
    {
      title: 'General',
      items: [{ to: '/dashboard', label: 'Dashboard' }]
    },
    {
      title: 'Inventario',
      items: [
        { to: '/productos', label: 'Productos', requiredPermissions: ['productos.ver'] },
        {
          to: '/tipos-maquinas',
          label: 'Tipos de Maquinas',
          requiredPermissions: ['tipos_maquinas.ver']
        },
        {
          to: '/inventario-general',
          label: 'Inventario General',
          requiredPermissions: ['inventario_general.ver']
        },
        {
          to: '/inventario',
          label: 'Gestor Inventario',
          requiredPermissions: ['movimientos.ver']
        },
        { to: '/historial', label: 'Historial', requiredPermissions: ['historial.ver'] }
      ]
    },
    {
      title: 'Cotizaciones',
      items: [
        { to: '/kits', label: 'Kits', requiredPermissions: ['kits.ver'] },
        {
          to: '/cotizaciones',
          label: 'Cotizaciones',
          requiredPermissions: ['cotizaciones.ver']
        },
        {
          to: '/cotizaciones-historial',
          label: 'Historial Cotizaciones',
          requiredPermissions: ['cotizaciones.historial.ver']
        }
      ]
    },
    {
      title: 'Clientes',
      items: [{ to: '/clientes', label: 'Clientes', requiredPermissions: ['clientes.ver'] }]
    },
    {
      title: 'Ventas',
      items: [
        { to: '/ventas', label: 'Control Ventas', requiredPermissions: ['ventas.ver'] },
        { to: '/ventas-envios', label: 'Control Envios', requiredPermissions: ['ventas.ver'] },
        {
          to: '/ventas-detalle',
          label: 'Detalle Ventas',
          requiredPermissions: ['ventas.ver']
        },
        {
          to: '/ventas-requerimientos',
          label: 'Requerimientos',
          requiredPermissions: ['ventas.ver']
        },
        { to: '/picking', label: 'Picking', requiredPermissions: ['picking.ver'] },
        { to: '/rotulos', label: 'Rotulos', requiredPermissions: ['clientes.ver'] }
      ]
    },
    {
      title: 'Gestor de Cuentas',
      items: [
        ...(usuario?.rol === 'admin'
          ? [{ to: '/usuarios', label: 'Usuarios', requiredPermissions: ['usuarios.ver'] }]
          : [{ to: '/usuarios', label: 'Mi Perfil' }]),
        {
          to: '/permisos',
          label: 'Permisos',
          requiredPermissions: ['permisos.editar']
        },
        {
          to: '/backups',
          label: 'Backups',
          allowedRoles: ['admin']
        }
      ]
    }
  ];

  const canAccess = (item) => {
    const requiredPermissions = Array.isArray(item.requiredPermissions)
      ? item.requiredPermissions
      : [];
    const allowedRoles = Array.isArray(item.allowedRoles) ? item.allowedRoles : [];

    if (allowedRoles.length && !allowedRoles.includes(usuario?.rol)) {
      return false;
    }
    if (!requiredPermissions.length) {
      return true;
    }
    return requiredPermissions.some((permiso) => permisosSet.has(permiso));
  };

  const filteredNavGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(canAccess) }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (_) {
      // no-op
    }
    localStorage.removeItem('usuario');
    onLogout();
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar">
        <button
          className={`menu-toggle ${menuAbierto ? 'is-open' : ''}`}
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menu"
          aria-expanded={menuAbierto}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="navbar-brand">
          <img src="/static/img/KRATOS_LOGO.png" alt="Kratos" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-title">Kratos</span>
            <span className="brand-subtitle">Inventario</span>
          </div>
        </div>

        <div className="navbar-user">
          <span className="usuario-nombre">{usuario?.nombre}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar Sesion
          </button>
        </div>
      </nav>

      <div
        className={`side-menu ${menuAbierto ? 'open' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="side-menu__header">
          <span>Menu</span>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menu"
          >
            +
          </button>
        </div>
        <div className="side-menu__links">
          {filteredNavGroups.map((group) => (
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
          <div className="side-menu__group">
            <div className="side-menu__group-title">Sesion</div>
            <button
              type="button"
              className="nav-link nav-link--danger"
              onClick={handleLogout}
            >
              Cerrar Sesion
            </button>
          </div>
        </div>
      </div>
      {menuAbierto && <div className="side-menu__backdrop" onClick={() => setMenuAbierto(false)} />}
    </>
  );
};

export default Navbar;
