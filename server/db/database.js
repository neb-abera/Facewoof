const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = new Client({
  user: process.env.VITE_PGUSERNAME,
  host: process.env.VITE_PGHOST,
  database: process.env.VITE_PGDATABASE,
  password: process.env.VITE_PGPASSWORD,
  port: process.env.VITE_PGPORT
});

module.exports = db;
