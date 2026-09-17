/*
 * The route table as an Express router.
 *
 * For every route: the rate limiter, then requireUser when the route needs a
 * signed-in user, then one handler that parses the body and query string
 * against the declared schemas (400 with the field-level issues on failure),
 * calls the route's handler with the parsed input, and checks the reply
 * against the declared response schema before sending it. A reply that does
 * not match its own contract is a 500 and a log line, never a surprise on the
 * wire: the browser suite runs against the production image, so a schema that
 * disagrees with what the database actually returns fails there first.
 */
import express, {
  type RequestHandler,
  type Response,
  type Router,
} from "express";
import type { z } from "zod";
import {
  actingUser,
  liveSessionUser,
  requireUser,
} from "../middleware/requireUser.ts";
import { securityEvent } from "../security-log.ts";
import { sessionOf } from "../session.ts";
import type { AnyRoute } from "./route.ts";

/* Field-level issues, as "path: message" lines a client can show. */
const issuesOf = (error: z.ZodError): string[] =>
  error.issues.map(
    (issue) =>
      `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
  );

const send = (route: AnyRoute, reply: unknown, res: Response) => {
  const { status, body, location } = reply as {
    status: number;
    body?: unknown;
    location?: string;
  };
  const schema = route.responses[status];

  if (schema === undefined) {
    console.error(
      `${route.method.toUpperCase()} ${route.path} answered ${status}, which it does not declare`,
    );
    res.status(500).json({ error: "internal error" });
    return;
  }

  if (schema === null) {
    if (location) res.redirect(status, location);
    else res.status(status).end();
    return;
  }

  // Serialise, validate the JSON, and send what the schema parsed rather
  // than what the handler returned. Dates become ISO strings here, which is
  // what the schema describes — and Zod drops keys an object schema does not
  // declare, so a `SELECT *` that picks up a new private column cannot put
  // it on the wire: only declared fields ever leave.
  const checked = schema.safeParse(JSON.parse(JSON.stringify(body)));
  if (!checked.success) {
    console.error(
      `${route.method.toUpperCase()} ${route.path} ${status} response did not match its contract:`,
      issuesOf(checked.error).join("; "),
    );
    res.status(500).json({ error: "internal error" });
    return;
  }
  res.status(status).json(checked.data);
};

const handle =
  (route: AnyRoute): RequestHandler =>
  async (req, res) => {
    let body: unknown;
    if (route.body) {
      const parsed = route.body.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "invalid request body",
          issues: issuesOf(parsed.error),
        });
        return;
      }
      body = parsed.data;
    }

    let query: unknown;
    if (route.query) {
      const parsed = route.query.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: "invalid query string",
          issues: issuesOf(parsed.error),
        });
        return;
      }
      query = parsed.data;
    }

    try {
      const reply = await route.handler({
        // Behind `auth` requireUser has already vouched for the session. A
        // public route that still wants to know who is calling (sign-out,
        // upgrading a guest at sign-in) gets the same answer, or null: a
        // revoked cookie is nobody.
        userId: route.auth
          ? actingUser(req)
          : await liveSessionUser(req.session),
        body,
        query,
        session: sessionOf(req),
        clearSession: () => {
          req.session = null;
        },
        audit: (event, detail) => securityEvent(req, event, detail),
      });
      // Every authorisation refusal in the table, recorded in one place: a
      // handler says no by replying 403 (or 401 for a session whose account
      // is gone), and never has to remember to log it.
      const { status } = reply as { status: number };
      if (status === 403) securityEvent(req, "authz.denied");
      if (status === 401) securityEvent(req, "auth.required");
      send(route, reply, res);
    } catch (err) {
      console.error(
        `${route.method.toUpperCase()} ${route.path} (${route.summary}) failed`,
        err,
      );
      res.status(500).json({ error: "internal error" });
    }
  };

export function buildRouter(routes: readonly AnyRoute[]): Router {
  const router = express.Router();

  for (const route of routes) {
    const chain: RequestHandler[] = [];
    if (route.limit) chain.push(route.limit);
    if (route.auth) chain.push(requireUser);
    chain.push(handle(route));
    router[route.method](route.path, ...chain);
  }

  // Anything under /api that no route claimed. JSON like everything else
  // here, rather than falling through to the single-page app's index.html.
  router.use("/api", (_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  return router;
}
