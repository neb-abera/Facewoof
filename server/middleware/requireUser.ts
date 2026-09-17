import type { Request, RequestHandler } from "express";
import { sessionVersionOf } from "../db/sessions.ts";
import { securityEvent } from "../security-log.ts";
import { SESSION_MAX_AGE_MS } from "../session.ts";

type Session = CookieSessionInterfaces.CookieSessionObject;

/*
 * The user a session still speaks for, or null.
 *
 * A signature proves the server issued the cookie; it does not prove the
 * cookie is still wanted. Two more things have to hold: it was issued within
 * the session lifetime (the cookie's own expiry is advice to a browser, not a
 * limit on a copy), and the account has not signed out since — signing out
 * bumps users.session_version, and a session issued under an older version
 * is dead on every device. An account that no longer exists has no version.
 *
 * This is a primary-key lookup on every authenticated request. It is the
 * price of being able to end a session at all without a session store;
 * docs/OPERATIONS.md has what it measured.
 */
export async function liveSessionUser(
  session: Session | null | undefined,
): Promise<number | null> {
  const userId = Number(session?.userId);
  if (!session || !userId) return null;
  const issued = session.iat;
  if (typeof issued !== "number" || Date.now() - issued > SESSION_MAX_AGE_MS) {
    return null;
  }
  const current = await sessionVersionOf(userId);
  return current !== null && current === (session.v ?? 0) ? userId : null;
}

/*
 * Establish who is calling, from the session rather than from the request.
 *
 * `req.userId` is the only thing controllers should treat as the acting user.
 * Anything still arriving in a query string or body is a target — the dog being
 * swiped on, the pack being posted to — and has to be authorised separately.
 */
export const requireUser: RequestHandler = async (req, res, next) => {
  if (!req.session?.userId) {
    securityEvent(req, "auth.required");
    res.status(401).json({ error: "sign in first" });
    return;
  }

  let userId: number | null;
  try {
    userId = await liveSessionUser(req.session);
  } catch (err) {
    console.error("could not check the session", err);
    res.status(500).json({ error: "internal error" });
    return;
  }

  if (userId === null) {
    securityEvent(req, "auth.session_revoked");
    // Drop the dead cookie rather than have the browser keep presenting it.
    req.session = null;
    res.status(401).json({ error: "sign in first" });
    return;
  }

  req.userId = userId;
  next();
};

/*
 * The acting user, for a handler mounted behind requireUser.
 *
 * `req.userId` is optional on the type because it is absent until that
 * middleware has run. Every controller below it reads the id through this,
 * so the type is a plain number at the point of use, and a route that was
 * wired up without the middleware fails loudly on its first request rather
 * than acting as user `undefined`.
 */
export function actingUser(req: Request): number {
  if (req.userId === undefined) {
    throw new Error("actingUser called on a route not behind requireUser");
  }
  return req.userId;
}
