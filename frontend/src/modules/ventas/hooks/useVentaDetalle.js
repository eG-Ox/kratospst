import { useCallback, useState } from 'react';
import { ventasService } from '../../../core/services/apiServices';

const ventaTieneDetalle = (venta) =>
  venta?.detalleIncluido === true ||
  Array.isArray(venta?.productos) ||
  Array.isArray(venta?.requerimientos) ||
  Array.isArray(venta?.regalos) ||
  Array.isArray(venta?.regaloRequerimientos);

const useVentaDetalle = (onVentaUpdate) => {
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [detalleError, setDetalleError] = useState('');

  const actualizarVentaDetalle = useCallback(
    (ventaDetalle) => {
      if (onVentaUpdate) {
        onVentaUpdate(ventaDetalle);
      }
    },
    [onVentaUpdate]
  );

  const obtenerVentaDetalle = useCallback(
    async (ventaId) => {
      const resp = await ventasService.obtener(ventaId);
      const data = resp.data || null;
      if (data) {
        actualizarVentaDetalle(data);
      }
      return data;
    },
    [actualizarVentaDetalle]
  );

  const abrirDetalleVenta = useCallback(
    async (venta) => {
      if (!venta) return;
      setDetalleError('');
      setDetalleVenta(venta);
      if (ventaTieneDetalle(venta)) {
        setDetalleCargando(false);
        return;
      }
      setDetalleCargando(true);
      try {
        const detalle = await obtenerVentaDetalle(venta.id);
        if (detalle) {
          setDetalleVenta(detalle);
        } else {
          setDetalleError('No se pudo cargar el detalle de la venta.');
        }
      } catch (err) {
        console.error('Error cargando detalle de venta:', err);
        setDetalleError('No se pudo cargar el detalle de la venta.');
      } finally {
        setDetalleCargando(false);
      }
    },
    [obtenerVentaDetalle]
  );

  const resetDetalle = useCallback(() => {
    setDetalleVenta(null);
    setDetalleCargando(false);
    setDetalleError('');
  }, []);

  return {
    detalleVenta,
    detalleCargando,
    detalleError,
    abrirDetalleVenta,
    obtenerVentaDetalle,
    resetDetalle,
    setDetalleVenta,
    ventaTieneDetalle
  };
};

export default useVentaDetalle;
