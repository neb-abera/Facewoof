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
  getCurrentUser,
  getFriends,
  getPacks,
  addToPack,
  createPack
  } = require('./db/ProfileControllers');

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
module.exports = router;
