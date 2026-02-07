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

  useEffect(() => {
    cargarDatos();
    return () => {
      if (html5QrcodeScanner.current) {
        html5QrcodeScanner.current.clear();
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

  const iniciarCamara = async () => {
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
    setCodigoScaneado(decodedText);
    buscarOMaquina(decodedText);
    detenerCamara();
  };

  const buscarOMaquina = async (codigoOQr) => {
    try {
      setError('');
      
      // Primero intentar parsear como QR completo
      const parsed = parsearQR(codigoOQr);
      if (parsed && !parsed.partial) {
        // QR completo con todos los campos
        const maquina = maquinas.find(m => m.codigo === parsed.codigo);
        if (maquina) {
          setMaquinaSeleccionada(maquina);
        } else {
          // Producto nuevo - pedir confirmación
          const confirmar = window.confirm(
            `¿Crear nuevo producto?\n\nCódigo: ${parsed.codigo}\nMarca: ${parsed.marca}\nTipo: ${parsed.tipo_maquina}\nDescripción: ${parsed.descripcion}\nUbicación: ${parsed.ubicacion}`
          );
          if (confirmar) {
            const id = await crearProductoDesdeQR(parsed);
            await cargarDatos();
            const maquinaCreada = (await maquinasService.getAll()).data.find(m => m.id === id);
            setMaquinaSeleccionada(maquinaCreada);
            setSuccess(`Producto creado: ${parsed.codigo}`);
            setTimeout(() => setSuccess(''), 2000);
          } else {
            setError('Creación de producto cancelada');
          }
        }
        return;
      }

      // Si no es QR completo, buscar por código simple
      const maquina = maquinas.find(m => m.codigo === codigoOQr);
      if (maquina) {
        setMaquinaSeleccionada(maquina);
        setError('');
      } else {
        setError('Máquina no encontrada. Escanea un QR completo para crear producto nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error procesando código QR');
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
