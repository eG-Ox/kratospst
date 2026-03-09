const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiRoutes = require('./core/routes');
const pool = require('./core/config/database');
const { startBackupScheduler } = require('./modules/backups/scheduler');

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = String(process.env.JWT_SECRET || '').trim();
const weakJwtSecrets = new Set([
  'tu_secreto_super_seguro_aqui',
  'changeme',
  'change_me',
  'secret',
  'password',
  '1234567890123456'
]);

if (!jwtSecret || jwtSecret.length < 16) {
  console.error('Falta JWT_SECRET en .env (minimo 16 caracteres).');
  process.exit(1);
}

if (isProduction && weakJwtSecrets.has(jwtSecret.toLowerCase())) {
  console.error('JWT_SECRET inseguro detectado para produccion. Configure un secreto robusto.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const defaultCorsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const parsePositiveInt = (rawValue, fallback) => {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

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

const withTimeout = async (promise, timeoutMs, errorMessage) => {
  let timeoutHandle;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

const READINESS_DB_TIMEOUT_MS = parsePositiveInt(process.env.READINESS_DB_TIMEOUT_MS, 2000);

// Middlewares
// Configurable: activar solo cuando el backend este detras de proxy (Caddy/Nginx).
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
app.set('etag', false);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
  if (isProduction) {
    res.set('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
});
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
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identificador = String(req.body?.email || '').trim().toLowerCase() || 'anon';
    return `${req.ip}:${identificador}`;
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ['/auth/login', '/health', '/ready'].includes(req.path)
});

// Servir archivos estaticos:
// 1) frontend/build/static (chunks CSS/JS de React)
// 2) backend/src/static (imagenes y utilitarios PDF)
const frontendStaticDir = path.join(__dirname, '..', '..', 'frontend', 'build', 'static');
if (fs.existsSync(frontendStaticDir)) {
  app.use('/static', express.static(frontendStaticDir));
}
app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    status: 'ok',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ready', async (_req, res) => {
  let connection;
  try {
    connection = await withTimeout(
      pool.getConnection(),
      READINESS_DB_TIMEOUT_MS,
      'db_connection_timeout'
    );
    await withTimeout(connection.query('SELECT 1'), READINESS_DB_TIMEOUT_MS, 'db_query_timeout');
    res.json({
      ok: true,
      status: 'ready',
      checks: { db: 'up' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      status: 'not_ready',
      checks: { db: 'down' },
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (_) {
        // no-op
      }
    }
  }
});

// Montar todas las rutas de API
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);
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
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const parsedPort = Number(PORT);
    const suggestedPort = Number.isFinite(parsedPort) ? parsedPort + 1 : 5001;
    console.error(`Error: el puerto ${PORT} ya esta en uso.`);
    console.error('Cierra el proceso que lo esta usando o inicia en otro puerto.');
    console.error('PowerShell:');
    console.error(`  $env:PORT=${suggestedPort}; npm start`);
    console.error('CMD:');
    console.error(`  set PORT=${suggestedPort}&& npm start`);
    process.exit(1);
  }
  throw err;
});

startBackupScheduler();
