import { pool } from "./database.ts";
import type { PackRow, PlaydateRow, PostRow, ProfilePhotoRow } from "./rows.ts";
import type { PackPostRow } from "./shapes.ts";

// These took (req, res) and pulled values off req.query themselves, which put
// knowledge of the HTTP layer in the database layer. They take plain arguments
// now; the controllers do the unpacking.

export const getUserPacksId = (userId: number) =>
  pool.query<{ json_agg: PackRow[] | null }>(
    `SELECT json_agg(packobj) FROM (
       SELECT pack_users.pack_id, packs.name FROM pack_users
       INNER JOIN packs ON packs.pack_id = pack_users.pack_id
       WHERE pack_users.user_id = $1
     ) AS packobj;`,
    [userId],
  );

/*
 * One page of a feed, and the cursor that asks for the next one.
 *
 * These queries had no LIMIT. A pack page returned every post the pack had
 * ever carried, and the all-packs feed returned every post in every pack the
 * caller belongs to, aggregated into one JSON value. Both were O(posts) in a
 * quantity that only grows, read from Postgres, sent over the wire and handed
 * to the renderer, on every page load. Only the discover feed was ever paged.
 *
 * Keyset, not OFFSET. `date` is not unique — two posts land in the same second
 * often enough on a seeded database — so the cursor is the pair
 * (date, post_id) and the sort is the same pair. An OFFSET would skip or
 * repeat a post whenever one is added between two pages, which on a feed
 * ordered newest-first is every time someone posts.
 */
export const FEED_PAGE = 30;
export const FEED_PAGE_MAX = 100;

/* `<iso date>|<post_id>`, opaque to the client, which only echoes it back. */
export interface FeedCursor {
  date: string;
  postId: number;
}

export function encodeCursor(row: { date: Date; post_id: number }): string {
  return `${row.date.toISOString()}|${row.post_id}`;
}

export function decodeCursor(raw: string | undefined): FeedCursor | null {
  if (!raw) return null;
  const cut = raw.lastIndexOf("|");
  if (cut < 1) return null;
  const date = raw.slice(0, cut);
  const postId = Number(raw.slice(cut + 1));
  if (!Number.isInteger(postId) || Number.isNaN(Date.parse(date))) return null;
  return { date, postId };
}

/* One more than asked for, so "is there another page" costs no second query. */
function pageSize(limit: number | undefined): number {
  const asked = limit ?? FEED_PAGE;
  return Math.min(Math.max(asked, 1), FEED_PAGE_MAX);
}

export interface Page<T> {
  rows: T[];
  nextCursor: string | null;
}

function toPage<T extends { date: Date; post_id: number }>(
  rows: T[],
  size: number,
): Page<T> {
  const more = rows.length > size;
  const page = more ? rows.slice(0, size) : rows;
  const last = page[page.length - 1];
  return { rows: page, nextCursor: more && last ? encodeCursor(last) : null };
}

export const getPackPosts = async (
  packId: number,
  limit?: number,
  cursor?: string,
): Promise<Page<PostRow>> => {
  const size = pageSize(limit);
  const after = decodeCursor(cursor);
  const { rows } = await pool.query<PostRow>(
    `SELECT * FROM posts
      WHERE posts.pack_id = $1
        AND ($2::timestamptz IS NULL OR (posts.date, posts.post_id) < ($2, $3))
      ORDER BY posts.date DESC, posts.post_id DESC
      LIMIT $4`,
    [packId, after?.date ?? null, after?.postId ?? 0, size + 1],
  );
  return toPage(rows, size);
};

export const getAllPostsFromAllPacks = async (
  userId: number,
  limit?: number,
  cursor?: string,
): Promise<Page<PackPostRow>> => {
  const size = pageSize(limit);
  const after = decodeCursor(cursor);
  // The json_agg wrapper went with the LIMIT. It aggregated the whole result
  // into one value, which is the opposite of what a page wants, and it made
  // the controller unwrap a single row that is NULL when nothing matched.
  const { rows } = await pool.query<PackPostRow>(
    `SELECT packs.name, posts.*, users.owner_name
       FROM pack_users
       INNER JOIN packs ON packs.pack_id = pack_users.pack_id
       INNER JOIN posts ON posts.pack_id = packs.pack_id
       INNER JOIN users ON posts.user_id = users.user_id
      WHERE pack_users.user_id = $1
        AND ($2::timestamptz IS NULL OR (posts.date, posts.post_id) < ($2, $3))
      ORDER BY posts.date DESC, posts.post_id DESC
      LIMIT $4`,
    [userId, after?.date ?? null, after?.postId ?? 0, size + 1],
  );
  return toPage(rows, size);
};

export const getUserPlaydatesAllPacks = (userId: number) =>
  pool.query<PlaydateRow>(
    "SELECT * FROM playdates WHERE playdates.user_id = $1 ORDER BY start_date",
    [userId],
  );

/* The same page under the name the single-pack view asks for it by. */
export const getSoloPosts = getPackPosts;

export const getPfp = (userId: number) =>
  pool.query<ProfilePhotoRow>(
    "SELECT * FROM profile_photos WHERE profile_photos.user_id = $1",
    [userId],
  );

/*
 * Whether a user belongs to a pack. The feed and the post endpoints gate on
 * this: a pack's posts are for its members, not for anyone holding its id.
 */
export const isPackMember = (userId: number, packId: number) =>
  pool
    .query("SELECT 1 FROM pack_users WHERE user_id = $1 AND pack_id = $2", [
      userId,
      packId,
    ])
    .then(({ rowCount }) => (rowCount ?? 0) > 0);

export interface NewPost {
  user_id: number;
  pack_id: number;
  body: string | null;
  photo_url: string | null;
}

export const makePost = ({ user_id, pack_id, body, photo_url }: NewPost) =>
  pool.query(
    `INSERT INTO posts (user_id, pack_id, body, date, photo_url)
     VALUES ($1, $2, $3, now(), $4)`,
    [user_id, pack_id, body, photo_url || null],
  );
