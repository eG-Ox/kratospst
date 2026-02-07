const express = require('express');
const { autenticar, autorizar } = require('../../core/middleware/auth');
const controller = require('./controller');

const router = express.Router();

router.get('/', autenticar, autorizar('historial.ver'), controller.listarHistorial);
router.get('/exportar', autenticar, autorizar('historial.ver'), controller.exportarHistorial);

module.exports = router;
