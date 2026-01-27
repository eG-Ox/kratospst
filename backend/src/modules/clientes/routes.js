const express = require('express');
const controller = require('./controller');

const router = express.Router();

router.get('/', controller.getClientes);
router.get('/consulta-dni/:dni', controller.consultaDni);
router.get('/consulta-ruc/:ruc', controller.consultaRuc);
router.get('/consulta_dni/:dni', controller.consultaDni);
router.get('/consulta_ruc/:ruc', controller.consultaRuc);
router.get('/:id', controller.getCliente);
router.post('/', controller.crearCliente);
router.post('/api/crear', controller.crearCliente);
router.put('/:id', controller.actualizarCliente);
router.delete('/:id', controller.eliminarCliente);

module.exports = router;
