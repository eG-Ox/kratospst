const pool = require('../../core/config/database');

// Servicio para registrar movimientos
exports.registrarMovimientoService = async (maquina_id, usuario_id, tipo, cantidad, motivo) => {
  const connection = await pool.getConnection();
  try {
    const [maquinas] = await connection.execute(
      'SELECT stock FROM maquinas WHERE id = ? AND activo = TRUE',
      [maquina_id]
    );

    if (maquinas.length === 0) {
      throw new Error('Máquina no encontrada');
    }

    const stockActual = maquinas[0].stock;
    const nuevoStock = tipo === 'ingreso' 
      ? stockActual + cantidad 
      : stockActual - cantidad;

    const [result] = await connection.execute(
      `INSERT INTO ingresos_salidas (maquina_id, usuario_id, tipo, cantidad, motivo) 
       VALUES (?, ?, ?, ?, ?)`,
      [maquina_id, usuario_id, tipo, cantidad, motivo || null]
    );

    await connection.execute(
      'UPDATE maquinas SET stock = ? WHERE id = ?',
      [nuevoStock, maquina_id]
    );

    return { id: result.insertId, nuevoStock };
  } finally {
    connection.release();
  }
};

// Servicio para obtener movimientos
exports.obtenerMovimientosService = async (filtros) => {
  const { maquina_id, tipo, fecha_inicio, fecha_fin, limite = 50, pagina = 1 } = filtros;
  const connection = await pool.getConnection();
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

    const [movimientos] = await connection.execute(query, params);
    return movimientos;
  } finally {
    connection.release();
  }
};
