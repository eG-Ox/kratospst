const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');

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

// Obtener todos los tipos de máquinas
exports.getTiposMaquinas = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [tipos] = await connection.execute(
      'SELECT * FROM tipos_maquinas ORDER BY nombre'
    );
    connection.release();
    res.json(tipos);
  } catch (error) {
    console.error('Error obteniendo tipos de máquinas:', error);
    res.status(500).json({ error: 'Error al obtener tipos de máquinas' });
  }
};

// Obtener un tipo de máquina por ID
exports.getTipoMaquina = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [tipo] = await connection.execute(
      'SELECT * FROM tipos_maquinas WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    
    if (tipo.length === 0) {
      return res.status(404).json({ error: 'Tipo de máquina no encontrado' });
    }
    
    res.json(tipo[0]);
  } catch (error) {
    console.error('Error obteniendo tipo de máquina:', error);
    res.status(500).json({ error: 'Error al obtener tipo de máquina' });
  }
};

// Crear nuevo tipo de máquina
exports.crearTipoMaquina = async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'INSERT INTO tipos_maquinas (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    await registrarHistorial(connection, {
      entidad: 'tipos_maquinas',
      entidad_id: result.insertId,
      usuario_id: req.usuario?.id,
      accion: 'crear',
      descripcion: `Tipo de maquina creado (${nombre})`,
      antes: null,
      despues: { id: result.insertId, nombre, descripcion: descripcion || null }
    });
    await connection.commit();

    return res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion
    });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error creando tipo de maquina:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El tipo de maquina ya existe' });
    }
    return res.status(500).json({ error: 'Error al crear tipo de maquina' });
  } finally {
    releaseConnection(connection);
  }
};

// Actualizar tipo de máquina
exports.actualizarTipoMaquina = async (req, res) => {
  const { nombre, descripcion } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [prev] = await connection.execute('SELECT * FROM tipos_maquinas WHERE id = ?', [
      req.params.id
    ]);
    if (!prev.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Tipo de maquina no encontrado' });
    }
    await connection.execute(
      'UPDATE tipos_maquinas SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombre, descripcion || null, req.params.id]
    );
    await registrarHistorial(connection, {
      entidad: 'tipos_maquinas',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Tipo de maquina actualizado (${req.params.id})`,
      antes: prev[0],
      despues: { id: Number(req.params.id), nombre, descripcion: descripcion || null }
    });
    await connection.commit();

    return res.json({ id: req.params.id, nombre, descripcion });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error actualizando tipo de maquina:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El tipo de maquina ya existe' });
    }
    return res.status(500).json({ error: 'Error al actualizar tipo de maquina' });
  } finally {
    releaseConnection(connection);
  }
};

// Eliminar tipo de máquina
exports.eliminarTipoMaquina = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [prev] = await connection.execute('SELECT * FROM tipos_maquinas WHERE id = ?', [
      req.params.id
    ]);
    if (!prev.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Tipo de maquina no encontrado' });
    }
    const [result] = await connection.execute('DELETE FROM tipos_maquinas WHERE id = ?', [
      req.params.id
    ]);
    if (result.affectedRows === 0) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Tipo de maquina no encontrado' });
    }
    await registrarHistorial(connection, {
      entidad: 'tipos_maquinas',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'eliminar',
      descripcion: `Tipo de maquina eliminado (${req.params.id})`,
      antes: prev[0],
      despues: null
    });
    await connection.commit();

    return res.json({ mensaje: 'Tipo de maquina eliminado correctamente' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error eliminando tipo de maquina:', error);
    return res.status(500).json({ error: 'Error al eliminar tipo de maquina' });
  } finally {
    releaseConnection(connection);
  }
};
