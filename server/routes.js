const express = require('express');
const { discoverUsers, userResponse, getPlaydates } = require('./controllers');

const {
  getUserPacksId,
  getUserInformation,
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getSoloPosts,
  getPfp
} = require('./controllers/packFeed.js');

const router = express.Router();

// Route handling discover nearby users
router.get('/api/discover', discoverUsers);

// Route handling response (dig/deny) from current user
router.post('/api/response', userResponse);

// Route handling getting all playdates for packs current user is a member of
router.get('/playdates', getPlaydates);

router.post('/getAllPostsFromSpecificPack', (req, res) => {
  var packId = req.body.packId;
  getPackPosts(packId).then((response) => {
    res.status(201).send(response);
  });
});

router.post('/getUserPacks', (req, res) => {
  var packId = req.body.userId;
  getUserPacksId(packId, res);
});

router.post('/getAllPacksPostsForUser', (req, res) => {
  var userId = req.body.userId;
  getAllPostsFromAllPacks(userId, res);
});

router.post('/getUserPlaydates', (req, res) => {
  var userId = req.body.userId;
  getUserPlaydatesAllPacks(userId, res);
});

router.post('/getSoloPosts', (req, res) => {
  var userId = req.body.userId;
  var packId = req.body.packId;
  // console.log('packId', packId);
  // getUserPlaydatesAllPacks(userId, res);
  getSoloPosts(userId, packId, res);
});

router.post('/getPfp', (req, res) => {
  var userId = req.body.userId;
  getPfp(userId, res);
});

module.exports = router;
