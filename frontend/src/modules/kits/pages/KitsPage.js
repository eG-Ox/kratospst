import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { kitsService, cotizacionesService } from '../../../core/services/apiServices';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/KitsPage.css';

const emptyKit = {
  nombre: '',
  descripcion: '',
  activo: true,
  productos: []
};

const createItem = () => ({
  producto_id: '',
  cantidad: 1,
  precio_unitario: 0,
  precio_final: 0,
  subtotal: 0
});

const KitsPage = () => {
  const mountedRef = useMountedRef();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoKit, setEditandoKit] = useState(null);
  const [kitForm, setKitForm] = useState(emptyKit);
  const [productos, setProductos] = useState([]);

  const cargarKits = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await kitsService.listar();
      if (!mountedRef.current) return;
      setKits(resp.data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando kits:', err);
      if (mountedRef.current) {
        setError('Error al cargar kits');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [mountedRef]);

  const cargarProductos = useCallback(async () => {
    try {
      const resp = await cotizacionesService.productosCotizacion({});
      if (mountedRef.current) {
        setProductos(resp.data || []);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  }, [mountedRef]);

  useEffect(() => {
    cargarKits();
    cargarProductos();
  }, [cargarKits, cargarProductos]);

  const resetForm = () => {
    setKitForm(emptyKit);
    setEditandoKit(null);
  };

  const abrirModal = () => {
    resetForm();
    setMostrarModal(true);
  };

  const handleEditar = async (kit) => {
    try {
      const resp = await kitsService.getById(kit.id);
      const data = resp.data;
      if (!mountedRef.current) return;
      setEditandoKit(kit);
      setKitForm({
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        activo: !!data.activo,
        productos: (data.productos || []).map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: Number(item.precio_unitario || 0),
          precio_final: Number(item.precio_final || 0),
          subtotal: Number(item.subtotal || 0)
        }))
      });
      setMostrarModal(true);
    } catch (err) {
      console.error('Error obteniendo kit:', err);
      if (mountedRef.current) {
        setError('Error al obtener kit');
      }
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('Deseas eliminar este kit?')) {
      return;
    }
    try {
      await kitsService.eliminar(id);
      await cargarKits();
    } catch (err) {
      console.error('Error eliminando kit:', err);
      if (mountedRef.current) {
        setError('Error al eliminar kit');
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await kitsService.toggle(id);
      await cargarKits();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      if (mountedRef.current) {
        setError('Error al actualizar estado');
      }
    }
  };

  const handleAgregarItem = () => {
    setKitForm((prev) => ({ ...prev, productos: [...prev.productos, createItem()] }));
  };

  const handleQuitarItem = (index) => {
    setKitForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, idx) => idx !== index)
    }));
  };

  const actualizarItem = (index, changes) => {
    setKitForm((prev) => {
      const productos = prev.productos.map((item, idx) =>
        idx === index ? { ...item, ...changes } : item
      );
      return { ...prev, productos };
    });
  };

  const handleProductoChange = (index, productoId) => {
    const producto = productos.find((item) => String(item.id) === String(productoId));
    if (!producto) {
      actualizarItem(index, { producto_id: productoId });
      return;
    }
    const precio = Number(producto.precio_venta || 0);
    actualizarItem(index, {
      producto_id: productoId,
      precio_unitario: precio,
      precio_final: precio,
      subtotal: precio * Number(kitForm.productos[index].cantidad || 0)
    });
  };

  const recalcularItem = (index, next) => {
    const cantidad = Number(next.cantidad || kitForm.productos[index].cantidad || 0);
    const precioFinal = Number(next.precio_final || kitForm.productos[index].precio_final || 0);
    const subtotal = cantidad * precioFinal;
    actualizarItem(index, { ...next, subtotal });
  };

  const precioTotal = useMemo(
    () => kitForm.productos.reduce((acc, item) => acc + Number(item.subtotal || 0), 0),
    [kitForm.productos]
  );

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');

    if (!kitForm.nombre) {
      setError('Nombre es requerido');
      return;
    }

    try {
      const payload = {
        ...kitForm,
        productos: kitForm.productos
      };
      if (editandoKit) {
        await kitsService.editar(editandoKit.id, payload);
      } else {
        await kitsService.crear(payload);
      }
      if (mountedRef.current) {
        setMostrarModal(false);
      }
      resetForm();
      await cargarKits();
    } catch (err) {
      console.error('Error guardando kit:', err);
      if (mountedRef.current) {
        setError(err.response?.data?.error || 'Error al guardar kit');
      }
    }
  };

  return (
    <div className="kits-container">
      <div className="kits-header">
        <h1>Kits</h1>
        <button className="btn-primary" onClick={abrirModal}>
          + Nuevo Kit
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando kits...</div>
      ) : (
        <div className="kits-table-container">
          {kits.length > 0 ? (
            <table className="kits-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripcion</th>
                  <th>Precio total</th>
                  <th>Estado</th>
                  <th className="icon-col" title="Acciones">
                    <span className="icon-label" aria-label="Acciones">...</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {kits.map((kit) => (
                  <tr key={kit.id}>
                    <td>{kit.nombre}</td>
                    <td>{kit.descripcion || '-'}</td>
                    <td>{Number(kit.precio_total || 0).toFixed(2)}</td>
                    <td>{kit.activo ? 'Activo' : 'Inactivo'}</td>
                    <td className="acciones">
                      <button className="btn-edit" onClick={() => handleEditar(kit)}>
                        Editar
                      </button>
                      <button className="btn-secondary" onClick={() => handleToggle(kit.id)}>
                        {kit.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button className="btn-delete" onClick={() => handleEliminar(kit.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">No hay kits registrados</p>
          )}
        </div>
      )}

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editandoKit ? 'Editar Kit' : 'Nuevo Kit'}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  resetForm();
                  setMostrarModal(false);
                }}
              >
                X
              </button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      value={kitForm.nombre}
                      onChange={(e) => setKitForm({ ...kitForm, nombre: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Activo</label>
                    <select
                      value={kitForm.activo ? '1' : '0'}
                      onChange={(e) => setKitForm({ ...kitForm, activo: e.target.value === '1' })}
                    >
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Descripcion</label>
                    <input
                      type="text"
                      value={kitForm.descripcion}
                      onChange={(e) => setKitForm({ ...kitForm, descripcion: e.target.value })}
                    />
                  </div>
                </div>

                <div className="kit-items">
                  <div className="kit-items-header">
                    <h3>Productos del kit</h3>
                    <button type="button" className="btn-secondary" onClick={handleAgregarItem}>
                      + Agregar
                    </button>
                  </div>
                  {kitForm.productos.length === 0 ? (
                    <p className="empty-message">Agrega productos al kit.</p>
                  ) : (
                    <div className="kit-items-list">
                      {kitForm.productos.map((item, index) => (
                        <div className="kit-item" key={`${item.producto_id}-${index}`}>
                          <div className="kit-item-row">
                            <div className="form-group">
                              <label>Producto</label>
                              <select
                                value={item.producto_id}
                                onChange={(e) =>
                                  handleProductoChange(index, e.target.value)
                                }
                              >
                                <option value="">Selecciona...</option>
                                {productos.map((prod) => (
                                  <option key={prod.id} value={prod.id}>
                                    {prod.codigo} - {prod.descripcion}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Cantidad</label>
                              <input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) =>
                                  recalcularItem(index, { cantidad: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="kit-item-row">
                            <div className="form-group">
                              <label>Precio unitario</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.precio_unitario}
                                onChange={(e) =>
                                  actualizarItem(index, {
                                    precio_unitario: Number(e.target.value || 0)
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Precio final</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.precio_final}
                                onChange={(e) =>
                                  recalcularItem(index, { precio_final: e.target.value })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Subtotal</label>
                              <input type="number" value={item.subtotal} readOnly />
                            </div>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() => handleQuitarItem(index)}
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
              <div className="modal-footer">
                <div className="kit-total">Total: {precioTotal.toFixed(2)}</div>
                <button type="submit" className="btn-success">
                  {editandoKit ? 'Guardar' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetForm();
                    setMostrarModal(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitsPage;
