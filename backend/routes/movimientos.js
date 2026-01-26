const express = require('express');
const movimientosController = require('../controllers/movimientosController');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

router.post('/', movimientosController.registrarMovimiento);
router.get('/', movimientosController.obtenerMovimientos);
router.get('/maquina/:maquina_id', movimientosController.obtenerMovimientosPorMaquina);
router.get('/estadisticas/dashboard', movimientosController.obtenerEstadisticas);

module.exports = router;
