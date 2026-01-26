const pool = require('../../core/config/database');

// Obtener todos los tipos de máquinas
exports.getTiposMaquinas = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [tipos] = await connection.execute(
      'SELECT * FROM tipos_maquinas ORDER BY nombre'
    );
    connection.release();
    res.json(tipos);
  } catch (error) {
    console.error('Error obteniendo tipos de máquinas:', error);
    res.status(500).json({ error: 'Error al obtener tipos de máquinas' });
  }
};

// Obtener un tipo de máquina por ID
exports.getTipoMaquina = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [tipo] = await connection.execute(
      'SELECT * FROM tipos_maquinas WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    
    if (tipo.length === 0) {
      return res.status(404).json({ error: 'Tipo de máquina no encontrado' });
    }
    
    res.json(tipo[0]);
  } catch (error) {
    console.error('Error obteniendo tipo de máquina:', error);
    res.status(500).json({ error: 'Error al obtener tipo de máquina' });
  }
};

// Crear nuevo tipo de máquina
exports.crearTipoMaquina = async (req, res) => {
  const { nombre, descripcion } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO tipos_maquinas (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    connection.release();
    
    res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion
    });
  } catch (error) {
    console.error('Error creando tipo de máquina:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El tipo de máquina ya existe' });
    }
    res.status(500).json({ error: 'Error al crear tipo de máquina' });
  }
};

// Actualizar tipo de máquina
exports.actualizarTipoMaquina = async (req, res) => {
  const { nombre, descripcion } = req.body;
  
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE tipos_maquinas SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombre, descripcion || null, req.params.id]
    );
    connection.release();
    
    res.json({ id: req.params.id, nombre, descripcion });
  } catch (error) {
    console.error('Error actualizando tipo de máquina:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El tipo de máquina ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar tipo de máquina' });
  }
};

// Eliminar tipo de máquina
exports.eliminarTipoMaquina = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'DELETE FROM tipos_maquinas WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tipo de máquina no encontrado' });
    }
    
    res.json({ mensaje: 'Tipo de máquina eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando tipo de máquina:', error);
    res.status(500).json({ error: 'Error al eliminar tipo de máquina' });
  }
};
