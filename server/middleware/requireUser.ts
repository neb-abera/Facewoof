import type { Request, RequestHandler } from "express";

/*
 * Establish who is calling, from the session rather than from the request.
 *
 * `req.userId` is the only thing controllers should treat as the acting user.
 * Anything still arriving in a query string or body is a target — the dog being
 * swiped on, the pack being posted to — and has to be authorised separately.
 */
export const requireUser: RequestHandler = (req, res, next) => {
  const userId = req.session?.userId;

  if (!userId) {
    res.status(401).send("sign in first");
    return;
  }

  req.userId = Number(userId);
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
