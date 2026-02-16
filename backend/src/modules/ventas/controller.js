const pool = require('../../core/config/database');
const { ExcelJS, addSheetFromObjects, workbookToBuffer } = require('../../shared/utils/excel');
const { isNonEmptyString, isNonNegative, isPositiveInt, validateDocumento, toNumber } = require('../../shared/utils/validation');
const { syncUbicacionPrincipal } = require('../../shared/utils/ubicaciones');

const formatDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const isDuplicateKeyError = (error) => error?.code === 'ER_DUP_ENTRY';

const mapVentaRow = (row) => ({
  id: row.id,
  vendedorId: row.usuario_id,
  vendedorNombre: row.vendedor_nombre || null,
  documentoTipo: row.documento_tipo,
  documento: row.documento,
  clienteNombre: row.cliente_nombre,
  clienteTelefono: row.cliente_telefono,
  agencia: row.agencia,
  agenciaOtro: row.agencia_otro,
  destino: row.destino,
  fechaVenta: formatDate(row.fecha_venta) || formatDate(row.created_at),
  estadoEnvio: row.estado_envio,
  estadoPedido: row.estado_pedido,
  fechaDespacho: formatDate(row.fecha_despacho),
  fechaCancelacion: formatDate(row.fecha_cancelacion),
  adelanto: Number(row.adelanto || 0),
  pVenta: Number(row.p_venta || 0),
  rastreoEstado: row.rastreo_estado,
  ticket: row.ticket,
  guia: row.guia,
  retiro: row.retiro,
  notas: row.notas,
  createdAt: row.created_at
});

const mapDetalleRow = (row) => ({
  id: row.id,
  tipo: row.tipo,
  codigo: row.codigo,
  descripcion: row.descripcion,
  marca: row.marca,
  cantidad: Number(row.cantidad || 0),
  cantidadPicked: Number(row.cantidad_picked || 0),
  precioVenta: Number(row.precio_venta || 0),
  precioCompra: Number(row.precio_compra || 0),
  proveedor: row.proveedor,
  stock: row.stock === null ? null : Number(row.stock || 0)
});

const buildDetalleRows = (ventaId, items, tipo) =>
  (items || []).map((item) => ({
    venta_id: ventaId,
    tipo,
    codigo: item.codigo || null,
    descripcion: item.descripcion || null,
    marca: item.marca || null,
    cantidad: Number(item.cantidad || 0),
    // La cantidad pickeada se controla exclusivamente en el flujo de picking.
    cantidad_picked: 0,
    precio_venta: Number(item.precioVenta || item.precio_venta || 0),
    precio_compra: Number(item.precioCompra || item.precio_compra || 0),
    proveedor: item.proveedor || null,
    stock: item.stock === null || item.stock === undefined ? null : Number(item.stock || 0)
  }));

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const releaseConnection = (connection) => {
  if (!connection) return;
  try {
    connection.release();
  } catch (_) {
    // no-op
  }
};

const rollbackSilently = async (connection) => {
  if (!connection) return;
  try {
    await connection.rollback();
  } catch (_) {
    // no-op
  }
};


const validarDetalleItems = (items, label) => {
  for (const item of items || []) {
    const cantidad = Number(item.cantidad || 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return `${label}: cantidad invalida`;
    }
    const precioCompra = toNumber(item.precioCompra ?? item.precio_compra ?? 0) ?? 0;
    const precioVenta = toNumber(item.precioVenta ?? item.precio_venta ?? 0) ?? 0;
    if (!isNonNegative(precioCompra) || !isNonNegative(precioVenta)) {
      return `${label}: precios invalidos`;
    }
    if (item.codigo && !isNonEmptyString(String(item.codigo))) {
      return `${label}: codigo invalido`;
    }
    if (item.descripcion && !isNonEmptyString(String(item.descripcion))) {
      return `${label}: descripcion invalida`;
    }
  }
  return null;
};
const normalizarTexto = (value) => String(value || '').trim();
const normalizarClave = (value) =>
  normalizarTexto(value)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

const obtenerTipoRequerimientoId = async (connection) => {
  const nombre = 'REQUERIMIENTO';
  const [rows] = await connection.execute(
    'SELECT id FROM tipos_maquinas WHERE nombre = ? LIMIT 1',
    [nombre]
  );
  if (rows.length) {
    return rows[0].id;
  }
  try {
    const [result] = await connection.execute(
      'INSERT INTO tipos_maquinas (nombre, descripcion) VALUES (?, ?)',
      [nombre, 'Generado automaticamente para requerimientos de venta']
    );
    return result.insertId;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const [retry] = await connection.execute(
        'SELECT id FROM tipos_maquinas WHERE nombre = ? LIMIT 1',
        [nombre]
      );
      if (retry.length) {
        return retry[0].id;
      }
    }
    throw error;
  }
};

const generarCodigoRequerimiento = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT MAX(CAST(SUBSTRING(codigo, 4) AS UNSIGNED)) AS max_codigo FROM maquinas WHERE codigo REGEXP '^REQ[0-9]+'"
  );
  const next = (rows?.[0]?.max_codigo || 0) + 1;
  return `REQ${String(next).padStart(4, '0')}`;
};

const buscarProductoPorCodigo = async (connection, codigo) => {
  const [rows] = await connection.execute(
    'SELECT id, codigo, marca, descripcion, activo FROM maquinas WHERE codigo = ? LIMIT 1',
    [codigo]
  );
  return rows[0] || null;
};

