const toNonNegativeInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const normalizeUbicacion = (letra, numero) => {
  const normalizedLetter = String(letra || '').trim().toUpperCase();
  const parsedNumber = Number.parseInt(numero, 10);
  if (!normalizedLetter || !Number.isFinite(parsedNumber) || parsedNumber <= 0) {
    return null;
  }
  return {
    letra: normalizedLetter,
    numero: parsedNumber
  };
};

const fetchUbicaciones = async (connection, productoId) => {
  const [rows] = await connection.execute(
    `SELECT id, ubicacion_letra, ubicacion_numero, stock
     FROM maquinas_ubicaciones
     WHERE producto_id = ?
     ORDER BY id ASC
     FOR UPDATE`,
    [productoId]
  );
  return rows || [];
};

const syncUbicacionPrincipal = async (connection, { id, ubicacion_letra, ubicacion_numero, stock }) => {
  if (!connection || !id) {
    return;
  }

  const targetUbicacion = normalizeUbicacion(ubicacion_letra, ubicacion_numero);
  const hasTargetStock =
    stock !== undefined && stock !== null && String(stock).trim() !== '';
  const targetStock = toNonNegativeInt(stock, 0);

  let ubicaciones = await fetchUbicaciones(connection, id);

  if (!ubicaciones.length) {
    if (!targetUbicacion) {
      return;
    }
    await connection.execute(
      `INSERT INTO maquinas_ubicaciones (producto_id, ubicacion_letra, ubicacion_numero, stock)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
      [id, targetUbicacion.letra, targetUbicacion.numero, hasTargetStock ? targetStock : 0]
    );
    return;
  }

  if (targetUbicacion) {
    const existsTarget = ubicaciones.some(
      (row) =>
        String(row.ubicacion_letra || '').toUpperCase() === targetUbicacion.letra &&
        Number(row.ubicacion_numero) === targetUbicacion.numero
    );

    if (!existsTarget) {
      await connection.execute(
        `INSERT INTO maquinas_ubicaciones (producto_id, ubicacion_letra, ubicacion_numero, stock)
         VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE stock = stock`,
        [id, targetUbicacion.letra, targetUbicacion.numero]
      );
      ubicaciones = await fetchUbicaciones(connection, id);
    }
  }

  if (!hasTargetStock) {
    return;
  }

  const targetRow =
    (targetUbicacion &&
      ubicaciones.find(
        (row) =>
          String(row.ubicacion_letra || '').toUpperCase() === targetUbicacion.letra &&
          Number(row.ubicacion_numero) === targetUbicacion.numero
      )) ||
    ubicaciones[0];

  if (!targetRow) {
    return;
  }

  const currentRows = ubicaciones.map((row) => ({
    id: Number(row.id),
    stock: toNonNegativeInt(row.stock, 0)
  }));
  const targetRowId = Number(targetRow.id);
  const currentTotal = currentRows.reduce((acc, row) => acc + row.stock, 0);
  let diff = targetStock - currentTotal;
  if (diff === 0) {
    return;
  }

  const nextStockById = new Map(currentRows.map((row) => [row.id, row.stock]));

  if (diff > 0) {
    nextStockById.set(targetRowId, (nextStockById.get(targetRowId) || 0) + diff);
  } else {
    let pendingReduction = Math.abs(diff);
    const reductionOrder = [
      targetRowId,
      ...currentRows
        .filter((row) => row.id !== targetRowId)
        .sort((a, b) => b.stock - a.stock)
        .map((row) => row.id)
    ];

    // Mantiene todas las ubicaciones y redistribuye la baja sin dejar stocks negativos.
    for (const rowId of reductionOrder) {
      if (pendingReduction <= 0) break;
      const currentStock = nextStockById.get(rowId) || 0;
      if (currentStock <= 0) continue;
      const reduce = Math.min(currentStock, pendingReduction);
      nextStockById.set(rowId, currentStock - reduce);
      pendingReduction -= reduce;
    }
  }

  for (const row of currentRows) {
    const nextStock = nextStockById.get(row.id);
    if (nextStock === row.stock) {
      continue;
    }
    await connection.execute(
      'UPDATE maquinas_ubicaciones SET stock = ? WHERE id = ?',
      [nextStock, row.id]
    );
  }
};

module.exports = { syncUbicacionPrincipal };
