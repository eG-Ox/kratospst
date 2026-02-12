import React, { useState, useEffect } from 'react';
import '../styles/MaquinaForm.css';
import { tiposMaquinasService } from '../services/api';

const MaquinaForm = ({ onSubmit, initialData = null, onCancel }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    tipo_maquina_id: '',
    marca: '',
    descripcion: '',
    stock: 0,
    precio_compra: '',
    precio_venta: '',
    precio_minimo: '',
    ficha_web: '',
    ficha_tecnica: null,
  });

  const [tipos, setTipos] = useState([]);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [mostraFormularioTipo, setMostraFormularioTipo] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarTipos();
    if (initialData) {
      setFormData({
        ...initialData,
        ficha_tecnica: null,
      });
    }
  }, [initialData]);

  const cargarTipos = async () => {
    try {
      const response = await tiposMaquinasService.getAll();
      setTipos(response.data);
    } catch (error) {
      console.error('Error cargando tipos:', error);
      setError('Error al cargar tipos de máquinas');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar 10MB');
        return;
      }
      setFormData({
        ...formData,
        ficha_tecnica: file,
      });
      setError('');
    }
  };

  const handleAgregarTipo = async () => {
    if (!nuevoTipo.trim()) {
      setError('Ingrese el nombre del tipo de máquina');
      return;
    }
    try {
      setLoading(true);
      const response = await tiposMaquinasService.create({ nombre: nuevoTipo });
      setTipos([...tipos, response.data]);
      setFormData({ ...formData, tipo_maquina_id: response.data.id });
      setNuevoTipo('');
      setMostraFormularioTipo(false);
      setError('');
    } catch (error) {
      setError(error.response?.data?.error || 'Error al crear tipo de máquina');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.codigo || !formData.tipo_maquina_id || !formData.marca) {
      setError('Campos requeridos: Código, Tipo de Máquina y Marca');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al guardar máquina');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="maquina-form-container">
      <form onSubmit={handleSubmit} className="maquina-form">
        <h2>{initialData ? 'Editar Máquina' : 'Agregar Nueva Máquina'}</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="codigo">Código *</label>
          <input
            type="text"
            id="codigo"
            name="codigo"
            value={formData.codigo}
            onChange={handleInputChange}
            placeholder="Ej: MAQ001"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tipo_maquina_id">Tipo de Máquina *</label>
          <div className="tipo-maquina-wrapper">
            <select
              id="tipo_maquina_id"
              name="tipo_maquina_id"
              value={formData.tipo_maquina_id}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Seleccione un tipo --</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-agregar-tipo"
              onClick={() => setMostraFormularioTipo(!mostraFormularioTipo)}
            >
              + Nuevo Tipo
            </button>
          </div>
        </div>

        {mostraFormularioTipo && (
          <div className="form-group nuevo-tipo">
            <label htmlFor="nuevoTipo">Nombre del Nuevo Tipo</label>
            <div className="new-tipo-input">
              <input
                type="text"
                id="nuevoTipo"
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value)}
                placeholder="Ej: Taladro"
              />
              <button
                type="button"
                className="btn-crear"
                onClick={handleAgregarTipo}
                disabled={loading}
              >
                Crear
              </button>
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => {
                  setMostraFormularioTipo(false);
                  setNuevoTipo('');
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="marca">Marca *</label>
            <input
              type="text"
              id="marca"
              name="marca"
              value={formData.marca}
              onChange={handleInputChange}
              placeholder="Ej: Bosch"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock">Stock</label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleInputChange}
            placeholder="Descripción de la máquina"
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="precio_compra">Precio de Compra *</label>
            <input
              type="number"
              id="precio_compra"
              name="precio_compra"
              value={formData.precio_compra}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="precio_venta">Precio de Venta *</label>
            <input
              type="number"
              id="precio_venta"
              name="precio_venta"
              value={formData.precio_venta}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="precio_minimo">Precio Mínimo</label>
            <input
              type="number"
              id="precio_minimo"
              name="precio_minimo"
              value={formData.precio_minimo}
              onChange={handleInputChange}
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="ficha_web">Ficha Web (URL)</label>
          <input
            type="url"
            id="ficha_web"
            name="ficha_web"
            value={formData.ficha_web}
            onChange={handleInputChange}
            placeholder="https://ejemplo.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="ficha_tecnica">Ficha Técnica (PDF)</label>
          <input
            type="file"
            id="ficha_tecnica"
            accept=".pdf"
            onChange={handleFileChange}
          />
          {formData.ficha_tecnica && (
            <p className="file-info">Archivo: {formData.ficha_tecnica.name}</p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaquinaForm;