const buscarProductoPorClave = async (connection, clave) => {
  const normalizada = normalizarClave(clave);
  if (!normalizada) return null;
  const [rows] = await connection.execute(
    `
      SELECT id, codigo, marca, descripcion, activo
      FROM maquinas
      WHERE codigo_busqueda = ?
         OR descripcion_busqueda = ?
      LIMIT 1
    `,
    [normalizada, normalizada]
  );
  return rows[0] || null;
};

const buscarProductoRequerimiento = async (connection, item) => {
  const codigo = normalizarTexto(item.codigo);
  const descripcion = normalizarTexto(item.descripcion);
  if (codigo) {
    const porCodigo = await buscarProductoPorClave(connection, codigo);
    if (porCodigo) return porCodigo;
  }
  if (descripcion) {
    const porDescripcion = await buscarProductoPorClave(connection, descripcion);
    if (porDescripcion) return porDescripcion;
  }
  return null;
};

const crearProductoDesdeRequerimiento = async (connection, item) => {
  const tipoId = await obtenerTipoRequerimientoId(connection);
  const codigoPreferido = normalizarTexto(item.codigo);
  const descripcion = normalizarTexto(item.descripcion) || 'Requerimiento';
  const marca = normalizarTexto(item.marca) || 'REQUERIMIENTO';
  const precioCompra = Number(item.precioCompra || item.precio_compra || 0);
  const precioVenta = Number(item.precioVenta || item.precio_venta || 0);
  const precioMinimo = Number(item.precioMinimo || item.precio_minimo || precioVenta || 0);
  const descripcionBusqueda = normalizarClave(descripcion);
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const codigo = codigoPreferido || (await generarCodigoRequerimiento(connection));
    const codigoBusqueda = normalizarClave(codigo);
    try {
      const [result] = await connection.execute(
        `INSERT INTO maquinas
          (codigo, tipo_maquina_id, marca, descripcion, codigo_busqueda, descripcion_busqueda,
           ubicacion_letra, ubicacion_numero, stock, precio_compra, precio_venta, precio_minimo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          tipoId,
          marca,
          descripcion,
          codigoBusqueda,
          descripcionBusqueda,
          null,
          null,
          0,
          precioCompra,
          precioVenta,
          precioMinimo
        ]
      );
      return { id: result.insertId, codigo, marca, descripcion };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      if (codigoPreferido) {
        const existente = await buscarProductoPorCodigo(connection, codigoPreferido);
        if (existente) {
          return {
            id: existente.id,
            codigo: existente.codigo,
            marca: existente.marca || marca,
            descripcion: existente.descripcion || descripcion
          };
        }
        throw error;
      }

      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error('No se pudo generar codigo de requerimiento unico');
};

const buscarDetallePendientePorCodigo = async (connection, codigo, ventaId) => {
  const normalizada = normalizarClave(codigo);
  const codigoExacto = normalizarTexto(codigo);
  if (!normalizada && !codigoExacto) return null;

  const whereVentaId = ventaId ? ' AND d.venta_id = ?' : '';

  if (codigoExacto) {
    const exactParams = [codigoExacto];
    let exactQuery = `
      SELECT d.*, v.estado_pedido
      FROM ventas_detalle d
      JOIN ventas v ON d.venta_id = v.id
      WHERE d.tipo = 'producto'
        AND d.cantidad_picked < d.cantidad
        AND d.codigo = ?
    `;
    if (ventaId) {
      exactQuery += ' AND d.venta_id = ?';
      exactParams.push(ventaId);
    }
    exactQuery += ' ORDER BY v.created_at ASC, d.id ASC LIMIT 1 FOR UPDATE';
    const [exactRows] = await connection.execute(exactQuery, exactParams);
    if (exactRows[0]) {
      return exactRows[0];
    }
  }

  if (!normalizada) return null;
  let query = `
    SELECT d.*, v.estado_pedido
    FROM ventas_detalle d
    JOIN ventas v ON d.venta_id = v.id
    WHERE d.tipo = 'producto'
      AND d.cantidad_picked < d.cantidad
      AND REPLACE(REPLACE(REPLACE(UPPER(d.codigo), ' ', ''), '-', ''), '/', '') = ?
      ${whereVentaId}
  `;
  const params = [normalizada];
  if (ventaId) {
    params.push(ventaId);
  }
  query += ' ORDER BY v.created_at ASC, d.id ASC LIMIT 1 FOR UPDATE';
  const [rows] = await connection.execute(query, params);
  return rows[0] || null;
};

const asegurarProductoRequerimiento = async (connection, item) => {
  if (item.producto_id) {
    return item;
  }
  const existente = await buscarProductoRequerimiento(connection, item);
  if (existente) {
    if (Number(existente.activo) === 0) {
      await connection.execute('UPDATE maquinas SET activo = TRUE WHERE id = ?', [existente.id]);
    }
    return {
      ...item,
      codigo: existente.codigo,
      marca: existente.marca || item.marca,
      descripcion: existente.descripcion || item.descripcion
    };
  }
  const creado = await crearProductoDesdeRequerimiento(connection, item);
  return { ...item, codigo: creado.codigo, marca: creado.marca, descripcion: creado.descripcion };
};

const prepararRequerimientos = async (connection, items) => {
  const result = [];
  for (const item of items || []) {
    if (!normalizarTexto(item.descripcion)) {
      result.push(item);
      continue;
    }
    const actualizado = await asegurarProductoRequerimiento(connection, item);
    result.push(actualizado);
  }
  return result;
};

exports.listarVentas = async (req, res) => {
  const { fecha_inicio, fecha_fin, limite = 200, pagina = 1, include_detalle } = req.query;
  const includeDetalle = !['0', 'false', 'no', 'off'].includes(
    String(include_detalle ?? 'true').toLowerCase()
  );
  let connection;
  try {
    connection = await pool.getConnection();
    let query = `
      SELECT v.*, u.nombre as vendedor_nombre
      FROM ventas v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha_inicio) {
      query += ' AND v.fecha_venta >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND v.fecha_venta <= ?';
      params.push(fecha_fin);
    }
    const limitValue = parsePositiveInt(limite, 200);
    const pageValue = parsePositiveInt(pagina, 1);
    const safeLimit = Math.min(limitValue, 500);
    const offset = (pageValue - 1) * safeLimit;
    query += ` ORDER BY v.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    const [rows] = await connection.execute(query, params);
    if (rows.length === 0) {
      return res.json([]);
    }
    if (!includeDetalle) {
      const ventas = rows.map((row) => ({
        ...mapVentaRow(row),
        detalleIncluido: false
      }));
      return res.json(ventas);
    }
    const ventaIds = rows.map((row) => row.id);
    const placeholders = ventaIds.map(() => '?').join(',');
    const [detalleRows] = await connection.execute(
      `SELECT * FROM ventas_detalle WHERE venta_id IN (${placeholders})`,
      ventaIds
    );

    const detallePorVenta = new Map();
    detalleRows.forEach((row) => {
      const mapped = mapDetalleRow(row);
      if (!detallePorVenta.has(row.venta_id)) {
        detallePorVenta.set(row.venta_id, []);
      }
      detallePorVenta.get(row.venta_id).push(mapped);
    });

    const ventas = rows.map((row) => {
      const venta = mapVentaRow(row);
      const detalles = detallePorVenta.get(row.id) || [];
      venta.productos = detalles.filter((item) => item.tipo === 'producto');
      venta.requerimientos = detalles.filter((item) => item.tipo === 'requerimiento');
      venta.regalos = detalles.filter((item) => item.tipo === 'regalo');
      venta.regaloRequerimientos = detalles.filter((item) => item.tipo === 'regalo_requerimiento');
      venta.detalleIncluido = true;
      return venta;
    });

    return res.json(ventas);
  } catch (error) {
    console.error('Error listando ventas:', error);
    return res.status(500).json({ error: 'Error al obtener ventas' });
  } finally {
    releaseConnection(connection);
  }
};

exports.obtenerVenta = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT v.*, u.nombre as vendedor_nombre
       FROM ventas v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    const [detalleRows] = await connection.execute(
      'SELECT * FROM ventas_detalle WHERE venta_id = ?',
      [req.params.id]
    );

    const venta = mapVentaRow(rows[0]);
    const detalles = detalleRows.map(mapDetalleRow);
    venta.productos = detalles.filter((item) => item.tipo === 'producto');
    venta.requerimientos = detalles.filter((item) => item.tipo === 'requerimiento');
    venta.regalos = detalles.filter((item) => item.tipo === 'regalo');
    venta.regaloRequerimientos = detalles.filter((item) => item.tipo === 'regalo_requerimiento');
    venta.detalleIncluido = true;
    return res.json(venta);
  } catch (error) {
    console.error('Error obteniendo venta:', error);
    return res.status(500).json({ error: 'Error al obtener venta' });
  } finally {
    releaseConnection(connection);
  }
};

exports.crearVenta = async (req, res) => {
  const usuarioId = req.usuario?.id;
  try {
    const {
      documentoTipo,
      documento,
      clienteNombre,
      clienteTelefono,
      agencia,
      agenciaOtro,
      destino,
      fechaVenta,
      estadoEnvio,
      fechaDespacho,
      fechaCancelacion,
      adelanto,
      pVenta,
      rastreoEstado,
      ticket,
      guia,
      retiro,
      notas,
      productos = [],
      requerimientos = [],
      regalos = [],
      regaloRequerimientos = []
    } = req.body;
    const productosList = parseArray(productos);
    const requerimientosList = parseArray(requerimientos);
    const regalosList = parseArray(regalos);
    const regalosReqList = parseArray(regaloRequerimientos);

    if (!validateDocumento(documentoTipo, documento)) {
      return res.status(400).json({ error: 'Documento invalido' });
    }
    if (fechaVenta && Number.isNaN(Date.parse(fechaVenta))) {
      return res.status(400).json({ error: 'Fecha de venta invalida' });
    }
    if (productosList.length + requerimientosList.length + regalosList.length + regalosReqList.length === 0) {
      return res.status(400).json({ error: 'Debe agregar productos o requerimientos a la venta' });
    }
    const errProd = validarDetalleItems(productosList, 'Productos');
    const errReq = validarDetalleItems(requerimientosList, 'Requerimientos');
    const errReg = validarDetalleItems(regalosList, 'Regalos');
    const errRegReq = validarDetalleItems(regalosReqList, 'Regalos requerimiento');
    const err = errProd || errReq || errReg || errRegReq;
    if (err) {
      return res.status(400).json({ error: err });
    }

    const estadoPedido = productosList.length > 0 ? 'PICKING' : 'PEDIDO_LISTO';
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [result] = await connection.execute(
        `INSERT INTO ventas
          (usuario_id, documento_tipo, documento, cliente_nombre, cliente_telefono, agencia, agencia_otro, destino,
           fecha_venta, estado_envio, estado_pedido, fecha_despacho, fecha_cancelacion, adelanto, p_venta,
           rastreo_estado, ticket, guia, retiro, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          usuarioId,
          documentoTipo,
          documento,
          clienteNombre,
          clienteTelefono,
          agencia,
          agenciaOtro,
          destino,
          fechaVenta,
          estadoEnvio,
          estadoPedido,
          fechaDespacho || null,
          fechaCancelacion || null,
          Number(adelanto || 0),
          Number(pVenta || 0),
          rastreoEstado,
          ticket,
          guia,
          retiro,
          notas
        ]
      );

      const ventaId = result.insertId;
      const requerimientosPreparados = await prepararRequerimientos(connection, requerimientosList);
      const regalosPreparados = await prepararRequerimientos(connection, regalosList);
      const regalosReqPreparados = await prepararRequerimientos(connection, regalosReqList);

      const detalleRows = [
        ...buildDetalleRows(ventaId, productosList, 'producto'),
        ...buildDetalleRows(ventaId, requerimientosPreparados, 'requerimiento'),
        ...buildDetalleRows(ventaId, regalosPreparados, 'regalo'),
        ...buildDetalleRows(ventaId, regalosReqPreparados, 'regalo_requerimiento')
      ];

      if (detalleRows.length) {
        const values = detalleRows.map((row) => [
          row.venta_id,
          row.tipo,
          row.codigo,
          row.descripcion,
          row.marca,
          row.cantidad,
          row.cantidad_picked || 0,
          row.precio_venta,
          row.precio_compra,
          row.proveedor,
          row.stock
        ]);
        const chunkSize = 500;
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize);
          await connection.query(
            `INSERT INTO ventas_detalle
            (venta_id, tipo, codigo, descripcion, marca, cantidad, cantidad_picked, precio_venta, precio_compra, proveedor, stock)
            VALUES ?`,
            [chunk]
          );
        }
      }

      await connection.commit();
      res.json({ ok: true, id: ventaId });
    } catch (innerError) {
      await connection.rollback();
      throw innerError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creando venta:', error);
    res.status(500).json({ error: 'Error al crear venta' });
  }
};

