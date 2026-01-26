const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

// Obtener todas las máquinas
exports.getMaquinas = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [maquinas] = await connection.execute(`
      SELECT m.*, t.nombre as tipo_nombre 
      FROM maquinas m 
      JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id 
      ORDER BY m.codigo
    `);
    connection.release();
    res.json(maquinas);
  } catch (error) {
    console.error('Error obteniendo máquinas:', error);
    res.status(500).json({ error: 'Error al obtener máquinas' });
  }
};

// Obtener una máquina por ID
exports.getMaquina = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [maquina] = await connection.execute(
      'SELECT m.*, t.nombre as tipo_nombre FROM maquinas m JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id WHERE m.id = ?',
      [req.params.id]
    );
    connection.release();
    
    if (maquina.length === 0) {
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }
    
    res.json(maquina[0]);
  } catch (error) {
    console.error('Error obteniendo máquina:', error);
    res.status(500).json({ error: 'Error al obtener máquina' });
  }
};

// Crear nueva máquina
exports.crearMaquina = async (req, res) => {
  const {
    codigo,
    tipo_maquina_id,
    marca,
    descripcion,
    stock,
    precio_compra,
    precio_venta,
    precio_minimo,
    ficha_web
  } = req.body;

  // Validar campos requeridos
  if (!codigo || !tipo_maquina_id || !marca || !precio_compra || !precio_venta) {
    return res.status(400).json({ 
      error: 'Campos requeridos: código, tipo de máquina, marca, precio de compra y precio de venta' 
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Verificar que el tipo de máquina existe
    const [tipo] = await connection.execute(
      'SELECT id FROM tipos_maquinas WHERE id = ?',
      [tipo_maquina_id]
    );
    
    if (tipo.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'El tipo de máquina no existe' });
    }

    let ficha_tecnica_ruta = null;
    if (req.file) {
      ficha_tecnica_ruta = req.file.filename;
    }

    const [result] = await connection.execute(
      `INSERT INTO maquinas 
       (codigo, tipo_maquina_id, marca, descripcion, stock, precio_compra, 
        precio_venta, precio_minimo, ficha_web, ficha_tecnica_ruta) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        tipo_maquina_id,
        marca,
        descripcion || null,
        stock || 0,
        precio_compra,
        precio_venta,
        precio_minimo || 0,
        ficha_web || null,
        ficha_tecnica_ruta
      ]
    );
    connection.release();

    res.status(201).json({
      id: result.insertId,
      codigo,
      tipo_maquina_id,
      marca,
      descripcion,
      stock,
      precio_compra,
      precio_venta,
      precio_minimo,
      ficha_web,
      ficha_tecnica_ruta
    });
  } catch (error) {
    console.error('Error creando máquina:', error);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El código de máquina ya existe' });
    }
    res.status(500).json({ error: 'Error al crear máquina' });
  }
};

// Actualizar máquina
exports.actualizarMaquina = async (req, res) => {
  const {
    codigo,
    tipo_maquina_id,
    marca,
    descripcion,
    stock,
    precio_compra,
    precio_venta,
    precio_minimo,
    ficha_web
  } = req.body;

  try {
    const connection = await pool.getConnection();

    // Obtener la máquina actual
    const [maquinaActual] = await connection.execute(
      'SELECT ficha_tecnica_ruta FROM maquinas WHERE id = ?',
      [req.params.id]
    );

    if (maquinaActual.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    let ficha_tecnica_ruta = maquinaActual[0].ficha_tecnica_ruta;

    // Si hay un nuevo archivo, usar ese
    if (req.file) {
      // Eliminar archivo anterior si existe
      if (ficha_tecnica_ruta) {
        const rutaAnterior = path.join(__dirname, '../uploads', ficha_tecnica_ruta);
        fs.unlink(rutaAnterior, () => {});
      }
      ficha_tecnica_ruta = req.file.filename;
    }

    await connection.execute(
      `UPDATE maquinas 
       SET codigo = ?, tipo_maquina_id = ?, marca = ?, descripcion = ?, 
           stock = ?, precio_compra = ?, precio_venta = ?, precio_minimo = ?, 
           ficha_web = ?, ficha_tecnica_ruta = ?
       WHERE id = ?`,
      [
        codigo,
        tipo_maquina_id,
        marca,
        descripcion || null,
        stock || 0,
        precio_compra,
        precio_venta,
        precio_minimo || 0,
        ficha_web || null,
        ficha_tecnica_ruta,
        req.params.id
      ]
    );
    connection.release();

    res.json({
      id: req.params.id,
      codigo,
      tipo_maquina_id,
      marca,
      descripcion,
      stock,
      precio_compra,
      precio_venta,
      precio_minimo,
      ficha_web,
      ficha_tecnica_ruta
    });
  } catch (error) {
    console.error('Error actualizando máquina:', error);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El código de máquina ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar máquina' });
  }
};

// Eliminar máquina
exports.eliminarMaquina = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Obtener la máquina
    const [maquina] = await connection.execute(
      'SELECT ficha_tecnica_ruta FROM maquinas WHERE id = ?',
      [req.params.id]
    );

    if (maquina.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }

    // Eliminar máquina
    const [result] = await connection.execute(
      'DELETE FROM maquinas WHERE id = ?',
      [req.params.id]
    );
    connection.release();

    // Eliminar archivo si existe
    if (maquina[0].ficha_tecnica_ruta) {
      const rutaArchivo = path.join(__dirname, '../uploads', maquina[0].ficha_tecnica_ruta);
      fs.unlink(rutaArchivo, () => {});
    }

    res.json({ mensaje: 'Máquina eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando máquina:', error);
    res.status(500).json({ error: 'Error al eliminar máquina' });
  }
};

// Descargar ficha técnica
exports.descargarFichaTecnica = async (req, res) => {
  try {
    const { filename } = req.params;
    const rutaArchivo = path.join(__dirname, '../uploads', filename);
    
    // Validar que el archivo existe y está en la carpeta uploads
    if (!rutaArchivo.startsWith(path.join(__dirname, '../uploads'))) {
      return res.status(400).json({ error: 'Ruta de archivo inválida' });
    }

    res.download(rutaArchivo);
  } catch (error) {
    console.error('Error descargando ficha técnica:', error);
    res.status(500).json({ error: 'Error al descargar ficha técnica' });
  }
};
