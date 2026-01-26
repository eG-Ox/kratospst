const express = require('express');

const router = express.Router();

// Placeholder para futuras rutas de Cotizaciones
router.get('/', (req, res) => {
  res.json({ mensaje: 'Módulo de Cotizaciones en desarrollo' });
});

module.exports = router;
