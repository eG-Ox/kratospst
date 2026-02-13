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

const KitsPage = () => {
  const mountedRef = useMountedRef();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalProductos, setMostrarModalProductos] = useState(false);
  const [editandoKit, setEditandoKit] = useState(null);
  const [kitForm, setKitForm] = useState(emptyKit);
  const [productosMap, setProductosMap] = useState({});
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState([]);
  const [productosDraft, setProductosDraft] = useState([]);

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

  const buscarProductos = useCallback(async (q) => {
    try {
      const resp = await cotizacionesService.buscarProductos({ q, limit: 20 });
      if (!mountedRef.current) return;
      setResultadosProducto(resp.data || []);
    } catch (err) {
      console.error('Error buscando productos:', err);
    }
  }, [mountedRef]);

  const cargarProductosPorIds = useCallback(async (ids = []) => {
    const unicos = Array.from(new Set(ids.filter(Boolean)));
    if (!unicos.length) return;
    const faltantes = unicos.filter((id) => !productosMap[id]);
    if (!faltantes.length) return;
    try {
      const respuestas = await Promise.all(
        faltantes.map((id) => cotizacionesService.obtenerProducto(id, {}))
      );
      const nuevos = {};
      respuestas.forEach((resp) => {
        const prod = resp?.data;
        if (prod?.id) {
          nuevos[prod.id] = prod;
        }
      });
      if (!mountedRef.current) return;
      setProductosMap((prev) => ({ ...prev, ...nuevos }));
      setKitForm((prev) => ({
        ...prev,
        productos: prev.productos.map((item) => {
          const info = nuevos[item.producto_id];
          if (!info) return item;
          return {
            ...item,
            codigo: item.codigo || info.codigo,
            descripcion: item.descripcion || info.descripcion,
            marca: item.marca || info.marca
          };
        })
      }));
    } catch (err) {
      console.error('Error cargando productos por ids:', err);
    }
  }, [mountedRef, productosMap]);

  useEffect(() => {
    cargarKits();
  }, [cargarKits]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const term = busquedaProducto.trim();
      if (term.length < 1) {
        setResultadosProducto([]);
        return;
      }
      buscarProductos(term);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaProducto, buscarProductos]);

  const resetForm = () => {
    setKitForm(emptyKit);
    setEditandoKit(null);
    setBusquedaProducto('');
    setResultadosProducto([]);
    setProductosDraft([]);
    setMostrarModalProductos(false);
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
      const ids = (data.productos || []).map((item) => item.producto_id);
      cargarProductosPorIds(ids);
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

  const seleccionarProductoBusqueda = (producto) => {
    if (!producto?.id) return;
    const precio = Number(producto.precio_venta || 0);
    setProductosMap((prev) => ({
      ...prev,
      [producto.id]: producto
    }));
    setProductosDraft((prev) => {
      const idx = prev.findIndex(
        (item) => String(item.producto_id) === String(producto.id)
      );
      if (idx === -1) {
        return [
          ...prev,
          {
            producto_id: producto.id,
            codigo: producto.codigo,
            descripcion: producto.descripcion,
            marca: producto.marca,
            cantidad: 1,
            precio_unitario: precio,
            precio_final: precio,
            subtotal: precio
          }
        ];
      }
      const next = [...prev];
      const cantidadNueva = Number(next[idx].cantidad || 0) + 1;
      const precioFinal = Number(next[idx].precio_final || precio);
      next[idx] = {
        ...next[idx],
        cantidad: cantidadNueva,
        subtotal: cantidadNueva * precioFinal
      };
      return next;
    });
    setBusquedaProducto('');
    setResultadosProducto([]);
  };

  const actualizarDraftItem = (index, changes) => {
    setProductosDraft((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const cantidad = Number((changes.cantidad ?? current.cantidad) || 0);
      const precioUnitario = Number((changes.precio_unitario ?? current.precio_unitario) || 0);
      const precioFinal = Number((changes.precio_final ?? current.precio_final) || 0);
      next[index] = {
        ...current,
        ...changes,
        cantidad,
        precio_unitario: precioUnitario,
        precio_final: precioFinal,
        subtotal: cantidad * precioFinal
      };
      return next;
    });
  };

  const quitarDraftItem = (index) => {
    setProductosDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const abrirModalProductos = () => {
    setProductosDraft(kitForm.productos.map((item) => ({ ...item })));
    setBusquedaProducto('');
    setResultadosProducto([]);
    setMostrarModalProductos(true);
  };

  const guardarProductos = () => {
    setKitForm((prev) => ({
      ...prev,
      productos: productosDraft.map((item) => {
        const cantidad = Number(item.cantidad || 0);
        const precioUnitario = Number(item.precio_unitario || 0);
        const precioFinal = Number(item.precio_final || 0);
        return {
          ...item,
          cantidad,
          precio_unitario: precioUnitario,
          precio_final: precioFinal,
          subtotal: cantidad * precioFinal
        };
      })
    }));
    setMostrarModalProductos(false);
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
                    <button type="button" className="btn-secondary" onClick={abrirModalProductos}>
                      Seleccionar productos
                    </button>
                  </div>
                  {kitForm.productos.length === 0 ? (
                    <p className="empty-message">Agrega productos al kit.</p>
                  ) : (
                    <div className="kit-items-list">
                      <table className="kits-table compact">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Final</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kitForm.productos.map((item, index) => (
                            <tr key={`${item.producto_id}-${index}`}>
                              <td>
                                {(item.codigo || item.descripcion)
                                  ? `${item.codigo || ''} ${item.descripcion || ''}`.trim()
                                  : productosMap[item.producto_id]
                                    ? `${productosMap[item.producto_id].codigo || ''} ${productosMap[item.producto_id].descripcion || ''}`.trim()
                                    : item.producto_id
                                      ? `ID ${item.producto_id}`
                                      : ''}
                              </td>
                              <td>{item.cantidad}</td>
                              <td>{Number(item.precio_final || 0).toFixed(2)}</td>
                              <td>{Number(item.subtotal || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

      {mostrarModalProductos && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--wide">
            <div className="modal-header">
              <h2>Seleccionar productos</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setMostrarModalProductos(false)}
              >
                X
              </button>
            </div>
            <div className="modal-body">
              <div className="kit-products-toolbar">
                <input
                  type="text"
                  placeholder="Buscar por codigo, descripcion o marca"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                />
                <div className="kit-products-actions">
                  <button type="button" className="btn-secondary" onClick={() => setMostrarModalProductos(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-primary" onClick={guardarProductos}>
                    Guardar productos
                  </button>
                </div>
              </div>
              <div className="resultados">
                {resultadosProducto.map((prod) => (
                  <button
                    type="button"
                    className="resultado-item"
                    key={`kit-search-${prod.id}-${prod.codigo}`}
                    onClick={() => seleccionarProductoBusqueda(prod)}
                  >
                    {prod.codigo} - {prod.descripcion} ({prod.marca})
                  </button>
                ))}
              </div>

              <div className="kit-products-table">
                {productosDraft.length === 0 ? (
                  <p className="empty-message">No hay productos agregados.</p>
                ) : (
                  <table className="kits-table compact">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Precio Final</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosDraft.map((item, index) => (
                        <tr key={`${item.producto_id}-${index}`}>
                          <td>
                            {(item.codigo || item.descripcion)
                              ? `${item.codigo || ''} ${item.descripcion || ''}`.trim()
                              : productosMap[item.producto_id]
                                ? `${productosMap[item.producto_id].codigo || ''} ${productosMap[item.producto_id].descripcion || ''}`.trim()
                                : item.producto_id
                                  ? `ID ${item.producto_id}`
                                  : ''}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) =>
                                actualizarDraftItem(index, { cantidad: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={item.precio_unitario}
                              onChange={(e) =>
                                actualizarDraftItem(index, { precio_unitario: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={item.precio_final}
                              onChange={(e) =>
                                actualizarDraftItem(index, { precio_final: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input type="number" value={item.subtotal} readOnly />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() => quitarDraftItem(index)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitsPage;
