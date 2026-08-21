const db = require('./database');
const { setRelationship, checkForMatchAndCreate, generateDiscoverFeed } = require('./discover');
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
  getUserLocation
} = require('./profile');
const {
  checkOrCreateUser,
  createGuestUser,
  purgeExpiredGuests,
  TEMPLATE_USER_ID
} = require('./auth');

module.exports = {
  db,
  setRelationship,
  checkForMatchAndCreate,
  generateDiscoverFeed,
  getPacks,
  getAllPlaydates,
  createPlaydate,
  addToPack,
  createPackAndAdd,
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  checkOrCreateUser,
  createGuestUser,
  purgeExpiredGuests,
  TEMPLATE_USER_ID,
  addPhoto,
  editProfilePromise,
  getProfilePhotoPromise,
  getUserLocation,
  getUserPacksId,
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getSoloPosts,
  getPfp,
  makePost
};
