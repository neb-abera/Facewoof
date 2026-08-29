const db = require('./database');

const getCurrentUserPromise = (userId) =>
  db.query('SELECT * FROM users WHERE user_id = $1', [userId]);

const getFriendsPromise = (userId) =>
  db.query(
    `SELECT * FROM (
       (SELECT * FROM users WHERE user_id IN
         (SELECT user2_id FROM friends WHERE user1_id = $1)) a
       LEFT JOIN (SELECT user_id, array_agg(url) AS photos FROM profile_photos GROUP BY user_id) b
       ON (a.user_id = b.user_id)
     )`,
    [userId]
  );

const createPackPromise = (packName) =>
  db.query('INSERT INTO packs (name) VALUES ($1) RETURNING pack_id', [packName]);

const addPhoto = (userId, photo) =>
  db.query('INSERT INTO profile_photos (user_id, url) VALUES ($1, $2)', [userId, photo]);

/*
 * Everything the profile form can change, in one statement.
 *
 * Deliberately not owner_email: it is the account's identity — the UNIQUE
 * column provider sign-in matches on — and the old version let the edit form
 * overwrite it, which could orphan an account or collide with someone else's.
 * Location is also absent: changing it goes through /api/location, which
 * validates the zip and generates neighbours there.
 *
 * The likes columns were never written by the old UPDATE at all, so whatever
 * anyone typed into those three fields quietly went nowhere.
 */
const editProfilePromise = (fields, userId) =>
  db.query(
    `UPDATE users SET dog_name = $1, owner_name = $2, dog_breed = $3, age = $4,
       vaccination = $5, discoverable = $6,
       likes_one = $7, likes_two = $8, likes_three = $9,
       size = $10, energy = $11, best_time = $12, bio = $13
     WHERE user_id = $14`,
    [
      fields.dogName,
      fields.ownerName,
      fields.dogBreed,
      fields.age,
      fields.vaccination,
      fields.discoverable,
      fields.likesOne,
      fields.likesTwo,
      fields.likesThree,
      fields.size,
      fields.energy,
      fields.bestTime,
      fields.bio,
      userId
    ]
  );

// Just the zip code, for disambiguating a city search. A primary key lookup
// rather than the whole row.
const getUserLocation = (userId) =>
  db
    .query('SELECT location FROM users WHERE user_id = $1', [userId])
    .then(({ rows }) => rows[0]?.location ?? null);

const setUserLocation = (userId, zip) =>
  db.query('UPDATE users SET location = $2 WHERE user_id = $1', [userId, zip]);

// Ordered, so "the first photo is the profile photo" means the same photo on
// every request. Without ORDER BY postgres returns rows in whatever order it
// likes, and the avatar could change between page loads.
const getProfilePhotoPromise = (userId) =>
  db.query('SELECT url FROM profile_photos WHERE user_id = $1 ORDER BY photo_id', [userId]);

module.exports = {
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  addPhoto,
  editProfilePromise,
  getProfilePhotoPromise,
  getUserLocation,
  setUserLocation
};
