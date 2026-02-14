import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ventasService } from '../../../core/services/apiServices';
import { getToday } from '../utils/ventasUtils';

const useVentasListado = ({ mountedRef } = {}) => {
  const internalMountedRef = useRef(true);
  const activeMountedRef = mountedRef || internalMountedRef;
  const ventasLoadingRef = useRef(false);
  const ventasPaginaRef = useRef(1);
  const ventasRequestRef = useRef(0);

  const [ventas, setVentas] = useState([]);
  const [ventasPagina, setVentasPagina] = useState(1);
  const [ventasHasMore, setVentasHasMore] = useState(true);
  const [ventasLoading, setVentasLoading] = useState(false);

  useEffect(() => {
    if (mountedRef) return undefined;
    internalMountedRef.current = true;
    return () => {
      internalMountedRef.current = false;
    };
  }, [mountedRef]);

  const cargarVentas = useCallback(async (append = false) => {
    if (append && ventasLoadingRef.current) return;
    const requestId = ++ventasRequestRef.current;
    try {
      ventasLoadingRef.current = true;
      setVentasLoading(true);
      const limite = 200;
      const pagina = append ? ventasPaginaRef.current + 1 : 1;
      const resp = await ventasService.listar({ limite, pagina, include_detalle: false });
      const data = resp.data || [];
      if (!activeMountedRef.current || requestId !== ventasRequestRef.current) return;
      if (append) {
        setVentas((prev) => [...prev, ...data]);
        setVentasPagina(pagina);
        ventasPaginaRef.current = pagina;
      } else {
        setVentas(data);
        setVentasPagina(1);
        ventasPaginaRef.current = 1;
      }
      setVentasHasMore(data.length === limite);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    } finally {
      if (activeMountedRef.current && requestId === ventasRequestRef.current) {
        ventasLoadingRef.current = false;
        setVentasLoading(false);
      }
    }
  }, [activeMountedRef]);

  useEffect(() => {
    cargarVentas(false);
  }, [cargarVentas]);

  const patchVenta = useCallback((id, patch) => {
    setVentas((prev) =>
      (prev || []).map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const actualizarVentaDetalle = useCallback((ventaDetalle) => {
    if (!ventaDetalle?.id) return;
    setVentas((prev) =>
      (prev || []).map((item) => (item.id === ventaDetalle.id ? { ...item, ...ventaDetalle } : item))
    );
  }, []);

  const handleEstadoEnvioChange = useCallback((venta, nuevoEstado) => {
    if (!venta) return;
    const pedidoListo = (venta.estadoPedido || 'PICKING') === 'PEDIDO_LISTO';
    if (!pedidoListo && (nuevoEstado === 'ENVIADO' || nuevoEstado === 'CANCELADO')) {
      alert('El pedido debe estar en PEDIDO_LISTO para enviar o cancelar.');
      return;
    }
    const now = getToday();
    const fechaDespacho =
      nuevoEstado === 'ENVIADO' || nuevoEstado === 'VISITA'
        ? venta.fechaDespacho || now
        : venta.fechaDespacho;
    const fechaCancelacion =
      nuevoEstado === 'CANCELADO'
        ? venta.fechaCancelacion || now
        : venta.fechaCancelacion;
    const rastreoEstado = nuevoEstado === 'CANCELADO' ? 'ENTREGADO' : venta.rastreoEstado;
    const payload = {
      estadoEnvio: nuevoEstado,
      fechaDespacho,
      fechaCancelacion,
      rastreoEstado
    };
    patchVenta(venta.id, payload);
    ventasService
      .actualizarEstado(venta.id, payload)
      .then(() => cargarVentas(false))
      .catch((err) => {
        console.error('Error actualizando estado de envio:', err);
        cargarVentas(false);
      });
  }, [cargarVentas, patchVenta]);

  const ventasListado = useMemo(() => ventas || [], [ventas]);
  const pendientesDia = useMemo(() => {
    return (ventas || []).filter((venta) => {
      const estado = venta.estadoEnvio || 'PENDIENTE';
      return estado === 'PENDIENTE';
    });
  }, [ventas]);

  return {
    ventas,
    ventasPagina,
    ventasHasMore,
    ventasLoading,
    ventasListado,
    pendientesDia,
    cargarVentas,
    actualizarVentaDetalle,
    handleEstadoEnvioChange,
    setVentas
  };
};

export default useVentasListado;
