const express = require('express');
const authController = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/registro', authController.registro);
router.get('/me', autenticar, authController.obtenerUsuarioActual);
router.post('/logout', autenticar, authController.logout);

module.exports = router;
