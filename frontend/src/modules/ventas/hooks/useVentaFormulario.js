import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clientesService,
  cotizacionesService,
  kitsService,
  productosService,
  ventasService
} from '../../../core/services/apiServices';
import { buildMatchKey, genId, getToday, normalizarClaveLocal } from '../utils/ventasUtils';

const createInitialFormData = () => ({
  documentoTipo: 'dni',
  documento: '',
  clienteNombre: '',
  clienteTelefono: '',
  vendedorId: '',
  agencia: 'SHALOM',
  agenciaOtro: '',
  destino: '',
  fechaVenta: getToday(),
  estadoEnvio: 'PENDIENTE',
  fechaDespacho: '',
  fechaCancelacion: '',
  encargado: '',
  pVenta: 0,
  adelanto: '',
  rastreoEstado: 'EN TRANSITO',
  ticket: '',
  guia: '',
  retiro: '',
  notas: ''
});

const createInitialRequerimiento = () => ({
  productoId: null,
  codigo: '',
  descripcion: '',
  marca: '',
  proveedor: '',
  cantidad: 1,
  precioCompra: ''
});

const useVentaFormulario = ({
  mountedRef,
  usuarioActual,
  cargarVentas,
  obtenerVentaDetalle,
  ventaTieneDetalle
}) => {
  const [consultaMensaje, setConsultaMensaje] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [avisoStock, setAvisoStock] = useState('');
  const [editId, setEditId] = useState(null);
  const [tabProductos, setTabProductos] = useState('productos');

  const [formData, setFormData] = useState(createInitialFormData);

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState([]);
  const [busquedaRequerimiento, setBusquedaRequerimiento] = useState('');
  const [resultadosRequerimiento, setResultadosRequerimiento] = useState([]);
  const [busquedaRegalo, setBusquedaRegalo] = useState('');
  const [resultadosRegalo, setResultadosRegalo] = useState([]);
  const [busquedaReqRegalo, setBusquedaReqRegalo] = useState('');
  const [resultadosReqRegalo, setResultadosReqRegalo] = useState([]);
  const [tabProductosModo, setTabProductosModo] = useState('avanzada');
  const [tabReqModo, setTabReqModo] = useState('avanzada');
  const [tabRegalosModo, setTabRegalosModo] = useState('avanzada');
  const [tabReqRegaloModo, setTabReqRegaloModo] = useState('avanzada');
  const [kitsDisponibles, setKitsDisponibles] = useState([]);
  const [cargandoKits, setCargandoKits] = useState(false);
  const [errorKits, setErrorKits] = useState('');
  const [productos, setProductos] = useState([]);
  const [requerimientos, setRequerimientos] = useState([]);
  const [regalos, setRegalos] = useState([]);
  const [regaloRequerimientos, setRegaloRequerimientos] = useState([]);

  const [requerimiento, setRequerimiento] = useState(createInitialRequerimiento);
  const [regaloRequerimiento, setRegaloRequerimiento] = useState(createInitialRequerimiento);
  const [sugerenciaRequerimiento, setSugerenciaRequerimiento] = useState(null);
  const [sugerenciaRegalo, setSugerenciaRegalo] = useState(null);

  useEffect(() => {
    if (!modalOpen) return;
    let activo = true;
    const cargar = async () => {
      try {
        setCargandoKits(true);
        setErrorKits('');
        const resp = await kitsService.listarActivos();
        if (!activo || (mountedRef && !mountedRef.current)) return;
        setKitsDisponibles(resp.data || []);
      } catch (err) {
        if (!activo || (mountedRef && !mountedRef.current)) return;
        console.error('Error cargando kits:', err);
        setErrorKits('No se pudieron cargar los kits.');
      } finally {
        if (activo && (!mountedRef || mountedRef.current)) {
          setCargandoKits(false);
        }
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [modalOpen, mountedRef]);

  useEffect(() => {
    if (formData.agencia === 'TIENDA') {
      setFormData((prev) => ({ ...prev, destino: 'TIENDA' }));
      return;
    }
    if (formData.destino === 'TIENDA') {
      setFormData((prev) => ({ ...prev, destino: '' }));
    }
  }, [formData.agencia, formData.destino]);

  const buscarProductos = useCallback(async (q, setResultados) => {
    try {
      const resp = await cotizacionesService.buscarProductos({ q, limit: 20 });
      if (mountedRef && !mountedRef.current) return;
      setResultados(resp.data || []);
    } catch (err) {
      console.error('Error buscando productos:', err);
    }
  }, [mountedRef]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaProducto.trim().length < 1) {
        setResultadosProducto([]);
        return;
      }
      buscarProductos(busquedaProducto.trim(), setResultadosProducto);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaProducto, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaRequerimiento.trim().length < 1) {
        setResultadosRequerimiento([]);
        return;
      }
      buscarProductos(busquedaRequerimiento.trim(), setResultadosRequerimiento);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaRequerimiento, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaRegalo.trim().length < 1) {
        setResultadosRegalo([]);
        return;
      }
      buscarProductos(busquedaRegalo.trim(), setResultadosRegalo);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaRegalo, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaReqRegalo.trim().length < 1) {
        setResultadosReqRegalo([]);
        return;
      }
      buscarProductos(busquedaReqRegalo.trim(), setResultadosReqRegalo);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaReqRegalo, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const term = requerimiento.descripcion.trim();
      if (term.length < 2) {
        setSugerenciaRequerimiento(null);
        return;
      }
      try {
        const resp = await ventasService.historialRequerimientos({ q: term });
        const match = resp.data?.[0];
        if (match) {
          setSugerenciaRequerimiento(match);
          setRequerimiento((prev) => ({
            ...prev,
            proveedor: prev.proveedor || match.proveedor || '',
            precioCompra: prev.precioCompra || match.precioCompra || ''
          }));
        }
      } catch (err) {
        console.error('Error buscando historial requerimientos:', err);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [requerimiento.descripcion]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const term = regaloRequerimiento.descripcion.trim();
      if (term.length < 2) {
        setSugerenciaRegalo(null);
        return;
      }
      try {
        const resp = await ventasService.historialRequerimientos({ q: term });
        const match = resp.data?.[0];
        if (match) {
          setSugerenciaRegalo(match);
          setRegaloRequerimiento((prev) => ({
            ...prev,
            proveedor: prev.proveedor || match.proveedor || '',
            precioCompra: prev.precioCompra || match.precioCompra || ''
          }));
        }
      } catch (err) {
        console.error('Error buscando historial regalos:', err);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [regaloRequerimiento.descripcion]);

  const handleConsultarDocumento = async () => {
    setConsultaMensaje('');
    if (formData.documentoTipo === 'dni') {
      if (!/^\d{8}$/.test(formData.documento || '')) {
        setConsultaMensaje('El DNI debe tener 8 digitos.');
        return;
      }
      try {
        setConsultando(true);
        const resp = await clientesService.consultaDni(formData.documento);
        if (resp.data?.success) {
          const nombre = `${resp.data.nombre || ''} ${resp.data.apellido || ''}`.trim();
          setFormData((prev) => ({ ...prev, clienteNombre: nombre }));
          setConsultaMensaje('Datos obtenidos.');
        } else {
          setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
        }
      } catch (err) {
        console.error('Error consultando DNI:', err);
        setConsultaMensaje('Error consultando DNI.');
      } finally {
        setConsultando(false);
      }
      return;
    }

    if (!/^\d{11}$/.test(formData.documento || '')) {
      setConsultaMensaje('El RUC debe tener 11 digitos.');
      return;
    }
    try {
      setConsultando(true);
      const resp = await clientesService.consultaRuc(formData.documento);
      if (resp.data?.success) {
        setFormData((prev) => ({
          ...prev,
          clienteNombre: resp.data.razon_social || prev.clienteNombre
        }));
        setConsultaMensaje('Datos obtenidos.');
      } else {
        setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
      }
    } catch (err) {
      console.error('Error consultando RUC:', err);
      setConsultaMensaje('Error consultando RUC.');
    } finally {
      setConsultando(false);
    }
  };

  const getStock = (producto) => {
    const stockRaw =
      producto.stock ??
      producto.stock_total ??
      producto.stock_disponible ??
      producto.cantidad ??
      null;
    return stockRaw === null ? null : Number(stockRaw || 0);
  };

  const ajustarCantidadProductoStock = (itemId, rawCantidad) => {
    const desired = Math.max(1, Number(rawCantidad || 1));
    const current = productos.find((item) => item.id === itemId);
    if (!current) return;
    const stockRaw = getStock(current);
    const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
    const qtyStock = stock > 0 ? Math.min(stock, desired) : 0;
    const qtyReq = Math.max(desired - qtyStock, 0);

    setProductos((prev) =>
      prev
        .map((item) => (item.id === itemId ? { ...item, cantidad: qtyStock } : item))
        .filter((item) => !(item.id === itemId && qtyStock <= 0))
    );

    setRequerimientos((prev) => {
      const matchKey = buildMatchKey({
        producto_id: current.producto_id ?? current.id,
        codigo: current.codigo,
        descripcion: current.descripcion
      });
      const idx = prev.findIndex((item) => buildMatchKey(item) === matchKey);
      if (qtyReq <= 0) {
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      const base = idx >= 0 ? prev[idx] : {};
      const nuevo = {
        ...base,
        id: base.id || genId(),
        tipo: 'compra',
        producto_id: current.producto_id ?? current.id ?? base.producto_id ?? null,
        codigo: current.codigo || base.codigo || '',
        descripcion: current.descripcion || base.descripcion || '',
        marca: current.marca || base.marca || '',
        stock: stockRaw,
        cantidad: qtyReq,
        precioCompra: base.precioCompra ?? Number(current.precioCompra || current.precio_compra || 0),
        precioVenta: base.precioVenta ?? Number(current.precioVenta || current.precio_venta || 0),
        proveedor: base.proveedor || ''
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nuevo;
        return next;
      }
      return [...prev, nuevo];
    });

    setAvisoStock(
      qtyReq > 0
        ? `Stock insuficiente: ${current.codigo || current.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
        : ''
    );
  };

  const ajustarCantidadRegaloStock = (itemId, rawCantidad) => {
    const desired = Math.max(1, Number(rawCantidad || 1));
    const current = regalos.find((item) => item.id === itemId);
    if (!current) return;
    const stockRaw = getStock(current);
    const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
    const qtyStock = stock > 0 ? Math.min(stock, desired) : 0;
    const qtyReq = Math.max(desired - qtyStock, 0);

    setRegalos((prev) =>
      prev
        .map((item) => (item.id === itemId ? { ...item, cantidad: qtyStock } : item))
        .filter((item) => !(item.id === itemId && qtyStock <= 0))
    );

    setRegaloRequerimientos((prev) => {
      const matchKey = buildMatchKey({
        producto_id: current.producto_id ?? current.id,
        codigo: current.codigo,
        descripcion: current.descripcion
      });
      const idx = prev.findIndex((item) => buildMatchKey(item) === matchKey);
      if (qtyReq <= 0) {
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      const base = idx >= 0 ? prev[idx] : {};
      const nuevo = {
        ...base,
        id: base.id || genId(),
        tipo: 'compra',
        producto_id: current.producto_id ?? current.id ?? base.producto_id ?? null,
        codigo: current.codigo || base.codigo || '',
        descripcion: current.descripcion || base.descripcion || '',
        marca: current.marca || base.marca || '',
        stock: stockRaw,
        cantidad: qtyReq,
        precioCompra: base.precioCompra ?? Number(current.precioCompra || current.precio_compra || 0),
        proveedor: base.proveedor || ''
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nuevo;
        return next;
      }
      return [...prev, nuevo];
    });

    setAvisoStock(
      qtyReq > 0
        ? `Stock insuficiente: ${current.codigo || current.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
        : ''
    );
  };

  const mapKitItemToProducto = (item) => ({
    id: genId(),
    tipo: 'stock',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioVenta: Number(item.precio_final || item.precio_unitario || 0),
    precioCompra: 0,
    proveedor: ''
  });

  const mapKitItemToRequerimiento = (item) => ({
    id: genId(),
    tipo: 'compra',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioVenta: Number(item.precio_final || item.precio_unitario || 0),
    precioCompra: 0,
    proveedor: ''
  });

  const mapKitItemToRegalo = (item) => ({
    id: genId(),
    tipo: 'stock',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioCompra: 0,
    proveedor: ''
  });

  const mapKitItemToReqRegalo = (item) => ({
    id: genId(),
    tipo: 'compra',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioCompra: 0,
    proveedor: ''
  });

  const agregarKitVenta = async (kit) => {
    try {
      const resp = await kitsService.obtenerParaVenta(kit.id);
      const conStock = resp.data?.productos_con_stock || [];
      const sinStock = resp.data?.productos_sin_stock || [];
      if (conStock.length) {
        setProductos((prev) => [...prev, ...conStock.map(mapKitItemToProducto)]);
      }
      if (sinStock.length) {
        setRequerimientos((prev) => [...prev, ...sinStock.map(mapKitItemToRequerimiento)]);
      }
      if (!conStock.length && !sinStock.length) {
        setAvisoStock('El kit no tiene productos.');
      } else if (sinStock.length) {
        setAvisoStock('Kit: productos sin stock enviados a requerimientos.');
      } else {
        setAvisoStock('Kit agregado a productos.');
      }
    } catch (err) {
      console.error('Error agregando kit:', err);
      setAvisoStock('Error agregando kit.');
    }
  };

  const agregarKitRegalo = async (kit) => {
    try {
      const resp = await kitsService.obtenerParaVenta(kit.id);
      const conStock = resp.data?.productos_con_stock || [];
      const sinStock = resp.data?.productos_sin_stock || [];
      if (conStock.length) {
        setRegalos((prev) => [...prev, ...conStock.map(mapKitItemToRegalo)]);
      }
      if (sinStock.length) {
        setRegaloRequerimientos((prev) => [...prev, ...sinStock.map(mapKitItemToReqRegalo)]);
      }
      if (!conStock.length && !sinStock.length) {
        setAvisoStock('El kit no tiene productos.');
      } else if (sinStock.length) {
        setAvisoStock('Kit: regalos sin stock enviados a requerimientos.');
      } else {
        setAvisoStock('Kit agregado a regalos.');
      }
    } catch (err) {
      console.error('Error agregando kit regalos:', err);
      setAvisoStock('Error agregando kit.');
    }
  };

  const agregarProducto = (producto) => {
    const stock = getStock(producto);
    if (stock !== null && stock <= 0) {
      setRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioVenta: Number(producto.precio_venta || 0),
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('Producto sin stock enviado a requerimiento de compra.');
    } else {
      setProductos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'stock',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioVenta: Number(producto.precio_venta || 0),
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('');
    }
    setBusquedaProducto('');
    setResultadosProducto([]);
  };

  const agregarRequerimiento = async () => {
    const descripcion = requerimiento.descripcion.trim();
    const codigo = String(requerimiento.codigo || '').trim();
    if (!descripcion && !codigo) return;
    const clave = normalizarClaveLocal(codigo || descripcion);
    if (clave) {
      const yaExiste = requerimientos.some(
        (item) => normalizarClaveLocal(item.codigo || item.descripcion) === clave
      );
      if (yaExiste) {
        setAvisoStock('Requerimiento ya agregado.');
        return;
      }
    }

    let productoMatch = null;
    if (codigo) {
      try {
        if (requerimiento.productoId) {
          const resp = await productosService.getById(requerimiento.productoId);
          productoMatch = resp?.data || null;
        } else {
          const resp = await productosService.getByCodigo(codigo);
          productoMatch = resp?.data || null;
        }
      } catch (_) {
        productoMatch = null;
      }
    }

    if (productoMatch) {
      const stockRaw = getStock(productoMatch);
      const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
      const desiredQty = Math.max(1, Number(requerimiento.cantidad || 1));
      const qtyStock = stock > 0 ? Math.min(stock, desiredQty) : 0;
      const qtyReq = Math.max(desiredQty - qtyStock, 0);
      const baseItem = {
        id: genId(),
        producto_id: productoMatch.id,
        codigo: productoMatch.codigo || codigo,
        descripcion: productoMatch.descripcion || descripcion || codigo,
        marca: productoMatch.marca || requerimiento.marca || '',
        stock: stockRaw,
        proveedor: requerimiento.proveedor.trim()
      };

      if (qtyStock > 0) {
        setProductos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'stock',
            cantidad: qtyStock,
            precioVenta: Number(productoMatch.precio_venta || 0),
            precioCompra: Number(productoMatch.precio_compra || 0)
          }
        ]);
      }
      if (qtyReq > 0) {
        setRequerimientos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'compra',
            cantidad: qtyReq,
            precioVenta: Number(productoMatch.precio_venta || 0),
            precioCompra: Number(requerimiento.precioCompra || 0)
          }
        ]);
      }

      if (qtyReq > 0 && qtyStock > 0) {
        setAvisoStock(
          `Stock insuficiente: ${productoMatch.codigo || productoMatch.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
        );
      } else if (qtyReq > 0) {
        setAvisoStock('Producto sin stock enviado a requerimiento de compra.');
      } else {
        setAvisoStock('');
      }

      setRequerimiento(createInitialRequerimiento());
      setBusquedaRequerimiento('');
      setResultadosRequerimiento([]);
      return;
    }

    try {
      const resp = await ventasService.crearRequerimientoProducto({
        descripcion,
        codigo,
        marca: requerimiento.marca || '',
        precioCompra: Number(requerimiento.precioCompra || 0)
      });
      const data = resp?.data || {};
      const codigoFinal = data.codigo || codigo;
      const descripcionFinal = data.descripcion || descripcion || codigoFinal;
      const marcaFinal = data.marca || requerimiento.marca || '';
      setRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: data.id || null,
          codigo: codigoFinal,
          descripcion: descripcionFinal,
          marca: marcaFinal,
          stock: null,
          cantidad: Number(requerimiento.cantidad || 1),
          precioCompra: Number(requerimiento.precioCompra || 0),
          precioVenta: 0,
          proveedor: requerimiento.proveedor.trim()
        }
      ]);
      setAvisoStock(data.existente ? 'Producto ya existia, se reutilizo.' : 'Producto creado.');
    } catch (err) {
      console.error('Error creando requerimiento:', err);
      setAvisoStock('Error creando requerimiento.');
      return;
    }

    setRequerimiento(createInitialRequerimiento());
    setBusquedaRequerimiento('');
    setResultadosRequerimiento([]);
  };

  const agregarRegalo = (producto) => {
    const stock = getStock(producto);
    if (stock !== null && stock <= 0) {
      setRegaloRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('Regalo sin stock enviado a requerimiento de compra.');
    } else {
      setRegalos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'stock',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('');
    }
    setBusquedaRegalo('');
    setResultadosRegalo([]);
  };

  const agregarRegaloRequerimiento = async () => {
    const descripcion = regaloRequerimiento.descripcion.trim();
    const codigo = String(regaloRequerimiento.codigo || '').trim();
    if (!descripcion && !codigo) return;
    const clave = normalizarClaveLocal(codigo || descripcion);
    if (clave) {
      const yaExiste = regaloRequerimientos.some(
        (item) => normalizarClaveLocal(item.codigo || item.descripcion) === clave
      );
      if (yaExiste) {
        setAvisoStock('Requerimiento ya agregado.');
        return;
      }
    }

    let productoMatch = null;
    if (codigo) {
      try {
        if (regaloRequerimiento.productoId) {
          const resp = await productosService.getById(regaloRequerimiento.productoId);
          productoMatch = resp?.data || null;
        } else {
          const resp = await productosService.getByCodigo(codigo);
          productoMatch = resp?.data || null;
        }
      } catch (_) {
        productoMatch = null;
      }
    }

    if (productoMatch) {
      const stockRaw = getStock(productoMatch);
      const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
      const desiredQty = Math.max(1, Number(regaloRequerimiento.cantidad || 1));
      const qtyStock = stock > 0 ? Math.min(stock, desiredQty) : 0;
      const qtyReq = Math.max(desiredQty - qtyStock, 0);
      const baseItem = {
        id: genId(),
        producto_id: productoMatch.id,
        codigo: productoMatch.codigo || codigo,
        descripcion: productoMatch.descripcion || descripcion || codigo,
        marca: productoMatch.marca || regaloRequerimiento.marca || '',
        stock: stockRaw,
        proveedor: regaloRequerimiento.proveedor.trim()
      };

      if (qtyStock > 0) {
        setRegalos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'stock',
            cantidad: qtyStock,
            precioCompra: Number(productoMatch.precio_compra || 0)
          }
        ]);
      }
      if (qtyReq > 0) {
        setRegaloRequerimientos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'compra',
            cantidad: qtyReq,
            precioCompra: Number(regaloRequerimiento.precioCompra || 0)
          }
        ]);
      }

      if (qtyReq > 0 && qtyStock > 0) {
        setAvisoStock(
          `Stock insuficiente: ${productoMatch.codigo || productoMatch.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
        );
      } else if (qtyReq > 0) {
        setAvisoStock('Regalo sin stock enviado a requerimiento de compra.');
      } else {
        setAvisoStock('');
      }

      setRegaloRequerimiento(createInitialRequerimiento());
      setBusquedaReqRegalo('');
      setResultadosReqRegalo([]);
      return;
    }

    try {
      const resp = await ventasService.crearRequerimientoProducto({
        descripcion,
        codigo,
        marca: regaloRequerimiento.marca || '',
        precioCompra: Number(regaloRequerimiento.precioCompra || 0)
      });
      const data = resp?.data || {};
      const codigoFinal = data.codigo || codigo;
      const descripcionFinal = data.descripcion || descripcion || codigoFinal;
      const marcaFinal = data.marca || regaloRequerimiento.marca || '';
      setRegaloRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: data.id || null,
          codigo: codigoFinal,
          descripcion: descripcionFinal,
          marca: marcaFinal,
          stock: null,
          cantidad: Number(regaloRequerimiento.cantidad || 1),
          precioCompra: Number(regaloRequerimiento.precioCompra || 0),
          proveedor: regaloRequerimiento.proveedor.trim()
        }
      ]);
      setAvisoStock(data.existente ? 'Producto ya existia, se reutilizo.' : 'Producto creado.');
    } catch (err) {
      console.error('Error creando requerimiento regalo:', err);
      setAvisoStock('Error creando requerimiento.');
      return;
    }

    setRegaloRequerimiento(createInitialRequerimiento());
    setBusquedaReqRegalo('');
    setResultadosReqRegalo([]);
  };

  const actualizarItem = (setLista, id, changes) => {
    setLista((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const quitarItem = (setLista, id) => {
    setLista((prev) => prev.filter((item) => item.id !== id));
  };

  const totalVenta = useMemo(
    () =>
      productos.reduce(
        (acc, item) => acc + Number(item.precioVenta || 0) * Number(item.cantidad || 0),
        0
      ),
    [productos]
  );

  useEffect(() => {
    setFormData((prev) => ({ ...prev, pVenta: Number(totalVenta || 0) }));
  }, [totalVenta]);

  const resetFormulario = () => {
    setFormData(createInitialFormData());
    setProductos([]);
    setRequerimientos([]);
    setRegalos([]);
    setRegaloRequerimientos([]);
    setRequerimiento(createInitialRequerimiento());
    setRegaloRequerimiento(createInitialRequerimiento());
    setBusquedaProducto('');
    setResultadosProducto([]);
    setBusquedaRequerimiento('');
    setResultadosRequerimiento([]);
    setBusquedaRegalo('');
    setResultadosRegalo([]);
    setBusquedaReqRegalo('');
    setResultadosReqRegalo([]);
    setSugerenciaRequerimiento(null);
    setSugerenciaRegalo(null);
    setConsultaMensaje('');
    setAvisoStock('');
    setError('');
    setStep(1);
    setEditId(null);
    setTabProductos('productos');
    setTabProductosModo('avanzada');
    setTabReqModo('avanzada');
    setTabRegalosModo('avanzada');
    setTabReqRegaloModo('avanzada');
  };

  const cerrarModal = () => {
    setModalOpen(false);
    resetFormulario();
  };

  const abrirModal = () => {
    const vendedorId = usuarioActual?.id ? String(usuarioActual.id) : '';
    setFormData((prev) => ({ ...prev, vendedorId }));
    setModalOpen(true);
    setStep(1);
  };

  const abrirEdicion = async (venta) => {
    if (!venta) return;
    let ventaDetalle = venta;
    if (!ventaTieneDetalle(venta)) {
      try {
        const detalle = await obtenerVentaDetalle(venta.id);
        if (detalle) {
          ventaDetalle = detalle;
        }
      } catch (err) {
        console.error('Error cargando detalle de venta:', err);
        alert('No se pudo cargar el detalle de la venta.');
        return;
      }
    }
    if (!ventaDetalle) return;

    setEditId(ventaDetalle.id);
    setFormData({
      documentoTipo: ventaDetalle.documentoTipo || 'dni',
      documento: ventaDetalle.documento || '',
      clienteNombre: ventaDetalle.clienteNombre || '',
      clienteTelefono: ventaDetalle.clienteTelefono || '',
      vendedorId: ventaDetalle.vendedorId || (usuarioActual?.id ? String(usuarioActual.id) : ''),
      agencia: ventaDetalle.agencia || 'SHALOM',
      agenciaOtro: ventaDetalle.agenciaOtro || '',
      destino: ventaDetalle.destino || '',
      fechaVenta: ventaDetalle.fechaVenta || getToday(),
      estadoEnvio: ventaDetalle.estadoEnvio || 'PENDIENTE',
      fechaDespacho: ventaDetalle.fechaDespacho || '',
      fechaCancelacion: ventaDetalle.fechaCancelacion || '',
      encargado: ventaDetalle.encargado || '',
      pVenta: Number(ventaDetalle.pVenta || 0),
      adelanto: ventaDetalle.adelanto || '',
      rastreoEstado: ventaDetalle.rastreoEstado || 'EN TRANSITO',
      ticket: ventaDetalle.ticket || '',
      guia: ventaDetalle.guia || '',
      retiro: ventaDetalle.retiro || '',
      notas: ventaDetalle.notas || ''
    });
    setProductos(ventaDetalle.productos || []);
    setRequerimientos(ventaDetalle.requerimientos || []);
    setRegalos(ventaDetalle.regalos || []);
    setRegaloRequerimientos(ventaDetalle.regaloRequerimientos || []);
    setModalOpen(true);
    setStep(1);
  };

  const registrarVenta = async () => {
    if (!formData.documento || !formData.vendedorId) {
      setError('Completa el documento. No se detecto vendedor logeado.');
      return;
    }
    if (formData.agencia === 'OTROS' && !formData.agenciaOtro.trim()) {
      setError('Indica la agencia (Otros).');
      return;
    }

    const baseVenta = {
      ...formData,
      agenciaOtro: formData.agencia === 'OTROS' ? formData.agenciaOtro.trim() : '',
      destino: formData.agencia === 'TIENDA' ? 'TIENDA' : formData.destino.trim(),
      productos,
      requerimientos,
      regalos,
      regaloRequerimientos,
      pVenta: Number(totalVenta || 0)
    };

    try {
      if (editId) {
        await ventasService.editar(editId, baseVenta);
      } else {
        await ventasService.crear(baseVenta);
      }
      await cargarVentas();
      cerrarModal();
    } catch (err) {
      console.error('Error guardando venta:', err);
      setError(err.response?.data?.error || 'Error al guardar venta');
    }
  };

  const avanzar = () => {
    if (step < 3) setStep(step + 1);
  };

  const retroceder = () => {
    if (step > 1) setStep(step - 1);
  };

  const onFormChange = (patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  return {
    consultaMensaje,
    consultando,
    error,
    modalOpen,
    step,
    avisoStock,
    editId,
    tabProductos,
    formData,
    setFormData,
    onFormChange,
    busquedaProducto,
    resultadosProducto,
    busquedaRequerimiento,
    resultadosRequerimiento,
    busquedaRegalo,
    resultadosRegalo,
    busquedaReqRegalo,
    resultadosReqRegalo,
    tabProductosModo,
    tabReqModo,
    tabRegalosModo,
    tabReqRegaloModo,
    kitsDisponibles,
    cargandoKits,
    errorKits,
    productos,
    requerimientos,
    regalos,
    regaloRequerimientos,
    requerimiento,
    regaloRequerimiento,
    sugerenciaRequerimiento,
    sugerenciaRegalo,
    setTabProductos,
    setTabProductosModo,
    setTabReqModo,
    setTabRegalosModo,
    setTabReqRegaloModo,
    setBusquedaProducto,
    setBusquedaRequerimiento,
    setBusquedaRegalo,
    setBusquedaReqRegalo,
    setResultadosRequerimiento,
    setResultadosReqRegalo,
    setProductos,
    setRequerimientos,
    setRegalos,
    setRegaloRequerimientos,
    setRequerimiento,
    setRegaloRequerimiento,
    handleConsultarDocumento,
    agregarProducto,
    agregarRequerimiento,
    agregarRegalo,
    agregarRegaloRequerimiento,
    agregarKitVenta,
    agregarKitRegalo,
    ajustarCantidadProductoStock,
    ajustarCantidadRegaloStock,
    actualizarItem,
    quitarItem,
    totalVenta,
    resetFormulario,
    cerrarModal,
    abrirModal,
    abrirEdicion,
    registrarVenta,
    avanzar,
    retroceder
  };
};

export default useVentaFormulario;
