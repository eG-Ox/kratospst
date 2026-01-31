const express = require('express');
const { autenticar, autorizar } = require('../../core/middleware/auth');
const controller = require('./controller');

const router = express.Router();

router.get('/', autenticar, autorizar('usuarios.ver'), controller.listarUsuarios);
router.put('/:id', autenticar, autorizar('usuarios.editar'), controller.actualizarUsuario);

router.get('/me', autenticar, controller.obtenerPerfil);
router.put('/me', autenticar, controller.actualizarPerfil);

module.exports = router;
