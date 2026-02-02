const pool = require('../../core/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_aqui';

/**
 * Módulo de Autenticación
 * Maneja: Login, Registro, Obtención de usuario actual
 */

// Login
exports.login = async (req, res) => {
  const { email, contraseña } = req.body;
  const identificador = String(email || '').trim();

  if (!identificador || !contraseña) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const connection = await pool.getConnection();
    let usuarios = [];
    if (identificador.includes('@')) {
      const [rows] = await connection.execute(
        'SELECT id, nombre, email, telefono, contraseña, rol FROM usuarios WHERE email = ? AND activo = TRUE',
        [identificador]
      );
      usuarios = rows;
    } else {
      const [rows] = await connection.execute(
        `SELECT id, nombre, email, telefono, contraseña, rol
         FROM usuarios
         WHERE (email = ? OR email LIKE ? OR nombre = ?) AND activo = TRUE`,
        [identificador, `${identificador}@%`, identificador]
      );
      usuarios = rows;
    }
    connection.release();

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    if (usuarios.length > 1 && !identificador.includes('@')) {
      return res.status(400).json({ error: 'Usuario ambiguo, use el email completo' });
    }

    const usuario = usuarios[0];
    const validPassword = await bcrypt.compare(contraseña, usuario.contraseña);

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
      { expiresIn: '24h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
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
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};
// Registro
exports.registro = async (req, res) => {
  const { nombre, email, telefono, contraseña, rol = 'ventas' } = req.body;
  const rolesValidos = ['admin', 'ventas', 'logistica'];

  if (!nombre || !email || !contraseña) {
    return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
  }
  if (rol && !rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol no valido' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const contraseñaHasheada = await bcrypt.hash(contraseña, salt);

    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO usuarios (nombre, email, telefono, contraseña, rol) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, telefono || null, contraseñaHasheada, rol]
    );
    connection.release();

    const token = jwt.sign(
      { id: result.insertId, nombre, email, rol, telefono: telefono || null },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: { id: result.insertId, nombre, email, rol, telefono: telefono || null }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Obtener usuario actual
exports.obtenerUsuarioActual = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [usuarios] = await connection.execute(
      'SELECT id, nombre, email, telefono, rol FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    connection.release();

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Logout (simplemente eliminar token en frontend)
exports.logout = (req, res) => {
  res.json({ mensaje: 'Logout exitoso' });
};

