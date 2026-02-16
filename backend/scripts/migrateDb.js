const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  connectTimeout: 10000
};

const normalizarBusqueda = (value) =>
  String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

const crearMaquinasUbicaciones = `
CREATE TABLE IF NOT EXISTS maquinas_ubicaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  producto_id INT NOT NULL,
  ubicacion_letra CHAR(1) NOT NULL,
  ubicacion_numero INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES maquinas(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_producto_ubicacion (producto_id, ubicacion_letra, ubicacion_numero),
  INDEX idx_producto (producto_id),
  INDEX idx_stock (stock)
);
`;

const actualizarBusquedaMaquinas = async (connection) => {
  const batchSize = 200;
  let totalActualizados = 0;

  while (true) {
    const [rows] = await connection.execute(
      `SELECT id, codigo, descripcion, codigo_busqueda, descripcion_busqueda
       FROM maquinas
       WHERE (codigo_busqueda IS NULL OR codigo_busqueda = '')
          OR ((descripcion_busqueda IS NULL OR descripcion_busqueda = '') AND descripcion IS NOT NULL AND descripcion <> '')
       ORDER BY id ASC
       LIMIT ${batchSize}`
    );
    if (!rows.length) {
      break;
    }
    for (const row of rows) {
      const codigoBusqueda = normalizarBusqueda(row.codigo);
      const descripcionBusquedaRaw = normalizarBusqueda(row.descripcion);
      const descripcionBusqueda = descripcionBusquedaRaw || null;
      try {
        await connection.execute(
          'UPDATE maquinas SET codigo_busqueda = ?, descripcion_busqueda = ? WHERE id = ?',
          [codigoBusqueda, descripcionBusqueda, row.id]
        );
        totalActualizados += 1;
      } catch (error) {
        if (error.code === 'ER_LOCK_WAIT_TIMEOUT' || error.code === 'ER_LOCK_DEADLOCK') {
          console.error('LOCK', error.code, 'en maquinas.id =', row.id);
          return;
        }
        throw error;
      }
    }
    console.log(`Backfill busqueda: ${totalActualizados} actualizados`);
  }
};

const sincronizarUbicacionesBase = async (connection) => {
  await connection.execute(
    `INSERT INTO maquinas_ubicaciones (producto_id, ubicacion_letra, ubicacion_numero, stock)
     SELECT m.id, m.ubicacion_letra, m.ubicacion_numero, m.stock
     FROM maquinas m
     WHERE m.activo = TRUE
       AND m.ubicacion_letra IS NOT NULL
       AND m.ubicacion_numero IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM maquinas_ubicaciones mu WHERE mu.producto_id = m.id
       )`
  );
};

const foreignKeyExists = async (connection, tableName, constraintName) => {
  const [rows] = await connection.execute(
    `SELECT 1
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'
     LIMIT 1`,
    [tableName, constraintName]
  );
  return rows.length > 0;
};

const addForeignKeyIfMissing = async (connection, tableName, constraintName, statement) => {
  if (await foreignKeyExists(connection, tableName, constraintName)) {
    return;
  }
  await connection.execute(statement);
};

