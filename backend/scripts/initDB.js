const pool = require('../config/database');

const normalizarBusqueda = (value) =>
  String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

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

// Crear tabla de usuarios
const crearUsuarios = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  telefono VARCHAR(30),
  contraseña VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'ventas', 'logistica') NOT NULL DEFAULT 'ventas',
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
`;

// Crear tabla de tipos de máquinas
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

// Crear tabla de máquinas
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
  INDEX idx_usuario (usuario_id),
  INDEX idx_fecha (fecha)
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
  tipo_cliente ENUM('natural', 'juridico') NOT NULL,
  dni VARCHAR(8) UNIQUE,
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
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  INDEX idx_venta_detalle (venta_id),
  INDEX idx_venta_tipo (tipo),
  INDEX idx_detalle_codigo (codigo),
  INDEX idx_detalle_desc (descripcion(100))
);
`;

async function inicializarBaseDatos() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Creando tabla usuarios...');
    await connection.execute(crearUsuarios);
    console.log('✓ Tabla usuarios creada exitosamente');

    // Asegurar columna telefono en usuarios (por si ya existía sin esa columna)
    try {
      await connection.execute('ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(30) NULL AFTER email');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }


    // Actualizar enum de roles si ya existÃ­a
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
    console.log('✓ Tabla tipos_maquinas creada exitosamente');

    console.log('Creando tabla marcas...');
    await connection.execute(crearMarcas);
    console.log('✓ Tabla marcas creada exitosamente');

    // Insertar marcas iniciales si la tabla está vacía
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
        console.log('✓ Marcas iniciales insertadas');
      }
    } catch (error) {
      console.log('Aviso insertando marcas iniciales:', error.message);
    }
    
    console.log('Creando tabla maquinas...');
    await connection.execute(crearMaquinas);
    console.log('✓ Tabla maquinas creada exitosamente');

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
      await actualizarBusquedaMaquinas(connection);
    } catch (error) {
      console.log('Aviso actualizando columnas de busqueda:', error.message);
    }
    
    console.log('Creando tabla ingresos_salidas...');
    await connection.execute(crearIngresouSalidas);
    console.log('✓ Tabla ingresos_salidas creada exitosamente');

    console.log('Creando tabla cotizaciones...');
    await connection.execute(crearCotizaciones);
    console.log('✓ Tabla cotizaciones creada exitosamente');

    console.log('Creando tabla detalle_cotizacion...');
    await connection.execute(crearDetalleCotizacion);
    console.log('✓ Tabla detalle_cotizacion creada exitosamente');

    console.log('Creando tabla historial_cotizaciones...');
    await connection.execute(crearHistorialCotizaciones);
    console.log('✓ Tabla historial_cotizaciones creada exitosamente');

    console.log('Creando tabla kits...');
    await connection.execute(crearKits);
    console.log('✓ Tabla kits creada exitosamente');

    console.log('Creando tabla kit_productos...');
    await connection.execute(crearKitProductos);
    console.log('✓ Tabla kit_productos creada exitosamente');

    console.log('Creando tabla clientes...');
    await connection.execute(crearClientes);
    console.log('✓ Tabla clientes creada exitosamente');

    console.log('Creando tabla clientes_usuarios...');
    await connection.execute(crearClientesUsuarios);
    console.log('✓ Tabla clientes_usuarios creada exitosamente');

    console.log('Creando tabla ventas...');
    await connection.execute(crearVentas);
    try {
      await connection.execute('CREATE INDEX idx_venta_created_at ON ventas (created_at)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    console.log('✓ Tabla ventas creada exitosamente');

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
    console.log('✓ Tabla ventas_detalle creada exitosamente');

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
    console.log('✓ Tabla inventarios creada exitosamente');

    console.log('Creando tabla inventario_detalle...');
    await connection.execute(crearInventarioDetalle);
    console.log('Creando tabla maquinas_ubicaciones...');
    await connection.execute(crearMaquinasUbicaciones);
    console.log('✓ Tabla maquinas_ubicaciones creada exitosamente');
    console.log('✓ Tabla inventario_detalle creada exitosamente');
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
      await connection.execute(
        'ALTER TABLE inventario_detalle ADD UNIQUE KEY uniq_inventario_producto_ubicacion (inventario_id, producto_id, ubicacion_letra, ubicacion_numero)'
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }


    // Asegurar columna usuario_id en clientes si ya existía sin esa columna
    try {
      await connection.execute('ALTER TABLE clientes ADD COLUMN usuario_id INT NULL');
      await connection.execute('CREATE INDEX idx_usuario ON clientes (usuario_id)');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    console.log('Creando tabla historial_acciones...');
    await connection.execute(crearHistorialAcciones);
    console.log('✓ Tabla historial_acciones creada exitosamente');

    console.log('Creando tabla roles...');
    await connection.execute(crearRoles);
    console.log('✓ Tabla roles creada exitosamente');

    console.log('Creando tabla permisos...');
    await connection.execute(crearPermisos);
    console.log('✓ Tabla permisos creada exitosamente');

    console.log('Creando tabla rol_permisos...');
    await connection.execute(crearRolPermisos);
    console.log('✓ Tabla rol_permisos creada exitosamente');

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

    // Asignar todos los permisos a todos los roles por defecto
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
    
    // Insertar algunos tipos de máquinas iniciales
    const tiposIniciales = [
      ['Torno', 'Máquinas para trabajo de metal'],
      ['Fresadora', 'Máquinas fresadoras para trabajo de precisión'],
      ['Soldadora', 'Equipos de soldadura eléctrica'],
      ['Compresor', 'Compresores de aire'],
      ['Generador', 'Generadores eléctricos']
    ];
    
    console.log('Insertando tipos de máquinas iniciales...');
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
    console.log('✓ Datos iniciales insertados');
    
    // Insertar usuario administrador por defecto
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const contraseñaHasheada = await bcrypt.hash('admin123', salt);
    
    try {
      await connection.execute(
        'INSERT INTO usuarios (nombre, email, telefono, contraseña, rol) VALUES (?, ?, ?, ?, ?)',
        ['Administrador', 'admin', '000000000', contraseñaHasheada, 'admin']
      );
      console.log('✓ Usuario administrador creado: admin / admin123');
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
      console.log('✓ Usuario administrador ya existe');
    }
    
    connection.release();
    console.log('✓ Base de datos inicializada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    process.exit(1);
  }
}

inicializarBaseDatos();
