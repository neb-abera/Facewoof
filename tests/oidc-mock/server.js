/*
 * A minimal OIDC provider, for testing sign-in without a real tenant.
 *
 * It implements only what the app actually uses: discovery, a JWKS, an
 * authorize endpoint that redirects straight back with a code, and a token
 * endpoint that mints a properly signed id_token. That is enough to exercise
 * the parts worth exercising — PKCE, state, nonce, and real signature
 * verification against a published key.
 *
 * Test scaffolding. It trusts everything and must never be deployed.
 */
const http = require('http');
const { generateKeyPair, SignJWT, exportJWK } = require('jose');

const PORT = Number(process.env.PORT || 9000);
const ISSUER = process.env.ISSUER || `http://oidc-mock:${PORT}`;
const CLIENT_ID = process.env.CLIENT_ID || 'facewoof-test';

/*
 * The person the mock signs in as.
 *
 * Settable at runtime through POST /subject, because a test needs both
 * properties: a brand new identity claims the guest account it was using, and
 * a returning identity lands back on the same account rather than a second
 * one. Which of those you are testing is decided by the subject, so the test
 * has to be able to choose it.
 */
let identity = {
  subject: process.env.SUBJECT || 'test-subject-1',
  email: process.env.EMAIL || 'tester@example.com',
  name: process.env.NAME || 'Test Owner'
};

let keys;
const pending = new Map(); // code -> { nonce }

const json = (res, body, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ISSUER);

  if (url.pathname === '/.well-known/openid-configuration') {
    return json(res, {
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/authorize`,
      token_endpoint: `${ISSUER}/token`,
      jwks_uri: `${ISSUER}/jwks`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256']
    });
  }

  if (url.pathname === '/subject' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    return req.on('end', () => {
      const next = JSON.parse(body || '{}');
      identity = {
        subject: next.subject || identity.subject,
        email: next.email || `${next.subject}@example.com`,
        name: next.name || identity.name
      };
      return json(res, identity);
    });
  }

  if (url.pathname === '/jwks') {
    const jwk = await exportJWK(keys.publicKey);
    return json(res, { keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] });
  }

  if (url.pathname === '/authorize') {
    // Straight back to the app with a code, as if the person had signed in.
    const code = `code-${Math.random().toString(36).slice(2)}`;
    pending.set(code, { nonce: url.searchParams.get('nonce') });

    const back = new URL(url.searchParams.get('redirect_uri'));
    back.searchParams.set('code', code);
    back.searchParams.set('state', url.searchParams.get('state'));

    res.writeHead(302, { location: back.toString() });
    return res.end();
  }

  if (url.pathname === '/token' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    return req.on('end', async () => {
      const params = new URLSearchParams(body);
      const entry = pending.get(params.get('code'));
      if (!entry) return json(res, { error: 'invalid_grant' }, 400);
      pending.delete(params.get('code'));

      const idToken = await new SignJWT({
        nonce: entry.nonce,
        email: identity.email,
        name: identity.name
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(ISSUER)
        .setSubject(identity.subject)
        .setAudience(CLIENT_ID)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(keys.privateKey);

      return json(res, { token_type: 'Bearer', id_token: idToken, expires_in: 300 });
    });
  }

  return json(res, { error: 'not_found' }, 404);
});

generateKeyPair('RS256').then((pair) => {
  keys = pair;
  server.listen(PORT, () => console.log(`mock OIDC provider on ${ISSUER}`));
});
