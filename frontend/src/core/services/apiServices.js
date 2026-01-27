import api from '../config/api';

// Servicios de Autenticación
export const authService = {
  login: (email, contraseña) => 
    api.post('/auth/login', { email, contraseña }),
  registro: (nombre, email, contraseña) => 
    api.post('/auth/registro', { nombre, email, contraseña }),
  obtenerUsuarioActual: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Servicios para Tipos de Máquinas
export const tiposMaquinasService = {
  getAll: () => api.get('/tipos-maquinas'),
  getById: (id) => api.get(`/tipos-maquinas/${id}`),
  create: (data) => api.post('/tipos-maquinas', data),
  update: (id, data) => api.put(`/tipos-maquinas/${id}`, data),
  delete: (id) => api.delete(`/tipos-maquinas/${id}`),
};

// Servicios para Máquinas/Productos
export const productosService = {
  getAll: () => api.get('/productos'),
  getById: (id) => api.get(`/productos/${id}`),
  getByCodigo: (codigo) => api.get(`/productos?codigo=${codigo}`),
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
  crear: (data) => api.post('/cotizaciones', data),
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

export default api;
