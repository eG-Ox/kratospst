const pool = require('../../core/config/database');
const { ExcelJS, addSheetFromObjects, workbookToBuffer } = require('../../shared/utils/excel');
const { normalizeTrimmedText } = require('../../shared/utils/text');

const MAX_HISTORY_LIST_LIMIT = 500;

const releaseConnection = (connection) => {
  if (!connection) return;
  try {
    connection.release();
  } catch (_) {
    // no-op
  }
};

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

const REPORT_COLUMNS = {
  FECHA_HORA: 'Fecha y hora',
  ENTIDAD: 'Entidad',
  ACCION: 'Accion',
  USUARIO: 'Usuario',
  CODIGO_PRODUCTO: 'Codigo prod',
  DESCRIPCION: 'Descripcion',
  TIPO_MOTIVO: 'Tipo motivo movimiento',
  DOCUMENTO_REFERENCIA: 'DNI/GUIA/RUC/Cambio codigo',
  OPERACION_MADRE: 'N° operacion madre',
  ID_TRANSACCION: 'ID transaccion',
  CANTIDAD: 'Cantidad',
  STOCK_MOVIMIENTO: 'Stock movimiento',
  STOCK_TOTAL_ACTUALIZADO: 'Stock total actualizado'
};

const REPORT_HEADERS = Object.values(REPORT_COLUMNS);
const DOCUMENTO_TOKEN_REGEX = /\b(?:DNI|RUC|GUIA|CAMBIO\s+CODIGO)\s*:\s*[^|]+/gi;
const DOCUMENTO_TOKEN_SINGLE_REGEX = /\b(DNI|RUC|GUIA|CAMBIO\s+CODIGO)\s*:\s*([^|]+)/i;

const asCleanString = (value) => {
  if (value === null || value === undefined) return null;
  const text = normalizeTrimmedText(value);
  return text ? text : null;
};

