/* eslint-disable indent */
/* eslint-disable max-len */
const db = require('./database');

// Create a pack and add provided user_ids
function checkOrCreateUser(email, name) {
  return db
    .query(
      `
    INSERT INTO users (owner_email, owner_name)
    SELECT '${email}', '${name}'
    WHERE NOT EXISTS (
      SELECT * FROM users
      WHERE owner_email = '${email}'
    );
    SELECT * FROM users WHERE owner_email = '${email}';
  `
    )
    .catch((err) => {
      console.log('Error checking/creating user', err);
    });
}

module.exports = {
  checkOrCreateUser: checkOrCreateUser
};
