const express = require('express');
const {
  discoverUsers,
  userResponse,
  getPlaydates,
  getUserPacks,
  addUserToPack,
  createNewPackAndAdd,
  authUser
} = require('./controllers');
const {
  getCurrentUser,
  getFriends,
  getPacks,
  addToPack,
  createPack
  } = require('./db/ProfileControllers');

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

// Route hanlding getting all packs for current
router.get('/api/getpacks', getUserPacks);

// Route to add person to existing pack
router.put('/api/addtopack', addUserToPack);

// Route to create a new pack and add user ids
// Expects a pack_name and array of user ids in the req body
router.put('/api/createpack', createNewPackAndAdd);

//idk how yall make it look so neat lol
router.get('/getFriends', (req, res) => {
  getFriends(1, (err, results) => {
    if (err) {
      console.log('ERR SON', err);
    } else {
      // console.log('SUCCESSSS', results);
      res.status(200);
      res.json(results);
      res.end();
    }
  });
});

router.get('/getCurrentUser', (req, res) => {
  getCurrentUser(1, (err, results) => {
    if (err) {
      console.log('ERR SON', err);
    } else {
      // console.log('SUCCESSSS', results);
      res.status(200);
      res.json(results);
      res.end();
    }
  });
});

router.get('/getPacks', (req, res) => {
  getPacks(1, (err, results) => {
    if (err) {
      console.log('ERR SON', err);
    } else {
      // console.log('SUCCESSSS', results);
      res.status(200);
      res.json(results);
      res.end();
    }
  });
});

router.post('/addToPack', (req, res) => {
  const id = req.body.data.packId;
  const { userId } = req.body.data;
  console.log('add to pack', id, userId);
  addToPack(id, userId, (err, results) => {
    if (err) {
      console.log('ERR SON', err);
    } else {
      // console.log('SUCCESSSS', results);
      res.status(200);
      res.json(results);
      res.end();
    }
  });
});

router.post('/createPack', (req, res) => {
  const { packName } = req.body.data;
  console.log('create pack', packName);
  createPack(packName, (err, results) => {
    if (err) {
      console.log('ERR SON', err);
    } else {
      // console.log('SUCCESSSS', results);
      res.status(200);
      res.json(results);
      res.end();
    }
  });
});

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
