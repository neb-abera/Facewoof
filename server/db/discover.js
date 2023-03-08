/* eslint-disable indent */
/* eslint-disable max-len */
const db = require('./database');

// QUERIES

/* GET X POTENTIAL MATCHES AND SERVE UP A SORTED LIST */
/* OUT: array of users within set mile radius, ideally, first to appear are users who have already said yes to primary user */
function generateDiscoverFeed(user1, zipcodes, count) {
  return db.query(`
  SELECT u.user_id, u.dog_name, u.owner_name, u.dog_breed, u.age, u.vaccination, u.discoverable, u.owner_email, u.location, u.user1_choice, p.photos FROM
  (
    SELECT * FROM
      (
        SELECT * FROM public.users
          WHERE users.location IN ${zipcodes}
          AND user_id NOT IN
          (
            SELECT friends.user1_id FROM friends
            WHERE friends.user2_id = ${user1}
          )
        AND user_id NOT IN
          (
            SELECT friends.user2_id FROM friends
            WHERE friends.user1_id = ${user1}
          )
      ) users
      LEFT JOIN
        (
          SELECT * FROM pending_relationships
          WHERE user2_id = ${user1}
          AND user1_choice = true
        ) AS relationships
      ON users.user_id = relationships.user1_id
      WHERE user_id NOT IN
        (
          SELECT a.user1_id FROM pending_relationships a
          WHERE a.user2_id = ${user1}
          AND user1_choice = false
        )
      AND user_id NOT IN
        (
          SELECT a.user2_id FROM public.pending_relationships a
          WHERE a.user1_id = ${user1}
          AND user1_choice = false
        )
    ) u
    LEFT JOIN
      (
        SELECT user_id, array_agg(url) as photos
        FROM profile_photos
        GROUP BY user_id
      ) p
  ON u.user_id = p.user_id
  WHERE discoverable = true
  ORDER BY u.user1_choice
  LIMIT ${count};
  `)
  .then((results) => {
    // console.log('Discover feed results', results.rows, results.rows.length);
    return results.rows;
  })
  .catch((err) => {
    console.log('Error querying for discover feed', err);
  });
}

/* SET A USER'S RESPONSE TO A DIFFERENT USER TO THEIR CHOICE */
function setRelationship(user1, user2, choice) {
  let date = new Date();
  date = Math.floor(date.getTime() / 1000);

  db.query(`
    INSERT INTO pending_relationships ("user1_id", "user1_choice", "user2_id", "date")
    VALUES (${user1}, ${choice}, ${user2}, to_timestamp(${date}));
  `)
    .then((result) => {
      // console.log('🚀 setRelationships query result:', result);
      return result;
    })
    .catch((err) => {
      console.log('Error setting relationships:', err);
    });
}

/* DETECT IF MATCH, IF SO, CREATE FRIENDSHIP BETWEEN USER 1 AND USER 2 */
function checkForMatchAndCreate(user1, user2) {
  let date = new Date();
  date = Math.floor(date.getTime() / 1000);

  return db.query(`
    do $$
    BEGIN
      DELETE FROM pending_relationships WHERE "user1_id" = ${user2} AND "user2_id" = ${user1};
      INSERT INTO friends ("user1_id", "user2_id", "date") VALUES (${user1}, ${user2}, to_timestamp(${date}));
    END
    $$
  `)
  .then((results) => {
    // console.log('checking for match result:', results, true);
    return true;
  })
  .catch((err) => {
    console.log('not a match:', err);
    return false;
  });
}

module.exports = {
  setRelationship,
  checkForMatchAndCreate,
  generateDiscoverFeed,
};
