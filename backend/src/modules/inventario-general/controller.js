const pool = require('../../core/config/database');
const XLSX = require('xlsx');
const { registrarHistorial } = require('../../shared/utils/historial');

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
  if (numero !== 1 && numero !== 2) {
    return { error: 'Subzona invalida. Solo se permite 1 o 2' };
  }
  return { letra: match[1], numero };
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

const obtenerInventario = async (connection, id) => {
  const [rows] = await connection.execute(
    'SELECT * FROM inventarios WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

exports.crearInventario = async (req, res) => {
  const { observaciones } = req.body;
  try {
    const connection = await pool.getConnection();
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
    connection.release();
    res.status(201).json({ id: result.insertId, estado: 'abierto' });
  } catch (error) {
    console.error('Error creando inventario:', error);
    res.status(500).json({ error: 'Error al crear inventario' });
  }
};

exports.listarInventarios = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  try {
    const connection = await pool.getConnection();
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
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando inventarios:', error);
    res.status(500).json({ error: 'Error al listar inventarios' });
  }
};

exports.obtenerInventario = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [inventarios] = await connection.execute(
      `SELECT i.*, u.nombre as usuario_nombre
       FROM inventarios i
       LEFT JOIN usuarios u ON i.usuario_id = u.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    const inventario = inventarios[0] || null;
    if (!inventario) {
      connection.release();
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
    connection.release();
    res.json({ inventario, detalles: detalles.map(mapDetalle) });
  } catch (error) {
    console.error('Error obteniendo inventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

exports.eliminarDetalle = async (req, res) => {
  const { producto_id } = req.body;
  if (!producto_id) {
    return res.status(400).json({ error: 'producto_id requerido' });
  }
  try {
    const connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      connection.release();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      connection.release();
      return res.status(400).json({ error: 'Inventario no esta abierto' });
    }
    await connection.execute(
      'DELETE FROM inventario_detalle WHERE inventario_id = ? AND producto_id = ?',
      [req.params.id, producto_id]
    );
    connection.release();
    res.json({ mensaje: 'Detalle eliminado' });
  } catch (error) {
    console.error('Error eliminando detalle:', error);
    res.status(500).json({ error: 'Error al eliminar detalle' });
  }
};

exports.agregarConteo = async (req, res) => {
  const { codigo, cantidad = 1, ubicacion } = req.body;
  if (!codigo) {
    return res.status(400).json({ error: 'Codigo requerido' });
  }

  try {
    const ubicacionParse = parseUbicacion(ubicacion);
    if (ubicacionParse.error) {
      return res.status(400).json({ error: ubicacionParse.error });
    }

    const connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      connection.release();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      connection.release();
      return res.status(400).json({ error: 'Inventario no esta abierto' });
    }

    const [productos] = await connection.execute(
      'SELECT id, codigo, descripcion, stock FROM maquinas WHERE codigo = ?',
      [codigo]
    );
    if (!productos.length) {
      connection.release();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productos[0];
    const [detalles] = await connection.execute(
      `SELECT * FROM inventario_detalle
       WHERE inventario_id = ? AND producto_id = ?`,
      [req.params.id, producto.id]
    );

    if (!detalles.length) {
      const conteoInicial = Number(cantidad || 0);
      const diferencia = conteoInicial - Number(producto.stock || 0);
      await connection.execute(
        `INSERT INTO inventario_detalle
         (inventario_id, producto_id, ubicacion_letra, ubicacion_numero, stock_actual, conteo, diferencia)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.params.id,
          producto.id,
          ubicacionParse.letra,
          ubicacionParse.numero,
          producto.stock,
          conteoInicial,
          diferencia
        ]
      );
    } else {
      const actual = detalles[0];
      const nuevoConteo = Number(actual.conteo || 0) + Number(cantidad || 0);
      const diferencia = nuevoConteo - Number(actual.stock_actual || 0);
      if (ubicacionParse.letra && ubicacionParse.numero) {
        await connection.execute(
          `UPDATE inventario_detalle
           SET conteo = ?, diferencia = ?, ubicacion_letra = ?, ubicacion_numero = ?
           WHERE id = ?`,
          [nuevoConteo, diferencia, ubicacionParse.letra, ubicacionParse.numero, actual.id]
        );
      } else {
        await connection.execute(
          `UPDATE inventario_detalle
           SET conteo = ?, diferencia = ?
           WHERE id = ?`,
          [nuevoConteo, diferencia, actual.id]
        );
      }
    }

    connection.release();
    res.json({ mensaje: 'Conteo actualizado' });
  } catch (error) {
    console.error('Error agregando conteo:', error);
    res.status(500).json({ error: 'Error al agregar conteo' });
  }
};

