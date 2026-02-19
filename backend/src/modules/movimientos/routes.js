const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

router.post('/', autorizar('movimientos.registrar'), controller.registrarMovimiento);
router.post('/batch', autorizar('movimientos.registrar'), controller.registrarMovimientosBatch);
router.get('/', autorizar('movimientos.ver'), controller.obtenerMovimientos);
router.get('/maquina/:maquina_id', autorizar('movimientos.ver'), controller.obtenerMovimientosPorMaquina);
router.get('/estadisticas/dashboard', autorizar('movimientos.ver'), controller.obtenerEstadisticas);

module.exports = router;
