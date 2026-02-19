import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

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

// Servicios para Máquinas
export const maquinasService = {
  getAll: () => api.get('/productos'),
  getById: (id) => api.get(`/productos/${id}`),
  getByCodigo: (codigo) => api.get(`/productos/codigo/${encodeURIComponent(codigo)}`),
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
    api.get(`/productos/descargar/${encodeURIComponent(filename)}`, { responseType: 'blob' }),
};

// Servicios para Movimientos (Ingresos/Salidas)
export const movimientosService = {
  registrar: (data) => api.post('/movimientos', data),
  obtener: (filtros) => api.get('/movimientos', { params: filtros }),
  obtenerPorMaquina: (maquina_id, opciones) => 
    api.get(`/movimientos/maquina/${maquina_id}`, { params: opciones }),
  obtenerEstadisticas: () => api.get('/movimientos/estadisticas/dashboard'),
};

export default api;
