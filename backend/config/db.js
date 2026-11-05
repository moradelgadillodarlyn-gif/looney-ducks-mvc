const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'looney_ducks_db',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud')
        ? { rejectUnauthorized: false }
        : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

module.exports = pool;