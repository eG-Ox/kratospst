const express = require('express');
const maquinasController = require('../controllers/maquinasController');
const upload = require('../middleware/multer');

const router = express.Router();

router.get('/', maquinasController.getMaquinas);
router.get('/:id', maquinasController.getMaquina);
router.post('/', upload.single('ficha_tecnica'), maquinasController.crearMaquina);
router.put('/:id', upload.single('ficha_tecnica'), maquinasController.actualizarMaquina);
router.delete('/:id', maquinasController.eliminarMaquina);
router.get('/descargar/:filename', maquinasController.descargarFichaTecnica);

module.exports = router;
