/*
 * Sign-in through Entra External ID.
 *
 * Entra External ID is the front door; Google and Microsoft accounts are
 * identity providers configured inside that tenant. So the app talks OIDC to
 * one issuer and does not hold Google's or Microsoft's credentials itself —
 * which is the point of using it, and why adding a third provider later is a
 * change in the tenant rather than in this file.
 *
 * Everything here is optional. With nothing configured the app runs exactly as
 * it does today, on guest accounts, and the sign-in buttons do not appear. A
 * missing tenant is a reason to hide a button, never to fail to boot.
 */
const crypto = require('crypto');
const { createRemoteJWKSet, jwtVerify } = require('jose');

const CONFIG = {
  issuer: process.env.ENTRA_ISSUER,
  clientId: process.env.ENTRA_CLIENT_ID,
  clientSecret: process.env.ENTRA_CLIENT_SECRET,
  redirectUri: process.env.ENTRA_REDIRECT_URI
};

const isConfigured = Boolean(
  CONFIG.issuer && CONFIG.clientId && CONFIG.clientSecret && CONFIG.redirectUri
);

/*
 * The providers the sign-in page should offer.
 *
 * Entra takes a domain_hint and sends the person straight to that provider
 * rather than showing its own chooser first, which turns two clicks into one.
 */
const PROVIDERS = {
  microsoft: { label: 'Microsoft', domainHint: null },
  google: { label: 'Google', domainHint: 'google.com' }
};

let discoveryPromise = null;

/*
 * The provider's own description of its endpoints, fetched once and reused.
 *
 * Hardcoding the authorize and token URLs works right up until the tenant
 * moves or Microsoft changes a path, and then it fails in production with no
 * warning. Discovery is one request at first use.
 */
const discover = () => {
  if (!isConfigured) return Promise.reject(new Error('Entra sign-in is not configured'));
  if (discoveryPromise) return discoveryPromise;

  const url = `${CONFIG.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  discoveryPromise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`discovery failed with ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      // Not cached: a failed discovery must not poison every later attempt.
      discoveryPromise = null;
      throw err;
    });

  return discoveryPromise;
};

const base64url = (buffer) => buffer.toString('base64url');

/*
 * PKCE, and the one-time values that tie a callback to the request that
 * started it.
 *
 * state defends the callback against being replayed from another site; nonce
 * ties the returned id_token to this particular sign-in. Both are checked on
 * the way back, and both live in the session cookie in the meantime.
 */
const createAuthRequest = (provider) => {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

  return {
    verifier,
    challenge,
    state: base64url(crypto.randomBytes(16)),
    nonce: base64url(crypto.randomBytes(16)),
    provider: PROVIDERS[provider] ? provider : 'microsoft'
  };
};

const authorizeUrl = async ({ challenge, state, nonce, provider }) => {
  const meta = await discover();
  const url = new URL(meta.authorization_endpoint);

  url.searchParams.set('client_id', CONFIG.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', CONFIG.redirectUri);
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  const hint = PROVIDERS[provider]?.domainHint;
  if (hint) url.searchParams.set('domain_hint', hint);

  return url.toString();
};

const exchangeCode = async ({ code, verifier }) => {
  const meta = await discover();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
    redirect_uri: CONFIG.redirectUri,
    code_verifier: verifier
  });

  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`token exchange failed with ${res.status}: ${detail.slice(0, 200)}`);
  }

  return res.json();
};

let jwks = null;

/*
 * Check the id_token really came from the tenant, unaltered.
 *
 * Verified against the provider's published signing keys, not decoded and
 * trusted — an unverified JWT is a string the caller chose. jose does the
 * signature, and the issuer, audience and expiry checks; the nonce is ours to
 * check, because only we know which one we sent.
 */
const verifyIdToken = async ({ idToken, nonce }) => {
  const meta = await discover();

  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(meta.jwks_uri));
  }

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: meta.issuer,
    audience: CONFIG.clientId
  });

  // Ties this token to the sign-in this browser actually started. Without it a
  // token minted for another session could be replayed into this callback.
  if (payload.nonce !== nonce) {
    throw new Error('id_token nonce did not match the one we issued');
  }

  if (!payload.sub) {
    throw new Error('id_token carried no subject');
  }

  return payload;
};

module.exports = {
  isConfigured,
  verifyIdToken,
  PROVIDERS,
  discover,
  createAuthRequest,
  authorizeUrl,
  exchangeCode,
  CONFIG
};
