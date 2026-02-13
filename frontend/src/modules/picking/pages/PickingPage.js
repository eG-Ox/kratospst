import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ventasService } from '../../../core/services/apiServices';
import { parseQRPayload } from '../../../shared/utils/qr';
import '../styles/PickingPage.css';

const PickingPage = () => {
  const [ventasPendientes, setVentasPendientes] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanActivo, setScanActivo] = useState(false);

  const getTipoLabel = useCallback((tipo) => {
    switch (String(tipo || '').toLowerCase()) {
      case 'producto':
        return 'Producto';
      case 'regalo':
        return 'Regalo';
      case 'requerimiento':
        return 'Requerimiento';
      case 'regalo_requerimiento':
        return 'Req. Regalo';
      default:
        return 'Item';
    }
  }, []);

  const isNativeScannerAvailable = () =>
    typeof window !== 'undefined' &&
    window.Android &&
    typeof window.Android.openQrScanner === 'function';

  const videoRef = useRef(null);
  const zxingRef = useRef(null);
  const zxingControlRef = useRef(null);
  const streamRef = useRef(null);
  const scanActivoRef = useRef(false);
  const ultimoTextoRef = useRef('');
  const ultimoTextoAtRef = useRef(0);

  const reproducirBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
      oscillator.onended = () => {
        audioCtx.close();
      };
    } catch (err) {
      // sin audio disponible
    }
  }, []);

  const cargarPendientes = useCallback(async (params = {}) => {
    try {
      setCargando(true);
      setError('');
      const resp = await ventasService.pickingPendientes(params);
      setVentasPendientes(resp.data || []);
    } catch (err) {
      console.error('Error cargando picking:', err);
      setError('No se pudo cargar los pedidos pendientes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  const detenerEscaneo = useCallback(() => {
    scanActivoRef.current = false;
    setScanActivo(false);
    if (zxingControlRef.current) {
      const control = zxingControlRef.current;
      zxingControlRef.current = null;
      if (typeof control.stop === 'function') {
        control.stop();
      } else if (typeof control.then === 'function') {
        control.then((resolved) => resolved?.stop?.()).catch(() => {});
      }
    }
    if (zxingRef.current && typeof zxingRef.current.reset === 'function') {
      zxingRef.current.reset();
    }
  }, []);

  const detenerCamara = useCallback(() => {
    detenerEscaneo();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, [detenerEscaneo]);

  const confirmarSalida = useCallback(async (item) => {
    try {
      setError('');
      setMensaje('');
      await ventasService.confirmarPicking({
        detalleId: item.detalleId,
        codigo: item.codigo,
        ventaId: ventaSeleccionada?.ventaId,
        cantidad: 1
      });
      setMensaje('Salida registrada. Pedido actualizado.');
      setItemSeleccionado(null);
      setVentasPendientes((prev) =>
        prev.map((venta) => {
          const items = (venta.items || []).map((current) => {
            if (current.detalleId !== item.detalleId) return current;
            const nuevaCantidadPicked = Math.min(
              Number(current.cantidad || 0),
              Number(current.cantidadPicked || 0) + 1
            );
            const pendiente = Math.max(Number(current.cantidad || 0) - nuevaCantidadPicked, 0);
            return {
              ...current,
              cantidadPicked: nuevaCantidadPicked,
              pendiente
            };
          });
          const pendientesRestantes = items.filter((it) => it.pendiente > 0);
          const sinStockPendiente = Number(venta.pendientesSinStock || 0);
          const actualizado = {
            ...venta,
            items,
            estadoPedido:
              pendientesRestantes.length === 0 && sinStockPendiente === 0
                ? 'PEDIDO_LISTO'
                : venta.estadoPedido
          };
          if (ventaSeleccionada?.ventaId === venta.ventaId) {
            setVentaSeleccionada(actualizado);
          }
          return actualizado;
        })
      );
    } catch (err) {
      console.error('Error confirmando picking:', err);
      setError(err.response?.data?.error || 'No se pudo confirmar la salida.');
    }
  }, [ventaSeleccionada]);

  const procesarCodigoDetectado = useCallback(
    (valor) => {
      const ahora = Date.now();
      if (valor === ultimoTextoRef.current && ahora - ultimoTextoAtRef.current < 1200) {
        return;
      }
      ultimoTextoRef.current = valor;
      ultimoTextoAtRef.current = ahora;
      const parsed = parseQRPayload(valor);
      const normalizeCode = (value) =>
        String(value || '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');
      let code = '';
      if (parsed.ok && parsed.data?.codigo) {
        code = parsed.data.codigo;
      } else {
        const raw = String(valor || '').trim();
        const tokens = raw
          .replace(/\r/g, '')
          .split(/[\n,;/\s]+/g)
          .map((item) => item.trim())
          .filter(Boolean);
        code = tokens[0] || raw;
      }
      if (!code) {
        setError(parsed.error || 'QR invalido');
        return;
      }
      const normalizedCode = normalizeCode(code);
      setCodigo(code);
      if (itemSeleccionado) {
        const normalizedItem = normalizeCode(itemSeleccionado.codigo);
        const rawNormalized = normalizeCode(valor);
        const matches =
          normalizedCode === normalizedItem ||
          rawNormalized.includes(normalizedItem);
        if (!matches) {
          setError('ERROR NO CORRESPONDE AL PEDIDO');
          detenerCamara();
        } else {
          reproducirBeep();
          confirmarSalida(itemSeleccionado);
          detenerCamara();
        }
      } else {
        reproducirBeep();
        cargarPendientes({ codigo: code });
        detenerCamara();
      }
    },
    [cargarPendientes, confirmarSalida, detenerCamara, itemSeleccionado, reproducirBeep]
  );

  const activarCamara = useCallback(async () => {
    setError('');
    ultimoTextoRef.current = '';
    ultimoTextoAtRef.current = 0;
    if (!window.isSecureContext) {
      setError('Para usar la camara en celular necesitas HTTPS.');
      return;
    }
    if (!zxingRef.current) {
      zxingRef.current = new BrowserMultiFormatReader();
    }
    setCameraActive(true);
  }, []);

  const iniciarEscaneo = useCallback(() => {
    if (scanActivoRef.current) return;
    if (!videoRef.current || !zxingRef.current) return;
    scanActivoRef.current = true;
    setScanActivo(true);
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const control = zxingRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error) => {
          if (result && scanActivoRef.current) {
            procesarCodigoDetectado(result.getText());
            return;
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('Error ZXing:', error);
          }
        }
      );
      zxingControlRef.current = control;
    } catch (err) {
      console.error('Error iniciando camara:', err);
      setError('No se pudo acceder a la camara. Revisa permisos del navegador.');
      setCameraActive(false);
    }
  }, [procesarCodigoDetectado]);

  const toggleEscaneoDesdeBoton = useCallback(async () => {
    if (isNativeScannerAvailable()) {
      window.Android.openQrScanner();
      return;
    }
    if (!cameraActive) {
      await activarCamara();
    }
    if (scanActivoRef.current) {
      detenerEscaneo();
      return;
    }
    iniciarEscaneo();
  }, [activarCamara, cameraActive, detenerEscaneo, iniciarEscaneo]);

  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, [detenerCamara]);

  useEffect(() => {
    const handler = (value) => {
      if (!value) return;
      procesarCodigoDetectado(String(value));
    };
    window.handleNativeQr = handler;
    return () => {
      if (window.handleNativeQr === handler) {
        delete window.handleNativeQr;
      }
    };
  }, [procesarCodigoDetectado]);

  useEffect(() => {
    if (!cameraActive) return undefined;
    const timeout = setTimeout(() => iniciarEscaneo(), 150);
    return () => clearTimeout(timeout);
  }, [cameraActive, iniciarEscaneo]);

  const ventasFiltradas = useMemo(() => {
    if (!codigo.trim()) return ventasPendientes;
    return ventasPendientes.filter((venta) =>
      (venta.items || []).some((item) => item.codigo === codigo.trim())
    );
  }, [codigo, ventasPendientes]);

  const handleBuscar = async () => {
    if (!codigo.trim()) {
      await cargarPendientes();
      return;
    }
    await cargarPendientes({ codigo: codigo.trim() });
  };

  const seleccionarVenta = (venta) => {
    setVentaSeleccionada(venta);
    setItemSeleccionado(null);
  };

  const pendientesVisibles = useMemo(
    () => (ventaSeleccionada?.items || []).filter((item) => item.pendiente > 0),
    [ventaSeleccionada]
  );
  const pendientesSinStock = Number(ventaSeleccionada?.pendientesSinStock || 0);

  const cerrarPedido = async () => {
    if (!ventaSeleccionada) return;
    try {
      setError('');
      await ventasService.cerrarPedido({ ventaId: ventaSeleccionada.ventaId });
      setVentasPendientes((prev) => prev.filter((venta) => venta.ventaId !== ventaSeleccionada.ventaId));
      setVentaSeleccionada(null);
      setMensaje('Pedido cerrado y marcado como PEDIDO_LISTO.');
    } catch (err) {
      console.error('Error cerrando pedido:', err);
      setError(err.response?.data?.error || 'No se pudo cerrar el pedido.');
    }
  };

  return (
    <div className="picking-container">
      <div className="page-header">
        <div className="page-header__title">
          <h5>Picking de ventas</h5>
          <span className="page-header__subtitle">Escanea y registra la salida de productos</span>
        </div>
        <div className="page-header__actions">
          <span className="status-pill">Pendientes: {ventasPendientes.length}</span>
        </div>
      </div>

      <div className="picking-layout">
        <div className="picking-card">
          <div className="picking-card__header">
            <h3>Pedidos pendientes</h3>
            <div className="header-actions">
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Buscar por codigo"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBuscar();
                }}
              />
              <button type="button" className="btn-primary" onClick={handleBuscar}>
                Buscar
              </button>
              <button type="button" className="btn-secondary" onClick={() => cargarPendientes()}>
                Actualizar
              </button>
            </div>
          </div>
          {cargando ? (
            <div className="empty-message">Cargando pedidos...</div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="empty-message">No hay pedidos pendientes.</div>
          ) : (
            <div className="picking-list">
              {ventasFiltradas.map((venta) => (
                <button
                  type="button"
                  key={venta.ventaId}
                  className={`picking-venta ${ventaSeleccionada?.ventaId === venta.ventaId ? 'active' : ''}`}
                  onClick={() => seleccionarVenta(venta)}
                >
                  <div>
                    <strong>Venta #{venta.ventaId}</strong>
                    <span>{venta.clienteNombre || '-'}</span>
                  </div>
                  <div className={`pedido-pill ${String(venta.estadoPedido || 'PICKING').toLowerCase()}`}>
                    {venta.estadoPedido || 'PICKING'}
                  </div>
                  <div className="picking-venta__meta">
                    <span>{venta.documento || '-'}</span>
                    <span>{venta.agencia} {venta.destino ? `- ${venta.destino}` : ''}</span>
                    <span>{venta.fechaVenta || '-'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="picking-card">
          <div className="picking-card__header">
            <h3>Items del pedido</h3>
          </div>
          {!ventaSeleccionada ? (
            <div className="empty-message">Selecciona una venta para ver sus productos.</div>
          ) : (
            <div className="picking-items">
              {pendientesVisibles.length === 0 ? (
                <div className="empty-message">
                  {pendientesSinStock > 0 ? (
                    <span>Sin stock para picking. Pendientes por compra: {pendientesSinStock}.</span>
                  ) : (
                    <>
                      <span>Todos los items fueron pickeados.</span>
                      <button type="button" className="btn-primary" onClick={cerrarPedido}>
                        Cerrar pedido
                      </button>
                    </>
                  )}
                </div>
              ) : null}
              {pendientesVisibles.map((item) => (
                <div className="picking-item" key={item.detalleId}>
                  <div>
                    <div className="picking-item__title">
                      <strong>{item.codigo}</strong>
                      {item.tipo ? (
                        <span className={`picking-tag picking-tag--${String(item.tipo).toLowerCase()}`}>
                          {getTipoLabel(item.tipo)}
                        </span>
                      ) : null}
                    </div>
                    <span>{item.descripcion}</span>
                  </div>
                  <div className="picking-item__stats">
                    <span>Pendiente: {item.pendiente}</span>
                    <span>Stock: {item.stock ?? '-'}</span>
                  </div>
                  <div className="picking-item__actions">
                    <button
                      type="button"
                      className="btn-camera"
                      aria-label="Escanear codigo"
                      onClick={() => {
                        setItemSeleccionado(item);
                        toggleEscaneoDesdeBoton();
                      }}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 3a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 10z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          {mensaje && <div className="alert alert-success">{mensaje}</div>}
        </div>
      </div>

      {cameraActive && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camara">
          <div className="camera-modal__backdrop" onClick={detenerCamara} />
          <div className="camera-modal__content">
            <div className="camera-modal__header">
              <h3>Escaner de codigo</h3>
              <button type="button" className="btn-icon" onClick={detenerCamara}>
                X
              </button>
            </div>
            <div className="camera-modal__preview">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={iniciarEscaneo}
                onCanPlay={iniciarEscaneo}
              />
              <div className="scan-overlay" aria-hidden="true">
                <div className="scan-cross" />
                <div className="scan-line" />
              </div>
            </div>
            <p className="camera-note">
              {itemSeleccionado
                ? `Escaneando ${itemSeleccionado.codigo}... (1 escaneo = 1 salida)`
                : 'Escanea el codigo del producto.'}
              {scanActivo ? ' Escaneo activo.' : ''}
            </p>
            {error && <div className="camera-error">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PickingPage;
