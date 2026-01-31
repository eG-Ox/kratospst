const pool = require('../../core/config/database');

exports.listarHistorial = async (req, res) => {
  const { entidad, usuario_id, accion, fecha_inicio, fecha_fin, limite = 50, pagina = 1 } = req.query;
  const limitValue = Number.parseInt(limite, 10);
  const pageValue = Number.parseInt(pagina, 10);
  const safeLimit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 50;
  const safePage = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const offset = (safePage - 1) * safeLimit;

  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT h.*, u.nombre as usuario_nombre
      FROM historial_acciones h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (entidad) {
      query += ' AND h.entidad = ?';
      params.push(entidad);
    }
    if (usuario_id) {
      query += ' AND h.usuario_id = ?';
      params.push(usuario_id);
    }
    if (accion) {
      query += ' AND h.accion = ?';
      params.push(accion);
    }
    if (fecha_inicio) {
      query += ' AND h.created_at >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND h.created_at <= ?';
      params.push(fecha_fin);
    }

    query += ` ORDER BY h.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    const [rows] = await connection.execute(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};
