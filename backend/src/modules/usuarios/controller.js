const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');
const { isNonEmptyString, normalizeString } = require('../../shared/utils/validation');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

exports.listarUsuarios = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const limiteValue = parsePositiveInt(req.query.limite, 5000);
    const paginaValue = parsePositiveInt(req.query.pagina, 1);
    const safeLimit = Math.min(limiteValue, 20000);
    const offset = (paginaValue - 1) * safeLimit;
    const [rows] = await connection.execute(
      `SELECT id, nombre, email, telefono, rol, activo
       FROM usuarios
       ORDER BY id DESC
       LIMIT ${offset}, ${safeLimit}`
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

exports.actualizarUsuario = async (req, res) => {
  const { nombre, email, telefono, rol, activo } = req.body;
  const { id } = req.params;
  const rolesValidos = ['admin', 'ventas', 'logistica'];

  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!existing.length) {
      connection.release();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (rol && !rolesValidos.includes(rol)) {
      connection.release();
      return res.status(400).json({ error: 'Rol no valido' });
    }

    if (!isNonEmptyString(nombre) || !isNonEmptyString(email)) {
      connection.release();
      return res.status(400).json({ error: 'Nombre y usuario son requeridos' });
    }

    await connection.execute(
      `UPDATE usuarios
       SET nombre = ?, email = ?, telefono = ?, rol = ?, activo = ?
      WHERE id = ?`,
      [normalizeString(nombre), normalizeString(email), normalizeString(telefono) || null, rol, activo ? 1 : 0, id]
    );
    await registrarHistorial(connection, {
      entidad: 'usuarios',
      entidad_id: id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Usuario actualizado (${id})`,
      antes: existing[0],
      despues: {
        id: Number(id),
        nombre,
        email,
        telefono: telefono || null,
        rol,
        activo: !!activo
      }
    });
    connection.release();

    res.json({ id, nombre, email, telefono: telefono || null, rol, activo: !!activo });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El usuario ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

exports.obtenerPerfil = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, nombre, email, telefono, rol FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    connection.release();
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

exports.actualizarPerfil = async (req, res) => {
  const { nombre, email, telefono } = req.body;
  if (!isNonEmptyString(nombre) || !isNonEmptyString(email)) {
    return res.status(400).json({ error: 'Nombre y usuario son requeridos' });
  }
  try {
    const connection = await pool.getConnection();
    const [prev] = await connection.execute('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    await connection.execute(
      `UPDATE usuarios
       SET nombre = ?, email = ?, telefono = ?
       WHERE id = ?`,
      [normalizeString(nombre), normalizeString(email), normalizeString(telefono) || null, req.usuario.id]
    );
    await registrarHistorial(connection, {
      entidad: 'usuarios',
      entidad_id: req.usuario.id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Perfil actualizado (${req.usuario.id})`,
      antes: prev[0] || null,
      despues: {
        id: req.usuario.id,
        nombre,
        email,
        telefono: telefono || null
      }
    });
    connection.release();
    res.json({ id: req.usuario.id, nombre, email, telefono: telefono || null });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El usuario ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};
