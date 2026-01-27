const express = require('express');
const controller = require('./controller');

const router = express.Router();

// API para cotizaciones
router.get('/api/listar', controller.listarKitsActivos);
router.get('/api/obtener-para-venta/:kit_id', controller.obtenerParaVenta);

// CRUD (admin)
router.get('/', controller.listarKits);
router.get('/:id', controller.obtenerKit);
router.post('/crear', controller.crearKit);
router.post('/:id/editar', controller.editarKit);
router.post('/:id/eliminar', controller.eliminarKit);
router.post('/:id/toggle', controller.toggleKit);

module.exports = router;
