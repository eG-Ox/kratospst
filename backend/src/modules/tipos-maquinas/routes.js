const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

router.get('/', autorizar('tipos_maquinas.ver'), controller.getTiposMaquinas);
router.get('/:id', autorizar('tipos_maquinas.ver'), controller.getTipoMaquina);
router.post('/', autorizar('tipos_maquinas.editar'), controller.crearTipoMaquina);
router.put('/:id', autorizar('tipos_maquinas.editar'), controller.actualizarTipoMaquina);
router.delete('/:id', autorizar('tipos_maquinas.editar'), controller.eliminarTipoMaquina);

module.exports = router;
