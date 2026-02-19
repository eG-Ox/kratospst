const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'contrasena',
  'contraseña',
  'password',
  'pass',
  'token',
  'secret',
  'jwt',
  'cookie',
  'authorization'
]);

const normalizeKey = (key) =>
  String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const sanitizeForHistory = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForHistory(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const output = {};
  for (const [key, innerValue] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(normalizeKey(key))) {
      output[key] = REDACTED_VALUE;
      continue;
    }
    output[key] = sanitizeForHistory(innerValue);
  }
  return output;
};

const registrarHistorial = async (connection, payload) => {
  const {
    entidad,
    entidad_id,
    usuario_id,
    accion,
    descripcion,
    antes,
    despues
  } = payload;

  const antesJson = antes ? JSON.stringify(sanitizeForHistory(antes)) : null;
  const despuesJson = despues ? JSON.stringify(sanitizeForHistory(despues)) : null;

  await connection.execute(
    `INSERT INTO historial_acciones
     (entidad, entidad_id, usuario_id, accion, descripcion, antes_json, despues_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entidad, entidad_id || null, usuario_id || null, accion, descripcion || null, antesJson, despuesJson]
  );
};

module.exports = { registrarHistorial, sanitizeForHistory };
