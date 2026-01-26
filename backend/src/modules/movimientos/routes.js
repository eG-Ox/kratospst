const express = require('express');
const controller = require('./controller');
const { autenticar } = require('../../core/middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

router.post('/', controller.registrarMovimiento);
router.get('/', controller.obtenerMovimientos);
router.get('/maquina/:maquina_id', controller.obtenerMovimientosPorMaquina);
router.get('/estadisticas/dashboard', controller.obtenerEstadisticas);

module.exports = router;
