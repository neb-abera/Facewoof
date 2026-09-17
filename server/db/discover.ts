import { pool } from "./database.ts";
import type { FeedRow } from "./shapes.ts";

/*
 * A page of the discover feed, and how many dogs are left after it: users in
 * the given zip codes that the current user has not already matched with or
 * passed on, sorted so anyone who has already swiped yes on them appears
 * first.
 *
 * Paged by exclusion rather than OFFSET. Swiping writes to
 * pending_relationships, which removes that dog from this very query, so the
 * result set shrinks between pages and an OFFSET would step over dogs that
 * moved up to fill the gap. Passing the ids already delivered is immune to
 * that, and `seen` stays small because it only has to cover one session's
 * swiping.
 *
 * One query, in three steps:
 *
 *   candidates  everyone the predicate admits. This is the expensive part,
 *               and it used to run twice per request - once for the page and
 *               once more, serially, in a second query that only counted.
 *   page        the first $3 of them, each carrying count(*) OVER (): a
 *               window function is evaluated over the whole candidate set
 *               before LIMIT cuts it, so every row knows the total.
 *   photos      aggregated per dealt card, after the LIMIT. It used to be a
 *               join against `SELECT ... FROM profile_photos GROUP BY
 *               user_id`, which aggregated the photos of every account in
 *               the table to decorate at most thirty rows. Ordered by
 *               photo_id, the order the profile page shows them in.
 *
 * An empty page has no row to carry the total, and needs none: if nothing
 * was dealt, nothing is left.
 *
 * NOT EXISTS rather than the NOT IN these were written with: the same answer
 * here, since none of the id columns is nullable, but the planner can run it
 * as an anti-join against the indexes on friends and pending_relationships.
 */
export function discoverFeedPage(
  user1: number,
  zipcodes: string[],
  limit: number,
  seen: number[] = [],
): Promise<{ users: FeedRow[]; remaining: number }> {
  return pool
    .query<FeedRow & { total: number }>(
      `
  WITH candidates AS (
    SELECT u.user_id, u.dog_name, u.owner_name, u.dog_breed, u.age, u.vaccination,
           u.location, admirer.user1_choice,
           ARRAY[u.likes_one, u.likes_two, u.likes_three] AS interests
    FROM public.users u
    LEFT JOIN pending_relationships admirer
      ON admirer.user1_id = u.user_id
      AND admirer.user2_id = $1
      AND admirer.user1_choice = true
    WHERE u.discoverable = true
      AND u.location = ANY($2)
      AND u.user_id <> $1
      -- Dogs generated to fill out one person's feed belong only to that
      -- person. Without this, two demos in the same city show each other's
      -- copies of the same roster and every dog appears twice.
      AND (u.demo_of IS NULL OR u.demo_of = $1)
      AND u.user_id <> ALL($4)
      AND NOT EXISTS (
        SELECT 1 FROM friends f
        WHERE (f.user2_id = $1 AND f.user1_id = u.user_id)
           OR (f.user1_id = $1 AND f.user2_id = u.user_id)
      )
      -- Either of them has passed on the other.
      AND NOT EXISTS (
        SELECT 1 FROM pending_relationships p
        WHERE p.user1_choice = false
          AND ((p.user2_id = $1 AND p.user1_id = u.user_id)
            OR (p.user1_id = $1 AND p.user2_id = u.user_id))
      )
  ),
  page AS (
    SELECT *, (count(*) OVER ())::int AS total
    FROM candidates
    ORDER BY (user1_choice IS TRUE) DESC, user_id
    LIMIT $3
  )
  SELECT page.*,
         (SELECT array_agg(ph.url ORDER BY ph.photo_id)
            FROM profile_photos ph
           WHERE ph.user_id = page.user_id) AS photos
  FROM page
  ORDER BY (user1_choice IS TRUE) DESC, user_id;
  `,
      [user1, zipcodes, limit, seen],
    )
    .then(({ rows }) => {
      const total = rows[0]?.total ?? 0;
      return {
        // `total` is bookkeeping, not part of a card: the reply is sent as
        // serialised, so anything left on the row would reach the client.
        users: rows.map(({ total: _total, ...card }) => card),
        remaining: total - rows.length,
      };
    });
}

/* Record the current user's swipe on another user. */
export function setRelationship(user1: number, user2: number, choice: boolean) {
  return pool.query(
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
export async function checkForMatchAndCreate(
  user1: number,
  user2: number,
): Promise<boolean> {
  const client = await pool.connect();
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
