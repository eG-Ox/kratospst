const pool = require('../../core/config/database');
const { ExcelJS, addSheetFromObjects, workbookToBuffer } = require('../../shared/utils/excel');
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

const UBICACION_VALIDAS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

const parseUbicacion = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) {
    return { letra: null, numero: null };
  }
  const match = raw.match(/^([A-H])\s*(\d+)$/);
  if (!match) {
    return { error: 'Ubicacion invalida. Usa A1, A2, B1...' };
  }
  const numero = Number(match[2]);
  if (!Number.isInteger(numero) || numero <= 0) {
    return { error: 'Numero de ubicacion invalido' };
  }
  if (!UBICACION_VALIDAS.has(match[1])) {
    return { error: 'Ubicacion invalida. Letras permitidas: A-H' };
  }
  return { letra: match[1], numero };
};

const parseConteoIncremento = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseConteoAbsoluto = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const formatLocalDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const mapDetalle = (row) => ({
  id: row.id,
  inventario_id: row.inventario_id,
  producto_id: row.producto_id,
  codigo: row.codigo,
  descripcion: row.descripcion,
  ubicacion_letra: row.ubicacion_letra ?? null,
  ubicacion_numero: row.ubicacion_numero ?? null,
  stock_actual: Number(row.stock_actual || 0),
  conteo: Number(row.conteo || 0),
  diferencia: Number(row.diferencia || 0)
});

const obtenerInventario = async (connection, id, options = {}) => {
  const { forUpdate = false } = options;
  const query = forUpdate
    ? 'SELECT * FROM inventarios WHERE id = ? FOR UPDATE'
    : 'SELECT * FROM inventarios WHERE id = ?';
  const [rows] = await connection.execute(query, [id]);
  return rows[0] || null;
};

