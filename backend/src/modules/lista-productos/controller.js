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
const listaProductosUploadsDir = path.join(uploadsDir, 'lista-productos');
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);
const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg'
]);
const PRODUCTO_SELECT_FIELDS = `
lp.id, lp.codigo, lp.tipo_id, COALESCE(t.nombre, CONCAT('Tipo #', lp.tipo_id)) AS tipo_nombre, lp.marca, lp.descripcion, lp.proveedor,
lp.stock, lp.precio_compra, lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta,
lp.imagen_ruta, lp.video_r_ruta, lp.video_uso_ruta`;
const EXCEL_BORDER = {
  top: { style: 'thin', color: { argb: 'FF2F2F2F' } },
  left: { style: 'thin', color: { argb: 'FF2F2F2F' } },
  bottom: { style: 'thin', color: { argb: 'FF2F2F2F' } },
  right: { style: 'thin', color: { argb: 'FF2F2F2F' } }
};
const EXCEL_DEFAULT_COLUMN_WIDTH = 8.43;
const EXCEL_DEFAULT_ROW_HEIGHT = 15;
const EXCEL_IMAGE_PADDING_PX = 6;
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf
]);

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
  imagen_ruta VARCHAR(255),
  video_r_ruta VARCHAR(255),
  video_uso_ruta VARCHAR(255),
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

const removeEmptyDirectoriesUpwards = (startDir, stopDir) => {
  if (!startDir || !stopDir) return;
  const stopResolved = path.resolve(stopDir);
  let currentDir = path.resolve(startDir);

  while (currentDir.startsWith(stopResolved) && currentDir !== stopResolved) {
    try {
      if (fs.existsSync(currentDir) && fs.readdirSync(currentDir).length === 0) {
        fs.rmdirSync(currentDir);
        currentDir = path.dirname(currentDir);
        continue;
      }
    } catch (_) {
      // no-op
    }
    break;
  }
};

const removeFileIfExists = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {
    removeEmptyDirectoriesUpwards(path.dirname(filePath), uploadsDir);
  });
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

const parseBooleanFlag = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeText(value).toLowerCase();
  return (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'si' ||
    normalized === 'sí' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
};

const isNonNegative = (value) => Number.isFinite(value) && value >= 0;

const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const sanitizePathSegment = (segment) => {
  const normalized = normalizeText(segment);
  if (!normalized || normalized === '.' || normalized === '..') return null;
  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) return null;
  return normalized;
};

const sanitizeRelativeUploadPath = (rawPath) => {
  const normalized = normalizeText(rawPath).replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes(':')) {
    return null;
  }
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return null;
  const sanitizedSegments = [];
  for (const segment of segments) {
    const sanitizedSegment = sanitizePathSegment(segment);
    if (!sanitizedSegment) return null;
    sanitizedSegments.push(sanitizedSegment);
  }
  return sanitizedSegments.join('/');
};

