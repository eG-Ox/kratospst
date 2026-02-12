import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { movimientosService, productosService, tiposMaquinasService, marcasService } from '../../../core/services/apiServices';
import { parseQRPayload } from '../../../shared/utils/qr';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/MovimientosPage.css';

const IngresosPage = ({ usuario }) => {
  const mountedRef = useMountedRef();
  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('Compra a proveedor');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [qrData, setQrData] = useState(null);

  const isNativeScannerAvailable = () =>
    typeof window !== 'undefined' &&
    window.Android &&
    typeof window.Android.openQrScanner === 'function';

  const videoRef = useRef(null);
  const zxingRef = useRef(null);
  const zxingControlRef = useRef(null);
  const ultimoDetectadoRef = useRef(0);
  const ultimoTextoRef = useRef('');
  const ultimoTextoAtRef = useRef(0);
  const scanActivoRef = useRef(false);

  useEffect(() => {
    cargarDatos();
    return () => {
      detenerEscaneo();
    };
  }, []);

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

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [respProductos, respTipos, respMarcas] = await Promise.all([
        productosService.getAll(),
        tiposMaquinasService.getAll(),
        marcasService.getAll()
      ]);
      if (!mountedRef.current) return;
      setProductos(respProductos.data);
      setTipos(respTipos.data);
      setMarcas(respMarcas.data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      if (mountedRef.current) {
        setError('Error al cargar productos');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const normalizarMarcaCodigo = (value) => String(value || '').trim().toUpperCase();
  const normalizarCodigo = (value) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

  const marcasMap = useMemo(() => {
    const map = {};
    (marcas || []).forEach((marca) => {
      const code = normalizarMarcaCodigo(marca.codigo);
      if (code) {
        map[code] = marca.nombre;
      }
    });
    return map;
  }, [marcas]);

  const resolverMarcaCodigo = (value) => {
    const code = normalizarMarcaCodigo(value);
    return marcasMap[code] || value || '';
  };

  const extraerCodigoDesdeTexto = (texto) => {
    const raw = String(texto || '').trim();
    if (!raw) return '';
    const tokens = raw
      .replace(/\r/g, '')
      .split(/[\n,;\/\s]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
    return tokens[0] || raw;
  };

  const parsearQR = (textoQR) => {
    const parsed = parseQRPayload(textoQR);
    if (!parsed.ok) {
      setQrData(null);
      return { codigo: extraerCodigoDesdeTexto(textoQR), partial: true };
    }
    if (parsed.partial) {
      setQrData(null);
      return { codigo: parsed.data.codigo, partial: true };
    }
    const marcaNormalizada = resolverMarcaCodigo(parsed.data?.marca);
    const resolved = {
      ...parsed.data,
      marca: marcaNormalizada,
      marca_codigo: parsed.data?.marca
    };
    setQrData(resolved);
    return resolved;
  };

  const obtenerTipoDefault = async () => {
    if (tipos.length > 0) {
      return tipos[0].id;
    }
    const response = await tiposMaquinasService.create({
      nombre: 'General',
      descripcion: 'Generado automáticamente'
    });
    if (mountedRef.current) {
      setTipos((prev) => [...prev, response.data]);
    }
    return response.data.id;
  };

  const obtenerTipoPorNombre = async (nombre) => {
    const nombreNormalizado = String(nombre || '').trim();
    if (!nombreNormalizado) {
      return obtenerTipoDefault();
    }
    const existente = tipos.find(
      (tipo) => String(tipo.nombre || '').toLowerCase() === nombreNormalizado.toLowerCase()
    );
    if (existente) return existente.id;
    const response = await tiposMaquinasService.create({
      nombre: nombreNormalizado,
      descripcion: 'Creado desde QR'
    });
    if (mountedRef.current) {
      setTipos((prev) => [...prev, response.data]);
    }
    return response.data.id;
  };

  const crearProductoDesdeQR = async (data) => {
    const tipoId = await obtenerTipoPorNombre(data.tipo_maquina);
    const ubicacionFinal = data?.ubicacion && String(data.ubicacion).trim() ? data.ubicacion : 'H1';
    const marcaFinal = resolverMarcaCodigo(data?.marca);
    const response = await productosService.create({
      codigo: data.codigo,
      tipo_maquina_id: tipoId,
      marca: marcaFinal,
      descripcion: data.descripcion,
      ubicacion: ubicacionFinal,
      stock: 0,
      precio_compra: 0,
      precio_venta: 0,
      precio_minimo: 0,
      ficha_web: ''
    });
    return response.data.id;
  };

  const procesarCodigoDetectado = useCallback((valor) => {
    const ahora = Date.now();
    if (valor === ultimoTextoRef.current && ahora - ultimoTextoAtRef.current < 2500) {
      return;
    }
    ultimoTextoRef.current = valor;
    ultimoTextoAtRef.current = ahora;
    if (ahora - ultimoDetectadoRef.current > 1200) {
      ultimoDetectadoRef.current = ahora;
      procesarIngreso(valor);
      reproducirBeep();
    }
  }, []);

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
    } catch (err) {
      // sin audio
    }
  };

  const procesarIngreso = async (valor) => {
    try {
      setError('');
      const parsed = parsearQR(valor);
      const codigoDetectado = parsed?.codigo || extraerCodigoDesdeTexto(valor);
      if (!codigoDetectado) {
      if (mountedRef.current) {
        setError('Codigo invalido');
      }
        return;
      }

      if (parsed && !parsed.partial) {
        const productoExistente = productos.find(
          (p) => normalizarCodigo(p.codigo) === normalizarCodigo(parsed.codigo)
        );
        if (!productoExistente) {
          const confirmar = window.confirm(
            `?Crear nuevo producto?

C?digo: ${parsed.codigo}
Marca: ${parsed.marca}
Tipo: ${parsed.tipo_maquina}
Descripci?n: ${parsed.descripcion}
Ubicaci?n: ${parsed.ubicacion}`
          );
          if (!confirmar) {
            if (mountedRef.current) {
              setError('Creaci?n cancelada');
            }
            return;
          }
          await crearProductoDesdeQR(parsed);
          await cargarDatos();
          if (mountedRef.current) {
            setCodigo(parsed.codigo);
            setCantidad('1');
            setSuccess(`?? Producto creado: ${parsed.codigo}`);
            setTimeout(() => {
              if (mountedRef.current) {
                setSuccess('');
              }
            }, 2000);
          }
          return;
        }
        if (mountedRef.current) {
          setCodigo(parsed.codigo);
          setCantidad('1');
        }
        return;
      }

      const producto = productos.find(
        (p) => normalizarCodigo(p.codigo) === normalizarCodigo(codigoDetectado)
      );
      if (producto) {
        if (mountedRef.current) {
          setCodigo(codigoDetectado);
          setCantidad('1');
          setError('');
        }
      } else {
        if (mountedRef.current) {
          setError('Producto no encontrado. Escanea QR completo para crear nuevo.');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      if (mountedRef.current) {
        setError('Error procesando QR');
      }
    }
  };

  const iniciarCamara = async () => {
    if (isNativeScannerAvailable()) {
      window.Android.openQrScanner();
      return;
    }
    try {
      setCameraActive(true);
      if (!zxingRef.current) {
        zxingRef.current = new BrowserMultiFormatReader();
      }
      
      if (!videoRef.current) {
        setTimeout(iniciarCamara, 100);
        return;
      }

      scanActivoRef.current = true;
      const control = zxingRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result && scanActivoRef.current) {
            procesarCodigoDetectado(result.getText());
          }
        }
      );
      zxingControlRef.current = control;
    } catch (err) {
      console.error('Error iniciando cámara:', err);
      setError('No se pudo acceder a la cámara');
      setCameraActive(false);
    }
  };

  const detenerEscaneo = () => {
    scanActivoRef.current = false;
    if (zxingControlRef.current && typeof zxingControlRef.current.stop === 'function') {
      try {
        zxingControlRef.current.stop();
      } catch (err) {
        console.error('Error deteniendo escaneo:', err);
      }
    }
    zxingControlRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const detenerCamara = () => {
    detenerEscaneo();
    if (mountedRef.current) {
      setCameraActive(false);
    }
  };

  const handleRegistrarIngreso = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!codigo || !cantidad) {
      setError('Código y cantidad son requeridos');
      return;
    }

    try {
      const producto = productos.find(p => p.codigo === codigo);
      if (!producto) {
        setError('Producto no encontrado');
        return;
      }

      const motivoFinal = numeroGuia 
        ? `${motivo} | Guia: ${numeroGuia}`
        : motivo;

      await movimientosService.registrar({
        maquina_id: producto.id,
        tipo: 'ingreso',
        cantidad: parseInt(cantidad),
        motivo: motivoFinal
      });

      setSuccess(`✓ Ingreso registrado: ${cantidad} unidades`);
      setCodigo('');
      setCantidad('1');
      setNumeroGuia('');
      setQrData(null);
      await cargarDatos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error:', err);
      if (mountedRef.current) {
        setError(err.response?.data?.error || 'Error al registrar ingreso');
      }
    }
  };

  const productoActual = useMemo(
    () => productos.find(p => p.codigo === codigo),
    [productos, codigo]
  );

  return (
    <div className="movimientos-container">
      <div className="movimientos-header">
        <h1>📥 Registrar Ingresos</h1>
        <p>Registra la entrada de nuevas máquinas al inventario</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="movimientos-content">
        <div className="camera-section">
          <h2>Escanear QR/Código</h2>
          {!cameraActive ? (
            <button className="btn-camera" onClick={iniciarCamara}>
              📷 Iniciar Cámara
            </button>
          ) : (
            <>
              <div ref={videoRef} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', backgroundColor: '#000', borderRadius: '8px' }}></div>
              <button className="btn-camera stop" onClick={detenerCamara}>
                ⏹️ Detener Cámara
              </button>
            </>
          )}
        </div>

        <form className="movimientos-form" onSubmit={handleRegistrarIngreso}>
          <h2>Datos del Ingreso</h2>

          <div className="form-group">
            <label>Código del Producto *</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value);
                procesarIngreso(e.target.value);
              }}
              placeholder="Escanea o escribe código"
              autoFocus
            />
          </div>

          {productoActual && (
            <div className="producto-info" style={{ 
              padding: '15px', 
              backgroundColor: '#f0f8ff', 
              borderRadius: '8px', 
              marginBottom: '20px',
              borderLeft: '4px solid #2196F3'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>{productoActual.codigo}</h3>
              <p style={{ margin: '5px 0' }}><strong>Marca:</strong> {productoActual.marca}</p>
              <p style={{ margin: '5px 0' }}><strong>Tipo:</strong> {productoActual.tipo_nombre}</p>
              <p style={{ margin: '5px 0' }}><strong>Stock Actual:</strong> {productoActual.stock}</p>
              {qrData && <p style={{ margin: '5px 0' }}><strong>Descripción:</strong> {qrData.descripcion}</p>}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Cantidad *</label>
              <input
                type="number"
                required
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1).toString())}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Compra a proveedor"
            />
          </div>

          <div className="form-group">
            <label>Número de Guía (opcional)</label>
            <input
              type="text"
              value={numeroGuia}
              onChange={(e) => setNumeroGuia(e.target.value)}
              placeholder="Guía de remisión o compra"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={!codigo || !productoActual}>
            ✓ Registrar Ingreso
          </button>
        </form>
      </div>
    </div>
  );
};

export default IngresosPage;
