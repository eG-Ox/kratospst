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

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const ALLOW_DESTRUCTIVE_MIGRATION = parseBoolean(
  process.env.ALLOW_DESTRUCTIVE_MIGRATION,
  false
);
const DRY_RUN_DESTRUCTIVE_MIGRATION = parseBoolean(
  process.env.DRY_RUN_DESTRUCTIVE_MIGRATION,
  false
);

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

const checkConstraintExists = async (connection, tableName, constraintName) => {
  const [rows] = await connection.execute(
    `SELECT 1
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'CHECK'
     LIMIT 1`,
    [tableName, constraintName]
  );
  return rows.length > 0;
};

const CHECK_UNSUPPORTED_ERROR_CODES = new Set([
  'ER_PARSE_ERROR',
  'ER_NOT_SUPPORTED_YET',
  'ER_CHECK_NOT_IMPLEMENTED',
  'ER_UNSUPPORTED_EXTENSION'
]);

const addCheckConstraintIfMissing = async (connection, tableName, constraintName, statement) => {
  try {
    if (await checkConstraintExists(connection, tableName, constraintName)) {
      return false;
    }
  } catch (_) {
    // MySQL antiguos pueden no exponer CHECK en information_schema.
  }

  try {
    await connection.execute(statement);
    return true;
  } catch (error) {
    if (error.code === 'ER_DUP_CONSTRAINT_NAME' || error.code === 'ER_DUP_KEYNAME') {
      return false;
    }
    if (CHECK_UNSUPPORTED_ERROR_CODES.has(error.code)) {
      console.log(`WARN CHECK no soportado para ${tableName}.${constraintName}`);
      return false;
    }
    throw error;
  }
};

