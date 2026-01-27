const express = require('express');
const controller = require('./controller');

const router = express.Router();

router.get('/', controller.formularioCotizaciones);
router.post('/', controller.crearCotizacion);

router.get('/ver/:id', controller.verCotizacion);
router.get('/pdf/:id', controller.pdfCotizacion);

router.get('/api/buscar-productos', controller.buscarProductos);
router.get('/api/producto/:id', controller.obtenerProducto);
router.get('/api/filtros_cotizacion', controller.filtrosCotizacion);
router.get('/api/productos_cotizacion', controller.productosCotizacion);

module.exports = router;