exports.editarVenta = async (req, res) => {
  try {
    const {
      documentoTipo,
      documento,
      clienteNombre,
      clienteTelefono,
      agencia,
      agenciaOtro,
      destino,
      fechaVenta,
      estadoEnvio,
      fechaDespacho,
      fechaCancelacion,
      adelanto,
      pVenta,
      rastreoEstado,
      ticket,
      guia,
      retiro,
      notas,
      productos = [],
      requerimientos = [],
      regalos = [],
      regaloRequerimientos = []
    } = req.body;
    const productosList = parseArray(productos);
    const requerimientosList = parseArray(requerimientos);
    const regalosList = parseArray(regalos);
    const regalosReqList = parseArray(regaloRequerimientos);

    if (!validateDocumento(documentoTipo, documento)) {
      return res.status(400).json({ error: 'Documento invalido' });
    }
    if (fechaVenta && Number.isNaN(Date.parse(fechaVenta))) {
      return res.status(400).json({ error: 'Fecha de venta invalida' });
    }
    if (productosList.length + requerimientosList.length + regalosList.length + regalosReqList.length === 0) {
      return res.status(400).json({ error: 'Debe agregar productos o requerimientos a la venta' });
    }
    const errProd = validarDetalleItems(productosList, 'Productos');
    const errReq = validarDetalleItems(requerimientosList, 'Requerimientos');
    const errReg = validarDetalleItems(regalosList, 'Regalos');
    const errRegReq = validarDetalleItems(regalosReqList, 'Regalos requerimiento');
    const err = errProd || errReq || errReg || errRegReq;
    if (err) {
      return res.status(400).json({ error: err });
    }

    const estadoPedido = productosList.length > 0 ? 'PICKING' : 'PEDIDO_LISTO';
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [ventaRows] = await connection.execute(
        'SELECT id, estado_envio FROM ventas WHERE id = ? FOR UPDATE',
        [req.params.id]
      );
      if (!ventaRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      if (['ENVIADO', 'CANCELADO'].includes(String(ventaRows[0].estado_envio || ''))) {
        await connection.rollback();
        return res.status(409).json({
          error: 'No se puede editar una venta enviada o cancelada.'
        });
      }

      const [pickedRows] = await connection.execute(
        `SELECT COALESCE(SUM(cantidad_picked), 0) AS total_picked
         FROM ventas_detalle
         WHERE venta_id = ? AND tipo = 'producto'`,
        [req.params.id]
      );
      const totalPicked = Number(pickedRows?.[0]?.total_picked || 0);
      if (totalPicked > 0) {
        await connection.rollback();
        return res.status(409).json({
          error: 'No se puede editar una venta con picking iniciado. Cree una nueva venta.'
        });
      }

      await connection.execute(
        `UPDATE ventas SET
          documento_tipo = ?, documento = ?, cliente_nombre = ?, cliente_telefono = ?,
          agencia = ?, agencia_otro = ?, destino = ?, fecha_venta = ?, estado_envio = ?,
          estado_pedido = ?, fecha_despacho = ?, fecha_cancelacion = ?, adelanto = ?, p_venta = ?,
          rastreo_estado = ?, ticket = ?, guia = ?, retiro = ?, notas = ?
         WHERE id = ?`,
        [
          documentoTipo,
          documento,
          clienteNombre,
          clienteTelefono,
          agencia,
          agenciaOtro,
          destino,
          fechaVenta,
          estadoEnvio,
          estadoPedido,
          fechaDespacho || null,
          fechaCancelacion || null,
          Number(adelanto || 0),
          Number(pVenta || 0),
          rastreoEstado,
          ticket,
          guia,
          retiro,
          notas,
          req.params.id
        ]
      );

      const requerimientosPreparados = await prepararRequerimientos(connection, requerimientosList);
      const regalosPreparados = await prepararRequerimientos(connection, regalosList);
      const regalosReqPreparados = await prepararRequerimientos(connection, regalosReqList);

      await connection.execute('DELETE FROM ventas_detalle WHERE venta_id = ?', [req.params.id]);

      const detalleRows = [
        ...buildDetalleRows(req.params.id, productosList, 'producto'),
        ...buildDetalleRows(req.params.id, requerimientosPreparados, 'requerimiento'),
        ...buildDetalleRows(req.params.id, regalosPreparados, 'regalo'),
        ...buildDetalleRows(req.params.id, regalosReqPreparados, 'regalo_requerimiento')
      ];

      if (detalleRows.length) {
        const values = detalleRows.map((row) => [
          row.venta_id,
          row.tipo,
          row.codigo,
          row.descripcion,
          row.marca,
          row.cantidad,
          row.cantidad_picked || 0,
          row.precio_venta,
          row.precio_compra,
          row.proveedor,
          row.stock
        ]);
        const chunkSize = 500;
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize);
          await connection.query(
            `INSERT INTO ventas_detalle
            (venta_id, tipo, codigo, descripcion, marca, cantidad, cantidad_picked, precio_venta, precio_compra, proveedor, stock)
            VALUES ?`,
            [chunk]
          );
        }
      }

      await connection.commit();
      res.json({ ok: true });
    } catch (innerError) {
      await connection.rollback();
      throw innerError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error editando venta:', error);
    res.status(500).json({ error: 'Error al editar venta' });
  }
};

