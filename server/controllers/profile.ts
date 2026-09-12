import type { RequestHandler } from "express";
import zipcodes from "zipcodes";
import {
  addPhoto,
  createPackPromise,
  db,
  editProfilePromise,
  ensureNeighbours,
  getCurrentUserPromise,
  getFriendsPromise,
  getProfilePhotoPromise,
} from "../db/index.ts";
import { actingUser } from "../middleware/requireUser.ts";

export const getUserFriends: RequestHandler = async (req, res) => {
  try {
    const data = await getFriendsPromise(actingUser(req));
    res.send(data.rows);
  } catch (err) {
    console.error("unable to get user friends", err);
    res.status(500).send("unable to get user friends");
  }
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    const data = await getCurrentUserPromise(actingUser(req));
    res.send(data.rows);
  } catch (err) {
    console.error("unable to get current user", err);
    res.status(500).send("unable to get current user");
  }
};

// post request to create a pack
export const createPack: RequestHandler = async (req, res) => {
  const { packName } = req.body;

  try {
    const data = await createPackPromise(packName);
    res.send(data.rows);
  } catch (err) {
    console.error("unable to create pack", err);
    res.status(500).send("unable to create pack");
  }
};

export const createPhotos: RequestHandler = async (req, res) => {
  // Was /api/photos/:userId/new, so anyone could add a photo to anyone's
  // profile by editing the path. Photos go on the caller's own profile.
  const { photoUrl } = req.body;
  try {
    await addPhoto(actingUser(req), photoUrl);
    res.status(201).send("Successfully added new photo");
  } catch (err) {
    console.error("unable to add new photo", err);
    res.status(500).send("Unable to add new photo");
  }
};

// The playdate fields come from fixed menus in the form. Anything else that
// arrives in them — a fetch from the console, an old client — becomes null
// rather than a stored string the page will happily render back to everyone.
const SIZES = ["small", "medium", "large"];
const ENERGY = ["low", "medium", "high"];
const BEST_TIMES = ["mornings", "afternoons", "evenings", "weekends"];

const oneOf = (value: unknown, allowed: string[]): string | null =>
  typeof value === "string" && allowed.includes(value) ? value : null;
const text = (value: unknown, max: number): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.slice(0, max) : null;
};

export const editProfile: RequestHandler = async (req, res) => {
  const body = req.body || {};

  const dogName = text(body.dogName, 60);
  if (!dogName) {
    res.status(400).send("the dog needs a name");
    return;
  }

  const age = Number(body.age);
  try {
    await editProfilePromise(
      {
        dogName,
        ownerName: text(body.ownerName, 80),
        dogBreed: text(body.dogBreed, 60),
        age: Number.isInteger(age) && age >= 0 && age <= 30 ? age : null,
        vaccination: body.vaccination === true,
        discoverable: body.discoverable !== false,
        likesOne: text(body.likesOne, 40),
        likesTwo: text(body.likesTwo, 40),
        likesThree: text(body.likesThree, 40),
        size: oneOf(body.size, SIZES),
        energy: oneOf(body.energy, ENERGY),
        bestTime: oneOf(body.bestTime, BEST_TIMES),
        bio: text(body.bio, 400),
      },
      actingUser(req),
    );
    res.status(204).end();
  } catch (err) {
    console.error("unable to update profile", err);
    res.status(500).send("unable to update profile");
  }
};

export const getProfilePhoto: RequestHandler = async (req, res) => {
  try {
    const data = await getProfilePhotoPromise(actingUser(req));
    // Sent the entire pg result object before, leaving the client to reach
    // through .rows for it.
    res.send(data.rows);
  } catch (err) {
    console.error(err);
    res.status(404).send("unable to get profile photo");
  }
};

/*
 * Move a user to where their device says they are, and make sure there are
 * dogs to see there.
 *
 * This is what turns the demo experience into a real one: someone who declined
 * the location prompt at sign-in, or never got one, can grant it later without
 * having to type an address into their profile. Their profile location follows
 * from the device rather than the other way round.
 */
export const updateLocation: RequestHandler = async (req, res) => {
  const { zip, lat, lng } = req.body || {};
  const userId = actingUser(req);

  let resolved: string | null =
    zip && zipcodes.lookup(zip) ? String(zip) : null;
  if (
    !resolved &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  ) {
    const match = zipcodes.lookupByCoords(Number(lat), Number(lng));
    if (match) resolved = match.zip;
  }

  if (!resolved) {
    res
      .status(400)
      .send("a usable zip code or pair of coordinates is required");
    return;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET location = $2 WHERE user_id = $1", [
      userId,
      resolved,
    ]);
    const nearby = await ensureNeighbours(client, userId, resolved);
    await client.query("COMMIT");
    res.status(200).send({ location: resolved, nearby });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("unable to update location", err);
    res.status(500).send("unable to update location");
  } finally {
    client.release();
  }
};
