const { discoverUsers, userResponse, resolveLocation } = require('./discover');
const { getPlaydates, AddPlaydate } = require('./calendar');
const { addUserToPack, getUserPacks, createNewPackAndAdd } = require('./packs');
const {
  getCurrentUser,
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
const { authUser, guestLogin } = require('./auth');

module.exports = {
  discoverUsers,
  userResponse,
  resolveLocation,
  getPlaydates,
  AddPlaydate,
  addUserToPack,
  getUserPacks,
  createNewPackAndAdd,
  getCurrentUser,
  getUserFriends,
  createPack,
  authUser,
  guestLogin,
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
