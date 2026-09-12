import type { RequestHandler } from "express";
import { createPlaydate, getAllPlaydates } from "../db/index.ts";
import { actingUser } from "../middleware/requireUser.ts";

export const getPlaydates: RequestHandler = async (req, res) => {
  try {
    const data = await getAllPlaydates(actingUser(req));
    // json_agg gives back one row holding NULL when the user is in no packs.
    res.send(data.rows[0]?.pack_playdates ?? []);
  } catch (err) {
    console.error("unable to get playdates", err);
    res.status(500).send("unable to get playdates");
  }
};

export const AddPlaydate: RequestHandler = async (req, res) => {
  const { packId, playdateBody, startTime, endTime } = req.body;

  if (!packId || !startTime || !endTime) {
    res.status(400).send("packId, startTime and endTime are required");
    return;
  }

  try {
    await createPlaydate({
      packId,
      userId: actingUser(req),
      playdateBody,
      startTime,
      endTime,
    });
    res.status(201).send("playdate added");
  } catch (err) {
    console.error("unable to create playdate", err);
    res.status(500).send("unable to create playdate");
  }
};
