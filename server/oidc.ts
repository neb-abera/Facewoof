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
import crypto from "node:crypto";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/*
 * The tenant, or null when any of the four settings is missing. A single
 * nullable object rather than four optional strings, so that code running
 * behind the `isConfigured` check gets strings it can use without defending
 * against each one being absent.
 */
const readConfig = (): OidcConfig | null => {
  const issuer = process.env.ENTRA_ISSUER;
  const clientId = process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;
  const redirectUri = process.env.ENTRA_REDIRECT_URI;
  if (!issuer || !clientId || !clientSecret || !redirectUri) return null;
  return { issuer, clientId, clientSecret, redirectUri };
};

export const CONFIG = readConfig();

export const isConfigured = CONFIG !== null;

/* The config, for code paths that have already checked isConfigured. */
const requireConfig = (): OidcConfig => {
  if (!CONFIG) throw new Error("Entra sign-in is not configured");
  return CONFIG;
};

interface ProviderInfo {
  label: string;
  domainHint: string | null;
}

/*
 * Everything External ID can federate with, and the domain_hint that jumps
 * straight to it rather than showing Microsoft's own chooser first.
 *
 * Which hint works depends on how the provider was configured, and getting it
 * wrong is not a degraded experience but a hard failure: the tenant answers
 * AADSTS90023 and sign-in stops. The bare words 'google', 'facebook', 'apple'
 * address Entra's built-in providers. A provider created through the Graph
 * identityProviders API instead gets its own id and is addressed by its issuer
 * domain, which is what these defaults are. Override per deployment with
 * `name:hint` in ENTRA_PROVIDERS if your tenant wants the other form.
 *
 * There is deliberately no Microsoft entry. External ID federates Facebook,
 * Google, Apple, custom OIDC and SAML; a personal Microsoft account is not one
 * of its providers, so a "Continue with Microsoft" button had nowhere to go.
 * An organisation's Entra tenant can be added as a custom OIDC provider, which
 * is a different thing from consumer Microsoft sign-in.
 */
const KNOWN_PROVIDERS: Record<string, ProviderInfo> = {
  email: { label: "Email", domainHint: null },
  google: { label: "Google", domainHint: "accounts.google.com" },
  facebook: { label: "Facebook", domainHint: "www.facebook.com" },
  apple: { label: "Apple", domainHint: "appleid.apple.com" },
};

/*
 * Only what this tenant has actually been configured with.
 *
 * The list used to be hardcoded, so the sign-in page advertised providers the
 * tenant knew nothing about and the button led to a dead end. Email needs no
 * federation and works as soon as a tenant exists, so it is the default;
 * anything else is opt-in once it has been set up at the provider.
 */
const configuredProviders = (): { name: string; hint: string | null }[] => {
  // Each entry is `name` or `name:domain-hint`, the second form overriding the
  // default hint for a tenant that addresses its provider differently.
  const requested = (process.env.ENTRA_PROVIDERS || "email")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name = "", ...rest] = entry.split(":");
      return {
        name: name.trim().toLowerCase(),
        hint: rest.join(":").trim() || null,
      };
    });

  const unknown = requested.filter(({ name }) => !KNOWN_PROVIDERS[name]);
  if (unknown.length) {
    console.warn(
      `ignoring unknown sign-in providers: ${unknown.map((u) => u.name).join(", ")}`,
    );
  }

  const known = requested.filter(({ name }) => KNOWN_PROVIDERS[name]);
  return known.length ? known : [{ name: "email", hint: null }];
};

export const PROVIDERS: Record<string, ProviderInfo> = Object.fromEntries(
  configuredProviders().flatMap(({ name, hint }) => {
    const base = KNOWN_PROVIDERS[name];
    if (!base) return [];
    return [[name, hint ? { ...base, domainHint: hint } : base]];
  }),
);

/* The parts of the provider's discovery document this app reads. */
interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

let discoveryPromise: Promise<Discovery> | null = null;

