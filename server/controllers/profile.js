const {
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  editProfilePromise,
  addPhoto
} = require('../db');

const getUserFriends = (req, res) => {
  const { userId } = req.query;

  return getFriendsPromise(userId)
    .then((data) => {
      console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => console.log('err in getuserfriends', err));
};

const getCurrentUser = (req, res) => {
  const { userId } = req.query;

  return getCurrentUserPromise(userId)
    .then((data) => {
      console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => console.log('err in getcurrentuser', err));
};

// post request to create a pack
const createPack = (req, res) => {
  const { packName } = req.query;

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

const editProfile = (req, res) => {
  const {
    dogName,
    ownerName,
    dogBreed,
    age,
    vaccination,
    discoverable,
    ownerEmail,
    location,
    userId
  } = req.body;
  // console.log('req body edit profile', req.body);
  return editProfilePromise(
    dogName,
    ownerName,
    dogBreed,
    age,
    vaccination,
    discoverable,
    ownerEmail,
    location,
    userId
  )
    .then((results) => {
      console.log('results from editprofile', results);
      res.send(results);
    })
    .catch((err) => {
      console.log('err in editprofile', err);
    });
};

module.exports = {
  getCurrentUser: getCurrentUser,
  getUserFriends: getUserFriends,
  createPack: createPack,
  createPhotos: createPhotos,
  editProfile: editProfile
};
