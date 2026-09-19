import zipcodes from "zipcodes";
import { defineRoute, noContent, reply } from "../api/route.ts";
import { ErrorBody, User, Whereabouts } from "../api/schemas.ts";
import {
  countLiveGuests,
  createGuestUser,
  getCurrentUserPromise,
} from "../db/index.ts";
import { bumpSessionVersion } from "../db/sessions.ts";
import { GUEST_MAX_LIVE, guestLimiter, publicLimiter } from "../limits.ts";
import { establishSession } from "../session.ts";

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
  responses: { 201: User, 503: ErrorBody },
  handler: async ({ body, session, audit }) => {
    // One indexed count, before the hundred-row insert it guards. Two
    // requests racing past it together overshoot by one; it is a ceiling on
    // abuse, not an invariant.
    if ((await countLiveGuests()) >= GUEST_MAX_LIVE) {
      audit("guest.refused", { reason: "capacity" });
      return reply(503, {
        error:
          "The demo is full right now. Please try again in a little while.",
      });
    }

    let originZip = body.zip;
    if (!originZip && body.lat !== undefined && body.lng !== undefined) {
      const match = zipcodes.lookupByCoords(body.lat, body.lng);
      if (match) originZip = match.zip;
    }

    const user = await createGuestUser(originZip);
    // Signing in is what establishes the session. Everything after this
    // takes the caller's identity from the cookie rather than the request.
    establishSession(session, user.user_id, user.session_version);
    audit("guest.created", { userId: user.user_id });
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
  limit: publicLimiter,
  responses: { 204: null },
  handler: async ({ userId, clearSession, audit }) => {
    // Clearing the cookie only signs out the browser that asked. Bumping the
    // account's session version is what signs out a copy of that cookie held
    // anywhere else — and, there being one version per account, every other
    // device too: sign-out here is sign-out everywhere. Only a live session
    // may do it (userId is null for a revoked one), so a dead cookie cannot
    // be replayed to keep signing its owner out.
    if (userId !== null) {
      await bumpSessionVersion(userId);
      audit("auth.logout", { userId });
    }
    clearSession();
    return noContent(204);
  },
});
