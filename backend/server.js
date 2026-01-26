const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const tiposMaquinasRoutes = require('./routes/tiposMaquinas');
const maquinasRoutes = require('./routes/maquinas');
const authRoutes = require('./routes/auth');
const movimientosRoutes = require('./routes/movimientos');
const { autenticar } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de autenticación (sin autenticación)
app.use('/api/auth', authRoutes);

// Rutas protegidas (requieren autenticación)
app.use('/api/tipos-maquinas', autenticar, tiposMaquinasRoutes);
app.use('/api/maquinas', autenticar, maquinasRoutes);
app.use('/api/movimientos', movimientosRoutes);

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando correctamente' });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✓ Servidor ejecutándose en http://localhost:${PORT}`);
});
