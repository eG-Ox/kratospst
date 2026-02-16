import React, { useCallback, useEffect, useState } from 'react';
import { authService, usuariosService } from '../../../core/services/apiServices';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/UsuariosPage.css';

const UsuariosPage = () => {
  const mountedRef = useMountedRef();
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'ventas',
    activo: true
  });
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    email: '',
    contrasena: '',
    rol: 'ventas'
  });

  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esAdmin = usuarioActual?.rol === 'admin';

  const cargarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await usuariosService.listar();
      if (!mountedRef.current) return;
      setUsuarios((resp.data || []).filter((usuario) => usuario.activo));
      setError('');
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      if (mountedRef.current) {
        setError('Error al cargar usuarios');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [mountedRef]);

  const cargarPerfil = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await usuariosService.obtenerPerfil();
      if (!mountedRef.current) return;
      setFormData({
        nombre: resp.data.nombre || '',
        email: resp.data.email || '',
        rol: resp.data.rol || 'ventas',
        activo: true
      });
      setError('');
    } catch (err) {
      console.error('Error cargando perfil:', err);
      if (mountedRef.current) {
        setError('Error al cargar perfil');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [mountedRef]);

  useEffect(() => {
    if (esAdmin) {
      cargarUsuarios();
    } else {
      cargarPerfil();
    }
  }, [cargarPerfil, cargarUsuarios, esAdmin]);

  const handleEditar = (usuario) => {
    setEditando(usuario);
    setFormData({
      nombre: usuario.nombre || '',
      email: usuario.email || '',
      rol: usuario.rol || 'ventas',
      activo: !!usuario.activo
    });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (esAdmin) {
        await usuariosService.actualizar(editando.id, formData);
        if (mountedRef.current) {
          setEditando(null);
        }
        await cargarUsuarios();
      } else {
        await usuariosService.actualizarPerfil({
          nombre: formData.nombre,
          email: formData.email
        });
        await cargarPerfil();
      }
    } catch (err) {
      console.error('Error guardando usuario:', err);
      if (mountedRef.current) {
        setError(err.response?.data?.error || 'Error al guardar usuario');
      }
    }
  };

  const handleToggleActivo = async (usuario) => {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    const confirmar = window.confirm(`Deseas ${accion} a ${usuario.nombre}?`);
    if (!confirmar) return;
    try {
      await usuariosService.actualizar(usuario.id, {
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono || '',
        rol: usuario.rol,
        activo: !usuario.activo
      });
      await cargarUsuarios();
    } catch (err) {
      console.error('Error cambiando estado de usuario:', err);
      if (mountedRef.current) {
        setError(err.response?.data?.error || 'Error al actualizar usuario');
      }
    }
  };

  const abrirCrear = () => {
    setNuevoUsuario({ nombre: '', email: '', contrasena: '', rol: 'ventas' });
    setCreando(true);
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authService.registro({
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        contrasena: nuevoUsuario.contrasena,
        rol: nuevoUsuario.rol
      });
      if (mountedRef.current) {
        setCreando(false);
      }
      await cargarUsuarios();
    } catch (err) {
      console.error('Error creando usuario:', err);
      if (mountedRef.current) {
        setError(err.response?.data?.error || 'Error al crear usuario');
      }
    }
  };


  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="usuarios-container">
      <div className="usuarios-header">
        <h1>{esAdmin ? 'Usuarios' : 'Mi Perfil'}</h1>
        {esAdmin && (
          <button type="button" className="btn-primary" onClick={abrirCrear}>
            + Nuevo Usuario
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {esAdmin ? (
        <div className="usuarios-table-container">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="icon-col" title="Acciones">
                  <span className="icon-label" aria-label="Acciones">...</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.rol}</td>
                  <td>{usuario.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    <button
                      className="icon-btn icon-btn--edit"
                      onClick={() => handleEditar(usuario)}
                      title="Editar"
                      aria-label="Editar"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 17.5V20h2.5L17.9 8.6l-2.5-2.5L4 17.5z" />
                        <path d="M20.7 7.2a1 1 0 0 0 0-1.4l-2.5-2.5a1 1 0 0 0-1.4 0l-1.7 1.7 2.5 2.5 1.7-1.7z" />
                      </svg>
                    </button>
                    <button
                      className="icon-btn icon-btn--delete"
                      onClick={() => handleToggleActivo(usuario)}
                      title={usuario.activo ? 'Desactivar' : 'Activar'}
                      aria-label={usuario.activo ? 'Desactivar' : 'Activar'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 7h12l-1 14H7L6 7z" />
                        <path d="M9 7V5h6v2h4v2H5V7h4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <form className="perfil-form" onSubmit={handleGuardar}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-success">
            Guardar cambios
          </button>
        </form>
      )}

      {editando && esAdmin && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <h2>Editar Usuario</h2>
              <button type="button" className="btn-icon" onClick={() => setEditando(null)}>
                X
              </button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="text"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  >
                    <option value="admin">admin</option>
                    <option value="ventas">ventas</option>
                    <option value="logistica">logistica</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-success">
                  Guardar
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditando(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {creando && esAdmin && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <h2>Crear Usuario</h2>
              <button type="button" className="btn-icon" onClick={() => setCreando(false)}>
                X
              </button>
            </div>
            <form onSubmit={handleCrear} autoComplete="off">
              <div className="modal-body">
                <input type="text" name="fakeuser" autoComplete="username" style={{ display: 'none' }} />
                <input
                  type="password"
                  name="fakepass"
                  autoComplete="new-password"
                  style={{ display: 'none' }}
                />
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="nuevo-nombre"
                    autoComplete="off"
                    value={nuevoUsuario.nombre}
                    onChange={(e) =>
                      setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="nuevo-email"
                    autoComplete="email"
                    required
                    value={nuevoUsuario.email}
                    onChange={(e) =>
                      setNuevoUsuario({ ...nuevoUsuario, email: e.target.value.trim() })
                    }
                    placeholder="usuario@dominio.com"
                  />
                </div>
                <div className="form-group">
                  <label>Contrasena</label>
                  <input
                    type="password"
                    name="nuevo-contrasena"
                    autoComplete="new-password"
                    value={nuevoUsuario.contrasena}
                    onChange={(e) =>
                      setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={nuevoUsuario.rol}
                    onChange={(e) =>
                      setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="ventas">ventas</option>
                    <option value="logistica">logistica</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-success">
                  Crear
                </button>
                <button type="button" className="btn-secondary" onClick={() => setCreando(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosPage;
