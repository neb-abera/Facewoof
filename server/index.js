/* eslint-disable no-console */
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db/database');
const router = require('./routes');

const app = express();

// ----- Middleware ----- //

// need the following routes approved for cors in deployed version
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://developer.okta.com/',
    'dev-77750792.okta.com',
    'okta.com'
  ]
};

// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*');
// });
// app.use(express.static(path.join(__dirname, '../dist')));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('path to .env is ', path.join(__dirname, '../.env'));
console.log('process.env.VITE_PGUSERNAME ', process.env.VITE_PGUSERNAME);
// ----- Request handling ----- //
app.use(router);

db.connect()
  .then(() => {
    console.log('database connected');
    app.listen(process.env.VITE_SERVER_PORT, () => {
      console.log(`Server started on port ${process.VITE_SERVER_PORT}`);
    });
  })
  .catch((err) => console.log(err));

module.exports = app;
