import zipcodes from "zipcodes";
import { defineRoute, noContent, reply } from "../api/route.ts";
import {
  EditProfileBody,
  ErrorBody,
  Friend,
  Message,
  NewPackBody,
  PackId,
  PhotoBody,
  PhotoUrl,
  Placed,
  ProfilePhoto,
  User,
  Whereabouts,
} from "../api/schemas.ts";
import {
  addPhoto,
  createPackPromise,
  db,
  editProfilePromise,
  ensureNeighbours,
  getCurrentUserPromise,
  getFriendsPromise,
  getPfp,
  getProfilePhotoPromise,
} from "../db/index.ts";
import { writeLimiter } from "../limits.ts";

export const getUserFriends = defineRoute({
  method: "get",
  path: "/api/friends",
  summary: "The caller's matches, with their photos",
  auth: true,
  responses: { 200: Friend.array() },
  handler: async ({ userId }) =>
    reply(200, (await getFriendsPromise(userId)).rows),
});

/* The account as a one-element list, which is how the original client read it. */
export const getCurrentUser = defineRoute({
  method: "get",
  path: "/api/currentuser",
  summary: "The signed-in account, as a one-element list",
  auth: true,
  responses: { 200: User.array() },
  handler: async ({ userId }) =>
    reply(200, (await getCurrentUserPromise(userId)).rows),
});

export const createPack = defineRoute({
  method: "post",
  path: "/api/pack",
  summary: "Create an empty pack",
  auth: true,
  body: NewPackBody,
  responses: { 200: PackId.array() },
  handler: async ({ body }) =>
    reply(200, (await createPackPromise(body.packName)).rows),
});

export const createPhotos = defineRoute({
  method: "post",
  path: "/api/photos",
  summary: "Add a photo to the caller's own profile",
  auth: true,
  limit: writeLimiter,
  body: PhotoBody,
  responses: { 201: Message },
  handler: async ({ userId, body }) => {
    // Was /api/photos/:userId/new, so anyone could add a photo to anyone's
    // profile by editing the path. Photos go on the caller's own profile.
    await addPhoto(userId, body.photoUrl);
    return reply(201, { message: "Successfully added new photo" });
  },
});

export const editProfile = defineRoute({
  method: "put",
  path: "/api/edituser",
  summary: "Update the caller's profile",
  auth: true,
  limit: writeLimiter,
  body: EditProfileBody,
  responses: { 204: null },
  handler: async ({ userId, body }) => {
    await editProfilePromise(
      {
        dogName: body.dogName,
        ownerName: body.ownerName,
        dogBreed: body.dogBreed,
        age: body.age ?? null,
        vaccination: body.vaccination === true,
        discoverable: body.discoverable !== false,
        likesOne: body.likesOne,
        likesTwo: body.likesTwo,
        likesThree: body.likesThree,
        size: body.size,
        energy: body.energy,
        bestTime: body.bestTime,
        bio: body.bio,
      },
      userId,
    );
    return noContent(204);
  },
});

export const getProfilePhoto = defineRoute({
  method: "get",
  path: "/api/profilephoto",
  summary: "The caller's photo URLs, profile photo first",
  auth: true,
  responses: { 200: PhotoUrl.array(), 404: ErrorBody },
  handler: async ({ userId }) =>
    reply(200, (await getProfilePhotoPromise(userId)).rows),
});

export const ctrlPfp = defineRoute({
  method: "get",
  path: "/api/getPfp",
  summary: "The caller's photo rows",
  auth: true,
  responses: { 200: ProfilePhoto.array() },
  handler: async ({ userId }) => reply(200, (await getPfp(userId)).rows),
});

/*
 * Move a user to where their device says they are, and make sure there are
 * dogs to see there.
 *
 * This is what turns the demo experience into a real one: someone who declined
 * the location prompt at sign-in, or never got one, can grant it later without
 * having to type an address into their profile. Their profile location follows
 * from the device rather than the other way round.
 */
export const updateLocation = defineRoute({
  method: "put",
  path: "/api/location",
  summary: "Move the caller to a zip code or to their device's coordinates",
  auth: true,
  limit: writeLimiter,
  body: Whereabouts,
  responses: { 200: Placed, 400: ErrorBody },
  handler: async ({ userId, body }) => {
    let resolved: string | null =
      body.zip && zipcodes.lookup(body.zip) ? body.zip : null;
    if (!resolved && body.lat !== undefined && body.lng !== undefined) {
      const match = zipcodes.lookupByCoords(body.lat, body.lng);
      if (match) resolved = match.zip;
    }

    if (!resolved) {
      return reply(400, {
        error: "a usable zip code or pair of coordinates is required",
      });
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
      return reply(200, { location: resolved, nearby });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
});
