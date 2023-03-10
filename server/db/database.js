const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = new Client({
  user: 'hri',
  host: 'ec2-18-206-100-236.compute-1.amazonaws.com',
  database: 'facewoof',
  password: 'sprint',
  port: 5432
});

module.exports = db;
