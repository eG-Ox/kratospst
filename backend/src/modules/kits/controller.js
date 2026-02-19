const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');

const calcularPrecioTotal = (items) =>
  items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

const normalizarItems = (items = []) =>
  items
    .map((item) => ({
      producto_id: Number(item.producto_id),
      cantidad: Number(item.cantidad || 0),
      precio_unitario: Number(item.precio_unitario || 0),
      precio_final: Number(item.precio_final || item.precio_unitario || 0),
      subtotal:
        Number(item.subtotal) ||
        Number(item.precio_final || item.precio_unitario || 0) * Number(item.cantidad || 0),
      almacen_origen: 'productos'
    }))
    .filter((item) => item.producto_id && item.cantidad > 0);

const releaseConnection = (connection) => {
  if (!connection) return;
  try {
    connection.release();
  } catch (_) {
    // no-op
  }
};

exports.listarKitsActivos = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, nombre, descripcion, precio_total
       FROM kits
       WHERE usuario_id = ? AND activo = TRUE
       ORDER BY created_at DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error listando kits:', error);
    res.status(500).json({ error: 'Error al listar kits' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerParaVenta = async (req, res) => {
  const { kit_id } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();
    const [kits] = await connection.execute(
      'SELECT id, nombre, descripcion, precio_total FROM kits WHERE id = ? AND usuario_id = ? AND activo = TRUE',
      [kit_id, req.usuario.id]
    );

    if (!kits.length) {
      return res.status(404).json({ error: 'Kit no encontrado' });
    }

    const [itemsProductos] = await connection.execute(
      `SELECT kp.*, m.codigo, m.descripcion, m.marca, m.stock
       FROM kit_productos kp
       JOIN maquinas m ON kp.producto_id = m.id
       WHERE kp.kit_id = ?`,
      [kit_id]
    );

    const todos = itemsProductos.map((item) => ({
      id: item.id,
      kit_id: item.kit_id,
      producto_id: item.producto_id,
      codigo: item.codigo,
      descripcion: item.descripcion,
      marca: item.marca,
      cantidad: item.cantidad,
      precio_unitario: Number(item.precio_unitario),
      precio_final: Number(item.precio_final),
      subtotal: Number(item.subtotal),
      almacen_origen: 'productos',
      stock: Number(item.stock || 0)
    }));

    const productos_con_stock = [];
    const productos_sin_stock = [];

    todos.forEach((item) => {
      if (!item.stock || item.stock < item.cantidad) {
        productos_sin_stock.push(item);
      } else {
        productos_con_stock.push(item);
      }
    });

    res.json({
      kit: kits[0],
      productos_con_stock,
      productos_sin_stock,
      total_productos: todos.length,
      productos_agregados: productos_con_stock.length,
      productos_excluidos: productos_sin_stock.length,
      tiene_productos_sin_stock: productos_sin_stock.length > 0
    });
  } catch (error) {
    console.error('Error obteniendo kit para venta:', error);
    res.status(500).json({ error: 'Error al obtener kit' });
  } finally {
    releaseConnection(connection);
  }
};

exports.listarKits = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, nombre, descripcion, precio_total, activo, created_at
       FROM kits
       WHERE usuario_id = ?
       ORDER BY created_at DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error listando kits:', error);
    res.status(500).json({ error: 'Error al listar kits' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerKit = async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    const [kits] = await connection.execute(
      `SELECT id, nombre, descripcion, precio_total, activo, created_at
       FROM kits WHERE id = ? AND usuario_id = ?`,
      [id, req.usuario.id]
    );
    if (!kits.length) {
      return res.status(404).json({ error: 'Kit no encontrado' });
    }
    const [items] = await connection.execute(
      `SELECT id, kit_id, producto_id, cantidad, precio_unitario, precio_final, subtotal, almacen_origen
       FROM kit_productos WHERE kit_id = ?`,
      [id]
    );
    res.json({ ...kits[0], productos: items });
  } catch (error) {
    console.error('Error obteniendo kit:', error);
    res.status(500).json({ error: 'Error al obtener kit' });
  } finally {
    releaseConnection(connection);
  }
};

exports.crearKit = async (req, res) => {
  const { nombre, descripcion, activo = true, productos = [] } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es requerido' });
  }

  const items = normalizarItems(productos);
  const precio_total = calcularPrecioTotal(items);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO kits (usuario_id, nombre, descripcion, precio_total, activo)
       VALUES (?, ?, ?, ?, ?)`,
      [req.usuario.id, nombre, descripcion || null, precio_total, !!activo]
    );

    const kitId = result.insertId;
    for (const item of items) {
      await connection.execute(
        `INSERT INTO kit_productos
         (kit_id, producto_id, cantidad, precio_unitario, precio_final, subtotal, almacen_origen)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          kitId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.precio_final,
          item.subtotal,
          'productos'
        ]
      );
    }
    await registrarHistorial(connection, {
      entidad: 'kits',
      entidad_id: kitId,
      usuario_id: req.usuario?.id,
      accion: 'crear',
      descripcion: `Kit creado (${nombre})`,
      antes: null,
      despues: { id: kitId, nombre, descripcion, precio_total, activo: !!activo, productos: items }
    });
    await connection.commit();
    connection.release();

    res.status(201).json({ id: kitId, nombre, descripcion, precio_total, activo: !!activo });
  } catch (error) {
    console.error('Error creando kit:', error);
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (_) {}
    }
    res.status(500).json({ error: 'Error al crear kit' });
  }
};

