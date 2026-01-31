const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

router.get('/', autorizar('cotizaciones.ver'), controller.formularioCotizaciones);
router.get('/listar', autorizar('cotizaciones.ver'), controller.listarCotizaciones);
router.get('/historial', autorizar('cotizaciones.historial.ver'), controller.listarHistorialCotizaciones);
router.get('/:id', autorizar('cotizaciones.ver'), controller.obtenerCotizacion);
router.post('/', autorizar('cotizaciones.editar'), controller.crearCotizacion);
router.put('/:id', autorizar('cotizaciones.editar'), controller.editarCotizacion);

router.get('/ver/:id', autorizar('cotizaciones.ver'), controller.verCotizacion);
router.get('/pdf/:id', autorizar('cotizaciones.ver'), controller.pdfCotizacion);

router.get('/api/buscar-productos', autorizar('cotizaciones.ver'), controller.buscarProductos);
router.get('/api/producto/:id', autorizar('cotizaciones.ver'), controller.obtenerProducto);
router.get('/api/filtros_cotizacion', autorizar('cotizaciones.ver'), controller.filtrosCotizacion);
router.get('/api/productos_cotizacion', autorizar('cotizaciones.ver'), controller.productosCotizacion);

module.exports = router;
