import type { RequestHandler } from "express";
import { findOrCreateExternalUser } from "../db/index.ts";
import * as oidc from "../oidc.ts";
import { sessionOf } from "../session.ts";

/* A query-string value, only when it is the single string the flow expects. */
const single = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/*
 * What the sign-in page should offer.
 *
 * The client asks rather than assuming, so an install with no tenant
 * configured simply shows the demo button and no dead sign-in options.
 */
export const providers: RequestHandler = (_req, res) => {
  res.status(200).send({
    configured: oidc.isConfigured,
    providers: oidc.isConfigured
      ? Object.entries(oidc.PROVIDERS).map(([id, { label }]) => ({ id, label }))
      : [],
  });
};

/* Begin sign-in: hand the browser to Entra with a fresh PKCE challenge. */
export const start: RequestHandler = async (req, res) => {
  if (!oidc.isConfigured) {
    res.status(503).send("sign-in is not configured");
    return;
  }

  try {
    const request = oidc.createAuthRequest(single(req.query.provider));
    const session = sessionOf(req);

    /*
     * The verifier, state and nonce go in the session, not in the URL. They
     * are what proves the callback belongs to this browser's sign-in, so
     * putting them anywhere the caller can edit would defeat them.
     *
     * The guest id is kept so the account can be claimed rather than orphaned
     * when they come back signed in.
     */
    session.oidc = {
      verifier: request.verifier,
      state: request.state,
      nonce: request.nonce,
      provider: request.provider,
      guestUserId: session.userId ?? null,
    };

    res.redirect(await oidc.authorizeUrl(request));
  } catch (err) {
    console.error("could not start sign-in", err);
    res.status(502).send("could not reach the sign-in service");
  }
};

/*
 * Come back from Entra with a code, and turn it into a session.
 *
 * Failures redirect to the login page with a reason rather than rendering an
 * error, because this URL is reached by a browser navigation, not by fetch.
 */
export const callback: RequestHandler = async (req, res) => {
  const fail = (reason: string) =>
    res.redirect(`/login?error=${encodeURIComponent(reason)}`);

  if (!oidc.isConfigured) {
    fail("not-configured");
    return;
  }

  const session = sessionOf(req);
  const pending = session.oidc;
  // Used once. Clearing first means a replayed callback finds nothing.
  session.oidc = null;

  if (!pending) {
    fail("expired");
    return;
  }
  if (req.query.error) {
    console.error(
      "sign-in was refused",
      req.query.error,
      req.query.error_description,
    );
    fail("refused");
    return;
  }
  // Compared before anything else is trusted from this request.
  const state = single(req.query.state);
  if (!state || state !== pending.state) {
    fail("state-mismatch");
    return;
  }
  const code = single(req.query.code);
  if (!code) {
    fail("no-code");
    return;
  }

  try {
    const tokens = await oidc.exchangeCode({
      code,
      verifier: pending.verifier,
    });

    if (!tokens.id_token) {
      fail("no-id-token");
      return;
    }

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
    res.redirect("/discover");
  } catch (err) {
    console.error("sign-in failed", err);
    fail("failed");
  }
};
