const pool = require('../config/database');

// Crear tabla de usuarios
const crearUsuarios = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
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

async function inicializarBaseDatos() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Creando tabla usuarios...');
    await connection.execute(crearUsuarios);
    console.log('✓ Tabla usuarios creada exitosamente');
    
    console.log('Creando tabla tipos_maquinas...');
    await connection.execute(crearTiposMaquinas);
    console.log('✓ Tabla tipos_maquinas creada exitosamente');
    
    console.log('Creando tabla maquinas...');
    await connection.execute(crearMaquinas);
    console.log('✓ Tabla maquinas creada exitosamente');
    
    console.log('Creando tabla ingresos_salidas...');
    await connection.execute(crearIngresouSalidas);
    console.log('✓ Tabla ingresos_salidas creada exitosamente');
    
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
        'INSERT INTO usuarios (nombre, email, contraseña, rol) VALUES (?, ?, ?, ?)',
        ['Administrador', 'admin@inventario.com', contraseñaHasheada, 'admin']
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
