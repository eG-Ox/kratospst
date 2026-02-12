import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseQRPayload } from '../shared/utils/qr';
import { maquinasService, movimientosService } from '../services/api';
import '../styles/SalidasPage.css';


const normalizarCodigo = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const extraerCodigoDesdeTexto = (texto) => {
  const raw = String(texto || '').trim();
  if (!raw) return '';
  const tokens = raw
    .replace(//g, '')
    .split(/[
,;\/\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return tokens[0] || raw;
};

const extraerCodigoQR = (texto) => {
  const parsed = parseQRPayload(texto);
  if (parsed.ok && parsed.data?.codigo) {
    return parsed.data.codigo;
  }
  return extraerCodigoDesdeTexto(texto);
};

const SalidasPage = ({ usuario }) => {
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('Venta');
  const [codigoScaneado, setCodigoScaneado] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const html5QrcodeScanner = useRef(null);
  const isNativeScannerAvailable = () =>
    typeof window !== 'undefined' &&
    window.Android &&
    typeof window.Android.openQrScanner === 'function';

  useEffect(() => {
    cargarMaquinas();
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

  const cargarMaquinas = async () => {
    try {
      const response = await maquinasService.getAll();
      setMaquinas(response.data);
    } catch (error) {
      setError('Error al cargar máquinas');
    }
  };

  const iniciarCamara = async () => {
    if (isNativeScannerAvailable()) {
      window.Android.openQrScanner();
      return;
    }
    try {
      setCamaraActiva(true);
      html5QrcodeScanner.current = new Html5Qrcode('qr-reader-salida');
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
    const codigo = extraerCodigoQR(decodedText);
    setCodigoScaneado(codigo);
    buscarMaquina(codigo);
    detenerCamara();
  };

  const onScanError = (error) => {
    // Ignorar errores
  };

  const buscarMaquina = async (codigo) => {
    try {
      const codigoFinal = extraerCodigoQR(codigo);
      if (!codigoFinal) {
        setError('Codigo invalido');
        return;
      }
      const response = await maquinasService.getAll();
      const maquina = response.data.find(
        (m) => normalizarCodigo(m.codigo) === normalizarCodigo(codigoFinal)
      );
      if (maquina) {
        setMaquinaSeleccionada(maquina);
        setError('');
      } else {
        setError('Máquina no encontrada');
      }
    } catch (error) {
      setError('Error buscando máquina');
    }
  };

  const handleRegistrarSalida = async (e) => {
    e.preventDefault();

    if (!maquinaSeleccionada || !cantidad) {
      setError('Seleccione máquina e ingrese cantidad');
      return;
    }

    if (cantidad > maquinaSeleccionada.stock) {
      setError('Stock insuficiente para esta salida');
      return;
    }

    try {
      setLoading(true);
      await movimientosService.registrar({
        maquina_id: maquinaSeleccionada.id,
        tipo: 'salida',
        cantidad: parseInt(cantidad),
        motivo: motivo
      });

      setSuccess(`✓ Salida registrada: ${cantidad} unidades de ${maquinaSeleccionada.codigo}`);
      setMaquinaSeleccionada(null);
      setCantidad(1);
      setCodigoScaneado('');
      setError('');

      setTimeout(() => setSuccess(''), 3000);
      cargarMaquinas();
    } catch (error) {
      setError(error.response?.data?.error || 'Error al registrar salida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="salidas-container">
      <h1>Registro de Salidas</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="salidas-content">
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
              <div id="qr-reader-salida" style={{ width: '100%' }}></div>
              <button className="btn-camera stop" onClick={detenerCamara}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6h12v12H6z" />
                </svg>
                <span>Detener cámara</span>
              </button>
            </>
          )}
        </div>

        <form onSubmit={handleRegistrarSalida} className="salida-form">
          <h2>Datos de la Salida</h2>

          <div className="form-group">
            <label>Código o Búsqueda</label>
            <input
              type="text"
              value={codigoScaneado}
              onChange={(e) => {
                setCodigoScaneado(e.target.value);
                buscarMaquina(e.target.value);
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
              max={maquinaSeleccionada?.stock || 1}
              required
            />
            {maquinaSeleccionada && (
              <small>Disponible: {maquinaSeleccionada.stock}</small>
            )}
          </div>

          <div className="form-group">
            <label>Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo de la salida"
            />
          </div>

          <button type="submit" className="btn-registrar" disabled={!maquinaSeleccionada || loading}>
            {loading ? 'Registrando...' : '✓ Registrar Salida'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SalidasPage;