exports.actualizarEstadoVenta = async (req, res) => {
  const { estadoEnvio, fechaDespacho, fechaCancelacion, rastreoEstado } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    if (['ENVIADO', 'CANCELADO'].includes(estadoEnvio)) {
      const [rows] = await connection.execute('SELECT estado_pedido FROM ventas WHERE id = ?', [
        req.params.id
      ]);
      const estadoPedido = rows[0]?.estado_pedido;
      if (estadoPedido && estadoPedido !== 'PEDIDO_LISTO') {
        return res.status(400).json({
          error: 'El pedido debe estar en PEDIDO_LISTO para enviar o cancelar.'
        });
      }
    }
    await connection.execute(
      `UPDATE ventas
       SET estado_envio = ?,
           fecha_despacho = ?,
           fecha_cancelacion = ?,
           rastreo_estado = ?
       WHERE id = ?`,
      [
        estadoEnvio,
        fechaDespacho || null,
        fechaCancelacion || null,
        rastreoEstado || null,
        req.params.id
      ]
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error actualizando estado de venta:', error);
    return res.status(500).json({ error: 'Error al actualizar estado' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizarEnvioVenta = async (req, res) => {
  const { ticket, guia, retiro, rastreoEstado } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(
      `UPDATE ventas
       SET ticket = ?, guia = ?, retiro = ?, rastreo_estado = ?
       WHERE id = ?`,
      [ticket || null, guia || null, retiro || null, rastreoEstado || null, req.params.id]
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error actualizando envio:', error);
    return res.status(500).json({ error: 'Error al actualizar envio' });
  } finally {
    releaseConnection(connection);
  }
};

exports.eliminarVenta = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [ventaRows] = await connection.execute(
      'SELECT id, estado_envio FROM ventas WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (!ventaRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    if (['ENVIADO', 'CANCELADO'].includes(String(ventaRows[0].estado_envio || ''))) {
      await connection.rollback();
      return res.status(409).json({
        error: 'No se puede eliminar una venta enviada o cancelada.'
      });
    }

    const [pickedRows] = await connection.execute(
      `SELECT COALESCE(SUM(cantidad_picked), 0) AS total_picked
       FROM ventas_detalle
       WHERE venta_id = ? AND tipo = 'producto'`,
      [req.params.id]
    );
    const totalPicked = Number(pickedRows?.[0]?.total_picked || 0);
    if (totalPicked > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'No se puede eliminar una venta con picking iniciado.'
      });
    }

    await connection.execute('DELETE FROM ventas WHERE id = ?', [req.params.id]);
    await connection.commit();
    return res.json({ ok: true });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error eliminando venta:', error);
    return res.status(500).json({ error: 'Error al eliminar venta' });
  } finally {
    releaseConnection(connection);
  }
};

