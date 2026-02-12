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
  try {
    const conn = await mysql.createConnection(config);
    console.log('OK');
    await conn.end();
  } catch (error) {
    console.error('ERR', error.code || 'UNKNOWN', error.message);
    process.exit(1);
  }
})();
