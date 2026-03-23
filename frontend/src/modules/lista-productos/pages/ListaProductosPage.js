import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { listaProductosService } from '../../../core/services/apiServices';
import '../../productos/styles/ProductosPage.css';

const PAGE_SIZE = 60;

const ListaProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensajeImport, setMensajeImport] = useState('');
  const [erroresImport, setErroresImport] = useState([]);
  const [importando, setImportando] = useState(false);

  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [mostrarModalTipo, setMostrarModalTipo] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);

  const [filtros, setFiltros] = useState({
    q: '',
    tipo: '',
    marca: '',
    stock: 'all'
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formularioData, setFormularioData] = useState({
    codigo: '',
    tipo_id: '',
    marca: '',
    descripcion: '',
    proveedor: '',
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

  const fileInputRef = useRef(null);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [respTipos, respMarcas] = await Promise.all([
        listaProductosService.listarTipos(),
        listaProductosService.listarMarcas()
      ]);
      setTipos(Array.isArray(respTipos?.data) ? respTipos.data : []);
      setMarcas(Array.isArray(respMarcas?.data) ? respMarcas.data : []);
    } catch (err) {
      console.error('Error cargando catalogos de lista-productos:', err);
      setError('Error al cargar catalogos');
    }
  }, []);

  const cargarProductos = useCallback(async (pageValue = page, filtrosValue = filtros) => {
    try {
      setLoading(true);
      const params = {
        q: filtrosValue.q || undefined,
        tipo: filtrosValue.tipo || undefined,
        marca: filtrosValue.marca || undefined,
        stock: filtrosValue.stock !== 'all' ? filtrosValue.stock : undefined,
        page: pageValue,
        limit: PAGE_SIZE
      };
      const resp = await listaProductosService.getAll(params);
      const data = resp.data;
      const items = Array.isArray(data) ? data : data.items || [];
      const totalValue = Array.isArray(data) ? items.length : data.total ?? items.length;
      setProductos(items);
      setTotal(totalValue);
      setError('');
    } catch (err) {
      console.error('Error cargando lista-productos:', err);
      setError('Error al cargar lista de productos');
    } finally {
      setLoading(false);
    }
  }, [filtros, page]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  useEffect(() => {
    const delay = filtros.q ? 300 : 0;
    const debounce = setTimeout(() => {
      cargarProductos(page, filtros);
    }, delay);
    return () => clearTimeout(debounce);
  }, [cargarProductos, filtros, page]);

  const resetFormulario = () => {
    setFormularioData({
      codigo: '',
      tipo_id: '',
      marca: '',
      descripcion: '',
      proveedor: '',
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
      const payload = { ...formularioData };
      if (editandoProducto) {
        await listaProductosService.update(editandoProducto.id, payload);
      } else {
        await listaProductosService.create(payload);
      }
      resetFormulario();
      setMostrarModalProducto(false);
      await Promise.all([cargarProductos(page, filtros), cargarCatalogos()]);
    } catch (err) {
      console.error('Error guardando lista-producto:', err);
      setError(err.response?.data?.error || 'Error al guardar producto');
    }
  };

  const handleEditarProducto = (producto) => {
    setFormularioData({
      codigo: producto.codigo || '',
      tipo_id: producto.tipo_id ? String(producto.tipo_id) : '',
      marca: producto.marca || '',
      descripcion: producto.descripcion || '',
      proveedor: producto.proveedor || '',
      stock: Number(producto.stock ?? 0),
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
    if (!window.confirm('Estas seguro de que deseas eliminar este producto?')) return;
    try {
      await listaProductosService.delete(id);
      if (productos.length === 1 && page > 1) {
        setPage((prev) => Math.max(prev - 1, 1));
      } else {
        await Promise.all([cargarProductos(page, filtros), cargarCatalogos()]);
      }
    } catch (err) {
      console.error('Error eliminando lista-producto:', err);
      setError(err.response?.data?.error || 'Error al eliminar producto');
    }
  };

  const handleGuardarTipo = async (e) => {
    e.preventDefault();
    if (!tipoForm.nombre.trim()) {
      setError('El nombre del tipo es requerido');
      return;
    }
    try {
      if (editandoTipo) {
        const resp = await listaProductosService.actualizarTipo(editandoTipo.id, tipoForm);
        const actualizado = resp?.data || { ...tipoForm, id: editandoTipo.id };
        setTipos((prev) =>
          prev.map((item) => (item.id === editandoTipo.id ? { ...item, ...actualizado } : item))
        );
      } else {
        const resp = await listaProductosService.crearTipo(tipoForm);
        if (resp?.data?.id) {
          setFormularioData((prev) => ({
            ...prev,
            tipo_id: String(resp.data.id)
          }));
          setTipos((prev) => [...prev, resp.data]);
        }
      }
      resetTipoForm();
      setMostrarModalTipo(false);
    } catch (err) {
      console.error('Error guardando tipo lista-productos:', err);
      setError(err.response?.data?.error || 'Error al guardar tipo');
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
      const response = await listaProductosService.descargarPlantilla();
      descargarArchivo(response.data, 'plantilla_lista_productos.xlsx');
    } catch (err) {
      console.error('Error descargando plantilla lista-productos:', err);
      setError('Error al descargar plantilla');
    }
  };

  const handleExportarExcel = async () => {
    try {
      const response = await listaProductosService.exportarExcel();
      descargarArchivo(response.data, 'lista_productos.xlsx');
    } catch (err) {
      console.error('Error exportando lista-productos:', err);
      setError('Error al exportar lista de productos');
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
      const response = await listaProductosService.importarExcel(formData);
      const { insertados, duplicados, errores } = response.data || {};
      setMensajeImport(
        `Importados: ${insertados || 0} | Duplicados: ${duplicados?.length || 0} | Errores: ${errores?.length || 0}`
      );
      setErroresImport(errores || []);
      setPage(1);
      await Promise.all([cargarProductos(1, filtros), cargarCatalogos()]);
    } catch (err) {
      console.error('Error importando lista-productos:', err);
      setError(err.response?.data?.error || 'Error al importar lista de productos');
    } finally {
      setImportando(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDescargarFicha = async (filename) => {
    try {
      const response = await listaProductosService.descargarFichaTecnica(filename);
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newTab) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Error descargando ficha tecnica lista-productos:', err);
      setError('Error al descargar ficha tecnica');
    }
  };

  const formatearMoneda = (value) => `S/. ${Number(value || 0).toFixed(2)}`;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE) || 1, 1);

  return (
    <div className="productos-container">
      <div className="productos-header">
        <h1>LISTA DE PRODUCTOS</h1>
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
          <strong>Errores en importacion:</strong>
          <ul>
            {erroresImport.slice(0, 6).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
            {erroresImport.length > 6 && <li>Hay mas errores. Revisa el archivo.</li>}
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
        <div className="loading">Cargando lista de productos...</div>
      ) : (
        <>
          <div className="productos-filters">
            <input
              type="text"
              placeholder="Buscar codigo, descripcion, marca, proveedor..."
              value={filtros.q}
              onChange={(e) => {
                setFiltros((prev) => ({ ...prev, q: e.target.value }));
                setPage(1);
              }}
            />
            <select
              value={filtros.tipo}
              onChange={(e) => {
                setFiltros((prev) => ({ ...prev, tipo: e.target.value }));
                setPage(1);
              }}
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
              onChange={(e) => {
                setFiltros((prev) => ({ ...prev, marca: e.target.value }));
                setPage(1);
              }}
            >
              <option value="">Marca</option>
              {marcas.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>
            <select
              value={filtros.stock}
              onChange={(e) => {
                setFiltros((prev) => ({ ...prev, stock: e.target.value }));
                setPage(1);
              }}
            >
              <option value="all">Stock</option>
              <option value="sin">Sin stock</option>
            </select>
            <button
              type="button"
              className="btn-secondary icon-btn-inline"
              onClick={() => {
                setFiltros({ q: '', tipo: '', marca: '', stock: 'all' });
                setPage(1);
              }}
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
                    <th>Codigo</th>
                    <th>Tipo</th>
                    <th>Marca</th>
                    <th>Descripcion</th>
                    <th>PROVEEDOR</th>
                    <th>Stock</th>
                    <th>Precio Compra</th>
                    <th>Precio Venta</th>
                    <th>Precio Minimo</th>
                    <th>Ficha Web</th>
                    <th>Ficha Tecnica</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((prod) => (
                    <tr key={prod.id}>
                      <td>{prod.codigo}</td>
                      <td>{prod.tipo_nombre}</td>
                      <td>{prod.marca || '-'}</td>
                      <td>{prod.descripcion || '-'}</td>
                      <td>{prod.proveedor || '-'}</td>
                      <td className={Number(prod.stock || 0) <= 0 ? 'low-stock' : ''}>
                        {prod.stock}
                      </td>
                      <td>{formatearMoneda(prod.precio_compra)}</td>
                      <td>{formatearMoneda(prod.precio_venta)}</td>
                      <td>{formatearMoneda(prod.precio_minimo)}</td>
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

            {productos.length > 0 && (
              <div className="table-pagination">
                <span>
                  Mostrando {productos.length} de {total}
                </span>
                <div className="page-controls">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page <= 1}
                  >
                    Anterior
                  </button>
                  <span>
                    Pagina {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {mostrarModalProducto &&
        createPortal(
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
                      <label>Codigo *</label>
                      <input
                        type="text"
                        required
                        value={formularioData.codigo}
                        onChange={(e) =>
                          setFormularioData({ ...formularioData, codigo: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo *</label>
                      <select
                        required
                        value={formularioData.tipo_id}
                        onChange={(e) =>
                          setFormularioData({ ...formularioData, tipo_id: e.target.value })
                        }
                      >
                        <option value="">Seleccionar tipo</option>
                        {tipos.map((tipo) => (
                          <option key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn-link" onClick={abrirModalTipo}>
                        + Agregar tipo si no esta en la lista
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
                        onChange={(e) =>
                          setFormularioData({ ...formularioData, marca: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Proveedor</label>
                      <input
                        type="text"
                        value={formularioData.proveedor}
                        onChange={(e) =>
                          setFormularioData({ ...formularioData, proveedor: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descripcion</label>
                    <input
                      type="text"
                      value={formularioData.descripcion}
                      onChange={(e) =>
                        setFormularioData({ ...formularioData, descripcion: e.target.value })
                      }
                    />
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
                        min="0"
                        value={formularioData.precio_compra}
                        onChange={(e) =>
                          setFormularioData({
                            ...formularioData,
                            precio_compra: e.target.value
                          })
                        }
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
                        min="0"
                        value={formularioData.precio_venta}
                        onChange={(e) =>
                          setFormularioData({
                            ...formularioData,
                            precio_venta: e.target.value
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Precio Minimo</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formularioData.precio_minimo}
                        onChange={(e) =>
                          setFormularioData({
                            ...formularioData,
                            precio_minimo: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Ficha Web (URL)</label>
                    <input
                      type="url"
                      value={formularioData.ficha_web}
                      onChange={(e) =>
                        setFormularioData({ ...formularioData, ficha_web: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Archivo Ficha Tecnica (PDF)</label>
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

      {mostrarModalTipo &&
        createPortal(
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editandoTipo ? 'Editar Tipo' : 'Nuevo Tipo'}</h2>
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
                      <label>Descripcion</label>
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

export default ListaProductosPage;
