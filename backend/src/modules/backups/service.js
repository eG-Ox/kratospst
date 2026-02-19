const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const DEFAULT_BACKUP_RETENTION_DAYS = 30;

const getBackupDir = () =>
  process.env.BACKUP_DIR ||
  path.join(__dirname, '..', '..', '..', '..', 'backups');

const safeRemoveFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_) {
    // no-op
  }
};

const getMysqlDumpPath = () => {
  const raw = process.env.MYSQLDUMP_PATH;
  if (raw) {
    if (raw.toLowerCase().endsWith('.exe')) {
      return raw;
    }
    return path.join(raw, 'mysqldump.exe');
  }

  const absoluteCandidates = [
    path.join('C:', 'Program Files', 'MariaDB 12.1', 'bin', 'mysqldump.exe'),
    path.join('C:', 'Program Files', 'MariaDB 10.11', 'bin', 'mysqldump.exe'),
    path.join('C:', 'Program Files', 'MySQL', 'MySQL Server 8.0', 'bin', 'mysqldump.exe')
  ];

  for (const candidate of absoluteCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'mysqldump';
};

const formatTimestamp = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
};

const parseNonNegativeInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const cleanupOldBackups = (backupDir) => {
  const retentionDays = parseNonNegativeInt(
    process.env.BACKUP_RETENTION_DAYS,
    DEFAULT_BACKUP_RETENTION_DAYS
  );
  if (retentionDays <= 0) return 0;

  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(backupDir).filter((name) => name.endsWith('.sql'));
  let removed = 0;

  for (const filename of files) {
    const filePath = path.join(backupDir, filename);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (_) {
      continue;
    }
    if (stat.mtimeMs < cutoffTime) {
      try {
        fs.unlinkSync(filePath);
        removed += 1;
      } catch (error) {
        console.error(`No se pudo eliminar backup antiguo (${filename}):`, error.message || error);
      }
    }
  }

  return removed;
};

const buildDumpConfig = () => {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || 3306;
  if (!database) {
    throw new Error('DB_NAME no configurado');
  }
  const args = [`--host=${host}`, `--user=${user}`, `--port=${port}`];
  args.push(database);
  return { args, password };
};

const ejecutarBackup = async () => {
  const backupDir = getBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });
  const filename = `backup_${formatTimestamp()}.sql`;
  const filepath = path.join(backupDir, filename);
  const { args, password } = buildDumpConfig();
  const dumpPath = getMysqlDumpPath();
  if (dumpPath !== 'mysqldump' && !fs.existsSync(dumpPath)) {
    throw new Error('MYSQLDUMP_PATH invalido. Configura la ruta al ejecutable mysqldump.exe');
  }

  try {
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(filepath, { encoding: 'utf8', mode: 0o600 });
      const env = { ...process.env };
      if (password) {
        // Avoid exposing DB password in process args.
        env.MYSQL_PWD = password;
      }
      const proc = spawn(dumpPath, args, { windowsHide: true, env });
      let stderr = '';

      proc.stdout.pipe(out);
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      proc.on('error', (err) => {
        reject(err);
      });
      proc.on('close', (code) => {
        out.end();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `mysqldump fallo con codigo ${code}`));
        }
      });
    });
  } catch (error) {
    safeRemoveFile(filepath);
    if (error && error.code === 'ENOENT') {
      throw new Error(
        'No se encontro mysqldump. Configure MYSQLDUMP_PATH con la ruta del ejecutable.'
      );
    }
    throw error;
  }

  const stat = fs.statSync(filepath);
  if (!stat.size) {
    safeRemoveFile(filepath);
    throw new Error('Backup vacio. Verifique credenciales/permisos de BD.');
  }

  const removedCount = cleanupOldBackups(backupDir);
  return { filename, filepath, removedCount };
};

module.exports = {
  cleanupOldBackups,
  ejecutarBackup,
  getBackupDir
};
