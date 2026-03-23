const fs = require('fs');
const path = require('path');
const pool = require('../../core/config/database');
const {
  ExcelJS,
  addSheetFromObjects,
  workbookToBuffer,
  readFirstSheetToJson
} = require('../../shared/utils/excel');

const PAGE_SIZE_DEFAULT = 60;
const PAGE_SIZE_MAX = 200;
const uploadsDir = path.join(__dirname, '../../uploads');

const CREATE_LISTA_PRODUCTOS_TIPOS_SQL = `
CREATE TABLE IF NOT EXISTS lista_productos_tipos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

const CREATE_LISTA_PRODUCTOS_SQL = `
CREATE TABLE IF NOT EXISTS lista_productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  tipo_id INT NOT NULL,
  marca VARCHAR(120) NOT NULL,
  descripcion TEXT,
  proveedor VARCHAR(120),
  stock INT NOT NULL DEFAULT 0,
  precio_compra DECIMAL(10, 2) NOT NULL,
  precio_venta DECIMAL(10, 2) NOT NULL,
  precio_minimo DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ficha_web VARCHAR(255),
  ficha_tecnica_ruta VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tipo_id) REFERENCES lista_productos_tipos(id) ON DELETE RESTRICT,
  INDEX idx_lista_productos_codigo (codigo),
  INDEX idx_lista_productos_tipo (tipo_id),
  INDEX idx_lista_productos_marca (marca),
  INDEX idx_lista_productos_proveedor (proveedor),
  INDEX idx_lista_productos_stock (stock)
)`;

const releaseConnection = (connection) => {
  if (!connection) return;
  try {
    connection.release();
  } catch (_) {
    // no-op
  }
};

const removeFileIfExists = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

const normalizeText = (value) => String(value || '').trim();

const normalizeCode = (value) => normalizeText(value).toUpperCase();

const parsePositiveInt = (value, fallback, maxValue = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maxValue);
};

const parseNonNegativeInt = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return 0;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const parseDecimal = (value) => {
  const normalized = normalizeText(value).replace(',', '.');
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const isNonNegative = (value) => Number.isFinite(value) && value >= 0;

const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const sanitizeFilename = (filename) => {
  const normalized = normalizeText(filename);
  if (!normalized) return null;
  if (normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) {
    return null;
  }
  return normalized;
};

const validateFichaWeb = (rawValue) => {
  const value = normalizeText(rawValue);
  if (!value) {
    return { value: null };
  }
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: 'ficha_web invalida. Solo se permite http/https' };
    }
    return { value: parsed.toString() };
  } catch (_) {
    return { error: 'ficha_web invalida. Debe iniciar con http:// o https://' };
  }
};

const mapProductoRow = (row) => ({
  id: row.id,
  codigo: row.codigo,
  tipo_id: row.tipo_id,
  tipo_nombre: row.tipo_nombre || '',
  marca: row.marca || '',
  descripcion: row.descripcion || '',
  proveedor: row.proveedor || '',
  stock: Number(row.stock || 0),
  precio_compra: row.precio_compra,
  precio_venta: row.precio_venta,
  precio_minimo: row.precio_minimo,
  ficha_web: row.ficha_web || '',
  ficha_tecnica_ruta: row.ficha_tecnica_ruta || null
});

const ensureSchema = async (connection) => {
  await connection.execute(CREATE_LISTA_PRODUCTOS_TIPOS_SQL);
  await connection.execute(CREATE_LISTA_PRODUCTOS_SQL);
};

exports.listar = async (req, res) => {
  let connection;
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
    const offset = (page - 1) * limit;

    const filtros = ['1 = 1'];
    const params = [];

    const q = normalizeText(req.query.q);
    if (q) {
      filtros.push(
        `(lp.codigo LIKE ? OR lp.descripcion LIKE ? OR lp.marca LIKE ? OR lp.proveedor LIKE ?)`
      );
      const likeValue = `%${q}%`;
      params.push(likeValue, likeValue, likeValue, likeValue);
    }

    const tipo = normalizeText(req.query.tipo);
    if (tipo) {
      const tipoId = Number.parseInt(tipo, 10);
      if (Number.isFinite(tipoId) && tipoId > 0) {
        filtros.push('lp.tipo_id = ?');
        params.push(tipoId);
      }
    }

    const marca = normalizeText(req.query.marca);
    if (marca) {
      filtros.push('lp.marca = ?');
      params.push(marca);
    }

    const stock = normalizeText(req.query.stock).toLowerCase();
    if (stock === 'sin') {
      filtros.push('lp.stock <= 0');
    } else if (stock === 'con') {
      filtros.push('lp.stock > 0');
    }

    const whereSql = filtros.join(' AND ');

    connection = await pool.getConnection();
    await ensureSchema(connection);

    const [rows] = await connection.execute(
      `SELECT lp.id, lp.codigo, lp.tipo_id, t.nombre AS tipo_nombre, lp.marca, lp.descripcion, lp.proveedor,
              lp.stock, lp.precio_compra, lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta
       FROM lista_productos lp
       JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE ${whereSql}
       ORDER BY lp.codigo ASC
       LIMIT ${offset}, ${limit}`,
      params
    );

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM lista_productos lp
       JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE ${whereSql}`,
      params
    );

    const total = Number(countRows?.[0]?.total || 0);
    return res.json({
      items: rows.map(mapProductoRow),
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error listando lista-productos:', error);
    return res.status(500).json({ error: 'Error al listar productos' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerPorId = async (req, res) => {
  let connection;
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Id invalido' });
    }
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      `SELECT lp.id, lp.codigo, lp.tipo_id, t.nombre AS tipo_nombre, lp.marca, lp.descripcion, lp.proveedor,
              lp.stock, lp.precio_compra, lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta
       FROM lista_productos lp
       JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE lp.id = ?`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.json(mapProductoRow(rows[0]));
  } catch (error) {
    console.error('Error obteniendo producto por id:', error);
    return res.status(500).json({ error: 'Error al obtener producto' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerPorCodigo = async (req, res) => {
  let connection;
  try {
    const codigo = normalizeCode(req.params.codigo);
    if (!codigo) {
      return res.status(400).json({ error: 'Codigo invalido' });
    }
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      `SELECT lp.id, lp.codigo, lp.tipo_id, t.nombre AS tipo_nombre, lp.marca, lp.descripcion, lp.proveedor,
              lp.stock, lp.precio_compra, lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta
       FROM lista_productos lp
       JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE lp.codigo = ?`,
      [codigo]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.json(mapProductoRow(rows[0]));
  } catch (error) {
    console.error('Error obteniendo producto por codigo:', error);
    return res.status(500).json({ error: 'Error al obtener producto' });
  } finally {
    releaseConnection(connection);
  }
};

exports.listarTipos = async (_req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      'SELECT id, nombre, descripcion FROM lista_productos_tipos ORDER BY nombre'
    );
    return res.json(rows);
  } catch (error) {
    console.error('Error listando tipos lista-productos:', error);
    return res.status(500).json({ error: 'Error al listar tipos' });
  } finally {
    releaseConnection(connection);
  }
};

exports.crearTipo = async (req, res) => {
  let connection;
  try {
    const nombre = normalizeText(req.body.nombre);
    const descripcion = normalizeText(req.body.descripcion) || null;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de tipo requerido' });
    }
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [result] = await connection.execute(
      'INSERT INTO lista_productos_tipos (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );
    return res.status(201).json({
      id: result.insertId,
      nombre,
      descripcion
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El tipo ya existe' });
    }
    console.error('Error creando tipo lista-productos:', error);
    return res.status(500).json({ error: 'Error al crear tipo' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizarTipo = async (req, res) => {
  let connection;
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Id de tipo invalido' });
    }
    const nombre = normalizeText(req.body.nombre);
    const descripcion = normalizeText(req.body.descripcion) || null;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de tipo requerido' });
    }
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      'SELECT id FROM lista_productos_tipos WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Tipo no encontrado' });
    }
    await connection.execute(
      'UPDATE lista_productos_tipos SET nombre = ?, descripcion = ? WHERE id = ?',
      [nombre, descripcion, id]
    );
    return res.json({
      id,
      nombre,
      descripcion
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El tipo ya existe' });
    }
    console.error('Error actualizando tipo lista-productos:', error);
    return res.status(500).json({ error: 'Error al actualizar tipo' });
  } finally {
    releaseConnection(connection);
  }
};

exports.listarMarcas = async (_req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      `SELECT DISTINCT marca
       FROM lista_productos
       WHERE marca IS NOT NULL AND marca <> ''
       ORDER BY marca`
    );
    return res.json(rows.map((row) => row.marca));
  } catch (error) {
    console.error('Error listando marcas lista-productos:', error);
    return res.status(500).json({ error: 'Error al listar marcas' });
  } finally {
    releaseConnection(connection);
  }
};

exports.crear = async (req, res) => {
  let connection;
  const uploadedFilePath = req.file?.path;
  try {
    const codigo = normalizeCode(req.body.codigo);
    const tipoId = Number.parseInt(req.body.tipo_id || req.body.tipo_maquina_id, 10);
    const marca = normalizeText(req.body.marca);
    const descripcion = normalizeText(req.body.descripcion) || null;
    const proveedor = normalizeText(req.body.proveedor) || null;
    const stock = parseNonNegativeInt(req.body.stock);
    const precioCompra = parseDecimal(req.body.precio_compra);
    const precioVenta = parseDecimal(req.body.precio_venta);
    const precioMinimoRaw = parseDecimal(req.body.precio_minimo);
    const precioMinimo = precioMinimoRaw === null ? 0 : precioMinimoRaw;
    const fichaWebValidation = validateFichaWeb(req.body.ficha_web);
    const fichaTecnicaRuta = req.file?.filename || null;

    if (!codigo || !Number.isFinite(tipoId) || tipoId <= 0 || !marca) {
      return res.status(400).json({ error: 'Codigo, tipo y marca son requeridos' });
    }
    if (stock === null || precioCompra === null || precioVenta === null) {
      return res.status(400).json({ error: 'Stock y precios son requeridos y validos' });
    }
    if (!isNonNegative(stock) || !isNonNegative(precioCompra) || !isNonNegative(precioVenta)) {
      return res.status(400).json({ error: 'Stock y precios deben ser no negativos' });
    }
    if (!isNonNegative(precioMinimo)) {
      return res.status(400).json({ error: 'Precio minimo invalido' });
    }
    if (precioCompra > precioVenta) {
      return res.status(400).json({ error: 'Precio compra no puede ser mayor a precio venta' });
    }
    if (precioMinimo > precioVenta) {
      return res.status(400).json({ error: 'Precio minimo no puede ser mayor a precio venta' });
    }
    if (fichaWebValidation.error) {
      return res.status(400).json({ error: fichaWebValidation.error });
    }

    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [tipoRows] = await connection.execute(
      'SELECT id FROM lista_productos_tipos WHERE id = ?',
      [tipoId]
    );
    if (!tipoRows.length) {
      return res.status(400).json({ error: 'Tipo no encontrado' });
    }

    const [result] = await connection.execute(
      `INSERT INTO lista_productos
       (codigo, tipo_id, marca, descripcion, proveedor, stock, precio_compra, precio_venta, precio_minimo, ficha_web, ficha_tecnica_ruta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        tipoId,
        marca,
        descripcion,
        proveedor,
        stock,
        precioCompra,
        precioVenta,
        precioMinimo,
        fichaWebValidation.value,
        fichaTecnicaRuta
      ]
    );

    const [rows] = await connection.execute(
      `SELECT lp.id, lp.codigo, lp.tipo_id, t.nombre AS tipo_nombre, lp.marca, lp.descripcion, lp.proveedor,
              lp.stock, lp.precio_compra, lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta
       FROM lista_productos lp
       JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE lp.id = ?`,
      [result.insertId]
    );
    return res.status(201).json(mapProductoRow(rows[0]));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'El codigo ya existe' });
    }
    console.error('Error creando lista-producto:', error);
    removeFileIfExists(uploadedFilePath);
    return res.status(500).json({ error: 'Error al crear producto' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizar = async (req, res) => {
  let connection;
  const uploadedFilePath = req.file?.path;
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Id invalido' });
    }

    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      'SELECT * FROM lista_productos WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      removeFileIfExists(uploadedFilePath);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const actual = rows[0];
    const hasBodyField = (field) => Object.prototype.hasOwnProperty.call(req.body, field);
    const hasTipoField =
      hasBodyField('tipo_id') || hasBodyField('tipo_maquina_id');

    const codigo = hasBodyField('codigo') ? normalizeCode(req.body.codigo) : actual.codigo;
    const tipoId = hasTipoField
      ? Number.parseInt(req.body.tipo_id || req.body.tipo_maquina_id, 10)
      : actual.tipo_id;
    const marca = hasBodyField('marca') ? normalizeText(req.body.marca) : actual.marca;
    const descripcion = hasBodyField('descripcion')
      ? normalizeText(req.body.descripcion) || null
      : actual.descripcion;
    const proveedor = hasBodyField('proveedor')
      ? normalizeText(req.body.proveedor) || null
      : actual.proveedor;
    const stock = hasBodyField('stock')
      ? parseNonNegativeInt(req.body.stock)
      : Number(actual.stock || 0);
    const precioCompra = hasBodyField('precio_compra')
      ? parseDecimal(req.body.precio_compra)
      : Number(actual.precio_compra || 0);
    const precioVenta = hasBodyField('precio_venta')
      ? parseDecimal(req.body.precio_venta)
      : Number(actual.precio_venta || 0);
    const precioMinimo = hasBodyField('precio_minimo')
      ? (parseDecimal(req.body.precio_minimo) ?? 0)
      : Number(actual.precio_minimo || 0);

    const fichaWebValidation = hasBodyField('ficha_web')
      ? validateFichaWeb(req.body.ficha_web)
      : { value: actual.ficha_web };
    if (!codigo || !Number.isFinite(tipoId) || tipoId <= 0 || !marca) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Codigo, tipo y marca son requeridos' });
    }
    if (stock === null || precioCompra === null || precioVenta === null) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Stock y precios son requeridos y validos' });
    }
    if (!isNonNegative(stock) || !isNonNegative(precioCompra) || !isNonNegative(precioVenta)) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Stock y precios deben ser no negativos' });
    }
    if (!isNonNegative(precioMinimo)) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Precio minimo invalido' });
    }
    if (precioCompra > precioVenta) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Precio compra no puede ser mayor a precio venta' });
    }
    if (precioMinimo > precioVenta) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Precio minimo no puede ser mayor a precio venta' });
    }
    if (fichaWebValidation.error) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: fichaWebValidation.error });
    }

    const [tipoRows] = await connection.execute(
      'SELECT id FROM lista_productos_tipos WHERE id = ?',
      [tipoId]
    );
    if (!tipoRows.length) {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'Tipo no encontrado' });
    }

    const fichaTecnicaRuta = req.file?.filename || actual.ficha_tecnica_ruta || null;

    await connection.execute(
      `UPDATE lista_productos
       SET codigo = ?, tipo_id = ?, marca = ?, descripcion = ?, proveedor = ?, stock = ?,
           precio_compra = ?, precio_venta = ?, precio_minimo = ?, ficha_web = ?, ficha_tecnica_ruta = ?
       WHERE id = ?`,
      [
        codigo,
        tipoId,
        marca,
        descripcion,
        proveedor,
        stock,
        precioCompra,
        precioVenta,
        precioMinimo,
        fichaWebValidation.value,
        fichaTecnicaRuta,
        id
      ]
    );

    if (req.file?.filename && actual.ficha_tecnica_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.ficha_tecnica_ruta));
    }

    const [updatedRows] = await connection.execute(
      `SELECT lp.id, lp.codigo, lp.tipo_id, t.nombre AS tipo_nombre, lp.marca, lp.descripcion, lp.proveedor,
              lp.stock, lp.precio_compra, lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta
       FROM lista_productos lp
       JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE lp.id = ?`,
      [id]
    );
    return res.json(mapProductoRow(updatedRows[0]));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      removeFileIfExists(uploadedFilePath);
      return res.status(400).json({ error: 'El codigo ya existe' });
    }
    console.error('Error actualizando lista-producto:', error);
    removeFileIfExists(uploadedFilePath);
    return res.status(500).json({ error: 'Error al actualizar producto' });
  } finally {
    releaseConnection(connection);
  }
};

exports.eliminar = async (req, res) => {
  let connection;
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Id invalido' });
    }
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      'SELECT ficha_tecnica_ruta FROM lista_productos WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await connection.execute('DELETE FROM lista_productos WHERE id = ?', [id]);
    const filename = rows[0]?.ficha_tecnica_ruta;
    if (filename) {
      removeFileIfExists(path.join(uploadsDir, filename));
    }
    return res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    console.error('Error eliminando lista-producto:', error);
    return res.status(500).json({ error: 'Error al eliminar producto' });
  } finally {
    releaseConnection(connection);
  }
};

exports.descargarFichaTecnica = async (req, res) => {
  try {
    const filename = sanitizeFilename(req.params.filename);
    if (!filename) {
      return res.status(400).json({ error: 'Ruta de archivo invalida' });
    }
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    return res.download(filePath);
  } catch (error) {
    console.error('Error descargando ficha tecnica lista-productos:', error);
    return res.status(500).json({ error: 'Error al descargar ficha tecnica' });
  }
};

exports.descargarPlantilla = async (_req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const data = [
      {
        codigo: 'LP-001',
        tipo: 'GENERAL',
        marca: 'MARCA DEMO',
        descripcion: 'Producto de ejemplo',
        proveedor: 'Proveedor demo',
        stock: 10,
        precio_compra: 100,
        precio_venta: 150,
        precio_minimo: 120,
        ficha_web: 'https://example.com/producto'
      }
    ];
    const headers = [
      'codigo',
      'tipo',
      'marca',
      'descripcion',
      'proveedor',
      'stock',
      'precio_compra',
      'precio_venta',
      'precio_minimo',
      'ficha_web'
    ];
    addSheetFromObjects(workbook, 'Plantilla', data, headers);
    const buffer = await workbookToBuffer(workbook);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_lista_productos.xlsx"'
    );
    return res.send(buffer);
  } catch (error) {
    console.error('Error generando plantilla lista-productos:', error);
    return res.status(500).json({ error: 'Error al generar plantilla' });
  }
};

exports.exportarExcel = async (_req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      `SELECT lp.codigo, t.nombre AS tipo, lp.marca, lp.descripcion, lp.proveedor, lp.stock,
              lp.precio_compra, lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta
       FROM lista_productos lp
       JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       ORDER BY lp.codigo`
    );
    const workbook = new ExcelJS.Workbook();
    addSheetFromObjects(workbook, 'Lista_productos', rows, [
      'codigo',
      'tipo',
      'marca',
      'descripcion',
      'proveedor',
      'stock',
      'precio_compra',
      'precio_venta',
      'precio_minimo',
      'ficha_web',
      'ficha_tecnica_ruta'
    ]);
    const buffer = await workbookToBuffer(workbook);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="lista_productos.xlsx"'
    );
    return res.send(buffer);
  } catch (error) {
    console.error('Error exportando lista-productos:', error);
    return res.status(500).json({ error: 'Error al exportar lista de productos' });
  } finally {
    releaseConnection(connection);
  }
};

exports.importarExcel = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo requerido' });
  }

  let connection;
  try {
    const rawRows = await readFirstSheetToJson(req.file.path);
    connection = await pool.getConnection();
    await ensureSchema(connection);
    await connection.beginTransaction();

    const [tiposRows] = await connection.execute(
      'SELECT id, nombre FROM lista_productos_tipos'
    );
    const tiposMap = new Map(
      tiposRows.map((row) => [normalizeText(row.nombre).toLowerCase(), row.id])
    );

    const [existingRows] = await connection.execute('SELECT codigo FROM lista_productos');
    const existingCodes = new Set(
      existingRows.map((row) => normalizeCode(row.codigo).toLowerCase())
    );

    const codigosProcesados = new Set();
    const duplicados = [];
    const errores = [];
    let insertados = 0;

    for (const [index, row] of rawRows.entries()) {
      const normalized = {};
      Object.keys(row || {}).forEach((key) => {
        normalized[normalizeHeader(key)] = row[key];
      });

      const codigo = normalizeCode(normalized.codigo);
      if (!codigo) {
        continue;
      }
      const codigoKey = codigo.toLowerCase();
      if (codigosProcesados.has(codigoKey) || existingCodes.has(codigoKey)) {
        duplicados.push(codigo);
        continue;
      }
      codigosProcesados.add(codigoKey);

      const tipoNombre = normalizeText(
        normalized.tipo || normalized.tipomaquina || normalized.tipoproducto
      );
      const marca = normalizeText(normalized.marca);
      const descripcion = normalizeText(normalized.descripcion) || null;
      const proveedor = normalizeText(normalized.proveedor) || null;
      const stock = parseNonNegativeInt(normalized.stock);
      const precioCompra = parseDecimal(normalized.preciocompra);
      const precioVenta = parseDecimal(normalized.precioventa);
      const precioMinimoRaw = parseDecimal(normalized.preciominimo);
      const precioMinimo = precioMinimoRaw === null ? 0 : precioMinimoRaw;
      const fichaWebValidation = validateFichaWeb(normalized.fichaweb);

      if (!tipoNombre || !marca) {
        errores.push(`Fila ${index + 2}: tipo y marca son requeridos`);
        continue;
      }
      if (stock === null || precioCompra === null || precioVenta === null) {
        errores.push(`Fila ${index + 2}: stock y precios son requeridos`);
        continue;
      }
      if (!isNonNegative(stock) || !isNonNegative(precioCompra) || !isNonNegative(precioVenta)) {
        errores.push(`Fila ${index + 2}: stock y precios deben ser no negativos`);
        continue;
      }
      if (!isNonNegative(precioMinimo)) {
        errores.push(`Fila ${index + 2}: precio minimo invalido`);
        continue;
      }
      if (precioCompra > precioVenta) {
        errores.push(`Fila ${index + 2}: precio compra mayor que precio venta`);
        continue;
      }
      if (precioMinimo > precioVenta) {
        errores.push(`Fila ${index + 2}: precio minimo mayor que precio venta`);
        continue;
      }
      if (fichaWebValidation.error) {
        errores.push(`Fila ${index + 2}: ${fichaWebValidation.error}`);
        continue;
      }

      const tipoKey = tipoNombre.toLowerCase();
      let tipoId = tiposMap.get(tipoKey);
      if (!tipoId) {
        const [tipoInsert] = await connection.execute(
          'INSERT INTO lista_productos_tipos (nombre, descripcion) VALUES (?, ?)',
          [tipoNombre, 'Creado desde importacion']
        );
        tipoId = tipoInsert.insertId;
        tiposMap.set(tipoKey, tipoId);
      }

      await connection.execute(
        `INSERT INTO lista_productos
         (codigo, tipo_id, marca, descripcion, proveedor, stock, precio_compra, precio_venta, precio_minimo, ficha_web, ficha_tecnica_ruta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          tipoId,
          marca,
          descripcion,
          proveedor,
          stock,
          precioCompra,
          precioVenta,
          precioMinimo,
          fichaWebValidation.value,
          null
        ]
      );
      insertados += 1;
      existingCodes.add(codigoKey);
    }

    await connection.commit();
    return res.json({ insertados, duplicados, errores });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // no-op
      }
    }
    console.error('Error importando lista-productos:', error);
    return res.status(500).json({ error: 'Error al importar lista de productos' });
  } finally {
    releaseConnection(connection);
    removeFileIfExists(req.file?.path);
  }
};
