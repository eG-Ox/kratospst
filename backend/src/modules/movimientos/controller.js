const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');
const { isPositiveInt, isNonEmptyString } = require('../../shared/utils/validation');
const { syncUbicacionPrincipal } = require('../../shared/utils/ubicaciones');

const STOCK_ALERTA = Number(process.env.STOCK_ALERTA || 2);

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
  if (!isPositiveInt(cantidad)) {
    return res.status(400).json({ error: 'Cantidad invalida' });
  }
  if (tipo === 'salida' && !isNonEmptyString(motivo)) {
    return res.status(400).json({ error: 'Motivo requerido para salida' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar que la máquina existe y obtener stock actual
    const [maquinas] = await connection.execute(
      'SELECT stock, ubicacion_letra, ubicacion_numero FROM maquinas WHERE id = ? AND activo = TRUE FOR UPDATE',
      [maquina_id]
    );

    if (maquinas.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Maquina no encontrada o inactiva' });
    }

    const stockActual = maquinas[0].stock;

    // Validar que no haya salida sin stock
    if (tipo === 'salida' && stockActual < cantidad) {
      await connection.rollback();
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
    await syncUbicacionPrincipal(connection, {
      id: maquina_id,
      ubicacion_letra: maquinas[0].ubicacion_letra,
      ubicacion_numero: maquinas[0].ubicacion_numero,
      stock: nuevoStock
    });

    await registrarHistorial(connection, {
      entidad: 'movimientos',
      entidad_id: result.insertId,
      usuario_id,
      accion: tipo,
      descripcion: `Movimiento ${tipo} (${maquina_id})`,
      antes: { stock: stockActual },
      despues: { stock: nuevoStock, cantidad, motivo: motivo || null }
    });
    await connection.commit();
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
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (_) {}
    }
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
};

// Registrar movimientos en batch
exports.registrarMovimientosBatch = async (req, res) => {
  const { items } = req.body;
  const usuario_id = req.usuario.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items requeridos' });
  }

  const normalizados = [];
  for (const item of items) {
    const maquina_id = Number(item.maquina_id);
    const tipo = item.tipo;
    const cantidad = Number(item.cantidad);
    const motivo = item.motivo || null;
    if (!maquina_id || !tipo || !cantidad) {
      return res.status(400).json({ error: 'Campos requeridos: maquina_id, tipo, cantidad' });
    }
    if (!['ingreso', 'salida'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser ingreso o salida' });
    }
    if (!isPositiveInt(cantidad)) {
      return res.status(400).json({ error: 'Cantidad invalida' });
    }
    if (tipo === 'salida' && !isNonEmptyString(motivo)) {
      return res.status(400).json({ error: 'Motivo requerido para salida' });
    }
    normalizados.push({ maquina_id, tipo, cantidad, motivo });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const ids = Array.from(new Set(normalizados.map((item) => item.maquina_id)));
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT id, stock, ubicacion_letra, ubicacion_numero
       FROM maquinas
       WHERE id IN (${placeholders}) AND activo = TRUE
       FOR UPDATE`,
      ids
    );

    const stockMap = new Map(
      rows.map((row) => [
        Number(row.id),
        {
          stock: Number(row.stock || 0),
          ubicacion_letra: row.ubicacion_letra,
          ubicacion_numero: row.ubicacion_numero
        }
      ])
    );
    for (const id of ids) {
      if (!stockMap.has(id)) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: `Maquina no encontrada o inactiva: ${id}` });
      }
    }

    const deltaMap = new Map();
    for (const item of normalizados) {
      const current = deltaMap.get(item.maquina_id) || 0;
      const delta = item.tipo === 'ingreso' ? item.cantidad : -item.cantidad;
      deltaMap.set(item.maquina_id, current + delta);
    }

    for (const [maquinaId, delta] of deltaMap.entries()) {
      const stockInfo = stockMap.get(maquinaId);
      const stockActual = stockInfo ? stockInfo.stock : 0;
      if (stockActual + delta < 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `Stock insuficiente para la salida (${maquinaId})` });
      }
    }

    const chunkSize = 500;
    let insertResult = null;
    for (let i = 0; i < normalizados.length; i += chunkSize) {
      const chunk = normalizados.slice(i, i + chunkSize);
      const valuesSql = chunk.map(() => '(?, ?, ?, ?, ?)').join(',');
      const params = [];
      chunk.forEach((item) => {
        params.push(item.maquina_id, usuario_id, item.tipo, item.cantidad, item.motivo);
      });
      const [result] = await connection.execute(
        `INSERT INTO ingresos_salidas (maquina_id, usuario_id, tipo, cantidad, motivo)
         VALUES ${valuesSql}`,
        params
      );
      if (!insertResult) {
        insertResult = result;
      }
    }

    for (const [maquinaId, delta] of deltaMap.entries()) {
      const stockInfo = stockMap.get(maquinaId);
      const stockActual = stockInfo ? stockInfo.stock : 0;
      const nuevoStock = stockActual + delta;
      await connection.execute(
        'UPDATE maquinas SET stock = ? WHERE id = ?',
        [nuevoStock, maquinaId]
      );
      await syncUbicacionPrincipal(connection, {
        id: maquinaId,
        ubicacion_letra: stockInfo?.ubicacion_letra,
        ubicacion_numero: stockInfo?.ubicacion_numero,
        stock: nuevoStock
      });
    }

    // Mantener trazabilidad item por item respetando el orden del batch.
    const runningStockMap = new Map(
      Array.from(stockMap.entries()).map(([id, stockInfo]) => [id, Number(stockInfo?.stock || 0)])
    );
    for (const item of normalizados) {
      const stockAntes = Number(runningStockMap.get(item.maquina_id) || 0);
      const delta = item.tipo === 'ingreso' ? Number(item.cantidad || 0) : -Number(item.cantidad || 0);
      const stockDespues = stockAntes + delta;
      runningStockMap.set(item.maquina_id, stockDespues);
      await registrarHistorial(connection, {
        entidad: 'movimientos',
        entidad_id: null,
        usuario_id,
        accion: item.tipo,
        descripcion: `Movimiento ${item.tipo} (${item.maquina_id})`,
        antes: { stock: stockAntes },
        despues: { stock: stockDespues, cantidad: item.cantidad, motivo: item.motivo }
      });
    }

    await connection.commit();
    connection.release();
    res.status(201).json({ ok: true, total: normalizados.length });
  } catch (error) {
    console.error('Error registrando movimientos batch:', error);
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (_) {}
    }
    res.status(500).json({ error: 'Error al registrar movimientos' });
  }
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const MAX_MOVIMIENTOS_LIST_LIMIT = 500;

// Obtener historial de movimientos
exports.obtenerMovimientos = async (req, res) => {
  const { maquina_id, tipo, fecha_inicio, fecha_fin, limite = 50, pagina = 1 } = req.query;
  let connection;
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

    const limiteValue = parsePositiveInt(limite, 50);
    const paginaValue = parsePositiveInt(pagina, 1);
    const safeLimit = Math.min(limiteValue, MAX_MOVIMIENTOS_LIST_LIMIT);
    const offset = (paginaValue - 1) * safeLimit;

    query += ` ORDER BY i.fecha DESC LIMIT ${offset}, ${safeLimit}`;

    connection = await pool.getConnection();
    const [movimientos] = await connection.execute(query, params);

    res.json(movimientos);
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Obtener movimientos de una máquina específica
exports.obtenerMovimientosPorMaquina = async (req, res) => {
  const { maquina_id } = req.params;
  const { limite = 20, pagina = 1 } = req.query;

  let connection;
  try {
    connection = await pool.getConnection();

    const limiteValue = parsePositiveInt(limite, 20);
    const paginaValue = parsePositiveInt(pagina, 1);
    const safeLimit = Math.min(limiteValue, MAX_MOVIMIENTOS_LIST_LIMIT);
    const offset = (paginaValue - 1) * safeLimit;
    const [movimientos] = await connection.execute(
      `SELECT 
        i.id, i.tipo, i.cantidad, i.motivo, i.fecha, u.nombre as usuario_nombre
      FROM ingresos_salidas i
      JOIN usuarios u ON i.usuario_id = u.id
      WHERE i.maquina_id = ?
      ORDER BY i.fecha DESC
      LIMIT ${offset}, ${safeLimit}`,
      [maquina_id]
    );

    res.json(movimientos);
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Obtener estadisticas
exports.obtenerEstadisticas = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const stockAlerta = Number.isFinite(STOCK_ALERTA) ? STOCK_ALERTA : 2;

    const [resumenMaquinasRows] = await connection.execute(
      `SELECT
         COUNT(*) AS total_maquinas,
         COALESCE(SUM(stock), 0) AS total_stock,
         SUM(CASE WHEN stock <= ? THEN 1 ELSE 0 END) AS stock_bajo
       FROM maquinas
       WHERE activo = TRUE`,
      [stockAlerta]
    );

    const [resumenMovimientosRows] = await connection.execute(
      `SELECT
         COUNT(*) AS movimientos_hoy,
         SUM(CASE WHEN tipo = 'ingreso' THEN 1 ELSE 0 END) AS ingresos_movimientos,
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN cantidad ELSE 0 END), 0) AS ingresos_cantidad,
         SUM(CASE WHEN tipo = 'salida' THEN 1 ELSE 0 END) AS salidas_movimientos,
         COALESCE(SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END), 0) AS salidas_cantidad
       FROM ingresos_salidas
       WHERE fecha >= CURDATE() AND fecha < (CURDATE() + INTERVAL 1 DAY)`
    );

    const resumenMaquinas = resumenMaquinasRows?.[0] || {};
    const resumenMovimientos = resumenMovimientosRows?.[0] || {};

    res.json({
      total_maquinas: Number(resumenMaquinas.total_maquinas || 0),
      total_stock: Number(resumenMaquinas.total_stock || 0),
      movimientos_hoy: Number(resumenMovimientos.movimientos_hoy || 0),
      ingresos_hoy: {
        movimientos: Number(resumenMovimientos.ingresos_movimientos || 0),
        cantidad: Number(resumenMovimientos.ingresos_cantidad || 0)
      },
      salidas_hoy: {
        movimientos: Number(resumenMovimientos.salidas_movimientos || 0),
        cantidad: Number(resumenMovimientos.salidas_cantidad || 0)
      },
      stock_bajo: Number(resumenMaquinas.stock_bajo || 0)
    });
  } catch (error) {
    console.error('Error obteniendo estadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
