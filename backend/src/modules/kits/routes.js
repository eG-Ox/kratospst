const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

// API para cotizaciones
router.get('/api/listar', autorizar('kits.ver'), controller.listarKitsActivos);
router.get('/api/obtener-para-venta/:kit_id', autorizar('kits.ver'), controller.obtenerParaVenta);

// CRUD (admin)
router.get('/', autorizar('kits.ver'), controller.listarKits);
router.get('/:id', autorizar('kits.ver'), controller.obtenerKit);
router.post('/crear', autorizar('kits.editar'), controller.crearKit);
router.post('/:id/editar', autorizar('kits.editar'), controller.editarKit);
router.post('/:id/eliminar', autorizar('kits.editar'), controller.eliminarKit);
router.post('/:id/toggle', autorizar('kits.editar'), controller.toggleKit);

module.exports = router;
