import React, { useState, useEffect } from 'react';
import '../styles/MaquinaTabla.css';
import { maquinasService } from '../services/api';

const MaquinaTabla = ({ maquinas, onEdit, onDelete, onRefresh }) => {
  const [filtro, setFiltro] = useState('');
  const [maquinasFiltradas, setMaquinasFiltradas] = useState(maquinas);

  useEffect(() => {
    aplicarFiltro();
  }, [maquinas, filtro]);

  const aplicarFiltro = () => {
    if (!filtro) {
      setMaquinasFiltradas(maquinas);
      return;
    }

    const terminoBusqueda = filtro.toLowerCase();
    const filtradas = maquinas.filter((maquina) =>
      maquina.codigo.toLowerCase().includes(terminoBusqueda) ||
      maquina.marca.toLowerCase().includes(terminoBusqueda) ||
      maquina.tipo_nombre.toLowerCase().includes(terminoBusqueda) ||
      (maquina.descripcion && maquina.descripcion.toLowerCase().includes(terminoBusqueda))
    );
    setMaquinasFiltradas(filtradas);
  };

  const descargarPDF = async (filename) => {
    try {
      const response = await maquinasService.descargarFichaTecnica(filename);
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newTab) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.parentElement.removeChild(link);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error('Error descargando archivo:', error);
    }
  };

  const abrirFichaWeb = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const convertirNumero = (valor) => {
    const num = parseFloat(valor);
    return isNaN(num) ? 0 : num;
  };

  const margenGanancia = (precio_compra, precio_venta) => {
    const compra = convertirNumero(precio_compra);
    const venta = convertirNumero(precio_venta);
    if (compra === 0) return 0;
    return (((venta - compra) / compra) * 100).toFixed(2);
  };

  return (
    <div className="maquina-tabla-container">
      <div className="tabla-header">
        <h2>Inventario de Máquinas</h2>
        <div className="busqueda">
          <input
            type="text"
            placeholder="Buscar por código, marca, tipo o descripción..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="input-busqueda"
          />
        </div>
      </div>

      {maquinasFiltradas.length === 0 ? (
        <div className="no-data">
          {maquinas.length === 0
            ? 'No hay máquinas registradas'
            : 'No se encontraron máquinas que coincidan con la búsqueda'}
        </div>
      ) : (
        <div className="tabla-wrapper">
          <table className="maquinas-tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Marca</th>
                <th>Stock</th>
                <th>Precio Compra</th>
                <th>Precio Venta</th>
                <th>Margen (%)</th>
                <th>P. Mínimo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {maquinasFiltradas.map((maquina) => (
                <tr key={maquina.id}>
                  <td className="codigo">{maquina.codigo}</td>
                  <td>{maquina.tipo_nombre}</td>
                  <td>{maquina.marca}</td>
                  <td className={convertirNumero(maquina.stock) < convertirNumero(maquina.precio_minimo) ? 'bajo-stock' : ''}>
                    {maquina.stock}
                  </td>
                  <td className="precio">${convertirNumero(maquina.precio_compra).toFixed(2)}</td>
                  <td className="precio">${convertirNumero(maquina.precio_venta).toFixed(2)}</td>
                  <td className="margen">
                    {margenGanancia(maquina.precio_compra, maquina.precio_venta)}%
                  </td>
                  <td className="precio">${convertirNumero(maquina.precio_minimo).toFixed(2)}</td>
                  <td className="acciones">
                    <button
                      className="btn-icon btn-view"
                      title="Ver detalles"
                      onClick={() => onEdit(maquina)}
                    >
                      👁️
                    </button>
                    <button
                      className="btn-icon btn-edit"
                      title="Editar"
                      onClick={() => onEdit(maquina)}
                    >
                      ✏️
                    </button>
                    {maquina.ficha_web && (
                      <button
                        className="btn-icon btn-web"
                        title="Abrir ficha web"
                        onClick={() => abrirFichaWeb(maquina.ficha_web)}
                      >
                        🌐
                      </button>
                    )}
                    {maquina.ficha_tecnica_ruta && (
                      <button
                        className="btn-icon btn-pdf"
                        title="Descargar ficha técnica"
                        onClick={() => descargarPDF(maquina.ficha_tecnica_ruta)}
                      >
                        📄
                      </button>
                    )}
                    <button
                      className="btn-icon btn-delete"
                      title="Eliminar"
                      onClick={() => {
                        if (window.confirm('¿Está seguro de que desea eliminar esta máquina?')) {
                          onDelete(maquina.id);
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="tabla-footer">
        <p>Total: {maquinasFiltradas.length} máquinas</p>
      </div>
    </div>
  );
};

export default MaquinaTabla;
