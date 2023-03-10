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
  createPack,
  createPhotos,
  editProfile,
  getProfilePhoto,
  ctrlUserPacksId,
  ctrlPackPosts,
  ctrlAllPostsFromAllPacks,
  ctrlUserPlaydatesAllPacks,
  ctrlSoloPosts,
  ctrlPfp,
  ctrlMakePost
} = require('./controllers');

const router = express.Router();

// Route to check if user exists and create if not
router.put('/api/authuser', authUser);

// Route handling discover nearby users
router.get('/api/discover', discoverUsers);

// Route handling response (dig/deny) from current user
router.post('/api/response', userResponse);

// Route handling adding user photos
router.post('/api/photos/:userId/new', createPhotos);

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

router.put('/editUser', editProfile);

// Route to create pack
router.post('/createPack', createPack);

router.get('/getProfilePhoto', getProfilePhoto);

router.get('/api/getAllPostsFromSpecificPack', ctrlPackPosts);

router.get('/api/getUserPacks', ctrlUserPacksId);

router.get('/api/getAllPacksPostsForUser', ctrlAllPostsFromAllPacks);

router.get('/api/getUserPlaydates', ctrlUserPlaydatesAllPacks);

router.get('/api/getSoloPosts', ctrlSoloPosts);

router.get('/api/getPfp', ctrlPfp);

router.post('/api/makePost', ctrlMakePost);

module.exports = router;
