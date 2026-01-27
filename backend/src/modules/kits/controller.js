const pool = require('../../core/config/database');

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

exports.listarKitsActivos = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, nombre, descripcion, precio_total
       FROM kits
       WHERE usuario_id = ? AND activo = TRUE
       ORDER BY created_at DESC`,
      [req.usuario.id]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando kits:', error);
    res.status(500).json({ error: 'Error al listar kits' });
  }
};

exports.obtenerParaVenta = async (req, res) => {
  const { kit_id } = req.params;

  try {
    const connection = await pool.getConnection();
    const [kits] = await connection.execute(
      'SELECT id, nombre, descripcion, precio_total FROM kits WHERE id = ?',
      [kit_id]
    );

    if (!kits.length) {
      connection.release();
      return res.status(404).json({ error: 'Kit no encontrado' });
    }

    const [itemsProductos] = await connection.execute(
      `SELECT kp.*, m.codigo, m.descripcion, m.marca, m.stock
       FROM kit_productos kp
       JOIN maquinas m ON kp.producto_id = m.id
       WHERE kp.kit_id = ?`,
      [kit_id]
    );

    connection.release();

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
  }
};

exports.listarKits = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, nombre, descripcion, precio_total, activo, created_at
       FROM kits
       WHERE usuario_id = ?
       ORDER BY created_at DESC`,
      [req.usuario.id]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando kits:', error);
    res.status(500).json({ error: 'Error al listar kits' });
  }
};

exports.obtenerKit = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [kits] = await connection.execute(
      `SELECT id, nombre, descripcion, precio_total, activo, created_at
       FROM kits WHERE id = ?`,
      [id]
    );
    if (!kits.length) {
      connection.release();
      return res.status(404).json({ error: 'Kit no encontrado' });
    }
    const [items] = await connection.execute(
      `SELECT id, kit_id, producto_id, cantidad, precio_unitario, precio_final, subtotal, almacen_origen
       FROM kit_productos WHERE kit_id = ?`,
      [id]
    );
    connection.release();
    res.json({ ...kits[0], productos: items });
  } catch (error) {
    console.error('Error obteniendo kit:', error);
    res.status(500).json({ error: 'Error al obtener kit' });
  }
};

exports.crearKit = async (req, res) => {
  const { nombre, descripcion, activo = true, productos = [] } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es requerido' });
  }

  const items = normalizarItems(productos);
  const precio_total = calcularPrecioTotal(items);

  try {
    const connection = await pool.getConnection();
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
    connection.release();

    res.status(201).json({ id: kitId, nombre, descripcion, precio_total, activo: !!activo });
  } catch (error) {
    console.error('Error creando kit:', error);
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

  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id FROM kits WHERE id = ?', [id]);
    if (!existing.length) {
      connection.release();
      return res.status(404).json({ error: 'Kit no encontrado' });
    }

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
    connection.release();

    res.json({ id, nombre, descripcion, precio_total, activo: !!activo });
  } catch (error) {
    console.error('Error editando kit:', error);
    res.status(500).json({ error: 'Error al editar kit' });
  }
};

exports.eliminarKit = async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();
    await connection.execute('DELETE FROM kit_productos WHERE kit_id = ?', [id]);
    const [result] = await connection.execute('DELETE FROM kits WHERE id = ?', [id]);
    connection.release();

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Kit no encontrado' });
    }

    res.json({ mensaje: 'Kit eliminado' });
  } catch (error) {
    console.error('Error eliminando kit:', error);
    res.status(500).json({ error: 'Error al eliminar kit' });
  }
};

exports.toggleKit = async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT activo FROM kits WHERE id = ?', [id]);
    if (!rows.length) {
      connection.release();
      return res.status(404).json({ error: 'Kit no encontrado' });
    }

    const nuevoEstado = !rows[0].activo;
    await connection.execute('UPDATE kits SET activo = ? WHERE id = ?', [nuevoEstado, id]);
    connection.release();

    res.json({ id, activo: nuevoEstado });
  } catch (error) {
    console.error('Error cambiando estado de kit:', error);
    res.status(500).json({ error: 'Error al cambiar estado del kit' });
  }
};
