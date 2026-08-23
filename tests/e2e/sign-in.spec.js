const { test, expect } = require('@playwright/test');

/*
 * Sign-in through Entra External ID.
 *
 * These run against a mock provider (tests/oidc-mock) rather than a real
 * tenant, so they exercise the parts that are ours to get right — PKCE, state,
 * nonce, signature verification and account linking — without needing Azure
 * credentials in CI.
 *
 * When no provider is configured, only the first test applies; the rest are
 * skipped, so the suite passes on a checkout with no tenant.
 */

const configured = Boolean(process.env.ENTRA_ISSUER);

/*
 * Choose who the mock provider signs in as.
 *
 * A fresh subject is a person who has never signed in here; reusing one is
 * that same person coming back. The two behave differently on purpose.
 */
const signInAs = (request, subject) =>
  request.post(`${process.env.ENTRA_ISSUER}/subject`, { data: { subject } });

test('the sign-in page offers only what is actually configured', async ({ page, request }) => {
  await page.goto('/login');

  const { configured: isOn, providers } = await (await request.get('/api/auth/providers')).json();

  if (isOn) {
    // Every advertised provider has a button.
    for (const provider of providers) {
      await expect(page.getByRole('link', { name: new RegExp(provider.label, 'i') })).toBeVisible();
    }
  } else {
    // No dead ends: nothing that leads to a 503.
    await expect(page.getByRole('link', { name: /continue with/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /try the demo/i })).toBeVisible();
  }
});

test.describe('with a provider configured', () => {
  test.skip(!configured, 'no ENTRA_ISSUER, so there is no provider to sign in with');

  test('signing in lands the visitor in the app with a working session', async ({
    page,
    request
  }) => {
    await signInAs(request, `arrival-${Date.now()}`);
    await page.goto('/login');
    await page.getByRole('link', { name: /continue with microsoft/i }).click();

    await page.waitForURL('**/discover', { timeout: 30_000 });

    // A session the rest of the app accepts, not just a redirect.
    const me = await page.request.get('/api/auth/me');
    expect(me.status()).toBe(200);
  });

  test('a callback that did not start here is refused', async ({ page }) => {
    // No state in the session: a replayed or forged callback.
    await page.goto('/api/auth/oidc/callback?code=forged&state=forged');
    await expect(page).toHaveURL(/\/login\?error=expired/);
  });

  test('a callback with a tampered state is refused', async ({ page, context }) => {
    // Start properly so the session holds a state, then come back with another.
    await context.request.get('/api/auth/oidc/start?provider=google', {
      maxRedirects: 0
    });
    await page.goto('/api/auth/oidc/callback?code=x&state=not-the-one');
    await expect(page).toHaveURL(/\/login\?error=(state-mismatch|expired)/);
  });

  test('signing in keeps the account the demo was using', async ({ page, request }) => {
    // Someone who has never signed in here before.
    await signInAs(request, `claimer-${Date.now()}`);

    await page.goto('/');
    await page.getByRole('button', { name: /try the demo/i }).click();
    await page.waitForURL('**/discover', { timeout: 30_000 });

    const before = await (await page.request.get('/api/auth/me')).json();
    expect(before.is_guest, 'the demo should hand out a guest account').toBe(true);

    // A guest's only route in: /login redirects anyone already signed in
    // straight to /discover, so the navbar carries the offer instead.
    await page.getByRole('link', { name: /save your account/i }).click();
    await page.waitForURL('**/discover', { timeout: 30_000 });

    const after = await (await page.request.get('/api/auth/me')).json();

    // The swipes, packs and playdates from the demo belong to this id. Making
    // a second account here would quietly throw all of it away.
    expect(after.user_id).toBe(before.user_id);
  });

  test('coming back a second time lands on the same account', async ({ page, request }) => {
    const subject = `returning-${Date.now()}`;

    await signInAs(request, subject);
    await page.goto('/login');
    await page.getByRole('link', { name: /continue with microsoft/i }).click();
    await page.waitForURL('**/discover', { timeout: 30_000 });
    const first = await (await page.request.get('/api/auth/me')).json();

    await page.request.post('/api/auth/logout');
    await signInAs(request, subject);
    await page.goto('/login');
    await page.getByRole('link', { name: /continue with microsoft/i }).click();
    await page.waitForURL('**/discover', { timeout: 30_000 });
    const second = await (await page.request.get('/api/auth/me')).json();

    // Matched on (issuer, subject), so the same person is the same account —
    // not a new one each visit.
    expect(second.user_id).toBe(first.user_id);
  });
});
