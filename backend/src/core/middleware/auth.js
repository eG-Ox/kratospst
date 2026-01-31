const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const obtenerToken = (req) => {
  const headerToken = req.headers.authorization?.split(' ')[1];
  if (headerToken) return headerToken;
  if (req.query && req.query.token) return req.query.token;
  return null;
};

const cargarPermisos = async (rol) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT p.clave, rp.permitido
       FROM roles r
       JOIN rol_permisos rp ON r.id = rp.rol_id
       JOIN permisos p ON rp.permiso_id = p.id
       WHERE r.nombre = ?`,
      [rol]
    );
    connection.release();
    return rows.filter((row) => row.permitido).map((row) => row.clave);
  } catch (error) {
    return null;
  }
};

const autenticar = async (req, res, next) => {
  try {
    const token = obtenerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_aqui');
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
    return true;
  }
  if (!req.permisos) {
    return true;
  }
  return req.permisos.has(clave);
};

const autorizar = (clave) => (req, res, next) => {
  if (!tienePermiso(req, clave)) {
    return res.status(403).json({ error: 'No tiene permisos para esta accion' });
  }
  return next();
};

module.exports = { autenticar, soloAdmin, autorizar, tienePermiso };
