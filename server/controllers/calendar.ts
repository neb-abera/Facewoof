import { defineRoute, reply } from "../api/route.ts";
import {
  Message,
  NewPlaydateBody,
  PackPlaydate,
  Playdate,
} from "../api/schemas.ts";
import {
  createPlaydate,
  getAllPlaydates,
  getUserPlaydatesAllPacks,
} from "../db/index.ts";
import { writeLimiter } from "../limits.ts";

export const getPlaydates = defineRoute({
  method: "get",
  path: "/api/playdates",
  summary: "Every playdate in the caller's packs",
  auth: true,
  responses: { 200: PackPlaydate.array() },
  handler: async ({ userId }) => {
    const data = await getAllPlaydates(userId);
    // json_agg gives back one row holding NULL when the user is in no packs.
    return reply(200, data.rows[0]?.pack_playdates ?? []);
  },
});

export const AddPlaydate = defineRoute({
  method: "post",
  path: "/api/addplaydate",
  summary: "Put a playdate on a pack's calendar",
  auth: true,
  limit: writeLimiter,
  body: NewPlaydateBody,
  responses: { 201: Message },
  handler: async ({ userId, body }) => {
    await createPlaydate({
      packId: body.packId,
      userId,
      playdateBody: body.playdateBody ?? null,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return reply(201, { message: "playdate added" });
  },
});

export const ctrlUserPlaydatesAllPacks = defineRoute({
  method: "get",
  path: "/api/getUserPlaydates",
  summary: "The playdates the caller created, soonest first",
  auth: true,
  responses: { 200: Playdate.array() },
  handler: async ({ userId }) =>
    reply(200, (await getUserPlaydatesAllPacks(userId)).rows),
});
