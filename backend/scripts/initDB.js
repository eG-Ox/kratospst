const pool = require('../config/database');

const normalizarBusqueda = (value) =>
  String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

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

const actualizarBusquedaMaquinas = async (connection) => {
  try {
    const [cols] = await connection.execute("SHOW COLUMNS FROM maquinas LIKE 'codigo_busqueda'");
    if (!cols.length) {
      return;
    }
  } catch (_) {
    return;
  }

  const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 1) AS got', ['kratos_busqueda']);
  if (!lockRows[0] || lockRows[0].got !== 1) {
    console.log('Aviso: no se pudo obtener lock kratos_busqueda, se omite backfill.');
    return;
  }

  try {
    await connection.execute('SET SESSION innodb_lock_wait_timeout = 5');
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
            console.log('Aviso backfill bloqueado en maquinas.id =', row.id);
            return;
          }
          throw error;
        }
      }
      if (totalActualizados && totalActualizados % 200 === 0) {
        console.log(`Backfill busqueda: ${totalActualizados} actualizados`);
      }
    }
  } finally {
    try {
      await connection.execute('SELECT RELEASE_LOCK(?)', ['kratos_busqueda']);
    } catch (_) {}
  }
};

const sincronizarUbicacionesBase = async (connection) => {
  try {
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
  } catch (error) {
    console.log('Aviso sincronizando ubicaciones base:', error.message);
  }
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
      console.log(`Aviso: CHECK no soportado para ${tableName}.${constraintName}.`);
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

const PASSWORD_COLUMN_CANONICAL = 'contrasena';

const asegurarColumnaContrasena = async (connection) => {
  const [columns] = await connection.execute('SHOW COLUMNS FROM usuarios');
  const fields = new Set((columns || []).map((col) => col.Field));
  if (fields.has(PASSWORD_COLUMN_CANONICAL)) {
    return PASSWORD_COLUMN_CANONICAL;
  }

  const legacyCandidates = ['contraseña', 'contraseÃ±a'];
  const legacyColumn =
    legacyCandidates.find((name) => fields.has(name)) ||
    (columns || [])
      .map((col) => col.Field)
      .find((name) => String(name || '').toLowerCase().startsWith('contra'));

  if (!legacyColumn) {
    throw new Error(
      `No se encontro columna de password en usuarios. Esperada: ${PASSWORD_COLUMN_CANONICAL}`
    );
  }

  await connection.execute(
    `ALTER TABLE usuarios CHANGE COLUMN \`${legacyColumn}\` ${PASSWORD_COLUMN_CANONICAL} VARCHAR(255) NOT NULL`
  );
  return PASSWORD_COLUMN_CANONICAL;
};

// Crear tabla de usuarios
const crearUsuarios = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  telefono VARCHAR(30),
  contrasena VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'ventas', 'logistica') NOT NULL DEFAULT 'ventas',
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
`;

// Crear tabla de tipos de mÃ¡quinas
const crearTiposMaquinas = `
CREATE TABLE IF NOT EXISTS tipos_maquinas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

