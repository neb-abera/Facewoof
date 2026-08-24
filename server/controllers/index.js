const { discoverUsers, userResponse, resolveLocation } = require('./discover');
const { getPlaydates, AddPlaydate } = require('./calendar');
const { addUserToPack, getUserPacks, createNewPackAndAdd } = require('./packs');
const {
  getCurrentUser,
  updateLocation,
  getUserFriends,
  createPack,
  editProfile,
  createPhotos,
  getProfilePhoto
} = require('./profile');
const {
  ctrlPackPosts,
  ctrlAllPostsFromAllPacks,
  ctrlUserPlaydatesAllPacks,
  ctrlSoloPosts,
  ctrlPfp,
  ctrlMakePost,
  ctrlUserPacksId
} = require('./packfeed');
const { guestLogin, me, logout } = require('./auth');

const { providers: oidcProviders, start: oidcStart, callback: oidcCallback } = require('./oidc');
const { finish: finishOnboarding } = require('./onboarding');

module.exports = {
  finishOnboarding,
  oidcProviders,
  oidcStart,
  oidcCallback,
  discoverUsers,
  userResponse,
  resolveLocation,
  getPlaydates,
  AddPlaydate,
  addUserToPack,
  getUserPacks,
  createNewPackAndAdd,
  getCurrentUser,
  updateLocation,
  getUserFriends,
  createPack,
  guestLogin,
  me,
  logout,
  editProfile,
  getProfilePhoto,
  ctrlPackPosts,
  ctrlAllPostsFromAllPacks,
  ctrlUserPlaydatesAllPacks,
  ctrlSoloPosts,
  ctrlPfp,
  ctrlMakePost,
  ctrlUserPacksId,
  createPhotos
};
