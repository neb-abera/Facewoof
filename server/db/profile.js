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
  return db.query(`select * from users where user_id IN (select user2_id from friends where user1_id = ${userId})`);
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

module.exports = {
  getCurrentUserPromise: getCurrentUserPromise,
  getFriendsPromise: getFriendsPromise,
  createPackPromise: createPackPromise
  // addToPack: addToPack
};