/*
 * The provider's own description of its endpoints, fetched once and reused.
 *
 * Hardcoding the authorize and token URLs works right up until the tenant
 * moves or Microsoft changes a path, and then it fails in production with no
 * warning. Discovery is one request at first use.
 */
export const discover = (): Promise<Discovery> => {
  if (!CONFIG)
    return Promise.reject(new Error("Entra sign-in is not configured"));
  if (discoveryPromise) return discoveryPromise;

  const url = `${CONFIG.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  discoveryPromise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`discovery failed with ${res.status}`);
      return res.json() as Promise<Discovery>;
    })
    .catch((err: unknown) => {
      // Not cached: a failed discovery must not poison every later attempt.
      discoveryPromise = null;
      throw err;
    });

  return discoveryPromise;
};

const base64url = (buffer: Buffer) => buffer.toString("base64url");

export interface AuthRequest {
  verifier: string;
  challenge: string;
  state: string;
  nonce: string;
  provider: string;
}

/*
 * PKCE, and the one-time values that tie a callback to the request that
 * started it.
 *
 * state defends the callback against being replayed from another site; nonce
 * ties the returned id_token to this particular sign-in. Both are checked on
 * the way back, and both live in the session cookie in the meantime.
 */
export const createAuthRequest = (
  provider: string | undefined,
): AuthRequest => {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );

  // An unrecognised provider falls back to the first configured one rather
  // than to a name that may not be enabled here.
  const [firstConfigured = "email"] = Object.keys(PROVIDERS);
  return {
    verifier,
    challenge,
    state: base64url(crypto.randomBytes(16)),
    nonce: base64url(crypto.randomBytes(16)),
    provider: provider && PROVIDERS[provider] ? provider : firstConfigured,
  };
};

export const authorizeUrl = async ({
  challenge,
  state,
  nonce,
  provider,
}: Pick<AuthRequest, "challenge" | "state" | "nonce" | "provider">) => {
  const meta = await discover();
  const { clientId, redirectUri } = requireConfig();
  const url = new URL(meta.authorization_endpoint);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  const hint = PROVIDERS[provider]?.domainHint;
  if (hint) url.searchParams.set("domain_hint", hint);

  return url.toString();
};

/* What the token endpoint answers with; only id_token is read. */
export interface TokenResponse {
  id_token?: string;
  access_token?: string;
  token_type?: string;
}

export const exchangeCode = async ({
  code,
  verifier,
}: {
  code: string;
  verifier: string;
}): Promise<TokenResponse> => {
  const meta = await discover();
  const { clientId, clientSecret, redirectUri } = requireConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const res = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `token exchange failed with ${res.status}: ${detail.slice(0, 200)}`,
    );
  }

  return res.json() as Promise<TokenResponse>;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/* The claims this app reads off a verified id_token. */
export interface IdTokenClaims extends JWTPayload {
  sub: string;
  nonce?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
}

/*
 * Check the id_token really came from the tenant, unaltered.
 *
 * Verified against the provider's published signing keys, not decoded and
 * trusted — an unverified JWT is a string the caller chose. jose does the
 * signature, and the issuer, audience and expiry checks; the nonce is ours to
 * check, because only we know which one we sent.
 */
export const verifyIdToken = async ({
  idToken,
  nonce,
}: {
  idToken: string;
  nonce: string;
}): Promise<IdTokenClaims> => {
  const meta = await discover();

  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(meta.jwks_uri));
  }

  const { payload } = await jwtVerify<IdTokenClaims>(idToken, jwks, {
    issuer: meta.issuer,
    audience: requireConfig().clientId,
  });

  // Ties this token to the sign-in this browser actually started. Without it a
  // token minted for another session could be replayed into this callback.
  if (payload.nonce !== nonce) {
    throw new Error("id_token nonce did not match the one we issued");
  }

  if (!payload.sub) {
    throw new Error("id_token carried no subject");
  }

  return payload;
};