exports.listarDetalleVentas = async (req, res) => {
  const { venta_id, q, tipo } = req.query;
  let connection;
  try {
    connection = await pool.getConnection();
    let query = `
      SELECT d.*, v.fecha_venta, v.created_at, v.usuario_id
      FROM ventas_detalle d
      JOIN ventas v ON d.venta_id = v.id
      WHERE 1=1
    `;
    const params = [];
    if (venta_id) {
      query += ' AND d.venta_id = ?';
      params.push(venta_id);
    }
    if (tipo) {
      query += ' AND d.tipo = ?';
      params.push(tipo);
    }
    if (q) {
      query += ' AND (d.codigo LIKE ? OR d.descripcion LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    query += ' ORDER BY v.created_at DESC, d.id DESC LIMIT 500';
    const [rows] = await connection.execute(query, params);
    return res.json(
      rows.map((row) => ({
        ventaId: row.venta_id,
        tipo: row.tipo,
        codigo: row.codigo,
        descripcion: row.descripcion,
        marca: row.marca,
        cantidad: Number(row.cantidad || 0),
        precioVenta: Number(row.precio_venta || 0),
        precioCompra: Number(row.precio_compra || 0),
        proveedor: row.proveedor,
        fechaVenta: formatDate(row.fecha_venta) || formatDate(row.created_at)
      }))
    );
  } catch (error) {
    console.error('Error listando detalle ventas:', error);
    return res.status(500).json({ error: 'Error al obtener detalle' });
  } finally {
    releaseConnection(connection);
  }
};

exports.historialRequerimientos = async (req, res) => {
  const { q = '' } = req.query;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `
      SELECT d.codigo, d.descripcion, d.proveedor, d.precio_compra, d.precio_venta
      FROM ventas_detalle d
      WHERE d.tipo IN ('requerimiento','regalo_requerimiento')
        AND (d.codigo LIKE ? OR d.descripcion LIKE ?)
      ORDER BY d.id DESC
      LIMIT 20
      `,
      [`%${q}%`, `%${q}%`]
    );
    return res.json(
      rows.map((row) => ({
        codigo: row.codigo,
        descripcion: row.descripcion,
        proveedor: row.proveedor,
        precioCompra: Number(row.precio_compra || 0),
        precioVenta: Number(row.precio_venta || 0)
      }))
    );
  } catch (error) {
    console.error('Error historial requerimientos:', error);
    return res.status(500).json({ error: 'Error al obtener historial' });
  } finally {
    releaseConnection(connection);
  }
};

