const express = require('express');
const controller = require('./controller');
const { autenticar, soloAdmin } = require('../../core/middleware/auth');
const pool = require('../../core/config/database');

const router = express.Router();

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};
const ALLOW_BOOTSTRAP_REGISTRATION = parseBoolean(
  process.env.ALLOW_BOOTSTRAP_REGISTRATION,
  false
);

const releaseConnection = (connection) => {
  if (!connection) return;
  try {
    connection.release();
  } catch (_) {
    // no-op
  }
};

const puedeRegistrarPrimerAdmin = async () => {
  if (!ALLOW_BOOTSTRAP_REGISTRATION) {
    return false;
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM usuarios');
    return Number(rows?.[0]?.total || 0) === 0;
  } catch (error) {
    console.error('Error evaluando bootstrap de admin:', error);
    return false;
  } finally {
    releaseConnection(connection);
  }
};

router.post('/login', controller.login);
router.post('/registro', async (req, res) => {
  try {
    const bootstrapAdmin = await puedeRegistrarPrimerAdmin();
    if (bootstrapAdmin) {
      req.body = { ...(req.body || {}), rol: 'admin' };
      return controller.registro(req, res);
    }
    return autenticar(req, res, () =>
      soloAdmin(req, res, () => {
        // Crear usuarios desde una sesion admin sin reemplazar su cookie actual.
        req.skipAuthCookie = true;
        return controller.registro(req, res);
      })
    );
  } catch (error) {
    console.error('Error en ruta de registro:', error);
    return res.status(500).json({ error: 'Error al procesar registro' });
  }
});
router.get('/me', autenticar, controller.obtenerUsuarioActual);
router.post('/logout', autenticar, controller.logout);

module.exports = router;
