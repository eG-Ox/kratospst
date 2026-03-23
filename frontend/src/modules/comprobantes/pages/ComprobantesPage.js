import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  clientesService,
  comprobantesService,
  kitsService
} from '../../../core/services/apiServices';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/ComprobantesPage.css';

const emptyCliente = {
  tipo_cliente: 'natural',
  dni: '',
  ruc: '',
  nombre: '',
  apellido: '',
  razon_social: '',
  direccion: '',
  telefono: '',
  correo: ''
};

const TIPO_COMPROBANTE_LABELS = {
  boleta: 'Boleta',
  factura: 'Factura'
};

const ComprobantesPage = () => {
  const mountedRef = useMountedRef();
  const [tab, setTab] = useState('simple');
  const [clientes, setClientes] = useState([]);
  const [comprobanteEditId, setComprobanteEditId] = useState(null);
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState(emptyCliente);
  const [consultaMensaje, setConsultaMensaje] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [notas, setNotas] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('boleta');
  const [tipos, setTipos] = useState([]);
  const [tipoId, setTipoId] = useState('');
  const [marcas, setMarcas] = useState([]);
  const [marca, setMarca] = useState('');
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [kits, setKits] = useState([]);
  const [kitSeleccionado, setKitSeleccionado] = useState('');
  const [items, setItems] = useState([]);
  const [mostrarClientesMenu, setMostrarClientesMenu] = useState(false);
  const clientePickerRef = useRef(null);
  const location = useLocation();

  const cargarClientes = useCallback(async () => {
    try {
      const resp = await clientesService.getAll();
      if (!mountedRef.current) return;
      setClientes(resp.data || []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  }, [mountedRef]);

  const cargarTipos = useCallback(async () => {
    try {
      const resp = await comprobantesService.tiposPorAlmacen({ filtrar_stock: false });
      if (!mountedRef.current) return;
      setTipos(resp.data || []);
    } catch (err) {
      console.error('Error cargando tipos:', err);
    }
  }, [mountedRef]);

  const cargarKits = useCallback(async () => {
    try {
      const resp = await kitsService.listarActivos();
      if (!mountedRef.current) return;
      setKits(resp.data || []);
    } catch (err) {
      console.error('Error cargando kits:', err);
    }
  }, [mountedRef]);

  const cargarMarcas = useCallback(async () => {
    try {
      const resp = await comprobantesService.filtrosComprobante({ tipo: tipoId });
      if (!mountedRef.current) return;
      setMarcas(resp.data || []);
    } catch (err) {
      console.error('Error cargando marcas:', err);
    }
  }, [tipoId, mountedRef]);

  const cargarProductos = useCallback(async () => {
    try {
      const resp = await comprobantesService.productosComprobante({ tipo: tipoId, marca });
      if (!mountedRef.current) return;
      setProductos(resp.data || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  }, [tipoId, marca, mountedRef]);

  const buscarProductos = useCallback(async (q) => {
    try {
      const resp = await comprobantesService.buscarProductos({ q, limit: 20 });
      if (!mountedRef.current) return;
      setResultados(resp.data || []);
    } catch (err) {
      console.error('Error buscando productos:', err);
    }
  }, [mountedRef]);

  useEffect(() => {
    cargarClientes();
    cargarTipos();
    cargarKits();
  }, [cargarClientes, cargarTipos, cargarKits]);

  useEffect(() => {
    if (tipoId) {
      cargarMarcas();
    } else {
      setMarcas([]);
      setMarca('');
      setProductos([]);
      setProductoId('');
    }
  }, [tipoId, cargarMarcas]);

  useEffect(() => {
    if (marca) {
      cargarProductos();
    } else {
      setProductos([]);
      setProductoId('');
    }
  }, [marca, cargarProductos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busqueda.trim().length < 1) {
        setResultados([]);
        return;
      }
      buscarProductos(busqueda.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [busqueda, buscarProductos]);

  const clientesFiltrados = useMemo(() => {
    const term = clienteSearch.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((cliente) => {
      const nombre = cliente.tipo_cliente === 'natural' || cliente.tipo_cliente === 'ce'
        ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
        : cliente.razon_social || '';
      const documento = cliente.dni || cliente.ruc || '';
      return (
        nombre.toLowerCase().includes(term) ||
        documento.toLowerCase().includes(term)
      );
    });
  }, [clientes, clienteSearch]);

  const modoEdicion = Boolean(comprobanteEditId);

  const clienteSeleccionadoLabel = useMemo(() => {
    const cliente = clientes.find((c) => String(c.id) === String(clienteId));
    if (!cliente) return '';
    const nombre = cliente.tipo_cliente === 'natural' || cliente.tipo_cliente === 'ce'
      ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
      : cliente.razon_social || '';
    const documento = cliente.dni || cliente.ruc || '';
    return `${nombre} (${documento})`.trim();
  }, [clientes, clienteId]);

  useEffect(() => {
    if (!mostrarClientesMenu) return undefined;
    const onClickOutside = (event) => {
      if (!clientePickerRef.current?.contains(event.target)) {
        setMostrarClientesMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [mostrarClientesMenu]);


  const agregarItemComprobante = (nuevo) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (item) =>
          String(item.producto_id) === String(nuevo.producto_id) &&
          String(item.almacen_origen || 'productos') === String(nuevo.almacen_origen || 'productos')
      );
      if (idx === -1) {
        return [...prev, nuevo];
      }
      const next = [...prev];
      const cantidadActual = Number(next[idx].cantidad || 0);
      const cantidadNueva = Number(nuevo.cantidad || 0) || 1;
      next[idx] = {
        ...next[idx],
        cantidad: cantidadActual + cantidadNueva
      };
      return next;
    });
  };

  const agregarProductoDesdeLista = async (id) => {
    try {
      const resp = await comprobantesService.obtenerProducto(id, {});
      const producto = resp.data;
      const precio = Number(producto.precio_venta || 0);
      agregarItemComprobante({
        producto_id: producto.id,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        marca: producto.marca,
        almacen_origen: 'productos',
        cantidad: 1,
        monto: precio,
        origen: 'manual'
      });
    } catch (err) {
      console.error('Error agregando producto:', err);
    }
  };

  const limpiarFiltrosSimple = () => {
    setTipoId('');
    setMarcas([]);
    setMarca('');
    setProductos([]);
    setProductoId('');
  };

  const limpiarFiltrosAvanzada = () => {
    setBusqueda('');
    setResultados([]);
  };

  const limpiarFiltrosKits = () => {
    setKitSeleccionado('');
  };

  const agregarProductoDesdeFiltro = () => {
    if (!productoId) {
      return;
    }
    agregarProductoDesdeLista(productoId);
    limpiarFiltrosSimple();
  };

  const agregarProductoDesdeBusqueda = (producto) => {
    const precio = Number(producto.precio_venta || 0);
    agregarItemComprobante({
      producto_id: producto.id,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      marca: producto.marca,
      almacen_origen: 'productos',
      cantidad: 1,
      monto: precio,
      origen: 'manual'
    });
    limpiarFiltrosAvanzada();
  };

  const cargarKit = async (kitId) => {
    try {
      const resp = await kitsService.obtenerParaVenta(kitId);
      const { productos_con_stock, productos_sin_stock } = resp.data;
      if (!mountedRef.current) return;
      if (productos_sin_stock?.length) {
        setError('Algunos productos del kit no tienen stock.');
      } else {
        setError('');
      }
      const nuevos = (productos_con_stock || []).map((item) => ({
        producto_id: item.producto_id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        marca: item.marca,
        almacen_origen: 'kit',
        cantidad: Number(item.cantidad || 0),
        monto: Number(item.precio_final || item.precio_unitario || 0),
        origen: 'kit'
      }));
      nuevos.forEach((nuevo) => agregarItemComprobante(nuevo));
    } catch (err) {
      console.error('Error cargando kit:', err);
      if (mountedRef.current) {
        setError('Error al cargar kit');
      }
    }
  };

  const handleCargarKit = () => {
    if (!kitSeleccionado) return;
    cargarKit(kitSeleccionado);
    limpiarFiltrosKits();
  };

  const actualizarItem = (index, changes) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...changes } : item))
    );
  };

  const quitarItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totales = useMemo(() => {
    let total = 0;
    items.forEach((item) => {
      total += Number(item.monto || 0) * Number(item.cantidad || 0);
    });
    return { subtotal: total, descuento: 0, total };
  }, [items]);

  const abrirPdfComprobante = async (id) => {
    if (!id) return;
    try {
      const resp = await comprobantesService.pdf(id);
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'text/html' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Error abriendo PDF:', err);
      setError('No se pudo abrir el PDF');
    }
  };

  const resetComprobante = () => {
    setItems([]);
    setNotas('');
    setTipoComprobante('boleta');
    setClienteId('');
    setClienteSearch('');
    setMostrarClientesMenu(false);
    setComprobanteEditId(null);
    setError('');
  };

  const iniciarEdicion = useCallback(async (id) => {
    try {
      setError('');
      const resp = await comprobantesService.obtener(id);
      const { comprobante, detalles } = resp.data;
      if (!mountedRef.current) return;
      setTipoComprobante(comprobante?.tipo_comprobante || 'boleta');
      setClienteId(comprobante?.cliente_id || '');
      setNotas(comprobante?.nota || '');
      setItems(
        (detalles || []).map((detalle) => ({
          producto_id: detalle.producto_id,
          codigo: detalle.codigo,
          descripcion: detalle.descripcion,
          marca: detalle.marca,
          almacen_origen: detalle.almacen_origen || 'productos',
          cantidad: Number(detalle.cantidad || 0),
          monto: Number(detalle.monto || detalle.precio_unitario || 0),
          origen: detalle.almacen_origen === 'kit' ? 'kit' : 'manual'
        }))
      );
      setComprobanteEditId(comprobante.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error cargando comprobante:', err);
      if (mountedRef.current) {
        setError('No se pudo cargar el comprobante');
      }
    }
  }, [mountedRef]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId) {
      iniciarEdicion(editId);
    }
  }, [location.search, iniciarEdicion]);

  const guardarComprobante = async () => {
    setError('');
    setWarning('');
    if (!items.length) {
      setError('Agrega productos antes de guardar.');
      return;
    }
    try {
      const payload = {
        cliente_id: clienteId || null,
        tipo_comprobante: tipoComprobante,
        notas,
        productos: items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          monto: item.monto,
          almacen_origen: item.almacen_origen
        }))
      };
      let comprobanteId = null;
      if (modoEdicion) {
        await comprobantesService.editar(comprobanteEditId, payload);
        comprobanteId = comprobanteEditId;
      } else {
        const resp = await comprobantesService.crear(payload);
        comprobanteId = resp.data?.id;
      }
      if (comprobanteId) {
        abrirPdfComprobante(comprobanteId);
      }
      resetComprobante();
    } catch (err) {
      console.error('Error creando comprobante:', err);
      setError(err.response?.data?.error || 'Error al guardar comprobante');
    }
  };

  const resetClienteForm = () => {
    setClienteForm(emptyCliente);
    setConsultaMensaje('');
  };

  const consultarDocumento = async () => {
    setConsultaMensaje('');
    if (clienteForm.tipo_cliente === 'natural') {
      if (!/^\d{8}$/.test(clienteForm.dni || '')) {
        setConsultaMensaje('El DNI debe tener 8 digitos.');
        return;
      }
      try {
        setConsultando(true);
        const resp = await clientesService.consultaDni(clienteForm.dni);
        if (!mountedRef.current) return;
        if (resp.data?.success) {
          setClienteForm((prev) => ({
            ...prev,
            nombre: resp.data.nombre || '',
            apellido: resp.data.apellido || ''
          }));
          setConsultaMensaje('Datos obtenidos.');
        } else {
          setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
        }
      } catch (err) {
        console.error('Error consultando DNI:', err);
        if (mountedRef.current) {
          setConsultaMensaje('Error consultando DNI.');
        }
      } finally {
        if (mountedRef.current) {
          setConsultando(false);
        }
      }
      return;
    }

    if (clienteForm.tipo_cliente === 'ce') {
      if (!/^\d{9}$/.test(clienteForm.dni || '')) {
        setConsultaMensaje('El CE debe tener 9 digitos.');
        return;
      }
      setConsultaMensaje('Para CE registra nombre y apellido manualmente.');
      return;
    }

    if (!/^\d{11}$/.test(clienteForm.ruc || '')) {
      setConsultaMensaje('El RUC debe tener 11 digitos.');
      return;
    }
    try {
      setConsultando(true);
      const resp = await clientesService.consultaRuc(clienteForm.ruc);
      if (!mountedRef.current) return;
      if (resp.data?.success) {
        setClienteForm((prev) => ({
          ...prev,
          razon_social: resp.data.razon_social || '',
          direccion: resp.data.direccion || prev.direccion
        }));
        setConsultaMensaje('Datos obtenidos.');
      } else {
        setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
      }
    } catch (err) {
      console.error('Error consultando RUC:', err);
      if (mountedRef.current) {
        setConsultaMensaje('Error consultando RUC.');
      }
    } finally {
      if (mountedRef.current) {
        setConsultando(false);
      }
    }
  };

  const crearCliente = async () => {
    try {
      const resp = await clientesService.create(clienteForm);
      if (!mountedRef.current) return;
      const data = resp.data || {};
      if (data?.ya_existia) {
        const vendedor = data?.vendedor_nombre ? `por ${data.vendedor_nombre}` : 'por otro vendedor';
        setWarning(`Cliente ya registrado ${vendedor}. Se compartió contigo.`);
      } else {
        setWarning('');
      }
      await cargarClientes();
      setClienteId(data?.id || '');
      setMostrarModalCliente(false);
      resetClienteForm();
    } catch (err) {
      console.error('Error creando cliente:', err);
      if (mountedRef.current) {
        setError(err.response?.data?.error || 'Error al crear cliente');
      }
    }
  };

  const productosCount = items.length;
  const clienteOk = Boolean(clienteId);
  const formOk = productosCount > 0 && clienteOk;

  return (
    <div className="comprobantes-container comprobantes-sap">
      <div className="page-header">
        <div className="page-header__title">
          <h5>{modoEdicion ? `Editar Comprobante #${comprobanteEditId}` : 'Nuevo Comprobante'}</h5>
          <span className="page-header__subtitle">Simulador de boletas y facturas Kratos Maquinarias</span>
        </div>
        <div className="page-header__actions">
          <span className={`status-badge ${formOk ? 'ok' : 'warn'}`}>
            {formOk ? 'Completo' : 'Incompleto'}
          </span>
          <span className="status-pill">Tipo: {TIPO_COMPROBANTE_LABELS[tipoComprobante]}</span>
          <span className="status-pill">Productos: {productosCount}</span>
          <span className="status-pill">Cliente: {clienteOk ? 'Si' : 'No'}</span>
          <div className="header-buttons">
            <button type="button" className="btn-secondary" onClick={resetComprobante}>
              Limpiar
            </button>
            <button type="button" className="btn-primary" onClick={guardarComprobante}>
              {modoEdicion ? 'Actualizar' : 'Generar'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {warning && <div className="warning-message">{warning}</div>}

      <div className="comprobante-grid">
        <div className="comprobante-left">
          <div className="comprobante-card">
            <div className="tabs">
              <button className={tab === 'simple' ? 'active' : ''} onClick={() => setTab('simple')}>
                Simple
              </button>
              <button
                className={tab === 'avanzada' ? 'active' : ''}
                onClick={() => setTab('avanzada')}
              >
                Avanzada
              </button>
              <button className={tab === 'kits' ? 'active' : ''} onClick={() => setTab('kits')}>
                Kits
              </button>
            </div>

            <div className="comprobante-panel">
              {tab === 'simple' && (
                <div className="filtros-grid">
                  <div className="form-group">
                    <label>Tipo de maquina</label>
                    <select value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
                      <option value="">Selecciona</option>
                      {tipos.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Marca</label>
                    <select value={marca} onChange={(e) => setMarca(e.target.value)}>
                      <option value="">Selecciona</option>
                      {marcas.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Producto</label>
                    <select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                      <option value="">Selecciona</option>
                      {productos.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.codigo} - {prod.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="btn-primary" onClick={agregarProductoDesdeFiltro}>
                    Agregar producto
                  </button>
                </div>
              )}

              {tab === 'avanzada' && (
                <div className="busqueda-avanzada">
                  <input
                    type="text"
                    placeholder="Buscar por codigo, descripcion o marca"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <div className="resultados">
                    {resultados.map((producto) => (
                      <button
                        type="button"
                        className="resultado-item"
                        key={`${producto.id}-${producto.codigo}`}
                        onClick={() => agregarProductoDesdeBusqueda(producto)}
                      >
                        {producto.codigo} - {producto.descripcion} ({producto.marca})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'kits' && (
                <div className="kits-select">
                  <div className="form-group">
                    <label>Selecciona un kit</label>
                    <select
                      value={kitSeleccionado}
                      onChange={(e) => setKitSeleccionado(e.target.value)}
                    >
                      <option value="">Selecciona...</option>
                      {kits.map((kit) => (
                        <option key={kit.id} value={kit.id}>
                          {kit.nombre} - S/. {Number(kit.precio_total || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="btn-primary" onClick={handleCargarKit}>
                    Cargar kit
                  </button>
                  {kits.length === 0 && <p>No hay kits activos.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="comprobante-detalle">
            <h3>Productos agregados</h3>
            {items.length === 0 ? (
              <div className="empty-state">
                <p>No hay productos agregados.</p>
              </div>
            ) : (
              <table className="comprobante-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Descripcion</th>
                    <th>Monto</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                    <th>Origen</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const subtotal = Number(item.cantidad || 0) * Number(item.monto || 0);
                    return (
                      <tr key={`${item.producto_id}-${index}`}>
                        <td>{item.codigo}</td>
                        <td>{item.descripcion}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.monto}
                            onChange={(e) =>
                              actualizarItem(index, { monto: Number(e.target.value || 0) })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              actualizarItem(index, { cantidad: Number(e.target.value || 1) })
                            }
                          />
                        </td>
                        <td>{subtotal.toFixed(2)}</td>
                        <td>
                          {item.origen === 'kit' ? <span className="tag-kit">Kit</span> : 'Manual'}
                        </td>
                        <td>
                          <button className="btn-delete" onClick={() => quitarItem(index)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="comprobante-right">
          <div className="comprobante-card">
            <div className="comprobante-section">
              <label>Tipo de comprobante</label>
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
              >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>
            </div>
            <div className="comprobante-section">
              <label>Cliente</label>
              <div className="cliente-row">
                <div className="cliente-search" ref={clientePickerRef}>
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre o documento"
                    value={clienteSearch}
                    onFocus={() => setMostrarClientesMenu(true)}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setMostrarClientesMenu(true);
                    }}
                  />
                  <button
                    type="button"
                    className={`cliente-selector-trigger ${mostrarClientesMenu ? 'open' : ''}`}
                    onClick={() => setMostrarClientesMenu((prev) => !prev)}
                  >
                    <span>{clienteSeleccionadoLabel || 'Selecciona un cliente'}</span>
                    <span className="cliente-selector-icon">▾</span>
                  </button>
                  {mostrarClientesMenu && (
                    <div className="cliente-resultados">
                      <button
                        type="button"
                        className={`cliente-item ${!clienteId ? 'active' : ''}`}
                        onClick={() => {
                          setClienteId('');
                          setClienteSearch('');
                          setMostrarClientesMenu(false);
                        }}
                      >
                        Selecciona un cliente
                      </button>
                      {clientesFiltrados.slice(0, 10).map((cliente) => {
                        const label = cliente.tipo_cliente === 'natural' || cliente.tipo_cliente === 'ce'
                          ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
                          : cliente.razon_social;
                        const doc = cliente.dni || cliente.ruc || '';
                        return (
                          <button
                            type="button"
                            key={cliente.id}
                            className={`cliente-item ${String(cliente.id) === String(clienteId) ? 'active' : ''}`}
                            onClick={() => {
                              setClienteId(String(cliente.id));
                              setClienteSearch(label);
                              setMostrarClientesMenu(false);
                            }}
                          >
                            {label} ({doc})
                          </button>
                        );
                      })}
                      {clientesFiltrados.length === 0 && (
                        <div className="cliente-vacio">Sin resultados</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMostrarModalCliente(true)}
                >
                  Nuevo
                </button>
              </div>
            </div>
            {clienteOk && (
              <div className="cliente-info">
                {(() => {
                  const cliente = clientes.find((c) => String(c.id) === String(clienteId));
                  if (!cliente) return null;
                  return (
                    <>
                      <div><strong>RUC/DNI:</strong> {cliente.ruc || cliente.dni || '-'}</div>
                      <div><strong>Tel:</strong> {cliente.telefono || '-'}</div>
                      <div><strong>Dir:</strong> {cliente.direccion || '-'}</div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="comprobante-notas">
            <label>Notas / Observaciones</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          <div className="comprobante-summary">
            <h3>Resumen de comprobante</h3>
            <div className="summary-row">
              <span>Tipo</span>
              <strong>{TIPO_COMPROBANTE_LABELS[tipoComprobante]}</strong>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>S/ {totales.subtotal.toFixed(2)}</strong>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>S/ {totales.total.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      {mostrarModalCliente && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nuevo Cliente</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  resetClienteForm();
                  setMostrarModalCliente(false);
                }}
              >
                X
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tipo de cliente</label>
                <select
                  value={clienteForm.tipo_cliente}
                  onChange={(e) =>
                    setClienteForm({ ...clienteForm, tipo_cliente: e.target.value })
                  }
                >
                  <option value="natural">Natural</option>
                  <option value="juridico">Juridico</option>
                  <option value="ce">Carnet de extranjeria</option>
                </select>
              </div>

              {clienteForm.tipo_cliente === 'natural' || clienteForm.tipo_cliente === 'ce' ? (
                <>
                  <div className="form-group">
                    <label>{clienteForm.tipo_cliente === 'ce' ? 'CE' : 'DNI'}</label>
                    <div className="consulta-row">
                      <input
                        type="text"
                        maxLength={clienteForm.tipo_cliente === 'ce' ? 9 : 8}
                        value={clienteForm.dni}
                        onChange={(e) =>
                          setClienteForm({ ...clienteForm, dni: e.target.value.trim() })
                        }
                      />
                      {clienteForm.tipo_cliente === 'natural' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={consultarDocumento}
                          disabled={consultando}
                        >
                          {consultando ? 'Consultando...' : 'Consultar'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        value={clienteForm.nombre}
                        onChange={(e) =>
                          setClienteForm({ ...clienteForm, nombre: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input
                        type="text"
                        value={clienteForm.apellido}
                        onChange={(e) =>
                          setClienteForm({ ...clienteForm, apellido: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>RUC</label>
                    <div className="consulta-row">
                      <input
                        type="text"
                        value={clienteForm.ruc}
                        onChange={(e) =>
                          setClienteForm({ ...clienteForm, ruc: e.target.value.trim() })
                        }
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={consultarDocumento}
                        disabled={consultando}
                      >
                        {consultando ? 'Consultando...' : 'Consultar'}
                      </button>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Razon social</label>
                      <input
                        type="text"
                        value={clienteForm.razon_social}
                        onChange={(e) =>
                          setClienteForm({ ...clienteForm, razon_social: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {consultaMensaje && <p className="consulta-mensaje">{consultaMensaje}</p>}

              <div className="form-row">
                <div className="form-group">
                  <label>Direccion</label>
                  <input
                    type="text"
                    value={clienteForm.direccion}
                    onChange={(e) =>
                      setClienteForm({ ...clienteForm, direccion: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Telefono</label>
                  <input
                    type="text"
                    value={clienteForm.telefono}
                    onChange={(e) =>
                      setClienteForm({ ...clienteForm, telefono: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Correo</label>
                  <input
                    type="email"
                    value={clienteForm.correo}
                    onChange={(e) =>
                      setClienteForm({ ...clienteForm, correo: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-success" onClick={crearCliente}>
                Crear
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  resetClienteForm();
                  setMostrarModalCliente(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprobantesPage;

