const express = require('express');
const controller = require('./controller');

const router = express.Router();

router.get('/', controller.getTiposMaquinas);
router.get('/:id', controller.getTipoMaquina);
router.post('/', controller.crearTipoMaquina);
router.put('/:id', controller.actualizarTipoMaquina);
router.delete('/:id', controller.eliminarTipoMaquina);

module.exports = router;
