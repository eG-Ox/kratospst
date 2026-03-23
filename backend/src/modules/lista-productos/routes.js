const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');
const { multerUpload } = require('../../core/middleware/multer');

const router = express.Router();

router.get('/', autorizar('productos.ver'), controller.listar);
router.get('/tipos', autorizar('productos.ver'), controller.listarTipos);
router.post('/tipos', autorizar('productos.editar'), controller.crearTipo);
router.put('/tipos/:id', autorizar('productos.editar'), controller.actualizarTipo);
router.get('/marcas', autorizar('productos.ver'), controller.listarMarcas);
router.get('/codigo/:codigo', autorizar('productos.ver'), controller.obtenerPorCodigo);
router.get('/plantilla', autorizar('productos.ver'), controller.descargarPlantilla);
router.get('/exportar', autorizar('productos.ver'), controller.exportarExcel);
router.post(
  '/importar',
  autorizar('productos.editar'),
  multerUpload.single('archivo'),
  controller.importarExcel
);
router.post(
  '/',
  autorizar('productos.editar'),
  multerUpload.single('ficha_tecnica'),
  controller.crear
);
router.put(
  '/:id',
  autorizar('productos.editar'),
  multerUpload.single('ficha_tecnica'),
  controller.actualizar
);
router.delete('/:id', autorizar('productos.editar'), controller.eliminar);
router.get('/descargar/:filename', autorizar('productos.ver'), controller.descargarFichaTecnica);
router.get('/:id', autorizar('productos.ver'), controller.obtenerPorId);

module.exports = router;
