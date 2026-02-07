const pool = require('../../core/config/database');
const XLSX = require('xlsx');

const buildFilters = (query) => {
  const { entidad, usuario_id, accion, fecha_inicio, fecha_fin } = query;
  let where = 'WHERE 1=1';
  const params = [];
  if (entidad) {
    where += ' AND h.entidad = ?';
    params.push(entidad);
  }
  if (usuario_id) {
    where += ' AND h.usuario_id = ?';
    params.push(usuario_id);
  }
  if (accion) {
    where += ' AND h.accion = ?';
    params.push(accion);
  }
  if (fecha_inicio) {
    where += ' AND h.created_at >= ?';
    params.push(fecha_inicio);
  }
  if (fecha_fin) {
    where += ' AND h.created_at <= ?';
    params.push(fecha_fin);
  }
  return { where, params };
};

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
    `;
    const { where, params } = buildFilters(req.query);

    query += ` ${where} ORDER BY h.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    const [rows] = await connection.execute(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

exports.exportarHistorial = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT h.created_at, h.entidad, h.accion, u.nombre as usuario_nombre, h.descripcion,
        h.antes_json, h.despues_json
      FROM historial_acciones h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
    `;
    const { where, params } = buildFilters(req.query);
    query += ` ${where} ORDER BY h.created_at DESC`;
    const [rows] = await connection.execute(query, params);
    connection.release();

    const data = rows.map((row) => ({
      fecha: row.created_at ? new Date(row.created_at).toLocaleString() : '',
      entidad: row.entidad,
      accion: row.accion,
      usuario: row.usuario_nombre || '',
      descripcion: row.descripcion || '',
      antes: row.antes_json || '',
      despues: row.despues_json || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=\"historial.xlsx\"'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando historial:', error);
    res.status(500).json({ error: 'Error al exportar historial' });
  }
};
