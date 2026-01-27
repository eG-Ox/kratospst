import React, { useEffect, useState } from 'react';
import { usuariosService } from '../../../core/services/apiServices';
import '../styles/UsuariosPage.css';

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'operario',
    activo: true
  });

  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esAdmin = usuarioActual?.rol === 'admin';

  useEffect(() => {
    if (esAdmin) {
      cargarUsuarios();
    } else {
      cargarPerfil();
    }
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const resp = await usuariosService.listar();
      setUsuarios(resp.data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const resp = await usuariosService.obtenerPerfil();
      setFormData({
        nombre: resp.data.nombre || '',
        email: resp.data.email || '',
        telefono: resp.data.telefono || '',
        rol: resp.data.rol || 'operario',
        activo: true
      });
      setError('');
    } catch (err) {
      console.error('Error cargando perfil:', err);
      setError('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (usuario) => {
    setEditando(usuario);
    setFormData({
      nombre: usuario.nombre || '',
      email: usuario.email || '',
      telefono: usuario.telefono || '',
      rol: usuario.rol || 'operario',
      activo: !!usuario.activo
    });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (esAdmin) {
        await usuariosService.actualizar(editando.id, formData);
        setEditando(null);
        await cargarUsuarios();
      } else {
        await usuariosService.actualizarPerfil({
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono
        });
        await cargarPerfil();
      }
    } catch (err) {
      console.error('Error guardando usuario:', err);
      setError(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="usuarios-container">
      <div className="usuarios-header">
        <h1>{esAdmin ? 'Usuarios' : 'Mi Perfil'}</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      {esAdmin ? (
        <div className="usuarios-table-container">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Rol</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.telefono || '-'}</td>
                  <td>{usuario.rol}</td>
                  <td>{usuario.activo ? 'Si' : 'No'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEditar(usuario)}>
                      Editar
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
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Telefono</label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
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
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Telefono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  >
                    <option value="admin">admin</option>
                    <option value="operario">operario</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Activo</label>
                  <select
                    value={formData.activo ? '1' : '0'}
                    onChange={(e) =>
                      setFormData({ ...formData, activo: e.target.value === '1' })
                    }
                  >
                    <option value="1">Si</option>
                    <option value="0">No</option>
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
    </div>
  );
};

export default UsuariosPage;
