const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiRoutes = require('./core/routes');
const { startBackupScheduler } = require('./modules/backups/scheduler');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Falta JWT_SECRET en .env (minimo 16 caracteres).');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const defaultCorsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || defaultCorsOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const parseTrustProxy = (rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return false;
  }
  const value = String(rawValue).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return 1;
  }
  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false;
  }
  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric;
  }
  return rawValue;
};

// Middlewares
// Configurable: activar solo cuando el backend este detras de proxy (Caddy/Nginx).
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
app.set('etag', false);
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin Origin (apps nativas, curl, healthchecks)
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

// Servir archivos estáticos
app.use('/static', express.static(path.join(__dirname, 'static')));

// Montar todas las rutas de API
app.use('/api/auth/login', loginLimiter);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});
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

startBackupScheduler();
