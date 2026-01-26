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
    try {
      if (!window.isSecureContext) {
        setError('Para usar la cámara en celular necesitas HTTPS. Abre el sitio en https:// o usa un túnel HTTPS.');
        return;
      }

      if ('BarcodeDetector' in window) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'code_39', 'qr_code']
        });
        setLectorSoportado(true);
      } else {
        if (!zxingRef.current) {
          zxingRef.current = new BrowserMultiFormatReader();
        }
        setLectorSoportado(true);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Error accediendo a cámara:', err);
      setError('No se pudo acceder a la cámara');
      setCameraActive(false);
    }
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
      zxingControlRef.current.stop();
      zxingControlRef.current = null;
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
      detenerEscaneo();
    }
  };

  const iniciarEscaneo = () => {
    if (!cameraActive || scanActivoRef.current) {
      return;
    }
    setScanActivoSeguro(true);

    if (detectorRef.current && videoRef.current) {
      const escanear = async () => {
        try {
          if (!scanActivoRef.current) {
            return;
          }
          if (videoRef.current.readyState >= 2) {
            const detections = await detectorRef.current.detect(videoRef.current);
            if (detections.length > 0) {
              procesarCodigoDetectado(detections[0].rawValue);
              return;
            }
          }
        } catch (err) {
          console.error('Error detectando código:', err);
        }
        rafRef.current = requestAnimationFrame(escanear);
      };

      rafRef.current = requestAnimationFrame(escanear);
      return;
    }

    if (zxingRef.current && videoRef.current) {
      zxingControlRef.current = zxingRef.current.decodeFromVideoElement(
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
        motivo: motivo || null
      });

      setSuccess(`Movimiento registrado. Stock actual: ${response.data.nuevo_stock}`);
      setCantidad('');
      setMotivo('');
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
            <div className="camera-card">
              <div className="camera-header">
                <h2>Cámara</h2>
                {cameraActive ? (
                  <div className="camera-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={iniciarEscaneo}
                      disabled={scanActivo}
                    >
                      {scanActivo ? 'Escaneando...' : 'Escanear una vez'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={detenerCamara}>
                      Detener cámara
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn-primary" onClick={activarCamara}>
                    Activar cámara
                  </button>
                )}
              </div>
              <div className="camera-preview">
                <video ref={videoRef} autoPlay playsInline muted />
                {!cameraActive && (
                  <div className="camera-placeholder">Activa la cámara para escanear</div>
                )}
              </div>
              <p className="camera-note">
                {lectorSoportado
                  ? 'Presiona "Escanear una vez" para capturar un código.'
                  : 'Este navegador no soporta lector nativo. Puedes escribir el código manualmente.'}
              </p>
            </div>

            <div className="barcode-card">
              <label htmlFor="codigo">Código de barras / producto</label>
              <input
                id="codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.trim())}
                placeholder="Escanea o escribe el código"
              />
              <div className="barcode-status">
                {productoActual ? (
                  <span>
                    Producto encontrado: {productoActual.marca} | Stock actual: {productoActual.stock}
                  </span>
                ) : (
                  <span>Producto no encontrado: se creará si es ingreso</span>
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
                  <input
                    type="text"
                    placeholder={modo === 'ingreso' ? 'Compra, devolución...' : 'Venta, uso...'}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
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
    </div>
  );
};

export default GestorInventarioPage;
