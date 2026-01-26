import React, { useState, useEffect } from 'react';
import MaquinaForm from '../components/MaquinaForm';
import MaquinaTabla from '../components/MaquinaTabla';
import { maquinasService } from '../services/api';
import '../styles/ProductosPage.css';

const ProductosPage = () => {
  const [maquinas, setMaquinas] = useState([]);
  const [mostraFormulario, setMostraFormulario] = useState(false);
  const [maquinaEnEdicion, setMaquinaEnEdicion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarMaquinas();
  }, []);

  const cargarMaquinas = async () => {
    try {
      setLoading(true);
      const response = await maquinasService.getAll();
      setMaquinas(response.data);
      setError('');
    } catch (error) {
      console.error('Error cargando máquinas:', error);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarMaquina = async (formData) => {
    try {
      if (maquinaEnEdicion) {
        await maquinasService.update(maquinaEnEdicion.id, formData);
      } else {
        await maquinasService.create(formData);
      }
      await cargarMaquinas();
      setMostraFormulario(false);
      setMaquinaEnEdicion(null);
    } catch (error) {
      console.error('Error guardando máquina:', error);
      throw error;
    }
  };

  const handleEditarMaquina = (maquina) => {
    setMaquinaEnEdicion(maquina);
    setMostraFormulario(true);
    window.scrollTo(0, 0);
  };

  const handleEliminarMaquina = async (id) => {
    try {
      await maquinasService.delete(id);
      await cargarMaquinas();
    } catch (error) {
      console.error('Error eliminando máquina:', error);
      setError('Error al eliminar el producto');
    }
  };

  const handleCancelarFormulario = () => {
    setMostraFormulario(false);
    setMaquinaEnEdicion(null);
  };

  return (
    <div className="productos-page">
      <header className="page-header">
        <h1>Gestión de Productos</h1>
        <button
          className="btn-agregar"
          onClick={() => {
            setMaquinaEnEdicion(null);
            setMostraFormulario(true);
          }}
          disabled={mostraFormulario}
        >
          + Agregar Nuevo Producto
        </button>
      </header>

      {error && <div className="error-alert">{error}</div>}

      {mostraFormulario ? (
        <MaquinaForm
          onSubmit={handleAgregarMaquina}
          initialData={maquinaEnEdicion}
          onCancel={handleCancelarFormulario}
        />
      ) : (
        <>
          {loading ? (
            <div className="loading">Cargando productos...</div>
          ) : (
            <MaquinaTabla
              maquinas={maquinas}
              onEdit={handleEditarMaquina}
              onDelete={handleEliminarMaquina}
              onRefresh={cargarMaquinas}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ProductosPage;
