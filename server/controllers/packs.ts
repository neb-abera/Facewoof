import type { RequestHandler } from "express";
import { addToPack, createPackAndAdd, getPacks } from "../db/index.ts";
import { actingUser } from "../middleware/requireUser.ts";

/*
 * Add a user to an existing pack.
 *
 * The original read req.params on a route that declares no parameters
 * (PUT /api/addtopack), so both values were always undefined and the insert
 * silently wrote a row of nulls. They come from the body.
 */
export const addUserToPack: RequestHandler = async (req, res) => {
  const { pack_id: packId } = req.body;

  if (!packId) {
    res.status(400).send("pack_id is required");
    return;
  }

  try {
    const { rowCount } = await addToPack(actingUser(req), packId);
    if (rowCount === 0) {
      // Either no friend of the caller is in that pack, or they are already
      // a member. The first is a refusal; the second is a no-op that the
      // client treats the same way.
      res.status(403).send("you can only join a pack a friend is in");
      return;
    }
    res.status(201).send("Added to pack");
  } catch (err) {
    console.error("error adding to pack", err);
    res.status(500).send("Error adding to pack");
  }
};

export const createNewPackAndAdd: RequestHandler = async (req, res) => {
  const { pack_name: packName } = req.body;
  let { users } = req.body;

  // The original always called JSON.parse, which threw whenever the client
  // sent a real JSON array rather than a string holding one.
  if (typeof users === "string") {
    try {
      users = JSON.parse(users);
    } catch {
      res.status(400).send("users must be an array of user ids");
      return;
    }
  }

  if (!packName || !Array.isArray(users) || users.length === 0) {
    res.status(400).send("pack_name and a non-empty users array are required");
    return;
  }

  // The creator is always in their own pack, whatever the client sent.
  const members = Array.from(
    new Set([actingUser(req), ...users.map((u: unknown) => Number(u))]),
  );

  try {
    await createPackAndAdd(packName, members);
    res.status(201).send("Pack created");
  } catch (err) {
    console.error("error creating pack", err);
    res.status(500).send("Error creating pack");
  }
};

export const getUserPacks: RequestHandler = async (req, res) => {
  try {
    const { rows } = await getPacks(actingUser(req));
    // json_agg returns one row holding NULL when the user is in no packs.
    res.status(200).send(rows[0]?.json_agg ?? []);
  } catch (err) {
    console.error("unable to get packs", err);
    res.status(500).send("unable to get packs");
  }
};
