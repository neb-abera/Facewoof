const {
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  editProfilePromise,
  getProfilePhotoPromise
} = require('../db');

const getUserFriends = (req, res) => {
  const { userId } = req.query;

  return getFriendsPromise(userId)
    .then((data) => {
      // console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => console.log('err in getuserfriends', err));
};

const getCurrentUser = (req, res) => {
  const { userId } = req.query;

  return getCurrentUserPromise(userId)
    .then((data) => {
      // console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => console.log('err in getcurrentuser', err));
};

// post request to create a pack
const createPack = (req, res) => {
  const { packName } = req.query;

  return createPackPromise(packName)
    .then((data) => {
      // console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => {
      console.log('err', err);
    });
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
      // console.log('results from editprofile', results);
      res.send(results);
    })
    .catch((err) => {
      console.log('err in editprofile', err);
    });
};

const getProfilePhoto = (req, res) => {
  // console.log('getprofilePhoto request', req);
  const { userId } = req.query;
  return getProfilePhotoPromise(userId)
    .then((data) => {
      // console.log('successfully got profilephoto', data);
      res.send(data);
    })
    .catch((err) => {
      console.log('err in getting profilephoto', err);
    });
};

module.exports = {
  getCurrentUser: getCurrentUser,
  getUserFriends: getUserFriends,
  createPack: createPack,
  editProfile: editProfile,
  getProfilePhoto: getProfilePhoto
};