// Crear tabla de marcas
const crearMarcas = `
CREATE TABLE IF NOT EXISTS marcas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

// Crear tabla de mÃ¡quinas
const crearMaquinas = `
CREATE TABLE IF NOT EXISTS maquinas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  tipo_maquina_id INT NOT NULL,
  marca VARCHAR(100) NOT NULL,
  descripcion TEXT,
  codigo_busqueda VARCHAR(80),
  descripcion_busqueda VARCHAR(255),
  ubicacion_letra CHAR(1),
  ubicacion_numero INT,
  stock INT NOT NULL DEFAULT 0,
  precio_compra DECIMAL(10, 2) NOT NULL,
  precio_venta DECIMAL(10, 2) NOT NULL,
  precio_minimo DECIMAL(10, 2) NOT NULL,
  ficha_web VARCHAR(255),
  ficha_tecnica_ruta VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tipo_maquina_id) REFERENCES tipos_maquinas(id) ON DELETE RESTRICT,
  INDEX idx_codigo (codigo),
  INDEX idx_codigo_busqueda (codigo_busqueda),
  INDEX idx_desc_busqueda (descripcion_busqueda),
  INDEX idx_tipo (tipo_maquina_id),
  INDEX idx_tipo_stock (tipo_maquina_id, stock),
  INDEX idx_marca (marca),
  INDEX idx_activo (activo),
  INDEX idx_stock (stock)
);
`;

// Crear tabla de ingresos y salidas
const crearIngresouSalidas = `
CREATE TABLE IF NOT EXISTS ingresos_salidas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  maquina_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo ENUM('ingreso', 'salida') NOT NULL,
  cantidad INT NOT NULL,
  motivo VARCHAR(255),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_maquina (maquina_id),
  INDEX idx_maquina_fecha (maquina_id, fecha),
  INDEX idx_usuario (usuario_id),
  INDEX idx_fecha (fecha),
  INDEX idx_fecha_tipo (fecha, tipo)
);
`;


// Crear tabla cotizaciones
const crearCotizaciones = `
CREATE TABLE IF NOT EXISTS cotizaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  cliente_id INT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(10, 2) NOT NULL DEFAULT 0,
  nota TEXT,
  estado VARCHAR(30) DEFAULT 'pendiente',
  serie VARCHAR(10),
  correlativo INT,
  UNIQUE KEY uniq_cotizacion_serie_correlativo (serie, correlativo),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_usuario (usuario_id),
  INDEX idx_cliente (cliente_id)
);
`;

// Crear tabla detalle_cotizacion
const crearDetalleCotizacion = `
CREATE TABLE IF NOT EXISTS detalle_cotizacion (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cotizacion_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  precio_regular DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  almacen_origen VARCHAR(30) DEFAULT 'productos',
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
  INDEX idx_cotizacion (cotizacion_id),
  INDEX idx_producto (producto_id)
);
`;

// Crear tabla historial_cotizaciones
const crearHistorialCotizaciones = `
CREATE TABLE IF NOT EXISTS historial_cotizaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cotizacion_id INT NOT NULL,
  usuario_id INT NOT NULL,
  accion VARCHAR(50) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_cotizacion (cotizacion_id),
  INDEX idx_usuario (usuario_id)
);
`;

// Crear tabla kits
const crearKits = `
CREATE TABLE IF NOT EXISTS kits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_usuario (usuario_id),
  INDEX idx_activo (activo)
);
`;

// Crear tabla kit_productos
const crearKitProductos = `
CREATE TABLE IF NOT EXISTS kit_productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kit_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  precio_final DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  almacen_origen VARCHAR(30) DEFAULT 'productos',
  FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
  INDEX idx_kit (kit_id),
  INDEX idx_producto (producto_id)
);
`;

// Crear tabla historial_acciones
const crearHistorialAcciones = `
CREATE TABLE IF NOT EXISTS historial_acciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entidad VARCHAR(50) NOT NULL,
  entidad_id INT,
  usuario_id INT,
  accion VARCHAR(50) NOT NULL,
  descripcion TEXT,
  antes_json TEXT,
  despues_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entidad (entidad),
  INDEX idx_usuario (usuario_id),
  INDEX idx_fecha (created_at)
);
`;

// Tabla inventarios generales
const crearInventarios = `
CREATE TABLE IF NOT EXISTS inventarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  estado ENUM('abierto', 'cerrado', 'aplicado') DEFAULT 'abierto',
  observaciones TEXT,
  aplicado_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_estado (estado),
  INDEX idx_fecha (created_at)
);
`;

// Tabla detalle de inventarios
const crearInventarioDetalle = `
CREATE TABLE IF NOT EXISTS inventario_detalle (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inventario_id INT NOT NULL,
  producto_id INT NOT NULL,
  ubicacion_letra CHAR(1),
  ubicacion_numero INT,
  stock_actual INT NOT NULL,
  conteo INT NOT NULL DEFAULT 0,
  diferencia INT NOT NULL DEFAULT 0,
  FOREIGN KEY (inventario_id) REFERENCES inventarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES maquinas(id) ON DELETE RESTRICT,
  INDEX idx_inventario (inventario_id),
  INDEX idx_producto (producto_id),
  UNIQUE KEY uniq_inventario_producto_ubicacion (inventario_id, producto_id, ubicacion_letra, ubicacion_numero)
);
`;

// Tabla ubicaciones por producto (stock por ubicacion)
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


// Tabla roles
const crearRoles = `
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL UNIQUE
);
`;

// Tabla permisos
const crearPermisos = `
CREATE TABLE IF NOT EXISTS permisos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clave VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(200),
  grupo VARCHAR(60)
);
`;

// Tabla rol_permisos
const crearRolPermisos = `
CREATE TABLE IF NOT EXISTS rol_permisos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rol_id INT NOT NULL,
  permiso_id INT NOT NULL,
  permitido BOOLEAN DEFAULT TRUE,
  UNIQUE KEY uniq_rol_permiso (rol_id, permiso_id),
  FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
);
`;

// Crear tabla de clientes
const crearClientes = `
CREATE TABLE IF NOT EXISTS clientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT,
  tipo_cliente ENUM('natural', 'juridico', 'ce') NOT NULL,
  dni VARCHAR(9) UNIQUE,
  ruc VARCHAR(11) UNIQUE,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  razon_social VARCHAR(150),
  direccion VARCHAR(255),
  telefono VARCHAR(30),
  correo VARCHAR(100),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tipo (tipo_cliente),
  INDEX idx_usuario (usuario_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
`;

// Relacion cliente-usuarios (cartera compartida)
const crearClientesUsuarios = `
CREATE TABLE IF NOT EXISTS clientes_usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cliente_id INT NOT NULL,
  usuario_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_cliente_usuario (cliente_id, usuario_id),
  INDEX idx_cliente (cliente_id),
  INDEX idx_usuario (usuario_id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
`;

// Tabla ventas
const crearVentas = `
CREATE TABLE IF NOT EXISTS ventas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  documento_tipo ENUM('dni', 'ruc') DEFAULT 'dni',
  documento VARCHAR(20),
  cliente_nombre VARCHAR(150),
  cliente_telefono VARCHAR(30),
  agencia ENUM('SHALOM','MARVISUR','OLVA','OTROS','TIENDA') DEFAULT 'SHALOM',
  agencia_otro VARCHAR(120),
  destino VARCHAR(120),
  fecha_venta DATE,
  estado_envio ENUM('PENDIENTE','ENVIADO','CANCELADO','VISITA') DEFAULT 'PENDIENTE',
  estado_pedido ENUM('PICKING','PEDIDO_LISTO') DEFAULT 'PICKING',
  fecha_despacho DATE NULL,
  fecha_cancelacion DATE NULL,
  adelanto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  p_venta DECIMAL(10, 2) NOT NULL DEFAULT 0,
  rastreo_estado VARCHAR(30) DEFAULT 'EN TRANSITO',
  ticket VARCHAR(60),
  guia VARCHAR(60),
  retiro VARCHAR(60),
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_venta_usuario (usuario_id),
  INDEX idx_venta_fecha (fecha_venta),
  INDEX idx_venta_estado (estado_envio),
  INDEX idx_venta_created_at (created_at)
);
`;

// Tabla detalle ventas
const crearVentasDetalle = `
CREATE TABLE IF NOT EXISTS ventas_detalle (
  id INT PRIMARY KEY AUTO_INCREMENT,
  venta_id INT NOT NULL,
  producto_id INT NULL,
  tipo ENUM('producto','requerimiento','regalo','regalo_requerimiento') NOT NULL,
  codigo VARCHAR(50),
  descripcion TEXT,
  marca VARCHAR(100),
  cantidad INT NOT NULL DEFAULT 1,
  cantidad_picked INT NOT NULL DEFAULT 0,
  precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0,
  precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0,
  proveedor VARCHAR(120),
  stock INT NULL,
  CONSTRAINT fk_ventas_detalle_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ventas_detalle_producto FOREIGN KEY (producto_id) REFERENCES maquinas(id) ON DELETE SET NULL,
  INDEX idx_venta_detalle (venta_id),
  INDEX idx_detalle_producto (producto_id),
  INDEX idx_venta_tipo (tipo),
  INDEX idx_venta_tipo_picked (venta_id, tipo, cantidad_picked),
  INDEX idx_detalle_codigo (codigo),
  INDEX idx_detalle_desc (descripcion(100))
);
`;

async function inicializarBaseDatos() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Creando tabla usuarios...');
    await connection.execute(crearUsuarios);
    console.log('âœ“ Tabla usuarios creada exitosamente');
    const passwordColumn = await asegurarColumnaContrasena(connection);

    // Asegurar columna telefono en usuarios (por si ya existÃ­a sin esa columna)
    try {
      await connection.execute('ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(30) NULL AFTER email');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }


    // Actualizar enum de roles si ya existÃƒÂ­a
    try {
      await connection.execute(
        "ALTER TABLE usuarios MODIFY COLUMN rol ENUM('admin','ventas','logistica') NOT NULL DEFAULT 'ventas'"
      );
    } catch (error) {
      console.log('Aviso actualizando roles:', error.message);
    }

    // Migrar rol antiguo operario a ventas
    try {
      await connection.execute("UPDATE usuarios SET rol = 'ventas' WHERE rol = 'operario'");
    } catch (error) {
      console.log('Aviso migrando roles:', error.message);
    }
    
    console.log('Creando tabla tipos_maquinas...');
    await connection.execute(crearTiposMaquinas);
    console.log('âœ“ Tabla tipos_maquinas creada exitosamente');

    console.log('Creando tabla marcas...');
    await connection.execute(crearMarcas);
    console.log('âœ“ Tabla marcas creada exitosamente');

    // Insertar marcas iniciales si la tabla estÃ¡ vacÃ­a
    try {
      const [marcaCountRows] = await connection.execute('SELECT COUNT(*) as total FROM marcas');
      const marcaCount = marcaCountRows?.[0]?.total || 0;
      if (marcaCount === 0) {
        console.log('Insertando marcas iniciales...');
        const marcasIniciales = [
          { nombre: 'Agrotech', codigo: 'M0001' },
          { nombre: 'AMCO', codigo: 'M0002' },
          { nombre: 'APO', codigo: 'M0003' },
          { nombre: 'BERKLIN', codigo: 'M0004' },
          { nombre: 'BIGRED', codigo: 'M0005' },
          { nombre: 'Bonelly', codigo: 'M0006' },
          { nombre: 'Campbell', codigo: 'M0007' },
          { nombre: 'Cattini', codigo: 'M0008' },
          { nombre: 'DCA', codigo: 'M0009' },
          { nombre: 'DeWALT', codigo: 'M0010' },
          { nombre: 'DongCheng', codigo: 'M0011' },
          { nombre: 'Farmjet', codigo: 'M0012' },
          { nombre: 'Ferton', codigo: 'M0013' },
          { nombre: 'Hyundai', codigo: 'M0014' },
          { nombre: 'Kaili', codigo: 'M0015' },
          { nombre: 'Khomander', codigo: 'M0016' },
          { nombre: 'Klarwerk', codigo: 'M0017' },
          { nombre: 'KRATOS', codigo: 'M0018' },
          { nombre: 'MPR MOTORS', codigo: 'M0019' },
          { nombre: 'PRETUL', codigo: 'M0020' },
          { nombre: 'Rexon', codigo: 'M0021' },
          { nombre: 'REYCAR', codigo: 'M0022' },
          { nombre: 'Rotake', codigo: 'M0023' },
          { nombre: 'SUMMARY', codigo: 'M0024' },
          { nombre: 'Tramontina', codigo: 'M0025' },
          { nombre: 'TRUPER', codigo: 'M0026' },
          { nombre: 'UYUSTOOLS', codigo: 'M0027' },
          { nombre: 'VIPER', codigo: 'M0028' },
          { nombre: 'WARC', codigo: 'M0029' }
        ];
        for (const marca of marcasIniciales) {
          await connection.execute(
            'INSERT INTO marcas (codigo, nombre, descripcion) VALUES (?, ?, ?)',
            [marca.codigo, marca.nombre, null]
          );
        }
        console.log('âœ“ Marcas iniciales insertadas');
      }
    } catch (error) {
      console.log('Aviso insertando marcas iniciales:', error.message);
    }
    
    console.log('Creando tabla maquinas...');
    await connection.execute(crearMaquinas);
    console.log('âœ“ Tabla maquinas creada exitosamente');

    // Asegurar columnas de ubicacion en maquinas
    try {
      await connection.execute('ALTER TABLE maquinas ADD COLUMN ubicacion_letra CHAR(1) NULL AFTER descripcion');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('ALTER TABLE maquinas ADD COLUMN ubicacion_numero INT NULL AFTER ubicacion_letra');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('ALTER TABLE maquinas ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Asegurar columnas de busqueda en maquinas (compatibles con MySQL 5.7)
    try {
      await connection.execute('ALTER TABLE maquinas ADD COLUMN codigo_busqueda VARCHAR(80) NULL');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('ALTER TABLE maquinas ADD COLUMN descripcion_busqueda VARCHAR(255) NULL');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_codigo_busqueda ON maquinas (codigo_busqueda)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_desc_busqueda ON maquinas (descripcion_busqueda)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_marca ON maquinas (marca)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_activo ON maquinas (activo)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_stock ON maquinas (stock)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_tipo_stock ON maquinas (tipo_maquina_id, stock)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await actualizarBusquedaMaquinas(connection);
    } catch (error) {
      console.log('Aviso actualizando columnas de busqueda:', error.message);
    }
    
    console.log('Creando tabla ingresos_salidas...');
    await connection.execute(crearIngresouSalidas);
    try {
      await connection.execute('CREATE INDEX idx_fecha_tipo ON ingresos_salidas (fecha, tipo)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_maquina_fecha ON ingresos_salidas (maquina_id, fecha)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    console.log('âœ“ Tabla ingresos_salidas creada exitosamente');

    console.log('Creando tabla cotizaciones...');
    await connection.execute(crearCotizaciones);
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
          'Aviso: existen cotizaciones duplicadas en (serie, correlativo). No se pudo crear indice unico.'
        );
      }
    }
    console.log('âœ“ Tabla cotizaciones creada exitosamente');

    console.log('Creando tabla detalle_cotizacion...');
    await connection.execute(crearDetalleCotizacion);
    console.log('âœ“ Tabla detalle_cotizacion creada exitosamente');

    console.log('Creando tabla historial_cotizaciones...');
    await connection.execute(crearHistorialCotizaciones);
    console.log('âœ“ Tabla historial_cotizaciones creada exitosamente');

    console.log('Creando tabla kits...');
    await connection.execute(crearKits);
    console.log('âœ“ Tabla kits creada exitosamente');

    console.log('Creando tabla kit_productos...');
    await connection.execute(crearKitProductos);
    console.log('âœ“ Tabla kit_productos creada exitosamente');

    console.log('Creando tabla clientes...');
    await connection.execute(crearClientes);
    console.log('âœ“ Tabla clientes creada exitosamente');

    console.log('Creando tabla clientes_usuarios...');
    await connection.execute(crearClientesUsuarios);
    console.log('âœ“ Tabla clientes_usuarios creada exitosamente');

    console.log('Creando tabla ventas...');
    await connection.execute(crearVentas);
    try {
      await connection.execute('CREATE INDEX idx_venta_created_at ON ventas (created_at)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    console.log('âœ“ Tabla ventas creada exitosamente');

    console.log('Creando tabla ventas_detalle...');
    await connection.execute(crearVentasDetalle);
    try {
      await connection.execute('CREATE INDEX idx_detalle_codigo ON ventas_detalle (codigo)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_detalle_desc ON ventas_detalle (descripcion(100))');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('CREATE INDEX idx_detalle_producto ON ventas_detalle (producto_id)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }
    try {
      await connection.execute(
        'CREATE INDEX idx_venta_tipo_picked ON ventas_detalle (venta_id, tipo, cantidad_picked)'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    // Asegurar columna cantidad_picked en ventas_detalle
    try {
      await connection.execute(
        'ALTER TABLE ventas_detalle ADD COLUMN cantidad_picked INT NOT NULL DEFAULT 0 AFTER cantidad'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
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
      console.log('Aviso backfill ventas_detalle.producto_id:', error.message);
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
      console.log('Aviso limpiando ventas_detalle.producto_id huerfano:', error.message);
    }
    console.log('âœ“ Tabla ventas_detalle creada exitosamente');

    // Asegurar columnas en ventas si ya existia con esquema anterior
    const columnasVentas = [
      "ADD COLUMN documento_tipo ENUM('dni','ruc') DEFAULT 'dni' AFTER usuario_id",
      'ADD COLUMN documento VARCHAR(20) NULL AFTER documento_tipo',
      'ADD COLUMN cliente_nombre VARCHAR(150) NULL AFTER documento',
      'ADD COLUMN cliente_telefono VARCHAR(30) NULL AFTER cliente_nombre',
      "ADD COLUMN agencia ENUM('SHALOM','MARVISUR','OLVA','OTROS','TIENDA') DEFAULT 'SHALOM' AFTER cliente_telefono",
      'ADD COLUMN agencia_otro VARCHAR(120) NULL AFTER agencia',
      'ADD COLUMN destino VARCHAR(120) NULL AFTER agencia_otro',
      'ADD COLUMN fecha_venta DATE NULL AFTER destino',
      "ADD COLUMN estado_envio ENUM('PENDIENTE','ENVIADO','CANCELADO','VISITA') DEFAULT 'PENDIENTE' AFTER fecha_venta",
      "ADD COLUMN estado_pedido ENUM('PICKING','PEDIDO_LISTO') DEFAULT 'PICKING' AFTER estado_envio",
      'ADD COLUMN fecha_despacho DATE NULL AFTER estado_envio',
      'ADD COLUMN fecha_cancelacion DATE NULL AFTER fecha_despacho',
      'ADD COLUMN adelanto DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER fecha_cancelacion',
      'ADD COLUMN p_venta DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER adelanto',
      "ADD COLUMN rastreo_estado VARCHAR(30) DEFAULT 'EN TRANSITO' AFTER p_venta",
      'ADD COLUMN ticket VARCHAR(60) NULL AFTER rastreo_estado',
      'ADD COLUMN guia VARCHAR(60) NULL AFTER ticket',
      'ADD COLUMN retiro VARCHAR(60) NULL AFTER guia',
      'ADD COLUMN notas TEXT NULL AFTER retiro',
      'ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER notas',
      'ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
    ];
    for (const alter of columnasVentas) {
      try {
        await connection.execute(`ALTER TABLE ventas ${alter}`);
      } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    // Marcar como pedido listo las ventas sin productos en tienda
    try {
      await connection.execute(
        `UPDATE ventas v
         SET estado_pedido = 'PEDIDO_LISTO'
         WHERE NOT EXISTS (
           SELECT 1 FROM ventas_detalle d
           WHERE d.venta_id = v.id AND d.tipo = 'producto'
         )`
      );
    } catch (error) {
      console.log('Aviso actualizando estado_pedido:', error.message);
    }

    // Si existia una columna "tipo" antigua en ventas, permitir NULL para evitar errores al insertar
    try {
      await connection.execute("ALTER TABLE ventas MODIFY COLUMN tipo VARCHAR(50) NULL");
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }

    console.log('Creando tabla inventarios...');
    await connection.execute(crearInventarios);
    console.log('âœ“ Tabla inventarios creada exitosamente');

    console.log('Creando tabla inventario_detalle...');
    await connection.execute(crearInventarioDetalle);
    console.log('Creando tabla maquinas_ubicaciones...');
    await connection.execute(crearMaquinasUbicaciones);
    console.log('âœ“ Tabla maquinas_ubicaciones creada exitosamente');
    console.log('âœ“ Tabla inventario_detalle creada exitosamente');
    await sincronizarUbicacionesBase(connection);

    // Asegurar columnas de ubicacion en inventario_detalle
    try {
      await connection.execute('ALTER TABLE inventario_detalle ADD COLUMN ubicacion_letra CHAR(1) NULL AFTER producto_id');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    try {
      await connection.execute('ALTER TABLE inventario_detalle ADD COLUMN ubicacion_numero INT NULL AFTER ubicacion_letra');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    try {
      await normalizarDatosNumericos(connection);
    } catch (error) {
      console.log('Aviso normalizando datos numericos:', error.message);
    }

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
        if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_FIELD_ERROR') {
          throw error;
        }
      }
    }

    try {
      await connection.execute(
        'ALTER TABLE inventario_detalle ADD UNIQUE KEY uniq_inventario_producto_ubicacion (inventario_id, producto_id, ubicacion_letra, ubicacion_numero)'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(
          'Aviso: existen inventario_detalle duplicados por inventario+producto+ubicacion. No se pudo reforzar clave unica.'
        );
      }
    }

    try {
      await addCheckConstraintIfMissing(
        connection,
        'maquinas',
        'chk_maquinas_stock_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_stock_nonneg CHECK (stock >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'maquinas',
        'chk_maquinas_pcompra_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pcompra_nonneg CHECK (precio_compra >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'maquinas',
        'chk_maquinas_pventa_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pventa_nonneg CHECK (precio_venta >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'maquinas',
        'chk_maquinas_pmin_nonneg',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pmin_nonneg CHECK (precio_minimo >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'maquinas',
        'chk_maquinas_pcompra_lte_pventa',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pcompra_lte_pventa CHECK (precio_compra <= precio_venta)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'maquinas',
        'chk_maquinas_pmin_lte_pventa',
        'ALTER TABLE maquinas ADD CONSTRAINT chk_maquinas_pmin_lte_pventa CHECK (precio_minimo <= precio_venta)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'ventas_detalle',
        'chk_vdet_cantidad_pos',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_cantidad_pos CHECK (cantidad >= 1)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'ventas_detalle',
        'chk_vdet_picked_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_picked_nonneg CHECK (cantidad_picked >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'ventas_detalle',
        'chk_vdet_picked_lte_cantidad',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_picked_lte_cantidad CHECK (cantidad_picked <= cantidad)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'ventas_detalle',
        'chk_vdet_pventa_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_pventa_nonneg CHECK (precio_venta >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'ventas_detalle',
        'chk_vdet_pcompra_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_pcompra_nonneg CHECK (precio_compra >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'ventas_detalle',
        'chk_vdet_pcompra_lte_pventa',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_pcompra_lte_pventa CHECK (precio_compra <= precio_venta)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'ventas_detalle',
        'chk_vdet_stock_nonneg',
        'ALTER TABLE ventas_detalle ADD CONSTRAINT chk_vdet_stock_nonneg CHECK (stock IS NULL OR stock >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'inventario_detalle',
        'chk_invdet_stock_nonneg',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_stock_nonneg CHECK (stock_actual >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'inventario_detalle',
        'chk_invdet_conteo_nonneg',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_conteo_nonneg CHECK (conteo >= 0)'
      );
      await addCheckConstraintIfMissing(
        connection,
        'inventario_detalle',
        'chk_invdet_diff_consistente',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_diff_consistente CHECK (diferencia = (conteo - stock_actual))'
      );
      await addCheckConstraintIfMissing(
        connection,
        'inventario_detalle',
        'chk_invdet_ubicacion_numero_pos',
        'ALTER TABLE inventario_detalle ADD CONSTRAINT chk_invdet_ubicacion_numero_pos CHECK (ubicacion_numero > 0)'
      );
    } catch (error) {
      console.log('Aviso agregando constraints CHECK:', error.message);
    }


    // Asegurar columna usuario_id en clientes si ya existÃ­a sin esa columna
    try {
      await connection.execute('ALTER TABLE clientes ADD COLUMN usuario_id INT NULL');
      await connection.execute('CREATE INDEX idx_usuario ON clientes (usuario_id)');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    try {
      await connection.execute(
        "ALTER TABLE clientes MODIFY COLUMN tipo_cliente ENUM('natural','juridico','ce') NOT NULL"
      );
    } catch (error) {
      console.log('Aviso actualizando enum tipo_cliente:', error.message);
    }
    try {
      await connection.execute('ALTER TABLE clientes MODIFY COLUMN dni VARCHAR(9) UNIQUE');
    } catch (error) {
      console.log('Aviso actualizando columna dni de clientes:', error.message);
    }

    // Limpieza destructiva: solo habilitar de forma explicita.
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
          'Aviso: limpieza de huerfanos omitida. Configure ALLOW_DESTRUCTIVE_MIGRATION=true para habilitarla.'
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
      console.log('Aviso limpiando huerfanos para llaves foraneas:', error.message);
    }

    try {
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
    } catch (error) {
      console.log('Aviso asegurando llaves foraneas:', error.message);
    }

    console.log('Creando tabla historial_acciones...');
    await connection.execute(crearHistorialAcciones);
    console.log('âœ“ Tabla historial_acciones creada exitosamente');

    console.log('Creando tabla roles...');
    await connection.execute(crearRoles);
    console.log('âœ“ Tabla roles creada exitosamente');

    console.log('Creando tabla permisos...');
    await connection.execute(crearPermisos);
    console.log('âœ“ Tabla permisos creada exitosamente');

    console.log('Creando tabla rol_permisos...');
    await connection.execute(crearRolPermisos);
    console.log('âœ“ Tabla rol_permisos creada exitosamente');

    // Insertar roles por defecto
    const rolesBase = ['admin', 'ventas', 'logistica'];
    for (const rol of rolesBase) {
      try {
        await connection.execute('INSERT INTO roles (nombre) VALUES (?)', [rol]);
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
      }
    }

    // Insertar permisos base
    const permisosBase = [
      { clave: 'productos.ver', descripcion: 'Ver productos', grupo: 'Inventario' },
      { clave: 'productos.editar', descripcion: 'Crear/Editar productos', grupo: 'Inventario' },
      { clave: 'productos.precio_compra.ver', descripcion: 'Ver precio de compra', grupo: 'Inventario' },
      { clave: 'tipos_maquinas.ver', descripcion: 'Ver tipos de maquinas', grupo: 'Inventario' },
      { clave: 'tipos_maquinas.editar', descripcion: 'Editar tipos de maquinas', grupo: 'Inventario' },
      { clave: 'marcas.ver', descripcion: 'Ver marcas', grupo: 'Inventario' },
      { clave: 'marcas.editar', descripcion: 'Editar marcas', grupo: 'Inventario' },
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
      { clave: 'permisos.editar', descripcion: 'Editar permisos por rol', grupo: 'Cuentas' },
      { clave: 'ventas.ver', descripcion: 'Ver ventas', grupo: 'Ventas' },
      { clave: 'ventas.editar', descripcion: 'Crear/Editar ventas', grupo: 'Ventas' },
      { clave: 'ventas.eliminar', descripcion: 'Eliminar ventas', grupo: 'Ventas' },
      { clave: 'picking.ver', descripcion: 'Ver picking de ventas', grupo: 'Ventas' },
      { clave: 'picking.editar', descripcion: 'Registrar picking de ventas', grupo: 'Ventas' }
    ];
    const permisosPorRolDefault = {
      admin: new Set(permisosBase.map((permiso) => permiso.clave)),
      ventas: new Set([
        'productos.ver',
        'tipos_maquinas.ver',
        'marcas.ver',
        'movimientos.ver',
        'inventario_general.ver',
        'kits.ver',
        'kits.editar',
        'cotizaciones.ver',
        'cotizaciones.editar',
        'cotizaciones.historial.ver',
        'clientes.ver',
        'clientes.editar',
        'ventas.ver',
        'ventas.editar',
        'picking.ver'
      ]),
      logistica: new Set([
        'productos.ver',
        'productos.editar',
        'productos.precio_compra.ver',
        'tipos_maquinas.ver',
        'tipos_maquinas.editar',
        'marcas.ver',
        'marcas.editar',
        'movimientos.ver',
        'movimientos.registrar',
        'historial.ver',
        'inventario_general.ver',
        'inventario_general.editar',
        'inventario_general.aplicar',
        'ventas.ver',
        'picking.ver',
        'picking.editar'
      ])
    };
    const permitidoPorDefecto = (rolNombre, clave) => {
      const permisosRol = permisosPorRolDefault[rolNombre];
      if (!permisosRol) return false;
      return permisosRol.has(clave);
    };

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

    // Asignar permisos por rol solo para relaciones faltantes.
    const [rolesRows] = await connection.execute('SELECT id, nombre FROM roles');
    const [permisosRows] = await connection.execute('SELECT id, clave FROM permisos');
    for (const rol of rolesRows) {
      for (const permiso of permisosRows) {
        const permitido = permitidoPorDefecto(rol.nombre, permiso.clave) ? 1 : 0;
        await connection.execute(
          'INSERT IGNORE INTO rol_permisos (rol_id, permiso_id, permitido) VALUES (?, ?, ?)',
          [rol.id, permiso.id, permitido]
        );
      }
    }
    
    // Insertar algunos tipos de mÃ¡quinas iniciales
    const tiposIniciales = [
      ['Torno', 'MÃ¡quinas para trabajo de metal'],
      ['Fresadora', 'MÃ¡quinas fresadoras para trabajo de precisiÃ³n'],
      ['Soldadora', 'Equipos de soldadura elÃ©ctrica'],
      ['Compresor', 'Compresores de aire'],
      ['Generador', 'Generadores elÃ©ctricos']
    ];
    
    console.log('Insertando tipos de mÃ¡quinas iniciales...');
    for (const [nombre, descripcion] of tiposIniciales) {
      try {
        await connection.execute(
          'INSERT INTO tipos_maquinas (nombre, descripcion) VALUES (?, ?)',
          [nombre, descripcion]
        );
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
      }
    }
    console.log('âœ“ Datos iniciales insertados');
    
    // Crear admin solo cuando se habilita explicitamente por ENV.
    const seedDefaultAdmin = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.SEED_DEFAULT_ADMIN || '').toLowerCase()
    );
    if (seedDefaultAdmin) {
      const adminPassword = String(process.env.ADMIN_PASSWORD || '').trim();
      if (adminPassword.length < 12) {
        console.log('Aviso: ADMIN_PASSWORD debe tener al menos 12 caracteres. No se creo admin.');
      } else {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);
        const adminNombre = String(process.env.ADMIN_NOMBRE || 'Administrador').trim() || 'Administrador';
        const adminEmail = String(process.env.ADMIN_EMAIL || 'admin').trim() || 'admin';
        const adminTelefono = String(process.env.ADMIN_TELEFONO || '000000000').trim() || null;

        try {
          await connection.execute(
            `INSERT INTO usuarios (nombre, email, telefono, \`${passwordColumn}\`, rol) VALUES (?, ?, ?, ?, ?)`,
            [adminNombre, adminEmail, adminTelefono, passwordHash, 'admin']
          );
          console.log(`âœ“ Usuario admin creado: ${adminEmail}`);
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
          console.log('âœ“ Usuario admin ya existe, se omite creacion');
        }
      }
    } else {
      console.log('Aviso: SEED_DEFAULT_ADMIN no habilitado. No se creo usuario administrador.');
    }

    connection.release();
    console.log('âœ“ Base de datos inicializada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    process.exit(1);
  }
}

inicializarBaseDatos();
