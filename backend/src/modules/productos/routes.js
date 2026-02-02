const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');
const { multerUpload } = require('../../core/middleware/multer');

const router = express.Router();

router.get('/', autorizar('productos.ver'), controller.getMaquinas);
router.get('/codigo/:codigo', autorizar('productos.ver'), controller.getMaquinaPorCodigo);
router.get('/plantilla', autorizar('productos.ver'), controller.descargarPlantilla);
router.get('/exportar', autorizar('productos.ver'), controller.exportarExcel);
router.post('/importar', autorizar('productos.editar'), multerUpload.single('archivo'), controller.importarExcel);
router.post('/', autorizar('productos.editar'), multerUpload.single('ficha_tecnica'), controller.crearMaquina);
router.put('/:id', autorizar('productos.editar'), multerUpload.single('ficha_tecnica'), controller.actualizarMaquina);
router.delete('/:id', autorizar('productos.editar'), controller.eliminarMaquina);
router.get('/descargar/:filename', autorizar('productos.ver'), controller.descargarFichaTecnica);
router.get('/:id', autorizar('productos.ver'), controller.getMaquina);

module.exports = router;
