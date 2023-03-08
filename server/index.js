const axios = require('axios');
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ----- Middleware ----- //
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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

// ----- Request handling ----- //
app.get('/', (req, res) => {
  console.log('GET REQUEST');
  res.send('received');
});

app.listen(3001, () => {
  console.log('Server started on port 3001');
});

module.exports = app;
