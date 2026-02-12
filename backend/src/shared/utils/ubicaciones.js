const syncUbicacionPrincipal = async (connection, { id, ubicacion_letra, ubicacion_numero, stock }) => {
  if (!connection || !id) {
    return;
  }

  await connection.execute('DELETE FROM maquinas_ubicaciones WHERE producto_id = ?', [id]);

  if (!ubicacion_letra || !ubicacion_numero) {
    return;
  }

  await connection.execute(
    `INSERT INTO maquinas_ubicaciones (producto_id, ubicacion_letra, ubicacion_numero, stock)
     VALUES (?, ?, ?, ?)`,
    [id, ubicacion_letra, ubicacion_numero, Number(stock || 0)]
  );
};

module.exports = { syncUbicacionPrincipal };
