const jwt = require('jsonwebtoken');

const obtenerToken = (req) => {
  const headerToken = req.headers.authorization?.split(' ')[1];
  if (headerToken) return headerToken;
  if (req.query && req.query.token) return req.query.token;
  return null;
};

const autenticar = (req, res, next) => {
  try {
    const token = obtenerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_aqui');
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
};

module.exports = { autenticar, soloAdmin };
