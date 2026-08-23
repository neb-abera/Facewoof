const db = require('./database');
const {
  setRelationship,
  checkForMatchAndCreate,
  generateDiscoverFeed,
  countRemainingFeed
} = require('./discover');
const { getAllPlaydates, createPlaydate } = require('./calendar');
const { addToPack, getPacks, createPackAndAdd } = require('./pack');
const {
  getUserPacksId,
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getSoloPosts,
  getPfp,
  makePost
} = require('./packfeed');
const {
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  addPhoto,
  editProfilePromise,
  getProfilePhotoPromise,
  getUserLocation,
  setUserLocation
} = require('./profile');
const {
  checkOrCreateUser,
  findOrCreateExternalUser,
  completeOnboarding,
  createGuestUser,
  purgeExpiredGuests,
  ensureNeighbours,
  TEMPLATE_USER_ID
} = require('./auth');

module.exports = {
  db,
  setRelationship,
  checkForMatchAndCreate,
  generateDiscoverFeed,
  countRemainingFeed,
  getPacks,
  getAllPlaydates,
  createPlaydate,
  addToPack,
  createPackAndAdd,
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  checkOrCreateUser,
  findOrCreateExternalUser,
  completeOnboarding,
  createGuestUser,
  purgeExpiredGuests,
  ensureNeighbours,
  TEMPLATE_USER_ID,
  addPhoto,
  editProfilePromise,
  getProfilePhotoPromise,
  getUserLocation,
  setUserLocation,
  getUserPacksId,
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getSoloPosts,
  getPfp,
  makePost
};
