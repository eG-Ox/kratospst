const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

router.get('/', autorizar('inventario_general.ver'), controller.listarInventarios);
router.post('/', autorizar('inventario_general.editar'), controller.crearInventario);
router.get('/:id', autorizar('inventario_general.ver'), controller.obtenerInventario);
router.post('/:id/agregar', autorizar('inventario_general.editar'), controller.agregarConteo);
router.post('/:id/ajustar', autorizar('inventario_general.editar'), controller.ajustarConteo);
router.post('/:id/eliminar', autorizar('inventario_general.editar'), controller.eliminarDetalle);
router.post('/:id/eliminar-inventario', autorizar('inventario_general.editar'), controller.eliminarInventario);
router.post('/:id/cerrar', autorizar('inventario_general.editar'), controller.cerrarInventario);
router.post('/:id/aplicar', autorizar('inventario_general.aplicar'), controller.aplicarStock);
router.get('/:id/export', autorizar('inventario_general.ver'), controller.exportarInventario);

module.exports = router;
