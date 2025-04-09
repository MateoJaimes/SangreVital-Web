// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sangre_vital',
  password: process.env.DB_PASSWORD || 'Mateo051221',
  port: process.env.DB_PORT || 5432,
});

module.exports = pool; // <-- exportamos directamente el pool
