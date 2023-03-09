const express = require('express');
const {
  discoverUsers,
  userResponse,
  getPlaydates,
  getUserPacks,
  addUserToPack,
  createNewPackAndAdd,
  getCurrentUser,
  getUserFriends,
  createPack
} = require('./controllers');

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

// Route to get friends request
router.get('/getFriends', getUserFriends);
// 'http://localhost:3000/getFriends?userId=1'

// Route to get current user request
router.get('/getCurrentUser', getCurrentUser);

// Route to create pack
router.post('/createPack', createPack);

module.exports = router;
