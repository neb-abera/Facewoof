/*
 * An express-rate-limit Store that counts in Postgres, so every replica
 * counts the same callers.
 *
 * Written here rather than installed: the published Postgres stores either
 * have not been released in years or bring their own pool and their own
 * migration runner, and what is needed is one table (0007) and four
 * statements against the pool the app already has.
 *
 * The window is fixed, like the built-in MemoryStore's: the first hit opens
 * it, and it closes windowMs later whatever happens in between. Every
 * comparison uses the database's clock - now() on both sides - so replicas
 * whose own clocks disagree still agree about when a window ended.
 *
 * increment() is a single upsert. Two replicas taking a hit from the same
 * caller in the same millisecond serialise on the row, so no count is lost
 * and there is no read-then-write for a race to get between.
 */
import crypto from "node:crypto";
import type {
  ClientRateLimitInfo,
  IncrementResponse,
  Options,
  Store,
} from "express-rate-limit";
import type { RateLimitHitRow } from "./db/rows.ts";

/* The one method of pg.Pool this needs, so a test can stand in for it. */
export interface Queryable {
  query<Row>(
    text: string,
    values: unknown[],
  ): Promise<{ rows: Row[]; rowCount: number | null }>;
}

// Typed by the generated schema, so renaming a column fails the build here.
type HitRow = Pick<RateLimitHitRow, "hits" | "reset_at">;

// Equality is all a counter needs, so the address itself is never stored.
const digest = (key: string) =>
  crypto.createHash("sha256").update(key).digest("hex");

const info = (row: HitRow): ClientRateLimitInfo => ({
  totalHits: row.hits,
  resetTime: row.reset_at,
});

export class PostgresStore implements Store {
  // Counts are visible to every instance that shares the database, which is
  // the point; express-rate-limit uses this to tune its double-count check.
  readonly localKeys = false;
  readonly prefix: string;
  private readonly db: Queryable;
  private windowMs = 60_000;

  /*
   * `prefix` names the limiter. Two limiters with the same prefix share
   * their counts, deliberately or not, so each gets its own.
   */
  constructor(db: Queryable, prefix: string) {
    this.db = db;
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const { rows } = await this.db.query<HitRow>(
      `SELECT hits, reset_at FROM rate_limit_hits
       WHERE prefix = $1 AND key = $2 AND reset_at > now()`,
      [this.prefix, digest(key)],
    );
    return rows[0] ? info(rows[0]) : undefined;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const { rows } = await this.db.query<HitRow>(
      `INSERT INTO rate_limit_hits AS r (prefix, key, hits, reset_at)
       VALUES ($1, $2, 1, now() + $3 * interval '1 millisecond')
       ON CONFLICT (prefix, key) DO UPDATE SET
         hits     = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.hits + 1 END,
         reset_at = CASE WHEN r.reset_at <= now() THEN EXCLUDED.reset_at
                         ELSE r.reset_at END
       RETURNING hits, reset_at`,
      [this.prefix, digest(key), this.windowMs],
    );
    const row = rows[0];
    // An upsert with RETURNING always answers with its row.
    if (!row) throw new Error("rate limit upsert returned no row");
    return info(row);
  }

  async decrement(key: string): Promise<void> {
    await this.db.query(
      `UPDATE rate_limit_hits SET hits = greatest(hits - 1, 0)
       WHERE prefix = $1 AND key = $2 AND reset_at > now()`,
      [this.prefix, digest(key)],
    );
  }

  async resetKey(key: string): Promise<void> {
    await this.db.query(
      "DELETE FROM rate_limit_hits WHERE prefix = $1 AND key = $2",
      [this.prefix, digest(key)],
    );
  }

  async resetAll(): Promise<void> {
    await this.db.query("DELETE FROM rate_limit_hits WHERE prefix = $1", [
      this.prefix,
    ]);
  }
}

/*
 * Delete the windows that have closed, for every limiter. A dead row costs
 * nothing to correctness - the next hit overwrites it - but a caller who
 * never returns would otherwise leave theirs behind for good.
 */
export async function purgeExpiredRateLimits(db: Queryable): Promise<number> {
  const { rowCount } = await db.query(
    "DELETE FROM rate_limit_hits WHERE reset_at <= now()",
    [],
  );
  return rowCount ?? 0;
}
