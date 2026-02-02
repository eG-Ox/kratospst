const pool = require('../../core/config/database');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { registrarHistorial } = require('../../shared/utils/historial');
const { tienePermiso } = require('../../core/middleware/auth');

const normalizarHeader = (header) =>
  String(header || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const parseNumero = (value, fallback = 0) => {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const UBICACION_VALIDAS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

const parseUbicacionString = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) {
    return { letra: null, numero: null };
  }
  const match = raw.match(/^([A-H])\s*(\d+)?$/);
  if (!match) {
    return { error: 'Ubicacion invalida. Usa formato A1, A2, B1...' };
  }
  const numero = match[2] ? Number(match[2]) : null;
  if (numero !== null && (!Number.isInteger(numero) || numero <= 0)) {
    return { error: 'Numero de ubicacion invalido' };
  }
  return { letra: match[1], numero };
};

const normalizarUbicacion = (data) => {
  let letra = String(data?.ubicacion_letra || '').trim().toUpperCase();
  let numero = data?.ubicacion_numero;

  if (data?.ubicacion) {
    const parsed = parseUbicacionString(data.ubicacion);
    if (parsed.error) {
      return { error: parsed.error };
    }
    if (!letra) {
      letra = parsed.letra || '';
    }
    if (numero === null || numero === undefined || numero === '') {
      numero = parsed.numero;
    }
  }

  if (numero === '' || numero === undefined) {
    numero = null;
  }
  if (numero !== null && numero !== undefined) {
    const parsedNumero = Number(numero);
    if (!Number.isInteger(parsedNumero) || parsedNumero <= 0) {
      return { error: 'Numero de ubicacion invalido' };
    }
    numero = parsedNumero;
  }

  if (letra && !UBICACION_VALIDAS.has(letra)) {
    return { error: 'Ubicacion invalida. Letras permitidas: A-H' };
  }
  if ((numero !== null && numero !== undefined) && !letra) {
    return { error: 'Ubicacion invalida: falta la letra' };
  }

  return { letra: letra || null, numero: numero ?? null };
};

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
    if (!tienePermiso(req, 'productos.precio_compra.ver')) {
      const sanitized = maquinas.map((item) => ({ ...item, precio_compra: null }));
      return res.json(sanitized);
    }
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
    
    if (!tienePermiso(req, 'productos.precio_compra.ver')) {
      return res.json({ ...maquina[0], precio_compra: null });
    }
    res.json(maquina[0]);
  } catch (error) {
    console.error('Error obteniendo máquina:', error);
    res.status(500).json({ error: 'Error al obtener máquina' });
  }
};

// Obtener una maquina por codigo
exports.getMaquinaPorCodigo = async (req, res) => {
  const codigo = String(req.params.codigo || '').trim();
  if (!codigo) {
    return res.status(400).json({ error: 'Codigo requerido' });
  }

  try {
    const connection = await pool.getConnection();
    const [maquina] = await connection.execute(
      'SELECT m.*, t.nombre as tipo_nombre FROM maquinas m JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id WHERE m.codigo = ?',
      [codigo]
    );
    connection.release();

    if (maquina.length === 0) {
      return res.status(404).json({ error: 'Maquina no encontrada' });
    }

    if (!tienePermiso(req, 'productos.precio_compra.ver')) {
      return res.json({ ...maquina[0], precio_compra: null });
    }
    res.json(maquina[0]);
  } catch (error) {
    console.error('Error obteniendo maquina por codigo:', error);
    res.status(500).json({ error: 'Error al obtener maquina' });
  }
};

