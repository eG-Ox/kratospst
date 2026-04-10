const { normalizeTrimmedText } = require('./text');

const isNonEmptyString = (value) =>
  typeof value === 'string' && normalizeTrimmedText(value).length > 0;

const normalizeString = (value) =>
  (typeof value === 'string' ? normalizeTrimmedText(value) : value);

const isEmail = (value) => {
  if (!isNonEmptyString(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeTrimmedText(value));
};

const isUsuarioIdentificador = (value) => {
  if (!isNonEmptyString(value)) return false;
  const normalized = normalizeTrimmedText(value);
  if (normalized.includes('@')) {
    return isEmail(normalized);
  }
  return /^[A-Za-z0-9._-]{1,100}$/.test(normalized);
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
  const doc = normalizeTrimmedText(documento);
  if (tipo === 'dni') return /^\d{8}$/.test(doc);
  if (tipo === 'ruc') return /^\d{11}$/.test(doc);
  return false;
};

module.exports = {
  isNonEmptyString,
  normalizeString,
  isEmail,
  isUsuarioIdentificador,
  toNumber,
  isPositiveInt,
  isNonNegative,
  validateDocumento
};
