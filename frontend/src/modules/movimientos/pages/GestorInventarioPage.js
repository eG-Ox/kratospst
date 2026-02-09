import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  clientesService,
  marcasService,
  movimientosService,
  productosService,
  tiposMaquinasService
} from '../../../core/services/apiServices';
import { parseQRPayload } from '../../../shared/utils/qr';
import '../styles/MovimientosPage.css';

const GestorInventarioPage = () => {
  const [productos, setProductos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState('ingreso');
  const [codigoInput, setCodigoInput] = useState('');
  const [fase, setFase] = useState('filtro');
  const [itemsBatch, setItemsBatch] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [dniCliente, setDniCliente] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [lectorSoportado, setLectorSoportado] = useState(true);
  const [ultimoScan, setUltimoScan] = useState(null);

  const isNativeScannerAvailable = () =>
    typeof window !== 'undefined' &&
    window.Android &&
    typeof window.Android.openQrScanner === 'function';

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const zxingRef = useRef(null);
  const zxingControlRef = useRef(null);
  const rafRef = useRef(null);
  const ultimoDetectadoRef = useRef(0);
  const ultimoTextoRef = useRef('');
  const ultimoTextoAtRef = useRef(0);
  const scanActivoRef = useRef(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [respProductos, respTipos, respMarcas] = await Promise.all([
        productosService.getAll(),
        tiposMaquinasService.getAll(),
        marcasService.getAll()
      ]);
      setProductos(respProductos.data);
      setTipos(respTipos.data);
      setMarcas(respMarcas.data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const normalizarMarcaCodigo = (value) => String(value || '').trim().toUpperCase();

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

  const totalUnidades = useMemo(
    () => itemsBatch.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0),
    [itemsBatch]
  );

  const formatearUbicacion = (producto) => {
    if (!producto) return '-';
    const letra = producto.ubicacion_letra || '';
    const numero = producto.ubicacion_numero || '';
    return letra || numero ? `${letra}${numero}` : '-';
  };

  const parsearQR = (textoQR) => {
    const parsed = parseQRPayload(textoQR);
    if (!parsed.ok) {
      setError(parsed.error || 'QR invalido');
      return null;
    }
    if (parsed.partial) {
      return { codigo: parsed.data.codigo, partial: true };
    }
    const marcaNormalizada = resolverMarcaCodigo(parsed.data?.marca);
    if (modo === 'ingreso') {
      return {
        ...parsed.data,
        marca: marcaNormalizada,
        marca_codigo: parsed.data?.marca
      };
    }
    return {
      ...parsed.data,
      marca: marcaNormalizada,
      marca_codigo: parsed.data?.marca
    };
  };

  const normalizarDocumento = (value) => String(value || '').replace(/\D/g, '');

  const obtenerTipoDocumento = (value) => {
    const cleaned = normalizarDocumento(value);
    if (cleaned.length === 8) return 'dni';
    if (cleaned.length === 11) return 'ruc';
    return 'desconocido';
  };

  const construirMotivo = () => {
    const base = (motivo || '').trim();
    if (!base) return '';
    if (base === 'VENTA') {
      const documento = normalizarDocumento(dniCliente);
      const tipoDoc = obtenerTipoDocumento(documento);
      if (!documento) return base;
      if (tipoDoc === 'ruc') {
        return `${base} | RUC: ${documento}`;
      }
      return `${base} | DNI: ${documento}`;
    }
    if (numeroGuia) {
      return `${base} | Guia: ${numeroGuia}`;
    }
    return base;
  };

  const asegurarClientePorDocumento = async () => {
    const documento = normalizarDocumento(dniCliente);
    if (!documento) {
      setError('DNI o RUC requerido para VENTA');
      return false;
    }
    const tipoDoc = obtenerTipoDocumento(documento);
    if (tipoDoc === 'desconocido') {
      setError('Documento invalido: ingresa 8 (DNI) o 11 (RUC) digitos');
      return false;
    }
    try {
      const existing = await clientesService.getAll({ documento });
      if (Array.isArray(existing.data) && existing.data.length) {
        return true;
      }
      if (tipoDoc === 'dni') {
        const consulta = await clientesService.consultaDni(documento);
        if (!consulta.data?.success) {
          setError(consulta.data?.error || 'No se pudo validar DNI');
          return false;
        }
        await clientesService.create({
          tipo_cliente: 'natural',
          dni: documento,
          nombre: consulta.data.nombre,
          apellido: consulta.data.apellido
        });
        return true;
      }
      const consulta = await clientesService.consultaRuc(documento);
      if (!consulta.data?.success) {
        setError(consulta.data?.error || 'No se pudo validar RUC');
        return false;
      }
      await clientesService.create({
        tipo_cliente: 'juridico',
        ruc: documento,
        razon_social: consulta.data.razon_social,
        direccion: consulta.data.direccion
      });
      return true;
    } catch (err) {
      console.error('Error validando documento:', err);
      setError('No se pudo validar documento');
      return false;
    }
  };

  const construirInfoItem = (producto, parsed) => {
    if (parsed && !parsed.partial) {
      return {
        marca: parsed.marca || '',
        descripcion: parsed.descripcion || '',
        tipo: parsed.tipo_maquina || '',
        ubicacion: parsed.ubicacion || ''
      };
    }
    if (producto) {
      return {
        marca: producto.marca || '',
        descripcion: producto.descripcion || '',
        tipo: producto.tipo_nombre || '',
        ubicacion: formatearUbicacion(producto),
        stock: producto.stock
      };
    }
    return { marca: '', descripcion: '', tipo: '', ubicacion: '' };
  };

  const agregarCodigo = (valor) => {
    const raw = String(valor || '').trim();
    if (!raw) return;
    const parsed = parsearQR(raw);
    const code = parsed?.codigo || raw;
    if (!code) return;
    const encontrado = productos.find((prod) => prod.codigo === code);
    if (modo === 'ingreso' && !encontrado && parsed?.partial) {
      setError('QR completo requerido para registrar producto nuevo');
      return;
    }
    if (modo === 'salida' && !encontrado) {
      setError('Producto no encontrado para salida');
      return;
    }
    setError('');
    const infoItem = construirInfoItem(encontrado, parsed);
    setItemsBatch((prev) => {
      const idx = prev.findIndex((item) => item.codigo === code);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          cantidad: next[idx].cantidad + 1,
          info: next[idx].info || infoItem
        };
        return next;
      }
      return [
        ...prev,
        {
          codigo: code,
          cantidad: 1,
          qrData: parsed && !parsed.partial ? parsed : null,
          info: infoItem
        }
      ];
    });
    setCodigoInput('');
    setUltimoScan({
      codigo: code,
      producto: encontrado || null,
      qrData: parsed && !parsed.partial ? parsed : null,
      info: infoItem
    });
  };

  const activarCamara = async () => {
    setError('');
    setScanActivoSeguro(false);
    ultimoTextoRef.current = '';
    ultimoTextoAtRef.current = 0;
    try {
      if (!window.isSecureContext) {
        setError('Para usar la camara en celular necesitas HTTPS. Abre el sitio en https:// o usa un tunel HTTPS.');
        return;
      }

      // Usar ZXing siempre para mejor compatibilidad
      detectorRef.current = null;
      if (!zxingRef.current) {
        zxingRef.current = new BrowserMultiFormatReader();
      }
      setLectorSoportado(true);

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Error accediendo a camara:', err);
      setError('No se pudo acceder a la camara');
      setCameraActive(false);
    }
  };

  const toggleEscaneoDesdeBoton = async () => {
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
  };

  const setScanActivoSeguro = useCallback((value) => {
    scanActivoRef.current = value;
  }, []);

  const detenerEscaneo = useCallback(() => {
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
  }, [setScanActivoSeguro]);

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

  const procesarCodigoDetectado = useCallback((valor) => {
    const ahora = Date.now();
    if (valor === ultimoTextoRef.current && ahora - ultimoTextoAtRef.current < 2500) {
      return;
    }
    ultimoTextoRef.current = valor;
    ultimoTextoAtRef.current = ahora;
    if (ahora - ultimoDetectadoRef.current > 1200) {
      ultimoDetectadoRef.current = ahora;
      agregarCodigo(valor);
      reproducirBeep();
    }
  }, [agregarCodigo, reproducirBeep]);

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

  const iniciarEscaneo = useCallback(() => {
    if (scanActivoRef.current) {
      return;
    }
    if (!videoRef.current) {
      return;
    }
    if (!streamRef.current) {
      return;
    }
    setScanActivoSeguro(true);

    if (zxingRef.current && videoRef.current) {
      try {
        const control = zxingRef.current.decodeFromStream(
          streamRef.current,
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
  }, [procesarCodigoDetectado, setScanActivoSeguro]);

  useEffect(() => {
    return () => detenerCamara();
  }, [detenerCamara]);

  useEffect(() => {
    setItemsBatch([]);
    setCodigoInput('');
    setMotivo('');
    setNumeroGuia('');
    setDniCliente('');
    setFase('filtro');
    setUltimoScan(null);
  }, [modo]);

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
  }, [cameraActive, iniciarEscaneo]);

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
    setTipos((prev) => [...prev, response.data]);
    return response.data.id;
  };

  const crearProductoPorCodigo = async (codigoValue) => {
    const tipoId = await obtenerTipoDefault();
    const response = await productosService.create({
      codigo: codigoValue,
      tipo_maquina_id: tipoId,
      marca: 'N/A',
      descripcion: '',
      ubicacion: 'H1',
      stock: 0,
      precio_compra: 0,
      precio_venta: 0,
      precio_minimo: 0,
      ficha_web: ''
    });
    return response.data.id;
  };


  const handleContinuar = async () => {
    setError('');
    if (isSubmitting) return;
    if (!motivo) {
      setError('Selecciona un motivo');
      return;
    }
    if ((motivo === 'COMPRA' || motivo === 'DEVOLUCION') && !numeroGuia.trim()) {
      setError('Numero de guia requerido');
      return;
    }
    if (motivo === 'VENTA') {
      const ok = await asegurarClientePorDocumento();
      if (!ok) return;
    }
    setFase('scan');
  };

  const removerItem = (codigoItem) => {
    setItemsBatch((prev) => prev.filter((item) => item.codigo !== codigoItem));
  };

  const actualizarCantidad = (codigoItem, cantidadValue) => {
    const cantidadNum = Number(cantidadValue || 0);
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      return;
    }
    setItemsBatch((prev) =>
      prev.map((item) =>
        item.codigo === codigoItem ? { ...item, cantidad: cantidadNum } : item
      )
    );
  };
  const crearProductoDesdeQR = async (data) => {
    const tipoId = await obtenerTipoPorNombre(data.tipo_maquina);
    const ubicacionFinal =
      data?.ubicacion && String(data.ubicacion).trim() ? data.ubicacion : 'H1';
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

  const handleRegistrar = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setSuccess('');

    if (!itemsBatch.length) {
      setError('No hay productos escaneados');
      return;
    }

    if (modo === 'salida') {
      for (const item of itemsBatch) {
        const encontrado = productos.find((prod) => prod.codigo === item.codigo);
        if (!encontrado) {
          setError(`Producto no encontrado para salida: ${item.codigo}`);
          return;
        }
        const stockActual = Number(encontrado.stock || 0);
        if (stockActual < Number(item.cantidad || 0)) {
          setError(`Stock insuficiente para ${item.codigo}. Stock actual: ${stockActual}`);
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      const motivoFinal = construirMotivo();
      if (!motivoFinal) {
        setError('Selecciona un motivo');
        return;
      }

      for (const item of itemsBatch) {
        const encontrado = productos.find((prod) => prod.codigo === item.codigo);
        let maquinaId = encontrado?.id;
        if (!maquinaId) {
          if (modo === 'salida') {
            setError(`Producto no encontrado para salida: ${item.codigo}`);
            return;
          }
          if (item.qrData && !item.qrData.partial) {
            maquinaId = await crearProductoDesdeQR(item.qrData);
          } else {
            maquinaId = await crearProductoPorCodigo(item.codigo);
          }
        }
        await movimientosService.registrar({
          maquina_id: maquinaId,
          tipo: modo,
          cantidad: parseInt(item.cantidad, 10),
          motivo: motivoFinal
        });
      }

      setSuccess(`Movimientos registrados: ${itemsBatch.length}`);
      setItemsBatch([]);
      setCodigoInput('');
      setMotivo('');
      setNumeroGuia('');
      setDniCliente('');
      setFase('filtro');
      await cargarDatos();
      setUltimoScan(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error registrando movimiento:', err);
      setError(err.response?.data?.error || 'Error al registrar movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAndroidWebView =
    typeof window !== 'undefined' &&
    window.Android &&
    typeof window.Android.openQrScanner === 'function';

  return (
    <div className={`movimientos-container ${isAndroidWebView ? 'gestor-apk' : ''}`}>
      <div className="movimientos-header movimientos-header--compact">
        <h1>Gestor de Inventario</h1>
        <p>Escanea códigos y registra ingresos o salidas</p>
      </div>

      <div className="modo-toggle">
        <button
          type="button"
          className={`btn-toggle ${modo === 'ingreso' ? 'active' : ''}`}
          onClick={() => setModo('ingreso')}
          disabled={isSubmitting}
        >
          Ingreso
        </button>
        <button
          type="button"
          className={`btn-toggle ${modo === 'salida' ? 'active' : ''}`}
          onClick={() => setModo('salida')}
          disabled={isSubmitting}
        >
          Salida
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <div className="loading">Cargando productos...</div>
      ) : (
        
        <form className="movimientos-form" onSubmit={handleRegistrar}>
          {fase === 'filtro' ? (
            <>
              <div className="inventario-grid inventario-grid--single">
                <div className="inventario-panel">
                  <div className="form-card">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Motivo *</label>
                        <select value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={isSubmitting}>
                          <option value="">Selecciona un motivo</option>
                          {modo === 'ingreso' ? (
                            <>
                              <option value="COMPRA">COMPRA</option>
                              <option value="DEVOLUCION">DEVOLUCION</option>
                            </>
                          ) : (
                            <>
                              <option value="VENTA">VENTA</option>
                              <option value="DEVOLUCION">DEVOLUCION</option>
                              <option value="CAMBIO DE CODIGO">CAMBIO DE CODIGO</option>
                            </>
                          )}
                        </select>
                      </div>
                      {(motivo === 'COMPRA' || motivo === 'DEVOLUCION') && (
                        <div className="form-group">
                          <label>Numero de guia *</label>
                          <input
                            type="text"
                            placeholder="Ej. 000-12345"
                            value={numeroGuia}
                            onChange={(e) => setNumeroGuia(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                      {motivo === 'VENTA' && (
                        <div className="form-group">
                          <label>DNI o RUC *</label>
                          <input
                            type="text"
                            placeholder="Ingresa DNI (8) o RUC (11)"
                            value={dniCliente}
                            onChange={(e) => setDniCliente(e.target.value.replace(/\D/g, ''))}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="action-card">
                    <button type="button" className="btn-primary" onClick={handleContinuar} disabled={isSubmitting}>
                      Continuar
                    </button>
                  </div>
                </div>
              </div>
              <div className="summary-section">
                <div className="info-card summary-card summary-card--compact">
                  <h3>Resumen</h3>
                  <p>
                    Accion: <strong>{modo === 'ingreso' ? 'Ingreso' : 'Salida'}</strong>
                  </p>
                  <p>
                    Motivo: <strong>{motivo || '-'}</strong>
                  </p>
                  <p>
                    Guia/DNI/RUC: <strong>{numeroGuia || dniCliente || '-'}</strong>
                  </p>
                  <p className="muted">Confirma el motivo antes de escanear.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="inventario-grid">
              <div className="inventario-panel">
                <div className="barcode-card">
                  <label htmlFor="codigo">CODIGO</label>
                  <div className="code-input-row">
                    <input
                      id="codigo"
                      type="text"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(e.target.value.trim())}
                      placeholder="Escanea o escribe el codigo"
                      disabled={isSubmitting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          agregarCodigo(codigoInput);
                        }
                      }}
                    />
                  </div>
                  <div className="code-actions">
                    <button
                      type="button"
                      className="btn-camera btn-camera--icon"
                      onClick={toggleEscaneoDesdeBoton}
                      aria-label="Abrir camara y escanear"
                      disabled={isSubmitting}
                    >
                      <span className="btn-camera__emoji" aria-hidden="true">📷</span>
                    </button>
                  </div>
                </div>

                <div className="form-card">
                  <h3>Productos escaneados</h3>
                  {itemsBatch.length === 0 ? (
                    <p className="muted">Aun no hay productos en la lista.</p>
                  ) : (
                    <div className="batch-list">
                      {itemsBatch.map((item) => (
                        <div key={item.codigo} className="batch-item">
                          <div className="batch-item__info">
                            <div className="batch-item__code">{item.codigo}</div>
                            <div className="batch-item__meta">
                              {(item.info?.marca || item.info?.tipo) && (
                                <span>{item.info?.marca || 'Sin marca'}{item.info?.tipo ? ` · ${item.info.tipo}` : ''}</span>
                              )}
                              {modo === 'salida' && Number.isFinite(item.info?.stock) && (
                                <span>Stock actual: {item.info.stock}</span>
                              )}
                              {item.info?.descripcion && (
                                <span className="batch-item__desc">{item.info.descripcion}</span>
                              )}
                              {item.info?.ubicacion && (
                                <span>Ubicacion: {item.info.ubicacion}</span>
                              )}
                            </div>
                          </div>
                          <div className="batch-item__actions">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => actualizarCantidad(item.codigo, e.target.value)}
                              disabled={isSubmitting}
                            />
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => removerItem(item.codigo)}
                              disabled={isSubmitting}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="inventario-panel">
                <div className="info-card product-card">
                  <h3>Detalle del producto</h3>
                  <div className="producto-datos">
                    {ultimoScan?.producto ? (
                      <>
                        <p>
                          <strong>Producto:</strong> {ultimoScan.producto.marca || 'Sin marca'}
                        </p>
                        <p className="producto-datos__desc">
                          <strong>Descripcion:</strong>{' '}
                          {ultimoScan.producto.descripcion || 'Sin descripcion'}
                        </p>
                        <p>
                          <strong>Ubicacion:</strong> {formatearUbicacion(ultimoScan.producto)}
                        </p>
                        <p>
                          <strong>Stock actual:</strong> {ultimoScan.producto.stock}
                        </p>
                      </>
                    ) : ultimoScan?.qrData ? (
                      <>
                        <p>
                          <strong>Producto:</strong> {ultimoScan.qrData.marca}
                        </p>
                        <p className="producto-datos__desc">
                          <strong>Descripcion:</strong> {ultimoScan.qrData.descripcion}
                        </p>
                        <p>
                          <strong>Ubicacion:</strong> {ultimoScan.qrData.ubicacion}
                        </p>
                        <p className="producto-vacio">Producto no encontrado: se creara si es ingreso</p>
                      </>
                    ) : ultimoScan?.codigo ? (
                      <p className="producto-vacio">Producto no encontrado: {ultimoScan.codigo}</p>
                    ) : (
                      <p className="producto-vacio">Escanea un producto para ver detalle</p>
                    )}
                  </div>
                </div>

              </div>
              </div>
              <div className="summary-section">
              <div className="info-card summary-card summary-card--compact">
                <h3>Resumen</h3>
                <p>
                  Items: <strong>{itemsBatch.length}</strong>
                </p>
                <p>
                  Unidades: <strong>{totalUnidades}</strong>
                </p>
                <p>
                  Accion: <strong>{modo === 'ingreso' ? 'Ingreso' : 'Salida'}</strong>
                </p>
                <p>
                  Motivo: <strong>{motivo || '-'}</strong>
                </p>
                <p>
                  Guia/DNI/RUC: <strong>{numeroGuia || dniCliente || '-'}</strong>
                </p>
              </div>
              <div className="action-card action-card--compact">
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : `Registrar ${modo === 'ingreso' ? 'Ingreso' : 'Salida'}`}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFase('filtro')}
                  disabled={isSubmitting}
                >
                  Volver
                </button>
              </div>
              </div>
            </>
          )}
        </form>

      )}

      {cameraActive && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camara">
          <div className="camera-modal__backdrop" onClick={detenerCamara} />
          <div className="camera-modal__content">
            <div className="camera-modal__header">
              <h3>Escaner de codigo</h3>
              <button type="button" className="btn-link" onClick={detenerCamara}>
                Cerrar
              </button></div>
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






