const express = require('express');
const { autenticar, autorizar } = require('../../core/middleware/auth');
const controller = require('./controller');

const router = express.Router();

router.get('/roles', autenticar, autorizar('permisos.editar'), controller.listarRoles);
router.get('/rol/:rol', autenticar, autorizar('permisos.editar'), controller.obtenerPermisosRol);
router.put('/rol/:rol', autenticar, autorizar('permisos.editar'), controller.actualizarPermisosRol);
router.get('/mi', autenticar, controller.obtenerMisPermisos);

module.exports = router;
