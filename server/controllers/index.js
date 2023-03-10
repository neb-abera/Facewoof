/* eslint-disable object-shorthand */
const { discoverUsers, userResponse } = require('./discover');
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
const { authUser } = require('./auth');

module.exports = {
  discoverUsers,
  userResponse,
  getPlaydates,
  AddPlaydate,
  addUserToPack,
  getUserPacks,
  createNewPackAndAdd,
  getCurrentUser,
  getUserFriends,
  createPack,
  authUser,
  editProfile,
  createPhotos,
  getProfilePhoto
};
