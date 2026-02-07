const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');

const normalizarCodigo = (value) => String(value || '').trim().toUpperCase();
const normalizarNombre = (value) => String(value || '').trim();

exports.listarMarcas = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM marcas ORDER BY nombre'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando marcas:', error);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
};

exports.obtenerMarca = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM marcas WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    if (!rows.length) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error obteniendo marca:', error);
    res.status(500).json({ error: 'Error al obtener marca' });
  }
};

exports.crearMarca = async (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);
  const nombre = normalizarNombre(req.body?.nombre);
  const descripcion = normalizarNombre(req.body?.descripcion || '');

  if (!codigo) {
    return res.status(400).json({ error: 'El codigo es requerido' });
  }
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO marcas (codigo, nombre, descripcion) VALUES (?, ?, ?)',
      [codigo, nombre, descripcion || null]
    );
    await registrarHistorial(connection, {
      entidad: 'marcas',
      entidad_id: result.insertId,
      usuario_id: req.usuario?.id,
      accion: 'crear',
      descripcion: `Marca creada (${codigo})`,
      antes: null,
      despues: { id: result.insertId, codigo, nombre, descripcion: descripcion || null }
    });
    connection.release();
    res.status(201).json({ id: result.insertId, codigo, nombre, descripcion });
  } catch (error) {
    console.error('Error creando marca:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Codigo o nombre de marca ya existe' });
    }
    res.status(500).json({ error: 'Error al crear marca' });
  }
};

exports.actualizarMarca = async (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);
  const nombre = normalizarNombre(req.body?.nombre);
  const descripcion = normalizarNombre(req.body?.descripcion || '');

  if (!codigo) {
    return res.status(400).json({ error: 'El codigo es requerido' });
  }
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const connection = await pool.getConnection();
    const [prevRows] = await connection.execute('SELECT * FROM marcas WHERE id = ?', [
      req.params.id
    ]);
    if (!prevRows.length) {
      connection.release();
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    await connection.execute(
      'UPDATE marcas SET codigo = ?, nombre = ?, descripcion = ? WHERE id = ?',
      [codigo, nombre, descripcion || null, req.params.id]
    );
    await registrarHistorial(connection, {
      entidad: 'marcas',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Marca actualizada (${req.params.id})`,
      antes: prevRows[0],
      despues: { id: Number(req.params.id), codigo, nombre, descripcion: descripcion || null }
    });
    connection.release();
    res.json({ id: req.params.id, codigo, nombre, descripcion: descripcion || null });
  } catch (error) {
    console.error('Error actualizando marca:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Codigo o nombre de marca ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar marca' });
  }
};

exports.eliminarMarca = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [prevRows] = await connection.execute('SELECT * FROM marcas WHERE id = ?', [
      req.params.id
    ]);
    const [result] = await connection.execute('DELETE FROM marcas WHERE id = ?', [
      req.params.id
    ]);
    await registrarHistorial(connection, {
      entidad: 'marcas',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'eliminar',
      descripcion: `Marca eliminada (${req.params.id})`,
      antes: prevRows[0] || null,
      despues: null
    });
    connection.release();
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    res.json({ mensaje: 'Marca eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando marca:', error);
    res.status(500).json({ error: 'Error al eliminar marca' });
  }
};
