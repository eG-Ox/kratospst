const pool = require('../../core/config/database');
const path = require('path');
const fs = require('fs');
const { ExcelJS, addSheetFromObjects, workbookToBuffer, readFirstSheetToJson } = require('../../shared/utils/excel');
const { registrarHistorial } = require('../../shared/utils/historial');
const { isNonNegative, toNumber } = require('../../shared/utils/validation');
const { tienePermiso } = require('../../core/middleware/auth');
const { syncUbicacionPrincipal } = require('../../shared/utils/ubicaciones');

const normalizarHeader = (header) =>
  String(header || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const normalizarBusqueda = (value) =>
  String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

const parseNumero = (value, fallback = 0) => {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const parseNumeroNullable = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const UBICACION_VALIDAS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const MAX_PRODUCTOS_LIST_LIMIT = 500;

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

const validarFichaWeb = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { value: null };
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    return { error: 'ficha_web invalida. Debe iniciar con http:// o https://' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { error: 'ficha_web invalida. Solo se permite http/https' };
  }
  return { value: parsed.toString() };
};

// Obtener todas las máquinas
exports.getMaquinas = async (req, res) => {
  let connection;
  try {
    const { q, tipo, marca, stock, minimo, page, limit } = req.query;
    const hasQuery =
      q !== undefined ||
      tipo !== undefined ||
      marca !== undefined ||
      stock !== undefined ||
      minimo !== undefined ||
      page !== undefined ||
      limit !== undefined;

    const where = ['m.activo = TRUE'];
    const params = [];

    if (tipo) {
      where.push('m.tipo_maquina_id = ?');
      params.push(tipo);
    }
    if (marca) {
      where.push('m.marca = ?');
      params.push(marca);
    }
    if (stock === 'bajo') {
      const limiteStock = Number(minimo);
      where.push('m.stock <= ?');
      params.push(Number.isFinite(limiteStock) ? limiteStock : 2);
    } else if (stock === 'sin') {
      where.push('m.stock <= 0');
    }
    const qText = String(q || '').trim();
    if (qText) {
      const normalized = normalizarBusqueda(qText);
      const clauses = [];
      if (normalized) {
        clauses.push('m.codigo_busqueda LIKE ?');
        params.push(`%${normalized}%`);
        clauses.push('m.descripcion_busqueda LIKE ?');
        params.push(`%${normalized}%`);
      }
      clauses.push('UPPER(m.marca) LIKE ?');
      params.push(`%${qText.toUpperCase()}%`);
      where.push(`(${clauses.join(' OR ')})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql = 'ORDER BY m.codigo';

    let query = `
      SELECT m.*, t.nombre as tipo_nombre
      FROM maquinas m
      JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id
      ${whereSql}
      ${orderSql}
    `;

    let total = null;
    let pageValue = null;
    let limitValue = null;

    if (hasQuery) {
      limitValue = Math.min(parsePositiveInt(limit, 200), MAX_PRODUCTOS_LIST_LIMIT);
      pageValue = parsePositiveInt(page, 1);
      const offset = (pageValue - 1) * limitValue;
      query += ` LIMIT ${offset}, ${limitValue}`;
    }

    connection = await pool.getConnection();
    const [maquinas] = await connection.execute(query, params);

    if (hasQuery) {
      const [totalRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM maquinas m ${whereSql}`,
        params
      );
      total = totalRows?.[0]?.total || 0;
    }
    connection.release();
    connection = null;

    let sanitized = maquinas;
    if (!tienePermiso(req, 'productos.precio_compra.ver')) {
      sanitized = maquinas.map((item) => ({ ...item, precio_compra: null }));
    }

    if (hasQuery) {
      return res.json({
        items: sanitized,
        total: total || 0,
        page: pageValue,
        limit: limitValue
      });
    }

    res.json(sanitized);
  } catch (error) {
    if (connection) {
      connection.release();
    }
    console.error('Error obteniendo maquinas:', error);
    res.status(500).json({ error: 'Error al obtener maquinas' });
  }
};

// Obtener una máquina por ID
exports.getMaquina = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [maquina] = await connection.execute(
      'SELECT m.*, t.nombre as tipo_nombre FROM maquinas m JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id WHERE m.id = ?',
      [req.params.id]
    );
    connection.release();
    connection = null;

    if (maquina.length === 0) {
      return res.status(404).json({ error: 'Maquina no encontrada' });
    }

    if (!tienePermiso(req, 'productos.precio_compra.ver')) {
      return res.json({ ...maquina[0], precio_compra: null });
    }
    res.json(maquina[0]);
  } catch (error) {
    if (connection) {
      connection.release();
      connection = null;
    }
    console.error('Error obteniendo maquina:', error);
    res.status(500).json({ error: 'Error al obtener maquina' });
  }
};