const normalizeCodeFolder = (codigo) => {
  const normalized = normalizeCode(codigo)
    .replace(/[^A-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'SIN-CODIGO';
};

const getUploadedFile = (req, fieldName) => {
  if (req.file?.fieldname === fieldName) {
    return req.file;
  }
  const files = req.files?.[fieldName];
  return Array.isArray(files) && files.length ? files[0] : null;
};

const getUploadedAssets = (req) => {
  const fichaTecnica = getUploadedFile(req, 'ficha_tecnica');
  const imagen = getUploadedFile(req, 'imagen');
  const videoR = getUploadedFile(req, 'video_r');
  const videoUso = getUploadedFile(req, 'video_uso');
  return {
    fichaTecnica,
    imagen,
    videoR,
    videoUso,
    all: [fichaTecnica, imagen, videoR, videoUso].filter(Boolean)
  };
};

const removeUploadedAssets = (files = []) => {
  files.forEach((file) => removeFileIfExists(file?.path));
};

const validateUploadedAssets = ({ fichaTecnica, imagen, videoR, videoUso }) => {
  if (fichaTecnica && fichaTecnica.mimetype !== 'application/pdf') {
    return 'La ficha tecnica debe ser un archivo PDF';
  }
  if (imagen && !ALLOWED_IMAGE_MIMES.has(imagen.mimetype)) {
    return 'La imagen debe ser JPG, PNG, GIF o WEBP';
  }
  if (videoR && !ALLOWED_VIDEO_MIMES.has(videoR.mimetype)) {
    return 'El video R debe ser MP4, WEBM u OGG';
  }
  if (videoUso && !ALLOWED_VIDEO_MIMES.has(videoUso.mimetype)) {
    return 'El video uso debe ser MP4, WEBM u OGG';
  }
  return null;
};

const columnExists = async (connection, tableName, columnName) => {
  const [rows] = await connection.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
};

const addColumnIfMissing = async (connection, tableName, columnName, statement) => {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.execute(statement);
  }
};

const resolveUploadPath = (storedPath) => {
  const sanitized = sanitizeRelativeUploadPath(storedPath);
  if (!sanitized) return null;
  const resolved = path.resolve(uploadsDir, sanitized);
  const uploadsRoot = path.resolve(uploadsDir);
  if (!resolved.startsWith(`${uploadsRoot}${path.sep}`) && resolved !== uploadsRoot) {
    return null;
  }
  return resolved;
};

const moveUploadedFileToProductFolder = (file, codigo) => {
  if (!file?.path || !codigo) return null;
  const folderCode = normalizeCodeFolder(codigo);
  const targetDir = path.join(listaProductosUploadsDir, folderCode);
  fs.mkdirSync(targetDir, { recursive: true });

  const baseName = sanitizePathSegment(path.basename(file.filename || file.originalname || 'archivo'));
  if (!baseName) {
    throw new Error('Nombre de archivo invalido');
  }

  const targetPath = path.join(targetDir, baseName);
  fs.renameSync(file.path, targetPath);
  file.path = targetPath;
  file.filename = baseName;
  return path.posix.join('lista-productos', folderCode, baseName);
};

const getJpegMetadataFromBuffer = (buffer) => {
  if (!buffer?.length || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let orientation = 1;
  let width = null;
  let height = null;
  let offset = 2;

  const parseExifOrientation = (segmentStart, segmentLength) => {
    if (segmentLength < 10) return null;
    if (buffer.toString('ascii', segmentStart + 2, segmentStart + 6) !== 'Exif') {
      return null;
    }

    const tiffStart = segmentStart + 8;
    if (tiffStart + 8 > buffer.length) return null;

    const byteOrder = buffer.toString('ascii', tiffStart, tiffStart + 2);
    const littleEndian = byteOrder === 'II';
    const bigEndian = byteOrder === 'MM';
    if (!littleEndian && !bigEndian) return null;

    const readUInt16 = (pos) =>
      littleEndian ? buffer.readUInt16LE(pos) : buffer.readUInt16BE(pos);
    const readUInt32 = (pos) =>
      littleEndian ? buffer.readUInt32LE(pos) : buffer.readUInt32BE(pos);

    const ifd0Offset = readUInt32(tiffStart + 4);
    const ifd0Start = tiffStart + ifd0Offset;
    if (ifd0Start + 2 > buffer.length) return null;

    const entries = readUInt16(ifd0Start);
    for (let index = 0; index < entries; index += 1) {
      const entryOffset = ifd0Start + 2 + index * 12;
      if (entryOffset + 12 > buffer.length) break;

      const tag = readUInt16(entryOffset);
      if (tag !== 0x0112) continue;

      const type = readUInt16(entryOffset + 2);
      const count = readUInt32(entryOffset + 4);
      if (type !== 3 || count < 1) return null;

      return readUInt16(entryOffset + 8);
    }

    return null;
  };

  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue;
    }
    if (offset + 1 >= buffer.length) break;

    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) {
      break;
    }

    if (marker === 0xe1) {
      const exifOrientation = parseExifOrientation(offset, length);
      if (Number.isFinite(exifOrientation) && exifOrientation >= 1 && exifOrientation <= 8) {
        orientation = exifOrientation;
      }
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (offset + 7 >= buffer.length) {
        break;
      }
      height = buffer.readUInt16BE(offset + 3);
      width = buffer.readUInt16BE(offset + 5);
      if (width && height) {
        break;
      }
    }

    offset += length;
  }

  if (!width || !height) {
    return null;
  }

  const requiresSwap = [5, 6, 7, 8].includes(orientation);
  return {
    width,
    height,
    orientation,
    displayWidth: requiresSwap ? height : width,
    displayHeight: requiresSwap ? width : height
  };
};

const getImageDimensionsFromBuffer = (buffer, extension) => {
  if (!buffer?.length) return null;

  if (extension === 'png') {
    if (buffer.length < 24) return null;
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }

  if (extension === 'gif') {
    if (buffer.length < 10) return null;
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8)
    };
  }

  if (extension === 'jpeg') {
    const metadata = getJpegMetadataFromBuffer(buffer);
    if (!metadata) return null;
    return {
      width: metadata.displayWidth,
      height: metadata.displayHeight,
      orientation: metadata.orientation
    };
  }

  return null;
};

