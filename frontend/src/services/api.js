import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
  getAll: () => api.get('/maquinas'),
  getById: (id) => api.get(`/maquinas/${id}`),
  getByCodigo: (codigo) => api.get(`/maquinas?codigo=${codigo}`),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/maquinas', formData, {
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
    return api.put(`/maquinas/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/maquinas/${id}`),
  descargarFichaTecnica: (filename) => 
    api.get(`/maquinas/descargar/${filename}`, { responseType: 'blob' }),
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
