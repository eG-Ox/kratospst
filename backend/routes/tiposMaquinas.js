const express = require('express');
const tiposMaquinasController = require('../controllers/tiposMaquinasController');

const router = express.Router();

router.get('/', tiposMaquinasController.getTiposMaquinas);
router.get('/:id', tiposMaquinasController.getTipoMaquina);
router.post('/', tiposMaquinasController.crearTipoMaquina);
router.put('/:id', tiposMaquinasController.actualizarTipoMaquina);
router.delete('/:id', tiposMaquinasController.eliminarTipoMaquina);

module.exports = router;