const getExcelImageSource = (filename) => {
  const filePath = resolveUploadPath(filename);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  const rawExtension = path.extname(filePath).slice(1).toLowerCase();
  const extension = rawExtension === 'jpg' ? 'jpeg' : rawExtension;
  if (!['jpeg', 'png', 'gif'].includes(extension)) {
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const dimensions = getImageDimensionsFromBuffer(buffer, extension);
  if (!dimensions?.width || !dimensions?.height) {
    return null;
  }
  return {
    buffer,
    extension,
    width: dimensions.width,
    height: dimensions.height
  };
};

const applyWorksheetCellBorder = (row) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = EXCEL_BORDER;
  });
};

const excelColumnWidthToPixels = (width = EXCEL_DEFAULT_COLUMN_WIDTH) =>
  Math.max(1, Math.round(width * 7 + 5));

const excelRowHeightToPixels = (height = EXCEL_DEFAULT_ROW_HEIGHT) =>
  Math.max(1, Math.round((height * 96) / 72));

const getExcelImagePlacement = ({
  columnIndex,
  rowIndex,
  columnWidth,
  rowHeight,
  imageWidth,
  imageHeight
}) => {
  const cellWidthPx = excelColumnWidthToPixels(columnWidth);
  const cellHeightPx = excelRowHeightToPixels(rowHeight);
  const availableWidthPx = Math.max(1, cellWidthPx - EXCEL_IMAGE_PADDING_PX * 2);
  const availableHeightPx = Math.max(1, cellHeightPx - EXCEL_IMAGE_PADDING_PX * 2);
  const scale = Math.min(availableWidthPx / imageWidth, availableHeightPx / imageHeight);

  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }

  const renderWidthPx = Math.max(1, Math.round(imageWidth * scale));
  const renderHeightPx = Math.max(1, Math.round(imageHeight * scale));
  const offsetXPx = Math.max(0, Math.round((cellWidthPx - renderWidthPx) / 2));
  const offsetYPx = Math.max(0, Math.round((cellHeightPx - renderHeightPx) / 2));

  return {
    tl: {
      col: columnIndex + (offsetXPx / cellWidthPx),
      row: rowIndex + (offsetYPx / cellHeightPx)
    },
    ext: {
      width: renderWidthPx,
      height: renderHeightPx
    },
    editAs: 'oneCell'
  };
};

const buildProductoExportDescripcion = (row) => {
  return normalizeText(row.descripcion) || '-';
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
  ficha_tecnica_ruta: row.ficha_tecnica_ruta || null,
  imagen_ruta: row.imagen_ruta || null,
  video_r_ruta: row.video_r_ruta || null,
  video_uso_ruta: row.video_uso_ruta || null
});

