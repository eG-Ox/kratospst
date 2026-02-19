const pool = require('../../core/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  isNonEmptyString,
  isUsuarioIdentificador,
  normalizeString
} = require('../../shared/utils/validation');
const { AUTH_COOKIE_NAME } = require('../../core/middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const PHONE_REGEX = /^[0-9+\s-]{6,20}$/;
let passwordColumnCache = null;

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSiteDefault = isProduction ? 'strict' : 'lax';
  const sameSite = String(process.env.AUTH_COOKIE_SAMESITE || sameSiteDefault).toLowerCase();
  const secureFromEnv = parseBoolean(process.env.AUTH_COOKIE_SECURE, isProduction);
  const secure = isProduction ? true : secureFromEnv;
  return {
    httpOnly: true,
    secure,
    sameSite: sameSite === 'none' || sameSite === 'strict' ? sameSite : 'lax',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/'
  };
};

const attachAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: undefined,
    expires: new Date(0)
  });
};

const releaseConnection = (connection) => {
  if (!connection) return;
  try {
    connection.release();
  } catch (_) {
    // no-op
  }
};

const rollbackSilently = async (connection) => {
  if (!connection) return;
  try {
    await connection.rollback();
  } catch (_) {
    // no-op
  }
};

const extractPassword = (body) => {
  if (!body || typeof body !== 'object') return '';
  return String(body['contraseña'] ?? body['contraseÃ±a'] ?? body.contrasena ?? '').trim();
};

const resolvePasswordColumn = async (connection) => {
  if (passwordColumnCache) return passwordColumnCache;
  const [columns] = await connection.execute('SHOW COLUMNS FROM usuarios');
  const names = (columns || []).map((item) => item.Field);
  const namesSet = new Set(names);
  if (namesSet.has('contrasena')) {
    passwordColumnCache = 'contrasena';
    return passwordColumnCache;
  }
  if (namesSet.has('contraseña')) {
    passwordColumnCache = 'contraseña';
    return passwordColumnCache;
  }
  if (namesSet.has('contraseÃ±a')) {
    passwordColumnCache = 'contraseÃ±a';
    return passwordColumnCache;
  }
  const legacy = names.find((name) => String(name || '').toLowerCase().startsWith('contra'));
  passwordColumnCache = legacy || 'contrasena';
  return passwordColumnCache;
};

// Login
exports.login = async (req, res) => {
  const { email } = req.body || {};
  const password = extractPassword(req.body);
  const identificador = String(email || '').trim();

  if (!identificador || !password) {
    return res.status(400).json({ error: 'Usuario/email y contraseña requeridos' });
  }
  if (!isUsuarioIdentificador(identificador)) {
    return res.status(400).json({ error: 'Usuario o email invalido' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const passwordColumn = await resolvePasswordColumn(connection);
    let usuarios = [];
    if (identificador.includes('@')) {
      const [rows] = await connection.execute(
        `SELECT id, nombre, email, telefono, \`${passwordColumn}\` AS contrasena, rol
         FROM usuarios
         WHERE email = ? AND activo = TRUE`,
        [identificador]
      );
      usuarios = rows;
    } else {
      const [rows] = await connection.execute(
        `SELECT id, nombre, email, telefono, \`${passwordColumn}\` AS contrasena, rol
         FROM usuarios
         WHERE (email = ? OR email LIKE ?) AND activo = TRUE`,
        [identificador, `${identificador}@%`]
      );
      usuarios = rows;
    }

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    if (usuarios.length > 1 && !identificador.includes('@')) {
      return res.status(400).json({ error: 'Usuario ambiguo, use el email completo' });
    }

    const usuario = usuarios[0];
    const validPassword = await bcrypt.compare(password, usuario.contrasena);

    if (!validPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono || null
      },
      JWT_SECRET,
      { expiresIn: TOKEN_TTL_SECONDS }
    );

    attachAuthCookie(res, token);

    res.json({
      mensaje: 'Login exitoso',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono || null
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  } finally {
    releaseConnection(connection);
  }
};

// Registro
exports.registro = async (req, res) => {
  const { nombre, email, telefono, rol = 'ventas' } = req.body || {};
  const password = extractPassword(req.body);
  const rolesValidos = ['admin', 'ventas', 'logistica'];
  const nombreValue = normalizeString(nombre);
  const identificadorValue = normalizeString(email);
  const telefonoValue = normalizeString(telefono);

  if (!isNonEmptyString(nombreValue) || !isNonEmptyString(identificadorValue) || !password) {
    return res.status(400).json({ error: 'Nombre, usuario/email y contraseña requeridos' });
  }
  if (!isUsuarioIdentificador(identificadorValue)) {
    return res.status(400).json({ error: 'Usuario o email invalido' });
  }
  if (!isNonEmptyString(telefonoValue) || !PHONE_REGEX.test(telefonoValue)) {
    return res.status(400).json({
      error: 'Telefono invalido. Use 6-20 caracteres (digitos, +, espacio o -)'
    });
  }
  if (!isNonEmptyString(password) || password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (rol && !rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol no valido' });
  }

  let connection;
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    connection = await pool.getConnection();
    const passwordColumn = await resolvePasswordColumn(connection);
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO usuarios (nombre, email, telefono, \`${passwordColumn}\`, rol) VALUES (?, ?, ?, ?, ?)`,
      [nombreValue, identificadorValue, telefonoValue, passwordHash, rol]
    );
    await connection.commit();

    if (!req.skipAuthCookie) {
      const token = jwt.sign(
        {
          id: result.insertId,
          nombre: nombreValue,
          email: identificadorValue,
          rol,
          telefono: telefonoValue
        },
        JWT_SECRET,
        { expiresIn: TOKEN_TTL_SECONDS }
      );
      attachAuthCookie(res, token);
    }

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        id: result.insertId,
        nombre: nombreValue,
        email: identificadorValue,
        rol,
        telefono: telefonoValue
      }
    });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error en registro:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El usuario ya esta registrado' });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  } finally {
    releaseConnection(connection);
  }
};

// Obtener usuario actual
exports.obtenerUsuarioActual = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [usuarios] = await connection.execute(
      'SELECT id, nombre, email, telefono, rol FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  } finally {
    releaseConnection(connection);
  }
};

exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ mensaje: 'Logout exitoso' });
};
