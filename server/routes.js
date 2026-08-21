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
  updateLocation,
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

const { guestLimiter, swipeLimiter, feedLimiter, writeLimiter } = require('./limits');

const router = express.Router();

// Everything lives under /api. Five routes used to sit at the root
// (/getFriends, /getCurrentUser, /getProfilePhoto, /editUser, /createPack),
// which meant the dev server needed a proxy rule per route and the production
// server could not tell an API path from a client route it should hand the
// single page app.

// --- auth ---

// Sign a demo visitor in to their own throwaway account.
router.post('/api/auth/guest', guestLimiter, guestLogin);

// Check whether a user exists, creating them if not.
router.put('/api/authuser', authUser);

// --- discover ---

router.get('/api/discover', feedLimiter, discoverUsers);
router.get('/api/resolve-location', resolveLocation);
router.post('/api/response', swipeLimiter, userResponse);

// --- profile ---

router.get('/api/currentuser', getCurrentUser);

// Move a user to where their device says they are, generating neighbours there
// if the area is empty. How someone leaves the demo experience behind.
router.put('/api/location', writeLimiter, updateLocation);
router.get('/api/friends', getUserFriends);
router.put('/api/edituser', writeLimiter, editProfile);
router.get('/api/profilephoto', getProfilePhoto);
router.post('/api/photos/:userId/new', writeLimiter, createPhotos);
router.get('/api/getPfp', ctrlPfp);

// --- packs ---

router.get('/api/getpacks', getUserPacks);
router.get('/api/getUserPacks', ctrlUserPacksId);
router.put('/api/addtopack', writeLimiter, addUserToPack);
router.put('/api/createpack', writeLimiter, createNewPackAndAdd);
router.post('/api/pack', createPack);

// --- pack feed ---

router.get('/api/getAllPostsFromSpecificPack', ctrlPackPosts);
router.get('/api/getAllPacksPostsForUser', ctrlAllPostsFromAllPacks);
router.get('/api/getSoloPosts', ctrlSoloPosts);
router.post('/api/makePost', writeLimiter, ctrlMakePost);

// --- calendar ---

router.get('/api/playdates', getPlaydates);
router.post('/api/addplaydate', writeLimiter, AddPlaydate);
router.get('/api/getUserPlaydates', ctrlUserPlaydatesAllPacks);

module.exports = router;
