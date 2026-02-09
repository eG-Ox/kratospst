const pool = require('../../core/config/database');
const { ExcelJS, addSheetFromObjects, workbookToBuffer } = require('../../shared/utils/excel');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const flattenObject = (obj, prefix = '', output = {}) => {
  if (!obj || typeof obj !== 'object') return output;
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, path, output);
    } else if (Array.isArray(value)) {
      output[path] = JSON.stringify(value);
    } else {
      output[path] = value;
    }
  });
  return output;
};

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
      SELECT h.created_at, h.entidad, h.entidad_id, h.accion, u.nombre as usuario_nombre, h.descripcion,
        h.antes_json, h.despues_json
      FROM historial_acciones h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
    `;
      const { where, params } = buildFilters(req.query);
      const limiteValue = parsePositiveInt(req.query.limite, 5000);
      const safeLimit = Math.min(limiteValue, 20000);
      query += ` ${where} ORDER BY h.created_at DESC LIMIT ${safeLimit}`;
      const [rows] = await connection.execute(query, params);
    connection.release();

    const beforeKeys = new Set();
    const afterKeys = new Set();

    const mapped = rows.map((row) => {
      const antesObj = safeParseJson(row.antes_json);
      const despuesObj = safeParseJson(row.despues_json);
      const antesFlat = flattenObject(antesObj || {});
      const despuesFlat = flattenObject(despuesObj || {});

      Object.keys(antesFlat).forEach((key) => beforeKeys.add(key));
      Object.keys(despuesFlat).forEach((key) => afterKeys.add(key));

      return {
        base: {
          fecha: row.created_at ? new Date(row.created_at).toLocaleString() : '',
          entidad: row.entidad,
          entidad_id: row.entidad_id || '',
          accion: row.accion,
          usuario: row.usuario_nombre || '',
          descripcion: row.descripcion || ''
        },
        antesFlat,
        despuesFlat
      };
    });

    const orderedBeforeKeys = Array.from(beforeKeys).sort();
    const orderedAfterKeys = Array.from(afterKeys).sort();

    const data = mapped.map(({ base, antesFlat, despuesFlat }) => {
      const row = { ...base };
      orderedBeforeKeys.forEach((key) => {
        row[`antes_${key}`] = antesFlat[key] ?? '';
      });
      orderedAfterKeys.forEach((key) => {
        row[`despues_${key}`] = despuesFlat[key] ?? '';
      });
      return row;
    });

    const cambios = [];
    mapped.forEach(({ base, antesFlat, despuesFlat }) => {
      const keys = new Set([...Object.keys(antesFlat), ...Object.keys(despuesFlat)]);
      keys.forEach((key) => {
        const antes = antesFlat[key];
        const despues = despuesFlat[key];
        const antesVal = antes === undefined ? '' : antes;
        const despuesVal = despues === undefined ? '' : despues;
        if (antesVal === despuesVal) return;
        cambios.push({
          ...base,
          campo: key,
          antes: antesVal,
          despues: despuesVal
        });
      });
    });

    const workbook = new ExcelJS.Workbook();
    addSheetFromObjects(workbook, 'Historial', data);
    addSheetFromObjects(workbook, 'Cambios', cambios);
    const buffer = await workbookToBuffer(workbook);

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