(async () => {
  const connection = await mysql.createConnection(config);
  try {
    await connection.execute('SET SESSION innodb_lock_wait_timeout = 5');
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 1) AS got', ['kratos_migrate']);
    if (!lockRows[0] || lockRows[0].got !== 1) {
      console.error('ERR LOCK', 'No se pudo obtener el lock kratos_migrate. Ya hay otro proceso ejecutando.');
      process.exit(1);
    }

    await connection.execute(crearMaquinasUbicaciones);
    await actualizarBusquedaMaquinas(connection);
    await sincronizarUbicacionesBase(connection);

    try {
      await connection.execute(
        "ALTER TABLE clientes MODIFY COLUMN tipo_cliente ENUM('natural','juridico','ce') NOT NULL"
      );
    } catch (error) {
      console.log('WARN enum clientes:', error.message);
    }

    try {
      await connection.execute(
        `DELETE c FROM cotizaciones c
         LEFT JOIN usuarios u ON u.id = c.usuario_id
         WHERE u.id IS NULL`
      );
      await connection.execute(
        `UPDATE cotizaciones c
         LEFT JOIN clientes cl ON cl.id = c.cliente_id
         SET c.cliente_id = NULL
         WHERE c.cliente_id IS NOT NULL AND cl.id IS NULL`
      );
      await connection.execute(
        `DELETE d FROM detalle_cotizacion d
         LEFT JOIN cotizaciones c ON c.id = d.cotizacion_id
         WHERE c.id IS NULL`
      );
      await connection.execute(
        `DELETE d FROM detalle_cotizacion d
         LEFT JOIN maquinas m ON m.id = d.producto_id
         WHERE m.id IS NULL`
      );
      await connection.execute(
        `DELETE h FROM historial_cotizaciones h
         LEFT JOIN cotizaciones c ON c.id = h.cotizacion_id
         WHERE c.id IS NULL`
      );
      await connection.execute(
        `DELETE h FROM historial_cotizaciones h
         LEFT JOIN usuarios u ON u.id = h.usuario_id
         WHERE u.id IS NULL`
      );
      await connection.execute(
        `DELETE k FROM kits k
         LEFT JOIN usuarios u ON u.id = k.usuario_id
         WHERE u.id IS NULL`
      );
      await connection.execute(
        `DELETE kp FROM kit_productos kp
         LEFT JOIN kits k ON k.id = kp.kit_id
         WHERE k.id IS NULL`
      );
      await connection.execute(
        `DELETE kp FROM kit_productos kp
         LEFT JOIN maquinas m ON m.id = kp.producto_id
         WHERE m.id IS NULL`
      );
    } catch (error) {
      console.log('WARN limpieza huerfanos:', error.message);
    }

    await addForeignKeyIfMissing(
      connection,
      'cotizaciones',
      'fk_cotizaciones_cliente',
      `ALTER TABLE cotizaciones
       ADD CONSTRAINT fk_cotizaciones_cliente
       FOREIGN KEY (cliente_id) REFERENCES clientes(id)
       ON DELETE SET NULL`
    );
    await addForeignKeyIfMissing(
      connection,
      'detalle_cotizacion',
      'fk_detalle_cotizacion_cotizacion',
      `ALTER TABLE detalle_cotizacion
       ADD CONSTRAINT fk_detalle_cotizacion_cotizacion
       FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id)
       ON DELETE CASCADE`
    );
    await addForeignKeyIfMissing(
      connection,
      'detalle_cotizacion',
      'fk_detalle_cotizacion_producto',
      `ALTER TABLE detalle_cotizacion
       ADD CONSTRAINT fk_detalle_cotizacion_producto
       FOREIGN KEY (producto_id) REFERENCES maquinas(id)
       ON DELETE RESTRICT`
    );
    await addForeignKeyIfMissing(
      connection,
      'historial_cotizaciones',
      'fk_historial_cotizaciones_cotizacion',
      `ALTER TABLE historial_cotizaciones
       ADD CONSTRAINT fk_historial_cotizaciones_cotizacion
       FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id)
       ON DELETE CASCADE`
    );
    await addForeignKeyIfMissing(
      connection,
      'historial_cotizaciones',
      'fk_historial_cotizaciones_usuario',
      `ALTER TABLE historial_cotizaciones
       ADD CONSTRAINT fk_historial_cotizaciones_usuario
       FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
       ON DELETE RESTRICT`
    );
    await addForeignKeyIfMissing(
      connection,
      'kits',
      'fk_kits_usuario',
      `ALTER TABLE kits
       ADD CONSTRAINT fk_kits_usuario
       FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
       ON DELETE RESTRICT`
    );
    await addForeignKeyIfMissing(
      connection,
      'kit_productos',
      'fk_kit_productos_kit',
      `ALTER TABLE kit_productos
       ADD CONSTRAINT fk_kit_productos_kit
       FOREIGN KEY (kit_id) REFERENCES kits(id)
       ON DELETE CASCADE`
    );
    await addForeignKeyIfMissing(
      connection,
      'kit_productos',
      'fk_kit_productos_producto',
      `ALTER TABLE kit_productos
       ADD CONSTRAINT fk_kit_productos_producto
       FOREIGN KEY (producto_id) REFERENCES maquinas(id)
       ON DELETE RESTRICT`
    );

    try {
      await connection.execute(
        'CREATE UNIQUE INDEX uniq_cotizacion_serie_correlativo ON cotizaciones (serie, correlativo)'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(
          'WARN cotizaciones: hay duplicados en (serie, correlativo); no se pudo crear indice unico'
        );
      }
    }

    console.log('OK');
  } catch (error) {
    console.error('ERR', error.code || 'UNKNOWN', error.message);
    process.exit(1);
  } finally {
    try {
      await connection.execute('SELECT RELEASE_LOCK(?)', ['kratos_migrate']);
    } catch (_) {}
    await connection.end();
  }
})();
