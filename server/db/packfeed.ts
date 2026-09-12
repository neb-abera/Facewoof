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

export const getPackPosts = (packId: number) =>
  pool.query<PostRow>(
    "SELECT * FROM posts WHERE posts.pack_id = $1 ORDER BY date DESC",
    [packId],
  );

export const getAllPostsFromAllPacks = (userId: number) =>
  pool.query<{ json_agg: PackPostRow[] | null }>(
    `SELECT json_agg(postobj) FROM (
       SELECT packs.name, posts.*, users.owner_name FROM pack_users
       INNER JOIN packs ON packs.pack_id = pack_users.pack_id
       INNER JOIN posts ON posts.pack_id = packs.pack_id
       INNER JOIN users ON posts.user_id = users.user_id
       WHERE pack_users.user_id = $1
       ORDER BY posts.date DESC
     ) AS postobj;`,
    [userId],
  );

export const getUserPlaydatesAllPacks = (userId: number) =>
  pool.query<PlaydateRow>(
    "SELECT * FROM playdates WHERE playdates.user_id = $1 ORDER BY start_date",
    [userId],
  );

export const getSoloPosts = (packId: number) =>
  pool.query<PostRow>(
    "SELECT * FROM posts WHERE posts.pack_id = $1 ORDER BY date DESC",
    [packId],
  );

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
