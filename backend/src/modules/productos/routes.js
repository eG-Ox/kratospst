const express = require('express');
const controller = require('./controller');
const { multerUpload } = require('../../core/middleware/multer');

const router = express.Router();

router.get('/', controller.getMaquinas);
router.get('/:id', controller.getMaquina);
router.post('/', multerUpload.single('ficha_tecnica'), controller.crearMaquina);
router.put('/:id', multerUpload.single('ficha_tecnica'), controller.actualizarMaquina);
router.delete('/:id', controller.eliminarMaquina);
router.get('/descargar/:filename', controller.descargarFichaTecnica);

module.exports = router;
