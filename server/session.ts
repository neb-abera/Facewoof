import crypto from "node:crypto";
import cookieSession from "cookie-session";
import type { Request } from "express";
import { insecureTransport } from "./insecure-transport.ts";

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

const secret =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

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
}

export const session = cookieSession({
  name: "facewoof.sid",
  keys: [secret],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true, // not readable from JavaScript, so XSS cannot lift it
  sameSite: "lax", // sent on normal navigation, not on cross-site form posts
  secure: isProduction && !insecureTransport, // HTTPS only once deployed
});

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
