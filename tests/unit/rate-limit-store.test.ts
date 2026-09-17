/*
 * The Postgres rate limit store, against a stand-in for the pool.
 *
 * What the SQL does is proved against a real database in tests/db. This
 * pins the half that needs none: what the store sends, what it makes of the
 * answer, and that a caller's address never reaches the database as itself.
 */
import type { Options } from "express-rate-limit";
import { describe, expect, it, vi } from "vitest";
import {
  PostgresStore,
  purgeExpiredRateLimits,
} from "../../server/rate-limit-store.ts";

const answering = (rows: unknown[], rowCount: number | null = rows.length) => {
  const query = vi.fn(async () => ({ rows, rowCount }));
  return { query, db: { query } as never };
};

const resetAt = new Date("2026-09-17T12:00:00Z");

describe("the postgres rate limit store", () => {
  it("counts a hit with one upsert, under its prefix and the window it was given", async () => {
    const { query, db } = answering([{ hits: 3, reset_at: resetAt }]);
    const store = new PostgresStore(db, "guest");
    store.init({ windowMs: 3_600_000 } as Options);

    expect(await store.increment("203.0.113.9")).toEqual({
      totalHits: 3,
      resetTime: resetAt,
    });

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO rate_limit_hits[\s\S]+ON CONFLICT/);
    expect(values[0]).toBe("guest");
    expect(values[2]).toBe(3_600_000);
    // The address is hashed: equality is all a counter needs.
    expect(values[1]).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(values)).not.toContain("203.0.113.9");
  });

  it("gives the same caller the same key, and another caller another", async () => {
    const { query, db } = answering([{ hits: 1, reset_at: resetAt }]);
    const store = new PostgresStore(db, "guest");
    await store.increment("203.0.113.9");
    await store.increment("203.0.113.9");
    await store.increment("203.0.113.10");
    const keys = query.mock.calls.map(
      (call) => (call as unknown as [string, unknown[]])[1][1],
    );
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).not.toBe(keys[2]);
  });

  it("says so rather than inventing a count if the upsert answers nothing", async () => {
    const store = new PostgresStore(answering([]).db, "guest");
    await expect(store.increment("a")).rejects.toThrow(/returned no row/);
  });

  it("lets a database failure through, so the limiter can refuse", async () => {
    const db = {
      query: vi.fn(async () => {
        throw new Error("connection refused");
      }),
    } as never;
    await expect(new PostgresStore(db, "guest").increment("a")).rejects.toThrow(
      /connection refused/,
    );
  });

  it("reads a live window, and nothing when there is none", async () => {
    const live = new PostgresStore(
      answering([{ hits: 2, reset_at: resetAt }]).db,
      "guest",
    );
    expect(await live.get("a")).toEqual({ totalHits: 2, resetTime: resetAt });
    expect(await new PostgresStore(answering([]).db, "guest").get("a")).toBe(
      undefined,
    );
  });

  it("decrements, resets a key and resets everything only under its own prefix", async () => {
    const { query, db } = answering([]);
    const store = new PostgresStore(db, "guest");
    await store.decrement("a");
    await store.resetKey("a");
    await store.resetAll();
    for (const call of query.mock.calls) {
      const [sql, values] = call as unknown as [string, unknown[]];
      expect(sql).toMatch(/prefix = \$1/);
      expect(values[0]).toBe("guest");
    }
    expect(store.localKeys).toBe(false);
  });

  it("the sweep reports how many closed windows it removed", async () => {
    expect(await purgeExpiredRateLimits(answering([], 4).db)).toBe(4);
    expect(await purgeExpiredRateLimits(answering([], null).db)).toBe(0);
  });
});
