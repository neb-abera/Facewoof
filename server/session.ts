import crypto from "node:crypto";
import cookieSession from "cookie-session";
import type { Request } from "express";
import { cookieName, secureCookies } from "./cookies.ts";

/*
 * Who the caller is, held in a signed cookie.
 *
 * Every endpoint used to take the acting user's id as a query parameter or a
 * body field, which meant anyone could act as anyone by changing a number in a
 * URL. The id comes from here instead, and the cookie is signed, so the client
 * can read it but cannot forge it.
 *
 * A cookie rather than a server-side store on purpose: Container Apps runs
 * several replicas behind a load balancer with no session affinity, so a store
 * would have to be shared infrastructure. There is nothing in the session but
 * a user id, so there is nothing worth keeping server-side.
 */
const isProduction = process.env.NODE_ENV === "production";

// A generated key means restarting signs everyone out, which is fine for a
// demo and wrong for production, where replicas would each generate their own
// and reject each other's cookies.
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production");
}

/*
 * One key, or several separated by commas. The first signs; every one of
 * them verifies. That is what makes rotation possible without signing
 * everyone out: put the new key first, deploy, and take the old one away a
 * session lifetime later (docs/OPERATIONS.md). A single key could only be
 * replaced, which ended every session at once.
 */
const configured = (process.env.SESSION_SECRET ?? "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

const keys = configured.length
  ? configured
  : [crypto.randomBytes(32).toString("hex")];

/*
 * How long a session lasts. The cookie's own maxAge only tells an honest
 * browser when to forget it; a copied cookie has no such manners, so the
 * session also records when it was issued and requireUser enforces the same
 * limit on the server.
 */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/*
 * What the session can hold. cookie-session types its object as an open
 * record; this is the closed list, and `session.d.ts` merges it in so
 * `req.session.userId` is a number everywhere and a typo is a compile error.
 */
export interface PendingOidc {
  verifier: string;
  state: string;
  nonce: string;
  provider: string;
  guestUserId: number | null;
  /* When the sign-in was started, in epoch milliseconds. */
  startedAt: number;
}

/*
 * How long a started sign-in stays answerable. The verifier, state and nonce
 * ride in the session cookie, and without a limit of their own they were
 * good for as long as the cookie was: a callback URL could be completed a
 * day after it was issued. Ten minutes is an unhurried sign-in.
 */
export const PENDING_OIDC_MAX_AGE_MS = 10 * 60 * 1000;

export const session = cookieSession({
  name: cookieName("facewoof.sid"),
  keys,
  maxAge: SESSION_MAX_AGE_MS,
  httpOnly: true, // not readable from JavaScript, so XSS cannot lift it
  sameSite: "lax", // sent on normal navigation, not on cross-site form posts
  secure: secureCookies, // HTTPS only once deployed
});

/*
 * Sign a caller in. The one place a session gets its user, so that it always
 * also gets the two things that let the server end it: the account's session
 * version at this moment (signing out bumps it; see requireUser) and the
 * time of issue.
 */
export function establishSession(
  target: CookieSessionInterfaces.CookieSessionObject,
  userId: number,
  sessionVersion: number,
) {
  target.userId = userId;
  target.v = sessionVersion;
  target.iat = Date.now();
}

/*
 * The session object, for a handler that needs to write to it.
 *
 * cookie-session creates the object on every request, so `req.session` is
 * only ever absent if the middleware is not mounted in front of the route.
 * Its type says "maybe" because the typings cannot know the mount order;
 * this says so loudly instead of letting a write land on undefined.
 */
export function sessionOf(req: Request) {
  if (!req.session) {
    throw new Error("cookie-session is not mounted in front of this route");
  }
  return req.session;
}
