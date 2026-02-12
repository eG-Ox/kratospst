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