// Obtener ubicaciones con stock de un producto
exports.obtenerUbicaciones = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT ubicacion_letra, ubicacion_numero, stock
       FROM maquinas_ubicaciones
       WHERE producto_id = ? AND stock > 0
       ORDER BY stock DESC, ubicacion_letra, ubicacion_numero`,
      [req.params.id]
    );
    if (rows.length === 0) {
      const [fallbackRows] = await connection.execute(
        `SELECT ubicacion_letra, ubicacion_numero, stock
         FROM maquinas
         WHERE id = ? AND activo = TRUE`,
        [req.params.id]
      );
      const fallback = fallbackRows[0];
      if (fallback?.ubicacion_letra && fallback?.ubicacion_numero && Number(fallback.stock || 0) > 0) {
        rows.push({
          ubicacion_letra: fallback.ubicacion_letra,
          ubicacion_numero: fallback.ubicacion_numero,
          stock: Number(fallback.stock || 0)
        });
      }
    }
    connection.release();
    connection = null;
    res.json(rows);
  } catch (error) {
    if (connection) {
      connection.release();
      connection = null;
    }
    console.error('Error obteniendo ubicaciones:', error);
    res.status(500).json({ error: 'Error al obtener ubicaciones' });
  }
};

// Obtener una maquina por codigo
exports.getMaquinaPorCodigo = async (req, res) => {
  const codigo = String(req.params.codigo || '').trim();
  if (!codigo) {
    return res.status(400).json({ error: 'Codigo requerido' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [maquina] = await connection.execute(
      'SELECT m.*, t.nombre as tipo_nombre FROM maquinas m JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id WHERE m.codigo = ? AND m.activo = TRUE',
      [codigo]
    );
    connection.release();
    connection = null;

    if (maquina.length === 0) {
      return res.status(404).json({ error: 'Maquina no encontrada' });
    }

    if (!tienePermiso(req, 'productos.precio_compra.ver')) {
      return res.json({ ...maquina[0], precio_compra: null });
    }
    res.json(maquina[0]);
  } catch (error) {
    if (connection) {
      connection.release();
      connection = null;
    }
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
      error: 'Campos requeridos: codigo, tipo de maquina, marca, precio de compra y precio de venta'
    });
  }
  const precioCompraNum = toNumber(precio_compra);
  const precioVentaNum = toNumber(precio_venta);
  const precioMinimoNum = toNumber(precio_minimo) ?? 0;
  const stockNum = toNumber(stock);
  const stockValue = stockNum ?? 0;

  if (!isNonNegative(precioCompraNum) || !isNonNegative(precioVentaNum)) {
    return res.status(400).json({ error: 'Precio de compra/venta invalido' });
  }
  if (!isNonNegative(stockValue)) {
    return res.status(400).json({ error: 'Stock invalido' });
  }
  if (precioCompraNum > precioVentaNum) {
    return res.status(400).json({ error: 'Precio de compra no puede ser mayor que precio de venta' });
  }
  if (precioMinimoNum > precioVentaNum) {
    return res.status(400).json({ error: 'Precio minimo no puede ser mayor que precio de venta' });
  }
  const fichaWebValidation = validarFichaWeb(ficha_web);
  if (fichaWebValidation.error) {
    return res.status(400).json({ error: fichaWebValidation.error });
  }
  const fichaWebValue = fichaWebValidation.value;

  const codigoBusqueda = normalizarBusqueda(codigo);
  const descripcionBusqueda = normalizarBusqueda(descripcion);

  let connection;
  try {
    const ubicacionParse = normalizarUbicacion({
      ubicacion,
      ubicacion_letra,
      ubicacion_numero
    });
    if (ubicacionParse.error) {
      return res.status(400).json({ error: ubicacionParse.error });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar que el tipo de maquina existe
    const [tipo] = await connection.execute(
      'SELECT id FROM tipos_maquinas WHERE id = ?',
      [tipo_maquina_id]
    );

    if (tipo.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(400).json({ error: 'El tipo de maquina no existe' });
    }

    const [existente] = await connection.execute(
      'SELECT * FROM maquinas WHERE codigo = ? LIMIT 1',
      [codigo]
    );

    let ficha_tecnica_ruta = null;
    if (req.file) {
      ficha_tecnica_ruta = req.file.filename;
    }

    if (existente.length && existente[0].activo === 0) {
      await connection.execute(
        `UPDATE maquinas
         SET tipo_maquina_id = ?, marca = ?, descripcion = ?, codigo_busqueda = ?, descripcion_busqueda = ?, ubicacion_letra = ?, ubicacion_numero = ?,
             stock = ?, precio_compra = ?, precio_venta = ?, precio_minimo = ?, ficha_web = ?, ficha_tecnica_ruta = ?,
             activo = TRUE
         WHERE id = ?`,
        [
          tipo_maquina_id,
          marca,
          descripcion || null,
          codigoBusqueda,
          descripcionBusqueda,
          ubicacionParse.letra,
          ubicacionParse.numero,
          stockValue,
           precioCompraNum,
           precioVentaNum,
           precioMinimoNum,
           fichaWebValue,
           ficha_tecnica_ruta || existente[0].ficha_tecnica_ruta,
           existente[0].id
         ]
      );
      await syncUbicacionPrincipal(connection, {
        id: existente[0].id,
        ubicacion_letra: ubicacionParse.letra,
        ubicacion_numero: ubicacionParse.numero,
        stock: stockValue
      });
      await registrarHistorial(connection, {
        entidad: 'productos',
        entidad_id: existente[0].id,
        usuario_id: req.usuario?.id,
        accion: 'reactivar',
        descripcion: `Producto reactivado (${codigo})`,
        antes: existente[0],
        despues: {
          ...existente[0],
          tipo_maquina_id,
          marca,
          descripcion: descripcion || null,
          ubicacion_letra: ubicacionParse.letra,
          ubicacion_numero: ubicacionParse.numero,
          stock: stockValue,
           precio_compra: precioCompraNum,
           precio_venta: precioVentaNum,
           precio_minimo: precioMinimoNum,
           ficha_web: fichaWebValue,
           ficha_tecnica_ruta: ficha_tecnica_ruta || existente[0].ficha_tecnica_ruta,
           activo: 1
         }
      });
      await connection.commit();
      connection.release();
      connection = null;
      return res.status(200).json({
        id: existente[0].id,
        codigo,
        tipo_maquina_id,
        marca,
        descripcion,
        ubicacion_letra: ubicacionParse.letra,
        ubicacion_numero: ubicacionParse.numero,
         stock: stockValue,
         precio_compra: precioCompraNum,
         precio_venta: precioVentaNum,
         precio_minimo: precioMinimoNum,
         ficha_web: fichaWebValue,
         ficha_tecnica_ruta: ficha_tecnica_ruta || existente[0].ficha_tecnica_ruta,
         activo: 1
       });
    }

    const [result] = await connection.execute(
      `INSERT INTO maquinas 
       (codigo, tipo_maquina_id, marca, descripcion, codigo_busqueda, descripcion_busqueda,
        ubicacion_letra, ubicacion_numero, stock, precio_compra, precio_venta, precio_minimo,
        ficha_web, ficha_tecnica_ruta, activo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        codigo,
        tipo_maquina_id,
        marca,
        descripcion || null,
        codigoBusqueda,
        descripcionBusqueda,
        ubicacionParse.letra,
        ubicacionParse.numero,
        stockValue,
        precioCompraNum,
        precioVentaNum,
        precioMinimoNum,
        fichaWebValue,
        ficha_tecnica_ruta
      ]
    );
    await syncUbicacionPrincipal(connection, {
      id: result.insertId,
      ubicacion_letra: ubicacionParse.letra,
      ubicacion_numero: ubicacionParse.numero,
      stock: stockValue
    });
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
        stock: stockValue,
        precio_compra: precioCompraNum,
        precio_venta: precioVentaNum,
        precio_minimo: precioMinimoNum
      }
    });
    await connection.commit();
    connection.release();
    connection = null;

    res.status(201).json({
      id: result.insertId,
      codigo,
      tipo_maquina_id,
      marca,
      descripcion,
      ubicacion_letra: ubicacionParse.letra,
      ubicacion_numero: ubicacionParse.numero,
      stock: stockValue,
      precio_compra: precioCompraNum,
      precio_venta: precioVentaNum,
      precio_minimo: precioMinimoNum,
      ficha_web: fichaWebValue,
      ficha_tecnica_ruta
    });
  } catch (error) {
    console.error('Error creando maquina:', error);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
      connection.release();
      connection = null;
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El codigo de maquina ya existe' });
    }
    res.status(500).json({ error: 'Error al crear maquina' });
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

  if (!codigo || !tipo_maquina_id || !marca) {
    return res.status(400).json({ error: 'Campos requeridos: codigo, tipo de maquina, marca' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Obtener la maquina actual
    const [maquinaActual] = await connection.execute(
      'SELECT * FROM maquinas WHERE id = ?',
      [req.params.id]
    );

    if (maquinaActual.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ error: 'Maquina no encontrada' });
    }

    const precioCompraInput =
      precio_compra === undefined || precio_compra === null || precio_compra === ''
        ? maquinaActual[0].precio_compra
        : precio_compra;
    const precioVentaInput =
      precio_venta === undefined || precio_venta === null || precio_venta === ''
        ? maquinaActual[0].precio_venta
        : precio_venta;
    const precioMinimoInput =
      precio_minimo === undefined || precio_minimo === null || precio_minimo === ''
        ? maquinaActual[0].precio_minimo
        : precio_minimo;

    const stockInputPresent = Object.prototype.hasOwnProperty.call(req.body, 'stock');
    const stockInput =
      !stockInputPresent || stock === undefined || stock === null || stock === ''
        ? maquinaActual[0].stock
        : stock;

    const precioCompraNum = toNumber(precioCompraInput);
    const precioVentaNum = toNumber(precioVentaInput);
    const precioMinimoNum = toNumber(precioMinimoInput) ?? 0;
    const stockNum = toNumber(stockInput);
    const codigoBusqueda = normalizarBusqueda(codigo);
    const descripcionBusqueda = normalizarBusqueda(descripcion);
    const fichaWebInputPresent = Object.prototype.hasOwnProperty.call(req.body, 'ficha_web');

    if (!isNonNegative(precioCompraNum) || !isNonNegative(precioVentaNum)) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(400).json({ error: 'Precio de compra/venta invalido' });
    }
    if (!isNonNegative(stockNum)) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(400).json({ error: 'Stock invalido' });
    }
    if (precioCompraNum > precioVentaNum) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res
        .status(400)
        .json({ error: 'Precio de compra no puede ser mayor que precio de venta' });
    }
    if (precioMinimoNum > precioVentaNum) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res
        .status(400)
        .json({ error: 'Precio minimo no puede ser mayor que precio de venta' });
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
        await connection.rollback();
        connection.release();
        connection = null;
        return res.status(400).json({ error: parsed.error });
      }
      ubicacionParse = { letra: parsed.letra, numero: parsed.numero };
    }

    let ficha_tecnica_ruta = maquinaActual[0].ficha_tecnica_ruta;
    let fichaWebValue = maquinaActual[0].ficha_web ?? null;
    if (fichaWebInputPresent) {
      const fichaWebValidation = validarFichaWeb(ficha_web);
      if (fichaWebValidation.error) {
        await connection.rollback();
        connection.release();
        connection = null;
        return res.status(400).json({ error: fichaWebValidation.error });
      }
      fichaWebValue = fichaWebValidation.value;
    }

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
       SET codigo = ?, tipo_maquina_id = ?, marca = ?, descripcion = ?, codigo_busqueda = ?, descripcion_busqueda = ?,
           ubicacion_letra = ?, ubicacion_numero = ?, stock = ?, precio_compra = ?, precio_venta = ?, precio_minimo = ?, 
           ficha_web = ?, ficha_tecnica_ruta = ?
       WHERE id = ?`,
      [
        codigo,
        tipo_maquina_id,
        marca,
        descripcion || null,
        codigoBusqueda,
        descripcionBusqueda,
        ubicacionParse.letra,
        ubicacionParse.numero,
        stockNum,
        precioCompraNum,
        precioVentaNum,
        precioMinimoNum,
        fichaWebValue,
        ficha_tecnica_ruta,
        req.params.id
      ]
    );
    await syncUbicacionPrincipal(connection, {
      id: req.params.id,
      ubicacion_letra: ubicacionParse.letra,
      ubicacion_numero: ubicacionParse.numero,
      stock: stockNum
    });
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
        stock: stockNum,
        precio_compra: precioCompraNum,
        precio_venta: precioVentaNum,
        precio_minimo: precioMinimoNum
      }
    });
    await connection.commit();
    connection.release();
    connection = null;

    res.json({
      id: req.params.id,
      codigo,
      tipo_maquina_id,
      marca,
      descripcion,
      ubicacion_letra: ubicacionParse.letra,
      ubicacion_numero: ubicacionParse.numero,
      stock: stockNum,
      precio_compra: precioCompraNum,
      precio_venta: precioVentaNum,
      precio_minimo: precioMinimoNum,
      ficha_web: fichaWebValue,
      ficha_tecnica_ruta
    });
  } catch (error) {
    console.error('Error actualizando maquina:', error);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
      connection.release();
      connection = null;
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El codigo de maquina ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar maquina' });
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
    const workbook = new ExcelJS.Workbook();
    const headers = [
        'codigo',
        'tipo_maquina',
        'marca',
        'descripcion',
        'ubicacion',
        'stock',
        'precio_compra',
        'precio_venta',
        'precio_minimo'
      ];
    addSheetFromObjects(workbook, 'Plantilla', data, headers);
    const buffer = await workbookToBuffer(workbook);
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
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT m.codigo, t.nombre as tipo_maquina, m.marca, m.descripcion,
        m.ubicacion_letra, m.ubicacion_numero,
        m.stock, m.precio_compra, m.precio_venta, m.precio_minimo
      FROM maquinas m
      JOIN tipos_maquinas t ON m.tipo_maquina_id = t.id
      WHERE m.activo = TRUE
      ORDER BY m.codigo
    `);
    connection.release();
    connection = null;
    const puedeVerPrecioCompra = tienePermiso(req, 'productos.precio_compra.ver');

    const data = rows.map((row) => ({
      codigo: row.codigo,
      tipo_maquina: row.tipo_maquina,
      marca: row.marca,
      descripcion: row.descripcion,
      ubicacion: row.ubicacion_letra ? `${row.ubicacion_letra}${row.ubicacion_numero || ''}` : '',
      stock: row.stock,
      precio_compra: puedeVerPrecioCompra ? row.precio_compra : null,
      precio_venta: row.precio_venta,
      precio_minimo: row.precio_minimo
    }));
    const workbook = new ExcelJS.Workbook();
    addSheetFromObjects(workbook, 'Productos', data);
    const buffer = await workbookToBuffer(workbook);
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
    if (connection) {
      connection.release();
      connection = null;
    }
    console.error('Error exportando productos:', error);
    res.status(500).json({ error: 'Error al exportar productos' });
  }
};

