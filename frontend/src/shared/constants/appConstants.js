// Constantes compartidas
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const TIPOS_MOVIMIENTO = {
  INGRESO: 'ingreso',
  SALIDA: 'salida'
};

export const ROLES_USUARIO = {
  ADMIN: 'admin',
  OPERARIO: 'operario'
};

export const ESTADOS_PRODUCTO = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo'
};
