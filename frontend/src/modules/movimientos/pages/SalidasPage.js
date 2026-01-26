import React, { useState, useEffect } from 'react';
import { movimientosService, productosService } from '../../../core/services/apiServices';
import '../styles/MovimientosPage.css';

const SalidasPage = ({ usuario }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formularioData, setFormularioData] = useState({
    maquina_id: '',
    cantidad: '',
    motivo: ''
  });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const resp = await productosService.getAll();
      setProductos(resp.data);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarSalida = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formularioData.maquina_id || !formularioData.cantidad) {
      setError('Producto y cantidad son requeridos');
      return;
    }

    try {
      await movimientosService.registrar({
        maquina_id: formularioData.maquina_id,
        tipo: 'salida',
        cantidad: parseInt(formularioData.cantidad),
        motivo: formularioData.motivo || null
      });
      setSuccess('Salida registrada exitosamente');
      setFormularioData({ maquina_id: '', cantidad: '', motivo: '' });
      await cargarProductos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al registrar salida');
    }
  };

  return (
    <div className="movimientos-container">
      <div className="movimientos-header">
        <h1>📤 Registrar Salidas</h1>
        <p>Registra la salida de máquinas del inventario</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form className="movimientos-form" onSubmit={handleRegistrarSalida}>
        <div className="form-group">
          <label>Producto / Máquina *</label>
          <select
            required
            value={formularioData.maquina_id}
            onChange={(e) => setFormularioData({...formularioData, maquina_id: e.target.value})}
          >
            <option value="">Seleccionar producto</option>
            {productos.map(prod => (
              <option key={prod.id} value={prod.id}>
                {prod.codigo} - {prod.marca} (Stock actual: {prod.stock})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Cantidad *</label>
            <input
              type="number"
              required
              min="1"
              value={formularioData.cantidad}
              onChange={(e) => setFormularioData({...formularioData, cantidad: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Motivo</label>
            <input
              type="text"
              placeholder="Venta, uso, etc."
              value={formularioData.motivo}
              onChange={(e) => setFormularioData({...formularioData, motivo: e.target.value})}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary">Registrar Salida</button>
      </form>
    </div>
  );
};

export default SalidasPage;
