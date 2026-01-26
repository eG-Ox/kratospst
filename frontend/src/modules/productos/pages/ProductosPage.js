import React, { useState, useEffect } from 'react';
import { productosService, tiposMaquinasService } from '../../../core/services/apiServices';
import '../styles/ProductosPage.css';

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [mostrarModalTipo, setMostrarModalTipo] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [formularioData, setFormularioData] = useState({
    codigo: '',
    tipo_maquina_id: '',
    marca: '',
    descripcion: '',
    stock: 0,
    precio_compra: '',
    precio_venta: '',
    precio_minimo: 0,
    ficha_web: '',
    ficha_tecnica: null
  });
  const [tipoForm, setTipoForm] = useState({
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [respProductos, respTipos] = await Promise.all([
        productosService.getAll(),
        tiposMaquinasService.getAll()
      ]);
      setProductos(respProductos.data);
      setTipos(respTipos.data);
      setError('');
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const resetFormulario = () => {
    setFormularioData({
      codigo: '',
      tipo_maquina_id: '',
      marca: '',
      descripcion: '',
      stock: 0,
      precio_compra: '',
      precio_venta: '',
      precio_minimo: 0,
      ficha_web: '',
      ficha_tecnica: null
    });
    setEditandoProducto(null);
  };

  const resetTipoForm = () => {
    setTipoForm({ nombre: '', descripcion: '' });
    setEditandoTipo(null);
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    try {
      if (editandoProducto) {
        await productosService.update(editandoProducto.id, formularioData);
      } else {
        await productosService.create(formularioData);
      }
      resetFormulario();
      setMostrarModalProducto(false);
      await cargarDatos();
    } catch (error) {
      console.error('Error guardando producto:', error);
      setError(error.response?.data?.error || 'Error al guardar producto');
    }
  };

  const handleEditarProducto = (producto) => {
    setFormularioData({
      codigo: producto.codigo || '',
      tipo_maquina_id: producto.tipo_maquina_id ? String(producto.tipo_maquina_id) : '',
      marca: producto.marca || '',
      descripcion: producto.descripcion || '',
      stock: Number(producto.stock || 0),
      precio_compra: producto.precio_compra ?? '',
      precio_venta: producto.precio_venta ?? '',
      precio_minimo: producto.precio_minimo ?? 0,
      ficha_web: producto.ficha_web || '',
      ficha_tecnica: null
    });
    setEditandoProducto(producto);
    setMostrarModalProducto(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await productosService.delete(id);
        await cargarDatos();
      } catch (error) {
        console.error('Error eliminando producto:', error);
        setError('Error al eliminar producto');
      }
    }
  };

  const handleDescargarFicha = async (filename) => {
    try {
      const response = await productosService.descargarFichaTecnica(filename);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando ficha técnica:', error);
      setError('Error al descargar ficha técnica');
    }
  };

  const handleGuardarTipo = async (e) => {
    e.preventDefault();

    if (!tipoForm.nombre) {
      setError('El nombre del tipo de máquina es requerido');
      return;
    }

    try {
      if (editandoTipo) {
        await tiposMaquinasService.update(editandoTipo.id, tipoForm);
      } else {
        const response = await tiposMaquinasService.create(tipoForm);
        if (response?.data?.id) {
          setFormularioData((prev) => ({
            ...prev,
            tipo_maquina_id: String(response.data.id)
          }));
        }
      }
      resetTipoForm();
      setMostrarModalTipo(false);
      await cargarDatos();
    } catch (error) {
      console.error('Error guardando tipo de máquina:', error);
      setError(error.response?.data?.error || 'Error al guardar tipo de máquina');
    }
  };

  const handleEditarTipo = (tipo) => {
    setTipoForm({
      nombre: tipo.nombre || '',
      descripcion: tipo.descripcion || ''
    });
    setEditandoTipo(tipo);
    setMostrarModalTipo(true);
  };

  const handleEliminarTipo = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este tipo de máquina?')) {
      try {
        await tiposMaquinasService.delete(id);
        await cargarDatos();
      } catch (error) {
        console.error('Error eliminando tipo de máquina:', error);
        setError('Error al eliminar tipo de máquina');
      }
    }
  };

  const abrirModalProducto = () => {
    resetFormulario();
    setMostrarModalProducto(true);
  };

  const abrirModalTipo = () => {
    resetTipoForm();
    setMostrarModalTipo(true);
  };

  return (
    <div className="productos-container">
      <div className="productos-header">
        <h1>Productos / Máquinas</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={abrirModalProducto}>
            + Nuevo Producto
          </button>
          <button className="btn-secondary" onClick={abrirModalTipo}>
            + Nuevo Tipo
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}


      {loading ? (
        <div className="loading">Cargando productos...</div>
      ) : (
        <div className="productos-table-container">
          {productos.length > 0 ? (
            <table className="productos-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Descripción</th>
                  <th>Stock</th>
                  <th>Precio Compra</th>
                  <th>Precio Venta</th>
                  <th>Precio Mínimo</th>
                  <th>Ficha Web</th>
                  <th>Ficha Técnica</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(prod => (
                  <tr key={prod.id}>
                    <td>{prod.codigo}</td>
                    <td>{prod.tipo_nombre}</td>
                    <td>{prod.marca}</td>
                    <td>{prod.descripcion || '-'}</td>
                    <td className={prod.stock < prod.precio_minimo ? 'low-stock' : ''}>{prod.stock}</td>
                    <td>${Number(prod.precio_compra || 0).toFixed(2)}</td>
                    <td>${Number(prod.precio_venta || 0).toFixed(2)}</td>
                    <td>${Number(prod.precio_minimo || 0).toFixed(2)}</td>
                    <td>
                      {prod.ficha_web ? (
                        <a href={prod.ficha_web} target="_blank" rel="noreferrer">
                          Ver
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {prod.ficha_tecnica_ruta ? (
                        <button
                          className="btn-link"
                          onClick={() => handleDescargarFicha(prod.ficha_tecnica_ruta)}
                        >
                          Descargar
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="acciones">
                      <button className="btn-edit" onClick={() => handleEditarProducto(prod)}>
                        Editar
                      </button>
                      <button className="btn-delete" onClick={() => handleEliminar(prod.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">No hay productos creados</p>
          )}
        </div>
      )}

      {mostrarModalProducto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editandoProducto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  resetFormulario();
                  setMostrarModalProducto(false);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarProducto}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Código *</label>
                    <input
                      type="text"
                      required
                      value={formularioData.codigo}
                      onChange={(e) => setFormularioData({ ...formularioData, codigo: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Máquina *</label>
                    <select
                      required
                      value={formularioData.tipo_maquina_id}
                      onChange={(e) => setFormularioData({ ...formularioData, tipo_maquina_id: e.target.value })}
                    >
                      <option value="">Seleccionar tipo</option>
                      {tipos.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn-link" onClick={abrirModalTipo}>
                      + Agregar tipo si no está en la lista
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Marca *</label>
                    <input
                      type="text"
                      required
                      value={formularioData.marca}
                      onChange={(e) => setFormularioData({ ...formularioData, marca: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <input
                      type="text"
                      value={formularioData.descripcion}
                      onChange={(e) => setFormularioData({ ...formularioData, descripcion: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formularioData.stock}
                      onChange={(e) =>
                        setFormularioData({
                          ...formularioData,
                          stock: parseInt(e.target.value, 10) || 0
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Precio Compra *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formularioData.precio_compra}
                      onChange={(e) => setFormularioData({ ...formularioData, precio_compra: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Precio Venta *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formularioData.precio_venta}
                      onChange={(e) => setFormularioData({ ...formularioData, precio_venta: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Precio Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formularioData.precio_minimo}
                      onChange={(e) => setFormularioData({ ...formularioData, precio_minimo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>URL Ficha Técnica</label>
                  <input
                    type="url"
                    value={formularioData.ficha_web}
                    onChange={(e) => setFormularioData({ ...formularioData, ficha_web: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Archivo Ficha Técnica (PDF)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setFormularioData({
                        ...formularioData,
                        ficha_tecnica: e.target.files?.[0] || null
                      })
                    }
                  />
                  {editandoProducto?.ficha_tecnica_ruta && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => handleDescargarFicha(editandoProducto.ficha_tecnica_ruta)}
                    >
                      Descargar ficha actual
                    </button>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-success">
                  {editandoProducto ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetFormulario();
                    setMostrarModalProducto(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalTipo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editandoTipo ? 'Editar Tipo de Máquina' : 'Nuevo Tipo de Máquina'}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  resetTipoForm();
                  setMostrarModalTipo(false);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarTipo}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      required
                      value={tipoForm.nombre}
                      onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <input
                      type="text"
                      value={tipoForm.descripcion}
                      onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-success">
                  {editandoTipo ? 'Guardar Tipo' : 'Crear Tipo'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetTipoForm();
                    setMostrarModalTipo(false);
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

export default ProductosPage;
