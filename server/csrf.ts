/*
 * CSRF, double-submit style (CodeQL js/missing-token-validation): every
 * response carries a readable token cookie, and every state-changing request
 * must echo it in an x-xsrf-token header, which the client's API layer does
 * (src/api.ts). Safe methods (GET/HEAD/OPTIONS) pass untouched, which also
 * covers the OIDC callback.
 *
 * lusca reports a mismatch by calling next(err), which used to fall through
 * to express's default handler: an HTML error page from a JSON API, and no
 * record that it happened. The wrapper answers in the API's own shape and
 * writes the security event.
 */
import type { RequestHandler } from "express";
import lusca from "lusca";
import { cookieName, secureCookies } from "./cookies.ts";
import { securityEvent } from "./security-log.ts";

export const CSRF_COOKIE = cookieName("XSRF-TOKEN");

const check = lusca.csrf({
  cookie: {
    name: CSRF_COOKIE,
    // The token cookie is deliberately readable from JavaScript - the
    // double-submit pattern needs the client to echo it in a header - but
    // there is no reason to send it cross-site or over plain HTTP. Path /
    // although only /api sets it: the client reads it from document.cookie
    // on whatever page it is on.
    options: {
      sameSite: "lax",
      secure: secureCookies,
    },
  },
  header: "x-xsrf-token",
});

export const csrf: RequestHandler = (req, res, next) => {
  check(req, res, (err?: unknown) => {
    if (!err) {
      next();
      return;
    }
    securityEvent(req, "csrf.rejected");
    res.status(403).json({ error: "missing or invalid CSRF token" });
  });
};
