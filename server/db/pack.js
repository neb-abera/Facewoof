/* eslint-disable indent */
/* eslint-disable max-len */
const db = require('./database');

// Add a user to a pack if not already in that pack
function addToPack(user_id, pack_id) {
  return db
    .query(
      `
    INSERT INTO pack_users ("pack_id", "user_id")
    SELECT ${user_id}, ${pack_id}
    WHERE
      NOT EXISTS (
      SELECT user_id FROM pack_users WHERE pack_id = ${pack_id} AND user_id = ${user_id}
    )
  `
    )
    .catch((err) => {
      console.log('Error adding to packs:', err);
    });
}

const getPacks = (userId) => {
  return db.query(`SELECT json_agg(packobj) FROM 
  (SELECT pack_users.pack_id, packs.name FROM pack_users
    INNER JOIN packs ON packs.pack_id = pack_users.pack_id
    WHERE pack_users.user_id = ${userId}) as packobj;`);
};

module.exports = {
  addToPack: addToPack,
  getPacks: getPacks
};
