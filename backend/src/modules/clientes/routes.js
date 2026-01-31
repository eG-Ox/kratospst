const express = require('express');
const controller = require('./controller');
const { autorizar } = require('../../core/middleware/auth');

const router = express.Router();

router.get('/', autorizar('clientes.ver'), controller.getClientes);
router.get('/consulta-dni/:dni', controller.consultaDni);
router.get('/consulta-ruc/:ruc', controller.consultaRuc);
router.get('/consulta_dni/:dni', controller.consultaDni);
router.get('/consulta_ruc/:ruc', controller.consultaRuc);
router.get('/:id', autorizar('clientes.ver'), controller.getCliente);
router.post('/', autorizar('clientes.editar'), controller.crearCliente);
router.post('/api/crear', autorizar('clientes.editar'), controller.crearCliente);
router.put('/:id', autorizar('clientes.editar'), controller.actualizarCliente);
router.delete('/:id', autorizar('clientes.editar'), controller.eliminarCliente);

module.exports = router;
