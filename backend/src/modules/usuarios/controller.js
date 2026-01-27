const pool = require('../../core/config/database');

exports.listarUsuarios = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, nombre, email, telefono, rol, activo FROM usuarios ORDER BY id DESC'
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

  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!existing.length) {
      connection.release();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await connection.execute(
      `UPDATE usuarios
       SET nombre = ?, email = ?, telefono = ?, rol = ?, activo = ?
       WHERE id = ?`,
      [nombre, email, telefono || null, rol, activo ? 1 : 0, id]
    );
    connection.release();

    res.json({ id, nombre, email, telefono: telefono || null, rol, activo: !!activo });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email ya está registrado' });
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
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      `UPDATE usuarios
       SET nombre = ?, email = ?, telefono = ?
       WHERE id = ?`,
      [nombre, email, telefono || null, req.usuario.id]
    );
    connection.release();
    res.json({ id: req.usuario.id, nombre, email, telefono: telefono || null });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};
