import { defineRoute, reply } from "../api/route.ts";
import {
  CreatePackBody,
  ErrorBody,
  JoinPackBody,
  Message,
  Pack,
} from "../api/schemas.ts";
import {
  addToPack,
  createPackAndAdd,
  getPacks,
  getUserPacksId,
} from "../db/index.ts";
import { writeLimiter } from "../limits.ts";

/*
 * Add the caller to an existing pack.
 *
 * The original read req.params on a route that declares no parameters
 * (PUT /api/addtopack), so both values were always undefined and the insert
 * silently wrote a row of nulls. They come from the body.
 */
export const addUserToPack = defineRoute({
  method: "put",
  path: "/api/addtopack",
  summary: "Join a pack one of the caller's friends is in",
  auth: true,
  limit: writeLimiter,
  body: JoinPackBody,
  responses: { 201: Message, 403: ErrorBody },
  handler: async ({ userId, body }) => {
    const { rowCount } = await addToPack(userId, body.pack_id);
    if (rowCount === 0) {
      // Either no friend of the caller is in that pack, or they are already
      // a member. The first is a refusal; the second is a no-op that the
      // client treats the same way.
      return reply(403, { error: "you can only join a pack a friend is in" });
    }
    return reply(201, { message: "Added to pack" });
  },
});

export const createNewPackAndAdd = defineRoute({
  method: "put",
  path: "/api/createpack",
  summary: "Create a pack with the given members; the caller is always one",
  auth: true,
  limit: writeLimiter,
  body: CreatePackBody,
  responses: { 201: Message },
  handler: async ({ userId, body }) => {
    // The creator is always in their own pack, whatever the client sent.
    const members = Array.from(new Set([userId, ...body.users]));
    await createPackAndAdd(body.pack_name, members);
    return reply(201, { message: "Pack created" });
  },
});

export const getUserPacks = defineRoute({
  method: "get",
  path: "/api/getpacks",
  summary: "The packs the caller is in",
  auth: true,
  responses: { 200: Pack.array() },
  handler: async ({ userId }) => {
    const { rows } = await getPacks(userId);
    // json_agg returns one row holding NULL when the user is in no packs.
    return reply(200, rows[0]?.json_agg ?? []);
  },
});

/* The same list under the name the pack feed's sidebar asks for it by. */
export const ctrlUserPacksId = defineRoute({
  method: "get",
  path: "/api/getUserPacks",
  summary: "The packs the caller is in",
  auth: true,
  responses: { 200: Pack.array() },
  handler: async ({ userId }) => {
    const { rows } = await getUserPacksId(userId);
    return reply(200, rows[0]?.json_agg ?? []);
  },
});
