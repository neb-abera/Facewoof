const db = require('../db/database');
var getUserPacksId = (userId, res) => {
  // db.connect();
  //replace below query with: `select * from public."packUsers" where public."packUsers"."userId" = ${userId} or public."packUsers"."userId" = 15`
  //to test if it works with multiple groups being returned by query.
  db.query(`select * from pack_users where pack_users.user_id = ${userId} `).then((partOf) => {
    var promises = [];
    for (var i = 0; i < partOf.rows.length; i++) {
      promises.push(
        db.query(`select * from packs where packs.pack_id = ${partOf.rows[i].pack_id}`)
      );
    }
    var toSendBack = [];
    Promise.all(promises).then((result) => {
      for (var i = 0; i < result.length; i++) {
        for (var j = 0; j < result[i].rows.length; j++) {
          toSendBack.push(result[i].rows[j]);
        }
      }
      // console.log('sending back', toSendBack);
      res.status(201).send(toSendBack);
    });
  });
};

var getUserInformation = (userId) => {
  db.query(`select * from users where users.user_id = ${userId}`)
    .then((res) => {
      // console.log('Query Response', res.rows);
      return res.rows;
    })
    .catch((err) => {
      console.log('Err occured', err);
    });
};

var getPackPosts = (packId) => {
  return db.query(`select * from posts where posts.pack_id = ${packId}`);
};

var getAllPostsFromAllPacks = (userId, resServer) => {
  db.query(
    // for testing purposes try:
    // `select public."packUsers"."packId" from public."packUsers" where public."packUsers"."userId" = 4 or public."packUsers"."userId" = 15`
    `select pack_users.pack_id from pack_users where pack_users.user_id = ${userId}`
  ).then((resp) => {
    var promises = [];
    for (var i = 0; i < resp.rows.length; i++) {
      promises.push(db.query(`select * from posts where posts.pack_id = ${resp.rows[i].pack_id}`));
    }
    Promise.all(promises).then((resp) => {
      var ret = [];
      for (var i = 0; i < resp.length; i++) {
        ret.push(resp[i].rows);
      }
      resServer.status(201).send(ret);
    });
  });
};

var getUserPlaydatesAllPacks = (userId, res) => {
  db.query(`select * from playdates where playdates.user_id = ${userId}`).then((resp) => {
    // console.log('playdates', resp.rows);
    res.status(201).send(resp.rows);
  });
};

var getSoloPosts = (userId, packId, res) => {
  db.query(`select * from posts where posts.pack_id = ${packId}`).then((response) => {
    // console.log('response for solodolo', response.rows);
    res.status(201).send(response.rows);
  });
};

var getPfp = (userId, res) => {
  db.query(`select * from profile_photos where profile_photos.user_id = ${userId}`).then((resp) => {
    res.status(201).send(resp.rows);
  });
};

var makePost = () => {};

module.exports = {
  getUserPacksId: getUserPacksId,
  getPackPosts: getPackPosts,
  getAllPostsFromAllPacks: getAllPostsFromAllPacks,
  getUserPlaydatesAllPacks: getUserPlaydatesAllPacks,
  getSoloPosts: getSoloPosts,
  getPfp: getPfp
};
