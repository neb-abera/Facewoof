import { defineRoute, reply } from "../api/route.ts";
import {
  ErrorBody,
  MakePostBody,
  Message,
  PackIdQuery,
  PackPost,
  Post,
} from "../api/schemas.ts";
import {
  getAllPostsFromAllPacks,
  getPackPosts,
  getSoloPosts,
  isPackMember,
  makePost,
} from "../db/index.ts";
import { writeLimiter } from "../limits.ts";

const notAMember = reply(403, { error: "not a member of this pack" });

/*
 * A pack's feed is for its members. Without the check, any signed-in visitor
 * — including a throwaway demo account — could read any pack's posts by
 * walking pack ids.
 */
export const ctrlPackPosts = defineRoute({
  method: "get",
  path: "/api/getAllPostsFromSpecificPack",
  summary: "A pack's posts, newest first (members only)",
  auth: true,
  query: PackIdQuery,
  responses: { 200: Post.array(), 403: ErrorBody },
  handler: async ({ userId, query }) => {
    if (!(await isPackMember(userId, query.packId))) return notAMember;
    return reply(200, (await getPackPosts(query.packId)).rows);
  },
});

/*
 * The same feed under the name the single-pack view asks for it by. It used
 * to skip the membership check its sibling above has, so any signed-in
 * visitor could read any pack's posts through this path. Same query, same
 * rule.
 */
export const ctrlSoloPosts = defineRoute({
  method: "get",
  path: "/api/getSoloPosts",
  summary: "A pack's posts, newest first (members only)",
  auth: true,
  query: PackIdQuery,
  responses: { 200: Post.array(), 403: ErrorBody },
  handler: async ({ userId, query }) => {
    if (!(await isPackMember(userId, query.packId))) return notAMember;
    return reply(200, (await getSoloPosts(query.packId)).rows);
  },
});

export const ctrlAllPostsFromAllPacks = defineRoute({
  method: "get",
  path: "/api/getAllPacksPostsForUser",
  summary: "Every post in every pack the caller is in, newest first",
  auth: true,
  responses: { 200: PackPost.array() },
  handler: async ({ userId }) => {
    const { rows } = await getAllPostsFromAllPacks(userId);
    // json_agg returns one row holding NULL when nothing matched.
    return reply(200, rows[0]?.json_agg ?? []);
  },
});

export const ctrlMakePost = defineRoute({
  method: "post",
  path: "/api/makePost",
  summary: "Post to a pack the caller is a member of",
  auth: true,
  limit: writeLimiter,
  body: MakePostBody,
  responses: { 201: Message, 403: ErrorBody },
  handler: async ({ userId, body }) => {
    const { packet } = body;
    // Posting requires membership, for the same reason reading does.
    if (!(await isPackMember(userId, packet.pack_id))) return notAMember;
    // The author is the session, not whatever user_id the packet claimed.
    await makePost({
      body: packet.body ?? null,
      photo_url: packet.photo_url ?? null,
      pack_id: packet.pack_id,
      user_id: userId,
    });
    return reply(201, { message: "post created" });
  },
});
