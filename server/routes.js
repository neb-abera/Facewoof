const express = require('express');
const {
  discoverUsers,
  userResponse,
  getPlaydates,
  getUserPacks,
  addUserToPack,
  createNewPackAndAdd
} = require('./controllers');

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
router.get('/api/playdates', getPlaydates);

// Route hanlding getting all packs for current
router.get('/api/getpacks', getUserPacks);

// Route to add person to existing pack
router.put('/api/addtopack', addUserToPack);

// Route to create a new pack and add user ids
// Expects a pack_name and array of user ids in the req body
router.put('/api/createpack', createNewPackAndAdd);

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
  getSoloPosts(userId, packId, res);
});

router.post('/getPfp', (req, res) => {
  var userId = req.body.userId;
  getPfp(userId, res);
});

router.post('/makePost', (req, res) => {
  console.log('received request to make post');
});

module.exports = router;
