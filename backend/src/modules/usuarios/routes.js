const express = require('express');
const { autenticar, soloAdmin } = require('../../core/middleware/auth');
const controller = require('./controller');

const router = express.Router();

router.get('/', autenticar, soloAdmin, controller.listarUsuarios);
router.put('/:id', autenticar, soloAdmin, controller.actualizarUsuario);

router.get('/me', autenticar, controller.obtenerPerfil);
router.put('/me', autenticar, controller.actualizarPerfil);

module.exports = router;
