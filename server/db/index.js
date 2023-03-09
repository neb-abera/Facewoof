/* eslint-disable object-shorthand */
const db = require('./database');
const { setRelationship, checkForMatchAndCreate, generateDiscoverFeed } = require('./discover');
const { getAllPlaydates, createPlaydate } = require('./calendar');
const { addToPack } = require('./pack.js');

module.exports = {
  db,
  setRelationship,
  checkForMatchAndCreate,
  generateDiscoverFeed,
  getAllPlaydates,
  createPlaydate,
  addToPack
};