exports.editarKit = async (req, res) => {
  const { nombre, descripcion, activo = true, productos = [] } = req.body;
  const { id } = req.params;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es requerido' });
  }

  const items = normalizarItems(productos);
  const precio_total = calcularPrecioTotal(items);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      'SELECT * FROM kits WHERE id = ? AND usuario_id = ?',
      [id, req.usuario.id]
    );
    if (!existing.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Kit no encontrado' });
    }
    const [prevItems] = await connection.execute(
      `SELECT producto_id, cantidad, precio_unitario, precio_final, subtotal, almacen_origen
       FROM kit_productos WHERE kit_id = ?`,
      [id]
    );

    await connection.execute(
      `UPDATE kits SET nombre = ?, descripcion = ?, precio_total = ?, activo = ? WHERE id = ?`,
      [nombre, descripcion || null, precio_total, !!activo, id]
    );

    await connection.execute('DELETE FROM kit_productos WHERE kit_id = ?', [id]);
    for (const item of items) {
      await connection.execute(
        `INSERT INTO kit_productos
         (kit_id, producto_id, cantidad, precio_unitario, precio_final, subtotal, almacen_origen)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.precio_final,
          item.subtotal,
          'productos'
        ]
      );
    }
    await registrarHistorial(connection, {
      entidad: 'kits',
      entidad_id: id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Kit actualizado (${nombre})`,
      antes: { ...existing[0], productos: prevItems },
      despues: { id, nombre, descripcion, precio_total, activo: !!activo, productos: items }
    });
    await connection.commit();
    connection.release();

    res.json({ id, nombre, descripcion, precio_total, activo: !!activo });
  } catch (error) {
    console.error('Error editando kit:', error);
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (_) {}
    }
    res.status(500).json({ error: 'Error al editar kit' });
  }
};

exports.eliminarKit = async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [prevKit] = await connection.execute(
      'SELECT * FROM kits WHERE id = ? AND usuario_id = ?',
      [id, req.usuario.id]
    );
    if (!prevKit.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Kit no encontrado' });
    }
    const [prevItems] = await connection.execute(
      `SELECT producto_id, cantidad, precio_unitario, precio_final, subtotal, almacen_origen
       FROM kit_productos WHERE kit_id = ?`,
      [id]
    );
    await connection.execute('DELETE FROM kit_productos WHERE kit_id = ?', [id]);
    const [result] = await connection.execute(
      'DELETE FROM kits WHERE id = ? AND usuario_id = ?',
      [id, req.usuario.id]
    );
    await registrarHistorial(connection, {
      entidad: 'kits',
      entidad_id: id,
      usuario_id: req.usuario?.id,
      accion: 'eliminar',
      descripcion: `Kit eliminado (${id})`,
      antes: { ...(prevKit[0] || {}), productos: prevItems },
      despues: null
    });
    await connection.commit();
    connection.release();

    res.json({ mensaje: 'Kit eliminado' });
  } catch (error) {
    console.error('Error eliminando kit:', error);
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (_) {}
    }
    res.status(500).json({ error: 'Error al eliminar kit' });
  }
};

exports.toggleKit = async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT activo FROM kits WHERE id = ? AND usuario_id = ?',
      [id, req.usuario.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Kit no encontrado' });
    }

    const nuevoEstado = !rows[0].activo;
    await connection.execute('UPDATE kits SET activo = ? WHERE id = ? AND usuario_id = ?', [
      nuevoEstado,
      id,
      req.usuario.id
    ]);
    await registrarHistorial(connection, {
      entidad: 'kits',
      entidad_id: id,
      usuario_id: req.usuario?.id,
      accion: 'toggle',
      descripcion: `Kit ${nuevoEstado ? 'activado' : 'desactivado'} (${id})`,
      antes: { activo: rows[0].activo },
      despues: { activo: nuevoEstado }
    });

    res.json({ id, activo: nuevoEstado });
  } catch (error) {
    console.error('Error cambiando estado de kit:', error);
    res.status(500).json({ error: 'Error al cambiar estado del kit' });
  } finally {
    releaseConnection(connection);
  }
};