exports.listarRequerimientosPendientes = async (req, res) => {
  const { q, limite = 200, pagina = 1 } = req.query;
  let connection;
  try {
    connection = await pool.getConnection();
    let query = `
      SELECT d.*, v.cliente_nombre, v.documento, v.fecha_venta, v.created_at, v.estado_envio
      FROM ventas_detalle d
      JOIN ventas v ON d.venta_id = v.id
      WHERE d.tipo IN ('requerimiento','regalo_requerimiento')
        AND (d.proveedor IS NULL OR d.proveedor = '' OR d.precio_compra IS NULL OR d.precio_compra = 0)
    `;
    const params = [];
    if (q) {
      query += ' AND (d.codigo LIKE ? OR d.descripcion LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    const limitValue = parsePositiveInt(limite, 200);
    const pageValue = parsePositiveInt(pagina, 1);
    const safeLimit = Math.min(limitValue, 500);
    const offset = (pageValue - 1) * safeLimit;
    query += ` ORDER BY v.created_at DESC, d.id DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    const [rows] = await connection.execute(query, params);
    return res.json(
      rows.map((row) => ({
        id: row.id,
        ventaId: row.venta_id,
        tipo: row.tipo,
        codigo: row.codigo,
        descripcion: row.descripcion,
        cantidad: Number(row.cantidad || 0),
        precioCompra: Number(row.precio_compra || 0),
        precioVenta: Number(row.precio_venta || 0),
        proveedor: row.proveedor || '',
        cliente: row.cliente_nombre || '',
        documento: row.documento || '',
        fechaVenta: formatDate(row.fecha_venta) || formatDate(row.created_at),
        estadoEnvio: row.estado_envio
      }))
    );
  } catch (error) {
    console.error('Error listando requerimientos pendientes:', error);
    return res.status(500).json({ error: 'Error al obtener requerimientos pendientes' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizarRequerimiento = async (req, res) => {
  const { proveedor, precioCompra, precioVenta } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(
      `UPDATE ventas_detalle
       SET proveedor = ?, precio_compra = ?, precio_venta = ?
       WHERE id = ?`,
      [
        proveedor || null,
        Number(precioCompra || 0),
        Number(precioVenta || 0),
        req.params.id
      ]
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error actualizando requerimiento:', error);
    return res.status(500).json({ error: 'Error al actualizar requerimiento' });
  } finally {
    releaseConnection(connection);
  }
};

exports.crearRequerimientoProducto = async (req, res) => {
  const {
    descripcion,
    codigo,
    marca,
    precioCompra,
    precioVenta,
    precioMinimo
  } = req.body || {};
  const descripcionTxt = normalizarTexto(descripcion);
  const codigoTxt = normalizarTexto(codigo);
  if (!descripcionTxt && !codigoTxt) {
    return res.status(400).json({ error: 'Debe ingresar descripcion o codigo.' });
  }
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const existente = await buscarProductoRequerimiento(connection, {
        descripcion: descripcionTxt,
        codigo: codigoTxt
      });
      if (existente) {
        if (Number(existente.activo) === 0) {
          await connection.execute('UPDATE maquinas SET activo = TRUE WHERE id = ?', [existente.id]);
        }
        await connection.commit();
        return res.json({
          ok: true,
          id: existente.id,
          codigo: existente.codigo,
          marca: existente.marca,
          descripcion: existente.descripcion,
          existente: true
        });
      }

      const creado = await crearProductoDesdeRequerimiento(connection, {
        descripcion: descripcionTxt,
        codigo: codigoTxt,
        marca,
        precioCompra,
        precioVenta,
        precioMinimo
      });
      await connection.commit();
      return res.json({
        ok: true,
        id: creado.id,
        codigo: creado.codigo,
        marca: creado.marca,
        descripcion: creado.descripcion,
        existente: false
      });
    } catch (innerError) {
      await connection.rollback();
      throw innerError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creando requerimiento producto:', error);
    res.status(500).json({ error: 'Error al crear producto de requerimiento' });
  }
};

exports.exportarVentas = async (req, res) => {
  const { fecha_inicio, fecha_fin, limite = 5000 } = req.query;
  let connection;
  try {
    connection = await pool.getConnection();
    let query = `
      SELECT v.*, u.nombre as vendedor_nombre
      FROM ventas v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha_inicio) {
      query += ' AND v.fecha_venta >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND v.fecha_venta <= ?';
      params.push(fecha_fin);
    }
    const limiteValue = parsePositiveInt(limite, 5000);
    const safeLimit = Math.min(limiteValue, 20000);
    query += ` ORDER BY v.created_at DESC LIMIT ${safeLimit}`;
    const [ventasRows] = await connection.execute(query, params);
    if (ventasRows.length === 0) {
      const workbook = new ExcelJS.Workbook();
      addSheetFromObjects(workbook, 'Ventas', []);
      const buffer = await workbookToBuffer(workbook);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="ventas.xlsx"');
      return res.send(buffer);
    }
    const ventaIds = ventasRows.map((row) => row.id);
    const placeholders = ventaIds.map(() => '?').join(',');
    const [detalleRows] = await connection.execute(
      `SELECT * FROM ventas_detalle WHERE venta_id IN (${placeholders})`,
      ventaIds
    );

    const ventasData = ventasRows.map((row) => ({
      id: row.id,
      cliente: row.cliente_nombre,
      documento: row.documento,
      telefono: row.cliente_telefono,
      vendedor: row.vendedor_nombre,
      agencia: row.agencia,
      agencia_otro: row.agencia_otro,
      destino: row.destino,
      fecha: formatDate(row.fecha_venta) || formatDate(row.created_at),
      estado: row.estado_envio,
      fecha_despacho: formatDate(row.fecha_despacho),
      fecha_cancelacion: formatDate(row.fecha_cancelacion),
      total: Number(row.p_venta || 0),
      adelanto: Number(row.adelanto || 0),
      rastreo_estado: row.rastreo_estado,
      ticket: row.ticket,
      guia: row.guia,
      retiro: row.retiro,
      notas: row.notas || ''
    }));

    const detalleData = detalleRows.map((row) => ({
      venta_id: row.venta_id,
      tipo: row.tipo,
      codigo: row.codigo,
      descripcion: row.descripcion,
      cantidad: Number(row.cantidad || 0),
      precio_venta: Number(row.precio_venta || 0),
      precio_compra: Number(row.precio_compra || 0),
      proveedor: row.proveedor || ''
    }));

    const workbook = new ExcelJS.Workbook();
    addSheetFromObjects(workbook, 'Ventas', ventasData);
    addSheetFromObjects(workbook, 'Detalle', detalleData);
    const buffer = await workbookToBuffer(workbook);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="ventas.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error('Error exportando ventas:', error);
    return res.status(500).json({ error: 'Error al exportar ventas' });
  } finally {
    releaseConnection(connection);
  }
};

