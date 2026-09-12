import type { RequestHandler, Response } from "express";
import type { QueryResult } from "../db/database.ts";
import {
  getAllPostsFromAllPacks,
  getPackPosts,
  getPfp,
  getSoloPosts,
  getUserPacksId,
  getUserPlaydatesAllPacks,
  isPackMember,
  makePost,
} from "../db/index.ts";
import { actingUser } from "../middleware/requireUser.ts";

// json_agg returns a single row holding NULL when nothing matched, so every
// caller has to turn that into an empty list.
const aggregated = <T>(result: QueryResult<{ json_agg: T[] | null }>): T[] =>
  result.rows[0]?.json_agg ?? [];

const fail =
  (res: Response, status: number, message: string) => (err: unknown) => {
    console.error(message, err);
    res.status(status).send(message);
  };

export const ctrlPackPosts: RequestHandler = async (req, res) => {
  const packId = Number(req.query.packId);
  if (!Number.isInteger(packId)) {
    res.status(400).send("packId is required");
    return;
  }

  // A pack's feed is for its members. Without this, any signed-in visitor —
  // including a throwaway demo account — could read any pack's posts by
  // walking pack ids.
  try {
    const member = await isPackMember(actingUser(req), packId);
    if (!member) {
      res.status(403).send("not a member of this pack");
      return;
    }
    const resp = await getPackPosts(packId);
    res.status(200).send(resp.rows);
  } catch (err) {
    fail(res, 500, "unable to get pack posts")(err);
  }
};

export const ctrlUserPacksId: RequestHandler = async (req, res) => {
  try {
    const resp = await getUserPacksId(actingUser(req));
    res.status(200).send(aggregated(resp));
  } catch (err) {
    fail(res, 500, "unable to get user packs")(err);
  }
};

export const ctrlAllPostsFromAllPacks: RequestHandler = async (req, res) => {
  try {
    const resp = await getAllPostsFromAllPacks(actingUser(req));
    res.status(200).send(aggregated(resp));
  } catch (err) {
    fail(res, 500, "unable to get all pack posts")(err);
  }
};

export const ctrlUserPlaydatesAllPacks: RequestHandler = async (req, res) => {
  try {
    const resp = await getUserPlaydatesAllPacks(actingUser(req));
    res.status(200).send(resp.rows);
  } catch (err) {
    fail(res, 500, "unable to get all playdates")(err);
  }
};

export const ctrlSoloPosts: RequestHandler = async (req, res) => {
  try {
    const resp = await getSoloPosts(Number(req.query.packId));
    res.status(200).send(resp.rows);
  } catch (err) {
    fail(res, 500, "unable to get solo posts")(err);
  }
};

export const ctrlPfp: RequestHandler = async (req, res) => {
  try {
    const resp = await getPfp(actingUser(req));
    res.status(200).send(resp.rows);
  } catch (err) {
    fail(res, 500, "unable to get profile photos")(err);
  }
};

export const ctrlMakePost: RequestHandler = async (req, res) => {
  const packet = req.body.packet || {};
  const packId = Number(packet.pack_id);
  if (!Number.isInteger(packId)) {
    res.status(400).send("pack_id is required");
    return;
  }

  // Posting requires membership, for the same reason reading does.
  try {
    const member = await isPackMember(actingUser(req), packId);
    if (!member) {
      res.status(403).send("not a member of this pack");
      return;
    }
    // The author is the session, not whatever user_id the packet claimed.
    await makePost({
      body: typeof packet.body === "string" ? packet.body : null,
      photo_url: typeof packet.photo_url === "string" ? packet.photo_url : null,
      pack_id: packId,
      user_id: actingUser(req),
    });
    res.status(201).send("post created");
  } catch (err) {
    fail(res, 500, "unable to make post")(err);
  }
};
