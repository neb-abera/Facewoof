const crypto = require('crypto');
const zipcodes = require('zipcodes');
const db = require('./database');

// The seeded profile every demo account is cloned from.
const TEMPLATE_USER_ID = 1;

// Where a demo lands when the visitor's location is unknown.
const DEFAULT_ZIP = '10011';

/*
 * Pick zip codes to scatter the demo roster across, near `originZip`.
 *
 * Spread over a range of distances rather than clustered, so the radius
 * selector visibly changes the feed instead of being decorative.
 */
function scatterZips(originZip, count) {
  const withinTwentyFive = zipcodes.radius(originZip, 25);

  // A rural origin may have almost no neighbouring zip codes, and a zip code
  // the table does not know has none at all. Falling back to the origin itself
  // keeps every dog at distance zero, which is better than no dogs.
  const pool = withinTwentyFive.length ? withinTwentyFive : [originZip];

  const byDistance = pool
    .map((zip) => ({ zip, miles: zipcodes.distance(originZip, zip) ?? 0 }))
    .sort((a, b) => a.miles - b.miles);

  // Walk the sorted list at an even stride so the roster covers near and far
  // rather than landing all in one neighbourhood.
  const stride = Math.max(1, Math.floor(byDistance.length / count));
  const picked = [];
  for (let i = 0; picked.length < count; i += 1) {
    picked.push(byDistance[(i * stride) % byDistance.length].zip);
  }
  return picked;
}

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
/*
 * How many dogs nearby counts as enough, and how many to add when it is not.
 */
const SPARSE_BELOW = 20;
const TOP_UP_TO = 100;

/*
 * Count the discoverable dogs already near a user.
 *
 * Another visitor's demo copies do not count: they are scoped to them.
 */
async function countNeighbours(client, userId, zips) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM users
     WHERE discoverable
       AND user_id <> $1
       AND location = ANY($2)
       AND (demo_of IS NULL OR demo_of = $1)`,
    [userId, zips]
  );
  return rows[0].n;
}

/*
 * Make sure a user has dogs to look at.
 *
 * The roster sits in the database ready to be copied rather than being built
 * per request, so this is two statements however many dogs it adds.
 *
 * Used for every demo, whose feed starts empty. It is also what a real account
 * in a sparse area would call: an empty discover feed is the worst possible
 * first impression, and there is no organic population yet to avoid it.
 */
async function ensureNeighbours(client, userId, originZip) {
  const nearby = zipcodes.radius(originZip, 25);
  const zips = nearby.length ? nearby : [originZip];

  const existing = await countNeighbours(client, userId, zips);
  if (existing >= SPARSE_BELOW) return existing;

  const scattered = scatterZips(originZip, TOP_UP_TO);

  // One INSERT ... SELECT off the roster, and one more for the photos, joined
  // through cloned_from. A loop of a hundred round trips would make signing in
  // visibly slow.
  const { rows: created } = await client.query(
    `WITH roster AS (
       SELECT *, row_number() OVER (ORDER BY user_id) AS rn
       FROM users
       WHERE NOT is_guest AND user_id <> $2
     ),
     placed AS (
       SELECT zip, row_number() OVER () AS rn
       FROM unnest($3::text[]) AS zip
     ),
     ins AS (
       INSERT INTO users (dog_name, owner_name, dog_breed, age, vaccination,
                          discoverable, owner_email, location,
                          likes_one, likes_two, likes_three,
                          is_guest, demo_of, cloned_from)
       SELECT r.dog_name, r.owner_name, r.dog_breed, r.age, r.vaccination,
              true, 'demo-' || gen_random_uuid() || '@facewoof.example', p.zip,
              r.likes_one, r.likes_two, r.likes_three,
              true, $1, r.user_id
       FROM roster r JOIN placed p ON p.rn = r.rn
       RETURNING user_id, cloned_from
     ),
     pics AS (
       INSERT INTO profile_photos (user_id, url)
       SELECT i.user_id, ph.url
       FROM ins i JOIN profile_photos ph ON ph.user_id = i.cloned_from
       RETURNING user_id
     )
     SELECT user_id FROM ins ORDER BY user_id`,
    [userId, TEMPLATE_USER_ID, scattered]
  );

  const ids = created.map((row) => row.user_id);

  // The first few already like them, so the "already likes you" ordering in
  // the discover feed shows on the very first card.
  const admirers = ids.slice(0, 6);
  if (admirers.length) {
    await client.query(
      `INSERT INTO pending_relationships (user1_id, user2_id, user1_choice)
       SELECT u, $1, true FROM unnest($2::int[]) AS u
       ON CONFLICT DO NOTHING`,
      [userId, admirers]
    );
  }

  // And a handful are already matches, so the friends list and the pack pages
  // are not empty on arrival.
  const matched = ids.slice(6, 11);
  if (matched.length) {
    await client.query(
      `INSERT INTO friends (user1_id, user2_id)
       SELECT $1, u FROM unnest($2::int[]) AS u
       UNION ALL
       SELECT u, $1 FROM unnest($2::int[]) AS u
       ON CONFLICT DO NOTHING`,
      [userId, matched]
    );
  }

  return ids.length;
}

async function createGuestUser(requestedZip) {
  // An unknown or malformed zip falls back rather than producing a demo with
  // nobody in it.
  const originZip =
    requestedZip && zipcodes.lookup(requestedZip) ? String(requestedZip) : DEFAULT_ZIP;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO users (dog_name, owner_name, dog_breed, age, vaccination,
                          discoverable, owner_email, location,
                          likes_one, likes_two, likes_three, is_guest)
       SELECT dog_name, 'Guest', dog_breed, age, vaccination,
              false, $2, $3,
              likes_one, likes_two, likes_three, true
       FROM users WHERE user_id = $1
       RETURNING *`,
      [TEMPLATE_USER_ID, `guest-${crypto.randomUUID()}@facewoof.app`, originZip]
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

    await ensureNeighbours(client, guest.user_id, originZip);

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

module.exports = {
  checkOrCreateUser,
  createGuestUser,
  purgeExpiredGuests,
  ensureNeighbours,
  TEMPLATE_USER_ID
};