const firstNonEmptyValue = (...values) => {
  for (const value of values) {
    const clean = asCleanString(value);
    if (clean !== null) return clean;
  }
  return null;
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAction = (value) => {
  const text = asCleanString(value);
  return text ? text.toLowerCase() : null;
};

const normalizeDocumentoLabel = (label) => (
  normalizeTrimmedText(label)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
);

const extractDocumentoFromText = (value) => {
  const text = asCleanString(value);
  if (!text) return null;
  const match = text.match(DOCUMENTO_TOKEN_SINGLE_REGEX);
  if (!match) return null;
  const label = normalizeDocumentoLabel(match[1]);
  const numero = asCleanString(match[2]);
  if (!numero) return null;
  return `${label}: ${numero}`;
};

const extractDocumentoFromMany = (...values) => {
  for (const value of values) {
    const documento = extractDocumentoFromText(value);
    if (documento) return documento;
  }
  return null;
};

const stripDocumentoTokens = (value) => {
  const text = asCleanString(value);
  if (!text) return null;
  let cleaned = String(text).replace(DOCUMENTO_TOKEN_REGEX, ' ');
  cleaned = cleaned
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s+/g, ' ')
    .replace(/\|\s*\|/g, '|')
    .replace(/^\s*\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
  return cleaned || null;
};

const normalizeMotivo = (value) => {
  const text = stripDocumentoTokens(value);
  if (!text) return null;
  let cleaned = text
    .replace(/\|/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/-\s*-/g, '-')
    .replace(/^[:\-\s]+/, '')
    .replace(/[:\-\s]+$/, '')
    .trim();
  return cleaned || null;
};

const parseTipoMotivoText = (value) => {
  const text = stripDocumentoTokens(value);
  if (!text) return { tipo: null, motivo: null };

  const colonIndex = text.indexOf(':');
  if (colonIndex > 0) {
    return {
      tipo: asCleanString(text.slice(0, colonIndex)),
      motivo: normalizeMotivo(text.slice(colonIndex + 1))
    };
  }

  const dashIndex = text.indexOf('-');
  if (dashIndex > 0) {
    return {
      tipo: asCleanString(text.slice(0, dashIndex)),
      motivo: normalizeMotivo(text.slice(dashIndex + 1))
    };
  }

  return { tipo: null, motivo: normalizeMotivo(text) };
};

const formatTipoMotivoDisplay = (tipo, motivo) => {
  const tipoText = asCleanString(tipo);
  const motivoText = asCleanString(motivo);
  if (tipoText && motivoText) return `${tipoText.toUpperCase()}-${motivoText.toUpperCase()}`;
  if (tipoText) return tipoText.toUpperCase();
  if (motivoText) return motivoText.toUpperCase();
  return null;
};

const formatExcelDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const resolveCodigoProducto = (row, antes, despues) => (
  firstNonEmptyValue(
    row.mov_codigo_producto,
    despues?.codigo_producto,
    despues?.codigo,
    despues?.producto_codigo,
    antes?.codigo_producto,
    antes?.codigo,
    antes?.producto_codigo
  )
);

const resolveDescripcion = (row, antes, despues) => (
  firstNonEmptyValue(
    row.mov_descripcion_producto,
    despues?.descripcion_producto,
    despues?.descripcion,
    antes?.descripcion_producto,
    antes?.descripcion,
    row.descripcion
  )
);

const resolveDocumentoReferencia = (row, antes, despues) => {
  const referenciaDirecta = firstNonEmptyValue(
    row.mov_documento_referencia,
    despues?.documento_referencia,
    antes?.documento_referencia
  );
  if (referenciaDirecta) {
    return extractDocumentoFromText(referenciaDirecta) || referenciaDirecta;
  }

  const referenciaTipo = firstNonEmptyValue(
    row.mov_documento_referencia_tipo,
    despues?.documento_referencia_tipo,
    antes?.documento_referencia_tipo
  );
  const referenciaValor = firstNonEmptyValue(
    row.mov_documento_referencia_valor,
    despues?.documento_referencia_valor,
    antes?.documento_referencia_valor
  );
  if (referenciaValor) {
    return referenciaTipo
      ? `${String(referenciaTipo).toUpperCase()}: ${referenciaValor}`
      : referenciaValor;
  }

  const referenciaDesdeTexto = extractDocumentoFromMany(
    row.mov_tipo_motivo_movimiento,
    row.mov_motivo,
    despues?.tipo_motivo_movimiento,
    despues?.motivo,
    antes?.tipo_motivo_movimiento,
    antes?.motivo
  );
  if (referenciaDesdeTexto) return referenciaDesdeTexto;

  const dni = firstNonEmptyValue(despues?.dni, antes?.dni);
  if (dni) return `DNI: ${dni}`;

  const guia = firstNonEmptyValue(
    despues?.guia,
    despues?.guia_remision,
    antes?.guia,
    antes?.guia_remision
  );
  if (guia) return `GUIA: ${guia}`;

  const ruc = firstNonEmptyValue(despues?.ruc, antes?.ruc);
  if (ruc) return `RUC: ${ruc}`;

  const codigoAntes = firstNonEmptyValue(antes?.codigo_producto, antes?.codigo);
  const codigoDespues = firstNonEmptyValue(despues?.codigo_producto, despues?.codigo);
  if (codigoAntes && codigoDespues && codigoAntes !== codigoDespues) {
    return `CAMBIO CODIGO: ${codigoAntes} -> ${codigoDespues}`;
  }

  return null;
};

const resolveOperacionMadreId = (row, antes, despues) => (
  firstNonEmptyValue(
    row.operacion_madre_id,
    row.mov_movimiento_grupo_id,
    row.mov_movimiento_id,
    row.mov_inventario_id ? `INV-${row.mov_inventario_id}` : null,
    despues?.movimiento_grupo_id,
    despues?.movimiento_id,
    despues?.inventario_id ? `INV-${despues.inventario_id}` : null,
    row.entidad === 'movimientos' ? row.entidad_id : null,
    row.id,
    antes?.movimiento_grupo_id,
    antes?.movimiento_id
  )
);

const resolveOperacionTransaccionId = (row, despues) => (
  firstNonEmptyValue(
    row.operacion_transaccion_id,
    row.mov_movimiento_detalle_id,
    despues?.movimiento_detalle_id,
    row.entidad === 'movimientos' ? row.entidad_id : null,
    row.id
  )
);

const resolveVariacionStock = (row, antes, despues) => {
  const variacionSql = toNumberOrNull(row.mov_variacion_stock);
  if (variacionSql !== null) return variacionSql;

  const variacionDirecta = toNumberOrNull(despues?.variacion_stock);
  if (variacionDirecta !== null) return variacionDirecta;

  const stockAntesSql = toNumberOrNull(row.mov_stock_antes);
  const stockDespuesSql = toNumberOrNull(row.mov_stock_despues);
  if (stockAntesSql !== null && stockDespuesSql !== null) {
    return stockDespuesSql - stockAntesSql;
  }

  const stockAntes = toNumberOrNull(antes?.stock);
  const stockDespues = toNumberOrNull(despues?.stock);
  if (stockAntes !== null && stockDespues !== null) {
    return stockDespues - stockAntes;
  }

  const cantidad = toNumberOrNull(despues?.cantidad);
  if (cantidad !== null) {
    const tipo = normalizeAction(despues?.tipo_movimiento || row.accion);
    if (tipo === 'ingreso') return Math.abs(cantidad);
    if (tipo === 'salida') return -Math.abs(cantidad);
  }

  return null;
};

const resolveCantidad = (row, despues, variacionStock) => {
  const cantidadSql = toNumberOrNull(row.mov_cantidad);
  if (cantidadSql !== null) return Math.abs(cantidadSql);

  const cantidad = toNumberOrNull(despues?.cantidad);
  if (cantidad !== null) return Math.abs(cantidad);
  if (variacionStock === null) return null;
  return Math.abs(variacionStock);
};

const resolveStockTotalActualizado = (row, despues) => {
  const stockSql = toNumberOrNull(row.mov_stock_despues);
  if (stockSql !== null) return stockSql;
  return toNumberOrNull(despues?.stock);
};

const resolveTipoMotivo = (row, despues) => {
  const rawTipoMotivo = firstNonEmptyValue(
    row.mov_tipo_motivo_movimiento,
    despues?.tipo_motivo_movimiento
  );
  const parsedTipoMotivo = parseTipoMotivoText(rawTipoMotivo);
  const tipo = firstNonEmptyValue(
    row.mov_tipo_movimiento,
    despues?.tipo_movimiento,
    parsedTipoMotivo.tipo,
    row.accion
  );
  const motivo = firstNonEmptyValue(
    normalizeMotivo(row.mov_motivo),
    normalizeMotivo(despues?.motivo),
    parsedTipoMotivo.motivo
  );
  const display = formatTipoMotivoDisplay(tipo, motivo);
  if (display) return display;

  return formatTipoMotivoDisplay(normalizeAction(row.accion), normalizeMotivo(row.descripcion));
};

const buildProfessionalReportRow = (row) => {
  const antes = safeParseJson(row.antes_json) || {};
  const despues = safeParseJson(row.despues_json) || {};
  const variacionStock = resolveVariacionStock(row, antes, despues);
  const cantidad = resolveCantidad(row, despues, variacionStock);
  const stockActualizado = resolveStockTotalActualizado(row, despues);

  return {
    [REPORT_COLUMNS.FECHA_HORA]: formatExcelDateTime(row.created_at),
    [REPORT_COLUMNS.ENTIDAD]: row.entidad || '-',
    [REPORT_COLUMNS.ACCION]: row.accion || '-',
    [REPORT_COLUMNS.USUARIO]: row.usuario_nombre || row.usuario_id || '-',
    [REPORT_COLUMNS.CODIGO_PRODUCTO]: resolveCodigoProducto(row, antes, despues) || '-',
    [REPORT_COLUMNS.DESCRIPCION]: resolveDescripcion(row, antes, despues) || '-',
    [REPORT_COLUMNS.TIPO_MOTIVO]: resolveTipoMotivo(row, despues) || '-',
    [REPORT_COLUMNS.DOCUMENTO_REFERENCIA]: resolveDocumentoReferencia(row, antes, despues) || '-',
    [REPORT_COLUMNS.OPERACION_MADRE]: resolveOperacionMadreId(row, antes, despues) || '-',
    [REPORT_COLUMNS.ID_TRANSACCION]: resolveOperacionTransaccionId(row, despues) || '-',
    [REPORT_COLUMNS.CANTIDAD]: cantidad === null ? '-' : cantidad,
    [REPORT_COLUMNS.STOCK_MOVIMIENTO]: variacionStock === null ? '-' : variacionStock,
    [REPORT_COLUMNS.STOCK_TOTAL_ACTUALIZADO]: stockActualizado === null ? '-' : stockActualizado
  };
};

const applyProfessionalSheetStyle = (sheet) => {
  if (!sheet) return;

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const stockColumnIndex = REPORT_HEADERS.indexOf(REPORT_COLUMNS.STOCK_MOVIMIENTO) + 1;
  const numericColumns = new Set([
    REPORT_HEADERS.indexOf(REPORT_COLUMNS.CANTIDAD) + 1,
    REPORT_HEADERS.indexOf(REPORT_COLUMNS.STOCK_MOVIMIENTO) + 1,
    REPORT_HEADERS.indexOf(REPORT_COLUMNS.STOCK_TOTAL_ACTUALIZADO) + 1
  ]);

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    for (const columnIndex of numericColumns.values()) {
      const cell = row.getCell(columnIndex);
      const numericValue = toNumberOrNull(cell.value);
      if (numericValue === null) continue;
      cell.value = numericValue;
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    const stockCell = row.getCell(stockColumnIndex);
    const stockValue = toNumberOrNull(stockCell.value);
    if (stockValue === null) continue;
    stockCell.numFmt = '+0;-0;0';
    if (stockValue < 0) {
      stockCell.font = { color: { argb: 'FFC62828' }, bold: true };
    } else if (stockValue > 0) {
      stockCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
    }
  }

  sheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value;
      const text = cellValue === null || cellValue === undefined ? '' : String(cellValue);
      maxLength = Math.max(maxLength, Math.min(text.length + 2, 60));
    });
    column.width = maxLength;
  });
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
  const safeLimit = Math.min(
    Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 50,
    MAX_HISTORY_LIST_LIMIT
  );
  const safePage = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const offset = (safePage - 1) * safeLimit;
  let connection;

  try {
    connection = await pool.getConnection();
    const baseSelect = `
      SELECT h.*, u.nombre as usuario_nombre
    `;
    const movimientoSelect = `,
      hm.codigo_producto as mov_codigo_producto,
      hm.descripcion_producto as mov_descripcion_producto,
      hm.tipo_movimiento as mov_tipo_movimiento,
      hm.motivo as mov_motivo,
      hm.tipo_motivo_movimiento as mov_tipo_motivo_movimiento,
      hm.documento_referencia as mov_documento_referencia,
      hm.documento_referencia_tipo as mov_documento_referencia_tipo,
      hm.documento_referencia_valor as mov_documento_referencia_valor,
      hm.movimiento_id as mov_movimiento_id,
      hm.movimiento_grupo_id as mov_movimiento_grupo_id,
      hm.movimiento_detalle_id as mov_movimiento_detalle_id,
      hm.cantidad as mov_cantidad,
      hm.variacion_stock as mov_variacion_stock,
      hm.stock_antes as mov_stock_antes,
      hm.stock_despues as mov_stock_despues,
      hm.inventario_id as mov_inventario_id,
      hm.producto_id as mov_producto_id
    `;
    const fromBase = `
      FROM historial_acciones h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
    `;
    const { where, params } = buildFilters(req.query);
    const queryWithMovimientos = `
      ${baseSelect}
      ${movimientoSelect}
      ${fromBase}
      LEFT JOIN historial_movimientos hm ON hm.historial_id = h.id
      ${where} ORDER BY h.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}
    `;
    const queryWithoutMovimientos = `
      ${baseSelect}
      ${fromBase}
      ${where} ORDER BY h.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}
    `;
    let rows;
    try {
      [rows] = await connection.execute(queryWithMovimientos, params);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
      [rows] = await connection.execute(queryWithoutMovimientos, params);
    }
    res.json(rows);
  } catch (error) {
    console.error('Error listando historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  } finally {
    releaseConnection(connection);
  }
};

