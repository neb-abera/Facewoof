/* eslint-disable no-console */
const express = require('express');
// const path = require('path');
const cors = require('cors');
require('dotenv').config();
const db = require('./db/database');
const router = require('./routes');

const app = express();

const PORT = 3001;

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
// app.use(express.static(path.join(__dirname, '../dist')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- Request handling ----- //
app.use(router);

db.connect()
  .then(() => {
    console.log('database connected');
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));

module.exports = app;
