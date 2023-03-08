/* eslint-disable no-console */
const express = require('express');
// const path = require('path');
const cors = require('cors');
const packFeed = require('./controllers/packFeed.js');
require('dotenv').config();
const db = require('./db/database');
const router = require('./routes');

const app = express();

const PORT = 3001;

// ----- Middleware ----- //
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- Request handling ----- //
app.use(router);

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
  .then(() => {
    console.log('database connected');
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));

module.exports = app;
