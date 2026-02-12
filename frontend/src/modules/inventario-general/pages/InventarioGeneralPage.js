import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  inventarioGeneralService,
  productosService
} from '../../../core/services/apiServices';
import '../styles/InventarioGeneralPage.css';

const normalizarCodigo = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const InventarioGeneralPage = () => {
  const [inventarioId, setInventarioId] = useState(null);
  const [estadoInventario, setEstadoInventario] = useState('abierto');
  const [inventarioInfo, setInventarioInfo] = useState(null);
  const [productos, setProductos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [tab, setTab] = useState('conteo');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanActivo, setScanActivo] = useState(false);
  const [showInicioModal, setShowInicioModal] = useState(false);
  const [showAplicarModal, setShowAplicarModal] = useState(false);
  const [aplicarId, setAplicarId] = useState('');
  const [zonaLetra, setZonaLetra] = useState('');
  const [zonaNumero, setZonaNumero] = useState('');
  const [scanMode, setScanMode] = useState('producto');
  const [faseConteo, setFaseConteo] = useState('zona');
  const [ultimoScanOk, setUltimoScanOk] = useState(null);
  const [ultimoScanTexto, setUltimoScanTexto] = useState('');

  const isNativeScannerAvailable = () =>
    typeof window !== 'undefined' &&
    window.Android &&
    typeof window.Android.openQrScanner === 'function';

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const zxingRef = useRef(null);
  const zxingControlRef = useRef(null);
  const scanActivoRef = useRef(false);
  const ultimoDetectadoRef = useRef(0);
  const ultimoTextoRef = useRef('');
  const ultimoTextoAtRef = useRef(0);
  const audioCtxRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const usuarioActual = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch (err) {
      return {};
    }
  }, []);

  const inventarioAbierto = useMemo(
    () => historial.find((item) => item.estado === 'abierto'),
    [historial]
  );

  const cargarProductos = useCallback(async () => {
    try {
      const resp = await productosService.getAll();
      setProductos(resp.data || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
      setError('Error al cargar productos');
    }
  }, []);

  const buscarProductoRemoto = useCallback(async (codigoValue) => {
    try {
      const resp = await productosService.getByCodigo(codigoValue);
      const producto = resp?.data;
      if (producto?.id) {
        setProductos((prev) => {
          const existe = prev.some(
            (item) => normalizarCodigo(item.codigo) === normalizarCodigo(producto.codigo)
          );
          return existe ? prev : [...prev, producto];
        });
        return producto;
      }
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.error('Error buscando producto por codigo:', err);
      }
    }
    return null;
  }, []);

  const cargarHistorial = useCallback(async () => {
    try {
      const resp = await inventarioGeneralService.listar();
      setHistorial(resp.data || []);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  }, []);

  const abrirInicioModal = async () => {
    await cargarHistorial();
    setShowInicioModal(true);
  };

  const abrirAplicarModal = async () => {
    await cargarHistorial();
    const ultimo = historial?.[0]?.id ? String(historial[0].id) : '';
    setAplicarId(ultimo);
    setShowAplicarModal(true);
  };

  const iniciarInventario = async () => {
    try {
      const resp = await inventarioGeneralService.crear({});
      await cargarInventario(resp.data.id);
      setError('');
      setShowInicioModal(false);
    } catch (err) {
      console.error('Error creando inventario:', err);
      setError('No se pudo iniciar inventario');
    }
  };

  const cargarInventario = async (id) => {
    try {
      setError('');
      const resp = await inventarioGeneralService.obtener(id);
      setInventarioId(resp.data.inventario.id);
      setEstadoInventario(resp.data.inventario.estado);
      setInventarioInfo(resp.data.inventario);
      setDetalles(resp.data.detalles || []);
      setTab('conteo');
      setShowInicioModal(false);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setError('No se pudo cargar inventario');
    }
  };

  const continuarInventario = async () => {
    if (!inventarioAbierto) return;
    await cargarInventario(inventarioAbierto.id);
  };

  const eliminarInventarioAbierto = async () => {
    if (!inventarioAbierto) return;
    const confirmar = window.confirm('Deseas eliminar el inventario abierto?');
    if (!confirmar) return;
    try {
      await inventarioGeneralService.eliminarInventario(inventarioAbierto.id);
      await cargarHistorial();
      setShowInicioModal(false);
      if (inventarioId === inventarioAbierto.id) {
        setInventarioId(null);
        setEstadoInventario('abierto');
        setInventarioInfo(null);
        setDetalles([]);
      }
    } catch (err) {
      console.error('Error eliminando inventario:', err);
      setError(err.response?.data?.error || 'No se pudo eliminar inventario');
    }
  };

  const habilitarAudio = useCallback(async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx;
    } catch (err) {
      console.warn('No se pudo habilitar audio:', err);
      return null;
    }
  }, [audioCtxRef]);

  const reproducirBeep = useCallback(async () => {
    try {
      const ctx = await habilitarAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 900;
      gain.gain.value = 0.12;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, 120);
    } catch (err) {
      console.warn('No se pudo reproducir el beep:', err);
    }
  }, [habilitarAudio]);

  const limpiarErrores = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const refrescarDetalles = useCallback(async () => {
    if (!inventarioId) return;
    const resp = await inventarioGeneralService.obtener(inventarioId);
    setDetalles(resp.data.detalles || []);
    setEstadoInventario(resp.data.inventario.estado);
    setInventarioInfo(resp.data.inventario);
  }, [inventarioId]);

  const programarRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      refrescarDetalles();
    }, 400);
  }, [refrescarDetalles, refreshTimerRef]);

  const parsearQR = useCallback((textoQR) => {
    const raw = String(textoQR || '').trim();
    if (!raw) {
      setError('QR invalido');
      return null;
    }
    const tokens = raw
      .replace(/\r/g, '')
      .split(/[\n,;/\s]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
    const codigo = tokens[0] || raw;
    return { codigo, partial: true };
  }, []);

  const parsearZonaQR = useCallback((textoQR) => {
    const raw = String(textoQR || '').trim().toUpperCase();
    if (!raw) {
      return { error: 'Zona vacia' };
    }
    const cleaned = raw.startsWith('ZONA:') ? raw.replace('ZONA:', '').trim() : raw;
    const match = cleaned.match(/^([A-H])\s*(\d+)$/);
    if (!match) {
      return { error: 'Zona invalida. Usa ZONA:A1 o A1' };
    }
    const numero = Number(match[2]);
    if (!Number.isInteger(numero) || (numero !== 1 && numero !== 2)) {
      return { error: 'Subzona invalida. Solo se permite 1 o 2' };
    }
    return { letra: match[1], numero };
  }, []);

  const agregarCodigo = useCallback(async (codigoScan) => {
    if (!inventarioId) {
      setError('Inicia un inventario primero');
      return;
    }
    const zonaFinal = zonaLetra && zonaNumero
      ? `${zonaLetra}${zonaNumero}`.trim().toUpperCase()
      : 'H1';
    if (!codigoScan) {
      return;
    }
    try {
      limpiarErrores();
      let codigoFinal = String(codigoScan || '').trim();
      if (codigoFinal.includes('\n') || (codigoFinal.match(/,/g) || []).length >= 1) {
        const parsed = parsearQR(codigoFinal);
        if (!parsed) {
          return;
        }
        if (parsed?.codigo) {
          codigoFinal = parsed.codigo;
        }
      }

      const codigoNorm = normalizarCodigo(codigoFinal);
      let existente = productos.find(
        (prod) => normalizarCodigo(prod.codigo) === codigoNorm
      );
      if (!existente) {
        existente = await buscarProductoRemoto(codigoFinal);
      }
      if (!existente) {
        setUltimoScanOk(false);
        setUltimoScanTexto(codigoFinal);
        setError(`QR no registrado: ${codigoFinal}`);
        setCodigo('');
        return;
      }

      await inventarioGeneralService.agregar(inventarioId, {
        codigo: codigoFinal,
        cantidad: 1,
        ubicacion: zonaFinal
      });
      programarRefresh();
      reproducirBeep();
      setUltimoScanOk(true);
      setUltimoScanTexto(codigoFinal);
      setSuccess(`Codigo leido: ${codigoFinal}`);
      setTimeout(() => setSuccess(''), 900);
      setCodigo('');
    } catch (err) {
      console.error('Error agregando conteo:', err);
      setError(err.response?.data?.error || 'Error agregando conteo');
    }
  }, [
    inventarioId,
    zonaLetra,
    zonaNumero,
    limpiarErrores,
    parsearQR,
    productos,
    buscarProductoRemoto,
    programarRefresh,
    reproducirBeep
  ]);

  const ajustarConteo = async (detalleId, conteo) => {
    if (!inventarioId) return;
    try {
      await inventarioGeneralService.ajustar(inventarioId, {
        detalle_id: detalleId,
        conteo: Number(conteo || 0)
      });
      await refrescarDetalles();
    } catch (err) {
      console.error('Error ajustando conteo:', err);
      setError(err.response?.data?.error || 'Error ajustando conteo');
    }
  };

  const eliminarDetalle = async (detalleId) => {
    if (!inventarioId) return;
    const confirmar = window.confirm('Deseas eliminar este producto del conteo?');
    if (!confirmar) return;
    try {
      await inventarioGeneralService.eliminar(inventarioId, {
        detalle_id: detalleId
      });
      await refrescarDetalles();
    } catch (err) {
      console.error('Error eliminando detalle:', err);
      setError(err.response?.data?.error || 'Error al eliminar detalle');
    }
  };

  const cerrarInventario = async () => {
    if (!inventarioId) return;
    try {
      await inventarioGeneralService.cerrar(inventarioId);
      await refrescarDetalles();
      await cargarHistorial();
    } catch (err) {
      console.error('Error cerrando inventario:', err);
      setError(err.response?.data?.error || 'Error al cerrar inventario');
    }
  };

  const aplicarStock = async () => {
    if (!aplicarId) {
      setError('Selecciona un inventario para aplicar.');
      return;
    }
    try {
      await inventarioGeneralService.aplicar(aplicarId);
      await refrescarDetalles();
      await cargarHistorial();
      setShowAplicarModal(false);
      setSuccess('Stock actualizado');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      console.error('Error aplicando stock:', err);
      setError(err.response?.data?.error || 'Error al aplicar stock');
    }
  };

  const exportarExcel = async (id) => {
    try {
      const resp = await inventarioGeneralService.exportar(id);
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventario_${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Error exportando:', err);
    }
  };

  const activarCamara = () => {
    if (isNativeScannerAvailable()) {
      window.Android.openQrScanner();
      return;
    }
    setError('');
    habilitarAudio();
    ultimoTextoRef.current = '';
    ultimoTextoAtRef.current = 0;
    setCameraActive(true);
  };


  const detenerStream = useCallback(() => {
    scanActivoRef.current = false;
    setScanActivo(false);
    if (zxingControlRef.current && typeof zxingControlRef.current.stop === 'function') {
      zxingControlRef.current.stop();
    }
    zxingControlRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const detenerCamara = useCallback(() => {
    detenerStream();
    setCameraActive(false);
  }, [detenerStream]);

  const iniciarEscaneo = useCallback(() => {
    if (scanActivoRef.current || !videoRef.current) {
      return;
    }
    scanActivoRef.current = true;
    setScanActivo(true);
    const control = zxingRef.current.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result) => {
        if (result && scanActivoRef.current) {
          const ahora = Date.now();
          if (ahora - ultimoDetectadoRef.current > 700) {
            ultimoDetectadoRef.current = ahora;
            const value = result.getText();
            const ahoraTexto = Date.now();
            if (value === ultimoTextoRef.current && ahoraTexto - ultimoTextoAtRef.current < 1200) {
              return;
            }
            ultimoTextoRef.current = value;
            ultimoTextoAtRef.current = ahoraTexto;
            if (scanMode === 'zona') {
              const zonaParsed = parsearZonaQR(value);
              if (zonaParsed.error) {
                setError(zonaParsed.error);
                return;
              }
              setZonaLetra(zonaParsed.letra);
              setZonaNumero(String(zonaParsed.numero));
              setFaseConteo('scan');
              setSuccess(`Zona activa: ${zonaParsed.letra}${zonaParsed.numero}`);
              setTimeout(() => setSuccess(''), 1200);
            } else {
              const parsed = parsearQR(value);
              if (!parsed) {
                return;
              }
              if (parsed?.codigo) {
                setCodigo(parsed.codigo);
                agregarCodigo(parsed.codigo);
              } else {
                setCodigo(value);
                agregarCodigo(value);
              }
            }
            detenerCamara();
          }
        }
      }
    );
    zxingControlRef.current = control;
  }, [agregarCodigo, detenerCamara, parsearQR, parsearZonaQR, scanMode]);

  const iniciarStream = useCallback(async () => {
    if (!cameraActive) return;
    try {
      if (!window.isSecureContext) {
        setError('Para usar la camara en celular necesitas HTTPS.');
        setCameraActive(false);
        return;
      }
      if (!videoRef.current) {
        setTimeout(iniciarStream, 120);
        return;
      }
      if (!zxingRef.current) {
        zxingRef.current = new BrowserMultiFormatReader();
      }
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            focusMode: 'continuous'
          },
          audio: false
        });
        try {
          const [track] = streamRef.current.getVideoTracks();
          const caps = track?.getCapabilities?.();
          if (caps?.torch) {
            await track.applyConstraints({ advanced: [{ torch: true }] });
          }
        } catch (err) {
          // torch/advanced constraints no disponibles
        }
      }
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        setTimeout(() => iniciarEscaneo(), 250);
      }
    } catch (err) {
      console.error('Error camara:', err);
      setError('No se pudo acceder a la camara');
      setCameraActive(false);
    }
  }, [cameraActive, iniciarEscaneo]);

  useEffect(() => {
    cargarProductos();
    cargarHistorial();
    return () => {
      detenerStream();
    };
  }, [cargarProductos, cargarHistorial, detenerStream]);

  useEffect(() => {
    if (cameraActive) {
      iniciarStream();
    } else {
      detenerStream();
    }
  }, [cameraActive, iniciarStream, detenerStream]);

  const formatearUbicacion = (producto) => {
    if (!producto) return '-';
    const letra = producto.ubicacion_letra || '';
    const numero = producto.ubicacion_numero || '';
    return letra || numero ? `${letra}${numero}` : '-';
  };


  useEffect(() => {
    const handler = (value) => {
      if (!value) return;
      const ahora = Date.now();
      if (ahora - ultimoDetectadoRef.current > 1200) {
        ultimoDetectadoRef.current = ahora;
        const nowText = Date.now();
        if (value === ultimoTextoRef.current && nowText - ultimoTextoAtRef.current < 2500) {
          return;
        }
        ultimoTextoRef.current = value;
        ultimoTextoAtRef.current = nowText;
        if (scanMode === 'zona') {
          const zonaParsed = parsearZonaQR(value);
          if (zonaParsed.error) {
            setError(zonaParsed.error);
            return;
          }
          setZonaLetra(zonaParsed.letra);
          setZonaNumero(String(zonaParsed.numero));
          setSuccess(`Zona activa: ${zonaParsed.letra}${zonaParsed.numero}`);
          setTimeout(() => setSuccess(''), 1200);
        } else {
          const parsed = parsearQR(value);
          if (!parsed) {
            return;
          }
          const code = parsed?.codigo ? parsed.codigo : String(value);
          setCodigo(code);
          agregarCodigo(code);
        }
        detenerCamara();
      }
    };
    window.handleNativeQr = handler;
    return () => {
      if (window.handleNativeQr === handler) {
        delete window.handleNativeQr;
      }
    };
    }, [scanMode, parsearQR, parsearZonaQR, agregarCodigo, productos, detenerCamara]);

  const puedeAplicar = estadoInventario === 'cerrado';
  const fechaInventario = inventarioInfo?.created_at
    ? new Date(inventarioInfo.created_at).toLocaleString()
    : '';

  return (
    <div className="inventario-general-container">
      <div className="page-header">
        <div className="page-header__title">
          <h5>Inventario General</h5>
          <span className="page-header__subtitle">Conteo rapido por pistoleo</span>
        </div>
        <div className="page-header__actions">
          <span className={`status-badge ${inventarioId ? 'ok' : 'warn'}`}>
            {inventarioId ? estadoInventario : 'Sin inventario'}
          </span>
          <span className="status-pill">Items: {detalles.length}</span>
          {inventarioId && (
            <span className="status-meta">
              {inventarioInfo?.usuario_nombre ? `Usuario: ${inventarioInfo.usuario_nombre}` : 'Usuario: --'}
              {fechaInventario ? ` | ${fechaInventario}` : ''}
            </span>
          )}
          <div className="header-buttons">
            <button type="button" className="btn-secondary" onClick={abrirInicioModal}>
              Nuevo
            </button>
            <button type="button" className="btn-secondary" onClick={cerrarInventario}>
              Cerrar
            </button>
            <button type="button" className="btn-primary" onClick={abrirAplicarModal} disabled={!puedeAplicar}>
              Actualizar stock
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tabs">
        <button className={tab === 'conteo' ? 'active' : ''} onClick={() => setTab('conteo')}>
          Conteo
        </button>
        <button className={tab === 'historial' ? 'active' : ''} onClick={() => setTab('historial')}>
          Historial
        </button>
      </div>

      {tab === 'conteo' && (
        <div className="inventario-flow">
          {faseConteo === 'zona' ? (
            <div className="inventario-zone-setup">
              <div className="zone-card">
                <h3>Selecciona zona</h3>
                <div className="zone-grid">
                  <div className="form-group">
                    <label>Zona</label>
                    <select value={zonaLetra} onChange={(e) => setZonaLetra(e.target.value)}>
                      <option value="">-</option>
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((letra) => (
                        <option key={letra} value={letra}>{letra}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Subzona</label>
                    <select value={zonaNumero} onChange={(e) => setZonaNumero(e.target.value)}>
                      <option value="">-</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                  <div className="zone-actions">
                    <button
                      type="button"
                      className="btn-secondary icon-btn-inline"
                      onClick={() => {
                        setScanMode('zona');
                        activarCamara();
                      }}
                      title="Escanear zona"
                      aria-label="Escanear zona"
                    >
                      📷
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        if (zonaLetra && zonaNumero) {
                          setFaseConteo('scan');
                        } else {
                          setError('Selecciona zona y subzona');
                        }
                      }}
                    >
                      Iniciar zona
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="inventario-scan-layout">
              <div className="scan-panel">
                <div className="scan-header">
                  <div>
                    <h3>Zona activa</h3>
                    <p className="zone-pill">{zonaLetra && zonaNumero ? `${zonaLetra}${zonaNumero}` : 'H1'}</p>
                  </div>
                  <div className="scan-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setZonaLetra('');
                        setZonaNumero('');
                        setFaseConteo('zona');
                      }}
                    >
                      Terminar zona
                    </button>
                    <button type="button" className="btn-secondary" onClick={cerrarInventario}>
                      Terminar inventario
                    </button>
                  </div>
                </div>

                <div className="scan-input-card">
                  <div className="scan-input-row">
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
                      onClick={() => {
                        setScanMode('producto');
                        activarCamara();
                      }}
                      aria-label="Abrir camara"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 3a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 10z" />
                      </svg>
                    </button>
                  </div>
                  <button type="button" className="btn-primary" onClick={() => agregarCodigo(codigo)}>
                    Agregar
                  </button>
                  <div className={`scan-status ${ultimoScanOk === null ? '' : ultimoScanOk ? 'ok' : 'bad'}`}>
                    {ultimoScanOk === null ? (
                      <span>Listo para escanear</span>
                    ) : ultimoScanOk ? (
                      <span>OK: {ultimoScanTexto}</span>
                    ) : (
                      <span>Error: {ultimoScanTexto}</span>
                    )}
                  </div>
                </div>

                <div className="inventario-table-container">
                  <table className="inventario-table">
                    <thead>
                      <tr>
                        <th>Codigo</th>
                        <th>Descripcion</th>
                        <th>Ubicacion</th>
                        <th>Stock</th>
                        <th>Conteo</th>
                        <th>Diferencia</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-message">No hay conteos. Empieza a escanear.</td>
                        </tr>
                      ) : (
                        detalles.map((item) => (
                          <tr key={item.id}>
                            <td>{item.codigo}</td>
                            <td>{item.descripcion}</td>
                            <td>{formatearUbicacion(item)}</td>
                            <td>{item.stock_actual}</td>
                            <td>
                              <input
                                type="number"
                                value={item.conteo}
                                onChange={(e) => ajustarConteo(item.id, e.target.value)}
                              />
                            </td>
                            <td className={item.diferencia === 0 ? '' : item.diferencia > 0 ? 'diff-plus' : 'diff-minus'}>
                              {item.diferencia}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="icon-btn icon-btn--delete"
                                onClick={() => eliminarDetalle(item.id)}
                                title="Eliminar"
                                aria-label="Eliminar"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="inventario-historial">
          <div className="inventario-table-container">
            <table className="inventario-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Items</th>
                  <th className="icon-col" title="Acciones">
                    <span className="icon-label" aria-label="Acciones">⋯</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-message">No hay inventarios registrados.</td>
                  </tr>
                ) : (
                  historial.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.id}</td>
                      <td>{new Date(inv.created_at).toLocaleString()}</td>
                      <td>{inv.usuario_nombre || inv.usuario_id}</td>
                      <td>{inv.estado}</td>
                      <td>{inv.total_items}</td>
                      <td className="acciones">
                        <button
                          type="button"
                          className="icon-btn icon-btn--view"
                          onClick={() => cargarInventario(inv.id)}
                          title="Ver"
                          aria-label="Ver"
                        >
                          👁️
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => exportarExcel(inv.id)}
                          title="Excel"
                          aria-label="Excel"
                        >
                          📊
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cameraActive && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camara">
          <div className="camera-modal__backdrop" onClick={detenerCamara} />
          <div className="camera-modal__content">
            <div className="camera-modal__header">
              <h3>Escaner de codigo</h3>
              <div className="camera-actions">
                <button type="button" className="btn-link" onClick={detenerCamara}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="camera-modal__preview">
              <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={iniciarEscaneo} />
              <div className="scan-overlay" aria-hidden="true">
                <div className="scan-cross" />
                <div className="scan-line" />
              </div>
            </div>
            <p className="camera-note">
              {scanActivo ? 'Escaneo automatico activado.' : 'Iniciando camara...'}
            </p>
          </div>
        </div>
      )}

      {showInicioModal && (
        <div className="inicio-modal" role="dialog" aria-modal="true" aria-label="Inicio inventario">
          <div className="inicio-modal__backdrop" onClick={() => setShowInicioModal(false)} />
          <div className="inicio-modal__content">
            <div className="inicio-modal__header">
              <h3>Inicio de inventario</h3>
              <button type="button" className="btn-link" onClick={() => setShowInicioModal(false)}>
                Cerrar
              </button>
            </div>
            <div className="inicio-modal__body">
              <div className="inicio-info">
                <div>
                  <span className="inicio-label">Fecha / Hora</span>
                  <strong>{new Date().toLocaleString()}</strong>
                </div>
                <div>
                  <span className="inicio-label">Usuario</span>
                  <strong>{usuarioActual.nombre || 'Usuario'} {usuarioActual.apellido || ''}</strong>
                </div>
              </div>

              {inventarioAbierto ? (
                <div className="inicio-alert">
                  Hay un inventario abierto (ID {inventarioAbierto.id}). Puedes continuar o eliminarlo.
                </div>
              ) : (
                <div className="inicio-alert neutral">
                  No hay inventarios abiertos. Puedes iniciar uno nuevo.
                </div>
              )}
            </div>
            <div className="inicio-modal__footer">
              {inventarioAbierto && (
                <>
                  <button type="button" className="btn-secondary" onClick={continuarInventario}>
                    Continuar
                  </button>
                  <button type="button" className="btn-secondary danger" onClick={eliminarInventarioAbierto}>
                    Eliminar
                  </button>
                </>
              )}
              <button type="button" className="btn-primary" onClick={iniciarInventario}>
                Empezar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAplicarModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Aplicar inventario">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Aplicar inventario</h2>
              <button type="button" className="btn-icon" onClick={() => setShowAplicarModal(false)}>
                X
              </button>
            </div>
            <div className="modal-body">
              <p>Selecciona el inventario a aplicar. Por defecto es el ultimo registrado.</p>
              <div className="form-row">
                <div className="form-group">
                  <label>Inventario</label>
                  <select value={aplicarId} onChange={(e) => setAplicarId(e.target.value)}>
                    <option value="">Seleccionar</option>
                    {historial.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} - {item.estado} - {new Date(item.created_at).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="warning-message">
                Se actualizara el stock de productos segun el inventario seleccionado.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowAplicarModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={aplicarStock} disabled={!aplicarId}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioGeneralPage;