const normalizarDatosNumericos = async (connection) => {
  const ejecutarSiExiste = async (sql) => {
    try {
      await connection.execute(sql);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
        return;
      }
      throw error;
    }
  };

  await ejecutarSiExiste(
    `UPDATE maquinas
     SET stock = GREATEST(COALESCE(stock, 0), 0),
         precio_compra = GREATEST(COALESCE(precio_compra, 0), 0),
         precio_venta = GREATEST(COALESCE(precio_venta, 0), 0),
         precio_minimo = GREATEST(COALESCE(precio_minimo, 0), 0)`
  );
  await ejecutarSiExiste(
    `UPDATE maquinas
     SET precio_compra = LEAST(precio_compra, precio_venta),
         precio_minimo = LEAST(precio_minimo, precio_venta)`
  );
  await ejecutarSiExiste(
    `UPDATE ventas_detalle
     SET cantidad = GREATEST(COALESCE(cantidad, 1), 1),
         cantidad_picked = GREATEST(COALESCE(cantidad_picked, 0), 0),
         precio_compra = GREATEST(COALESCE(precio_compra, 0), 0),
         precio_venta = GREATEST(COALESCE(precio_venta, 0), 0),
         stock = CASE
           WHEN stock IS NULL THEN NULL
           ELSE GREATEST(stock, 0)
         END`
  );
  await ejecutarSiExiste(
    `UPDATE ventas_detalle
     SET precio_compra = LEAST(precio_compra, precio_venta),
         cantidad_picked = LEAST(cantidad_picked, cantidad)`
  );
  await ejecutarSiExiste(
    `UPDATE inventario_detalle d
     LEFT JOIN maquinas m ON m.id = d.producto_id
     SET d.ubicacion_letra = CASE
           WHEN UPPER(TRIM(COALESCE(d.ubicacion_letra, ''))) REGEXP '^[A-H]$' THEN UPPER(TRIM(d.ubicacion_letra))
           WHEN UPPER(TRIM(COALESCE(m.ubicacion_letra, ''))) REGEXP '^[A-H]$' THEN UPPER(TRIM(m.ubicacion_letra))
           ELSE 'H'
         END,
         d.ubicacion_numero = CASE
           WHEN d.ubicacion_numero IS NOT NULL AND d.ubicacion_numero > 0 THEN d.ubicacion_numero
           WHEN m.ubicacion_numero IS NOT NULL AND m.ubicacion_numero > 0 THEN m.ubicacion_numero
           ELSE 1
         END,
         d.stock_actual = GREATEST(COALESCE(d.stock_actual, 0), 0),
         d.conteo = GREATEST(COALESCE(d.conteo, 0), 0),
         d.diferencia = GREATEST(COALESCE(d.conteo, 0), 0) - GREATEST(COALESCE(d.stock_actual, 0), 0)`
  );
  await ejecutarSiExiste(
    `UPDATE inventario_detalle d
     JOIN (
       SELECT
         MIN(id) AS keep_id,
         SUM(conteo) AS conteo_total,
         MAX(stock_actual) AS stock_actual_max
       FROM inventario_detalle
       GROUP BY inventario_id, producto_id, ubicacion_letra, ubicacion_numero
       HAVING COUNT(*) > 1
     ) dup ON dup.keep_id = d.id
     SET d.conteo = dup.conteo_total,
         d.stock_actual = dup.stock_actual_max,
         d.diferencia = dup.conteo_total - dup.stock_actual_max`
  );
  await ejecutarSiExiste(
    `DELETE d1
     FROM inventario_detalle d1
     JOIN inventario_detalle d2
       ON d1.inventario_id = d2.inventario_id
      AND d1.producto_id = d2.producto_id
      AND d1.ubicacion_letra = d2.ubicacion_letra
      AND d1.ubicacion_numero = d2.ubicacion_numero
      AND d1.id > d2.id`
  );
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
        'ALTER TABLE ventas_detalle ADD COLUMN producto_id INT NULL AFTER venta_id'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_detalle_producto ON ventas_detalle (producto_id)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute(
        `UPDATE ventas_detalle d
         JOIN maquinas m ON m.codigo = d.codigo
         SET d.producto_id = m.id
         WHERE d.producto_id IS NULL
           AND d.codigo IS NOT NULL
           AND d.codigo <> ''`
      );
    } catch (error) {
      console.log('WARN backfill ventas_detalle.producto_id:', error.message);
    }
    try {
      await connection.execute(
        `UPDATE ventas_detalle d
         LEFT JOIN maquinas m ON m.id = d.producto_id
         SET d.producto_id = NULL
         WHERE d.producto_id IS NOT NULL
           AND m.id IS NULL`
      );
    } catch (error) {
      console.log('WARN limpieza ventas_detalle.producto_id huerfano:', error.message);
    }

    try {
      await connection.execute(
        'ALTER TABLE inventario_detalle ADD COLUMN ubicacion_letra CHAR(1) NULL AFTER producto_id'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }
    try {
      await connection.execute(
        'ALTER TABLE inventario_detalle ADD COLUMN ubicacion_numero INT NULL AFTER ubicacion_letra'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }

    await normalizarDatosNumericos(connection);

    const alterIntegridadNumerica = [
      'ALTER TABLE maquinas MODIFY COLUMN stock INT NOT NULL DEFAULT 0',
      'ALTER TABLE maquinas MODIFY COLUMN precio_compra DECIMAL(10, 2) NOT NULL',
      'ALTER TABLE maquinas MODIFY COLUMN precio_venta DECIMAL(10, 2) NOT NULL',
      'ALTER TABLE maquinas MODIFY COLUMN precio_minimo DECIMAL(10, 2) NOT NULL',
      'ALTER TABLE ventas_detalle MODIFY COLUMN cantidad INT NOT NULL DEFAULT 1',
      'ALTER TABLE ventas_detalle MODIFY COLUMN cantidad_picked INT NOT NULL DEFAULT 0',
      'ALTER TABLE ventas_detalle MODIFY COLUMN precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0',
      'ALTER TABLE ventas_detalle MODIFY COLUMN precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0',
      "ALTER TABLE inventario_detalle MODIFY COLUMN ubicacion_letra CHAR(1) NOT NULL DEFAULT 'H'",
      'ALTER TABLE inventario_detalle MODIFY COLUMN ubicacion_numero INT NOT NULL DEFAULT 1',
      'ALTER TABLE inventario_detalle MODIFY COLUMN stock_actual INT NOT NULL DEFAULT 0',
      'ALTER TABLE inventario_detalle MODIFY COLUMN conteo INT NOT NULL DEFAULT 0',
      'ALTER TABLE inventario_detalle MODIFY COLUMN diferencia INT NOT NULL DEFAULT 0'
    ];
    for (const statement of alterIntegridadNumerica) {
      try {
        await connection.execute(statement);
      } catch (error) {
        if (
          error.code !== 'ER_NO_SUCH_TABLE' &&
          error.code !== 'ER_BAD_FIELD_ERROR' &&
          error.code !== 'ER_TRUNCATED_WRONG_VALUE'
        ) {
          throw error;
        }
      }
    }

    try {
      await connection.execute(
        'ALTER TABLE inventario_detalle ADD UNIQUE KEY uniq_inventario_producto_ubicacion (inventario_id, producto_id, ubicacion_letra, ubicacion_numero)'
      );
    } catch (error) {
      if (
        error.code !== 'ER_DUP_KEYNAME' &&
        error.code !== 'ER_DUP_ENTRY' &&
        error.code !== 'ER_NO_SUCH_TABLE'
      ) {
        throw error;
      }
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(
          'WARN inventario_detalle: hay duplicados en inventario+producto+ubicacion; no se pudo crear indice unico'
        );
      }
    }

    const checkConstraints = [
      [
        'maquinas',
        'chk_maquinas_stock_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_stock_nonneg CHECK (stock >= 0)'
      ],
      [
        'maquinas',
        'chk_maquinas_pcompra_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pcompra_nonneg CHECK (precio_compra >= 0)'
      ],
      [
        'maquinas',
        'chk_maquinas_pventa_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pventa_nonneg CHECK (precio_venta >= 0)'
      ],
      [
        'maquinas',
        'chk_maquinas_pmin_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pmin_nonneg CHECK (precio_minimo >= 0)'
      ],
      [
        'maquinas',
        'chk_maquinas_pcompra_lte_pventa',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pcompra_lte_pventa CHECK (precio_compra <= precio_venta)'
      ],
      [
        'maquinas',
        'chk_maquinas_pmin_lte_pventa',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pmin_lte_pventa CHECK (precio_minimo <= precio_venta)'
      ],
      [
        'ventas_detalle',
        'chk_vdet_cantidad_pos',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_cantidad_pos CHECK (cantidad >= 1)'
      ],
      [
        'ventas_detalle',
        'chk_vdet_picked_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_picked_nonneg CHECK (cantidad_picked >= 0)'
      ],
      [
        'ventas_detalle',
        'chk_vdet_picked_lte_cantidad',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_picked_lte_cantidad CHECK (cantidad_picked <= cantidad)'
      ],
      [
        'ventas_detalle',
        'chk_vdet_pventa_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_pventa_nonneg CHECK (precio_venta >= 0)'
      ],
      [
        'ventas_detalle',
        'chk_vdet_pcompra_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_pcompra_nonneg CHECK (precio_compra >= 0)'
      ],
      [
        'ventas_detalle',
        'chk_vdet_pcompra_lte_pventa',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_pcompra_lte_pventa CHECK (precio_compra <= precio_venta)'
      ],
      [
        'ventas_detalle',
        'chk_vdet_stock_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_stock_nonneg CHECK (stock IS NULL OR stock >= 0)'
      ],
      [
        'inventario_detalle',
        'chk_invdet_stock_nonneg',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_stock_nonneg CHECK (stock_actual >= 0)'
      ],
      [
        'inventario_detalle',
        'chk_invdet_conteo_nonneg',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_conteo_nonneg CHECK (conteo >= 0)'
      ],
      [
        'inventario_detalle',
        'chk_invdet_diff_consistente',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_diff_consistente CHECK (diferencia = (conteo - stock_actual))'
      ],
      [
        'inventario_detalle',
        'chk_invdet_ubicacion_numero_pos',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_ubicacion_numero_pos CHECK (ubicacion_numero > 0)'
      ]
    ];
    for (const [tableName, constraintName, statement] of checkConstraints) {
      try {
        await addCheckConstraintIfMissing(connection, tableName, constraintName, statement);
      } catch (error) {
        if (error.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }
    }

    try {
      await connection.execute(
        "ALTER TABLE clientes MODIFY COLUMN tipo_cliente ENUM('natural','juridico','ce') NOT NULL"
      );
    } catch (error) {
      console.log('WARN enum clientes:', error.message);
    }
    try {
      await connection.execute('ALTER TABLE clientes MODIFY COLUMN dni VARCHAR(9) UNIQUE');
    } catch (error) {
      console.log('WARN dni clientes:', error.message);
    }

    try {
      const cleanupStatements = [
        {
          label: 'cotizaciones sin usuario',
          sql: `DELETE c FROM cotizaciones c
                LEFT JOIN usuarios u ON u.id = c.usuario_id
                WHERE u.id IS NULL`
        },
        {
          label: 'cliente_id huerfano en cotizaciones',
          sql: `UPDATE cotizaciones c
                LEFT JOIN clientes cl ON cl.id = c.cliente_id
                SET c.cliente_id = NULL
                WHERE c.cliente_id IS NOT NULL AND cl.id IS NULL`
        },
        {
          label: 'detalle_cotizacion sin cotizacion',
          sql: `DELETE d FROM detalle_cotizacion d
                LEFT JOIN cotizaciones c ON c.id = d.cotizacion_id
                WHERE c.id IS NULL`
        },
        {
          label: 'detalle_cotizacion sin producto',
          sql: `DELETE d FROM detalle_cotizacion d
                LEFT JOIN maquinas m ON m.id = d.producto_id
                WHERE m.id IS NULL`
        },
        {
          label: 'historial_cotizaciones sin cotizacion',
          sql: `DELETE h FROM historial_cotizaciones h
                LEFT JOIN cotizaciones c ON c.id = h.cotizacion_id
                WHERE c.id IS NULL`
        },
        {
          label: 'historial_cotizaciones sin usuario',
          sql: `DELETE h FROM historial_cotizaciones h
                LEFT JOIN usuarios u ON u.id = h.usuario_id
                WHERE u.id IS NULL`
        },
        {
          label: 'kits sin usuario',
          sql: `DELETE k FROM kits k
                LEFT JOIN usuarios u ON u.id = k.usuario_id
                WHERE u.id IS NULL`
        },
        {
          label: 'kit_productos sin kit',
          sql: `DELETE kp FROM kit_productos kp
                LEFT JOIN kits k ON k.id = kp.kit_id
                WHERE k.id IS NULL`
        },
        {
          label: 'kit_productos sin producto',
          sql: `DELETE kp FROM kit_productos kp
                LEFT JOIN maquinas m ON m.id = kp.producto_id
                WHERE m.id IS NULL`
        }
      ];

      if (!ALLOW_DESTRUCTIVE_MIGRATION) {
        console.log(
          'WARN limpieza huerfanos omitida. Configure ALLOW_DESTRUCTIVE_MIGRATION=true para habilitarla.'
        );
      } else {
        if (DRY_RUN_DESTRUCTIVE_MIGRATION) {
          console.log('[DRY-RUN] Limpieza de huerfanos habilitada en modo simulacion.');
        }
        for (const step of cleanupStatements) {
          if (DRY_RUN_DESTRUCTIVE_MIGRATION) {
            const compactSql = step.sql.replace(/\s+/g, ' ').trim();
            console.log(`[DRY-RUN] ${step.label}: ${compactSql}`);
            continue;
          }
          await connection.execute(step.sql);
        }
      }
    } catch (error) {
      console.log('WARN limpieza huerfanos:', error.message);
    }

    await addForeignKeyIfMissing(
      connection,
      'ventas_detalle',
      'fk_ventas_detalle_producto',
      `ALTER TABLE ventas_detalle
       ADD CONSTRAINT fk_ventas_detalle_producto
       FOREIGN KEY (producto_id) REFERENCES maquinas(id)
       ON DELETE SET NULL`
    );
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
