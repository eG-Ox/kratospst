const express = require('express');
const controller = require('./controller');
const { autenticar, soloAdmin } = require('../../core/middleware/auth');

const router = express.Router();

router.post('/login', controller.login);
router.post('/registro', autenticar, soloAdmin, controller.registro);
router.get('/me', autenticar, controller.obtenerUsuarioActual);
router.post('/logout', autenticar, controller.logout);

module.exports = router;
