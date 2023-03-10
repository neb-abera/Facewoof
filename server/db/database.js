const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// console.log('process.env.PGUSERNAME', process.env.PGUSERNAME);
const db = new Client({
  user: process.env.PGUSERNAME,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
});

module.exports = db;
