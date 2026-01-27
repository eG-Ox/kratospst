import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  movimientosService,
  productosService,
  tiposMaquinasService
} from '../../../core/services/apiServices';
import '../styles/MovimientosPage.css';

const GestorInventarioPage = () => {
  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState('ingreso');
  const [codigo, setCodigo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [lectorSoportado, setLectorSoportado] = useState(true);
  const [scanActivo, setScanActivo] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const zxingRef = useRef(null);
  const zxingControlRef = useRef(null);
  const rafRef = useRef(null);
  const ultimoDetectadoRef = useRef(0);
  const scanActivoRef = useRef(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    return () => detenerCamara();
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
      const autoScanTimer = setTimeout(() => {
        iniciarEscaneo();
      }, 300);
      return () => clearTimeout(autoScanTimer);
    }
  }, [cameraActive]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [respProductos, respTipos] = await Promise.all([
        productosService.getAll(),
        tiposMaquinasService.getAll()
      ]);
      setProductos(respProductos.data);
      setTipos(respTipos.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const productoActual = useMemo(
    () => productos.find((prod) => prod.codigo === codigo),
    [productos, codigo]
  );

  const activarCamara = async () => {
    setError('');
    setScanActivoSeguro(false);
    try {
      if (!window.isSecureContext) {
        setError('Para usar la cámara en celular necesitas HTTPS. Abre el sitio en https:// o usa un túnel HTTPS.');
        return;
      }

      // Usar ZXing siempre para mejor compatibilidad
      detectorRef.current = null;
      if (!zxingRef.current) {
        zxingRef.current = new BrowserMultiFormatReader();
      }
      setLectorSoportado(true);

      setCameraActive(true);
    } catch (err) {
      console.error('Error accediendo a cámara:', err);
      setError('No se pudo acceder a la cámara');
      setCameraActive(false);
    }
  };

  const toggleEscaneoDesdeBoton = async () => {
    if (!cameraActive) {
      await activarCamara();
    }

    if (scanActivoRef.current) {
      detenerEscaneo();
      return;
    }

    iniciarEscaneo();
  };

  const setScanActivoSeguro = (value) => {
    scanActivoRef.current = value;
    setScanActivo(value);
  };

  const detenerEscaneo = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (zxingControlRef.current) {
      const control = zxingControlRef.current;
      zxingControlRef.current = null;
      if (typeof control.stop === 'function') {
        control.stop();
      } else if (typeof control.then === 'function') {
        control
          .then((resolved) => {
            if (resolved && typeof resolved.stop === 'function') {
              resolved.stop();
            }
          })
          .catch(() => {});
      }
    }
    if (zxingRef.current && typeof zxingRef.current.reset === 'function') {
      zxingRef.current.reset();
    }
    setScanActivoSeguro(false);
  };

  const detenerCamara = () => {
    detenerEscaneo();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const procesarCodigoDetectado = (valor) => {
    const ahora = Date.now();
    if (ahora - ultimoDetectadoRef.current > 1200) {
      ultimoDetectadoRef.current = ahora;
      setCodigo(valor);
      reproducirBeep();
      detenerCamara();
    }
  };

  const reproducirBeep = () => {
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
  };

  const iniciarEscaneo = () => {
    if (scanActivoRef.current) {
      return;
    }
    if (!videoRef.current) {
      return;
    }
    setScanActivoSeguro(true);

    if (zxingRef.current && videoRef.current) {
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
        if (control && typeof control.then === 'function') {
          control
            .then((resolved) => {
              zxingControlRef.current = resolved;
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Error iniciando ZXing:', err);
      }
    }
  };

  const obtenerTipoDefault = async () => {
    if (tipos.length > 0) {
      return tipos[0].id;
    }
    const response = await tiposMaquinasService.create({
      nombre: 'General',
      descripcion: 'Generado automáticamente'
    });
    setTipos((prev) => [...prev, response.data]);
    return response.data.id;
  };

  const crearProductoPorCodigo = async () => {
    const tipoId = await obtenerTipoDefault();
    const response = await productosService.create({
      codigo,
      tipo_maquina_id: tipoId,
      marca: 'N/A',
      descripcion: '',
      stock: 0,
      precio_compra: 0,
      precio_venta: 0,
      precio_minimo: 0,
      ficha_web: ''
    });
    return response.data.id;
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!codigo || !cantidad) {
      setError('Código y cantidad son requeridos');
      return;
    }

    try {
      const motivoFinal = (() => {
        if (motivo && numeroGuia) {
          return `${motivo} | Guia: ${numeroGuia}`;
        }
        if (motivo) {
          return motivo;
        }
        if (numeroGuia) {
          return `Guia: ${numeroGuia}`;
        }
        return null;
      })();

      let maquinaId = productoActual?.id;
      if (!maquinaId) {
        if (modo === 'salida') {
          setError('Producto no encontrado para salida');
          return;
        }
        maquinaId = await crearProductoPorCodigo();
      }

      const response = await movimientosService.registrar({
        maquina_id: maquinaId,
        tipo: modo,
        cantidad: parseInt(cantidad, 10),
        motivo: motivoFinal
      });

      setSuccess(`Movimiento registrado. Stock actual: ${response.data.nuevo_stock}`);
      setCantidad('');
      setMotivo('');
      setNumeroGuia('');
      await cargarDatos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error registrando movimiento:', err);
      setError(err.response?.data?.error || 'Error al registrar movimiento');
    }
  };

  return (
    <div className="movimientos-container">
      <div className="movimientos-header">
        <h1>Gestor de Inventario</h1>
        <p>Escanea códigos y registra ingresos o salidas</p>
      </div>

      <div className="modo-toggle">
        <button
          type="button"
          className={`btn-toggle ${modo === 'ingreso' ? 'active' : ''}`}
          onClick={() => setModo('ingreso')}
        >
          Ingreso
        </button>
        <button
          type="button"
          className={`btn-toggle ${modo === 'salida' ? 'active' : ''}`}
          onClick={() => setModo('salida')}
        >
          Salida
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <div className="loading">Cargando productos...</div>
      ) : (
        <div className="inventario-grid">
          <div className="inventario-panel">
            <div className="barcode-card">
              <label htmlFor="codigo">CODIGO</label>
              <div className="code-input-row">
                <input
                  id="codigo"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.trim())}
                  placeholder="Escanea o escribe el codigo"
                />
                <button
                  type="button"
                  className="btn-camera"
                  onClick={toggleEscaneoDesdeBoton}
                  aria-label="Abrir cámara y escanear"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 4.5h6l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2.8L9 4.5zm3 4.5a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 9zm0 2a2 2 0 1 1-.001 4.001A2 2 0 0 1 12 11z" />
                  </svg>
                </button>
              </div>

              <div className="producto-datos">
                {productoActual ? (
                  <>
                    <p>
                      <strong>Producto:</strong> {productoActual.marca || 'Sin marca'}
                    </p>
                    <p>
                      <strong>Descripcion:</strong> {productoActual.descripcion || 'Sin descripcion'}
                    </p>
                    <p>
                      <strong>Stock actual:</strong> {productoActual.stock}
                    </p>
                  </>
                ) : (
                  <p className="producto-vacio">
                    Producto no encontrado: se creará si es ingreso
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="inventario-panel">
            <form className="movimientos-form" onSubmit={handleRegistrar}>
              <div className="form-row">
                <div className="form-group">
                  <label>Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Motivo</label>
                  <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    <option value="">Selecciona un motivo</option>
                    <option value="VENTA">VENTA</option>
                    <option value="COMPRA">COMPRA</option>
                    <option value="CAMBIO DE CODIGO">CAMBIO DE CODIGO</option>
                    <option value="DEVOLUCIONES">DEVOLUCIONES</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Numero de guia (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 000-12345"
                    value={numeroGuia}
                    onChange={(e) => setNumeroGuia(e.target.value)}
                  />
                </div>
              </div>

              <div className="info-card">
                <h3>Resumen</h3>
                <p>
                  Código: <strong>{codigo || '-'}</strong>
                </p>
                <p>
                  Acción: <strong>{modo === 'ingreso' ? 'Ingreso' : 'Salida'}</strong>
                </p>
                <p>
                  Motivo: <strong>{motivo || (numeroGuia ? 'Guia registrada' : '-')}</strong>
                </p>
                <p>
                  Guia: <strong>{numeroGuia || '-'}</strong>
                </p>
                <p>
                  Stock actual:{' '}
                  <strong>{productoActual ? productoActual.stock : 'No registrado'}</strong>
                </p>
              </div>

              <button type="submit" className="btn-primary">
                Registrar {modo === 'ingreso' ? 'Ingreso' : 'Salida'}
              </button>
            </form>
          </div>
        </div>
      )}

      {cameraActive && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camara">
          <div className="camera-modal__backdrop" onClick={detenerCamara} />
          <div className="camera-modal__content">
            <div className="camera-modal__header">
              <h3>Escaner de codigo</h3>
              <button type="button" className="btn-link" onClick={detenerCamara}>
                Cerrar
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
              {lectorSoportado
                ? 'Escaneo automatico activado. Apunta el codigo al centro.'
                : 'Este navegador no soporta lector nativo. Escribe el codigo manualmente.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestorInventarioPage;
