const { ejecutarBackup } = require('./service');

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

const startBackupScheduler = () => {
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
      await ejecutarBackup();
      console.log('Backup automatico completado.');
    } catch (error) {
      console.error('Error en backup automatico:', error.message || error);
    } finally {
      running = false;
    }
  }, 60 * 1000);
};

module.exports = { startBackupScheduler };
