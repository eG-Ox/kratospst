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

  const antesJson = antes ? JSON.stringify(antes) : null;
  const despuesJson = despues ? JSON.stringify(despues) : null;

  await connection.execute(
    `INSERT INTO historial_acciones
     (entidad, entidad_id, usuario_id, accion, descripcion, antes_json, despues_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entidad, entidad_id || null, usuario_id || null, accion, descripcion || null, antesJson, despuesJson]
  );
};

module.exports = { registrarHistorial };
