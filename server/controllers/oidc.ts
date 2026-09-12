import { defineRoute, redirect, reply } from "../api/route.ts";
import {
  ErrorBody,
  OidcCallbackQuery,
  OidcStartQuery,
  Providers,
} from "../api/schemas.ts";
import { findOrCreateExternalUser } from "../db/index.ts";
import { guestLimiter } from "../limits.ts";
import * as oidc from "../oidc.ts";

/*
 * What the sign-in page should offer.
 *
 * The client asks rather than assuming, so an install with no tenant
 * configured simply shows the demo button and no dead sign-in options.
 */
export const providers = defineRoute({
  method: "get",
  path: "/api/auth/providers",
  summary: "The sign-in providers this instance offers",
  auth: false,
  responses: { 200: Providers },
  handler: async () =>
    reply(200, {
      configured: oidc.isConfigured,
      providers: oidc.isConfigured
        ? Object.entries(oidc.PROVIDERS).map(([id, { label }]) => ({
            id,
            label,
          }))
        : [],
    }),
});

/* Begin sign-in: hand the browser to Entra with a fresh PKCE challenge. */
export const start = defineRoute({
  method: "get",
  path: "/api/auth/oidc/start",
  summary: "Begin sign-in through the identity provider (a browser navigation)",
  auth: false,
  limit: guestLimiter,
  query: OidcStartQuery,
  responses: { 302: null, 502: ErrorBody, 503: ErrorBody },
  handler: async ({ query, session }) => {
    if (!oidc.isConfigured) {
      return reply(503, { error: "sign-in is not configured" });
    }

    try {
      const request = oidc.createAuthRequest(query.provider);

      /*
       * The verifier, state and nonce go in the session, not in the URL. They
       * are what proves the callback belongs to this browser's sign-in, so
       * putting them anywhere the caller can edit would defeat them.
       *
       * The guest id is kept so the account can be claimed rather than
       * orphaned when they come back signed in.
       */
      session.oidc = {
        verifier: request.verifier,
        state: request.state,
        nonce: request.nonce,
        provider: request.provider,
        guestUserId: session.userId ?? null,
      };

      return redirect(302, await oidc.authorizeUrl(request));
    } catch (err) {
      console.error("could not start sign-in", err);
      return reply(502, { error: "could not reach the sign-in service" });
    }
  },
});

/*
 * Come back from Entra with a code, and turn it into a session.
 *
 * Failures redirect to the login page with a reason rather than rendering an
 * error, because this URL is reached by a browser navigation, not by fetch.
 */
export const callback = defineRoute({
  method: "get",
  path: "/api/auth/oidc/callback",
  summary: "Finish sign-in: exchange the provider's code for a session",
  auth: false,
  query: OidcCallbackQuery,
  responses: { 302: null },
  handler: async ({ query, session }) => {
    const fail = (reason: string) =>
      redirect(302, `/login?error=${encodeURIComponent(reason)}`);

    if (!oidc.isConfigured) return fail("not-configured");

    const pending = session.oidc;
    // Used once. Clearing first means a replayed callback finds nothing.
    session.oidc = null;

    if (!pending) return fail("expired");
    if (query.error) {
      console.error(
        "sign-in was refused",
        query.error,
        query.error_description,
      );
      return fail("refused");
    }
    // Compared before anything else is trusted from this request.
    if (!query.state || query.state !== pending.state) {
      return fail("state-mismatch");
    }
    if (!query.code) return fail("no-code");

    try {
      const tokens = await oidc.exchangeCode({
        code: query.code,
        verifier: pending.verifier,
      });

      if (!tokens.id_token) return fail("no-id-token");

      const claims = await oidc.verifyIdToken({
        idToken: tokens.id_token,
        nonce: pending.nonce,
      });

      const { userId } = await findOrCreateExternalUser({
        issuer: claims.iss ?? "",
        subject: claims.sub,
        provider: pending.provider,
        email: claims.email || claims.preferred_username || null,
        name: claims.name || null,
        guestUserId: pending.guestUserId,
      });

      session.userId = userId;
      return redirect(302, "/discover");
    } catch (err) {
      console.error("sign-in failed", err);
      return fail("failed");
    }
  },
});
