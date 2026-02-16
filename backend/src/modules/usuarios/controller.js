const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');
const { isNonEmptyString, normalizeString } = require('../../shared/utils/validation');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

exports.listarUsuarios = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
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
    res.json(rows);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizarUsuario = async (req, res) => {
  const { nombre, email, telefono, rol, activo } = req.body;
  const { id } = req.params;
  const rolesValidos = ['admin', 'ventas', 'logistica'];

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!existing.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (rol && !rolesValidos.includes(rol)) {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Rol no valido' });
    }

    if (!isNonEmptyString(nombre) || !isNonEmptyString(email)) {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    await connection.execute(
      `UPDATE usuarios
       SET nombre = ?, email = ?, telefono = ?, rol = ?, activo = ?
      WHERE id = ?`,
      [
        normalizeString(nombre),
        normalizeString(email),
        normalizeString(telefono) || null,
        rol,
        activo ? 1 : 0,
        id
      ]
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
    await connection.commit();

    return res.json({ id, nombre, email, telefono: telefono || null, rol, activo: !!activo });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error actualizando usuario:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El usuario ya esta registrado' });
    }
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerPerfil = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, nombre, email, telefono, rol FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizarPerfil = async (req, res) => {
  const { nombre, email, telefono } = req.body;
  if (!isNonEmptyString(nombre) || !isNonEmptyString(email)) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
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
    await connection.commit();
    return res.json({ id: req.usuario.id, nombre, email, telefono: telefono || null });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error actualizando perfil:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El usuario ya esta registrado' });
    }
    return res.status(500).json({ error: 'Error al actualizar perfil' });
  } finally {
    releaseConnection(connection);
  }
};
