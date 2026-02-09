const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : value);

const isEmail = (value) => {
  if (!isNonEmptyString(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isPositiveInt = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
};

const isNonNegative = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
};

const validateDocumento = (tipo, documento) => {
  const doc = String(documento || '').trim();
  if (tipo === 'dni') return /^\d{8}$/.test(doc);
  if (tipo === 'ruc') return /^\d{11}$/.test(doc);
  return false;
};

module.exports = {
  isNonEmptyString,
  normalizeString,
  isEmail,
  toNumber,
  isPositiveInt,
  isNonNegative,
  validateDocumento
};
