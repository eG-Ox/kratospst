import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { maquinasService, movimientosService } from '../services/api';
import { productosService, tiposMaquinasService, marcasService } from '../core/services/apiServices';
import { parseQRPayload } from '../shared/utils/qr';
import '../styles/IngresosPage.css';

const IngresosPage = ({ usuario }) => {
  const [maquinas, setMaquinas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('Compra a proveedor');
  const [codigoScaneado, setCodigoScaneado] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [qrData, setQrData] = useState(null);
  const qrRef = useRef(null);
  const html5QrcodeScanner = useRef(null);
  const isNativeScannerAvailable = () =>
    typeof window !== 'undefined' &&
    window.Android &&
    typeof window.Android.openQrScanner === 'function';

  useEffect(() => {
    cargarDatos();
    return () => {
      if (html5QrcodeScanner.current) {
        html5QrcodeScanner.current.clear();
      }
    };
  }, []);

  useEffect(() => {
    const handler = (value) => {
      if (!value) return;
      onScanSuccess(String(value));
    };
    window.handleNativeQr = handler;
    return () => {
      if (window.handleNativeQr === handler) {
        delete window.handleNativeQr;
      }
    };
  }, []);

  const cargarDatos = async () => {
    try {
      const [respMaquinas, respTipos, respMarcas] = await Promise.all([
        maquinasService.getAll(),
        tiposMaquinasService.getAll(),
        marcasService.getAll()
      ]);
      setMaquinas(respMaquinas.data);
      setTipos(respTipos.data);
      setMarcas(respMarcas.data || []);
    } catch (error) {
      setError('Error al cargar datos');
    }
  };


  const normalizarCodigo = (value) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

  const normalizarMarcaCodigo = (value) => String(value || '').trim().toUpperCase();

  const resolverMarcaCodigo = (value) => {
    const code = normalizarMarcaCodigo(value);
    const found = (marcas || []).find((m) => normalizarMarcaCodigo(m.codigo) == code);
    return found?.nombre || value || '';
  };

  const extraerCodigoDesdeTexto = (texto) => {
    const raw = String(texto || '').trim();
    if (!raw) return '';
    const tokens = raw
      .replace(/\r/g, '')
      .split(/[
,;\/\s]+/g)
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
      descripcion: 'Generado automaticamente'
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

  const iniciarCamara = async () => {
    if (isNativeScannerAvailable()) {
      window.Android.openQrScanner();
      return;
    }
    try {
      setCamaraActiva(true);
      html5QrcodeScanner.current = new Html5Qrcode('qr-reader');
      await html5QrcodeScanner.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      setError('No se pudo acceder a la cámara');
      setCamaraActiva(false);
    }
  };

  const detenerCamara = async () => {
    try {
      if (html5QrcodeScanner.current) {
        await html5QrcodeScanner.current.stop();
        setCamaraActiva(false);
      }
    } catch (err) {
      console.error('Error deteniendo cámara:', err);
    }
  };

  const onScanSuccess = (decodedText) => {
    const parsed = parsearQR(decodedText);
    const codigo = parsed?.codigo || extraerCodigoDesdeTexto(decodedText);
    setCodigoScaneado(codigo);
    buscarOMaquina(decodedText);
    detenerCamara();
  };

  const buscarOMaquina = async (codigoOQr) => {
    try {
      setError('');
      const parsed = parsearQR(codigoOQr);
      const codigoDetectado = parsed?.codigo || extraerCodigoDesdeTexto(codigoOQr);
      if (!codigoDetectado) {
        setError('Codigo invalido');
        return;
      }

      if (parsed && !parsed.partial) {
        const maquina = maquinas.find(
          (m) => normalizarCodigo(m.codigo) === normalizarCodigo(parsed.codigo)
        );
        if (maquina) {
          setMaquinaSeleccionada(maquina);
        } else {
          const confirmar = window.confirm(
            `?Crear nuevo producto?

C?digo: ${parsed.codigo}
Marca: ${parsed.marca}
Tipo: ${parsed.tipo_maquina}
Descripci?n: ${parsed.descripcion}
Ubicaci?n: ${parsed.ubicacion}`
          );
          if (confirmar) {
            const id = await crearProductoDesdeQR(parsed);
            await cargarDatos();
            const maquinaCreada = (await maquinasService.getAll()).data.find(m => m.id === id);
            setMaquinaSeleccionada(maquinaCreada);
            setSuccess(`Producto creado: ${parsed.codigo}`);
            setTimeout(() => setSuccess(''), 2000);
          } else {
            setError('Creaci?n de producto cancelada');
          }
        }
        return;
      }

      const maquina = maquinas.find(
        (m) => normalizarCodigo(m.codigo) === normalizarCodigo(codigoDetectado)
      );
      if (maquina) {
        setMaquinaSeleccionada(maquina);
        setError('');
      } else {
        setError('M?quina no encontrada. Escanea un QR completo para crear producto nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error procesando c?digo QR');
    }
  };

  const handleRegistrarIngreso = async (e) => {
    e.preventDefault();

    if (!maquinaSeleccionada || !cantidad) {
      setError('Seleccione máquina e ingrese cantidad');
      return;
    }

    try {
      setLoading(true);
      await movimientosService.registrar({
        maquina_id: maquinaSeleccionada.id,
        tipo: 'ingreso',
        cantidad: parseInt(cantidad),
        motivo: motivo
      });

      setSuccess(`✓ Ingreso registrado: ${cantidad} unidades de ${maquinaSeleccionada.codigo}`);
      setMaquinaSeleccionada(null);
      setCantidad(1);
      setCodigoScaneado('');
      setQrData(null);
      setError('');

      setTimeout(() => setSuccess(''), 3000);
      await cargarDatos();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al registrar ingreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ingresos-container">
      <h1>Registro de Ingresos</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="ingresos-content">
        <div className="camera-section">
          <h2>Escanear Código QR/Barras</h2>
          {!camaraActiva ? (
            <button className="btn-camera" onClick={iniciarCamara}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 3a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 10z" />
              </svg>
              <span>Iniciar cámara</span>
            </button>
          ) : (
            <>
              <div id="qr-reader" style={{ width: '100%' }}></div>
              <button className="btn-camera stop" onClick={detenerCamara}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6h12v12H6z" />
                </svg>
                <span>Detener cámara</span>
              </button>
            </>
          )}
        </div>

        <form onSubmit={handleRegistrarIngreso} className="ingreso-form">
          <h2>Datos del Ingreso</h2>

          <div className="form-group">
            <label>Código o Búsqueda</label>
            <input
              type="text"
              value={codigoScaneado}
              onChange={(e) => {
                setCodigoScaneado(e.target.value);
                buscarOMaquina(e.target.value);
              }}
              placeholder="Escanea o ingresa código manualmente"
              autoFocus
            />
          </div>

          {!maquinaSeleccionada ? (
            <div className="selector-maquina">
              <label>O selecciona una máquina:</label>
              <select onChange={(e) => setMaquinaSeleccionada(maquinas.find(m => m.id === parseInt(e.target.value)))}>
                <option value="">-- Selecciona una máquina --</option>
                {maquinas.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.codigo} - {m.marca} ({m.stock} en stock)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="maquina-info">
              <h3>{maquinaSeleccionada.codigo}</h3>
              <p><strong>Marca:</strong> {maquinaSeleccionada.marca}</p>
              <p><strong>Stock Actual:</strong> {maquinaSeleccionada.stock}</p>
              <p><strong>Tipo:</strong> {maquinaSeleccionada.tipo_nombre}</p>
              <button
                type="button"
                className="btn-cambiar"
                onClick={() => setMaquinaSeleccionada(null)}
              >
                Cambiar Máquina
              </button>
            </div>
          )}

          <div className="form-group">
            <label>Cantidad *</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo del ingreso"
            />
          </div>

          <button type="submit" className="btn-registrar" disabled={!maquinaSeleccionada || loading}>
            {loading ? 'Registrando...' : '✓ Registrar Ingreso'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IngresosPage;
