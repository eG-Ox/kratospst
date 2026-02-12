import React, { useState, useEffect } from 'react';
import '../styles/InventarioPage.css';
import MaquinaForm from '../components/MaquinaForm';
import MaquinaTabla from '../components/MaquinaTabla';
import { maquinasService } from '../services/api';

const InventarioPage = () => {
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
      setError('Error al cargar las máquinas');
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
      setError('Error al eliminar la máquina');
    }
  };

  const handleCancelarFormulario = () => {
    setMostraFormulario(false);
    setMaquinaEnEdicion(null);
  };

  return (
    <div className="inventario-page">
      <header className="page-header">
        <h1>Sistema de Inventario de Máquinas</h1>
        <button
          className="btn-agregar"
          onClick={() => {
            setMaquinaEnEdicion(null);
            setMostraFormulario(true);
          }}
          disabled={mostraFormulario}
        >
          + Agregar Nueva Máquina
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
            <div className="loading">Cargando máquinas...</div>
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

export default InventarioPage;
