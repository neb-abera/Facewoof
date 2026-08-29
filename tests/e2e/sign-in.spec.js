const { test, expect } = require("@playwright/test");

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

test("the sign-in page offers only what is actually configured", async ({
  page,
  request,
}) => {
  await page.goto("/login");

  const { configured: isOn, providers } = await (
    await request.get("/api/auth/providers")
  ).json();

  if (isOn) {
    // Every advertised provider has a button.
    for (const provider of providers) {
      await expect(
        page.getByRole("link", { name: new RegExp(provider.label, "i") }),
      ).toBeVisible();
    }
  } else {
    // No dead ends: nothing that leads to a 503.
    await expect(
      page.getByRole("link", { name: /continue with/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /try the demo/i }),
    ).toBeVisible();
  }
});

test.describe("with a provider configured", () => {
  test.skip(
    !configured,
    "no ENTRA_ISSUER, so there is no provider to sign in with",
  );

  test("signing in lands the visitor in the app with a working session", async ({
    page,
    request,
  }) => {
    await signInAs(request, `arrival-${Date.now()}`);
    await page.goto("/login");
    await page.getByRole("link", { name: /continue with email/i }).click();

    await page.waitForURL("**/discover", { timeout: 30_000 });

    // A session the rest of the app accepts, not just a redirect.
    const me = await page.request.get("/api/auth/me");
    expect(me.status()).toBe(200);
  });

  test("a callback that did not start here is refused", async ({ page }) => {
    // No state in the session: a replayed or forged callback.
    await page.goto("/api/auth/oidc/callback?code=forged&state=forged");
    await expect(page).toHaveURL(/\/login\?error=expired/);
  });

  test("a callback with a tampered state is refused", async ({
    page,
    context,
  }) => {
    // Start properly so the session holds a state, then come back with another.
    await context.request.get("/api/auth/oidc/start?provider=google", {
      maxRedirects: 0,
    });
    await page.goto("/api/auth/oidc/callback?code=x&state=not-the-one");
    await expect(page).toHaveURL(/\/login\?error=(state-mismatch|expired)/);
  });

  test("signing in keeps the account the demo was using", async ({
    page,
    request,
  }) => {
    // Someone who has never signed in here before.
    await signInAs(request, `claimer-${Date.now()}`);

    await page.goto("/");
    await page.getByRole("button", { name: /try the demo/i }).click();
    await page.waitForURL("**/discover", { timeout: 30_000 });

    const before = await (await page.request.get("/api/auth/me")).json();
    expect(before.is_guest, "the demo should hand out a guest account").toBe(
      true,
    );

    // A guest's only route in: /login redirects anyone already signed in
    // straight to /discover, so the navbar carries the offer instead.
    await page.getByRole("link", { name: /save your account/i }).click();
    await page.waitForURL("**/discover", { timeout: 30_000 });

    const after = await (await page.request.get("/api/auth/me")).json();

    // The swipes, packs and playdates from the demo belong to this id. Making
    // a second account here would quietly throw all of it away.
    expect(after.user_id).toBe(before.user_id);
    // And it stops being a guest, so the cleanup leaves it alone.
    expect(after.is_guest).toBe(false);
    // Guests are created called 'Guest'; the provider's name should win.
    expect(after.owner_name).not.toBe("Guest");
  });

  test("coming back a second time lands on the same account", async ({
    page,
    request,
  }) => {
    const subject = `returning-${Date.now()}`;

    await signInAs(request, subject);
    await page.goto("/login");
    await page.getByRole("link", { name: /continue with email/i }).click();
    await page.waitForURL("**/discover", { timeout: 30_000 });
    const first = await (await page.request.get("/api/auth/me")).json();

    await page.request.post("/api/auth/logout");
    await signInAs(request, subject);
    await page.goto("/login");
    await page.getByRole("link", { name: /continue with email/i }).click();
    await page.waitForURL("**/discover", { timeout: 30_000 });
    const second = await (await page.request.get("/api/auth/me")).json();

    // Matched on (issuer, subject), so the same person is the same account —
    // not a new one each visit.
    expect(second.user_id).toBe(first.user_id);
  });

  /*
   * A cold sign-in — nobody who was already using the demo.
   *
   * A demo account is cloned from the template and arrives with a dog and a
   * roster of neighbours. An account created by signing in has neither, and
   * used to land on an empty discover feed with no explanation.
   */
  test("a cold sign-in is asked to set up, and lands on a feed with dogs in it", async ({
    page,
    request,
  }) => {
    await signInAs(request, `cold-${Date.now()}`);

    await page.goto("/login");
    await page.getByRole("link", { name: /continue with email/i }).click();

    // Onboarding, not an empty feed.
    await page.waitForURL("**/welcome", { timeout: 30_000 });

    await page.getByLabel(/your dog's name/i).fill("Biscuit");
    await page.getByLabel(/^breed$/i).fill("Golden Retriever");
    await page.getByLabel(/^age$/i).fill("4");
    await page.getByLabel(/zip code/i).fill("10011");
    await page.getByRole("button", { name: /start meeting dogs/i }).click();

    await page.waitForURL("**/discover", { timeout: 30_000 });

    const me = await (await page.request.get("/api/auth/me")).json();
    expect(me.dog_name).toBe("Biscuit");
    expect(me.onboarded_at, "onboarding should be recorded").toBeTruthy();

    // The point of the whole exercise: somebody to see.
    const feed = await (
      await page.request.get("/api/discover?zipcode=10011&radius=25&limit=10")
    ).json();
    expect(
      feed.users.length,
      "the feed should not be empty after signing up",
    ).toBeGreaterThan(0);
  });

  test("onboarding is not shown twice", async ({ page, request }) => {
    const subject = `settled-${Date.now()}`;
    await signInAs(request, subject);
    await page.goto("/login");
    await page.getByRole("link", { name: /continue with email/i }).click();
    await page.waitForURL("**/welcome", { timeout: 30_000 });

    await page.getByLabel(/your dog's name/i).fill("Hazel");
    await page.getByLabel(/zip code/i).fill("10011");
    await page.getByRole("button", { name: /start meeting dogs/i }).click();
    await page.waitForURL("**/discover", { timeout: 30_000 });

    // Coming back later goes straight to the app.
    await page.request.post("/api/auth/logout");
    await signInAs(request, subject);
    await page.goto("/login");
    await page.getByRole("link", { name: /continue with email/i }).click();
    await page.waitForURL("**/discover", { timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/welcome/);
  });

  test("a demo visitor who signs in is never asked to set up", async ({
    page,
    request,
  }) => {
    await signInAs(request, `demo-then-signin-${Date.now()}`);

    await page.goto("/");
    await page.getByRole("button", { name: /try the demo/i }).click();
    await page.waitForURL("**/discover", { timeout: 30_000 });

    await page.getByRole("link", { name: /save your account/i }).click();

    /*
     * Polled on the account rather than waited on as a navigation. Signing in
     * from /discover ends back on /discover, and waiting for a navigation to a
     * URL the page is already on is a race: it can be satisfied by the page
     * you started from and time out on the one you meant.
     */
    await expect
      .poll(
        async () =>
          (await (await page.request.get("/api/auth/me")).json()).is_guest,
        {
          timeout: 30_000,
        },
      )
      .toBe(false);

    // They already have a dog and a feed; onboarding would be busywork.
    await expect(page).toHaveURL(/\/discover/);
  });

  /*
   * The buttons come from configuration, not from a list baked into the code.
   *
   * They were hardcoded to Microsoft and Google. Neither was a provider the
   * tenant had been set up with — and a personal Microsoft account is not
   * something External ID federates at all — so both led nowhere.
   */
  test("only configured providers are offered", async ({ page, request }) => {
    const { providers } = await (
      await request.get("/api/auth/providers")
    ).json();
    const offered = providers.map((p) => p.id);

    await page.goto("/login");
    // toHaveCount retries rather than counting the instant the load event
    // fires: with the views code-split, /login renders after its chunk
    // arrives, and a bare count() raced it and saw an empty page.
    await expect(
      page.getByRole("link", { name: /continue with/i }),
      "a button for each configured provider and no more",
    ).toHaveCount(offered.length);

    // Nothing External ID cannot actually do.
    expect(offered).not.toContain("microsoft");
  });

  /*
   * The hint that jumps straight to a provider.
   *
   * Getting this wrong is not a worse experience, it is a dead stop: the
   * tenant answers AADSTS90023 and sign-in fails. It shipped wrong twice —
   * first as a guess, then "corrected" to the value Microsoft documents for
   * its built-in providers, which is not what a provider created through the
   * Graph API answers to.
   */
  test("each provider carries a domain hint that its tenant accepts", async ({
    request,
  }) => {
    const { providers } = await (
      await request.get("/api/auth/providers")
    ).json();

    for (const { id } of providers) {
      const started = await request.get(`/api/auth/oidc/start?provider=${id}`, {
        maxRedirects: 0,
      });
      const { location } = started.headers();
      expect(location, `${id} should redirect to the tenant`).toBeTruthy();

      // Following it must reach a usable page, not a rejected hint.
      const landed = await request.get(location);
      const body = await landed.text();
      expect(body, `${id}: the tenant rejected its domain_hint`).not.toContain(
        "AADSTS90023",
      );
    }
  });
});
