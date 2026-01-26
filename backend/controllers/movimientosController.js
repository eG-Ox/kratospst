const pool = require('../config/database');

// Registrar ingreso o salida
exports.registrarMovimiento = async (req, res) => {
  const { maquina_id, tipo, cantidad, motivo } = req.body;
  const usuario_id = req.usuario.id;

  if (!maquina_id || !tipo || !cantidad) {
    return res.status(400).json({ error: 'Campos requeridos: maquina_id, tipo, cantidad' });
  }

  if (!['ingreso', 'salida'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo debe ser ingreso o salida' });
  }

  try {
    const connection = await pool.getConnection();

    // Verificar que la máquina existe y obtener stock actual
    const [maquinas] = await connection.execute(
      'SELECT stock FROM maquinas WHERE id = ?',
      [maquina_id]
    );

    if (maquinas.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    const stockActual = maquinas[0].stock;

    // Validar que no haya salida sin stock
    if (tipo === 'salida' && stockActual < cantidad) {
      connection.release();
      return res.status(400).json({ error: 'Stock insuficiente para la salida' });
    }

    // Calcular nuevo stock
    const nuevoStock = tipo === 'ingreso' 
      ? stockActual + cantidad 
      : stockActual - cantidad;

    // Registrar movimiento
    const [result] = await connection.execute(
      `INSERT INTO ingresos_salidas (maquina_id, usuario_id, tipo, cantidad, motivo) 
       VALUES (?, ?, ?, ?, ?)`,
      [maquina_id, usuario_id, tipo, cantidad, motivo || null]
    );

    // Actualizar stock de la máquina
    await connection.execute(
      'UPDATE maquinas SET stock = ? WHERE id = ?',
      [nuevoStock, maquina_id]
    );

    connection.release();

    res.status(201).json({
      id: result.insertId,
      maquina_id,
      usuario_id,
      tipo,
      cantidad,
      motivo,
      nuevo_stock: nuevoStock
    });
  } catch (error) {
    console.error('Error registrando movimiento:', error);
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
};

// Obtener historial de movimientos
exports.obtenerMovimientos = async (req, res) => {
  const { maquina_id, tipo, fecha_inicio, fecha_fin, limite = 50, pagina = 1 } = req.query;

  try {
    let query = `
      SELECT 
        i.id, i.maquina_id, i.usuario_id, m.codigo as maquina_codigo, m.marca,
        u.nombre as usuario_nombre, i.tipo, i.cantidad, i.motivo, i.fecha
      FROM ingresos_salidas i
      JOIN maquinas m ON i.maquina_id = m.id
      JOIN usuarios u ON i.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (maquina_id) {
      query += ' AND i.maquina_id = ?';
      params.push(maquina_id);
    }

    if (tipo) {
      query += ' AND i.tipo = ?';
      params.push(tipo);
    }

    if (fecha_inicio) {
      query += ' AND i.fecha >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += ' AND i.fecha <= ?';
      params.push(fecha_fin);
    }

    query += ' ORDER BY i.fecha DESC LIMIT ? OFFSET ?';
    const offset = (pagina - 1) * parseInt(limite);
    params.push(parseInt(limite), offset);

    const connection = await pool.getConnection();
    const [movimientos] = await connection.execute(query, params);
    connection.release();

    res.json(movimientos);
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
};

// Obtener movimientos de una máquina específica
exports.obtenerMovimientosPorMaquina = async (req, res) => {
  const { maquina_id } = req.params;
  const { limite = 20, pagina = 1 } = req.query;

  try {
    const connection = await pool.getConnection();
    
    const offset = (pagina - 1) * parseInt(limite);
    const [movimientos] = await connection.execute(
      `SELECT 
        i.id, i.tipo, i.cantidad, i.motivo, i.fecha, u.nombre as usuario_nombre
      FROM ingresos_salidas i
      JOIN usuarios u ON i.usuario_id = u.id
      WHERE i.maquina_id = ?
      ORDER BY i.fecha DESC
      LIMIT ? OFFSET ?`,
      [maquina_id, parseInt(limite), offset]
    );
    connection.release();

    res.json(movimientos);
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
};

// Obtener estadísticas
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Total de máquinas
    const [totalMaquinas] = await connection.execute(
      'SELECT COUNT(*) as total FROM maquinas'
    );

    // Total de stock
    const [totalStock] = await connection.execute(
      'SELECT SUM(stock) as total FROM maquinas'
    );

    // Movimientos de hoy
    const [movimientosHoy] = await connection.execute(
      `SELECT COUNT(*) as total FROM ingresos_salidas 
       WHERE DATE(fecha) = CURDATE()`
    );

    // Ingresos de hoy
    const [ingresosHoy] = await connection.execute(
      `SELECT COUNT(*) as total, SUM(cantidad) as cantidad FROM ingresos_salidas 
       WHERE DATE(fecha) = CURDATE() AND tipo = 'ingreso'`
    );

    // Salidas de hoy
    const [salidAsHoy] = await connection.execute(
      `SELECT COUNT(*) as total, SUM(cantidad) as cantidad FROM ingresos_salidas 
       WHERE DATE(fecha) = CURDATE() AND tipo = 'salida'`
    );

    // Máquinas con stock bajo
    const [stockBajo] = await connection.execute(
      'SELECT COUNT(*) as total FROM maquinas WHERE stock < precio_minimo'
    );

    connection.release();

    res.json({
      total_maquinas: totalMaquinas[0].total,
      total_stock: totalStock[0].total || 0,
      movimientos_hoy: movimientosHoy[0].total,
      ingresos_hoy: {
        movimientos: ingresosHoy[0].total,
        cantidad: ingresosHoy[0].cantidad || 0
      },
      salidas_hoy: {
        movimientos: salidAsHoy[0].total,
        cantidad: salidAsHoy[0].cantidad || 0
      },
      stock_bajo: stockBajo[0].total
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};
