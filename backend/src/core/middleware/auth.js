const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const AUTH_COOKIE_NAME = 'kratos_token';

const parseCookies = (cookieHeader = '') => {
  const parsed = {};
  String(cookieHeader || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const separator = pair.indexOf('=');
      if (separator <= 0) return;
      const key = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (!key) return;
      try {
        parsed[key] = decodeURIComponent(value);
      } catch (_) {
        parsed[key] = value;
      }
    });
  return parsed;
};

const obtenerToken = (req) => {
  const headerToken = req.headers.authorization?.split(' ')[1];
  if (headerToken) return headerToken;
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  if (cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }
  return null;
};

const cargarPermisos = async (rol) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT p.clave, rp.permitido
       FROM roles r
       JOIN rol_permisos rp ON r.id = rp.rol_id
       JOIN permisos p ON rp.permiso_id = p.id
       WHERE r.nombre = ?`,
      [rol]
    );
    return rows.filter((row) => row.permitido).map((row) => row.clave);
  } catch (error) {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const autenticar = async (req, res, next) => {
  try {
    const token = obtenerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    const permisos = await cargarPermisos(decoded.rol);
    if (permisos) {
      req.permisos = new Set(permisos);
      req.permisosCargados = true;
    } else {
      req.permisos = null;
      req.permisosCargados = false;
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
};

const tienePermiso = (req, clave) => {
  if (!req.permisosCargados) {
    return false;
  }
  if (!req.permisos) {
    return false;
  }
  return req.permisos.has(clave);
};

const autorizar = (clave) => (req, res, next) => {
  if (!tienePermiso(req, clave)) {
    return res.status(403).json({ error: 'No tiene permisos para esta accion' });
  }
  return next();
};

module.exports = {
  AUTH_COOKIE_NAME,
  autenticar,
  soloAdmin,
  autorizar,
  tienePermiso,
  // Expuesto para pruebas unitarias.
  parseCookies,
  obtenerToken
};
