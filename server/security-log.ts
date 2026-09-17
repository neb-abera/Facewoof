/*
 * Security events, as one JSON line each on the console — which is this
 * app's logger: Container Apps collects stdout into Log Analytics, where a
 * line that parses as JSON can be queried by field.
 *
 * One shape, so one query finds them all:
 *
 *   { "type": "security", "event": "rate_limit.hit", "route": "POST /api/auth/guest",
 *     "ip": "203.0.113.7", "userId": null, "requestId": "…", "at": "2026-…Z" }
 *
 * What is deliberately NOT here: cookies, tokens, email addresses, request
 * bodies, query strings, or any free text a caller supplied. `route` is the
 * path without its query (an OIDC callback's query holds the authorization
 * code), and `reason` is only ever one of the fixed words the call sites
 * pass. If a field is not on this list, it does not get logged.
 */
import crypto from "node:crypto";
import type { Request } from "express";

export type SecurityEventName =
  /* 401: a route behind requireUser, called without a session. */
  | "auth.required"
  /* 401: a session that was valid once and has been revoked or outlived. */
  | "auth.session_revoked"
  /* 403 from a handler: not a member, not a friend. */
  | "authz.denied"
  /* 403 from the CSRF check: a write without the double-submit token. */
  | "csrf.rejected"
  /* 429 from any limiter. */
  | "rate_limit.hit"
  | "oidc.failed"
  | "oidc.signed_in"
  | "guest.created"
  | "guest.refused"
  | "auth.logout"
  | "auth.logout_everywhere";

export interface SecurityDetail {
  /* Overrides the session's user: the account just created or signed in to. */
  userId?: number | null;
  /* A fixed word from the call site. Never text the caller supplied. */
  reason?: string;
}

const REQUEST_ID = Symbol("requestId");

/*
 * Cloudflare's ray id when there is one, so a line here can be matched to
 * the edge's own logs; otherwise a fresh id. The header is only accepted in
 * the shape Cloudflare writes, so it cannot be used to write into the log.
 */
function requestIdOf(req: Request): string {
  const held = req as Request & { [REQUEST_ID]?: string };
  if (!held[REQUEST_ID]) {
    const ray = req.get("cf-ray");
    held[REQUEST_ID] =
      ray && /^[0-9a-f]{16}(-[A-Z]{3})?$/.test(ray) ? ray : crypto.randomUUID();
  }
  return held[REQUEST_ID];
}

export function securityEvent(
  req: Request,
  event: SecurityEventName,
  detail: SecurityDetail = {},
): void {
  const userId =
    detail.userId !== undefined ? detail.userId : (req.session?.userId ?? null);
  console.log(
    JSON.stringify({
      type: "security",
      event,
      route: `${req.method} ${req.baseUrl}${req.path}`,
      ip: req.ip ?? null,
      userId,
      requestId: requestIdOf(req),
      ...(detail.reason ? { reason: detail.reason } : {}),
      at: new Date().toISOString(),
    }),
  );
}
