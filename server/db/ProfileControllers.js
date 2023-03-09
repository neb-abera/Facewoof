const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
// const { db } = require('./database');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = new Client({
  user: process.env.PGUSERNAME,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
});

// const db = new Client({
//   user: 'hri',
//   host: 'ec2-18-206-100-236.compute-1.amazonaws.com',
//   database: 'facewoof',
//   password: 'sprint',
//   port: 5432
// });

// PGUSERNAME=hri
// PGHOST='ec2-18-206-100-236.compute-1.amazonaws.com'
// PGDATABASE=facewoof
// PGPORT=5432
// PGPASSWORD=sprint

db.connect();

module.exports.getCurrentUser = (userId, callback) => {
  db.query('Select * from users where user_id = 1', (err, res) => {
    if (err) {
      console.log('err', err);
    } else {
      // console.log('res', res.rows);
      callback(null, res);
    }
  });
};

module.exports.getFriends = (userId, callback) => {
  // userId = 1;
  db.query(
    'select * from users where user_id IN (select user2_id from friends where user1_id = 1)',
    (err, res) => {
      if (err) {
        console.log('err', err);
      } else {
        // console.log('res', res.rows);
        callback(null, res);
      }
    }
  );
};

module.exports.getPacks = (userId, callback) => {
  db.query(
    'select * from packs where pack_id IN (select pack_id from pack_users where user_id = 1)',
    (err, res) => {
      if (err) {
        console.log('err', err);
      } else {
        // console.log('res', res.rows);
        callback(null, res);
      }
    }
  );
};

module.exports.addToPack = (packId, userId, callback) => {
  db.query(
    'INSERT INTO pack_users(pack_id, user_id) VALUES($1, $2)',
    [packId, userId],
    (err, res) => {
      if (err) {
        console.log('err', err);
        callback(err, null);
      } else {
        // console.log('res', res.rows);
        callback(null, res);
      }
    }
  );
};

module.exports.addUser = (userObj) => {
}

module.exports.createPack = (packName, callback) => {
  db.query('INSERT INTO packs(name) VALUES($1) RETURNING pack_id', [packName], (err, res) => {
    if (err) {
      console.log('err', err);
      callback(err, null);
    } else {
      // console.log('res', res.rows);
      callback(null, res);
    }
  });
};