exports.crearInventario = async (req, res) => {
  const { observaciones } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO inventarios (usuario_id, estado, observaciones)
       VALUES (?, 'abierto', ?)`,
      [req.usuario.id, observaciones || null]
    );
    await registrarHistorial(connection, {
      entidad: 'inventario_general',
      entidad_id: result.insertId,
      usuario_id: req.usuario.id,
      accion: 'crear',
      descripcion: 'Inventario general iniciado',
      antes: null,
      despues: { id: result.insertId, estado: 'abierto' }
    });
    await connection.commit();
    res.status(201).json({ id: result.insertId, estado: 'abierto' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error creando inventario:', error);
    res.status(500).json({ error: 'Error al crear inventario' });
  } finally {
    releaseConnection(connection);
  }
};

exports.listarInventarios = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  let connection;
  try {
    connection = await pool.getConnection();
    let query = `
      SELECT i.*, u.nombre as usuario_nombre,
        (SELECT COUNT(*) FROM inventario_detalle d WHERE d.inventario_id = i.id) as total_items
      FROM inventarios i
      LEFT JOIN usuarios u ON i.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha_inicio) {
      query += ' AND DATE(i.created_at) >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND DATE(i.created_at) <= ?';
      params.push(fecha_fin);
    }
    query += ' ORDER BY i.created_at DESC';
    const [rows] = await connection.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error listando inventarios:', error);
    res.status(500).json({ error: 'Error al listar inventarios' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerInventario = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [inventarios] = await connection.execute(
      `SELECT i.*, u.nombre as usuario_nombre
       FROM inventarios i
       LEFT JOIN usuarios u ON i.usuario_id = u.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    const inventario = inventarios[0] || null;
    if (!inventario) {
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion,
        COALESCE(d.ubicacion_letra, m.ubicacion_letra) as ubicacion_letra,
        COALESCE(d.ubicacion_numero, m.ubicacion_numero) as ubicacion_numero
       FROM inventario_detalle d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.inventario_id = ?`,
      [req.params.id]
    );
    res.json({ inventario, detalles: detalles.map(mapDetalle) });
  } catch (error) {
    console.error('Error obteniendo inventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  } finally {
    releaseConnection(connection);
  }
};

exports.eliminarDetalle = async (req, res) => {
  const { producto_id, detalle_id } = req.body;
  if (!producto_id && !detalle_id) {
    return res.status(400).json({ error: 'producto_id o detalle_id requerido' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const inventario = await obtenerInventario(connection, req.params.id, { forUpdate: true });
    if (!inventario) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Inventario no esta abierto' });
    }
    if (detalle_id) {
      await connection.execute(
        'DELETE FROM inventario_detalle WHERE inventario_id = ? AND id = ?',
        [req.params.id, detalle_id]
      );
    } else {
      await connection.execute(
        'DELETE FROM inventario_detalle WHERE inventario_id = ? AND producto_id = ?',
        [req.params.id, producto_id]
      );
    }
    await connection.commit();
    res.json({ mensaje: 'Detalle eliminado' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error eliminando detalle:', error);
    res.status(500).json({ error: 'Error al eliminar detalle' });
  } finally {
    releaseConnection(connection);
  }
};

exports.agregarConteo = async (req, res) => {
  const { codigo, cantidad = 1, ubicacion } = req.body;
  if (!codigo) {
    return res.status(400).json({ error: 'Codigo requerido' });
  }

  let connection;
  try {
    const rawCodigo = String(codigo || '').trim();
    const tokenCodigo = rawCodigo
      .replace(/\r/g, '')
      .split(/[\n,;]+/g)
      .map((item) => item.trim())
      .filter(Boolean)[0];
    const codigoFinal = tokenCodigo || rawCodigo;

    const ubicacionFinal = ubicacion && String(ubicacion).trim() ? ubicacion : 'H1';
    const ubicacionParse = parseUbicacion(ubicacionFinal);
    if (ubicacionParse.error) {
      return res.status(400).json({ error: ubicacionParse.error });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const inventario = await obtenerInventario(connection, req.params.id, { forUpdate: true });
    if (!inventario) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Inventario no esta abierto' });
    }

    const [productos] = await connection.execute(
      'SELECT id, codigo, descripcion, stock FROM maquinas WHERE codigo = ? AND activo = TRUE',
      [codigoFinal]
    );
    if (!productos.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productos[0];
    const conteoIncremento = parseConteoIncremento(cantidad);
    if (conteoIncremento === null) {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Cantidad invalida. Debe ser entero mayor a 0.' });
    }
    const diferenciaInicial = conteoIncremento - Number(producto.stock || 0);
    await connection.execute(
      `INSERT INTO inventario_detalle
       (inventario_id, producto_id, ubicacion_letra, ubicacion_numero, stock_actual, conteo, diferencia)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         conteo = conteo + VALUES(conteo),
         diferencia = (conteo + VALUES(conteo)) - stock_actual`,
      [
        req.params.id,
        producto.id,
        ubicacionParse.letra,
        ubicacionParse.numero,
        producto.stock,
        conteoIncremento,
        diferenciaInicial
      ]
    );

    await connection.commit();
    res.json({ mensaje: 'Conteo actualizado' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error agregando conteo:', error);
    res.status(500).json({ error: 'Error al agregar conteo' });
  } finally {
    releaseConnection(connection);
  }
};

exports.ajustarConteo = async (req, res) => {
  const { producto_id, detalle_id, conteo } = req.body;
  if (!producto_id && !detalle_id) {
    return res.status(400).json({ error: 'producto_id o detalle_id requerido' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const inventario = await obtenerInventario(connection, req.params.id, { forUpdate: true });
    if (!inventario) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Inventario no esta abierto' });
    }

    const [detalles] = await connection.execute(
      `SELECT * FROM inventario_detalle
       WHERE inventario_id = ? AND ${detalle_id ? 'id = ?' : 'producto_id = ?'}
       ORDER BY id ASC LIMIT 1`,
      [req.params.id, detalle_id || producto_id]
    );
    if (!detalles.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }
    const nuevoConteo = parseConteoAbsoluto(conteo);
    if (nuevoConteo === null) {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Conteo invalido. Debe ser entero mayor o igual a 0.' });
    }
    const diferencia = nuevoConteo - Number(detalles[0].stock_actual || 0);
    await connection.execute(
      `UPDATE inventario_detalle
       SET conteo = ?, diferencia = ?
       WHERE id = ?`,
      [nuevoConteo, diferencia, detalles[0].id]
    );
    await connection.commit();
    res.json({ mensaje: 'Conteo ajustado' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error ajustando conteo:', error);
    res.status(500).json({ error: 'Error al ajustar conteo' });
  } finally {
    releaseConnection(connection);
  }
};

exports.cerrarInventario = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const inventario = await obtenerInventario(connection, req.params.id, { forUpdate: true });
    if (!inventario) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Inventario ya esta cerrado' });
    }
    await connection.execute(
      'UPDATE inventarios SET estado = ? WHERE id = ?',
      ['cerrado', req.params.id]
    );
    await registrarHistorial(connection, {
      entidad: 'inventario_general',
      entidad_id: req.params.id,
      usuario_id: req.usuario.id,
      accion: 'cerrar',
      descripcion: 'Inventario general cerrado',
      antes: { estado: inventario.estado },
      despues: { estado: 'cerrado' }
    });
    await connection.commit();
    res.json({ mensaje: 'Inventario cerrado' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error cerrando inventario:', error);
    res.status(500).json({ error: 'Error al cerrar inventario' });
  } finally {
    releaseConnection(connection);
  }
};

exports.eliminarInventario = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const inventario = await obtenerInventario(connection, req.params.id, { forUpdate: true });
    if (!inventario) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      await rollbackSilently(connection);
      return res.status(400).json({ error: 'Solo se puede eliminar inventarios abiertos' });
    }
    await connection.execute(
      'DELETE FROM inventario_detalle WHERE inventario_id = ?',
      [req.params.id]
    );
    await connection.execute('DELETE FROM inventarios WHERE id = ?', [req.params.id]);

    await registrarHistorial(connection, {
      entidad: 'inventario_general',
      entidad_id: req.params.id,
      usuario_id: req.usuario.id,
      accion: 'eliminar',
      descripcion: 'Inventario general eliminado',
      antes: { estado: inventario.estado },
      despues: null
    });

    await connection.commit();
    res.json({ mensaje: 'Inventario eliminado' });
  } catch (error) {
    console.error('Error eliminando inventario:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error en rollback inventario:', rollbackError);
      }
    }
    res.status(500).json({ error: 'Error al eliminar inventario' });
  } finally {
    releaseConnection(connection);
  }
};

exports.aplicarStock = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const inventario = await obtenerInventario(connection, req.params.id, { forUpdate: true });
    if (!inventario) {
      await connection.rollback();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    const [ultimoRows] = await connection.execute(
      'SELECT id FROM inventarios ORDER BY created_at DESC, id DESC LIMIT 1'
    );
    const ultimoId = ultimoRows[0]?.id;
    if (ultimoId && Number(ultimoId) !== Number(req.params.id)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Solo se puede aplicar el ultimo inventario' });
    }
    if (inventario.estado !== 'cerrado') {
      await connection.rollback();
      return res.status(400).json({ error: 'Inventario debe estar cerrado' });
    }
    const hoy = formatLocalDate(new Date());
    const fechaInventario = formatLocalDate(inventario.created_at);
    if (hoy !== fechaInventario) {
      await connection.rollback();
      return res.status(400).json({ error: 'Solo se puede aplicar stock el mismo dia' });
    }
    if (inventario.aplicado_at) {
      await connection.rollback();
      return res.status(400).json({ error: 'Inventario ya aplicado' });
    }

    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion
       FROM inventario_detalle d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.inventario_id = ?`,
      [req.params.id]
    );
    if (!detalles.length) {
      await connection.rollback();
      return res.status(400).json({
        error: 'No se puede aplicar un inventario sin detalles'
      });
    }

    // Detectar productos no escaneados en este inventario
    const [noEscaneados] = await connection.execute(
      `SELECT m.id, m.codigo
       FROM maquinas m
       WHERE m.activo = TRUE
         AND NOT EXISTS (
          SELECT 1 FROM inventario_detalle d
          WHERE d.inventario_id = ? AND d.producto_id = m.id
        )`,
      [req.params.id]
    );

    const stockPorProducto = new Map();
    const productoIds = new Set();
    detalles.forEach((detalle) => {
      const id = Number(detalle.producto_id);
      productoIds.add(id);
      const actual = stockPorProducto.get(id) || 0;
      stockPorProducto.set(id, actual + Number(detalle.conteo || 0));
    });

    const productoIdList = Array.from(productoIds.values());
    const chunkIds = async (ids, handler) => {
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        await handler(ids.slice(i, i + chunkSize));
      }
    };

    if (productoIdList.length) {
      await chunkIds(productoIdList, async (chunk) => {
        const caseParts = [];
        const params = [];
        chunk.forEach((id) => {
          caseParts.push('WHEN ? THEN ?');
          params.push(id, stockPorProducto.get(id) || 0);
        });
        const placeholders = chunk.map(() => '?').join(',');
        params.push(...chunk);
        await connection.execute(
          `UPDATE maquinas SET stock = CASE id ${caseParts.join(' ')} ELSE stock END
           WHERE id IN (${placeholders})`,
          params
        );
      });

      await chunkIds(productoIdList, async (chunk) => {
        const deletePlaceholders = chunk.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM maquinas_ubicaciones WHERE producto_id IN (${deletePlaceholders})`,
          chunk
        );
      });
    }

    const ubicacionesRows = detalles
      .filter((detalle) => detalle.conteo > 0 && detalle.ubicacion_letra && detalle.ubicacion_numero)
      .map((detalle) => [
        detalle.producto_id,
        detalle.ubicacion_letra,
        detalle.ubicacion_numero,
        Number(detalle.conteo || 0)
      ]);

    const insertarUbicaciones = async (rows) => {
      const valuesSql = rows.map(() => '(?, ?, ?, ?)').join(',');
      const params = [];
      rows.forEach((row) => params.push(...row));
      await connection.execute(
        `INSERT INTO maquinas_ubicaciones
         (producto_id, ubicacion_letra, ubicacion_numero, stock)
         VALUES ${valuesSql}`,
        params
      );
    };

    const chunkSize = 500;
    for (let i = 0; i < ubicacionesRows.length; i += chunkSize) {
      await insertarUbicaciones(ubicacionesRows.slice(i, i + chunkSize));
    }

    const noEscaneadosIds = noEscaneados.map((item) => item.id);
    if (noEscaneadosIds.length) {
      await chunkIds(noEscaneadosIds, async (chunk) => {
        const placeholders = chunk.map(() => '?').join(',');
        await connection.execute(
          `UPDATE maquinas SET stock = 0 WHERE id IN (${placeholders})`,
          chunk
        );
      });
      await chunkIds(noEscaneadosIds, async (chunk) => {
        const placeholders = chunk.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM maquinas_ubicaciones WHERE producto_id IN (${placeholders})`,
          chunk
        );
      });
    }

    await connection.execute(
      `UPDATE inventarios
       SET estado = 'aplicado', aplicado_at = NOW()
       WHERE id = ?`,
      [req.params.id]
    );

    await registrarHistorial(connection, {
      entidad: 'inventario_general',
      entidad_id: req.params.id,
      usuario_id: req.usuario.id,
      accion: 'aplicar',
      descripcion: 'Stock actualizado desde inventario general',
      antes: { estado: inventario.estado },
      despues: { estado: 'aplicado' }
    });

    await connection.commit();
    res.json({ mensaje: 'Stock actualizado' });
  } catch (error) {
    console.error('Error aplicando stock:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }
    res.status(500).json({ error: 'Error al aplicar stock' });
  } finally {
    releaseConnection(connection);
  }
};

exports.exportarInventario = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }

    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion
       FROM inventario_detalle d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.inventario_id = ?`,
      [req.params.id]
    );

    const data = detalles.map((row) => ({
      codigo: row.codigo || '',
      descripcion: row.descripcion || '',
      ubicacion: row.ubicacion_letra ? `${row.ubicacion_letra}${row.ubicacion_numero || ''}` : '',
      stock_actual: Number(row.stock_actual || 0),
      conteo: Number(row.conteo || 0),
      diferencia: Number(row.diferencia || 0)
    }));

    const workbook = new ExcelJS.Workbook();
    addSheetFromObjects(workbook, 'Inventario', data);
    const buffer = await workbookToBuffer(workbook);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventario_${req.params.id}.xlsx"`
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando inventario:', error);
    res.status(500).json({ error: 'Error al exportar inventario' });
  } finally {
    releaseConnection(connection);
  }
};
