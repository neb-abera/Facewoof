/*
 * The Postgres rate limit store, against a real, migrated database.
 *
 * The claim worth testing is the one that made the store necessary: two
 * replicas are two limiter instances in two processes, and they must count
 * the same caller together. So two express apps, each with its own limiter
 * and its own store, share one database here - and a control pair on the
 * default in-memory store proves the test can tell the difference.
 *
 * Nothing sleeps. A window is closed by moving its reset_at into the past,
 * not by waiting for it.
 *
 * Run with `make test-db`; it needs DATABASE_URL and says so if it is unset.
 */
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import { rateLimit, type Store } from "express-rate-limit";
import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  PostgresStore,
  purgeExpiredRateLimits,
} from "../../server/rate-limit-store.ts";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "tests/db needs DATABASE_URL pointing at a migrated database (make test-db)",
  );
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const servers: Server[] = [];
const prefixes: string[] = [];

/* A prefix no other test, run or limiter is using. */
const freshPrefix = () => {
  const prefix = `test-${randomUUID()}`;
  prefixes.push(prefix);
  return prefix;
};

/* One "replica": an app with its own limiter instance, on its own port. */
async function replica(store: Store | undefined, limit: number) {
  const app = express();
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      // Every request in a test comes from 127.0.0.1; the key is fixed so
      // the test reads as "one caller".
      keyGenerator: () => "one-caller",
      ...(store ? { store } : {}),
    }),
  );
  app.get("/", (_req, res) => {
    res.json({ ok: true });
  });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const url = `http://127.0.0.1:${address.port}/`;
  return async () => (await fetch(url)).status;
}

const closeWindow = (prefix: string) =>
  pool.query(
    "UPDATE rate_limit_hits SET reset_at = now() - interval '1 second' WHERE prefix = $1",
    [prefix],
  );

beforeAll(async () => {
  // Fails here, by name, if the migration has not been applied.
  await pool.query("SELECT 1 FROM rate_limit_hits LIMIT 1");
});

afterEach(async () => {
  for (const server of servers.splice(0)) server.close();
  await pool.query("DELETE FROM rate_limit_hits WHERE prefix = ANY($1)", [
    prefixes.splice(0),
  ]);
});

afterAll(() => pool.end());

describe("two limiter instances, one database", () => {
  it("count the same caller together", async () => {
    const prefix = freshPrefix();
    const a = await replica(new PostgresStore(pool, prefix), 3);
    const b = await replica(new PostgresStore(pool, prefix), 3);

    // Three requests allowed in all, however they are spread.
    expect(await a()).toBe(200);
    expect(await b()).toBe(200);
    expect(await a()).toBe(200);
    expect(await b()).toBe(429);
    expect(await a()).toBe(429);
  });

  it("the control: two in-memory limiters do not, which is the bug", async () => {
    const a = await replica(undefined, 3);
    const b = await replica(undefined, 3);

    const statuses = [];
    for (const hit of [a, b, a, b, a, b]) statuses.push(await hit());
    // Six requests, all allowed: each replica saw only three.
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
  });

  it("limiters with different prefixes keep separate counts", async () => {
    const a = await replica(new PostgresStore(pool, freshPrefix()), 1);
    const b = await replica(new PostgresStore(pool, freshPrefix()), 1);
    expect(await a()).toBe(200);
    expect(await b()).toBe(200);
    expect(await a()).toBe(429);
  });

  it("do not lose a hit when both are hit at once", async () => {
    const prefix = freshPrefix();
    const stores = [
      new PostgresStore(pool, prefix),
      new PostgresStore(pool, prefix),
    ];
    const hits = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        (stores[i % 2] as PostgresStore).increment("one-caller"),
      ),
    );
    // Every upsert saw a different total: none overwrote another.
    expect(hits.map((h) => h.totalHits).sort((x, y) => x - y)).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1),
    );
  });
});

describe("a window", () => {
  it("opens on the first hit, for the limiter's windowMs, by the database's clock", async () => {
    const store = new PostgresStore(pool, freshPrefix());
    store.init({ windowMs: 3_600_000 } as never);

    const first = await store.increment("k");
    expect(first.totalHits).toBe(1);
    const { rows } = await pool.query<{ seconds: number }>(
      "SELECT extract(epoch FROM ($1::timestamptz - now()))::float AS seconds",
      [first.resetTime],
    );
    // An hour ahead of the database's now(), give or take the round trip.
    expect(rows[0]?.seconds).toBeGreaterThan(3_590);
    expect(rows[0]?.seconds).toBeLessThanOrEqual(3_600);

    // Later hits count up and do not move the end of the window.
    const second = await store.increment("k");
    expect(second.totalHits).toBe(2);
    expect(second.resetTime).toEqual(first.resetTime);
    expect(await store.get("k")).toEqual(second);
  });

  it("starts again from one once it has closed", async () => {
    const prefix = freshPrefix();
    const store = new PostgresStore(pool, prefix);
    await store.increment("k");
    await store.increment("k");
    await closeWindow(prefix);

    expect(await store.get("k")).toBeUndefined();
    const reopened = await store.increment("k");
    expect(reopened.totalHits).toBe(1);
    expect(reopened.resetTime?.getTime()).toBeGreaterThan(Date.now());
  });

  it("a limited caller is let back in when it closes", async () => {
    const prefix = freshPrefix();
    const hit = await replica(new PostgresStore(pool, prefix), 1);
    expect(await hit()).toBe(200);
    expect(await hit()).toBe(429);
    await closeWindow(prefix);
    expect(await hit()).toBe(200);
  });

  it("decrement, resetKey and resetAll touch only their own", async () => {
    const mine = new PostgresStore(pool, freshPrefix());
    const theirs = new PostgresStore(pool, freshPrefix());
    await mine.increment("k");
    await mine.increment("k");
    await mine.increment("other");
    await theirs.increment("k");

    await mine.decrement("k");
    expect((await mine.get("k"))?.totalHits).toBe(1);
    await mine.decrement("k");
    await mine.decrement("k");
    expect((await mine.get("k"))?.totalHits, "never below zero").toBe(0);

    await mine.resetKey("k");
    expect(await mine.get("k")).toBeUndefined();
    expect((await mine.get("other"))?.totalHits).toBe(1);

    await mine.resetAll();
    expect(await mine.get("other")).toBeUndefined();
    expect((await theirs.get("k"))?.totalHits).toBe(1);
  });
});

describe("the sweep", () => {
  it("deletes closed windows and leaves open ones", async () => {
    const closed = freshPrefix();
    const open = freshPrefix();
    await new PostgresStore(pool, closed).increment("k");
    await new PostgresStore(pool, open).increment("k");
    await closeWindow(closed);

    expect(await purgeExpiredRateLimits(pool)).toBeGreaterThanOrEqual(1);

    const { rows } = await pool.query<{ prefix: string }>(
      "SELECT prefix FROM rate_limit_hits WHERE prefix = ANY($1)",
      [[closed, open]],
    );
    expect(rows.map((r) => r.prefix)).toEqual([open]);
  });

  it("the key stored is a digest, never the caller's address", async () => {
    const prefix = freshPrefix();
    await new PostgresStore(pool, prefix).increment("203.0.113.9");
    const { rows } = await pool.query<{ key: string }>(
      "SELECT key FROM rate_limit_hits WHERE prefix = $1",
      [prefix],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.key).toMatch(/^[0-9a-f]{64}$/);
  });
});
