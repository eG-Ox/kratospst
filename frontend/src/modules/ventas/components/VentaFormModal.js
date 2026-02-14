import React from 'react';
import VentasModalShell from './VentasModalShell';
import { getToday } from '../utils/ventasUtils';

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

const VentaFormModal = ({
  title,
  onClose,
  step,
  error,
  avisoStock,
  editId,
  onBack,
  onNext,
  onSave,
  formData,
  setFormData,
  consultaMensaje,
  consultando,
  usuarioActual,
  agencias,
  estadosEnvio,
  onConsultarDocumento,
  onFormChange,
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
  ajustarCantidadProductoStock,
  tabRegalosModo,
  setTabRegalosModo,
  busquedaRegalo,
  setBusquedaRegalo,
  resultadosRegalo,
  agregarRegalo,
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
  ajustarCantidadRegaloStock
}) => (
  <VentasModalShell title={title} onClose={onClose}>
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
        onConsultarDocumento={onConsultarDocumento}
        onFormChange={onFormChange}
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

    <VentasModalFooter step={step} onBack={onBack} onNext={onNext} onSave={onSave} editId={editId} />
  </VentasModalShell>
);

export default VentaFormModal;
