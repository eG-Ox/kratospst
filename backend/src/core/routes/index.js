const express = require('express');
const { autenticar } = require('../middleware/auth');

const authRoutes = require('../../modules/auth/routes');
const productosRoutes = require('../../modules/productos/routes');
const tiposMaquinasRoutes = require('../../modules/tipos-maquinas/routes');
const movimientosRoutes = require('../../modules/movimientos/routes');
const kitsRoutes = require('../../modules/kits/routes');
const cotizacionesRoutes = require('../../modules/cotizaciones/routes');
const clientesRoutes = require('../../modules/clientes/routes');
const usuariosRoutes = require('../../modules/usuarios/routes');
const historialRoutes = require('../../modules/historial/routes');
const permisosRoutes = require('../../modules/permisos/routes');
const inventarioGeneralRoutes = require('../../modules/inventario-general/routes');
const pool = require('../config/database');

const router = express.Router();

// Rutas públicas
router.use('/auth', authRoutes);

// Rutas protegidas (requieren autenticación)
router.use('/tipos-maquinas', autenticar, tiposMaquinasRoutes);
router.use('/productos', autenticar, productosRoutes);
router.use('/movimientos', autenticar, movimientosRoutes);
router.use('/kits', autenticar, kitsRoutes);
router.use('/cotizaciones', autenticar, cotizacionesRoutes);
router.use('/clientes', autenticar, clientesRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/historial', historialRoutes);
router.use('/permisos', permisosRoutes);
router.use('/inventario-general', autenticar, inventarioGeneralRoutes);

// Tipos por almacen
router.get('/tipos_por_almacen', autenticar, async (req, res) => {
  const { filtrar_stock = 'false' } = req.query;
  const filtrarStock = String(filtrar_stock).toLowerCase() === 'true';

  try {
    const connection = await pool.getConnection();
    let query = `SELECT DISTINCT t.id, t.nombre
      FROM maquinas m
      JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id`;
    const params = [];
    if (filtrarStock) {
      query += ' WHERE m.stock > 0';
    }
    query += ' ORDER BY t.nombre';

    const [rows] = await connection.execute(query, params);
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo tipos:', error);
    res.status(500).json({ error: 'Error al obtener tipos' });
  }
});

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando correctamente' });
});

module.exports = router;
