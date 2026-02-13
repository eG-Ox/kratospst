
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clientesService, cotizacionesService, kitsService, productosService, usuariosService, ventasService } from '../../../core/services/apiServices';
import '../styles/VentasPage.css';

const getToday = () => new Date().toISOString().slice(0, 10);

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizarClaveLocal = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const buildMatchKey = (item) => {
  if (!item) return '';
  const productoId = item.producto_id ?? item.productoId ?? null;
  if (productoId) return `PID:${productoId}`;
  const key = normalizarClaveLocal(item.codigo || item.descripcion);
  return key ? `KEY:${key}` : '';
};

const agencias = ['SHALOM', 'MARVISUR', 'OLVA', 'OTROS', 'TIENDA'];

const estadosEnvio = ['PENDIENTE', 'ENVIADO', 'CANCELADO', 'VISITA'];

const VentasModalShell = ({ title, onClose, children }) => (
  <div className="modal-overlay">
    <div className="modal-content ventas-modal">
      <div className="modal-header">
        <h2>{title}</h2>
        <button type="button" className="btn-icon" onClick={onClose}>
          X
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

const VentasStepsHeader = ({ step }) => (
  <div className="ventas-steps">
    <div className={`ventas-step ${step === 1 ? 'active' : ''}`}>1. Datos</div>
    <div className={`ventas-step ${step === 2 ? 'active' : ''}`}>2. Productos</div>
    <div className={`ventas-step ${step === 3 ? 'active' : ''}`}>3. Regalos / Obs</div>
  </div>
);

const VentasModalFooter = ({ step, onBack, onNext, onSave, editId }) => (
  <div className="modal-footer">
    <button type="button" className="btn-secondary" onClick={onBack} disabled={step === 1}>
      Anterior
    </button>
    {step < 3 ? (
      <button type="button" className="btn-primary" onClick={onNext}>
        Siguiente
      </button>
    ) : (
      <button type="button" className="btn-primary" onClick={onSave}>
        {editId ? 'Guardar cambios' : 'Registrar venta'}
      </button>
    )}
  </div>
);

const VentasStepDatos = ({
  formData,
  consultaMensaje,
  consultando,
  usuarioActual,
  agencias,
  estadosEnvio,
  onConsultarDocumento,
  onFormChange
}) => (
  <div className="ventas-step-panel">
    <div className="form-row">
      <div className="form-group">
        <label>Documento (DNI/RUC)</label>
        <div className="ventas-row">
          <select
            value={formData.documentoTipo}
            onChange={(e) => onFormChange({ documentoTipo: e.target.value })}
          >
            <option value="dni">DNI</option>
            <option value="ruc">RUC</option>
          </select>
          <input
            type="text"
            value={formData.documento}
            onChange={(e) => onFormChange({ documento: e.target.value.trim() })}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={onConsultarDocumento}
            disabled={consultando}
          >
            {consultando ? 'Consultando' : 'Consultar'}
          </button>
        </div>
        {consultaMensaje && <span className="helper-text">{consultaMensaje}</span>}
      </div>
      <div className="form-group">
        <label>Cliente</label>
        <input
          type="text"
          value={formData.clienteNombre}
          onChange={(e) => onFormChange({ clienteNombre: e.target.value })}
        />
      </div>
    </div>

    <div className="form-row">
      <div className="form-group">
        <label>Telefono</label>
        <input
          type="text"
          value={formData.clienteTelefono}
          onChange={(e) => onFormChange({ clienteTelefono: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Vendedor</label>
        <input
          type="text"
          value={usuarioActual?.nombre || ''}
          readOnly
          placeholder="Usuario logeado"
        />
      </div>
    </div>

    <div className="form-row">
      <div className="form-group">
        <label>Agencia</label>
        <select
          value={formData.agencia}
          onChange={(e) => onFormChange({ agencia: e.target.value })}
        >
          {agencias.map((ag) => (
            <option key={ag} value={ag}>
              {ag}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Destino</label>
        <input
          type="text"
          value={formData.destino}
          disabled={formData.agencia === 'TIENDA'}
          onChange={(e) => onFormChange({ destino: e.target.value })}
        />
      </div>
    </div>

    {formData.agencia === 'OTROS' && (
      <div className="form-group">
        <label>Agencia (otros)</label>
        <input
          type="text"
          value={formData.agenciaOtro}
          onChange={(e) => onFormChange({ agenciaOtro: e.target.value })}
        />
      </div>
    )}

    <div className="form-row">
      <div className="form-group">
        <label>Fecha de venta</label>
        <input
          type="date"
          value={formData.fechaVenta}
          onChange={(e) => onFormChange({ fechaVenta: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Estado de envio</label>
        <select
          value={formData.estadoEnvio}
          onChange={(e) => {
            const nuevoEstado = e.target.value;
            const now = getToday();
            onFormChange({
              estadoEnvio: nuevoEstado,
              fechaDespacho:
                nuevoEstado === 'ENVIADO' || nuevoEstado === 'VISITA'
                  ? formData.fechaDespacho || now
                  : formData.fechaDespacho,
              fechaCancelacion:
                nuevoEstado === 'CANCELADO'
                  ? formData.fechaCancelacion || now
                  : formData.fechaCancelacion,
              rastreoEstado: nuevoEstado === 'CANCELADO' ? 'ENTREGADO' : formData.rastreoEstado
            });
          }}
        >
          {estadosEnvio.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="form-row">
      <div className="form-group">
        <label>Adelanto</label>
        <input
          type="number"
          value={formData.adelanto}
          onChange={(e) => onFormChange({ adelanto: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>P. Venta (total)</label>
        <input type="number" value={formData.pVenta} readOnly />
      </div>
    </div>
  </div>
);

const VentasStepProductos = ({
  tabProductos,
  tabProductosModo,
  tabReqModo,
  busquedaProducto,
  resultadosProducto,
  busquedaRequerimiento,
  resultadosRequerimiento,
  cargandoKits,
  errorKits,
  kitsDisponibles,
  productos,
  setProductos,
  requerimientos,
  setTabProductos,
  setTabProductosModo,
  setTabReqModo,
  setBusquedaProducto,
  setBusquedaRequerimiento,
  setResultadosRequerimiento,
  agregarProducto,
  agregarKitVenta,
  agregarRequerimiento,
  actualizarItem,
  quitarItem,
  setRequerimientos,
  setRequerimiento,
  requerimiento,
  sugerenciaRequerimiento,
  ajustarCantidadProductoStock
}) => (
  <div className="ventas-step-panel">
    <div className="ventas-tab-buttons">
      <button
        type="button"
        className={`ventas-tab ${tabProductos === 'productos' ? 'active' : ''}`}
        onClick={() => setTabProductos('productos')}
      >
        Productos
      </button>
      <button
        type="button"
        className={`ventas-tab ${tabProductos === 'requerimientos' ? 'active' : ''}`}
        onClick={() => setTabProductos('requerimientos')}
      >
        Requerimientos
      </button>
    </div>

    {tabProductos === 'productos' && (
      <div className="ventas-card">
        <h3>Productos</h3>
        <div className="ventas-subtabs">
          <button
            type="button"
            className={`ventas-subtab ${tabProductosModo === 'avanzada' ? 'active' : ''}`}
            onClick={() => setTabProductosModo('avanzada')}
          >
            Avanzada
          </button>
          <button
            type="button"
            className={`ventas-subtab ${tabProductosModo === 'kits' ? 'active' : ''}`}
            onClick={() => setTabProductosModo('kits')}
          >
            Kits
          </button>
        </div>

        {tabProductosModo === 'avanzada' ? (
          <div className="busqueda-avanzada">
            <input
              type="text"
              placeholder="Buscar producto por codigo, descripcion o marca"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
            />
            <div className="resultados">
              {resultadosProducto.map((producto) => (
                <button
                  type="button"
                  className="resultado-item"
                  key={`${producto.id}-${producto.codigo}`}
                  onClick={() => agregarProducto(producto)}
                >
                  {producto.codigo} - {producto.descripcion} ({producto.marca})
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="busqueda-avanzada">
            {cargandoKits && <div className="helper-text">Cargando kits...</div>}
            {errorKits && <div className="helper-text">{errorKits}</div>}
            <div className="resultados">
              {kitsDisponibles.map((kit) => (
                <button
                  type="button"
                  className="resultado-item"
                  key={`kit-${kit.id}`}
                  onClick={() => agregarKitVenta(kit)}
                >
                  {kit.nombre} (S/. {Number(kit.precio_total || 0).toFixed(2)})
                </button>
              ))}
              {!cargandoKits && !kitsDisponibles.length && !errorKits && (
                <div className="helper-text">No hay kits activos.</div>
              )}
            </div>
          </div>
        )}

        <div className="table-container">
          {productos.length === 0 ? (
            <div className="empty-message">No hay productos agregados.</div>
          ) : (
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Stock</th>
                  <th>Cantidad</th>
                  <th>Venta</th>
                  <th>Compra</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo}</td>
                    <td>{item.descripcion}</td>
                    <td>{item.stock === null ? '-' : item.stock}</td>
                    <td>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => ajustarCantidadProductoStock(item.id, e.target.value)}
                        />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.precioVenta}
                        onChange={(e) =>
                          actualizarItem(setProductos, item.id, {
                            precioVenta: Number(e.target.value || 0)
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.precioCompra}
                        onChange={(e) =>
                          actualizarItem(setProductos, item.id, {
                            precioCompra: Number(e.target.value || 0)
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => quitarItem(setProductos, item.id)}
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
    )}

    {tabProductos === 'requerimientos' && (
      <div className="ventas-card">
        <h3>Requerimientos</h3>
        <div className="ventas-subtabs">
          <button
            type="button"
            className={`ventas-subtab ${tabReqModo === 'avanzada' ? 'active' : ''}`}
            onClick={() => setTabReqModo('avanzada')}
          >
            Avanzada
          </button>
          <button
            type="button"
            className={`ventas-subtab ${tabReqModo === 'kits' ? 'active' : ''}`}
            onClick={() => setTabReqModo('kits')}
          >
            Kits
          </button>
        </div>
        <div className="requerimiento-box">
          {tabReqModo === 'avanzada' ? (
            <div className="form-group">
              <label>Buscar producto</label>
              <input
                type="text"
                placeholder="Buscar por codigo, descripcion o marca"
                value={busquedaRequerimiento}
                onChange={(e) => setBusquedaRequerimiento(e.target.value)}
              />
              <div className="resultados">
                {resultadosRequerimiento.map((producto) => (
                  <button
                    type="button"
                    className="resultado-item"
                    key={`req-${producto.id}-${producto.codigo}`}
                    onClick={() => {
                      setRequerimiento((prev) => ({
                        ...prev,
                        productoId: producto.id,
                        codigo: producto.codigo || '',
                        descripcion: producto.descripcion || producto.codigo || prev.descripcion,
                        marca: producto.marca || '',
                        precioCompra: prev.precioCompra || producto.precio_compra || ''
                      }));
                      setBusquedaRequerimiento('');
                      setResultadosRequerimiento([]);
                    }}
                  >
                    {producto.codigo} - {producto.descripcion} ({producto.marca})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>Seleccionar kit</label>
              <div className="resultados">
                {kitsDisponibles.map((kit) => (
                  <button
                    type="button"
                    className="resultado-item"
                    key={`kit-req-${kit.id}`}
                    onClick={() => agregarKitVenta(kit)}
                  >
                    {kit.nombre} (S/. {Number(kit.precio_total || 0).toFixed(2)})
                  </button>
                ))}
                {!cargandoKits && !kitsDisponibles.length && !errorKits && (
                  <div className="helper-text">No hay kits activos.</div>
                )}
                {errorKits && <div className="helper-text">{errorKits}</div>}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Producto</label>
            <input
              type="text"
              value={requerimiento.descripcion}
              onChange={(e) =>
                setRequerimiento((prev) => ({
                  ...prev,
                  productoId: null,
                  descripcion: e.target.value
                }))
              }
            />
            {requerimiento.codigo && (
              <span className="helper-text">Codigo: {requerimiento.codigo}</span>
            )}
          </div>
          {sugerenciaRequerimiento && (
            <div className="helper-text">
              Sugerencia: {sugerenciaRequerimiento.descripcion || sugerenciaRequerimiento.codigo} /
              {sugerenciaRequerimiento.proveedor ? ` ${sugerenciaRequerimiento.proveedor}` : ''} /
              Compra S/ {Number(sugerenciaRequerimiento.precioCompra || 0).toFixed(2)}
            </div>
          )}
          <div className="form-group">
            <label>Proveedor</label>
            <input
              type="text"
              value={requerimiento.proveedor}
              onChange={(e) =>
                setRequerimiento((prev) => ({ ...prev, proveedor: e.target.value }))
              }
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min="1"
                value={requerimiento.cantidad}
                onChange={(e) =>
                  setRequerimiento((prev) => ({ ...prev, cantidad: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label>Precio compra</label>
              <input
                type="number"
                value={requerimiento.precioCompra}
                onChange={(e) =>
                  setRequerimiento((prev) => ({ ...prev, precioCompra: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="form-group form-group-actions">
            <button type="button" className="btn-secondary" onClick={agregarRequerimiento}>
              Agregar requerimiento
            </button>
          </div>
        </div>
        <div className="table-container">
          {requerimientos.length === 0 ? (
            <div className="empty-message">Sin requerimientos.</div>
          ) : (
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Proveedor</th>
                  <th>Cantidad</th>
                  <th>Compra</th>
                  <th>Venta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requerimientos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo}</td>
                    <td>{item.descripcion}</td>
                    <td>{item.proveedor || item.marca}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          actualizarItem(setRequerimientos, item.id, {
                            cantidad: Number(e.target.value || 1)
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.precioCompra}
                        onChange={(e) =>
                          actualizarItem(setRequerimientos, item.id, {
                            precioCompra: Number(e.target.value || 0)
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.precioVenta}
                        onChange={(e) =>
                          actualizarItem(setRequerimientos, item.id, {
                            precioVenta: Number(e.target.value || 0)
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => quitarItem(setRequerimientos, item.id)}
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
    )}
  </div>
);

const VentasStepRegalos = ({
  tabRegalosModo,
  setTabRegalosModo,
  busquedaRegalo,
  setBusquedaRegalo,
  resultadosRegalo,
  agregarRegalo,
  cargandoKits,
  errorKits,
  kitsDisponibles,
  agregarKitRegalo,
  regalos,
  setRegalos,
  tabReqRegaloModo,
  setTabReqRegaloModo,
  busquedaReqRegalo,
  setBusquedaReqRegalo,
  resultadosReqRegalo,
  setResultadosReqRegalo,
  setRegaloRequerimiento,
  regaloRequerimiento,
  sugerenciaRegalo,
  agregarRegaloRequerimiento,
  regaloRequerimientos,
  setRegaloRequerimientos,
  actualizarItem,
  quitarItem,
  formData,
  setFormData,
  ajustarCantidadRegaloStock
}) => (
  <div className="ventas-step-panel">
    <div className="ventas-split">
      <div className="ventas-card">
        <h3>Regalos</h3>
        <div className="ventas-subtabs">
          <button
            type="button"
            className={`ventas-subtab ${tabRegalosModo === 'avanzada' ? 'active' : ''}`}
            onClick={() => setTabRegalosModo('avanzada')}
          >
            Avanzada
          </button>
          <button
            type="button"
            className={`ventas-subtab ${tabRegalosModo === 'kits' ? 'active' : ''}`}
            onClick={() => setTabRegalosModo('kits')}
          >
            Kits
          </button>
        </div>
        {tabRegalosModo === 'avanzada' ? (
          <div className="busqueda-avanzada">
            <input
              type="text"
              placeholder="Buscar regalo por codigo, descripcion o marca"
              value={busquedaRegalo}
              onChange={(e) => setBusquedaRegalo(e.target.value)}
            />
            <div className="resultados">
              {resultadosRegalo.map((producto) => (
                <button
                  type="button"
                  className="resultado-item"
                  key={`gift-${producto.id}-${producto.codigo}`}
                  onClick={() => agregarRegalo(producto)}
                >
                  {producto.codigo} - {producto.descripcion} ({producto.marca})
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="busqueda-avanzada">
            {cargandoKits && <div className="helper-text">Cargando kits...</div>}
            {errorKits && <div className="helper-text">{errorKits}</div>}
            <div className="resultados">
              {kitsDisponibles.map((kit) => (
                <button
                  type="button"
                  className="resultado-item"
                  key={`kit-gift-${kit.id}`}
                  onClick={() => agregarKitRegalo(kit)}
                >
                  {kit.nombre} (S/. {Number(kit.precio_total || 0).toFixed(2)})
                </button>
              ))}
              {!cargandoKits && !kitsDisponibles.length && !errorKits && (
                <div className="helper-text">No hay kits activos.</div>
              )}
            </div>
          </div>
        )}

        <div className="table-container">
          {regalos.length === 0 ? (
            <div className="empty-message">No hay regalos agregados.</div>
          ) : (
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Stock</th>
                  <th>Cantidad</th>
                  <th>Compra</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {regalos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo}</td>
                    <td>{item.descripcion}</td>
                    <td>{item.stock === null ? '-' : item.stock}</td>
                    <td>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => ajustarCantidadRegaloStock(item.id, e.target.value)}
                        />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.precioCompra}
                        onChange={(e) =>
                          actualizarItem(setRegalos, item.id, {
                            precioCompra: Number(e.target.value || 0)
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => quitarItem(setRegalos, item.id)}
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

      <div className="ventas-card">
        <h3>Requerimiento regalos</h3>
        <div className="ventas-subtabs">
          <button
            type="button"
            className={`ventas-subtab ${tabReqRegaloModo === 'avanzada' ? 'active' : ''}`}
            onClick={() => setTabReqRegaloModo('avanzada')}
          >
            Avanzada
          </button>
          <button
            type="button"
            className={`ventas-subtab ${tabReqRegaloModo === 'kits' ? 'active' : ''}`}
            onClick={() => setTabReqRegaloModo('kits')}
          >
            Kits
          </button>
        </div>
        <div className="requerimiento-box">
          {tabReqRegaloModo === 'avanzada' ? (
            <div className="form-group">
              <label>Buscar producto</label>
              <input
                type="text"
                placeholder="Buscar por codigo, descripcion o marca"
                value={busquedaReqRegalo}
                onChange={(e) => setBusquedaReqRegalo(e.target.value)}
              />
              <div className="resultados">
                {resultadosReqRegalo.map((producto) => (
                  <button
                    type="button"
                    className="resultado-item"
                    key={`req-reg-${producto.id}-${producto.codigo}`}
                    onClick={() => {
                      setRegaloRequerimiento((prev) => ({
                        ...prev,
                        productoId: producto.id,
                        codigo: producto.codigo || '',
                        descripcion: producto.descripcion || producto.codigo || prev.descripcion,
                        marca: producto.marca || '',
                        precioCompra: prev.precioCompra || producto.precio_compra || ''
                      }));
                      setBusquedaReqRegalo('');
                      setResultadosReqRegalo([]);
                    }}
                  >
                    {producto.codigo} - {producto.descripcion} ({producto.marca})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>Seleccionar kit</label>
              <div className="resultados">
                {kitsDisponibles.map((kit) => (
                  <button
                    type="button"
                    className="resultado-item"
                    key={`kit-req-reg-${kit.id}`}
                    onClick={() => agregarKitRegalo(kit)}
                  >
                    {kit.nombre} (S/. {Number(kit.precio_total || 0).toFixed(2)})
                  </button>
                ))}
                {!cargandoKits && !kitsDisponibles.length && !errorKits && (
                  <div className="helper-text">No hay kits activos.</div>
                )}
                {errorKits && <div className="helper-text">{errorKits}</div>}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Producto</label>
            <input
              type="text"
              value={regaloRequerimiento.descripcion}
              onChange={(e) =>
                setRegaloRequerimiento((prev) => ({
                  ...prev,
                  productoId: null,
                  descripcion: e.target.value
                }))
              }
            />
            {regaloRequerimiento.codigo && (
              <span className="helper-text">Codigo: {regaloRequerimiento.codigo}</span>
            )}
          </div>
          {sugerenciaRegalo && (
            <div className="helper-text">
              Sugerencia: {sugerenciaRegalo.descripcion || sugerenciaRegalo.codigo} /
              {sugerenciaRegalo.proveedor ? ` ${sugerenciaRegalo.proveedor}` : ''} /
              Compra S/ {Number(sugerenciaRegalo.precioCompra || 0).toFixed(2)}
            </div>
          )}
          <div className="form-group">
            <label>Proveedor</label>
            <input
              type="text"
              value={regaloRequerimiento.proveedor}
              onChange={(e) =>
                setRegaloRequerimiento((prev) => ({ ...prev, proveedor: e.target.value }))
              }
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min="1"
                value={regaloRequerimiento.cantidad}
                onChange={(e) =>
                  setRegaloRequerimiento((prev) => ({ ...prev, cantidad: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label>Precio compra</label>
              <input
                type="number"
                value={regaloRequerimiento.precioCompra}
                onChange={(e) =>
                  setRegaloRequerimiento((prev) => ({ ...prev, precioCompra: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="form-group form-group-actions">
            <button type="button" className="btn-secondary" onClick={agregarRegaloRequerimiento}>
              Agregar requerimiento
            </button>
          </div>
        </div>

        <div className="table-container">
          {regaloRequerimientos.length === 0 ? (
            <div className="empty-message">Sin requerimientos.</div>
          ) : (
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Proveedor</th>
                  <th>Cantidad</th>
                  <th>Compra</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {regaloRequerimientos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo}</td>
                    <td>{item.descripcion}</td>
                    <td>{item.proveedor || item.marca}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          actualizarItem(setRegaloRequerimientos, item.id, {
                            cantidad: Number(e.target.value || 1)
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.precioCompra}
                        onChange={(e) =>
                          actualizarItem(setRegaloRequerimientos, item.id, {
                            precioCompra: Number(e.target.value || 0)
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => quitarItem(setRegaloRequerimientos, item.id)}
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

        <div className="ventas-notas">
          <label>Observaciones / notas</label>
          <textarea
            value={formData.notas}
            onChange={(e) => setFormData((prev) => ({ ...prev, notas: e.target.value }))}
          />
        </div>
      </div>
    </div>
  </div>
);

const VentasPage = () => {
  const mountedRef = useRef(true);
  const ventasLoadingRef = useRef(false);
  const ventasPaginaRef = useRef(1);
  const ventasRequestRef = useRef(0);
  const [ventas, setVentas] = useState([]);
  const [ventasPagina, setVentasPagina] = useState(1);
  const [ventasHasMore, setVentasHasMore] = useState(true);
  const [ventasLoading, setVentasLoading] = useState(false);
  const [usuariosVentas, setUsuariosVentas] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [consultaMensaje, setConsultaMensaje] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [avisoStock, setAvisoStock] = useState('');
  const [editId, setEditId] = useState(null);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const fechaHoja = getToday();
  const [tabProductos, setTabProductos] = useState('productos');

  const [formData, setFormData] = useState({
    documentoTipo: 'dni',
    documento: '',
    clienteNombre: '',
    clienteTelefono: '',
    vendedorId: '',
    agencia: 'SHALOM',
    agenciaOtro: '',
    destino: '',
    fechaVenta: getToday(),
    estadoEnvio: 'PENDIENTE',
    fechaDespacho: '',
    fechaCancelacion: '',
    encargado: '',
    pVenta: 0,
    adelanto: '',
    rastreoEstado: 'EN TRANSITO',
    ticket: '',
    guia: '',
    retiro: '',
    notas: ''
  });

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState([]);
  const [busquedaRequerimiento, setBusquedaRequerimiento] = useState('');
  const [resultadosRequerimiento, setResultadosRequerimiento] = useState([]);
  const [busquedaRegalo, setBusquedaRegalo] = useState('');
  const [resultadosRegalo, setResultadosRegalo] = useState([]);
  const [busquedaReqRegalo, setBusquedaReqRegalo] = useState('');
  const [resultadosReqRegalo, setResultadosReqRegalo] = useState([]);
  const [tabProductosModo, setTabProductosModo] = useState('avanzada');
  const [tabReqModo, setTabReqModo] = useState('avanzada');
  const [tabRegalosModo, setTabRegalosModo] = useState('avanzada');
  const [tabReqRegaloModo, setTabReqRegaloModo] = useState('avanzada');
  const [kitsDisponibles, setKitsDisponibles] = useState([]);
  const [cargandoKits, setCargandoKits] = useState(false);
  const [errorKits, setErrorKits] = useState('');
  const [productos, setProductos] = useState([]);
  const [requerimientos, setRequerimientos] = useState([]);
  const [regalos, setRegalos] = useState([]);
  const [regaloRequerimientos, setRegaloRequerimientos] = useState([]);

  const [requerimiento, setRequerimiento] = useState({
    productoId: null,
    codigo: '',
    descripcion: '',
    marca: '',
    proveedor: '',
    cantidad: 1,
    precioCompra: ''
  });

  const [regaloRequerimiento, setRegaloRequerimiento] = useState({
    productoId: null,
    codigo: '',
    descripcion: '',
    marca: '',
    proveedor: '',
    cantidad: 1,
    precioCompra: ''
  });

  const [sugerenciaRequerimiento, setSugerenciaRequerimiento] = useState(null);
  const [sugerenciaRegalo, setSugerenciaRegalo] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    const cargarUsuarios = async () => {
      try {
        const resp = await usuariosService.listar();
        const data = Array.isArray(resp.data) ? resp.data : [];
        if (!mountedRef.current) return;
        setUsuariosVentas(data.filter((user) => user.rol === 'ventas'));
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };
    cargarUsuarios();

    try {
      const rawUsuario = localStorage.getItem('usuario');
      if (rawUsuario) {
        setUsuarioActual(JSON.parse(rawUsuario));
      }
    } catch (err) {
      console.error('Error leyendo usuario actual:', err);
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    let activo = true;
    const cargarKits = async () => {
      try {
        setCargandoKits(true);
        setErrorKits('');
        const resp = await kitsService.listarActivos();
        if (!activo) return;
        setKitsDisponibles(resp.data || []);
      } catch (err) {
        if (!activo) return;
        console.error('Error cargando kits:', err);
        setErrorKits('No se pudieron cargar los kits.');
      } finally {
        if (activo) {
          setCargandoKits(false);
        }
      }
    };
    cargarKits();
    return () => {
      activo = false;
    };
  }, [modalOpen]);

  const cargarVentas = useCallback(async (append = false) => {
    if (append && ventasLoadingRef.current) return;
    const requestId = ++ventasRequestRef.current;
    try {
      ventasLoadingRef.current = true;
      setVentasLoading(true);
      const limite = 200;
      const pagina = append ? ventasPaginaRef.current + 1 : 1;
      const resp = await ventasService.listar({ limite, pagina });
      const data = resp.data || [];
      if (!mountedRef.current || requestId !== ventasRequestRef.current) return;
      if (append) {
        setVentas((prev) => [...prev, ...data]);
        setVentasPagina(pagina);
        ventasPaginaRef.current = pagina;
      } else {
        setVentas(data);
        setVentasPagina(1);
        ventasPaginaRef.current = 1;
      }
      setVentasHasMore(data.length === limite);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    } finally {
      if (mountedRef.current && requestId === ventasRequestRef.current) {
        ventasLoadingRef.current = false;
        setVentasLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    cargarVentas(false);
  }, []);

  useEffect(() => {
    if (formData.agencia === 'TIENDA') {
      setFormData((prev) => ({ ...prev, destino: 'TIENDA' }));
      return;
    }
    if (formData.destino === 'TIENDA') {
      setFormData((prev) => ({ ...prev, destino: '' }));
    }
  }, [formData.agencia, formData.destino]);

  const buscarProductos = useCallback(async (q, setResultados) => {
    try {
      const resp = await cotizacionesService.buscarProductos({ q, limit: 20 });
      if (!mountedRef.current) return;
      setResultados(resp.data || []);
    } catch (err) {
      console.error('Error buscando productos:', err);
    }
  }, []);


  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaProducto.trim().length < 1) {
        setResultadosProducto([]);
        return;
      }
      buscarProductos(busquedaProducto.trim(), setResultadosProducto);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaProducto, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaRequerimiento.trim().length < 1) {
        setResultadosRequerimiento([]);
        return;
      }
      buscarProductos(busquedaRequerimiento.trim(), setResultadosRequerimiento);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaRequerimiento, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaRegalo.trim().length < 1) {
        setResultadosRegalo([]);
        return;
      }
      buscarProductos(busquedaRegalo.trim(), setResultadosRegalo);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaRegalo, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (busquedaReqRegalo.trim().length < 1) {
        setResultadosReqRegalo([]);
        return;
      }
      buscarProductos(busquedaReqRegalo.trim(), setResultadosReqRegalo);
    }, 350);
    return () => clearTimeout(timeout);
  }, [busquedaReqRegalo, buscarProductos]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const term = requerimiento.descripcion.trim();
      if (term.length < 2) {
        setSugerenciaRequerimiento(null);
        return;
      }
      try {
        const resp = await ventasService.historialRequerimientos({ q: term });
        const match = resp.data?.[0];
        if (match) {
          setSugerenciaRequerimiento(match);
          setRequerimiento((prev) => ({
            ...prev,
            proveedor: prev.proveedor || match.proveedor || '',
            precioCompra: prev.precioCompra || match.precioCompra || ''
          }));
        }
      } catch (err) {
        console.error('Error buscando historial requerimientos:', err);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [requerimiento.descripcion]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const term = regaloRequerimiento.descripcion.trim();
      if (term.length < 2) {
        setSugerenciaRegalo(null);
        return;
      }
      try {
        const resp = await ventasService.historialRequerimientos({ q: term });
        const match = resp.data?.[0];
        if (match) {
          setSugerenciaRegalo(match);
          setRegaloRequerimiento((prev) => ({
            ...prev,
            proveedor: prev.proveedor || match.proveedor || '',
            precioCompra: prev.precioCompra || match.precioCompra || ''
          }));
        }
      } catch (err) {
        console.error('Error buscando historial regalos:', err);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [regaloRequerimiento.descripcion]);


  const handleConsultarDocumento = async () => {
    setConsultaMensaje('');
    if (formData.documentoTipo === 'dni') {
      if (!/^\d{8}$/.test(formData.documento || '')) {
        setConsultaMensaje('El DNI debe tener 8 digitos.');
        return;
      }
      try {
        setConsultando(true);
        const resp = await clientesService.consultaDni(formData.documento);
        if (resp.data?.success) {
          const nombre = `${resp.data.nombre || ''} ${resp.data.apellido || ''}`.trim();
          setFormData((prev) => ({
            ...prev,
            clienteNombre: nombre
          }));
          setConsultaMensaje('Datos obtenidos.');
        } else {
          setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
        }
      } catch (err) {
        console.error('Error consultando DNI:', err);
        setConsultaMensaje('Error consultando DNI.');
      } finally {
        setConsultando(false);
      }
      return;
    }

    if (!/^\d{11}$/.test(formData.documento || '')) {
      setConsultaMensaje('El RUC debe tener 11 digitos.');
      return;
    }
    try {
      setConsultando(true);
      const resp = await clientesService.consultaRuc(formData.documento);
      if (resp.data?.success) {
        setFormData((prev) => ({
          ...prev,
          clienteNombre: resp.data.razon_social || prev.clienteNombre
        }));
        setConsultaMensaje('Datos obtenidos.');
      } else {
        setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
      }
    } catch (err) {
      console.error('Error consultando RUC:', err);
      setConsultaMensaje('Error consultando RUC.');
    } finally {
      setConsultando(false);
    }
  };

  const getStock = (producto) => {
    const stockRaw =
      producto.stock ??
      producto.stock_total ??
      producto.stock_disponible ??
      producto.cantidad ??
      null;
    return stockRaw === null ? null : Number(stockRaw || 0);
  };

  const ajustarCantidadProductoStock = (itemId, rawCantidad) => {
    const desired = Math.max(1, Number(rawCantidad || 1));
    const current = productos.find((item) => item.id === itemId);
    if (!current) return;
    const stockRaw = getStock(current);
    const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
    const qtyStock = stock > 0 ? Math.min(stock, desired) : 0;
    const qtyReq = Math.max(desired - qtyStock, 0);

    setProductos((prev) => {
      const next = prev
        .map((item) => (item.id === itemId ? { ...item, cantidad: qtyStock } : item))
        .filter((item) => !(item.id === itemId && qtyStock <= 0));
      return next;
    });

    setRequerimientos((prev) => {
      const matchKey = buildMatchKey({ producto_id: current.producto_id ?? current.id, codigo: current.codigo, descripcion: current.descripcion });
      const idx = prev.findIndex((item) => buildMatchKey(item) === matchKey);
      if (qtyReq <= 0) {
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      const base = idx >= 0 ? prev[idx] : {};
      const nuevo = {
        ...base,
        id: base.id || genId(),
        tipo: 'compra',
        producto_id: current.producto_id ?? current.id ?? base.producto_id ?? null,
        codigo: current.codigo || base.codigo || '',
        descripcion: current.descripcion || base.descripcion || '',
        marca: current.marca || base.marca || '',
        stock: stockRaw,
        cantidad: qtyReq,
        precioCompra: base.precioCompra ?? Number(current.precioCompra || current.precio_compra || 0),
        precioVenta: base.precioVenta ?? Number(current.precioVenta || current.precio_venta || 0),
        proveedor: base.proveedor || ''
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nuevo;
        return next;
      }
      return [...prev, nuevo];
    });

    if (qtyReq > 0) {
      setAvisoStock(
        `Stock insuficiente: ${current.codigo || current.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
      );
    } else {
      setAvisoStock('');
    }
  };

  const ajustarCantidadRegaloStock = (itemId, rawCantidad) => {
    const desired = Math.max(1, Number(rawCantidad || 1));
    const current = regalos.find((item) => item.id === itemId);
    if (!current) return;
    const stockRaw = getStock(current);
    const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
    const qtyStock = stock > 0 ? Math.min(stock, desired) : 0;
    const qtyReq = Math.max(desired - qtyStock, 0);

    setRegalos((prev) => {
      const next = prev
        .map((item) => (item.id === itemId ? { ...item, cantidad: qtyStock } : item))
        .filter((item) => !(item.id === itemId && qtyStock <= 0));
      return next;
    });

    setRegaloRequerimientos((prev) => {
      const matchKey = buildMatchKey({ producto_id: current.producto_id ?? current.id, codigo: current.codigo, descripcion: current.descripcion });
      const idx = prev.findIndex((item) => buildMatchKey(item) === matchKey);
      if (qtyReq <= 0) {
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      const base = idx >= 0 ? prev[idx] : {};
      const nuevo = {
        ...base,
        id: base.id || genId(),
        tipo: 'compra',
        producto_id: current.producto_id ?? current.id ?? base.producto_id ?? null,
        codigo: current.codigo || base.codigo || '',
        descripcion: current.descripcion || base.descripcion || '',
        marca: current.marca || base.marca || '',
        stock: stockRaw,
        cantidad: qtyReq,
        precioCompra: base.precioCompra ?? Number(current.precioCompra || current.precio_compra || 0),
        proveedor: base.proveedor || ''
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nuevo;
        return next;
      }
      return [...prev, nuevo];
    });

    if (qtyReq > 0) {
      setAvisoStock(
        `Stock insuficiente: ${current.codigo || current.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
      );
    } else {
      setAvisoStock('');
    }
  };

  const mapKitItemToProducto = (item) => ({
    id: genId(),
    tipo: 'stock',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioVenta: Number(item.precio_final || item.precio_unitario || 0),
    precioCompra: 0,
    proveedor: ''
  });

  const mapKitItemToRequerimiento = (item) => ({
    id: genId(),
    tipo: 'compra',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioVenta: Number(item.precio_final || item.precio_unitario || 0),
    precioCompra: 0,
    proveedor: ''
  });

  const mapKitItemToRegalo = (item) => ({
    id: genId(),
    tipo: 'stock',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioCompra: 0,
    proveedor: ''
  });

  const mapKitItemToReqRegalo = (item) => ({
    id: genId(),
    tipo: 'compra',
    producto_id: item.producto_id,
    codigo: item.codigo || '',
    descripcion: item.descripcion || '',
    marca: item.marca || '',
    stock: Number(item.stock || 0),
    cantidad: Number(item.cantidad || 1),
    precioCompra: 0,
    proveedor: ''
  });

  const agregarKitVenta = async (kit) => {
    try {
      const resp = await kitsService.obtenerParaVenta(kit.id);
      const conStock = resp.data?.productos_con_stock || [];
      const sinStock = resp.data?.productos_sin_stock || [];
      if (conStock.length) {
        setProductos((prev) => [...prev, ...conStock.map(mapKitItemToProducto)]);
      }
      if (sinStock.length) {
        setRequerimientos((prev) => [...prev, ...sinStock.map(mapKitItemToRequerimiento)]);
      }
      if (!conStock.length && !sinStock.length) {
        setAvisoStock('El kit no tiene productos.');
      } else if (sinStock.length) {
        setAvisoStock('Kit: productos sin stock enviados a requerimientos.');
      } else {
        setAvisoStock('Kit agregado a productos.');
      }
    } catch (err) {
      console.error('Error agregando kit:', err);
      setAvisoStock('Error agregando kit.');
    }
  };

  const agregarKitRegalo = async (kit) => {
    try {
      const resp = await kitsService.obtenerParaVenta(kit.id);
      const conStock = resp.data?.productos_con_stock || [];
      const sinStock = resp.data?.productos_sin_stock || [];
      if (conStock.length) {
        setRegalos((prev) => [...prev, ...conStock.map(mapKitItemToRegalo)]);
      }
      if (sinStock.length) {
        setRegaloRequerimientos((prev) => [...prev, ...sinStock.map(mapKitItemToReqRegalo)]);
      }
      if (!conStock.length && !sinStock.length) {
        setAvisoStock('El kit no tiene productos.');
      } else if (sinStock.length) {
        setAvisoStock('Kit: regalos sin stock enviados a requerimientos.');
      } else {
        setAvisoStock('Kit agregado a regalos.');
      }
    } catch (err) {
      console.error('Error agregando kit regalos:', err);
      setAvisoStock('Error agregando kit.');
    }
  };

  const agregarProducto = (producto) => {
    const stock = getStock(producto);
    if (stock !== null && stock <= 0) {
      setRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioVenta: Number(producto.precio_venta || 0),
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('Producto sin stock enviado a requerimiento de compra.');
    } else {
      setProductos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'stock',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioVenta: Number(producto.precio_venta || 0),
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('');
    }
    setBusquedaProducto('');
    setResultadosProducto([]);
  };

  const agregarRequerimiento = async () => {
    const descripcion = requerimiento.descripcion.trim();
    const codigo = String(requerimiento.codigo || '').trim();
    if (!descripcion && !codigo) return;
    const clave = normalizarClaveLocal(codigo || descripcion);
    if (clave) {
      const yaExiste = requerimientos.some(
        (item) => normalizarClaveLocal(item.codigo || item.descripcion) === clave
      );
      if (yaExiste) {
        setAvisoStock('Requerimiento ya agregado.');
        return;
      }
    }
    let productoMatch = null;
    if (codigo) {
      try {
        if (requerimiento.productoId) {
          const resp = await productosService.getById(requerimiento.productoId);
          productoMatch = resp?.data || null;
        } else {
          const resp = await productosService.getByCodigo(codigo);
          productoMatch = resp?.data || null;
        }
      } catch (_) {
        productoMatch = null;
      }
    }

    if (productoMatch) {
      const stockRaw = getStock(productoMatch);
      const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
      const desiredQty = Math.max(1, Number(requerimiento.cantidad || 1));
      const qtyStock = stock > 0 ? Math.min(stock, desiredQty) : 0;
      const qtyReq = Math.max(desiredQty - qtyStock, 0);
      const baseItem = {
        id: genId(),
        producto_id: productoMatch.id,
        codigo: productoMatch.codigo || codigo,
        descripcion: productoMatch.descripcion || descripcion || codigo,
        marca: productoMatch.marca || requerimiento.marca || '',
        stock: stockRaw,
        proveedor: requerimiento.proveedor.trim()
      };

      if (qtyStock > 0) {
        setProductos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'stock',
            cantidad: qtyStock,
            precioVenta: Number(productoMatch.precio_venta || 0),
            precioCompra: Number(productoMatch.precio_compra || 0)
          }
        ]);
      }
      if (qtyReq > 0) {
        setRequerimientos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'compra',
            cantidad: qtyReq,
            precioVenta: Number(productoMatch.precio_venta || 0),
            precioCompra: Number(requerimiento.precioCompra || 0)
          }
        ]);
      }
      if (qtyReq > 0 && qtyStock > 0) {
        setAvisoStock(
          `Stock insuficiente: ${productoMatch.codigo || productoMatch.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
        );
      } else if (qtyReq > 0) {
        setAvisoStock('Producto sin stock enviado a requerimiento de compra.');
      } else {
        setAvisoStock('');
      }
      setRequerimiento({
        productoId: null,
        codigo: '',
        descripcion: '',
        marca: '',
        proveedor: '',
        cantidad: 1,
        precioCompra: ''
      });
      setBusquedaRequerimiento('');
      setResultadosRequerimiento([]);
      return;
    }
    try {
      const resp = await ventasService.crearRequerimientoProducto({
        descripcion,
        codigo,
        marca: requerimiento.marca || '',
        precioCompra: Number(requerimiento.precioCompra || 0)
      });
      const data = resp?.data || {};
      const codigoFinal = data.codigo || codigo;
      const descripcionFinal = data.descripcion || descripcion || codigoFinal;
      const marcaFinal = data.marca || requerimiento.marca || '';
      setRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: data.id || null,
          codigo: codigoFinal,
          descripcion: descripcionFinal,
          marca: marcaFinal,
          stock: null,
          cantidad: Number(requerimiento.cantidad || 1),
          precioCompra: Number(requerimiento.precioCompra || 0),
          precioVenta: 0,
          proveedor: requerimiento.proveedor.trim()
        }
      ]);
      setAvisoStock(data.existente ? 'Producto ya existia, se reutilizo.' : 'Producto creado.');
    } catch (err) {
      console.error('Error creando requerimiento:', err);
      setAvisoStock('Error creando requerimiento.');
      return;
    }
    setRequerimiento({
      productoId: null,
      codigo: '',
      descripcion: '',
      marca: '',
      proveedor: '',
      cantidad: 1,
      precioCompra: ''
    });
    setBusquedaRequerimiento('');
    setResultadosRequerimiento([]);
  };

  const agregarRegalo = (producto) => {
    const stock = getStock(producto);
    if (stock !== null && stock <= 0) {
      setRegaloRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('Regalo sin stock enviado a requerimiento de compra.');
    } else {
      setRegalos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'stock',
          producto_id: producto.id,
          codigo: producto.codigo || '',
          descripcion: producto.descripcion || '',
          marca: producto.marca || '',
          stock,
          cantidad: 1,
          precioCompra: Number(producto.precio_compra || 0),
          proveedor: ''
        }
      ]);
      setAvisoStock('');
    }
    setBusquedaRegalo('');
    setResultadosRegalo([]);
  };

  const agregarRegaloRequerimiento = async () => {
    const descripcion = regaloRequerimiento.descripcion.trim();
    const codigo = String(regaloRequerimiento.codigo || '').trim();
    if (!descripcion && !codigo) return;
    const clave = normalizarClaveLocal(codigo || descripcion);
    if (clave) {
      const yaExiste = regaloRequerimientos.some(
        (item) => normalizarClaveLocal(item.codigo || item.descripcion) === clave
      );
      if (yaExiste) {
        setAvisoStock('Requerimiento ya agregado.');
        return;
      }
    }
    let productoMatch = null;
    if (codigo) {
      try {
        if (regaloRequerimiento.productoId) {
          const resp = await productosService.getById(regaloRequerimiento.productoId);
          productoMatch = resp?.data || null;
        } else {
          const resp = await productosService.getByCodigo(codigo);
          productoMatch = resp?.data || null;
        }
      } catch (_) {
        productoMatch = null;
      }
    }

    if (productoMatch) {
      const stockRaw = getStock(productoMatch);
      const stock = stockRaw === null ? 0 : Math.max(0, Number(stockRaw || 0));
      const desiredQty = Math.max(1, Number(regaloRequerimiento.cantidad || 1));
      const qtyStock = stock > 0 ? Math.min(stock, desiredQty) : 0;
      const qtyReq = Math.max(desiredQty - qtyStock, 0);
      const baseItem = {
        id: genId(),
        producto_id: productoMatch.id,
        codigo: productoMatch.codigo || codigo,
        descripcion: productoMatch.descripcion || descripcion || codigo,
        marca: productoMatch.marca || regaloRequerimiento.marca || '',
        stock: stockRaw,
        proveedor: regaloRequerimiento.proveedor.trim()
      };

      if (qtyStock > 0) {
        setRegalos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'stock',
            cantidad: qtyStock,
            precioCompra: Number(productoMatch.precio_compra || 0)
          }
        ]);
      }
      if (qtyReq > 0) {
        setRegaloRequerimientos((prev) => [
          ...prev,
          {
            ...baseItem,
            tipo: 'compra',
            cantidad: qtyReq,
            precioCompra: Number(regaloRequerimiento.precioCompra || 0)
          }
        ]);
      }
      if (qtyReq > 0 && qtyStock > 0) {
        setAvisoStock(
          `Stock insuficiente: ${productoMatch.codigo || productoMatch.descripcion}. ${qtyStock} en tienda y ${qtyReq} a requerimiento.`
        );
      } else if (qtyReq > 0) {
        setAvisoStock('Regalo sin stock enviado a requerimiento de compra.');
      } else {
        setAvisoStock('');
      }
      setRegaloRequerimiento({
        productoId: null,
        codigo: '',
        descripcion: '',
        marca: '',
        proveedor: '',
        cantidad: 1,
        precioCompra: ''
      });
      setBusquedaReqRegalo('');
      setResultadosReqRegalo([]);
      return;
    }
    try {
      const resp = await ventasService.crearRequerimientoProducto({
        descripcion,
        codigo,
        marca: regaloRequerimiento.marca || '',
        precioCompra: Number(regaloRequerimiento.precioCompra || 0)
      });
      const data = resp?.data || {};
      const codigoFinal = data.codigo || codigo;
      const descripcionFinal = data.descripcion || descripcion || codigoFinal;
      const marcaFinal = data.marca || regaloRequerimiento.marca || '';
      setRegaloRequerimientos((prev) => [
        ...prev,
        {
          id: genId(),
          tipo: 'compra',
          producto_id: data.id || null,
          codigo: codigoFinal,
          descripcion: descripcionFinal,
          marca: marcaFinal,
          stock: null,
          cantidad: Number(regaloRequerimiento.cantidad || 1),
          precioCompra: Number(regaloRequerimiento.precioCompra || 0),
          proveedor: regaloRequerimiento.proveedor.trim()
        }
      ]);
      setAvisoStock(data.existente ? 'Producto ya existia, se reutilizo.' : 'Producto creado.');
    } catch (err) {
      console.error('Error creando requerimiento regalo:', err);
      setAvisoStock('Error creando requerimiento.');
      return;
    }
    setRegaloRequerimiento({
      productoId: null,
      codigo: '',
      descripcion: '',
      marca: '',
      proveedor: '',
      cantidad: 1,
      precioCompra: ''
    });
    setBusquedaReqRegalo('');
    setResultadosReqRegalo([]);
  };

  const actualizarItem = (setLista, id, changes) => {
    setLista((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const quitarItem = (setLista, id) => {
    setLista((prev) => prev.filter((item) => item.id !== id));
  };

  const totalVenta = useMemo(() => {
    return productos.reduce(
      (acc, item) => acc + Number(item.precioVenta || 0) * Number(item.cantidad || 0),
      0
    );
  }, [productos]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, pVenta: Number(totalVenta || 0) }));
  }, [totalVenta]);

  const resetFormulario = () => {
    setFormData({
      documentoTipo: 'dni',
      documento: '',
      clienteNombre: '',
      clienteTelefono: '',
      vendedorId: '',
      agencia: 'SHALOM',
      agenciaOtro: '',
      destino: '',
      fechaVenta: getToday(),
      estadoEnvio: 'PENDIENTE',
      fechaDespacho: '',
      fechaCancelacion: '',
      encargado: '',
      pVenta: 0,
      adelanto: '',
      rastreoEstado: 'EN TRANSITO',
      ticket: '',
      guia: '',
      retiro: '',
      notas: ''
    });
    setProductos([]);
    setRequerimientos([]);
    setRegalos([]);
    setRegaloRequerimientos([]);
    setRequerimiento({
      productoId: null,
      codigo: '',
      descripcion: '',
      marca: '',
      proveedor: '',
      cantidad: 1,
      precioCompra: ''
    });
    setBusquedaRequerimiento('');
    setResultadosRequerimiento([]);
    setSugerenciaRequerimiento(null);
    setConsultaMensaje('');
    setAvisoStock('');
    setError('');
    setStep(1);
    setEditId(null);
    setTabProductosModo('avanzada');
    setTabReqModo('avanzada');
    setTabRegalosModo('avanzada');
    setTabReqRegaloModo('avanzada');
  };

  const cerrarModal = () => {
    setModalOpen(false);
    resetFormulario();
  };

  const abrirModal = () => {
    const vendedorId = usuarioActual?.id ? String(usuarioActual.id) : '';
    setFormData((prev) => ({ ...prev, vendedorId }));
    setModalOpen(true);
    setStep(1);
  };

  const abrirRotulo = (venta) => {
    if (!venta) return;
    const agenciaDestino = `${venta.agencia || '-'}` + (venta.destino ? ` - ${venta.destino}` : '');
    const agenciaOtro = venta.agencia === 'OTROS' && venta.agenciaOtro ? venta.agenciaOtro : '';
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Rótulo Venta #${venta.id}</title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: 'IBM Plex Sans', sans-serif;
              display: flex;
              align-items: flex-start;
              justify-content: flex-start;
              min-height: 100vh;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              width: calc(297mm - 16mm);
              height: calc(210mm - 16mm);
              margin: 8mm;
              border: 3px solid #f5b000;
              border-radius: 8mm;
              padding: 10mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 6mm;
              text-align: center;
              position: relative;
              background: #fff;
            }
            .watermark {
              position: absolute;
              inset: 16mm 20mm;
              display: grid;
              place-items: center;
              opacity: 0.12;
              pointer-events: none;
              z-index: 0;
            }
            .watermark img { width: 100%; height: 100%; object-fit: contain; }
            .logo { width: 50mm; position: absolute; top: 8mm; left: 8mm; }
            .content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 6mm;
              padding-top: 10mm;
              z-index: 1;
            }
            .header { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
            .dni { font-size: 22mm; font-weight: 900; color: #0f3f91; letter-spacing: 0.04em; width: 100%; text-align: center; margin: 0; }
            .nombre { font-size: 30mm; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.02; margin: 0; }
            .destino { font-size: 20mm; font-weight: 900; color: #0f3f91; text-transform: uppercase; line-height: 1.08; margin: 0; }
            .agencia { font-size: 18mm; font-weight: 900; color: #0f3f91; text-transform: uppercase; line-height: 1.08; margin: 0; }
            .print-btn { position: fixed; top: 12px; right: 12px; padding: 10px 16px; border-radius: 999px; border: 1px solid #cbd5f5; background: #fff; cursor: pointer; }
            @media print {
              .print-btn { display: none; }
              body { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Imprimir</button>
          <div class="sheet">
            <div class="watermark"><img src="/static/img/KRATOS_LOGO.PNG" alt="" /></div>
            <img src="/static/img/KRATOS_LOGO.PNG" class="logo" alt="Kratos" />
            <div class="content" id="rotuloContent">
              <div class="header">
                <div class="dni" data-base="22">${(venta.documentoTipo || 'dni').toUpperCase()} ${venta.documento || '-'}</div>
              </div>
              <div class="nombre" data-base="30">${venta.clienteNombre || '-'}</div>
              <div class="destino" data-base="20">${agenciaDestino}</div>
              ${agenciaOtro ? `<div class="agencia" data-base="18">${agenciaOtro}</div>` : ''}
            </div>
          </div>
          <script>
            (function () {
              const container = document.getElementById('rotuloContent');
              if (!container) return;
              const maxHeight = () => container.parentElement.clientHeight - 28;
              const elements = Array.from(container.querySelectorAll('[data-base]'));
              elements.forEach((el) => {
                const base = Number(el.getAttribute('data-base')) || 18;
                el.style.fontSize = base + 'mm';
              });
              let size = 0;
              let guard = 80;
              while (container.scrollHeight > maxHeight() && guard-- > 0) {
                elements.forEach((el) => {
                  const current = parseFloat(el.style.fontSize);
                  const next = Math.max(current - 0.6, 10);
                  el.style.fontSize = next + 'mm';
                });
              }
            })();
          </script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) {
      alert('Bloqueador de popups: permite abrir la pestaña para imprimir el rótulo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const renderItemsTable = (items, headers) => {
    if (!items || items.length === 0) return '';
    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const body = items
      .map((item) => {
        return `<tr>${item.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
      })
      .join('');
    return `
      <table class="tabla">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
  };

  const abrirHojaRequerimiento = () => {
    const pendientes = pendientesDia;
    const historialRequerimientos = new Map();

    const normalizarClaveReq = (item) => {
      const base = `${item?.codigo || ''} ${item?.descripcion || ''}`.trim();
      return base.toUpperCase();
    };

    const ventasOrdenadas = [...(ventas || [])].sort(
      (a, b) => Number(b.id || 0) - Number(a.id || 0)
    );

    ventasOrdenadas.forEach((venta) => {
      const items = [
        ...(venta.requerimientos || []),
        ...(venta.regaloRequerimientos || [])
      ];
      items.forEach((item) => {
        const proveedor = String(item?.proveedor || '').trim();
        const precioCompra = Number(item?.precioCompra || 0);
        if (!proveedor && !precioCompra) return;
        const key = normalizarClaveReq(item);
        if (!key) return;
        if (!historialRequerimientos.has(key)) {
          historialRequerimientos.set(key, {
            proveedor,
            precioCompra: precioCompra > 0 ? precioCompra : ''
          });
        }
      });
    });

    const htmlPedidos = pendientes
      .map((venta) => {
        const vendedor = usuariosVentas.find(
          (user) => String(user.id) === String(venta.vendedorId)
        );
        const productosStock = venta.productos || [];
        const requerimientosCompra = venta.requerimientos || [];
        const regalosStock = venta.regalos || [];
        const regalosCompra = venta.regaloRequerimientos || [];

        const tablaStock = renderItemsTable(
          productosStock.map((item) => [
            `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
            item.cantidad || 0,
            `S/ ${Number(item.precioVenta || 0).toFixed(2)}`
          ]),
          ['Producto', 'Cantidad', 'Precio venta']
        );

        const tablaCompra = renderItemsTable(
          requerimientosCompra.map((item) => {
            const key = normalizarClaveReq(item);
            const hist = historialRequerimientos.get(key) || {};
            const proveedor = hist.proveedor || '';
            const compra = hist.precioCompra ? `S/ ${Number(hist.precioCompra || 0).toFixed(2)}` : '';
            return [
            `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
            item.cantidad || 0,
            proveedor,
            compra
          ];
          }),
          ['Producto', 'Cantidad', 'Proveedor', 'Compra']
        );

        const tablaRegalosStock = renderItemsTable(
          regalosStock.map((item) => [
            `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
            item.cantidad || 0,
            `S/ ${Number(item.precioCompra || 0).toFixed(2)}`
          ]),
          ['Regalo', 'Cantidad', 'Compra']
        );

        const tablaRegalosCompra = renderItemsTable(
          regalosCompra.map((item) => {
            const key = normalizarClaveReq(item);
            const hist = historialRequerimientos.get(key) || {};
            const proveedor = hist.proveedor || '';
            const compra = hist.precioCompra ? `S/ ${Number(hist.precioCompra || 0).toFixed(2)}` : '';
            return [
            `${item.codigo || ''} ${item.descripcion || ''}`.trim(),
            item.cantidad || 0,
            proveedor,
            compra
          ];
          }),
          ['Regalo', 'Cantidad', 'Proveedor', 'Compra']
        );

        return `
          <section class="sheet">
            <div class="sheet-header">
              <img src="/static/img/KRATOS_LOGO.PNG" alt="Kratos" class="logo" />
              <div>
                <h2>Hoja de requerimiento</h2>
                <div class="subtitle">Fecha: ${escapeHtml(fechaHoja)}</div>
              </div>
            </div>
            <div class="meta">
              <div><strong>Venta ID:</strong> ${escapeHtml(venta.id)}</div>
              <div><strong>Cliente:</strong> ${escapeHtml(venta.clienteNombre || '-')}</div>
              <div><strong>Documento:</strong> ${escapeHtml(venta.documento || '-')}</div>
              <div><strong>Telefono:</strong> ${escapeHtml(venta.clienteTelefono || '-')}</div>
              <div><strong>Fecha venta:</strong> ${escapeHtml(venta.fechaVenta || '-')}</div>
              <div><strong>Agencia:</strong> ${escapeHtml(venta.agencia || '-')}</div>
              <div><strong>Destino:</strong> ${escapeHtml(venta.destino || '-')}</div>
              <div><strong>Vendedor:</strong> ${escapeHtml(vendedor?.nombre || venta.vendedorId || '-')}</div>
            </div>

            ${tablaStock ? `<h3>Productos en stock (tienda)</h3>${tablaStock}` : ''}
            ${tablaCompra ? `<h3>Productos a comprar</h3>${tablaCompra}` : ''}
            ${tablaRegalosStock ? `<h3>Regalos en stock (tienda)</h3>${tablaRegalosStock}` : ''}
            ${tablaRegalosCompra ? `<h3>Regalos a comprar</h3>${tablaRegalosCompra}` : ''}

            <div class="separator">______________________________________________</div>
          </section>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Hoja de requerimiento</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: 'IBM Plex Sans', sans-serif; color: #0f172a; }
            .page {
              max-width: 820px;
              margin: 0 auto;
              padding: 0 10px 20px;
            }
            .print-btn { position: fixed; top: 12px; right: 12px; padding: 8px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #fff; cursor: pointer; }
            .sheet {
              padding-bottom: 6mm;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .sheet + .sheet { border-top: 1px dashed #cbd5f5; margin-top: 6mm; padding-top: 4mm; }
            .sheet-header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
            .logo { width: 64px; height: auto; }
            .subtitle { color: #64748b; font-size: 12px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 10px; font-size: 11px; margin-bottom: 6px; }
            h2 { margin: 0; font-size: 16px; }
            h3 { margin: 8px 0 4px; font-size: 12px; }
            .tabla { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
            .tabla th, .tabla td { border: 1px solid #e2e8f0; padding: 4px 5px; text-align: left; vertical-align: top; }
            .tabla th:nth-child(3), .tabla td:nth-child(3) { width: 140px; }
            .tabla th:nth-child(4), .tabla td:nth-child(4) { width: 90px; }
            .separator { margin-top: 10px; text-align: center; color: #94a3b8; letter-spacing: 0.12em; font-size: 12px; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Imprimir</button>
          <div class="page">
            ${htmlPedidos || '<div style="padding:16px">No hay ventas pendientes.</div>'}
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Bloqueador de popups: permite abrir la pestaña para imprimir la hoja.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const abrirEdicion = (venta) => {
    if (!venta) return;
    setEditId(venta.id);
    setFormData({
      documentoTipo: venta.documentoTipo || 'dni',
      documento: venta.documento || '',
      clienteNombre: venta.clienteNombre || '',
      clienteTelefono: venta.clienteTelefono || '',
      vendedorId: venta.vendedorId || (usuarioActual?.id ? String(usuarioActual.id) : ''),
      agencia: venta.agencia || 'SHALOM',
      agenciaOtro: venta.agenciaOtro || '',
      destino: venta.destino || '',
      fechaVenta: venta.fechaVenta || getToday(),
      estadoEnvio: venta.estadoEnvio || 'PENDIENTE',
      fechaDespacho: venta.fechaDespacho || '',
      fechaCancelacion: venta.fechaCancelacion || '',
      encargado: venta.encargado || '',
      pVenta: Number(venta.pVenta || 0),
      adelanto: venta.adelanto || '',
      rastreoEstado: venta.rastreoEstado || 'EN TRANSITO',
      ticket: venta.ticket || '',
      guia: venta.guia || '',
      retiro: venta.retiro || '',
      notas: venta.notas || ''
    });
    setProductos(venta.productos || []);
    setRequerimientos(venta.requerimientos || []);
    setRegalos(venta.regalos || []);
    setRegaloRequerimientos(venta.regaloRequerimientos || []);
    setModalOpen(true);
    setStep(1);
  };

  const registrarVenta = async () => {
    if (!formData.documento || !formData.vendedorId) {
      setError('Completa el documento. No se detecto vendedor logeado.');
      return;
    }
    if (formData.agencia === 'OTROS' && !formData.agenciaOtro.trim()) {
      setError('Indica la agencia (Otros).');
      return;
    }
    const baseVenta = {
      ...formData,
      agenciaOtro: formData.agencia === 'OTROS' ? formData.agenciaOtro.trim() : '',
      destino: formData.agencia === 'TIENDA' ? 'TIENDA' : formData.destino.trim(),
      productos,
      requerimientos,
      regalos,
      regaloRequerimientos,
      pVenta: Number(totalVenta || 0)
    };
    try {
      if (editId) {
        await ventasService.editar(editId, baseVenta);
      } else {
        await ventasService.crear(baseVenta);
      }
      await cargarVentas();
      cerrarModal();
    } catch (err) {
      console.error('Error guardando venta:', err);
      setError(err.response?.data?.error || 'Error al guardar venta');
    }
  };

  const eliminarVenta = async (id) => {
    const confirmar = window.confirm('Deseas eliminar esta venta?');
    if (!confirmar) return;
    try {
      await ventasService.eliminar(id);
      await cargarVentas();
    } catch (err) {
      console.error('Error eliminando venta:', err);
    }
  };

  const patchVenta = (id, patch) => {
    setVentas((prev) =>
      (prev || []).map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const ventasListado = useMemo(() => ventas || [], [ventas]);
  const pendientesDia = useMemo(() => {
    return (ventas || []).filter((venta) => {
      const estado = venta.estadoEnvio || 'PENDIENTE';
      return estado === 'PENDIENTE';
    });
  }, [ventas]);

  const avanzar = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const retroceder = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="ventas-container">
      <div className="page-header">
        <div className="page-header__title">
          <h5>Control de Ventas</h5>
          <span className="page-header__subtitle">Registro de ventas y control de envios</span>
        </div>
        <div className="page-header__actions">
          <span className="status-pill">Ventas: {ventasListado.length}</span>
          <button
            type="button"
            className="icon-btn icon-btn--view"
                          onClick={abrirHojaRequerimiento}
                          title="Hoja de requerimiento"
                          aria-label="Hoja de requerimiento"
                        >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1.5V9h4.5L14 4.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--edit"
            onClick={abrirModal}
            title="Nueva venta"
            aria-label="Nueva venta"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 5h2v14h-2z" />
              <path d="M5 11h14v2H5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="ventas-table-section">
        <div className="table-container">
          {ventasListado.length === 0 ? (
            <div className="empty-message">No hay ventas registradas.</div>
          ) : (
            <table className="ventas-table compact">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Cliente</th>
                  <th>Telefono</th>
                  <th>Vendedor</th>
                  <th>Agencia</th>
                  <th>Destino</th>
                  <th>Fecha venta</th>
                  <th>Estado pedido</th>
                  <th>Estado envio</th>
                  <th>Fecha despacho</th>
                  <th>Fecha cancelacion</th>
                  <th>P. Venta</th>
                  <th>Adelanto</th>
                  <th>Productos</th>
                  <th>Requerimientos</th>
                  <th>Regalos</th>
                  <th>Obs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventasListado.map((venta) => {
                  const vendedor = usuariosVentas.find(
                    (user) => String(user.id) === String(venta.vendedorId)
                  );
                  const agenciaLabel =
                    venta.agencia === 'OTROS' ? `${venta.agencia} (${venta.agenciaOtro})` : venta.agencia;
                  return (
                    <tr key={venta.id}>
                      <td>{venta.documento}</td>
                      <td>{venta.clienteNombre || '-'}</td>
                      <td>{venta.clienteTelefono || '-'}</td>
                      <td>{vendedor?.nombre || venta.vendedorId}</td>
                      <td>{agenciaLabel}</td>
                      <td>{venta.destino || '-'}</td>
                      <td>{venta.fechaVenta || '-'}</td>
                      <td>
                        <span className={`pedido-pill ${String(venta.estadoPedido || 'PICKING').toLowerCase()}`}>
                          {venta.estadoPedido || 'PICKING'}
                        </span>
                      </td>
                      <td>
                        <select
                          className={`estado-select ${(venta.estadoEnvio || 'pendiente').toLowerCase()}`}
                          value={venta.estadoEnvio || 'PENDIENTE'}
                          onChange={(e) => {
                            const nuevoEstado = e.target.value;
                            const pedidoListo = (venta.estadoPedido || 'PICKING') === 'PEDIDO_LISTO';
                            if (!pedidoListo && (nuevoEstado === 'ENVIADO' || nuevoEstado === 'CANCELADO')) {
                              alert('El pedido debe estar en PEDIDO_LISTO para enviar o cancelar.');
                              return;
                            }
                            const now = getToday();
                            const fechaDespacho =
                              nuevoEstado === 'ENVIADO' || nuevoEstado === 'VISITA'
                                ? venta.fechaDespacho || now
                                : venta.fechaDespacho;
                            const fechaCancelacion =
                              nuevoEstado === 'CANCELADO'
                                ? venta.fechaCancelacion || now
                                : venta.fechaCancelacion;
                            const rastreoEstado =
                              nuevoEstado === 'CANCELADO' ? 'ENTREGADO' : venta.rastreoEstado;
                            const payload = {
                              estadoEnvio: nuevoEstado,
                              fechaDespacho,
                              fechaCancelacion,
                              rastreoEstado
                            };
                            patchVenta(venta.id, payload);
                            ventasService
                              .actualizarEstado(venta.id, payload)
                              .then(() => cargarVentas(false))
                              .catch((err) => {
                                console.error('Error actualizando estado de envio:', err);
                                cargarVentas(false);
                              });
                          }}
                        >
                          {estadosEnvio.map((estado) => (
                            <option
                              key={estado}
                              value={estado}
                              disabled={
                                (estado === 'ENVIADO' || estado === 'CANCELADO') &&
                                (venta.estadoPedido || 'PICKING') !== 'PEDIDO_LISTO'
                              }
                            >
                              {estado}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{venta.fechaDespacho || '-'}</td>
                      <td>{venta.fechaCancelacion || '-'}</td>
                      <td>S/ {Number(venta.pVenta || 0).toFixed(2)}</td>
                      <td>{venta.adelanto || '-'}</td>
                      <td>
                        {(venta.productos || [])
                          .map((prod) => `${prod.codigo} ${prod.descripcion} x${prod.cantidad}`)
                          .join(' // ') || '-'}
                      </td>
                      <td>
                        {(venta.requerimientos || [])
                          .map((prod) => `${prod.codigo} ${prod.descripcion} x${prod.cantidad}`)
                          .join(' // ') || '-'}
                      </td>
                      <td>
                        {[
                          ...(venta.regalos || []),
                          ...(venta.regaloRequerimientos || [])
                        ]
                          .map((prod) => `${prod.codigo} ${prod.descripcion} x${prod.cantidad}`)
                          .join(' // ') || '-'}
                      </td>
                      <td>{venta.notas || '-'}</td>
                      <td>
                        <div className="venta-actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            onClick={() => abrirEdicion(venta)}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 17.5V20h2.5L17.9 8.6l-2.5-2.5L4 17.5z" />
                              <path d="M20.7 7.2a1 1 0 0 0 0-1.4l-2.5-2.5a1 1 0 0 0-1.4 0l-1.7 1.7 2.5 2.5 1.7-1.7z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--view"
                            onClick={() => setDetalleVenta(venta)}
                            title="Detalle"
                            aria-label="Detalle"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 5c4.5 0 8.3 2.7 10 6.5C20.3 15.3 16.5 18 12 18S3.7 15.3 2 11.5C3.7 7.7 7.5 5 12 5zm0 2c-3.2 0-6 1.7-7.6 4.5C6 14.3 8.8 16 12 16s6-1.7 7.6-4.5C18 8.7 15.2 7 12 7zm0 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--view"
                            onClick={() => abrirRotulo(venta)}
                            title="Rotulo"
                            aria-label="Rotulo"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 4h9l7 8-7 8H4V4zm8.6 4.2L9 11.8l3.6 3.6 1.4-1.4-2.2-2.2 2.2-2.2-1.4-1.4z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--delete"
                            onClick={() => eliminarVenta(venta.id)}
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6 7h12l-1 14H7L6 7z" />
                              <path d="M9 7V5h6v2h4v2H5V7h4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {ventasHasMore && (
          <div className="table-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => cargarVentas(true)}
              disabled={ventasLoading}
            >
              {ventasLoading ? 'Cargando...' : 'Cargar mas'}
            </button>
          </div>
        )}
      </div>

      {detalleVenta && (
        <VentasModalShell
          title={`Detalle venta #${detalleVenta.id}`}
          onClose={() => setDetalleVenta(null)}
        >
          <div className="ventas-split">
                <div className="ventas-card">
                  <h3>Productos</h3>
                  <div className="table-container">
                    {(detalleVenta.productos || []).length === 0 ? (
                      <div className="empty-message">Sin productos.</div>
                    ) : (
                      <table className="ventas-table compact">
                        <thead>
                          <tr>
                            <th>Codigo</th>
                            <th>Descripcion</th>
                            <th>Cantidad</th>
                            <th>Precio venta</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detalleVenta.productos || []).map((item) => {
                            const subtotal =
                              Number(item.cantidad || 0) * Number(item.precioVenta || 0);
                            return (
                              <tr key={item.id}>
                                <td>{item.codigo}</td>
                                <td>{item.descripcion}</td>
                                <td>{item.cantidad}</td>
                                <td>S/ {Number(item.precioVenta || 0).toFixed(2)}</td>
                                <td>S/ {subtotal.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <div className="ventas-card">
                  <h3>Regalos</h3>
                  <div className="table-container">
                    {(detalleVenta.regalos || []).length === 0 ? (
                      <div className="empty-message">Sin regalos.</div>
                    ) : (
                      <table className="ventas-table compact">
                        <thead>
                          <tr>
                            <th>Codigo</th>
                            <th>Descripcion</th>
                            <th>Cantidad</th>
                            <th>Precio compra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detalleVenta.regalos || []).map((item) => (
                            <tr key={item.id}>
                              <td>{item.codigo}</td>
                              <td>{item.descripcion}</td>
                              <td>{item.cantidad}</td>
                              <td>S/ {Number(item.precioCompra || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
          </div>
        </VentasModalShell>
      )}

      {modalOpen && (
        <VentasModalShell
          title={editId ? `Editar venta #${editId}` : 'Nueva venta'}
          onClose={cerrarModal}
        >
          <VentasStepsHeader step={step} />

              {error && <div className="error-message">{error}</div>}
              {avisoStock && <div className="helper-text">{avisoStock}</div>}

              {step === 1 && (
                <VentasStepDatos
                  formData={formData}
                  consultaMensaje={consultaMensaje}
                  consultando={consultando}
                  usuarioActual={usuarioActual}
                  agencias={agencias}
                  estadosEnvio={estadosEnvio}
                  onConsultarDocumento={handleConsultarDocumento}
                  onFormChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
                />
              )}
              {step === 2 && (
                <VentasStepProductos
                  tabProductos={tabProductos}
                  tabProductosModo={tabProductosModo}
                  tabReqModo={tabReqModo}
                  busquedaProducto={busquedaProducto}
                  resultadosProducto={resultadosProducto}
                  busquedaRequerimiento={busquedaRequerimiento}
                  resultadosRequerimiento={resultadosRequerimiento}
                  cargandoKits={cargandoKits}
                  errorKits={errorKits}
                  kitsDisponibles={kitsDisponibles}
                  productos={productos}
                  setProductos={setProductos}
                  requerimientos={requerimientos}
                  setTabProductos={setTabProductos}
                  setTabProductosModo={setTabProductosModo}
                  setTabReqModo={setTabReqModo}
                  setBusquedaProducto={setBusquedaProducto}
                  setBusquedaRequerimiento={setBusquedaRequerimiento}
                  setResultadosRequerimiento={setResultadosRequerimiento}
                  agregarProducto={agregarProducto}
                  agregarKitVenta={agregarKitVenta}
                  agregarRequerimiento={agregarRequerimiento}
                  actualizarItem={actualizarItem}
                  quitarItem={quitarItem}
                  setRequerimientos={setRequerimientos}
                  setRequerimiento={setRequerimiento}
                  requerimiento={requerimiento}
                  sugerenciaRequerimiento={sugerenciaRequerimiento}
                  ajustarCantidadProductoStock={ajustarCantidadProductoStock}
                />
              )}
              {step === 3 && (
                <VentasStepRegalos
                  tabRegalosModo={tabRegalosModo}
                  setTabRegalosModo={setTabRegalosModo}
                  busquedaRegalo={busquedaRegalo}
                  setBusquedaRegalo={setBusquedaRegalo}
                  resultadosRegalo={resultadosRegalo}
                  agregarRegalo={agregarRegalo}
                  cargandoKits={cargandoKits}
                  errorKits={errorKits}
                  kitsDisponibles={kitsDisponibles}
                  agregarKitRegalo={agregarKitRegalo}
                  regalos={regalos}
                  setRegalos={setRegalos}
                  tabReqRegaloModo={tabReqRegaloModo}
                  setTabReqRegaloModo={setTabReqRegaloModo}
                  busquedaReqRegalo={busquedaReqRegalo}
                  setBusquedaReqRegalo={setBusquedaReqRegalo}
                  resultadosReqRegalo={resultadosReqRegalo}
                  setResultadosReqRegalo={setResultadosReqRegalo}
                  setRegaloRequerimiento={setRegaloRequerimiento}
                  regaloRequerimiento={regaloRequerimiento}
                  sugerenciaRegalo={sugerenciaRegalo}
                  agregarRegaloRequerimiento={agregarRegaloRequerimiento}
                  regaloRequerimientos={regaloRequerimientos}
                  setRegaloRequerimientos={setRegaloRequerimientos}
                  actualizarItem={actualizarItem}
                  quitarItem={quitarItem}
                  formData={formData}
                  setFormData={setFormData}
                  ajustarCantidadRegaloStock={ajustarCantidadRegaloStock}
                />
              )}
          <VentasModalFooter
            step={step}
            onBack={retroceder}
            onNext={avanzar}
            onSave={registrarVenta}
            editId={editId}
          />
        </VentasModalShell>
      )}
    </div>
  );
};

export default VentasPage;
