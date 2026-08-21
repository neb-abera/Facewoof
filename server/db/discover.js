const db = require('./database');

/*
 * Build the discover feed: users in the given zip codes that the current user
 * has not already matched with or passed on, sorted so anyone who has already
 * swiped yes on them appears first.
 */
function generateDiscoverFeed(user1, zipcodes, count) {
  return db
    .query(
      `
  SELECT u.user_id, u.dog_name, u.owner_name, u.dog_breed, u.age, u.vaccination,
         u.discoverable, u.owner_email, u.location, u.user1_choice, p.photos,
         ARRAY[u.likes_one, u.likes_two, u.likes_three] AS interests
  FROM (
    SELECT * FROM (
      SELECT * FROM public.users
        WHERE users.location = ANY($2)
        AND user_id <> $1
        AND user_id NOT IN (SELECT friends.user1_id FROM friends WHERE friends.user2_id = $1)
        AND user_id NOT IN (SELECT friends.user2_id FROM friends WHERE friends.user1_id = $1)
    ) users
    LEFT JOIN (
      SELECT * FROM pending_relationships
      WHERE user2_id = $1 AND user1_choice = true
    ) AS relationships
    ON users.user_id = relationships.user1_id
    WHERE user_id NOT IN (
      SELECT a.user1_id FROM pending_relationships a
      WHERE a.user2_id = $1 AND a.user1_choice = false
    )
    AND user_id NOT IN (
      SELECT a.user2_id FROM public.pending_relationships a
      WHERE a.user1_id = $1 AND a.user1_choice = false
    )
  ) u
  LEFT JOIN (
    SELECT user_id, array_agg(url) AS photos
    FROM profile_photos
    GROUP BY user_id
  ) p
  ON u.user_id = p.user_id
  WHERE discoverable = true
  ORDER BY u.user1_choice NULLS LAST
  LIMIT $3;
  `,
      [user1, zipcodes, count]
    )
    .then((results) => results.rows);
}

/* Record the current user's swipe on another user. */
function setRelationship(user1, user2, choice) {
  return db.query(
    `
    INSERT INTO pending_relationships (user1_id, user1_choice, user2_id, date)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET user1_choice = EXCLUDED.user1_choice;
  `,
    [user1, choice, user2]
  );
}

/*
 * Turn a reciprocated swipe into a friendship.
 *
 * Both directions are inserted. The original stored only (user1, user2), but
 * getFriendsPromise looks up user2_id by user1_id, so the other person never
 * saw the match in their friends list.
 */
async function checkForMatchAndCreate(user1, user2) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM pending_relationships WHERE user1_id = $1 AND user2_id = $2', [
      user2,
      user1
    ]);
    await client.query(
      `INSERT INTO friends (user1_id, user2_id, date)
       VALUES ($1, $2, now()), ($2, $1, now())
       ON CONFLICT (user1_id, user2_id) DO NOTHING`,
      [user1, user2]
    );
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('failed to create match:', err);
    return false;
  } finally {
    client.release();
  }
}

module.exports = { setRelationship, checkForMatchAndCreate, generateDiscoverFeed };
