const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

router.get('/', autorizar('comprobantes.ver'), controller.formularioComprobantes);
router.get('/listar', autorizar('comprobantes.ver'), controller.listarComprobantes);
router.get('/historial', autorizar('comprobantes.historial.ver'), controller.listarHistorialComprobantes);
router.post('/', autorizar('comprobantes.editar'), controller.crearComprobante);
router.put('/:id', autorizar('comprobantes.editar'), controller.editarComprobante);

router.get('/ver/:id', autorizar('comprobantes.ver'), controller.verComprobante);
router.get('/pdf/:id', autorizar('comprobantes.ver'), controller.pdfComprobante);
router.get('/:id', autorizar('comprobantes.ver'), controller.obtenerComprobante);

router.get('/api/buscar-productos', autorizar('comprobantes.ver'), controller.buscarProductos);
router.get('/api/producto/:id', autorizar('comprobantes.ver'), controller.obtenerProducto);
router.get('/api/filtros_comprobante', autorizar('comprobantes.ver'), controller.filtrosComprobante);
router.get('/api/productos_comprobante', autorizar('comprobantes.ver'), controller.productosComprobante);

module.exports = router;

