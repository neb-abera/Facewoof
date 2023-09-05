const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = new Client({
  user: import.meta.env.VITE_PGUSERNAME,
  host: import.meta.env.VITE_PPGHOST,
  database: import.meta.env.VITE_PPGDATABASE,
  password: import.meta.env.VITE_PPGPASSWORD,
  port: import.meta.env.VITE_PPGPORT
});

module.exports = db;
