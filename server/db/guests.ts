import { pool } from "./database.ts";

/*
 * How many demo accounts exist right now (not their roster copies: each
 * account brings a hundred of those, and this is a count of visitors).
 */
export const countLiveGuests = (): Promise<number> =>
  pool
    .query<{ n: number }>(
      "SELECT count(*)::int AS n FROM users WHERE is_guest AND demo_of IS NULL",
    )
    .then(({ rows }) => rows[0]?.n ?? 0);

const PURGE_BATCH = 2000;
const PURGE_MAX_BATCHES = 500;

/*
 * Drop guest accounts older than the given age. Their photos, swipes, packs
 * and posts go with them through ON DELETE CASCADE.
 *
 * In batches, each its own statement. It was one DELETE, which is fine for an
 * hour's worth and wrong for a backlog: if the sweep has not run for a while
 * (a crash loop, a long outage) the single statement becomes one enormous
 * transaction that can outlive the process's patience and roll back whole,
 * leaving the backlog a little bigger for the next attempt. A batch that
 * commits is progress that survives the next crash. SKIP LOCKED lets several
 * replicas sweep at once without queueing on each other's rows.
 */
export async function purgeExpiredGuests(
  maxAgeHours = 24,
): Promise<{ rowCount: number }> {
  let total = 0;
  for (let batch = 0; batch < PURGE_MAX_BATCHES; batch += 1) {
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE user_id IN (
         SELECT user_id FROM users
          WHERE is_guest AND created_at < now() - ($1 || ' hours')::interval
          ORDER BY created_at
          LIMIT $2
          FOR UPDATE SKIP LOCKED
       )`,
      [maxAgeHours, PURGE_BATCH],
    );
    total += rowCount ?? 0;
    if ((rowCount ?? 0) < PURGE_BATCH) break;
  }
  return { rowCount: total };
}
