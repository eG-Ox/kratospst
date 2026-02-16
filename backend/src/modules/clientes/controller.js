const https = require('https');
const pool = require('../../core/config/database');
const { registrarHistorial } = require('../../shared/utils/historial');
const { isEmail, normalizeString } = require('../../shared/utils/validation');

const DNI_REGEX = /^\d{8}$/;
const RUC_REGEX = /^\d{11}$/;
const CE_REGEX = /^\d{9}$/;
const PHONE_REGEX = /^[0-9+\s-]{6,20}$/;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Timeout en consulta externa'));
    });
  });

const buildClienteFromRow = (row) => ({
  id: row.id,
  tipo_cliente: row.tipo_cliente,
  dni: row.dni,
  ruc: row.ruc,
  nombre: row.nombre,
  apellido: row.apellido,
  razon_social: row.razon_social,
  direccion: row.direccion,
  telefono: row.telefono,
  correo: row.correo,
  fecha_creacion: row.fecha_creacion,
  fecha_actualizacion: row.fecha_actualizacion
});

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

exports.getClientes = async (req, res) => {
  const { tipo, documento, search } = req.query;

  try {
    const connection = await pool.getConnection();
    let query = 'SELECT c.* FROM clientes c';
    const params = [];

    if (req.usuario?.rol !== 'admin') {
      query += ' LEFT JOIN clientes_usuarios cu ON cu.cliente_id = c.id';
    }

    query += ' WHERE 1=1';
    if (tipo) {
      query += ' AND c.tipo_cliente = ?';
      params.push(tipo);
    }

    if (documento) {
      query += ' AND (c.dni = ? OR c.ruc = ?)';
      params.push(documento, documento);
    }

    if (search) {
      query += ' AND (c.nombre LIKE ? OR c.apellido LIKE ? OR c.razon_social LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (req.usuario?.rol !== 'admin') {
      query += ' AND (c.usuario_id = ? OR cu.usuario_id = ?)';
      params.push(req.usuario.id, req.usuario.id);
    }

    const limiteValue = parsePositiveInt(req.query.limite, 5000);
    const paginaValue = parsePositiveInt(req.query.pagina, 1);
    const safeLimit = Math.min(limiteValue, 20000);
    const offset = (paginaValue - 1) * safeLimit;
    query += ` ORDER BY c.fecha_creacion DESC LIMIT ${offset}, ${safeLimit}`;
    const [rows] = await connection.execute(query, params);
    connection.release();

    res.json(rows.map(buildClienteFromRow));
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

exports.getCliente = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (req.usuario?.rol !== 'admin') {
      const cliente = rows[0];
      const connection2 = await pool.getConnection();
      const [rel] = await connection2.execute(
        'SELECT id FROM clientes_usuarios WHERE cliente_id = ? AND usuario_id = ?',
        [cliente.id, req.usuario.id]
      );
      connection2.release();
      if (cliente.usuario_id !== req.usuario.id && !rel.length) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
    }

    res.json(buildClienteFromRow(rows[0]));
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

exports.crearCliente = async (req, res) => {
  const {
    tipo_cliente,
    dni,
    ruc,
    nombre,
    apellido,
    razon_social,
    direccion,
    telefono,
    correo
  } = req.body;

  if (!['natural', 'juridico', 'ce'].includes(tipo_cliente)) {
    return res.status(400).json({ error: 'Tipo de cliente invalido' });
  }

  if (tipo_cliente === 'natural') {
    if (!DNI_REGEX.test(String(dni || ''))) {
      return res.status(400).json({ error: 'DNI debe tener 8 digitos' });
    }
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }
  }

  if (tipo_cliente === 'ce') {
    if (!CE_REGEX.test(String(dni || ''))) {
      return res.status(400).json({ error: 'Carnet de extranjeria debe tener 9 digitos' });
    }
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }
  }

  if (tipo_cliente === 'juridico') {
    if (!RUC_REGEX.test(String(ruc || ''))) {
      return res.status(400).json({ error: 'RUC debe tener 11 digitos' });
    }
    if (!razon_social) {
      return res.status(400).json({ error: 'Razon social es requerida' });
    }
  }

  if (correo && !isEmail(String(correo))) {
    return res.status(400).json({ error: 'Correo invalido' });
  }
  if (telefono && !PHONE_REGEX.test(String(telefono))) {
    return res.status(400).json({ error: 'Telefono invalido' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const docValue = tipo_cliente === 'juridico' ? normalizeString(ruc) : normalizeString(dni);
    if (docValue) {
      const [existentes] = await connection.execute(
        'SELECT * FROM clientes WHERE dni = ? OR ruc = ? LIMIT 1',
        [docValue, docValue]
      );
      if (existentes.length) {
        const clienteExistente = existentes[0];
        let vendedorNombre = null;
        if (clienteExistente.usuario_id) {
          const [usuarios] = await connection.execute('SELECT nombre FROM usuarios WHERE id = ?', [
            clienteExistente.usuario_id
          ]);
          vendedorNombre = usuarios?.[0]?.nombre || null;
        }
        if (req.usuario?.id) {
          await connection.execute(
            'INSERT IGNORE INTO clientes_usuarios (cliente_id, usuario_id) VALUES (?, ?)',
            [clienteExistente.id, req.usuario.id]
          );
        }
        await connection.commit();
        return res.status(200).json({
          id: clienteExistente.id,
          usuario_id: clienteExistente.usuario_id,
          tipo_cliente: clienteExistente.tipo_cliente,
          dni: clienteExistente.dni,
          ruc: clienteExistente.ruc,
          nombre: clienteExistente.nombre,
          apellido: clienteExistente.apellido,
          razon_social: clienteExistente.razon_social,
          direccion: clienteExistente.direccion,
          telefono: clienteExistente.telefono,
          correo: clienteExistente.correo,
          ya_existia: true,
          compartido: true,
          vendedor_nombre: vendedorNombre
        });
      }
    }

    const [result] = await connection.execute(
      `INSERT INTO clientes
        (usuario_id, tipo_cliente, dni, ruc, nombre, apellido, razon_social, direccion, telefono, correo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.usuario?.id || null,
        tipo_cliente,
        tipo_cliente === 'natural' || tipo_cliente === 'ce' ? normalizeString(dni) : null,
        tipo_cliente === 'juridico' ? normalizeString(ruc) : null,
        tipo_cliente === 'natural' || tipo_cliente === 'ce' ? normalizeString(nombre) : null,
        tipo_cliente === 'natural' || tipo_cliente === 'ce' ? normalizeString(apellido) : null,
        tipo_cliente === 'juridico' ? normalizeString(razon_social) : null,
        normalizeString(direccion) || null,
        normalizeString(telefono) || null,
        normalizeString(correo) || null
      ]
    );
    if (req.usuario?.id) {
      await connection.execute(
        'INSERT IGNORE INTO clientes_usuarios (cliente_id, usuario_id) VALUES (?, ?)',
        [result.insertId, req.usuario.id]
      );
    }

    await registrarHistorial(connection, {
      entidad: 'clientes',
      entidad_id: result.insertId,
      usuario_id: req.usuario?.id,
      accion: 'crear',
      descripcion: `Cliente creado (${tipo_cliente})`,
      antes: null,
      despues: {
        id: result.insertId,
        usuario_id: req.usuario?.id || null,
        tipo_cliente,
        dni: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? dni : null,
        ruc: tipo_cliente === 'juridico' ? ruc : null,
        nombre: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? nombre : null,
        apellido: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? apellido : null,
        razon_social: tipo_cliente === 'juridico' ? razon_social : null,
        direccion: direccion || null,
        telefono: telefono || null,
        correo: correo || null
      }
    });

    await connection.commit();
    return res.status(201).json({
      id: result.insertId,
      usuario_id: req.usuario?.id || null,
      tipo_cliente,
      dni: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? dni : null,
      ruc: tipo_cliente === 'juridico' ? ruc : null,
      nombre: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? nombre : null,
      apellido: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? apellido : null,
      razon_social: tipo_cliente === 'juridico' ? razon_social : null,
      direccion: direccion || null,
      telefono: telefono || null,
      correo: correo || null
    });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error creando cliente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'DNI o RUC ya existe' });
    }
    return res.status(500).json({ error: 'Error al crear cliente' });
  } finally {
    releaseConnection(connection);
  }
};

exports.actualizarCliente = async (req, res) => {
  const {
    tipo_cliente,
    dni,
    ruc,
    nombre,
    apellido,
    razon_social,
    direccion,
    telefono,
    correo
  } = req.body;

  if (!['natural', 'juridico', 'ce'].includes(tipo_cliente)) {
    return res.status(400).json({ error: 'Tipo de cliente invalido' });
  }

  if (tipo_cliente === 'natural') {
    if (!DNI_REGEX.test(String(dni || ''))) {
      return res.status(400).json({ error: 'DNI debe tener 8 digitos' });
    }
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }
  }

  if (tipo_cliente === 'ce') {
    if (!CE_REGEX.test(String(dni || ''))) {
      return res.status(400).json({ error: 'Carnet de extranjeria debe tener 9 digitos' });
    }
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }
  }

  if (tipo_cliente === 'juridico') {
    if (!RUC_REGEX.test(String(ruc || ''))) {
      return res.status(400).json({ error: 'RUC debe tener 11 digitos' });
    }
    if (!razon_social) {
      return res.status(400).json({ error: 'Razon social es requerida' });
    }
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (req.usuario?.rol !== 'admin') {
      const [rel] = await connection.execute(
        'SELECT id FROM clientes_usuarios WHERE cliente_id = ? AND usuario_id = ?',
        [req.params.id, req.usuario.id]
      );
      if (existing[0].usuario_id !== req.usuario.id && !rel.length) {
        await rollbackSilently(connection);
        return res.status(403).json({ error: 'Acceso denegado' });
      }
    }

    await connection.execute(
      `UPDATE clientes
       SET tipo_cliente = ?, dni = ?, ruc = ?, nombre = ?, apellido = ?, razon_social = ?,
           direccion = ?, telefono = ?, correo = ?
       WHERE id = ?`,
      [
        tipo_cliente,
        tipo_cliente === 'natural' || tipo_cliente === 'ce' ? normalizeString(dni) : null,
        tipo_cliente === 'juridico' ? normalizeString(ruc) : null,
        tipo_cliente === 'natural' || tipo_cliente === 'ce' ? normalizeString(nombre) : null,
        tipo_cliente === 'natural' || tipo_cliente === 'ce' ? normalizeString(apellido) : null,
        tipo_cliente === 'juridico' ? normalizeString(razon_social) : null,
        normalizeString(direccion) || null,
        normalizeString(telefono) || null,
        normalizeString(correo) || null,
        req.params.id
      ]
    );
    await registrarHistorial(connection, {
      entidad: 'clientes',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'editar',
      descripcion: `Cliente actualizado (${req.params.id})`,
      antes: existing[0],
      despues: {
        id: req.params.id,
        usuario_id: existing[0].usuario_id,
        tipo_cliente,
        dni: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? dni : null,
        ruc: tipo_cliente === 'juridico' ? ruc : null,
        nombre: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? nombre : null,
        apellido: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? apellido : null,
        razon_social: tipo_cliente === 'juridico' ? razon_social : null,
        direccion: direccion || null,
        telefono: telefono || null,
        correo: correo || null
      }
    });

    await connection.commit();
    return res.json({
      id: req.params.id,
      tipo_cliente,
      dni: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? dni : null,
      ruc: tipo_cliente === 'juridico' ? ruc : null,
      nombre: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? nombre : null,
      apellido: tipo_cliente === 'natural' || tipo_cliente === 'ce' ? apellido : null,
      razon_social: tipo_cliente === 'juridico' ? razon_social : null,
      direccion: direccion || null,
      telefono: telefono || null,
      correo: correo || null
    });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error actualizando cliente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'DNI o RUC ya existe' });
    }
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  } finally {
    releaseConnection(connection);
  }
};

exports.eliminarCliente = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!existing.length) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (req.usuario?.rol !== 'admin') {
      await connection.execute(
        'DELETE FROM clientes_usuarios WHERE cliente_id = ? AND usuario_id = ?',
        [req.params.id, req.usuario.id]
      );
      await connection.commit();
      return res.json({ mensaje: 'Cliente removido de tu cartera' });
    }

    const [result] = await connection.execute('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      await rollbackSilently(connection);
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await registrarHistorial(connection, {
      entidad: 'clientes',
      entidad_id: req.params.id,
      usuario_id: req.usuario?.id,
      accion: 'eliminar',
      descripcion: `Cliente eliminado (${req.params.id})`,
      antes: existing[0],
      despues: null
    });

    await connection.commit();
    return res.json({ mensaje: 'Cliente eliminado exitosamente' });
  } catch (error) {
    await rollbackSilently(connection);
    console.error('Error eliminando cliente:', error);
    return res.status(500).json({ error: 'Error al eliminar cliente' });
  } finally {
    releaseConnection(connection);
  }
};

exports.consultaDni = async (req, res) => {
  const { dni } = req.params;

  if (!DNI_REGEX.test(String(dni || ''))) {
    return res.status(400).json({ success: false, error: 'DNI invalido' });
  }

  try {
    const url =
      'https://ww1.sunat.gob.pe/ol-ti-itfisdenreg/itfisdenreg.htm?accion=obtenerDatosDni&numDocumento=' +
      dni;
    const data = await fetchJson(url);

    if (data && data.message === 'success' && Array.isArray(data.lista) && data.lista.length) {
      const nombresapellidos = data.lista[0].nombresapellidos || '';
      const partes = nombresapellidos.split(',');
      const apellido = partes[0] ? partes[0].trim() : '';
      const nombre = partes[1] ? partes[1].trim() : '';
      return res.json({ success: true, nombre, apellido });
    }

    return res.json({
      success: false,
      error: 'No se encontraron datos para el DNI ingresado'
    });
  } catch (error) {
    console.error('Error en consulta DNI:', error);
    return res.status(500).json({ success: false, error: 'Error consultando DNI' });
  }
};

exports.consultaRuc = async (req, res) => {
  const { ruc } = req.params;

  if (!RUC_REGEX.test(String(ruc || ''))) {
    return res.status(400).json({ success: false, error: 'RUC invalido' });
  }

  try {
    const url =
      'https://ww1.sunat.gob.pe/ol-ti-itfisdenreg/itfisdenreg.htm?accion=obtenerDatosRuc&nroRuc=' +
      ruc;
    const data = await fetchJson(url);

    if (data && data.message === 'success' && Array.isArray(data.lista) && data.lista.length) {
      const info = data.lista[0];
      const razon_social = (info.apenomdenunciado || '').trim();
      const direccion = (info.direstablecimiento || '').trim();
      const distrito = (info.desdistrito || '').trim();
      const provincia = (info.desprovincia || '').trim();
      const departamento = (info.desdepartamento || '').trim();

      let direccion_completa = direccion;
      if (distrito || provincia || departamento) {
        direccion_completa = `${direccion}${direccion ? ' - ' : ''}${distrito}${
          distrito ? ' - ' : ''
        }${provincia}${provincia ? ' - ' : ''}${departamento}`;
      }

      return res.json({
        success: true,
        razon_social,
        direccion: direccion_completa
      });
    }

    return res.json({
      success: false,
      error: 'No se encontraron datos para este RUC'
    });
  } catch (error) {
    console.error('Error en consulta RUC:', error);
    return res.status(500).json({ success: false, error: 'Error consultando RUC' });
  }
};
