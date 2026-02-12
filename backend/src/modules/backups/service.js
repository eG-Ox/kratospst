const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const getBackupDir = () =>
  process.env.BACKUP_DIR ||
  path.join(__dirname, '..', '..', '..', 'backups');

const getMysqlDumpPath = () => {
  const raw = process.env.MYSQLDUMP_PATH;
  if (raw) {
    if (raw.toLowerCase().endsWith('.exe')) {
      return raw;
    }
    return path.join(raw, 'mysqldump.exe');
  }

  const candidates = [
    'mysqldump',
    path.join('C:', 'Program Files', 'MariaDB 12.1', 'bin', 'mysqldump.exe'),
    path.join('C:', 'Program Files', 'MariaDB 10.11', 'bin', 'mysqldump.exe'),
    path.join('C:', 'Program Files', 'MySQL', 'MySQL Server 8.0', 'bin', 'mysqldump.exe')
  ];

  for (const candidate of candidates) {
    if (candidate === 'mysqldump') {
      return candidate;
    }
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

const buildDumpArgs = () => {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || 3306;
  if (!database) {
    throw new Error('DB_NAME no configurado');
  }
  const args = [
    `--host=${host}`,
    `--user=${user}`,
    `--port=${port}`,
  ];
  if (password) {
    args.push(`--password=${password}`);
  }
  args.push(database);
  return args;
};

const ejecutarBackup = async () => {
  const backupDir = getBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });
  const filename = `backup_${formatTimestamp()}.sql`;
  const filepath = path.join(backupDir, filename);
  const args = buildDumpArgs();
  const dumpPath = getMysqlDumpPath();
  if (dumpPath !== 'mysqldump' && !fs.existsSync(dumpPath)) {
    throw new Error('MYSQLDUMP_PATH invalido. Configura la ruta al ejecutable mysqldump.exe');
  }

  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filepath, { encoding: 'utf8' });
    const proc = spawn(dumpPath, args, { windowsHide: true });
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

  return { filename, filepath };
};

module.exports = {
  ejecutarBackup,
  getBackupDir,
};
