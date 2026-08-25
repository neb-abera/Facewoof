const db = require('./database');

/* Create a pack and add the given users to it, in one statement. */
function createPackAndAdd(packName, users) {
  return db.query(
    `
    WITH ins AS (
      INSERT INTO packs (name) VALUES ($1) RETURNING pack_id
    )
    INSERT INTO pack_users (pack_id, user_id)
    SELECT ins.pack_id, u FROM ins, unnest($2::int[]) AS u;
  `,
    [packName, users]
  );
}

/*
 * Add a user to a pack, ignoring a repeat.
 *
 * The original inserted the arguments the wrong way round: it selected
 * (user_id, pack_id) into the columns (pack_id, user_id), so every call wrote
 * a swapped row.
 */
/*
 * The insert carries its own authorisation: the row is only written when the
 * pack already contains one of the joiner's friends. Without the predicate,
 * any signed-in visitor could join any pack by id — and membership is what
 * the feed and post endpoints gate on, so joining was reading.
 */
function addToPack(userId, packId) {
  return db.query(
    `INSERT INTO pack_users (pack_id, user_id)
     SELECT $1, $2
     WHERE EXISTS (
       SELECT 1 FROM pack_users pu
       JOIN friends f ON f.user2_id = pu.user_id AND f.user1_id = $2
       WHERE pu.pack_id = $1
     )
     ON CONFLICT (pack_id, user_id) DO NOTHING`,
    [packId, userId]
  );
}

function getPacks(userId) {
  return db.query(
    `SELECT json_agg(packobj) FROM (
       SELECT pack_users.pack_id, packs.name FROM pack_users
       INNER JOIN packs ON packs.pack_id = pack_users.pack_id
       WHERE pack_users.user_id = $1
     ) AS packobj;`,
    [userId]
  );
}

module.exports = { addToPack, getPacks, createPackAndAdd };
