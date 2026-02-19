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
const marcasRoutes = require('../../modules/marcas/routes');
const inventarioGeneralRoutes = require('../../modules/inventario-general/routes');
const ventasRoutes = require('../../modules/ventas/routes');
const backupsRoutes = require('../../modules/backups/routes');
const pool = require('../config/database');

const router = express.Router();

// Rutas públicas
router.use('/auth', authRoutes);

// Rutas protegidas (requieren autenticación)
router.use('/tipos-maquinas', autenticar, tiposMaquinasRoutes);
router.use('/marcas', autenticar, marcasRoutes);
router.use('/productos', autenticar, productosRoutes);
router.use('/movimientos', autenticar, movimientosRoutes);
router.use('/kits', autenticar, kitsRoutes);
router.use('/cotizaciones', autenticar, cotizacionesRoutes);
router.use('/clientes', autenticar, clientesRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/historial', historialRoutes);
router.use('/permisos', permisosRoutes);
router.use('/inventario-general', autenticar, inventarioGeneralRoutes);
router.use('/ventas', autenticar, ventasRoutes);
router.use('/backups', backupsRoutes);

// Tipos por almacen
router.get('/tipos_por_almacen', autenticar, async (req, res) => {
  const { filtrar_stock = 'false' } = req.query;
  const filtrarStock = String(filtrar_stock).toLowerCase() === 'true';
  let connection;

  try {
    connection = await pool.getConnection();
    const query = filtrarStock
      ? `SELECT t.id, t.nombre
         FROM tipos_maquinas t
         WHERE EXISTS (
           SELECT 1
           FROM maquinas m
           WHERE m.tipo_maquina_id = t.id
             AND m.stock > 0
         )
         ORDER BY t.nombre`
      : `SELECT t.id, t.nombre
         FROM tipos_maquinas t
         WHERE EXISTS (
           SELECT 1
           FROM maquinas m
           WHERE m.tipo_maquina_id = t.id
         )
         ORDER BY t.nombre`;

    const [rows] = await connection.execute(query);
    return res.json(rows);
  } catch (error) {
    console.error('Error obteniendo tipos:', error);
    return res.status(500).json({ error: 'Error al obtener tipos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
