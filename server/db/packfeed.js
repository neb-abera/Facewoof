const db = require('../db/database');
var getUserPacksId = (req, res) => {
  const { userId } = req.query;
  // db.connect();
  //replace below query with: `select * from public."packUsers" where public."packUsers"."userId" = ${userId} or public."packUsers"."userId" = 15`
  //to test if it works with multiple groups being returned by query.
  return db.query(`SELECT json_agg(packobj) FROM
    (SELECT pack_users.pack_id, packs.name FROM pack_users
      INNER JOIN packs ON packs.pack_id = pack_users.pack_id
      WHERE pack_users.user_id = ${userId}) as packobj;`);
};

var getUserInformation = (req, res) => {
  const { userId } = req.query;
  return db.query(`select * from users where users.user_id = ${userId}`);
};

var getPackPosts = (req, res) => {
  const { packId } = req.query;
  return db.query(`select * from posts where posts.pack_id = ${packId}`);
};

var getAllPostsFromAllPacks = (req, res) => {
  const { userId } = req.query;
  return db.query(
    // for testing purposes try:
    // `select public."packUsers"."packId" from public."packUsers" where public."packUsers"."userId" = 4 or public."packUsers"."userId" = 15`
    `SELECT json_agg(postobj) FROM
      (SELECT packs.name, posts.*, users.owner_name FROM pack_users
        INNER JOIN packs ON packs.pack_id = pack_users.pack_id
        INNER JOIN posts ON posts.pack_id = packs.pack_id
        INNER JOIN users ON posts.user_id = users.user_id
        WHERE pack_users.user_id = ${userId}) as postobj;`
  );
};

var getUserPlaydatesAllPacks = (req, res) => {
  const { userId } = req.query;
  return db.query(`select * from playdates where playdates.user_id = ${userId}`);
};

var getSoloPosts = (req, res) => {
  const { userId, packId } = req.query;
  return db.query(`select * from posts where posts.pack_id = ${packId}`);
};

var getPfp = (req, res) => {
  const { userId } = req.query;
  return db.query(`select * from profile_photos where profile_photos.user_id = ${userId}`);
};

var makePost = (req, res) => {
  // console.log(req.body);
  var { user_id, pack_id, body, date, photo_url } = req.body.packet;
  // console.log('user_id:', user_id, 'pack_id:', pack_id, 'body:', body, 'photo_url:', photo_url);
  return db.query(
    `insert into posts(user_id, pack_id, body, date, photo_url) values ('${user_id}', ${pack_id}, '${body}', now(), '${photo_url}')`
  );
};

module.exports = {
  getUserPacksId: getUserPacksId,
  getPackPosts: getPackPosts,
  getAllPostsFromAllPacks: getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks: getUserPlaydatesAllPacks,
  getSoloPosts: getSoloPosts,
  getPfp: getPfp,
  makePost: makePost
};
