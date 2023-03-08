/* eslint-disable object-shorthand */
const { discoverUsers, userResponse } = require('./discover');
const { getPlaydates } = require('./calendar');

module.exports = {
  discoverUsers,
  userResponse,
  getPlaydates
};
