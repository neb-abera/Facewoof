const db = require('../db/database');
var getUserPacks = (userId) => {
  db.connect();
  db.query(`select * from public."packUsers" where public."packUsers"."userId" = ${userId}`)
    .then((res) => {
      console.log('Query Response', res.rows);
      return res.rows;
    })
    .catch((err) => {
      console.log('Err occured', err);
    });
};

var getUserInformation = (userId) => {
  db.connect();
  db.query(`select * from public."users" where public."users"."userId" = ${userId}`)
    .then((res) => {
      console.log('Query Response', res.rows);
      return res.rows;
    })
    .catch((err) => {
      console.log('Err occured', err);
    });
};

var getPackPosts = (packId) => {
  db.connect();

  db.query(`select * from public."posts" where public."posts"."packId" = ${packId}`).then(
    (resp) => {
      console.log(resp.rows);
    }
  );
};

module.exports = {
  getUserPacks
};

// console.log(getUserPacks(4));
// console.log(getUserInformation(4));
console.log(getPackPosts(4));