// Crear nueva máquina
exports.crearMaquina = async (req, res) => {
  const {
    codigo,
    tipo_maquina_id,
    marca,
    descripcion,
    ubicacion,
    ubicacion_letra,
    ubicacion_numero,
    stock,
    precio_compra,
    precio_venta,
    precio_minimo,
    ficha_web
  } = req.body;

  // Validar campos requeridos
  const precioCompraVacio =
    precio_compra === undefined || precio_compra === null || precio_compra === '';
  const precioVentaVacio =
    precio_venta === undefined || precio_venta === null || precio_venta === '';
  if (!codigo || !tipo_maquina_id || !marca || precioCompraVacio || precioVentaVacio) {
    return res.status(400).json({ 
      error: 'Campos requeridos: código, tipo de máquina, marca, precio de compra y precio de venta' 
    });
  }

  try {
    const ubicacionParse = normalizarUbicacion({
      ubicacion,
      ubicacion_letra,
      ubicacion_numero
    });
    if (ubicacionParse.error) {
      return res.status(400).json({ error: ubicacionParse.error });
    }

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
       (codigo, tipo_maquina_id, marca, descripcion, ubicacion_letra, ubicacion_numero, stock, precio_compra, 
        precio_venta, precio_minimo, ficha_web, ficha_tecnica_ruta) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        tipo_maquina_id,
        marca,
        descripcion || null,
        ubicacionParse.letra,
        ubicacionParse.numero,
        stock || 0,
        precio_compra,
        precio_venta,
        precio_minimo || 0,
        ficha_web || null,
        ficha_tecnica_ruta
      ]
    );
    await registrarHistorial(connection, {
      entidad: 'productos',
      entidad_id: result.insertId,
      usuario_id: req.usuario?.id,
      accion: 'crear',
      descripcion: `Producto creado (${codigo})`,
      antes: null,
      despues: {
        id: result.insertId,
        codigo,
        tipo_maquina_id,
        marca,
        descripcion: descripcion || null,
        ubicacion_letra: ubicacionParse.letra,
        ubicacion_numero: ubicacionParse.numero,
        stock: stock || 0,
        precio_compra,
        precio_venta,
        precio_minimo: precio_minimo || 0
      }
    });
    connection.release();

    res.status(201).json({
      id: result.insertId,
      codigo,
      tipo_maquina_id,
      marca,
      descripcion,
      ubicacion_letra: ubicacionParse.letra,
      ubicacion_numero: ubicacionParse.numero,
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
    ubicacion,
    ubicacion_letra,
    ubicacion_numero,
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
      'SELECT * FROM maquinas WHERE id = ?',
      [req.params.id]
    );

    if (maquinaActual.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'M?quina no encontrada' });
    }

    const ubicacionInputPresent =
      Object.prototype.hasOwnProperty.call(req.body, 'ubicacion') ||
      Object.prototype.hasOwnProperty.call(req.body, 'ubicacion_letra') ||
      Object.prototype.hasOwnProperty.call(req.body, 'ubicacion_numero');

    let ubicacionParse = {
      letra: maquinaActual[0].ubicacion_letra ?? null,
      numero: maquinaActual[0].ubicacion_numero ?? null
    };
    if (ubicacionInputPresent) {
      const parsed = normalizarUbicacion({
        ubicacion,
        ubicacion_letra,
        ubicacion_numero
      });
      if (parsed.error) {
        connection.release();
        return res.status(400).json({ error: parsed.error });
      }
      ubicacionParse = { letra: parsed.letra, numero: parsed.numero };
    }

    let ficha_tecnica_ruta = maquinaActual[0].ficha_tecnica_ruta;

    // Si hay un nuevo archivo, usar ese
    if (req.file) {
      // Eliminar archivo anterior si existe
      if (ficha_tecnica_ruta) {
        const rutaAnterior = path.join(__dirname, '../../uploads', ficha_tecnica_ruta);
        fs.unlink(rutaAnterior, () => {});
      }
      ficha_tecnica_ruta = req.file.filename;
    }

    await connection.execute(
      `UPDATE maquinas 
       SET codigo = ?, tipo_maquina_id = ?, marca = ?, descripcion = ?, 
           ubicacion_letra = ?, ubicacion_numero = ?, stock = ?, precio_compra = ?, precio_venta = ?, precio_minimo = ?, 
           ficha_web = ?, ficha_tecnica_ruta = ?
       WHERE id = ?`,
      [
        codigo,
        tipo_maquina_id,
        marca,
        descripcion || null,
        ubicacionParse.letra,
        ubicacionParse.numero,
        stock || 0,
        precio_compra,
        precio_venta,
        precio_minimo || 0,
        ficha_web || null,
        ficha_tecnica_ruta,
        req.params.id
      ]
    );
    await registrarHistorial(connection, {
      entidad: 'productos',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Producto actualizado (${codigo})`,
      antes: maquinaActual[0],
      despues: {
        id: req.params.id,
        codigo,
        tipo_maquina_id,
        marca,
        descripcion: descripcion || null,
        ubicacion_letra: ubicacionParse.letra,
        ubicacion_numero: ubicacionParse.numero,
        stock: stock || 0,
        precio_compra,
        precio_venta,
        precio_minimo: precio_minimo || 0
      }
    });
    connection.release();

    res.json({
      id: req.params.id,
      codigo,
      tipo_maquina_id,
      marca,
      descripcion,
      ubicacion_letra: ubicacionParse.letra,
      ubicacion_numero: ubicacionParse.numero,
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

exports.descargarPlantilla = async (req, res) => {
  try {
    const data = [
      {
        codigo: 'EJEMPLO-001',
        tipo_maquina: 'HIDROLAVADORA',
        marca: 'GENERICA',
        descripcion: 'Descripcion del producto',
        ubicacion: 'A1',
        stock: 10,
        precio_compra: 100,
        precio_venta: 150,
        precio_minimo: 120
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: [
        'codigo',
        'tipo_maquina',
        'marca',
        'descripcion',
        'ubicacion',
        'stock',
        'precio_compra',
        'precio_venta',
        'precio_minimo'
      ]
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_productos.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error generando plantilla:', error);
    res.status(500).json({ error: 'Error al generar plantilla' });
  }
};

exports.exportarExcel = async (req, res) => {
  try {
    const ubicacionParse = normalizarUbicacion({
      ubicacion,
      ubicacion_letra,
      ubicacion_numero
    });
    if (ubicacionParse.error) {
      return res.status(400).json({ error: ubicacionParse.error });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT m.codigo, t.nombre as tipo_maquina, m.marca, m.descripcion,
        m.ubicacion_letra, m.ubicacion_numero,
        m.stock, m.precio_compra, m.precio_venta, m.precio_minimo
      FROM maquinas m
      JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id
      ORDER BY m.codigo
    `);
    connection.release();

    const data = rows.map((row) => ({
      codigo: row.codigo,
      tipo_maquina: row.tipo_maquina,
      marca: row.marca,
      descripcion: row.descripcion,
      ubicacion: row.ubicacion_letra ? `${row.ubicacion_letra}${row.ubicacion_numero || ''}` : '',
      stock: row.stock,
      precio_compra: row.precio_compra,
      precio_venta: row.precio_venta,
      precio_minimo: row.precio_minimo
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="productos.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando productos:', error);
    res.status(500).json({ error: 'Error al exportar productos' });
  }
};

exports.importarExcel = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo requerido' });
  }

  let connection;
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    connection = await pool.getConnection();
    const [tipos] = await connection.execute('SELECT id, nombre FROM tipos_maquinas');
    const tiposMap = new Map(
      tipos.map((tipo) => [String(tipo.nombre || '').toLowerCase(), tipo.id])
    );

    const [existentes] = await connection.execute('SELECT id, codigo FROM maquinas');
    const existentesMap = new Map(
      existentes.map((item) => [String(item.codigo || '').toLowerCase(), item.id])
    );

    const errores = [];
    const duplicados = [];
    let insertados = 0;

    for (const [index, row] of rawRows.entries()) {
      const normalized = {};
      Object.keys(row || {}).forEach((key) => {
        normalized[normalizarHeader(key)] = row[key];
      });

      const codigo = String(normalized.codigo || '').trim();
      if (!codigo) {
        continue;
      }
      if (existentesMap.has(codigo.toLowerCase())) {
        duplicados.push(codigo);
        continue;
      }

      const tipoNombre = String(
        normalized.tipomaquina || normalized.tipo || normalized.tipomaquinaid || ''
      ).trim();
      let tipoId = tiposMap.get(tipoNombre.toLowerCase());
      if (!tipoId) {
        if (!tipoNombre) {
          errores.push(`Fila ${index + 2}: falta tipo de maquina`);
          continue;
        }
        const [tipoInsert] = await connection.execute(
          'INSERT INTO tipos_maquinas (nombre, descripcion) VALUES (?, ?)',
          [tipoNombre, 'Creado desde importacion']
        );
        tipoId = tipoInsert.insertId;
        tiposMap.set(tipoNombre.toLowerCase(), tipoId);
      }

      const marca = String(normalized.marca || '').trim();
      const precioCompra = parseNumero(normalized.preciocompra, null);
      const precioVenta = parseNumero(normalized.precioventa, null);
      if (!marca || precioCompra === null || precioVenta === null) {
        errores.push(`Fila ${index + 2}: faltan campos requeridos`);
        continue;
      }

      const descripcion = String(normalized.descripcion || '').trim();
      const stock = parseNumero(normalized.stock, 0);
      const precioMinimo = parseNumero(normalized.preciominimo, 0);
      const ubicacionRaw = String(normalized.ubicacion || '').trim();
      const ubicacionLetra = String(normalized.ubicacionletra || '').trim();
      const ubicacionNumero = normalized.ubicacionnumero;

      const ubicacionParse = normalizarUbicacion({
        ubicacion: ubicacionRaw,
        ubicacion_letra: ubicacionLetra,
        ubicacion_numero: ubicacionNumero
      });
      if (ubicacionParse.error) {
        errores.push(`Fila ${index + 2}: ${ubicacionParse.error}`);
        continue;
      }

      await connection.execute(
        `INSERT INTO maquinas
        (codigo, tipo_maquina_id, marca, descripcion, ubicacion_letra, ubicacion_numero, stock, precio_compra,
         precio_venta, precio_minimo, ficha_web, ficha_tecnica_ruta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          tipoId,
          marca,
          descripcion || null,
          ubicacionParse.letra,
          ubicacionParse.numero,
          stock,
          precioCompra,
          precioVenta,
          precioMinimo,
          null,
          null
        ]
      );
      insertados += 1;
    }

    await registrarHistorial(connection, {
      entidad: 'productos',
      entidad_id: null,
      usuario_id: req.usuario?.id,
      accion: 'importar',
      descripcion: `Importacion masiva (${insertados} nuevos)`,
      antes: null,
      despues: { insertados, duplicados: duplicados.length, errores: errores.length }
    });

    connection.release();
    fs.unlink(req.file.path, () => {});

    res.json({ insertados, duplicados, errores });
  } catch (error) {
    console.error('Error importando productos:', error);
    if (connection) {
      connection.release();
    }
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Error al importar productos' });
  }
};

// Eliminar máquina
exports.eliminarMaquina = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Obtener la máquina
    const [maquina] = await connection.execute(
      'SELECT * FROM maquinas WHERE id = ?',
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
    await registrarHistorial(connection, {
      entidad: 'productos',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'eliminar',
      descripcion: `Producto eliminado (${req.params.id})`,
      antes: maquina[0] || null,
      despues: null
    });
    connection.release();

    // Eliminar archivo si existe
    if (maquina[0].ficha_tecnica_ruta) {
      const rutaArchivo = path.join(__dirname, '../../uploads', maquina[0].ficha_tecnica_ruta);
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
    const rutaArchivo = path.join(__dirname, '../../uploads', filename);
    
    // Validar que el archivo existe y está en la carpeta uploads
    if (!rutaArchivo.startsWith(path.join(__dirname, '../../uploads'))) {
      return res.status(400).json({ error: 'Ruta de archivo inválida' });
    }

    res.download(rutaArchivo);
  } catch (error) {
    console.error('Error descargando ficha técnica:', error);
    res.status(500).json({ error: 'Error al descargar ficha técnica' });
  }
};