exports.listarPickingPendientes = async (req, res) => {
  const { codigo, venta_id } = req.query;
  let connection;
  try {
    connection = await pool.getConnection();
    let query = `
      SELECT 
        d.id as detalle_id, d.venta_id, d.codigo, d.descripcion, d.marca,
        d.cantidad, d.cantidad_picked,
        v.cliente_nombre, v.documento, v.agencia, v.agencia_otro, v.destino,
        v.fecha_venta, v.created_at, v.estado_pedido,
        m.id as maquina_id, m.stock
      FROM ventas_detalle d
      JOIN ventas v ON d.venta_id = v.id
      LEFT JOIN maquinas m ON d.codigo = m.codigo
      WHERE d.tipo = 'producto'
        AND d.cantidad_picked < d.cantidad
    `;
    const params = [];
    if (codigo) {
      query += ' AND d.codigo = ?';
      params.push(codigo);
    }
    if (venta_id) {
      query += ' AND d.venta_id = ?';
      params.push(venta_id);
    }
    query += ' ORDER BY v.created_at ASC, d.id ASC';
    const [rows] = await connection.execute(query, params);

    const ventasMap = new Map();
    rows.forEach((row) => {
      if (!ventasMap.has(row.venta_id)) {
        ventasMap.set(row.venta_id, {
          ventaId: row.venta_id,
          clienteNombre: row.cliente_nombre,
          documento: row.documento,
          agencia: row.agencia,
          agenciaOtro: row.agencia_otro,
          destino: row.destino,
          fechaVenta: formatDate(row.fecha_venta) || formatDate(row.created_at),
          estadoPedido: row.estado_pedido,
          items: []
        });
      }
      const venta = ventasMap.get(row.venta_id);
      venta.items.push({
        detalleId: row.detalle_id,
        codigo: row.codigo,
        descripcion: row.descripcion,
        marca: row.marca,
        cantidad: Number(row.cantidad || 0),
        cantidadPicked: Number(row.cantidad_picked || 0),
        pendiente: Number(row.cantidad || 0) - Number(row.cantidad_picked || 0),
        maquinaId: row.maquina_id,
        stock: row.stock === null ? null : Number(row.stock || 0)
      });
    });

    return res.json(Array.from(ventasMap.values()));
  } catch (error) {
    console.error('Error listando picking pendientes:', error);
    return res.status(500).json({ error: 'Error al obtener picking pendientes' });
  } finally {
    releaseConnection(connection);
  }
};

