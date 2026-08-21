const express = require('express');
const {
  discoverUsers,
  userResponse,
  resolveLocation,
  getPlaydates,
  AddPlaydate,
  getUserPacks,
  addUserToPack,
  createNewPackAndAdd,
  authUser,
  guestLogin,
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

// Everything lives under /api. Five routes used to sit at the root
// (/getFriends, /getCurrentUser, /getProfilePhoto, /editUser, /createPack),
// which meant the dev server needed a proxy rule per route and the production
// server could not tell an API path from a client route it should hand the
// single page app.

// --- auth ---

// Sign a demo visitor in to their own throwaway account.
router.post('/api/auth/guest', guestLogin);

// Check whether a user exists, creating them if not.
router.put('/api/authuser', authUser);

// --- discover ---

router.get('/api/discover', discoverUsers);
router.get('/api/resolve-location', resolveLocation);
router.post('/api/response', userResponse);

// --- profile ---

router.get('/api/currentuser', getCurrentUser);
router.get('/api/friends', getUserFriends);
router.put('/api/edituser', editProfile);
router.get('/api/profilephoto', getProfilePhoto);
router.post('/api/photos/:userId/new', createPhotos);
router.get('/api/getPfp', ctrlPfp);

// --- packs ---

router.get('/api/getpacks', getUserPacks);
router.get('/api/getUserPacks', ctrlUserPacksId);
router.put('/api/addtopack', addUserToPack);
router.put('/api/createpack', createNewPackAndAdd);
router.post('/api/pack', createPack);

// --- pack feed ---

router.get('/api/getAllPostsFromSpecificPack', ctrlPackPosts);
router.get('/api/getAllPacksPostsForUser', ctrlAllPostsFromAllPacks);
router.get('/api/getSoloPosts', ctrlSoloPosts);
router.post('/api/makePost', ctrlMakePost);

// --- calendar ---

router.get('/api/playdates', getPlaydates);
router.post('/api/addplaydate', AddPlaydate);
router.get('/api/getUserPlaydates', ctrlUserPlaydatesAllPacks);

module.exports = router;
