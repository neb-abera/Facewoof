/* eslint-disable object-shorthand */
const db = require('./database');
const { setRelationship, checkForMatchAndCreate, generateDiscoverFeed } = require('./discover');
const { getAllPlaydates, createPlaydate } = require('./calendar');
const { addToPack, getPacks, createPackAndAdd } = require('./pack');
const { checkOrCreateUser } = require('./auth');

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
  checkOrCreateUser
};
