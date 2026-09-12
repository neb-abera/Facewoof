import type { RequestHandler } from "express";
import zipcodes from "zipcodes";
import { createGuestUser, getCurrentUserPromise } from "../db/index.ts";
import { actingUser } from "../middleware/requireUser.ts";
import { sessionOf } from "../session.ts";

/*
 * Hand a demo visitor their own throwaway account, and the demo roster placed
 * next to them.
 *
 * Takes a zip code, or coordinates from the browser, so the dogs are near the
 * person looking. Neither is required: without them the demo lands on its
 * default city rather than failing.
 */
export const guestLogin: RequestHandler = async (req, res) => {
  const { zip, lat, lng } = req.body || {};
  let originZip: string | undefined = zip ? String(zip) : undefined;

  if (
    !originZip &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  ) {
    const match = zipcodes.lookupByCoords(Number(lat), Number(lng));
    if (match) originZip = match.zip;
  }

  try {
    const user = await createGuestUser(originZip);
    // Signing in is what establishes the session. Everything after this
    // takes the caller's identity from the cookie rather than the request.
    sessionOf(req).userId = user.user_id;
    res.status(201).send(user);
  } catch (err) {
    console.error("unable to create guest account", err);
    res.status(500).send("unable to create guest account");
  }
};

/* Who the caller is, according to their session. */
export const me: RequestHandler = async (req, res) => {
  try {
    const { rows } = await getCurrentUserPromise(actingUser(req));
    const user = rows[0];
    if (!user) {
      // The account is gone: an expired guest swept up by the cleanup. Clear
      // the cookie rather than leaving them signed in to nothing.
      req.session = null;
      res.status(401).send("sign in first");
      return;
    }
    res.status(200).send(user);
  } catch (err) {
    console.error("unable to load the current user", err);
    res.status(500).send("unable to load the current user");
  }
};

export const logout: RequestHandler = (req, res) => {
  req.session = null;
  res.status(204).end();
};
