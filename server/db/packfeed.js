const db = require('./database');

// These took (req, res) and pulled values off req.query themselves, which put
// knowledge of the HTTP layer in the database layer. They take plain arguments
// now; the controllers do the unpacking.

const getUserPacksId = (userId) =>
  db.query(
    `SELECT json_agg(packobj) FROM (
       SELECT pack_users.pack_id, packs.name FROM pack_users
       INNER JOIN packs ON packs.pack_id = pack_users.pack_id
       WHERE pack_users.user_id = $1
     ) AS packobj;`,
    [userId]
  );

const getPackPosts = (packId) =>
  db.query('SELECT * FROM posts WHERE posts.pack_id = $1 ORDER BY date DESC', [packId]);

const getAllPostsFromAllPacks = (userId) =>
  db.query(
    `SELECT json_agg(postobj) FROM (
       SELECT packs.name, posts.*, users.owner_name FROM pack_users
       INNER JOIN packs ON packs.pack_id = pack_users.pack_id
       INNER JOIN posts ON posts.pack_id = packs.pack_id
       INNER JOIN users ON posts.user_id = users.user_id
       WHERE pack_users.user_id = $1
       ORDER BY posts.date DESC
     ) AS postobj;`,
    [userId]
  );

const getUserPlaydatesAllPacks = (userId) =>
  db.query('SELECT * FROM playdates WHERE playdates.user_id = $1 ORDER BY start_date', [userId]);

const getSoloPosts = (packId) =>
  db.query('SELECT * FROM posts WHERE posts.pack_id = $1 ORDER BY date DESC', [packId]);

const getPfp = (userId) =>
  db.query('SELECT * FROM profile_photos WHERE profile_photos.user_id = $1', [userId]);

/* eslint-disable camelcase -- these are column names */
const makePost = ({ user_id, pack_id, body, photo_url }) =>
  db.query(
    `INSERT INTO posts (user_id, pack_id, body, date, photo_url)
     VALUES ($1, $2, $3, now(), $4)`,
    [user_id, pack_id, body, photo_url || null]
  );
/* eslint-enable camelcase */

module.exports = {
  getUserPacksId,
  getPackPosts,
  getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks,
  getSoloPosts,
  getPfp,
  makePost
};
