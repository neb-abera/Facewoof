/* eslint-disable object-shorthand */
const db = require('./database');
const { setRelationship, checkForMatchAndCreate, generateDiscoverFeed } = require('./discover');
const { getAllPlaydates, createPlaydate } = require('./calendar');
const { addToPack, getPacks, createPackAndAdd } = require('./pack');
const { getCurrentUserPromise, getFriendsPromise, createPackPromise } = require('./profile');

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
  createPackPromise
};
