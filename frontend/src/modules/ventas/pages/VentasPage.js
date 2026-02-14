import React, { useEffect, useRef, useState } from 'react';
import { usuariosService, ventasService } from '../../../core/services/apiServices';
import VentaDetalleModal from '../components/VentaDetalleModal';
import VentaFormModal from '../components/VentaFormModal';
import VentasListadoTable from '../components/VentasListadoTable';
import useVentaDetalle from '../hooks/useVentaDetalle';
import useVentaFormulario from '../hooks/useVentaFormulario';
import useVentaImpresion from '../hooks/useVentaImpresion';
import useVentasListado from '../hooks/useVentasListado';
import { agencias, estadosEnvio } from '../utils/ventasUtils';
import '../styles/VentasPage.css';

const VentasPage = () => {
  const mountedRef = useRef(true);
  const [usuariosVentas, setUsuariosVentas] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);

  const {
    ventas,
    ventasHasMore,
    ventasLoading,
    ventasListado,
    pendientesDia,
    cargarVentas,
    actualizarVentaDetalle,
    handleEstadoEnvioChange
  } = useVentasListado({ mountedRef });

  const {
    detalleVenta,
    detalleCargando,
    detalleError,
    abrirDetalleVenta,
    obtenerVentaDetalle,
    resetDetalle,
    ventaTieneDetalle
  } = useVentaDetalle(actualizarVentaDetalle);

  const ventaForm = useVentaFormulario({
    mountedRef,
    usuarioActual,
    cargarVentas,
    obtenerVentaDetalle,
    ventaTieneDetalle
  });

  const { hojaCargando, abrirRotulo, abrirHojaRequerimiento } = useVentaImpresion({
    ventas,
    pendientesDia,
    usuariosVentas,
    obtenerVentaDetalle,
    ventaTieneDetalle
  });

  useEffect(() => {
    mountedRef.current = true;

    const cargarUsuarios = async () => {
      try {
        const resp = await usuariosService.listar();
        const data = Array.isArray(resp.data) ? resp.data : [];
        if (!mountedRef.current) return;
        setUsuariosVentas(data.filter((user) => user.rol === 'ventas'));
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };

    cargarUsuarios();

    try {
      const rawUsuario = localStorage.getItem('usuario');
      if (rawUsuario) {
        setUsuarioActual(JSON.parse(rawUsuario));
      }
    } catch (err) {
      console.error('Error leyendo usuario actual:', err);
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const eliminarVenta = async (id) => {
    const confirmar = window.confirm('Deseas eliminar esta venta?');
    if (!confirmar) return;
    try {
      await ventasService.eliminar(id);
      await cargarVentas();
    } catch (err) {
      console.error('Error eliminando venta:', err);
    }
  };

  return (
    <div className="ventas-container">
      <div className="page-header">
        <div className="page-header__title">
          <h5>Control de Ventas</h5>
          <span className="page-header__subtitle">Registro de ventas y control de envios</span>
        </div>
        <div className="page-header__actions">
          <span className="status-pill">Ventas: {ventasListado.length}</span>
          <button
            type="button"
            className="icon-btn icon-btn--view"
            onClick={abrirHojaRequerimiento}
            title="Hoja de requerimiento"
            aria-label="Hoja de requerimiento"
            disabled={hojaCargando}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1.5V9h4.5L14 4.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--edit"
            onClick={ventaForm.abrirModal}
            title="Nueva venta"
            aria-label="Nueva venta"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 5h2v14h-2z" />
              <path d="M5 11h14v2H5z" />
            </svg>
          </button>
        </div>
      </div>

      <VentasListadoTable
        ventasListado={ventasListado}
        usuariosVentas={usuariosVentas}
        estadosEnvio={estadosEnvio}
        ventasHasMore={ventasHasMore}
        ventasLoading={ventasLoading}
        onCargarMas={() => cargarVentas(true)}
        onEstadoEnvioChange={handleEstadoEnvioChange}
        onAbrirEdicion={ventaForm.abrirEdicion}
        onAbrirDetalle={abrirDetalleVenta}
        onAbrirRotulo={abrirRotulo}
        onEliminar={eliminarVenta}
      />

      <VentaDetalleModal
        venta={detalleVenta}
        cargando={detalleCargando}
        error={detalleError}
        onClose={resetDetalle}
      />

      {ventaForm.modalOpen && (
        <VentaFormModal
          title={ventaForm.editId ? `Editar venta #${ventaForm.editId}` : 'Nueva venta'}
          onClose={ventaForm.cerrarModal}
          step={ventaForm.step}
          error={ventaForm.error}
          avisoStock={ventaForm.avisoStock}
          editId={ventaForm.editId}
          onBack={ventaForm.retroceder}
          onNext={ventaForm.avanzar}
          onSave={ventaForm.registrarVenta}
          formData={ventaForm.formData}
          setFormData={ventaForm.setFormData}
          consultaMensaje={ventaForm.consultaMensaje}
          consultando={ventaForm.consultando}
          usuarioActual={usuarioActual}
          agencias={agencias}
          estadosEnvio={estadosEnvio}
          onConsultarDocumento={ventaForm.handleConsultarDocumento}
          onFormChange={ventaForm.onFormChange}
          tabProductos={ventaForm.tabProductos}
          tabProductosModo={ventaForm.tabProductosModo}
          tabReqModo={ventaForm.tabReqModo}
          busquedaProducto={ventaForm.busquedaProducto}
          resultadosProducto={ventaForm.resultadosProducto}
          busquedaRequerimiento={ventaForm.busquedaRequerimiento}
          resultadosRequerimiento={ventaForm.resultadosRequerimiento}
          cargandoKits={ventaForm.cargandoKits}
          errorKits={ventaForm.errorKits}
          kitsDisponibles={ventaForm.kitsDisponibles}
          productos={ventaForm.productos}
          setProductos={ventaForm.setProductos}
          requerimientos={ventaForm.requerimientos}
          setTabProductos={ventaForm.setTabProductos}
          setTabProductosModo={ventaForm.setTabProductosModo}
          setTabReqModo={ventaForm.setTabReqModo}
          setBusquedaProducto={ventaForm.setBusquedaProducto}
          setBusquedaRequerimiento={ventaForm.setBusquedaRequerimiento}
          setResultadosRequerimiento={ventaForm.setResultadosRequerimiento}
          agregarProducto={ventaForm.agregarProducto}
          agregarKitVenta={ventaForm.agregarKitVenta}
          agregarRequerimiento={ventaForm.agregarRequerimiento}
          actualizarItem={ventaForm.actualizarItem}
          quitarItem={ventaForm.quitarItem}
          setRequerimientos={ventaForm.setRequerimientos}
          setRequerimiento={ventaForm.setRequerimiento}
          requerimiento={ventaForm.requerimiento}
          sugerenciaRequerimiento={ventaForm.sugerenciaRequerimiento}
          ajustarCantidadProductoStock={ventaForm.ajustarCantidadProductoStock}
          tabRegalosModo={ventaForm.tabRegalosModo}
          setTabRegalosModo={ventaForm.setTabRegalosModo}
          busquedaRegalo={ventaForm.busquedaRegalo}
          setBusquedaRegalo={ventaForm.setBusquedaRegalo}
          resultadosRegalo={ventaForm.resultadosRegalo}
          agregarRegalo={ventaForm.agregarRegalo}
          agregarKitRegalo={ventaForm.agregarKitRegalo}
          regalos={ventaForm.regalos}
          setRegalos={ventaForm.setRegalos}
          tabReqRegaloModo={ventaForm.tabReqRegaloModo}
          setTabReqRegaloModo={ventaForm.setTabReqRegaloModo}
          busquedaReqRegalo={ventaForm.busquedaReqRegalo}
          setBusquedaReqRegalo={ventaForm.setBusquedaReqRegalo}
          resultadosReqRegalo={ventaForm.resultadosReqRegalo}
          setResultadosReqRegalo={ventaForm.setResultadosReqRegalo}
          setRegaloRequerimiento={ventaForm.setRegaloRequerimiento}
          regaloRequerimiento={ventaForm.regaloRequerimiento}
          sugerenciaRegalo={ventaForm.sugerenciaRegalo}
          agregarRegaloRequerimiento={ventaForm.agregarRegaloRequerimiento}
          regaloRequerimientos={ventaForm.regaloRequerimientos}
          setRegaloRequerimientos={ventaForm.setRegaloRequerimientos}
          ajustarCantidadRegaloStock={ventaForm.ajustarCantidadRegaloStock}
        />
      )}
    </div>
  );
};

export default VentasPage;
