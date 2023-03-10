const { getCurrentUserPromise, getFriendsPromise, createPackPromise, addPhoto } = require('../db/');

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

const createPhotos = async (req, res) => {
  const { userId } = req.params;
  const { photoUrl } = req.body;
console.log(userId, photoUrl);
  // try {
  //   await addPhoto(userId, photoUrl);
  //   res.status(201).send('Successfully added new photo');
  // } catch (err) {
  //   res.status(404).send('Unable to add new photo');
  // }
  res.status(200).send('hi');
};

module.exports = {
  getCurrentUser: getCurrentUser,
  getUserFriends: getUserFriends,
  createPack: createPack,
  createPhotos: createPhotos
};