exports.exportarStockMinimo = async (req, res) => {
  const limite = Number(req.query.minimo || 2);
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `
      SELECT m.codigo, m.descripcion, m.marca, m.stock, m.precio_venta
      FROM maquinas m
      WHERE m.activo = TRUE AND m.stock <= ?
      ORDER BY m.stock ASC, m.codigo
      `,
      [Number.isFinite(limite) ? limite : 2]
    );
    connection.release();
    connection = null;

    const data = rows.map((row) => ({
      codigo: row.codigo,
      descripcion: row.descripcion,
      marca: row.marca,
      stock: row.stock,
      precio_venta: row.precio_venta
    }));
    const workbook = new ExcelJS.Workbook();
    addSheetFromObjects(workbook, 'Stock_minimo', data);
    const buffer = await workbookToBuffer(workbook);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="stock_minimo.xlsx"');
    res.send(buffer);
  } catch (error) {
    if (connection) {
      connection.release();
      connection = null;
    }
    console.error('Error exportando stock minimo:', error);
    res.status(500).json({ error: 'Error al exportar stock minimo' });
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
    await connection.beginTransaction();

    const [tipos] = await connection.execute('SELECT id, nombre FROM tipos_maquinas');
    const tiposMap = new Map(
      tipos.map((tipo) => [String(tipo.nombre || '').toLowerCase(), tipo.id])
    );

    const [existentes] = await connection.execute('SELECT id, codigo, activo FROM maquinas');
    const existentesMap = new Map(
      existentes.map((item) => [String(item.codigo || '').toLowerCase(), item])
    );

    const errores = [];
    const duplicados = [];
    const codigosProcesados = new Set();
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
      const codigoKey = codigo.toLowerCase();
      if (codigosProcesados.has(codigoKey)) {
        duplicados.push(codigo);
        continue;
      }
      codigosProcesados.add(codigoKey);

      const existente = existentesMap.get(codigoKey);
      if (existente && existente.activo !== 0) {
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
      const precioCompraRaw = normalized.preciocompra;
      const precioVentaRaw = normalized.precioventa;
      const precioCompra = parseNumeroNullable(precioCompraRaw);
      const precioVenta = parseNumeroNullable(precioVentaRaw);
      if (!marca || precioCompra === null || precioVenta === null) {
        errores.push(`Fila ${index + 2}: faltan campos requeridos`);
        continue;
      }
      if (!isNonNegative(precioCompra) || !isNonNegative(precioVenta)) {
        errores.push(`Fila ${index + 2}: precios invalidos`);
        continue;
      }
      if (precioCompra > precioVenta) {
        errores.push(
          `Fila ${index + 2}: precio de compra no puede ser mayor que precio de venta`
        );
        continue;
      }

      const descripcion = String(normalized.descripcion || '').trim();
      const codigoBusqueda = normalizarBusqueda(codigo);
      const descripcionBusqueda = normalizarBusqueda(descripcion);
      const stockRaw = parseNumeroNullable(normalized.stock);
      const stock = stockRaw === null ? 0 : stockRaw;
      const precioMinimoRaw = parseNumeroNullable(normalized.preciominimo);
      const precioMinimo = precioMinimoRaw === null ? 0 : precioMinimoRaw;
      if (!isNonNegative(stock)) {
        errores.push(`Fila ${index + 2}: stock invalido`);
        continue;
      }
      if (!isNonNegative(precioMinimo)) {
        errores.push(`Fila ${index + 2}: precio minimo invalido`);
        continue;
      }
      if (precioMinimo > precioVenta) {
        errores.push(`Fila ${index + 2}: precio minimo no puede ser mayor que precio de venta`);
        continue;
      }
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

      if (existente && existente.activo === 0) {
        await connection.execute(
          `UPDATE maquinas
           SET tipo_maquina_id = ?, marca = ?, descripcion = ?, codigo_busqueda = ?, descripcion_busqueda = ?, ubicacion_letra = ?, ubicacion_numero = ?,
               stock = ?, precio_compra = ?, precio_venta = ?, precio_minimo = ?, activo = TRUE
           WHERE id = ?`,
          [
            tipoId,
            marca,
            descripcion || null,
            codigoBusqueda,
            descripcionBusqueda,
            ubicacionParse.letra,
            ubicacionParse.numero,
            stock,
            precioCompra,
            precioVenta,
            precioMinimo,
            existente.id
          ]
        );
        await syncUbicacionPrincipal(connection, {
          id: existente.id,
          ubicacion_letra: ubicacionParse.letra,
          ubicacion_numero: ubicacionParse.numero,
          stock
        });
        insertados += 1;
        existentesMap.set(codigoKey, { ...existente, activo: 1 });
        continue;
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO maquinas
        (codigo, tipo_maquina_id, marca, descripcion, codigo_busqueda, descripcion_busqueda, ubicacion_letra, ubicacion_numero, stock, precio_compra,
         precio_venta, precio_minimo, ficha_web, ficha_tecnica_ruta, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          codigo,
          tipoId,
          marca,
          descripcion || null,
          codigoBusqueda,
          descripcionBusqueda,
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
      await syncUbicacionPrincipal(connection, {
        id: insertResult.insertId,
        ubicacion_letra: ubicacionParse.letra,
        ubicacion_numero: ubicacionParse.numero,
        stock
      });
      insertados += 1;
      existentesMap.set(codigoKey, { id: insertResult.insertId, codigo, activo: 1 });
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

    await connection.commit();
    connection.release();
    connection = null;
    fs.unlink(req.file.path, () => {});

    res.json({ insertados, duplicados, errores });
  } catch (error) {
    console.error('Error importando productos:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
      connection.release();
      connection = null;
    }
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Error al importar productos' });
  }
};

// Eliminar máquina
exports.eliminarMaquina = async (req, res) => {
  let connection;
  const ejecutarConReintentos = async (fn, { retries = 3, baseDelayMs = 250 } = {}) => {
    let intento = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (error?.code !== 'ER_LOCK_WAIT_TIMEOUT' || intento >= retries) {
          throw error;
        }
        const espera = baseDelayMs * Math.pow(2, intento);
        await new Promise((resolve) => setTimeout(resolve, espera));
        intento += 1;
      }
    }
  };

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Obtener la maquina
    const [maquina] = await connection.execute(
      'SELECT * FROM maquinas WHERE id = ? FOR UPDATE',
      [req.params.id]
    );

    if (maquina.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Maquina no encontrada' });
    }

    await ejecutarConReintentos(
      () =>
        connection.execute(
          'UPDATE maquinas SET activo = FALSE WHERE id = ?',
          [req.params.id]
        ),
      { retries: 3, baseDelayMs: 200 }
    );
    await registrarHistorial(connection, {
      entidad: 'productos',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'desactivar',
      descripcion: `Producto desactivado (${req.params.id})`,
      antes: maquina[0] || null,
      despues: null
    });
    await connection.commit();
    return res.json({ mensaje: 'Maquina desactivada exitosamente' });
  } catch (error) {
    console.error('Error eliminando maquina:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }
    return res.status(500).json({ error: 'Error al eliminar maquina' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Descargar ficha técnica
exports.descargarFichaTecnica = async (req, res) => {
  try {
    const { filename } = req.params;
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const rutaArchivo = path.resolve(uploadsDir, filename);

    if (!rutaArchivo.startsWith(`${uploadsDir}${path.sep}`)) {
      return res.status(400).json({ error: 'Ruta de archivo invalida' });
    }
    if (!fs.existsSync(rutaArchivo)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.download(rutaArchivo);
  } catch (error) {
    console.error('Error descargando ficha tecnica:', error);
    res.status(500).json({ error: 'Error al descargar ficha tecnica' });
  }
};


