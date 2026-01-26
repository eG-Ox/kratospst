// Servicio para obtener información de máquinas desde la base de datos
// Centraliza la lógica de acceso a datos para productos/máquinas

const pool = require('../../core/config/database');

exports.getAllMaquinas = async () => {
  const connection = await pool.getConnection();
  try {
    const [maquinas] = await connection.execute(`
      SELECT m.*, t.nombre as tipo_nombre 
      FROM maquinas m 
      JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id 
      ORDER BY m.codigo
    `);
    return maquinas;
  } finally {
    connection.release();
  }
};

exports.getMaquinaById = async (id) => {
  const connection = await pool.getConnection();
  try {
    const [maquina] = await connection.execute(
      'SELECT m.*, t.nombre as tipo_nombre FROM maquinas m JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id WHERE m.id = ?',
      [id]
    );
    return maquina[0] || null;
  } finally {
    connection.release();
  }
};

exports.getTipoMaquinaById = async (tipo_maquina_id) => {
  const connection = await pool.getConnection();
  try {
    const [tipo] = await connection.execute(
      'SELECT id FROM tipos_maquinas WHERE id = ?',
      [tipo_maquina_id]
    );
    return tipo[0] || null;
  } finally {
    connection.release();
  }
};

exports.updateStock = async (maquina_id, nuevoStock) => {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'UPDATE maquinas SET stock = ? WHERE id = ?',
      [nuevoStock, maquina_id]
    );
    return true;
  } finally {
    connection.release();
  }
};
