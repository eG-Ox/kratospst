const https = require('https');
const pool = require('../../core/config/database');

const DNI_REGEX = /^\d{8}$/;
const RUC_REGEX = /^\d{11}$/;

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

exports.getClientes = async (req, res) => {
  const { tipo, documento, search } = req.query;

  try {
    const connection = await pool.getConnection();
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params = [];

    if (req.usuario?.rol !== 'admin') {
      query += ' AND usuario_id = ?';
      params.push(req.usuario.id);
    }

    if (tipo) {
      query += ' AND tipo_cliente = ?';
      params.push(tipo);
    }

    if (documento) {
      query += ' AND (dni = ? OR ruc = ?)';
      params.push(documento, documento);
    }

    if (search) {
      query += ' AND (nombre LIKE ? OR apellido LIKE ? OR razon_social LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY fecha_creacion DESC';
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

    if (req.usuario?.rol !== 'admin' && rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
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

  if (!['natural', 'juridico'].includes(tipo_cliente)) {
    return res.status(400).json({ error: 'Tipo de cliente debe ser natural o juridico' });
  }

  if (tipo_cliente === 'natural') {
    if (!DNI_REGEX.test(String(dni || ''))) {
      return res.status(400).json({ error: 'DNI debe tener 8 digitos' });
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

  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO clientes
        (usuario_id, tipo_cliente, dni, ruc, nombre, apellido, razon_social, direccion, telefono, correo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.usuario?.id || null,
        tipo_cliente,
        tipo_cliente === 'natural' ? dni : null,
        tipo_cliente === 'juridico' ? ruc : null,
        tipo_cliente === 'natural' ? nombre : null,
        tipo_cliente === 'natural' ? apellido : null,
        tipo_cliente === 'juridico' ? razon_social : null,
        direccion || null,
        telefono || null,
        correo || null
      ]
    );
    connection.release();

    res.status(201).json({
      id: result.insertId,
      usuario_id: req.usuario?.id || null,
      tipo_cliente,
      dni: tipo_cliente === 'natural' ? dni : null,
      ruc: tipo_cliente === 'juridico' ? ruc : null,
      nombre: tipo_cliente === 'natural' ? nombre : null,
      apellido: tipo_cliente === 'natural' ? apellido : null,
      razon_social: tipo_cliente === 'juridico' ? razon_social : null,
      direccion: direccion || null,
      telefono: telefono || null,
      correo: correo || null
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'DNI o RUC ya existe' });
    }
    res.status(500).json({ error: 'Error al crear cliente' });
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

  if (!['natural', 'juridico'].includes(tipo_cliente)) {
    return res.status(400).json({ error: 'Tipo de cliente debe ser natural o juridico' });
  }

  if (tipo_cliente === 'natural') {
    if (!DNI_REGEX.test(String(dni || ''))) {
      return res.status(400).json({ error: 'DNI debe tener 8 digitos' });
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

  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id, usuario_id FROM clientes WHERE id = ?', [
      req.params.id
    ]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (req.usuario?.rol !== 'admin' && existing[0].usuario_id !== req.usuario.id) {
      connection.release();
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    await connection.execute(
      `UPDATE clientes
       SET tipo_cliente = ?, dni = ?, ruc = ?, nombre = ?, apellido = ?, razon_social = ?,
           direccion = ?, telefono = ?, correo = ?
       WHERE id = ?`,
      [
        tipo_cliente,
        tipo_cliente === 'natural' ? dni : null,
        tipo_cliente === 'juridico' ? ruc : null,
        tipo_cliente === 'natural' ? nombre : null,
        tipo_cliente === 'natural' ? apellido : null,
        tipo_cliente === 'juridico' ? razon_social : null,
        direccion || null,
        telefono || null,
        correo || null,
        req.params.id
      ]
    );
    connection.release();

    res.json({
      id: req.params.id,
      tipo_cliente,
      dni: tipo_cliente === 'natural' ? dni : null,
      ruc: tipo_cliente === 'juridico' ? ruc : null,
      nombre: tipo_cliente === 'natural' ? nombre : null,
      apellido: tipo_cliente === 'natural' ? apellido : null,
      razon_social: tipo_cliente === 'juridico' ? razon_social : null,
      direccion: direccion || null,
      telefono: telefono || null,
      correo: correo || null
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'DNI o RUC ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

exports.eliminarCliente = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id, usuario_id FROM clientes WHERE id = ?', [
      req.params.id
    ]);
    if (!existing.length) {
      connection.release();
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    if (req.usuario?.rol !== 'admin' && existing[0].usuario_id !== req.usuario.id) {
      connection.release();
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const [result] = await connection.execute('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ mensaje: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
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
