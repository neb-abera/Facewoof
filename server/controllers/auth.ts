import zipcodes from "zipcodes";
import { defineRoute, noContent, reply } from "../api/route.ts";
import { ErrorBody, User, Whereabouts } from "../api/schemas.ts";
import { createGuestUser, getCurrentUserPromise } from "../db/index.ts";
import { guestLimiter } from "../limits.ts";

/*
 * Hand a demo visitor their own throwaway account, and the demo roster placed
 * next to them.
 *
 * Takes a zip code, or coordinates from the browser, so the dogs are near the
 * person looking. Neither is required: without them the demo lands on its
 * default city rather than failing.
 */
export const guestLogin = defineRoute({
  method: "post",
  path: "/api/auth/guest",
  summary: "Sign a demo visitor in to their own throwaway account",
  auth: false,
  limit: guestLimiter,
  body: Whereabouts,
  responses: { 201: User },
  handler: async ({ body, session }) => {
    let originZip = body.zip;
    if (!originZip && body.lat !== undefined && body.lng !== undefined) {
      const match = zipcodes.lookupByCoords(body.lat, body.lng);
      if (match) originZip = match.zip;
    }

    const user = await createGuestUser(originZip);
    // Signing in is what establishes the session. Everything after this
    // takes the caller's identity from the cookie rather than the request.
    session.userId = user.user_id;
    return reply(201, user);
  },
});

/* Who the caller is, according to their session. */
export const me = defineRoute({
  method: "get",
  path: "/api/auth/me",
  summary: "The signed-in account",
  auth: true,
  responses: { 200: User, 401: ErrorBody },
  handler: async ({ userId, clearSession }) => {
    const { rows } = await getCurrentUserPromise(userId);
    const user = rows[0];
    if (!user) {
      // The account is gone: an expired guest swept up by the cleanup. Clear
      // the cookie rather than leaving them signed in to nothing.
      clearSession();
      return reply(401, { error: "sign in first" });
    }
    return reply(200, user);
  },
});

export const logout = defineRoute({
  method: "post",
  path: "/api/auth/logout",
  summary: "Sign out",
  auth: false,
  responses: { 204: null },
  handler: async ({ clearSession }) => {
    clearSession();
    return noContent(204);
  },
});
