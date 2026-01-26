const express = require('express');

const router = express.Router();

// Placeholder para futuras rutas de Kits
router.get('/', (req, res) => {
  res.json({ mensaje: 'Módulo de Kits en desarrollo' });
});

module.exports = router;
