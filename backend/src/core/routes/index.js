const express = require('express');
const { autenticar } = require('../middleware/auth');

const authRoutes = require('../../modules/auth/routes');
const productosRoutes = require('../../modules/productos/routes');
const tiposMaquinasRoutes = require('../../modules/tipos-maquinas/routes');
const movimientosRoutes = require('../../modules/movimientos/routes');
const kitsRoutes = require('../../modules/kits/routes');
const cotizacionesRoutes = require('../../modules/cotizaciones/routes');

const router = express.Router();

// Rutas públicas
router.use('/auth', authRoutes);

// Rutas protegidas (requieren autenticación)
router.use('/tipos-maquinas', autenticar, tiposMaquinasRoutes);
router.use('/productos', autenticar, productosRoutes);
router.use('/movimientos', autenticar, movimientosRoutes);
router.use('/kits', autenticar, kitsRoutes);
router.use('/cotizaciones', autenticar, cotizacionesRoutes);

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando correctamente' });
});

module.exports = router;