exports.confirmarPicking = async (req, res) => {
  const { detalleId, cantidad, codigo, ventaId } = req.body;
  const usuarioId = req.usuario?.id;
  if ((!detalleId && !codigo) || !cantidad) {
    return res.status(400).json({ error: 'detalleId o codigo son obligatorios.' });
  }
  const cantidadNum = Number(cantidad);
  if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
    return res.status(400).json({ error: 'Cantidad invalida.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let detalle = null;
    if (detalleId) {
      const [detalleRows] = await connection.execute(
        `SELECT d.*, v.estado_pedido
         FROM ventas_detalle d
         JOIN ventas v ON d.venta_id = v.id
         WHERE d.id = ? FOR UPDATE`,
        [detalleId]
      );
      detalle = detalleRows[0] || null;
    }
    if (!detalle && codigo) {
      detalle = await buscarDetallePendientePorCodigo(connection, codigo, ventaId);
    }
    if (!detalle) {
      await connection.rollback();
      return res.status(404).json({ error: 'Detalle no encontrado.' });
    }
    if (detalle.tipo !== 'producto') {
      await connection.rollback();
      return res.status(400).json({ error: 'Solo se puede pickear productos.' });
    }
    const pendiente = Number(detalle.cantidad || 0) - Number(detalle.cantidad_picked || 0);
    if (cantidadNum > pendiente) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cantidad supera lo pendiente.' });
    }

    const [maquinas] = await connection.execute(
      'SELECT id, stock, ubicacion_letra, ubicacion_numero FROM maquinas WHERE codigo = ? FOR UPDATE',
      [detalle.codigo]
    );
    if (maquinas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Producto no encontrado en maquinas.' });
    }
    const maquina = maquinas[0];
    if (Number(maquina.stock || 0) < cantidadNum) {
      await connection.rollback();
      return res.status(400).json({ error: 'Stock insuficiente para salida.' });
    }

    await connection.execute(
      `INSERT INTO ingresos_salidas (maquina_id, usuario_id, tipo, cantidad, motivo)
       VALUES (?, ?, 'salida', ?, ?)`,
      [maquina.id, usuarioId, cantidadNum, `Picking venta #${detalle.venta_id}`]
    );

    const nuevoStock = Number(maquina.stock || 0) - cantidadNum;
    await connection.execute('UPDATE maquinas SET stock = stock - ? WHERE id = ?', [
      cantidadNum,
      maquina.id
    ]);
    await syncUbicacionPrincipal(connection, {
      id: maquina.id,
      ubicacion_letra: maquina.ubicacion_letra,
      ubicacion_numero: maquina.ubicacion_numero,
      stock: nuevoStock
    });

    const detalleTargetId = detalleId || detalle.id;
    await connection.execute(
      'UPDATE ventas_detalle SET cantidad_picked = cantidad_picked + ? WHERE id = ?',
      [cantidadNum, detalleTargetId]
    );

    const [pendientes] = await connection.execute(
      `SELECT COUNT(*) as total
       FROM ventas_detalle
       WHERE venta_id = ? AND tipo = 'producto' AND cantidad_picked < cantidad`,
      [detalle.venta_id]
    );
    if (pendientes[0]?.total === 0) {
      await connection.execute(`UPDATE ventas SET estado_pedido = 'PEDIDO_LISTO' WHERE id = ?`, [
        detalle.venta_id
      ]);
    }

    await connection.commit();
    return res.json({ ok: true });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error confirmando picking:', error);
    return res.status(500).json({ error: 'Error al confirmar picking' });
  } finally {
    releaseConnection(connection);
  }
};

exports.cerrarPedido = async (req, res) => {
  const { ventaId } = req.body;
  if (!ventaId) {
    return res.status(400).json({ error: 'ventaId es obligatorio.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [pendientes] = await connection.execute(
      `SELECT COUNT(*) as total
       FROM ventas_detalle
       WHERE venta_id = ? AND tipo = 'producto' AND cantidad_picked < cantidad`,
      [ventaId]
    );

    if (pendientes[0]?.total > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Aun hay productos pendientes de picking.' });
    }

    await connection.execute(`UPDATE ventas SET estado_pedido = 'PEDIDO_LISTO' WHERE id = ?`, [
      ventaId
    ]);

    await connection.commit();
    return res.json({ ok: true });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error cerrando pedido:', error);
    return res.status(500).json({ error: 'Error al cerrar pedido' });
  } finally {
    releaseConnection(connection);
  }
};
