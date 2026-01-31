const pool = require('../../core/config/database');

const permisosBase = [
  { clave: 'productos.ver', descripcion: 'Ver productos', grupo: 'Inventario' },
  { clave: 'productos.editar', descripcion: 'Crear/Editar productos', grupo: 'Inventario' },
  { clave: 'productos.precio_compra.ver', descripcion: 'Ver precio de compra', grupo: 'Inventario' },
  { clave: 'tipos_maquinas.ver', descripcion: 'Ver tipos de maquinas', grupo: 'Inventario' },
  { clave: 'tipos_maquinas.editar', descripcion: 'Editar tipos de maquinas', grupo: 'Inventario' },
  { clave: 'movimientos.ver', descripcion: 'Ver movimientos', grupo: 'Inventario' },
  { clave: 'movimientos.registrar', descripcion: 'Registrar movimientos', grupo: 'Inventario' },
  { clave: 'historial.ver', descripcion: 'Ver historial general', grupo: 'Inventario' },
  { clave: 'inventario_general.ver', descripcion: 'Ver inventario general', grupo: 'Inventario' },
  { clave: 'inventario_general.editar', descripcion: 'Crear/Editar inventario general', grupo: 'Inventario' },
  { clave: 'inventario_general.aplicar', descripcion: 'Aplicar stock inventario general', grupo: 'Inventario' },
  { clave: 'kits.ver', descripcion: 'Ver kits', grupo: 'Cotizaciones' },
  { clave: 'kits.editar', descripcion: 'Crear/Editar kits', grupo: 'Cotizaciones' },
  { clave: 'cotizaciones.ver', descripcion: 'Ver cotizaciones', grupo: 'Cotizaciones' },
  { clave: 'cotizaciones.editar', descripcion: 'Crear/Editar cotizaciones', grupo: 'Cotizaciones' },
  { clave: 'cotizaciones.historial.ver', descripcion: 'Ver historial de cotizaciones', grupo: 'Cotizaciones' },
  { clave: 'clientes.ver', descripcion: 'Ver clientes', grupo: 'Clientes' },
  { clave: 'clientes.editar', descripcion: 'Crear/Editar clientes', grupo: 'Clientes' },
  { clave: 'usuarios.ver', descripcion: 'Ver usuarios', grupo: 'Cuentas' },
  { clave: 'usuarios.editar', descripcion: 'Editar usuarios', grupo: 'Cuentas' },
  { clave: 'permisos.editar', descripcion: 'Editar permisos por rol', grupo: 'Cuentas' }
];

const rolesBase = ['admin', 'ventas', 'logistica'];

const asegurarPermisos = async (connection) => {
  for (const rol of rolesBase) {
    try {
      await connection.execute('INSERT INTO roles (nombre) VALUES (?)', [rol]);
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  }

  for (const permiso of permisosBase) {
    try {
      await connection.execute(
        'INSERT INTO permisos (clave, descripcion, grupo) VALUES (?, ?, ?)',
        [permiso.clave, permiso.descripcion, permiso.grupo]
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  }

  const [rolesRows] = await connection.execute('SELECT id, nombre FROM roles');
  const [permisosRows] = await connection.execute('SELECT id, clave FROM permisos');

  for (const rol of rolesRows) {
    for (const permiso of permisosRows) {
      try {
        await connection.execute(
          'INSERT INTO rol_permisos (rol_id, permiso_id, permitido) VALUES (?, ?, TRUE)',
          [rol.id, permiso.id]
        );
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
      }
    }
  }
};

exports.listarRoles = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await asegurarPermisos(connection);
    const [rows] = await connection.execute('SELECT id, nombre FROM roles ORDER BY nombre');
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error listando roles:', error);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

exports.obtenerPermisosRol = async (req, res) => {
  const { rol } = req.params;
  try {
    const connection = await pool.getConnection();
    await asegurarPermisos(connection);
    const [roles] = await connection.execute('SELECT id FROM roles WHERE nombre = ?', [rol]);
    if (!roles.length) {
      connection.release();
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    const rolId = roles[0].id;
    const [rows] = await connection.execute(
      `SELECT p.id, p.clave, p.descripcion, p.grupo, rp.permitido
       FROM permisos p
       LEFT JOIN rol_permisos rp
         ON rp.permiso_id = p.id AND rp.rol_id = ?
       ORDER BY p.grupo, p.clave`,
      [rolId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

exports.actualizarPermisosRol = async (req, res) => {
  const { rol } = req.params;
  const { permisos = [] } = req.body;

  try {
    const connection = await pool.getConnection();
    await asegurarPermisos(connection);
    const [roles] = await connection.execute('SELECT id FROM roles WHERE nombre = ?', [rol]);
    if (!roles.length) {
      connection.release();
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    const rolId = roles[0].id;

    for (const permiso of permisos) {
      if (!permiso?.clave) continue;
      const [permRows] = await connection.execute('SELECT id FROM permisos WHERE clave = ?', [
        permiso.clave
      ]);
      if (!permRows.length) continue;
      const permitido = permiso.permitido ? 1 : 0;
      await connection.execute(
        `INSERT INTO rol_permisos (rol_id, permiso_id, permitido)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE permitido = VALUES(permitido)`,
        [rolId, permRows[0].id, permitido]
      );
    }

    connection.release();
    res.json({ mensaje: 'Permisos actualizados' });
  } catch (error) {
    console.error('Error actualizando permisos:', error);
    res.status(500).json({ error: 'Error al actualizar permisos' });
  }
};

exports.obtenerMisPermisos = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await asegurarPermisos(connection);
    const [roles] = await connection.execute('SELECT id FROM roles WHERE nombre = ?', [
      req.usuario.rol
    ]);
    if (!roles.length) {
      connection.release();
      return res.json([]);
    }
    const [rows] = await connection.execute(
      `SELECT p.clave, rp.permitido
       FROM permisos p
       JOIN rol_permisos rp ON rp.permiso_id = p.id
       WHERE rp.rol_id = ? AND rp.permitido = TRUE`,
      [roles[0].id]
    );
    connection.release();
    res.json(rows.map((row) => row.clave));
  } catch (error) {
    console.error('Error obteniendo permisos propios:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};
