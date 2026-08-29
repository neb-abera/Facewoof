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
  const { userId } = req;

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
  const { userId } = req;

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
  // Was /api/photos/:userId/new, so anyone could add a photo to anyone's
  // profile by editing the path. Photos go on the caller's own profile.
  const { userId } = req;
  const { photoUrl } = req.body;
  try {
    await addPhoto(userId, photoUrl);
    res.status(201).send('Successfully added new photo');
  } catch (err) {
    console.error('unable to add new photo', err);
    res.status(500).send('Unable to add new photo');
  }
};

// The playdate fields come from fixed menus in the form. Anything else that
// arrives in them — a fetch from the console, an old client — becomes null
// rather than a stored string the page will happily render back to everyone.
const SIZES = ['small', 'medium', 'large'];
const ENERGY = ['low', 'medium', 'high'];
const BEST_TIMES = ['mornings', 'afternoons', 'evenings', 'weekends'];

const oneOf = (value, allowed) => (allowed.includes(value) ? value : null);
const text = (value, max) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed.slice(0, max) : null;
};

const editProfile = (req, res) => {
  const body = req.body || {};
  const { userId } = req;

  const dogName = text(body.dogName, 60);
  if (!dogName) return res.status(400).send('the dog needs a name');

  const age = Number(body.age);
  return editProfilePromise(
    {
      dogName,
      ownerName: text(body.ownerName, 80),
      dogBreed: text(body.dogBreed, 60),
      age: Number.isInteger(age) && age >= 0 && age <= 30 ? age : null,
      vaccination: body.vaccination === true,
      discoverable: body.discoverable !== false,
      likesOne: text(body.likesOne, 40),
      likesTwo: text(body.likesTwo, 40),
      likesThree: text(body.likesThree, 40),
      size: oneOf(body.size, SIZES),
      energy: oneOf(body.energy, ENERGY),
      bestTime: oneOf(body.bestTime, BEST_TIMES),
      bio: text(body.bio, 400)
    },
    userId
  )
    .then(() => res.status(204).end())
    .catch((err) => {
      console.error('unable to update profile', err);
      res.status(500).send('unable to update profile');
    });
};

const getProfilePhoto = (req, res) => {
  const { userId } = req;
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
  const { zip, lat, lng } = req.body || {};
  const { userId } = req;

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
    const nearby = await ensureNeighbours(client, userId, resolved);
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