exports.exportarHistorial = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const baseSelect = `
      SELECT h.id, h.usuario_id, h.created_at, h.entidad, h.entidad_id, h.accion, u.nombre as usuario_nombre, h.descripcion,
        h.antes_json, h.despues_json
    `;
    const movimientoSelect = `,
        hm.codigo_producto as mov_codigo_producto,
        hm.descripcion_producto as mov_descripcion_producto,
        hm.tipo_movimiento as mov_tipo_movimiento,
        hm.motivo as mov_motivo,
        hm.tipo_motivo_movimiento as mov_tipo_motivo_movimiento,
        hm.documento_referencia as mov_documento_referencia,
        hm.documento_referencia_tipo as mov_documento_referencia_tipo,
        hm.documento_referencia_valor as mov_documento_referencia_valor,
        hm.movimiento_id as mov_movimiento_id,
        hm.movimiento_grupo_id as mov_movimiento_grupo_id,
        hm.movimiento_detalle_id as mov_movimiento_detalle_id,
        hm.cantidad as mov_cantidad,
        hm.variacion_stock as mov_variacion_stock,
        hm.stock_antes as mov_stock_antes,
        hm.stock_despues as mov_stock_despues,
        hm.inventario_id as mov_inventario_id,
        hm.producto_id as mov_producto_id
    `;
    const fromBase = `
      FROM historial_acciones h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
    `;
    const { where, params } = buildFilters(req.query);
    const limiteValue = parsePositiveInt(req.query.limite, 5000);
    const safeLimit = Math.min(limiteValue, 20000);
    const queryWithMovimientos = `
      ${baseSelect}
      ${movimientoSelect}
      ${fromBase}
      LEFT JOIN historial_movimientos hm ON hm.historial_id = h.id
      ${where} ORDER BY h.created_at DESC LIMIT ${safeLimit}
    `;
    const queryWithoutMovimientos = `
      ${baseSelect}
      ${fromBase}
      ${where} ORDER BY h.created_at DESC LIMIT ${safeLimit}
    `;
    let rows;
    try {
      [rows] = await connection.execute(queryWithMovimientos, params);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
      [rows] = await connection.execute(queryWithoutMovimientos, params);
    }
    const reporteProfesional = rows.map((row) => buildProfessionalReportRow(row));

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
    const reporteSheet = addSheetFromObjects(
      workbook,
      'Reporte_profesional',
      reporteProfesional,
      REPORT_HEADERS
    );
    applyProfessionalSheetStyle(reporteSheet);
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
  } finally {
    releaseConnection(connection);
  }
};


