const pool = require('../config/database');

// Crear tabla de usuarios
const crearUsuarios = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  telefono VARCHAR(30),
  contraseña VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'operario') NOT NULL DEFAULT 'operario',
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
    
    console.log('Creando tabla tipos_maquinas...');
    await connection.execute(crearTiposMaquinas);
    console.log('✓ Tabla tipos_maquinas creada exitosamente');
    
    console.log('Creando tabla maquinas...');
    await connection.execute(crearMaquinas);
    console.log('✓ Tabla maquinas creada exitosamente');
    
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

    // Asegurar columna usuario_id en clientes si ya existía sin esa columna
    try {
      await connection.execute('ALTER TABLE clientes ADD COLUMN usuario_id INT NULL');
      await connection.execute('CREATE INDEX idx_usuario ON clientes (usuario_id)');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME' && error.code !== 'ER_DUP_KEYNAME') {
        throw error;
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
