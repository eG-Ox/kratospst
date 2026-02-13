import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { marcasService, movimientosService, productosService, ventasService } from '../../../core/services/apiServices';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/DashboardPage.css';

const DashboardPage = ({ usuario }) => {
  const mountedRef = useMountedRef();
  const [estadisticas, setEstadisticas] = useState(null);
  const [ultimosMovimientos, setUltimosMovimientos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [tab, setTab] = useState('resumen');
  const [filtroVentas, setFiltroVentas] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroStock, setFiltroStock] = useState('minimo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const stockMinimo = 2;

  const cargarDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const respEstad = await movimientosService.obtenerEstadisticas();
      if (!mountedRef.current) return;
      setEstadisticas(respEstad.data);

      const respMovimientos = await movimientosService.obtener({ limite: 10, pagina: 1 });
      if (!mountedRef.current) return;
      setUltimosMovimientos(respMovimientos.data);
      const respVentas = await ventasService.listar();
      if (!mountedRef.current) return;
      setVentas(respVentas.data || []);
      const respProductos = await productosService.getAll();
      if (!mountedRef.current) return;
      setProductos(respProductos.data || []);
      const respMarcas = await marcasService.getAll();
      if (!mountedRef.current) return;
      setMarcas(respMarcas.data || []);
      setError('');
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      if (mountedRef.current) {
        setError('Error al cargar datos del dashboard');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [mountedRef]);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  const ventasFiltradasPorFecha = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return ventas;
    return ventas.filter((v) => {
      const fecha = (v.fechaVenta || '').slice(0, 10);
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;
      return true;
    });
  }, [ventas, fechaDesde, fechaHasta]);

  const resumenVentas = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const total = ventasFiltradasPorFecha.length;
    const pendientes = ventasFiltradasPorFecha.filter(
      (v) => (v.estadoEnvio || 'PENDIENTE') === 'PENDIENTE'
    ).length;
    const enviados = ventasFiltradasPorFecha.filter(
      (v) => (v.estadoEnvio || '') === 'ENVIADO'
    ).length;
    const ventasHoy = ventasFiltradasPorFecha.filter(
      (v) => (v.fechaVenta || '').slice(0, 10) === hoy
    ).length;
    const totalVenta = ventasFiltradasPorFecha.reduce((acc, v) => acc + Number(v.pVenta || 0), 0);
    return { total, pendientes, enviados, ventasHoy, totalVenta };
  }, [ventasFiltradasPorFecha]);

  const ventasPorFecha = useMemo(() => {
    const map = new Map();
    ventasFiltradasPorFecha.forEach((v) => {
      const fecha = (v.fechaVenta || '').slice(0, 10) || 'Sin fecha';
      map.set(fecha, (map.get(fecha) || 0) + Number(v.pVenta || 0));
    });
    return Array.from(map.entries())
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => (a.fecha > b.fecha ? 1 : -1))
      .slice(-10);
  }, [ventasFiltradasPorFecha]);

  const ventasPorVendedor = useMemo(() => {
    const map = new Map();
    ventasFiltradasPorFecha.forEach((v) => {
      const key = v.vendedorNombre || v.vendedorId || 'Sin vendedor';
      map.set(key, (map.get(key) || 0) + Number(v.pVenta || 0));
    });
    return Array.from(map.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [ventasFiltradasPorFecha]);

  const ventasPorProducto = useMemo(() => {
    const map = new Map();
    ventasFiltradasPorFecha.forEach((v) => {
      (v.productos || []).forEach((item) => {
        const key = `${item.codigo || ''} ${item.descripcion || ''}`.trim() || 'Sin codigo';
        const subtotal = Number(item.precioVenta || 0) * Number(item.cantidad || 0);
        map.set(key, (map.get(key) || 0) + subtotal);
      });
    });
    return Array.from(map.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [ventasFiltradasPorFecha]);

  const aplicarRango = (tipo) => {
    const hoy = new Date();
    const format = (d) => d.toISOString().slice(0, 10);
    if (tipo === 'hoy') {
      const f = format(hoy);
      setFechaDesde(f);
      setFechaHasta(f);
      return;
    }
    if (tipo === 'semana') {
      const desde = new Date(hoy);
      desde.setDate(hoy.getDate() - 6);
      setFechaDesde(format(desde));
      setFechaHasta(format(hoy));
      return;
    }
    if (tipo === 'mes') {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFechaDesde(format(desde));
      setFechaHasta(format(hoy));
      return;
    }
    if (tipo === 'todo') {
      setFechaDesde('');
      setFechaHasta('');
    }
  };

  const stockDistribucion = useMemo(() => {
    const sinStock = productos.filter((p) => Number(p.stock || 0) <= 0).length;
    const bajo = productos.filter(
      (p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= stockMinimo
    ).length;
    const ok = Math.max(productos.length - sinStock - bajo, 0);
    return { sinStock, bajo, ok };
  }, [productos, stockMinimo]);

  const productosBajoStock = useMemo(() => {
    return (productos || []).filter((p) => Number(p.stock || 0) <= stockMinimo);
  }, [productos, stockMinimo]);

  const marcasCodigos = useMemo(() => {
    const set = new Set();
    (marcas || []).forEach((marca) => {
      const code = String(marca.codigo || '').trim().toUpperCase();
      if (code) {
        set.add(code);
      }
    });
    return set;
  }, [marcas]);

  const productosSinMarcaRegistrada = useMemo(() => {
    return (productos || []).filter((p) => {
      const marcaValue = String(p.marca || '').trim();
      if (!marcaValue) return true;
      const marcaCodigo = marcaValue.toUpperCase();
      if (/^M\d{4}$/.test(marcaCodigo)) {
        return !marcasCodigos.has(marcaCodigo);
      }
      return false;
    });
  }, [productos, marcasCodigos]);

  const ventasFiltradas = useMemo(() => {
    if (!filtroVentas.trim()) return ventasFiltradasPorFecha;
    const term = filtroVentas.toLowerCase();
    return ventasFiltradasPorFecha.filter((v) =>
      String(v.id).includes(term) ||
      (v.clienteNombre || '').toLowerCase().includes(term) ||
      (v.documento || '').toLowerCase().includes(term)
    );
  }, [ventasFiltradasPorFecha, filtroVentas]);

  const productosFiltrados = useMemo(() => {
    const term = filtroProducto.toLowerCase();
    let list = productos;
    if (term) {
      list = list.filter((p) =>
        `${p.codigo || ''} ${p.descripcion || ''} ${p.marca || ''}`.toLowerCase().includes(term)
      );
    }
    if (filtroStock === 'minimo') {
      list = list.filter((p) => Number(p.stock || 0) <= stockMinimo);
    } else if (filtroStock === 'sin-stock') {
      list = list.filter((p) => Number(p.stock || 0) <= 0);
    }
    return list;
  }, [productos, filtroProducto, filtroStock, stockMinimo]);

  const descargarExcel = async (peticion, nombre) => {
    try {
      const resp = await peticion;
      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombre);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando Excel:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido, {usuario?.nombre}!</p>
        </div>
        <div className="dashboard-header__actions">
          {tab === 'ventas' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                descargarExcel(
                  ventasService.exportarExcel({
                    fecha_inicio: fechaDesde || undefined,
                    fecha_fin: fechaHasta || undefined
                  }),
                  'ventas.xlsx'
                )
              }
            >
              Exportar Excel
            </button>
          )}
          {tab === 'inventario' && (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => descargarExcel(productosService.exportarExcel(), 'productos.xlsx')}
              >
                Exportar productos
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  descargarExcel(productosService.exportarStockMinimo(stockMinimo), 'stock_minimo.xlsx')
                }
              >
                Exportar stock minimo
              </button>
            </>
          )}
          {tab === 'resumen' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => descargarExcel(productosService.exportarStockMinimo(stockMinimo), 'stock_minimo.xlsx')}
            >
              Exportar stock minimo
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando datos...</div>
      ) : (
        <>
          <div className="dashboard-tabs">
            <button className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>
              Resumen
            </button>
            <button className={tab === 'ventas' ? 'active' : ''} onClick={() => setTab('ventas')}>
              Ventas
            </button>
            <button className={tab === 'inventario' ? 'active' : ''} onClick={() => setTab('inventario')}>
              Productos & Inventario
            </button>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon">🏭</div>
              <div className="stat-content">
                <h3>Total de Máquinas</h3>
                <p className="stat-number">{estadisticas?.total_maquinas || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Stock Total</h3>
                <p className="stat-number">{estadisticas?.total_stock || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📥</div>
              <div className="stat-content">
                <h3>Ingresos Hoy</h3>
                <p className="stat-number">{estadisticas?.ingresos_hoy?.cantidad || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📤</div>
              <div className="stat-content">
                <h3>Salidas Hoy</h3>
                <p className="stat-number">{estadisticas?.salidas_hoy?.cantidad || 0}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3>Stock Bajo (≤ {stockMinimo})</h3>
                <p className="stat-number">{productosBajoStock.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏷️</div>
              <div className="stat-content">
                <h3>Productos sin marca registrada</h3>
                <p className="stat-number">{productosSinMarcaRegistrada.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💸</div>
              <div className="stat-content">
                <h3>Total Ventas</h3>
                <p className="stat-number">S/ {resumenVentas.totalVenta.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {tab === 'resumen' && (
            <div className="dashboard-content">
              <div className="dashboard-grid">
                <div className="dashboard-panel">
                  <h2>Alertas de stock mínimo</h2>
                  {productosBajoStock.length > 0 ? (
                    <table className="movements-table">
                      <thead>
                        <tr>
                          <th>Codigo</th>
                          <th>Producto</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosBajoStock.map((prod) => (
                          <tr key={prod.id}>
                            <td>{prod.codigo}</td>
                            <td>{prod.descripcion}</td>
                            <td className="stock-alert">{prod.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-message">Sin alertas de stock.</p>
                  )}
                </div>
                <div className="dashboard-panel">
                  <h2>Productos sin marca registrada</h2>
                  {productosSinMarcaRegistrada.length > 0 ? (
                    <table className="movements-table">
                      <thead>
                        <tr>
                          <th>Codigo</th>
                          <th>Producto</th>
                          <th>Marca</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosSinMarcaRegistrada.slice(0, 20).map((prod) => (
                          <tr key={`sin-marca-${prod.id}`}>
                            <td>{prod.codigo}</td>
                            <td>{prod.descripcion}</td>
                            <td className="stock-alert">{prod.marca || 'Sin marca'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-message">Todo ok con marcas registradas.</p>
                  )}
                </div>
                <div className="dashboard-panel">
                  <h2>Últimos Movimientos</h2>
                  <div className="panel-actions">
                    <button type="button" className="btn-secondary" onClick={cargarDashboard}>
                      Actualizar
                    </button>
                  </div>
                  {ultimosMovimientos.length > 0 ? (
                    <table className="movements-table">
                      <thead>
                        <tr>
                          <th>Máquina</th>
                          <th>Tipo</th>
                          <th>Cantidad</th>
                          <th>Usuario</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ultimosMovimientos.map((mov) => (
                          <tr key={mov.id}>
                            <td>{mov.maquina_codigo}</td>
                            <td className={`type-${mov.tipo}`}>{mov.tipo}</td>
                            <td>{mov.cantidad}</td>
                            <td>{mov.usuario_nombre}</td>
                            <td>{new Date(mov.fecha).toLocaleString('es-ES')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-message">No hay movimientos registrados</p>
                  )}
                </div>
                <div className="dashboard-panel">
                  <h2>Ventas últimos 10 días</h2>
                  <div className="chart-line">
                    <svg viewBox="0 0 300 120" preserveAspectRatio="none">
                      {ventasPorFecha.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3"
                          points={ventasPorFecha
                            .map((item, idx) => {
                              const max = Math.max(...ventasPorFecha.map((v) => v.total), 1);
                              const x = (idx / (ventasPorFecha.length - 1)) * 300;
                              const y = 120 - (item.total / max) * 110 - 5;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}
                    </svg>
                  </div>
                  <div className="chart">
                    {ventasPorFecha.map((item) => {
                      const max = Math.max(...ventasPorFecha.map((v) => v.total), 1);
                      const height = Math.max((item.total / max) * 100, 6);
                      return (
                        <div key={item.fecha} className="chart-bar">
                          <div className="chart-bar__fill" style={{ height: `${height}%` }} />
                          <span className="chart-bar__label">{item.fecha.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dashboard-panel">
                  <h2>Distribución de stock</h2>
                  <div className="chart-pie">
                    <svg viewBox="0 0 120 120">
                      {(() => {
                        const total = stockDistribucion.sinStock + stockDistribucion.bajo + stockDistribucion.ok || 1;
                        const slices = [
                          { value: stockDistribucion.sinStock, color: '#dc2626' },
                          { value: stockDistribucion.bajo, color: '#f59e0b' },
                          { value: stockDistribucion.ok, color: '#10b981' }
                        ];
                        let acc = 0;
                        return slices.map((slice, index) => {
                          const startAngle = (acc / total) * 2 * Math.PI;
                          acc += slice.value;
                          const endAngle = (acc / total) * 2 * Math.PI;
                          const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
                          const x1 = 60 + 50 * Math.cos(startAngle);
                          const y1 = 60 + 50 * Math.sin(startAngle);
                          const x2 = 60 + 50 * Math.cos(endAngle);
                          const y2 = 60 + 50 * Math.sin(endAngle);
                          const path = `M60 60 L${x1} ${y1} A50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
                          return <path key={index} d={path} fill={slice.color} />;
                        });
                      })()}
                    </svg>
                  </div>
                  <div className="stock-distribucion">
                    <div className="stock-pill danger">Sin stock: {stockDistribucion.sinStock}</div>
                    <div className="stock-pill warn">Stock bajo: {stockDistribucion.bajo}</div>
                    <div className="stock-pill ok">Stock ok: {stockDistribucion.ok}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'ventas' && (
            <div className="dashboard-content">
              <div className="dashboard-grid">
                <div className="dashboard-panel">
                  <h2>Resumen de ventas</h2>
                  <div className="ventas-resumen">
                    <div>
                      <strong>Ventas hoy:</strong> {resumenVentas.ventasHoy}
                    </div>
                    <div>
                      <strong>Pendientes:</strong> {resumenVentas.pendientes}
                    </div>
                    <div>
                      <strong>Enviados:</strong> {resumenVentas.enviados}
                    </div>
                    <div>
                      <strong>Total ventas:</strong> {resumenVentas.total}
                    </div>
                  </div>
                </div>
                <div className="dashboard-panel">
                  <h2>Buscar venta</h2>
                  <div className="ventas-filtros-fecha">
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                    />
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                    />
                  </div>
                  <div className="ventas-rango">
                    <button type="button" onClick={() => aplicarRango('hoy')}>
                      Hoy
                    </button>
                    <button type="button" onClick={() => aplicarRango('semana')}>
                      Semana
                    </button>
                    <button type="button" onClick={() => aplicarRango('mes')}>
                      Mes
                    </button>
                    <button type="button" onClick={() => aplicarRango('todo')}>
                      Todo
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="ID, cliente o documento"
                    value={filtroVentas}
                    onChange={(e) => setFiltroVentas(e.target.value)}
                  />
                  <div className="table-container">
                    {ventasFiltradas.length > 0 ? (
                      <table className="movements-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventasFiltradas.slice(0, 12).map((venta) => (
                            <tr key={venta.id}>
                              <td>{venta.id}</td>
                              <td>{venta.clienteNombre}</td>
                              <td>{venta.fechaVenta}</td>
                              <td>{venta.estadoEnvio}</td>
                              <td>S/ {Number(venta.pVenta || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="empty-message">Sin ventas para mostrar.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'inventario' && (
            <div className="dashboard-content">
              <div className="dashboard-panel">
                  <div className="inventario-filtros">
                    <input
                      type="text"
                      placeholder="Buscar producto"
                      value={filtroProducto}
                      onChange={(e) => setFiltroProducto(e.target.value)}
                    />
                    <select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)}>
                      <option value="minimo">Stock mínimo</option>
                      <option value="sin-stock">Sin stock</option>
                      <option value="todos">Todos</option>
                    </select>
                  </div>
                <div className="table-container">
                  {productosFiltrados.length > 0 ? (
                    <table className="movements-table">
                      <thead>
                        <tr>
                          <th>Codigo</th>
                          <th>Producto</th>
                          <th>Marca</th>
                          <th>Stock</th>
                          <th>Precio venta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosFiltrados.slice(0, 20).map((prod) => (
                          <tr key={prod.id}>
                            <td>{prod.codigo}</td>
                            <td>{prod.descripcion}</td>
                            <td>{prod.marca}</td>
                            <td className={Number(prod.stock || 0) <= stockMinimo ? 'stock-alert' : ''}>
                              {prod.stock}
                            </td>
                            <td>S/ {Number(prod.precio_venta || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="empty-message">No hay productos.</p>
                  )}
                </div>
              </div>
              <div className="dashboard-grid">
                <div className="dashboard-panel">
                  <h2>Top ventas por vendedor</h2>
                  <div className="chart-hbar">
                    {ventasPorVendedor.map((item) => {
                      const max = Math.max(...ventasPorVendedor.map((v) => v.total), 1);
                      const width = Math.max((item.total / max) * 100, 6);
                      return (
                        <div key={item.label} className="hbar-row">
                          <span className="hbar-label">{item.label}</span>
                          <div className="hbar-track">
                            <div className="hbar-fill" style={{ width: `${width}%` }} />
                          </div>
                          <span className="hbar-value">S/ {item.total.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dashboard-panel">
                  <h2>Top ventas por producto</h2>
                  <div className="chart-hbar">
                    {ventasPorProducto.map((item) => {
                      const max = Math.max(...ventasPorProducto.map((v) => v.total), 1);
                      const width = Math.max((item.total / max) * 100, 6);
                      return (
                        <div key={item.label} className="hbar-row">
                          <span className="hbar-label">{item.label}</span>
                          <div className="hbar-track">
                            <div className="hbar-fill" style={{ width: `${width}%` }} />
                          </div>
                          <span className="hbar-value">S/ {item.total.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
