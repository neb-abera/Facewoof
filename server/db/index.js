/* eslint-disable object-shorthand */
const db = require('./database');
const { setRelationship, checkForMatchAndCreate, generateDiscoverFeed } = require('./discover');
const { getPacks, getAllPlaydates, createPlaydate } = require('./calendar');

module.exports = {
  db,
  setRelationship,
  checkForMatchAndCreate,
  generateDiscoverFeed,
  getPacks,
  getAllPlaydates,
  createPlaydate
};
