const { test, expect } = require("@playwright/test");

/*
 * The three CodeQL findings, pinned as behavior.
 *
 * Each of these was an open high-severity alert on main: a location string
 * reflected into an error response, state-changing routes served from a
 * session cookie with no CSRF token, and a health endpoint that hit the
 * database with no rate limit. The fixes are only as durable as the tests
 * that would notice them regressing.
 */

async function csrfHeaders(page) {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === "XSRF-TOKEN");
  return { "x-xsrf-token": token ? decodeURIComponent(token.value) : "" };
}

async function signIn(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/discover", { timeout: 30_000 });
}

test("a crafted location is not reflected into the error response", async ({
  page,
}) => {
  await signIn(page);

  const res = await page.request.post("/api/discover", {
    headers: await csrfHeaders(page),
    data: { zipcode: "<script>alert(1)</script>", radius: 5, limit: 10 },
  });
  expect(res.status(), "an unresolvable location is still a 400").toBe(400);

  // The old handler echoed the raw query string into a text/html-typed body,
  // which is exactly a reflected XSS. The reply must be JSON and must not
  // contain the input.
  expect(res.headers()["content-type"]).toContain("application/json");
  expect(await res.text()).not.toContain("<script>");
});

test("location travels in the request body, never the URL", async ({
  page,
}) => {
  await signIn(page);

  // The feed and the coordinate resolver both take their location in a
  // POSTed body...
  const post = await page.request.post("/api/discover", {
    headers: await csrfHeaders(page),
    data: { zipcode: "10011", radius: 25, limit: 10 },
  });
  expect(post.status(), "the feed answers a POSTed location").toBe(200);
  expect((await post.json()).users.length).toBeGreaterThan(0);

  // ...and the old query-string forms are gone, so a zipcode or a GPS fix
  // can never again end up in access logs, proxy logs, or browser history.
  const get = await page.request.get(
    "/api/discover?zipcode=10011&radius=25&limit=10",
  );
  expect(get.status(), "the query-string feed no longer exists").toBe(404);
  const coords = await page.request.get(
    "/api/resolve-location?lat=40.7&lng=-74.0",
  );
  expect(coords.status(), "the query-string resolver no longer exists").toBe(
    404,
  );
});

test("a state-changing request without the CSRF token is refused", async ({
  page,
}) => {
  await signIn(page);

  // Same session cookie the browser has, but none of the CSRF header the
  // in-app client sends. A forged cross-site request looks exactly like this.
  const res = await page.request.post("/api/makePost", {
    data: { packet: { pack_id: 1, body: "forged" } },
  });
  expect(res.status(), "no token, no write").toBe(403);
});

test("the browser client still writes with its token", async ({ page }) => {
  // The double-submit cookie must actually reach the client and come back:
  // the guest demo sign-in itself is a POST through axios, so arriving on
  // the feed proves the token round-trip works end to end.
  await signIn(page);
  await expect(page.locator(".card-stack, .profile-card").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("the health endpoint is rate limited", async ({ page }) => {
  // Generous enough that the platform's poller can never hit it, present
  // enough that nobody can use /healthz to hammer the database.
  let limited = false;
  for (let i = 0; i < 80 && !limited; i += 1) {
    const res = await page.request.get("/healthz");
    if (res.status() === 429) limited = true;
  }
  expect(limited, "80 rapid probes should trip the limiter").toBe(true);
});