exports.ajustarConteo = async (req, res) => {
  const { producto_id, conteo } = req.body;
  if (!producto_id) {
    return res.status(400).json({ error: 'producto_id requerido' });
  }
  try {
    const connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      connection.release();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      connection.release();
      return res.status(400).json({ error: 'Inventario no esta abierto' });
    }

    const [detalles] = await connection.execute(
      `SELECT * FROM inventario_detalle
       WHERE inventario_id = ? AND producto_id = ?`,
      [req.params.id, producto_id]
    );
    if (!detalles.length) {
      connection.release();
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }
    const nuevoConteo = Number(conteo || 0);
    const diferencia = nuevoConteo - Number(detalles[0].stock_actual || 0);
    await connection.execute(
      `UPDATE inventario_detalle
       SET conteo = ?, diferencia = ?
       WHERE id = ?`,
      [nuevoConteo, diferencia, detalles[0].id]
    );
    connection.release();
    res.json({ mensaje: 'Conteo ajustado' });
  } catch (error) {
    console.error('Error ajustando conteo:', error);
    res.status(500).json({ error: 'Error al ajustar conteo' });
  }
};

exports.cerrarInventario = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      connection.release();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      connection.release();
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
    connection.release();
    res.json({ mensaje: 'Inventario cerrado' });
  } catch (error) {
    console.error('Error cerrando inventario:', error);
    res.status(500).json({ error: 'Error al cerrar inventario' });
  }
};

exports.eliminarInventario = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      connection.release();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    if (inventario.estado !== 'abierto') {
      connection.release();
      return res.status(400).json({ error: 'Solo se puede eliminar inventarios abiertos' });
    }

    await connection.beginTransaction();
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
    connection.release();
    res.json({ mensaje: 'Inventario eliminado' });
  } catch (error) {
    console.error('Error eliminando inventario:', error);
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (rollbackError) {
        console.error('Error en rollback inventario:', rollbackError);
      }
    }
    res.status(500).json({ error: 'Error al eliminar inventario' });
  }
};

exports.aplicarStock = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      connection.release();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    const [ultimoRows] = await connection.execute(
      'SELECT id FROM inventarios ORDER BY created_at DESC, id DESC LIMIT 1'
    );
    const ultimoId = ultimoRows[0]?.id;
    if (ultimoId && Number(ultimoId) !== Number(req.params.id)) {
      connection.release();
      return res.status(400).json({ error: 'Solo se puede aplicar el ultimo inventario' });
    }
    if (inventario.estado !== 'cerrado') {
      connection.release();
      return res.status(400).json({ error: 'Inventario debe estar cerrado' });
    }
    const hoy = new Date().toISOString().slice(0, 10);
    const fechaInventario = new Date(inventario.created_at).toISOString().slice(0, 10);
    if (hoy !== fechaInventario) {
      connection.release();
      return res.status(400).json({ error: 'Solo se puede aplicar stock el mismo dia' });
    }
    if (inventario.aplicado_at) {
      connection.release();
      return res.status(400).json({ error: 'Inventario ya aplicado' });
    }

    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion
       FROM inventario_detalle d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.inventario_id = ?`,
      [req.params.id]
    );

    for (const detalle of detalles) {
      if (detalle.ubicacion_letra && detalle.ubicacion_numero) {
        await connection.execute(
          'UPDATE maquinas SET stock = ?, ubicacion_letra = ?, ubicacion_numero = ? WHERE id = ?',
          [detalle.conteo, detalle.ubicacion_letra, detalle.ubicacion_numero, detalle.producto_id]
        );
      } else {
        await connection.execute(
          'UPDATE maquinas SET stock = ? WHERE id = ?',
          [detalle.conteo, detalle.producto_id]
        );
      }
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

    connection.release();
    res.json({ mensaje: 'Stock actualizado' });
  } catch (error) {
    console.error('Error aplicando stock:', error);
    res.status(500).json({ error: 'Error al aplicar stock' });
  }
};

exports.exportarInventario = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const inventario = await obtenerInventario(connection, req.params.id);
    if (!inventario) {
      connection.release();
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }

    const [detalles] = await connection.execute(
      `SELECT d.*, m.codigo, m.descripcion
       FROM inventario_detalle d
       JOIN maquinas m ON d.producto_id = m.id
       WHERE d.inventario_id = ?`,
      [req.params.id]
    );
    connection.release();

    const data = detalles.map((row) => ({
      codigo: row.codigo || '',
      descripcion: row.descripcion || '',
      ubicacion: row.ubicacion_letra ? `${row.ubicacion_letra}${row.ubicacion_numero || ''}` : '',
      stock_actual: Number(row.stock_actual || 0),
      conteo: Number(row.conteo || 0),
      diferencia: Number(row.diferencia || 0)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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
  }
};
