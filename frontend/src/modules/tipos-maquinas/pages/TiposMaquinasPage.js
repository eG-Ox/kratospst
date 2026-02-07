import React, { useEffect, useState } from 'react';
import { marcasService, tiposMaquinasService } from '../../../core/services/apiServices';
import '../styles/TiposMaquinasPage.css';

const TiposMaquinasPage = () => {
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [mostrarModalMarca, setMostrarModalMarca] = useState(false);
  const [editandoMarca, setEditandoMarca] = useState(null);
  const [vista, setVista] = useState('tipos');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });
  const [marcaForm, setMarcaForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    cargarTipos();
    cargarMarcas();
  }, []);

  const cargarTipos = async () => {
    try {
      setLoading(true);
      const response = await tiposMaquinasService.getAll();
      setTipos(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando tipos de maquina:', err);
      setError('Error al cargar tipos de maquina');
    } finally {
      setLoading(false);
    }
  };

  const cargarMarcas = async () => {
    try {
      const response = await marcasService.getAll();
      setMarcas(response.data || []);
    } catch (err) {
      console.error('Error cargando marcas:', err);
      setError('Error al cargar marcas');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '' });
    setEditandoTipo(null);
  };

  const resetMarcaForm = () => {
    setMarcaForm({ codigo: '', nombre: '', descripcion: '' });
    setEditandoMarca(null);
  };

  const abrirModal = () => {
    resetForm();
    setMostrarModal(true);
  };

  const abrirModalMarca = () => {
    resetMarcaForm();
    setMostrarModalMarca(true);
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
    } catch (err) {
      console.error('Error guardando tipo de maquina:', err);
      setError(err.response?.data?.error || 'Error al guardar tipo de maquina');
    }
  };

  const handleGuardarMarca = async (e) => {
    e.preventDefault();

    if (!marcaForm.codigo || !marcaForm.nombre) {
      setError('Codigo y nombre de marca son requeridos');
      return;
    }

    try {
      if (editandoMarca) {
        await marcasService.update(editandoMarca.id, marcaForm);
      } else {
        await marcasService.create(marcaForm);
      }
      resetMarcaForm();
      setMostrarModalMarca(false);
      await cargarMarcas();
    } catch (err) {
      console.error('Error guardando marca:', err);
      setError(err.response?.data?.error || 'Error al guardar marca');
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

  const handleEditarMarca = (marca) => {
    setMarcaForm({
      codigo: marca.codigo || '',
      nombre: marca.nombre || '',
      descripcion: marca.descripcion || ''
    });
    setEditandoMarca(marca);
    setMostrarModalMarca(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('?Estas seguro de que deseas eliminar este tipo de maquina?')) {
      try {
        await tiposMaquinasService.delete(id);
        await cargarTipos();
      } catch (err) {
        console.error('Error eliminando tipo de maquina:', err);
        setError('Error al eliminar tipo de maquina');
      }
    }
  };

  const handleEliminarMarca = async (id) => {
    if (window.confirm('?Estas seguro de que deseas eliminar esta marca?')) {
      try {
        await marcasService.delete(id);
        await cargarMarcas();
      } catch (err) {
        console.error('Error eliminando marca:', err);
        setError('Error al eliminar marca');
      }
    }
  };

  return (
    <div className="tipos-container">
      <div className="tipos-header">
        <h1>Tipos y Marcas</h1>
      </div>

      <div className="tipos-tabs">
        <button
          type="button"
          className={`tipos-tab ${vista === 'tipos' ? 'active' : ''}`}
          onClick={() => setVista('tipos')}
        >
          Tipos de Maquinas
        </button>
        <button
          type="button"
          className={`tipos-tab ${vista === 'marcas' ? 'active' : ''}`}
          onClick={() => setVista('marcas')}
        >
          Marcas
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="tipos-grid">
          {vista === 'tipos' && (
            <div className="tipos-table-container full">
            <div className="section-header">
              <h2>Tipos de Maquinas</h2>
              <button className="btn-primary icon-btn-inline" onClick={abrirModal} title="Nuevo Tipo">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5h2v14h-2z" />
                  <path d="M5 11h14v2H5z" />
                </svg>
              </button>
            </div>
            {tipos.length > 0 ? (
              <table className="tipos-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripcion</th>
                    <th className="icon-col" title="Acciones">
                      <span className="icon-label" aria-label="Acciones">...</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((tipo) => (
                    <tr key={tipo.id}>
                      <td>{tipo.nombre}</td>
                      <td>{tipo.descripcion || '-'}</td>
                      <td className="acciones">
                        <button
                          className="icon-btn icon-btn--edit"
                          onClick={() => handleEditar(tipo)}
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
                          onClick={() => handleEliminar(tipo.id)}
                          title="Eliminar"
                          aria-label="Eliminar"
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
            ) : (
              <p className="empty-message">No hay tipos registrados</p>
            )}
          </div>
          )}

          {vista === 'marcas' && (
            <div className="tipos-table-container full">
            <div className="section-header">
              <h2>Marcas</h2>
              <button className="btn-primary icon-btn-inline" onClick={abrirModalMarca} title="Nueva Marca">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5h2v14h-2z" />
                  <path d="M5 11h14v2H5z" />
                </svg>
              </button>
            </div>
            {marcas.length > 0 ? (
              <table className="tipos-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Nombre</th>
                    <th>Descripcion</th>
                    <th className="icon-col" title="Acciones">
                      <span className="icon-label" aria-label="Acciones">...</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {marcas.map((marca) => (
                    <tr key={marca.id}>
                      <td>{marca.codigo}</td>
                      <td>{marca.nombre}</td>
                      <td>{marca.descripcion || '-'}</td>
                      <td className="acciones">
                        <button
                          className="icon-btn icon-btn--edit"
                          onClick={() => handleEditarMarca(marca)}
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
                          onClick={() => handleEliminarMarca(marca.id)}
                          title="Eliminar"
                          aria-label="Eliminar"
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
            ) : (
              <p className="empty-message">No hay marcas registradas</p>
            )}
          </div>
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
                X
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
                  <label>Descripcion</label>
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

      {mostrarModalMarca && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <h2>{editandoMarca ? 'Editar Marca' : 'Nueva Marca'}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  resetMarcaForm();
                  setMostrarModalMarca(false);
                }}
              >
                X
              </button>
            </div>
            <form onSubmit={handleGuardarMarca}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Codigo *</label>
                  <input
                    type="text"
                    required
                    value={marcaForm.codigo}
                    onChange={(e) => setMarcaForm({ ...marcaForm, codigo: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={marcaForm.nombre}
                    onChange={(e) => setMarcaForm({ ...marcaForm, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Descripcion</label>
                  <input
                    type="text"
                    value={marcaForm.descripcion}
                    onChange={(e) => setMarcaForm({ ...marcaForm, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-success">
                  {editandoMarca ? 'Guardar' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetMarcaForm();
                    setMostrarModalMarca(false);
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
