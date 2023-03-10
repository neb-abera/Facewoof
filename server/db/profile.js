const db = require('./database');

// const getCurrentUser = (userId, callback) => {
//   db.query('Select * from users where user_id = 1', (err, res) => {
//     if (err) {
//       console.log('err', err);
//     } else {
//       // console.log('res', res.rows);
//       callback(null, res);
//     }
//   });
// };

const getCurrentUserPromise = (userId) => db.query(`Select * from users where user_id = ${userId}`);

const getFriendsPromise = (userId) => {
  // console.log('USER ID IN GETFRIENDS', userId)
  return db.query(
    // `select * from users where user_id IN (select user2_id from friends where user1_id = ${userId})`
    `select * from (
      ( SELECT * FROM users where user_id IN (select user2_id from friends where user1_id = ${userId}) ) a
      LEFT JOIN (SELECT user_id, array_agg(url) as photos FROM profile_photos GROUP BY user_id) b
      ON (a.user_id = b.user_id)
      )`
  );
  // `select * from users where user_id IN (select user2_id from friends where user1_id = ${userId})`
};

// this is not needed see db/packs.js
// const getPacks = (userId, callback) => {
//   db.query(
//     'select * from packs where pack_id IN (select pack_id from pack_users where user_id = 1)',
//     (err, res) => {
//       if (err) {
//         console.log('err', err);
//       } else {
//         // console.log('res', res.rows);
//         callback(null, res);
//       }
//     }
//   );
// };

const getPacksPromise = (userId) => {
  return db.query(`
  select * from packs where pack_id IN (select pack_id from pack_users where user_id = ${userId})`);
};

// const addToPack = (packId, userId, callback) => {
//   db.query(
//     'INSERT INTO pack_users(pack_id, user_id) VALUES($1, $2)',
//     [packId, userId],
//     (err, res) => {
//       if (err) {
//         console.log('err', err);
//         callback(err, null);
//       } else {
//         // console.log('res', res.rows);
//         callback(null, res);
//       }
//     }
//   );
// };

const addToPackPromise = (packId, userId) => {
  return db.query('INSERT INTO pack_users(pack_id, user_id) VALUES($1, $2)', [packId, userId]);
};

// const addUser = (userObj) => {
// };

// const createPack = (packName, callback) => {
//   db.query('INSERT INTO packs(name) VALUES($1) RETURNING pack_id', [packName], (err, res) => {
//     if (err) {
//       console.log('err', err);
//       callback(err, null);
//     } else {
//       // console.log('res', res.rows);
//       callback(null, res);
//     }
//   });
// };

const createPackPromise = (packName) => {
  return db.query('INSERT INTO packs(name) VALUES($1) RETURNING pack_id', [packName]);
};

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
) => {
  return db.query(`
  UPDATE users SET dog_name = '${dogName}', owner_name = '${ownerName}', dog_breed = '${dogBreed}', age = ${age}, vaccination = ${vaccination}, discoverable = ${discoverable}, owner_email = '${ownerEmail}', location = '${location}' WHERE user_id = ${userId};`);
};
// return db.query(`
// UPDATE users SET "${dogName}" = dog_name, "${ownerName}" = owner_name, "${dogBreed}" = dog_breed, ${age} = age, ${vaccination} = vaccination, ${discoverable} = discoverable, ${ownerEmail}" = owner_email, "${location} "= location WHERE user_id = ${userId};`);

const getProfilePhotoPromise = (userId) => {
  return db.query(`select url from profile_photos WHERE user_id = ${userId}`);
};

module.exports = {
  getCurrentUserPromise: getCurrentUserPromise,
  getFriendsPromise: getFriendsPromise,
  createPackPromise: createPackPromise,
  editProfilePromise: editProfilePromise,
  getProfilePhotoPromise: getProfilePhotoPromise
  // addToPack: addToPack
};
