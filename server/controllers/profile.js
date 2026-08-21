const zipcodes = require('zipcodes');
const { db, ensureNeighbours } = require('../db');
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

/*
 * Move a user to where their device says they are, and make sure there are
 * dogs to see there.
 *
 * This is what turns the demo experience into a real one: someone who declined
 * the location prompt at sign-in, or never got one, can grant it later without
 * having to type an address into their profile. Their profile location follows
 * from the device rather than the other way round.
 */
const updateLocation = async (req, res) => {
  const { userId, zip, lat, lng } = req.body || {};

  if (!userId) return res.status(400).send('userId is required');

  let resolved = zip && zipcodes.lookup(zip) ? String(zip) : null;
  if (!resolved && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    const match = zipcodes.lookupByCoords(Number(lat), Number(lng));
    if (match) resolved = match.zip;
  }

  if (!resolved) {
    return res.status(400).send('a usable zip code or pair of coordinates is required');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET location = $2 WHERE user_id = $1', [userId, resolved]);
    const nearby = await ensureNeighbours(client, Number(userId), resolved);
    await client.query('COMMIT');
    return res.status(200).send({ location: resolved, nearby });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('unable to update location', err);
    return res.status(500).send('unable to update location');
  } finally {
    client.release();
  }
};

module.exports = {
  getCurrentUser,
  updateLocation,
  getUserFriends,
  createPack,
  createPhotos,
  editProfile,
  getProfilePhoto
};
