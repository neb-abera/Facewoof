const axios = require('axios');
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ----- Middleware ----- //
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

const db = require('./db/database');

// ----- Request handling ----- //
app.get('/', (req, res) => {
  console.log('GET REQUEST');
  res.send('received');
});

db.connect()
  .then((res) => {
    console.log('Connected to db');
    app.listen(3001, () => {
      console.log('Server started on port 3001');
    });
  })
  .catch((err) => {
    console.log('Error connecting to db', err);
  });

module.exports = app;
