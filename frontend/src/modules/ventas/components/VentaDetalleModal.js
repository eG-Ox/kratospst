import React from 'react';
import VentasModalShell from './VentasModalShell';

const VentaDetalleModal = ({ venta, cargando, error, onClose }) => {
  if (!venta) return null;

  return (
    <VentasModalShell title={`Detalle venta #${venta.id}`} onClose={onClose}>
      {cargando ? (
        <div className="empty-message">Cargando detalle...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="ventas-split">
          <div className="ventas-card">
            <h3>Productos</h3>
            <div className="table-container">
              {(venta.productos || []).length === 0 ? (
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
                    {(venta.productos || []).map((item) => {
                      const subtotal = Number(item.cantidad || 0) * Number(item.precioVenta || 0);
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
            <h3>Requerimientos</h3>
            <div className="table-container">
              {(venta.requerimientos || []).length === 0 ? (
                <div className="empty-message">Sin requerimientos.</div>
              ) : (
                <table className="ventas-table compact">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Descripcion</th>
                      <th>Cantidad</th>
                      <th>Proveedor</th>
                      <th>Compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(venta.requerimientos || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.codigo}</td>
                        <td>{item.descripcion}</td>
                        <td>{item.cantidad}</td>
                        <td>{item.proveedor || '-'}</td>
                        <td>S/ {Number(item.precioCompra || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="ventas-card">
            <h3>Regalos</h3>
            <div className="table-container">
              {(venta.regalos || []).length === 0 ? (
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
                    {(venta.regalos || []).map((item) => (
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
          <div className="ventas-card">
            <h3>Regalos (requerimiento)</h3>
            <div className="table-container">
              {(venta.regaloRequerimientos || []).length === 0 ? (
                <div className="empty-message">Sin regalos a comprar.</div>
              ) : (
                <table className="ventas-table compact">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Descripcion</th>
                      <th>Cantidad</th>
                      <th>Proveedor</th>
                      <th>Compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(venta.regaloRequerimientos || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.codigo}</td>
                        <td>{item.descripcion}</td>
                        <td>{item.cantidad}</td>
                        <td>{item.proveedor || '-'}</td>
                        <td>S/ {Number(item.precioCompra || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="ventas-card ventas-card--full">
            <h3>Observaciones</h3>
            <div className="helper-text">
              {venta.notas?.trim() ? venta.notas : 'Sin observaciones.'}
            </div>
          </div>
        </div>
      )}
    </VentasModalShell>
  );
};

export default VentaDetalleModal;
