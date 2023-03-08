const axios = require('axios');
const express = require('express');
const path = require('path');
const cors = require('cors');
const packFeed = require('./controllers/packFeed.js');
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

app.post('/getAllPostsFromSpecificPack', (req, res) => {
  var packId = req.body.packId;
  packFeed.getPackPosts(packId).then((response) => {
    res.status(201).send(response);
  });
});

app.post('/getUserPacks', (req, res) => {
  var packId = req.body.userId;
  packFeed.getUserPacksId(packId, res);
});

app.post('/getAllPacksPostsForUser', (req, res) => {
  var userId = req.body.userId;
  packFeed.getAllPostsFromAllPacks(userId, res);
});

app.post('/getUserPlaydates', (req, res) => {
  var userId = req.body.userId;
  packFeed.getUserPlaydatesAllPacks(userId, res);
});

app.post('/getSoloPosts', (req, res) => {
  var userId = req.body.userId;
  var packId = req.body.packId;
  // console.log('packId', packId);
  // packFeed.getUserPlaydatesAllPacks(userId, res);
  packFeed.getSoloPosts(userId, packId, res);
});

app.post('/getPfp', (req, res) => {
  var userId = req.body.userId;
  packFeed.getPfp(userId, res);
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
