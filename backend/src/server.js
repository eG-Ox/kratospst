const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiRoutes = require('./core/routes');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Falta JWT_SECRET en .env (minimo 16 caracteres).');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
// Confiar en el proxy (Caddy) para X-Forwarded-For
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/static', express.static(path.join(__dirname, 'static')));

// Montar todas las rutas de API
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const parsedPort = Number(PORT);
    const suggestedPort = Number.isFinite(parsedPort) ? parsedPort + 1 : 5001;
    console.error(`Error: el puerto ${PORT} ya está en uso.`);
    console.error('Cierra el proceso que lo está usando o inicia en otro puerto.');
    console.error('PowerShell:');
    console.error(`  $env:PORT=${suggestedPort}; npm start`);
    console.error('CMD:');
    console.error(`  set PORT=${suggestedPort}&& npm start`);
    process.exit(1);
  }
  throw err;
});
