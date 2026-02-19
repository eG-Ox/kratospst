const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');

const normalizarCodigo = (value) => String(value || '').trim().toUpperCase();
const normalizarNombre = (value) => String(value || '').trim();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const MAX_MARCAS_LIST_LIMIT = 200;

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

const generarCodigoMarca = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT MAX(CAST(SUBSTRING(codigo, 2) AS UNSIGNED)) AS max_codigo FROM marcas WHERE codigo REGEXP '^M[0-9]+'"
  );
  const next = (rows?.[0]?.max_codigo || 0) + 1;
  return `M${String(next).padStart(4, '0')}`;
};

const sincronizarMarcaEnMaquinas = async (connection, nombreDestino, candidatos = []) => {
  const filtros = [...new Set(
    (candidatos || [])
      .map((item) => String(item || '').trim().toUpperCase())
      .filter(Boolean)
  )];
  if (!filtros.length) {
    return;
  }
  const where = filtros.map(() => 'UPPER(TRIM(marca)) = ?').join(' OR ');
  await connection.execute(
    `UPDATE maquinas SET marca = ? WHERE ${where}`,
    [nombreDestino, ...filtros]
  );
};

exports.listarMarcas = async (req, res) => {
  let connection;
  try {
    const { page, limit } = req.query;
    const hasPagination = page !== undefined || limit !== undefined;
    const orderBy = `ORDER BY CAST(SUBSTRING(codigo, 2) AS UNSIGNED) DESC, codigo DESC`;

    connection = await pool.getConnection();
    if (hasPagination) {
      const limitValue = parsePositiveInt(limit, 50);
      const pageValue = parsePositiveInt(page, 1);
      const safeLimit = Math.min(limitValue, MAX_MARCAS_LIST_LIMIT);
      const offset = (pageValue - 1) * safeLimit;
      const [rows] = await connection.execute(
        `SELECT * FROM marcas ${orderBy} LIMIT ${offset}, ${safeLimit}`
      );
      const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM marcas');
      const total = totalRows?.[0]?.total || 0;
      return res.json({ items: rows, total, page: pageValue, limit: safeLimit });
    }
    const [rows] = await connection.execute(
      `SELECT * FROM marcas ${orderBy}`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error listando marcas:', error);
    res.status(500).json({ error: 'Error al obtener marcas' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerMarca = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM marcas WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error obteniendo marca:', error);
    res.status(500).json({ error: 'Error al obtener marca' });
  } finally {
    releaseConnection(connection);
  }
};

exports.crearMarca = async (req, res) => {
  let codigo = normalizarCodigo(req.body?.codigo);
  const nombre = normalizarNombre(req.body?.nombre);
  const descripcion = normalizarNombre(req.body?.descripcion || '');

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const codigoFijo = !!codigo;
    let result;
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!codigoFijo) {
        codigo = await generarCodigoMarca(connection);
      }
      try {
        [result] = await connection.execute(
          'INSERT INTO marcas (codigo, nombre, descripcion) VALUES (?, ?, ?)',
          [codigo, nombre, descripcion || null]
        );
        break;
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
        if (codigoFijo || attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }
    await sincronizarMarcaEnMaquinas(connection, nombre, [codigo, nombre]);
    await registrarHistorial(connection, {
      entidad: 'marcas',
      entidad_id: result.insertId,
      usuario_id: req.usuario?.id,
      accion: 'crear',
      descripcion: `Marca creada (${codigo})`,
      antes: null,
      despues: { id: result.insertId, codigo, nombre, descripcion: descripcion || null }
    });
    await connection.commit();
    return res.status(201).json({ id: result.insertId, codigo, nombre, descripcion });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error creando marca:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Codigo o nombre de marca ya existe' });
    }
    return res.status(500).json({ error: 'Error al crear marca' });
  } finally {
    releaseConnection(connection);
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

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [prevRows] = await connection.execute('SELECT * FROM marcas WHERE id = ?', [
      req.params.id
    ]);
    if (!prevRows.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    const anterior = prevRows[0];
    await connection.execute(
      'UPDATE marcas SET codigo = ?, nombre = ?, descripcion = ? WHERE id = ?',
      [codigo, nombre, descripcion || null, req.params.id]
    );
    await sincronizarMarcaEnMaquinas(connection, nombre, [anterior.codigo, anterior.nombre, codigo]);
    await registrarHistorial(connection, {
      entidad: 'marcas',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Marca actualizada (${req.params.id})`,
      antes: prevRows[0],
      despues: { id: Number(req.params.id), codigo, nombre, descripcion: descripcion || null }
    });
    await connection.commit();
    return res.json({ id: req.params.id, codigo, nombre, descripcion: descripcion || null });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error actualizando marca:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Codigo o nombre de marca ya existe' });
    }
    return res.status(500).json({ error: 'Error al actualizar marca' });
  } finally {
    releaseConnection(connection);
  }
};

exports.eliminarMarca = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [prevRows] = await connection.execute('SELECT * FROM marcas WHERE id = ?', [
      req.params.id
    ]);
    if (!prevRows.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
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
    if (result.affectedRows === 0) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    await connection.commit();
    return res.json({ mensaje: 'Marca eliminada correctamente' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error eliminando marca:', error);
    return res.status(500).json({ error: 'Error al eliminar marca' });
  } finally {
    releaseConnection(connection);
  }
};
