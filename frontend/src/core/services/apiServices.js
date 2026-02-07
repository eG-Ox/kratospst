import api from '../config/api';

// Servicios de Autenticación
export const authService = {
  login: (email, contraseña) =>
    api.post('/auth/login', { email, contraseña }),
  registro: (nombre, email, contraseña, rol) => {
    if (typeof nombre === 'object' && nombre !== null) {
      const data = { ...nombre };
      if (data.contrasena && !data['contraseña']) {
        data['contraseña'] = data.contrasena;
        delete data.contrasena;
      }
      return api.post('/auth/registro', data);
    }
    return api.post('/auth/registro', { nombre, email, contraseña, rol });
  },
  obtenerUsuarioActual: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// Servicios para Tipos de Máquinas
export const tiposMaquinasService = {
  getAll: () => api.get('/tipos-maquinas'),
  getById: (id) => api.get(`/tipos-maquinas/${id}`),
  create: (data) => api.post('/tipos-maquinas', data),
  update: (id, data) => api.put(`/tipos-maquinas/${id}`, data),
  delete: (id) => api.delete(`/tipos-maquinas/${id}`),
};

// Servicios para Marcas
export const marcasService = {
  getAll: () => api.get('/marcas'),
  getById: (id) => api.get(`/marcas/${id}`),
  create: (data) => api.post('/marcas', data),
  update: (id, data) => api.put(`/marcas/${id}`, data),
  delete: (id) => api.delete(`/marcas/${id}`),
};

// Servicios para Máquinas/Productos
export const productosService = {
  getAll: () => api.get('/productos'),
  getById: (id) => api.get(`/productos/${id}`),
  getByCodigo: (codigo) => api.get(`/productos?codigo=${codigo}`),
  descargarPlantilla: () =>
    api.get('/productos/plantilla', { responseType: 'blob' }),
  exportarExcel: () =>
    api.get('/productos/exportar', { responseType: 'blob' }),
  exportarStockMinimo: (minimo = 2) =>
    api.get('/productos/exportar-stock', { params: { minimo }, responseType: 'blob' }),
  importarExcel: (data) =>
    api.post('/productos/importar', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/productos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/productos/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/productos/${id}`),
  descargarFichaTecnica: (filename) => 
    api.get(`/productos/descargar/${filename}`, { responseType: 'blob' }),
};

// Servicios para Movimientos (Ingresos/Salidas)
export const movimientosService = {
  registrar: (data) => api.post('/movimientos', data),
  obtener: (filtros) => api.get('/movimientos', { params: filtros }),
  obtenerPorMaquina: (maquina_id, opciones) => 
    api.get(`/movimientos/maquina/${maquina_id}`, { params: opciones }),
  obtenerEstadisticas: () => api.get('/movimientos/estadisticas/dashboard'),
};

// Servicios para Clientes
export const clientesService = {
  getAll: (params) => api.get('/clientes', { params }),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`),
  consultaDni: (dni) => api.get(`/clientes/consulta-dni/${dni}`),
  consultaRuc: (ruc) => api.get(`/clientes/consulta-ruc/${ruc}`),
};

// Servicios para Kits
export const kitsService = {
  listarActivos: () => api.get('/kits/api/listar'),
  obtenerParaVenta: (kitId) => api.get(`/kits/api/obtener-para-venta/${kitId}`),
  listar: () => api.get('/kits'),
  getById: (id) => api.get(`/kits/${id}`),
  crear: (data) => api.post('/kits/crear', data),
  editar: (id, data) => api.post(`/kits/${id}/editar`, data),
  eliminar: (id) => api.post(`/kits/${id}/eliminar`),
  toggle: (id) => api.post(`/kits/${id}/toggle`),
};

// Servicios para Cotizaciones
export const cotizacionesService = {
  formulario: () => api.get('/cotizaciones'),
  listar: (params) => api.get('/cotizaciones/listar', { params }),
  historial: (params) => api.get('/cotizaciones/historial', { params }),
  obtener: (id) => api.get(`/cotizaciones/${id}`),
  crear: (data) => api.post('/cotizaciones', data),
  editar: (id, data) => api.put(`/cotizaciones/${id}`, data),
  ver: (id) => api.get(`/cotizaciones/ver/${id}`),
  pdf: (id) => api.get(`/cotizaciones/pdf/${id}`),
  buscarProductos: (params) => api.get('/cotizaciones/api/buscar-productos', { params }),
  obtenerProducto: (id, params) => api.get(`/cotizaciones/api/producto/${id}`, { params }),
  filtrosCotizacion: (params) => api.get('/cotizaciones/api/filtros_cotizacion', { params }),
  productosCotizacion: (params) => api.get('/cotizaciones/api/productos_cotizacion', { params }),
  tiposPorAlmacen: (params) => api.get('/tipos_por_almacen', { params }),
};

// Servicios para Usuarios
export const usuariosService = {
  listar: () => api.get('/usuarios'),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  obtenerPerfil: () => api.get('/usuarios/me'),
  actualizarPerfil: (data) => api.put('/usuarios/me', data),
};

// Servicios para Ventas
export const ventasService = {
  listar: (params) => api.get('/ventas', { params }),
  obtener: (id) => api.get(`/ventas/${id}`),
  detalle: (params) => api.get('/ventas/detalle/listar', { params }),
  historialRequerimientos: (params) => api.get('/ventas/requerimientos/historial', { params }),
  exportarExcel: (params) => api.get('/ventas/export', { params, responseType: 'blob' }),
  requerimientosPendientes: (params) => api.get('/ventas/requerimientos/pendientes', { params }),
  actualizarRequerimiento: (id, data) => api.patch(`/ventas/requerimientos/${id}`, data),
  pickingPendientes: (params) => api.get('/ventas/picking/pendientes', { params }),
  confirmarPicking: (data) => api.post('/ventas/picking/confirmar', data),
  cerrarPedido: (data) => api.post('/ventas/picking/cerrar', data),
  crear: (data) => api.post('/ventas', data),
  editar: (id, data) => api.put(`/ventas/${id}`, data),
  actualizarEstado: (id, data) => api.patch(`/ventas/${id}/estado`, data),
  actualizarEnvio: (id, data) => api.patch(`/ventas/${id}/envio`, data),
  eliminar: (id) => api.delete(`/ventas/${id}`)
};

// Servicios para Historial
export const historialService = {
  listar: (params) => api.get('/historial', { params }),
  exportar: (params) => api.get('/historial/exportar', { params, responseType: 'blob' })
};

// Servicios para Permisos
export const permisosService = {
  listarRoles: () => api.get('/permisos/roles'),
  obtenerPorRol: (rol) => api.get(`/permisos/rol/${rol}`),
  actualizarRol: (rol, data) => api.put(`/permisos/rol/${rol}`, data),
  misPermisos: () => api.get('/permisos/mi')
};

// Inventario general
export const inventarioGeneralService = {
  listar: (params) => api.get('/inventario-general', { params }),
  crear: (data) => api.post('/inventario-general', data),
  obtener: (id) => api.get(`/inventario-general/${id}`),
  agregar: (id, data) => api.post(`/inventario-general/${id}/agregar`, data),
  ajustar: (id, data) => api.post(`/inventario-general/${id}/ajustar`, data),
  eliminar: (id, data) => api.post(`/inventario-general/${id}/eliminar`, data),
  eliminarInventario: (id) => api.post(`/inventario-general/${id}/eliminar-inventario`),
  cerrar: (id) => api.post(`/inventario-general/${id}/cerrar`),
  aplicar: (id) => api.post(`/inventario-general/${id}/aplicar`),
  exportar: (id) => api.get(`/inventario-general/${id}/export`, { responseType: 'blob' })
};

export default api;

