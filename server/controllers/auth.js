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

/* Hand a demo visitor their own throwaway account. */
const guestLogin = (req, res) =>
  createGuestUser()
    .then((user) => res.status(201).send(user))
    .catch((err) => {
      console.error('unable to create guest account', err);
      res.status(500).send('unable to create guest account');
    });

module.exports = { authUser, guestLogin };
