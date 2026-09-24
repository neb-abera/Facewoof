/*
 * The paged pack feeds, against a real, migrated database.
 *
 * The claim worth testing is the one the page exists for: a feed no longer
 * returns everything. These queries had no LIMIT, so a pack page load read
 * every post the pack had ever carried and the all-packs feed read every post
 * in every pack the caller belongs to.
 *
 * The risky part is not the LIMIT, it is the cursor. `date` is not unique, so
 * paging on it alone drops posts that share a second, and OFFSET repeats or
 * skips whenever a post is added between two pages. The cursor is the pair
 * (date, post_id) and these tests are mostly about that: every post appears
 * exactly once across the pages, in order, including when a whole page shares
 * one timestamp.
 *
 * Run with `make test-db`; it needs DATABASE_URL and says so if it is unset.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL;
const describeIf = url ? describe : describe.skip;

const pool = new pg.Pool({ connectionString: url });

/* The module reads its own pool, so it is imported after the env is known. */
const { getPackPosts, getAllPostsFromAllPacks, decodeCursor, FEED_PAGE } =
  await import("../../server/db/packfeed.ts");

let userId: number;
let packId: number;

/* The one row an INSERT ... RETURNING gives back. tsconfig is strict about
 * index access, and a seeding step that returned nothing should stop the test
 * rather than carry an undefined into an assertion. */
function only<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error("the insert returned no row");
  return row;
}

/* Posts with an explicit timestamp, so the ordering under test is controlled. */
async function seedPosts(
  pack: number,
  author: number,
  count: number,
  at?: Date,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await pool.query(
      `INSERT INTO posts (user_id, pack_id, body, date, photo_url)
       VALUES ($1, $2, $3, $4, NULL)`,
      [author, pack, `post ${i}`, at ?? new Date(Date.now() - i * 1000)],
    );
  }
}

/* Walk every page, returning the post ids in the order they were dealt. */
async function walk(
  page: (cursor?: string) => Promise<{
    rows: { post_id: number }[];
    nextCursor: string | null;
  }>,
): Promise<number[]> {
  const seen: number[] = [];
  let cursor: string | undefined;
  // Bounded so a cursor that fails to advance ends the test rather than the
  // process.
  for (let guard = 0; guard < 50; guard += 1) {
    const result = await page(cursor);
    seen.push(...result.rows.map((row) => row.post_id));
    if (!result.nextCursor) return seen;
    cursor = result.nextCursor;
  }
  throw new Error("the cursor never reached the last page");
}

describeIf("paged pack feeds", () => {
  beforeAll(async () => {
    const owner = await pool.query<{ user_id: number }>(
      `INSERT INTO users (owner_email, dog_name, owner_name, is_guest)
       VALUES ($1, 'Rex', 'Tester', true) RETURNING user_id`,
      [`feed-${randomUUID()}@example.invalid`],
    );
    userId = only(owner.rows).user_id;

    const pack = await pool.query<{ pack_id: number }>(
      `INSERT INTO packs (name) VALUES ($1) RETURNING pack_id`,
      [`feed pack ${randomUUID()}`],
    );
    packId = only(pack.rows).pack_id;

    await pool.query(
      `INSERT INTO pack_users (user_id, pack_id) VALUES ($1, $2)`,
      [userId, packId],
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM posts WHERE pack_id = $1", [packId]);
    await pool.query("DELETE FROM pack_users WHERE pack_id = $1", [packId]);
    await pool.query("DELETE FROM packs WHERE pack_id = $1", [packId]);
    await pool.query("DELETE FROM users WHERE user_id = $1", [userId]);
    await pool.end();
  });

  it("returns a page and a cursor, not the whole pack", async () => {
    await seedPosts(packId, userId, FEED_PAGE + 5);

    const first = await getPackPosts(packId);

    expect(first.rows).toHaveLength(FEED_PAGE);
    expect(first.nextCursor).not.toBeNull();
    expect(decodeCursor(first.nextCursor ?? undefined)).not.toBeNull();
  });

  it("deals every post exactly once, newest first", async () => {
    const ids = await walk((cursor) => getPackPosts(packId, 7, cursor));

    const stored = await pool.query<{ post_id: number }>(
      `SELECT post_id FROM posts WHERE pack_id = $1
        ORDER BY date DESC, post_id DESC`,
      [packId],
    );

    expect(ids).toEqual(stored.rows.map((row) => row.post_id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not drop posts that share a timestamp", async () => {
    // The whole point of carrying post_id in the cursor. Twenty posts in the
    // same second span several pages, and a cursor of date alone would ask
    // for "older than this second" and skip the rest of it.
    const same = new Date("2026-01-02T03:04:05.000Z");
    const shared = await pool.query<{ pack_id: number }>(
      `INSERT INTO packs (name) VALUES ($1) RETURNING pack_id`,
      [`same second ${randomUUID()}`],
    );
    const sharedPack = only(shared.rows).pack_id;
    await seedPosts(sharedPack, userId, 20, same);

    const ids = await walk((cursor) => getPackPosts(sharedPack, 6, cursor));

    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);

    await pool.query("DELETE FROM posts WHERE pack_id = $1", [sharedPack]);
    await pool.query("DELETE FROM packs WHERE pack_id = $1", [sharedPack]);
  });

  it("caps a limit the caller asks past", async () => {
    const page = await getPackPosts(packId, 5000);
    expect(page.rows.length).toBeLessThanOrEqual(100);
  });

  it("pages the all-packs feed the same way", async () => {
    const ids = await walk((cursor) =>
      getAllPostsFromAllPacks(userId, 9, cursor),
    );

    const stored = await pool.query<{ post_id: number }>(
      `SELECT posts.post_id FROM pack_users
         INNER JOIN posts ON posts.pack_id = pack_users.pack_id
        WHERE pack_users.user_id = $1
        ORDER BY posts.date DESC, posts.post_id DESC`,
      [userId],
    );

    expect(ids).toEqual(stored.rows.map((row) => row.post_id));
  });

  it("answers an empty feed with no cursor", async () => {
    const empty = await pool.query<{ pack_id: number }>(
      `INSERT INTO packs (name) VALUES ($1) RETURNING pack_id`,
      [`empty ${randomUUID()}`],
    );

    const emptyPack = only(empty.rows).pack_id;
    const page = await getPackPosts(emptyPack);

    expect(page.rows).toEqual([]);
    expect(page.nextCursor).toBeNull();

    await pool.query("DELETE FROM packs WHERE pack_id = $1", [emptyPack]);
  });

  it("treats a malformed cursor as no cursor", async () => {
    // A cursor is opaque to the client but arrives over the wire, so it is
    // caller input. A broken one must not be pasted into the comparison.
    expect(decodeCursor("nonsense")).toBeNull();
    expect(decodeCursor("2026-01-01T00:00:00Z|notanumber")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();

    const page = await getPackPosts(packId, 3, "nonsense");
    expect(page.rows).toHaveLength(3);
  });
});
