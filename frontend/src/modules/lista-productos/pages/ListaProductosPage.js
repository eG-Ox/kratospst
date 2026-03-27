import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { listaProductosService } from '../../../core/services/apiServices';
import '../../productos/styles/ProductosPage.css';
import '../styles/ListaProductosPage.css';

const PAGE_SIZE = 60;
const getProductoImageAlt = (producto) =>
  `Imagen de ${producto?.codigo || 'producto'}${producto?.descripcion ? ` - ${producto.descripcion}` : ''}`;
const getProductoVideoLabel = (producto, tipo = 'Video') =>
  `${tipo} de ${producto?.codigo || 'producto'}${producto?.descripcion ? ` - ${producto.descripcion}` : ''}`;
const getTipoFallbackLabel = (tipoId, tipoNombre = '') =>
  tipoNombre || (tipoId ? `Tipo #${tipoId}` : 'Tipo no disponible');

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
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState('');
  const [imagenExpandida, setImagenExpandida] = useState(null);
  const [videoRPreviewUrl, setVideoRPreviewUrl] = useState('');
  const [videoUsoPreviewUrl, setVideoUsoPreviewUrl] = useState('');
  const [videoExpandido, setVideoExpandido] = useState(null);

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
    ficha_tecnica: null,
    imagen: null,
    video_r: null,
    video_uso: null,
    eliminar_imagen: false,
    eliminar_video_r: false,
    eliminar_video_uso: false
  });

  const [tipoForm, setTipoForm] = useState({
    nombre: '',
    descripcion: ''
  });

  const fileInputRef = useRef(null);
  const imagenInputRef = useRef(null);
  const videoRInputRef = useRef(null);
  const videoUsoInputRef = useRef(null);

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

  useEffect(() => {
    if (formularioData.imagen instanceof File) {
      const objectUrl = window.URL.createObjectURL(formularioData.imagen);
      setImagenPreviewUrl(objectUrl);
      return () => window.URL.revokeObjectURL(objectUrl);
    }

    if (editandoProducto?.imagen_ruta && !formularioData.eliminar_imagen) {
      setImagenPreviewUrl(listaProductosService.getImagenUrl(editandoProducto.imagen_ruta));
      return undefined;
    }

    setImagenPreviewUrl('');
    return undefined;
  }, [editandoProducto, formularioData.eliminar_imagen, formularioData.imagen]);

  useEffect(() => {
    if (formularioData.video_r instanceof File) {
      const objectUrl = window.URL.createObjectURL(formularioData.video_r);
      setVideoRPreviewUrl(objectUrl);
      return () => window.URL.revokeObjectURL(objectUrl);
    }

    if (editandoProducto?.video_r_ruta && !formularioData.eliminar_video_r) {
      setVideoRPreviewUrl(listaProductosService.getVideoUrl(editandoProducto.video_r_ruta));
      return undefined;
    }

    setVideoRPreviewUrl('');
    return undefined;
  }, [editandoProducto, formularioData.eliminar_video_r, formularioData.video_r]);

  useEffect(() => {
    if (formularioData.video_uso instanceof File) {
      const objectUrl = window.URL.createObjectURL(formularioData.video_uso);
      setVideoUsoPreviewUrl(objectUrl);
      return () => window.URL.revokeObjectURL(objectUrl);
    }

    if (editandoProducto?.video_uso_ruta && !formularioData.eliminar_video_uso) {
      setVideoUsoPreviewUrl(listaProductosService.getVideoUrl(editandoProducto.video_uso_ruta));
      return undefined;
    }

    setVideoUsoPreviewUrl('');
    return undefined;
  }, [editandoProducto, formularioData.eliminar_video_uso, formularioData.video_uso]);

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
      ficha_tecnica: null,
      imagen: null,
      video_r: null,
      video_uso: null,
      eliminar_imagen: false,
      eliminar_video_r: false,
      eliminar_video_uso: false
    });
    setImagenPreviewUrl('');
    setVideoRPreviewUrl('');
    setVideoUsoPreviewUrl('');
    limpiarInputArchivo(imagenInputRef);
    limpiarInputArchivo(videoRInputRef);
    limpiarInputArchivo(videoUsoInputRef);
    setEditandoProducto(null);
  };

  const resetTipoForm = () => {
    setTipoForm({ nombre: '', descripcion: '' });
    setEditandoTipo(null);
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    try {
      const tipoValido = tipos.some((tipo) => String(tipo.id) === String(formularioData.tipo_id));
      if (formularioData.tipo_id && !tipoValido) {
        setError('El tipo seleccionado ya no existe. Selecciona uno valido antes de guardar.');
        return;
      }
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
      ficha_tecnica: null,
      imagen: null,
      video_r: null,
      video_uso: null,
      eliminar_imagen: false,
      eliminar_video_r: false,
      eliminar_video_uso: false
    });
    setEditandoProducto(producto);
    setMostrarModalProducto(true);
  };

  const limpiarInputArchivo = (inputRef) => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const quitarImagenSeleccionada = () => {
    limpiarInputArchivo(imagenInputRef);
    setFormularioData((prev) => ({
      ...prev,
      imagen: null
    }));
  };

  const toggleEliminarImagenActual = () => {
    limpiarInputArchivo(imagenInputRef);
    setFormularioData((prev) => ({
      ...prev,
      imagen: null,
      eliminar_imagen: !prev.eliminar_imagen
    }));
  };

  const quitarVideoRSeleccionado = () => {
    limpiarInputArchivo(videoRInputRef);
    setFormularioData((prev) => ({
      ...prev,
      video_r: null
    }));
  };

  const toggleEliminarVideoRActual = () => {
    limpiarInputArchivo(videoRInputRef);
    setFormularioData((prev) => ({
      ...prev,
      video_r: null,
      eliminar_video_r: !prev.eliminar_video_r
    }));
  };

  const quitarVideoUsoSeleccionado = () => {
    limpiarInputArchivo(videoUsoInputRef);
    setFormularioData((prev) => ({
      ...prev,
      video_uso: null
    }));
  };

  const toggleEliminarVideoUsoActual = () => {
    limpiarInputArchivo(videoUsoInputRef);
    setFormularioData((prev) => ({
      ...prev,
      video_uso: null,
      eliminar_video_uso: !prev.eliminar_video_uso
    }));
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

  const abrirImagen = (producto) => {
    if (!producto?.imagen_ruta) return;
    setImagenExpandida({
      src: listaProductosService.getImagenUrl(producto.imagen_ruta),
      alt: getProductoImageAlt(producto)
    });
  };

  const abrirVideo = (producto, srcOverride = '', tipo = 'Video') => {
    const src =
      srcOverride ||
      (producto ? listaProductosService.getVideoUrl(tipo === 'Video R' ? producto.video_r_ruta : producto.video_uso_ruta) : '');
    if (!src) return;
    setVideoExpandido({
      src,
      label: getProductoVideoLabel(producto, tipo)
    });
  };

  const formatearMoneda = (value) => `S/. ${Number(value || 0).toFixed(2)}`;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE) || 1, 1);
  const tipoActualNoDisponible =
    Boolean(formularioData.tipo_id) &&
    !tipos.some((tipo) => String(tipo.id) === String(formularioData.tipo_id));
  const tiposDisponibles = tipoActualNoDisponible
    ? [
        {
          id: formularioData.tipo_id,
          nombre: getTipoFallbackLabel(formularioData.tipo_id, editandoProducto?.tipo_nombre),
          unavailable: true
        },
        ...tipos
      ]
    : tipos;

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

          <div className="productos-table-container lista-productos-table-container">
            {productos.length > 0 ? (
              <table className="productos-table lista-productos-table">
                <colgroup>
                  <col className="lista-productos-col-codigo" />
                  <col className="lista-productos-col-tipo" />
                  <col className="lista-productos-col-marca" />
                  <col className="lista-productos-col-descripcion" />
                  <col className="lista-productos-col-proveedor" />
                  <col className="lista-productos-col-stock" />
                  <col className="lista-productos-col-precio" />
                  <col className="lista-productos-col-precio" />
                  <col className="lista-productos-col-precio" />
                  <col className="lista-productos-col-imagen" />
                  <col className="lista-productos-col-video" />
                  <col className="lista-productos-col-video" />
                  <col className="lista-productos-col-icon" />
                  <col className="lista-productos-col-icon" />
                  <col className="lista-productos-col-acciones" />
                </colgroup>
                <thead>
                  <tr>
                    <th>CODIGO</th>
                    <th>TIPO</th>
                    <th>MARCA</th>
                    <th>DESCRIPCION</th>
                    <th>PROVEEDOR</th>
                    <th>STOCK</th>
                    <th>PRECIO COMPRA</th>
                    <th>PRECIO VENTA</th>
                    <th>PRECIO MINIMO</th>
                    <th>IMAGEN</th>
                    <th title="Video R" aria-label="Video R">▶ R</th>
                    <th title="Video Uso" aria-label="Video Uso">▶ U</th>
                    <th>FICHA WEB</th>
                    <th>FICHA TECNICA</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((prod) => (
                    <tr key={prod.id}>
                      <td>{prod.codigo}</td>
                      <td title={prod.tipo_nombre || '-'}>
                        <span className="lista-productos-cell-text">{prod.tipo_nombre || '-'}</span>
                      </td>
                      <td title={prod.marca || '-'}>
                        <span className="lista-productos-cell-text">{prod.marca || '-'}</span>
                      </td>
                      <td title={prod.descripcion || '-'}>
                        <span className="lista-productos-cell-text">{prod.descripcion || '-'}</span>
                      </td>
                      <td title={prod.proveedor || '-'}>
                        <span className="lista-productos-cell-text">{prod.proveedor || '-'}</span>
                      </td>
                      <td className={Number(prod.stock || 0) <= 0 ? 'low-stock' : ''}>
                        {prod.stock}
                      </td>
                      <td>{formatearMoneda(prod.precio_compra)}</td>
                      <td>{formatearMoneda(prod.precio_venta)}</td>
                      <td>{formatearMoneda(prod.precio_minimo)}</td>
                      <td className="lista-productos-thumb-col">
                        {prod.imagen_ruta ? (
                          <button
                            type="button"
                            className="lista-productos-thumb-button"
                            onClick={() => abrirImagen(prod)}
                            title="Ver imagen"
                            aria-label={`Ver imagen de ${prod.codigo}`}
                          >
                            <img
                              className="lista-productos-thumb"
                              src={listaProductosService.getImagenUrl(prod.imagen_ruta)}
                              alt={getProductoImageAlt(prod)}
                              loading="lazy"
                              crossOrigin="use-credentials"
                            />
                          </button>
                        ) : (
                          <span className="lista-productos-thumb-empty">-</span>
                        )}
                      </td>
                      <td className="lista-productos-video-col">
                        {prod.video_r_ruta ? (
                          <button
                            type="button"
                            className="lista-productos-video-button"
                            onClick={() => abrirVideo(prod, '', 'Video R')}
                            title="Ver video R"
                            aria-label={`Ver video R de ${prod.codigo}`}
                          >
                            ▶
                          </button>
                        ) : (
                          <span className="lista-productos-thumb-empty">-</span>
                        )}
                      </td>
                      <td className="lista-productos-video-col">
                        {prod.video_uso_ruta ? (
                          <button
                            type="button"
                            className="lista-productos-video-button"
                            onClick={() => abrirVideo(prod, '', 'Video Uso')}
                            title="Ver video uso"
                            aria-label={`Ver video uso de ${prod.codigo}`}
                          >
                            ▶
                          </button>
                        ) : (
                          <span className="lista-productos-thumb-empty">-</span>
                        )}
                      </td>
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
            <div className="modal-content lista-productos-product-modal">
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
              <form className="lista-productos-product-form" onSubmit={handleGuardarProducto}>
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
                        {tiposDisponibles.map((tipo) => (
                          <option key={`${tipo.id}-${tipo.unavailable ? 'missing' : 'ok'}`} value={tipo.id}>
                            {tipo.nombre}
                            {tipo.unavailable ? ' (no disponible)' : ''}
                          </option>
                        ))}
                      </select>
                      {tipoActualNoDisponible && (
                        <span className="lista-productos-warning">
                          El tipo guardado ya no existe en catalogo. Debes elegir uno valido.
                        </span>
                      )}
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

                  <div className="form-group">
                    <label>Imagen del producto</label>
                    <input
                      ref={imagenInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                      onChange={(e) =>
                        setFormularioData({
                          ...formularioData,
                          imagen: e.target.files?.[0] || null,
                          eliminar_imagen: false
                        })
                      }
                    />
                    <span className="lista-productos-help">
                      Se mostrara como miniatura en la tabla y podras ampliarla al hacer click.
                    </span>
                    {imagenPreviewUrl && (
                      <button
                        type="button"
                        className="lista-productos-form-image"
                        onClick={() =>
                          setImagenExpandida({
                            src: imagenPreviewUrl,
                            alt: getProductoImageAlt(editandoProducto || formularioData)
                          })
                        }
                      >
                        <img
                          src={imagenPreviewUrl}
                          alt={getProductoImageAlt(editandoProducto || formularioData)}
                          crossOrigin="use-credentials"
                        />
                        <span>Click para ver grande</span>
                      </button>
                    )}
                    {(formularioData.imagen instanceof File || editandoProducto?.imagen_ruta) && (
                      <div className="lista-productos-media-actions">
                        {formularioData.imagen instanceof File && (
                          <button
                            type="button"
                            className="btn-link"
                            onClick={quitarImagenSeleccionada}
                          >
                            Quitar imagen seleccionada
                          </button>
                        )}
                        {editandoProducto?.imagen_ruta &&
                          !(formularioData.imagen instanceof File) && (
                          <button
                            type="button"
                            className="btn-link lista-productos-danger-link"
                            onClick={toggleEliminarImagenActual}
                          >
                            {formularioData.eliminar_imagen
                              ? 'Restaurar imagen actual'
                              : 'Eliminar imagen actual'}
                          </button>
                          )}
                      </div>
                    )}
                    {editandoProducto?.imagen_ruta && formularioData.eliminar_imagen && (
                      <span className="lista-productos-warning">
                        La imagen actual se eliminara al guardar.
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Video R</label>
                      <input
                        ref={videoRInputRef}
                        type="file"
                        accept=".mp4,.webm,.ogg,video/*"
                        onChange={(e) =>
                          setFormularioData({
                            ...formularioData,
                            video_r: e.target.files?.[0] || null,
                            eliminar_video_r: false
                          })
                        }
                      />
                      <span className="lista-productos-help">
                        Formatos permitidos: MP4, WEBM y OGG.
                      </span>
                      {videoRPreviewUrl && (
                        <div className="lista-productos-form-video">
                          <button
                            type="button"
                            className="lista-productos-video-preview-button"
                            aria-label={getProductoVideoLabel(editandoProducto || formularioData, 'Video R')}
                            onClick={() =>
                              abrirVideo(editandoProducto || formularioData, videoRPreviewUrl, 'Video R')
                            }
                          >
                            <video
                              src={videoRPreviewUrl}
                              preload="metadata"
                              muted
                              playsInline
                              crossOrigin="use-credentials"
                              className="lista-productos-video-preview"
                            />
                          </button>
                          <span>Click para ver grande</span>
                        </div>
                      )}
                      {(formularioData.video_r instanceof File || editandoProducto?.video_r_ruta) && (
                        <div className="lista-productos-media-actions">
                          {formularioData.video_r instanceof File && (
                            <button
                              type="button"
                              className="btn-link"
                              onClick={quitarVideoRSeleccionado}
                            >
                              Quitar video R seleccionado
                            </button>
                          )}
                          {editandoProducto?.video_r_ruta &&
                            !(formularioData.video_r instanceof File) && (
                            <button
                              type="button"
                              className="btn-link lista-productos-danger-link"
                              onClick={toggleEliminarVideoRActual}
                            >
                              {formularioData.eliminar_video_r
                                ? 'Restaurar video R actual'
                                : 'Eliminar video R actual'}
                            </button>
                            )}
                        </div>
                      )}
                      {editandoProducto?.video_r_ruta && formularioData.eliminar_video_r && (
                        <span className="lista-productos-warning">
                          El video R actual se eliminara al guardar.
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Video Uso</label>
                      <input
                        ref={videoUsoInputRef}
                        type="file"
                        accept=".mp4,.webm,.ogg,video/*"
                        onChange={(e) =>
                          setFormularioData({
                            ...formularioData,
                            video_uso: e.target.files?.[0] || null,
                            eliminar_video_uso: false
                          })
                        }
                      />
                      <span className="lista-productos-help">
                        Formatos permitidos: MP4, WEBM y OGG.
                      </span>
                      {videoUsoPreviewUrl && (
                        <div className="lista-productos-form-video">
                          <button
                            type="button"
                            className="lista-productos-video-preview-button"
                            aria-label={getProductoVideoLabel(editandoProducto || formularioData, 'Video Uso')}
                            onClick={() =>
                              abrirVideo(editandoProducto || formularioData, videoUsoPreviewUrl, 'Video Uso')
                            }
                          >
                            <video
                              src={videoUsoPreviewUrl}
                              preload="metadata"
                              muted
                              playsInline
                              crossOrigin="use-credentials"
                              className="lista-productos-video-preview"
                            />
                          </button>
                          <span>Click para ver grande</span>
                        </div>
                      )}
                      {(formularioData.video_uso instanceof File || editandoProducto?.video_uso_ruta) && (
                        <div className="lista-productos-media-actions">
                          {formularioData.video_uso instanceof File && (
                            <button
                              type="button"
                              className="btn-link"
                              onClick={quitarVideoUsoSeleccionado}
                            >
                              Quitar video uso seleccionado
                            </button>
                          )}
                          {editandoProducto?.video_uso_ruta &&
                            !(formularioData.video_uso instanceof File) && (
                            <button
                              type="button"
                              className="btn-link lista-productos-danger-link"
                              onClick={toggleEliminarVideoUsoActual}
                            >
                              {formularioData.eliminar_video_uso
                                ? 'Restaurar video uso actual'
                                : 'Eliminar video uso actual'}
                            </button>
                            )}
                        </div>
                      )}
                      {editandoProducto?.video_uso_ruta && formularioData.eliminar_video_uso && (
                        <span className="lista-productos-warning">
                          El video uso actual se eliminara al guardar.
                        </span>
                      )}
                    </div>
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

      {imagenExpandida &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Vista previa de imagen"
            onClick={() => setImagenExpandida(null)}
          >
            <div
              className="modal-content lista-productos-image-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Imagen del producto</h2>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setImagenExpandida(null)}
                >
                  X
                </button>
              </div>
              <div className="modal-body lista-productos-image-modal-body">
                <img
                  src={imagenExpandida.src}
                  alt={imagenExpandida.alt}
                  className="lista-productos-image-full"
                  crossOrigin="use-credentials"
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {videoExpandido &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Vista previa de video"
            onClick={() => setVideoExpandido(null)}
          >
            <div
              className="modal-content lista-productos-media-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{videoExpandido.label}</h2>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setVideoExpandido(null)}
                >
                  X
                </button>
              </div>
              <div className="modal-body lista-productos-media-modal-body">
                <video
                  src={videoExpandido.src}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  crossOrigin="use-credentials"
                  className="lista-productos-video-full"
                />
              </div>
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
