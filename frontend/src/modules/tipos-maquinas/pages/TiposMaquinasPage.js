import React, { useEffect, useState } from 'react';
import { tiposMaquinasService } from '../../../core/services/apiServices';
import '../styles/TiposMaquinasPage.css';

const TiposMaquinasPage = () => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    cargarTipos();
  }, []);

  const cargarTipos = async () => {
    try {
      setLoading(true);
      const response = await tiposMaquinasService.getAll();
      setTipos(response.data);
      setError('');
    } catch (error) {
      console.error('Error cargando tipos de máquina:', error);
      setError('Error al cargar tipos de máquina');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '' });
    setEditandoTipo(null);
  };

  const abrirModal = () => {
    resetForm();
    setMostrarModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!formData.nombre) {
      setError('El nombre es requerido');
      return;
    }

    try {
      if (editandoTipo) {
        await tiposMaquinasService.update(editandoTipo.id, formData);
      } else {
        await tiposMaquinasService.create(formData);
      }
      resetForm();
      setMostrarModal(false);
      await cargarTipos();
    } catch (error) {
      console.error('Error guardando tipo de máquina:', error);
      setError(error.response?.data?.error || 'Error al guardar tipo de máquina');
    }
  };

  const handleEditar = (tipo) => {
    setFormData({
      nombre: tipo.nombre || '',
      descripcion: tipo.descripcion || ''
    });
    setEditandoTipo(tipo);
    setMostrarModal(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este tipo de máquina?')) {
      try {
        await tiposMaquinasService.delete(id);
        await cargarTipos();
      } catch (error) {
        console.error('Error eliminando tipo de máquina:', error);
        setError('Error al eliminar tipo de máquina');
      }
    }
  };

  return (
    <div className="tipos-container">
      <div className="tipos-header">
        <h1>Tipos de Máquinas</h1>
        <button className="btn-primary" onClick={abrirModal}>
          + Nuevo Tipo
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando tipos...</div>
      ) : (
        <div className="tipos-table-container">
          {tipos.length > 0 ? (
            <table className="tipos-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map((tipo) => (
                  <tr key={tipo.id}>
                    <td>{tipo.nombre}</td>
                    <td>{tipo.descripcion || '-'}</td>
                    <td className="acciones">
                      <button className="btn-edit" onClick={() => handleEditar(tipo)}>
                        Editar
                      </button>
                      <button className="btn-delete" onClick={() => handleEliminar(tipo.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">No hay tipos registrados</p>
          )}
        </div>
      )}

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <h2>{editandoTipo ? 'Editar Tipo' : 'Nuevo Tipo'}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  resetForm();
                  setMostrarModal(false);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-success">
                  {editandoTipo ? 'Guardar' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetForm();
                    setMostrarModal(false);
                  }}
                >
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

export default TiposMaquinasPage;
