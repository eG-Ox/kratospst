const { normalizeHeaderKey, normalizeTrimmedText } = require('./text');

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'contrasena',
  'contraseña',
  'contraseÃ±a',
  'password',
  'pass',
  'token',
  'secret',
  'jwt',
  'cookie',
  'authorization'
]);

let historialMovimientosTableAvailable = null;
let historialAccionesSupportsOperationIds = null;

const normalizeKey = (key) => normalizeHeaderKey(key);

const sanitizeForHistory = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForHistory(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const output = {};
  for (const [key, innerValue] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(normalizeKey(key))) {
      output[key] = REDACTED_VALUE;
      continue;
    }
    output[key] = sanitizeForHistory(innerValue);
  }
  return output;
};

const asCleanString = (value) => {
  if (value === null || value === undefined) return null;
  const text = normalizeTrimmedText(value);
  return text || null;
};

const trimToLength = (value, maxLength) => {
  const text = asCleanString(value);
  if (!text) return null;
  if (!Number.isFinite(maxLength) || maxLength <= 0) return text;
  return text.slice(0, maxLength);
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const firstNonEmptyValue = (...values) => {
  for (const value of values) {
    const clean = asCleanString(value);
    if (clean !== null) return clean;
  }
  return null;
};

const normalizeAction = (value) => {
  const text = asCleanString(value);
  return text ? text.toLowerCase() : null;
};

const resolveVariacionStock = (accion, beforeObj, afterObj) => {
  const variacionDirecta = toNumberOrNull(afterObj.variacion_stock);
  if (variacionDirecta !== null) return variacionDirecta;

  const stockAntes = toNumberOrNull(beforeObj.stock);
  const stockDespues = toNumberOrNull(afterObj.stock);
  if (stockAntes !== null && stockDespues !== null) {
    return stockDespues - stockAntes;
  }

  const cantidad = toNumberOrNull(afterObj.cantidad);
  if (cantidad !== null) {
    const tipoMovimiento = normalizeAction(afterObj.tipo_movimiento || accion);
    if (tipoMovimiento === 'ingreso') return Math.abs(cantidad);
    if (tipoMovimiento === 'salida') return -Math.abs(cantidad);
  }
  return null;
};

const resolveCantidad = (afterObj, variacionStock) => {
  const cantidadDirecta = toNumberOrNull(afterObj.cantidad);
  if (cantidadDirecta !== null) return Math.abs(cantidadDirecta);
  if (variacionStock === null) return null;
  return Math.abs(variacionStock);
};

const hasHistorialMovimientosTable = async (connection) => {
  if (historialMovimientosTableAvailable !== null) {
    return historialMovimientosTableAvailable;
  }
  try {
    const [rows] = await connection.execute("SHOW TABLES LIKE 'historial_movimientos'");
    historialMovimientosTableAvailable = Array.isArray(rows) && rows.length > 0;
  } catch (_) {
    historialMovimientosTableAvailable = false;
  }
  return historialMovimientosTableAvailable;
};

const hasOperacionColumnsInHistorial = async (connection) => {
  if (historialAccionesSupportsOperationIds !== null) {
    return historialAccionesSupportsOperationIds;
  }
  try {
    const [rows] = await connection.execute("SHOW COLUMNS FROM historial_acciones");
    const columns = new Set((rows || []).map((row) => String(row.Field || '').trim()));
    historialAccionesSupportsOperationIds =
      columns.has('operacion_madre_id') && columns.has('operacion_transaccion_id');
  } catch (_) {
    historialAccionesSupportsOperationIds = false;
  }
  return historialAccionesSupportsOperationIds;
};

const resolveOperacionIds = ({ entidad, entidad_id, antes, despues, payload, historialId }) => {
  const beforeObj = antes && typeof antes === 'object' ? antes : {};
  const afterObj = despues && typeof despues === 'object' ? despues : {};

  const movimientoDetalleId = trimToLength(
    firstNonEmptyValue(
      payload?.operacion_transaccion_id,
      payload?.transaccion_id,
      afterObj.movimiento_detalle_id,
      beforeObj.movimiento_detalle_id,
      entidad_id
    ),
    64
  );
  const movimientoMadreId = trimToLength(
    firstNonEmptyValue(
      payload?.operacion_madre_id,
      payload?.operacion_id,
      afterObj.movimiento_grupo_id,
      afterObj.movimiento_id,
      beforeObj.movimiento_grupo_id,
      beforeObj.movimiento_id,
      movimientoDetalleId
    ),
    64
  );

  const fallbackTransaccion = trimToLength(
    firstNonEmptyValue(movimientoDetalleId, historialId),
    64
  );
  const fallbackMadre = trimToLength(
    firstNonEmptyValue(movimientoMadreId, fallbackTransaccion),
    64
  );

  if (entidad === 'movimientos') {
    return {
      operacionMadreId: fallbackMadre,
      operacionTransaccionId: fallbackTransaccion
    };
  }

  // Para entidades no-movimiento: ambas IDs existen y por defecto se alinean a la transaccion.
  const explicitMadre = trimToLength(
    firstNonEmptyValue(payload?.operacion_madre_id, payload?.operacion_id),
    64
  );
  const explicitTransaccion = trimToLength(
    firstNonEmptyValue(payload?.operacion_transaccion_id, payload?.transaccion_id, historialId),
    64
  );
  return {
    operacionMadreId: explicitMadre || explicitTransaccion,
    operacionTransaccionId: explicitTransaccion
  };
};

const buildMovimientoHistorialPayload = ({
  historialId,
  entidad_id,
  usuario_id,
  accion,
  descripcion,
  antes,
  despues
}) => {
  const beforeObj = antes && typeof antes === 'object' ? antes : {};
  const afterObj = despues && typeof despues === 'object' ? despues : {};

  const tipoMovimiento = trimToLength(
    firstNonEmptyValue(afterObj.tipo_movimiento, accion),
    50
  );
  const motivo = trimToLength(afterObj.motivo, 255);
  const tipoMotivo = trimToLength(
    firstNonEmptyValue(
      afterObj.tipo_motivo_movimiento,
      tipoMovimiento && motivo ? `${tipoMovimiento}: ${motivo}` : null,
      tipoMovimiento,
      motivo
    ),
    255
  );

  const movimientoId = trimToLength(
    firstNonEmptyValue(
      afterObj.movimiento_id,
      afterObj.movimiento_grupo_id,
      beforeObj.movimiento_id,
      beforeObj.movimiento_grupo_id,
      entidad_id
    ),
    64
  );
  const movimientoGrupoId = trimToLength(
    firstNonEmptyValue(
      afterObj.movimiento_grupo_id,
      afterObj.movimiento_id,
      beforeObj.movimiento_grupo_id,
      beforeObj.movimiento_id,
      entidad_id
    ),
    64
  );
  const movimientoDetalleId = toNumberOrNull(
    firstNonEmptyValue(afterObj.movimiento_detalle_id, entidad_id)
  );

  const stockAntes = toNumberOrNull(beforeObj.stock);
  const stockDespues = toNumberOrNull(afterObj.stock);
  const variacionStock = resolveVariacionStock(accion, beforeObj, afterObj);
  const cantidad = resolveCantidad(afterObj, variacionStock);

  return {
    historial_id: historialId,
    usuario_id: toNumberOrNull(usuario_id),
    accion: trimToLength(accion, 50),
    descripcion_evento: trimToLength(descripcion, 255),
    producto_id: toNumberOrNull(
      firstNonEmptyValue(
        afterObj.producto_id,
        afterObj.maquina_id,
        beforeObj.producto_id,
        beforeObj.maquina_id
      )
    ),
    codigo_producto: trimToLength(
      firstNonEmptyValue(
        afterObj.codigo_producto,
        afterObj.codigo,
        afterObj.producto_codigo,
        beforeObj.codigo_producto,
        beforeObj.codigo,
        beforeObj.producto_codigo
      ),
      100
    ),
    descripcion_producto: trimToLength(
      firstNonEmptyValue(
        afterObj.descripcion_producto,
        afterObj.descripcion,
        beforeObj.descripcion_producto,
        beforeObj.descripcion
      ),
      255
    ),
    tipo_movimiento: tipoMovimiento,
    motivo,
    tipo_motivo_movimiento: tipoMotivo,
    documento_referencia_tipo: trimToLength(
      firstNonEmptyValue(
        afterObj.documento_referencia_tipo,
        beforeObj.documento_referencia_tipo
      ),
      40
    ),
    documento_referencia_valor: trimToLength(
      firstNonEmptyValue(
        afterObj.documento_referencia_valor,
        beforeObj.documento_referencia_valor
      ),
      120
    ),
    documento_referencia: trimToLength(
      firstNonEmptyValue(
        afterObj.documento_referencia,
        beforeObj.documento_referencia
      ),
      180
    ),
    movimiento_id: movimientoId,
    movimiento_grupo_id: movimientoGrupoId,
    movimiento_detalle_id: movimientoDetalleId,
    inventario_id: toNumberOrNull(
      firstNonEmptyValue(afterObj.inventario_id, beforeObj.inventario_id)
    ),
    cantidad,
    variacion_stock: variacionStock,
    stock_antes: stockAntes,
    stock_despues: stockDespues
  };
};

const registrarDetalleMovimiento = async (connection, payload) => {
  await connection.execute(
    `INSERT INTO historial_movimientos (
      historial_id,
      usuario_id,
      accion,
      descripcion_evento,
      producto_id,
      codigo_producto,
      descripcion_producto,
      tipo_movimiento,
      motivo,
      tipo_motivo_movimiento,
      documento_referencia_tipo,
      documento_referencia_valor,
      documento_referencia,
      movimiento_id,
      movimiento_grupo_id,
      movimiento_detalle_id,
      inventario_id,
      cantidad,
      variacion_stock,
      stock_antes,
      stock_despues
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.historial_id,
      payload.usuario_id,
      payload.accion,
      payload.descripcion_evento,
      payload.producto_id,
      payload.codigo_producto,
      payload.descripcion_producto,
      payload.tipo_movimiento,
      payload.motivo,
      payload.tipo_motivo_movimiento,
      payload.documento_referencia_tipo,
      payload.documento_referencia_valor,
      payload.documento_referencia,
      payload.movimiento_id,
      payload.movimiento_grupo_id,
      payload.movimiento_detalle_id,
      payload.inventario_id,
      payload.cantidad,
      payload.variacion_stock,
      payload.stock_antes,
      payload.stock_despues
    ]
  );
};

const registrarHistorial = async (connection, payload) => {
  const {
    entidad,
    entidad_id,
    usuario_id,
    accion,
    descripcion,
    antes,
    despues
  } = payload;

  const sanitizedAntes = antes ? sanitizeForHistory(antes) : null;
  const sanitizedDespues = despues ? sanitizeForHistory(despues) : null;
  const antesJson = sanitizedAntes ? JSON.stringify(sanitizedAntes) : null;
  const despuesJson = sanitizedDespues ? JSON.stringify(sanitizedDespues) : null;

  // Mantener entidad_id en movimientos incluso si el caller no lo envia.
  const entidadIdMov = toNumberOrNull(
    firstNonEmptyValue(
      entidad_id,
      sanitizedDespues?.movimiento_detalle_id,
      sanitizedAntes?.movimiento_detalle_id
    )
  );
  const entidadIdFinal = entidad === 'movimientos'
    ? (entidadIdMov || null)
    : (entidad_id || null);

  const supportsOperacionColumns = await hasOperacionColumnsInHistorial(connection);
  let result;
  if (supportsOperacionColumns) {
    [result] = await connection.execute(
      `INSERT INTO historial_acciones
       (entidad, entidad_id, usuario_id, accion, descripcion, antes_json, despues_json, operacion_madre_id, operacion_transaccion_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entidad,
        entidadIdFinal,
        usuario_id || null,
        accion,
        descripcion || null,
        antesJson,
        despuesJson,
        trimToLength(
          firstNonEmptyValue(
            payload?.operacion_madre_id,
            payload?.operacion_id,
            sanitizedDespues?.movimiento_grupo_id,
            sanitizedDespues?.movimiento_id
          ),
          64
        ),
        trimToLength(
          firstNonEmptyValue(
            payload?.operacion_transaccion_id,
            payload?.transaccion_id,
            sanitizedDespues?.movimiento_detalle_id,
            entidadIdFinal
          ),
          64
        )
      ]
    );
  } else {
    [result] = await connection.execute(
      `INSERT INTO historial_acciones
       (entidad, entidad_id, usuario_id, accion, descripcion, antes_json, despues_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entidad, entidadIdFinal, usuario_id || null, accion, descripcion || null, antesJson, despuesJson]
    );
  }

  const historialId = Number(result?.insertId || 0) || null;
  if (supportsOperacionColumns && historialId) {
    const { operacionMadreId, operacionTransaccionId } = resolveOperacionIds({
      entidad,
      entidad_id: entidadIdFinal,
      antes: sanitizedAntes,
      despues: sanitizedDespues,
      payload,
      historialId: String(historialId)
    });
    await connection.execute(
      `UPDATE historial_acciones
       SET operacion_madre_id = COALESCE(NULLIF(operacion_madre_id, ''), ?),
           operacion_transaccion_id = COALESCE(NULLIF(operacion_transaccion_id, ''), ?)
       WHERE id = ?`,
      [operacionMadreId, operacionTransaccionId, historialId]
    );
  }

  if (entidad !== 'movimientos' || !historialId) {
    return historialId;
  }

  if (!(await hasHistorialMovimientosTable(connection))) {
    return historialId;
  }

  const movimientoPayload = buildMovimientoHistorialPayload({
    historialId,
    entidad_id: entidadIdFinal,
    usuario_id,
    accion,
    descripcion,
    antes: sanitizedAntes,
    despues: sanitizedDespues
  });

  try {
    await registrarDetalleMovimiento(connection, movimientoPayload);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
      historialMovimientosTableAvailable = false;
      return historialId;
    }
    throw error;
  }

  return historialId;
};

module.exports = { registrarHistorial, sanitizeForHistory };
