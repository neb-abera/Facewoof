/*
 * A stand-in for server/rate-limit-store.ts in tests that mount the real
 * guest limiter without a database: the same interface, counting in memory.
 * The Postgres store itself is tested against a real database in tests/db.
 *
 *   vi.mock("../../server/rate-limit-store.ts", () =>
 *     import("./helpers/memory-rate-limit-store.ts"));
 */
import type { IncrementResponse, Store } from "express-rate-limit";

export class PostgresStore implements Store {
  private readonly hits = new Map<string, number>();

  async increment(key: string): Promise<IncrementResponse> {
    const totalHits = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, totalHits);
    return { totalHits, resetTime: new Date(Date.now() + 60_000) };
  }

  async decrement(key: string): Promise<void> {
    this.hits.set(key, Math.max(0, (this.hits.get(key) ?? 0) - 1));
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }
}

export const purgeExpiredRateLimits = async () => 0;
