import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { marcasService, permisosService, productosService, tiposMaquinasService } from '../../../core/services/apiServices';
import '../styles/ProductosPage.css';

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensajeImport, setMensajeImport] = useState('');
  const [erroresImport, setErroresImport] = useState([]);
  const [importando, setImportando] = useState(false);
  const [puedeVerPrecioCompra, setPuedeVerPrecioCompra] = useState(true);
  const [permisosCargados, setPermisosCargados] = useState(false);
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [mostrarModalTipo, setMostrarModalTipo] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [mostrarModalUbicaciones, setMostrarModalUbicaciones] = useState(false);
  const [productoUbicaciones, setProductoUbicaciones] = useState(null);
  const [ubicacionesProducto, setUbicacionesProducto] = useState([]);
  const [ubicacionesLoading, setUbicacionesLoading] = useState(false);
  const [ubicacionesError, setUbicacionesError] = useState('');
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
  const PAGE_SIZE = 60;

  const [filtros, setFiltros] = useState({
    q: '',
    tipo: '',
    marca: '',
    stock: 'all'
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tipoForm, setTipoForm] = useState({
    nombre: '',
    descripcion: ''
  });
  const fileInputRef = useRef(null);


  const marcasDisponibles = useMemo(() => {
    const marcasSet = new Set();
    (marcas || []).forEach((item) => {
      const nombre = String(item.nombre || item.codigo || '').trim();
      if (nombre) {
        marcasSet.add(nombre);
      }
    });
    return Array.from(marcasSet).sort((a, b) => a.localeCompare(b));
  }, [marcas]);

  const normalizarMarcaCodigo = (value) => String(value || '').trim().toUpperCase();

  const marcasMap = useMemo(() => {
    const map = new Map();
    (marcas || []).forEach((marcaItem) => {
      const code = normalizarMarcaCodigo(marcaItem.codigo);
      if (code) {
        map.set(code, String(marcaItem.nombre || '').trim());
      }
    });
    return map;
  }, [marcas]);

  const resolverMarcaNombre = (value) => {
    const code = normalizarMarcaCodigo(value);
    if (code && marcasMap.has(code)) {
      return marcasMap.get(code);
    }
    return value || '';
  };

  const cargarCatalogos = useCallback(async () => {
    try {
      const [respTipos, respMarcas] = await Promise.all([
        tiposMaquinasService.getAll(),
        marcasService.getAll().catch((err) => {
          console.warn('No se pudieron cargar marcas:', err);
          return { data: [] };
        })
      ]);
      setTipos(respTipos.data || []);
      setMarcas(respMarcas.data || []);
      if (!permisosCargados) {
        try {
          const respPermisos = await permisosService.misPermisos();
          const permisos = respPermisos.data || [];
          setPuedeVerPrecioCompra(permisos.includes('productos.precio_compra.ver'));
          setPermisosCargados(true);
        } catch (permError) {
          console.warn('No se pudieron cargar permisos:', permError);
        }
      }
    } catch (error) {
      console.error('Error cargando catalogos:', error);
      setError('Error al cargar catalogos');
    }
  }, [permisosCargados]);

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
      const respProductos = await productosService.getAll(params);
      const data = respProductos.data;
      const items = Array.isArray(data) ? data : data.items || [];
      const totalValue = Array.isArray(data) ? items.length : data.total ?? items.length;
      setProductos(items);
      setTotal(totalValue);
      setError('');
    } catch (error) {
      console.error('Error cargando productos:', error);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [PAGE_SIZE, filtros, page]);

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
      const payload = { ...formularioData };
      if (editandoProducto && !puedeVerPrecioCompra) {
        delete payload.precio_compra;
      }
      if (editandoProducto) {
        await productosService.update(editandoProducto.id, payload);
      } else {
        await productosService.create(payload);
      }
      resetFormulario();
      setMostrarModalProducto(false);
      await cargarProductos(page, filtros);
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
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await productosService.delete(id);
        if (productos.length === 1 && page > 1) {
          setPage((prev) => Math.max(prev - 1, 1));
        } else {
          await cargarProductos(page, filtros);
        }
      } catch (error) {
        console.error('Error eliminando producto:', error);
        setError('Error al eliminar producto');
      }
    }
  };

  const abrirModalUbicaciones = async (producto) => {
    setProductoUbicaciones(producto);
    setUbicacionesProducto([]);
    setUbicacionesError('');
    setUbicacionesLoading(true);
    setMostrarModalUbicaciones(true);
    try {
      const resp = await productosService.getUbicaciones(producto.id);
      setUbicacionesProducto(resp.data || []);
    } catch (err) {
      console.error('Error cargando ubicaciones:', err);
      setUbicacionesError('No se pudieron cargar las ubicaciones.');
    } finally {
      setUbicacionesLoading(false);
    }
  };

  const cerrarModalUbicaciones = () => {
    setMostrarModalUbicaciones(false);
    setProductoUbicaciones(null);
    setUbicacionesProducto([]);
    setUbicacionesError('');
  };

  const handleDescargarFicha = async (filename) => {
    try {
      const response = await productosService.descargarFichaTecnica(filename);
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
        const resp = await tiposMaquinasService.update(editandoTipo.id, tipoForm);
        const actualizado = resp?.data || { ...tipoForm, id: editandoTipo.id };
        setTipos((prev) =>
          prev.map((item) => (item.id === editandoTipo.id ? { ...item, ...actualizado } : item))
        );
      } else {
        const response = await tiposMaquinasService.create(tipoForm);
        if (response?.data?.id) {
          setFormularioData((prev) => ({
            ...prev,
            tipo_maquina_id: String(response.data.id)
          }));
          setTipos((prev) => [...prev, response.data]);
        }
      }
      resetTipoForm();
      setMostrarModalTipo(false);
    } catch (error) {
      console.error('Error guardando tipo de máquina:', error);
      setError(error.response?.data?.error || 'Error al guardar tipo de máquina');
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
      setPage(1);
      await cargarProductos(1, filtros);
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

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE) || 1, 1);

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
            {marcasDisponibles.map((marca) => (
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
                {productos.map((prod) => (
                  <tr key={prod.id}>
                    <td>{prod.codigo}</td>
                    <td>{prod.tipo_nombre}</td>
                    <td>{resolverMarcaNombre(prod.marca)}</td>
                    <td>{prod.descripcion || '-'}</td>
                    <td>{formatearUbicacion(prod)}</td>
                    <td className={Number(prod.stock || 0) <= 0 ? 'low-stock' : ''}>{prod.stock}</td>
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
                        className="icon-btn"
                        onClick={() => abrirModalUbicaciones(prod)}
                        title="Ubicaciones"
                        aria-label="Ubicaciones"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 2a7 7 0 0 0-7 7c0 4.2 5.3 11 7 11s7-6.8 7-11a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                        </svg>
                      </button>
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
                  {puedeVerPrecioCompra && (
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
                      />
                    </div>
                  )}
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

      {mostrarModalUbicaciones && createPortal(
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Ubicaciones {productoUbicaciones?.codigo ? `(${productoUbicaciones.codigo})` : ''}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={cerrarModalUbicaciones}
              >
                X
              </button>
            </div>
            <div className="modal-body">
              {ubicacionesLoading ? (
                <div className="loading">Cargando ubicaciones...</div>
              ) : ubicacionesError ? (
                <div className="error-message">{ubicacionesError}</div>
              ) : ubicacionesProducto.length === 0 ? (
                <div className="empty-message">Sin ubicaciones con stock.</div>
              ) : (
                <ul className="ubicaciones-list">
                  {ubicacionesProducto.map((item) => (
                    <li key={`${item.ubicacion_letra}${item.ubicacion_numero}`}>
                      {item.ubicacion_letra}
                      {item.ubicacion_numero} - {item.stock}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={cerrarModalUbicaciones}>
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ProductosPage;