const ensureSchema = async (connection) => {
  await connection.execute(CREATE_LISTA_PRODUCTOS_TIPOS_SQL);
  await connection.execute(CREATE_LISTA_PRODUCTOS_SQL);
  await addColumnIfMissing(
    connection,
    'lista_productos',
    'imagen_ruta',
    'ALTER TABLE lista_productos ADD COLUMN imagen_ruta VARCHAR(255) NULL AFTER ficha_tecnica_ruta'
  );
  await addColumnIfMissing(
    connection,
    'lista_productos',
    'video_r_ruta',
    'ALTER TABLE lista_productos ADD COLUMN video_r_ruta VARCHAR(255) NULL AFTER imagen_ruta'
  );
  await addColumnIfMissing(
    connection,
    'lista_productos',
    'video_uso_ruta',
    'ALTER TABLE lista_productos ADD COLUMN video_uso_ruta VARCHAR(255) NULL AFTER video_r_ruta'
  );
  if (await columnExists(connection, 'lista_productos', 'video_ruta')) {
    await connection.execute(
      `UPDATE lista_productos
       SET video_r_ruta = video_ruta
       WHERE (video_r_ruta IS NULL OR video_r_ruta = '')
         AND video_ruta IS NOT NULL
         AND video_ruta <> ''`
    );
  }
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
      `SELECT ${PRODUCTO_SELECT_FIELDS}
       FROM lista_productos lp
       LEFT JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE ${whereSql}
       ORDER BY lp.codigo ASC
       LIMIT ${offset}, ${limit}`,
      params
    );

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM lista_productos lp
       LEFT JOIN lista_productos_tipos t ON t.id = lp.tipo_id
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
      `SELECT ${PRODUCTO_SELECT_FIELDS}
       FROM lista_productos lp
       LEFT JOIN lista_productos_tipos t ON t.id = lp.tipo_id
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
      `SELECT ${PRODUCTO_SELECT_FIELDS}
       FROM lista_productos lp
       LEFT JOIN lista_productos_tipos t ON t.id = lp.tipo_id
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
  const uploadedAssets = getUploadedAssets(req);
  try {
    const uploadError = validateUploadedAssets(uploadedAssets);
    if (uploadError) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: uploadError });
    }

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

    if (!codigo || !Number.isFinite(tipoId) || tipoId <= 0 || !marca) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Codigo, tipo y marca son requeridos' });
    }
    if (stock === null || precioCompra === null || precioVenta === null) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Stock y precios son requeridos y validos' });
    }
    if (!isNonNegative(stock) || !isNonNegative(precioCompra) || !isNonNegative(precioVenta)) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Stock y precios deben ser no negativos' });
    }
    if (!isNonNegative(precioMinimo)) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Precio minimo invalido' });
    }
    if (precioCompra > precioVenta) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Precio compra no puede ser mayor a precio venta' });
    }
    if (precioMinimo > precioVenta) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Precio minimo no puede ser mayor a precio venta' });
    }
    if (fichaWebValidation.error) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: fichaWebValidation.error });
    }

    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [tipoRows] = await connection.execute(
      'SELECT id FROM lista_productos_tipos WHERE id = ?',
      [tipoId]
    );
    if (!tipoRows.length) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Tipo no encontrado' });
    }

    const fichaTecnicaRuta = uploadedAssets.fichaTecnica
      ? moveUploadedFileToProductFolder(uploadedAssets.fichaTecnica, codigo)
      : null;
    const imagenRuta = uploadedAssets.imagen
      ? moveUploadedFileToProductFolder(uploadedAssets.imagen, codigo)
      : null;
    const videoRRuta = uploadedAssets.videoR
      ? moveUploadedFileToProductFolder(uploadedAssets.videoR, codigo)
      : null;
    const videoUsoRuta = uploadedAssets.videoUso
      ? moveUploadedFileToProductFolder(uploadedAssets.videoUso, codigo)
      : null;

    const [result] = await connection.execute(
      `INSERT INTO lista_productos
       (codigo, tipo_id, marca, descripcion, proveedor, stock, precio_compra, precio_venta, precio_minimo, ficha_web, ficha_tecnica_ruta, imagen_ruta, video_r_ruta, video_uso_ruta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        imagenRuta,
        videoRRuta,
        videoUsoRuta
      ]
    );

    const [rows] = await connection.execute(
      `SELECT ${PRODUCTO_SELECT_FIELDS}
       FROM lista_productos lp
       LEFT JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE lp.id = ?`,
      [result.insertId]
    );
    return res.status(201).json(mapProductoRow(rows[0]));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'El codigo ya existe' });
    }
    console.error('Error creando lista-producto:', error);
    removeUploadedAssets(uploadedAssets.all);
    return res.status(500).json({ error: 'Error al crear producto' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizar = async (req, res) => {
  let connection;
  const uploadedAssets = getUploadedAssets(req);
  try {
    const uploadError = validateUploadedAssets(uploadedAssets);
    if (uploadError) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: uploadError });
    }

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Id invalido' });
    }

    connection = await pool.getConnection();
    await ensureSchema(connection);
    const [rows] = await connection.execute(
      'SELECT * FROM lista_productos WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      removeUploadedAssets(uploadedAssets.all);
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
    const removeImagen = parseBooleanFlag(req.body.eliminar_imagen);
    const removeVideoR = parseBooleanFlag(req.body.eliminar_video_r);
    const removeVideoUso = parseBooleanFlag(req.body.eliminar_video_uso);
    if (!codigo || !Number.isFinite(tipoId) || tipoId <= 0 || !marca) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Codigo, tipo y marca son requeridos' });
    }
    if (stock === null || precioCompra === null || precioVenta === null) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Stock y precios son requeridos y validos' });
    }
    if (!isNonNegative(stock) || !isNonNegative(precioCompra) || !isNonNegative(precioVenta)) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Stock y precios deben ser no negativos' });
    }
    if (!isNonNegative(precioMinimo)) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Precio minimo invalido' });
    }
    if (precioCompra > precioVenta) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Precio compra no puede ser mayor a precio venta' });
    }
    if (precioMinimo > precioVenta) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Precio minimo no puede ser mayor a precio venta' });
    }
    if (fichaWebValidation.error) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: fichaWebValidation.error });
    }

    const [tipoRows] = await connection.execute(
      'SELECT id FROM lista_productos_tipos WHERE id = ?',
      [tipoId]
    );
    if (!tipoRows.length) {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'Tipo no encontrado' });
    }

    const fichaTecnicaRuta = uploadedAssets.fichaTecnica
      ? moveUploadedFileToProductFolder(uploadedAssets.fichaTecnica, codigo)
      : actual.ficha_tecnica_ruta || null;
    const imagenRuta = uploadedAssets.imagen
      ? moveUploadedFileToProductFolder(uploadedAssets.imagen, codigo)
      : (removeImagen ? null : actual.imagen_ruta || null);
    const videoRRuta = uploadedAssets.videoR
      ? moveUploadedFileToProductFolder(uploadedAssets.videoR, codigo)
      : (removeVideoR ? null : actual.video_r_ruta || null);
    const videoUsoRuta = uploadedAssets.videoUso
      ? moveUploadedFileToProductFolder(uploadedAssets.videoUso, codigo)
      : (removeVideoUso ? null : actual.video_uso_ruta || null);

    await connection.execute(
      `UPDATE lista_productos
       SET codigo = ?, tipo_id = ?, marca = ?, descripcion = ?, proveedor = ?, stock = ?,
           precio_compra = ?, precio_venta = ?, precio_minimo = ?, ficha_web = ?, ficha_tecnica_ruta = ?, imagen_ruta = ?, video_r_ruta = ?, video_uso_ruta = ?
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
        imagenRuta,
        videoRRuta,
        videoUsoRuta,
        id
      ]
    );

    if (uploadedAssets.fichaTecnica?.filename && actual.ficha_tecnica_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.ficha_tecnica_ruta));
    }
    if (uploadedAssets.imagen?.filename && actual.imagen_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.imagen_ruta));
    }
    if (!uploadedAssets.imagen?.filename && removeImagen && actual.imagen_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.imagen_ruta));
    }
    if (uploadedAssets.videoR?.filename && actual.video_r_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.video_r_ruta));
    }
    if (!uploadedAssets.videoR?.filename && removeVideoR && actual.video_r_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.video_r_ruta));
    }
    if (uploadedAssets.videoUso?.filename && actual.video_uso_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.video_uso_ruta));
    }
    if (!uploadedAssets.videoUso?.filename && removeVideoUso && actual.video_uso_ruta) {
      removeFileIfExists(path.join(uploadsDir, actual.video_uso_ruta));
    }

    const [updatedRows] = await connection.execute(
      `SELECT ${PRODUCTO_SELECT_FIELDS}
       FROM lista_productos lp
       LEFT JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       WHERE lp.id = ?`,
      [id]
    );
    return res.json(mapProductoRow(updatedRows[0]));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      removeUploadedAssets(uploadedAssets.all);
      return res.status(400).json({ error: 'El codigo ya existe' });
    }
    console.error('Error actualizando lista-producto:', error);
    removeUploadedAssets(uploadedAssets.all);
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
      'SELECT ficha_tecnica_ruta, imagen_ruta, video_r_ruta, video_uso_ruta FROM lista_productos WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await connection.execute('DELETE FROM lista_productos WHERE id = ?', [id]);
    if (rows[0]?.ficha_tecnica_ruta) {
      removeFileIfExists(path.join(uploadsDir, rows[0].ficha_tecnica_ruta));
    }
    if (rows[0]?.imagen_ruta) {
      removeFileIfExists(path.join(uploadsDir, rows[0].imagen_ruta));
    }
    if (rows[0]?.video_r_ruta) {
      removeFileIfExists(path.join(uploadsDir, rows[0].video_r_ruta));
    }
    if (rows[0]?.video_uso_ruta) {
      removeFileIfExists(path.join(uploadsDir, rows[0].video_uso_ruta));
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
    const filePath = resolveUploadPath(req.query.path || req.params.filename);
    if (!filePath) {
      return res.status(400).json({ error: 'Ruta de archivo invalida' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    return res.download(filePath);
  } catch (error) {
    console.error('Error descargando ficha tecnica lista-productos:', error);
    return res.status(500).json({ error: 'Error al descargar ficha tecnica' });
  }
};

exports.verImagen = async (req, res) => {
  try {
    const filePath = resolveUploadPath(req.query.path || req.params.filename);
    if (!filePath) {
      return res.status(400).json({ error: 'Ruta de archivo invalida' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error visualizando imagen lista-productos:', error);
    return res.status(500).json({ error: 'Error al visualizar imagen' });
  }
};

exports.verVideo = async (req, res) => {
  try {
    const filePath = resolveUploadPath(req.query.path || req.params.filename);
    if (!filePath) {
      return res.status(400).json({ error: 'Ruta de archivo invalida' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error visualizando video lista-productos:', error);
    return res.status(500).json({ error: 'Error al visualizar video' });
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
      `SELECT lp.codigo, COALESCE(t.nombre, CONCAT('Tipo #', lp.tipo_id)) AS tipo, lp.marca, lp.descripcion, lp.proveedor, lp.stock,
              lp.precio_venta, lp.precio_minimo, lp.ficha_web, lp.ficha_tecnica_ruta,
              lp.imagen_ruta
       FROM lista_productos lp
       LEFT JOIN lista_productos_tipos t ON t.id = lp.tipo_id
       ORDER BY lp.codigo`
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lista_productos', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    sheet.columns = [
      { key: 'codigo', width: 18 },
      { key: 'tipo', width: 20 },
      { key: 'marca', width: 20 },
      { key: 'descripcion', width: 40 },
      { key: 'imagen', width: 22 },
      { key: 'proveedor', width: 22 },
      { key: 'precio_venta', width: 18 }
    ];
    sheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2
      }
    };

    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LISTA DE PRODUCTOS';
    titleCell.font = { name: 'Arial', size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = EXCEL_BORDER;
    sheet.getRow(1).height = 28;

    const headerRow = sheet.getRow(3);
    ['CODIGO', 'TIPO', 'MARCA', 'DESCRIPCION', 'IMAGEN', 'PROVEEDOR', 'PRECIO DE VENTA'].forEach(
      (header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF111827' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' }
        };
        cell.border = EXCEL_BORDER;
      }
    );
    headerRow.height = 24;
    sheet.autoFilter = 'A3:G3';

    rows.forEach((row, index) => {
      const rowNumber = index + 4;
      const excelRow = sheet.getRow(rowNumber);
      excelRow.height = 92;

      const codigoCell = excelRow.getCell(1);
      codigoCell.value = row.codigo || '-';
      codigoCell.font = { name: 'Arial', size: 12, bold: true };
      codigoCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      const tipoCell = excelRow.getCell(2);
      tipoCell.value = normalizeText(row.tipo) || '-';
      tipoCell.font = { name: 'Arial', size: 11 };
      tipoCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      const marcaCell = excelRow.getCell(3);
      marcaCell.value = normalizeText(row.marca) || '-';
      marcaCell.font = { name: 'Arial', size: 11 };
      marcaCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      const descripcionCell = excelRow.getCell(4);
      descripcionCell.value = buildProductoExportDescripcion(row);
      descripcionCell.font = { name: 'Arial', size: 11 };
      descripcionCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      const imagenCell = excelRow.getCell(5);
      imagenCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      const proveedorCell = excelRow.getCell(6);
      proveedorCell.value = normalizeText(row.proveedor) || '-';
      proveedorCell.font = { name: 'Arial', size: 11 };
      proveedorCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      const precioVentaCell = excelRow.getCell(7);
      precioVentaCell.value = Number(row.precio_venta || 0);
      precioVentaCell.font = { name: 'Arial', size: 12, bold: true };
      precioVentaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      precioVentaCell.numFmt = '"S/" #,##0.00';

      applyWorksheetCellBorder(excelRow);

      const imageSource = getExcelImageSource(row.imagen_ruta);
      if (imageSource) {
        const imagePlacement = getExcelImagePlacement({
          columnIndex: 4,
          rowIndex: rowNumber - 1,
          columnWidth: sheet.getColumn(5).width,
          rowHeight: excelRow.height,
          imageWidth: imageSource.width,
          imageHeight: imageSource.height
        });
        const imageId = workbook.addImage({
          buffer: imageSource.buffer,
          extension: imageSource.extension
        });
        if (imagePlacement) {
          sheet.addImage(imageId, imagePlacement);
        } else {
          imagenCell.value = 'Sin imagen';
          imagenCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF6B7280' } };
        }
      } else {
        imagenCell.value = row.imagen_ruta ? 'Imagen no compatible' : 'Sin imagen';
        imagenCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF6B7280' } };
      }
    });
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
