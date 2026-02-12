const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  connectTimeout: 5000
};

(async () => {
  const conn = await mysql.createConnection(config);
  const [cols] = await conn.query("SHOW COLUMNS FROM maquinas LIKE 'codigo_busqueda'");
  const [colsDesc] = await conn.query("SHOW COLUMNS FROM maquinas LIKE 'descripcion_busqueda'");
  const [idxRows] = await conn.query(
    "SHOW INDEX FROM maquinas WHERE Key_name IN ('idx_codigo_busqueda','idx_desc_busqueda')"
  );
  const idxNames = Array.from(new Set(idxRows.map((row) => row.Key_name)));
  const [counts] = await conn.query(
    `SELECT
       COUNT(*) as total,
       SUM(codigo_busqueda IS NULL OR codigo_busqueda = '') as codigo_vacios,
       SUM(descripcion_busqueda IS NULL OR descripcion_busqueda = '') as descripcion_vacias
     FROM maquinas`
  );
  const [tabUbis] = await conn.query("SHOW TABLES LIKE 'maquinas_ubicaciones'");
  let ubisTotal = null;
  let ubisSinBase = null;
  if (tabUbis.length) {
    const [ubis] = await conn.query('SELECT COUNT(*) as total FROM maquinas_ubicaciones');
    const [ubisNulos] = await conn.query(
      `SELECT COUNT(*) as total
       FROM maquinas
       WHERE activo = TRUE AND ubicacion_letra IS NOT NULL AND ubicacion_numero IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM maquinas_ubicaciones mu WHERE mu.producto_id = maquinas.id)`
    );
    ubisTotal = ubis[0]?.total ?? 0;
    ubisSinBase = ubisNulos[0]?.total ?? 0;
  }

  const expected = [
    'usuarios',
    'tipos_maquinas',
    'marcas',
    'maquinas',
    'ingresos_salidas',
    'cotizaciones',
    'detalle_cotizacion',
    'historial_cotizaciones',
    'kits',
    'kit_productos',
    'historial_acciones',
    'inventarios',
    'inventario_detalle',
    'maquinas_ubicaciones',
    'roles',
    'permisos',
    'rol_permisos',
    'clientes',
    'ventas',
    'ventas_detalle'
  ];
  const [tables] = await conn.query('SHOW TABLES');
  const tableSet = new Set(
    tables.map((row) => {
      const key = Object.keys(row)[0];
      return row[key];
    })
  );
  const missing = expected.filter((name) => !tableSet.has(name));
  console.log('codigo_busqueda', cols.length ? 'YES' : 'NO');
  console.log('descripcion_busqueda', colsDesc.length ? 'YES' : 'NO');
  console.log('idx_busqueda', idxNames.length ? idxNames.join(', ') : 'NO');
  console.log('maquinas_total', counts[0]?.total ?? 0);
  console.log('codigo_busqueda_vacios', counts[0]?.codigo_vacios ?? 0);
  console.log('descripcion_busqueda_vacias', counts[0]?.descripcion_vacias ?? 0);
  console.log('maquinas_ubicaciones_total', ubisTotal === null ? 'NO_TABLE' : ubisTotal);
  console.log('maquinas_sin_ubicacion_base', ubisSinBase === null ? 'NO_TABLE' : ubisSinBase);
  console.log('missing_tables', missing.length ? missing.join(', ') : 'NONE');
  await conn.end();
})();
