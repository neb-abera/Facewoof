const { getCurrentUserPromise, getFriendsPromise, createPackPromise } = require('../db/');

const getUserFriends = (req, res) => {
  const { userId } = req.query;

  return getFriendsPromise(userId)
    .then((data) => {
      console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => console.log(err));
};

const getCurrentUser = (req, res) => {
  const { userId } = req.query;

  return getCurrentUserPromise(userId)
    .then((data) => {
      console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => console.log(err));
};

// post request to create a pack
const createPack = (req, res) => {
  const { packName } = req.body;

  return createPackPromise(packName)
    .then((data) => {
      console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => {
      console.log('err', err);
    });
};

module.exports = {
  getCurrentUser: getCurrentUser,
  getUserFriends: getUserFriends,
  createPack: createPack
};
