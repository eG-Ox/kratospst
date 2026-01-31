const pool = require('../config/database');

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

// Crear tabla de máquinas
const crearMaquinas = `
CREATE TABLE IF NOT EXISTS maquinas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  tipo_maquina_id INT NOT NULL,
  marca VARCHAR(100) NOT NULL,
  descripcion TEXT,
  ubicacion_letra CHAR(1),
  ubicacion_numero INT,
  stock INT NOT NULL DEFAULT 0,
  precio_compra DECIMAL(10, 2) NOT NULL,
  precio_venta DECIMAL(10, 2) NOT NULL,
  precio_minimo DECIMAL(10, 2) NOT NULL,
  ficha_web VARCHAR(255),
  ficha_tecnica_ruta VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tipo_maquina_id) REFERENCES tipos_maquinas(id) ON DELETE RESTRICT,
  INDEX idx_codigo (codigo),
  INDEX idx_tipo (tipo_maquina_id)
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
  INDEX idx_producto (producto_id)
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

    console.log('Creando tabla inventarios...');
    await connection.execute(crearInventarios);
    console.log('✓ Tabla inventarios creada exitosamente');

    console.log('Creando tabla inventario_detalle...');
    await connection.execute(crearInventarioDetalle);
    console.log('✓ Tabla inventario_detalle creada exitosamente');

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
        ['Administrador', 'admin@inventario.com', '000000000', contraseñaHasheada, 'admin']
      );
      console.log('✓ Usuario administrador creado: admin@inventario.com / admin123');
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
