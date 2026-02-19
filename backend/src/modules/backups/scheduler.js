const os = require('os');
const pool = require('../../core/config/database');
const { ejecutarBackup } = require('./service');

const SCHEDULE_TABLE_NAME = 'backup_ejecuciones';
const DEFAULT_RUN_RETENTION_DAYS = 120;
let ensureScheduleTablePromise = null;

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseNonNegativeInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const shouldRun = (date = new Date()) => {
  const day = date.getDay(); // 0=Dom, 1=Lun
  const hour = date.getHours();
  const minute = date.getMinutes();
  if (minute !== 0) return false;
  if (day >= 1 && day <= 5) {
    return hour === 17;
  }
  if (day === 6) {
    return hour === 12;
  }
  return false;
};

const buildRunKey = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}`;
};

const getSchedulerNodeId = () =>
  process.env.BACKUP_NODE_ID || `${os.hostname()}-${process.pid}`;

const releaseConnection = (connection) => {
  if (!connection) return;
  try {
    connection.release();
  } catch (_) {
    // no-op
  }
};

const ensureScheduleTable = async (connection) => {
  await connection.execute(
    `CREATE TABLE IF NOT EXISTS ${SCHEDULE_TABLE_NAME} (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      run_key VARCHAR(40) NOT NULL UNIQUE,
      ejecutado_por VARCHAR(120) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_backup_ejecuciones_created_at (created_at)
    )`
  );
};

const ensureScheduleTableReady = async (connection) => {
  if (!ensureScheduleTablePromise) {
    ensureScheduleTablePromise = ensureScheduleTable(connection);
  }
  try {
    await ensureScheduleTablePromise;
  } catch (error) {
    ensureScheduleTablePromise = null;
    throw error;
  }
};

const cleanupOldScheduleRows = async (connection) => {
  const retentionDays = parseNonNegativeInt(
    process.env.BACKUP_SCHEDULE_RETENTION_DAYS,
    DEFAULT_RUN_RETENTION_DAYS
  );
  if (retentionDays <= 0) return;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  await connection.execute(
    `DELETE FROM ${SCHEDULE_TABLE_NAME} WHERE created_at < ?`,
    [cutoff]
  );
};

const claimRunKey = async (runKey) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await ensureScheduleTableReady(connection);
    const [result] = await connection.execute(
      `INSERT IGNORE INTO ${SCHEDULE_TABLE_NAME} (run_key, ejecutado_por) VALUES (?, ?)`,
      [runKey, getSchedulerNodeId()]
    );
    if (result.affectedRows === 1) {
      await cleanupOldScheduleRows(connection);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error reservando ejecucion de backup:', error.message || error);
    return false;
  } finally {
    releaseConnection(connection);
  }
};

const startBackupScheduler = () => {
  const enabled = parseBoolean(
    process.env.BACKUP_SCHEDULER_ENABLED,
    false
  );
  if (!enabled) {
    console.log('Backup scheduler deshabilitado. Configure BACKUP_SCHEDULER_ENABLED=true para activarlo.');
    return;
  }

  let running = false;
  let lastRunKey = null;

  setInterval(async () => {
    const now = new Date();
    if (!shouldRun(now)) return;
    const key = buildRunKey(now);
    if (lastRunKey === key || running) return;

    running = true;
    lastRunKey = key;
    try {
      const acquired = await claimRunKey(key);
      if (!acquired) {
        console.log(`Backup automatico omitido: la ventana ${key} ya fue ejecutada por otra instancia.`);
        return;
      }
      const result = await ejecutarBackup();
      console.log(`Backup automatico completado: ${result.filename}`);
    } catch (error) {
      console.error('Error en backup automatico:', error.message || error);
    } finally {
      running = false;
    }
  }, 60 * 1000);
};

module.exports = { startBackupScheduler };
