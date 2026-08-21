const {
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  editProfilePromise,
  addPhoto,
  getProfilePhotoPromise
} = require('../db');

const getUserFriends = (req, res) => {
  const { userId } = req.query;

  return getFriendsPromise(userId)
    .then((data) => {
      // console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => {
      console.error('unable to get user friends', err);
      res.status(500).send('unable to get user friends');
    });
};

const getCurrentUser = (req, res) => {
  const { userId } = req.query;

  return getCurrentUserPromise(userId)
    .then((data) => {
      // console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => {
      console.error('unable to get current user', err);
      res.status(500).send('unable to get current user');
    });
};

// post request to create a pack
const createPack = (req, res) => {
  const { packName } = req.body;

  return createPackPromise(packName)
    .then((data) => {
      // console.log(data.rows);
      res.send(data.rows);
    })
    .catch((err) => {
      console.error('unable to create pack', err);
      res.status(500).send('unable to create pack');
    });
};

const createPhotos = async (req, res) => {
  const { userId } = req.params;
  const { photoUrl } = req.body;
  try {
    await addPhoto(userId, photoUrl);
    res.status(201).send('Successfully added new photo');
  } catch (err) {
    console.error('unable to add new photo', err);
    res.status(500).send('Unable to add new photo');
  }
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
      console.error(err);
      res.status(404).send('unable to update profile');
    });
};

const getProfilePhoto = (req, res) => {
  // console.log('getprofilePhoto request', req);
  const { userId } = req.query;
  return (
    getProfilePhotoPromise(userId)
      // Sent the entire pg result object before, leaving the client to reach
      // through .rows for it.
      .then((data) => res.send(data.rows))
      .catch((err) => {
        console.error(err);
        res.status(404).send('unable to get profile photo');
      })
  );
};

module.exports = {
  getCurrentUser,
  getUserFriends,
  createPack,
  createPhotos,
  editProfile,
  getProfilePhoto
};
