const express = require('express');
const controller = require('./controller');
const { autenticar, soloAdmin } = require('../../core/middleware/auth');

const router = express.Router();

router.use(autenticar);
router.use(soloAdmin);

router.post('/manual', controller.backupManual);
router.get('/listar', controller.listarBackups);

module.exports = router;
