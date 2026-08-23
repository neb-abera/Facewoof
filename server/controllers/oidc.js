const oidc = require('../oidc');
const { findOrCreateExternalUser } = require('../db');

/*
 * What the sign-in page should offer.
 *
 * The client asks rather than assuming, so an install with no tenant
 * configured simply shows the demo button and no dead sign-in options.
 */
const providers = (req, res) =>
  res.status(200).send({
    configured: oidc.isConfigured,
    providers: oidc.isConfigured
      ? Object.entries(oidc.PROVIDERS).map(([id, { label }]) => ({ id, label }))
      : []
  });

/* Begin sign-in: hand the browser to Entra with a fresh PKCE challenge. */
const start = async (req, res) => {
  if (!oidc.isConfigured) {
    return res.status(503).send('sign-in is not configured');
  }

  try {
    const request = oidc.createAuthRequest(req.query.provider);

    /*
     * The verifier, state and nonce go in the session, not in the URL. They
     * are what proves the callback belongs to this browser's sign-in, so
     * putting them anywhere the caller can edit would defeat them.
     *
     * The guest id is kept so the account can be claimed rather than orphaned
     * when they come back signed in.
     */
    req.session.oidc = {
      verifier: request.verifier,
      state: request.state,
      nonce: request.nonce,
      provider: request.provider,
      guestUserId: req.session.userId || null
    };

    return res.redirect(await oidc.authorizeUrl(request));
  } catch (err) {
    console.error('could not start sign-in', err);
    return res.status(502).send('could not reach the sign-in service');
  }
};

/*
 * Come back from Entra with a code, and turn it into a session.
 *
 * Failures redirect to the login page with a reason rather than rendering an
 * error, because this URL is reached by a browser navigation, not by fetch.
 */
const callback = async (req, res) => {
  const fail = (reason) => res.redirect(`/login?error=${encodeURIComponent(reason)}`);

  if (!oidc.isConfigured) return fail('not-configured');

  const pending = req.session.oidc;
  // Used once. Clearing first means a replayed callback finds nothing.
  req.session.oidc = null;

  if (!pending) return fail('expired');
  if (req.query.error) {
    console.error('sign-in was refused', req.query.error, req.query.error_description);
    return fail('refused');
  }
  // Compared before anything else is trusted from this request.
  if (!req.query.state || req.query.state !== pending.state) return fail('state-mismatch');
  if (!req.query.code) return fail('no-code');

  try {
    const tokens = await oidc.exchangeCode({
      code: req.query.code,
      verifier: pending.verifier
    });

    if (!tokens.id_token) return fail('no-id-token');

    const claims = await oidc.verifyIdToken({
      idToken: tokens.id_token,
      nonce: pending.nonce
    });

    const { userId } = await findOrCreateExternalUser({
      issuer: claims.iss,
      subject: claims.sub,
      provider: pending.provider,
      email: claims.email || claims.preferred_username || null,
      name: claims.name || null,
      guestUserId: pending.guestUserId
    });

    req.session.userId = userId;
    return res.redirect('/discover');
  } catch (err) {
    console.error('sign-in failed', err);
    return fail('failed');
  }
};

module.exports = { providers, start, callback };
