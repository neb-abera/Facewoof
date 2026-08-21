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

const editProfilePromise = (
  dogName,
  ownerName,
  dogBreed,
  age,
  vaccination,
  discoverable,
  ownerEmail,
  location,
  userId
) =>
  db.query(
    `UPDATE users SET dog_name = $1, owner_name = $2, dog_breed = $3, age = $4,
       vaccination = $5, discoverable = $6, owner_email = $7, location = $8
     WHERE user_id = $9`,
    [dogName, ownerName, dogBreed, age, vaccination, discoverable, ownerEmail, location, userId]
  );

// Just the zip code, for disambiguating a city search. A primary key lookup
// rather than the whole row.
const getUserLocation = (userId) =>
  db
    .query('SELECT location FROM users WHERE user_id = $1', [userId])
    .then(({ rows }) => rows[0]?.location ?? null);

const getProfilePhotoPromise = (userId) =>
  db.query('SELECT url FROM profile_photos WHERE user_id = $1', [userId]);

module.exports = {
  getCurrentUserPromise,
  getFriendsPromise,
  createPackPromise,
  addPhoto,
  editProfilePromise,
  getProfilePhotoPromise,
  getUserLocation
};
