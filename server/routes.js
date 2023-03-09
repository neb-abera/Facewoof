const express = require('express');
const {
  discoverUsers,
  userResponse,
  getPlaydates,
  AddPlaydate,
  getUserPacks,
  addUserToPack,
  createNewPackAndAdd,
  authUser,
  getCurrentUser,
  getUserFriends,
  createPack
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

// Route to check if user exists and create if not
router.put('/api/authuser', authUser);

// Route handling discover nearby users
router.get('/api/discover', discoverUsers);

// Route handling response (dig/deny) from current user
router.post('/api/response', userResponse);

// Route handling getting all playdates for packs current user is a member of
router.get('/api/playdates', getPlaydates);

// Route handling added a playdate
router.post('/api/addplaydate', AddPlaydate);

// Route hanlding getting all packs for current
router.get('/api/getpacks', getUserPacks);

// Route to add person to existing pack
router.put('/api/addtopack', addUserToPack);

// Route to create a new pack and add user ids
// Expects a pack_name and array of user ids in the req body
router.put('/api/createpack', createNewPackAndAdd);

// Route to get friends request
router.get('/getFriends', getUserFriends);
// 'http://localhost:3000/getFriends?userId=1'

// Route to get current user request
router.get('/getCurrentUser', getCurrentUser);

// Route to create pack
router.post('/createPack', createPack);

router.get('/api/getAllPostsFromSpecificPack', (req, res) => {
  // var packId = req.body.packId;
  var { packId } = req.query;
  getPackPosts(packId).then((response) => {
    res.status(201).send(response);
  });
});

router.get('/api/getUserPacks', (req, res) => {
  // var packId = req.body.userId;
  var { userId } = req.query;
  // console.log('userId', userId);
  getUserPacksId(userId, res);
});

router.get('/api/getAllPacksPostsForUser', (req, res) => {
  var { userId } = req.query;
  getAllPostsFromAllPacks(userId, res);
});

router.get('/api/getUserPlaydates', (req, res) => {
  var { userId } = req.query;
  getUserPlaydatesAllPacks(userId, res);
});

router.get('/api/getSoloPosts', (req, res) => {
  var { userId, packId } = req.query;
  // var packId = req.body.packId;
  getSoloPosts(userId, packId, res);
});

router.get('/api/getPfp', (req, res) => {
  // var userId = req.body.userId;
  var { userId } = req.query;
  getPfp(userId, res);
});

router.post('/api/makePost', (req, res) => {
  console.log('received request to make post');
});

module.exports = router;
