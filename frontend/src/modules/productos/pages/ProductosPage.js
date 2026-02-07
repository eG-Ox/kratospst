import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { permisosService, productosService, tiposMaquinasService } from '../../../core/services/apiServices';
import '../styles/ProductosPage.css';

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensajeImport, setMensajeImport] = useState('');
  const [erroresImport, setErroresImport] = useState([]);
  const [importando, setImportando] = useState(false);
  const [puedeVerPrecioCompra, setPuedeVerPrecioCompra] = useState(true);
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [mostrarModalTipo, setMostrarModalTipo] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [formularioData, setFormularioData] = useState({
    codigo: '',
    tipo_maquina_id: '',
    marca: '',
    descripcion: '',
    ubicacion_letra: '',
    ubicacion_numero: '',
    stock: 0,
    precio_compra: '',
    precio_venta: '',
    precio_minimo: 0,
    ficha_web: '',
    ficha_tecnica: null
  });

  const [filtros, setFiltros] = useState({
    q: '',
    tipo: '',
    marca: '',
    stock: 'all'
  });
  const [tipoForm, setTipoForm] = useState({
    nombre: '',
    descripcion: ''
  });
  const fileInputRef = useRef(null);


  const marcasDisponibles = useMemo(() => {
    const marcas = new Set();
    productos.forEach((prod) => {
      if (prod.marca) {
        marcas.add(String(prod.marca));
      }
    });
    return Array.from(marcas).sort((a, b) => a.localeCompare(b));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const q = filtros.q.trim().toLowerCase();
    return productos.filter((prod) => {
      if (filtros.tipo && String(prod.tipo_maquina_id || '') !== String(filtros.tipo)) {
        return false;
      }
      if (filtros.marca && String(prod.marca || '') !== String(filtros.marca)) {
        return false;
      }
      if (filtros.stock === 'bajo') {
        const min = Number(prod.precio_minimo || 0);
        if (!(Number(prod.stock || 0) <= min)) return false;
      }
      if (filtros.stock === 'sin') {
        if (Number(prod.stock || 0) > 0) return false;
      }
      if (q) {
        const hay = [prod.codigo, prod.descripcion, prod.marca, prod.tipo_nombre]
          .map((v) => String(v || '').toLowerCase())
          .some((v) => v.includes(q));
        if (!hay) return false;
      }
      return true;
    });
  }, [productos, filtros]);

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
      let permisos = [];
      try {
        const respPermisos = await permisosService.misPermisos();
        permisos = respPermisos.data || [];
      } catch (permError) {
        console.warn('No se pudieron cargar permisos:', permError);
      }
      setProductos(respProductos.data);
      setTipos(respTipos.data);
      setPuedeVerPrecioCompra(permisos.includes('productos.precio_compra.ver'));
      setError('');
      setMensajeImport('');
      setErroresImport([]);
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
      ubicacion_letra: '',
      ubicacion_numero: '',
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
      ubicacion_letra: producto.ubicacion_letra || '',
      ubicacion_numero: producto.ubicacion_numero ?? '',
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

  const descargarArchivo = (data, filename) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDescargarPlantilla = async () => {
    try {
      const response = await productosService.descargarPlantilla();
      descargarArchivo(response.data, 'plantilla_productos.xlsx');
    } catch (err) {
      console.error('Error descargando plantilla:', err);
      setError('Error al descargar plantilla');
    }
  };

  const handleExportarExcel = async () => {
    try {
      const response = await productosService.exportarExcel();
      descargarArchivo(response.data, 'productos.xlsx');
    } catch (err) {
      console.error('Error exportando productos:', err);
      setError('Error al exportar productos');
    }
  };

  const handleImportarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportarExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportando(true);
      setError('');
      setMensajeImport('');
      setErroresImport([]);
      const formData = new FormData();
      formData.append('archivo', file);
      const response = await productosService.importarExcel(formData);
      const { insertados, duplicados, errores } = response.data || {};
      setMensajeImport(
        `Importados: ${insertados || 0} | Duplicados: ${duplicados?.length || 0} | Errores: ${errores?.length || 0}`
      );
      setErroresImport(errores || []);
      await cargarDatos();
    } catch (err) {
      console.error('Error importando productos:', err);
      setError(err.response?.data?.error || 'Error al importar productos');
    } finally {
      setImportando(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const formatearUbicacion = (producto) => {
    const letra = producto?.ubicacion_letra || '';
    const numero = producto?.ubicacion_numero || '';
    if (!letra && !numero) return '-';
    return `${letra}${numero}`;
  };

  return (
    <div className="productos-container">
      <div className="productos-header">
        <h1>Productos / M?quinas</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleDescargarPlantilla}>
            Plantilla Excel
          </button>
          <button className="btn-secondary" onClick={handleImportarClick} disabled={importando}>
            {importando ? 'Importando...' : 'Importar Excel'}
          </button>
          <button className="btn-secondary" onClick={handleExportarExcel}>
            Exportar Excel
          </button>
          <button className="btn-primary" onClick={abrirModalProducto}>
            + Nuevo Producto
          </button>
          <button className="btn-secondary" onClick={abrirModalTipo}>
            + Nuevo Tipo
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {mensajeImport && <div className="success-message">{mensajeImport}</div>}
      {erroresImport.length > 0 && (
        <div className="warning-message">
          <strong>Errores en importaci?n:</strong>
          <ul>
            {erroresImport.slice(0, 6).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
            {erroresImport.length > 6 && <li>Hay m?s errores. Revisa el archivo.</li>}
          </ul>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportarExcel}
        style={{ display: 'none' }}
      />


      {loading ? (
        <div className="loading">Cargando productos...</div>
      ) : (
        <>
        <div className="productos-filters">
          <input
            type="text"
            placeholder="Buscar codigo, descripcion, marca..."
            value={filtros.q}
            onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
          />
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tipo: e.target.value }))}
          >
            <option value="">Tipo</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
          <select
            value={filtros.marca}
            onChange={(e) => setFiltros((prev) => ({ ...prev, marca: e.target.value }))}
          >
            <option value="">Marca</option>
            {marcasDisponibles.map((marca) => (
              <option key={marca} value={marca}>
                {marca}
              </option>
            ))}
          </select>
          <select
            value={filtros.stock}
            onChange={(e) => setFiltros((prev) => ({ ...prev, stock: e.target.value }))}
          >
            <option value="all">Stock</option>
            <option value="bajo">Bajo</option>
            <option value="sin">Sin stock</option>
          </select>
          <button
            type="button"
            className="btn-secondary icon-btn-inline"
            onClick={() => setFiltros({ q: '', tipo: '', marca: '', stock: 'all' })}
            title="Limpiar"
            aria-label="Limpiar filtros"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h12v2H6z" />
              <path d="M9 11h6v2H9z" />
              <path d="M11 16h2v2h-2z" />
            </svg>
          </button>
        </div>
        <div className="productos-table-container">
          {productos.length > 0 ? (
            <table className="productos-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Descripción</th>
                  <th>Ubicación</th>
                  <th>Stock</th>
                  {puedeVerPrecioCompra && <th>Precio Compra</th>}
                  <th>Precio Venta</th>
                  <th>Precio Mínimo</th>
                  <th>Ficha Web</th>
                  <th>Ficha Técnica</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(prod => (
                  <tr key={prod.id}>
                    <td>{prod.codigo}</td>
                    <td>{prod.tipo_nombre}</td>
                    <td>{prod.marca}</td>
                    <td>{prod.descripcion || '-'}</td>
                    <td>{formatearUbicacion(prod)}</td>
                    <td className={prod.stock < prod.precio_minimo ? 'low-stock' : ''}>{prod.stock}</td>
                    {puedeVerPrecioCompra && (
                      <td>S/. {Number(prod.precio_compra || 0).toFixed(2)}</td>
                    )}
                    <td>S/. {Number(prod.precio_venta || 0).toFixed(2)}</td>
                    <td>S/. {Number(prod.precio_minimo || 0).toFixed(2)}</td>
                    <td className="icon-col">
                      {prod.ficha_web ? (
                        <a
                          className="icon-btn"
                          href={prod.ficha_web}
                          target="_blank"
                          rel="noreferrer"
                          title="Ficha Web"
                          aria-label="Ficha Web"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20zm6.9 9h-3.12a15.4 15.4 0 0 0-1.2-5A8.03 8.03 0 0 1 18.9 11zM12 4c1.02 1.3 1.82 3.31 2.2 5H9.8c.38-1.69 1.18-3.7 2.2-5zM5.1 13h3.12a15.4 15.4 0 0 0 1.2 5A8.03 8.03 0 0 1 5.1 13zm0-2a8.03 8.03 0 0 1 4.22-5a15.4 15.4 0 0 0-1.2 5H5.1zm6.9 9c-1.02-1.3-1.82-3.31-2.2-5h4.4c-.38 1.69-1.18 3.7-2.2 5zm2.78-2a15.4 15.4 0 0 0 1.2-5h3.12a8.03 8.03 0 0 1-4.32 5z" />
                          </svg>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="icon-col">
                      {prod.ficha_tecnica_ruta ? (
                        <button
                          className="icon-btn"
                          onClick={() => handleDescargarFicha(prod.ficha_tecnica_ruta)}
                          title="Ficha Tecnica"
                          aria-label="Ficha Tecnica"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z" />
                          </svg>
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="acciones">
                      <button
                        className="icon-btn icon-btn--edit"
                        onClick={() => handleEditarProducto(prod)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0l-1.84 1.84 3.75 3.75 1.84-1.85z" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn icon-btn--delete"
                        onClick={() => handleEliminar(prod.id)}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 7h12l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-4h6l1 2h4v2H4V5h4l1-2z" />
                        </svg>
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
        </>
      )}

      {mostrarModalProducto && createPortal(
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
                X
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
                    <label>Ubicación (Letra)</label>
                    <select
                      value={formularioData.ubicacion_letra}
                      onChange={(e) =>
                        setFormularioData({ ...formularioData, ubicacion_letra: e.target.value })
                      }
                    >
                      <option value="">-</option>
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((letra) => (
                        <option key={letra} value={letra}>
                          {letra}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ubicación (Número)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ej. 1"
                      value={formularioData.ubicacion_numero}
                      onChange={(e) =>
                        setFormularioData({
                          ...formularioData,
                          ubicacion_numero: e.target.value
                        })
                      }
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
                      onChange={(e) =>
                        setFormularioData({ ...formularioData, precio_compra: e.target.value })
                      }
                      disabled={!puedeVerPrecioCompra}
                      placeholder={puedeVerPrecioCompra ? '' : 'Sin permiso'}
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
        </div>,
        document.body
      )}

      {mostrarModalTipo && createPortal(
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
                X
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
        </div>,
        document.body
      )}

    </div>
  );
};

export default ProductosPage;
