const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

router.get('/', autorizar('ventas.ver'), controller.listarVentas);
router.get('/detalle/listar', autorizar('ventas.ver'), controller.listarDetalleVentas);
router.get('/requerimientos/historial', autorizar('ventas.ver'), controller.historialRequerimientos);
router.get('/requerimientos/pendientes', autorizar('ventas.ver'), controller.listarRequerimientosPendientes);
router.patch('/requerimientos/:id', autorizar('ventas.editar'), controller.actualizarRequerimiento);
router.post('/requerimientos/crear', autorizar('ventas.editar'), controller.crearRequerimientoProducto);
router.get('/picking/pendientes', autorizar('picking.ver'), controller.listarPickingPendientes);
router.post('/picking/confirmar', autorizar('picking.editar'), controller.confirmarPicking);
router.post('/picking/cerrar', autorizar('picking.editar'), controller.cerrarPedido);
router.get('/export', autorizar('ventas.ver'), controller.exportarVentas);
router.get('/:id', autorizar('ventas.ver'), controller.obtenerVenta);
router.post('/', autorizar('ventas.editar'), controller.crearVenta);
router.put('/:id', autorizar('ventas.editar'), controller.editarVenta);
router.patch('/:id/estado', autorizar('ventas.editar'), controller.actualizarEstadoVenta);
router.patch('/:id/envio', autorizar('ventas.editar'), controller.actualizarEnvioVenta);
router.delete('/:id', autorizar('ventas.eliminar'), controller.eliminarVenta);

module.exports = router;
