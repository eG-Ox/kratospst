import { normalizeSearchText } from '../../../shared/utils/text';

const getToday = () => new Date().toISOString().slice(0, 10);

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizarClaveLocal = (value) => normalizeSearchText(value);

const buildMatchKey = (item) => {
  if (!item) return '';
  const productoId = item.producto_id ?? item.productoId ?? null;
  if (productoId) return `PID:${productoId}`;
  const key = normalizarClaveLocal(item.codigo || item.descripcion);
  return key ? `KEY:${key}` : '';
};

const agencias = ['SHALOM', 'MARVISUR', 'OLVA', 'OTROS', 'TIENDA'];

const estadosEnvio = ['PENDIENTE', 'ENVIADO', 'CANCELADO', 'VISITA'];

export {
  agencias,
  buildMatchKey,
  estadosEnvio,
  genId,
  getToday,
  normalizarClaveLocal
};
