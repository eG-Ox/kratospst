const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

router.get('/', autorizar('marcas.ver'), controller.listarMarcas);
router.get('/:id', autorizar('marcas.ver'), controller.obtenerMarca);
router.post('/', autorizar('marcas.editar'), controller.crearMarca);
router.put('/:id', autorizar('marcas.editar'), controller.actualizarMarca);
router.delete('/:id', autorizar('marcas.editar'), controller.eliminarMarca);

module.exports = router;
