const path = require('path');
const { ejecutarBackup, getBackupDir } = require('./service');

exports.backupManual = async (req, res) => {
  try {
    const result = await ejecutarBackup();
    res.json({ ok: true, archivo: result.filename });
  } catch (error) {
    console.error('Error creando backup manual:', error);
    res.status(500).json({ error: 'Error al crear backup' });
  }
};

exports.listarBackups = async (req, res) => {
  try {
    const dir = getBackupDir();
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      return res.json([]);
    }
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => ({
        archivo: file,
        fecha: fs.statSync(path.join(dir, file)).mtime
      }))
      .sort((a, b) => b.fecha - a.fecha)
      .slice(0, 20);
    res.json(files);
  } catch (error) {
    console.error('Error listando backups:', error);
    res.status(500).json({ error: 'Error al listar backups' });
  }
};
