const zipcodes = require('zipcodes');
const { checkOrCreateUser, createGuestUser } = require('../db');

const authUser = (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).send('email is required');
  }

  return checkOrCreateUser(email, name)
    .then(({ user, created }) => res.status(created ? 201 : 200).send(user))
    .catch((err) => {
      console.error('unable to authenticate user', err);
      res.status(500).send('unable to authenticate user');
    });
};

/*
 * Hand a demo visitor their own throwaway account, and the demo roster placed
 * next to them.
 *
 * Takes a zip code, or coordinates from the browser, so the dogs are near the
 * person looking. Neither is required: without them the demo lands on its
 * default city rather than failing.
 */
const guestLogin = (req, res) => {
  const { zip, lat, lng } = req.body || {};
  let originZip = zip;

  if (!originZip && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    const match = zipcodes.lookupByCoords(Number(lat), Number(lng));
    if (match) originZip = match.zip;
  }

  return createGuestUser(originZip)
    .then((user) => res.status(201).send(user))
    .catch((err) => {
      console.error('unable to create guest account', err);
      res.status(500).send('unable to create guest account');
    });
};

module.exports = { authUser, guestLogin };
