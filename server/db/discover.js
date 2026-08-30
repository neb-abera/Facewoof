const db = require("./database");

/*
 * Build a page of the discover feed: users in the given zip codes that the
 * current user has not already matched with or passed on, sorted so anyone who
 * has already swiped yes on them appears first.
 *
 * Paged by exclusion rather than OFFSET. Swiping writes to
 * pending_relationships, which removes that dog from this very query, so the
 * result set shrinks between pages and an OFFSET would step over dogs that
 * moved up to fill the gap. Passing the ids already delivered is immune to
 * that, and `seen` stays small because it only has to cover one session's
 * swiping.
 */
function generateDiscoverFeed(user1, zipcodes, limit, seen = []) {
  return db
    .query(
      `
  SELECT * FROM (
    SELECT u.user_id, u.dog_name, u.owner_name, u.dog_breed, u.age, u.vaccination,
           u.discoverable, u.owner_email, u.location, u.user1_choice, p.photos,
           ARRAY[u.likes_one, u.likes_two, u.likes_three] AS interests
    FROM (
      SELECT * FROM (
        SELECT * FROM public.users
          WHERE users.location = ANY($2)
          AND user_id <> $1
          -- Dogs generated to fill out one person's feed belong only to that
          -- person. Without this, two demos in the same city show each other's
          -- copies of the same roster and every dog appears twice.
          AND (demo_of IS NULL OR demo_of = $1)
          AND user_id <> ALL($4)
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
  ) feed
  ORDER BY (user1_choice IS TRUE) DESC, user_id
  LIMIT $3;
  `,
      [user1, zipcodes, limit, seen],
    )
    .then((results) => results.rows);
}

/* How many are left to serve after this page, so the client knows to stop. */
function countRemainingFeed(user1, zipcodes, seen = []) {
  return db
    .query(
      `SELECT count(*)::int AS n FROM public.users
       WHERE discoverable
         AND location = ANY($2)
         AND user_id <> $1
         AND (demo_of IS NULL OR demo_of = $1)
         AND user_id <> ALL($3)
         AND user_id NOT IN (SELECT user1_id FROM friends WHERE user2_id = $1)
         AND user_id NOT IN (SELECT user2_id FROM friends WHERE user1_id = $1)
         AND user_id NOT IN (
           SELECT user1_id FROM pending_relationships
           WHERE user2_id = $1 AND user1_choice = false
         )
         AND user_id NOT IN (
           SELECT user2_id FROM pending_relationships
           WHERE user1_id = $1 AND user1_choice = false
         )`,
      [user1, zipcodes, seen],
    )
    .then(({ rows }) => rows[0].n);
}

/* Record the current user's swipe on another user. */
function setRelationship(user1, user2, choice) {
  return db.query(
    `
    INSERT INTO pending_relationships (user1_id, user1_choice, user2_id, date)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET user1_choice = EXCLUDED.user1_choice;
  `,
    [user1, choice, user2],
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
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM pending_relationships WHERE user1_id = $1 AND user2_id = $2",
      [user2, user1],
    );
    await client.query(
      `INSERT INTO friends (user1_id, user2_id, date)
       VALUES ($1, $2, now()), ($2, $1, now())
       ON CONFLICT (user1_id, user2_id) DO NOTHING`,
      [user1, user2],
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("failed to create match:", err);
    return false;
  } finally {
    client.release();
  }
}

module.exports = {
  setRelationship,
  checkForMatchAndCreate,
  generateDiscoverFeed,
  countRemainingFeed,
};
