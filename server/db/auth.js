const crypto = require('crypto');
const db = require('./database');

// The seeded profile every demo account is cloned from.
const TEMPLATE_USER_ID = 1;

/*
 * Look up a user by email, creating the row on first sight.
 *
 * Returns { user, created }. The original ran two statements in one string and
 * made the caller pick apart a multi-result array to work out which happened.
 */
async function checkOrCreateUser(email, name) {
  const inserted = await db.query(
    `INSERT INTO users (owner_email, owner_name)
     VALUES ($1, $2)
     ON CONFLICT (owner_email) DO NOTHING
     RETURNING *`,
    [email, name]
  );

  if (inserted.rowCount === 1) {
    return { user: inserted.rows[0], created: true };
  }

  const existing = await db.query('SELECT * FROM users WHERE owner_email = $1', [email]);
  return { user: existing.rows[0], created: false };
}

/*
 * Create a throwaway account for a demo visitor.
 *
 * Every visitor gets their own row rather than sharing one. Sharing would mean
 * the first few people to swipe through the seeded profiles empty the discover
 * feed for everyone after them, and that whatever one visitor posts to a pack
 * shows up for the next. Guests are not discoverable, so they never appear in
 * anyone else's feed either.
 *
 * The new account inherits the template's photos, packs and matches so there is
 * something to look at on every screen from the first page load.
 */
async function createGuestUser() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO users (dog_name, owner_name, dog_breed, age, vaccination,
                          discoverable, owner_email, location,
                          likes_one, likes_two, likes_three, is_guest)
       SELECT dog_name, 'Guest', dog_breed, age, vaccination,
              false, $2, location,
              likes_one, likes_two, likes_three, true
       FROM users WHERE user_id = $1
       RETURNING *`,
      [TEMPLATE_USER_ID, `guest-${crypto.randomUUID()}@facewoof.app`]
    );
    const guest = rows[0];

    if (!guest) {
      throw new Error(`template user ${TEMPLATE_USER_ID} is missing: has seed.sql been loaded?`);
    }

    await client.query(
      `INSERT INTO profile_photos (user_id, url)
       SELECT $2, url FROM profile_photos WHERE user_id = $1`,
      [TEMPLATE_USER_ID, guest.user_id]
    );

    await client.query(
      `INSERT INTO pack_users (pack_id, user_id)
       SELECT pack_id, $2 FROM pack_users WHERE user_id = $1`,
      [TEMPLATE_USER_ID, guest.user_id]
    );

    await client.query(
      `INSERT INTO friends (user1_id, user2_id)
       SELECT $2, user2_id FROM friends WHERE user1_id = $1
       UNION ALL
       SELECT user2_id, $2 FROM friends WHERE user1_id = $1`,
      [TEMPLATE_USER_ID, guest.user_id]
    );

    // Profiles that had already swiped yes on the template swipe yes on the
    // guest too, so the "these dogs already like you first" ordering in the
    // discover feed is visible straight away.
    await client.query(
      `INSERT INTO pending_relationships (user1_id, user2_id, user1_choice)
       SELECT user1_id, $2, user1_choice
       FROM pending_relationships WHERE user2_id = $1`,
      [TEMPLATE_USER_ID, guest.user_id]
    );

    await client.query('COMMIT');
    return guest;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/*
 * Drop guest accounts older than the given age. Their photos, swipes, packs
 * and posts go with them through ON DELETE CASCADE.
 */
function purgeExpiredGuests(maxAgeHours = 24) {
  return db.query(
    `DELETE FROM users
     WHERE is_guest AND created_at < now() - ($1 || ' hours')::interval`,
    [maxAgeHours]
  );
}

module.exports = { checkOrCreateUser, createGuestUser, purgeExpiredGuests, TEMPLATE_USER_ID };
